import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '@services/auth.service';
import { AuthModal } from '@shared/auth-modal/auth-modal';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthModal],
  selector: 'app-auth-bar',
  styleUrl: './auth-bar.scss',
  templateUrl: './auth-bar.html',
})
export class AuthBar {
  private readonly authService = inject(AuthService);

  readonly user = this.authService.user;
  readonly showModal = signal(false);

  async signOut(): Promise<void> {
    await this.authService.signOut();
  }
}
