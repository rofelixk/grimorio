import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BaralhosService } from '@shared/services';
import { IBaralho } from '@shared/interfaces';
import { BuscaCartas, ModalBaralho, CartaEscolhidaParaAdicionar } from '@shared/components';
import { dividirEmSegmentos, elegivelComoComandante, SegmentoDeTexto } from '@shared/utils';

@Component({
  selector: 'app-baralho-detalhe',
  imports: [RouterLink, BuscaCartas, ModalBaralho],
  templateUrl: './baralho-detalhe.html',
  styleUrl: './baralho-detalhe.css',
})
export class BaralhoDetalhe implements OnInit {
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly baralhosService = inject(BaralhosService);
  private readonly router = inject(Router);

  // Referenciado no template para filtrar o seletor de comandante — função
  // pura, sem necessidade de bind.
  protected readonly elegivelComoComandante = elegivelComoComandante;

  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly erroAcao = signal<string | null>(null);
  protected readonly baralho = signal<IBaralho.Detalhes | null>(null);
  protected readonly itens = signal<IBaralho.ItemListado[]>([]);
  protected readonly modalAberta = signal(false);

  // Ver nota em ColecaoDetalhe.sheetAberta — mesmo tratamento de folha
  // recolhível no mobile.
  protected readonly sheetAberta = signal(false);

  private baralhoId!: string;

  async ngOnInit(): Promise<void> {
    const id = this.rotaAtiva.snapshot.paramMap.get('id');
    if (!id) {
      this.erro.set('Baralho não encontrado.');
      this.carregando.set(false);
      return;
    }
    this.baralhoId = id;

    await this.recarregar();
    this.carregando.set(false);
  }

  protected get chaveBusca(): string {
    return `baralho-${this.baralhoId}`;
  }

  protected get comandante(): IBaralho.ItemListado | null {
    return this.itens().find((item) => item.is_commander) ?? null;
  }

  protected get cartasNaoComandante(): IBaralho.ItemListado[] {
    return this.itens().filter((item) => !item.is_commander);
  }

  protected get totalCartas(): number {
    return this.cartasNaoComandante.reduce((soma, item) => soma + item.quantity, 0);
  }

  protected segmentosCustoDeMana(item: IBaralho.ItemListado): SegmentoDeTexto[] {
    return dividirEmSegmentos(item.mana_cost ?? '');
  }

  async aoDefinirComandante({ carta, printingId }: CartaEscolhidaParaAdicionar): Promise<void> {
    this.erroAcao.set(null);
    try {
      await this.baralhosService.definirComandante(this.baralhoId, carta, printingId);
      await this.recarregar();
    } catch (erroCapturado) {
      this.erroAcao.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    }
  }

  async trocarComandante(): Promise<void> {
    if (!confirm('Trocar o comandante? A carta atual sai do baralho.')) {
      return;
    }

    this.erroAcao.set(null);
    try {
      await this.baralhosService.removerComandante(this.baralhoId);
      await this.recarregar();
    } catch (erroCapturado) {
      this.erroAcao.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    }
  }

  async aoAdicionarCarta({ carta, printingId }: CartaEscolhidaParaAdicionar): Promise<void> {
    this.erroAcao.set(null);
    try {
      await this.baralhosService.adicionarCarta(
        this.baralhoId,
        carta,
        printingId,
        this.comandante?.color_identity ?? null,
      );
      await this.recarregar();
    } catch (erroCapturado) {
      this.erroAcao.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    }
  }

  async removerUmaCopia(item: IBaralho.ItemListado): Promise<void> {
    await this.baralhosService.removerUmaCopia(item.id);
    await this.recarregar();
  }

  // Ver nota em Colecao.alternarSheet — mesmo toggle, sem arrastar.
  alternarSheet(): void {
    this.sheetAberta.update((aberta) => !aberta);
  }

  abrirModalEditar(): void {
    this.modalAberta.set(true);
  }

  fecharModal(): void {
    this.modalAberta.set(false);
  }

  aoSalvar(baralhoAtualizado: IBaralho.Detalhes): void {
    this.modalAberta.set(false);
    this.baralho.set(baralhoAtualizado);
  }

  async excluir(): Promise<void> {
    const baralhoAtual = this.baralho();
    if (!baralhoAtual) return;

    if (!confirm(`Excluir o baralho "${baralhoAtual.name}"? Isso também remove suas cartas.`)) {
      return;
    }

    try {
      await this.baralhosService.excluirBaralho(baralhoAtual.id);
      this.router.navigate(['/baralhos']);
    } catch (erroCapturado) {
      this.erro.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    }
  }

  private async recarregar(): Promise<void> {
    try {
      const [baralho, itens] = await Promise.all([
        this.baralhosService.buscarBaralhoPorId(this.baralhoId),
        this.baralhosService.listarCartas(this.baralhoId),
      ]);

      if (!baralho) {
        this.erro.set('Baralho não encontrado.');
      } else {
        this.baralho.set(baralho);
        this.itens.set(itens);
      }
    } catch (erroCapturado) {
      this.erro.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    }
  }
}
