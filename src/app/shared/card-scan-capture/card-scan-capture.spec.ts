import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CardScanCapture } from './card-scan-capture';

describe('CardScanCapture', () => {
  let component: CardScanCapture;
  let fixture: ComponentFixture<CardScanCapture>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardScanCapture],
    }).compileComponents();

    fixture = TestBed.createComponent(CardScanCapture);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits the selected file', () => {
    const file = new File(['data'], 'card.png', { type: 'image/png' });
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [file] });

    let emitted: Blob | undefined;
    component.frameCaptured.subscribe((blob) => (emitted = blob));

    component.onFileSelected({ target: input } as unknown as Event);

    expect(emitted).toBe(file);
  });

  it('does not emit when no file was selected', () => {
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [] });

    let emitted = false;
    component.frameCaptured.subscribe(() => (emitted = true));

    component.onFileSelected({ target: input } as unknown as Event);

    expect(emitted).toBe(false);
  });
});
