// ---------- PUBLIC: F01 access ----------
const PUB = {};
const authWrap = (inner, wide) =>
  `<div class="auth"><aside class="auth-side"><div class="brand"><span class="mark">${MARK(22)}</span><span class="wm"><b>PHOENIX</b><span>Foundation</span></span></div><div class="col auth-story"><p class="auth-lead">From purpose to <em>collaboration</em>, action, evidence and learning.</p><p class="auth-copy">One account across every programme you take part in. You decide what is shared, with whom, and for what purpose.</p><ul class="auth-path" aria-label="Three kinds of space, entered in any order"><li class="k-circle"><span class="n">${ic("users", 14)}</span><b>Circle</b><span>Shared learning, sensemaking and decisions.</span></li><li class="k-rope"><span class="n">${ic("route", 14)}</span><b>Rope Team</b><span>Small mentoring, support and accountability.</span></li><li class="k-room"><span class="n">${ic("room", 14)}</span><b>Action Workspace</b><span>Tasks, milestones, risks and evidence.</span></li></ul><p class="auth-copy">Separate, linked spaces. Start in whichever fits; nothing is converted into anything else.</p></div><div class="col auth-notes"><div class="row">${ic("shield", 16)}<span>No personal information is public by default.</span></div><div class="row">${ic("lock", 16)}<span>AI, research, sharing, release and exchange are five separate optional choices.</span></div></div></aside><main class="auth-main"><div class="mhead"><span class="mark">${MARK(20)}</span><span class="wm"><b>PHOENIX</b><span>Foundation</span></span></div><section class="auth-card ${wide ? "wide" : ""}">${inner}</section><p class="cap auth-foot"><a href="#" class="cap" data-a="resetDemo">Reset local data</a></p></main></div>`;
// BF-05: one clean account per baseline role (plus the Reviewer bundle), so every consequential action can be
// shown succeeding for the authorised account and refused for a similar unauthorised one.
const DEMO = [
  ["p1", "a1", "Participant · Excelsior (pending tenant invitation)"],
  ["p9", "a9", "Participant · pathway in progress (every step status)"],
  ["p3", "a3", "Mentor · Excelsior (pending tenant invitation)"],
  ["p13", "a13", "Facilitator / Steward (plain, no bundles) · also Riverside Seva Trust"],
  ["p2", "a2", "Facilitator / Steward + Reviewer bundle"],
  ["p4", "a4", "Collaborator"],
  ["p5", "a5", "Organization Admin · second admin, with a mandate"],
  ["p6", "a6", "Sponsor"],
  ["p7", "a7", "Organization Admin (plain, no bundles)"],
  ["p8", "a8", "Platform Administrator"],
  ["p11", "a11", "Participant — onboarding unfinished"],
  ["p12", "a12", "Organization Admin — role awaiting approval"],
  ["p18", "a18", "Organization Admin · Women's Enterprise Network (second tenant)"],
];
PUB.login = () => {
  const f = "login";
  const st = UI.p.state;
  return authWrap(`
 <div class="col auth-h"><h1 class="h1">Sign in</h1><p class="sub">One account for every PHOENIX programme you belong to.</p></div>
 ${UI.pre?.addRole ? banner("info", "Sign in to add your new role", "We will add the " + ROLE[UI.pre.addRole.role] + " role to your existing record. No second account is created.") : ""}
 ${st === "failed" ? banner("err", "Email or password is incorrect", "Check your details and try again, or reset your password.") : ""}
 ${st === "locked" ? banner("err", "Account temporarily locked", "Too many failed attempts. Try again in 15 minutes or reset your password.") : ""}
 ${st === "deactivated" ? banner("err", "This account is deactivated", "It applies to every organization you belong to. Contact your organization; only the Platform Administrator can reactivate a whole account.") : ""}
 <form data-f="login" class="col auth-form" novalidate>
 ${fi(f, "email", "Email address", { type: "email", req: true, ph: "name@organisation.org", auto: "email" })}
 ${fi(f, "pw", "Password", { type: "password", req: true, auto: "current-password" })}
 <div class="row auth-keep"><label class="row"><input class="chk" type="checkbox" name="keep">Keep me signed in</label>${L("Forgot password?", "forgot", {}, "cap lnk")}</div>
 <button class="btn btn-p btn-block" type="submit">Sign in</button></form>
 <div class="divider">or</div>
 <div class="col auth-alt"><p>New to PHOENIX? ${L("Request access", "apply")}</p><p class="cap">Accounts are created from an invitation. Requesting access does not create an account: an Organization Admin reviews it and, if approved, sends you a normal invitation.</p>${B(ic("mail", 16) + "I have an invitation link", "go", { r: "invite" }, "btn-s")}</div>
 ${B(ic("link", 16) + "Arrive from the LMS (demo deep link)", "go", { r: "lms" }, "btn-g btn-sm")}<details class="auth-demo"><summary>Demo accounts (password: demo1234)</summary><p class="cap">One-click demo sign-in skips two-step verification. Signing in with email and password as an administrator asks for a code (use 123456).</p><div class="col auth-demo-l">${DEMO.filter(
   ([pid]) => S.assign.some((a) => a.pid === pid),
 )
   .map(
     ([pid, aid, l]) =>
       `<button type="button" class="demo-acc" data-a="demoLogin" data-pid="${pid}"><span class="av">${ini(pid)}</span><span class="col demo-acc-t"><b>${nm(pid)}</b><span class="cap">${l}</span></span>${ic("chevr", 16)}</button>`,
   )
   .join("")}</div>${createdList()}</details>`);
};
// Accounts created in this browser (registration or Programme admin) are listed with the demo accounts and,
// like them, sign in with one click. Prototype only: there is no server, so this is no less secure than the
// demo list. A real deployment must not offer password-less sign-in.
const createdAccounts = () =>
  S.people.filter((p) => p.createdVia && p.status !== "Deleted");
const createdNote = (p) => {
  const as = S.assign.filter((a) => a.pid === p.id);
  return [
    as.map((a) => roleName(a.role, a.ctx)).join(", ") || "No role yet",
    p.createdVia === "admin"
      ? "added by an administrator"
      : p.createdVia === "invitation"
        ? "joined by invitation"
        : p.createdVia === "registration"
        ? "registered"
        : "created earlier",
    !p.verified && "email not verified",
    as.some((a) => a.status === "Pending role approval") &&
      "role awaiting approval",
  ]
    .filter(Boolean)
    .join(" · ");
};
const createdList = () => {
  const ps = createdAccounts();
  return ps.length
    ? `<p class="cap auth-demo-sub"><b>Created in this browser</b> · one-click sign-in, like the demo accounts</p><div class="col auth-demo-l">${ps
        .map(
          (p) =>
            `<button type="button" class="demo-acc" data-a="loginPick" data-pid="${p.id}"><span class="av">${ini(p.id)}</span><span class="col demo-acc-t"><b>${nm(p.id)}</b><span class="cap">${h(p.email)} · ${h(createdNote(p))}</span></span>${ic("chevr", 16)}</button>`,
        )
        .join("")}</div>`
    : "";
};
A.loginPick = (d) => {
  const p = createdAccounts().find((x) => x.id === d.pid);
  if (!p) return;
  // the same account checks as a password sign-in: deactivated accounts stay out; unverified email goes to verification
  if (p.status === "Deactivated") {
    UI.p = { state: "deactivated" };
    return render();
  }
  clearF("login");
  if (!p.verified) {
    UI.pre = { verifyPid: p.id };
    return go("verify");
  }
  startSession(p);
};
let fails = {};
function startSession(p, mfaDone) {
  // A deactivated account cannot start a session by any sign-in route (password, demo, created-account, two-step).
  if (!p || (p.status || "Active") !== "Active") {
    audit("Sign-in refused", p ? p.id : "—", "Account " + (p ? p.status : "missing"), "denied");
    UI.pre = null;
    return go("login", { state: "deactivated" });
  }
  // Recheck at sign-in acceptance: if the invitation was revoked, resent, used or expired since the link was opened,
  // no role is added and the account is not changed; the person sees the safe message and can ask again.
  const ar = UI.pre?.addRole;
  if (ar && ar.inv && ar.email === p.email) {
    const iv = byId("invites", ar.inv);
    const tok = ar.tok || iv?.token || "";
    if (invLinkProblem(iv, tok)) {
      UI.pre = null;
      save();
      return go("invite", { token: tok, stage: "signin" });
    }
  }
  const list = S.assign.filter((a) => a.pid === p.id);
  // First sign-in uses the primary membership (the invited context); afterwards the last-used valid context.
  let a =
    (p.lastAid && list.find((x) => x.id === p.lastAid && asgUsable(x))) ||
    list.find((x) => x.id === p.primary && asgUsable(x)) ||
    list.find((x) => asgUsable(x)) ||
    list[0];
  if (UI.pre?.mfaPid) delete UI.pre.mfaPid;
  // Route B: an existing verified person accepting a second invitation gains a contextual role assignment, never a
  // second account. The same role in the same context is not added twice.
  const dup =
    UI.pre?.addRole &&
    UI.pre.addRole.email === p.email &&
    list.find(
      (x) => x.role === UI.pre.addRole.role && x.ctx === UI.pre.addRole.ctx,
    );
  if (dup) {
    if (UI.pre.addRole.inv && byId("invites", UI.pre.addRole.inv))
      byId("invites", UI.pre.addRole.inv).status = "Accepted";
    UI.pre = null;
    a = asgUsable(dup) ? dup : a;
    toast(`You already hold ${asgLabel(dup)}. No new role was added.`, "warn");
  }
  if (UI.pre?.addRole && UI.pre.addRole.email === p.email) {
    const r = UI.pre.addRole;
    const na = {
      id: uid("a"),
      pid: p.id,
      role: r.role,
      ctx: r.ctx,
      status:
        roleNeedsApproval(roleBase(r.role)) &&
        !(r.inv && byId("invites", r.inv)?.preApproved)
          ? "Pending role approval"
          : "Active",
      bundles: [],
      onb: {
        agreement: false,
        consents: false,
        profile: true,
        compass: roleBase(r.role) !== "P",
      },
    };
    const piv = r.inv && byId("invites", r.inv);
    if (piv && piv.preApproved)
      na.approval = [
        {
          at: now(),
          by: piv.preApproved,
          note: "Appointed by the Platform Administrator",
        },
      ];
    if (piv && piv.org && !p.org) p.org = piv.org;
    S.assign.push(na);
    if (r.inv) {
      const iv = byId("invites", r.inv);
      iv.status = "Accepted";
    }
    if (na.status !== "Active") {
      S.assign
        .filter((x) => roleBase(x.role) === "A")
        .forEach((x) =>
          notify(
            x.pid,
            `Role approval requested: ${p.name} — ${roleName(r.role, r.ctx)}`,
            "admin",
            { tab: "users" },
          ),
        );
      na.approval = [
        {
          at: now(),
          by: "system",
          note: "Sensitive role — approval requested",
        },
      ];
    }
    audit(
      "Scoped role added to existing record",
      p.id,
      roleName(r.role, r.ctx) + " · " + r.ctx,
    );
    a = na.status === "Active" ? na : a;
    UI.pre = null;
    toast(
      `${roleName(r.role, r.ctx)} role added to your existing account${na.status !== "Active" ? " — awaiting approval" : ""}.`,
    );
  }
  const keep = UI.pre;
  resetUI();
  UI.pre = keep && keep.addRole ? null : keep;
  S.session = { pid: p.id, aid: a.id };
  audit("Signed in", "session", p.email);
  save();
  go("home");
  docLinkOpen();
}
F.login = (d) => {
  if (!validate("login", d, { email: ["req", "email"], pw: ["req"] }))
    return render();
  const p = personByEmail(d.email);
  if (!p || S.pw[p.id] !== d.pw) {
    fails[d.email] = (fails[d.email] || 0) + 1;
    audit("Sign-in failed", d.email, "Wrong credentials", "denied");
    UI.p = { state: fails[d.email] >= 5 ? "locked" : "failed" };
    return render();
  }
  if (p.status === "Deactivated") {
    UI.p = { state: "deactivated" };
    return render();
  }
  if (!p.verified) {
    UI.pre = { verifyPid: p.id };
    return go("verify");
  }
  clearF("login");
  if (
    S.assign.some(
      (a) =>
        a.pid === p.id &&
        ["A", "T"].includes(roleBase(a.role)) &&
        a.status === "Active",
    )
  ) {
    UI.pre = { ...(UI.pre || {}), mfaPid: p.id };
    return go("mfa");
  }
  startSession(p);
};
// One-click sign-in is for the listed demo accounts only.
A.demoLogin = (d) => {
  if (!DEMO.some(([pid]) => pid === d.pid)) return;
  clearF("login");
  startSession(P(d.pid));
};
PUB.forgot = () =>
  authWrap(
    UI.p.sent
      ? `<h1 class="h1">Check your email</h1><p class="muted">If an account exists for that address, we have sent a reset link. It expires in 30 minutes.</p>${B("Back to sign in", "go", { r: "login" }, "btn-s")}`
      : `<h1 class="h1">Reset your password</h1><form data-f="forgot" class="col auth-form" novalidate>${fi("forgot", "email", "Email address", { type: "email", req: true })}<button class="btn btn-p btn-block" type="submit">Send reset link</button></form>${L("Back to sign in", "login")}`,
  );
F.forgot = (d) => {
  if (!validate("forgot", d, { email: ["req", "email"] })) return render();
  audit("Password reset requested", d.email, "");
  go("forgot", { sent: 1 });
};
// Register (D-01: Participant or Sponsor only). There is no programme choice: people join the default programme.
const defaultCtx = () =>
  S.settings.defaultCtx ||
  (S.contexts.find((c) => c.kind !== "Platform" && c.status === "Active") || {})
    .id;
const selfRole = (r) => (["P", "S"].includes(r) ? r : "P");
PUB.register = () => {
  const f = "reg";
  const inv = UI.pre?.invite ? byId("invites", UI.pre.invite) : null;
  // Invitation-only: without a valid invitation the person requests access instead (no account is created).
  if (!inv) return PUB.apply();
  // The invitation is rechecked while the form is open: if it was revoked, resent or expired, the form is replaced
  // by the safe message and nothing is created.
  const tok = UI.pre.inviteTok || inv.token;
  if (invLinkProblem(inv, tok)) {
    UI.pre = null;
    UI.route = "invite";
    UI.p = { token: tok, stage: "create" };
    return PUB.invite();
  }
  const r = fv(f, "role", inv ? inv.role : "P");
  const exists = UI.p.exists;
  return authWrap(
    `<div class="col auth-h"><p class="over">Step 1 · Account</p><h1 class="h1">Create your account</h1><p class="sub">We only ask for what is needed to start. Everything else is asked later, in context.</p></div>
 ${inv ? banner("ok", "Invitation verified", `You are joining as <b>${roleName(inv.role, inv.ctx)}</b>. Your email comes from the invitation and cannot be changed here.`) : ""}
 ${exists ? banner("info", "This email already has a PHOENIX account", "Sign in and we will add this role to your existing record. No second account is created.") + B("Sign in to continue", "go", { r: "login" }, "btn-p btn-sm") : ""}
 ${errSum(f)}
 <form data-f="reg" class="col auth-form" novalidate>
 ${
   inv
     ? `<input type="hidden" name="role" value="${inv.role}">`
     : `<fieldset class="col auth-fs"><legend class="lbl">I am joining as <span class="req">*</span></legend><div class="f2">${[
         [
           "P",
           "Participant",
           "Learner or practitioner. Set your purpose, join Circles, work on projects.",
         ],
         [
           "S",
           "Sponsor",
           "Fund projects stage by stage, sponsor seats or donate.",
         ],
       ]
         .map(
           ([v, t, dsc]) =>
             `<label class="choice ${r === v ? "sel" : ""}"><input type="radio" name="role" value="${v}" ${r === v ? "checked" : ""} style="position:absolute;opacity:0" data-ch="regRole"><span class="rad"></span><span class="col choice-t"><b>${t}</b><span class="cap">${dsc}</span></span></label>`,
         )
         .join(
           "",
         )}</div><p class="cap">Facilitators, Mentors, Collaborators and Organization Admins join by invitation only.</p></fieldset>`
 }
 <div class="f2">${fi(f, "name", "Full name", { req: true, auto: "name" })}${fi(f, "display", "Display name", { req: true })}</div>
 <div class="f2">${inv ? fi(f, "email", "Email address", { value: inv.email, ro: true, help: "From your invitation" }) : fi(f, "email", "Email address", { type: "email", req: true, auto: "email" })}</div>
 <div class="f2">${fi(f, "pw", "Password", { type: "password", req: true, auto: "new-password" })}${fi(f, "pw2", "Confirm password", { type: "password", req: true, auto: "new-password" })}</div>
 <p class="help auth-pwhelp">At least 10 characters, including a number.</p>
 ${ageConfirm(f)}
 <button class="btn btn-p btn-block" type="submit">Create account</button></form>
 <p class="cap">Already have an account? ${L("Sign in", "login")}</p>`,
    true,
  );
};
A.regRole = (d, el) => {
  UI.form.reg = { ...(UI.form.reg || {}), role: el.value };
  render();
};
F.reg = (d) => {
  const inv = UI.pre?.invite ? byId("invites", UI.pre.invite) : null;
  const tok = inv && (UI.pre.inviteTok || inv.token);
  // Recheck at account creation: a revoked, resent, used or expired invitation creates no account.
  if (inv && invLinkProblem(inv, tok)) {
    UI.pre = null;
    clearF("reg");
    return go("invite", { token: tok, stage: "create" });
  }
  if (inv) d.email = inv.email;
  const okv = validate("reg", d, {
    role: ["req"],
    name: ["req"],
    display: ["req"],
    email: ["req", "email"],
    age: [["req", "Confirm that you meet the age requirement."]],
    pw: [
      "req",
      [
        "fn",
        {
          f: (v) => v.length >= 10 && /\d/.test(v),
          m: "Password must be at least 10 characters and include a number.",
        },
      ],
    ],
    pw2: [
      "req",
      ["fn", { f: (v, dd) => v === dd.pw, m: "Passwords do not match." }],
    ],
  });
  if (!okv) return render();
  const ex = personByEmail(d.email);
  if (ex) {
    UI.pre = {
      addRole: {
        email: ex.email,
        role: inv ? inv.role : selfRole(d.role),
        ctx: inv ? inv.ctx : defaultCtx(),
        inv: inv?.id,
        tok,
      },
    };
    UI.p = { exists: 1 };
    audit(
      "Registration matched existing record",
      ex.id,
      "Role to be added on sign-in",
    );
    return render();
  }
  // Only an invitation an Organization Admin sent from Invitations gets the shorter invited setup. Access requests
  // (people who registered on their own, then were approved) and Platform Administrator appointments keep route A.
  const byAdmin = invByOrgAdmin(inv);
  const p = {
    id: uid("p"),
    name: d.name.trim(),
    display: d.display.trim(),
    email: d.email.trim(),
    ageConfirmed: today(),
    // The single-use invitation link was sent to this address, so opening it proves the email: no second check.
    verified: byAdmin,
    createdVia: byAdmin ? "invitation" : "registration",
    createdAt: now(),
    status: "Active",
    ...(inv && inv.org ? { org: inv.org } : {}),
  };
  S.people.push(p);
  S.pw[p.id] = d.pw;
  // The role comes from the invitation, never from the form; without one only Participant or Sponsor is possible.
  const role = inv ? inv.role : selfRole(d.role),
    cx = inv ? inv.ctx : defaultCtx();
  const a = {
    id: uid("a"),
    pid: p.id,
    role,
    ctx: cx,
    status: "Registered (email unverified)",
    bundles: [],
    onb: {
      agreement: false,
      consents: false,
      profile: false,
      compass: role !== "P",
    },
    ...(inv && inv.preApproved ? { preApproved: inv.preApproved } : {}),
    // Invited people follow the invited onboarding order (views/onboarding.js): profile first, then the agreement.
    ...(byAdmin ? { viaInvite: inv.id } : {}),
  };
  S.assign.push(a);
  S.consents[p.id] = { history: [] };
  if (inv) {
    inv.status = "Accepted";
    audit("Invitation accepted", inv.id, p.email);
  }
  audit("Account registered", p.id, ROLE[role] + " · " + cx);
  clearF("reg");
  if (byAdmin) {
    // Invited by an Organization Admin: the role comes from the invitation and activates now (a sensitive role still
    // waits for approval, as before). Setup continues straight into onboarding; no verify-email screen.
    audit("Email verified", p.id, p.email + " · by invitation link");
    regActivate(p, a);
    S.session = { pid: p.id, aid: a.id };
    UI.pre = null;
    save();
    go("home");
    return toast("Account created. Finish setting up your profile.");
  }
  UI.pre = { verifyPid: p.id, aid: a.id };
  save();
  go("verify");
};
// An invitation sent by an Organization Admin of its own context (Invitations), not one issued for an approved
// access request or a Platform Administrator appointment.
const invByOrgAdmin = (inv) =>
  !!inv && !inv.fromRequest && !inv.preApproved && S.assign.some((x) => x.pid === inv.by && x.ctx === inv.ctx && roleBase(x.role) === "A");
// The role becomes Active once the email is confirmed, or waits for approval when it is sensitive and was not
// appointed in advance. Used by Verify email and by account creation from an invitation link.
function regActivate(p, a) {
  if (!a) return;
  a.status = roleNeedsApproval(roleBase(a.role)) && !a.preApproved ? "Pending role approval" : "Active";
  if (a.preApproved) a.approval = [{ at: now(), by: a.preApproved, note: "Appointed by the Platform Administrator" }];
  if (a.status !== "Active") {
    a.approval = [{ at: now(), by: "system", note: "Sensitive role — approval requested" }];
    S.assign
      .filter((x) => roleBase(x.role) === "A")
      .forEach((x) => notify(x.pid, `Role approval requested: ${p.name} — ${roleName(a.role, a.ctx)}`, "admin", { tab: "users" }));
  }
}
// ---------- JF-06 invitation lifecycle: one check, used at every step ----------
// The same rule applies on the link page, at account creation and at sign-in acceptance, so an invitation that
// expired, was revoked, was used or was replaced by a resend can never be accepted at a later step.
const invOpen = (i) => !!i && ["Pending", "Resent"].includes(i.status);
// Pending and Resent invitations both expire. The stored status is updated when expiry is noticed, so the admin
// list and the link agree without waiting for an admin to open the list.
function invSweep(i) {
  if (invOpen(i) && i.expires < today()) i.status = "Expired";
  return i;
}
// null when the link can still be used, otherwise the safe message. tok is the link the person opened: after a
// resend the old link stops working even though the invitation itself is open again.
function invLinkProblem(inv, tok) {
  if (!inv || inv.kind === "member" || !tok || inv.token !== tok)
    return "This link is not valid";
  invSweep(inv);
  if (inv.status === "Expired") return "This invitation has expired";
  if (inv.status === "Revoked") return "This invitation was withdrawn";
  if (inv.status === "Accepted") return "This link has already been used";
  if (!invOpen(inv)) return "This link is not valid";
  return null;
}
const INV_STAGE = {
  create: ["at account creation", "No account was created."],
  signin: [
    "at sign-in acceptance",
    "Your existing account was not changed and no role was added. You can still sign in as usual.",
  ],
};
// Seeded links are dated relative to today so the valid-link test keeps working; earlier stored data is refreshed
// once (only links nobody has used, revoked or resent).
function invMigrate() {
  if (S.jf06) return;
  const sd = seed().invites;
  ["i1", "i5"].forEach((id) => {
    const x = byId("invites", id),
      s = sd.find((i) => i.id === id);
    if (x && s && ["Pending", "Expired"].includes(x.status))
      Object.assign(x, { status: "Pending", expires: s.expires, sent: s.sent });
  });
  S.jf06 = 1;
}
// Invitation link
PUB.invite = () => {
  const tok = UI.p.token && UI.p.token.trim();
  const inv = tok ? S.invites.find((i) => i.token === tok) : null;
  if (!tok)
    return authWrap(
      `<h1 class="h1">Open your invitation</h1><p class="muted">Paste the code from your invitation email, or open the link in the email directly.</p><form data-f="tok" class="col auth-form" novalidate>${fi("tok", "token", "Invitation code", { req: true, ph: "TKN-…" })}<button class="btn btn-p btn-block" type="submit">Continue</button></form><div class="col auth-codes"><span class="cap">Invitation codes:</span><div class="row wrap">${S.invites.filter((i) => i.token).map((i) => `<button class="chip auth-chip" type="button" data-a="go" data-r="invite" data-token="${i.token}">${i.token}</button>`).join("")}<button class="chip auth-chip" type="button" data-a="go" data-r="invite" data-token="TKN-UNKNOWN">TKN-UNKNOWN</button></div></div>${L("Back to sign in", "login")}`,
    );
  const bad = invLinkProblem(inv, tok);
  const stage = INV_STAGE[UI.p.stage];
  if (bad) {
    // every denial is recorded once; the account is never changed here
    if (!UI.p.logged) {
      audit(
        "Invitation link denied",
        inv ? inv.id : tok,
        bad + (stage ? " — " + stage[0] : ""),
        "denied",
      );
      UI.p.logged = 1;
      save();
    }
    if (UI.p.requested)
      return authWrap(
        `<span class="tile t-teal auth-ic" aria-hidden="true">${ic("check", 22)}</span><h1 class="h1">Request sent</h1><p class="muted">We have asked the Organization Admins of ${h(ctxName(inv.ctx))} to send you a new invitation.</p>${B("Back to sign in", "go", { r: "login" }, "btn-s")}`,
      );
    const used = inv?.status === "Accepted";
    const note =
      (stage ? stage[1] + " " : "") +
      (used
        ? "Each invitation link works once. If it was you, sign in instead."
        : inv
          ? "Ask for a new invitation below. For your security, this attempt has been recorded."
          : "For your security, this attempt has been recorded.");
    // A known link names its organization, so the request goes only to that organization's admins. An unknown
    // link names none: the person uses Request access, which goes to the default organization's admins.
    const ask = inv
      ? `<form data-f="reinv" class="col auth-form" novalidate>${fi("reinv", "email", "Your email address", { type: "email", req: true, value: inv.email })}${fi("reinv", "msg", "Message to the administrator", { type: "textarea", rows: 3 })}<p class="cap">Sent to the Organization Admins of ${h(ctxName(inv.ctx))}.</p><button class="btn btn-p btn-block" type="submit">Request a new invitation</button></form>`
      : `<p class="muted">We cannot tell which organization this link came from. Ask to join instead: the organization's admin reviews the request and, if approved, sends you a new invitation.</p>${B("Request access", "go", { r: "apply" }, "btn-p btn-block")}`;
    return authWrap(
      `<h1 class="h1">Invitation link not valid</h1>${banner("err", bad, note)}${used || stage ? B("Sign in", "go", { r: "login" }, "btn-s") : ""}${ask}`,
    );
  }
  const c = S.contexts.find((x) => x.id === inv.ctx);
  const exists = personByEmail(inv.email);
  return authWrap(`<span class="tile t-teal auth-ic" aria-hidden="true">${ic("mail", 22)}</span><div class="col auth-h"><h1 class="h1">You have been invited</h1><p class="sub">Review the details, then continue.</p></div>
 <div class="auth-box">${dl([
   ["Context", h(c.name)],
   ["Role", pill(roleName(inv.role, inv.ctx), "p-purple")],
   ["Invited by", nm(inv.by)],
   ["Email", h(inv.email)],
   ["Valid until", fmt(inv.expires)],
 ])}</div>
 ${inv.preApproved ? banner("info", "Already approved", "The Platform Administrator appointed you to this role. It is active as soon as your account is set up.") : roleNeedsApproval(roleBase(inv.role)) ? banner("warn", "This role needs approval", "After you register, an authorised approver must approve it before it becomes active.") : ""}
 ${exists ? banner("info", "You already have a PHOENIX account", "Sign in and this role is added to your existing record.") + B("Sign in to accept", "acceptInvExisting", { id: inv.id, tok }, "btn-p btn-block") : B("Accept and create account", "acceptInv", { id: inv.id, tok }, "btn-p btn-block")}
 <p class="cap">This link works once.</p>`);
};
F.tok = (d) => {
  if (!validate("tok", d, { token: ["req"] })) return render();
  go("invite", { token: d.token.trim() });
};
// A new-invitation request goes only to the active Organization Admins of the invitation's own context, into their
// assignment there, and is marked on the invitation so the admin can resend it from the list.
F.reinv = (d) => {
  if (!validate("reinv", d, { email: ["req", "email"] })) return render();
  const tok = UI.p.token && UI.p.token.trim();
  const inv = tok && S.invites.find((i) => i.token === tok);
  if (!inv) return go("apply");
  S.assign
    .filter(
      (a) =>
        roleBase(a.role) === "A" && a.ctx === inv.ctx && a.status === "Active",
    )
    .forEach((a) =>
      notify(
        a.pid,
        `New invitation requested by ${d.email} (${roleName(inv.role, inv.ctx)})`,
        "admin",
        { tab: "invites" },
        a.id,
      ),
    );
  inv.renew = { at: today(), email: d.email.trim(), msg: d.msg || "" };
  audit(
    "New invitation requested",
    inv.id,
    ctxName(inv.ctx) + " · " + d.email + (d.msg ? " · " + d.msg : ""),
  );
  clearF("reinv");
  save();
  UI.p.requested = 1;
  render();
};
// Accepting rechecks the link: the page may have been open while the admin revoked or resent it.
const invGate = (d, stage) => {
  const inv = byId("invites", d.id);
  if (!invLinkProblem(inv, d.tok)) return inv;
  UI.pre = null;
  go("invite", { token: d.tok || "", ...(stage ? { stage } : {}) });
  return null;
};
A.acceptInv = (d) => {
  const inv = invGate(d);
  if (!inv) return;
  UI.pre = { invite: inv.id, inviteTok: d.tok };
  clearF("reg");
  go("register");
};
A.acceptInvExisting = (d) => {
  const inv = invGate(d);
  if (!inv) return;
  UI.pre = {
    addRole: {
      email: inv.email,
      role: inv.role,
      ctx: inv.ctx,
      inv: inv.id,
      tok: d.tok,
    },
  };
  go("login");
};
// Verify email
PUB.verify = () => {
  const pid = UI.pre?.verifyPid;
  const p = pid && P(pid);
  if (!p || !p.email) return PUB.login();
  const st = UI.p.state;
  if (st === "expired")
    return authWrap(
      `<h1 class="h1">Verification link expired</h1>${banner("warn", "This link is no longer valid", "Send yourself a new one. Your details are saved.")}${B("Send a new link", "resendVer", {}, "btn-p btn-block")}`,
    );
  return authWrap(`<span class="tile t-navy auth-ic" aria-hidden="true">${ic("mail", 22)}</span><div class="col auth-h"><h1 class="h1">Check your email</h1><p class="sub">We sent a verification link to <b>${h(p.email)}</b>.</p></div>
 ${UI.p.resent ? banner("ok", "New link sent", "Earlier links no longer work.") : ""}
 <div class="auth-box col"><span class="over">Check your email</span><div class="row wrap">${B("Open verification link", "doVerify", {}, "btn-p btn-sm")}${B("Open an expired link", "go", { r: "verify", state: "expired" }, "btn-s btn-sm")}</div></div>
 ${B("Resend verification email", "resendVer", {}, "btn-s btn-block")}${L("Back to sign in", "login")}`);
};
A.resendVer = () => {
  audit("Verification email resent", UI.pre?.verifyPid, "");
  go("verify", { resent: 1 });
};
A.doVerify = () => {
  const p = P(UI.pre.verifyPid);
  p.verified = true;
  const a = S.assign
    .filter((x) => x.pid === p.id)
    .find((x) => x.status === "Registered (email unverified)");
  regActivate(p, a);
  audit("Email verified", p.id, p.email);
  S.session = {
    pid: p.id,
    aid: (a || S.assign.find((x) => x.pid === p.id)).id,
  };
  UI.pre = null;
  save();
  go("home");
  toast("Email verified.");
};
PUB.pending = () => {
  const a = asg();
  if (a.status === "Registered (email unverified)") {
    UI.pre = { verifyPid: a.pid };
    return PUB.verify();
  }
  // JF-10: the reason shown is the broadest one that applies, from the whole account down to one role.
  const other = S.assign.some((x) => x.pid === myId() && x.id !== a.id && asgUsable(x));
  const sw = other ? B("Switch to another organization or role", "switcher", {}, "btn-p btn-block") : "";
  const recs = B("My records & consent", "go", { r: "privacy" }, "btn-s btn-block");
  const out = B("Sign out", "logout", {}, "btn-s btn-block");
  if (!acctActive(a.pid))
    return authWrap(
      `<h1 class="h1">Account deactivated</h1>${banner("err", "Your PHOENIX account is deactivated", "This applies to every organization you belong to. Contact the Platform Administrator through your organization.")}${out}`,
    );
  const sus = ctxSusp(a.pid, a.ctx);
  if (sus)
    return authWrap(
      `<h1 class="h1">Access to ${h(ctxName(a.ctx))} suspended</h1>${banner("err", "Your access to " + h(ctxName(a.ctx)) + " is suspended", "Since " + fmt(sus.at) + ". Contact an Organization Admin of " + h(ctxName(a.ctx)) + " if you think this is wrong.")}${banner("info", "", "This affects " + h(ctxName(a.ctx)) + " only. Your account, your roles in other organizations and your personal records are not affected.")}${sw}${recs}${out}`,
    );
  if ((S.contexts.find((c) => c.id === a.ctx) || {}).status === "Suspended")
    return authWrap(
      `<h1 class="h1">${h(ctxName(a.ctx))} is suspended</h1>${banner("err", h(ctxName(a.ctx)) + " is not available at the moment", "This affects everyone in it. Your account, your other organizations and your personal records are not affected.")}${sw}${recs}${out}`,
    );
  if (a.status === "Deactivated")
    return authWrap(
      `<h1 class="h1">Access deactivated</h1>${banner("err", "Your " + roleName(a.role, a.ctx) + " access in " + h(ctx().name) + " is deactivated", "Contact your Organization Admin. Your account and your other roles are not affected; your consent, correction and export rights continue.")}${sw}${recs}${out}`,
    );
  const declined = a.status === "Role not activated";
  return `<div class="auth solo"><main class="auth-main"><section class="auth-card">${declined ? `<h1 class="h1">Role not activated</h1>${banner("err", `The approver did not approve the ${roleName(a.role, a.ctx)} role`, h(a.approval?.slice(-1)[0]?.note || "") + " Your account still exists; other roles are unaffected.")}` : `<span class="tile t-purple auth-ic" aria-hidden="true">${ic("clock", 22)}</span><h1 class="h1">Your role is awaiting approval</h1><p class="sub">The <b>${roleName(a.role, a.ctx)}</b> role in <b>${h(ctx().name)}</b> needs approval from an authorised approver before it becomes active.</p><div class="timeline"><div class="tl done"><span class="td">${ic("check", 14)}</span>Registered</div><div class="tl done"><span class="td">${ic("check", 14)}</span>Email verified</div><div class="tl cur"><span class="td">3</span>Role approval</div><div class="tl"><span class="td">4</span>Agreement</div></div>${banner("info", "", "We will notify you when a decision is made.")}`}
 ${S.assign.filter((x) => x.pid === myId()).length > 1 ? B("Switch to another role", "switcher", {}, "btn-s btn-block") : ""}${B("Sign out", "logout", {}, "btn-s btn-block")}</section></main></div>`;
};
// Personal records while the current role cannot be used: the person's own consent, agreements and data, without
// the blocked organization's menu or content.
PUB.ownRecords = () => {
  let inner;
  try {
    inner = ROUTES.privacy.view();
  } catch (e) {
    inner = banner("err", "Something went wrong on this screen", h(e.message));
  }
  return `<div class="auth solo"><main class="auth-main"><section class="auth-card wide">${B(ic("chevl", 16) + "Back", "go", { r: "home" }, "btn-s btn-sm")}${inner}</section></main></div>`;
};
// LMS deep-link entry (7.13)
PUB.lms = () =>
  authWrap(
    `<h1 class="h1">Arriving from your learning platform</h1><p class="muted">Deep link received for <b>Ward 7 Cooling Circle</b>. PHOENIX checks your own sign-in and permissions — the LMS does not grant access.</p>${banner("info", "Return route kept", h(S.settings.lms.returnUrl))}${B("Sign in to continue", "go", { r: "login" }, "btn-p btn-block")}`,
  );

// ---- BF-12 entry: age confirmation (attestation), never a date of birth unless WSS/legal requires it
const ageConfirm = (f) =>
  `<div class="field">${fi(f, "age", "I confirm I meet the minimum age for this programme.", { type: "checkbox", req: true })}</div>`;
// ---- Request access (Apply-to-Join): collects a request only. An Organization Admin approves it and PHOENIX
// sends a normal single-use invitation. An unapproved applicant has no account and cannot sign in.
// There is no organization choice: every request goes to the default organization (S.settings.defaultCtx,
// Excelsior University), and its name is not shown on these screens. A pack link (#apply?pack=<id>, read in boot)
// still opens this form, but the request is always for the default organization.
const applyLink = (pk) =>
  location.href.split("#")[0] + "#apply?pack=" + encodeURIComponent(pk);
// The default organization when it can take requests, otherwise null.
const applyCtx = () => {
  const c = S.contexts.find((x) => x.id === defaultCtx());
  return c && c.kind !== "Platform" && c.status === "Active" ? c : null;
};
PUB.apply = () => {
  const f = "apply";
  if (UI.p.sent)
    return authWrap(
      `<div class="col auth-h"><h1 class="h1">Request received</h1><p class="sub">Thank you. An Organization Admin will review your request. If it is approved you will receive a normal invitation email to create your account. Until then there is no account to sign in to.</p></div>${B("Back to sign in", "go", { r: "login" }, "btn-s")}`,
    );
  if (!applyCtx())
    return authWrap(
      `<div class="col auth-h"><p class="over">Request access</p><h1 class="h1">Requests are closed</h1><p class="sub">Access requests are not being taken right now. If you were sent an invitation, use the link in that email instead.</p></div>${B("Back to sign in", "go", { r: "login" }, "btn-s")}`,
    );
  return authWrap(
    `<div class="col auth-h"><p class="over">Request access</p><h1 class="h1">Ask to join</h1><p class="sub">We only ask for what is needed to review your request. It goes to the Organization Admin. This does not create an account.</p></div>
  ${banner("info", "", "Already invited? Use the link in your invitation email instead.")}
  ${errSum(f)}<form data-f="apply" class="col auth-form" novalidate>
  <div class="f2">${fi(f, "name", "Full name", { req: true, auto: "name" })}${fi(f, "email", "Email address", { type: "email", req: true, auto: "email" })}</div>
  ${fi(f, "as", "I would like to take part as", {
    type: "select",
    req: true,
    opts: [
      ["P", "Participant"],
      ["S", "Sponsor"],
    ],
  })}
  ${fi(f, "why", "Why you would like to join (optional)", { type: "textarea", rows: 2, max: 400 })}
  ${ageConfirm(f)}
  <button class="btn btn-p btn-block" type="submit">Send request</button></form>
  <p class="cap">Have an account? ${L("Sign in", "login")}</p>`,
    true,
  );
};
F.apply = (d) => {
  // The organization is never taken from the page: every request goes to the default organization.
  const c = applyCtx();
  if (!c) return render();
  d.ctx = c.id;
  if (
    !validate("apply", d, {
      name: ["req"],
      email: ["req", "email"],
      as: ["req"],
      age: [["req", "Confirm that you meet the age requirement."]],
    })
  )
    return render();
  (S.accessReqs = S.accessReqs || []).unshift({
    id: uid("ar"),
    name: d.name.trim(),
    email: d.email.trim().toLowerCase(),
    ctx: d.ctx,
    role: d.as === "S" ? "S" : "P",
    why: (d.why || "").trim(),
    at: today(),
    status: "Awaiting approval",
    ageConfirmed: true,
  });
  S.assign
    .filter(
      (a) =>
        roleBase(a.role) === "A" && a.ctx === d.ctx && a.status === "Active",
    )
    .forEach((a) =>
      notify(
        a.pid,
        "Access request from " + d.name.trim(),
        "admin",
        { tab: "requests" },
        a.id,
      ),
    );
  audit("Access requested (no account created)", d.email, ctxName(d.ctx));
  clearF("apply");
  UI.p = { sent: 1 };
  save();
  render();
};
