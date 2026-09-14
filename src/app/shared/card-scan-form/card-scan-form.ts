import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { CardEntry } from '@models/card.model';
import { AddCardForm } from '../add-card-form/add-card-form';
import { CardScanCapture } from '../card-scan-capture/card-scan-capture';

// MTG's collector-info line is printed light-on-dark (white text on a black bar),
// but Tesseract's English model is trained for dark-on-light text — inverting the
// image colors flips that polarity and often reads much better on this specific line.
export async function invertImageColors(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context unavailable');
  }
  context.drawImage(bitmap, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 255 - pixels[i];
    pixels[i + 1] = 255 - pixels[i + 1];
    pixels[i + 2] = 255 - pixels[i + 2];
  }
  context.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
      } else {
        reject(new Error('Could not process the image'));
      }
    }, 'image/png');
  });
}

export function guessSetAndCollector(rawText: string): {
  setCode: string;
  collectorNumber: string;
} {
  const cleaned = rawText.toUpperCase();

  // "145/264" style (number of total in the set)
  const collectorWithTotal = cleaned.match(/(\d{1,4})\s*\/\s*\d{1,4}/);
  // bare zero-padded number, optionally preceded by a rarity letter, e.g. "C 0008"
  // (requires the leading zero so it doesn't match a copyright year or other stray digits)
  const collectorPadded = cleaned.match(/\b(?:[CURMSB]\s+)?(0\d{2,3})\b/);
  const collectorNumber = collectorWithTotal?.[1] ?? collectorPadded?.[1] ?? '';

  // set code + language, e.g. "WAR • EN" — the bullet is often misread as a period,
  // or dropped entirely (leaving just "WAR EN"), so treat it as optional.
  const setMatch = cleaned.match(/\b([A-Z0-9]{2,5})\s*[•·.]?\s+[A-Z]{2}\b/);

  return {
    collectorNumber,
    setCode: setMatch?.[1] ?? '',
  };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardScanCapture, AddCardForm],
  selector: 'app-card-scan-form',
  styleUrl: './card-scan-form.scss',
  templateUrl: './card-scan-form.html',
})
export class CardScanForm {
  readonly cardAdded = output<Omit<CardEntry, 'id' | 'locationId'>>();

  readonly ocrRunning = signal(false);
  readonly ocrError = signal<string | null>(null);
  readonly ocrText = signal('');
  readonly guessedSetCode = signal('');
  readonly guessedCollectorNumber = signal('');

  async onFrameCaptured(blob: Blob): Promise<void> {
    this.ocrRunning.set(true);
    this.ocrError.set(null);
    this.ocrText.set('');
    try {
      // tesseract.js's CJS entry re-exports a spread of a dynamic object, which esbuild
      // can't statically analyze into named exports — only `default` is available here.
      const { createWorker, PSM } = (await import('tesseract.js')).default;
      const worker = await createWorker('eng');
      try {
        await worker.setParameters({
          // "sparse text": look for disconnected blocks of text in no particular
          // order, rather than assuming one uniform page layout — the collector-info
          // crop typically has rules text above it in a different font/orientation.
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789•·./ ',
        });
        let ocrInput = blob;
        try {
          ocrInput = await invertImageColors(blob);
        } catch {
          // fall back to the original image if color inversion isn't supported
        }

        const {
          data: { text },
        } = await worker.recognize(ocrInput);
        const guess = guessSetAndCollector(text);
        this.ocrText.set(text);
        this.guessedSetCode.set(guess.setCode);
        this.guessedCollectorNumber.set(guess.collectorNumber);
      } finally {
        await worker.terminate();
      }
    } catch (err) {
      this.ocrError.set(
        err instanceof Error
          ? `Não foi possível ler a carta automaticamente (${err.message}). Informe os detalhes abaixo.`
          : 'Não foi possível ler a carta automaticamente. Informe os detalhes abaixo.',
      );
    } finally {
      this.ocrRunning.set(false);
    }
  }

  onCardAdded(card: Omit<CardEntry, 'id' | 'locationId'>): void {
    this.ocrText.set('');
    this.guessedSetCode.set('');
    this.guessedCollectorNumber.set('');
    this.cardAdded.emit(card);
  }
}
