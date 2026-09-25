import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { EntryModalService } from '@services/entry-modal.service';
import { ACTION, MISC } from '@utils/entry-copy';
import { IdentityChip } from '@shared/ds/identity-chip/identity-chip';
import { IdentityWheel } from '@shared/ds/identity-wheel/identity-wheel';
import { MOBILE_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import { SparkField } from '@shared/ds/spark-field/spark-field';
import { ThemedModal } from '@shared/ds/themed-modal/themed-modal';
import { CloudForm } from './cloud-form/cloud-form';
import { DonePanel } from './done-panel/done-panel';
import { ENTRY_TITLE_ID, EntryFlowStore } from './entry-flow.store';
import { ProfileForm } from './profile-form/profile-form';
import { ProfileList } from './profile-list/profile-list';
import { ResetForm } from './reset-form/reset-form';

type Body = 'list' | 'local' | 'cloud' | 'reset';

const MIN_FACE_HEIGHT = 460;
// Form pane chrome around the measured content: 12px top padding + 44px close row + 24px
// bottom padding, plus 16px between the content and the prompt.
const PANE_CHROME = 12 + 44 + 24;
const PROMPT_GAP = 16;
// ThemedModal caps the face at 100dvh − 2 × space-6.
const FACE_VIEWPORT_MARGIN = 64;

const FOCUSABLE_FIRST = 'input:not([readonly]), [role="listitem"] button, button:not([disabled])';

// The one themed modal for every profile and account flow (FR-036). Rendered once in
// app.html and opened through EntryModalService.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-entry-modal',
  imports: [ThemedModal, SparkField, IdentityWheel, IdentityChip, ProfileList, ProfileForm, CloudForm, ResetForm, DonePanel],
  providers: [EntryFlowStore],
  templateUrl: './entry-modal.html',
  styleUrl: './entry-modal.scss',
})
export class EntryModal {
  protected readonly store = inject(EntryFlowStore);
  protected readonly modal = inject(EntryModalService);
  protected readonly mobile = mediaQuerySignal(MOBILE_QUERY);

  protected readonly titleId = ENTRY_TITLE_ID;
  protected readonly action = ACTION;
  protected readonly wordmark = MISC.wordmark;

  private readonly content = viewChild<ElementRef<HTMLElement>>('content');
  private readonly promptEl = viewChild<ElementRef<HTMLElement>>('prompt');
  private readonly faceHeight = signal(MIN_FACE_HEIGHT);
  protected readonly desktopFaceHeight = computed(() => (this.mobile() ? null : this.faceHeight()));
  /** The content can't fit even at the tallest face: only then does the form pane scroll. */
  protected readonly capped = signal(false);

  protected readonly body = computed<Body | null>(() => {
    switch (this.store.phase()) {
      case 'list':
        return 'list';
      case 'unlock':
      case 'profile':
      case 'localreset-newpw':
      case 'recover-newpw':
        return 'local';
      case 'in':
      case 'up':
      case 'setup':
      case 'reauth':
      case 'recover-form':
        return 'cloud';
      case 'reset-email':
      case 'reset-code':
        return 'reset';
      default:
        return null;
    }
  });

  protected readonly picking = computed(() => this.store.phase() === 'profile' && !this.store.done());
  /** The full-width primary; `unlink` puts its (danger) submit in its own button row. */
  protected readonly hasSubmit = computed(() => !!this.store.primary() && this.store.phase() !== 'unlink');

  private readonly observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.measure()) : null;

  constructor() {
    // A new open() starts the flow from its requested context and phase.
    effect(() => {
      const request = this.modal.request();
      if (request) {
        untracked(() => this.store.start(request));
      }
    });

    // Fluid height (desktop): the face follows its content, never below 460px.
    afterRenderEffect(() => {
      const content = this.content()?.nativeElement;
      const prompt = this.promptEl()?.nativeElement;
      this.observer?.disconnect();
      for (const element of [content, prompt]) {
        if (element) {
          this.observer?.observe(element);
        }
      }
      this.measure();
    });
    void document.fonts?.ready.then(() => this.measure());
    const onResize = () => this.measure();
    window.addEventListener('resize', onResize);
    inject(DestroyRef).onDestroy(() => {
      this.observer?.disconnect();
      window.removeEventListener('resize', onResize);
    });

    // Focus the first field (or the first profile row) whenever a screen appears.
    let lastScreen = '';
    afterRenderEffect(() => {
      const screen = this.modal.isOpen() ? `${this.store.phase()}|${this.store.done()}|${this.modal.request()?.id}` : '';
      if (screen && screen !== lastScreen) {
        this.content()?.nativeElement.querySelector<HTMLElement>(FOCUSABLE_FIRST)?.focus();
      }
      lastScreen = screen;
    });
  }

  private measure(): void {
    const content = this.content()?.nativeElement;
    if (!content) {
      return;
    }
    const prompt = this.promptEl()?.nativeElement;
    const needed = PANE_CHROME + content.offsetHeight + (prompt ? PROMPT_GAP + prompt.offsetHeight : 0);
    this.faceHeight.set(Math.max(MIN_FACE_HEIGHT, Math.ceil(needed)));
    this.capped.set(needed > window.innerHeight - FACE_VIEWPORT_MARGIN);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void this.store.submit();
  }
}
