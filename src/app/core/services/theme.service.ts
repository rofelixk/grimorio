import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Color } from '@models/card.model';
import { AuthService } from '@services/auth.service';

export interface ThemeColorInfo {
  label: string;
  base: string;
  hover: string;
}

export const THEME_COLOR_PALETTE: Record<Color, ThemeColorInfo> = {
  W: { label: 'Branco', base: '#d8cdb0', hover: '#e6dcc2' },
  U: { label: 'Azul', base: '#3d6b85', hover: '#4c7f9c' },
  B: { label: 'Roxo', base: '#7c5aa6', hover: '#8f6bb8' },
  R: { label: 'Vermelho', base: '#a8402c', hover: '#bf4f39' },
  G: { label: 'Verde', base: '#4c7a43', hover: '#5c8f52' },
};

export const THEME_COLOR_ORDER: Color[] = ['W', 'U', 'B', 'R', 'G'];
export const MAX_THEME_COLORS = 3;
// Fresh install / first run: seeds a Red-primary/Blue-accent look rather than
// leaving the modal untinted, since there is no "no theme" state to preserve.
export const DEFAULT_THEME_COLORS: Color[] = ['R', 'U'];

export interface ThemeRoles {
  primary?: string;
  primaryHover?: string;
  accent?: string;
  accentHover?: string;
  tertiary?: string;
  tertiaryHover?: string;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly authService = inject(AuthService);

  private readonly storageKey = 'grimorio.themeColors';
  private readonly colorsSignal = signal<Color[]>(this.load());
  readonly colors = this.colorsSignal.asReadonly();

  // Pick order = role priority: 1st -> primary, 2nd -> accent, 3rd -> tertiary.
  // Unset roles resolve to undefined (not null/''), which is what makes Angular's
  // [style.--x] bindings remove the inline custom property and let the CSS
  // var(--modal-x, var(--color-x)) fallback chain re-engage.
  readonly roles = computed<ThemeRoles>(() => {
    const [primary, accent, tertiary] = this.colorsSignal();
    return {
      primary: primary ? THEME_COLOR_PALETTE[primary].base : undefined,
      primaryHover: primary ? THEME_COLOR_PALETTE[primary].hover : undefined,
      accent: accent ? THEME_COLOR_PALETTE[accent].base : undefined,
      accentHover: accent ? THEME_COLOR_PALETTE[accent].hover : undefined,
      tertiary: tertiary ? THEME_COLOR_PALETTE[tertiary].base : undefined,
      tertiaryHover: tertiary ? THEME_COLOR_PALETTE[tertiary].hover : undefined,
    };
  });

  // Cross-device sync: when the signed-in account's user_metadata already has a
  // themeColors preference, it wins over this device's local copy (another device
  // set it last); when it doesn't (pre-existing account, or a fresh device that
  // never talked to this account before), this device's current colors get pushed
  // up once to claim it. toggle() itself never pushes — see saveToAccount().
  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (!user) {
        return;
      }
      const remote = this.authService.themeColors();
      untracked(() => {
        if (remote && remote.length > 0) {
          if (JSON.stringify(remote) !== JSON.stringify(this.colorsSignal())) {
            this.colorsSignal.set(remote);
            this.persist(remote);
          }
        } else {
          this.syncRemoteBestEffort(this.colorsSignal());
        }
      });
    });
  }

  private load(): Color[] {
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : DEFAULT_THEME_COLORS;
  }

  private persist(colors: Color[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(colors));
  }

  // Only used to auto-claim an account with no saved preference yet (see the
  // constructor effect) — an automatic background action, not something the user
  // asked for, so a failure here just means this device stays local-only for now
  // rather than surfacing an error anywhere.
  private syncRemoteBestEffort(colors: Color[]): void {
    if (this.authService.user()) {
      this.authService.updateThemeColors(colors).catch(() => undefined);
    }
  }

  // Local only — toggling doesn't hit Supabase per click (would spam the client
  // as someone clicks through swatches). Persisting to the account is an explicit
  // action via saveToAccount(), e.g. a "Save" button in Profile.
  toggle(color: Color): void {
    this.colorsSignal.update((colors) => {
      const isSelected = colors.includes(color);
      if (isSelected) {
        // At least 1 color must always stay selected.
        if (colors.length <= 1) {
          return colors;
        }
        const next = colors.filter((c) => c !== color);
        this.persist(next);
        return next;
      }

      if (colors.length >= MAX_THEME_COLORS) {
        return colors;
      }
      const next = [...colors, color];
      this.persist(next);
      return next;
    });
  }

  // Explicitly pushes the current local colors to the signed-in account. Throws
  // on failure (unlike the best-effort auto-claim above) so a caller like
  // Profile's Save button can surface a real error instead of failing silently.
  async saveToAccount(): Promise<void> {
    await this.authService.updateThemeColors(this.colorsSignal());
  }
}
