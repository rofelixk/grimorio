import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardLookupService } from '@services/card-lookup.service';
import { mockCardLookupResult } from '@testing/card.mocks';
import { CardScanForm, guessSetAndCollector } from './card-scan-form';

const recognize = vi.fn();
const terminate = vi.fn().mockResolvedValue(undefined);
const setParameters = vi.fn().mockResolvedValue(undefined);
const createWorker = vi.fn().mockResolvedValue({ recognize, terminate, setParameters });

vi.mock('tesseract.js', () => ({
  default: {
    createWorker: (...args: unknown[]) => createWorker(...args),
    PSM: { SPARSE_TEXT: '11' },
  },
}));

describe('guessSetAndCollector', () => {
  it('extracts set code and collector number from clean OCR text', () => {
    expect(guessSetAndCollector('145/264\nWAR • EN')).toEqual({
      setCode: 'WAR',
      collectorNumber: '145',
    });
  });

  it('handles a lowercase set code', () => {
    expect(guessSetAndCollector('12/280\nmh3 • en'.toUpperCase())).toEqual({
      setCode: 'MH3',
      collectorNumber: '12',
    });
  });

  it('returns empty strings when nothing matches', () => {
    expect(guessSetAndCollector('unreadable garbage')).toEqual({
      setCode: '',
      collectorNumber: '',
    });
  });

  it('handles a missing collector number gracefully', () => {
    expect(guessSetAndCollector('WAR • EN')).toEqual({
      setCode: 'WAR',
      collectorNumber: '',
    });
  });

  it('extracts a bare zero-padded collector number with a rarity-letter prefix (no total count)', () => {
    expect(guessSetAndCollector('C 0008\nSOS • EN')).toEqual({
      setCode: 'SOS',
      collectorNumber: '0008',
    });
  });

  it('extracts the set code when the bullet separator is dropped entirely by OCR', () => {
    expect(guessSetAndCollector('C 0008\n\nSOS EN')).toEqual({
      setCode: 'SOS',
      collectorNumber: '0008',
    });
  });

  it('does not mistake a plain 4-digit number (e.g. a year) for a collector number', () => {
    expect(guessSetAndCollector('™ & © 2026 Wizards of the Coast')).toEqual({
      setCode: '',
      collectorNumber: '',
    });
  });
});

describe('CardScanForm', () => {
  let component: CardScanForm;
  let fixture: ComponentFixture<CardScanForm>;
  let invertedBlob: Blob;

  beforeEach(async () => {
    recognize.mockReset().mockResolvedValue({ data: { text: '145/264\nWAR • EN' } });
    createWorker.mockClear();
    terminate.mockClear();
    setParameters.mockClear();

    invertedBlob = new Blob(['inverted']);
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 10, height: 10 } as ImageBitmap),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(40) }),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      callback: BlobCallback,
    ) {
      callback(invertedBlob);
    });

    await TestBed.configureTestingModule({
      imports: [CardScanForm],
      providers: [
        {
          provide: CardLookupService,
          useValue: { lookup: vi.fn().mockResolvedValue(mockCardLookupResult()) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CardScanForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('inverts the captured image and runs OCR on it once to prefill the guessed fields', async () => {
    const blob = new Blob(['fake-image']);

    await component.onFrameCaptured(blob);

    expect(createWorker).toHaveBeenCalledWith('eng');
    expect(setParameters).toHaveBeenCalledWith(
      expect.objectContaining({ tessedit_pageseg_mode: '11' }),
    );
    expect(recognize).toHaveBeenCalledTimes(1);
    expect(recognize).toHaveBeenCalledWith(invertedBlob);
    expect(terminate).toHaveBeenCalled();
    expect(component.guessedSetCode()).toBe('WAR');
    expect(component.guessedCollectorNumber()).toBe('145');
    expect(component.ocrText()).toBe('145/264\nWAR • EN');
    expect(component.ocrError()).toBeNull();
    expect(component.ocrRunning()).toBe(false);
  });

  it('falls back to the original image if color inversion fails', async () => {
    const blob = new Blob(['fake-image']);
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);

    await component.onFrameCaptured(blob);

    expect(recognize).toHaveBeenCalledTimes(1);
    expect(recognize).toHaveBeenCalledWith(blob);
    expect(component.guessedSetCode()).toBe('WAR');
  });

  it('surfaces an error (including the underlying message) and leaves fields blank when OCR fails', async () => {
    createWorker.mockRejectedValueOnce(new Error('worker init failed'));

    await component.onFrameCaptured(new Blob(['fake-image']));

    expect(component.ocrError()).toBe(
      'Não foi possível ler a carta automaticamente (worker init failed). Informe os detalhes abaixo.',
    );
    expect(component.guessedSetCode()).toBe('');
    expect(component.guessedCollectorNumber()).toBe('');
  });

  it('re-emits cardAdded from the inner AddCardForm and clears the guess', async () => {
    await component.onFrameCaptured(new Blob(['fake-image']));

    let emitted: unknown;
    component.cardAdded.subscribe((event) => (emitted = event));

    const payload = { name: 'Lightning Bolt' } as never;
    component.onCardAdded(payload);

    expect(emitted).toBe(payload);
    expect(component.ocrText()).toBe('');
    expect(component.guessedSetCode()).toBe('');
    expect(component.guessedCollectorNumber()).toBe('');
  });
});
