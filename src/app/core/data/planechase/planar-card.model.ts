/** `cards.json`, written by `npm run sync:planechase`. */
export interface PlanarCardData {
  /** Sorted: set `releasedAt` desc, set code, name. */
  cards: PlanarCardRecord[];
}

export interface PlanarCardRecord {
  /** `oracle_id`, stable across reprints. */
  id: string;
  /** English, never translated. */
  name: string;
  kind: 'plane' | 'phenomenon';
  typeLine: string;
  /** Static/triggered text; `''` for phenomena. */
  text: string;
  /** Chaos (plane) or encounter (phenomenon) ability; `null` = plane with no chaos ability. */
  ability: string | null;
  /** The newest non-gold printing's set, with its official English name. */
  set: { code: string; name: string; releasedAt: string };
  /** That printing's Scryfall image addresses. */
  images: { small: string; large: string };
  /** First 16 hex of `sha256(JSON.stringify([typeLine, text, ability]))`. */
  hash: string;
}

/** `cards.pt-br.json`, written by `/planechase-translate`. Keyed by card id. */
export type PlanarTranslations = Record<string, PlanarTranslation>;

interface PlanarTranslation {
  /** The card's `hash` when it was translated. */
  sourceHash: string;
  typeLine: string;
  text: string;
  /** Mirrors the card's `null`-ness. */
  ability: string | null;
}

/** Runtime card, built by `PlanechaseCatalogService`. */
export interface PlanarCard {
  id: string;
  name: string;
  kind: 'plane' | 'phenomenon';
  set: { code: string; name: string };
  images: { small: string; large: string };
  /** PT-BR when translated and fresh, else English. */
  typeLine: string;
  text: string;
  ability: string | null;
  /** True iff a translation exists and its `sourceHash` equals the card's `hash`. */
  translated: boolean;
}

export interface PlanarSet {
  code: string;
  name: string;
  cards: PlanarCard[];
}
