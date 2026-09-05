import { Injectable, InjectionToken, inject } from '@angular/core';
import { CartasService, ImpressaoEncontrada } from './cartas.service';
import { lerCandidatosDeImpressao } from '@shared/utils';

// Pausa real (não só um yield de microtask) entre as 3 etapas pesadas do scan
// (ler o arquivo/OCR -> interpretar o retorno -> consultar o banco) — dá tempo
// de parede pro worker do Tesseract terminar de verdade (isso é assíncrono a
// nível de SO/thread) antes da próxima alocação grande começar, em vez das
// duas ficarem "em voo" ao mesmo tempo. Heurística, não garantia: só ajuda se
// o problema for sobreposição de picos, não pressão de memória constante.
// Injection token (não uma const simples) pra dar pra zerar nos testes sem
// precisar de fake timers.
export const ATRASO_ENTRE_ETAPAS_LEITURA_MS = new InjectionToken<number>(
  'ATRASO_ENTRE_ETAPAS_LEITURA_MS',
  { providedIn: 'root', factory: () => 2500 },
);

// Fotos de celular saem enormes (12MP+ = ~4000x3000) — rodar o Tesseract
// nelas em resolução total usa memória suficiente pra derrubar a aba em
// aparelhos com pouca RAM (o mesmo sintoma do reload por câmera, só que
// disparado pelo próprio OCR, não pela troca de app). Uma foto de texto não
// precisa de resolução total pra ser lida — só o bastante pra uma linha
// impressa ficar legível — então reduzir antes ajuda memória e velocidade
// sem piorar a leitura.
const LARGURA_MAXIMA_OCR = 960;

// Chave de sessionStorage usada para detectar quando o navegador descartou a
// aba (e recarregou a página do zero) enquanto o app de câmera nativo estava
// em primeiro plano — comportamento observado em alguns Android sob pressão
// de memória. Sobrevive a um reload da mesma aba (ao contrário do estado em
// memória do componente), então dá pra saber, já no próximo ngOnInit, que um
// escaneamento ficou pendurado no meio do caminho.
const CHAVE_ESCANEAMENTO_PENDENTE = 'grimorio:escaneamento-pendente';

// Passa o redimensionamento direto pro createImageBitmap (em vez de decodificar
// a foto inteira e só depois desenhar reduzida num canvas) — o decoder do
// navegador entrega o bitmap já no tamanho final, sem nunca precisar alocar a
// foto inteira (os ~4000x3000 originais) na memória. É esse pico — decodificar
// em resolução total só pra jogar fora a maior parte logo em seguida — que
// coincidia com o momento em que o Android descartava a aba sob pressão de
// memória. Assume-se que a foto sempre chega maior que LARGURA_MAXIMA_OCR
// (câmera de celular via capture="environment"); numa foto menor que isso
// (ex.: escolhida à mão num desktop) o navegador aumenta ela até essa largura
// em vez de manter o tamanho original — aceitável aqui, já que o alvo é
// sempre o mesmo tamanho pequeno de qualquer forma.
async function reduzirFotoParaOcr(foto: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(foto, {
    resizeWidth: LARGURA_MAXIMA_OCR,
    resizeQuality: 'medium',
  });

  const tela = document.createElement('canvas');
  tela.width = bitmap.width;
  tela.height = bitmap.height;
  tela.getContext('2d')?.drawImage(bitmap, 0, 0);
  bitmap.close();

  return tela;
}

export type ResultadoLeituraCarta =
  | { tipo: 'sucesso'; resultado: ImpressaoEncontrada; debug: string[] }
  | { tipo: 'erro'; mensagem: string; debug: string[] };

// Encapsula a leitura de "número do coletor / código do set" a partir de uma
// foto (OCR + resolução contra `printings`) — usado por qualquer tela que
// tenha um botão de câmera (BuscaCartas, a busca de Colecao), cada uma
// decidindo o que fazer com o ResultadoLeituraCarta à sua maneira.
@Injectable({ providedIn: 'root' })
export class LeitorDeCartaService {
  private readonly cartasService = inject(CartasService);
  private readonly atrasoEntreEtapas = inject(ATRASO_ENTRE_ETAPAS_LEITURA_MS);

  // Listener pendente de uma chamada anterior a marcarEscaneamentoIniciado
  // (ver o método abaixo) — guardado pra poder ser removido explicitamente
  // caso um novo escaneamento comece antes do anterior ter tido a chance de
  // se limpar sozinho, o que senão acumularia um listener por tentativa.
  private aoRetomarFocoPendente: (() => void) | null = null;

  private aguardarRespiro(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.atrasoEntreEtapas));
  }

  // Marca em sessionStorage que uma foto está sendo tirada — chamar antes de
  // abrir a câmera nativa. Ver CHAVE_ESCANEAMENTO_PENDENTE acima.
  marcarEscaneamentoIniciado(): void {
    sessionStorage.setItem(CHAVE_ESCANEAMENTO_PENDENTE, '1');

    if (this.aoRetomarFocoPendente) {
      document.removeEventListener('visibilitychange', this.aoRetomarFocoPendente);
    }

    // Se a aba não foi recarregada, esse mesmo listener roda quando o
    // usuário volta da câmera (foto tirada ou cancelada) e limpa a marca —
    // só sobra marcada se o JS morreu no meio do caminho (reload).
    const aoRetomarFoco = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      sessionStorage.removeItem(CHAVE_ESCANEAMENTO_PENDENTE);
      document.removeEventListener('visibilitychange', aoRetomarFoco);
      this.aoRetomarFocoPendente = null;
    };
    this.aoRetomarFocoPendente = aoRetomarFoco;
    document.addEventListener('visibilitychange', aoRetomarFoco);
  }

  // Chamar no ngOnInit de quem usa a câmera — devolve true (e limpa a marca)
  // quando um escaneamento anterior ficou pendurado por um reload.
  consumirEscaneamentoPendente(): boolean {
    if (sessionStorage.getItem(CHAVE_ESCANEAMENTO_PENDENTE) !== '1') {
      return false;
    }
    sessionStorage.removeItem(CHAVE_ESCANEAMENTO_PENDENTE);
    return true;
  }

  // Lê "número do coletor / código do set" (ex.: "042/264 SLX") da foto
  // tirada — não a carta inteira. Depende do usuário ter fotografado essa
  // linha impressa de perto; não recorta nem localiza essa região sozinho.
  // Cartas antigas sem essa linha impressa não são lidas por este caminho.
  // Importante: só limpa a marca de "escaneamento pendente" no final (ver
  // `finally` abaixo) — não assim que a foto chega. O OCR (Tesseract, rodando
  // em WASM) é a parte mais pesada em memória de todo o fluxo, e é durante
  // ele que o Android já foi observado descartando a aba sob pressão de
  // memória (mais fácil de reproduzir em telas com uma grade de resultados
  // grande já carregada, como a Início). Se a marca fosse limpa antes do OCR
  // rodar, um descarte nesse meio-tempo pareceria um reset silencioso em vez
  // de mostrar a mensagem de leitura interrompida no próximo carregamento.
  async lerFoto(foto: Blob): Promise<ResultadoLeituraCarta> {
    const linhasDebug: string[] = [];

    try {
      const fotoReduzida = await reduzirFotoParaOcr(foto);
      // Import dinâmico (não estático no topo do arquivo): como este serviço
      // é injetado já na página Início, um import estático do Tesseract
      // entra no bundle inicial e pesa a carga de qualquer visita, mesmo sem
      // usar a câmera. Import dinâmico vira um chunk separado, baixado só
      // quando alguém realmente escaneia uma carta.
      const Tesseract = await import('tesseract.js');
      const { data } = await Tesseract.recognize(fotoReduzida, 'eng');
      linhasDebug.push(`OCR bruto: "${data.text.trim()}"`);

      // Etapa 1 (ler o arquivo) terminou — respiro antes de interpretar o
      // retorno, dando tempo do worker do Tesseract acabar de desalocar.
      await this.aguardarRespiro();

      const candidatos = lerCandidatosDeImpressao(data.text);
      linhasDebug.push(
        `Candidatos: números [${candidatos.numeros.join(', ')}], códigos [${candidatos.codigos.join(', ')}]`,
      );

      if (candidatos.numeros.length === 0 || candidatos.codigos.length === 0) {
        return {
          tipo: 'erro',
          mensagem:
            'Não consegui ler o número da carta e o código do set. Tire outra foto bem próxima dessa linha.',
          debug: linhasDebug,
        };
      }

      // Etapa 2 (interpretar o retorno) terminou — respiro antes de começar
      // a etapa 3 (consultar o banco).
      await this.aguardarRespiro();

      // Não assume que número e código estejam adjacentes no texto lido (ver
      // lerCandidatosDeImpressao) — tenta cada combinação contra `printings`
      // até achar uma que bata, limitado pra não disparar dezenas de
      // consultas numa foto muito ruidosa.
      let resultado: ImpressaoEncontrada | null = null;
      let combinacaoEncontrada: string | null = null;

      for (const numero of candidatos.numeros.slice(0, 6)) {
        for (const codigo of candidatos.codigos.slice(0, 8)) {
          resultado = await this.cartasService.buscarCartaPorImpressao(codigo, numero);
          if (resultado) {
            combinacaoEncontrada = `${numero}/${codigo}`;
            break;
          }
        }
        if (resultado) {
          break;
        }
      }

      linhasDebug.push(
        `Supabase (printings + cards): ${resultado ? `combinação "${combinacaoEncontrada}" -> ${JSON.stringify(resultado)}` : 'nenhuma combinação encontrada'}`,
      );

      if (!resultado) {
        return {
          tipo: 'erro',
          mensagem: 'Li os candidatos acima mas não encontrei nenhuma impressão correspondente.',
          debug: linhasDebug,
        };
      }

      // Não busca a arte da impressão aqui — quem chama só preenche o nome
      // lido na busca já existente (catálogo ou coleções) e mostra o
      // resultado do jeito que essa busca já mostra hoje, sem decodificar
      // mais nenhuma imagem grande logo depois do OCR.
      return { tipo: 'sucesso', resultado, debug: linhasDebug };
    } catch (erroCapturado) {
      const mensagem = erroCapturado instanceof Error ? erroCapturado.message : String(erroCapturado);
      linhasDebug.push(`Erro: ${mensagem}`);
      return { tipo: 'erro', mensagem: 'Falha ao processar a imagem.', debug: linhasDebug };
    } finally {
      sessionStorage.removeItem(CHAVE_ESCANEAMENTO_PENDENTE);
    }
  }
}
