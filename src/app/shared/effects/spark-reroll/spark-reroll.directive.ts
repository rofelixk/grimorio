import { Directive, ElementRef, inject } from '@angular/core';

// Every spark's angle/travel-distance is derived in CSS from its
// --position-seed custom property (see _motion.scss's shared .spark rule) —
// a fixed seed means a fixed path forever, which reads as visibly
// repetitive once you watch a modal for more than one loop. Rerolling
// --seed-offset (which feeds --position-seed only, not --timing-seed) each
// time the spark's own animation completes a cycle gives every spark a
// fresh path on its next burst, without any per-frame work: this only runs
// once per animation iteration (each spark's own --dur, ~0.7-1.1s), not on
// every frame.
//
// Deliberately does NOT touch anything --dur/--delay depend on: those feed
// this same element's own `animation` shorthand, and mutating a custom
// property that drives an *already-running* animation's duration/delay is
// handled inconsistently across browser engines (observed as sparks
// suddenly firing at the wrong speed instead of waiting for their next
// iteration). Rerolling position only is safe because --angle/--start/--end
// are read purely inside the keyframe's own 0%/100% transforms.
@Directive({
  selector: '[appSparkReroll]',
  standalone: true,
})
export class SparkRerollDirective {
  private readonly element = inject(ElementRef<HTMLElement>).nativeElement;

  constructor() {
    this.element.addEventListener('animationiteration', () => {
      this.element.style.setProperty('--seed-offset', String(Math.random() * 1000));
    });
  }
}
