import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FilterOption, FilterSelect } from './filter-select';

describe('FilterSelect', () => {
  let fixture: ComponentFixture<FilterSelect>;
  let component: FilterSelect;

  const options: FilterOption[] = [
    { value: 'common', label: 'Comum', count: 12 },
    { value: 'rare', label: 'Raro', count: 3, gem: { code: 'R', tint: '#e8792f' } },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterSelect],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterSelect);
    fixture.componentRef.setInput('label', 'Raridade');
    fixture.componentRef.setInput('value', '');
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
    expect(rows.length).toBe(2);
    const counts = Array.from(rows).map((row) => (row as HTMLElement).querySelector('.count')?.textContent?.trim());
    expect(counts).toEqual(['12', '3']);
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

  it('renders the gem when the selected option has one', () => {
    fixture.componentRef.setInput('value', 'rare');
    render();

    const gem = fixture.nativeElement.querySelector('.trigger .gem');
    expect(gem).toBeTruthy();
    expect(gem.textContent.trim()).toBe('R');
  });

  it('shows the placeholder when value is empty', () => {
    render();

    const label = fixture.nativeElement.querySelector('.value-label');
    expect(label.textContent.trim()).toBe('Todas');
    expect(fixture.nativeElement.querySelector('.trigger .gem')).toBeNull();
  });
});
