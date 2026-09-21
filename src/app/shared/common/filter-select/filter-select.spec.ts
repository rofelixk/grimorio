import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FilterOption, FilterSelect } from './filter-select';

describe('FilterSelect', () => {
  let fixture: ComponentFixture<FilterSelect>;
  let component: FilterSelect;

  const options: FilterOption[] = [
    { value: 'common', label: 'Comum', count: 12 },
    { value: 'rare', label: 'Raro', count: 3, gem: { code: 'R', tint: '#e8792f' } },
    { value: 'mythic', label: 'Mítico', count: 1 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterSelect],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterSelect);
    fixture.componentRef.setInput('label', 'Raridade');
    fixture.componentRef.setInput('values', []);
    fixture.componentRef.setInput('placeholder', 'Todas');
    fixture.componentRef.setInput('options', options);
    component = fixture.componentInstance;
  });

  function render(): void {
    fixture.detectChanges();
  }

  it('renders options with their live counts', () => {
    fixture.componentRef.setInput('open', true);
    render();

    const rows = fixture.nativeElement.querySelectorAll('.option');
    expect(rows.length).toBe(3);
    const counts = Array.from(rows).map((row) => (row as HTMLElement).querySelector('.count')?.textContent?.trim());
    expect(counts).toEqual(['12', '3', '1']);
  });

  it('emits picked with the option value on row click', () => {
    fixture.componentRef.setInput('open', true);
    render();
    let emitted: string | undefined;
    component.picked.subscribe((value) => (emitted = value));

    const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.option');
    rows[1].click();

    expect(emitted).toBe('rare');
  });

  it('allows multiple options to stay selected at once', () => {
    fixture.componentRef.setInput('values', ['common', 'rare']);
    fixture.componentRef.setInput('open', true);
    render();

    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.option'));
    expect(rows[0].classList.contains('selected')).toBe(true);
    expect(rows[1].classList.contains('selected')).toBe(true);
    expect(rows[2].classList.contains('selected')).toBe(false);
  });

  it('emits toggled on trigger click', () => {
    render();
    let emitted = false;
    component.toggled.subscribe(() => (emitted = true));

    fixture.nativeElement.querySelector('.trigger').click();

    expect(emitted).toBe(true);
  });

  it('emits closeRequested on Escape when open', () => {
    fixture.componentRef.setInput('open', true);
    render();
    let emitted = false;
    component.closeRequested.subscribe(() => (emitted = true));

    fixture.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(emitted).toBe(true);
  });

  it('does not emit closeRequested on Escape when already closed', () => {
    render();
    let emitted = false;
    component.closeRequested.subscribe(() => (emitted = true));

    fixture.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(emitted).toBe(false);
  });

  it('renders the gem when exactly one selected option has one', () => {
    fixture.componentRef.setInput('values', ['rare']);
    render();

    const gem = fixture.nativeElement.querySelector('.trigger .gem');
    expect(gem).toBeTruthy();
    expect(gem.textContent.trim()).toBe('R');
  });

  it('does not render a trigger gem when more than one option is selected', () => {
    fixture.componentRef.setInput('values', ['common', 'rare']);
    render();

    expect(fixture.nativeElement.querySelector('.trigger .gem')).toBeNull();
  });

  it('shows the placeholder when no values are selected', () => {
    render();

    const label = fixture.nativeElement.querySelector('.value-label');
    expect(label.textContent.trim()).toBe('Todas');
    expect(fixture.nativeElement.querySelector('.trigger .gem')).toBeNull();
  });

  it('joins up to two selected labels, and shows a count for three or more', () => {
    fixture.componentRef.setInput('values', ['common', 'rare']);
    render();
    expect(fixture.nativeElement.querySelector('.value-label').textContent.trim()).toBe('Comum, Raro');

    fixture.componentRef.setInput('values', ['common', 'rare', 'mythic']);
    render();
    expect(fixture.nativeElement.querySelector('.value-label').textContent.trim()).toBe('3 selecionados');
  });

  it('emits cleared instead of picked when the clear-all row is clicked', () => {
    const optionsWithClear: FilterOption[] = [{ value: '', label: 'Todas as raridades', count: 16 }, ...options];
    fixture.componentRef.setInput('options', optionsWithClear);
    fixture.componentRef.setInput('values', ['common']);
    fixture.componentRef.setInput('open', true);
    render();

    let cleared = false;
    let picked: string | undefined;
    component.cleared.subscribe(() => (cleared = true));
    component.picked.subscribe((value) => (picked = value));

    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.option'));
    rows[0].click();

    expect(cleared).toBe(true);
    expect(picked).toBeUndefined();
  });
});
