// ---------- INVITATIONS & USERS (shared by Org Rep and Organization Admin) ----------
function inviteTable(scopeCtx) {
  const inv = S.invites.filter((i) => !scopeCtx || i.ctx === scopeCtx);
  inv.forEach((i) => {
    if (["Pending", "Resent"].includes(i.status) && i.expires < today())
      i.status = "Expired";
  });
  const cn = (i) => S.contexts.find((c) => c.id === i.ctx).name;
  const uniq = (xs) => [...new Set(xs)].filter(Boolean);
  const canResend = (i) => ["Pending", "Resent", "Expired"].includes(i.status);
  const canRevoke = (i) => ["Pending", "Resent"].includes(i.status);
  return dataView("adm:inv:" + (scopeCtx || "all"), {
    label: "invitations",
    items: inv,
    search: (i) =>
      i.email +
      " " +
      roleName(i.role, i.ctx) +
      " " +
      cn(i) +
      " " +
      P(i.by).name,
    quick: {
      label: "Status",
      options: uniq(inv.map((i) => i.status)).map((x) => [x, x]),
      test: (i, v) => i.status === v,
    },
    filters: [
      {
        key: "role",
        label: "Role",
        options: uniq(inv.map((i) => i.role)).map((r) => [r, ROLE[r] || r]),
        test: (i, v) => i.role === v,
      },
      ...(scopeCtx
        ? []
        : [
            {
              key: "ctx",
              label: "Context",
              options: uniq(inv.map((i) => i.ctx)).map((c) => [
                c,
                S.contexts.find((x) => x.id === c).name,
              ]),
              test: (i, v) => i.ctx === v,
            },
          ]),
    ],
    sorts: [
      [
        "until",
        "Valid until",
        (a, b) => String(a.expires).localeCompare(String(b.expires)),
      ],
      ["email", "Email", (a, b) => a.email.localeCompare(b.email)],
      ["status", "Status", (a, b) => a.status.localeCompare(b.status)],
    ],
    rowId: (i) => i.id,
    row: (i) => ({
      lead: `<span class="av adm-inv-av" aria-hidden="true">${ic("mail", 14)}</span>`,
      title: `<span class="adm-em">${h(i.email)}</span>`,
      sub: `${roleName(i.role, i.ctx)} · ${h(cn(i))}`,
      meta: [
        `Sent ${fmt(i.sent)}`,
        i.decided
          ? `${i.status} ${fmt(i.decided)}`
          : `Valid until ${fmt(i.expires)}`,
        `Invited by ${nm(i.by)}`,
      ],
      badges: pill(i.status),
      primary: canResend(i)
        ? B("Resend", "invAct", { id: i.id, v: "Resent" })
        : "",
      menu: canRevoke(i)
        ? CB(
            ic("x", 16) + "Revoke",
            "invAct",
            { id: i.id, v: "Revoked" },
            "Revoke the invitation for " +
              i.email +
              "? It can no longer be accepted.",
            "menu-i danger",
            "Revoke",
          )
        : "",
    }),
    bulk: [
      {
        label: "Resend",
        icon: "refresh",
        run: (ids) =>
          ids
            .map((id) => byId("invites", id))
            .filter((i) => i && canResend(i))
            .forEach((i) => A.invAct({ id: i.id, v: "Resent" })),
      },
      {
        label: "Revoke",
        icon: "x",
        danger: true,
        confirm:
          "Revoke the selected pending invitations? They can no longer be accepted. Accepted, rejected, expired and already revoked invitations are left as they are.",
        run: (ids) =>
          ids
            .map((id) => byId("invites", id))
            .filter((i) => i && canRevoke(i))
            .forEach((i) => A.invAct({ id: i.id, v: "Revoked" })),
      },
    ],
    empty: [
      "mail",
      "No invitations yet",
      "Invite people to give them a role in this tenant.",
      "",
    ],
  });
}
A.invAct = (d) => {
  const i = byId("invites", d.id);
  i.status = d.v;
  if (d.v === "Resent") {
    const e = new Date();
    e.setDate(e.getDate() + S.settings.inviteValidityDays);
    i.expires = e.toISOString().slice(0, 10);
    if (i.kind === "member") tinvNotify(i);
    else i.token = "TKN-" + uid("R");
  }
  audit("Invitation " + d.v, i.id, i.email);
  toast("Invitation " + d.v.toLowerCase() + ".");
  ok();
};
A.invNew = (d) => {
  clearF("inv");
  const allowed = ["P", "F", "M", "C", "S", "A"];
  modal(
    "Create invitations",
    () =>
      `<form data-f="inv" class="col adm-form" novalidate>${fi("inv", "emails", "Email addresses (one per line, or paste a CSV column — up to 1,000)", { type: "textarea", rows: 5, req: true })}<div class="f2">${fi("inv", "role", "Nominated role", { type: "select", req: true, opts: invitableRoles(allowed).map((r) => [r.id, r.name + (r.system ? "" : " (custom)")]) })}${fi("inv", "days", "Valid for (days)", { type: "number", req: true, min: 1, value: S.settings.inviteValidityDays })}</div>${fi("inv", "ctx", "Tenant", { type: "select", req: true, opts: [[ctxId(), ctxName(ctxId())]], value: ctxId(), help: "You invite people into the tenant you are working in. Switch tenant to invite into another one you administer." })}${banner("info", "", "Enter exact email addresses. A person who already has a PHOENIX account gets a join request to accept or reject in the app; anyone else gets a single-use email link. Existing members of this tenant are skipped. Sensitive roles need approval after acceptance.")}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send invitations</button></div></form>`,
  );
};
F.inv = (d) => {
  if (
    !validate("inv", d, {
      emails: ["req"],
      role: ["req"],
      days: ["req", "num"],
      ctx: ["req"],
    })
  )
    return render();
  const list = d.emails
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const bad = list.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (list.length > 1000) {
    UI.err.inv = { emails: "Maximum 1,000 invitations per upload." };
    return render();
  }
  if (bad.length) {
    UI.err.inv = {
      emails:
        "Invalid: " + bad.slice(0, 5).join(", ") + (bad.length > 5 ? "…" : ""),
    };
    return render();
  }
  const e = new Date();
  e.setDate(e.getDate() + +d.days);
  let dup = 0,
    mem = 0;
  [...new Set(list.map((em) => em.toLowerCase()))].forEach((em) => {
    const p = personByEmail(em);
    // one membership per person and tenant: existing members are not invited again
    if (
      p &&
      S.assign.some(
        (a) => a.pid === p.id && a.ctx === d.ctx && a.status !== "Declined",
      )
    ) {
      mem++;
      return;
    }
    // one open invitation per person and tenant
    if (
      S.invites.some(
        (i) =>
          (i.email.toLowerCase() === em || (p && i.pid === p.id)) &&
          i.ctx === d.ctx &&
          ["Pending", "Resent"].includes(i.status) &&
          i.expires >= today(),
      )
    ) {
      dup++;
      return;
    }
    // A registered person gets an in-app join request; anyone else a single-use email link. The admin sees the
    // same result either way, so the form cannot be used to find out who has an account.
    const iv = {
      id: uid("i"),
      email: em,
      role: d.role,
      ctx: d.ctx,
      status: "Pending",
      expires: e.toISOString().slice(0, 10),
      by: myId(),
      sent: today(),
      ...(p ? { kind: "member", pid: p.id } : { token: "TKN-" + uid("") }),
    };
    S.invites.push(iv);
    if (p) tinvNotify(iv);
  });
  const sent = new Set(list.map((em) => em.toLowerCase())).size - dup - mem;
  audit("Invitations created", d.ctx, sent + " × " + ROLE[d.role]);
  UI.modal = null;
  clearF("inv");
  toast(
    `${sent} invitation(s) sent${dup ? ", " + dup + " already pending" : ""}${mem ? ", " + mem + " already member(s) of this tenant" : ""}.`,
    sent ? "ok" : "warn",
  );
  ok();
};
// ---------- TENANT INVITATIONS (a tenant asks a registered person to join) ----------
// An invitation is addressed to the person, not to one of their roles, so its notice shows in every tenant.
function notifyPerson(pid, t, r, p) {
  notify(pid, t, r, p);
  Object.assign(S.notifs[0], { aid: null, ctx: null });
}
const tinvNotify = (i) =>
  notifyPerson(
    i.pid,
    `${ctxName(i.ctx)} invited you to join as ${roleName(i.role, i.ctx)}`,
    "myinvites",
  );
const tinvLive = (i) =>
  ["Pending", "Resent"].includes(i.status) && i.expires >= today();
function myTenantInvites(pendingOnly) {
  return S.invites.filter(
    (i) =>
      i.kind === "member" && i.pid === myId() && (!pendingOnly || tinvLive(i)),
  );
}
// The inviting admin's assignment in the inviting tenant: their notices about the reply belong there.
const tinvAdminAid = (i) =>
  (S.assign.find((a) => a.pid === i.by && a.ctx === i.ctx) || {}).id;
route("myinvites", "any", () => {
  const all = myTenantInvites().sort((a, b) => b.sent.localeCompare(a.sent));
  all.forEach((i) => {
    if (["Pending", "Resent"].includes(i.status) && i.expires < today())
      i.status = "Expired";
  });
  const open = all.filter(tinvLive);
  const past = all.filter((i) => !tinvLive(i));
  const orgType = (i) => {
    const c = S.contexts.find((x) => x.id === i.ctx) || {};
    return (S.orgs.find((o) => o.id === c.org) || {}).type || c.kind || "";
  };
  const inviter = (i) => {
    const a = S.assign.find((x) => x.id === tinvAdminAid(i));
    return nm(i.by) + (a ? ` · ${h(roleName(a.role, a.ctx))}` : "");
  };
  const pendCard = (i) =>
    card(
      h(ctxName(i.ctx)),
      h(orgType(i)),
      dl([
        ["Role offered", pill(roleName(i.role, i.ctx), "p-purple")],
        ["Invited by", inviter(i)],
        ["Invitation date", fmt(i.sent)],
        ["Valid until", fmt(i.expires)],
      ]) +
        (roleNeedsApproval(roleBase(i.role))
          ? banner(
              "warn",
              "This role needs approval",
              "After you accept, an approver in " +
                h(ctxName(i.ctx)) +
                " must approve it before you can work in it.",
            )
          : "") +
        `<div class="actions">${CB("Reject", "tinvReject", { id: i.id }, "Reject the invitation to join " + ctxName(i.ctx) + "? No membership is created, and " + P(i.by).name + " is told you declined.", "btn-s", "Reject")}${B(ic("check", 16) + "Accept", "tinvAccept", { id: i.id }, "btn-p")}</div>`,
      pill("Pending"),
    );
  const pastRow = (i) => {
    const a =
      i.status === "Accepted" &&
      S.assign.find((x) => x.pid === myId() && x.ctx === i.ctx);
    return [
      `<b>${h(ctxName(i.ctx))}</b>`,
      h(roleName(i.role, i.ctx)),
      inviter(i),
      fmt(i.sent),
      pill(i.status) +
        (i.decided ? ` <span class="cap">${fmt(i.decided)}</span>` : ""),
      a && asgUsable(a) && a.id !== S.session.aid
        ? B("Switch to this tenant", "doSwitch", { id: a.id })
        : a && !asgUsable(a)
          ? pill(a.status)
          : "",
    ];
  };
  return (
    head(
      "Tenant invitations",
      `Organizations that have asked you to join them. Accepting adds a membership in that tenant. Your primary organization (${h(asgLabel(primaryAsg()))}) and your other memberships stay as they are.`,
    ) +
    `<div class="col" style="gap:16px">${
      open.length
        ? open.map(pendCard).join("")
        : card(
            "",
            "",
            empty(
              "mail",
              "No invitations waiting",
              "When a Tenant Admin invites you to their organization, the request appears here and in your notifications.",
            ),
          )
    }${
      past.length
        ? card(
            "Earlier invitations",
            "Answered, expired or withdrawn by the tenant.",
            table(
              ["Tenant", "Role", "Invited by", "Invitation date", "Status", ""],
              past.map(pastRow),
            ),
          )
        : ""
    }</div>`
  );
});
A.tinvAccept = (d) => {
  const i = byId("invites", d.id);
  const p = me();
  // fix the primary membership before adding another, so accepting never changes it
  if (!p.primary) p.primary = primaryAsg().id;
  i.status = "Accepted";
  i.decided = today();
  const have = S.assign.find(
    (a) => a.pid === p.id && a.ctx === i.ctx && a.status !== "Declined",
  );
  if (have) {
    audit("Tenant invitation accepted — already a member", i.id, asgLabel(have));
    toast(
      `You are already a member of ${ctxName(i.ctx)}. No second membership was added.`,
      "warn",
    );
    return ok();
  }
  const na = {
    id: uid("a"),
    pid: p.id,
    role: i.role,
    ctx: i.ctx,
    status: roleNeedsApproval(roleBase(i.role))
      ? "Pending role approval"
      : "Active",
    bundles: [],
    onb: {
      agreement: false,
      consents: false,
      profile: true,
      compass: roleBase(i.role) !== "P",
    },
    inv: i.id,
  };
  S.assign.push(na);
  notify(
    i.by,
    `${p.name} accepted the invitation to join ${ctxName(i.ctx)} as ${roleName(i.role, i.ctx)}`,
    "admin",
    { tab: "invites" },
    tinvAdminAid(i),
  );
  if (na.status !== "Active") {
    na.approval = [
      { at: now(), by: "system", note: "Sensitive role — approval requested" },
    ];
    // only the approvers of the tenant the person joined are asked
    S.assign
      .filter(
        (x) =>
          roleBase(x.role) === "A" && x.ctx === i.ctx && x.status === "Active",
      )
      .forEach((x) =>
        notify(
          x.pid,
          `Role approval requested: ${p.name} — ${roleName(i.role, i.ctx)}`,
          "admin",
          { tab: "requests" },
          x.id,
        ),
      );
  }
  audit("Tenant invitation accepted", i.id, asgLabel(na));
  toast(
    na.status === "Active"
      ? `You joined ${ctxName(i.ctx)} as ${roleName(i.role, i.ctx)}. Switch to it from the tenant menu at the top left.`
      : `You joined ${ctxName(i.ctx)}. The ${roleName(i.role, i.ctx)} role is awaiting approval.`,
  );
  ok();
};
A.tinvReject = (d) => {
  const i = byId("invites", d.id);
  i.status = "Rejected";
  i.decided = today();
  notify(
    i.by,
    `${me().name} declined the invitation to join ${ctxName(i.ctx)}`,
    "admin",
    { tab: "invites" },
    tinvAdminAid(i),
  );
  audit("Tenant invitation rejected", i.id, ctxName(i.ctx));
  toast("Invitation rejected. No membership was created.");
  ok();
};
// Demo data stored before tenant invitations: drop the old seeded second memberships (a person now gains another
// tenant only by accepting a tenant invitation), add the second tenant's admin and the sample invitations, and fix
// everyone's primary membership to the one they already treat as home.
function tenantMigrate() {
  const sd = seed();
  const gone = ["a1b", "a3b"];
  S.assign = S.assign.filter((a) => !gone.includes(a.id));
  S.notifs = S.notifs.filter((n) => !gone.includes(n.aid));
  S.people.forEach((p) => {
    if (gone.includes(p.primary)) delete p.primary;
    if (gone.includes(p.lastAid)) delete p.lastAid;
  });
  ["people", "assign", "invites"].forEach((k) =>
    sd[k]
      .filter(
        (x) =>
          ["p18", "a18", "ti1", "ti2", "ti3"].includes(x.id) && !byId(k, x.id),
      )
      .forEach((x) => S[k].push(x)),
  );
  S.people.forEach((p) => {
    const a = !p.primary && primaryAsg(p.id);
    if (a) p.primary = a.id;
  });
}
// crud: the Organization Admin can also add, view, edit and delete the account itself.
function usersTable(ctxFilter, canEdit, crud) {
  const as = S.assign
    .filter((a) => !ctxFilter || a.ctx === ctxFilter)
    .sort(
      (x, y) =>
        (y.status === "Pending role approval") -
        (x.status === "Pending role approval"),
    );
  const cn = (a) => S.contexts.find((c) => c.id === a.ctx).name;
  const uniq = (xs) => [...new Set(xs)].filter(Boolean);
  return dataView("adm:users:" + (ctxFilter || "all"), {
    label: "role assignments",
    searchLabel: "Search people, emails or roles",
    items: as,
    search: (a) =>
      P(a.pid).name +
      " " +
      (P(a.pid).email || "") +
      " " +
      roleName(a.role, a.ctx) +
      " " +
      cn(a) +
      " " +
      a.bundles.join(" "),
    quick: {
      label: "Status",
      options: uniq(as.map((a) => a.status)).map((x) => [x, x]),
      test: (a, v) => a.status === v,
    },
    filters: [
      {
        key: "role",
        label: "Role",
        options: uniq(as.map((a) => a.role)).map((r) => [r, ROLE[r] || r]),
        test: (a, v) => a.role === v,
      },
      {
        key: "bundle",
        label: "Permission bundle",
        options: S.bundles.map((b) => [b.name, b.name]),
        test: (a, v) => a.bundles.includes(v),
      },
      ...(ctxFilter
        ? []
        : [
            {
              key: "ctx",
              label: "Context",
              options: uniq(as.map((a) => a.ctx)).map((c) => [
                c,
                S.contexts.find((x) => x.id === c).name,
              ]),
              test: (a, v) => a.ctx === v,
            },
          ]),
    ],
    sorts: [
      ["name", "Name", (a, b) => P(a.pid).name.localeCompare(P(b.pid).name)],
      [
        "role",
        "Role",
        (a, b) =>
          String(roleName(a.role, a.ctx)).localeCompare(
            String(roleName(b.role, b.ctx)),
          ),
      ],
      ["status", "Status", (a, b) => a.status.localeCompare(b.status)],
    ],
    row: (a) => ({
      lead: `<span class="av">${ini(a.pid)}</span>`,
      title: nm(a.pid),
      sub: h(P(a.pid).email),
      meta: [
        `<span class="adm-role">${roleName(a.role, a.ctx)}</span>`,
        h(cn(a)),
      ],
      badges:
        pill(a.status) +
        a.bundles.map((b) => pill(b, "p-grey")).join("") +
        (a.mandate
          ? pill(
              a.mandate.valid
                ? "Mandate to " + fmt(a.mandate.until)
                : "Mandate expired",
              a.mandate.valid ? "p-teal" : "p-red",
            )
          : ""),
      primary: crud
        ? B("View", "userView", { id: a.id }) +
          (userEditable(a.pid)
            ? B(ic("edit", 14) + "Edit", "userEdit", { id: a.id }) +
              B("Manage", "userManage", { id: a.id }) +
              CB(
                "Delete",
                "userDel",
                { pid: a.pid },
                "Delete the account of " +
                  P(a.pid).name +
                  "? All of their roles are removed and they can no longer sign in. Their past contributions stay on record under their name.",
                "btn-d btn-sm",
              )
            : "")
        : canEdit && a.pid !== myId()
          ? B("Manage", "userManage", { id: a.id })
          : "",
    }),
    empty: [
      "users",
      "No users in this context yet",
      "Invite people to give them a role.",
      "",
    ],
  });
}
// ---- user accounts (Organization Admin): create, read, update, delete
// Not your own account, and never a Platform Administrator's account.
const userEditable = (pid) =>
  pid !== myId() &&
  !S.assign.some((a) => a.pid === pid && roleBase(a.role) === "T");
const USER_ROLES = ["P", "F", "M", "C", "S", "A"];
// A new role goes into the administrator's own context; an edited role keeps its context.
const userCtx = (a) => (a ? a.ctx : ctxId());
function userForm(p, a) {
  const f = "usr";
  const cx = S.contexts.find((c) => c.id === userCtx(a));
  const st = a
    ? ["Active", "Deactivated"].includes(a.status)
      ? ["Active", "Deactivated"]
      : [a.status, "Active", "Deactivated"]
    : null;
  return `<form data-f="usr" class="col" style="gap:14px" novalidate>${errSum(f)}<input type="hidden" name="aid" value="${a ? a.id : ""}">
  <h3 class="h3">Account</h3>
  <div class="f2">${fi(f, "name", "Full name", { req: true, value: p?.name, auto: "off" })}${fi(f, "display", "Display name", { req: true, value: p?.display, auto: "off" })}</div>
  <div class="f2">${fi(f, "email", "Email address", { type: "email", req: true, value: p?.email, auto: "off" })}${fi(
    f,
    "age",
    "Age confirmation on file",
    {
      type: "select",
      req: true,
      value: p?.ageConfirmed ? "yes" : "",
      ph: "Choose",
      opts: [
        ["yes", "The person confirmed they meet the programme age requirement"],
        ["no", "Not yet confirmed"],
      ],
      help: "Age confirmation instead of a date of birth.",
    },
  )}</div>
  <h3 class="h3">${a ? "This role assignment" : "First role"}</h3>
  <div class="f2">${fi(f, "role", "Role", { type: "select", req: true, ph: "Choose a role", value: a?.role, opts: invitableRoles(USER_ROLES).map((r) => [r.id, r.name + (r.system ? "" : " (custom)")]) })}${fi(f, "ctxName", "Context", { value: cx ? cx.name : "", ro: true })}</div>
  ${a ? fi(f, "status", "Role status", { type: "select", value: a.status, opts: st }) : ""}
  ${a && S.assign.filter((x) => x.pid === a.pid).length > 1 ? banner("info", "", "Account details apply to every role this person holds. Role and status apply only to this assignment.") : ""}
  ${a ? "" : banner("info", "", "The account is created verified and the role is active. On first sign-in the person accepts the agreement for their role and completes their profile.")}
  <div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">${a ? "Save changes" : "Create user"}</button></div></form>`;
}
A.userNew = () => {
  clearF("usr");
  modal("Add user", () => userForm(null, null), true);
};
A.userEdit = (d) => {
  clearF("usr");
  const a = byId("assign", d.id);
  modal("Edit " + nm(a.pid), () => userForm(P(a.pid), a), true);
};
A.userView = (d) => {
  const a = byId("assign", d.id);
  const p = P(a.pid);
  const roles = S.assign.filter((x) => x.pid === p.id);
  modal(
    h(p.name),
    `<div class="col" style="gap:16px">${dl([
      ["Full name", h(p.name)],
      ["Display name", h(p.display)],
      ["Email", h(p.email)],
      [
        "Age confirmation",
        p.ageConfirmed
          ? "Confirmed " +
            fmt(p.ageConfirmed === true ? today() : p.ageConfirmed)
          : '<span class="cap">Not recorded</span>',
      ],
      [
        "Organization",
        h((S.orgs.find((o) => o.id === p.org) || {}).name || "—"),
      ],
      ["Email verified", p.verified ? "Yes" : "No"],
      ["Account status", pill(p.status || "Active")],
    ])}<div><h3 class="h3" style="margin-bottom:8px">Roles</h3>${table(
      ["Role", "Context", "Status"],
      roles.map((x) => [
        h(roleName(x.role, x.ctx)),
        h((S.contexts.find((c) => c.id === x.ctx) || {}).name || x.ctx),
        pill(x.status),
      ]),
    )}</div><div class="actions">${B("Close", "closeM")}${userEditable(p.id) ? B(ic("edit", 14) + "Edit", "userEdit", { id: a.id }, "btn-p btn-sm") : ""}</div></div>`,
    true,
  );
};
F.usr = (d) => {
  const a = d.aid ? byId("assign", d.aid) : null;
  const pid = a ? a.pid : null;
  const okv = validate("usr", d, {
    name: ["req"],
    display: ["req"],
    email: [
      "req",
      "email",
      [
        "fn",
        {
          f: (v) => {
            const x = personByEmail(v);
            return !x || x.id === pid;
          },
          m: "Another account already uses this email address.",
        },
      ],
    ],
    age: ["req"],
    role: ["req"],
  });
  if (!okv) return render();
  const ctx = userCtx(a);
  if (
    S.assign.some(
      (x) =>
        x !== a && x.pid === pid && pid && x.role === d.role && x.ctx === ctx,
    )
  ) {
    UI.err.usr = {
      role: "This person already holds that role in that context.",
    };
    return render();
  }
  const fields = {
    name: d.name.trim(),
    display: d.display.trim(),
    email: d.email.trim(),
    ageConfirmed: d.age === "yes" ? today() : null,
  };
  if (a) {
    const p = P(pid);
    const was = JSON.stringify({
      name: p.name,
      display: p.display,
      email: p.email,
      dob: p.dob,
      role: a.role,
      ctx: a.ctx,
      status: a.status,
    });
    Object.assign(p, fields);
    const roleChanged = a.role !== d.role;
    a.role = d.role;
    if (d.status && d.status !== a.status) {
      a.status = d.status;
      notify(
        a.pid,
        "Your " + roleName(a.role, a.ctx) + " access is now " + d.status,
        "home",
      );
    }
    if (roleChanged)
      notify(
        a.pid,
        "Your role was changed to " +
          roleName(a.role, a.ctx) +
          " in " +
          S.contexts.find((c) => c.id === a.ctx).name,
        "home",
      );
    audit(
      "User updated",
      p.id,
      was +
        " → " +
        JSON.stringify({
          ...fields,
          role: a.role,
          ctx: a.ctx,
          status: a.status,
        }),
    );
    toast("User updated.");
  } else {
    const p = {
      id: uid("p"),
      ...fields,
      verified: true,
      status: "Active",
      createdVia: "admin",
      createdAt: now(),
    };
    S.people.push(p);
    S.pw[p.id] = "demo1234";
    S.consents[p.id] = { history: [] };
    S.assign.push({
      id: uid("a"),
      pid: p.id,
      role: d.role,
      ctx,
      status: "Active",
      bundles: [],
      approval: [
        { at: now(), by: myId(), note: "Account created by " + me().name },
      ],
      onb: {
        agreement: false,
        consents: false,
        profile: false,
        compass: roleBase(d.role) !== "P",
      },
    });
    notify(p.id, "An account was created for you as " + ROLE[d.role], "home");
    audit("User created", p.id, ROLE[d.role] + " · " + ctx);
    toast("User created.");
  }
  UI.modal = null;
  clearF("usr");
  ok();
};
// Soft delete: the person record stays so names on past records still resolve; roles and sign-in are removed.
A.userDel = (d) => {
  const p = P(d.pid);
  const n = S.assign.filter((a) => a.pid === p.id).length;
  S.assign = S.assign.filter((a) => a.pid !== p.id);
  delete S.pw[p.id];
  p.status = "Deleted";
  p.deletedAt = now();
  audit("User deleted", p.id, p.email + " · " + n + " role(s) removed");
  toast(p.name + "’s account was deleted.");
  ok();
};
A.userManage = (d) => {
  const a = byId("assign", d.id);
  modal(
    "Manage " + nm(a.pid),
    () => `<div class="adm-dlg"><div class="adm-dlg-who"><span class="av lg">${ini(a.pid)}</span><div class="adm-who-t"><b>${nm(a.pid)}</b><div class="cap">${h(P(a.pid).email)}</div></div></div>${dl(
      [
        ["Role", roleName(a.role, a.ctx)],
        ["Context", h(S.contexts.find((c) => c.id === a.ctx).name)],
        ["Status", pill(a.status)],
      ],
    )}
 <section class="adm-sec"><h3 class="adm-sec-t">Access</h3><div class="row wrap adm-sec-a">${a.status === "Pending role approval" ? B("Approve role", "roleDecide", { id: a.id, v: "Active" }, "btn-p btn-sm") + B("Decline role", "roleDecide", { id: a.id, v: "Role not activated" }) : a.status === "Active" ? CB("Deactivate", "userStatus", { id: a.id, v: "Deactivated" }, "Deactivate this " + roleName(a.role, a.ctx) + " access? The person keeps their account, consent, correction and export rights.", "btn-d btn-sm") : B("Activate", "userStatus", { id: a.id, v: "Active" }, "btn-p btn-sm")}</div></section>
 <form data-f="bund" class="adm-sec"><input type="hidden" name="id" value="${a.id}"><span class="lbl adm-sec-t">Specialist permission bundles</span><div class="adm-chks">${S.bundles.map((b) => `<label class="adm-chk"><input class="chk" type="checkbox" name="b" value="${b.name}" ${a.bundles.includes(b.name) ? "checked" : ""}><span class="adm-chk-t">${b.name}</span><span class="cap">· ${h(b.approval)}</span></label>`).join("")}</div><span class="help">Higher-trust bundles need Programme/Organization Administrator approval and are not delegated at workspace level.</span><div class="actions"><span></span><button class="btn btn-s btn-sm" type="submit">Save bundles</button></div></form>
 ${["A", "C"].includes(roleBase(a.role)) ? `<form data-f="mand" class="adm-sec"><input type="hidden" name="id" value="${a.id}"><span class="lbl adm-sec-t">Mandate (authority to bind the organization)</span><div class="f2">${fi("mand", "scope", "Scope", { value: a.mandate?.scope, req: true })}${fi("mand", "until", "Valid until", { type: "date", req: true, value: a.mandate?.until })}</div><div class="actions">${a.mandate ? CB("Revoke mandate", "mandRevoke", { id: a.id }, "Revoke this mandate? Elevated access is removed; ordinary access continues.", "btn-d btn-sm") : "<span></span>"}<button class="btn btn-s btn-sm" type="submit">Grant / update mandate</button></div></form>` : ""}</div>`,
  );
};
A.userStatus = (d) => {
  const a = byId("assign", d.id);
  a.status = d.v;
  notify(
    a.pid,
    "Your " + roleName(a.role, a.ctx) + " access is now " + d.v,
    "home",
  );
  audit("User " + d.v, a.id, "");
  UI.modal = null;
  ok();
};
F.bund = (d) => {
  const a = byId("assign", d.id);
  const nb = [].concat(d.b || []);
  a.bundles = nb;
  audit("Bundles changed", a.id, nb.join(", "));
  UI.modal = null;
  toast("Bundles updated.");
  ok();
};
F.mand = (d) => {
  if (!validate("mand", d, { scope: ["req"], until: ["req", "date"] }))
    return render();
  const a = byId("assign", d.id);
  a.mandate = { valid: true, until: d.until, scope: d.scope };
  audit("Mandate granted", a.id, d.scope);
  UI.modal = null;
  clearF("mand");
  ok();
};
A.mandRevoke = (d) => {
  const a = byId("assign", d.id);
  a.mandate.valid = false;
  S.rooms.forEach((x) =>
    x.members
      .filter((m) => m.pid === a.pid && /Institutional/.test(m.role))
      .forEach((m) => (m.role = "Member")),
  );
  audit(
    "Mandate revoked",
    a.id,
    "Elevated access removed; ordinary access continues",
  );
  UI.modal = null;
  toast("Mandate revoked. Elevated access removed; ordinary access continues.");
  ok();
};
// ---------- BUILD-FREEZE: configuration status, packs, parameters, versions, org requests ----------
// Each setting shows whether it is frozen by the Alpha, configurable within delegation, or pending a WSS decision.
const CFG_ST = { Frozen: "p-navy", Configurable: "p-teal" };
const cfgSt = (s) => pill(s, CFG_ST[s] || "p-grey");
function votingCard() {
  const v = S.settings.voting;
  return card(
    "Circle voting parameters",
    "One eligible member = one vote. Set the threshold and quorum for new votes.",
    `<form data-f="votecfg" class="col adm-form" novalidate>
    <div class="row wrap adm-vrow"><b>Vote weight</b><span>One eligible member = one vote</span></div>
    <div class="g3">${fi("votecfg", "threshold", "Approval threshold (% of eligible voters)", { type: "number", min: 1, maxv: 100, value: v.threshold, req: true })}${fi("votecfg", "quorum", "Quorum (% of eligible voters who must vote)", { type: "number", min: 1, maxv: 100, value: v.quorum, req: true })}${fi("votecfg", "tie", "When the vote ties", { value: v.tie, ro: true })}</div>
    <div class="actions"><span class="help">Changes apply to votes opened after saving. Open votes keep the rule they started with.</span><button class="btn btn-p btn-sm" type="submit">Save parameters</button></div></form>`,
    "",
    "adm-panel",
  );
}
F.votecfg = (d) => {
  if (
    !validate("votecfg", d, {
      threshold: ["req", "num"],
      quorum: ["req", "num"],
    })
  )
    return render();
  const v = S.settings.voting;
  const before = `${v.threshold}% / ${v.quorum}%`;
  Object.assign(v, {
    threshold: Math.min(100, +d.threshold),
    quorum: Math.min(100, +d.quorum),
    weight: "Equal",
  });
  audit(
    "Voting parameters changed",
    "settings.voting",
    before +
      " → " +
      `${v.threshold}% / ${v.quorum}%`,
  );
  clearF("votecfg");
  toast("Voting parameters saved. Equal vote weight is unchanged.");
  ok();
};
function decisionsCard() {
  return "";
}
// Packs differ by labels, onboarding questions, templates, enabled flows, evidence types and metrics — never code.
function packsView() {
  const cur = pack();
  return `<div class="adm-stack">${card(
    "Use-case packs " + `<span class="adm-n">${S.packs.length}</span>`,
    "Configure labels, templates and enabled flows for each programme pack.",
    table(
      [
        "Pack",
        "Workspace label",
        "Circle label",
        "Enabled flows",
        "Status",
        "",
      ],
      S.packs.map((p) => [
        `<b>${h(p.name)}</b>${p.id === cur.id ? " " + pill("This context", "p-teal") : ""}`,
        h(p.labels.workspace),
        h(p.labels.circle),
        `<span class="cap">${p.flows.length} of 12</span>`,
        pill(p.status === "Active" ? "Active" : "Draft"),
        p.status === "Active"
          ? B("Configure", "packCfg", { id: p.id })
          : B("Configure", "packCfg", { id: p.id }) +
            B("Activate", "packAct", { id: p.id }, "btn-p btn-sm"),
      ]),
    ),
    "",
    "adm-panel",
  )}${card(
    "Request access link",
    "Share this link with people who want to join " +
      h(cur.name) +
      ". It shows only this pack and its programmes, and requests from it come to this pack’s Organization Admin.",
    `<div class="adm-link"><code class="adm-mono">${h(applyLink(cur.id))}</code>${B(ic("link", 14) + "Copy link", "copyApplyLink", { id: cur.id })}</div>`,
    "",
    "adm-panel",
  )}${votingCard()}</div>`;
}
A.copyApplyLink = (d) => {
  const u = applyLink(d.id);
  try {
    navigator.clipboard.writeText(u).then(
      () => toast("Link copied."),
      () => toast("Copy did not work. Select the link and copy it.", "warn"),
    );
  } catch (e) {
    toast("Copy did not work. Select the link and copy it.", "warn");
  }
};
A.packCfg = (d) => {
  const p = byId("packs", d.id);
  clearF("pkc");
  modal(
    "Configure pack: " + h(p.name),
    () => `<form data-f="pkc" class="col adm-form" novalidate><input type="hidden" name="id" value="${p.id}">
    <div class="g3">${fi("pkc", "workspace", "Label shown for Action Workspaces", { value: p.labels.workspace, req: true, help: "The system concept stays “Action Workspace”." })}${fi("pkc", "circle", "Label for Circles", { value: p.labels.circle, req: true })}${fi("pkc", "rope", "Label for Rope Teams", { value: p.labels.rope, req: true })}</div>
    ${fi("pkc", "evidenceTypes", "Evidence types", { value: p.evidenceTypes, req: true })}
    <div class="adm-locked"><span class="adm-locked-ic" aria-hidden="true">${ic("lock", 16)}</span><div><b>Same for every pack (locked)</b><p class="cap">Identity · consent and optional purposes · role authority · matching rules · evidence states · Harvest and profile controls · audit</p></div></div>
    <div class="actions"><span class="help">Saved as configuration. No code fork, database change or vendor script.</span><button class="btn btn-p" type="submit">Save pack</button></div></form>`,
    true,
  );
};
F.pkc = (d) => {
  if (
    !validate("pkc", d, {
      workspace: ["req"],
      circle: ["req"],
      rope: ["req"],
      evidenceTypes: ["req"],
    })
  )
    return render();
  const p = byId("packs", d.id);
  p.labels = {
    workspace: d.workspace.trim(),
    circle: d.circle.trim(),
    rope: d.rope.trim(),
  };
  p.evidenceTypes = d.evidenceTypes.trim();
  audit("Pack configured", p.id, JSON.stringify(p.labels));
  UI.modal = null;
  clearF("pkc");
  toast(p.name + " saved.");
  ok();
};
A.packAct = (d) => {
  const p = byId("packs", d.id);
  p.status = "Active";
  audit("Pack activated", p.id, p.name);
  toast(p.name + " is active. Programmes can now use it.");
  ok();
};
// Configuration versions: save, export and restore configuration only. Participant data and rights are never touched.
const cfgSnap = () =>
  JSON.parse(
    JSON.stringify({
      packs: S.packs,
      voting: S.settings.voting,
      templates: S.templates,
      participantCanProposeWorkspace: S.settings.participantCanProposeWorkspace,
    }),
  );
function versionsView() {
  const vs = S.configVersions;
  return card(
    "Configuration versions " + `<span class="adm-n">${vs.length}</span>`,
    "Restoring a version changes configuration only (packs, labels, templates, voting parameters). Participant records, consent choices and rights are kept as they are.",
    table(
      ["Version", "Saved", "By", "Note", ""],
      vs.map((v, i) => [
        `<b>v${i + 1}</b>`,
        fmt(v.at),
        nm(v.by),
        h(v.note),
        (v.snap
          ? CB(
              "Restore",
              "cfgRestore",
              { id: v.id },
              "Restore configuration v" +
                (i + 1) +
                "? Current configuration is saved first as a new version. Participant data and rights are not changed.",
              "btn-s btn-sm",
            )
          : '<span class="cap">Baseline record</span>') +
          B(ic("download", 14) + "Export", "cfgExport", { id: v.id }),
      ]),
    ),
    B(
      ic("archive", 14) + "Save current configuration",
      "cfgSave",
      {},
      "btn-p btn-sm",
    ),
    "adm-panel",
  );
}
A.cfgSave = (d) => {
  S.configVersions.push({
    id: uid("cv"),
    at: now(),
    by: myId(),
    note: (d && d.note) || "Saved from Programme admin",
    snap: cfgSnap(),
  });
  audit("Configuration version saved", "config", "v" + S.configVersions.length);
  toast("Configuration saved as v" + S.configVersions.length + ".");
  ok();
};
A.cfgRestore = (d) => {
  const v = byId("configVersions", d.id);
  if (!v || !v.snap) return;
  S.configVersions.push({
    id: uid("cv"),
    at: now(),
    by: myId(),
    note: "Automatic save before restoring " + h(v.note),
    snap: cfgSnap(),
  });
  const s = JSON.parse(JSON.stringify(v.snap));
  // The three packs, their names and role names belong to the Platform Administrator: only pack configuration is restored.
  S.packs.forEach((p) => {
    const o = (s.packs || []).find((x) => x.id === p.id);
    if (o)
      Object.assign(p, o, {
        name: p.name,
        status: p.status,
        roleNames: p.roleNames,
      });
  });
  S.settings.voting = s.voting;
  S.templates = s.templates;
  S.settings.participantCanProposeWorkspace = s.participantCanProposeWorkspace;
  audit("Configuration restored", v.id, v.note);
  toast(
    "Configuration restored. Participant data and rights were not changed.",
  );
  ok();
};
A.cfgExport = (d) => {
  const v = byId("configVersions", d.id);
  try {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              version: v.id,
              at: v.at,
              note: v.note,
              configuration: v.snap || cfgSnap(),
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    a.download = "phoenix-configuration-" + v.id + ".json";
    a.click();
  } catch (e) {}
  audit("Configuration exported", v.id, v.note);
  toast("Configuration exported.");
  ok();
};
// Request access (BF-12): approving issues a normal single-use invitation; declining creates nothing.
function accessReqCard() {
  const rs = (S.accessReqs || []).filter((r) => r.ctx === ctxId());
  return card(
    "Access requests " +
      `<span class="adm-n">${rs.filter((r) => r.status === "Awaiting approval").length}</span>`,
    "People who asked to join. No account exists until you approve and they accept the invitation.",
    table(
      ["Name", "Email", "As", "Reason", "Status", ""],
      rs.map((r) => [
        h(r.name),
        h(r.email),
        h(roleName(r.role, r.ctx)),
        h(r.why || "—"),
        pill(r.status === "Awaiting approval" ? "Pending approval" : r.status),
        r.status === "Awaiting approval"
          ? B(
              "Approve and invite",
              "accessDecide",
              { id: r.id, v: "Invited" },
              "btn-p btn-sm",
            ) + B("Decline", "accessDecide", { id: r.id, v: "Declined" })
          : "",
      ]),
      "No access requests.",
    ),
    "",
    "adm-panel",
  );
}
A.accessDecide = (d) => {
  const r = (S.accessReqs || []).find((x) => x.id === d.id);
  r.status = d.v;
  if (d.v === "Invited") {
    const tok = "TKN-REQ-" + String(1000 + S.seq++).slice(-4);
    S.invites.unshift({
      id: uid("i"),
      token: tok,
      email: r.email,
      role: r.role,
      ctx: r.ctx,
      status: "Pending",
      expires: addDays(today(), S.settings.inviteValidityDays || 14),
      by: myId(),
      sent: today(),
      fromRequest: r.id,
    });
    r.token = tok;
    toast("Invitation sent to " + r.email + " (" + tok + ").");
  } else toast("Request declined. No account was created.");
  audit(
    "Access request " +
      (d.v === "Invited" ? "approved — invitation issued" : "declined"),
    r.id,
    r.email,
  );
  ok();
};
// Approval inbox: operational approvals stay here; specialist decisions are routed to their accountable owner.
function routedCard() {
  const c = ctxId();
  const rows = [
    [
      "Evidence approval",
      S.evidence.filter((e) => e.review === "Submitted").length,
      "Reviewer bundle",
    ],
    [
      "Policy and consent wording",
      S.agreements.filter((g) => g.ctx === c && g.status === "Draft").length,
      "Platform Administrator",
    ],
    [
      "Products, prices and payments",
      S.products.filter((p) => /draft|review/i.test(p.status || "")).length,
      "Platform Administrator",
    ],
  ];
  return card(
    "Routed to specialist owners",
    "You are not the fallback approver for these. Evidence goes to Reviewer bundle holders; policies and products & payments go to the Platform Administrator.",
    table(
      ["Decision", "Waiting", "Decided by"],
      rows.map(([a, n, b]) => [h(a), String(n), pill(b, "p-grey")]),
    ),
    "",
    "adm-panel",
  );
}
function cfgForm(isOrg) {
  const pk = pack();
  return card(
    isOrg
      ? "Configure within the pack envelope"
      : "Use-case pack: " + h(pk.name),
    "Platform-controlled items cannot be changed by a tenant.",
    `<form data-f="cfg" class="col adm-form" novalidate><div class="g3">${fi("cfg", "workspace", "Label shown for Action Workspaces", { value: pk.labels.workspace, ro: true, help: "Set by the Organization Admin in Pack configuration." })}${fi("cfg", "circle", "Label for Circles", { value: pk.labels.circle, req: true })}${fi("cfg", "rope", "Label for Rope Teams", { value: pk.labels.rope, req: true })}</div>${fi("cfg", "propose", "Participants may propose a " + pk.labels.workspace, { type: "checkbox", value: S.settings.participantCanProposeWorkspace ? "yes" : "" })}
 <div class="adm-locked"><span class="adm-locked-ic" aria-hidden="true">${ic("lock", 16)}</span><div><b>Platform-controlled (locked)</b><p class="cap">Consent framework · trust controls · security rules · audit model · core data semantics · Evidence Support Level definitions</p></div></div><div class="actions"><span></span><button class="btn btn-p" type="submit">Save configuration</button></div></form>`,
  );
}
F.cfg = (d) => {
  if (!validate("cfg", d, { circle: ["req"], rope: ["req"] })) return render();
  const pk = pack();
  pk.labels = {
    workspace: pk.labels.workspace || "Action Workspace",
    circle: d.circle,
    rope: d.rope,
  };
  S.settings.participantCanProposeWorkspace = d.propose === "yes";
  audit("Pack configuration changed", pk.id, JSON.stringify(pk.labels));
  clearF("cfg");
  toast("Configuration saved. Labels update everywhere in this pack.");
  ok();
};
function reportsView(isOrg) {
  const c = ctxId();
  const rows = S.metrics.filter((m) => m.status === "Active");
  const xs = [
    "Participation summary (aggregate)",
    "Evidence summary (approved)",
    "Learning Harvests (released)",
    ...(isOrg
      ? []
      : [
          RESEARCH_EXPORT,
          "Audit log",
          "Payments & entitlements",
          "Full configuration",
        ]),
  ];
  return `<div class="adm-report"><dl class="adm-rmeta"><div><dt>Context</dt><dd>${h(ctx().name)}</dd></div><div><dt>Period</dt><dd>Programme to date · as of ${fmt(today())}</dd></div><div><dt>Metrics shown</dt><dd>${rows.length}</dd></div><div><dt>Exports</dt><dd>${xs.length} authorised</dd></div></dl><div class="g12">${card(
    `Starter metrics <span class="adm-n">${rows.length}</span>`,
    "Aggregate only. Metrics never determine trustworthiness, deservingness or fundability.",
    dataView("rep:metrics:" + (isOrg ? "agg" : "all"), {
      label: "metrics",
      items: rows,
      layout: "table",
      search: (m) => m.name + " " + (m.def || "") + " " + m.cat,
      filters: [
        {
          key: "cat",
          label: "Category",
          options: [...new Set(rows.map((m) => m.cat))].map((v) => [v, v]),
          test: (m, v) => m.cat === v,
        },
        {
          key: "gate",
          label: "Gate",
          options: [...new Set(rows.map((m) => m.gate))].map((v) => [v, v]),
          test: (m, v) => m.gate === v,
        },
      ],
      sorts: [
        ["name", "Metric", (a, b) => a.name.localeCompare(b.name)],
        ["cat", "Category", (a, b) => a.cat.localeCompare(b.cat)],
      ],
      columns: [
        {
          label: "Metric",
          sort: "name",
          cell: (m) =>
            `<b>${h(m.name)}</b>${m.def ? `<div class="cap adm-def">${h(m.def)}</div>` : ""}`,
        },
        { label: "Category", sort: "cat", cell: (m) => h(m.cat) },
        {
          label: "Gate",
          cell: (m) =>
            m.gate === "None" ? '<span class="cap">None</span>' : h(m.gate),
        },
        {
          label: "Value",
          num: true,
          cell: (m) => '<b class="adm-val">' + metric(m.id) + "</b>",
        },
      ],
      pageSize: 25,
      empty: [
        "chart",
        "No metrics are visible",
        "An Organization Admin chooses which metrics are shown.",
        "",
      ],
    }),
    "",
    "c8 adm-panel adm-metrics",
  )}
 ${card("Authorised exports", "Machine-readable; relationships and governance metadata kept. Small groups are suppressed.", `<div class="adm-xlist">${xs.map((x) => B(`<span class="adm-x-ic" aria-hidden="true">${ic("file", 16)}</span><span class="adm-x-t">${x}</span><span class="adm-x-f">JSON</span>${ic("download", 16)}`, "doExport", { n: x }, "adm-x")).join("")}</div>`, "", "c4 adm-panel adm-exports")}</div></div>`;
}
// RESEARCH_USE: only participants for whom research use is authorised at every level (organization, programme,
// person) are included, de-identified; everyone else is left out and only counted.
const RESEARCH_EXPORT = "Research dataset (de-identified, consented only)";
function researchDataset() {
  const c = ctxId();
  const ps = [
    ...new Set(
      S.assign
        .filter(
          (a) =>
            a.ctx === c && roleBase(a.role) === "P" && a.status === "Active",
        )
        .map((a) => a.pid),
    ),
  ];
  const inc = ps.filter(
    (pid) =>
      authorizePurpose("research", pid, { ctx: c }, "Research dataset export")
        .ok,
  );
  return {
    included: inc.map((pid, i) => ({
      subject: "R" + String(i + 1).padStart(3, "0"),
      pathwaySteps: (
        S.pathways.find((w) => w.pid === pid && w.state === "Current") || {
          steps: [],
        }
      ).steps.filter((st) => st.status === "Completed").length,
      evidenceApproved: S.evidence.filter(
        (e) =>
          e.owner === pid &&
          e.review === "Approved" &&
          recordScope(e, "research"),
      ).length,
    })),
    excluded: ps.length - inc.length,
  };
}
A.doExport = (d) => {
  if (d.n === RESEARCH_EXPORT) {
    const rs = researchDataset();
    const data = {
      export: d.n,
      context: ctx().name,
      generated: now(),
      rule: "RESEARCH_USE authorised at organization, programme and person level; records restricted by their owner are left out",
      subjects: rs.included,
      excludedWithoutResearchPermission: rs.excluded,
    };
    try {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      a.download = "research-dataset.json";
      a.click();
    } catch (e) {}
    audit(
      "Export",
      d.n,
      rs.included.length +
        " included · " +
        rs.excluded +
        " left out (no research permission)",
    );
    toast(
      "Research dataset prepared: " +
        rs.included.length +
        " included, " +
        rs.excluded +
        " left out without research permission.",
    );
    return ok();
  }
  const data = {
    export: d.n,
    context: ctx().name,
    generated: now(),
    metrics: S.metrics.map((m) => ({ name: m.name, value: metric(m.id) })),
  };
  try {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    a.download = d.n.replace(/\W+/g, "-").toLowerCase() + ".json";
    a.click();
  } catch (e) {}
  audit("Export", d.n, "Authorised export");
  toast("Export prepared: " + d.n);
  ok();
};
// ---------- ORGANIZATION ADMIN (6.7, E12, F12) ----------
// Approval inbox: every request an Organization Admin can see, from every source, as one list.
// box 'me' = waiting on an Organization Admin decision, 'review' = a Reviewer is handling it, 'done' = already decided.
// The sidebar count is the number of 'me' items, so the badge and the inbox always agree.
// Each item names who asked (from, via) and, where you decide, what Approve and Decline actually do (out).
// What a sensitive role lets its holder do, in the words that role's own screens use.
const ROLE_GRANTS = {
  A: "manage users, agreements and configuration for the programme",
};
function admItems() {
  const c = ctxId();
  const day = (s) => (s ? String(s).slice(0, 10) : "");
  const out = [];
  S.projects
    .filter(
      (p) =>
        inCtx(p) && ["Submitted", "Clarification requested"].includes(p.status),
    )
    .forEach((p) => {
      const me = p.status === "Submitted" && !p.stewards.length;
      out.push({
        src: "Project submission",
        icon: "folder",
        box: me ? "me" : "review",
        at: day(p.submitted),
        find: p.title + " " + P(p.owner).name,
        title: L(h(p.title), "project", { id: p.id }, "dv-link"),
        sub:
          h(p.type) +
          ((p.tags || []).length ? " · " + p.tags.map(h).join(", ") : ""),
        from: nm(p.owner),
        via: "Participant, submitted the project",
        out: me
          ? [
              [
                "Assign reviewer",
                "The Steward, Faculty member or Facilitator you choose is notified and can accept the project or ask " +
                  h(P(p.owner).display || P(p.owner).name) +
                  " for clarification.",
              ],
            ]
          : null,
        meta: me
          ? []
          : [
              "Reviewer <b>" + p.stewards.map(nm).join(", ") + "</b>",
              convoN(p) + " message" + (convoN(p) === 1 ? "" : "s"),
            ],
        badges:
          (me ? pill("Needs a reviewer", "p-amber") : pill(p.status)) +
          (projAnswered(p) ? pill("Owner replied", "p-navy") : ""),
        act:
          L("Open", "project", { id: p.id }, "btn btn-s btn-sm") +
          (me
            ? B(
                "Assign reviewer",
                "assignStewards",
                { id: p.id },
                "btn-p btn-sm",
              )
            : ""),
      });
    });
  S.pathways
    .filter(
      (p) =>
        inCtx(p) &&
        (p.state === "Awaiting reviewer" ||
          pwNeedsSteward(p) ||
          (p.reviewer &&
            ["In review", "Clarification requested"].includes(p.state))),
    )
    .forEach((p) => {
      const me = pwNeedsSteward(p);
      const n = pwReviewers(p).length;
      out.push({
        src: "Custom pathway",
        icon: "route",
        box: me ? "me" : "review",
        at: day(p.submitted),
        find: [p.name, P(p.by).name, P(p.pid).name].join(" "),
        title: h(p.name),
        sub: p.steps.map((x) => h(x.t)).join(" → "),
        from: nm(p.by),
        via: "Created this pathway for " + nm(p.pid),
        out: me
          ? [
              [
                "Assign reviewer",
                "The Reviewer you choose is notified and can approve the pathway or ask for clarification.",
              ],
            ]
          : null,
        meta: [
          p.reviewer
            ? "Reviewer <b>" + nm(p.reviewer) + "</b>"
            : me
              ? ""
              : "Open to " + n + " authorised Reviewer" + (n > 1 ? "s" : ""),
        ],
        badges: me ? pill("No Reviewer available", "p-red") : pill(p.state),
        act:
          B(
            ic("message", 14) +
              "Conversation" +
              (convoN(p) ? " (" + convoN(p) + ")" : ""),
            "pwActivity",
            { id: p.id },
          ) +
          B(
            p.reviewer ? "Change reviewer" : "Assign reviewer",
            "pwAssign",
            { id: p.id },
            me ? "btn-p btn-sm" : "btn-s btn-sm",
          ),
      });
    });
  S.assign
    .filter((a) => a.status === "Pending role approval" && a.ctx === ctxId())
    .forEach((a) => {
      // A sensitive role waits here once the person accepts an invitation for it or registers for it.
      const p = P(a.pid);
      const inv = S.invites.find(
        (i) => i.email === p.email && i.role === a.role && i.ctx === a.ctx,
      );
      const org = p.org && (S.orgs.find((o) => o.id === p.org) || {}).name;
      const role = "<b>" + h(roleName(a.role, a.ctx)) + "</b>";
      const grants = ROLE_GRANTS[roleBase(a.role)];
      out.push({
        src: "Role approval",
        icon: "shield",
        box: "me",
        at: day((a.approval || [])[0]?.at),
        find: p.name + " " + roleName(a.role, a.ctx),
        title: nm(a.pid),
        sub:
          "Asks to become " +
          role +
          " in " +
          h(ctxName(a.ctx)) +
          (org && org !== ctxName(a.ctx) ? " · " + h(org) : ""),
        from: inv ? nm(inv.by) : nm(a.pid),
        via:
          (inv
            ? "Invited them on " + fmt(inv.sent)
            : "Registered for this role") +
          " · " +
          h(p.email),
        out: [
          [
            "Approve",
            h(p.display || p.name) +
              " becomes " +
              role +
              (grants ? " and can " + grants : "") +
              ". They are notified.",
          ],
          [
            "Decline",
            "The role is not activated. " +
              h(p.display || p.name) +
              " keeps their account and is notified.",
          ],
        ],
        meta: [],
        badges: pill("Pending approval", "p-amber"),
        act:
          B(
            "Approve",
            "roleDecide",
            { id: a.id, v: "Active" },
            "btn-p btn-sm",
          ) + B("Decline", "roleDecide", { id: a.id, v: "Role not activated" }),
      });
    });
  (S.accessReqs || [])
    .filter((r) => r.ctx === c)
    .forEach((r) => {
      const me = r.status === "Awaiting approval";
      out.push({
        src: "Access request",
        icon: "mail",
        box: me ? "me" : "done",
        at: day(r.at),
        find: r.name + " " + r.email,
        title: h(r.name),
        sub:
          "Asks to join as <b>" +
          h(roleName(r.role, r.ctx)) +
          "</b>" +
          (r.why ? ": “" + h(r.why) + "”" : ""),
        from: h(r.name),
        via: "Through the request access page · " + h(r.email),
        out: me
          ? [
              [
                "Approve and invite",
                "A single-use invitation is sent to " +
                  h(r.email) +
                  ", valid for " +
                  (S.settings.inviteValidityDays || 14) +
                  " days. Their account exists only once they accept it.",
              ],
              ["Decline", "Nothing is created and no account exists."],
            ]
          : null,
        meta: [],
        badges: pill(
          me ? "Pending approval" : r.status,
          me ? "p-amber" : undefined,
        ),
        act: me
          ? B(
              "Approve and invite",
              "accessDecide",
              { id: r.id, v: "Invited" },
              "btn-p btn-sm",
            ) + B("Decline", "accessDecide", { id: r.id, v: "Declined" })
          : "",
      });
    });
  return out;
}
A.admBox = (d) => {
  UI.admBox = d.v;
  render();
};
// Open items per admin section, counted on the sidebar item that links to it.
function admCount(tab) {
  // Pending role approvals are counted once, on the Approval inbox, where they are decided.
  if (tab === "requests")
    return admItems().filter((x) => x.box === "me").length;
  if (tab === "support")
    return (
      S.supportQueries.filter(
        (q) => sqAdmin(q) && SQ_OPEN.includes(q.status),
      ).length + (S.requests || []).filter((r) => r.status === "Open").length
    );
  return 0;
}
route("admin", "admin", () => {
  if (role() !== "A") return deniedView("admin");
  // An Organization Admin sees and manages only the members and invitations of the tenant they are working in.
  const pend = S.assign.filter(
    (a) => a.status === "Pending role approval" && a.ctx === ctxId(),
  );
  // Sections are chosen from the sidebar; Reports & exports lives on the metrics route.
  const t = tabs(
    "adm",
    [
      ["requests", "Approval inbox"],
      ["users", "Users & roles"],
      ["invites", "Invitations"],
      ["packs", "Pack configuration"],
      ["library", "Template library"],
      ["versions", "Configuration versions"],
      ["initiatives", "Sponsor initiatives"],
      ["support", "Support & requests"],
    ],
    UI.p.tab,
  );
  let body = "";
  const n = (k) => `<span class="adm-n">${k}</span>`;
  if (t.cur === "requests") {
    const items = admItems();
    const boxes = [
      [
        "me",
        "Needs your decision",
        [
          "check",
          "Nothing needs your decision",
          "New project submissions, role approvals and access requests arrive here.",
          "",
        ],
      ],
      [
        "review",
        "In review",
        [
          "users",
          "Nothing is in review",
          "Projects and pathways move here once a Reviewer is handling them. You can follow along; no action is needed.",
          "",
        ],
      ],
      [
        "done",
        "Decided",
        [
          "inbox",
          "Nothing decided yet",
          "Access requests you approve or decline are kept here.",
          "",
        ],
      ],
    ];
    const box = boxes.some((b) => b[0] === UI.admBox) ? UI.admBox : "me";
    const list = items.filter((x) => x.box === box);
    const bar = `<div class="tabs adm-box" role="tablist" aria-label="Request status">${boxes.map(([id, l]) => `<button type="button" role="tab" aria-selected="${box === id}" class="tab ${box === id ? "on" : ""}" data-a="admBox" data-v="${id}">${l}<span class="cnt">${items.filter((x) => x.box === id).length}</span></button>`).join("")}</div>`;
    body = `<div class="adm-stack"><section class="card adm-panel adm-inl">${bar}${dataView(
      "adm:inbox:" + box,
      {
        label: "requests",
        items: list,
        search: (x) => x.src + " " + x.find,
        quick: {
          label: "Source",
          options: dvOpts(list, (x) => x.src),
          test: (x, v) => x.src === v,
        },
        sorts: [
          [
            "old",
            "Oldest first",
            (a, b) => (a.at || "9").localeCompare(b.at || "9"),
          ],
          [
            "new",
            "Newest first",
            (a, b) => (b.at || "").localeCompare(a.at || ""),
          ],
        ],
        defaultSort: "old",
        row: (x) => ({
          lead: `<span class="tile ${x.box === "me" ? "" : "t-soft"}" aria-hidden="true">${ic(x.icon, 18)}</span>`,
          title: `<span class="adm-src-l">${x.src}</span>${x.title}`,
          sub: x.sub,
          meta: [
            "From <b>" + x.from + "</b>",
            x.via,
            ...x.meta,
            x.at ? "Received " + fmt(x.at) : "",
          ],
          extra: x.out
            ? `<div class="adm-out">${x.out.map(([k, v]) => `<span><b>${k}:</b> ${v}</span>`).join("")}</div>`
            : "",
          badges: x.badges,
          primary: x.act,
        }),
        empty: boxes.find((b) => b[0] === box)[2],
      },
    )}</section><details class="adm-past"><summary>Routed to specialist owners: decisions that never come to you</summary>${routedCard()}</details></div>`;
  }
  if (t.cur === "packs") body = packsView();
  if (t.cur === "versions") body = versionsView();
  if (t.cur === "users")
    body =
      (pend.length
        ? banner(
            "warn",
            pend.length +
              " role" +
              (pend.length > 1 ? "s" : "") +
              " awaiting approval",
            "They are counted and decided in the Approval inbox. You can also open Manage on the person. " +
              L("Go to Approval inbox", "admin", { tab: "requests" }),
          ) + '<div style="height:12px"></div>'
        : "") +
      card(
        "Users and roles " +
          n(S.assign.filter((a) => a.ctx === ctxId()).length),
        "Members of " +
          h(ctxName(ctxId())) +
          ". Add, view, edit and delete user accounts. Manage roles, bundles and mandates. No direct database work.",
        usersTable(ctxId(), true, true),
        B(ic("plus", 14) + "Add user", "userNew", {}, "btn-p btn-sm"),
        "adm-panel",
      );
  if (t.cur === "invites")
    body = card(
      "Invitations " + n(S.invites.filter((i) => i.ctx === ctxId()).length),
      "Invitations to join " +
        h(ctxName(ctxId())) +
        ": Pending, Accepted, Rejected, Expired or Revoked. People with an account answer in the app; others use a single-use email link.",
      inviteTable(ctxId()),
      B(ic("plus", 14) + "Create / bulk upload", "invNew", {}, "btn-p btn-sm"),
      "adm-panel",
    );

  if (t.cur === "library")
    body = card(
      "Approved pathway templates " + n(S.templates.length),
      "Facilitators, Circle Stewards and mentors recommend from published templates. A new version applies to new recommendations; pathways already accepted keep the version they were accepted with.",
      dataView("adm:library", {
        label: "templates",
        items: S.templates,
        search: (x) => x.name + " " + x.steps.join(" "),
        quick: {
          label: "Status",
          options: [...new Set(S.templates.map((x) => x.status))].map((v) => [
            v,
            v,
          ]),
          test: (x, v) => x.status === v,
        },
        sorts: [
          ["name", "Name", (a, b) => a.name.localeCompare(b.name)],
          [
            "steps",
            "Number of steps",
            (a, b) => a.steps.length - b.steps.length,
          ],
        ],
        row: (x) => ({
          lead: `<span class="tile t-soft">${ic("route", 18)}</span>`,
          title: h(x.name) + " · v" + (x.ver || 1),
          sub: `<span class="adm-steps">${pwStepsFromTpl(x)
            .map(
              (s) =>
                h(s.t) +
                " (" +
                s.type +
                (s.type === "Conditional" ? ": " + h(pwWhenTxt(s)) : "") +
                ")",
            )
            .join(" → ")}</span>`,
          meta: [
            x.steps.length + " steps",
            (x.history || []).length
              ? "Last version " +
                fmt(x.history.slice(-1)[0].at) +
                " by " +
                nm(x.history.slice(-1)[0].by)
              : "",
          ],
          badges: pill(x.status),
          primary:
            B(ic("edit", 14) + "New version", "tplEdit", { id: x.id }) +
            B(x.status === "Approved" ? "Retire" : "Publish", "tplState", {
              id: x.id,
            }),
        }),
        empty: [
          "route",
          "No templates yet",
          "Add an approved template for Mode 1 pathways.",
          "",
        ],
      }),
      B(ic("plus", 14) + "Add template", "tplNew", {}, "btn-p btn-sm"),
      "adm-panel",
    );

  if (t.cur === "support")
    body = UI.p.sq
      ? sqAdminDetail(UI.p.sq)
      : `<div class="adm-stack">${sqAdminTable()}${card(
          "Privacy requests " + n((S.requests || []).length),
          "Correction, export and deletion requests.",
          ((rs) =>
            dataView("adm:privacy", {
              label: "privacy requests",
              items: rs,
              search: (r) => P(r.pid).name + " " + r.kind + " " + r.detail,
              quick: {
                label: "Status",
                options: [...new Set(rs.map((r) => r.status))].map((v) => [
                  v,
                  v,
                ]),
                test: (r, v) => r.status === v,
              },
              filters: [
                {
                  key: "kind",
                  label: "Type",
                  options: [...new Set(rs.map((r) => r.kind))].map((v) => [
                    v,
                    v,
                  ]),
                  test: (r, v) => r.kind === v,
                },
              ],
              sorts: [
                [
                  "from",
                  "From",
                  (a, b) => P(a.pid).name.localeCompare(P(b.pid).name),
                ],
                ["kind", "Type", (a, b) => a.kind.localeCompare(b.kind)],
              ],
              row: (r) => ({
                lead: `<span class="av">${ini(r.pid)}</span>`,
                title: nm(r.pid),
                sub: h(r.detail),
                meta: [h(r.kind)],
                badges: pill(r.status),
                primary:
                  r.status === "Open"
                    ? B("Complete", "rqDone", { id: r.id })
                    : "",
              }),
              empty: ["lock", "No privacy requests", "", ""],
            }))(S.requests || []),
          "",
          "adm-panel",
        )}</div>`;
  if (t.cur === "initiatives")
    body = card(
      "Initiative summaries for sponsors " + n(S.initiatives.length),
      "Sponsors see these on their Projects & funding page.",
      S.initiatives
        .map((i) =>
          lrow(
            "megaphone",
            h(i.title),
            h(i.summary) + " · " + fmt(i.at),
            pill(i.status === "Published" ? "Active" : i.status),
          ),
        )
        .join("") || '<p class="cap">None yet.</p>',
      B(ic("plus", 14) + "Publish initiative", "initNew", {}, "btn-p btn-sm"),
      "adm-lrows",
    );
  if (t.cur === "requests")
    return (
      head(
        "Approval inbox",
        h(ctx().name) +
          " · requests that need an Organization Admin decision, grouped by who has to act.",
      ) +
      t.html +
      body
    );
  return (
    head(
      "Organization administration",
      h(ctx().name) +
        " · operational administration. Specialist decisions go to their bundle holders.",
    ) +
    t.html +
    body
  );
});
A.roleDecide = (d) => {
  UI.modal = null;
  const a = byId("assign", d.id);
  a.status = d.v;
  a.approval = a.approval || [];
  a.approval.push({
    at: now(),
    by: myId(),
    note:
      d.v === "Active"
        ? "Approved by " + me().name
        : "Declined by " + me().name,
  });
  notify(
    a.pid,
    d.v === "Active"
      ? "Your " + roleName(a.role, a.ctx) + " role was approved"
      : "Your " + roleName(a.role, a.ctx) + " role was not activated",
    "home",
  );
  audit("Role approval", a.id, d.v);
  ok();
};
A.tplState = (d) => {
  const x = byId("templates", d.id);
  x.status = x.status === "Approved" ? "Retired" : "Approved";
  audit("Template " + x.status, x.id, "");
  ok();
};
// Templates carry the same step rules as pathways (requirement type, conditions, dependencies, dates, review,
// prior evidence, permissions). Editing publishes a new version; accepted pathways keep their version.
const pwTplForm = (f, x) =>
  `<form data-f="${f}" class="col adm-form" novalidate>${errSum(f)}${x ? `<input type="hidden" name="id" value="${x.id}">` : ""}${fi(f, "name", "Name", { req: true, max: 120 })}${pwStepFields(f)}${
    x
      ? banner(
          "info",
          "",
          "Saving publishes version " +
            ((x.ver || 1) + 1) +
            ". Pathways already accepted keep version " +
            (x.ver || 1) +
            "; new recommendations use the new version.",
        )
      : ""
  }<div class="actions"><span></span><button class="btn btn-p" type="submit">${x ? "Publish new version" : "Add as approved"}</button></div></form>`;
const pwTplFromForm = (d) => {
  const steps = pwStepsRead(d);
  return { steps: steps.map((s) => s.t), rules: steps.map(pwDesignOf) };
};
A.tplNew = () => {
  clearF("tpl");
  UI.form.tpl = { name: "", ...pwStepsToForm([]) };
  modal("Add pathway template", () => pwTplForm("tpl", null));
};
F.tpl = (d) => {
  if (!validate("tpl", d, { name: ["req"], ...pwStepRules(d) }))
    return render();
  const x = {
    id: uid("t"),
    name: d.name.trim(),
    status: "Approved",
    ver: 1,
    ...pwTplFromForm(d),
    history: [{ ver: 1, at: now(), by: myId() }],
  };
  S.templates.push(x);
  audit("Template added", x.id, x.name + " v1");
  UI.modal = null;
  clearF("tpl");
  toast("Template added and published as version 1.");
  ok();
};
A.tplEdit = (d) => {
  const x = byId("templates", d.id);
  clearF("tple");
  UI.form.tple = { name: x.name, ...pwStepsToForm(pwStepsFromTpl(x)) };
  modal("New version of " + h(x.name), () => pwTplForm("tple", x));
};
F.tple = (d) => {
  if (!validate("tple", d, { name: ["req"], ...pwStepRules(d) }))
    return render();
  const x = byId("templates", d.id);
  const nx = pwTplFromForm(d);
  if (
    d.name.trim() === x.name &&
    pwStepsSig(pwStepsRead(d)) === pwStepsSig(pwStepsFromTpl(x))
  ) {
    UI.err.tple = { name: "Nothing changed, so no new version was published." };
    return render();
  }
  x.history = x.history || [{ ver: x.ver || 1, at: null, by: null }];
  x.history[x.history.length - 1].snapshot = {
    name: x.name,
    steps: x.steps.slice(),
    rules: JSON.parse(JSON.stringify(x.rules || [])),
  };
  Object.assign(x, { name: d.name.trim(), ...nx, ver: (x.ver || 1) + 1 });
  x.history.push({ ver: x.ver, at: now(), by: myId() });
  audit("Template new version", x.id, "v" + x.ver);
  UI.modal = null;
  clearF("tple");
  toast(
    "Version " + x.ver + " published. Accepted pathways keep their version.",
  );
  ok();
};
A.rqDone = (d) => {
  const r = (S.requests || []).find((x) => x.id === d.id);
  r.status = "Completed";
  notify(
    r.pid,
    "Your " + r.kind.toLowerCase() + " request was completed",
    "privacy",
    { tab: "req" },
  );
  audit("Privacy request completed", r.id, r.kind);
  ok();
};
// ---------- PLATFORM ADMIN (6.8) ----------
route("platform", "platform", () => {
  const t = tabs(
    "plat",
    [
      ["integrations", "Integrations"],
      ["scopes", "Capability scopes"],
      ["security", "Security & access"],
      ["health", "Health & alerts"],
      ["storage", "Storage & backups"],
      ["lms", "LMS deep links"],
    ],
    UI.p.tab,
  );
  let body = "";
  const n = (k) => `<span class="adm-n">${k}</span>`;
  if (t.cur === "scopes")
    body = `<div class="adm-stack">${tenantScopesView()}</div>`;
  if (t.cur === "integrations")
    body = `<div class="adm-stack">${adaptersView()}${card(
      "Provider settings",
      "Credentials are stored in the platform secret store, never in this console.",
      `<form data-f="prov" class="col adm-form" novalidate><div class="g3">${fi("prov", "ai", "AI provider", { value: S.providers.ai.name, req: true })}${fi("prov", "aimode", "AI mode", { type: "select", opts: ["Production", "Sandbox"], value: S.providers.ai.mode })}${fi("prov", "quota", "Daily AI request quota", { type: "number", min: 1, value: S.settings.aiQuota, req: true })}</div><div class="g3">${fi("prov", "pay", "Payment provider", { value: S.providers.pay.name, req: true })}${fi("prov", "paymode", "Payment mode", { type: "select", opts: ["Sandbox", "Live"], value: S.providers.pay.mode })}${fi("prov", "email", "Email service", { value: S.providers.email.name, req: true })}</div><div class="actions"><span></span><button class="btn btn-p" type="submit">Save provider settings</button></div></form>`,
    )}</div>`;
  if (t.cur === "health")
    body = `<div class="g12">${card("Availability", "", `<div class="kpis"><div class="kpi"><span class="lt">Uptime</span><span class="statnum">${h(S.health.uptime)}</span></div><div class="kpi"><span class="lt">p95 response time</span><span class="statnum">${h(S.health.p95)}</span></div><div class="kpi"><span class="lt">Status</span><span class="ops-stat">${pill("Healthy")}</span></div></div>`, "", "c12 ops-avail")}${card(
      "Error log " + n(S.health.errors.length),
      "Latest application errors and warnings",
      dataView("plat:errors", {
        label: "log entries",
        items: S.health.errors,
        search: (e) => e.t + " " + e.lvl,
        quick: {
          label: "Level",
          options: dvOpts(S.health.errors, (e) => e.lvl),
          test: (e, v) => e.lvl === v,
        },
        sorts: [
          [
            "new",
            "Newest first",
            (a, b) => String(b.at).localeCompare(String(a.at)),
          ],
          [
            "old",
            "Oldest first",
            (a, b) => String(a.at).localeCompare(String(b.at)),
          ],
        ],
        defaultSort: "new",
        layout: "table",
        dense: true,
        columns: [
          {
            label: "When",
            sort: "new",
            cell: (e) => `<span class="adm-date">${fmt(e.at)}</span>`,
          },
          {
            label: "Level",
            cell: (e) => pill(e.lvl, e.lvl === "Error" ? "p-red" : "p-amber"),
          },
          { label: "Message", cell: (e) => h(e.t) },
        ],
        empty: [
          "check",
          "No errors or warnings",
          "Application errors and warnings appear here.",
          "",
        ],
      }),
      "",
      "c7 adm-panel",
    )}${card(
      "Alert rules",
      "",
      table(
        ["Rule", "Notify", "Enabled"],
        S.health.alerts.map((a, i) => [
          `<b>${h(a.rule)}</b>`,
          h(a.to),
          `<button type="button" class="toggle ops-switch ${a.on ? "on" : ""}" role="switch" aria-checked="${a.on}" aria-label="${h(a.rule)}" data-a="alertToggle" data-i="${i}"></button>`,
        ]),
      ),
      "",
      "c5 adm-panel",
    )}</div>`;
  if (t.cur === "security")
    body = `<div class="g12">${card(
      "Security events and access logs " + n(S.security.length),
      "",
      dataView("plat:security", {
        label: "security events",
        items: S.security,
        search: (s) => s.t,
        sorts: [
          [
            "new",
            "Newest first",
            (a, b) => String(b.at).localeCompare(String(a.at)),
          ],
          [
            "old",
            "Oldest first",
            (a, b) => String(a.at).localeCompare(String(b.at)),
          ],
        ],
        defaultSort: "new",
        layout: "table",
        dense: true,
        columns: [
          {
            label: "When",
            sort: "new",
            cell: (s) => `<span class="adm-date">${fmt(s.at)}</span>`,
          },
          { label: "Event", cell: (s) => h(s.t) },
        ],
        empty: [
          "shield",
          "No security events",
          "Sign-ins, session revocations and provider changes appear here.",
          "",
        ],
      }),
      "",
      "c7 adm-panel",
    )}<div class="c5 adm-stack">${card(
      "Authentication",
      "",
      dl([
        ["MFA", "Required for Programme and Platform Administrators"],
        ["Password policy", "At least 10 characters, including a number"],
        ["Session timeout", "30 minutes idle"],
        ["Encryption", "In transit and at rest"],
      ]),
    )}<section class="card ops-danger"><div class="ops-danger-t"><b>Sessions</b><p class="cap">Sign every user out of every device.</p></div>${CB("Revoke all sessions", "revokeSessions", {}, "Sign every user out of every device now?", "btn-d btn-sm")}</section></div></div>`;
  if (t.cur === "storage")
    body = `<div class="g12">${card(
      "Backups and restore tests " + n(S.backups.length),
      "",
      dataView("plat:backups", {
        label: "backups",
        items: S.backups,
        search: (b) => b.status + " " + b.size,
        quick: {
          label: "Status",
          options: dvOpts(S.backups, (b) =>
            b.status.includes("passed") ? "Completed" : b.status,
          ),
          test: (b, v) =>
            (b.status.includes("passed") ? "Completed" : b.status) === v,
        },
        sorts: [
          [
            "new",
            "Newest first",
            (a, b) => String(b.at).localeCompare(String(a.at)),
          ],
          [
            "old",
            "Oldest first",
            (a, b) => String(a.at).localeCompare(String(b.at)),
          ],
        ],
        defaultSort: "new",
        layout: "table",
        dense: true,
        columns: [
          {
            label: "When",
            sort: "new",
            cell: (b) => `<span class="adm-date">${fmt(b.at)}</span>`,
          },
          {
            label: "Status",
            cell: (b) =>
              pill(b.status.includes("passed") ? "Completed" : b.status),
          },
          {
            label: "Size",
            num: true,
            cell: (b) => `<span class="ops-num">${h(b.size)}</span>`,
          },
        ],
        empty: [
          "archive",
          "No backups yet",
          "Run a backup or a restore test.",
          "",
        ],
      }),
      B("Run restore test", "restoreTest") +
        B("Run backup now", "backup", {}, "btn-p btn-sm"),
      "c7 adm-panel",
    )}${card(
      "Storage",
      "",
      dl([
        [
          "Used",
          S.records.reduce((a, x) => a + x.sizeMB, 0).toFixed(1) +
            " MB + evidence " +
            S.evidence.reduce((a, x) => a + x.sizeMB, 0).toFixed(1) +
            " MB",
        ],
        ["Default file limit", S.settings.maxFileMB + " MB"],
        [
          "Quarantined files",
          S.records.filter((r) => r.state === "Quarantined").length,
        ],
        ["Signed URLs", "Enabled"],
      ]),
      "",
      "c5",
    )}</div>`;
  if (t.cur === "lms")
    body = card(
      "LMS deep-link layer",
      "Secure links in and out. No LTI 1.3, SSO, roster or grade sync. The LMS is not authoritative for PHOENIX permissions.",
      `<form data-f="lms" class="col adm-form" novalidate><div class="f2">${fi("lms", "returnUrl", "Return URL", { value: S.settings.lms.returnUrl, req: true })}${fi(
        "lms",
        "dest",
        "Default destination",
        {
          type: "select",
          opts: [
            ["circle", "Circle"],
            ["room", WL()],
            ["project", "Project"],
          ],
          value: S.settings.lms.dest,
        },
      )}</div><div class="actions">${B("Test incoming deep link", "lmsTest")}<button class="btn btn-p" type="submit">Save</button></div></form>`,
    );
  return (
    head(
      "Platform administration",
      "Technical operations across all tenants · no default access to participant content",
    ) +
    t.html +
    body
  );
});

// kept for older callers: the AI provider is now one adapter among the integrations (purposes.js)
A.aiToggle = () =>
  A.adapterSet({
    id: "ai",
    f: "status",
    v: adapterUp("ai") ? "Unavailable" : "Healthy",
  });
A.revokeSessions = () => {
  S.security.unshift({ at: now(), t: "All sessions revoked by " + me().name });
  audit("Sessions revoked", "platform", "");
  toast("All other sessions revoked.");
  ok();
};
A.backup = () => {
  S.backups.unshift({ at: now(), status: "Completed", size: "1.8 GB" });
  audit("Backup run", "platform", "");
  ok();
};
A.restoreTest = () => {
  S.backups.unshift({ at: now(), status: "Restore test passed", size: "—" });
  audit("Restore test", "platform", "passed");
  ok();
};
F.lms = (d) => {
  if (!validate("lms", d, { returnUrl: ["req"] })) return render();
  S.settings.lms = { ...S.settings.lms, returnUrl: d.returnUrl, dest: d.dest };
  audit("LMS deep-link configured", "7.13", "");
  toast("Saved.");
  ok();
};
A.lmsTest = () => {
  audit(
    "LMS deep link tested",
    "7.13",
    "Signature valid; authorisation checked in PHOENIX",
  );
  toast(
    "Deep link validated. Users still sign in and pass PHOENIX permission checks.",
  );
  ok();
};
