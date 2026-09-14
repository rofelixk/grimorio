import { Injectable } from '@angular/core';
import { CardOcrResult, runCardOcr } from '../utils/card-ocr.util';

@Injectable({ providedIn: 'root' })
export class CardOcrService {
  run(blob: Blob): Promise<CardOcrResult> {
    return runCardOcr(blob);
  }
}
