import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Color, ProfileSummary } from '@models/profile.model';
import { CloudAuthService, CloudIdentity } from '@services/cloud-auth.service';
import { EntryModalService, ResolvedEntryRequest } from '@services/entry-modal.service';
import { ProfileSessionService } from '@services/profile-session.service';
import { ProfileStore } from '@services/profile-store.service';
import { FieldKey, mapCloudError } from '@utils/cloud-error.util';
import { ACTION, LINK_STATE, MISC, MSG } from '@utils/entry-copy';
import {
  CopyVars,
  DoneKind,
  EntryContext,
  EntryFields,
  EntryPhase,
  FieldErrors,
  PromptTarget,
  busyLabel,
  captionFor,
  colorSourceFor,
  doneCopy,
  fieldsFor,
  primaryLabel,
  promptFor,
  pwAutocomplete,
  pwHelper,
  pwLabel,
  subtitleFor,
  titleFor,
  validate,
} from '@utils/entry-flow.util';
import { DEFAULT_IDENTITY, rolesFor, sameColors, tribeName } from '@utils/identity.util';

/** The id of whichever title (phase or success) labels the modal. */
export const ENTRY_TITLE_ID = 'grm-entry-title';

const BLANK_FIELDS: EntryFields = { name: '', email: '', pw: '', code: '' };
const RESEND_COOLDOWN_S = 30;
const SIGN_OUT_MIN_MS = 700;

const FIELD_ERROR_KEY: Record<keyof EntryFields, FieldKey> = { name: 'user', email: 'email', pw: 'pw', code: 'code' };

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function metaOf(profile: ProfileSummary): string {
  return `${tribeName(profile.colors)} · ${profile.cloud ? LINK_STATE.linked : LINK_STATE.local}`;
}

// The entry modal's state machine (R15), ported from the prototype's logic class. Provided on
// the EntryModal component. Pure rules (copy, validation, prompts, color sources) live in
// entry-flow.util; this store holds the state and runs the flows against the services.
@Injectable()
export class EntryFlowStore {
  private readonly profileStore = inject(ProfileStore);
  private readonly session = inject(ProfileSessionService);
  private readonly cloudAuth = inject(CloudAuthService);
  private readonly modal = inject(EntryModalService);

  // ── State ────────────────────────────────────────────────────────────────
  readonly context = signal<EntryContext>('gate');
  readonly phase = signal<EntryPhase>('list');
  readonly selectedId = signal<string | null>(null);
  readonly hoveredId = signal<string | null>(null);
  /** Where the reset flow returns to ("Voltar") and continues after the code. */
  readonly backTarget = signal<EntryPhase | null>(null);
  readonly fields = signal<EntryFields>(BLANK_FIELDS);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly emailInUse = signal(false);
  /** Reset for the linked account (from reauth/recover): the e-mail is fixed. */
  readonly emailLocked = signal(false);
  readonly formError = signal('');
  readonly loading = signal(false);
  readonly done = signal<DoneKind | null>(null);
  readonly previousName = signal<string | null>(null);
  readonly replacedTribe = signal<string | null>(null);
  readonly cooldown = signal(0);
  readonly resending = signal(false);
  readonly cloudColors = signal<Color[] | null>(null);
  readonly picks = signal<Color[]>([...DEFAULT_IDENTITY]);
  readonly notice = signal('');

  // Bumped on reset and on user navigation, so a request that resolves after the person moved
  // on (or closed the modal) never writes into the new state.
  private generation = 0;
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopCooldown());
  }

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

  readonly shown = computed(() => fieldsFor(this.phase()));
  readonly isCloudBusy = computed(() => this.loading() || this.resending());

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
      linkedEmail: subject?.cloud?.email ?? '',
      tribe: subject ? tribeName(subject.colors) : '',
      linked: !!subject?.cloud,
      activeName: this.context() === 'gate' && active ? active.name : null,
    };
  });

  readonly title = computed(() => titleFor(this.phase(), this.copyVars()));
  readonly subtitle = computed(() => subtitleFor(this.phase(), this.context(), this.copyVars()));
  readonly primary = computed(() =>
    this.loading() ? busyLabel(this.phase()) : primaryLabel(this.phase()),
  );
  readonly pwLabel = computed(() => pwLabel(this.phase()));
  readonly pwAutocomplete = computed(() => pwAutocomplete(this.phase()));
  readonly pwHelper = computed(() => pwHelper(this.phase()));
  readonly prompt = computed(() => (this.done() ? null : promptFor(this.phase(), this.context())));
  readonly plateEmail = computed(() =>
    this.phase() === 'setup' ? this.fields().email.trim() : (this.subject()?.cloud?.email ?? ''),
  );
  readonly signOutLabel = computed(() =>
    this.loading() ? ACTION.signOutBusy : ACTION.signOut(this.active()?.name ?? ''),
  );
  readonly resendLabel = computed(() =>
    this.cooldown() > 0 ? ACTION.resendIn(this.cooldown()) : ACTION.resendCode,
  );

  readonly doneCopy = computed(() => {
    const kind = this.done();
    if (!kind) {
      return null;
    }
    const subject = this.subject();
    return doneCopy(kind, {
      profile: subject?.name ?? '',
      email: subject?.cloud?.email ?? this.fields().email.trim(),
      previous: this.previousName(),
      replacedTribe: this.replacedTribe(),
    });
  });

  readonly caption = computed(() => {
    const focus = this.phase() === 'list' ? (this.hovered() ?? this.active()) : null;
    return captionFor(this.phase(), this.context(), {
      done: this.done(),
      focusMeta: focus ? metaOf(focus) : null,
      colorsReplaced: !!this.replacedTribe(),
      hasCloudColors: !!this.cloudColors(),
    });
  });

  /** The muted line under the tribe name; null = the color names in pick order. */
  readonly wheelSubline = computed<string | null>(() => {
    if (this.colorSource() === 'picks') {
      return null;
    }
    const focus = this.focusProfile();
    if (focus) {
      return focus.name;
    }
    return this.context() === 'link' ? (this.subject()?.name ?? null) : null;
  });

  readonly chipLabel = computed(() => {
    const focus = this.focusProfile();
    if (focus) {
      return `${focus.name} · ${this.tribe()}`;
    }
    return this.context() === 'link' ? `${this.subject()?.name ?? ''} · ${this.tribe()}` : this.tribe();
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────
  start(request: ResolvedEntryRequest): void {
    this.reset();
    this.context.set(request.context);
    this.phase.set(request.start);
  }

  /** Clears every field, error and flow state (FR-028). */
  reset(): void {
    this.generation++;
    this.stopCooldown();
    this.context.set('gate');
    this.phase.set('list');
    this.selectedId.set(null);
    this.hoveredId.set(null);
    this.backTarget.set(null);
    this.fields.set(BLANK_FIELDS);
    this.fieldErrors.set({});
    this.emailInUse.set(false);
    this.emailLocked.set(false);
    this.formError.set('');
    this.loading.set(false);
    this.done.set(null);
    this.previousName.set(null);
    this.replacedTribe.set(null);
    this.resending.set(false);
    this.cloudColors.set(null);
    this.picks.set([...DEFAULT_IDENTITY]);
    this.notice.set('');
    void this.cloudAuth.discardPending();
  }

  /** ✕, Esc, backdrop, Concluir or Cancelar (unlink): close and reset. */
  close(): void {
    this.modal.close();
    this.reset();
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  /** Switching forms (FR-028): clears errors and password/code, keeps the e-mail. */
  go(phase: EntryPhase): void {
    this.generation++;
    this.loading.set(false);
    this.toPhase(phase);
  }

  private toPhase(phase: EntryPhase): void {
    this.phase.set(phase);
    this.done.set(null);
    this.fields.update((f) => ({ ...f, pw: '', code: '' }));
    this.fieldErrors.set({});
    this.formError.set('');
    this.emailInUse.set(false);
    this.notice.set('');
  }

  followPrompt(target: PromptTarget): void {
    if (target === 'back') {
      const back = this.backTarget() ?? 'in';
      this.backTarget.set(null);
      this.emailLocked.set(false);
      this.go(back);
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
    this.backTarget.set(phase);
    if (phase === 'reauth' || phase === 'recover-form') {
      const email = this.subject()?.cloud?.email ?? '';
      this.fields.update((f) => ({ ...f, email }));
      this.emailLocked.set(true);
    }
    this.go('reset-email');
  }

  /** "É seu? Recupere o acesso" under an e-mail already in use. */
  recoverAccess(): void {
    this.backTarget.set('up');
    this.go('reset-email');
  }

  /** "Usar outro e-mail" — back to the e-mail step, keeping the flow's origin. */
  otherEmail(): void {
    this.go('reset-email');
  }

  confirmLocalReset(): void {
    this.go('localreset-newpw');
  }

  cancelToUnlock(): void {
    this.go('unlock');
  }

  /** "Vincular conta na nuvem" on "Perfil criado" (FR-014, FR-037). */
  linkAfterCreate(): void {
    this.context.set('link');
    this.selectedId.set(null);
    this.go('up');
  }

  editField(key: keyof EntryFields, value: string): void {
    const next = key === 'code' ? value.replace(/\D/g, '').slice(0, 6) : value;
    this.fields.update((f) => ({ ...f, [key]: next }));
    const errorKey = FIELD_ERROR_KEY[key];
    if (this.fieldErrors()[errorKey]) {
      this.fieldErrors.update((errors) => {
        const next = { ...errors };
        delete next[errorKey];
        return next;
      });
    }
    if (key === 'email') {
      this.emailInUse.set(false);
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  /** Validates on submit before any request (FR-005); locked while a request runs. */
  async submit(): Promise<void> {
    if (this.loading()) {
      return;
    }
    const phase = this.phase();
    const errors = validate(phase, this.fields(), { isNameTaken: (name) => this.profileStore.isNameTaken(name) });
    if (Object.keys(errors).length) {
      this.fieldErrors.set(errors);
      this.formError.set('');
      return;
    }
    this.fieldErrors.set({});
    this.formError.set('');
    this.emailInUse.set(false);
    this.loading.set(true);
    const generation = this.generation;
    try {
      await this.run(phase, generation);
    } catch (error) {
      if (generation === this.generation) {
        this.fail(error);
      }
    } finally {
      if (generation === this.generation) {
        this.loading.set(false);
      }
    }
  }

  private stale(generation: number): boolean {
    return generation !== this.generation;
  }

  private fail(error: unknown): void {
    const failure = mapCloudError(error);
    if (failure.kind === 'field') {
      this.fieldErrors.set({ [failure.field]: failure.message });
      this.emailInUse.set(!!failure.emailInUse);
    } else {
      this.formError.set(failure.message);
    }
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
      case 'up': {
        const profile = this.subject()!;
        await this.cloudAuth.signUp(email, pw, { label: profile.name, colors: profile.colors });
        await this.cloudAuth.linkPending(profile.id, { writeColors: true });
        if (!this.stale(generation)) {
          this.finish('created');
        }
        return;
      }
      case 'reset-email': {
        await this.cloudAuth.requestResetCode(email);
        if (!this.stale(generation)) {
          this.toPhase('reset-code');
          this.startCooldown();
        }
        return;
      }
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
      case 'reauth': {
        await this.cloudAuth.reauth(this.subject()!.id, pw);
        if (!this.stale(generation)) {
          this.finish('reauthed');
        }
        return;
      }
      case 'unlink': {
        await this.cloudAuth.unlink(this.subject()!.id);
        if (!this.stale(generation)) {
          this.finish('unlinked');
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

    if ((origin === 'reauth' || origin === 'recover-form') && subject) {
      await this.cloudAuth.adoptPending(subject.id);
      if (this.stale(generation)) {
        return;
      }
      this.backTarget.set(null);
      this.emailLocked.set(false);
      if (origin === 'reauth') {
        this.finish('reauthed');
      } else {
        this.toPhase('recover-newpw');
      }
      return;
    }

    if (this.context() !== 'link') {
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
      return;
    }

    const profile = subject!;
    const { colorsReplaced } = await this.cloudAuth.linkPending(profile.id, {
      writeColors: !identity.colors?.length,
    });
    if (this.stale(generation)) {
      return;
    }
    this.backTarget.set(null);
    if (colorsReplaced) {
      this.cloudColors.set(colorsReplaced);
    }
    this.replacedTribe.set(
      colorsReplaced && !sameColors(colorsReplaced, profile.colors) ? tribeName(colorsReplaced) : null,
    );
    this.finish('linked');
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
    const generation = this.generation;
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
  /** "Enviar novo código": blocked for 30 s after each send (FR-024). */
  async resend(): Promise<void> {
    if (this.cooldown() > 0 || this.resending() || this.loading()) {
      return;
    }
    this.resending.set(true);
    this.formError.set('');
    const generation = this.generation;
    try {
      await this.cloudAuth.requestResetCode(this.fields().email);
      if (!this.stale(generation)) {
        this.fields.update((f) => ({ ...f, code: '' }));
        this.fieldErrors.set({});
        this.startCooldown();
      }
    } catch (error) {
      if (!this.stale(generation)) {
        this.fail(error);
      }
    } finally {
      if (!this.stale(generation)) {
        this.resending.set(false);
      }
    }
  }

  private startCooldown(): void {
    this.stopCooldown();
    this.cooldown.set(RESEND_COOLDOWN_S);
    this.cooldownTimer = setInterval(() => {
      this.cooldown.update((n) => Math.max(0, n - 1));
      if (this.cooldown() === 0) {
        this.stopCooldown();
      }
    }, 1000);
  }

  private stopCooldown(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    this.cooldown.set(0);
  }
}
