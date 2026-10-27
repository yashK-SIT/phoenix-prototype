// ---------- OPTIONAL PURPOSES AS CAPABILITY + CONSENT SCOPES, AND INTEGRATION ADAPTERS (BF-02; WSS clarification 7) ----------
// Five independent scopes, never one global "third-party integrations" switch. Each can be turned off at the tenant
// (organization), the programme (context), by the person (their consent) and, in sensitive cases, on a single record.
// Every protected operation asks: is this purpose authorised for this user + data + context + current consent state?
// Optional providers sit behind adapters: Core workflow → Adapter → Provider. A failing provider returns
// Unavailable / Retry / Use manual flow; it never breaks the parent workflow.
const SCOPES = [
  // [consent key, scope code, on word, off word]
  ["ai", "AI_ASSIST", "ON", "OFF"],
  ["research", "RESEARCH_USE", "ALLOW", "DENY"],
  ["xorg", "CROSS_ORG_DISCOVERY", "ALLOW", "DENY"],
  ["public", "PUBLIC_FUNDER_EXCHANGE", "ALLOW", "DENY"],
  ["ext", "EXTERNAL_DATA_EXCHANGE", "ALLOW", "DENY"],
];
const scopeCode = (k) => (SCOPES.find((s) => s[0] === k) || [k, k])[1];
const scopeWord = (k, on) =>
  (SCOPES.find((s) => s[0] === k) || [, , "ON", "OFF"])[on ? 2 : 3];
const scopeLabel = (k) => (OPT_PURPOSES.find((x) => x[0] === k) || [k, k])[1];
const ctxOrg = (c) => (S.contexts.find((x) => x.id === c) || {}).org || null;
const orgName = (o) =>
  (S.orgs.find((x) => x.id === o) || {}).name || "this organization";
// A person's tenant: their own organization, else the organization that runs their programme.
const personOrg = (pid, c = ctxId()) => (P(pid) || {}).org || ctxOrg(c);
const crossOrg = (a, b, c = ctxId()) => personOrg(a, c) !== personOrg(b, c);
const scopeStore = () => (S.scopes = S.scopes || { tenant: {}, programme: {} });
// Tenant and programme scopes default to enabled; only an explicit `false` turns a purpose off at that level.
const tenantScope = (org, k) =>
  !org || (scopeStore().tenant[org] || {})[k] !== false;
const progScope = (c, k) =>
  !c || (scopeStore().programme[c] || {})[k] !== false;
const recordScope = (rec, k) => !rec || !(rec.purposeDeny || []).includes(k);
// The single check behind every protected operation. Order: tenant → programme → person → record.
function purposeCheck(k, pid = myId(), o = {}) {
  const c = o.ctx || ctxId();
  const org = o.org || personOrg(pid, c);
  const l = scopeLabel(k);
  if (!tenantScope(org, k))
    return {
      ok: false,
      level: "tenant",
      why:
        l +
        " is turned off for " +
        orgName(org) +
        " by the organization (" +
        scopeCode(k) +
        " = " +
        scopeWord(k, false) +
        ").",
    };
  if (!progScope(c, k))
    return {
      ok: false,
      level: "programme",
      why:
        l +
        " is turned off for " +
        ctxName(c) +
        " (" +
        scopeCode(k) +
        " = " +
        scopeWord(k, false) +
        ").",
    };
  const v = consent(pid, k);
  if (v !== "Granted")
    return {
      ok: false,
      level: "user",
      why:
        (pid === myId() ? "Your" : P(pid).name + "’s") +
        " " +
        l.toLowerCase() +
        " permission is " +
        v.toLowerCase() +
        ".",
    };
  if (o.rec && !recordScope(o.rec, k))
    return {
      ok: false,
      level: "record",
      why: "This record is kept out of " + l.toLowerCase() + " by its owner.",
    };
  return { ok: true, level: null, why: "" };
}
const purposeOn = (k, pid = myId(), o = {}) => purposeCheck(k, pid, o).ok;
// For an action: the same check, written to the audit/event log either way.
function authorizePurpose(k, pid, o, op) {
  const r = purposeCheck(k, pid, o);
  audit(
    "Purpose check · " + scopeCode(k),
    op || "operation",
    (r.ok ? "Authorised" : "Denied at " + r.level + " level") +
      " · " +
      P(pid).name,
    r.ok ? "ok" : "denied",
  );
  return r;
}

// ---- adapters. Each integration exposes: enabled, provider_status, consent_required, data_scope, purpose,
// last_success, last_failure. `status` is the provider_status (kept under its older name for other screens).
const ADAPTER_SEED = {
  email: {
    consent_required: null,
    data_scope: "Name, email address, notice text",
    purpose: "Invitations, approvals, payment receipts",
  },
  ai: {
    consent_required: "ai",
    data_scope: "The requesting person’s own authorised records only",
    purpose: "Ask PHOENIX, AI drafts, AI source checks, summaries",
  },
  pay: {
    consent_required: null,
    data_scope: "Product, amount, payer reference — never card details",
    purpose: "Hosted checkout, invoices, verified payment events",
  },
  files: {
    consent_required: null,
    data_scope: "Uploaded files",
    purpose: "Storage and malware scanning",
  },
  lms: {
    consent_required: "ext",
    data_scope: "Pathway step completion status",
    purpose: "Deep links in; completion status back to the learning platform",
  },
};
const ADAPTER_IDS = ["email", "ai", "pay", "files", "lms"];
function adaptersMigrate() {
  (S.integrations || []).forEach((a, i) => {
    a.id = a.id || ADAPTER_IDS[i] || "int" + i;
    Object.entries(ADAPTER_SEED[a.id] || {}).forEach(
      ([k, v]) => a[k] === undefined && (a[k] = v),
    );
    if (a.enabled === undefined) a.enabled = true;
    if (a.last_success === undefined) a.last_success = null;
    if (a.last_failure === undefined) a.last_failure = null;
  });
  // the AI provider's status lives on its adapter; the older flag follows it
  const ai = adapter("ai");
  if (ai && S.settings.aiAvailable === false && ai.status !== "Unavailable")
    ai.status = "Unavailable";
  S.settings.aiAvailable = adapterUp("ai");
}
const adapter = (id) => (S.integrations || []).find((a) => a.id === id) || null;
const adapterUp = (id) => {
  const a = adapter(id);
  return !!a && a.enabled !== false && a.status !== "Unavailable";
};
// One door to every optional provider. Never throws. Returns { state: 'OK' | 'Unavailable' | 'Retry' | 'Manual', why }.
//   Manual      — the purpose is not authorised (tenant/programme/person/record): use the manual flow.
//   Unavailable — the integration is turned off or the provider is down: work is kept, use the manual flow.
//   Retry       — the provider is degraded: nothing happened, try again.
function adapterCall(id, o = {}) {
  const a = adapter(id);
  const op = o.op || (a ? a.purpose : id);
  const pid = o.pid || myId();
  const need = o.purpose !== undefined ? o.purpose : a && a.consent_required;
  if (need) {
    const r = authorizePurpose(
      need,
      pid,
      { ctx: o.ctx, rec: o.rec, org: o.org },
      op,
    );
    if (!r.ok) return { state: "Manual", why: r.why, level: r.level };
  }
  if (!a || a.enabled === false) {
    audit(
      "Adapter call skipped",
      id,
      op + " · integration turned off",
      "denied",
    );
    return { state: "Unavailable", why: (a ? a.name : id) + " is turned off." };
  }
  if (a.status === "Unavailable") {
    a.last_failure = now();
    audit(
      "Adapter call failed safely",
      id,
      op + " · provider unavailable",
      "denied",
    );
    return {
      state: "Unavailable",
      why: a.name + " is temporarily unavailable.",
    };
  }
  if (a.status === "Degraded") {
    a.last_failure = now();
    audit(
      "Adapter call deferred",
      id,
      op + " · provider degraded, retry offered",
      "denied",
    );
    return { state: "Retry", why: a.name + " is responding slowly." };
  }
  a.last_success = now();
  return { state: "OK", why: "" };
}
// AI is usable for this person right now: purpose authorised at every level and the AI adapter is up.
const aiReady = (pid = myId(), o = {}) =>
  purposeOn("ai", pid, o) && adapterUp("ai");
// Why AI is not usable, in one sentence, with the manual route.
const aiWhyNot = (pid = myId(), o = {}) =>
  !adapterUp("ai")
    ? "AI is temporarily unavailable. Your work is kept; carry on manually."
    : purposeCheck("ai", pid, o).why +
      " Everything else keeps working without it.";

// What still works without any optional purpose (shown wherever a purpose is off).
const CORE_WITHOUT_OPTIONAL = [
  "Complete onboarding",
  "Search opportunities yourself",
  "Select a pathway",
  "Join a Circle",
  "Work in an Action Room",
  "Upload evidence",
  "Complete a Learning Harvest",
  "Get help from a person",
];

// ---- tenant (Platform Administrator) scope settings
function scopeMatrix(level, rows) {
  return table(
    [
      level === "tenant" ? "Organization" : "Programme",
      ...SCOPES.map(
        (s) => `<span title="${h(scopeLabel(s[0]))}">${s[1]}</span>`,
      ),
    ],
    rows.map(([id, name]) => [
      `<b>${h(name)}</b>`,
      ...SCOPES.map(([k]) => {
        const on = level === "tenant" ? tenantScope(id, k) : progScope(id, k);
        return `<div class="col" style="gap:4px;align-items:flex-start">${pill(scopeWord(k, on), on ? "p-green" : "p-grey")}${B(on ? "Turn off" : "Turn on", "scopeSet", { level, id, k, v: on ? "off" : "on" }, "btn-g btn-sm", `aria-label="${on ? "Turn off" : "Turn on"} ${scopeCode(k)} for ${h(name)}"`)}</div>`;
      }),
    ]),
  );
}
A.scopeSet = (d) => {
  const st = scopeStore()[d.level];
  st[d.id] = st[d.id] || {};
  if (d.v === "off") st[d.id][d.k] = false;
  else delete st[d.id][d.k];
  const name = d.level === "tenant" ? orgName(d.id) : ctxName(d.id);
  audit(
    "Capability scope changed",
    d.level + ":" + d.id,
    scopeCode(d.k) + " = " + scopeWord(d.k, d.v !== "off") + " for " + name,
  );
  // queued AI work stops as soon as AI is turned off above the person
  if (d.k === "ai" && d.v === "off")
    S.ai
      .filter(
        (j) =>
          ["Queued", "Draft"].includes(j.status) &&
          (d.level === "tenant" ? personOrg(j.by) === d.id : true),
      )
      .forEach((j) => (j.status = "Cancelled"));
  toast(
    scopeCode(d.k) +
      " " +
      scopeWord(d.k, d.v !== "off") +
      " for " +
      name +
      ". Core workflows are unaffected.",
  );
  ok();
};
function tenantScopesView() {
  return card(
    "Capability scopes by organization",
    "Tenant level. Turning a purpose off here overrides every person’s own choice in that organization; their choice is kept for when it is turned back on. Core workflows never depend on these.",
    scopeMatrix(
      "tenant",
      S.orgs.map((o) => [o.id, o.name]),
    ) +
      `<p class="cap" style="margin-top:10px">People decide for themselves in My records & consent, and owners can keep a single record out of a purpose.</p>`,
  );
}
// ---- record level: an owner keeps one sensitive record out of particular purposes
const REC_PURPOSES = ["research", "xorg", "public", "ext"];
function recordPurposesCard(e) {
  const deny = e.purposeDeny || [];
  return card(
    "Optional purposes for this record",
    "For sensitive records. Ticking a purpose keeps this record out of it even when your general permission allows it.",
    `<form data-f="evpur" class="col" style="gap:8px" novalidate><input type="hidden" name="id" value="${e.id}">${REC_PURPOSES.map((k) => `<label class="row" style="gap:8px;align-items:flex-start"><input class="chk" type="checkbox" name="deny" value="${k}" ${deny.includes(k) ? "checked" : ""}><span><b>Keep out of ${h(scopeLabel(k).toLowerCase())}</b> <code class="cap">${scopeCode(k)}</code></span></label>`).join("")}<div class="actions"><span></span><button class="btn btn-s btn-sm" type="submit">Save</button></div></form>`,
  );
}
F.evpur = (d) => {
  const e = byId("evidence", d.id);
  const was = (e.purposeDeny || []).join(",");
  e.purposeDeny = []
    .concat(d.deny || [])
    .filter((k) => REC_PURPOSES.includes(k));
  audit(
    "Record purpose restriction",
    e.id,
    (was || "none") + " → " + (e.purposeDeny.join(",") || "none"),
  );
  toast("Saved. This record’s restrictions apply from now on.");
  ok();
};

// ---- integrations view for the Platform Administrator
function adaptersView() {
  const act = (a) =>
    [
      B(
        a.enabled === false ? "Turn on" : "Turn off",
        "adapterSet",
        { id: a.id, f: "enabled", v: a.enabled === false ? "on" : "off" },
        "btn-g btn-sm",
      ),
      a.status !== "Unavailable" &&
        B(
          "Simulate outage",
          "adapterSet",
          { id: a.id, f: "status", v: "Unavailable" },
          "btn-g btn-sm",
        ),
      a.status !== "Degraded" &&
        B(
          "Simulate slow",
          "adapterSet",
          { id: a.id, f: "status", v: "Degraded" },
          "btn-g btn-sm",
        ),
      ["Unavailable", "Degraded"].includes(a.status) &&
        B(
          "Restore",
          "adapterSet",
          {
            id: a.id,
            f: "status",
            v: a.id === "lms" ? "Configured" : "Healthy",
          },
          "btn-s btn-sm",
        ),
    ]
      .filter(Boolean)
      .join("");
  return card(
    "Integration adapters " +
      `<span class="adm-n">${S.integrations.length}</span>`,
    "Core workflow → adapter → provider. If a provider fails, the adapter returns Unavailable, Retry or Use manual flow; the workflow that called it carries on.",
    table(
      [
        "Integration",
        "enabled",
        "provider_status",
        "consent_required",
        "data_scope",
        "purpose",
        "last_success",
        "last_failure",
        "",
      ],
      S.integrations.map((a) => [
        `<b>${h(a.name)}</b>`,
        pill(
          a.enabled === false ? "Off" : "On",
          a.enabled === false ? "p-grey" : "p-green",
        ),
        pill(a.status),
        a.consent_required
          ? `<code>${scopeCode(a.consent_required)}</code>`
          : '<span class="cap">None (core)</span>',
        `<span class="cap">${h(a.data_scope || "—")}</span>`,
        `<span class="cap">${h(a.purpose || "—")}</span>`,
        a.last_success ? fmt(a.last_success) : "—",
        a.last_failure ? fmt(a.last_failure) : "—",
        `<div class="row wrap" style="gap:4px">${act(a)}</div>`,
      ]),
    ) +
      `<div class="ops-quota">${dl([["AI quota today", S.settings.aiUsed + " / " + S.settings.aiQuota]])}</div>`,
    "",
    "adm-panel",
  );
}
A.adapterSet = (d) => {
  const a = adapter(d.id);
  if (d.f === "enabled") a.enabled = d.v === "on";
  else a.status = d.v;
  if (a.id === "ai") S.settings.aiAvailable = adapterUp("ai");
  if (a.id === "ai" && !adapterUp("ai"))
    S.ai
      .filter((j) => j.status === "Queued")
      .forEach((j) => (j.status = "Cancelled"));
  S.security.unshift({
    at: now(),
    t:
      a.name +
      ": " +
      (d.f === "enabled"
        ? a.enabled
          ? "turned on"
          : "turned off"
        : "provider " + a.status.toLowerCase()) +
      " — core workflows continue; dependent actions offer the manual flow",
  });
  audit(
    "Integration adapter changed",
    a.id,
    d.f + " = " + (d.f === "enabled" ? a.enabled : a.status),
  );
  ok();
};

// ---- external data exchange: completion status back to the learning platform (only with EXTERNAL_DATA_EXCHANGE)
function lmsSendCompletion(p, s) {
  const r = adapterCall("lms", {
    pid: p.pid,
    ctx: p.ctx,
    op: "Send pathway step completion to the LMS",
  });
  if (r.state === "OK")
    pwLog(p, `Completion of “${s.t}” sent to the learning platform`);
  else if (r.state !== "Manual")
    pwLog(
      p,
      `Completion of “${s.t}” not sent to the learning platform (${r.state.toLowerCase()}). Nothing is lost; the step is complete in PHOENIX.`,
    );
  // Manual = the person has not allowed external exchange: nothing is sent and nothing is shown on their record.
  return r;
}
// An AI action that cannot run: say why, keep the work, point to the manual route. Never an error state.
function aiFallback(r, manual) {
  toast(
    (r.state === "Manual"
      ? r.why
      : r.state === "Retry"
        ? "AI is responding slowly. Nothing was processed; try again in a moment."
        : "AI temporarily unavailable.") +
      " Your work is kept. " +
      manual,
    "warn",
  );
  render();
  return false;
}
