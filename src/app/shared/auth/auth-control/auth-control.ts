import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { ThemeService } from '@services/theme.service';
import { AuthModal } from '@shared/auth/auth-modal/auth-modal';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AuthModal],
  selector: 'app-auth-control',
  styleUrl: './auth-control.scss',
  templateUrl: './auth-control.html',
  host: {
    '[style.--auth-control-primary]': 'themeService.roles().primary',
  },
})
export class AuthControl {
  protected readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);

  readonly user = this.authService.user;
  readonly displayName = this.authService.displayName;
  readonly showModal = signal(false);

  async signOut(): Promise<void> {
    await this.authService.signOut();
  }
}
