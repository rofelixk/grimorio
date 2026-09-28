import type { PlanarCard } from '../data/planechase/planar-card.model';
import { PLANAR_CARD } from '@utils/planechase-copy';

/** What a card's text column shows: shared by the in-game card block and the preview (SC-003). */
export interface PlanarCardText {
  /** `'en'` when the card has no up-to-date translation (006 FR-004a, FR-023). */
  lang: 'en' | null;
  /** Static text paragraphs; `[]` for phenomena. */
  text: string[];
  /** Chaos or encounter lines; `null` = a plane with no chaos ability (no plate). */
  ability: string[] | null;
  /** The plate's eyebrow: "Caos" or "Ao encontrar". */
  plateLabel: string;
}

const lines = (text: string) => text.split('\n').filter((line) => line.trim() !== '');

export function planarCardText(card: PlanarCard): PlanarCardText {
  return {
    lang: card.translated ? null : 'en',
    text: lines(card.text),
    ability: card.ability === null ? null : lines(card.ability),
    plateLabel: card.kind === 'phenomenon' ? PLANAR_CARD.encounter : PLANAR_CARD.chaos,
  };
}
