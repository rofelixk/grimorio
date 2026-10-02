import { TestBed } from '@angular/core/testing';
import { CatalogError, type CatalogCard, type CatalogCardDetail, type CatalogPrinting } from '@models/catalog.model';
import { CardCatalogService } from '@services/card-catalog.service';
import { stubDialog } from '@testing/dialog';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CardModal, type CardSave } from './card-modal';

const picked: CatalogCard = {
  oracleId: 'o1',
  name: 'Sol Ring',
  typeLine: 'Artifact',
  colorIdentity: [],
  imageUrl: 'https://img/sol.jpg',
};

const printing = (id: string, over: Partial<CatalogPrinting> = {}): CatalogPrinting => ({
  scryfallId: id,
  setCode: 'CMD',
  setName: 'Commander 2011',
  collectorNumber: '1',
  rarity: 'uncommon',
  lang: 'en',
  releasedAt: '2011-06-17',
  imageUrl: `https://img/${id}.jpg`,
  imageSmall: null,
  artist: 'Mike Bierek',
  faces: null,
  ...over,
});

const detail = (printings: CatalogPrinting[]): CatalogCardDetail => ({
  ...picked,
  oracleText: '{T}: Add {C}{C}.',
  commanderLegality: 'legal',
  cardFaces: null,
  printings,
});

class FakeCatalog {
  calls: string[] = [];
  pending: { resolve: (d: CatalogCardDetail) => void; reject: (e: unknown) => void }[] = [];
  detail(oracleId: string): Promise<CatalogCardDetail> {
    this.calls.push(oracleId);
    return new Promise((resolve, reject) => this.pending.push({ resolve, reject }));
  }
}

describe('CardModal (add)', () => {
  let restoreDialog: () => void;
  let catalog: FakeCatalog;

  beforeEach(() => {
    restoreDialog = stubDialog();
    catalog = new FakeCatalog();
    TestBed.configureTestingModule({ providers: [{ provide: CardCatalogService, useValue: catalog }] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    restoreDialog();
  });

  function render() {
    const fixture = TestBed.createComponent(CardModal);
    fixture.componentRef.setInput('mode', 'add');
    fixture.componentRef.setInput('catalogCard', picked);
    fixture.componentRef.setInput('collectionName', 'Fichário');
    const saves: CardSave[] = [];
    let closes = 0;
    fixture.componentInstance.save.subscribe((s) => saves.push(s));
    fixture.componentInstance.closed.subscribe(() => closes++);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const flush = async () => {
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const resolve = async (printings: CatalogPrinting[]) => {
      catalog.pending[catalog.pending.length - 1].resolve(detail(printings));
      await flush();
    };
    const buttons = () => [...el.querySelectorAll<HTMLButtonElement>('.actions button')];
    const button = (label: string) => buttons().find((b) => b.textContent?.trim() === label)!;
    const quantity = el.querySelector<HTMLInputElement>('input[inputmode="numeric"]')!;
    const setQuantity = (value: string) => {
      quantity.value = value;
      quantity.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const select = (index: number, value: string) => {
      const field = el.querySelectorAll<HTMLSelectElement>('select')[index];
      field.value = value;
      field.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    return { fixture, el, flush, resolve, buttons, button, quantity, setQuantity, select, saves, closes: () => closes };
  }

  it('shows the picked card, the defaults and disabled saves while the printings load', async () => {
    const { el, buttons, quantity } = render();
    expect(catalog.calls).toEqual(['o1']);
    expect(el.querySelector('.eyebrow')?.textContent).toBe('Adicionar carta');
    expect(el.querySelector('h2')?.textContent).toBe('Sol Ring');
    expect(el.querySelector('.type-row')?.textContent).toContain('Artifact');
    expect(el.querySelector('.image img')?.getAttribute('src')).toBe('https://img/sol.jpg');
    expect(el.querySelector('.printing-loading')?.textContent?.trim()).toBe('Carregando impressões…');
    expect(el.querySelector('.printing-loading')?.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(el.querySelector('.printing-loading'));

    const selects = el.querySelectorAll<HTMLSelectElement>('select');
    expect(selects[0].value).toBe('nonfoil');
    expect(selects[1].value).toBe('en');
    expect(selects[2].value).toBe('NM');
    expect(quantity.value).toBe('1');
    expect(el.querySelector<HTMLInputElement>('.check input')!.checked).toBe(false);
    expect(buttons().map((b) => [b.textContent?.trim(), b.disabled])).toEqual([
      ['Cancelar', false],
      ['Salvar e adicionar outra', true],
      ['Salvar', true],
    ]);
  });

  it('selects the first English printing in the loaded order, and moves focus to its trigger', async () => {
    const { el, resolve, button } = render();
    await resolve([
      printing('jp', { lang: 'jp', setName: 'Japan' }),
      printing('en', { setName: 'Commander 2011' }),
    ]);
    expect(el.querySelector('.printing app-select-list .printing-face')?.textContent).toContain('Commander 2011');
    expect(el.querySelector('.image img')?.getAttribute('src')).toBe('https://img/en.jpg');
    expect(el.querySelector('.artist')?.textContent).toBe('Mike Bierek');
    expect(button('Salvar').disabled).toBe(false);
    expect(document.activeElement).toBe(el.querySelector('.printing app-select-list button'));
  });

  it('hides the artist when the printing has none', async () => {
    const { el, resolve } = render();
    await resolve([printing('a', { artist: null })]);
    expect(el.querySelector('.artist')).toBeNull();
  });

  it('filters the printings by set but keeps the selected one, and says when none match', async () => {
    const { el, resolve, fixture, flush } = render();
    await resolve([
      printing('a', { setName: 'Commander 2011', setCode: 'CMD' }),
      printing('b', { setName: 'Alpha', setCode: 'LEA' }),
    ]);
    const filter = el.querySelector<HTMLInputElement>('.set-filter input')!;
    filter.value = 'alp';
    filter.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('.printing app-select-list button')!.click();
    await flush();
    const options = [...el.querySelectorAll('[role="option"]')];
    // The selected printing ("Commander 2011") stays next to the match.
    expect(options.length).toBe(2);

    filter.value = 'zzz';
    filter.dispatchEvent(new Event('input'));
    await flush();
    expect(el.querySelectorAll('[role="option"]').length).toBe(1);
  });

  it('shows the error plate and keeps saving disabled when the printings fail, and retries', async () => {
    const { el, resolve, buttons, flush } = render();
    catalog.pending[0].reject(new CatalogError('failed'));
    await flush();
    expect(el.querySelector('.left .plate--error')?.textContent).toContain('Não foi possível acessar o catálogo');
    expect(el.querySelector('.image')).toBeNull();
    expect(buttons().filter((b) => b.disabled).length).toBe(2);

    el.querySelector<HTMLButtonElement>('.left .plate--error button')!.click();
    expect(catalog.calls.length).toBe(2);
    await resolve([printing('a')]);
    expect(el.querySelector('.plate--error')).toBeNull();
    expect(buttons().filter((b) => b.disabled).length).toBe(0);
  });

  it('validates the quantity and disables both saves while it is invalid', async () => {
    const { el, resolve, buttons, setQuantity, quantity } = render();
    await resolve([printing('a')]);
    for (const bad of ['0', '1.5', 'abc', '10000', '']) {
      setQuantity(bad);
      expect(el.querySelector('.field__error')?.textContent).toBe('Use um número inteiro de 1 a 9.999.');
      expect(quantity.getAttribute('aria-invalid')).toBe('true');
      expect(quantity.getAttribute('aria-describedby')).toBe(el.querySelector('.field__error')?.id);
      expect(buttons().filter((b) => b.disabled).length).toBe(2);
    }
    setQuantity('12');
    expect(el.querySelector('.field__error')).toBeNull();
    expect(quantity.getAttribute('aria-invalid')).toBeNull();
    expect(buttons().filter((b) => b.disabled).length).toBe(0);
  });

  it('emits the draft with the printing identity and the typed fields for both buttons', async () => {
    const { el, resolve, button, setQuantity, select, saves, fixture } = render();
    await resolve([printing('a')]);
    select(0, 'foil');
    select(1, 'pt');
    select(2, 'LP');
    setQuantity('3');
    const sale = el.querySelector<HTMLInputElement>('.check input')!;
    sale.checked = true;
    sale.dispatchEvent(new Event('change'));
    const notes = el.querySelector<HTMLTextAreaElement>('textarea')!;
    notes.value = '  de um amigo  ';
    notes.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    button('Salvar').click();
    button('Salvar e adicionar outra').click();

    expect(saves.map((s) => s.again)).toEqual([false, true]);
    const draft = saves[0].draft;
    expect(draft).toMatchObject({
      name: 'Sol Ring',
      scryfallId: 'a',
      oracleId: 'o1',
      setCode: 'CMD',
      collectorNumber: '1',
      artist: 'Mike Bierek',
      canBeCommander: false,
      finish: 'foil',
      language: 'pt',
      condition: 'LP',
      quantity: 3,
      forSale: true,
      notes: 'de um amigo',
    });
    expect(saves[1].draft).toEqual(draft);
  });

  it('cancels with nothing emitted', async () => {
    const { resolve, button, saves, closes } = render();
    await resolve([printing('a')]);
    button('Cancelar').click();
    expect(closes()).toBe(1);
    expect(saves).toEqual([]);
  });
});
