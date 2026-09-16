import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockCardLookupResult } from '@testing/card.mocks';
import { CardAddDetailPanel } from './card-add-detail-panel';

describe('CardAddDetailPanel', () => {
  let fixture: ComponentFixture<CardAddDetailPanel>;
  let component: CardAddDetailPanel;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardAddDetailPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(CardAddDetailPanel);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('candidate', mockCardLookupResult());
    fixture.detectChanges();
  });

  it('does not render a flip button for a single-faced card', () => {
    expect(fixture.debugElement.query(By.css('.flip-button'))).toBeNull();
  });

  it('renders a flip button for a multi-faced card and toggles the displayed face on click', () => {
    const faces = [
      { name: 'Front', imageUrl: 'https://example.com/front.jpg' },
      { name: 'Back', imageUrl: 'https://example.com/back.jpg' },
    ];
    fixture.componentRef.setInput('candidate', mockCardLookupResult({ faces }));
    fixture.detectChanges();

    expect(component.displayedFace()).toEqual(faces[0]);

    const flipButton = fixture.debugElement.query(By.css('.flip-button'));
    expect(flipButton).not.toBeNull();

    flipButton.nativeElement.click();
    expect(component.displayedFace()).toEqual(faces[1]);

    flipButton.nativeElement.click();
    expect(component.displayedFace()).toEqual(faces[0]);
  });

  it('resets faceIndex to 0 when the candidate changes', () => {
    const faces = [
      { name: 'Front', imageUrl: 'https://example.com/front.jpg' },
      { name: 'Back', imageUrl: 'https://example.com/back.jpg' },
    ];
    fixture.componentRef.setInput('candidate', mockCardLookupResult({ faces }));
    fixture.detectChanges();
    component.flipFace();
    expect(component.displayedFace()).toEqual(faces[1]);

    fixture.componentRef.setInput('candidate', mockCardLookupResult({ name: 'Other card' }));
    fixture.detectChanges();

    expect(component.displayedFace().name).toBe('Other card');
  });

  it('renders the Impressão select as disabled with the current printing as its only option', () => {
    const candidate = mockCardLookupResult({ setCode: 'MH3', collectorNumber: '161', setName: 'Modern Horizons 3' });
    fixture.componentRef.setInput('candidate', candidate);
    fixture.detectChanges();

    const select = fixture.debugElement.query(By.css('.left-column select'));
    expect(select.nativeElement.disabled).toBe(true);
    const options = select.nativeElement.querySelectorAll('option');
    expect(options.length).toBe(1);
    expect(options[0].textContent).toContain('MH3 · 161 · Modern Horizons 3');
  });

  it('clamps the quantity stepper at a minimum of 1', () => {
    fixture.componentRef.setInput('quantity', '1');
    fixture.detectChanges();

    let emitted: string | undefined;
    component.quantityChanged.subscribe((value) => (emitted = value));
    component.decrementQuantity();

    expect(emitted).toBe('1');
  });

  it('increments the quantity stepper from the current value', () => {
    fixture.componentRef.setInput('quantity', '3');
    fixture.detectChanges();

    let emitted: string | undefined;
    component.quantityChanged.subscribe((value) => (emitted = value));
    component.incrementQuantity();

    expect(emitted).toBe('4');
  });

  it('emits forSaleChanged when the À venda row is toggled', () => {
    let emitted: boolean | undefined;
    component.forSaleChanged.subscribe((value) => (emitted = value));

    const checkbox = fixture.debugElement.query(By.css('.checkbox-field input[type="checkbox"]'));
    checkbox.nativeElement.checked = true;
    checkbox.nativeElement.dispatchEvent(new Event('change'));

    expect(emitted).toBe(true);
  });

  it('emits back, confirm, and confirmAndContinue from their respective buttons', () => {
    let backEmitted = false;
    let confirmEmitted = false;
    let continueEmitted = false;
    component.back.subscribe(() => (backEmitted = true));
    component.confirm.subscribe(() => (confirmEmitted = true));
    component.confirmAndContinue.subscribe(() => (continueEmitted = true));

    fixture.debugElement.query(By.css('.back-button')).nativeElement.click();
    fixture.debugElement.query(By.css('.btn-secondary')).nativeElement.click();
    fixture.debugElement.query(By.css('.btn-primary')).nativeElement.click();

    expect(backEmitted).toBe(true);
    expect(confirmEmitted).toBe(true);
    expect(continueEmitted).toBe(true);
  });
});
