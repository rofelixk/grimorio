import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AuthService } from '@services/auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-auth-modal',
  styleUrl: './auth-modal.scss',
  templateUrl: './auth-modal.html',
})
export class AuthModal {
  private readonly authService = inject(AuthService);

  readonly open = input(false);
  readonly closed = output<void>();

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  readonly mode = signal<'signIn' | 'signUp'>('signIn');
  readonly email = signal('');
  readonly password = signal('');
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const dialogEl = this.dialog()?.nativeElement;
      if (!dialogEl) {
        return;
      }
      if (this.open() && !dialogEl.open) {
        dialogEl.showModal();
      } else if (!this.open() && dialogEl.open) {
        dialogEl.close();
      }
    });
  }

  toggleMode(): void {
    this.mode.set(this.mode() === 'signIn' ? 'signUp' : 'signIn');
    this.error.set(null);
  }

  async submit(): Promise<void> {
    const email = this.email().trim();
    const password = this.password();
    if (!email || !password) {
      this.error.set('Informe um email e uma senha.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    try {
      if (this.mode() === 'signUp') {
        await this.authService.signUp(email, password);
      } else {
        await this.authService.signIn(email, password);
      }
      this.requestClose();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Algo deu errado. Tente novamente.');
    } finally {
      this.submitting.set(false);
    }
  }

  requestClose(): void {
    this.dialog()?.nativeElement.close();
  }

  onDialogClosed(): void {
    this.mode.set('signIn');
    this.email.set('');
    this.password.set('');
    this.error.set(null);
    this.closed.emit();
  }
}
