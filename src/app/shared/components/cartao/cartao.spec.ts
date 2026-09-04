import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ATRASO_PARA_VIRAR_MS, Cartao } from './cartao';
import { ICarta } from '@shared/interfaces';

type InstanciaDeTeste = {
  iniciarHover(): void;
  pararHover(): void;
  virada: () => boolean;
  progresso: () => number;
};

describe('Cartao', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cartao],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Cartao);
    fixture.componentRef.setInput('carta', cartaSimples());
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('links to the card detail page', () => {
    const fixture = TestBed.createComponent(Cartao);
    fixture.componentRef.setInput('carta', cartaSimples());
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a.cartao') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/carta/77a9e7cf-76e9-4323-8504-a5b831de00be');
  });

  it('renders only the front-face image for a single-faced card', () => {
    const fixture = TestBed.createComponent(Cartao);
    fixture.componentRef.setInput('carta', cartaSimples());
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('');
    const imagemFrente = fixture.nativeElement.querySelector('img.frente') as HTMLImageElement;
    expect(imagemFrente.src).toContain('example.jpg');
    expect(fixture.nativeElement.querySelector('img.verso')).toBeNull();
  });

  it('preloads both face images on init for a multiface card', () => {
    const criados: string[] = [];
    const ImagemOriginal = global.Image;
    class ImagemFalsa {
      set src(valor: string) {
        criados.push(valor);
      }
    }
    // @ts-expect-error substitui o construtor global de Image só para o teste
    global.Image = ImagemFalsa;

    const fixture = TestBed.createComponent(Cartao);
    fixture.componentRef.setInput('carta', cartaMultiface());
    fixture.detectChanges();

    expect(criados).toEqual([
      'https://cards.scryfall.io/normal/front/f/e/example.jpg',
      'https://cards.scryfall.io/normal/back/f/e/example.jpg',
    ]);

    global.Image = ImagemOriginal;
  });

  it('increases the highlight progress the longer the hover lasts, and flips once the delay elapses', () => {
    jest.useFakeTimers();

    const fixture = TestBed.createComponent(Cartao);
    fixture.componentRef.setInput('carta', cartaMultiface());
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as InstanciaDeTeste;

    instancia.iniciarHover();
    jest.advanceTimersByTime(ATRASO_PARA_VIRAR_MS / 2);
    expect(instancia.virada()).toBe(false);
    expect(instancia.progresso()).toBeGreaterThan(0);
    expect(instancia.progresso()).toBeLessThan(1);

    jest.advanceTimersByTime(ATRASO_PARA_VIRAR_MS / 2);
    expect(instancia.virada()).toBe(true);
  });

  it('returns to the front face and resets the highlight as soon as the hover ends', () => {
    jest.useFakeTimers();

    const fixture = TestBed.createComponent(Cartao);
    fixture.componentRef.setInput('carta', cartaMultiface());
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as InstanciaDeTeste;

    instancia.iniciarHover();
    jest.advanceTimersByTime(ATRASO_PARA_VIRAR_MS);
    expect(instancia.virada()).toBe(true);

    instancia.pararHover();
    expect(instancia.virada()).toBe(false);
    expect(instancia.progresso()).toBe(0);
  });

  it('does not schedule a flip for a single-faced card on hover', () => {
    jest.useFakeTimers();

    const fixture = TestBed.createComponent(Cartao);
    fixture.componentRef.setInput('carta', cartaSimples());
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as InstanciaDeTeste;

    instancia.iniciarHover();
    jest.advanceTimersByTime(ATRASO_PARA_VIRAR_MS);
    expect(instancia.virada()).toBe(false);
  });

  it('does not render a back face, apply the multiface class, or schedule a flip when the second face has no art', () => {
    jest.useFakeTimers();

    const fixture = TestBed.createComponent(Cartao);
    fixture.componentRef.setInput('carta', cartaMultifaceSemArteNoVerso());
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as InstanciaDeTeste;

    expect(fixture.nativeElement.querySelector('img.verso')).toBeNull();
    expect(fixture.nativeElement.querySelector('a.multiface')).toBeNull();

    instancia.iniciarHover();
    jest.advanceTimersByTime(ATRASO_PARA_VIRAR_MS);
    expect(instancia.virada()).toBe(false);
    expect(instancia.progresso()).toBe(0);
  });
});

function cartaSimples(): ICarta.Detalhes {
  return {
    oracle_id: '77a9e7cf-76e9-4323-8504-a5b831de00be',
    name: 'Ashling, the Limitless',
    mana_cost: '{2}{R}',
    mana_value: 3,
    type_line: 'Legendary Creature — Elemental Sorcerer',
    oracle_text: 'Elemental permanent spells you cast from your hand gain evoke {4}.',
    color_identity: ['B', 'G', 'R', 'U', 'W'],
    power: '2',
    toughness: '3',
    loyalty: null,
    layout: 'normal',
    commander_legality: 'legal',
    image_url: 'https://cards.scryfall.io/normal/front/5/9/example.jpg',
    card_faces: null,
  };
}

function cartaMultifaceSemArteNoVerso(): ICarta.Detalhes {
  const carta = cartaMultiface();
  return {
    ...carta,
    card_faces: carta.card_faces!.map((face, indice) =>
      indice === 1 ? { ...face, image_url: null } : face,
    ),
  };
}

function cartaMultiface(): ICarta.Detalhes {
  return {
    oracle_id: '96e5d4a1-0000-0000-0000-000000000000',
    name: 'Aang, at the Crossroads // Aang, Destined Savior',
    mana_cost: null,
    mana_value: 5,
    type_line: 'Legendary Creature — Human Avatar Ally // Legendary Creature — Avatar Ally',
    oracle_text: null,
    color_identity: ['G', 'U', 'W'],
    power: null,
    toughness: null,
    loyalty: null,
    layout: 'transform',
    commander_legality: 'legal',
    image_url: 'https://cards.scryfall.io/normal/front/f/e/example.jpg',
    card_faces: [
      {
        name: 'Aang, at the Crossroads',
        mana_cost: '{2}{G}{W}{U}',
        type_line: 'Legendary Creature — Human Avatar Ally',
        oracle_text: 'Flying\nWhenever this creature deals combat damage, do a thing.',
        colors: ['G', 'U', 'W'],
        power: '3',
        toughness: '3',
        image_url: 'https://cards.scryfall.io/normal/front/f/e/example.jpg',
      },
      {
        name: 'Aang, Destined Savior',
        mana_cost: '',
        type_line: 'Legendary Creature — Avatar Ally',
        oracle_text: 'Flying\nSomething else happens here.',
        colors: [],
        power: '4',
        toughness: '4',
        image_url: 'https://cards.scryfall.io/normal/back/f/e/example.jpg',
      },
    ],
  };
}
