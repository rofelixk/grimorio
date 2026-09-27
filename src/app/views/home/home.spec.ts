import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileSummary } from '@models/profile.model';
import { EntryModalService } from '@services/entry-modal.service';
import { ProfileStore } from '@services/profile-store.service';
import { Home } from './home';

describe('Home', () => {
  const profiles = signal<ProfileSummary[]>([]);
  let entryModal: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    profiles.set([]);
    entryModal = { open: vi.fn().mockResolvedValue({ activeProfileId: null }) };
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: ProfileStore, useValue: { profiles } },
        { provide: EntryModalService, useValue: entryModal },
      ],
    });
  });

  async function render() {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the empty-device state with no profiles, opening profile creation', async () => {
    const el = await render();
    expect(el.textContent).toContain('Nenhum perfil neste aparelho');
    expect(el.textContent).toContain('Crie um perfil para começar — funciona sem internet, sem e-mail.');

    el.querySelector<HTMLButtonElement>('.btn--primary')!.click();
    expect(entryModal.open).toHaveBeenCalledWith({ context: 'device', start: 'profile' });
  });

  it('shows nothing of it once a profile exists', async () => {
    profiles.set([{ id: 'p1' } as ProfileSummary]);
    const el = await render();
    expect(el.querySelector('.empty')).toBeNull();
  });
});
