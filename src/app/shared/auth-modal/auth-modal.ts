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
import { ThemeService } from '@services/theme.service';
import { ColorThemePicker } from '@shared/color-theme-picker/color-theme-picker';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ColorThemePicker],
  selector: 'app-auth-modal',
  styleUrl: './auth-modal.scss',
  templateUrl: './auth-modal.html',
})
export class AuthModal {
  private readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);

  readonly open = input(false);
  readonly closed = output<void>();

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  readonly mode = signal<'signIn' | 'signUp'>('signIn');
  // Email at sign-up (Supabase requires a real email); email-or-username at sign-in.
  readonly identifier = signal('');
  // Optional, sign-up only.
  readonly username = signal('');
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

  setMode(mode: 'signIn' | 'signUp'): void {
    this.mode.set(mode);
    this.error.set(null);
  }

  toggleMode(): void {
    this.setMode(this.mode() === 'signIn' ? 'signUp' : 'signIn');
  }

  async submit(): Promise<void> {
    const identifier = this.identifier().trim();
    const password = this.password();
    if (!identifier || !password) {
      this.error.set(
        this.mode() === 'signUp'
          ? 'Informe um email e uma senha.'
          : 'Informe um email ou nome de usuário e uma senha.',
      );
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    try {
      if (this.mode() === 'signUp') {
        await this.authService.signUp(identifier, password, this.username(), this.themeService.colors());
      } else {
        await this.authService.signIn(identifier, password);
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
    this.identifier.set('');
    this.username.set('');
    this.password.set('');
    this.error.set(null);
    this.closed.emit();
  }
}
