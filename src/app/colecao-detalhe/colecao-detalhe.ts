import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ColecoesService } from '@shared/services';
import { IColecao, ICarta } from '@shared/interfaces';
import { BuscaCartas, ModalColecao } from '@shared/components';
import { dividirEmSegmentos, SegmentoDeTexto } from '@shared/utils';

@Component({
  selector: 'app-colecao-detalhe',
  imports: [RouterLink, BuscaCartas, ModalColecao],
  templateUrl: './colecao-detalhe.html',
  styleUrl: './colecao-detalhe.css',
})
export class ColecaoDetalhe implements OnInit {
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly colecoesService = inject(ColecoesService);
  private readonly router = inject(Router);

  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly colecao = signal<IColecao.Detalhes | null>(null);
  protected readonly itens = signal<IColecao.ItemListado[]>([]);
  protected readonly modalAberta = signal(false);

  private colecaoId!: string;

  async ngOnInit(): Promise<void> {
    const id = this.rotaAtiva.snapshot.paramMap.get('id');
    if (!id) {
      this.erro.set('Coleção não encontrada.');
      this.carregando.set(false);
      return;
    }
    this.colecaoId = id;

    try {
      const [colecao, itens] = await Promise.all([
        this.colecoesService.buscarColecaoPorId(id),
        this.colecoesService.listarItens(id),
      ]);

      if (!colecao) {
        this.erro.set('Coleção não encontrada.');
      } else {
        this.colecao.set(colecao);
        this.itens.set(itens);
      }
    } catch (erroCapturado) {
      this.erro.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    } finally {
      this.carregando.set(false);
    }
  }

  protected get chaveBusca(): string {
    return `colecao-${this.colecaoId}`;
  }

  protected segmentosCustoDeMana(item: IColecao.ItemListado): SegmentoDeTexto[] {
    return dividirEmSegmentos(item.mana_cost ?? '');
  }

  async adicionarCarta(carta: ICarta.Detalhes): Promise<void> {
    await this.colecoesService.adicionarCarta(this.colecaoId, carta.oracle_id);
    this.itens.set(await this.colecoesService.listarItens(this.colecaoId));
  }

  async removerUmaCopia(item: IColecao.ItemListado): Promise<void> {
    await this.colecoesService.removerUmaCopia(item.id);
    this.itens.set(await this.colecoesService.listarItens(this.colecaoId));
  }

  abrirModalEditar(): void {
    this.modalAberta.set(true);
  }

  fecharModal(): void {
    this.modalAberta.set(false);
  }

  aoSalvar(colecaoAtualizada: IColecao.Detalhes): void {
    this.modalAberta.set(false);
    this.colecao.set(colecaoAtualizada);
  }

  async excluir(): Promise<void> {
    const colecaoAtual = this.colecao();
    if (!colecaoAtual) return;

    if (!confirm(`Excluir a coleção "${colecaoAtual.name}"? Isso também remove suas cartas.`)) {
      return;
    }

    try {
      await this.colecoesService.excluirColecao(colecaoAtual.id);
      this.router.navigate(['/colecao']);
    } catch (erroCapturado) {
      this.erro.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    }
  }
}
