import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Color } from '@models/profile.model';
import { CardService } from '@services/card.service';
import { CloudAuthService } from '@services/cloud-auth.service';
import { CloudSessionService } from '@services/cloud-session.service';
import { CollectionService } from '@services/collection.service';
import { ConnectivityService } from '@services/connectivity.service';
import { DeckService } from '@services/deck.service';
import { EntryModalService } from '@services/entry-modal.service';
import { PlanarSelectionService } from '@services/planar-selection.service';
import { ProfileLifecycleService } from '@services/profile-lifecycle.service';
import { ProfileModalService, ProfileStart } from '@services/profile-modal.service';
import { ProfileSessionService } from '@services/profile-session.service';
import { ProfileStore } from '@services/profile-store.service';
import { SyncStatusService } from '@services/sync-status.service';
import { SyncService } from '@services/sync.service';
import { ToastService } from '@services/toast.service';
import { FieldKey } from '@utils/cloud-error.util';
import { MSG, SYNC_AREA, TOAST } from '@utils/entry-copy';
import { validateName } from '@utils/entry-flow.util';
import { sameColors, tribeName } from '@utils/identity.util';
import {
  ProfileCopyVars,
  ProfileDoneKind,
  ProfileFields,
  ProfileOrigin,
  ProfilePhase,
  ProfilePromptTarget,
  busyLabel,
  captionFor,
  doneCopy,
  isDangerStep,
  isScreen,
  isSharedCloudPhase,
  linkState,
  primaryLabel,
  promptFor,
  subtitleFor,
  titleFor,
  validateStep,
} from '@utils/profile-flow.util';
import { hasUnsyncedChanges } from '@utils/sync-status.util';
import { CloudSteps } from '@shared/auth/cloud-steps';
import { FlowForm } from '@shared/auth/flow-form';

/** The id of whichever title (phase or done) labels the modal. */
export const PROFILE_TITLE_ID = 'grm-profile-title';

/** The `delprofile` block's in-place sync (FR-018a). */
export type BlockSync = 'idle' | 'syncing' | 'done' | 'offline' | 'reauth' | 'error';

const BLANK_FIELDS: ProfileFields = { name: '', email: '', pw: '', pwNew: '', pwConfirm: '', code: '' };

const FIELD_ERROR_KEY: Record<keyof ProfileFields, FieldKey> = {
  name: 'user',
  email: 'email',
  pw: 'pw',
  pwNew: 'pwNew',
  pwConfirm: 'pwConfirm',
  code: 'code',
};

const BLOCK_FAILURE_LABEL: Partial<Record<BlockSync, string>> = {
  offline: SYNC_AREA.offline,
  reauth: SYNC_AREA.expired,
  error: SYNC_AREA.error,
};

// The profile modal's state machine (spec 005 data-model §6). Provided on the ProfileModal
// component. Pure rules (copy, validation, prompts) live in profile-flow.util; this store holds
// the state and runs the flows against the services. Its CloudSteps is what the entry modal's
// CloudForm/ResetForm read here, so they render its `in`, `up`, `reauth` and reset steps; the
// local steps use its FlowForm alone.
@Injectable()
export class ProfileFlowStore {
  private readonly profileStore = inject(ProfileStore);
  private readonly session = inject(ProfileSessionService);
  private readonly cloudAuth = inject(CloudAuthService);
  private readonly cloudSession = inject(CloudSessionService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly modal = inject(ProfileModalService);
  private readonly entryModal = inject(EntryModalService);
  private readonly status = inject(SyncStatusService);
  private readonly sync = inject(SyncService);
  private readonly toasts = inject(ToastService);
  private readonly lifecycle = inject(ProfileLifecycleService);
  private readonly cards = inject(CardService);
  private readonly collections = inject(CollectionService);
  private readonly decks = inject(DeckService);
  private readonly planarSelection = inject(PlanarSelectionService);
  private readonly router = inject(Router);

  // ── State ────────────────────────────────────────────────────────────────
  readonly phase = signal<ProfilePhase>('hub');
  /** Where Cancelar / Concluir return (R18). */
  readonly origin = signal<ProfileOrigin>('hub');
  /** FR-019c: the line under a failed "Entrar de novo". */
  readonly formHint = signal('');
  readonly done = signal<ProfileDoneKind | null>(null);
  readonly replacedTribe = signal<string | null>(null);
  /** The account e-mail named by a done screen reached after the link ended (Conta excluída). */
  private readonly doneEmail = signal<string | null>(null);
  readonly unsynced = signal(false);
  readonly blockSync = signal<BlockSync>('idle');

  readonly active = this.session.active;
  readonly linkedEmail = computed(() => this.active()?.cloud?.email ?? '');

  readonly form = new FlowForm<ProfileFields>({ blank: BLANK_FIELDS, errorKeys: FIELD_ERROR_KEY });
  readonly cloud = new CloudSteps<ProfileFields, ProfilePhase>({
    form: this.form,
    phase: this.phase,
    isCloudPhase: isSharedCloudPhase,
    plateEmail: this.linkedEmail,
    // A reset from "Entrar de novo" is for the linked account.
    lockedEmail: computed(() => (this.phase() === 'reauth' ? this.linkedEmail() : null)),
    go: (phase) => this.go(phase),
    toPhase: (phase) => this.toPhase(phase),
  });

  readonly fields = this.form.fields;
  readonly fieldErrors = this.form.fieldErrors;
  readonly formError = this.form.formError;
  readonly emailInUse = this.form.emailInUse;
  readonly loading = this.form.loading;
  /** Where the reset flow returns ("Voltar") and continues after the code. */
  readonly backTarget = this.cloud.backTarget;
  readonly emailLocked = this.cloud.emailLocked;
  readonly cooldown = this.cloud.cooldown;
  readonly resending = this.cloud.resending;

  // ── Derived ──────────────────────────────────────────────────────────────
  readonly linkState = computed(() => {
    const active = this.active();
    return active ? linkState(active) : 'local';
  });
  readonly syncBusy = this.status.busy;

  private readonly copyVars = computed<ProfileCopyVars>(() => ({
    name: this.active()?.name ?? '',
    linkedEmail: this.linkedEmail(),
    email: this.fields().email.trim(),
    link: this.linkState(),
  }));

  readonly title = computed(() => titleFor(this.phase(), this.copyVars()));
  readonly subtitle = computed(() => subtitleFor(this.phase(), this.copyVars()));
  readonly caption = computed(() =>
    captionFor(this.phase(), { done: this.done(), colorsReplaced: !!this.replacedTribe() }),
  );
  readonly prompt = computed(() => (this.done() ? null : promptFor(this.phase())));
  readonly primary = computed(() => (this.loading() ? busyLabel(this.phase()) : primaryLabel(this.phase())));
  readonly danger = computed(() => isDangerStep(this.phase()));

  readonly shown = this.cloud.shown;
  readonly pwLabel = this.cloud.pwLabel;
  readonly pwAutocomplete = this.cloud.pwAutocomplete;
  readonly pwHelper = this.cloud.pwHelper;
  readonly plateEmail = this.linkedEmail;
  readonly isCloudBusy = this.cloud.isCloudBusy;
  readonly resendLabel = this.cloud.resendLabel;

  /** FR-009a: only a changed name enables Salvar; color taps never do. */
  readonly salvarEnabled = computed(
    () =>
      this.phase() === 'local' && this.fields().name.trim() !== (this.active()?.name ?? '') && !this.loading(),
  );

  /** `delprofile`: locked while its own sync or a shell sync runs (FR-018a, R17). */
  readonly deleteLocked = computed(() => this.loading() || this.blockSync() === 'syncing' || this.syncBusy());
  readonly blockFailure = computed(() => BLOCK_FAILURE_LABEL[this.blockSync()] ?? null);

  readonly doneCopy = computed(() => {
    const kind = this.done();
    if (!kind) {
      return null;
    }
    const active = this.active();
    return doneCopy(kind, {
      name: active?.name ?? '',
      email: this.doneEmail() ?? active?.cloud?.email ?? this.fields().email.trim(),
      linked: this.linkState() !== 'local',
      replacedTribe: this.replacedTribe(),
    });
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────
  /** A new open(): everything reset, then the requested start (origin hub). */
  open(start: ProfileStart): void {
    this.reset();
    this.phase.set(start);
  }

  /** Clears every field, error and flow state. Colors already tapped stay (FR-008). */
  reset(): void {
    this.form.reset();
    this.phase.set('hub');
    this.origin.set('hub');
    this.formHint.set('');
    this.done.set(null);
    this.replacedTribe.set(null);
    this.doneEmail.set(null);
    this.unsynced.set(false);
    this.blockSync.set('idle');
    this.cloud.reset();
  }

  /** ✕, Esc, backdrop. */
  close(): void {
    this.modal.close();
    this.reset();
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  /** Switching screens or steps: clears passwords, code, errors, hint and done; keeps the e-mail. */
  go(phase: ProfilePhase): void {
    this.form.bump();
    this.loading.set(false);
    this.toPhase(phase);
  }

  private toPhase(phase: ProfilePhase): void {
    this.phase.set(phase);
    this.done.set(null);
    this.doneEmail.set(null);
    this.form.clearForPhase(['pw', 'pwNew', 'pwConfirm', 'code']);
    this.formHint.set('');
    if (phase === 'local') {
      this.fields.update((f) => ({ ...f, name: this.active()?.name ?? '' }));
    }
  }

  openLocal(): void {
    this.go('local');
  }

  openCloud(): void {
    this.go('cloud');
  }

  /** "Voltar" on a sub-screen: the hub, discarding an unsaved name. */
  back(): void {
    this.go('hub');
  }

  /** An action step from the current screen, which Cancelar / Concluir return to. */
  openStep(step: ProfilePhase): void {
    const from = this.phase();
    this.origin.set(isScreen(from) ? from : 'hub');
    this.backTarget.set(null);
    this.emailLocked.set(false);
    this.go(step);
    if (step === 'cloudpw' || step === 'delcloud') {
      void this.checkOnOpen();
    } else if (step === 'delprofile') {
      this.blockSync.set('idle');
      void this.evaluateUnsynced(this.form.token());
    }
  }

  cancel(): void {
    this.toOrigin();
  }

  concluir(): void {
    this.toOrigin();
  }

  private toOrigin(): void {
    this.backTarget.set(null);
    this.emailLocked.set(false);
    this.replacedTribe.set(null);
    this.go(this.origin());
  }

  /** "Não é você? Trocar de perfil" (FR-005): hand off to the entry modal's list. */
  switchProfile(): void {
    if (this.syncBusy()) {
      return;
    }
    this.close();
    void this.entryModal.open({ start: 'list' });
  }

  followPrompt(target: ProfilePromptTarget): void {
    if (target === 'switch') {
      this.switchProfile();
      return;
    }
    if (target === 'back') {
      this.cloud.back();
      return;
    }
    this.go(target);
  }

  /** "Esqueci minha senha" on `in` or `reauth`. */
  forgot(): void {
    const phase = this.phase();
    if (phase === 'in' || phase === 'reauth') {
      this.cloud.forgot();
    }
  }

  recoverAccess(): void {
    this.cloud.recoverAccess();
  }

  otherEmail(): void {
    this.cloud.otherEmail();
  }

  editField(key: keyof ProfileFields, value: string): void {
    this.form.edit(key, value);
  }

  /** A wheel tap (FR-008): saved at once, retinting everything; nothing reverts it. */
  setColors(colors: Color[]): void {
    const active = this.active();
    if (active && !sameColors(colors, active.colors)) {
      void this.profileStore.setColors(active.id, colors);
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  /** Validates on submit before any request; locked while a request runs. */
  async submit(): Promise<void> {
    const phase = this.phase();
    if (this.loading() || (phase === 'local' && !this.salvarEnabled()) || (phase === 'delprofile' && this.deleteLocked())) {
      return;
    }
    this.formHint.set('');
    await this.form.submit(
      () => validateStep(phase, this.fields()),
      (generation) => this.run(phase, generation),
      (error) => this.fail(phase, error),
    );
  }

  private stale(generation: number): boolean {
    return this.form.stale(generation);
  }

  private fail(phase: ProfilePhase, error: unknown): void {
    // The account's new password is `pwNew` here; the shared mapping says `pw`.
    const failure = this.form.fail(error, ({ field, message }) =>
      phase === 'cloudpw' && field === 'pw' && message === MSG.pwMin ? 'pwNew' : field,
    );
    if (failure.kind === 'form' && phase === 'reauth' && failure.message === MSG.wrongCloud) {
      this.formHint.set(MSG.goneHint(this.active()?.name ?? ''));
    }
  }

  private async run(phase: ProfilePhase, generation: number): Promise<void> {
    const active = this.active();
    if (!active) {
      return;
    }
    const { name, email, pw, pwNew, code } = this.fields();
    switch (phase) {
      case 'local': {
        const error = validateName(name, (n) => this.profileStore.isNameTaken(n, active.id));
        if (error) {
          this.fieldErrors.set({ user: error });
          return;
        }
        await this.profileStore.rename(active.id, name);
        if (!this.stale(generation)) {
          this.fields.update((f) => ({ ...f, name: name.trim() }));
          this.toasts.show(TOAST.saved.label, TOAST.saved.text);
        }
        return;
      }
      case 'pw': {
        const ok = await this.profileStore.verifyPassword(active.id, pw);
        if (this.stale(generation)) {
          return;
        }
        if (!ok) {
          this.fieldErrors.set({ pw: MSG.wrongLocal });
          return;
        }
        await this.profileStore.setPassword(active.id, pwNew);
        if (!this.stale(generation)) {
          this.finish('pwChanged');
        }
        return;
      }
      case 'cloudpw': {
        await this.cloudAuth.changeAccountPassword(active.id, pw, pwNew);
        if (!this.stale(generation)) {
          this.finish('cloudPwChanged');
        }
        return;
      }
      case 'in': {
        const identity = await this.cloudAuth.signIn(email, pw);
        if (!this.stale(generation)) {
          await this.link(!identity.colors?.length, generation);
        }
        return;
      }
      case 'up': {
        await this.cloudAuth.signUp(email, pw, {
          label: active.name,
          labelAt: active.nameUpdatedAt,
          colors: active.colors,
          colorsAt: active.colorsUpdatedAt,
        });
        await this.cloudAuth.linkPending(active.id, { writeColors: true });
        if (!this.stale(generation)) {
          this.finish('created');
        }
        return;
      }
      case 'reset-email':
        return this.cloud.requestCode(generation);
      case 'reset-code': {
        const identity = await this.cloudAuth.verifyResetCode(email, code, pw);
        if (this.stale(generation)) {
          return;
        }
        if (this.backTarget() === 'reauth') {
          await this.cloudAuth.adoptPending(active.id);
          if (!this.stale(generation)) {
            this.backTarget.set(null);
            this.emailLocked.set(false);
            this.finish('reauthed');
          }
          return;
        }
        this.backTarget.set(null);
        await this.link(!identity.colors?.length, generation);
        return;
      }
      case 'reauth': {
        await this.cloudAuth.reauth(active.id, pw);
        if (!this.stale(generation)) {
          this.finish('reauthed');
        }
        return;
      }
      case 'unlink': {
        const result = await this.cloudAuth.unlink(active.id);
        if (this.stale(generation)) {
          return;
        }
        if (result === 'gone') {
          this.toGoneHub();
        } else {
          this.finish('unlinked');
        }
        return;
      }
      case 'delcloud': {
        const accountEmail = active.cloud?.email ?? '';
        await this.cloudAuth.deleteAccount(active.id, pw);
        if (!this.stale(generation)) {
          this.doneEmail.set(accountEmail);
          this.finish('cloudDeleted');
        }
        return;
      }
      case 'delprofile': {
        const remaining = await this.lifecycle.deleteProfile(active.id, pw);
        this.close();
        if (remaining > 0) {
          void this.entryModal.open({ start: 'list' });
        } else {
          void this.router.navigateByUrl('/');
        }
        return;
      }
      default:
        return;
    }
  }

  // Links the pending sign-in to the active profile (spec 003 FR-026 colors rule).
  private async link(writeColors: boolean, generation: number): Promise<void> {
    const profile = this.active()!;
    const { colorsReplaced } = await this.cloudAuth.linkPending(profile.id, { writeColors });
    if (this.stale(generation)) {
      return;
    }
    this.replacedTribe.set(
      colorsReplaced && !sameColors(colorsReplaced, profile.colors) ? tribeName(colorsReplaced) : null,
    );
    this.finish('linked');
  }

  // Never syncs: a sync starts only from "Sincronizar agora" / "Tentar de novo" (FR-016).
  private finish(kind: ProfileDoneKind): void {
    this.done.set(kind);
    this.loading.set(false);
  }

  // ── Account checks (FR-019b) ─────────────────────────────────────────────
  // `cloudpw` and `delcloud` are the account's first cloud action: a deleted account turns the
  // profile local and returns to the hub; a dead session shows the expired Conta na nuvem.
  private async checkOnOpen(): Promise<void> {
    const active = this.active();
    if (!active || !this.connectivity.online()) {
      return;
    }
    const generation = this.form.token();
    this.loading.set(true);
    const status = await this.cloudAuth.checkAccount(active.id);
    if (this.stale(generation)) {
      return;
    }
    this.loading.set(false);
    if (status === 'gone') {
      await this.cloudAuth.forgetGoneAccount(active.id);
      if (!this.stale(generation)) {
        this.toGoneHub();
      }
    } else if (status === 'expired') {
      await this.cloudSession.markNeedsReauth(active.id);
      if (!this.stale(generation)) {
        this.go('cloud');
      }
    }
  }

  private toGoneHub(): void {
    this.origin.set('hub');
    this.backTarget.set(null);
    this.emailLocked.set(false);
    this.unsynced.set(false);
    this.blockSync.set('idle');
    this.go('hub');
  }

  // ── Delete profile: unsynced changes (FR-018a) ───────────────────────────
  private async evaluateUnsynced(generation: number): Promise<void> {
    const active = this.active();
    if (!active) {
      return;
    }
    const [cardTombstones, collectionTombstones, deckTombstones] = await Promise.all([
      this.cards.getTombstones(),
      this.collections.getTombstones(),
      this.decks.getTombstones(),
    ]);
    if (this.stale(generation)) {
      return;
    }
    this.unsynced.set(
      hasUnsyncedChanges({
        linked: !!active.cloud,
        lastSyncedAt: this.sync.lastSyncedAt(),
        cards: this.cards.cards(),
        collections: this.collections.collections(),
        decks: this.decks.decks(),
        tombstoneCount: cardTombstones.length + collectionTombstones.length + deckTombstones.length,
        colorsUpdatedAt: active.colorsUpdatedAt,
        nameUpdatedAt: active.nameUpdatedAt,
        planarSelectionUpdatedAt: this.planarSelection.selection()?.updatedAt ?? null,
      }),
    );
  }

  /** "Sincronizar agora" / "Tentar de novo" in the unsynced block: the person chose to sync. */
  async syncBeforeDelete(): Promise<void> {
    if (this.blockSync() === 'syncing' || this.syncBusy()) {
      return;
    }
    const generation = this.form.token();
    this.blockSync.set('syncing');
    const outcome = await this.sync.syncNow();
    if (this.stale(generation)) {
      return;
    }
    switch (outcome) {
      case 'done':
        this.blockSync.set('done');
        await this.evaluateUnsynced(generation);
        return;
      case 'offline':
      case 'reauth':
      case 'error':
        this.blockSync.set(outcome);
        return;
      case 'gone':
        this.toGoneHub();
        return;
      case 'skipped':
        this.blockSync.set('idle');
        return;
    }
  }

  // ── Reset code ───────────────────────────────────────────────────────────
  resend(): Promise<void> {
    return this.cloud.resend();
  }
}
