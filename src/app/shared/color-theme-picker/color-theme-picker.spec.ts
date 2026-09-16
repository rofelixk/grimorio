import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeService } from '@services/theme.service';
import { ColorThemePicker } from './color-theme-picker';

describe('ColorThemePicker', () => {
  let component: ColorThemePicker;
  let fixture: ComponentFixture<ColorThemePicker>;
  let themeService: ThemeService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ColorThemePicker],
    }).compileComponents();

    fixture = TestBed.createComponent(ColorThemePicker);
    component = fixture.componentInstance;
    themeService = TestBed.inject(ThemeService);
  });

  it('renders one swatch per color', () => {
    fixture.detectChanges();

    const swatches = fixture.nativeElement.querySelectorAll('.swatch');
    expect(swatches.length).toBe(5);
  });

  it('toggling a swatch calls through to ThemeService', () => {
    component.toggle('G');

    expect(themeService.colors()).toContain('G');
    expect(component.isSelected('G')).toBe(true);
  });

  it('disables an unpicked swatch once 3 colors are already picked', () => {
    component.toggle('G');
    component.toggle('W');
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.swatch'));
    const unpicked = buttons.find((btn) => btn.getAttribute('aria-pressed') === 'false');

    expect(unpicked?.disabled).toBe(true);
  });

  it('disables the sole remaining picked swatch', () => {
    component.toggle('U');
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.swatch'));
    const picked = buttons.find((btn) => btn.getAttribute('aria-pressed') === 'true');

    expect(picked?.disabled).toBe(true);
  });
});
