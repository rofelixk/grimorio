import { Injectable, computed, inject } from '@angular/core';
import { Color } from '@models/card.model';
import { DEFAULT_IDENTITY, IDENTITY_HEX } from '../utils/identity.util';
import { IdentityService } from './identity.service';

export interface ThemeColorInfo {
  label: string;
  base: string;
  hover: string;
}

export const THEME_COLOR_PALETTE: Record<Color, ThemeColorInfo> = {
  W: { label: 'Branco', ...IDENTITY_HEX.W },
  U: { label: 'Azul', ...IDENTITY_HEX.U },
  B: { label: 'Preto', ...IDENTITY_HEX.B },
  R: { label: 'Vermelho', ...IDENTITY_HEX.R },
  G: { label: 'Verde', ...IDENTITY_HEX.G },
};

export const THEME_COLOR_ORDER: Color[] = ['W', 'U', 'B', 'R', 'G'];
export const DEFAULT_THEME_COLORS: Color[] = [...DEFAULT_IDENTITY];

export interface ThemeRoles {
  primary?: string;
  primaryHover?: string;
  accent?: string;
  accentHover?: string;
  tertiary?: string;
  tertiaryHover?: string;
}

// Legacy adapter (R13): legacy components still read `roles()`/`colors()` in their old shape,
// now derived from IdentityService — the active profile's colors, or the default identity with
// none — so they never keep showing a signed-out profile's colors. Choosing colors happens only
// in the entry modal's identity picker; there is no toggle or persistence here.
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly identity = inject(IdentityService);

  readonly colors = computed<Color[]>(() => this.identity.activeColors() ?? [...DEFAULT_IDENTITY]);

  // Pick order = role priority: 1st -> primary, 2nd -> accent, 3rd -> tertiary. Unset roles
  // resolve to undefined, which removes the legacy components' inline custom property and
  // lets their CSS fallback chain re-engage.
  readonly roles = computed<ThemeRoles>(() => {
    const [primary, accent, tertiary] = this.colors();
    return {
      primary: primary ? THEME_COLOR_PALETTE[primary].base : undefined,
      primaryHover: primary ? THEME_COLOR_PALETTE[primary].hover : undefined,
      accent: accent ? THEME_COLOR_PALETTE[accent].base : undefined,
      accentHover: accent ? THEME_COLOR_PALETTE[accent].hover : undefined,
      tertiary: tertiary ? THEME_COLOR_PALETTE[tertiary].base : undefined,
      tertiaryHover: tertiary ? THEME_COLOR_PALETTE[tertiary].hover : undefined,
    };
  });
}
