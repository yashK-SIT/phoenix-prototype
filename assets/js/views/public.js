// ---------- PUBLIC: F01 access ----------
const PUB = {};
const authWrap = (inner, wide) =>
  `<div class="auth"><aside class="auth-side"><div class="brand"><span class="mark">${MARK(22)}</span><span class="wm"><b>PHOENIX</b><span>Foundation Alpha</span></span></div><div class="col auth-story"><p class="auth-lead">From purpose to <em>collaboration</em>, action, evidence and learning.</p><p class="auth-copy">One account across every programme you take part in. You decide what is shared, with whom, and for what purpose.</p><ol class="auth-path" aria-label="How a project moves through PHOENIX"><li class="k-circle"><span class="n">1</span><b>Circle</b><span>Agree the problem and the scope together.</span></li><li class="k-rope"><span class="n">2</span><b>Rope Team</b><span>A mentor helps the team get the requirements right.</span></li><li class="k-room"><span class="n">3</span><b>Action Room</b><span>Plan the work, deliver it and record the evidence.</span></li></ol></div><div class="col auth-notes"><div class="row">${ic('shield', 16)}<span>No personal information is public by default.</span></div><div class="row">${ic('lock', 16)}<span>AI, research and sharing permissions are separate and optional.</span></div></div></aside><main class="auth-main"><div class="mhead"><span class="mark">${MARK(20)}</span><span class="wm"><b>PHOENIX</b><span>Foundation Alpha</span></span></div><section class="auth-card ${wide ? 'wide' : ''}">${inner}</section><p class="cap auth-foot">Prototype · data is stored only in this browser · <a href="#" class="cap" data-a="resetDemo">Reset demo data</a></p></main></div>`;
const DEMO = [
  ['p1', 'a1', 'Participant (2 contexts)'],
  ['p2', 'a2', 'Facilitator / Steward + Reviewer'],
  ['p3', 'a3', 'Mentor (+ Participant in Seva Hub)'],
  ['p4', 'a4', 'Partner / Collaborator'],
  ['p5', 'a5', 'Organization Representative'],
  ['p6', 'a6', 'Sponsor / Funder'],
  ['p7', 'a7', 'Programme Admin + specialist bundles'],
  ['p8', 'a8', 'Platform Administrator'],
  ['p11', 'a11', 'Participant — onboarding unfinished'],
  ['p12', 'a12', 'Mentor — role awaiting approval'],
];
PUB.login = () => {
  const f = 'login';
  const st = UI.p.state;
  return authWrap(`
 <div class="col auth-h"><h1 class="h1">Sign in</h1><p class="sub">One account for every PHOENIX programme you belong to.</p></div>
 ${UI.pre?.addRole ? banner('info', 'Sign in to add your new role', 'We will add the ' + ROLE[UI.pre.addRole.role] + ' role to your existing record. No second account is created.') : ''}
 ${st === 'failed' ? banner('err', 'Email or password is incorrect', 'Check your details and try again, or reset your password.') : ''}
 ${st === 'locked' ? banner('err', 'Account temporarily locked', 'Too many failed attempts. Try again in 15 minutes or reset your password.') : ''}
 ${st === 'deactivated' ? banner('err', 'This account is deactivated', 'Contact your programme administrator.') : ''}
 <form data-f="login" class="col auth-form" novalidate>
 ${fi(f, 'email', 'Email address', { type: 'email', req: true, ph: 'name@organisation.org', auto: 'email' })}
 ${fi(f, 'pw', 'Password', { type: 'password', req: true, auto: 'current-password' })}
 <div class="row auth-keep"><label class="row"><input class="chk" type="checkbox" name="keep">Keep me signed in</label>${L('Forgot password?', 'forgot', {}, 'cap lnk')}</div>
 <button class="btn btn-p btn-block" type="submit">Sign in</button></form>
 <div class="divider">or</div>
 <div class="col auth-alt"><p>New to PHOENIX? ${L('Create an account', 'register')}</p><p class="cap">Participants and Sponsors can register directly. Every other role joins by invitation.</p>${B(ic('mail', 16) + 'I have an invitation link', 'go', { r: 'invite' }, 'btn-s')}</div>
 ${B(ic('link', 16) + 'Arrive from the LMS (demo deep link)', 'go', { r: 'lms' }, 'btn-g btn-sm')}<details class="auth-demo"><summary>Demo accounts (password: demo1234)</summary><p class="cap">One-click demo sign-in skips two-step verification. Signing in with email and password as an administrator asks for a code (use 123456).</p><div class="col auth-demo-l">${DEMO.map(([pid, aid, l]) => `<button type="button" class="demo-acc" data-a="demoLogin" data-pid="${pid}"><span class="av">${ini(pid)}</span><span class="col demo-acc-t"><b>${nm(pid)}</b><span class="cap">${l}</span></span>${ic('chevr', 16)}</button>`).join('')}</div></details>`);
};
let fails = {};
function startSession(p, mfaDone) {
  const list = S.assign.filter(a => a.pid === p.id);
  let a = list.find(x => x.status === 'Active') || list[0];
  if (UI.pre?.mfaPid) delete UI.pre.mfaPid;
  if (UI.pre?.addRole && UI.pre.addRole.email === p.email) {
    const r = UI.pre.addRole;
    const na = {
      id: uid('a'),
      pid: p.id,
      role: r.role,
      ctx: r.ctx,
      status: roleNeedsApproval(roleBase(r.role)) && !(r.inv && byId('invites', r.inv)?.preApproved) ? 'Pending role approval' : 'Active',
      bundles: [],
      onb: { agreement: false, consents: false, profile: true, compass: roleBase(r.role) !== 'P' },
    };
    if (r.inv && byId('invites', r.inv)?.until) na.until = byId('invites', r.inv).until;
    const piv = r.inv && byId('invites', r.inv);
    if (piv && piv.preApproved) na.approval = [{ at: now(), by: piv.preApproved, note: 'Appointed by the Platform Administrator' }];
    if (piv && piv.org && !p.org) p.org = piv.org;
    S.assign.push(na);
    if (r.inv) {
      const iv = byId('invites', r.inv);
      iv.status = 'Accepted';
    }
    if (na.status !== 'Active') {
      S.assign
        .filter(x => roleBase(x.role) === 'A')
        .forEach(x =>
          notify(x.pid, `Role approval requested: ${p.name} — ${ROLE[r.role]}`, 'admin', { tab: 'approvals' }),
        );
      na.approval = [{ at: now(), by: 'system', note: 'Sensitive role — approval requested' }];
    }
    audit('Scoped role added to existing record', p.id, ROLE[r.role] + ' · ' + r.ctx);
    a = na.status === 'Active' ? na : a;
    UI.pre = null;
    toast(
      `${ROLE[r.role]} role added to your existing account${na.status !== 'Active' ? ' — awaiting approval' : ''}.`,
    );
  }
  const keep = UI.pre;
  resetUI();
  UI.pre = keep && keep.addRole ? null : keep;
  S.session = { pid: p.id, aid: a.id };
  audit('Signed in', 'session', p.email);
  save();
  go('home');
}
F.login = d => {
  if (!validate('login', d, { email: ['req', 'email'], pw: ['req'] })) return render();
  const p = S.people.find(x => x.email.toLowerCase() === d.email.trim().toLowerCase());
  if (!p || S.pw[p.id] !== d.pw) {
    fails[d.email] = (fails[d.email] || 0) + 1;
    audit('Sign-in failed', d.email, 'Wrong credentials', 'denied');
    UI.p = { state: fails[d.email] >= 5 ? 'locked' : 'failed' };
    return render();
  }
  if (p.status === 'Deactivated') {
    UI.p = { state: 'deactivated' };
    return render();
  }
  if (!p.verified) {
    UI.pre = { verifyPid: p.id };
    return go('verify');
  }
  clearF('login');
  if (S.assign.some(a => a.pid === p.id && ['A', 'T'].includes(roleBase(a.role)) && a.status === 'Active')) {
    UI.pre = { ...(UI.pre || {}), mfaPid: p.id };
    return go('mfa');
  }
  startSession(p);
};
A.demoLogin = d => {
  clearF('login');
  startSession(P(d.pid));
};
PUB.forgot = () =>
  authWrap(
    UI.p.sent
      ? `<h1 class="h1">Check your email</h1><p class="muted">If an account exists for that address, we have sent a reset link. It expires in 30 minutes.</p>${B('Back to sign in', 'go', { r: 'login' }, 'btn-s')}`
      : `<h1 class="h1">Reset your password</h1><form data-f="forgot" class="col auth-form" novalidate>${fi('forgot', 'email', 'Email address', { type: 'email', req: true })}<button class="btn btn-p btn-block" type="submit">Send reset link</button></form>${L('Back to sign in', 'login')}`,
  );
F.forgot = d => {
  if (!validate('forgot', d, { email: ['req', 'email'] })) return render();
  audit('Password reset requested', d.email, '');
  go('forgot', { sent: 1 });
};
// Register (D-01: Participant or Sponsor only). There is no programme choice: people join the default programme.
const defaultCtx = () => S.settings.defaultCtx || (S.contexts.find(c => c.kind !== 'Platform' && c.status === 'Active') || {}).id;
const selfRole = r => (['P', 'S'].includes(r) ? r : 'P');
PUB.register = () => {
  const f = 'reg';
  const inv = UI.pre?.invite ? byId('invites', UI.pre.invite) : null;
  const r = fv(f, 'role', inv ? inv.role : 'P');
  const exists = UI.p.exists;
  return authWrap(
    `<div class="col auth-h"><p class="over">Step 1 · Account</p><h1 class="h1">Create your account</h1><p class="sub">We only ask for what is needed to start. Everything else is asked later, in context.</p></div>
 ${inv ? banner('ok', 'Invitation verified', `You are joining as <b>${ROLE[inv.role]}</b>. Your email comes from the invitation and cannot be changed here.`) : ''}
 ${exists ? banner('info', 'This email already has a PHOENIX account', 'Sign in and we will add this role to your existing record. No second account is created.') + B('Sign in to continue', 'go', { r: 'login' }, 'btn-p btn-sm') : ''}
 ${errSum(f)}
 <form data-f="reg" class="col auth-form" novalidate>
 ${
   inv
     ? `<input type="hidden" name="role" value="${inv.role}">`
     : `<fieldset class="col auth-fs"><legend class="lbl">I am joining as <span class="req">*</span></legend><div class="f2">${[
         ['P', 'Participant', 'Learner or practitioner. Set your purpose, join Circles, work on projects.'],
         ['S', 'Sponsor / Funder', 'Fund projects stage by stage, sponsor seats or donate.'],
       ]
         .map(
           ([v, t, dsc]) =>
             `<label class="choice ${r === v ? 'sel' : ''}"><input type="radio" name="role" value="${v}" ${r === v ? 'checked' : ''} style="position:absolute;opacity:0" data-ch="regRole"><span class="rad"></span><span class="col choice-t"><b>${t}</b><span class="cap">${dsc}</span></span></label>`,
         )
         .join(
           '',
         )}</div><p class="cap">Facilitators, Mentors, Partners and Organization Representatives join by invitation only.</p></fieldset>`
 }
 <div class="f2">${fi(f, 'name', 'Full name', { req: true, auto: 'name', vis: 'You and authorised administration' })}${fi(f, 'display', 'Display name', { req: true, vis: 'Your collaboration contexts' })}</div>
 ${inv ? fi(f, 'email', 'Email address', { value: inv.email, ro: true, help: 'From your invitation' }) : fi(f, 'email', 'Email address', { type: 'email', req: true, auto: 'email', help: 'We will send a verification link to this address.' })}
 <div class="f2">${fi(f, 'pw', 'Password', { type: 'password', req: true, auto: 'new-password' })}${fi(f, 'pw2', 'Confirm password', { type: 'password', req: true, auto: 'new-password' })}</div>
 <p class="help auth-pwhelp">At least 10 characters, including a number. ${assumed('policy for Technical Operator to confirm')}</p>
 <button class="btn btn-p btn-block" type="submit">Create account</button></form>
 <p class="cap">Already have an account? ${L('Sign in', 'login')}</p>`,
    true,
  );
};
A.regRole = (d, el) => {
  UI.form.reg = { ...(UI.form.reg || {}), role: el.value };
  render();
};
F.reg = d => {
  const inv = UI.pre?.invite ? byId('invites', UI.pre.invite) : null;
  if (inv) d.email = inv.email;
  const okv = validate('reg', d, {
    role: ['req'],
    name: ['req'],
    display: ['req'],
    email: ['req', 'email'],
    pw: [
      'req',
      [
        'fn',
        { f: v => v.length >= 10 && /\d/.test(v), m: 'Password must be at least 10 characters and include a number.' },
      ],
    ],
    pw2: ['req', ['fn', { f: (v, dd) => v === dd.pw, m: 'Passwords do not match.' }]],
  });
  if (!okv) return render();
  const ex = S.people.find(p => p.email.toLowerCase() === d.email.toLowerCase());
  if (ex) {
    UI.pre = { addRole: { email: ex.email, role: inv ? inv.role : selfRole(d.role), ctx: inv ? inv.ctx : defaultCtx(), inv: inv?.id } };
    UI.p = { exists: 1 };
    audit('Registration matched existing record', ex.id, 'Role to be added on sign-in');
    return render();
  }
  const p = {
    id: uid('p'),
    name: d.name.trim(),
    display: d.display.trim(),
    email: d.email.trim(),
    verified: false,
    status: 'Active',
    ...(inv && inv.org ? { org: inv.org } : {}),
  };
  S.people.push(p);
  S.pw[p.id] = d.pw;
  // The role comes from the invitation, never from the form; without one only Participant or Sponsor is possible.
  const role = inv ? inv.role : selfRole(d.role),
    cx = inv ? inv.ctx : defaultCtx();
  const a = {
    id: uid('a'),
    pid: p.id,
    role,
    ctx: cx,
    status: 'Registered (email unverified)',
    bundles: [],
    onb: { agreement: false, consents: false, profile: false, compass: role !== 'P' },
    ...(inv && inv.until ? { until: inv.until } : {}),
    ...(inv && inv.preApproved ? { preApproved: inv.preApproved } : {}),
  };
  S.assign.push(a);
  S.consents[p.id] = { history: [] };
  if (inv) {
    inv.status = 'Accepted';
    audit('Invitation accepted', inv.id, p.email);
  }
  audit('Account registered', p.id, ROLE[role] + ' · ' + cx);
  clearF('reg');
  UI.pre = { verifyPid: p.id, aid: a.id };
  save();
  go('verify');
};
// Invitation link
PUB.invite = () => {
  const tok = UI.p.token;
  const inv = tok ? S.invites.find(i => i.token === tok.trim()) : null;
  if (!tok)
    return authWrap(
      `<h1 class="h1">Open your invitation</h1><p class="muted">Paste the code from your invitation email, or open the link in the email directly.</p><form data-f="tok" class="col auth-form" novalidate>${fi('tok', 'token', 'Invitation code', { req: true, ph: 'TKN-…' })}<button class="btn btn-p btn-block" type="submit">Continue</button></form><div class="col auth-codes"><span class="cap">Demo codes:</span><div class="row wrap">${S.invites.map(i => `<button class="chip auth-chip" type="button" data-a="go" data-r="invite" data-token="${i.token}">${i.token}</button>`).join('')}<button class="chip auth-chip" type="button" data-a="go" data-r="invite" data-token="TKN-UNKNOWN">TKN-UNKNOWN</button></div></div>${L('Back to sign in', 'login')}`,
    );
  const bad = !inv
    ? 'This link is not valid'
    : inv.status === 'Expired' || (inv.expires < today() && inv.status === 'Pending')
      ? 'This invitation has expired'
      : inv.status === 'Revoked'
        ? 'This invitation was withdrawn'
        : inv.status === 'Accepted'
          ? 'This link has already been used'
          : null;
  if (bad) {
    if (!UI.p.logged) {
      audit('Invitation link denied', tok, bad, 'denied');
      UI.p.logged = 1;
      save();
    }
    if (UI.p.requested)
      return authWrap(
        `<span class="tile t-teal auth-ic" aria-hidden="true">${ic('check', 22)}</span><h1 class="h1">Request sent</h1><p class="muted">We have asked the administrator for this context to send you a new invitation.</p>${B('Back to sign in', 'go', { r: 'login' }, 'btn-s')}`,
      );
    return authWrap(
      `<h1 class="h1">Invitation link not valid</h1>${banner('err', bad, inv?.status === 'Accepted' ? 'Each invitation link works once. If it was you, sign in instead.' : 'Ask for a new invitation below. For your security, this attempt has been recorded.')}${inv?.status === 'Accepted' ? B('Sign in', 'go', { r: 'login' }, 'btn-s') : ''}<form data-f="reinv" class="col auth-form" novalidate>${fi('reinv', 'email', 'Your email address', { type: 'email', req: true, value: inv?.email })}${fi('reinv', 'msg', 'Message to the administrator', { type: 'textarea', rows: 3 })}<button class="btn btn-p btn-block" type="submit">Request a new invitation</button></form>`,
    );
  }
  const c = S.contexts.find(x => x.id === inv.ctx);
  const exists = S.people.find(p => p.email === inv.email);
  return authWrap(`<span class="tile t-teal auth-ic" aria-hidden="true">${ic('mail', 22)}</span><div class="col auth-h"><h1 class="h1">You have been invited</h1><p class="sub">Review the details, then continue.</p></div>
 <div class="auth-box">${dl([
   ['Context', h(c.name)],
   ['Role', pill(ROLE[inv.role], 'p-purple')],
   ['Invited by', nm(inv.by)],
   ['Email', h(inv.email)],
   ['Valid until', fmt(inv.expires)],
 ])}</div>
 ${inv.preApproved ? banner('info', 'Already approved', 'The Platform Administrator appointed you to this role. It is active as soon as your account is set up.') : roleNeedsApproval(roleBase(inv.role)) ? banner('warn', 'This role needs approval', 'After you register, an authorised approver must approve it before it becomes active.') : ''}
 ${exists ? banner('info', 'You already have a PHOENIX account', 'Sign in and this role is added to your existing record.') + B('Sign in to accept', 'acceptInvExisting', { id: inv.id }, 'btn-p btn-block') : B('Accept and create account', 'acceptInv', { id: inv.id }, 'btn-p btn-block')}
 <p class="cap">This link works once.</p>`);
};
F.tok = d => {
  if (!validate('tok', d, { token: ['req'] })) return render();
  go('invite', { token: d.token.trim() });
};
F.reinv = d => {
  if (!validate('reinv', d, { email: ['req', 'email'] })) return render();
  S.assign
    .filter(a => roleBase(a.role) === 'A')
    .forEach(a => notify(a.pid, `New invitation requested by ${d.email}`, 'admin', { tab: 'invites' }));
  audit('New invitation requested', d.email, d.msg || '');
  save();
  UI.p.requested = 1;
  render();
};
A.acceptInv = d => {
  UI.pre = { invite: d.id };
  clearF('reg');
  go('register');
};
A.acceptInvExisting = d => {
  const inv = byId('invites', d.id);
  UI.pre = { addRole: { email: inv.email, role: inv.role, ctx: inv.ctx, inv: inv.id } };
  go('login');
};
// Verify email
PUB.verify = () => {
  const pid = UI.pre?.verifyPid;
  const p = pid && P(pid);
  if (!p || !p.email) return PUB.login();
  const st = UI.p.state;
  if (st === 'expired')
    return authWrap(
      `<h1 class="h1">Verification link expired</h1>${banner('warn', 'This link is no longer valid', 'Send yourself a new one. Your details are saved.')}${B('Send a new link', 'resendVer', {}, 'btn-p btn-block')}`,
    );
  return authWrap(`<span class="tile t-navy auth-ic" aria-hidden="true">${ic('mail', 22)}</span><div class="col auth-h"><h1 class="h1">Check your email</h1><p class="sub">We sent a verification link to <b>${h(p.email)}</b>.</p></div>
 ${UI.p.resent ? banner('ok', 'New link sent', 'Earlier links no longer work.') : ''}
 <div class="auth-box col"><span class="over">Prototype — simulate the email</span><div class="row wrap">${B('Open verification link', 'doVerify', {}, 'btn-p btn-sm')}${B('Open an expired link', 'go', { r: 'verify', state: 'expired' }, 'btn-s btn-sm')}</div></div>
 ${B('Resend verification email', 'resendVer', {}, 'btn-s btn-block')}${L('Back to sign in', 'login')}`);
};
A.resendVer = () => {
  audit('Verification email resent', UI.pre?.verifyPid, '');
  go('verify', { resent: 1 });
};
A.doVerify = () => {
  const p = P(UI.pre.verifyPid);
  p.verified = true;
  const a = S.assign.filter(x => x.pid === p.id).find(x => x.status === 'Registered (email unverified)');
  if (a) {
    a.status = roleNeedsApproval(roleBase(a.role)) && !a.preApproved ? 'Pending role approval' : 'Active';
    if (a.preApproved) a.approval = [{ at: now(), by: a.preApproved, note: 'Appointed by the Platform Administrator' }];
    if (a.status !== 'Active') {
      a.approval = [{ at: now(), by: 'system', note: 'Sensitive role — approval requested' }];
      S.assign
        .filter(x => roleBase(x.role) === 'A')
        .forEach(x =>
          notify(x.pid, `Role approval requested: ${p.name} — ${ROLE[a.role]}`, 'admin', { tab: 'approvals' }),
        );
    }
  }
  audit('Email verified', p.id, p.email);
  S.session = { pid: p.id, aid: (a || S.assign.find(x => x.pid === p.id)).id };
  UI.pre = null;
  save();
  go('home');
  toast('Email verified.');
};
PUB.pending = () => {
  const a = asg();
  if (a.status === 'Registered (email unverified)') {
    UI.pre = { verifyPid: a.pid };
    return PUB.verify();
  }
  if (a.status === 'Expired')
    return authWrap(
      `<h1 class="h1">Role assignment expired</h1>${banner('warn', 'Your ' + ROLE[a.role] + ' assignment in ' + h(ctx().name) + ' expired on ' + fmt(a.until), 'Ask your programme administrator to renew it. Your account, consent, correction and export rights continue, and your other roles are unaffected.')}${S.assign.filter(x => x.pid === myId()).length > 1 ? B('Switch to another role', 'switcher', {}, 'btn-s btn-block') : ''}${B('Sign out', 'logout', {}, 'btn-s btn-block')}`,
    );
  if (a.status === 'Deactivated')
    return authWrap(
      `<h1 class="h1">Access deactivated</h1>${banner('err', 'Your ' + ROLE[a.role] + ' access in ' + h(ctx().name) + ' is deactivated', 'Contact your programme administrator. Your consent, correction and export rights continue.')}${S.assign.filter(x => x.pid === myId()).length > 1 ? B('Switch to another role', 'switcher', {}, 'btn-s btn-block') : ''}${B('Sign out', 'logout', {}, 'btn-s btn-block')}`,
    );
  const declined = a.status === 'Role not activated';
  return `<div class="auth solo"><main class="auth-main"><section class="auth-card">${declined ? `<h1 class="h1">Role not activated</h1>${banner('err', `The approver did not approve the ${ROLE[a.role]} role`, h(a.approval?.slice(-1)[0]?.note || '') + ' Your account still exists; other roles are unaffected.')}` : `<span class="tile t-purple auth-ic" aria-hidden="true">${ic('clock', 22)}</span><h1 class="h1">Your role is awaiting approval</h1><p class="sub">The <b>${ROLE[a.role]}</b> role in <b>${h(ctx().name)}</b> needs approval from an authorised approver before it becomes active.</p><div class="timeline"><div class="tl done"><span class="td">${ic('check', 14)}</span>Registered</div><div class="tl done"><span class="td">${ic('check', 14)}</span>Email verified</div><div class="tl cur"><span class="td">3</span>Role approval</div><div class="tl"><span class="td">4</span>Agreement</div></div>${banner('info', '', 'We will notify you when a decision is made.')}`}
 ${S.assign.filter(x => x.pid === myId()).length > 1 ? B('Switch to another role', 'switcher', {}, 'btn-s btn-block') : ''}${B('Sign out', 'logout', {}, 'btn-s btn-block')}</section></main></div>`;
};
// LMS deep-link entry (7.13)
PUB.lms = () =>
  authWrap(
    `<h1 class="h1">Arriving from your learning platform</h1><p class="muted">Deep link received for <b>Ward 7 Cooling Circle</b>. PHOENIX checks your own sign-in and permissions — the LMS does not grant access.</p>${banner('info', 'Return route kept', h(S.settings.lms.returnUrl))}${B('Sign in to continue', 'go', { r: 'login' }, 'btn-p btn-block')}`,
  );
