# Contracts: Shared Modal, Focus and Auth Units

The internal TypeScript surfaces this feature introduces or changes. Signatures are the contract; bodies are left to the implementation. State and transitions are in [data-model.md](../data-model.md).

## `FluidHeight` — `src/app/shared/ds/fluid-height.ts` (new)

```ts
export interface FluidHeightConfig {
  /** Where the height is written; undefined until rendered. */
  face: () => HTMLElement | undefined;
  /** Gets `is-resizing` (and `capped`, with `cap`). Defaults to the face. */
  scroller?: () => HTMLElement | undefined;
  /** The elements whose size changes trigger a measure (absent ones are skipped). */
  observe: () => readonly (HTMLElement | undefined)[];
  /** The face height the content needs, in px; null = nothing to measure yet. */
  measure: () => number | null;
  /** Minimum face height in px (default 0). */
  min?: number;
  /** Viewport margin in px; when set, `capped` is reported and written. */
  cap?: number;
}

/** Create in a component constructor (injection context). */
export class FluidHeight {
  constructor(config: FluidHeightConfig);
  /** The content can't fit even at the tallest face (always false without `cap`, and on phone). */
  readonly capped: Signal<boolean>;
}
```

Guarantees:
- **Writes**:
  - the height goes straight to `face.style.height`, in the observer callback (same frame as the change);
  - `''` on phone;
  - nothing when the value is unchanged.
- **One measure on open**: the observer's first notification, with no explicit extra call.
- **Arming**: `is-sized` goes on the face at the first `pointerdown`/`keydown` on `face.closest('dialog')`. Before that, no `is-resizing` is set.
- **`is-resizing`**:
  - set only when armed and not under reduced motion;
  - removed on the face's own `height` `transitionend`, or after 300 ms.
- **Re-measures** on window `resize` and on a phone↔desktop switch.
- **On destroy**: disconnect, remove listeners, clear the timer.

## `FluidFace` — `src/app/shared/ds/themed-modal/fluid-face.ts` (changed)

```ts
export interface FluidFaceRefs {
  face: Signal<ElementRef<HTMLElement> | undefined>;     // new: ThemedModal.face
  pane: Signal<ElementRef<HTMLElement> | undefined>;     // new: the .form-pane (scroller)
  content: Signal<ElementRef<HTMLElement> | undefined>;
  prompt: Signal<ElementRef<HTMLElement> | undefined>;
  screenKey: Signal<string>;
}
export class FluidFace {
  constructor(refs: FluidFaceRefs);
}
```

The themed preset: `FluidHeight` with `min: 460`, `cap: 64`, `scroller: pane`, the chrome+content+prompt measure, plus `focusOnChange(screenKey, content, FIRST_STOP_ORDER)`.

Removed:
- `faceHeight` and `capped` (now direct writes);
- the fonts-ready re-measure;
- the explicit measure after observing;
- the inline focus loop.

## `ThemedModal` — `src/app/shared/ds/themed-modal/themed-modal.ts` (changed)

- **Removed**: the `faceHeight` input and the `[style.height.px]` binding.
- **Added**: `readonly face: Signal<ElementRef<HTMLElement>>` (public `viewChild.required('face')`).
- **Opener**: captured and restored through `captureFocus()`.

## `CompactModal` — `src/app/shared/ds/compact-modal/compact-modal.ts` (changed)

- **Inputs, outputs and template contract are unchanged** (`roles`, `labelledBy`, `locked`, `closed`, `[data-autofocus]`).
- **Height**: its own observer, `measure()`, `sized` signal, timer and `onTransitionEnd` go away, replaced by one `FluidHeight` (no `min`, no `cap`).
- **Focus**: open focus is `focusFirst(dialog, MARKED_STOP)`; the opener goes through `captureFocus()`.

## Focus helpers — `src/app/shared/ds/focus.ts` (new)

```ts
export const FIRST_STOP_ORDER: readonly string[];   // field → action row → list option → any enabled button
export const MARKED_STOP: readonly string[];        // ['[data-autofocus]']

/** Focuses the first element matching the earliest selector that matches; null if none. */
export function focusFirst(root: ParentNode | null | undefined, order: readonly string[]): HTMLElement | null;

/** Focuses `el` if it is connected; no-op otherwise. */
export function focusElement(el: HTMLElement | null | undefined, options?: FocusOptions): void;

/** Records the active element now; the returned function gives focus back to it if still connected. */
export function captureFocus(): (options?: FocusOptions) => void;

/** Injection context: after each render, focus `focusFirst(root(), order)` when `key` changes to a new non-empty value. */
export function focusOnChange(
  key: Signal<string>,
  root: Signal<ElementRef<HTMLElement> | undefined>,
  order: readonly string[],
): void;
```

None of these throw on a missing root, a missing target or a detached element.

## `rovingIndex` — `src/app/core/utils/roving.util.ts` (new)

```ts
/** Next index for a radio-group key, wrapping; Home/End → ends; null for any other key. */
export function rovingIndex(key: string, from: number, count: number): number | null;
```

## `RovingRadios` — `src/app/shared/ds/roving-radios.ts` (new)

```ts
@Directive({ selector: '[appRovingRadios]' })
export class RovingRadios {
  /** Index of the checked `[role="radio"]` descendant; −1 = none. */
  readonly selected = input.required<number>({ alias: 'appRovingRadios' });
  /** The index to select (selection follows focus). */
  readonly radioMove = output<number>();
}
```

- **Placement**: on the `role="radiogroup"` element.
- **Keys**: it handles bubbled `keydown` from its radios. For arrows, Home and End it calls `preventDefault()`, emits `radioMove`, then focuses the target radio.
- **No selection**: with `selected() === -1`, an arrow key targets the focused radio.
- **Not its job**: roving `tabindex` and `aria-checked` stay in each template.

Usage, for example the delete dialog:

```html
<div class="choices" role="radiogroup" [appRovingRadios]="choiceIndex()" (radioMove)="pickIndex($event)">
```

## `FlowForm<F>` — `src/app/shared/auth/flow-form.ts` (new)

```ts
export interface FlowFormConfig<F extends CloudFormFields> {
  blank: F;
  errorKeys: Record<keyof F, FieldKey>;
}

export class FlowForm<F extends CloudFormFields> {
  constructor(config: FlowFormConfig<F>);
  readonly fields: WritableSignal<F>;
  readonly fieldErrors: WritableSignal<FieldErrors>;
  readonly formError: WritableSignal<string>;
  readonly emailInUse: WritableSignal<boolean>;
  readonly loading: WritableSignal<boolean>;

  token(): number;
  stale(token: number): boolean;
  /** Invalidates in-flight results (reset, navigation). */
  bump(): void;

  edit(key: keyof F, value: string): void;
  /** On a phase switch: blank `keys`, clear errors, form error and e-mail-in-use. */
  clearForPhase(keys: readonly (keyof F)[]): void;
  /** Maps a failure (mapCloudError) to a field or the form; `remap` renames the field. */
  fail(error: unknown, remap?: (failure: Failure) => FieldKey): Failure;
  /**
   * Skips while loading. Validation errors are set and nothing runs; otherwise clears errors,
   * locks `loading`, runs with the current token and maps a fresh failure through `onError`.
   */
  submit(
    validate: () => FieldErrors,
    run: (token: number) => Promise<void>,
    onError: (error: unknown) => void,
  ): Promise<void>;
  reset(): void;
}
```

`CloudFormFields` moves from `cloud-flow-host.ts` into this file. `Failure` is `mapCloudError`'s existing return type (`@utils/cloud-error.util`).

## `CloudSteps<F, P>` — `src/app/shared/auth/cloud-steps.ts` (new; replaces `cloud-flow-host.ts`)

```ts
export interface CloudStepsHost<F extends CloudFormFields, P extends string> {
  form: FlowForm<F>;
  phase: Signal<P>;
  isCloudPhase: (phase: P) => boolean;
  plateEmail: Signal<string>;
  /** The e-mail a reset started from the current phase is fixed to; null = editable. */
  lockedEmail: Signal<string | null>;
  go: (phase: P) => void;
  toPhase: (phase: P) => void;
}

export class CloudSteps<F extends CloudFormFields = CloudFormFields, P extends string = string> {
  constructor(host: CloudStepsHost<F, P>);
  // What CloudForm and ResetForm read
  readonly phase: Signal<P>;
  readonly fields: Signal<F>;
  readonly fieldErrors: Signal<FieldErrors>;
  readonly shown: Signal<PhaseFields>;
  readonly pwLabel: Signal<string>;
  readonly pwAutocomplete: Signal<string>;
  readonly pwHelper: Signal<string>;
  readonly plateEmail: Signal<string>;
  readonly emailInUse: Signal<boolean>;
  readonly emailLocked: WritableSignal<boolean>;
  // Reset code
  readonly backTarget: WritableSignal<P | null>;
  readonly cooldown: Signal<number>;
  readonly resending: Signal<boolean>;
  readonly isCloudBusy: Signal<boolean>;
  readonly resendLabel: Signal<string>;

  editField(key: keyof CloudFormFields, value: string): void;
  forgot(): void;
  recoverAccess(): void;
  otherEmail(): void;
  back(): void;
  requestCode(token: number): Promise<void>;
  resend(): Promise<void>;
  reset(): void;
}
```

- **Provided per modal component**, never at root:

  ```ts
  providers: [EntryFlowStore, { provide: CloudSteps, useFactory: () => inject(EntryFlowStore).cloud }]
  ```

- **`CloudForm` and `ResetForm`** `inject(CloudSteps)`. Their templates are unchanged (same member names).

## Flow stores (changed, same public surface)

`EntryFlowStore` and `ProfileFlowStore` keep every public member their templates, sub-screens and specs use today. The form and cloud members become aliases or one-line delegations to `form` and `cloud`. Both stores stop extending `CloudFlowHost`. Neither may hold its own copy of a `CloudSteps` or `FlowForm` behavior (FR-020).
