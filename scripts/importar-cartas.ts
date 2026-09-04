import 'dotenv/config';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { createClient } from '@supabase/supabase-js';
import { ICarta } from '@shared/interfaces';
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

async function obterUriDeDownloadDasCartasOracle(): Promise<string> {
  const res = await fetch('https://api.scryfall.com/bulk-data', {
    headers: CABECALHOS_REQUISICAO_SCRYFALL,
  });
  if (!res.ok) {
    throw new Error(`Falha ao buscar o índice de bulk-data: ${res.status} ${res.statusText}`);
  }
  const { data } = (await res.json()) as {
    data: Array<{ type: string; jsonl_download_uri: string }>;
  };
  const cartasOracle = data.find((entrada) => entrada.type === 'oracle_cards');
  if (!cartasOracle) {
    throw new Error('Entrada oracle_cards não encontrada no índice de bulk-data');
  }
  return cartasOracle.jsonl_download_uri;
}

// Descobre, baixa, filtra e corta o arquivo bulk Oracle Cards, retornando cada
// linha que seria upsertada em `cards`. Não realiza nenhuma escrita.
async function importarCartas(): Promise<ICarta.Detalhes[]> {
  console.log('Buscando índice de bulk-data...');
  const uriDeDownload = await obterUriDeDownloadDasCartasOracle();
  console.log(`URI de download do oracle_cards: ${uriDeDownload}`);

  console.log('Baixando, filtrando e cortando em stream...');
  const res = await fetch(uriDeDownload, { headers: CABECALHOS_REQUISICAO_SCRYFALL });
  if (!res.ok || !res.body) {
    throw new Error(`Falha ao baixar o arquivo oracle_cards: ${res.status} ${res.statusText}`);
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

  for await (const linha of linhas) {
    if (!linha.trim()) continue;
    const carta = JSON.parse(linha) as ICarta.DetalhesRaw;
    total++;
    if (atendeFiltroDeImportacao(carta)) cartasCortadas.push(cortarCarta(carta));
  }

  console.log(`\nTotal de linhas no arquivo: ${total}`);
  console.log(`Linhas mantidas e cortadas: ${cartasCortadas.length}`);

  return cartasCortadas;
}

// Envia as linhas para `cards` em lotes. Continua após um lote com erro em vez
// de abortar — isola a falha a esse lote e permite reportar exatamente quais
// lotes falharam ao final, em vez de perder o progresso já enviado.
async function enviarCartasParaSupabase(cartas: ICarta.Detalhes[]): Promise<void> {
  const cliente = criarClienteSupabase();
  const lotes = dividirEmLotes(cartas, TAMANHO_DO_LOTE);

  let totalEnviado = 0;
  const lotesComErro: Array<{ indice: number; mensagem: string }> = [];

  for (const [indice, lote] of lotes.entries()) {
    const { error } = await cliente.from('cards').upsert(lote, { onConflict: 'oracle_id' });

    if (error) {
      lotesComErro.push({ indice, mensagem: error.message });
      console.error(`Lote ${indice + 1}/${lotes.length} falhou: ${error.message}`);
      continue;
    }

    totalEnviado += lote.length;
    console.log(`Lote ${indice + 1}/${lotes.length} enviado (${lote.length} linhas).`);
  }

  console.log(`\nLinhas enviadas com sucesso: ${totalEnviado}/${cartas.length}`);
  if (lotesComErro.length > 0) {
    console.log(`Lotes com erro: ${lotesComErro.length}/${lotes.length}`);
    process.exitCode = 1;
  }
}

async function main() {
  const cartas = await importarCartas();
  await enviarCartasParaSupabase(cartas);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
