// Entry modal (profiles + cloud account) — recreation of the shipped blueprint. Copy from design_brief/entry-copy.ts.
const { ThemedModal, IdentityChip, ProfileRow, TextField, Button, LinkButton, Plate, SyncLine, Eyebrow, Identity } = window.GrimorioDesignSystem_1934c9;
const IdentityWheel = window.GrimorioWheel || window.GrimorioDesignSystem_1934c9.IdentityWheel;

function Prompt({ ask, cta, onClick }) {
  return <><span>{ask}</span><LinkButton onClick={onClick}>{cta}</LinkButton></>;
}

function EntryModal({ layout, profiles, setProfiles, active, setActive, onClose }) {
  const mobile = layout === 'mobile';
  const [phase, setPhase] = React.useState('list');
  const [sel, setSel] = React.useState(null);
  const [hover, setHover] = React.useState(null);
  const [f, setF] = React.useState({ name: '', pw: '', email: '' });
  const [err, setErr] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(null);
  const [picks, setPicks] = React.useState(['R']);
  const [sync, setSync] = React.useState('pending');
  const [notice, setNotice] = React.useState(null);
  const byName = (n) => profiles.find((p) => p.name === n);
  const activeP = active ? byName(active) : null;
  const selP = sel ? byName(sel) : null;
  const go = (p) => { setPhase(p); setErr({}); setF((x) => ({ ...x, pw: '' })); setBusy(false); };
  const set = (k) => (v) => { setF((x) => ({ ...x, [k]: v })); setErr((e) => ({ ...e, [k]: undefined, form: undefined })); };
  const run = (ms, fn) => { setBusy(true); setTimeout(() => { setBusy(false); fn(); }, ms); };
  const finish = (d) => { setDone(d); setPhase('done'); setSync('pending'); setTimeout(() => setSync('done'), 1600); };

  // Colors in view (STATES.md → Colors column)
  let view = null;
  if (phase === 'list') view = hover ? byName(hover) : activeP;
  else if (phase === 'profile') view = { name: f.name, colors: picks };
  else if (['unlock', 'linkedreset', 'localreset-warn', 'localreset-newpw'].includes(phase)) view = selP;
  else if (phase === 'done') view = done && done.profile;
  else view = activeP;
  const roles = view ? view.colors : [];
  const tribe = view ? Identity.tribeName(view.colors) : '';

  let title, subtitle, body, prompt, caption = 'Cada perfil tem sua coleção, seus decks e suas cores.';
  if (phase === 'list') {
    const ordered = activeP ? [activeP, ...profiles.filter((p) => p !== activeP)] : profiles;
    title = activeP ? 'Trocar de perfil' : 'Escolha um perfil';
    subtitle = activeP ? 'Você está usando ' + activeP.name + '. Escolha outro perfil e digite a senha.' : 'Perfis neste aparelho. Toque em um e digite a senha.';
    body = <>
      {notice ? <Plate role="status">{notice}</Plate> : null}
      <div className="grm-list" role="list" onMouseLeave={() => setHover(null)}>
        {ordered.map((p) => <ProfileRow key={p.name} profile={p} active={p.name === active}
          onMouseEnter={() => setHover(p.name)} onFocus={() => setHover(p.name)}
          onClick={() => { setSel(p.name); go('unlock'); }} />)}
        <ProfileRow dashed onMouseEnter={() => setHover(null)} onFocus={() => setHover(null)} onClick={() => { setF({ name: '', pw: '', email: f.email }); setPicks(['R']); go('profile'); }} />
      </div>
      {activeP ? <Button block disabled={busy} onClick={() => run(700, () => { setNotice('Você saiu de ' + activeP.name + '. Os dados desse perfil ficaram ocultos.'); setActive(null); })}>{busy ? 'Saindo…' : 'Sair de ' + activeP.name}</Button> : null}
    </>;
    prompt = <Prompt ask="Perfil em outro aparelho?" cta="Entrar com conta na nuvem" onClick={() => go('in')} />;
  } else if (phase === 'unlock') {
    title = selP.name;
    subtitle = tribe + ' · ' + (selP.linked ? 'Vinculado à nuvem' : 'Só neste aparelho');
    body = <>
      <TextField label="Senha" type="password" autoComplete="current-password" value={f.pw} onChange={set('pw')} error={err.pw} />
      <div><LinkButton onClick={() => go(selP.linked ? 'linkedreset' : 'localreset-warn')}>Esqueci minha senha</LinkButton></div>
      <Button variant="primary" block disabled={busy} onClick={() => {
        if (!f.pw) return setErr({ pw: 'Digite sua senha.' });
        if (f.pw.length < 8) return run(500, () => setErr({ pw: 'Senha incorreta.' }));
        run(800, () => { const prev = active; setActive(selP.name); setNotice(null);
          finish(prev && prev !== selP.name ? { title: 'Perfil trocado', body: selP.name + ' está ativo. Os dados de ' + prev + ' ficaram ocultos.', profile: selP, sync: selP.linked }
            : { title: 'Perfil desbloqueado', body: selP.name + ' está ativo neste aparelho.', profile: selP, sync: selP.linked }); });
      }}>{busy ? 'Desbloqueando…' : 'Desbloquear'}</Button>
    </>;
    prompt = <Prompt ask="Não é você?" cta="Trocar de perfil" onClick={() => go('list')} />;
  } else if (phase === 'localreset-warn') {
    title = 'Redefinir senha';
    subtitle = selP.name + ' não tem conta na nuvem, então qualquer pessoa que use este aparelho pode redefinir a senha dele. Os dados continuam intactos.';
    caption = 'Redefinir a senha não apaga nada.';
    body = <div className="grm-btn-row"><Button variant="primary" onClick={() => go('localreset-newpw')}>Entendi, redefinir</Button><Button variant="ghost" onClick={() => go('unlock')}>Cancelar</Button></div>;
  } else if (phase === 'linkedreset') {
    title = 'Redefinir senha do perfil';
    subtitle = selP.name + ' está vinculado à nuvem. Confirme a senha da conta para criar uma nova senha do perfil neste aparelho.';
    caption = 'Redefinir a senha não apaga nada.';
    body = <>
      <div className="plate"><span className="micro-label">Conta na nuvem</span><span>{selP.name + '@exemplo.com'}</span></div>
      <TextField label="Senha da conta" type="password" autoComplete="current-password" value={f.pw} onChange={set('pw')} error={err.pw} />
      <div><LinkButton onClick={() => go('reset-email')}>Esqueci a senha da conta</LinkButton></div>
      {err.form ? <p className="grm-form-error" role="alert">{err.form}</p> : null}
      <div className="grm-btn-row" style={{ justifyContent: 'flex-end', flexDirection: mobile ? 'column-reverse' : 'row' }}>
        <Button variant="ghost" onClick={() => go('unlock')}>Cancelar</Button>
        <Button variant="primary" disabled={busy} onClick={() => {
          if (!f.pw) return setErr({ pw: 'Digite sua senha.' });
          run(900, () => { if (f.pw.length < 8) return setErr({ form: 'E-mail ou senha incorretos.' }); go('localreset-newpw'); });
        }}>{busy ? 'Confirmando…' : 'Continuar'}</Button>
      </div>
    </>;
  } else if (phase === 'localreset-newpw') {
    title = 'Nova senha do perfil';
    subtitle = 'Crie uma nova senha para ' + selP.name + '.';
    caption = 'Redefinir a senha não apaga nada.';
    body = <>
      <TextField label="Nova senha do perfil" type="password" autoComplete="new-password" value={f.pw} onChange={set('pw')} helper="Pelo menos 8 caracteres." error={err.pw} />
      <Button variant="primary" block disabled={busy} onClick={() => {
        if (f.pw.length < 8) return setErr({ pw: 'Use pelo menos 8 caracteres.' });
        run(700, () => { setActive(selP.name); finish({ title: 'Perfil desbloqueado', body: selP.name + ' está ativo com todos os dados intactos.', profile: selP }); });
      }}>{busy ? 'Salvando…' : 'Salvar e desbloquear'}</Button>
    </>;
  } else if (phase === 'profile') {
    title = 'Criar perfil';
    subtitle = 'Seu perfil fica neste aparelho e funciona sem internet — sem e-mail.';
    caption = 'Escolha até 3 cores. A primeira tinge o app inteiro — dá para mudar depois.';
    body = <>
      <TextField label="Nome do perfil" autoComplete="username" value={f.name} onChange={set('name')} helper="3 a 20 caracteres: letras, números, _ . ou -" error={err.name} />
      <TextField label="Senha" type="password" autoComplete="new-password" value={f.pw} onChange={set('pw')} helper="Pelo menos 8 caracteres. Funciona sem internet." error={err.pw} />
      {mobile ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
        <Eyebrow>Sua identidade</Eyebrow>
        <IdentityWheel mode="picker" picks={picks} onChange={setPicks} size={240} subline={f.name || undefined} />
        <span className="field__helper" style={{ textAlign: 'center' }}>Escolha até 3 cores. A primeira tinge o app inteiro — dá para mudar depois.</span>
      </div> : null}
      <Button variant="primary" block disabled={busy} onClick={() => {
        const e = {};
        if (f.name.length < 3 || f.name.length > 20) e.name = 'Use de 3 a 20 caracteres.';
        else if (!/^[A-Za-z0-9_.-]+$/.test(f.name)) e.name = 'Use só letras, números, _ . ou -.';
        else if (byName(f.name) || profiles.some((p) => p.name.toLowerCase() === f.name.toLowerCase())) e.name = 'Esse nome já está em uso neste aparelho.';
        if (f.pw.length < 8) e.pw = 'Use pelo menos 8 caracteres.';
        if (Object.keys(e).length) return setErr(e);
        run(900, () => { const np = { name: f.name, colors: picks, linked: false }; setProfiles((ps) => ps.concat(np)); setActive(np.name); setSel(np.name);
          finish({ title: 'Perfil criado', body: np.name + ' está ativo neste aparelho. Se quiser, vincule uma conta na nuvem para sincronizar — é opcional.', profile: np, link: true }); });
      }}>{busy ? 'Criando perfil…' : 'Criar perfil'}</Button>
    </>;
    prompt = <Prompt ask="Já tem um perfil aqui?" cta="Ver perfis" onClick={() => go('list')} />;
  } else if (phase === 'in' || phase === 'up') {
    const up = phase === 'up';
    title = up ? 'Criar conta na nuvem' : 'Entrar na conta';
    subtitle = up ? (activeP ? activeP.name : 'Seu perfil') + ' passa a sincronizar automaticamente entre aparelhos.'
      : activeP ? 'Vincule ' + activeP.name + ' a uma conta na nuvem para sincronizar entre aparelhos.' : 'Traga sua coleção da nuvem para este aparelho.';
    caption = 'Opcional — a conta na nuvem sincroniza este perfil entre aparelhos. O app funciona sem ela.';
    body = <>
      <TextField label="E-mail" type="email" autoComplete="email" placeholder="voce@exemplo.com" value={f.email} onChange={set('email')} error={err.email} />
      <TextField label="Senha" type="password" autoComplete={up ? 'new-password' : 'current-password'} value={f.pw} onChange={set('pw')} helper={up ? 'Pelo menos 8 caracteres.' : undefined} error={err.pw} />
      {!up ? <div><LinkButton onClick={() => go('reset-email')}>Esqueci minha senha</LinkButton></div> : null}
      {err.form ? <p className="grm-form-error" role="alert">{err.form}</p> : null}
      <Button variant="primary" block disabled={busy} onClick={() => {
        const e = {};
        if (!f.email) e.email = 'Digite seu e-mail.'; else if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Esse e-mail não parece válido.';
        if (!f.pw) e.pw = 'Digite sua senha.'; else if (up && f.pw.length < 8) e.pw = 'Use pelo menos 8 caracteres.';
        if (Object.keys(e).length) return setErr(e);
        run(900, () => {
          if (!up && f.pw.length < 8) return setErr({ form: 'E-mail ou senha incorretos.' });
          const p = activeP || profiles[0];
          setProfiles((ps) => ps.map((x) => (x === p ? { ...x, linked: true } : x)));
          finish(up ? { title: 'Conta criada', body: p.name + ' agora sincroniza com ' + f.email + '. Suas cores foram salvas na conta.', profile: p, sync: true }
            : { title: 'Conta vinculada', body: p.name + ' agora sincroniza com ' + f.email + '.', profile: p, sync: true });
        });
      }}>{busy ? (up ? 'Criando conta…' : 'Entrando…') : (up ? 'Criar conta' : 'Entrar')}</Button>
    </>;
    prompt = up ? <Prompt ask="Já tem conta?" cta="Entrar" onClick={() => go('in')} />
      : activeP ? <Prompt ask="Ainda não tem conta na nuvem?" cta="Criar conta" onClick={() => go('up')} />
      : <Prompt ask="Já tem um perfil aqui?" cta="Ver perfis" onClick={() => go('list')} />;
  } else if (phase === 'reset-email') {
    title = 'Recuperar senha';
    subtitle = 'Digite o e-mail da conta. Um código de 6 dígitos chega em alguns minutos.';
    body = <>
      <TextField label="E-mail" type="email" autoComplete="email" placeholder="voce@exemplo.com" value={f.email} onChange={set('email')} error={err.email} />
      <Button variant="primary" block disabled={busy} onClick={() => { if (!f.email) return setErr({ email: 'Digite seu e-mail.' }); run(800, () => go('in')); }}>{busy ? 'Enviando…' : 'Enviar código'}</Button>
    </>;
    prompt = <Prompt ask="Lembrou a senha?" cta="Voltar" onClick={() => go('in')} />;
  } else if (phase === 'done') {
    title = done.title;
    caption = '';
    body = <>
      <p style={{ margin: 0 }}>{done.body}</p>
      {done.sync ? <SyncLine state={sync} label={sync === 'done' ? 'Sincronizado agora' : 'Sincronizando…'} /> : null}
      <Button variant="primary" block onClick={onClose}>Concluir</Button>
      {done.link ? <Button block onClick={() => go('up')}>Vincular conta na nuvem</Button> : null}
    </>;
  }

  const aside = phase === 'profile'
    ? <IdentityWheel mode="picker" picks={picks} onChange={setPicks} subline={f.name || undefined} />
    : view ? <IdentityWheel picks={view.colors} subline={view.name} /> : <IdentityWheel neutral />;
  const chip = view && view.name ? <IdentityChip colors={view.colors} label={view.name + ' · ' + tribe} /> : null;

  return <ThemedModal inline={mobile} layout={layout} roles={roles} aside={aside} caption={caption} title={title} subtitle={subtitle} prompt={prompt} chip={chip} onClose={onClose}>{body}</ThemedModal>;
}
Object.assign(window, { EntryModal });
