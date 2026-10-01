import { Injectable, computed, inject, signal } from '@angular/core';
import { Color, ProfileSummary } from '@models/profile.model';
import { CloudAuthService, CloudIdentity } from '@services/cloud-auth.service';
import { EntryModalService, ResolvedEntryRequest } from '@services/entry-modal.service';
import { ProfileModalService } from '@services/profile-modal.service';
import { ProfileSessionService } from '@services/profile-session.service';
import { ProfileStore } from '@services/profile-store.service';
import { FieldKey } from '@utils/cloud-error.util';
import { ACTION, LINK_STATE, MISC, MSG } from '@utils/entry-copy';
import {
  CopyVars,
  DoneKind,
  EntryContext,
  EntryFields,
  EntryPhase,
  FormPhase,
  PromptTarget,
  busyLabel,
  captionFor,
  colorSourceFor,
  doneCopy,
  primaryLabel,
  promptFor,
  subtitleFor,
  titleFor,
  validate,
} from '@utils/entry-flow.util';
import { DEFAULT_IDENTITY, rolesFor, tribeName } from '@utils/identity.util';
import { CloudSteps } from '@shared/auth/cloud-steps';
import { FlowForm } from '@shared/auth/flow-form';

/** The id of whichever title (phase or success) labels the modal. */
export const ENTRY_TITLE_ID = 'grm-entry-title';

const BLANK_FIELDS: EntryFields = { name: '', email: '', pw: '', code: '' };
const SIGN_OUT_MIN_MS = 700;

const FIELD_ERROR_KEY: Record<keyof EntryFields, FieldKey> = { name: 'user', email: 'email', pw: 'pw', code: 'code' };

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function metaOf(profile: ProfileSummary): string {
  return `${tribeName(profile.colors)} · ${profile.cloud ? LINK_STATE.linked : LINK_STATE.local}`;
}

// The entry modal's state machine (R15), ported from the prototype's logic class. Provided on
// the EntryModal component. Pure rules (copy, validation, prompts, color sources) live in
// entry-flow.util; this store holds the state and runs the flows against the services. The form
// core and the cloud steps are its own FlowForm and CloudSteps, aliased under the names its
// templates read.
@Injectable()
export class EntryFlowStore {
  private readonly profileStore = inject(ProfileStore);
  private readonly session = inject(ProfileSessionService);
  private readonly cloudAuth = inject(CloudAuthService);
  private readonly modal = inject(EntryModalService);
  private readonly profileModal = inject(ProfileModalService);

  // ── State ────────────────────────────────────────────────────────────────
  readonly context = signal<EntryContext>('gate');
  readonly phase = signal<EntryPhase>('list');
  readonly selectedId = signal<string | null>(null);
  readonly hoveredId = signal<string | null>(null);
  readonly done = signal<DoneKind | null>(null);
  readonly previousName = signal<string | null>(null);
  readonly cloudColors = signal<Color[] | null>(null);
  readonly picks = signal<Color[]>([...DEFAULT_IDENTITY]);
  readonly notice = signal('');

  readonly form = new FlowForm<EntryFields>({ blank: BLANK_FIELDS, errorKeys: FIELD_ERROR_KEY });
  readonly cloud = new CloudSteps<EntryFields, EntryPhase>({
    form: this.form,
    phase: this.phase,
    // Every entry phase is a form phase: CloudForm and ResetForm read their fields in each.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the guard needs its parameter
    isCloudPhase: (phase): phase is EntryPhase & FormPhase => true,
    plateEmail: computed(() => this.plateEmail()),
    // A reset from "Redefinir senha do perfil" is for the profile's linked account.
    lockedEmail: computed(() => (this.phase() === 'recover-form' ? (this.subject()?.cloud?.email ?? '') : null)),
    go: (phase) => this.go(phase),
    toPhase: (phase) => this.toPhase(phase),
  });

  readonly fields = this.form.fields;
  readonly fieldErrors = this.form.fieldErrors;
  readonly emailInUse = this.form.emailInUse;
  readonly formError = this.form.formError;
  readonly loading = this.form.loading;
  /** Where the reset flow returns to ("Voltar") and continues after the code. */
  readonly backTarget = this.cloud.backTarget;
  /** Reset for the linked account (from reauth/recover): the e-mail is fixed. */
  readonly emailLocked = this.cloud.emailLocked;
  readonly cooldown = this.cloud.cooldown;
  readonly resending = this.cloud.resending;

  // ── Derived ──────────────────────────────────────────────────────────────
  readonly profiles = this.profileStore.profiles;
  readonly active = this.session.active;
  readonly selected = computed(() => this.profileStore.byId(this.selectedId()) ?? null);
  readonly hovered = computed(() => this.profileStore.byId(this.hoveredId()) ?? null);
  /** The profile in view — {P} in the copy. */
  readonly subject = computed(() => this.selected() ?? this.active());
  /** Gate context: the profile the list/unlock is focused on. */
  readonly focusProfile = computed(() => {
    if (this.context() !== 'gate') {
      return null;
    }
    return this.hovered() ?? this.selected() ?? (this.phase() === 'list' ? this.active() : null);
  });

  readonly shown = this.cloud.shown;
  readonly isCloudBusy = this.cloud.isCloudBusy;

  readonly colorSource = computed(() =>
    colorSourceFor(this.phase(), this.context(), {
      done: this.done(),
      origin: this.backTarget(),
      hasCloudColors: !!this.cloudColors(),
    }),
  );

  /** The identity in view (STATES.md "Colors"); null = the default identity, wheel neutral. */
  readonly identityColors = computed<Color[] | null>(() => {
    switch (this.colorSource()) {
      case 'preview':
        return (this.hovered() ?? this.active())?.colors ?? null;
      case 'picks':
        return this.picks();
      case 'cloud':
        return this.cloudColors() ?? this.subject()?.colors ?? null;
      case 'profile':
        return this.subject()?.colors ?? null;
      case 'default':
        return null;
    }
  });

  readonly roles = computed(() => rolesFor(this.identityColors() ?? DEFAULT_IDENTITY));
  readonly neutral = computed(() => !this.identityColors());
  readonly tribe = computed(() => tribeName(this.identityColors() ?? []));

  private readonly copyVars = computed<CopyVars>(() => {
    const subject = this.subject();
    const active = this.active();
    return {
      profile: subject?.name ?? '',
      email: this.fields().email.trim(),
      tribe: subject ? tribeName(subject.colors) : '',
      linked: !!subject?.cloud,
      activeName: this.context() === 'gate' && active ? active.name : null,
    };
  });

  readonly title = computed(() => titleFor(this.phase(), this.copyVars()));
  readonly subtitle = computed(() => subtitleFor(this.phase(), this.copyVars()));
  readonly primary = computed(() =>
    this.loading() ? busyLabel(this.phase()) : primaryLabel(this.phase()),
  );
  readonly pwLabel = this.cloud.pwLabel;
  readonly pwAutocomplete = this.cloud.pwAutocomplete;
  readonly pwHelper = this.cloud.pwHelper;
  readonly prompt = computed(() => (this.done() ? null : promptFor(this.phase(), this.context())));
  readonly plateEmail = computed(() =>
    this.phase() === 'setup' ? this.fields().email.trim() : (this.subject()?.cloud?.email ?? ''),
  );
  readonly signOutLabel = computed(() =>
    this.loading() ? ACTION.signOutBusy : ACTION.signOut(this.active()?.name ?? ''),
  );
  readonly resendLabel = this.cloud.resendLabel;

  readonly doneCopy = computed(() => {
    const kind = this.done();
    if (!kind) {
      return null;
    }
    const subject = this.subject();
    return doneCopy(kind, { profile: subject?.name ?? '', previous: this.previousName() });
  });

  readonly caption = computed(() => {
    const focus = this.phase() === 'list' ? (this.hovered() ?? this.active()) : null;
    return captionFor(this.phase(), this.context(), {
      done: this.done(),
      focusMeta: focus ? metaOf(focus) : null,
      hasCloudColors: !!this.cloudColors(),
    });
  });

  /** The muted line under the tribe name; null = the color names in pick order. */
  readonly wheelSubline = computed<string | null>(() => {
    if (this.colorSource() === 'picks') {
      return null;
    }
    return this.focusProfile()?.name ?? null;
  });

  readonly chipLabel = computed(() => {
    const focus = this.focusProfile();
    return focus ? `${focus.name} · ${this.tribe()}` : this.tribe();
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────
  start(request: ResolvedEntryRequest): void {
    this.reset();
    this.context.set(request.context);
    this.phase.set(request.start);
  }

  /** Clears every field, error and flow state (FR-028). */
  reset(): void {
    this.form.reset();
    this.context.set('gate');
    this.phase.set('list');
    this.selectedId.set(null);
    this.hoveredId.set(null);
    this.done.set(null);
    this.previousName.set(null);
    this.cloudColors.set(null);
    this.picks.set([...DEFAULT_IDENTITY]);
    this.notice.set('');
    this.cloud.reset();
  }

  /** ✕, Esc, backdrop, Concluir or Cancelar (unlink): close and reset. */
  close(): void {
    this.modal.close();
    this.reset();
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  /** Switching forms (FR-028): clears errors and password/code, keeps the e-mail. */
  go(phase: EntryPhase): void {
    this.form.bump();
    this.loading.set(false);
    this.toPhase(phase);
  }

  private toPhase(phase: EntryPhase): void {
    this.phase.set(phase);
    this.done.set(null);
    this.form.clearForPhase(['pw', 'code']);
    this.notice.set('');
  }

  followPrompt(target: PromptTarget): void {
    if (target === 'back') {
      this.cloud.back();
      return;
    }
    if (target === 'list') {
      this.selectedId.set(null);
      this.hoveredId.set(null);
    }
    this.go(target);
  }

  preview(profileId: string | null): void {
    this.hoveredId.set(profileId);
  }

  pickProfile(profileId: string): void {
    this.selectedId.set(profileId);
    this.hoveredId.set(null);
    this.go('unlock');
  }

  createProfile(): void {
    this.selectedId.set(null);
    this.hoveredId.set(null);
    this.picks.set([...DEFAULT_IDENTITY]);
    this.go('profile');
  }

  /** "Esqueci minha senha". */
  forgot(): void {
    const phase = this.phase();
    if (phase === 'unlock') {
      this.go(this.selected()?.cloud ? 'recover-form' : 'localreset-warn');
      return;
    }
    this.cloud.forgot();
  }

  recoverAccess(): void {
    this.cloud.recoverAccess();
  }

  otherEmail(): void {
    this.cloud.otherEmail();
  }

  confirmLocalReset(): void {
    this.go('localreset-newpw');
  }

  cancelToUnlock(): void {
    this.go('unlock');
  }

  /**
   * "Vincular conta na nuvem" on "Perfil criado" (FR-037): linking the active profile is the
   * profile modal's, so hand off to it at account creation (spec 005 R3).
   */
  linkAfterCreate(): void {
    this.close();
    this.profileModal.open({ start: 'up' });
  }

  editField(key: keyof EntryFields, value: string): void {
    this.form.edit(key, value);
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  /** Validates on submit before any request (FR-005); locked while a request runs. */
  submit(): Promise<void> {
    const phase = this.phase();
    return this.form.submit(
      () => validate(phase, this.fields(), { isNameTaken: (name) => this.profileStore.isNameTaken(name) }),
      (generation) => this.run(phase, generation),
      (error) => this.form.fail(error),
    );
  }

  private stale(generation: number): boolean {
    return this.form.stale(generation);
  }

  private async run(phase: EntryPhase, generation: number): Promise<void> {
    const { name, email, pw, code } = this.fields();
    switch (phase) {
      case 'profile': {
        const created = await this.profileStore.create({ name, password: pw, colors: this.picks() });
        await this.session.activate(created.id);
        if (this.stale(generation)) {
          return;
        }
        this.selectedId.set(created.id);
        this.finish('profiled');
        return;
      }
      case 'unlock': {
        const id = this.selectedId();
        if (!id) {
          return;
        }
        const ok = await this.profileStore.verifyPassword(id, pw);
        if (this.stale(generation)) {
          return;
        }
        if (!ok) {
          this.fieldErrors.set({ pw: MSG.wrongLocal });
          return;
        }
        this.previousName.set(this.active()?.name ?? null);
        await this.session.activate(id);
        if (this.stale(generation)) {
          return;
        }
        this.finish('unlocked');
        return;
      }
      case 'localreset-newpw':
      case 'recover-newpw': {
        const id = this.selectedId();
        if (!id) {
          return;
        }
        await this.profileStore.setPassword(id, pw);
        this.previousName.set(this.active()?.name ?? null);
        await this.session.activate(id);
        if (!this.stale(generation)) {
          this.finish('recovered');
        }
        return;
      }
      case 'recover-form': {
        await this.cloudAuth.verifyLinkedAccount(this.subject()!.id, pw);
        if (!this.stale(generation)) {
          this.toPhase('recover-newpw');
        }
        return;
      }
      case 'in': {
        const identity = await this.cloudAuth.signIn(email, pw);
        if (!this.stale(generation)) {
          await this.afterCloudSignIn(identity, generation);
        }
        return;
      }
      case 'reset-email':
        return this.cloud.requestCode(generation);
      case 'reset-code': {
        const identity = await this.cloudAuth.verifyResetCode(email, code, pw);
        if (!this.stale(generation)) {
          await this.afterCloudSignIn(identity, generation);
        }
        return;
      }
      case 'setup': {
        const created = await this.cloudAuth.setupFromPending({ name, password: pw });
        if (!this.stale(generation)) {
          this.selectedId.set(created.id);
          this.finish('setup');
        }
        return;
      }
      case 'list':
      case 'localreset-warn':
        return;
    }
  }

  // Continues a cloud sign-in (direct, or after a reset code) per the flow it started from.
  private async afterCloudSignIn(identity: CloudIdentity, generation: number): Promise<void> {
    const origin = this.backTarget() ?? this.phase();
    const subject = this.subject();

    if (origin === 'recover-form' && subject) {
      await this.cloudAuth.adoptPending(subject.id);
      if (this.stale(generation)) {
        return;
      }
      this.backTarget.set(null);
      this.emailLocked.set(false);
      this.toPhase('recover-newpw');
      return;
    }

    try {
      this.cloudAuth.assertNotLinkedElsewhere(identity.userId);
    } catch (failure) {
      await this.cloudAuth.discardPending();
      throw failure;
    }
    this.backTarget.set(null);
    this.cloudColors.set(identity.colors ?? null);
    this.fields.update((f) => ({ ...f, name: identity.label ?? '', email: identity.email || f.email }));
    this.toPhase('setup');
  }

  // Never syncs: sync starts only from the shell's sync controls (spec 004, FR-006).
  private finish(kind: DoneKind): void {
    this.done.set(kind);
    this.loading.set(false);
  }

  // ── List actions ─────────────────────────────────────────────────────────
  /** "Sair de {P}" (FR-008): "Saindo…" for at least 700 ms, then the signed-out list. */
  async signOut(): Promise<void> {
    if (this.loading()) {
      return;
    }
    const name = this.active()?.name ?? '';
    this.loading.set(true);
    const generation = this.form.token();
    await Promise.all([this.session.signOut(), delay(SIGN_OUT_MIN_MS)]);
    if (this.stale(generation)) {
      return;
    }
    this.loading.set(false);
    this.hoveredId.set(null);
    this.selectedId.set(null);
    this.notice.set(MISC.signedOutNotice(name));
  }

  // ── Reset code ───────────────────────────────────────────────────────────
  resend(): Promise<void> {
    return this.cloud.resend();
  }
}
