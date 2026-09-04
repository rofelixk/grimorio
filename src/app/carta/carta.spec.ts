import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { convertToParamMap } from '@angular/router';
import { Carta } from './carta';
import { CartasService } from '@shared/services';
import { ICarta } from '@shared/interfaces';

describe('Carta', () => {
  let cartasServiceMock: { buscarCartaPorId: jest.Mock };

  function configurarComponente(oracleId: string | null) {
    cartasServiceMock = { buscarCartaPorId: jest.fn() };

    return TestBed.configureTestingModule({
      imports: [Carta],
      providers: [
        provideRouter([]),
        { provide: CartasService, useValue: cartasServiceMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(oracleId ? { oracleId } : {}) } },
        },
      ],
    }).compileComponents();
  }

  it('fetches the card by the oracleId route param and renders its details', async () => {
    cartasServiceMock = { buscarCartaPorId: jest.fn().mockResolvedValue(cartaSimples()) };
    await TestBed.configureTestingModule({
      imports: [Carta],
      providers: [
        provideRouter([]),
        { provide: CartasService, useValue: cartasServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ oracleId: cartaSimples().oracle_id }) },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Carta);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(cartasServiceMock.buscarCartaPorId).toHaveBeenCalledWith(cartaSimples().oracle_id);
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Ashling, the Limitless');
    expect(texto).toContain('Legendary Creature — Elemental Sorcerer');
    expect(fixture.nativeElement.querySelector('img.arte').src).toContain('example.jpg');
    expect(fixture.nativeElement.querySelector('.botao-virar')).toBeNull();
  });

  it('shows an error message when the card is not found', async () => {
    await configurarComponente('inexistente');
    cartasServiceMock.buscarCartaPorId.mockResolvedValue(null);

    const fixture = TestBed.createComponent(Carta);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain('not found');
  });

  it('shows an error message when the lookup fails', async () => {
    await configurarComponente('1');
    cartasServiceMock.buscarCartaPorId.mockRejectedValue(new Error('permission denied'));

    const fixture = TestBed.createComponent(Carta);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain(
      'permission denied',
    );
  });

  it('shows a Flip card button that switches faces (multiface)', async () => {
    cartasServiceMock = { buscarCartaPorId: jest.fn().mockResolvedValue(cartaMultiface()) };
    await TestBed.configureTestingModule({
      imports: [Carta],
      providers: [
        provideRouter([]),
        { provide: CartasService, useValue: cartasServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ oracleId: cartaMultiface().oracle_id }) },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Carta);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Aang, at the Crossroads');

    const botaoVirar = fixture.nativeElement.querySelector('.botao-virar') as HTMLButtonElement;
    expect(botaoVirar).not.toBeNull();
    botaoVirar.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Aang, Destined Savior');
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
