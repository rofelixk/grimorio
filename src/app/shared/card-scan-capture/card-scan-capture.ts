import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-card-scan-capture',
  styleUrl: './card-scan-capture.scss',
  templateUrl: './card-scan-capture.html',
})
export class CardScanCapture {
  readonly frameCaptured = output<Blob>();

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.frameCaptured.emit(file);
    }
  }
}
