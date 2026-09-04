import { TestBed } from '@angular/core/testing';
import { Cartao } from './cartao';
import { ICarta } from '@shared/interfaces';

describe('Cartao', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cartao],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Cartao);
    fixture.componentRef.setInput('carta', cartaSimples());
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders name, mana cost, mana value, type line, oracle text and color identity', () => {
    const fixture = TestBed.createComponent(Cartao);
    fixture.componentRef.setInput('carta', cartaSimples());
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Ashling, the Limitless');
    expect(texto).toContain('{2}{R}');
    expect(texto).toContain('3');
    expect(texto).toContain('Legendary Creature — Elemental Sorcerer');
    expect(texto).toContain('Elemental permanent spells');
    expect(texto).toContain('B, G, R, U, W');
  });

  it('falls back to card_faces[0] for mana cost and oracle text when the card-level fields are null (multiface)', () => {
    const fixture = TestBed.createComponent(Cartao);
    fixture.componentRef.setInput('carta', cartaMultiface());
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('{2}{G}{W}{U}');
    expect(texto).toContain('Flying');
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
