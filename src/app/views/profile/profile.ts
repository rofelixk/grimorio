import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-profile',
  styleUrl: './profile.scss',
  templateUrl: './profile.html',
})
export class Profile {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly minPasswordLength = 6;

  readonly email = computed(() => this.authService.user()?.email ?? '');

  readonly username = signal(this.authService.username());
  readonly usernameSaving = signal(false);
  readonly usernameError = signal<string | null>(null);
  readonly usernameSaved = signal(false);

  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');
  readonly passwordSaving = signal(false);
  readonly passwordError = signal<string | null>(null);
  readonly passwordSaved = signal(false);

  private readonly deleteDialog = viewChild<ElementRef<HTMLDialogElement>>('deleteDialog');
  readonly deleteConfirmText = signal('');
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);
  readonly canConfirmDelete = computed(
    () => this.deleteConfirmText().trim().length > 0 && this.deleteConfirmText().trim() === this.email(),
  );

  async saveUsername(): Promise<void> {
    this.usernameError.set(null);
    this.usernameSaved.set(false);

    const value = this.username().trim();
    if (!value) {
      this.usernameError.set('Informe um nome de usuário.');
      return;
    }

    this.usernameSaving.set(true);
    try {
      await this.authService.updateUsername(value);
      this.usernameSaved.set(true);
    } catch (err) {
      this.usernameError.set(err instanceof Error ? err.message : 'Algo deu errado. Tente novamente.');
    } finally {
      this.usernameSaving.set(false);
    }
  }

  async changePassword(): Promise<void> {
    this.passwordError.set(null);
    this.passwordSaved.set(false);

    const current = this.currentPassword();
    const next = this.newPassword();
    const confirm = this.confirmPassword();

    if (next.length < this.minPasswordLength) {
      this.passwordError.set(`A nova senha precisa ter pelo menos ${this.minPasswordLength} caracteres.`);
      return;
    }
    if (next !== confirm) {
      this.passwordError.set('As senhas não coincidem.');
      return;
    }

    this.passwordSaving.set(true);
    try {
      await this.authService.updatePassword(current, next);
      this.passwordSaved.set(true);
      this.currentPassword.set('');
      this.newPassword.set('');
      this.confirmPassword.set('');
    } catch (err) {
      this.passwordError.set(err instanceof Error ? err.message : 'Algo deu errado. Tente novamente.');
    } finally {
      this.passwordSaving.set(false);
    }
  }

  openDeleteDialog(): void {
    this.deleteError.set(null);
    showDialogModal(this.deleteDialog()?.nativeElement);
  }

  closeDeleteDialog(): void {
    closeDialog(this.deleteDialog()?.nativeElement);
  }

  onDeleteDialogClosed(): void {
    this.deleteConfirmText.set('');
    this.deleteError.set(null);
  }

  async confirmDelete(): Promise<void> {
    if (!this.canConfirmDelete()) {
      return;
    }

    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.authService.deleteAccount();
      closeDialog(this.deleteDialog()?.nativeElement);
      await this.router.navigateByUrl('/');
    } catch (err) {
      this.deleteError.set(err instanceof Error ? err.message : 'Algo deu errado. Tente novamente.');
    } finally {
      this.deleting.set(false);
    }
  }
}

// jsdom (used by the unit test runner) doesn't implement the native <dialog>
// show/close behavior, so guard these calls rather than assume support.
function showDialogModal(el: HTMLDialogElement | undefined): void {
  if (el && !el.open && typeof el.showModal === 'function') {
    el.showModal();
  }
}

function closeDialog(el: HTMLDialogElement | undefined): void {
  if (el && el.open && typeof el.close === 'function') {
    el.close();
  }
}
