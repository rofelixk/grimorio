import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import {
  CartasService,
  EstadoBuscaCartasService,
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
  @Input() rotuloBotaoAdicionar = 'Add';
  // Quantas cartas por linha da grade de resultados — varia conforme a
  // página que usa esta busca (ex.: início vs. detalhe de coleção).
  @Input() colunas = 5;
  @Input() colunasMobile = 2;
  @Output() adicionarCarta = new EventEmitter<ICarta.Detalhes>();

  private readonly cartasService = inject(CartasService);
  private readonly registro = inject(RegistroEstadoBuscaCartasService);

  protected estado!: EstadoBuscaCartasService;
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    this.estado = this.registro.obter(this.chave);
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
