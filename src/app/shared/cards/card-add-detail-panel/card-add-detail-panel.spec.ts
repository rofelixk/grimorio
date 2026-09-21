import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockCardLookupResult } from '@testing/card.mocks';
import { CardLookupResult, CardLookupService } from '@services/card-lookup.service';
import { CardAddDetailPanel } from './card-add-detail-panel';

describe('CardAddDetailPanel', () => {
  let fixture: ComponentFixture<CardAddDetailPanel>;
  let component: CardAddDetailPanel;
  let listPrintings: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    listPrintings = vi.fn().mockResolvedValue([]);

    await TestBed.configureTestingModule({
      imports: [CardAddDetailPanel],
      providers: [{ provide: CardLookupService, useValue: { listPrintings } }],
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

  it('renders the current printing as the only Impressão option while sibling printings load', () => {
    const candidate = mockCardLookupResult({ setCode: 'MH3', collectorNumber: '161', setName: 'Modern Horizons 3' });
    fixture.componentRef.setInput('candidate', candidate);
    fixture.detectChanges();

    const trigger = fixture.debugElement.query(By.css('.left-column .trigger'));
    trigger.nativeElement.click();
    fixture.detectChanges();

    const options = fixture.debugElement.queryAll(By.css('.left-column .option'));
    expect(options.length).toBe(1);
    expect(options[0].nativeElement.textContent).toContain('MH3 · 161 · Modern Horizons 3');
  });

  it('populates the Impressão select with every printing fetched by oracleId', async () => {
    const candidate = mockCardLookupResult({
      scryfallId: 'scry-mh3',
      setCode: 'MH3',
      collectorNumber: '161',
      setName: 'Modern Horizons 3',
    });
    const sibling = mockCardLookupResult({
      scryfallId: 'scry-lea',
      setCode: 'LEA',
      collectorNumber: '1',
      setName: 'Limited Edition Alpha',
    });
    listPrintings.mockResolvedValue([sibling, candidate]);

    fixture.componentRef.setInput('candidate', candidate);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(listPrintings).toHaveBeenCalledWith(candidate.oracleId);
    const trigger = fixture.debugElement.query(By.css('.left-column .trigger'));
    trigger.nativeElement.click();
    fixture.detectChanges();

    const options = fixture.debugElement.queryAll(By.css('.left-column .option'));
    expect(options.map((o) => o.nativeElement.textContent.trim())).toEqual([
      'LEA · 1 · Limited Edition Alpha',
      'MH3 · 161 · Modern Horizons 3',
    ]);
  });

  it('emits printingSelected with the matching printing when a different option is picked', async () => {
    const candidate = mockCardLookupResult({ scryfallId: 'scry-mh3', setCode: 'MH3' });
    const sibling = mockCardLookupResult({ scryfallId: 'scry-lea', setCode: 'LEA' });
    listPrintings.mockResolvedValue([sibling, candidate]);

    fixture.componentRef.setInput('candidate', candidate);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    let emitted: CardLookupResult | undefined;
    component.printingSelected.subscribe((value) => (emitted = value));

    const trigger = fixture.debugElement.query(By.css('.left-column .trigger'));
    trigger.nativeElement.click();
    fixture.detectChanges();

    const options = fixture.debugElement.queryAll(By.css('.left-column .option'));
    options.find((opt) => opt.nativeElement.textContent.includes('LEA'))!.nativeElement.click();

    expect(emitted).toEqual(sibling);
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
