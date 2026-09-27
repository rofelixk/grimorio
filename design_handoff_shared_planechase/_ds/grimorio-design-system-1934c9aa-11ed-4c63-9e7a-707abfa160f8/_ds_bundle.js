/* @ds-bundle: {"format":4,"namespace":"GrimorioDesignSystem_1934c9","components":[{"name":"Button","sourcePath":"components/controls/Button.jsx"},{"name":"Divider","sourcePath":"components/controls/Divider.jsx"},{"name":"Eyebrow","sourcePath":"components/controls/Eyebrow.jsx"},{"name":"LinkButton","sourcePath":"components/controls/LinkButton.jsx"},{"name":"MicroLabel","sourcePath":"components/controls/MicroLabel.jsx"},{"name":"Plate","sourcePath":"components/fields/Plate.jsx"},{"name":"TextField","sourcePath":"components/fields/TextField.jsx"},{"name":"Identity","sourcePath":"components/identity/Identity.js"},{"name":"IdentityChip","sourcePath":"components/identity/IdentityChip.jsx"},{"name":"IdentityWheel","sourcePath":"components/identity/IdentityWheel.jsx"},{"name":"MiniWheel","sourcePath":"components/identity/MiniWheel.jsx"},{"name":"SparkField","sourcePath":"components/modal/SparkField.jsx"},{"name":"ThemedModal","sourcePath":"components/modal/ThemedModal.jsx"},{"name":"ProfileRow","sourcePath":"components/profile/ProfileRow.jsx"},{"name":"TopBar","sourcePath":"components/shell/TopBar.jsx"},{"name":"SyncLine","sourcePath":"components/status/SyncLine.jsx"}],"sourceHashes":{"components/controls/Button.jsx":"1c3459a2dfdb","components/controls/Divider.jsx":"cf3b2003e800","components/controls/Eyebrow.jsx":"f0df4b75887a","components/controls/LinkButton.jsx":"177cb4ace072","components/controls/MicroLabel.jsx":"1b33ce198703","components/fields/Plate.jsx":"474b837f0d00","components/fields/TextField.jsx":"2006da37b6b5","components/identity/Identity.js":"240e02044633","components/identity/IdentityChip.jsx":"c8a308401be7","components/identity/IdentityWheel.jsx":"d061c2b44cb8","components/identity/MiniWheel.jsx":"b7046e32e5eb","components/modal/SparkField.jsx":"102769e558af","components/modal/ThemedModal.jsx":"51405a01992a","components/modal/useSpin.js":"524de4181f0f","components/profile/ProfileRow.jsx":"85d9e9726cd7","components/shell/TopBar.jsx":"3b60245fc748","components/status/SyncLine.jsx":"5ed1d44d8a13","ui_kits/app/App.jsx":"f289df6e7ba2","ui_kits/app/EntryModal.jsx":"b282e01bc6d7"},"inlinedExternals":[],"unexposedExports":[{"name":"useSpin","sourcePath":"components/modal/useSpin.js"}]} */

(() => {

const __ds_ns = (window.GrimorioDesignSystem_1934c9 = window.GrimorioDesignSystem_1934c9 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/controls/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Button({
  variant = 'secondary',
  block = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const cls = ['btn', 'btn--' + variant, block ? 'btn--block' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: cls
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/Button.jsx", error: String((e && e.message) || e) }); }

// components/controls/Divider.jsx
try { (() => {
function Divider({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "divider",
    role: "separator"
  }, children ? /*#__PURE__*/React.createElement("span", {
    className: "micro-label"
  }, children) : null);
}
Object.assign(__ds_scope, { Divider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/Divider.jsx", error: String((e && e.message) || e) }); }

// components/controls/Eyebrow.jsx
try { (() => {
function Eyebrow({
  as: Tag = 'span',
  children,
  className = ''
}) {
  return /*#__PURE__*/React.createElement(Tag, {
    className: 'eyebrow ' + className
  }, children);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/controls/LinkButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function LinkButton({
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: 'link-btn ' + className
  }, rest), children);
}
Object.assign(__ds_scope, { LinkButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/LinkButton.jsx", error: String((e && e.message) || e) }); }

// components/controls/MicroLabel.jsx
try { (() => {
function MicroLabel({
  as: Tag = 'span',
  children,
  className = ''
}) {
  return /*#__PURE__*/React.createElement(Tag, {
    className: 'micro-label ' + className
  }, children);
}
Object.assign(__ds_scope, { MicroLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/MicroLabel.jsx", error: String((e && e.message) || e) }); }

// components/fields/Plate.jsx
try { (() => {
function Plate({
  eyebrow,
  role,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "plate",
    role: role
  }, eyebrow ? /*#__PURE__*/React.createElement("span", {
    className: "micro-label"
  }, eyebrow) : null, /*#__PURE__*/React.createElement("span", null, children));
}
Object.assign(__ds_scope, { Plate });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/fields/Plate.jsx", error: String((e && e.message) || e) }); }

// components/fields/TextField.jsx
try { (() => {
let seq = 0;
function TextField({
  label,
  id,
  type = 'text',
  value,
  onChange,
  helper,
  error,
  readOnly,
  readonly,
  autoComplete,
  inputMode,
  maxLength,
  placeholder,
  name
}) {
  const ref = React.useRef(null);
  if (!ref.current) ref.current = id || 'grm-field-' + ++seq;
  const fid = ref.current;
  const ro = readOnly || readonly;
  const descId = error ? fid + '-error' : helper ? fid + '-helper' : undefined;
  return /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field__label",
    htmlFor: fid
  }, label), /*#__PURE__*/React.createElement("input", {
    className: "field__input",
    id: fid,
    name: name,
    type: type,
    value: value,
    placeholder: placeholder,
    onChange: onChange ? e => onChange(e.target.value, e) : undefined,
    readOnly: ro,
    autoComplete: autoComplete,
    inputMode: inputMode,
    maxLength: maxLength,
    "aria-invalid": error ? 'true' : undefined,
    "aria-describedby": descId
  }), error ? /*#__PURE__*/React.createElement("span", {
    className: "field__error",
    id: fid + '-error'
  }, error) : helper ? /*#__PURE__*/React.createElement("span", {
    className: "field__helper",
    id: fid + '-helper'
  }, helper) : null);
}
Object.assign(__ds_scope, { TextField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/fields/TextField.jsx", error: String((e && e.message) || e) }); }

// components/identity/Identity.js
try { (() => {
// Identity data: the five colors (W U B R G, clockwise from the top), tribe names and role mapping.
const ORDER = ['W', 'U', 'B', 'R', 'G'];
const COLORS = {
  W: {
    code: 'W',
    name: 'Branco',
    token: '--identity-w',
    hex: '#d8cdb0',
    hover: '#e6dcc2'
  },
  U: {
    code: 'U',
    name: 'Azul',
    token: '--identity-u',
    hex: '#3d6b85',
    hover: '#4c7f9c'
  },
  B: {
    code: 'B',
    name: 'Preto',
    token: '--identity-b',
    hex: '#7c5aa6',
    hover: '#8f6bb8'
  },
  R: {
    code: 'R',
    name: 'Vermelho',
    token: '--identity-r',
    hex: '#a8402c',
    hover: '#bf4f39'
  },
  G: {
    code: 'G',
    name: 'Verde',
    token: '--identity-g',
    hex: '#4c7a43',
    hover: '#5c8f52'
  }
};
const TRIBES = {
  W: 'Mono-branco',
  U: 'Mono-azul',
  B: 'Mono-preto',
  R: 'Mono-vermelho',
  G: 'Mono-verde',
  WU: 'Azorius',
  WB: 'Orzhov',
  WR: 'Boros',
  WG: 'Selesnya',
  UB: 'Dimir',
  UR: 'Izzet',
  UG: 'Simic',
  BR: 'Rakdos',
  BG: 'Golgari',
  RG: 'Gruul',
  WUB: 'Esper',
  WUR: 'Jeskai',
  WUG: 'Bant',
  WBR: 'Mardu',
  WBG: 'Abzan',
  WRG: 'Naya',
  UBR: 'Grixis',
  UBG: 'Sultai',
  URG: 'Temur',
  BRG: 'Jund'
};
function key(picks) {
  return ORDER.filter(c => (picks || []).includes(c)).join('');
}
function tribeName(picks) {
  return TRIBES[key(picks)] || '';
}
function colorNames(picks) {
  return (picks || []).map(c => COLORS[c].name).join(' · ');
}
function cssVar(code, hover) {
  return 'var(' + COLORS[code].token + (hover ? '-hover' : '') + ')';
}
/** Style object for a themed root: sets --theme-primary/-accent/-tertiary(+-hover) from ordered picks. */
function themeVars(picks) {
  const s = {};
  ['primary', 'accent', 'tertiary'].forEach((role, i) => {
    const c = (picks || [])[i];
    if (c) {
      s['--theme-' + role] = cssVar(c);
      s['--theme-' + role + '-hover'] = cssVar(c, true);
    }
  });
  return s;
}
const Identity = {
  ORDER,
  COLORS,
  TRIBES,
  key,
  tribeName,
  colorNames,
  cssVar,
  themeVars
};
Object.assign(__ds_scope, { Identity });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/identity/Identity.js", error: String((e && e.message) || e) }); }

// components/identity/IdentityChip.jsx
try { (() => {
function IdentityChip({
  colors = [],
  label
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "grm-chip"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dots",
    "aria-hidden": "true"
  }, colors.map(c => /*#__PURE__*/React.createElement("span", {
    key: c,
    className: "dot",
    style: {
      '--hex': 'var(' + __ds_scope.Identity.COLORS[c].token + ')'
    }
  }))), /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { IdentityChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/identity/IdentityChip.jsx", error: String((e && e.message) || e) }); }

// components/identity/MiniWheel.jsx
try { (() => {
const POS = {
  W: [39, 2],
  U: [74.2, 27.6],
  B: [60.8, 68.9],
  R: [17.2, 68.9],
  G: [3.8, 27.6]
};
function MiniWheel({
  colors = []
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "grm-mini",
    "aria-hidden": "true"
  }, __ds_scope.Identity.ORDER.map(c => /*#__PURE__*/React.createElement("span", {
    key: c,
    className: 'dot' + (colors.includes(c) ? ' on' : ''),
    style: {
      left: POS[c][0] + '%',
      top: POS[c][1] + '%',
      '--hex': 'var(' + __ds_scope.Identity.COLORS[c].token + ')'
    }
  })));
}
Object.assign(__ds_scope, { MiniWheel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/identity/MiniWheel.jsx", error: String((e && e.message) || e) }); }

// components/modal/SparkField.jsx
try { (() => {
const ROLES = ['var(--role-primary)', 'var(--role-accent)', 'var(--role-tertiary)'];
let sid = 0;
function roll(direction, first) {
  const side = Math.floor(Math.random() * 4),
    t = Math.random() * 100;
  const pos = [[t, 0, 0, -1], [100, t, 1, 0], [t, 100, 0, 1], [0, t, -1, 0]][side];
  const inward = direction === 'inward';
  const d = inward ? 14 + Math.random() * 22 : 28 + Math.random() * 56;
  const n = inward ? -1 : 1,
    s = (Math.random() * 1.2 - 0.6) * d;
  const nx = pos[2] * n,
    ny = pos[3] * n,
    tx = -pos[3],
    ty = pos[2];
  return {
    id: ++sid,
    left: pos[0],
    top: pos[1],
    size: 2 + Math.random() * 2.5,
    dx: nx * d + tx * s,
    dy: ny * d + ty * s,
    dur: 1.6 + Math.random() * 1.6,
    delay: first ? Math.random() * 3.2 : Math.random() * 0.9,
    c: ROLES[Math.floor(Math.random() * 3)]
  };
}
function SparkField({
  count = 20,
  direction = 'outward'
}) {
  const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [sparks, setSparks] = React.useState(() => Array.from({
    length: count
  }, () => roll(direction, true)));
  React.useEffect(() => {
    setSparks(Array.from({
      length: count
    }, () => roll(direction, true)));
  }, [count, direction]);
  if (reduce) return null;
  const reroll = i => setSparks(all => all.map((s, j) => j === i ? roll(direction, false) : s));
  return /*#__PURE__*/React.createElement("div", {
    className: "grm-sparks",
    "aria-hidden": "true"
  }, sparks.map((s, i) => /*#__PURE__*/React.createElement("span", {
    key: s.id,
    className: "spark",
    onAnimationEnd: () => reroll(i),
    style: {
      left: s.left + '%',
      top: s.top + '%',
      width: s.size + 'px',
      height: s.size + 'px',
      '--c': s.c,
      '--dx': s.dx + 'px',
      '--dy': s.dy + 'px',
      '--dur': s.dur + 's',
      '--delay': s.delay + 's'
    }
  })));
}
Object.assign(__ds_scope, { SparkField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/modal/SparkField.jsx", error: String((e && e.message) || e) }); }

// components/modal/useSpin.js
try { (() => {
// Rotates the registered --spin-angle property over 28s (the ring/halo/wheel spin). Stops under reduced motion.
function useSpin() {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !el.animate) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const a = el.animate([{
      '--spin-angle': '0deg'
    }, {
      '--spin-angle': '360deg'
    }], {
      duration: 28000,
      iterations: Infinity,
      easing: 'linear'
    });
    return () => a.cancel();
  }, []);
  return ref;
}
Object.assign(__ds_scope, { useSpin });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/modal/useSpin.js", error: String((e && e.message) || e) }); }

// components/identity/IdentityWheel.jsx
try { (() => {
const POS = {
  W: [40.5, 3.5],
  U: [75.7, 29.1],
  B: [62.3, 70.4],
  R: [18.7, 70.4],
  G: [5.3, 29.1]
};
let fxSeq = 0;
function IdentityWheel({
  mode = 'display',
  picks = [],
  neutral = false,
  subline,
  size = 300,
  onChange
}) {
  const isNeutral = neutral || picks.length === 0;
  const prev = React.useRef(null);
  const ringRef = __ds_scope.useSpin();
  const [fx, setFx] = React.useState([]);
  React.useEffect(() => {
    const before = prev.current;
    prev.current = picks;
    if (!before || isNeutral) return;
    const fresh = picks.filter(c => !before.includes(c));
    if (!fresh.length) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const items = fresh.map(c => ({
      id: ++fxSeq,
      c,
      bursts: Array.from({
        length: 8
      }, (_, i) => {
        const a = i / 8 * Math.PI * 2 + Math.random() * 0.5;
        const d = 26 + Math.random() * 20;
        return {
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d,
          dur: 0.6 + Math.random() * 0.3
        };
      })
    }));
    setFx(f => f.concat(items));
    const ids = items.map(i => i.id);
    setTimeout(() => setFx(f => f.filter(i => !ids.includes(i.id))), 1000);
  }, [picks.join('')]);
  const toggle = c => {
    if (!onChange) return;
    if (picks.includes(c)) {
      if (picks.length > 1) onChange(picks.filter(p => p !== c));
    } else if (picks.length < 3) onChange(picks.concat(c));
  };
  const tribe = __ds_scope.Identity.tribeName(picks);
  const sub = subline != null ? subline : __ds_scope.Identity.colorNames(picks);
  const px = typeof size === 'number' ? size + 'px' : size;
  return /*#__PURE__*/React.createElement("div", {
    className: "grm-wheel",
    style: {
      '--size': px
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "glow"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ring",
    ref: ringRef
  }), __ds_scope.Identity.ORDER.map(c => {
    const on = !isNeutral && picks.includes(c);
    const col = __ds_scope.Identity.COLORS[c];
    const style = {
      left: POS[c][0] + '%',
      top: POS[c][1] + '%',
      '--hex': 'var(' + col.token + ')'
    };
    const cls = 'swatch' + (on ? ' on' : '') + (isNeutral && mode !== 'picker' ? ' neutral' : '');
    if (mode === 'picker') {
      const locked = !on && picks.length >= 3;
      return /*#__PURE__*/React.createElement("button", {
        key: c,
        type: "button",
        className: cls + (locked ? ' locked' : ''),
        style: style,
        "aria-pressed": on,
        "aria-label": col.name,
        onClick: () => toggle(c)
      });
    }
    return /*#__PURE__*/React.createElement("span", {
      key: c,
      className: cls,
      style: style,
      "aria-hidden": "true"
    });
  }), /*#__PURE__*/React.createElement("div", {
    className: "fx"
  }, fx.map(f => {
    const cx = POS[f.c][0] + 9.5 + '%',
      cy = POS[f.c][1] + 9.5 + '%',
      hex = 'var(' + __ds_scope.Identity.COLORS[f.c].token + ')';
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: f.id
    }, /*#__PURE__*/React.createElement("span", {
      className: "ripple",
      style: {
        left: cx,
        top: cy,
        '--hex': hex
      }
    }), f.bursts.map((b, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "burst",
      style: {
        left: cx,
        top: cy,
        '--hex': hex,
        '--dx': b.dx + 'px',
        '--dy': b.dy + 'px',
        '--dur': b.dur + 's'
      }
    })));
  })), /*#__PURE__*/React.createElement("div", {
    className: "center"
  }, isNeutral ? /*#__PURE__*/React.createElement("span", {
    className: "grm-wordmark"
  }, "Grimorio") : /*#__PURE__*/React.createElement("div", {
    className: "name-block",
    key: tribe
  }, /*#__PURE__*/React.createElement("span", {
    className: "tribe"
  }, tribe), sub ? /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, sub) : null)));
}
Object.assign(__ds_scope, { IdentityWheel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/identity/IdentityWheel.jsx", error: String((e && e.message) || e) }); }

// components/modal/ThemedModal.jsx
try { (() => {
function ThemedModal({
  open = true,
  roles = [],
  aside,
  caption,
  title,
  subtitle,
  titleId = 'grm-modal-title',
  prompt,
  chip,
  onClose,
  layout = 'auto',
  inline = false,
  sparks = true,
  children
}) {
  const [auto, setAuto] = React.useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches);
  React.useEffect(() => {
    if (layout !== 'auto') return;
    const mq = window.matchMedia('(max-width: 640px)');
    const on = () => setAuto(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [layout]);
  const mobile = layout === 'mobile' || layout === 'auto' && auto;
  const contentRef = React.useRef(null),
    promptRef = React.useRef(null);
  const ringRef = __ds_scope.useSpin(),
    haloRef = __ds_scope.useSpin();
  const [height, setHeight] = React.useState(null);
  React.useLayoutEffect(() => {
    if (mobile || !open) return;
    const measure = () => {
      const c = contentRef.current ? contentRef.current.offsetHeight : 0;
      const p = promptRef.current ? 16 + promptRef.current.offsetHeight : 0;
      setHeight(Math.max(460, 12 + 44 + c + p + 24));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (contentRef.current) ro.observe(contentRef.current);
    if (promptRef.current) ro.observe(promptRef.current);
    if (document.fonts) document.fonts.ready.then(measure);
    return () => ro.disconnect();
  }, [mobile, open, !!prompt]);
  React.useEffect(() => {
    if (!open || !onClose) return;
    const k = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  const close = /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "m-close",
    "aria-label": "Fechar",
    onClick: onClose
  }, "\u2715");
  const modal = /*#__PURE__*/React.createElement("div", {
    className: 'grm-modal' + (mobile ? ' is-mobile' : ''),
    "data-theme-scope": "",
    style: Object.assign({}, __ds_scope.Identity.themeVars(roles), mobile ? {
      height: '100%',
      width: '100%'
    } : null),
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": title ? titleId : undefined
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-ring",
    ref: ringRef
  }, !mobile ? /*#__PURE__*/React.createElement("div", {
    className: "m-halo",
    ref: haloRef
  }) : null, sparks ? /*#__PURE__*/React.createElement(__ds_scope.SparkField, {
    count: mobile ? 12 : 20,
    direction: mobile ? 'inward' : 'outward'
  }) : null, /*#__PURE__*/React.createElement("div", {
    className: "m-face",
    style: !mobile && height ? {
      height: height + 'px'
    } : undefined
  }, /*#__PURE__*/React.createElement("header", {
    className: "m-header"
  }, /*#__PURE__*/React.createElement("span", {
    className: "grm-wordmark"
  }, "Grimorio"), /*#__PURE__*/React.createElement("div", {
    className: "m-header-right"
  }, chip, close)), /*#__PURE__*/React.createElement("aside", {
    className: "m-aside"
  }, aside, caption !== undefined ? /*#__PURE__*/React.createElement("p", {
    className: "m-caption"
  }, caption) : null), /*#__PURE__*/React.createElement("section", {
    className: "m-form"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-close-row"
  }, close), /*#__PURE__*/React.createElement("div", {
    className: "m-content",
    ref: contentRef
  }, title ? /*#__PURE__*/React.createElement("div", {
    className: "m-titles"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "m-title",
    id: titleId
  }, title), subtitle ? /*#__PURE__*/React.createElement("p", {
    className: "m-sub"
  }, subtitle) : null) : null, children), prompt ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "m-prompt-gap"
  }), /*#__PURE__*/React.createElement("div", {
    className: "m-prompt",
    ref: promptRef
  }, prompt)) : null))));
  if (inline) return modal;
  return /*#__PURE__*/React.createElement("div", {
    className: "grm-backdrop",
    onMouseDown: e => {
      if (e.target === e.currentTarget && onClose) onClose();
    }
  }, modal);
}
Object.assign(__ds_scope, { ThemedModal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/modal/ThemedModal.jsx", error: String((e && e.message) || e) }); }

// components/profile/ProfileRow.jsx
try { (() => {
function ProfileRow({
  profile,
  active = false,
  dashed = false,
  label = 'Criar novo perfil',
  onClick,
  onMouseEnter,
  onFocus
}) {
  if (dashed) {
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "grm-row dashed",
      onClick: onClick,
      onMouseEnter: onMouseEnter,
      onFocus: onFocus
    }, /*#__PURE__*/React.createElement("span", {
      className: "plus",
      "aria-hidden": "true"
    }, "+"), /*#__PURE__*/React.createElement("span", null, label));
  }
  const colors = profile.colors || [];
  const tribe = __ds_scope.Identity.tribeName(colors);
  const meta = tribe + ' · ' + (profile.linked ? 'Vinculado à nuvem' : 'Só neste aparelho');
  const own = colors[0] ? 'var(' + __ds_scope.Identity.COLORS[colors[0]].token + ')' : undefined;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: 'grm-row' + (active ? ' active' : ''),
    style: own ? {
      '--own': own
    } : undefined,
    "aria-current": active ? 'true' : undefined,
    onClick: active ? undefined : onClick,
    onMouseEnter: onMouseEnter,
    onFocus: onFocus
  }, /*#__PURE__*/React.createElement(__ds_scope.MiniWheel, {
    colors: colors
  }), /*#__PURE__*/React.createElement("span", {
    className: "text"
  }, /*#__PURE__*/React.createElement("span", {
    className: "name"
  }, profile.name), /*#__PURE__*/React.createElement("span", {
    className: "meta"
  }, meta)), active ? /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, "Em uso") : null);
}
Object.assign(__ds_scope, { ProfileRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/profile/ProfileRow.jsx", error: String((e && e.message) || e) }); }

// components/shell/TopBar.jsx
try { (() => {
function TopBar({
  children
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "grm-topbar"
  }, /*#__PURE__*/React.createElement("span", {
    className: "grm-wordmark"
  }, "Grimorio"), /*#__PURE__*/React.createElement("div", null, children));
}
Object.assign(__ds_scope, { TopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/shell/TopBar.jsx", error: String((e && e.message) || e) }); }

// components/status/SyncLine.jsx
try { (() => {
function SyncLine({
  state = 'pending',
  label
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "grm-sync",
    role: "status"
  }, state === 'pending' ? /*#__PURE__*/React.createElement("span", {
    className: "spinner",
    "aria-hidden": "true"
  }) : state === 'done' ? /*#__PURE__*/React.createElement("span", {
    className: "dot",
    "aria-hidden": "true"
  }) : null, /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { SyncLine });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/status/SyncLine.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/App.jsx
try { (() => {
const {
  TopBar,
  Button: TBButton
} = window.GrimorioDesignSystem_1934c9;
function Shell({
  layout,
  setLayout
}) {
  const [profiles, setProfiles] = React.useState([{
    name: 'rafa',
    colors: ['U', 'R'],
    linked: true
  }, {
    name: 'bia',
    colors: ['G', 'W'],
    linked: false
  }]);
  const [active, setActive] = React.useState(null);
  const [open, setOpen] = React.useState(true);
  const [k, setK] = React.useState(0);
  const ap = profiles.find(p => p.name === active);
  const label = ap ? ap.name + ' · ' + (ap.linked ? 'Vinculado à nuvem' : 'Só neste aparelho') : 'Nenhum perfil ativo';
  const openModal = () => {
    setK(x => x + 1);
    setOpen(true);
  };
  const screen = /*#__PURE__*/React.createElement("div", {
    "data-theme-scope": "",
    style: {
      ...window.GrimorioDesignSystem_1934c9.Identity.themeVars(ap ? ap.colors : []),
      height: '100%',
      display: 'grid',
      gridTemplateRows: 'auto minmax(0,1fr)',
      position: 'relative',
      background: 'var(--color-bg)'
    }
  }, /*#__PURE__*/React.createElement(TopBar, null, /*#__PURE__*/React.createElement(TBButton, {
    variant: "ghost",
    onClick: openModal
  }, label)), /*#__PURE__*/React.createElement("main", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: 360,
      textAlign: 'center',
      fontSize: 'var(--font-size-sm)',
      color: 'var(--color-text-muted)'
    }
  }, "\xC1rea do app \u2014 navega\xE7\xE3o e telas de cole\xE7\xE3o ainda n\xE3o foram definidas.")), open ? (() => {
    const m = /*#__PURE__*/React.createElement(EntryModal, {
      key: k,
      layout: layout,
      profiles: profiles,
      setProfiles: setProfiles,
      active: active,
      setActive: setActive,
      onClose: () => setOpen(false)
    });
    return layout === 'mobile' ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        zIndex: 50
      }
    }, m) : m;
  })() : null);
  return layout === 'mobile' ? /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0b0908',
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 390,
      height: 844,
      borderRadius: 36,
      overflow: 'hidden',
      border: '1px solid var(--color-border)',
      position: 'relative'
    }
  }, screen)) : /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100vh'
    }
  }, screen);
}
function KitApp() {
  const [layout, setLayout] = React.useState(() => localStorage.getItem('grm-kit-layout') || 'desktop');
  React.useEffect(() => {
    localStorage.setItem('grm-kit-layout', layout);
  }, [layout]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Shell, {
    key: layout,
    layout: layout,
    setLayout: setLayout
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      left: 12,
      bottom: 12,
      zIndex: 1000,
      display: 'flex',
      gap: 4,
      padding: 4,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-sm)',
      fontSize: 'var(--font-size-xs)'
    }
  }, ['desktop', 'mobile'].map(l => /*#__PURE__*/React.createElement("button", {
    key: l,
    onClick: () => setLayout(l),
    style: {
      font: 'inherit',
      padding: '4px 10px',
      borderRadius: 3,
      border: 'none',
      cursor: 'pointer',
      background: l === layout ? 'var(--color-surface-raised)' : 'transparent',
      color: l === layout ? 'var(--color-text)' : 'var(--color-text-muted)'
    }
  }, l === 'desktop' ? 'Desktop' : 'Celular'))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(KitApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/EntryModal.jsx
try { (() => {
// Entry modal (profiles + cloud account) — recreation of the shipped blueprint. Copy from design_brief/entry-copy.ts.
const {
  ThemedModal,
  IdentityWheel,
  IdentityChip,
  ProfileRow,
  TextField,
  Button,
  LinkButton,
  Plate,
  SyncLine,
  Eyebrow,
  Identity
} = window.GrimorioDesignSystem_1934c9;
function Prompt({
  ask,
  cta,
  onClick
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, ask), /*#__PURE__*/React.createElement(LinkButton, {
    onClick: onClick
  }, cta));
}
function EntryModal({
  layout,
  profiles,
  setProfiles,
  active,
  setActive,
  onClose
}) {
  const mobile = layout === 'mobile';
  const [phase, setPhase] = React.useState('list');
  const [sel, setSel] = React.useState(null);
  const [hover, setHover] = React.useState(null);
  const [f, setF] = React.useState({
    name: '',
    pw: '',
    email: ''
  });
  const [err, setErr] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(null);
  const [picks, setPicks] = React.useState(['R']);
  const [sync, setSync] = React.useState('pending');
  const [notice, setNotice] = React.useState(null);
  const byName = n => profiles.find(p => p.name === n);
  const activeP = active ? byName(active) : null;
  const selP = sel ? byName(sel) : null;
  const go = p => {
    setPhase(p);
    setErr({});
    setF(x => ({
      ...x,
      pw: ''
    }));
    setBusy(false);
  };
  const set = k => v => {
    setF(x => ({
      ...x,
      [k]: v
    }));
    setErr(e => ({
      ...e,
      [k]: undefined,
      form: undefined
    }));
  };
  const run = (ms, fn) => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      fn();
    }, ms);
  };
  const finish = d => {
    setDone(d);
    setPhase('done');
    setSync('pending');
    setTimeout(() => setSync('done'), 1600);
  };

  // Colors in view (STATES.md → Colors column)
  let view = null;
  if (phase === 'list') view = hover ? byName(hover) : activeP;else if (phase === 'profile') view = {
    name: f.name,
    colors: picks
  };else if (['unlock', 'localreset-warn', 'localreset-newpw'].includes(phase)) view = selP;else if (phase === 'done') view = done && done.profile;else view = activeP;
  const roles = view ? view.colors : [];
  const tribe = view ? Identity.tribeName(view.colors) : '';
  let title,
    subtitle,
    body,
    prompt,
    caption = 'Cada perfil tem sua coleção, seus decks e suas cores.';
  if (phase === 'list') {
    const ordered = activeP ? [activeP, ...profiles.filter(p => p !== activeP)] : profiles;
    title = activeP ? 'Trocar de perfil' : 'Escolha um perfil';
    subtitle = activeP ? 'Você está usando ' + activeP.name + '. Escolha outro perfil e digite a senha.' : 'Perfis neste aparelho. Toque em um e digite a senha.';
    body = /*#__PURE__*/React.createElement(React.Fragment, null, notice ? /*#__PURE__*/React.createElement(Plate, {
      role: "status"
    }, notice) : null, /*#__PURE__*/React.createElement("div", {
      className: "grm-list",
      role: "list",
      onMouseLeave: () => setHover(null)
    }, ordered.map(p => /*#__PURE__*/React.createElement(ProfileRow, {
      key: p.name,
      profile: p,
      active: p.name === active,
      onMouseEnter: () => setHover(p.name),
      onFocus: () => setHover(p.name),
      onClick: () => {
        setSel(p.name);
        go('unlock');
      }
    })), /*#__PURE__*/React.createElement(ProfileRow, {
      dashed: true,
      onMouseEnter: () => setHover(null),
      onFocus: () => setHover(null),
      onClick: () => {
        setF({
          name: '',
          pw: '',
          email: f.email
        });
        setPicks(['R']);
        go('profile');
      }
    })), activeP ? /*#__PURE__*/React.createElement(Button, {
      block: true,
      disabled: busy,
      onClick: () => run(700, () => {
        setNotice('Você saiu de ' + activeP.name + '. Os dados desse perfil ficaram ocultos.');
        setActive(null);
      })
    }, busy ? 'Saindo…' : 'Sair de ' + activeP.name) : null);
    prompt = /*#__PURE__*/React.createElement(Prompt, {
      ask: "Perfil em outro aparelho?",
      cta: "Entrar com conta na nuvem",
      onClick: () => go('in')
    });
  } else if (phase === 'unlock') {
    title = selP.name;
    subtitle = tribe + ' · ' + (selP.linked ? 'Vinculado à nuvem' : 'Só neste aparelho');
    body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TextField, {
      label: "Senha",
      type: "password",
      autoComplete: "current-password",
      value: f.pw,
      onChange: set('pw'),
      error: err.pw
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(LinkButton, {
      onClick: () => go(selP.linked ? 'in' : 'localreset-warn')
    }, "Esqueci minha senha")), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      block: true,
      disabled: busy,
      onClick: () => {
        if (!f.pw) return setErr({
          pw: 'Digite sua senha.'
        });
        if (f.pw.length < 8) return run(500, () => setErr({
          pw: 'Senha incorreta.'
        }));
        run(800, () => {
          const prev = active;
          setActive(selP.name);
          setNotice(null);
          finish(prev && prev !== selP.name ? {
            title: 'Perfil trocado',
            body: selP.name + ' está ativo. Os dados de ' + prev + ' ficaram ocultos.',
            profile: selP,
            sync: selP.linked
          } : {
            title: 'Perfil desbloqueado',
            body: selP.name + ' está ativo neste aparelho.',
            profile: selP,
            sync: selP.linked
          });
        });
      }
    }, busy ? 'Desbloqueando…' : 'Desbloquear'));
    prompt = /*#__PURE__*/React.createElement(Prompt, {
      ask: "N\xE3o \xE9 voc\xEA?",
      cta: "Trocar de perfil",
      onClick: () => go('list')
    });
  } else if (phase === 'localreset-warn') {
    title = 'Redefinir senha';
    subtitle = selP.name + ' não tem conta na nuvem, então qualquer pessoa que use este aparelho pode redefinir a senha dele. Os dados continuam intactos.';
    caption = 'Redefinir a senha não apaga nada.';
    body = /*#__PURE__*/React.createElement("div", {
      className: "grm-btn-row"
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      onClick: () => go('localreset-newpw')
    }, "Entendi, redefinir"), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      onClick: () => go('unlock')
    }, "Cancelar"));
  } else if (phase === 'localreset-newpw') {
    title = 'Nova senha do perfil';
    subtitle = 'Crie uma nova senha para ' + selP.name + '.';
    caption = 'Redefinir a senha não apaga nada.';
    body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TextField, {
      label: "Nova senha do perfil",
      type: "password",
      autoComplete: "new-password",
      value: f.pw,
      onChange: set('pw'),
      helper: "Pelo menos 8 caracteres.",
      error: err.pw
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      block: true,
      disabled: busy,
      onClick: () => {
        if (f.pw.length < 8) return setErr({
          pw: 'Use pelo menos 8 caracteres.'
        });
        run(700, () => {
          setActive(selP.name);
          finish({
            title: 'Perfil desbloqueado',
            body: selP.name + ' está ativo com todos os dados intactos.',
            profile: selP
          });
        });
      }
    }, busy ? 'Salvando…' : 'Salvar e desbloquear'));
  } else if (phase === 'profile') {
    title = 'Criar perfil';
    subtitle = 'Seu perfil fica neste aparelho e funciona sem internet — sem e-mail.';
    caption = 'Escolha até 3 cores. A primeira tinge o app inteiro — dá para mudar depois.';
    body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TextField, {
      label: "Nome do perfil",
      autoComplete: "username",
      value: f.name,
      onChange: set('name'),
      helper: "3 a 20 caracteres: letras, n\xFAmeros, _ . ou -",
      error: err.name
    }), /*#__PURE__*/React.createElement(TextField, {
      label: "Senha",
      type: "password",
      autoComplete: "new-password",
      value: f.pw,
      onChange: set('pw'),
      helper: "Pelo menos 8 caracteres. Funciona sem internet.",
      error: err.pw
    }), mobile ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-3)'
      }
    }, /*#__PURE__*/React.createElement(Eyebrow, null, "Sua identidade"), /*#__PURE__*/React.createElement(IdentityWheel, {
      mode: "picker",
      picks: picks,
      onChange: setPicks,
      size: 240,
      subline: f.name || undefined
    }), /*#__PURE__*/React.createElement("span", {
      className: "field__helper",
      style: {
        textAlign: 'center'
      }
    }, "Escolha at\xE9 3 cores. A primeira tinge o app inteiro \u2014 d\xE1 para mudar depois.")) : null, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      block: true,
      disabled: busy,
      onClick: () => {
        const e = {};
        if (f.name.length < 3 || f.name.length > 20) e.name = 'Use de 3 a 20 caracteres.';else if (!/^[A-Za-z0-9_.-]+$/.test(f.name)) e.name = 'Use só letras, números, _ . ou -.';else if (byName(f.name) || profiles.some(p => p.name.toLowerCase() === f.name.toLowerCase())) e.name = 'Esse nome já está em uso neste aparelho.';
        if (f.pw.length < 8) e.pw = 'Use pelo menos 8 caracteres.';
        if (Object.keys(e).length) return setErr(e);
        run(900, () => {
          const np = {
            name: f.name,
            colors: picks,
            linked: false
          };
          setProfiles(ps => ps.concat(np));
          setActive(np.name);
          setSel(np.name);
          finish({
            title: 'Perfil criado',
            body: np.name + ' está ativo neste aparelho. Se quiser, vincule uma conta na nuvem para sincronizar — é opcional.',
            profile: np,
            link: true
          });
        });
      }
    }, busy ? 'Criando perfil…' : 'Criar perfil'));
    prompt = /*#__PURE__*/React.createElement(Prompt, {
      ask: "J\xE1 tem um perfil aqui?",
      cta: "Ver perfis",
      onClick: () => go('list')
    });
  } else if (phase === 'in' || phase === 'up') {
    const up = phase === 'up';
    title = up ? 'Criar conta na nuvem' : 'Entrar na conta';
    subtitle = up ? (activeP ? activeP.name : 'Seu perfil') + ' passa a sincronizar automaticamente entre aparelhos.' : activeP ? 'Vincule ' + activeP.name + ' a uma conta na nuvem para sincronizar entre aparelhos.' : 'Traga sua coleção da nuvem para este aparelho.';
    caption = 'Opcional — a conta na nuvem sincroniza este perfil entre aparelhos. O app funciona sem ela.';
    body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TextField, {
      label: "E-mail",
      type: "email",
      autoComplete: "email",
      placeholder: "voce@exemplo.com",
      value: f.email,
      onChange: set('email'),
      error: err.email
    }), /*#__PURE__*/React.createElement(TextField, {
      label: "Senha",
      type: "password",
      autoComplete: up ? 'new-password' : 'current-password',
      value: f.pw,
      onChange: set('pw'),
      helper: up ? 'Pelo menos 8 caracteres.' : undefined,
      error: err.pw
    }), !up ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(LinkButton, {
      onClick: () => go('reset-email')
    }, "Esqueci minha senha")) : null, err.form ? /*#__PURE__*/React.createElement("p", {
      className: "grm-form-error",
      role: "alert"
    }, err.form) : null, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      block: true,
      disabled: busy,
      onClick: () => {
        const e = {};
        if (!f.email) e.email = 'Digite seu e-mail.';else if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Esse e-mail não parece válido.';
        if (!f.pw) e.pw = 'Digite sua senha.';else if (up && f.pw.length < 8) e.pw = 'Use pelo menos 8 caracteres.';
        if (Object.keys(e).length) return setErr(e);
        run(900, () => {
          if (!up && f.pw.length < 8) return setErr({
            form: 'E-mail ou senha incorretos.'
          });
          const p = activeP || profiles[0];
          setProfiles(ps => ps.map(x => x === p ? {
            ...x,
            linked: true
          } : x));
          finish(up ? {
            title: 'Conta criada',
            body: p.name + ' agora sincroniza com ' + f.email + '. Suas cores foram salvas na conta.',
            profile: p,
            sync: true
          } : {
            title: 'Conta vinculada',
            body: p.name + ' agora sincroniza com ' + f.email + '.',
            profile: p,
            sync: true
          });
        });
      }
    }, busy ? up ? 'Criando conta…' : 'Entrando…' : up ? 'Criar conta' : 'Entrar'));
    prompt = up ? /*#__PURE__*/React.createElement(Prompt, {
      ask: "J\xE1 tem conta?",
      cta: "Entrar",
      onClick: () => go('in')
    }) : activeP ? /*#__PURE__*/React.createElement(Prompt, {
      ask: "Ainda n\xE3o tem conta na nuvem?",
      cta: "Criar conta",
      onClick: () => go('up')
    }) : /*#__PURE__*/React.createElement(Prompt, {
      ask: "J\xE1 tem um perfil aqui?",
      cta: "Ver perfis",
      onClick: () => go('list')
    });
  } else if (phase === 'reset-email') {
    title = 'Recuperar senha';
    subtitle = 'Digite o e-mail da conta. Um código de 6 dígitos chega em alguns minutos.';
    body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TextField, {
      label: "E-mail",
      type: "email",
      autoComplete: "email",
      placeholder: "voce@exemplo.com",
      value: f.email,
      onChange: set('email'),
      error: err.email
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      block: true,
      disabled: busy,
      onClick: () => {
        if (!f.email) return setErr({
          email: 'Digite seu e-mail.'
        });
        run(800, () => go('in'));
      }
    }, busy ? 'Enviando…' : 'Enviar código'));
    prompt = /*#__PURE__*/React.createElement(Prompt, {
      ask: "Lembrou a senha?",
      cta: "Voltar",
      onClick: () => go('in')
    });
  } else if (phase === 'done') {
    title = done.title;
    caption = '';
    body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0
      }
    }, done.body), done.sync ? /*#__PURE__*/React.createElement(SyncLine, {
      state: sync,
      label: sync === 'done' ? 'Sincronizado agora' : 'Sincronizando…'
    }) : null, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      block: true,
      onClick: onClose
    }, "Concluir"), done.link ? /*#__PURE__*/React.createElement(Button, {
      block: true,
      onClick: () => go('up')
    }, "Vincular conta na nuvem") : null);
  }
  const aside = phase === 'profile' ? /*#__PURE__*/React.createElement(IdentityWheel, {
    mode: "picker",
    picks: picks,
    onChange: setPicks,
    subline: f.name || undefined
  }) : view ? /*#__PURE__*/React.createElement(IdentityWheel, {
    picks: view.colors,
    subline: view.name
  }) : /*#__PURE__*/React.createElement(IdentityWheel, {
    neutral: true
  });
  const chip = view && view.name ? /*#__PURE__*/React.createElement(IdentityChip, {
    colors: view.colors,
    label: view.name + ' · ' + tribe
  }) : null;
  return /*#__PURE__*/React.createElement(ThemedModal, {
    inline: mobile,
    layout: layout,
    roles: roles,
    aside: aside,
    caption: caption,
    title: title,
    subtitle: subtitle,
    prompt: prompt,
    chip: chip,
    onClose: onClose
  }, body);
}
Object.assign(window, {
  EntryModal
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/EntryModal.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Divider = __ds_scope.Divider;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.LinkButton = __ds_scope.LinkButton;

__ds_ns.MicroLabel = __ds_scope.MicroLabel;

__ds_ns.Plate = __ds_scope.Plate;

__ds_ns.TextField = __ds_scope.TextField;

__ds_ns.Identity = __ds_scope.Identity;

__ds_ns.IdentityChip = __ds_scope.IdentityChip;

__ds_ns.IdentityWheel = __ds_scope.IdentityWheel;

__ds_ns.MiniWheel = __ds_scope.MiniWheel;

__ds_ns.SparkField = __ds_scope.SparkField;

__ds_ns.ThemedModal = __ds_scope.ThemedModal;

__ds_ns.ProfileRow = __ds_scope.ProfileRow;

__ds_ns.TopBar = __ds_scope.TopBar;

__ds_ns.SyncLine = __ds_scope.SyncLine;

})();
