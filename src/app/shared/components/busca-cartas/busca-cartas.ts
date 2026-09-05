import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import * as Tesseract from 'tesseract.js';
import {
  CartasService,
  EstadoBuscaCartasService,
  ImpressaoEncontrada,
  RegistroEstadoBuscaCartasService,
  calcularTamanhoPagina,
} from '@shared/services';
import { ICarta } from '@shared/interfaces';
import { lerCandidatosDeImpressao } from '@shared/utils';
import { Cartao } from '../cartao/cartao';

const TAMANHO_MINIMO_TERMO = 3;

// Mesmo ponto de corte do @media em busca-cartas.css — usado para saber, no
// momento da busca, se a grade está mostrando `colunas` ou `colunasMobile`.
const CONSULTA_MOBILE = '(max-width: 640px)';

// Fotos de celular saem enormes (12MP+ = ~4000x3000) — rodar o Tesseract
// nelas em resolução total usa memória suficiente pra derrubar a aba em
// aparelhos com pouca RAM (o mesmo sintoma do reload por câmera, só que
// disparado pelo próprio OCR, não pela troca de app). Uma foto de texto não
// precisa de resolução total pra ser lida; reduzir antes ajuda memória e
// velocidade sem piorar a leitura.
const LARGURA_MAXIMA_OCR = 1280;

async function reduzirFotoParaOcr(foto: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(foto);
  const escala = Math.min(1, LARGURA_MAXIMA_OCR / bitmap.width);
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = altura;
  tela.getContext('2d')?.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  return tela;
}

// Chave de sessionStorage usada para detectar quando o navegador descartou a
// aba (e recarregou a página do zero) enquanto o app de câmera nativo estava
// em primeiro plano — comportamento observado em alguns Android sob pressão
// de memória. Sobrevive a um reload da mesma aba (ao contrário do estado em
// memória do componente), então dá pra saber, já no próximo ngOnInit, que um
// escaneamento ficou pendurado no meio do caminho.
const CHAVE_ESCANEAMENTO_PENDENTE = 'grimorio:escaneamento-pendente';

@Component({
  selector: 'app-busca-cartas',
  imports: [Cartao],
  templateUrl: './busca-cartas.html',
  styleUrl: './busca-cartas.css',
})
export class BuscaCartas implements OnInit {
  // Chave estável identificando a "página" que usa esta busca (ex.: 'inicio',
  // `colecao-${id}`) — ver RegistroEstadoBuscaCartasService.
  @Input({ required: true }) chave!: string;
  @Input() mostrarBotaoAdicionar = false;
  @Input() rotuloBotaoAdicionar = 'Adicionar';
  // Só a página inicial mostra o botão de escanear por enquanto.
  @Input() mostrarBotaoCamera = false;
  // Quantas cartas por linha da grade de resultados — varia conforme a
  // página que usa esta busca (ex.: início vs. detalhe de coleção).
  @Input() colunas = 5;
  @Input() colunasMobile = 2;
  @Output() adicionarCarta = new EventEmitter<ICarta.Detalhes>();

  // Input de arquivo nativo (accept + capture), disparado via clique
  // programático a partir do botão da câmera — deixa o app abrir a câmera
  // real do aparelho (com autofoco/macro próprios) em vez de tentar
  // reproduzir isso com um <video> ao vivo via getUserMedia, que não expõe
  // controle de foco confiável em navegador.
  @ViewChild('inputArquivo') private inputArquivoRef?: ElementRef<HTMLInputElement>;

  private readonly cartasService = inject(CartasService);
  private readonly registro = inject(RegistroEstadoBuscaCartasService);
  private readonly router = inject(Router);

  protected estado!: EstadoBuscaCartasService;
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly erroCamera = signal<string | null>(null);
  protected readonly escaneando = signal(false);
  // Registro em texto do último scan (OCR bruto, o que foi lido, o retorno
  // do Supabase) — mostrado na tela mesmo em caso de sucesso, pra dar pra
  // depurar no celular sem precisar de um debugger conectado no computador.
  protected readonly debugScan = signal<string | null>(null);

  ngOnInit(): void {
    this.estado = this.registro.obter(this.chave);

    if (sessionStorage.getItem(CHAVE_ESCANEAMENTO_PENDENTE) === '1') {
      sessionStorage.removeItem(CHAVE_ESCANEAMENTO_PENDENTE);
      this.erroCamera.set(
        'A leitura foi interrompida (o navegador recarregou a página ao abrir a câmera). Tente escanear de novo.',
      );
    }
  }

  abrirCamera(): void {
    this.erroCamera.set(null);
    sessionStorage.setItem(CHAVE_ESCANEAMENTO_PENDENTE, '1');

    // Se a aba não foi recarregada, esse mesmo listener roda quando o
    // usuário volta da câmera (foto tirada ou cancelada) e limpa a marca —
    // só sobra marcada se o JS morreu no meio do caminho (reload).
    const aoRetomarFoco = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      sessionStorage.removeItem(CHAVE_ESCANEAMENTO_PENDENTE);
      document.removeEventListener('visibilitychange', aoRetomarFoco);
    };
    document.addEventListener('visibilitychange', aoRetomarFoco);

    this.inputArquivoRef?.nativeElement.click();
  }

  // Lê "número do coletor / código do set" (ex.: "042/264 SLX") da foto
  // tirada — não a carta inteira. Depende do usuário ter fotografado essa
  // linha impressa de perto (ver instrução ao lado do botão); não recorta
  // nem localiza essa região sozinho. Cartas antigas sem essa linha impressa
  // não são lidas por este caminho — fica para depois.
  async aoSelecionarFoto(evento: Event): Promise<void> {
    sessionStorage.removeItem(CHAVE_ESCANEAMENTO_PENDENTE);

    const input = evento.target as HTMLInputElement;
    const foto = input.files?.[0];
    input.value = ''; // permite fotografar e escolher o mesmo arquivo de novo

    if (!foto) {
      return;
    }

    this.escaneando.set(true);
    this.erroCamera.set(null);
    this.debugScan.set(null);
    const linhasDebug: string[] = [];

    try {
      const fotoReduzida = await reduzirFotoParaOcr(foto);
      const { data } = await Tesseract.recognize(fotoReduzida, 'eng');
      linhasDebug.push(`OCR bruto: "${data.text.trim()}"`);
      this.debugScan.set(linhasDebug.join('\n'));

      const candidatos = lerCandidatosDeImpressao(data.text);
      linhasDebug.push(
        `Candidatos: números [${candidatos.numeros.join(', ')}], códigos [${candidatos.codigos.join(', ')}]`,
      );
      this.debugScan.set(linhasDebug.join('\n'));

      if (candidatos.numeros.length === 0 || candidatos.codigos.length === 0) {
        this.erroCamera.set(
          'Não consegui ler o número da carta e o código do set. Tire outra foto bem próxima dessa linha.',
        );
        return;
      }

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
      this.debugScan.set(linhasDebug.join('\n'));

      if (!resultado) {
        this.erroCamera.set(
          `Li os candidatos acima mas não encontrei nenhuma impressão correspondente.`,
        );
        return;
      }

      await this.router.navigate(['/carta', resultado.carta.oracle_id, resultado.printingId]);
    } catch (erroCapturado) {
      const mensagem = erroCapturado instanceof Error ? erroCapturado.message : String(erroCapturado);
      linhasDebug.push(`Erro: ${mensagem}`);
      this.debugScan.set(linhasDebug.join('\n'));
      this.erroCamera.set('Falha ao processar a imagem.');
    } finally {
      this.escaneando.set(false);
    }
  }

  protected get termoInvalido(): boolean {
    return this.estado.tentouBuscar() && this.estado.termo().trim().length < TAMANHO_MINIMO_TERMO;
  }

  protected get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.estado.total() / this.estado.tamanhoPaginaUsado()));
  }

  // Colunas efetivamente exibidas agora (varia com o breakpoint mobile de
  // busca-cartas.css), usadas para calcular quantas cartas buscar por página.
  private get colunasEfetivas(): number {
    const suportaMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
    return suportaMatchMedia && window.matchMedia(CONSULTA_MOBILE).matches
      ? this.colunasMobile
      : this.colunas;
  }

  async buscar(): Promise<void> {
    this.estado.tentouBuscar.set(true);

    if (this.estado.termo().trim().length < TAMANHO_MINIMO_TERMO) {
      return;
    }

    await this.executarBusca(1);
  }

  async irParaPagina(pagina: number): Promise<void> {
    if (pagina < 1 || pagina > this.totalPaginas) {
      return;
    }

    await this.executarBusca(pagina);
  }

  private async executarBusca(pagina: number): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    const tamanhoPagina = calcularTamanhoPagina(this.colunasEfetivas);

    try {
      const resultado = await this.cartasService.buscarCartas(
        this.estado.termo().trim(),
        this.estado.campo(),
        pagina,
        tamanhoPagina,
      );
      this.estado.resultados.set(resultado.cartas);
      this.estado.total.set(resultado.total);
      this.estado.pagina.set(pagina);
      this.estado.tamanhoPaginaUsado.set(tamanhoPagina);
    } catch (erroCapturado) {
      this.erro.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    } finally {
      this.carregando.set(false);
    }
  }
}
