import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CampoDeBusca, ColecoesService } from '@shared/services';
import { IColecao } from '@shared/interfaces';
import { PALETA_CORES_COLECAO } from '@shared/constants';
import { ModalColecao } from '@shared/components';
import { destacarTermo, TextoDestacado } from '@shared/utils';

const TAMANHO_MINIMO_TERMO_BUSCA_CARTA = 3;

@Component({
  selector: 'app-colecao',
  imports: [RouterLink, ModalColecao, DatePipe],
  templateUrl: './colecao.html',
  styleUrl: './colecao.css',
})
export class Colecao implements OnInit {
  private readonly colecoesService = inject(ColecoesService);
  private readonly router = inject(Router);

  protected readonly paleta = PALETA_CORES_COLECAO;
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly colecoes = signal<IColecao.Detalhes[]>([]);
  protected readonly modalAberta = signal(false);

  // Mobile only (≤640px): busca de cartas vira uma folha (sheet) recolhível no
  // rodapé em vez de coluna lateral — ver colecao.css. Desktop ignora isso.
  protected readonly sheetAberta = signal(false);

  protected readonly termoBuscaCarta = signal('');
  protected readonly campoBuscaCarta = signal<CampoDeBusca>('name');
  protected readonly tentouBuscarCarta = signal(false);
  protected readonly buscandoCarta = signal(false);
  protected readonly erroBuscaCarta = signal<string | null>(null);
  protected readonly resultadosBuscaCarta = signal<IColecao.ItemEmColecao[] | null>(null);

  // Termo realmente buscado (pode ficar defasado do que está digitado agora)
  // — usado só para destacar por que cada resultado bateu.
  private termoBuscaCartaUsado = '';

  async ngOnInit(): Promise<void> {
    await this.carregarColecoes();
  }

  protected get termoBuscaCartaInvalido(): boolean {
    return (
      this.tentouBuscarCarta() &&
      this.termoBuscaCarta().trim().length < TAMANHO_MINIMO_TERMO_BUSCA_CARTA
    );
  }

  async buscarCarta(): Promise<void> {
    this.tentouBuscarCarta.set(true);

    const termo = this.termoBuscaCarta().trim();
    if (termo.length < TAMANHO_MINIMO_TERMO_BUSCA_CARTA) {
      return;
    }

    this.buscandoCarta.set(true);
    this.erroBuscaCarta.set(null);

    try {
      this.resultadosBuscaCarta.set(
        await this.colecoesService.buscarCartasEmColecoes(termo, this.campoBuscaCarta()),
      );
      this.termoBuscaCartaUsado = termo;
    } catch (erroCapturado) {
      this.erroBuscaCarta.set(
        erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.',
      );
    } finally {
      this.buscandoCarta.set(false);
    }
  }

  // Destaca, em qualquer campo exibido (nome ou tipo), o trecho que bateu com
  // a busca — não precisa saber qual campo foi escolhido no filtro, já que só
  // o campo realmente buscado vai conter o termo.
  protected destacar(texto: string): TextoDestacado {
    return destacarTermo(texto, this.termoBuscaCartaUsado);
  }

  protected corHex(chave: string): string {
    return this.paleta.find((opcao) => opcao.chave === chave)?.hex ?? '#8b8d98';
  }

  abrirModalCriar(): void {
    this.modalAberta.set(true);
  }

  fecharModal(): void {
    this.modalAberta.set(false);
  }

  async aoSalvar(colecao: IColecao.Detalhes): Promise<void> {
    this.modalAberta.set(false);
    this.router.navigate(['/colecao', colecao.id]);
  }

  // Mobile: alterna a folha de busca entre recolhida e expandida. Ver
  // "State management" em design_handoff_colecao_1e/README.md — versão sem
  // arrastar, um toggle já é suficiente.
  alternarSheet(): void {
    this.sheetAberta.update((aberta) => !aberta);
  }

  private async carregarColecoes(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);

    try {
      this.colecoes.set(await this.colecoesService.listarColecoes());
    } catch (erroCapturado) {
      this.erro.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    } finally {
      this.carregando.set(false);
    }
  }
}
