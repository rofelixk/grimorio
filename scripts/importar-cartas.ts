import 'dotenv/config';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { createClient } from '@supabase/supabase-js';
import { ICarta, IImpressao } from '@shared/interfaces';
import { LAYOUTS_EXCLUIDOS, TIPOS_DE_EDICAO_EXCLUIDOS, LAYOUTS_MULTIFACE } from '@shared/constants';

// Exigido pelas diretrizes da API do Scryfall: https://scryfall.com/docs/api — um
// User-Agent preciso, escolhido explicitamente em vez de deixado a cargo da lib HTTP.
const CABECALHOS_REQUISICAO_SCRYFALL = {
  'User-Agent': 'grimorio-import-script/1.0',
  Accept: 'application/json',
};

// Quantidade de linhas por requisição de upsert. Lotes menores evitam estourar
// os limites de tamanho de payload/timeout do Postgrest e isolam falhas a um
// lote específico, em vez de perder visibilidade sobre um envio de ~30 mil
// linhas de uma vez só.
const TAMANHO_DO_LOTE = 500;

function criarClienteSupabase() {
  const url = process.env['SUPABASE_URL'];
  const chaveServiceRole = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!url || !chaveServiceRole) {
    throw new Error(
      'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidos no .env',
    );
  }

  return createClient(url, chaveServiceRole);
}

function dividirEmLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    lotes.push(itens.slice(i, i + tamanho));
  }
  return lotes;
}

function atendeFiltroDeImportacao(carta: ICarta.DetalhesRaw): boolean {
  // Guarda defensiva: nenhum layout hoje deveria chegar aqui sem oracle_id,
  // mas um upsert em lote falha por inteiro (todas as linhas do lote, não só
  // a culpada) se uma única linha violar a constraint not-null — bem mais
  // barato filtrar aqui do que descobrir isso de novo em produção.
  if (!carta.oracle_id) return false;
  if (!carta.games?.includes('paper')) return false;
  if (LAYOUTS_EXCLUIDOS.has(carta.layout)) return false;
  if (TIPOS_DE_EDICAO_EXCLUIDOS.has(carta.set_type)) return false;
  return true;
}

function cortarFacesDaCarta(carta: ICarta.DetalhesRaw): ICarta.Face[] | null {
  if (!LAYOUTS_MULTIFACE.has(carta.layout) || !carta.card_faces) return null;

  return carta.card_faces.map((face) => ({
    name: face.name,
    mana_cost: face.mana_cost ?? '',
    type_line: face.type_line ?? null,
    oracle_text: face.oracle_text ?? null,
    colors: face.colors ?? [],
    power: face.power ?? null,
    toughness: face.toughness ?? null,
    image_url: face.image_uris?.normal ?? null,
  }));
}

function cortarCarta(carta: ICarta.DetalhesRaw): ICarta.Detalhes {
  const facesDaCarta = cortarFacesDaCarta(carta);
  const ehMultiface = facesDaCarta !== null;

  return {
    oracle_id: carta.oracle_id,
    name: carta.name,
    // mana_cost/oracle_text/power/toughness no nível da carta ficam null para
    // cartas multiface — as faces são a fonte de verdade. Ver data-model.md.
    mana_cost: ehMultiface ? null : (carta.mana_cost ?? null),
    mana_value: carta.cmc,
    type_line: carta.type_line,
    oracle_text: ehMultiface ? null : (carta.oracle_text ?? null),
    color_identity: carta.color_identity,
    power: ehMultiface ? null : (carta.power ?? null),
    toughness: ehMultiface ? null : (carta.toughness ?? null),
    loyalty: carta.loyalty ?? null,
    layout: carta.layout,
    commander_legality: carta.legalities.commander,
    // transform / modal_dfc não têm imagem no nível da carta — usa a imagem da face 0.
    image_url: carta.image_uris?.normal ?? facesDaCarta?.[0]?.image_url ?? null,
    card_faces: facesDaCarta,
  };
}

function cortarImpressao(carta: ICarta.DetalhesRaw): IImpressao.Detalhes {
  const facesDaCarta = cortarFacesDaCarta(carta);

  return {
    scryfall_id: carta.id,
    oracle_id: carta.oracle_id,
    set_code: carta.set,
    collector_number: carta.collector_number,
    lang: carta.lang,
    image_url: carta.image_uris?.normal ?? facesDaCarta?.[0]?.image_url ?? null,
  };
}

async function obterUriDeDownloadDoBulkFile(tipo: string): Promise<string> {
  const res = await fetch('https://api.scryfall.com/bulk-data', {
    headers: CABECALHOS_REQUISICAO_SCRYFALL,
  });
  if (!res.ok) {
    throw new Error(`Falha ao buscar o índice de bulk-data: ${res.status} ${res.statusText}`);
  }
  const { data } = (await res.json()) as {
    data: Array<{ type: string; jsonl_download_uri: string }>;
  };
  const entrada = data.find((item) => item.type === tipo);
  if (!entrada) {
    throw new Error(`Entrada ${tipo} não encontrada no índice de bulk-data`);
  }
  return entrada.jsonl_download_uri;
}

interface ResultadoImportacao {
  cartas: ICarta.Detalhes[];
  impressoes: IImpressao.Detalhes[];
}

// Descobre, baixa, filtra e corta o arquivo bulk Default Cards — um objeto por
// impressão, ao contrário de Oracle Cards (um por oracle_id) — retornando as
// linhas que seriam upsertadas em `cards` e em `printings`. Um único download
// popula as duas tabelas: um objeto de Default Cards já carrega todo campo
// oracle-level que Oracle Cards teria, mais os campos de impressão. Não
// realiza nenhuma escrita.
async function importarCartas(): Promise<ResultadoImportacao> {
  console.log('Buscando índice de bulk-data...');
  const uriDeDownload = await obterUriDeDownloadDoBulkFile('default_cards');
  console.log(`URI de download do default_cards: ${uriDeDownload}`);

  console.log('Baixando, filtrando e cortando em stream...');
  const res = await fetch(uriDeDownload, { headers: CABECALHOS_REQUISICAO_SCRYFALL });
  if (!res.ok || !res.body) {
    throw new Error(`Falha ao baixar o arquivo default_cards: ${res.status} ${res.statusText}`);
  }

  // O arquivo é JSON Lines comprimido em gzip: um objeto de carta por linha, não
  // um único array JSON grande. Descomprime e lê linha a linha — memória
  // constante independente do tamanho do arquivo, mesma intenção da decisão
  // original de stream-parse, implementação mais simples agora que o formato
  // de origem é JSONL em vez de um array JSON.
  const descomprimido = Readable.fromWeb(res.body as never).pipe(createGunzip());
  const linhas = createInterface({ input: descomprimido });

  let total = 0;
  const cartasCortadas: ICarta.Detalhes[] = [];
  const impressoesCortadas: IImpressao.Detalhes[] = [];
  // Default Cards repete o mesmo oracle_id uma vez por impressão — mantém só a
  // primeira encontrada por oracle_id como representante em `cards`, mesmo
  // caráter arbitrário-mas-consistente que a curadoria da Scryfall em Oracle
  // Cards já tinha (ver o aviso de "representative-printing" em data-model.md).
  const oracleIdsVistos = new Set<string>();

  for await (const linha of linhas) {
    if (!linha.trim()) continue;
    const carta = JSON.parse(linha) as ICarta.DetalhesRaw;
    total++;
    if (!atendeFiltroDeImportacao(carta)) continue;

    impressoesCortadas.push(cortarImpressao(carta));

    if (!oracleIdsVistos.has(carta.oracle_id)) {
      oracleIdsVistos.add(carta.oracle_id);
      cartasCortadas.push(cortarCarta(carta));
    }
  }

  console.log(`\nTotal de linhas no arquivo: ${total}`);
  console.log(`Cartas (oracle_id únicos) mantidas: ${cartasCortadas.length}`);
  console.log(`Impressões mantidas: ${impressoesCortadas.length}`);

  return { cartas: cartasCortadas, impressoes: impressoesCortadas };
}

// Envia as linhas de uma tabela em lotes. Continua após um lote com erro em
// vez de abortar — isola a falha a esse lote e permite reportar exatamente
// quais lotes falharam ao final, em vez de perder o progresso já enviado.
async function enviarParaSupabase<T extends object>(
  cliente: ReturnType<typeof criarClienteSupabase>,
  tabela: string,
  colunaConflito: string,
  linhas: T[],
): Promise<void> {
  const lotes = dividirEmLotes(linhas, TAMANHO_DO_LOTE);

  let totalEnviado = 0;
  const lotesComErro: Array<{ indice: number; mensagem: string }> = [];

  for (const [indice, lote] of lotes.entries()) {
    // Nome da tabela é dinâmico (reutilizado para `cards` e `printings`), então
    // o Supabase não consegue tipar o formato esperado da linha — mesma
    // ausência de tipagem forte que o cliente já tinha antes desta função
    // existir (`createClient` sem generic de schema).
    const { error } = await cliente.from(tabela).upsert(lote as never, { onConflict: colunaConflito });

    if (error) {
      lotesComErro.push({ indice, mensagem: error.message });
      console.error(`[${tabela}] Lote ${indice + 1}/${lotes.length} falhou: ${error.message}`);
      continue;
    }

    totalEnviado += lote.length;
    console.log(`[${tabela}] Lote ${indice + 1}/${lotes.length} enviado (${lote.length} linhas).`);
  }

  console.log(`\n[${tabela}] Linhas enviadas com sucesso: ${totalEnviado}/${linhas.length}`);
  if (lotesComErro.length > 0) {
    console.log(`[${tabela}] Lotes com erro: ${lotesComErro.length}/${lotes.length}`);
    process.exitCode = 1;
  }
}

async function main() {
  const { cartas, impressoes } = await importarCartas();
  const cliente = criarClienteSupabase();

  // cards antes de printings: printings.oracle_id referencia cards(oracle_id).
  await enviarParaSupabase(cliente, 'cards', 'oracle_id', cartas);
  await enviarParaSupabase(cliente, 'printings', 'scryfall_id', impressoes);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
