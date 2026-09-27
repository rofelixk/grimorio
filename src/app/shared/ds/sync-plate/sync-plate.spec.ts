import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudLink, ProfileSummary } from '@models/profile.model';
import { ProfileSessionService } from '@services/profile-session.service';
import { SyncStatusService } from '@services/sync-status.service';
import type { SyncState } from '@services/sync.service';
import { SyncDisplay, syncDisplay } from '@utils/sync-status.util';
import { SyncPlate } from './sync-plate';

const LINK: CloudLink = { userId: 'u1', email: 'rafa@exemplo.com', needsReauth: false };

@Component({
  imports: [SyncPlate],
  template: `<app-sync-plate (link)="links = links + 1" (reauth)="reauths = reauths + 1" />`,
})
class Host {
  links = 0;
  reauths = 0;
}

describe('SyncPlate', () => {
  const active = signal<ProfileSummary | null>(null);
  const display = signal<SyncDisplay | null>(null);
  let act: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    act = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ProfileSessionService, useValue: { active } },
        { provide: SyncStatusService, useValue: { display, act } },
      ],
    });
  });

  function show(cloud: CloudLink | null, state: SyncState, lastSyncedAt: string | null = null) {
    active.set({ id: 'p1', name: 'rafa', colors: ['R'], cloud } as ProfileSummary);
    display.set(syncDisplay({ linked: !!cloud, state, lastSyncedAt, now: Date.now() }));
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      text: el.textContent!.replace(/\s+/g, ' ').trim(),
      button: el.querySelector('button'),
      plate: el.querySelector('.plate')!,
    };
  }

  it('linked: status, e-mail and a secondary "Sincronizar agora" that syncs', () => {
    const { text, button } = show(LINK, 'idle');
    expect(text).toContain('Nunca sincronizado');
    expect(text).toContain('rafa@exemplo.com');
    expect(button?.textContent?.trim()).toBe('Sincronizar agora');
    expect(button?.classList).toContain('btn--secondary');
    button!.click();
    expect(act).toHaveBeenCalled();
  });

  it('syncing: a spinner line with no button', () => {
    const { text, button } = show(LINK, 'syncing');
    expect(text).toContain('Sincronizando…');
    expect(button).toBeNull();
  });

  it('offline: a danger line and "Tentar de novo"', () => {
    const { fixture, button } = show(LINK, 'offline');
    expect((fixture.nativeElement as HTMLElement).querySelector('.line.failure')?.textContent).toContain('Sem conexão');
    expect(button?.textContent?.trim()).toBe('Tentar de novo');
  });

  it('local: the local line and "Vincular conta na nuvem", emitted to the owner', () => {
    const { fixture, text, button } = show(null, 'idle');
    expect(text).toContain('Sem conta na nuvem — funciona sem internet.');
    expect(button?.textContent?.trim()).toBe('Vincular conta na nuvem');
    button!.click();
    expect(fixture.componentInstance.links).toBe(1);
    expect(act).not.toHaveBeenCalled();
  });

  it('expired: danger border and a primary "Entrar de novo", emitted to the owner', () => {
    const { fixture, text, button, plate } = show({ ...LINK, needsReauth: true }, 'idle');
    expect(text).toContain('Sessão expirada');
    expect(plate.classList).toContain('plate--danger');
    expect(button?.classList).toContain('btn--primary');
    button!.click();
    expect(fixture.componentInstance.reauths).toBe(1);
  });
});
