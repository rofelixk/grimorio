import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { AuthModal } from '@shared/auth-modal/auth-modal';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AuthModal],
  selector: 'app-auth-control',
  styleUrl: './auth-control.scss',
  templateUrl: './auth-control.html',
})
export class AuthControl {
  private readonly authService = inject(AuthService);

  readonly user = this.authService.user;
  readonly displayName = this.authService.displayName;
  readonly showModal = signal(false);

  async signOut(): Promise<void> {
    await this.authService.signOut();
  }
}
