import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocationColorPicker } from './location-color-picker';

describe('LocationColorPicker', () => {
  let component: LocationColorPicker;
  let fixture: ComponentFixture<LocationColorPicker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationColorPicker],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationColorPicker);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('selected', 'R');
  });

  it('renders one swatch per color', () => {
    fixture.detectChanges();

    const swatches = fixture.nativeElement.querySelectorAll('.swatch');
    expect(swatches.length).toBe(5);
  });

  it('marks the selected color as checked', () => {
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.swatch'));
    const checked = buttons.find((btn) => btn.getAttribute('aria-checked') === 'true');

    expect(checked?.classList.contains('selected')).toBe(true);
  });

  it('clicking a swatch emits selectedChange with its color', () => {
    let emitted: string | undefined;
    component.selectedChange.subscribe((color) => (emitted = color));

    component.select('G');

    expect(emitted).toBe('G');
  });
});
