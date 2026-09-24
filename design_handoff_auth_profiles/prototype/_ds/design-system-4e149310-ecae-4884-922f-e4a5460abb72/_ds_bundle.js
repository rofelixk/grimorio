/* @ds-bundle: {"format":4,"namespace":"DesignSystem_4e1493","components":[{"name":"AuthControl","sourcePath":"components/chrome/AuthControl.jsx"},{"name":"NavBar","sourcePath":"components/chrome/NavBar.jsx"},{"name":"NavDrawer","sourcePath":"components/chrome/NavBar.jsx"},{"name":"ThemeScope","sourcePath":"components/chrome/ThemeScope.jsx"},{"name":"ThemedModal","sourcePath":"components/chrome/ThemedModal.jsx"},{"name":"ViewHeader","sourcePath":"components/chrome/ViewHeader.jsx"},{"name":"CardRowList","sourcePath":"components/collection/CardRowList.jsx"},{"name":"CardScatterGrid","sourcePath":"components/collection/CardScatterGrid.jsx"},{"name":"DashboardPanel","sourcePath":"components/collection/DashboardPanel.jsx"},{"name":"EmptyState","sourcePath":"components/collection/EmptyState.jsx"},{"name":"EntityList","sourcePath":"components/collection/EntityList.jsx"},{"name":"LocationStrip","sourcePath":"components/collection/LocationStrip.jsx"},{"name":"SearchToolbar","sourcePath":"components/collection/SearchToolbar.jsx"},{"name":"StatusBadge","sourcePath":"components/collection/StatusBadge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Checkbox","sourcePath":"components/core/Checkbox.jsx"},{"name":"FusedBar","sourcePath":"components/core/FusedBar.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"SegmentedToggle","sourcePath":"components/core/SegmentedToggle.jsx"},{"name":"Select","sourcePath":"components/core/Select.jsx"},{"name":"Spinner","sourcePath":"components/core/Spinner.jsx"},{"name":"CardArt","sourcePath":"components/mtg/CardArt.jsx"},{"name":"ColorIdentity","sourcePath":"components/mtg/ColorIdentity.jsx"},{"name":"IDENTITY","sourcePath":"components/mtg/ColorThemePicker.jsx"},{"name":"ColorThemePicker","sourcePath":"components/mtg/ColorThemePicker.jsx"},{"name":"ManaSymbol","sourcePath":"components/mtg/ManaSymbol.jsx"}],"sourceHashes":{"components/chrome/AuthControl.jsx":"c27614e1f27c","components/chrome/NavBar.jsx":"0bf241eec316","components/chrome/ThemeScope.jsx":"5212c58bf7cc","components/chrome/ThemedModal.jsx":"6f5253762d16","components/chrome/ViewHeader.jsx":"8636d089a63b","components/collection/CardRowList.jsx":"04bf70e6869f","components/collection/CardScatterGrid.jsx":"444e819c8fbc","components/collection/DashboardPanel.jsx":"ded2ffe32080","components/collection/EmptyState.jsx":"aaf39e5a78db","components/collection/EntityList.jsx":"f41f74f59947","components/collection/LocationStrip.jsx":"2d63b35547c3","components/collection/SearchToolbar.jsx":"e23b8fe9c03d","components/collection/StatusBadge.jsx":"cc6c30d4850c","components/core/Button.jsx":"414912165b11","components/core/Checkbox.jsx":"4106e42a3375","components/core/FusedBar.jsx":"e9995dfac111","components/core/Input.jsx":"da4ca7f9722f","components/core/SegmentedToggle.jsx":"0e4d6babb9f1","components/core/Select.jsx":"ac267a39f6e4","components/core/Spinner.jsx":"8fb3ad1705c1","components/mtg/CardArt.jsx":"7f86e6ffefb5","components/mtg/ColorIdentity.jsx":"07ae58c42f8b","components/mtg/ColorThemePicker.jsx":"37f330d1d4ff","components/mtg/ManaSymbol.jsx":"8156d07a2f73","ui_kits/grimorio-app/App.jsx":"e5ac7c55dc4a","ui_kits/grimorio-app/Screens.jsx":"bce1c0f7fb8d","ui_kits/grimorio-app/data.js":"46e7337b2e8e"},"inlinedExternals":[],"unexposedExports":[{"name":"themeVars","sourcePath":"components/chrome/ThemeScope.jsx"}]} */

(() => {

const __ds_ns = (window.DesignSystem_4e1493 = window.DesignSystem_4e1493 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/chrome/NavBar.jsx
try { (() => {
const css = `
.gr-nav{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:var(--space-3);height:var(--nav-bar-height);padding:0 var(--space-4);background:var(--color-surface);border-bottom:1px solid var(--color-border)}
.gr-brand{font-family:var(--font-display);font-weight:700;font-size:var(--font-size-lg);color:var(--role-primary);text-decoration:none;margin-right:auto;letter-spacing:.01em}
.gr-brand:hover{text-decoration:none;color:var(--role-primary-hover)}
.gr-drawer{width:var(--sidebar-width);background:var(--color-surface);border-right:1px solid var(--color-border);padding:var(--space-5) var(--space-4);display:flex;flex-direction:column;gap:var(--space-5)}
.gr-drawer-group{display:flex;flex-direction:column;gap:var(--space-2)}
.gr-drawer-group h2{margin:0;font-family:var(--font-sans);font-size:var(--font-size-xs);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted)}
.gr-drawer-group a{color:var(--color-text);text-decoration:none;padding:var(--space-2);border-radius:var(--radius-sm)}
.gr-drawer-group a:hover{background:var(--color-surface-raised);text-decoration:none;color:var(--color-text)}
.gr-drawer-group a.active{background:var(--color-surface-raised);color:var(--role-accent);font-weight:700}
`;

// Brand wordmark only — the product ships no logo mark, so "Grimorio" is set in
// the display face, in the primary role color.
function NavBar({
  brand = 'Grimorio',
  right,
  onMenu,
  showMenu = false
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("header", {
    className: "gr-nav"
  }, showMenu ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Abrir menu",
    onClick: onMenu,
    style: {
      font: 'inherit',
      fontSize: 'var(--font-size-lg)',
      lineHeight: 1,
      padding: 'var(--space-1) var(--space-2)',
      background: 'transparent',
      border: '1px solid transparent',
      color: 'var(--color-text)',
      cursor: 'pointer'
    }
  }, "\u2630") : null, /*#__PURE__*/React.createElement("a", {
    className: "gr-brand",
    href: "#",
    onClick: e => e.preventDefault()
  }, brand), right));
}
function NavDrawer({
  groups = [],
  active,
  onNavigate
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("nav", {
    className: "gr-drawer"
  }, groups.map(g => /*#__PURE__*/React.createElement("section", {
    className: "gr-drawer-group",
    key: g.title
  }, /*#__PURE__*/React.createElement("h2", null, g.title), g.links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l.id,
    href: "#",
    className: l.id === active ? 'active' : undefined,
    onClick: e => {
      e.preventDefault();
      onNavigate && onNavigate(l.id);
    }
  }, l.label))))));
}
Object.assign(__ds_scope, { NavBar, NavDrawer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/NavBar.jsx", error: String((e && e.message) || e) }); }

// components/chrome/ThemedModal.jsx
try { (() => {
// The system-wide modal contract: a native <dialog>, a rotating conic ring shown
// through a 2px padding gap around the opaque surface, a blurred breathing
// ambient halo, and sparks flying off the ring (the planeswalker spark).
const css = `
@keyframes spin-angle{to{--spin-angle:360deg}}\n.gr-dialog{position:relative;flex-direction:column;border:none;border-radius:calc(var(--radius-md) + 2px);padding:2px;color:var(--color-text);overflow:visible;background:conic-gradient(from var(--spin-angle),rgb(from var(--role-primary) r g b / 35%),rgb(from var(--role-accent) r g b / 25%),rgb(from var(--role-tertiary) r g b / 25%),rgb(from var(--role-primary) r g b / 35%));animation:spin-angle 28s linear infinite}
.gr-dialog[open]{display:flex}
.gr-dialog::backdrop{background:var(--overlay-backdrop)}
.gr-surface{position:relative;z-index:1;flex:1 1 auto;display:flex;flex-direction:column;min-height:0;border-radius:var(--radius-md);background:var(--color-bg);box-shadow:var(--shadow-sm);overflow:hidden}
.gr-halo{position:absolute;inset:-32px;pointer-events:none;border-radius:70px;filter:blur(26px);background:conic-gradient(from var(--spin-angle),rgb(from var(--role-primary) r g b / 24%),rgb(from var(--role-accent) r g b / 18%) 30%,rgb(from var(--role-tertiary) r g b / 18%) 50%,rgb(from var(--role-primary) r g b / 24%) 80%,rgb(from var(--role-primary) r g b / 24%));animation:spin-angle 28s linear infinite,flicker 6s ease-in-out infinite}
.gr-modal-head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);padding:var(--space-5) var(--space-5) var(--space-4)}
.gr-modal-head h2{margin:0;font-family:var(--font-display);font-weight:600;font-size:var(--font-size-lg)}
.gr-modal-body{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;padding:0 var(--space-5) var(--space-5);scrollbar-width:thin;scrollbar-color:var(--color-surface-raised) var(--color-bg)}
.gr-modal-body::-webkit-scrollbar{width:10px}
.gr-modal-body::-webkit-scrollbar-track{background:var(--color-bg)}
.gr-modal-body::-webkit-scrollbar-thumb{background:var(--color-surface-raised);border:2px solid var(--color-bg);border-radius:var(--radius-sm)}
.gr-modal-actions{flex:0 0 auto;display:flex;justify-content:flex-end;gap:var(--space-2);padding:var(--space-4) var(--space-5);border-top:1px solid var(--color-border);background:var(--color-bg)}
.gr-close{background:transparent;border:none;color:var(--color-text);min-height:44px;min-width:44px;cursor:pointer;font:inherit}
@media (prefers-reduced-motion:reduce){.gr-dialog,.gr-halo{animation:none}}
`;
function ThemedModal({
  open = false,
  title,
  width = 'min(400px, 92vw)',
  halo = true,
  onClose,
  actions,
  children
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("dialog", {
    ref: ref,
    className: "gr-dialog",
    style: {
      width
    },
    onClose: () => onClose && onClose()
  }, halo ? /*#__PURE__*/React.createElement("div", {
    className: "gr-halo",
    "aria-hidden": "true"
  }) : null, /*#__PURE__*/React.createElement("div", {
    className: "gr-surface"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gr-modal-head"
  }, /*#__PURE__*/React.createElement("h2", null, title), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "gr-close",
    "aria-label": "Fechar",
    onClick: () => onClose && onClose()
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "gr-modal-body"
  }, children), actions ? /*#__PURE__*/React.createElement("div", {
    className: "gr-modal-actions"
  }, actions) : null)));
}
Object.assign(__ds_scope, { ThemedModal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/ThemedModal.jsx", error: String((e && e.message) || e) }); }

// components/chrome/ViewHeader.jsx
try { (() => {
// The "ember header": a radial wash of the primary role color from the top-left
// corner, breadcrumb above, display-face title with a glow text-shadow, and
// inline stats whose values are set in the display face.
function ViewHeader({
  eyebrow,
  breadcrumb = [],
  title,
  stats = [],
  actions
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      padding: 'var(--space-4) var(--space-5) var(--space-3)',
      background: 'radial-gradient(120% 100% at 8% 0%, rgb(from var(--role-primary) r g b / 16%) 0%, transparent 58%)',
      backgroundColor: 'var(--color-bg)',
      borderBottom: '1px solid var(--color-border)'
    }
  }, breadcrumb.length ? /*#__PURE__*/React.createElement("nav", {
    style: {
      margin: '0 0 var(--space-2)',
      fontSize: 'var(--font-size-sm)',
      color: 'var(--color-text-muted)'
    }
  }, breadcrumb.map((c, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: c
  }, i > 0 ? /*#__PURE__*/React.createElement("span", {
    style: {
      margin: '0 0.3em'
    }
  }, "/") : null, i === breadcrumb.length - 1 ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-text)'
    }
  }, c) : /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault()
  }, c)))) : null, eyebrow ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 var(--space-1)',
      fontSize: 'var(--font-size-xs)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-eyebrow)',
      color: 'var(--color-text-muted)'
    }
  }, eyebrow) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 'var(--space-5)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 'var(--font-size-2xl)',
      lineHeight: 1.1,
      textShadow: '0 0 24px rgb(from var(--role-primary) r g b / 35%)'
    }
  }, title), stats.length ? /*#__PURE__*/React.createElement("dl", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 'var(--space-5)',
      margin: 0
    }
  }, stats.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.label,
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: '0.3rem'
    }
  }, /*#__PURE__*/React.createElement("dd", {
    style: {
      order: 1,
      margin: 0,
      fontFamily: 'var(--font-display)',
      color: 'var(--role-primary)'
    }
  }, s.value), /*#__PURE__*/React.createElement("dt", {
    style: {
      order: 2,
      fontSize: '0.6875rem',
      textTransform: 'uppercase',
      letterSpacing: '0.09em',
      color: 'var(--color-text-muted)'
    }
  }, s.label)))) : null, actions ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, actions) : null));
}
Object.assign(__ds_scope, { ViewHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/ViewHeader.jsx", error: String((e && e.message) || e) }); }

// components/collection/DashboardPanel.jsx
try { (() => {
function DashboardPanel({
  title,
  viewAllLabel = 'Ver tudo',
  onViewAll,
  children
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      marginBottom: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: '0.5rem'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--font-size-xl)'
    }
  }, title), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onViewAll && onViewAll();
    },
    style: {
      fontSize: 'var(--font-size-sm)'
    }
  }, viewAllLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: '16rem',
      overflowY: 'auto',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-sm)',
      padding: '0.75rem'
    }
  }, children));
}
Object.assign(__ds_scope, { DashboardPanel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/collection/DashboardPanel.jsx", error: String((e && e.message) || e) }); }

// components/collection/EmptyState.jsx
try { (() => {
function EmptyState({
  title,
  body,
  action
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: '32rem',
      margin: 'var(--space-6) auto',
      padding: 'var(--space-6) var(--space-5)',
      textAlign: 'center',
      border: '1px dashed var(--color-border)',
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      margin: '0 0 var(--space-2)'
    }
  }, title), body ? /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--color-text-muted)',
      margin: '0 0 var(--space-4)'
    }
  }, body) : null, action);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/collection/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/collection/LocationStrip.jsx
try { (() => {
const POOL = ['#f8f6d8', '#0e68ab', '#8b5cc4', '#d3202a', '#00733e', 'var(--color-primary)', 'var(--color-accent)'];
// djb2 — the same deterministic id→accent hash the app uses, so a location's
// plate color is stable without storing a color on the location.
function accentFor(id = '') {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) hash = hash * 33 ^ id.charCodeAt(i);
  return POOL[Math.abs(hash) % POOL.length];
}
const css = `
.gr-strip{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(var(--strip-cols,6),minmax(0,1fr));gap:var(--space-2)}
.gr-plate{position:relative;min-height:44px;border-radius:var(--radius-md);border:1px solid var(--color-border);background:linear-gradient(180deg,var(--color-surface-raised) 0%,var(--color-surface) 100%);overflow:hidden}
.gr-plate::before{content:'';position:absolute;inset:0 auto 0 0;width:3px;background:var(--accent,var(--role-primary))}
.gr-plate--add::before{display:none}
.gr-plate a,.gr-plate button{all:unset;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;gap:.15rem;width:100%;min-height:44px;padding:var(--space-2) var(--space-3) var(--space-2) var(--space-4);cursor:pointer}
.gr-plate--add button{align-items:center;justify-content:center;font-weight:600;color:var(--color-text-muted)}
.gr-plate:hover{border-color:var(--role-primary);box-shadow:0 0 18px -4px rgb(from var(--role-primary) r g b / 55%)}
.gr-plate .gr-name{font-family:var(--font-display);font-weight:600;font-size:.9375rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gr-plate .gr-count{font-size:.6875rem;color:var(--color-text-muted)}
`;
function LocationStrip({
  locations = [],
  columns = 6,
  onAdd,
  onOpen,
  addLabel = '+ Novo'
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("ul", {
    className: "gr-strip",
    style: {
      '--strip-cols': columns
    }
  }, locations.map(l => /*#__PURE__*/React.createElement("li", {
    key: l.id,
    className: "gr-plate",
    style: {
      '--accent': accentFor(l.id)
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onOpen && onOpen(l)
  }, /*#__PURE__*/React.createElement("span", {
    className: "gr-name"
  }, l.name), /*#__PURE__*/React.createElement("span", {
    className: "gr-count"
  }, l.count ?? 0, " cartas")))), /*#__PURE__*/React.createElement("li", {
    className: "gr-plate gr-plate--add",
    style: locations.length === 0 ? {
      gridColumn: 'span 2'
    } : null
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onAdd && onAdd()
  }, locations.length === 0 ? '+ Criar o primeiro sublocal' : addLabel))));
}
Object.assign(__ds_scope, { LocationStrip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/collection/LocationStrip.jsx", error: String((e && e.message) || e) }); }

// components/collection/StatusBadge.jsx
try { (() => {
const TONES = {
  owned: {
    background: 'var(--color-success-bg)',
    color: '#1a7431'
  },
  'not-owned': {
    background: 'var(--color-warning-bg)',
    color: '#8a6d1f'
  },
  removed: {
    background: 'var(--color-danger-bg)',
    color: '#b00020'
  }
};
function StatusBadge({
  tone = 'owned',
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.8rem',
      padding: '0.15rem 0.5rem',
      borderRadius: 999,
      whiteSpace: 'nowrap',
      fontFamily: 'var(--font-sans)',
      ...TONES[tone]
    }
  }, children);
}
Object.assign(__ds_scope, { StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/collection/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Grimorio's primary buttons are "glow buttons": a dark raised surface with a
// colored border/text and an accent-tinted glow — never a filled block, since a
// filled role color (e.g. Branco #d8cdb0) wouldn't stay readable against
// --color-primary-contrast. See _modal.scss's glow-button mixin.
const base = {
  font: 'inherit',
  fontFamily: 'var(--font-sans)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface-raised)',
  color: 'var(--color-text)',
  padding: 'var(--space-2) var(--space-3)',
  cursor: 'pointer',
  transition: 'background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)'
};
const variantStyles = {
  primary: {
    color: 'var(--role-primary)',
    borderColor: 'var(--role-primary)',
    fontWeight: 700,
    textShadow: '0 0 8px rgb(from var(--role-primary) r g b / 60%)',
    boxShadow: '0 0 20px rgb(from var(--role-primary) r g b / 35%)'
  },
  filled: {
    background: 'var(--color-primary)',
    borderColor: 'var(--color-primary)',
    color: 'var(--color-primary-contrast)',
    fontWeight: 700
  },
  secondary: {},
  danger: {
    background: 'var(--color-danger-bg)',
    borderColor: 'var(--color-danger)',
    color: 'var(--color-danger)'
  },
  ghost: {
    background: 'transparent',
    borderColor: 'transparent'
  }
};
function Button({
  variant = 'secondary',
  touch = false,
  disabled = false,
  fullWidth = false,
  style,
  children,
  ...rest
}) {
  const s = {
    ...base,
    ...variantStyles[variant],
    ...(touch ? {
      minHeight: 'var(--touch-target)',
      minWidth: 'var(--touch-target)'
    } : null),
    ...(fullWidth ? {
      width: '100%'
    } : null),
    ...(disabled ? {
      cursor: 'not-allowed',
      opacity: 0.5
    } : null),
    ...style
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    style: s
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/chrome/AuthControl.jsx
try { (() => {
function AuthControl({
  name,
  onSignIn,
  onSignOut,
  onProfile
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginLeft: 'auto'
    }
  }, name ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onProfile && onProfile();
    },
    style: {
      fontSize: '0.9rem',
      color: 'var(--color-text-muted)'
    }
  }, name), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    onClick: onSignOut
  }, "Sair")) : /*#__PURE__*/React.createElement(__ds_scope.Button, {
    onClick: onSignIn
  }, "Logar"));
}
Object.assign(__ds_scope, { AuthControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/AuthControl.jsx", error: String((e && e.message) || e) }); }

// components/collection/EntityList.jsx
try { (() => {
// Name-plus-remove list with an inline add form — decks and storage locations
// both render through this.
function EntityList({
  items = [],
  emptyLabel = 'Nada aqui ainda.',
  formLabel,
  addLabel = 'Adicionar',
  placeholder,
  onRemove,
  onAdd
}) {
  const [name, setName] = React.useState('');
  return /*#__PURE__*/React.createElement("div", null, items.length === 0 ? /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--color-text-muted)'
    }
  }, emptyLabel) : null, /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      padding: 0,
      margin: '0 0 var(--space-3)'
    }
  }, items.map(item => /*#__PURE__*/React.createElement("li", {
    key: item.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '0.5rem'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--font-size-lg)'
    }
  }, item.name), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto'
    }
  }), onRemove ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    onClick: () => onRemove(item)
  }, "Remover") : null))), /*#__PURE__*/React.createElement("form", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: '0.5rem'
    },
    onSubmit: e => {
      e.preventDefault();
      if (name.trim() && onAdd) {
        onAdd(name.trim());
        setName('');
      }
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem',
      fontSize: 'var(--font-size-sm)',
      flex: '1 1 auto'
    }
  }, formLabel, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: name,
    placeholder: placeholder,
    onChange: e => setName(e.target.value),
    style: {
      font: 'inherit',
      color: 'var(--color-text)',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-sm)',
      padding: 'var(--space-2) var(--space-3)'
    }
  })), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    type: "submit",
    onClick: () => {
      if (name.trim() && onAdd) {
        onAdd(name.trim());
        setName('');
      }
    }
  }, addLabel)));
}
Object.assign(__ds_scope, { EntityList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/collection/EntityList.jsx", error: String((e && e.message) || e) }); }

// components/core/Checkbox.jsx
try { (() => {
// Custom box + glyph (the native input stays, visually hidden) so the checked
// state can glow in the active role color.
function Checkbox({
  label,
  checked = false,
  onChange
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      cursor: 'pointer',
      padding: '0.625rem var(--space-3)',
      background: 'var(--color-surface)',
      border: '1px solid ' + (checked ? 'var(--role-primary)' : 'var(--color-border)'),
      borderRadius: 'var(--radius-sm)',
      minHeight: 'var(--touch-target)',
      fontSize: 'var(--font-size-sm)'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    style: {
      position: 'absolute',
      width: 18,
      height: 18,
      margin: 0,
      opacity: 0,
      cursor: 'pointer'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      flex: '0 0 auto',
      width: 18,
      height: 18,
      borderRadius: 'var(--radius-sm)',
      border: '1px solid ' + (checked ? 'var(--role-primary)' : 'var(--color-border)'),
      background: checked ? 'var(--color-surface-raised)' : 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      font: '700 11px/1 system-ui, sans-serif',
      color: 'var(--role-primary)',
      opacity: checked ? 1 : 0
    }
  }, "\u2713")), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/core/FusedBar.jsx
try { (() => {
// One outer border, 1px hairline seams between segments — the shared idiom for
// the search bar and the collection toolbar. Children paint their own opaque
// background over the seam color.
function FusedBar({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'stretch',
      gap: 1,
      background: 'var(--color-border)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { FusedBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/FusedBar.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  helper,
  error,
  as = 'input',
  rows = 3,
  style,
  ...rest
}) {
  const field = {
    font: 'inherit',
    color: 'var(--color-text)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: 'var(--space-2) var(--space-3)',
    minHeight: 'var(--touch-target)',
    boxSizing: 'border-box',
    ...style
  };
  const control = as === 'textarea' ? /*#__PURE__*/React.createElement("textarea", _extends({
    rows: rows,
    style: {
      ...field,
      resize: 'vertical'
    }
  }, rest)) : /*#__PURE__*/React.createElement("input", _extends({
    style: field
  }, rest));
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-1)',
      fontSize: 'var(--font-size-sm)'
    }
  }, label, control, helper ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--font-size-xs)',
      color: 'var(--color-text-muted)'
    }
  }, helper) : null, error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--font-size-sm)',
      color: 'var(--color-danger)'
    }
  }, error) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/SegmentedToggle.jsx
try { (() => {
// The app's mode/view toggle: hairline seams (a 1px --color-border gap showing
// between opaque segments), active segment on --color-surface-raised.
function SegmentedToggle({
  options = [],
  value,
  onChange,
  glow = false,
  fused = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "group",
    style: {
      display: 'flex',
      gap: 1,
      background: 'var(--color-border)',
      border: fused ? 'none' : '1px solid var(--color-border)',
      borderRadius: fused ? 0 : 'var(--radius-sm)',
      overflow: 'hidden'
    }
  }, options.map((o, i) => {
    const val = typeof o === 'string' ? o : o.value;
    const label = typeof o === 'string' ? o : o.label;
    const active = val === value;
    const role = glow ? i === 0 ? 'var(--role-accent)' : 'var(--role-tertiary)' : 'var(--color-text)';
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      type: "button",
      "aria-pressed": active,
      onClick: () => onChange && onChange(val),
      style: {
        font: 'inherit',
        fontSize: 'var(--font-size-sm)',
        fontWeight: active ? 700 : 400,
        color: active ? role : 'var(--color-text-muted)',
        background: active ? 'var(--color-surface-raised)' : 'var(--color-surface)',
        border: 'none',
        borderRadius: 0,
        padding: '0 var(--space-3)',
        minHeight: 'var(--touch-target)',
        cursor: 'pointer',
        userSelect: 'none',
        flex: '1 1 0',
        textShadow: active && glow ? '0 0 8px rgb(from ' + role + ' r g b / 60%)' : 'none'
      }
    }, label);
  }));
}
Object.assign(__ds_scope, { SegmentedToggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SegmentedToggle.jsx", error: String((e && e.message) || e) }); }

// components/collection/SearchToolbar.jsx
try { (() => {
// The fused search bar: mode toggle, field(s), and the one primary CTA — the
// only ember-filled button on the surface (The One Flame Rule).
function SearchToolbar({
  mode = 'name',
  onModeChange,
  value = '',
  onValueChange,
  onSearch,
  searching = false,
  helper
}) {
  const seg = {
    all: 'unset',
    flex: '1 1 auto',
    minWidth: 0,
    font: 'inherit',
    color: 'var(--color-text)',
    background: 'var(--color-surface)',
    padding: '0 var(--space-3)',
    display: 'flex',
    alignItems: 'center',
    minHeight: 'var(--touch-target)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-bg)',
      paddingBottom: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.FusedBar, null, /*#__PURE__*/React.createElement(__ds_scope.SegmentedToggle, {
    fused: true,
    options: [{
      value: 'name',
      label: 'Nome'
    }, {
      value: 'setCode',
      label: 'Set + Código'
    }],
    value: mode,
    onChange: onModeChange
  }), mode === 'name' ? /*#__PURE__*/React.createElement("input", {
    style: seg,
    value: value,
    placeholder: "Sol Ring",
    onChange: e => onValueChange && onValueChange(e.target.value)
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    style: seg,
    placeholder: "ex.: MH3"
  }), /*#__PURE__*/React.createElement("input", {
    style: seg,
    placeholder: "ex.: 161"
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onSearch,
    disabled: searching,
    style: {
      flex: '0 0 auto',
      font: 'inherit',
      fontWeight: 700,
      border: 'none',
      borderRadius: 0,
      background: 'var(--role-primary)',
      color: 'var(--color-primary-contrast)',
      padding: '0 var(--space-4)',
      minHeight: 'var(--touch-target)',
      cursor: searching ? 'not-allowed' : 'pointer',
      opacity: searching ? 0.5 : 1,
      userSelect: 'none'
    }
  }, searching ? 'Buscando…' : 'Buscar')), helper ? /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--color-text-muted)',
      fontSize: 'var(--font-size-xs)',
      margin: 'var(--space-1) 0 0'
    }
  }, helper) : null);
}
Object.assign(__ds_scope, { SearchToolbar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/collection/SearchToolbar.jsx", error: String((e && e.message) || e) }); }

// components/core/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  label,
  options = [],
  style,
  ...rest
}) {
  const field = {
    font: 'inherit',
    color: 'var(--color-text)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: 'var(--space-2)',
    minHeight: 'var(--touch-target)',
    ...style
  };
  const select = /*#__PURE__*/React.createElement("select", _extends({
    style: field
  }, rest), options.map(o => /*#__PURE__*/React.createElement("option", {
    key: typeof o === 'string' ? o : o.value,
    value: typeof o === 'string' ? o : o.value
  }, typeof o === 'string' ? o : o.label)));
  if (!label) return select;
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-1)',
      fontSize: 'var(--font-size-sm)'
    }
  }, label, select);
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Select.jsx", error: String((e && e.message) || e) }); }

// components/core/Spinner.jsx
try { (() => {
function Spinner({
  size = '1em'
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "ds-spinner",
    "aria-hidden": "true",
    style: {
      width: size,
      height: size
    }
  });
}
Object.assign(__ds_scope, { Spinner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Spinner.jsx", error: String((e && e.message) || e) }); }

// components/mtg/CardArt.jsx
try { (() => {
// Card art crops at --radius-card (14px), a purpose-tuned radius outside the
// system's two shape steps — Scryfall scans bake in their own smaller printed
// corner radius, so clipping at --radius-md leaves white slivers.
function CardArt({
  src,
  name = '',
  colors = [],
  radius = 'var(--radius-card)',
  style
}) {
  const shared = {
    display: 'block',
    width: '100%',
    aspectRatio: '488 / 680',
    borderRadius: radius,
    objectFit: 'cover',
    ...style
  };
  if (src) return /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    loading: "lazy",
    style: shared
  });
  const tint = {
    W: '#f8f6d8',
    U: '#0e68ab',
    B: '#8b5cc4',
    R: '#d3202a',
    G: '#00733e'
  }[colors[0]] || '#8a8378';
  return /*#__PURE__*/React.createElement("div", {
    role: "img",
    "aria-label": name,
    style: {
      ...shared,
      border: '1px solid var(--color-border)',
      background: 'radial-gradient(120% 90% at 50% 8%, rgb(from ' + tint + ' r g b / 22%) 0%, var(--color-surface) 62%), var(--color-surface)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      padding: 'var(--space-3)',
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 'var(--font-size-sm)',
      color: 'var(--color-text)',
      textShadow: '0 1px 6px rgba(0,0,0,.7)',
      overflow: 'hidden'
    }
  }, name);
}
Object.assign(__ds_scope, { CardArt });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mtg/CardArt.jsx", error: String((e && e.message) || e) }); }

// components/collection/CardRowList.jsx
try { (() => {
const PRINT = {
  W: '#f8f6d8',
  U: '#0e68ab',
  B: '#8b5cc4',
  R: '#d3202a',
  G: '#00733e'
};

// The list view of a collection: compact rows, name in the display face,
// metadata muted, quantity in the card's own identity color.
function CardRowList({
  cards = [],
  onRemove,
  onSelect
}) {
  return /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 'var(--space-2) var(--space-2) var(--space-6)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, cards.map((card, i) => /*#__PURE__*/React.createElement("li", {
    key: card.id || i,
    role: "button",
    tabIndex: 0,
    onClick: () => onSelect && onSelect(card),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      minHeight: 'var(--touch-target)',
      padding: 'var(--space-2) var(--space-3)',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '0 0 auto',
      width: 52
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.CardArt, {
    src: card.imageUrl,
    name: card.name,
    colors: card.colorIdentity,
    radius: "var(--radius-sm)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      flex: '1 1 auto'
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      fontFamily: 'var(--font-display)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, card.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--font-size-sm)',
      color: 'var(--color-text-muted)'
    }
  }, [card.setCode, card.collectorNumber ? '#' + card.collectorNumber : null].filter(Boolean).join(' '), card.finish ? ' · ' + card.finish : '', card.condition ? ' · ' + card.condition : '')), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: '0 0 auto',
      fontWeight: 700,
      color: PRINT[(card.colorIdentity || [])[0]] || 'var(--role-accent)'
    }
  }, card.quantity || 1, "\xD7"), onRemove ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    onClick: e => {
      e.stopPropagation();
      onRemove(card);
    }
  }, "Remover") : null)));
}
Object.assign(__ds_scope, { CardRowList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/collection/CardRowList.jsx", error: String((e && e.message) || e) }); }

// components/collection/CardScatterGrid.jsx
try { (() => {
const PRINT = {
  W: '#f8f6d8',
  U: '#0e68ab',
  B: '#8b5cc4',
  R: '#d3202a',
  G: '#00733e'
};
function glowColors(colors = []) {
  if (colors.length === 0) return ['#8a8378'];
  if (colors.length === 4) return ['#c9d1d9'];
  if (colors.length >= 5) return ['#d4af37'];
  return colors.map(c => PRINT[c]);
}
const css = `
@keyframes spin-angle{to{--spin-angle:360deg}}\n.gr-scatter{--radius-card:14px;list-style:none;margin:0;padding:var(--space-6) var(--space-2);display:grid;grid-template-columns:repeat(var(--gr-cols,6),1fr);gap:var(--space-4) var(--space-2)}
.gr-scatter li{--seed:calc((var(--i,0) + var(--grid-seed,0)) * 12.9898);position:relative;cursor:pointer;transform:translateX(calc(sin(var(--seed)) * 8%)) translateY(calc(cos(var(--seed) * 1.37) * 28px)) rotate(calc(sin(var(--seed) * 2.1) * 4deg));transition:transform .18s ease}
.gr-scatter li:hover,.gr-scatter li:focus-within{transform:translate(0,-6px) rotate(0deg) scale(1.04);z-index:2}
.gr-cell{position:relative;border:1px solid transparent;border-radius:var(--radius-card);transition:border-color .18s ease,box-shadow .18s ease}
.gr-scatter li:hover .gr-cell{border-color:var(--card-glow-1,var(--role-accent));box-shadow:0 0 16px rgb(from var(--card-glow-1,#e8792f) r g b / 40%)}
.gr-scatter li.multi:hover .gr-cell{border-color:transparent;box-shadow:none}
.gr-scatter li.multi:hover .gr-cell::after{content:'';position:absolute;inset:-1px;border-radius:calc(var(--radius-card) + 1px);padding:1px;pointer-events:none;background:conic-gradient(from var(--spin-angle),var(--card-glow-1),var(--card-glow-2),var(--card-glow-3,var(--card-glow-2)),var(--card-glow-1));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:spin-angle 4s linear infinite}
.gr-qty{position:absolute;top:var(--space-2);right:var(--space-2);z-index:1;padding:.1rem .4rem;font-size:.625rem;font-weight:700;background:rgb(from var(--color-bg) r g b / 85%);border:1px solid var(--color-border);border-radius:var(--radius-sm)}
@media (prefers-reduced-motion:reduce){.gr-scatter li.multi:hover .gr-cell::after{animation:none}}
`;

// The shared card-grid idiom: a seeded rotated scatter, hover un-rotate/lift/scale,
// and a rotating multicolor conic ring for 2-3 color cards.
function CardScatterGrid({
  cards = [],
  columns = 6,
  seed = 3,
  onSelect
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("ul", {
    className: "gr-scatter",
    style: {
      '--gr-cols': columns,
      '--grid-seed': seed
    }
  }, cards.map((card, i) => {
    const g = glowColors(card.colorIdentity || []);
    const multi = (card.colorIdentity || []).length >= 2 && (card.colorIdentity || []).length <= 3;
    return /*#__PURE__*/React.createElement("li", {
      key: card.id || i,
      className: multi ? 'multi' : undefined,
      role: "button",
      tabIndex: 0,
      onClick: () => onSelect && onSelect(card),
      style: {
        '--i': i,
        '--card-glow-1': g[0],
        '--card-glow-2': g[1] || g[0],
        '--card-glow-3': g[2] || g[1] || g[0]
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "gr-cell"
    }, card.quantity > 1 ? /*#__PURE__*/React.createElement("span", {
      className: "gr-qty"
    }, card.quantity, "\xD7") : null, /*#__PURE__*/React.createElement(__ds_scope.CardArt, {
      src: card.imageUrl,
      name: card.name,
      colors: card.colorIdentity
    })));
  })));
}
Object.assign(__ds_scope, { CardScatterGrid });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/collection/CardScatterGrid.jsx", error: String((e && e.message) || e) }); }

// components/mtg/ColorIdentity.jsx
try { (() => {
const PRINT = {
  W: '#f8f6d8',
  U: '#0e68ab',
  B: '#150b00',
  R: '#d3202a',
  G: '#00733e'
};
const ALL = ['W', 'U', 'B', 'R', 'G'];

// Signature component. Deliberately NOT token-colored: the pips keep Magic's
// traditional print colors so players recognize them (DESIGN.md).
function ColorIdentity({
  colors = [],
  size = '1.5rem'
}) {
  return /*#__PURE__*/React.createElement("span", {
    "aria-label": 'Color identity: ' + (colors.join(', ') || 'Colorless'),
    style: {
      display: 'inline-flex',
      gap: '0.25rem'
    }
  }, ALL.map(c => {
    const on = colors.includes(c);
    return /*#__PURE__*/React.createElement("span", {
      key: c,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        fontFamily: 'var(--font-sans)',
        fontSize: '0.7rem',
        fontWeight: 700,
        color: on ? c === 'W' ? '#333' : '#fff' : '#999',
        background: on ? PRINT[c] : '#eee',
        border: on ? '1px solid transparent' : '1px solid #ccc'
      }
    }, c);
  }));
}
Object.assign(__ds_scope, { ColorIdentity });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mtg/ColorIdentity.jsx", error: String((e && e.message) || e) }); }

// components/mtg/ManaSymbol.jsx
try { (() => {
// Resolve the mana SVG folder relative to wherever the compiled bundle was
// loaded from, so a card page at any depth gets the right URL.
const dsRoot = (() => {
  const s = document.querySelector('script[src*="_ds_bundle.js"]');
  return s ? s.getAttribute('src').replace(/_ds_bundle\.js.*$/, '') : '';
})();
function ManaSymbol({
  code = 'W',
  size = '1.25rem',
  title,
  style
}) {
  return /*#__PURE__*/React.createElement("img", {
    src: dsRoot + 'assets/mana/' + code + '.svg',
    alt: title || '{' + code + '}',
    title: title || '{' + code + '}',
    style: {
      width: size,
      height: size,
      display: 'block',
      ...style
    }
  });
}
Object.assign(__ds_scope, { ManaSymbol });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mtg/ManaSymbol.jsx", error: String((e && e.message) || e) }); }

// components/mtg/ColorThemePicker.jsx
try { (() => {
const IDENTITY = {
  W: {
    label: 'Branco',
    base: '#d8cdb0',
    hover: '#e6dcc2'
  },
  U: {
    label: 'Azul',
    base: '#3d6b85',
    hover: '#4c7f9c'
  },
  B: {
    label: 'Roxo',
    base: '#7c5aa6',
    hover: '#8f6bb8'
  },
  R: {
    label: 'Vermelho',
    base: '#a8402c',
    hover: '#bf4f39'
  },
  G: {
    label: 'Verde',
    base: '#4c7a43',
    hover: '#5c8f52'
  }
};
const ORDER = ['W', 'U', 'B', 'R', 'G'];

// Up to 3 picks; pick order is role order (primary, accent, tertiary). At least
// one color always stays selected.
function ColorThemePicker({
  selected = ['R', 'U'],
  max = 3,
  onToggle,
  size = '2.25rem'
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "group",
    "aria-label": "Escolher cores do tema",
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      padding: 3
    }
  }, ORDER.map(c => {
    const on = selected.includes(c);
    const locked = !on && selected.length >= max || on && selected.length <= 1;
    return /*#__PURE__*/React.createElement("button", {
      key: c,
      type: "button",
      "aria-pressed": on,
      "aria-label": IDENTITY[c].label,
      disabled: locked,
      onClick: () => onToggle && onToggle(c),
      style: {
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        padding: 2,
        border: '2px solid transparent',
        background: 'var(--color-surface)',
        cursor: locked ? 'not-allowed' : 'pointer',
        opacity: !on && locked ? 0.5 : 1,
        boxShadow: on ? '0 0 0 1px var(--color-bg), 0 0 0 2px ' + IDENTITY[c].base : 'none',
        transition: 'transform var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.ManaSymbol, {
      code: c,
      size: "100%",
      style: {
        opacity: on ? 1 : 0.55,
        transition: 'opacity var(--duration-fast) var(--ease-standard)'
      }
    }));
  }));
}
Object.assign(__ds_scope, { IDENTITY, ColorThemePicker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/mtg/ColorThemePicker.jsx", error: String((e && e.message) || e) }); }

// components/chrome/ThemeScope.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Pick order is role order: 1st -> primary, 2nd -> accent, 3rd -> tertiary.
// Unset roles are simply absent, so --role-* falls back down its own chain.
function themeVars(colors = []) {
  const [p, a, t] = colors;
  const v = {};
  if (p) {
    v['--theme-primary'] = __ds_scope.IDENTITY[p].base;
    v['--theme-primary-hover'] = __ds_scope.IDENTITY[p].hover;
  }
  if (a) {
    v['--theme-accent'] = __ds_scope.IDENTITY[a].base;
    v['--theme-accent-hover'] = __ds_scope.IDENTITY[a].hover;
  }
  if (t) {
    v['--theme-tertiary'] = __ds_scope.IDENTITY[t].base;
    v['--theme-tertiary-hover'] = __ds_scope.IDENTITY[t].hover;
  }
  return v;
}
function ThemeScope({
  colors = ['R', 'U'],
  as: Tag = 'div',
  style,
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement(Tag, _extends({
    style: {
      ...themeVars(colors),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { themeVars, ThemeScope });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/ThemeScope.jsx", error: String((e && e.message) || e) }); }

// ui_kits/grimorio-app/App.jsx
try { (() => {
const {
  NavBar,
  NavDrawer,
  AuthControl,
  ThemeScope,
  Button
} = window.DesignSystem_4e1493;
function App() {
  const [route, setRoute] = React.useState('collection-detail');
  const [colors, setColors] = React.useState(['R', 'U']);
  const [user, setUser] = React.useState('rofelix');
  const [authOpen, setAuthOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const toggle = c => setColors(p => p.includes(c) ? p.length > 1 ? p.filter(x => x !== c) : p : p.length < 3 ? [...p, c] : p);
  const go = r => setRoute(r);
  const added = card => {
    setAddOpen(false);
    setToast((card && card.name ? card.name : 'Carta') + ' adicionada à Caixa Commander.');
    setTimeout(() => setToast(null), 2600);
  };
  const groups = [{
    title: 'Acervo',
    links: [{
      id: 'decks',
      label: 'Decks'
    }, {
      id: 'collection-detail',
      label: 'Coleção'
    }, {
      id: 'import',
      label: 'Importar coleção'
    }]
  }, {
    title: 'Conta',
    links: [{
      id: 'profile',
      label: 'Perfil'
    }]
  }];
  let screen;
  if (route === 'home') screen = /*#__PURE__*/React.createElement(HomeScreen, {
    go: go
  });else if (route === 'collection-detail' || route === 'collection') screen = /*#__PURE__*/React.createElement(CollectionDetailScreen, {
    onAdd: () => setAddOpen(true),
    onOpenCard: () => setAddOpen(true)
  });else if (route === 'decks') screen = /*#__PURE__*/React.createElement(DecksScreen, {
    onOpen: () => go('deck-detail')
  });else if (route === 'deck-detail') screen = /*#__PURE__*/React.createElement(DeckDetailScreen, {
    onAdd: () => setAddOpen(true)
  });else if (route === 'profile') screen = /*#__PURE__*/React.createElement(ProfileScreen, {
    colors: colors,
    onToggle: toggle
  });else screen = /*#__PURE__*/React.createElement(HomeScreen, {
    go: go
  });
  return /*#__PURE__*/React.createElement(ThemeScope, {
    colors: colors,
    style: {
      display: 'grid',
      gridTemplateColumns: 'var(--sidebar-width) 1fr',
      gridTemplateRows: 'var(--nav-bar-height) 1fr',
      height: '100dvh',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1',
      gridRow: 1
    }
  }, /*#__PURE__*/React.createElement(NavBar, {
    right: /*#__PURE__*/React.createElement(AuthControl, {
      name: user,
      onSignIn: () => setAuthOpen(true),
      onSignOut: () => setUser(null),
      onProfile: () => go('profile')
    })
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: 1,
      gridRow: 2,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement(NavDrawer, {
    groups: groups,
    active: route === 'collection' ? 'collection-detail' : route,
    onNavigate: go
  })), /*#__PURE__*/React.createElement("main", {
    style: {
      gridColumn: 2,
      gridRow: 2,
      minHeight: 0,
      overflow: 'hidden'
    }
  }, screen), /*#__PURE__*/React.createElement(AuthModal, {
    open: authOpen,
    onClose: () => setAuthOpen(false),
    colors: colors,
    onToggle: toggle,
    onSignIn: () => {
      setUser('rofelix');
      setAuthOpen(false);
    }
  }), /*#__PURE__*/React.createElement(AddCardFlow, {
    open: addOpen,
    onClose: () => setAddOpen(false),
    onAdded: added
  }), toast ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 'var(--space-5)',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--color-surface-raised)',
      border: '1px solid var(--role-primary)',
      color: 'var(--color-text)',
      borderRadius: 'var(--radius-sm)',
      padding: 'var(--space-3) var(--space-4)',
      boxShadow: '0 0 20px rgb(from var(--role-primary) r g b / 35%)',
      fontSize: 'var(--font-size-sm)'
    }
  }, toast) : null);
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/grimorio-app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/grimorio-app/Screens.jsx
try { (() => {
const {
  Button,
  Input,
  Select,
  Checkbox,
  Spinner,
  SegmentedToggle,
  FusedBar,
  ManaSymbol,
  ColorIdentity,
  ColorThemePicker,
  CardArt,
  CardScatterGrid,
  CardRowList,
  LocationStrip,
  SearchToolbar,
  DashboardPanel,
  EntityList,
  StatusBadge,
  EmptyState,
  NavBar,
  NavDrawer,
  AuthControl,
  ViewHeader,
  ThemedModal,
  ThemeScope
} = window.DesignSystem_4e1493;
const D = window.GRIMORIO_DATA;

// ---------- Home (dashboard) ----------
function HomeScreen({
  go,
  onAddDeck
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-4) var(--space-5) var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement(DashboardPanel, {
    title: "Cole\xE7\xE3o",
    onViewAll: () => go('collection')
  }, /*#__PURE__*/React.createElement(LocationStrip, {
    locations: D.locations.slice(0, 4),
    columns: 4,
    onOpen: () => go('collection-detail'),
    onAdd: () => go('collection-detail')
  })), /*#__PURE__*/React.createElement(DashboardPanel, {
    title: "Decks",
    onViewAll: () => go('decks')
  }, /*#__PURE__*/React.createElement(EntityList, {
    items: D.decks,
    formLabel: "Nome do novo deck",
    addLabel: "Adicionar deck",
    placeholder: "ex.: Atraxa Superfriends",
    onAdd: onAddDeck
  })));
}

// ---------- Collection detail (the flagship view) ----------
function CollectionDetailScreen({
  onAdd,
  onOpenCard
}) {
  const [view, setView] = React.useState('grid');
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState('recent');
  const cards = D.cards.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
  const sorted = [...cards].sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'quantity' ? (b.quantity || 1) - (a.quantity || 1) : 0);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateRows: 'auto auto auto minmax(0,1fr)',
      height: '100%',
      minHeight: 0,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(ViewHeader, {
    eyebrow: "Local de armazenamento",
    breadcrumb: ['Coleção', 'Caixa Commander'],
    title: "Caixa Commander",
    stats: [{
      label: 'Cartas',
      value: 412
    }, {
      label: 'Únicas',
      value: D.cards.length
    }, {
      label: 'Sublocais',
      value: 4
    }, {
      label: 'À venda',
      value: 7
    }],
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("a", {
      href: "#",
      onClick: e => e.preventDefault(),
      style: {
        fontSize: 'var(--font-size-sm)'
      }
    }, "Importar CSV"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      touch: true,
      onClick: onAdd
    }, "Adicionar carta"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-3) var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(LocationStrip, {
    locations: D.locations.slice(2),
    columns: 6
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '0 var(--space-5) var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(FusedBar, null, /*#__PURE__*/React.createElement("input", {
    value: query,
    onChange: e => setQuery(e.target.value),
    placeholder: 'Procurar entre as ' + D.cards.length + ' cartas daqui…',
    style: {
      all: 'unset',
      flex: '1 1 auto',
      minWidth: 0,
      font: 'inherit',
      color: 'var(--color-text)',
      background: 'var(--color-surface)',
      padding: '0 var(--space-3)',
      display: 'flex',
      alignItems: 'center',
      minHeight: 'var(--touch-target)'
    }
  }), /*#__PURE__*/React.createElement("select", {
    value: sort,
    onChange: e => setSort(e.target.value),
    style: {
      font: 'inherit',
      color: 'var(--color-text)',
      background: 'var(--color-surface)',
      border: 'none',
      padding: '0 var(--space-3)',
      minHeight: 'var(--touch-target)'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "recent"
  }, "Adicionadas por \xFAltimo"), /*#__PURE__*/React.createElement("option", {
    value: "name"
  }, "Nome A\u2013Z"), /*#__PURE__*/React.createElement("option", {
    value: "set"
  }, "Set"), /*#__PURE__*/React.createElement("option", {
    value: "quantity"
  }, "Quantidade"), /*#__PURE__*/React.createElement("option", {
    value: "color"
  }, "Cor")), /*#__PURE__*/React.createElement(SegmentedToggle, {
    fused: true,
    options: [{
      value: 'grid',
      label: 'Grade'
    }, {
      value: 'list',
      label: 'Lista'
    }],
    value: view,
    onChange: setView
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowY: 'auto',
      padding: '0 var(--space-5)'
    }
  }, sorted.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    title: 'Nenhuma carta corresponde a "' + query + '".',
    action: /*#__PURE__*/React.createElement(Button, {
      onClick: () => setQuery('')
    }, "Limpar filtro")
  }) : view === 'grid' ? /*#__PURE__*/React.createElement(CardScatterGrid, {
    cards: sorted,
    columns: 6,
    seed: 4,
    onSelect: onOpenCard
  }) : /*#__PURE__*/React.createElement(CardRowList, {
    cards: sorted,
    onSelect: onOpenCard,
    onRemove: () => {}
  })));
}

// ---------- Decks + deck detail ----------
function DecksScreen({
  onOpen,
  onAddDeck
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-4) var(--space-5) var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement(ViewHeader, {
    title: "Decks",
    stats: [{
      label: 'Decks',
      value: D.decks.length
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(EntityList, {
    items: D.decks,
    formLabel: "Nome do novo deck",
    addLabel: "Adicionar deck",
    placeholder: "ex.: Atraxa Superfriends",
    onAdd: onAddDeck,
    onRemove: () => {}
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    touch: true,
    onClick: onOpen
  }, "Abrir \"Atraxa Superfriends\""))));
}
function DeckDetailScreen({
  onAdd
}) {
  const commander = D.cards[2];
  const rows = D.cards.slice(3, 9);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      overflowY: 'auto',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement(ViewHeader, {
    breadcrumb: ['Decks', 'Atraxa Superfriends'],
    title: "Atraxa Superfriends",
    stats: [{
      label: 'Cartas',
      value: '100'
    }, {
      label: 'Legalidade',
      value: 'Legal'
    }],
    actions: /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      touch: true,
      onClick: onAdd
    }, "Adicionar carta")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-5)',
      display: 'grid',
      gap: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 var(--space-3)',
      fontSize: 'var(--font-size-lg)'
    }
  }, "Comandante"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      alignItems: 'flex-start',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 110,
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(CardArt, {
    name: commander.name,
    colors: commander.colorIdentity
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: '1.375rem'
    }
  }, commander.name), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-text-muted)',
      fontSize: 'var(--font-size-sm)'
    }
  }, commander.typeLine), /*#__PURE__*/React.createElement(ColorIdentity, {
    colors: commander.colorIdentity
  })), /*#__PURE__*/React.createElement(Button, {
    style: {
      marginLeft: 'auto'
    }
  }, "Trocar comandante"))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 var(--space-3)',
      fontSize: 'var(--font-size-lg)'
    }
  }, "Legalidade: Legal"), /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: 0,
      paddingLeft: '1.1rem',
      color: 'var(--color-text-muted)',
      fontSize: 'var(--font-size-sm)'
    }
  }, /*#__PURE__*/React.createElement("li", null, "Quantidade de cartas: 100 / 100"), /*#__PURE__*/React.createElement("li", null, "Nenhuma carta fora da identidade de cor"))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 var(--space-3)',
      fontSize: 'var(--font-size-lg)'
    }
  }, "Cartas (", rows.length, ")"), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, rows.map(c => /*#__PURE__*/React.createElement("li", {
    key: c.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-2) var(--space-3)',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(CardArt, {
    name: c.name,
    colors: c.colorIdentity,
    radius: "var(--radius-sm)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-1)',
      flex: '1 1 auto',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      fontFamily: 'var(--font-display)'
    }
  }, c.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--font-size-sm)',
      color: 'var(--color-text-muted)'
    }
  }, c.setCode, " #", c.collectorNumber, " \xB7 ", c.typeLine), /*#__PURE__*/React.createElement(ColorIdentity, {
    colors: c.colorIdentity,
    size: "1.25rem"
  })), /*#__PURE__*/React.createElement(StatusBadge, {
    tone: (c.quantity || 0) > 0 ? 'owned' : 'not-owned'
  }, (c.quantity || 0) > 0 ? 'Na coleção' : 'Não possuída'), /*#__PURE__*/React.createElement(Button, null, "Remover")))))));
}

// ---------- Profile ----------
function ProfileScreen({
  colors,
  onToggle
}) {
  const [saved, setSaved] = React.useState(false);
  const section = {
    maxWidth: '32rem',
    margin: '0 0 var(--space-5)',
    padding: 'var(--space-5)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-4) var(--space-5) var(--space-6)',
      overflowY: 'auto',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '0 0 var(--space-5)',
      fontSize: 'var(--font-size-2xl)'
    }
  }, "Perfil"), /*#__PURE__*/React.createElement("section", {
    style: section
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 var(--space-4)',
      fontSize: 'var(--font-size-lg)'
    }
  }, "Conta"), /*#__PURE__*/React.createElement("p", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-1)',
      margin: '0 0 var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-text-muted)',
      fontSize: 'var(--font-size-sm)'
    }
  }, "Email"), /*#__PURE__*/React.createElement("span", null, "rofelix@example.com")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Nome de usu\xE1rio",
    defaultValue: "rofelix"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    touch: true
  }, "Salvar altera\xE7\xF5es")))), /*#__PURE__*/React.createElement("section", {
    style: section
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 var(--space-4)',
      fontSize: 'var(--font-size-lg)'
    }
  }, "Tema"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: 'var(--color-text-muted)',
      fontSize: 'var(--font-size-xs)'
    }
  }, "Escolha at\xE9 3 cores para personalizar a tela de login."), /*#__PURE__*/React.createElement(ColorThemePicker, {
    selected: colors,
    onToggle: onToggle
  }), saved ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: 'var(--role-accent)',
      fontSize: 'var(--font-size-sm)'
    }
  }, "Tema salvo.") : null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    touch: true,
    onClick: () => setSaved(true)
  }, "Salvar tema")))), /*#__PURE__*/React.createElement("section", {
    style: {
      ...section,
      borderColor: 'var(--color-danger)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 var(--space-4)',
      fontSize: 'var(--font-size-lg)',
      color: 'var(--color-danger)'
    }
  }, "Zona de perigo"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 var(--space-3)',
      color: 'var(--color-text-muted)',
      fontSize: 'var(--font-size-sm)'
    }
  }, "Excluir sua conta remove permanentemente seus decks, sua cole\xE7\xE3o e todos os dados associados."), /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    touch: true
  }, "Excluir conta")));
}

// ---------- Auth modal ----------
function AuthModal({
  open,
  onClose,
  colors,
  onToggle,
  onSignIn
}) {
  const [mode, setMode] = React.useState('signIn');
  const [busy, setBusy] = React.useState(false);
  const signUp = mode === 'signUp';
  return /*#__PURE__*/React.createElement(ThemedModal, {
    open: open,
    title: signUp ? 'Cadastrar' : 'Logar',
    onClose: onClose,
    actions: /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      touch: true,
      fullWidth: true,
      onClick: () => {
        setBusy(true);
        setTimeout(() => {
          setBusy(false);
          onSignIn();
        }, 700);
      }
    }, busy ? /*#__PURE__*/React.createElement(Spinner, null) : signUp ? 'Criar conta' : 'Entrar')
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(SegmentedToggle, {
    glow: true,
    options: [{
      value: 'signIn',
      label: 'Logar'
    }, {
      value: 'signUp',
      label: 'Cadastrar'
    }],
    value: mode,
    onChange: setMode
  }), /*#__PURE__*/React.createElement(Input, {
    label: signUp ? 'Email' : 'Email ou nome de usuário',
    defaultValue: "rofelix"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateRows: signUp ? '1fr' : '0fr',
      marginTop: signUp ? 0 : 'calc(var(--space-4) * -1)',
      transition: 'grid-template-rows var(--duration-base) var(--ease-standard), margin-top var(--duration-base) var(--ease-standard)'
    },
    inert: signUp ? undefined : ''
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: 'hidden',
      minHeight: 0,
      visibility: signUp ? 'visible' : 'hidden'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Nome de usu\xE1rio (opcional)"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--font-size-sm)',
      margin: 'var(--space-3) 0 var(--space-1)'
    }
  }, "Identidade (escolha at\xE9 3)"), /*#__PURE__*/React.createElement(ColorThemePicker, {
    selected: colors,
    onToggle: onToggle
  }))), /*#__PURE__*/React.createElement(Input, {
    label: "Senha",
    type: "password",
    defaultValue: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
  })));
}

// ---------- Add-card flow: search dialog -> confirm dialog ----------
function AddCardFlow({
  open,
  onClose,
  onAdded
}) {
  const [step, setStep] = React.useState('search');
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState([]);
  const [query, setQuery] = React.useState('Sol Ring');
  const [picked, setPicked] = React.useState(null);
  const [qty, setQty] = React.useState(1);
  const [sale, setSale] = React.useState(false);
  React.useEffect(() => {
    if (!open) {
      setStep('search');
      setResults([]);
      setPicked(null);
    }
  }, [open]);
  const run = () => {
    setSearching(true);
    setTimeout(() => {
      setResults(D.searchResults);
      setSearching(false);
    }, 500);
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ThemedModal, {
    open: open && step === 'search',
    title: "Buscar carta",
    width: "min(880px, 94vw)",
    onClose: onClose
  }, /*#__PURE__*/React.createElement(SearchToolbar, {
    mode: "name",
    value: query,
    onValueChange: setQuery,
    onSearch: run,
    searching: searching,
    helper: "Digite pelo menos 3 letras para buscar."
  }), results.length === 0 ? /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--color-text-muted)'
    }
  }, searching ? 'Buscando…' : 'Busque por nome, ou por set + número de coletor.') : /*#__PURE__*/React.createElement(CardScatterGrid, {
    cards: results,
    columns: 5,
    seed: 9,
    onSelect: c => {
      setPicked(c);
      setStep('confirm');
    }
  })), /*#__PURE__*/React.createElement(ThemedModal, {
    open: open && step === 'confirm',
    title: picked ? picked.name : '',
    width: "min(880px, 94vw)",
    onClose: onClose,
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      style: {
        marginRight: 'auto'
      },
      onClick: () => setStep('search')
    }, "Voltar"), /*#__PURE__*/React.createElement(Button, {
      touch: true,
      onClick: () => {
        setStep('search');
      }
    }, "Adicionar e buscar outra"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      touch: true,
      onClick: () => onAdded(picked)
    }, "Adicionar"))
  }, picked ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '300px minmax(0,1fr)',
      gap: 'var(--space-6)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(CardArt, {
    name: picked.name,
    colors: picked.colorIdentity,
    radius: "18px"
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Impress\xE3o",
    options: D.searchResults.filter(r => r.name === picked.name).map(r => ({
      value: r.id,
      label: r.setCode + ' · ' + r.collectorNumber + ' · ' + r.setName
    }))
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-3) var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Select, {
    label: "Acabamento",
    options: ['nonfoil (padrão)', 'foil', 'etched']
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Condi\xE7\xE3o",
    options: ['NM (padrão)', 'SP', 'MP', 'HP']
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Idioma",
    options: ['Português', 'English', 'Japanese']
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-1)',
      fontSize: 'var(--font-size-sm)'
    }
  }, "Quantidade", /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'stretch',
      gap: '0.375rem'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    touch: true,
    onClick: () => setQty(q => Math.max(1, q - 1))
  }, "\u2212"), /*#__PURE__*/React.createElement("input", {
    value: qty,
    onChange: e => setQty(Number(e.target.value) || 1),
    style: {
      flex: '1 1 auto',
      minWidth: 0,
      textAlign: 'center',
      font: 'inherit',
      color: 'var(--color-text)',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-sm)'
    }
  }), /*#__PURE__*/React.createElement(Button, {
    touch: true,
    onClick: () => setQty(q => q + 1)
  }, "+"))), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1'
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    label: "\xC0 venda",
    checked: sale,
    onChange: e => setSale(e.target.checked)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Notas",
    as: "textarea",
    rows: 3
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1',
      display: 'flex',
      gap: 'var(--space-3)',
      alignItems: 'center',
      color: 'var(--color-text-muted)',
      fontSize: 'var(--font-size-sm)'
    }
  }, /*#__PURE__*/React.createElement(ColorIdentity, {
    colors: picked.colorIdentity,
    size: "1.25rem"
  }), /*#__PURE__*/React.createElement("span", null, picked.typeLine, " \xB7 ", picked.setName, " \xB7 #", picked.collectorNumber)))) : null));
}
Object.assign(window, {
  HomeScreen,
  CollectionDetailScreen,
  DecksScreen,
  DeckDetailScreen,
  ProfileScreen,
  AuthModal,
  AddCardFlow
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/grimorio-app/Screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/grimorio-app/data.js
try { (() => {
// Stand-in data. No card scans ship with this design system, so CardArt renders
// its placeholder plate; swap in real Scryfall imageUrls when available.
window.GRIMORIO_DATA = {
  locations: [{
    id: 'box-cmd',
    name: 'Caixa Commander',
    count: 412
  }, {
    id: 'binder-blue',
    name: 'Fichário Azul',
    count: 96
  }, {
    id: 'div-a',
    name: 'Divisória A',
    count: 24
  }, {
    id: 'deckbox',
    name: 'Deckbox EDH',
    count: 100
  }, {
    id: 'bulk',
    name: 'Bulk 2024',
    count: 1830
  }],
  decks: [{
    id: 'atraxa',
    name: 'Atraxa Superfriends'
  }, {
    id: 'krenko',
    name: 'Krenko Goblins'
  }, {
    id: 'tymna',
    name: 'Tymna // Kraum'
  }],
  cards: [{
    id: '1',
    name: 'Sol Ring',
    colorIdentity: [],
    quantity: 3,
    setCode: 'MH3',
    collectorNumber: '161',
    finish: 'nonfoil',
    condition: 'NM',
    typeLine: 'Artifact',
    setName: 'Modern Horizons 3'
  }, {
    id: '2',
    name: 'Cyclonic Rift',
    colorIdentity: ['U'],
    quantity: 1,
    setCode: 'RTR',
    collectorNumber: '61',
    finish: 'foil',
    condition: 'NM',
    typeLine: 'Instant',
    setName: 'Return to Ravnica'
  }, {
    id: '3',
    name: "Atraxa, Praetors' Voice",
    colorIdentity: ['W', 'U', 'B', 'G'],
    quantity: 1,
    setCode: 'C16',
    collectorNumber: '28',
    finish: 'nonfoil',
    condition: 'NM',
    typeLine: 'Legendary Creature — Phyrexian Angel Horror',
    setName: 'Commander 2016'
  }, {
    id: '4',
    name: 'Rhystic Study',
    colorIdentity: ['U'],
    quantity: 2,
    setCode: 'PCY',
    collectorNumber: '45',
    finish: 'nonfoil',
    condition: 'SP',
    typeLine: 'Enchantment',
    setName: 'Prophecy'
  }, {
    id: '5',
    name: 'Dockside Extortionist',
    colorIdentity: ['R'],
    quantity: 1,
    setCode: 'C19',
    collectorNumber: '6',
    finish: 'nonfoil',
    condition: 'NM',
    typeLine: 'Creature — Goblin Pirate',
    setName: 'Commander 2019'
  }, {
    id: '6',
    name: 'Vampiric Tutor',
    colorIdentity: ['B'],
    quantity: 1,
    setCode: '6ED',
    collectorNumber: '155',
    finish: 'nonfoil',
    condition: 'MP',
    typeLine: 'Instant',
    setName: 'Classic Sixth Edition'
  }, {
    id: '7',
    name: 'Smothering Tithe',
    colorIdentity: ['W'],
    quantity: 1,
    setCode: 'ELD',
    collectorNumber: '22',
    finish: 'nonfoil',
    condition: 'NM',
    typeLine: 'Enchantment',
    setName: 'Throne of Eldraine'
  }, {
    id: '8',
    name: 'Deflecting Swat',
    colorIdentity: ['R'],
    quantity: 1,
    setCode: 'C20',
    collectorNumber: '39',
    finish: 'nonfoil',
    condition: 'NM',
    typeLine: 'Instant',
    setName: 'Commander 2020'
  }, {
    id: '9',
    name: "Assassin's Trophy",
    colorIdentity: ['B', 'G'],
    quantity: 2,
    setCode: 'GRN',
    collectorNumber: '152',
    finish: 'nonfoil',
    condition: 'NM',
    typeLine: 'Instant',
    setName: 'Guilds of Ravnica'
  }, {
    id: '10',
    name: 'Fierce Guardianship',
    colorIdentity: ['U'],
    quantity: 1,
    setCode: 'C20',
    collectorNumber: '10',
    finish: 'nonfoil',
    condition: 'NM',
    typeLine: 'Instant',
    setName: 'Commander 2020'
  }, {
    id: '11',
    name: "Teferi's Protection",
    colorIdentity: ['W'],
    quantity: 1,
    setCode: 'C17',
    collectorNumber: '18',
    finish: 'nonfoil',
    condition: 'NM',
    typeLine: 'Instant',
    setName: 'Commander 2017'
  }, {
    id: '12',
    name: 'Jeweled Lotus',
    colorIdentity: [],
    quantity: 1,
    setCode: 'CMR',
    collectorNumber: '319',
    finish: 'nonfoil',
    condition: 'NM',
    typeLine: 'Artifact',
    setName: 'Commander Legends'
  }, {
    id: '13',
    name: 'Mystic Remora',
    colorIdentity: ['U'],
    quantity: 1,
    setCode: 'ICE',
    collectorNumber: '68',
    finish: 'nonfoil',
    condition: 'SP',
    typeLine: 'Enchantment',
    setName: 'Ice Age'
  }, {
    id: '14',
    name: 'Farewell',
    colorIdentity: ['W'],
    quantity: 1,
    setCode: 'NEO',
    collectorNumber: '11',
    finish: 'nonfoil',
    condition: 'NM',
    typeLine: 'Sorcery',
    setName: 'Kamigawa: Neon Dynasty'
  }, {
    id: '15',
    name: 'Ragavan, Nimble Pilferer',
    colorIdentity: ['R'],
    quantity: 1,
    setCode: 'MH2',
    collectorNumber: '138',
    finish: 'foil',
    condition: 'NM',
    typeLine: 'Legendary Creature — Monkey Pirate',
    setName: 'Modern Horizons 2'
  }, {
    id: '16',
    name: 'Birds of Paradise',
    colorIdentity: ['G'],
    quantity: 4,
    setCode: 'M12',
    collectorNumber: '165',
    finish: 'nonfoil',
    condition: 'NM',
    typeLine: 'Creature — Bird',
    setName: 'Magic 2012'
  }],
  searchResults: [{
    id: 's1',
    name: 'Sol Ring',
    colorIdentity: [],
    setCode: 'MH3',
    collectorNumber: '161',
    setName: 'Modern Horizons 3',
    typeLine: 'Artifact'
  }, {
    id: 's2',
    name: 'Sol Ring',
    colorIdentity: [],
    setCode: 'C21',
    collectorNumber: '263',
    setName: 'Commander 2021',
    typeLine: 'Artifact'
  }, {
    id: 's3',
    name: 'Sol Talisman',
    colorIdentity: [],
    setCode: 'UST',
    collectorNumber: '52',
    setName: 'Unstable',
    typeLine: 'Artifact'
  }, {
    id: 's4',
    name: 'Soul Ring',
    colorIdentity: ['B'],
    setCode: 'DMR',
    collectorNumber: '99',
    setName: 'Dominaria Remastered',
    typeLine: 'Artifact'
  }, {
    id: 's5',
    name: 'Solemn Simulacrum',
    colorIdentity: [],
    setCode: 'MM3',
    collectorNumber: '224',
    setName: 'Modern Masters 2017',
    typeLine: 'Artifact Creature — Golem'
  }, {
    id: 's6',
    name: 'Solar Transformer',
    colorIdentity: ['W', 'U'],
    setCode: 'BRO',
    collectorNumber: '241',
    setName: "The Brothers' War",
    typeLine: 'Artifact'
  }, {
    id: 's7',
    name: 'Sol Grail',
    colorIdentity: [],
    setCode: 'ROE',
    collectorNumber: '222',
    setName: 'Rise of the Eldrazi',
    typeLine: 'Artifact'
  }, {
    id: 's8',
    name: 'Solphim, Mayhem Dominus',
    colorIdentity: ['R'],
    setCode: 'ONE',
    collectorNumber: '146',
    setName: 'Phyrexia: All Will Be One',
    typeLine: 'Legendary Creature — Phyrexian Devil'
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/grimorio-app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.AuthControl = __ds_scope.AuthControl;

__ds_ns.NavBar = __ds_scope.NavBar;

__ds_ns.NavDrawer = __ds_scope.NavDrawer;

__ds_ns.ThemeScope = __ds_scope.ThemeScope;

__ds_ns.ThemedModal = __ds_scope.ThemedModal;

__ds_ns.ViewHeader = __ds_scope.ViewHeader;

__ds_ns.CardRowList = __ds_scope.CardRowList;

__ds_ns.CardScatterGrid = __ds_scope.CardScatterGrid;

__ds_ns.DashboardPanel = __ds_scope.DashboardPanel;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.EntityList = __ds_scope.EntityList;

__ds_ns.LocationStrip = __ds_scope.LocationStrip;

__ds_ns.SearchToolbar = __ds_scope.SearchToolbar;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.FusedBar = __ds_scope.FusedBar;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SegmentedToggle = __ds_scope.SegmentedToggle;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Spinner = __ds_scope.Spinner;

__ds_ns.CardArt = __ds_scope.CardArt;

__ds_ns.ColorIdentity = __ds_scope.ColorIdentity;

__ds_ns.IDENTITY = __ds_scope.IDENTITY;

__ds_ns.ColorThemePicker = __ds_scope.ColorThemePicker;

__ds_ns.ManaSymbol = __ds_scope.ManaSymbol;

})();
