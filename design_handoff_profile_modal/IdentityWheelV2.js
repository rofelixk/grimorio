// Identity wheel v2 — refinement of GrimorioDesignSystem_1934c9.IdentityWheel.
// Selected: gap ring + dot, steady soft glow, sparse motes drifting outward.
// Selectable: smaller, same ring/gap/dot anatomy, muted, masks the spinning ring line.
// Locked (3 picked): tiny empty ring.
(function () {
  const React = window.React, h = React.createElement;
  const NS = () => window.GrimorioDesignSystem_1934c9 || {};
  const POS = { W: [40.5, 3.5], U: [75.7, 29.1], B: [62.3, 70.4], R: [18.7, 70.4], G: [5.3, 29.1] };
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seq = 0;

  if (!document.getElementById('grm-wheel-v2-css')) {
    const st = document.createElement('style');
    st.id = 'grm-wheel-v2-css';
    st.textContent = `
.grm-wheel .sw2{position:absolute;width:19%;height:19%;padding:0;border:0;border-radius:50%;background:transparent;transform:scale(var(--s,0.72));transition:transform var(--duration-slow,0.5s) var(--ease-standard),opacity var(--duration-slow,0.5s) var(--ease-standard)}
.grm-wheel .sw2 .disc{position:absolute;inset:-1px;border-radius:50%;background:var(--color-bg)}
.grm-wheel .sw2 .rim{position:absolute;inset:0;border-radius:50%;border:1px solid var(--hex);opacity:var(--o,0.45);transition:opacity var(--duration-slow,0.5s) var(--ease-standard),border-color var(--duration-slow,0.5s) var(--ease-standard)}
.grm-wheel .sw2 .dot{position:absolute;inset:14%;border-radius:50%;background:var(--hex);opacity:var(--o,0.45);transition:opacity var(--duration-slow,0.5s) var(--ease-standard),transform var(--duration-slow,0.5s) var(--ease-standard)}
.grm-wheel .sw2.on{--s:1.06;--o:1}
.grm-wheel .sw2.on .dot{box-shadow:0 0 14px rgb(from var(--hex) r g b/55%);animation:grmBreathe 5s var(--ease-standard) infinite}
.grm-wheel .sw2.on .rim{box-shadow:0 0 10px rgb(from var(--hex) r g b/35%)}
.grm-wheel .sw2.off{--s:0.58;--o:0.28}
.grm-wheel .sw2.locked{--s:0.24;--o:0.35;cursor:not-allowed}
.grm-wheel .sw2.locked .dot{opacity:0;transform:scale(0.4)}
.grm-wheel .sw2.neutral{--s:0.88;--o:0.85}
.grm-wheel button.sw2{cursor:pointer}
.grm-wheel button.sw2.locked{cursor:not-allowed}
.grm-wheel button.sw2.off:hover{--s:0.66;--o:0.5}
.grm-wheel button.sw2:focus-visible{outline:2px solid var(--role-accent);outline-offset:2px}
.grm-wheel .mote{position:absolute;width:2px;height:2px;margin:-1px 0 0 -1px;border-radius:50%;background:var(--hex);box-shadow:0 0 4px var(--hex);opacity:0;pointer-events:none;animation:grmMote var(--dur) linear forwards}
@keyframes grmMote{0%{opacity:0;transform:translate(0,0)}25%{opacity:var(--mo)}100%{opacity:0;transform:translate(var(--dx),var(--dy))}}
@keyframes grmBreathe{0%,100%{box-shadow:0 0 14px rgb(from var(--hex) r g b/50%)}50%{box-shadow:0 0 20px 1px rgb(from var(--hex) r g b/62%)}}
@media (prefers-reduced-motion: reduce){.grm-wheel .sw2.on .dot{animation:none}.grm-wheel .mote{display:none}}`;
    document.head.appendChild(st);
  }

  function useSpin() {
    const ref = React.useRef(null);
    React.useEffect(() => {
      const el = ref.current;
      if (!el || !el.animate || reduced()) return;
      const a = el.animate([{ '--spin-angle': '0deg' }, { '--spin-angle': '360deg' }], { duration: 28000, iterations: Infinity, easing: 'linear' });
      return () => a.cancel();
    }, []);
    return ref;
  }

  function GrimorioWheel({ mode = 'display', picks = [], neutral = false, subline, size = 300, onChange }) {
    const I = NS().Identity;
    const isNeutral = neutral || picks.length === 0;
    const px = typeof size === 'number' ? size : 300;
    const ringRef = useSpin();
    const prev = React.useRef(null);
    const [fx, setFx] = React.useState([]);
    const [motes, setMotes] = React.useState([]);
    const key = picks.join('');

    React.useEffect(() => {
      const before = prev.current; prev.current = picks;
      if (!before || isNeutral || reduced()) return;
      const fresh = picks.filter((c) => !before.includes(c));
      if (!fresh.length) return;
      const items = fresh.map((c) => ({ id: ++seq, c, bursts: Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.random() * 0.5, d = 26 + Math.random() * 20;
        return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, dur: 0.6 + Math.random() * 0.3 };
      }) }));
      setFx((f) => f.concat(items));
      const ids = items.map((i) => i.id);
      setTimeout(() => setFx((f) => f.filter((i) => !ids.includes(i.id))), 1000);
    }, [key]);

    React.useEffect(() => {
      if (isNeutral || reduced()) return;
      const t = setInterval(() => {
        const born = [];
        picks.forEach((c) => {
          if (Math.random() > 0.26) return;
          const cx = POS[c][0] + 9.5, cy = POS[c][1] + 9.5;
          const base = Math.atan2(cy - 50, cx - 50), a = base + (Math.random() - 0.5) * 1.4;
          const r = 0.1 * px, d = 14 + Math.random() * 14;
          born.push({ id: ++seq, c, x: cx / 100 * px + Math.cos(a) * r, y: cy / 100 * px + Math.sin(a) * r,
            dx: Math.cos(a) * d, dy: Math.sin(a) * d, dur: 2.4 + Math.random() * 1.2, mo: 0.35 + Math.random() * 0.25 });
        });
        if (!born.length) return;
        setMotes((m) => m.concat(born));
        const ids = born.map((b) => b.id);
        setTimeout(() => setMotes((m) => m.filter((x) => !ids.includes(x.id))), 3800);
      }, 700);
      return () => clearInterval(t);
    }, [key, isNeutral, px]);

    if (!I) return null;
    const toggle = (c) => {
      if (!onChange) return;
      if (picks.includes(c)) { if (picks.length > 1) onChange(picks.filter((p) => p !== c)); }
      else if (picks.length < 3) onChange(picks.concat(c));
    };
    const tribe = I.tribeName(picks);
    const sub = subline != null ? subline : I.colorNames(picks);
    const hexOf = (c) => 'var(' + I.COLORS[c].token + ')';

    return h('div', { className: 'grm-wheel', style: { '--size': px + 'px' } },
      h('div', { className: 'glow' }),
      h('div', { className: 'ring', ref: ringRef }),
      I.ORDER.map((c) => {
        const on = !isNeutral && picks.includes(c);
        const locked = mode === 'picker' && !on && picks.length >= 3;
        const cls = 'sw2 ' + (isNeutral ? 'neutral' : on ? 'on' : locked ? 'locked' : 'off');
        const style = { left: POS[c][0] + '%', top: POS[c][1] + '%', '--hex': hexOf(c) };
        const kids = [h('span', { key: 'd', className: 'disc' }), h('span', { key: 'r', className: 'rim' }), h('span', { key: 'o', className: 'dot' })];
        return mode === 'picker'
          ? h('button', { key: c, type: 'button', className: cls, style, 'aria-pressed': on, 'aria-disabled': locked || undefined, 'aria-label': I.COLORS[c].name, onClick: () => toggle(c) }, kids)
          : h('span', { key: c, className: cls, style, 'aria-hidden': 'true' }, kids);
      }),
      h('div', { className: 'fx' },
        motes.map((m) => h('span', { key: m.id, className: 'mote', style: { left: m.x + 'px', top: m.y + 'px', '--hex': hexOf(m.c), '--dx': m.dx + 'px', '--dy': m.dy + 'px', '--dur': m.dur + 's', '--mo': m.mo } })),
        fx.map((f) => {
          const cx = POS[f.c][0] + 9.5 + '%', cy = POS[f.c][1] + 9.5 + '%', hex = hexOf(f.c);
          return h(React.Fragment, { key: f.id },
            h('span', { className: 'ripple', style: { left: cx, top: cy, '--hex': hex } }),
            f.bursts.map((b, i) => h('span', { key: i, className: 'burst', style: { left: cx, top: cy, '--hex': hex, '--dx': b.dx + 'px', '--dy': b.dy + 'px', '--dur': b.dur + 's' } })));
        })),
      h('div', { className: 'center' },
        isNeutral ? h('span', { className: 'grm-wordmark' }, 'Grimorio')
          : h('div', { className: 'name-block', key: tribe }, h('span', { className: 'tribe' }, tribe), sub ? h('span', { className: 'sub' }, sub) : null)));
  }

  window.GrimorioWheel = GrimorioWheel;
})();
