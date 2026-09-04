import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { Inicio } from './inicio';
import { CartasService } from '@shared/services';
import { ICarta } from '@shared/interfaces';

describe('Inicio', () => {
  let cartasServiceMock: { buscarCartas: jest.Mock };

  beforeEach(async () => {
    cartasServiceMock = { buscarCartas: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [
        provideRouter([]),
        { provide: CartasService, useValue: cartasServiceMock },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Inicio);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render Decks and Collection buttons', () => {
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const labels = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) =>
      (b as HTMLButtonElement).textContent?.trim(),
    );
    expect(labels).toEqual(['Decks', 'Collection', 'Search']);
  });

  it('links the buttons to the /baralhos and /colecao routes', () => {
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const targets = fixture.debugElement
      .queryAll(By.directive(RouterLink))
      .map((el) => el.injector.get(RouterLink).urlTree?.toString());
    expect(targets).toEqual(['/baralhos', '/colecao']);
  });

  it('shows no validation message before the first search attempt', () => {
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.erro-validacao')).toBeNull();
  });

  it('shows a validation message when searching with fewer than 3 characters, and does not call the service', () => {
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      termo: { set(v: string): void };
      buscar(): Promise<void>;
    };

    instancia.termo.set('as');
    instancia.buscar();
    fixture.detectChanges();

    const mensagem = fixture.nativeElement.querySelector('.erro-validacao');
    expect(mensagem?.textContent).toContain('at least 3 characters');
    expect(cartasServiceMock.buscarCartas).not.toHaveBeenCalled();
  });

  it('updates the validation message live once a first search attempt has happened', () => {
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      termo: { set(v: string): void };
      buscar(): Promise<void>;
    };

    instancia.termo.set('a');
    instancia.buscar();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.erro-validacao')).not.toBeNull();

    instancia.termo.set('ash');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.erro-validacao')).toBeNull();
  });

  it('disables the search button while loading and calls the service with the typed term and field', async () => {
    let resolverPromessa!: (valor: ICarta.Detalhes[]) => void;
    cartasServiceMock.buscarCartas.mockReturnValue(
      new Promise<ICarta.Detalhes[]>((resolve) => (resolverPromessa = resolve)),
    );

    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      termo: { set(v: string): void };
      buscar(): Promise<void>;
    };
    instancia.termo.set('ash');

    const promessaBusca = instancia.buscar();
    fixture.detectChanges();

    const botaoBuscar = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Search',
    ) as HTMLButtonElement;
    expect(botaoBuscar.disabled).toBe(true);
    expect(cartasServiceMock.buscarCartas).toHaveBeenCalledWith('ash', 'name');

    resolverPromessa([]);
    await promessaBusca;
    fixture.detectChanges();
    expect(botaoBuscar.disabled).toBe(false);
  });

  it('renders one Cartao per result on success', async () => {
    cartasServiceMock.buscarCartas.mockResolvedValue([cartaExemplo('1'), cartaExemplo('2')]);

    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      termo: { set(v: string): void };
      buscar(): Promise<void>;
    };
    instancia.termo.set('ash');
    await instancia.buscar();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-cartao').length).toBe(2);
  });

  it('shows "No results." when the search returns an empty array', async () => {
    cartasServiceMock.buscarCartas.mockResolvedValue([]);

    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      termo: { set(v: string): void };
      buscar(): Promise<void>;
    };
    instancia.termo.set('zzz');
    await instancia.buscar();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No results.');
  });

  it('shows the error message when the search fails', async () => {
    cartasServiceMock.buscarCartas.mockRejectedValue(
      new Error('permission denied for table cards'),
    );

    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      termo: { set(v: string): void };
      buscar(): Promise<void>;
    };
    instancia.termo.set('ash');
    await instancia.buscar();
    fixture.detectChanges();

    const erro = fixture.nativeElement.querySelector('.erro');
    expect(erro?.textContent).toContain('permission denied for table cards');
  });
});

function cartaExemplo(id: string): ICarta.Detalhes {
  return {
    oracle_id: id,
    name: 'Carta de teste',
    mana_cost: '{1}',
    mana_value: 1,
    type_line: 'Creature',
    oracle_text: null,
    color_identity: [],
    power: null,
    toughness: null,
    loyalty: null,
    layout: 'normal',
    commander_legality: 'legal',
    image_url: null,
    card_faces: null,
  };
}
