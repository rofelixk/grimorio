import type {
  PlanarCard,
  PlanarCardData,
  PlanarCardRecord,
  PlanarTranslations,
} from '../data/planechase/planar-card.model';
import type { RandomInt } from '@utils/crypto-random.util';

// Hand-written Planechase data for specs: never the real cards.json. Two sets, 11 planes and
// 3 phenomena; `p11` has no chaos ability, `p09` has no translation and `p10`'s is stale.

function record(
  id: string,
  kind: PlanarCardRecord['kind'],
  set: PlanarCardRecord['set'],
  ability: string | null = kind === 'plane' ? `Whenever chaos ensues, ${id} does a thing.` : null,
): PlanarCardRecord {
  const name = `Card ${id.toUpperCase()}`;
  return {
    id,
    name,
    kind,
    typeLine: kind === 'plane' ? `Plane — World ${id}` : 'Phenomenon',
    text: kind === 'plane' ? `Static text of ${id}.\nSecond line of ${id}.` : '',
    ability: kind === 'phenomenon' ? `When you encounter ${name}, something happens.` : ability,
    set,
    images: { small: `https://img.test/small/${id}.jpg`, large: `https://img.test/large/${id}.jpg` },
    hash: `hash-${id}`,
  };
}

const NEW_SET = { code: 'nws', name: 'New Set', releasedAt: '2024-01-01' };
const OLD_SET = { code: 'old', name: 'Old Set', releasedAt: '2012-06-01' };

export const PLANAR_RECORDS: PlanarCardRecord[] = [
  ...['p01', 'p02', 'p03', 'p04', 'p05', 'p06'].map((id) => record(id, 'plane', NEW_SET)),
  record('f01', 'phenomenon', NEW_SET),
  ...['p07', 'p08', 'p09', 'p10'].map((id) => record(id, 'plane', OLD_SET)),
  record('p11', 'plane', OLD_SET, null),
  record('f02', 'phenomenon', OLD_SET),
  record('f03', 'phenomenon', OLD_SET),
];

export const PLANAR_DATA: PlanarCardData = { cards: PLANAR_RECORDS };

export const PLANAR_TRANSLATIONS: PlanarTranslations = Object.fromEntries(
  PLANAR_RECORDS.filter((card) => card.id !== 'p09').map((card) => [
    card.id,
    {
      sourceHash: card.id === 'p10' ? 'hash-outdated' : card.hash,
      typeLine: card.kind === 'plane' ? `Plano — Mundo ${card.id}` : 'Fenômeno',
      text: card.text ? `Texto de ${card.id}.\nSegunda linha de ${card.id}.` : '',
      ability: card.ability === null ? null : `Sempre que o caos se instaurar, ${card.id} faz algo.`,
    },
  ]),
);

/** The runtime cards the catalog builds from the fixtures above. */
export const PLANAR_CARDS: PlanarCard[] = PLANAR_RECORDS.map((card) => {
  const translation = PLANAR_TRANSLATIONS[card.id];
  const fresh = translation?.sourceHash === card.hash ? translation : undefined;
  return {
    id: card.id,
    name: card.name,
    kind: card.kind,
    set: { code: card.set.code, name: card.set.name },
    images: card.images,
    typeLine: fresh?.typeLine ?? card.typeLine,
    text: fresh?.text ?? card.text,
    ability: fresh ? fresh.ability : card.ability,
    translated: !!fresh,
  };
});

export function planarCard(id: string): PlanarCard {
  const card = PLANAR_CARDS.find((c) => c.id === id);
  if (!card) {
    throw new Error(`No fixture card ${id}.`);
  }
  return card;
}

export const planarKindOf = (id: string): PlanarCard['kind'] => (id.startsWith('f') ? 'phenomenon' : 'plane');

/**
 * A `RandomInt` returning `values` in order (0 once they run out). Each value must be below the
 * `n` it's asked for, so a wrong script fails loudly instead of skewing a test.
 */
export function scriptedRandom(values: number[]): RandomInt {
  let index = 0;
  return (n) => {
    const value = values[index++] ?? 0;
    if (value < 0 || value >= n) {
      throw new RangeError(`scriptedRandom: ${value} is not in [0, ${n}).`);
    }
    return value;
  };
}
