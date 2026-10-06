// ---------- INCIDENTS (F11) ----------
const INC_STATES = [
  "Reported",
  "Triaged",
  "Under review",
  "Decision recorded",
  "Appealed",
  "Closed",
  "Reopened",
];
route("incidents", "governance", () => {
  const own = hasB("Incident/Safety Owner");
  const list = S.incidents.filter((i) => own || i.by === myId());
  const sel = UI.p.id && byId("incidents", UI.p.id);
  if (sel && (own || sel.by === myId())) return incDetail(sel, own);
  return (
    head(
      own ? "Incidents & concerns" : "Report a concern",
      "Reports are confidential. No automated sanctions.",
      B(ic("plus", 16) + "Report an incident", "incNew", {}, "btn-p"),
    ) +
    table(
      ["Incident", "Where", "Reported", "State", ""],
      list.map((i) => [
        h(i.kind) + `<div class="cap">${h(i.desc.slice(0, 80))}</div>`,
        h(i.where),
        fmt(i.timeline[0]?.at),
        pill(i.state) +
          (i.paused ? " " + pill("Emergency pause", "p-red") : ""),
        L("Open", "incidents", { id: i.id }),
      ]),
      own ? "No incidents." : "You have not reported anything.",
    )
  );
});
function incDetail(i, own) {
  return (
    head(h(i.kind), h(i.where) + " · " + h(i.conf), pill(i.state), [
      ["Incidents", "incidents"],
      ["Case"],
    ]) +
    `<div class="g12">${card(
      "Case",
      "",
      dl([
        ["Description", h(i.desc)],
        ["Reported by", own ? nm(i.by) : "You"],
        ["Assigned to", i.owner ? nm(i.owner) : "Unassigned"],
        ["Emergency pause", i.paused ? "Applied" : "No"],
        ["Decision / remedy", h(i.decision || "—")],
      ]),
      "",
      "c7",
    )}
 ${card("Timeline", "", i.timeline.map((x) => `<p class="cap" style="margin-bottom:6px">${fmt(x.at)} · ${h(x.t)}</p>`).join(""), "", "c5")}
 ${own ? card("Actions", "A human decides every outcome.", `<div class="row wrap">${i.state === "Reported" ? B("Triage", "incAct", { id: i.id, v: "Triaged" }) : ""}${["Reported", "Triaged"].includes(i.state) && !i.paused ? CB(ic("pause", 14) + "Apply emergency pause", "incPause", { id: i.id }, "Apply an emergency pause? The linked Circle becomes read-only for members until a decision is recorded.", "btn-d btn-sm", "Apply emergency pause") : ""}${["Triaged", "Reopened", "Appealed"].includes(i.state) ? B("Assign to me & review", "incAct", { id: i.id, v: "Under review" }) : ""}${i.state === "Under review" ? B("Record decision / remedy", "incDecide", { id: i.id }, "btn-p btn-sm") : ""}${["Decision recorded"].includes(i.state) ? B("Close case", "incAct", { id: i.id, v: "Closed" }) : ""}${i.state === "Closed" ? B("Reopen", "incAct", { id: i.id, v: "Reopened" }) : ""}</div>`, "", "c12") : ""}
 ${!own && i.state === "Decision recorded" ? card("Appeal", "You can appeal or ask for reconsideration.", B("Appeal decision", "incAct", { id: i.id, v: "Appealed" }, "btn-p btn-sm"), "", "c12") : ""}</div>`
  );
}
A.incNew = () => {
  clearF("inc");
  modal(
    "Report an incident",
    () =>
      `<form data-f="inc" class="col" style="gap:12px" novalidate>${fi("inc", "kind", "Type", { type: "select", req: true, ph: "Select", opts: ["Conduct concern", "Safety risk", "Privacy / data concern", "AI output concern", "Rights or access issue", "Other"] })}${fi("inc", "where", "Where did it happen?", { req: true })}${fi("inc", "desc", "What happened?", { type: "textarea", rows: 4, req: true })}${banner("info", "", "Only the Incident/Safety Owner sees this report. Reporting never depends on payment status.")}<div class="actions"><span></span><button class="btn btn-p" type="submit">Submit report</button></div></form>`,
  );
};
F.inc = (d) => {
  if (
    !validate("inc", d, {
      kind: ["req"],
      where: ["req"],
      desc: ["req", ["min", 10]],
    })
  )
    return render();
  const i = {
    id: uid("in"),
    by: myId(),
    ctx: ctxId(),
    where: d.where,
    kind: d.kind,
    desc: d.desc,
    state: "Reported",
    owner: null,
    paused: false,
    conf: "Restricted to Incident/Safety Owner",
    timeline: [{ at: today(), t: "Reported" }],
    decision: null,
  };
  S.incidents.push(i);
  S.assign
    .filter((a) => a.bundles.includes("Incident/Safety Owner"))
    .forEach((a) =>
      notify(a.pid, "New incident reported: " + d.kind, "incidents", {
        id: i.id,
      }),
    );
  audit("Incident reported", i.id, d.kind);
  UI.modal = null;
  clearF("inc");
  toast("Report submitted confidentially.");
  ok();
};
A.incAct = (d) => {
  const i = byId("incidents", d.id);
  i.state = d.v;
  if (d.v === "Under review") i.owner = myId();
  i.timeline.push({
    at: today(),
    t: d.v + (d.v === "Under review" ? " — " + me().name : ""),
  });
  if (d.v === "Closed") i.paused = false;
  notify(i.by, "Your report is now: " + d.v, "incidents", { id: i.id });
  audit("Incident " + d.v, i.id, "");
  ok();
};
A.incPause = (d) => {
  const i = byId("incidents", d.id);
  i.paused = true;
  i.timeline.push({ at: today(), t: "Emergency pause applied" });
  const c = S.circles.find((c) => i.where.includes(c.name));
  if (c && c.state === "Active") {
    c.state = "Paused/Repair";
    c.pause = {
      reason: "Emergency pause during incident review",
      who: myId(),
      restart: "Incident decision recorded",
    };
  }
  audit("Emergency pause", i.id, c ? c.id : "");
  toast("Emergency pause applied" + (c ? " to " + c.name : "") + ".");
  ok();
};
A.incDecide = (d) => {
  clearF("icd");
  modal(
    "Record decision or remedy",
    () =>
      `<form data-f="icd" class="col" style="gap:12px" novalidate><input type="hidden" name="id" value="${d.id}">${fi("icd", "t", "Decision and remedy", { type: "textarea", rows: 4, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Record</button></div></form>`,
  );
};
F.icd = (d) => {
  if (!validate("icd", d, { t: ["req"] })) return render();
  const i = byId("incidents", d.id);
  i.decision = d.t;
  i.state = "Decision recorded";
  i.timeline.push({ at: today(), t: "Decision recorded" });
  notify(
    i.by,
    "A decision was recorded on your report. You can appeal.",
    "incidents",
    { id: i.id },
  );
  audit("Incident decision", i.id, "");
  UI.modal = null;
  clearF("icd");
  ok();
};
// ---------- REVIEW INBOX / METRICS / AUDIT ----------
route("inbox", "any", () => {
  const it = inboxItems();
  return (
    head(
      "Unified review inbox",
      "Everything waiting for your review or decision. Items stay open and visible to the Programme Administrator until acted on.",
    ) +
    table(
      ["Type", "Item", "Detail", ""],
      it.map(([t, n, dd, r, p]) => [
        pill(t, "p-navy"),
        h(n),
        h(dd),
        B("Open", "go", { r, ...p }),
      ]),
      "Nothing waiting. Well done.",
    ) +
    (hasB("AI Owner") || role() === "F"
      ? '<div style="height:16px"></div>' +
        card(
          "AI outputs awaiting review (Class C)",
          "Draft → Review → Edit → Approve/Reject → Release",
          table(
            ["Job", "Purpose", "By", "Sources", ""],
            S.ai
              .filter((j) => j.status === "In review" && j.cls === "C")
              .map((j) => [
                h(j.id),
                h(j.purpose),
                nm(j.by),
                h(j.sources),
                B("Reject", "aiRev", { id: j.id, v: "Rejected" }) +
                  B(
                    "Approve release",
                    "aiRev",
                    { id: j.id, v: "Released" },
                    "btn-p btn-sm",
                  ),
              ]),
          ),
        )
      : "")
  );
});
A.aiRev = (d) => {
  const j = byId("ai", d.id);
  j.status = d.v;
  j.reviewed = true;
  notify(j.by, "AI output " + d.v.toLowerCase() + ": " + j.purpose, "inbox");
  audit("AI output " + d.v, j.id, "");
  ok();
};
route(
  "metrics",
  "metrics",
  () =>
    head(
      "Metrics & reports",
      role() === "O" || role() === "S"
        ? "Approved aggregate only"
        : "Starter metrics registry",
    ) + reportsView(role() !== "A"),
);
route("audit", "any", () => {
  if (!["A", "O", "T"].includes(role())) return deniedView("audit");
  const q = UI.q.aud || "";
  const list = S.audit.filter(
    (a) =>
      (role() !== "O" || a.ctx === ctxId()) &&
      (!q || JSON.stringify(a).toLowerCase().includes(q.toLowerCase())),
  );
  return (
    head(
      "Audit log",
      "Access, consent, role, record, AI, payment, export and deletion events.",
      B(ic("download", 14) + "Export", "doExport", { n: "Audit log" }),
    ) +
    `<div class="row" style="margin-bottom:12px"><input class="input" style="max-width:320px" placeholder="Filter" value="${h(q)}" data-ch="audQ" aria-label="Filter audit log"></div>` +
    table(
      ["When", "Who", "Action", "Object", "Detail", "Result"],
      list
        .slice(0, 200)
        .map((a) => [
          fmt(a.at),
          a.by ? nm(a.by) : "—",
          h(a.a),
          h(a.o),
          h(a.d),
          pill(a.r === "denied" ? "Rejected" : "Done"),
        ]),
    )
  );
});
A.audQ = (d, el) => {
  UI.q.aud = el.value;
  render();
};

A.alertToggle = (d) => {
  if (role() !== "T") return deny("not permitted");
  const a = S.health.alerts[d.i];
  a.on = !a.on;
  audit("Alert rule " + (a.on ? "enabled" : "disabled"), a.rule, "");
  ok();
};
F.prov = (d) => {
  if (role() !== "T") return deny("not permitted");
  if (
    !validate("prov", d, {
      ai: ["req"],
      quota: ["req", "num"],
      pay: ["req"],
      email: ["req"],
    })
  )
    return render();
  S.providers = {
    ai: { name: d.ai, mode: d.aimode },
    pay: { name: d.pay, mode: d.paymode },
    email: { name: d.email, mode: "Production" },
  };
  S.settings.aiQuota = +d.quota;
  audit("Provider settings changed", "platform", d.paymode + " payments");
  toast("Provider settings saved.");
  ok();
};

// ---------- GAP CLOSURE (Section 6 user-story audit) ----------
function migrate() {
  ensurePlatformData();
  // deliverables → evidence → Learning Harvest → profile evolution
  S.evolution = S.evolution || [];
  S.rooms.forEach((x) =>
    (x.resources || []).forEach((r) => {
      if (!r.id) r.id = uid("res");
    }),
  );
  const sd = seed();
  if (!byId("rooms", "ar2")) S.rooms.push(sd.rooms.find((r) => r.id === "ar2"));
  if (S.compass.p1)
    Object.entries(sd.compass.p1).forEach(([k, v]) => {
      if (S.compass.p1[k] == null) S.compass.p1[k] = v;
    });
  S.resources = S.resources || [
    {
      id: "rs1",
      title: "Programme handbook 2026",
      kind: "Guide",
      audience: "All roles",
      status: "Published",
      by: "p7",
      desc: "How the Excelsior Climate Programme runs: stages, roles and timelines.",
    },
    {
      id: "rs2",
      title: "Circle facilitation guide",
      kind: "Template guidance",
      audience: "Facilitators",
      status: "Published",
      by: "p7",
      desc: "Running sessions, recording commitments and handling concerns.",
    },
    {
      id: "rs3",
      title: "Mentor guidelines",
      kind: "Governance guidance",
      audience: "Mentors",
      status: "Published",
      by: "p7",
      desc: "Boundaries, confidentiality and when to escalate.",
    },
    {
      id: "rs4",
      title: "Evidence guidance (E0–E4)",
      kind: "Guide",
      audience: "All roles",
      status: "Published",
      by: "p7",
      desc: "What each Evidence Support Level means, with examples.",
    },
    {
      id: "rs5",
      title: "Partner onboarding pack",
      kind: "Guide",
      audience: "Partners",
      status: "Published",
      by: "p7",
      desc: "Publishing cards, mandates and joining workspaces.",
    },
    {
      id: "rs6",
      title: "Heat-mapping methods (draft)",
      kind: "Learning resource",
      audience: "Participants",
      status: "In review",
      by: "p2",
      desc: "Comparing street-level temperature methods.",
    },
  ];
  S.initiatives = S.initiatives || [
    {
      id: "iv1",
      title: "Spring 2027 urban heat cohort",
      summary:
        "Twenty new participants across three wards. Seat sponsorship and project funding are both welcome.",
      by: "p7",
      at: "2026-09-25",
      status: "Published",
    },
  ];
  S.xorg = S.xorg || [
    {
      id: "xo1",
      from: "o4",
      to: "o1",
      what: "Share GreenGrid canopy GIS layer with Excelsior University reporting",
      by: "p4",
      status: "Pending",
      at: "2026-09-30",
    },
  ];
  S.cohortReqs = S.cohortReqs || [];
  S.feedback = S.feedback || [];
  S.ropes.forEach((r) => {
    r.contribs = r.contribs || [
      {
        by: r.mentor,
        kind: "Guidance",
        t: "Agreed GIS layer structure with the team",
        at: "2026-09-27",
      },
    ];
  });
  S.orgTemplates = S.orgTemplates || {
    circle: "Purpose · agenda · commitments · concerns · decisions",
    room: "Charter · tasks · milestones · decisions · risks · evidence",
    categories: [
      "Volunteering",
      "Expertise",
      "Equipment",
      "Skills",
      "Livelihood",
      "Funding",
      "Learning",
      "Community action",
    ],
  };
  S.health = S.health || {
    uptime: "99.96% (30 days)",
    p95: "420 ms",
    errors: [
      {
        at: "2026-10-02T07:12",
        lvl: "Warning",
        t: "Slow query on evidence search (1.8 s)",
      },
      {
        at: "2026-10-01T19:40",
        lvl: "Error",
        t: "Email provider timeout — 3 messages retried and delivered",
      },
    ],
    alerts: [
      { rule: "Error rate > 2% for 5 min", to: "On-call email", on: true },
      { rule: "Storage > 80% of quota", to: "Platform admin", on: true },
      {
        rule: "AI provider unavailable",
        to: "Platform admin + AI Owner",
        on: true,
      },
    ],
  };
  S.providers = S.providers || {
    ai: {
      name: "[Model provider via AI gateway]",
      mode: "Production",
      quota: 200,
    },
    pay: { name: "Payment provider", mode: "Sandbox" },
    email: { name: "Transactional email service", mode: "Production" },
  };
}
// ---- Resources & guidance (PGA-05, FCS-02)
const AUD = {
  P: "Participants",
  F: "Facilitators",
  M: "Mentors",
  C: "Partners",
  O: "Organization representatives",
  S: "Sponsors",
  A: "All roles",
  T: "All roles",
};
route("resources", "any", () => {
  const r = role();
  const admin = r === "A";
  const list = S.resources.filter(
    (x) =>
      admin ||
      (x.status === "Published" &&
        (x.audience === "All roles" || x.audience === AUD[r])) ||
      x.by === myId(),
  );
  return (
    head(
      "Resources & guidance",
      "Approved guides, templates and learning resources for your role.",
      admin || ["F", "M"].includes(r)
        ? B(
            ic("upload", 16) + (admin ? "Add resource" : "Suggest a resource"),
            "resNew",
            {},
            "btn-p",
          )
        : "",
    ) +
    (r === "F"
      ? card(
          "Use-case pack: " + h(pack().name),
          "Templates you can use in this programme",
          dl([
            ["Circle template", h(S.orgTemplates.circle)],
            [WL() + " template", h(S.orgTemplates.room)],
            [
              "Opportunity categories",
              S.orgTemplates.categories.map(h).join(", "),
            ],
          ]),
        ) + '<div class="section-gap"></div>'
      : "") +
    table(
      ["Resource", "Type", "Audience", "Status", ""],
      list.map((x) => [
        `<b>${h(x.title)}</b><div class="cap">${h(x.desc)}</div>`,
        h(x.kind),
        h(x.audience),
        pill(x.status === "Published" ? "Active" : x.status),
        admin
          ? x.status === "In review"
            ? B("Reject", "resState", { id: x.id, v: "Rejected" }) +
              B(
                "Publish",
                "resState",
                { id: x.id, v: "Published" },
                "btn-p btn-sm",
              )
            : x.status === "Published"
              ? B("Unpublish", "resState", { id: x.id, v: "Unpublished" })
              : ""
          : B("Open", "resOpen", { id: x.id }),
      ]),
      "No resources for your role yet.",
    )
  );
});
A.resOpen = (d) => {
  const x = byId("resources", d.id);
  modal(
    h(x.title),
    `${dl([
      ["Type", h(x.kind)],
      ["Audience", h(x.audience)],
      ["Published by", nm(x.by)],
    ])}<p class="muted">${h(x.desc)}</p>${banner("info", "", "Resources are approved sources for Ask PHOENIX once published.")}`,
  );
};
A.resNew = () => {
  clearF("res");
  modal(
    role() === "A" ? "Add resource" : "Suggest a resource",
    () =>
      `<form data-f="res" class="col" style="gap:12px" novalidate>${fi("res", "title", "Title", { req: true })}${fi("res", "kind", "Type", { type: "select", req: true, opts: ["Guide", "Learning resource", "Template guidance", "Governance guidance"] })}${fi("res", "audience", "Audience", { type: "select", req: true, opts: ["All roles", "Participants", "Facilitators", "Mentors", "Partners", "Organization representatives", "Sponsors"] })}${fi("res", "desc", "Description", { type: "textarea", rows: 3, req: true })}<div class="field"><label class="lbl">File or link</label><input type="file" name="f" class="input" style="padding:8px"></div>${role() !== "A" ? banner("info", "", "A Programme Administrator reviews suggestions before they are published.") : ""}<div class="actions"><span></span><button class="btn btn-p" type="submit">${role() === "A" ? "Publish" : "Submit for review"}</button></div></form>`,
  );
};
F.res = (d) => {
  if (!validate("res", d, { title: ["req"], desc: ["req", ["min", 10]] }))
    return render();
  const x = {
    id: uid("rs"),
    title: d.title,
    kind: d.kind,
    audience: d.audience,
    desc: d.desc,
    by: myId(),
    status: role() === "A" ? "Published" : "In review",
  };
  S.resources.push(x);
  if (x.status === "Published")
    S.aiSources.push({ id: uid("src"), title: x.title, status: "Approved" });
  else
    S.assign
      .filter((a) => roleBase(a.role) === "A")
      .forEach((a) =>
        notify(a.pid, "Resource suggested: " + x.title, "resources"),
      );
  audit("Resource " + x.status, x.id, x.title);
  UI.modal = null;
  clearF("res");
  ok();
};
A.resState = (d) => {
  const x = byId("resources", d.id);
  x.status = d.v;
  if (d.v === "Published" && !S.aiSources.some((s) => s.title === x.title))
    S.aiSources.push({ id: uid("src"), title: x.title, status: "Approved" });
  if (d.v !== "Published")
    S.aiSources
      .filter((s) => s.title === x.title)
      .forEach((s) => (s.status = "Not approved"));
  notify(x.by, "Resource " + d.v.toLowerCase() + ": " + x.title, "resources");
  audit("Resource moderated", x.id, d.v);
  ok();
};
// ---- Sponsor initiatives (SFO-06)
A.initNew = () => {
  clearF("ini");
  modal(
    "Publish an initiative summary for sponsors",
    () =>
      `<form data-f="ini" class="col" style="gap:12px" novalidate>${fi("ini", "title", "Title", { req: true })}${fi("ini", "summary", "Summary (approved for sponsor visibility)", { type: "textarea", rows: 4, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Publish</button></div></form>`,
  );
};
F.ini = (d) => {
  if (!validate("ini", d, { title: ["req"], summary: ["req", ["min", 20]] }))
    return render();
  S.initiatives.unshift({
    id: uid("iv"),
    title: d.title,
    summary: d.summary,
    by: myId(),
    at: today(),
    status: "Published",
  });
  S.assign
    .filter((a) => a.ctx === ctxId() && roleBase(a.role) === "S")
    .forEach((a) =>
      notify(a.pid, "New initiative for sponsors: " + d.title, "funding", {
        tab: "initiatives",
      }),
    );
  audit("Sponsor initiative published", d.title, "");
  UI.modal = null;
  clearF("ini");
  ok();
};
const initiativesView = () =>
  S.initiatives
    .filter((i) => i.status === "Published")
    .map((i) =>
      card(
        h(i.title),
        "Published " + fmt(i.at) + " by " + nm(i.by),
        `<p class="muted">${h(i.summary)}</p><div class="row wrap" style="margin-top:12px">${B("Sponsor seats", "go", { r: "billing", tab: "sponsor" })}${B("Browse projects", "go", { r: "funding", tab: "discover" }, "btn-p btn-sm")}</div>`,
      ),
    )
    .join('<div class="section-gap"></div>') ||
  empty("megaphone", "No initiatives published yet", "");
// ---- Cross-organization approvals (PGA-12)
const xorgView = () =>
  card(
    "Cross-organization approvals",
    "Visibility across organizations only through explicit authorisation.",
    table(
      ["Request", "From", "To", "Requested by", "Status", ""],
      S.xorg.map((x) => [
        h(x.what),
        h(S.orgs.find((o) => o.id === x.from)?.name),
        h(S.orgs.find((o) => o.id === x.to)?.name),
        nm(x.by),
        pill(x.status),
        x.status === "Pending"
          ? B("Decline", "xoDecide", { id: x.id, v: "Declined" }) +
            B(
              "Approve",
              "xoDecide",
              { id: x.id, v: "Approved" },
              "btn-p btn-sm",
            )
          : "",
      ]),
    ),
  );
A.xoDecide = (d) => {
  if (role() !== "A")
    return deny(
      "only a Programme Administrator approves cross-organization activity",
    );
  const x = byId("xorg", d.id);
  x.status = d.v;
  notify(
    x.by,
    "Cross-organization request " + d.v.toLowerCase() + ": " + x.what,
    "home",
  );
  audit("Cross-organization request " + d.v, x.id, x.what);
  ok();
};
A.xoNew = () => {
  clearF("xo");
  modal(
    "Request cross-organization sharing",
    () =>
      `<form data-f="xo" class="col" style="gap:12px" novalidate>${fi("xo", "to", "Share with organization", { type: "select", req: true, opts: S.orgs.filter((o) => o.id !== me().org).map((o) => [o.id, o.name]) })}${fi("xo", "what", "What would be shared, and why", { type: "textarea", rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send for approval</button></div></form>`,
  );
};
F.xo = (d) => {
  if (!validate("xo", d, { to: ["req"], what: ["req", ["min", 10]] }))
    return render();
  S.xorg.push({
    id: uid("xo"),
    from: me().org,
    to: d.to,
    what: d.what,
    by: myId(),
    status: "Pending",
    at: today(),
  });
  S.assign
    .filter((a) => roleBase(a.role) === "A")
    .forEach((a) =>
      notify(a.pid, "Cross-organization request from " + me().name, "admin", {
        tab: "xorg",
      }),
    );
  audit("Cross-organization request", me().org, d.what);
  UI.modal = null;
  clearF("xo");
  toast("Sent to the Programme Administrator.");
  ok();
};
// ---- MFA for administrators (PFA-01)
PUB.mfa = () => {
  const f = "mfa";
  return authWrap(
    `<span class="tile t-navy" style="width:48px;height:48px">${ic("lock", 22)}</span><div class="col" style="gap:4px"><h1 class="h1">Two-step verification</h1><p class="sub">Administrator accounts need a code from your authenticator app.</p></div>${errSum(f)}<form data-f="mfa" class="col" style="gap:16px" novalidate>${fi(f, "code", "6-digit code", { req: true, ph: "123456", auto: "one-time-code", help: "Prototype: use 123456." })}<button class="btn btn-p btn-block" type="submit">Verify and sign in</button></form>${L("Back to sign in", "login")}`,
  );
};
F.mfa = (d) => {
  if (
    !validate("mfa", d, {
      code: [
        "req",
        [
          "fn",
          {
            f: (v) => /^\d{6}$/.test(v),
            m: "Enter the 6 digits from your app.",
          },
        ],
      ],
    })
  )
    return render();
  if (d.code !== "123456") {
    UI.err.mfa = { code: "That code is not valid. Try again." };
    audit("MFA failed", UI.pre?.mfaPid, "", "denied");
    return render();
  }
  const p = P(UI.pre.mfaPid);
  UI.pre = null;
  clearF("mfa");
  startSession(p, true);
};
// ---- Mentor: contributions, feedback, suggest opportunity (MAC-05/09/11)
A.ropeContrib = (d) => {
  clearF("rcb");
  modal(
    "Record a contribution",
    () =>
      `<form data-f="rcb" class="col" style="gap:12px" novalidate><input type="hidden" name="id" value="${d.id}">${fi("rcb", "kind", "Type", { type: "select", req: true, opts: ["Guidance", "Review of deliverable", "Recommendation", "Issue resolved", "Resource shared"] })}${fi("rcb", "t", "What you contributed", { type: "textarea", rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save</button></div></form>`,
  );
};
F.rcb = (d) => {
  if (!validate("rcb", d, { t: ["req"] })) return render();
  const x = byId("ropes", d.id);
  if (x.mentor !== myId()) return deny("only the mentor records contributions");
  x.contribs.push({ by: myId(), kind: d.kind, t: d.t, at: today() });
  audit("Mentor contribution recorded", x.id, d.kind);
  UI.modal = null;
  clearF("rcb");
  ok();
};
A.ropeFeedback = (d) => {
  clearF("fb");
  modal(
    "Feedback to the facilitator",
    () =>
      `<form data-f="fb" class="col" style="gap:12px" novalidate><input type="hidden" name="id" value="${d.id}">${fi("fb", "t", "Your feedback on outcomes and next steps", { type: "textarea", rows: 4, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send</button></div></form>`,
  );
};
F.fb = (d) => {
  if (!validate("fb", d, { t: ["req"] })) return render();
  const x = byId("ropes", d.id);
  S.feedback.push({ by: myId(), rope: x.id, t: d.t, at: today() });
  x.members
    .filter((m) => m.role === "Facilitator")
    .forEach((m) =>
      notify(
        m.pid,
        "Mentor feedback on " + x.name + " from " + me().name,
        "rope",
        { id: x.id, tab: "contrib" },
      ),
    );
  audit("Mentor feedback sent", x.id, "");
  UI.modal = null;
  clearF("fb");
  toast("Feedback sent to the facilitator.");
  ok();
};
A.suggestOpp = (d) => {
  const x = byId("ropes", d.id);
  const cs = S.cards.filter((c) => c.status === "Active" && inCtx(c));
  modal(
    "Suggest an opportunity",
    `<form data-f="sgo" class="col" style="gap:12px"><input type="hidden" name="id" value="${x.id}">${fi("sgo", "pid", "Participant", { type: "select", opts: x.members.filter((m) => ["Member", "Project owner"].includes(normRole(m.role))).map((m) => [m.pid, P(m.pid).name]) })}${fi("sgo", "card", "Opportunity", { type: "select", opts: cs.map((c) => [c.id, c.kind + ": " + c.title]) })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send suggestion</button></div></form>`,
  );
};
F.sgo = (d) => {
  const c = byId("cards", d.card);
  notify(
    d.pid,
    `${me().name} suggests an opportunity for you: ${c.title}`,
    "card",
    { id: c.id },
  );
  audit("Opportunity suggested", c.id, d.pid);
  UI.modal = null;
  toast(
    "Suggestion sent. Any introduction still goes through steward review and consent.",
  );
  ok();
};
// ---- Partner organization profile (PCP-01/02)
A.orgEdit = () => {
  const o = S.orgs.find((x) => x.id === me().org);
  UI.form.orgp = {
    name: o.name,
    profile: o.profile || "",
    web: o.web || "",
    sector: o.sector || "",
  };
  modal(
    "Organization profile",
    () =>
      `<form data-f="orgp" class="col" style="gap:12px" novalidate>${fi("orgp", "name", "Organization name", { req: true })}${fi("orgp", "sector", "Sector", {})}${fi("orgp", "profile", "About the organization", { type: "textarea", rows: 4, req: true, help: "Visible to people in your programme context." })}${fi("orgp", "web", "Website", { ph: "https://" })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save</button></div></form>`,
  );
};
F.orgp = (d) => {
  if (!validate("orgp", d, { name: ["req"], profile: ["req", ["min", 20]] }))
    return render();
  if (!["C", "O"].includes(role()))
    return deny("only an organization member edits its profile");
  const o = S.orgs.find((x) => x.id === me().org);
  Object.assign(o, {
    name: d.name,
    profile: d.profile,
    web: d.web,
    sector: d.sector,
  });
  audit("Organization profile updated", o.id, "");
  UI.modal = null;
  clearF("orgp");
  ok();
};
// ---- Org: templates and new cohort (OUR-02, OUR-09)
F.tplOrg = (d) => {
  if (!validate("tplOrg", d, { circle: ["req"], room: ["req"], cats: ["req"] }))
    return render();
  if (!["A", "O"].includes(role())) return deny("not permitted");
  S.orgTemplates = {
    circle: d.circle,
    room: d.room,
    categories: d.cats
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
  audit("Templates updated", ctxId(), "");
  toast("Templates saved.");
  clearF("tplOrg");
  ok();
};
const tplForm = () =>
  card(
    "Templates and categories",
    "Circle, " + WL() + " and opportunity templates for this context.",
    `<form data-f="tplOrg" class="col" style="gap:12px" novalidate>${fi("tplOrg", "circle", "Circle template sections", { value: S.orgTemplates.circle, req: true })}${fi("tplOrg", "room", WL() + " template sections", { value: S.orgTemplates.room, req: true })}${fi("tplOrg", "cats", "Opportunity categories (comma-separated)", { value: S.orgTemplates.categories.join(", "), req: true })}<div class="actions"><span></span><button class="btn btn-s" type="submit">Save templates</button></div></form>`,
  );
A.cohortNew = () => {
  clearF("coh");
  modal(
    "Launch a new cohort or initiative",
    () =>
      `<form data-f="coh" class="col" style="gap:12px" novalidate>${fi("coh", "name", "Name", { req: true, ph: "e.g. Spring 2027 cohort" })}${fi("coh", "pack", "Use-case pack", { type: "select", opts: S.packs.filter((p) => p.status === "Active").map((p) => [p.id, p.name]) })}${fi("coh", "start", "Start date", { type: "date", req: true })}${banner("info", "", "The Platform Administrator creates the isolated context; you then configure it and invite your cohort.")}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send request</button></div></form>`,
  );
};
F.coh = (d) => {
  if (!validate("coh", d, { name: ["req"], start: ["req", "date"] }))
    return render();
  S.cohortReqs.push({
    id: uid("cr"),
    name: d.name,
    pack: d.pack,
    start: d.start,
    org: me().org,
    by: myId(),
    status: "Pending",
  });
  S.assign
    .filter((a) => roleBase(a.role) === "T")
    .forEach((a) =>
      notify(a.pid, "New cohort requested: " + d.name, "platform"),
    );
  audit("Cohort requested", d.name, "");
  UI.modal = null;
  clearF("coh");
  toast("Request sent to the Platform Administrator.");
  ok();
};
A.cohortCreate = (d) => {
  if (role() !== "T") return deny("not permitted");
  const r = byId("cohortReqs", d.id);
  r.status = "Created";
  S.contexts.push({
    id: uid("c"),
    name: r.name,
    org: r.org,
    pack: r.pack,
    kind: "Cohort",
    status: "Active",
  });
  S.assign.push({
    id: uid("a"),
    pid: r.by,
    role: "O",
    ctx: S.contexts.slice(-1)[0].id,
    status: "Active",
    bundles: [],
    onb: { agreement: false, consents: true, profile: true, compass: true },
  });
  notify(
    r.by,
    "Your cohort context “" +
      r.name +
      "” is ready. Switch to it from the context menu.",
    "home",
  );
  audit("Cohort context created", r.name, "");
  ok();
};
// ---- Facilitator AI summary of a Circle (FCS-09, class B)
A.circleSummary = (d) => {
  const c = byId("circles", d.id);
  if (consent(myId(), "ai") !== "Granted" || !S.settings.aiAvailable)
    return deny(
      S.settings.aiAvailable
        ? "AI processing consent is not granted"
        : "AI is unavailable right now",
    );
  busy("Drafting a summary from authorised Circle records…", () => {
    const open = c.commitments
      .filter((x) => x.status === "Open")
      .map((x) => x.t);
    const conc = c.concerns.filter((x) => x.status === "Open").length;
    c.aiSummary = {
      by: myId(),
      at: today(),
      status: "Draft",
      text: `Messages: ${c.chat.length}. Sessions: ${c.sessions.length}. Decisions: ${c.decisions.map((x) => x.t).join("; ") || "none"}. Open commitments: ${open.join("; ") || "none"}. Unresolved concerns: ${conc}. Unresolved questions: none detected in approved records.`,
    };
    S.ai.push({
      id: uid("aj"),
      by: myId(),
      cls: "B",
      purpose: "Circle summary · " + c.name,
      sources: "Chat, sessions, decisions in " + c.id,
      consent: "Granted",
      model: S.providers.ai.name,
      status: "Draft",
      at: today(),
    });
    S.settings.aiUsed++;
    audit("AI Circle summary drafted", c.id, "Class B");
    UI.tab["ci_" + c.id] = "about";
    ok();
  });
};
A.summaryDecide = (d) => {
  const c = byId("circles", d.id);
  c.aiSummary.status = d.v;
  if (d.v === "Approved") {
    c.reflections.push({
      by: myId(),
      t: "Summary (AI-assisted, reviewed): " + c.aiSummary.text,
      at: today(),
    });
  }
  audit("AI Circle summary " + d.v, c.id, "");
  ok();
};
