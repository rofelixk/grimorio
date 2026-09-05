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
import {
  CartasService,
  EstadoBuscaCartasService,
  LeitorDeCartaService,
  RegistroEstadoBuscaCartasService,
  calcularTamanhoPagina,
} from '@shared/services';
import { ICarta } from '@shared/interfaces';
import { Cartao } from '../cartao/cartao';

const TAMANHO_MINIMO_TERMO = 3;

// Mesmo ponto de corte do @media em busca-cartas.css — usado para saber, no
// momento da busca, se a grade está mostrando `colunas` ou `colunasMobile`.
const CONSULTA_MOBILE = '(max-width: 640px)';

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
  @Input() mostrarBotaoCamera = true;
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
  private readonly leitorDeCarta = inject(LeitorDeCartaService);
  private readonly registro = inject(RegistroEstadoBuscaCartasService);

  protected estado!: EstadoBuscaCartasService;
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly avisoInterrompido = signal<string | null>(null);
  protected readonly escaneando = signal(false);
  protected readonly erroCamera = signal<string | null>(null);
  // Registro em texto do último scan (OCR bruto, o que foi lido, o retorno
  // do Supabase) — mostrado na tela mesmo em caso de sucesso, pra dar pra
  // depurar no celular sem precisar de um debugger conectado no computador.
  protected readonly debugScan = signal<string | null>(null);

  ngOnInit(): void {
    this.estado = this.registro.obter(this.chave);

    if (this.leitorDeCarta.consumirEscaneamentoPendente()) {
      this.avisoInterrompido.set(
        'A leitura foi interrompida (o navegador recarregou a página ao abrir a câmera). Tente escanear de novo.',
      );
    }
  }

  abrirCamera(): void {
    this.avisoInterrompido.set(null);
    this.leitorDeCarta.marcarEscaneamentoIniciado();
    this.inputArquivoRef?.nativeElement.click();
  }

  // Diferente da leitura de impressão exata (usada na rota /carta via scan
  // antigo): aqui só preenche o nome lido nesta mesma busca (catálogo ou, em
  // Colecao, só o que o usuário já possui) e dispara a busca já existente,
  // mostrando o resultado do jeito que a tela já mostra hoje — sem abrir
  // nenhum modal nem decodificar mais nenhuma imagem grande logo após o OCR.
  async aoSelecionarFoto(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const foto = input.files?.[0];
    input.value = ''; // permite fotografar e escolher o mesmo arquivo de novo

    if (!foto) {
      return;
    }

    this.escaneando.set(true);
    this.avisoInterrompido.set(null);
    this.erroCamera.set(null);
    this.debugScan.set(null);

    try {
      const resultado = await this.leitorDeCarta.lerFoto(foto);
      this.debugScan.set(resultado.debug.join('\n'));

      if (resultado.tipo === 'erro') {
        this.erroCamera.set(resultado.mensagem);
        return;
      }

      this.estado.termo.set(resultado.resultado.carta.name);
      this.estado.campo.set('name');
      await this.buscar();
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
