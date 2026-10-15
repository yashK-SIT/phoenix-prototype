// ---------- PROFILE (F03) ----------
const VIS = [
  "Only me",
  "My collaboration contexts",
  "Authorised discovery",
  "Matching/pathway roles only",
  "Named users",
];
// Data View filter options from the values the records already carry.
const pfOpts = (list, f) =>
  [...new Set(list.map(f).filter(Boolean))].sort().map((v) => [v, v]);
route("profile", "any", () => {
  const pid = myId();
  const pr = S.profiles[pid] || { ver: 0, history: [] };
  const cl = S.claims.filter((c) => c.pid === pid && c.state !== "Revoked");
  const cands = S.candidates.filter((c) => c.pid === pid);
  const t = tabs(
    "prof",
    [
      ["claims", "Profile"],
      role() === "P" && ["compass", "Purpose Compass"],
      [
        "cand",
        "Change candidates",
        cands.filter((c) => c.status === "Pending").length,
      ],
      [
        "evo",
        "Profile evolution",
        S.evolution.filter((s) => s.pid === pid && s.status === "Pending").length,
      ],
      ["versions", "Versions"],
      ["collab", "Collaboration history"],
    ],
    UI.p.tab,
  );
  let body = "";
  if (t.cur === "claims") {
    const cp = S.compass[pid] || {};
    const live = cl.filter((c) => c.state === "Current");
    body =
      `<div class="pf-cols"><div class="pf-main">` +
      card(
        "Basic information",
        "Each saved change creates an immutable version.",
        dl([
          ["Full name", h(me().name) + " " + pill("Self-declared", "p-grey")],
          ["Display name", h(me().display)],
          [
            "Date of birth",
            (me().dob ? fmt(me().dob) : "Not recorded") +
              ' · <span class="cap">Private; you and authorised administration</span>',
          ],
          [
            "Email",
            h(me().email) +
              ' · <span class="cap">Private; released only for an approved introduction</span>',
          ],
          ["Biography", h(pr.bio || "—")],
          ["Active role", ROLE[role()] + " · " + h(ctx().name)],
        ]),
        B(ic("edit", 14) + "Edit basics", "editBasics"),
        "pf-basic",
      ) +
      card(
        "Recent changes",
        "The latest versions of your profile.",
        pr.history.length
          ? `<ol class="pf-hist">${pr.history
              .slice(-3)
              .reverse()
              .map((v) => `<li><span class="pf-ver">v${v.ver}</span><div class="lt"><b>${h(v.what)}</b><p class="cap">${fmt(v.at)} · ${h(v.by)} · ${h(v.why)}</p></div></li>`)
              .join("")}</ol>`
          : `<p class="cap">No versions yet.</p>`,
        L("Versions", "profile", { tab: "versions" }),
        "pf-recent",
      ) +
      `</div><div class="pf-rail">` +
      (role() === "P"
        ? `<section class="card pf-ns" aria-labelledby="pf-ns-t"><div class="row pf-ns-h"><span class="over" id="pf-ns-t">My purpose / current direction</span><span class="vis">${ic("lock", 14)}Only you</span></div><p class="pf-ns-q${cp.PC2 ? "" : " is-unset"}">${cp.PC2 ? "“" + h(cp.PC2) + "”" : "Set your goal in the Purpose Compass."}</p>${cp.PC5 ? `<p class="cap">First milestone: ${h(cp.PC5)}</p>` : ""}<div class="pf-ns-a">${L("Purpose Compass" + ic("chevr", 14), "profile", { tab: "compass" }, "lnk pf-lnk")}</div></section>`
        : "") +
      (["C", "O"].includes(role()) && me().org
        ? card(
            "Organization profile",
            h(S.orgs.find((o) => o.id === me().org).type),
            dl([
              ["Name", h(S.orgs.find((o) => o.id === me().org).name)],
              [
                "Sector",
                h(S.orgs.find((o) => o.id === me().org).sector || "—"),
              ],
              [
                "About",
                h(
                  S.orgs.find((o) => o.id === me().org).profile ||
                    "Not written yet",
                ),
              ],
              ["Website", h(S.orgs.find((o) => o.id === me().org).web || "—")],
            ]),
            B(ic("edit", 14) + "Edit organization profile", "orgEdit"),
            "pf-org",
          )
        : "") +
      `<section class="card pf-vis" aria-labelledby="pf-vis-t"><div class="card-h"><div><h2 class="h2" id="pf-vis-t">Who can see your claims</h2><p class="cap">Current claims by visibility. Change it per claim below.</p></div></div><ul class="pf-vis-l">${VIS.map((v) => `<li class="${live.some((c) => c.vis === v) ? "" : "is-zero"}"><span>${v}</span><b>${live.filter((c) => c.vis === v).length}</b></li>`).join("")}</ul></section>` +
      `</div></div>` +
      card(
        "Profile claims",
        "Each item is a separate claim with provenance. Provenance is not a trust score.",
        dataView("profile:claims", {
          label: "claims",
          items: cl,
          search: (c) => c.field + " " + c.value + " " + c.prov + " " + c.vis,
          quick: {
            label: "Provenance",
            options: pfOpts(cl, (c) => c.prov),
            test: (c, v) => c.prov === v,
          },
          filters: [
            { key: "field", label: "Field", options: pfOpts(cl, (c) => c.field), test: (c, v) => c.field === v },
            { key: "vis", label: "Visibility", options: VIS.map((v) => [v, v]), test: (c, v) => c.vis === v },
          ],
          sorts: [
            ["field", "Field", (a, b) => a.field.localeCompare(b.field)],
            ["value", "Value", (a, b) => a.value.localeCompare(b.value)],
            ["vis", "Visibility", (a, b) => VIS.indexOf(a.vis) - VIS.indexOf(b.vis)],
          ],
          layout: "table",
          columns: [
            { label: "Field", sort: "field", cell: (c) => `<b>${h(c.field)}</b>` },
            { label: "Value", sort: "value", cell: (c) => h(c.value) },
            {
              label: "Provenance",
              hideSm: true,
              cell: (c) =>
                pill(
                  c.prov,
                  c.prov.includes("verified")
                    ? "p-green"
                    : c.prov.includes("Evidence")
                      ? "p-navy"
                      : c.prov.includes("AI")
                        ? "p-ai"
                        : "p-grey",
                ),
            },
            {
              label: "Visibility",
              sort: "vis",
              cell: (c) =>
                `<select class="input pf-visel" data-ch="claimVis" data-id="${c.id}" aria-label="Visibility of ${h(c.field)}: ${h(c.value)}">${VIS.map((v) => `<option ${v === c.vis ? "selected" : ""}>${v}</option>`).join("")}</select>`,
            },
            {
              label: "",
              cell: (c) =>
                `<span class="row pf-acts">${B("Correct", "correctClaim", { id: c.id }) +
                  CB(
                    "Revoke",
                    "revokeClaim",
                    { id: c.id },
                    "Revoke “" +
                      c.field +
                      ": " +
                      c.value +
                      "”? It stops being shown anywhere; the version history keeps a record.",
                  )}</span>`,
            },
          ],
          rowId: (c) => c.id,
          bulk: [
            {
              label: "Revoke",
              icon: "trash",
              danger: true,
              confirm: "Revoke the selected claims? They stop being shown anywhere; the version history keeps a record.",
              run: (ids) => ids.forEach((id) => A.revokeClaim({ id })),
            },
          ],
          actions: B(ic("plus", 14) + "Add claim", "addClaim"),
          empty: ["user", "No profile claims yet", "Add a claim, or accept a change candidate.", ""],
        }),
        "",
        "pf-claims",
      );
  }
  if (t.cur === "compass") {
    const a = S.compass[pid] || {};
    const miss = blMissing(pid);
    body =
      (miss.length
        ? banner(
            "warn",
            "Your baseline is not complete",
            "Answer the required questions in: " +
              miss.map((s) => s.n).join(", ") +
              ". Your " +
              WL() +
              "s and Learning Harvests use the baseline as context.",
          )
        : "") +
      `<div class="pf-cols pf-cc"><div class="pf-rail">${card(
        "Purpose Compass Baseline",
        "Your starting point. Used as context for your " +
          WL() +
          "s and Learning Harvests. Private by default.",
        blSummary(pid),
        "",
        "pf-sum",
      )}</div><div class="pf-main">` +
      `<form data-f="compass" class="col pf-cform" novalidate>${errSum("compass")}${blSets(false).map((s, i) =>
        card(
          h(s.n),
          h(s.d || ""),
          `<div class="col pf-form">${s.q.map((q) => blField("compass", q, a)).join("")}</div>`,
          "",
          "pf-set",
        ),
      ).join("")}<div class="actions pf-save"><span class="cap">${a._at ? "Baseline set " + fmt(a._at) + ". " : ""}Each save creates a new profile version.</span><button class="btn btn-p" type="submit">Save new version</button></div></form></div></div>`;
  }
  if (t.cur === "cand")
    body = banner("info", "Nothing changes in your profile until you decide", "Every change from evidence, a milestone, a Learning Harvest or AI arrives here first, with its source and provenance. Accept it, edit the wording and accept, or reject it. Rejecting leaves your profile unchanged. Every decision is kept in the history.") + card(
      "Profile change candidates",
      "Provenance says where a claim came from. It is not a score.",
      dataView("profile:cand", {
        label: "candidates",
        items: cands,
        search: (c) => c.field + " " + c.value + " " + c.source,
        quick: {
          label: "Status",
          options: pfOpts(cands, (c) => c.status),
          test: (c, v) => c.status === v,
        },
        filters: [
          { key: "field", label: "Field", options: pfOpts(cands, (c) => c.field), test: (c, v) => c.field === v },
          { key: "prov", label: "Provenance", options: pfOpts(cands, (c) => c.prov), test: (c, v) => c.prov === v },
        ],
        sorts: [
          ["field", "Field", (a, b) => a.field.localeCompare(b.field)],
          ["status", "Status", (a, b) => (a.status === "Pending" ? 0 : 1) - (b.status === "Pending" ? 0 : 1) || a.status.localeCompare(b.status)],
        ],
        row: (c) => ({
          lead: `<span class="tile t-soft" aria-hidden="true">${ic("sparkle", 16)}</span>`,
          title: `${h(c.field)}: ${h(c.value)}`,
          sub: "Source: " + candSrc(c),
          meta: [
            `Audience ${c.status === "Accepted" ? "" : "if accepted"}: ${h(c.aud || "Only me")}`,
            c.orig && c.orig !== c.value ? `You edited the wording (was “${h(c.orig)}”)` : "",
            c.decidedAt ? `${h(c.status)} by ${nm(c.decidedBy)} on ${fmt(c.decidedAt)}${c.status === "Rejected" ? " · profile not changed" : c.status === "Accepted" ? " · profile updated" : ""}` : "",
          ],
          badges: `${provPill(c.status === "Accepted" && c.provOut ? c.provOut : c.prov)} ${pill(c.status)}`,
          primary:
            ["Pending", "Deferred"].includes(c.status)
              ? `<span class="row pf-acts">${B(ic("x", 14) + "Reject", "cand", { id: c.id, v: "Rejected" })}${B(ic("edit", 14) + "Edit", "candDlg", { id: c.id, edit: 1 })}${B(ic("check", 14) + "Accept", "candDlg", { id: c.id }, "btn-p btn-sm")}</span>`
              : "",
          menu: c.status === "Pending" ? B(ic("clock", 16) + "Decide later", "cand", { id: c.id, v: "Deferred" }, "menu-i", 'role="menuitem"') : "",
        }),
        empty: [
          "sparkle",
          "No candidates",
          "Candidates come from AI (only when you ask, or after approved evidence), completed milestones or Learning Harvests.",
          "",
        ],
      }),
      "",
      "pf-dv",
    );
  if (t.cur === "evo") {
    const ev = S.evolution.filter((s) => s.pid === pid);
    const pend = ev.filter((s) => s.status === "Pending");
    const done = ev.filter((s) => s.status !== "Pending").reverse();
    body =
      banner(
        "info",
        "Your profile only changes when you approve",
        "After a Learning Harvest is approved, PHOENIX identifies possible profile changes from it. Each one shows what would change, why, and the finding and records behind it. Approving updates your profile and saves a new version; rejecting leaves it unchanged. Both are recorded.",
      ) +
      (pend.length
        ? `<h2 class="h3 pf-sec">Awaiting your review (${pend.length})</h2><div class="pf-evo">${pend.map((s) => evoCard(s, true)).join("")}</div>`
        : empty(
            "sparkle",
            "Nothing to review",
            "Suggestions appear here after a Learning Harvest about your work is approved.",
          )) +
      (done.length
        ? `<h2 class="h3 pf-sec">Decided</h2><div class="pf-evo">${done.map((s) => evoCard(s, false)).join("")}</div>`
        : "");
  }
  if (t.cur === "versions")
    body = card(
      "Version history",
      "Who changed what, when, why and from which source.",
      dataView("profile:versions", {
        label: "versions",
        items: pr.history.slice().reverse(),
        search: (v) => "v" + v.ver + " " + v.what + " " + v.by + " " + v.why + " " + v.source,
        quick: {
          label: "Source",
          options: pfOpts(pr.history, (v) => v.source),
          test: (v, x) => v.source === x,
        },
        filters: [{ key: "by", label: "Changed by", options: pfOpts(pr.history, (v) => v.by), test: (v, x) => v.by === x }],
        sorts: [
          ["ver", "Newest first", (a, b) => b.ver - a.ver],
          ["date", "Date", (a, b) => String(a.at).localeCompare(String(b.at))],
        ],
        defaultSort: "ver",
        layout: "table",
        dense: true,
        columns: [
          { label: "Version", cell: (v) => `<span class="pf-ver">v${v.ver}</span>` },
          { label: "Date", sort: "date", cell: (v) => fmt(v.at) },
          { label: "What changed", cell: (v) => h(v.what) },
          { label: "By", hideSm: true, cell: (v) => h(v.by) },
          { label: "Why", hideSm: true, cell: (v) => h(v.why) },
          { label: "Provenance & source", hideSm: true, cell: (v) => provPill(v.source) + (v.src && v.src.r ? ` ${L(ic("link", 12) + h(v.src.label || "Open source"), v.src.r, v.src.p || {})}` : "") },
        ],
        empty: ["clock", "No versions yet", "Every saved change to your profile creates a version.", ""],
      }),
      "",
      "pf-dv",
    );
  if (t.cur === "collab") {
    const rows = [
      ...S.circles
        .filter((c) => memberOf(c, pid))
        .map((c) => [
          h(c.name),
          "Circle",
          h(c.members.find((m) => m.pid === pid).role),
          pill(c.state),
        ]),
      ...S.ropes
        .filter((c) => memberOf(c, pid))
        .map((c) => [
          h(c.name),
          "Rope Team",
          h(c.members.find((m) => m.pid === pid).role),
          pill(c.state),
        ]),
      ...S.rooms
        .filter((c) => memberOf(c, pid))
        .map((c) => [
          h(c.name),
          WL(),
          h(c.members.find((m) => m.pid === pid).role),
          pill(c.state),
        ]),
    ];
    const txt = (x) => String(x).replace(/<[^>]+>/g, "");
    body = card(
      "Collaboration history",
      "Authorised summary only. Private discussions, Rope Team notes and restricted evidence are never copied here.",
      dataView("profile:collab", {
        label: "spaces",
        items: rows,
        search: (r) => txt(r.join(" ")),
        quick: {
          label: "Type",
          options: pfOpts(rows, (r) => r[1]),
          test: (r, v) => r[1] === v,
        },
        filters: [
          { key: "role", label: "Role", options: pfOpts(rows, (r) => txt(r[2])), test: (r, v) => txt(r[2]) === v },
          { key: "state", label: "Status", options: pfOpts(rows, (r) => txt(r[3])), test: (r, v) => txt(r[3]) === v },
        ],
        sorts: [["name", "Name", (a, b) => txt(a[0]).localeCompare(txt(b[0]))]],
        row: (r) => ({
          lead: `<span class="tile ${{ Circle: "t-purple", "Rope Team": "t-teal" }[r[1]] || "t-navy"}" aria-hidden="true">${ic({ Circle: "users", "Rope Team": "route" }[r[1]] || "room", 16)}</span>`,
          title: r[0],
          sub: r[1] + " · " + r[2],
          badges: r[3],
        }),
        empty: ["users", "No collaborations yet", "Circles, Rope Teams and " + WL() + "s you join appear here.", ""],
      }),
      "",
      "pf-dv",
    );
  }
  const org = me().org && S.orgs.find((o) => o.id === me().org);
  return (
    `<header class="shead-main pf-head"><span class="av lg pf-av" aria-hidden="true">${ini(pid)}</span><div class="shead-t"><p class="shead-kind">Profile</p><div class="row wrap pf-title"><h1 class="h1">${h(me().name)}</h1>${pill(ROLE[role()], "p-teal")}</div><div class="shead-meta"><span>${h(ctx().name)}</span>${org ? `<span>${h(org.name)}</span>` : ""}<span>Profile v${pr.ver}</span><span>${cl.length} claim${cl.length === 1 ? "" : "s"}</span></div><p class="pf-sub">Your versioned profile. You can correct any claim and compare versions.</p></div></header>` +
    t.html +
    body
  );
});
// Every version records what changed, who, why, and the source/provenance (x: { src, cand } links the record).
function bumpVer(what, why, source, x) {
  const pid = myId();
  const pr = (S.profiles[pid] = S.profiles[pid] || { ver: 0, history: [] });
  pr.ver++;
  pr.history.push({
    ver: pr.ver,
    at: today(),
    what,
    by: me().name,
    why,
    source,
    ...(x && x.src ? { src: x.src } : {}),
    ...(x && x.cand ? { cand: x.cand } : {}),
  });
  audit("Profile version created", pid, "v" + pr.ver + " · " + what);
}
A.claimVis = (d, el) => {
  const c = byId("claims", d.id);
  bumpVer(
    `Visibility of ${c.field} → ${el.value}`,
    "Visibility change",
    "Self-declared",
  );
  c.vis = el.value;
  toast("Visibility updated. New version saved.");
  ok();
};
A.revokeClaim = (d) => {
  const c = byId("claims", d.id);
  c.state = "Revoked";
  bumpVer(`Revoked ${c.field}: ${c.value}`, "User revoked", "Self-declared");
  ok();
};
A.addClaim = () => {
  clearF("claim");
  modal(
    "Add a profile claim",
    () =>
      `<form data-f="claim" class="col pf-form" novalidate>${fi("claim", "field", "Field", { type: "select", req: true, opts: ["Skills", "Skill proficiency", "Experience", "Knowledge", "Capability", "Interests", "Languages", "Availability", "Relationships / resources", "Preferences", "Goals", "Contributions", "Constraints"], ph: "Select" })}${fi("claim", "value", "Value", { req: true })}${fi("claim", "vis", "Visibility", { type: "select", opts: VIS, value: "Only me" })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save claim</button></div></form>`,
  );
};
F.claim = (d) => {
  if (!validate("claim", d, { field: ["req"], value: ["req"] }))
    return render();
  S.claims.push({
    id: uid("cl"),
    pid: myId(),
    field: d.field,
    value: d.value,
    prov: "Self-declared",
    vis: d.vis,
    state: "Current",
    ver: 1,
  });
  bumpVer("Added " + d.field + ": " + d.value, "User added", "Self-declared");
  clearF("claim");
  UI.modal = null;
  ok();
};
A.correctClaim = (d) => {
  const c = byId("claims", d.id);
  UI.form.corr = { value: c.value, id: c.id };
  modal(
    "Correct claim",
    () =>
      `<form data-f="corr" class="col pf-form" novalidate><input type="hidden" name="id" value="${c.id}">${fi("corr", "value", h(c.field), { req: true })}${fi("corr", "why", "Reason for correction", { req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save correction</button></div></form>`,
  );
};
F.corr = (d) => {
  if (!validate("corr", d, { value: ["req"], why: ["req"] })) return render();
  const c = byId("claims", d.id);
  bumpVer(
    `Corrected ${c.field}: “${c.value}” → “${d.value}” (was ${c.prov})`,
    d.why,
    "Corrected",
  );
  // the prior value and its provenance stay with the claim
  (c.prev = c.prev || []).push({ value: c.value, prov: c.prov, at: now(), why: d.why });
  c.value = d.value;
  c.prov = "Self-declared";
  UI.modal = null;
  clearF("corr");
  ok();
};
A.editBasics = () => {
  const pr = S.profiles[myId()] || {};
  UI.form.basics = {
    display: me().display,
    dob: me().dob || "",
    bio: pr.bio || "",
    lang: pr.lang || "",
  };
  modal(
    "Edit basics",
    () =>
      `<form data-f="basics" class="col pf-form" novalidate>${fi("basics", "display", "Display name", { req: true })}${fi("basics", "ageNote", "Age confirmation", { value: me().ageConfirmed ? ("Confirmed " + fmt(me().ageConfirmed === true ? today() : me().ageConfirmed)) : "Not recorded", disabled: true, help: "Recommended (WSS): attestation only — no date of birth is collected." })}${fi("basics", "bio", "Short biography", { type: "textarea", rows: 3, max: 400 })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save new version</button></div></form>`,
  );
};
F.basics = (d) => {
  if (!validate("basics", d, { display: ["req"] }))
    return render();
  me().display = d.display;
  const pr = (S.profiles[myId()] = S.profiles[myId()] || {
    ver: 0,
    history: [],
  });
  pr.bio = d.bio;
  pr.lang = "English";
  bumpVer("Basics updated", "User edit", "Self-declared");
  UI.modal = null;
  ok();
};
F.compass = (d) => {
  const sets = blSets(false);
  if (!validate("compass", d, blRules(sets))) return render();
  blApply(myId(), d, sets);
  const a = S.compass[myId()];
  a._at = a._at || today();
  bumpVer("Purpose Compass Baseline updated", "User edit", "Self-declared");
  toast("Purpose Compass saved as a new version.");
  ok();
};
// ---- Profile Change Candidates (BF-06): every change from evidence, a milestone, a Harvest or AI is a candidate
// with its source and provenance. The person accepts, edits then accepts, or rejects. AI-proposed stays labelled as
// such; an accepted AI proposal records "AI-proposed → accepted by participant", never Self-declared.
const PROV = ["Self-declared", "Activity-derived", "Evidence-supported", "Reviewer-verified", "AI-proposed"];
const provPill = (p) =>
  String(p || "").startsWith("AI-proposed") && !String(p).includes("→")
    ? aiTag("AI-proposed")
    : pill(p || "Self-declared", String(p).includes("AI") ? "p-ai" : String(p).includes("verified") ? "p-green" : String(p).includes("Evidence") ? "p-navy" : "p-grey");
// The provenance an accepted claim records.
const provAccepted = (prov, edited) => (String(prov).startsWith("AI-proposed") ? "AI-proposed → " + (edited ? "edited and " : "") + "accepted by participant" : prov);
// Source text, with a link to the evidence, Harvest, milestone or pathway it came from when that record exists.
const candSrc = (c) => {
  const s = c.src;
  const okLink = s && s.r && (s.r !== "evidence" || byId("evidence", s.p && s.p.id)) && (s.r !== "harvest" || byId("harvests", s.p && s.p.id));
  return h(c.source || "—") + (okLink ? " · " + L(ic("link", 12) + "Open source: " + h(s.label || s.r), s.r, s.p || {}) : "");
};
A.cand = (d) => {
  const c = byId("candidates", d.id);
  if (!c || !["Pending", "Deferred"].includes(c.status)) return deny("this candidate has already been decided");
  const was = c.status;
  c.status = d.v;
  if (d.v !== "Deferred") Object.assign(c, { decidedAt: now(), decidedBy: myId() });
  if (d.v === "Accepted") {
    if (d.aud) c.aud = d.aud;
    const edited = !!(c.orig && c.orig !== c.value);
    c.provOut = provAccepted(c.prov, edited);
    S.claims.push({
      id: uid("cl"),
      pid: c.pid,
      field: c.field,
      value: c.value,
      prov: c.provOut,
      vis: c.aud || "Only me",
      state: "Current",
      ver: 1,
      from: c.id,
      src: c.src || null,
      source: c.source,
      ...(edited ? { origValue: c.orig } : {}),
    });
    bumpVer(`Accepted ${c.field}: ${c.value}${edited ? ` (edited from “${c.orig}”)` : ""} · audience: ${c.aud || "Only me"}`, "Profile change candidate · source: " + (c.source || "—"), c.provOut, { src: c.src, cand: c.id });
    toast(`${c.field} added to your profile (${c.provOut}). Audience: ${c.aud || "Only me"}.`);
  } else if (d.v === "Rejected") toast("Rejected. Your profile was not changed; the decision is kept in the history.");
  audit("Profile candidate " + d.v.toLowerCase(), c.id, `${c.field}: ${c.value} · ${c.prov} · source: ${c.source || "—"}${d.v === "Rejected" ? " · profile unchanged" : ""} (was ${was})`);
  ok();
};
// Accept (choose the audience) or Edit then accept, in one dialog that shows source and provenance.
A.candDlg = (d) => {
  const c = byId("candidates", d.id);
  clearF("ce");
  UI.form.ce = { value: c.value, aud: c.aud || "Only me" };
  const edit = !!d.edit;
  modal(edit ? "Edit, then accept" : "Accept this profile change", () =>
    `<form data-f="ce" class="col pf-form" novalidate>${errSum("ce")}<input type="hidden" name="id" value="${c.id}">${dl([
      ["Profile field", `<b>${h(c.field)}</b>`],
      ["Source", candSrc(c)],
      ["Provenance", provPill(c.prov) + (String(c.prov).startsWith("AI") ? ` <span class="cap">If you accept, the claim records “${h(provAccepted(c.prov, edit))}”.</span>` : "")],
      !edit && ["Value", h(c.value)],
    ])}${edit ? fi("ce", "value", "Wording (" + h(c.field) + ")", { req: true, max: 200, help: "Edit it to match how you describe it. The original wording is kept in the history." }) : `<input type="hidden" name="value" value="${h(c.value)}">`}${fi("ce", "aud", "Who will see this claim", { type: "select", opts: VIS, help: "Only me unless you choose otherwise. You can change it later on each claim." })}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">${edit ? "Accept edited version" : "Accept"}</button></div></form>`,
  );
};
F.ce = (d) => {
  if (!validate("ce", d, { value: [["req", "Enter the wording."]] })) return render();
  const c = byId("candidates", d.id);
  const v = d.value.trim();
  if (v !== c.value) {
    c.orig = c.orig || c.value;
    c.value = v;
  }
  UI.modal = null;
  clearF("ce");
  A.cand({ id: c.id, v: "Accepted", aud: VIS.includes(d.aud) ? d.aud : "Only me" });
};
A.candEdit = (d) => A.candDlg({ id: d.id, edit: 1 });
// ---------- PROFILE EVOLUTION (from an approved Learning Harvest) ----------
// Learning Harvest → analyse learning → suggested changes → the person reviews each one → approve or reject.
// Suggestions never write to the profile. Only an approval by the person themself does (evoApply).
const evoSep = (field) => (field === "Experience" ? "; " : ", ");
const evoItems = (s, comma = true) =>
  String(s || "")
    .split(comma ? /\n|;|,|•/ : /\n|;|•/)
    .map((x) => x.replace(/^[-–*\s]+/, "").trim())
    .filter((x) => x && !/^(none|n\/a|na|nothing|-)\.?$/i.test(x));
const evoHas = (list, v) => list.some((x) => x.toLowerCase() === String(v).toLowerCase());
const curItems = (pid, field) =>
  S.claims
    .filter((c) => c.pid === pid && c.field === field && c.state === "Current")
    .flatMap((c) => evoItems(c.value, field !== "Experience"));
const monthYear = (d) =>
  new Date((d || today()).slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { month: "short", year: "numeric" });
function analyseHarvest(x) {
  const pid = x.subject;
  const room = byId("rooms", x.scope);
  const s = x.sections;
  const where = room ? room.name : "this work";
  const mine = room
    ? room.tasks.filter((k) => k.status === "Done" && (k.owner === pid || (k.partners || []).includes(pid)))
    : [];
  const ev = room
    ? S.evidence.filter(
        (e) => e.linked.includes(room.id) && e.owner === pid && !["Withdrawn", "Rejected"].includes(e.review),
      )
    : [];
  const refs = [
    ...mine.map((k) => ({ type: "Deliverable", id: k.id, label: k.t, r: "room", p: { id: room.id, tab: "plan" } })),
    ...ev.map((e) => ({ type: "Evidence", id: e.id, label: e.title, r: "evidence", p: { id: e.id } })),
  ];
  const out = [];
  const add = (o) => out.push({ id: uid("pe"), pid, hv: x.id, room: room ? room.id : null, status: "Pending", at: now(), refs, ...o });
  const backing = mine.length
    ? ` while completing ${mine.length} deliverable${mine.length > 1 ? "s" : ""} in ${where}` +
      (ev.length ? `, supported by ${ev.length} evidence item${ev.length > 1 ? "s" : ""}` : "")
    : ` in ${where}`;
  // Skills: demonstrated or developed, and not already held
  const curSk = curItems(pid, "Skills");
  const dem = evoItems(s.skillsDem),
    dev = evoItems(s.skillsDev);
  const newSk = [...new Set([...dem, ...dev])].filter((v) => !evoHas(curSk, v));
  if (newSk.length)
    add({
      kind: "claim",
      field: "Skills",
      add: newSk,
      reason: `The Learning Harvest records ${newSk.join(", ")} as ${[dem.some((v) => evoHas(newSk, v)) && "demonstrated", dev.some((v) => evoHas(newSk, v)) && "developed"].filter(Boolean).join(" and ")}${backing}.`,
      finding: {
        sec: "B. Learning — skills demonstrated and developed",
        text: [s.skillsDem && "Demonstrated: " + s.skillsDem, s.skillsDev && "Developed: " + s.skillsDev].filter(Boolean).join("\n"),
      },
    });
  // Skill proficiency: a skill already held that was demonstrated in completed work
  dem
    .filter((v) => evoHas(curSk, v))
    .slice(0, 5)
    .forEach((v) =>
      add({
        kind: "claim",
        field: "Skill proficiency",
        skill: v,
        value: `${v}: applied in practice — ${where} (${monthYear(x.at)})`,
        reason: `${v} is already one of your skills. The Learning Harvest records it as demonstrated${backing}, which suggests an updated proficiency.`,
        finding: { sec: "B. Learning — skills demonstrated", text: s.skillsDem },
      }),
    );
  const list = (field, txt, sec, reason) => {
    const items = [...new Set(evoItems(txt))].filter((v) => !evoHas(curItems(pid, field), v));
    if (items.length) add({ kind: "claim", field, add: items, reason: reason(items), finding: { sec, text: txt } });
  };
  list("Interests", s.interests, "B. Learning — new interests", (it) => `The Learning Harvest records ${it.length > 1 ? "new interests" : "a new interest"} that came out of ${where}.`);
  list("Knowledge", s.knowledge, "B. Learning — new knowledge", () => `The Learning Harvest records new knowledge gained${backing}.`);
  list("Capability", s.confidence, "B. Learning — changes in confidence or capability", () => `The Learning Harvest records a change in confidence or capability${backing}.`);
  // Experience: the person's own completed deliverables
  const exp = mine
    .map((k) => `${k.owner === pid ? "Delivered" : "Contributed to"} “${k.t}” in ${where} (${monthYear(k.doneAt)})`)
    .filter((v) => !evoHas(curItems(pid, "Experience"), v));
  if (exp.length)
    add({
      kind: "claim",
      field: "Experience",
      add: exp,
      reason: `You delivered or contributed to ${mine.length} completed deliverable${mine.length > 1 ? "s" : ""} in ${where}, with evidence submitted and the Learning Harvest approved.`,
      finding: { sec: "A. What happened", text: s.what },
    });
  // Goals: the baseline first milestone may be reached; the Test decision names the next one
  const cp = S.compass[pid] || {};
  const nxt = evoItems(s.test, false)[0];
  if (nxt && cp.PC5 && nxt.toLowerCase() !== cp.PC5.toLowerCase())
    add({
      kind: "compass",
      key: "PC5",
      field: "Goals — first milestone",
      value: nxt,
      reason: `All required deliverables in ${where} are complete and evidence was submitted, so your baseline first milestone (“${cp.PC5}”) may be reached. The Harvest's Test decision names what to try next.`,
      finding: { sec: "F. Continue / Change / Stop / Test — Test", text: s.test },
    });
  return out;
}
// Runs once, when the Harvest is approved. Creates Pending suggestions only.
function evoGenerate(x) {
  if (x.evoAt || !x.subject) return [];
  const list = analyseHarvest(x);
  S.evolution.push(...list);
  x.evoAt = now();
  x.evoN = list.length;
  if (list.length)
    notify(
      x.subject,
      `${list.length} suggested profile change${list.length > 1 ? "s" : ""} from your Learning Harvest ${list.length > 1 ? "are" : "is"} waiting for your review`,
      "profile",
      { tab: "evo" },
    );
  audit("Profile evolution identified", x.id, list.length + " suggestion(s) for " + P(x.subject).name + " — none applied");
  return list;
}
function evoCurrent(s) {
  if (s.status !== "Pending") return s.before || "—";
  if (s.kind === "compass") return (S.compass[s.pid] || {})[s.key] || "—";
  if (s.field === "Skill proficiency") return (evoProfClaim(s) || {}).value || "Not recorded";
  return curItems(s.pid, s.field).join(evoSep(s.field)) || "None recorded";
}
function evoSuggestedHtml(s) {
  const mk = (v) => `<mark class="evo-add">${h(v)}</mark>`;
  if (s.kind === "compass" || s.field === "Skill proficiency") return mk(s.value);
  const base = s.status === "Pending" ? curItems(s.pid, s.field) : evoItems(s.before, s.field !== "Experience");
  const add = s.add.filter((v) => !evoHas(base, v));
  return [...base.map(h), ...add.map(mk)].join(evoSep(s.field)) || "—";
}
const evoProfClaim = (s) =>
  S.claims.find(
    (c) =>
      c.pid === s.pid &&
      c.field === "Skill proficiency" &&
      c.state === "Current" &&
      c.value.toLowerCase().startsWith(s.skill.toLowerCase() + ":"),
  );
function evoCard(s, act) {
  const hv = byId("harvests", s.hv);
  const links = [
    hv && L(ic("sparkle", 14) + "View Learning Harvest", "harvest", { id: hv.id }, "btn btn-g btn-sm"),
    ...s.refs.filter((r) => r.type === "Evidence").map((r) => L(ic("award", 14) + "View evidence: " + h(r.label), r.r, r.p, "btn btn-g btn-sm")),
    ...(() => {
      const ds = s.refs.filter((r) => r.type === "Deliverable");
      return ds.length ? [L(ic("check", 14) + (ds.length > 1 ? "View deliverables (" + ds.length + ")" : "View deliverable: " + h(ds[0].label)), ds[0].r, ds[0].p, "btn btn-g btn-sm")] : [];
    })(),
  ]
    .filter(Boolean)
    .join("");
  const st = { Pending: "p-amber", Approved: "p-green", Rejected: "p-grey" }[s.status];
  const lab = s.status === "Approved" ? "Accepted" : s.status;
  return `<article class="evo"><header class="evo-h"><span class="over">Suggested profile change</span>${pill(s.status === "Pending" ? "Awaiting your review" : lab, st)}</header>${dl([
    ["Profile field", `<b>${h(s.field)}</b>`],
    [s.status === "Pending" ? "Current" : "Before", h(evoCurrent(s))],
    ["Suggested", evoSuggestedHtml(s) + (s.origSug ? `<span class="cap"> · edited by you (suggested: “${h(s.origSug)}”)</span>` : "")],
    ["Source", hv ? L(ic("sparkle", 12) + "Learning Harvest: " + h(hv.scopeName || hv.id), "harvest", { id: hv.id }) + (hv.ai ? " " + aiTag("AI-drafted Harvest") : "") : "Learning Harvest " + h(s.hv)],
    ["Provenance", provPill(evoProv(s)) + ' <span class="cap">Identified by PHOENIX from the approved Harvest; applied only if you accept.</span>'],
    ["Audience " + (s.status === "Approved" ? "" : "if accepted"), h(s.aud || "Only me")],
    ["Why this was suggested", h(s.reason)],
    ["Supporting Harvest finding", `<span class="cap">${h(s.finding.sec)}</span><blockquote class="evo-q">${h(s.finding.text || "—")}</blockquote>`],
    ["Supporting evidence and records", `<div class="row wrap pf-links">${links || '<span class="cap">None linked</span>'}</div>`],
  ])}${
    s.status === "Pending"
      ? act
        ? `<div class="evo-act"><span class="cap">Nothing changes in your profile unless you accept.</span><div class="row wrap">${B(ic("x", 14) + "Reject", "evoDecide", { id: s.id, v: "Rejected" })}${B(ic("edit", 14) + "Edit", "evoDlg", { id: s.id, edit: 1 })}${B(ic("check", 14) + "Accept", "evoDlg", { id: s.id }, "btn-p btn-sm")}</div></div>`
        : `<p class="cap evo-act">Only ${nm(s.pid)} can accept, edit or reject this change.</p>`
      : `<p class="cap evo-act">${lab} by ${nm(s.by)} on ${fmt(s.decidedAt)} · ${s.status === "Approved" ? "profile updated" : "profile not changed"}</p>`
  }</article>`;
}
const evoProv = (s) => (s.refs.some((r) => r.type === "Evidence") ? "Evidence-supported" : "Activity-derived");
const evoText = (s) => (s.kind === "compass" || s.field === "Skill proficiency" ? s.value : (s.add || []).join(evoSep(s.field)));
// Accept (choose the audience) or Edit then accept.
A.evoDlg = (d) => {
  const s = byId("evolution", d.id);
  const edit = !!d.edit;
  clearF("evoe");
  UI.form.evoe = { value: evoText(s), aud: s.aud || "Only me" };
  modal(edit ? "Edit, then accept" : "Accept this profile change", () =>
    `<form data-f="evoe" class="col pf-form" novalidate>${errSum("evoe")}<input type="hidden" name="id" value="${s.id}">${dl([
      ["Profile field", `<b>${h(s.field)}</b>`],
      ["Source", byId("harvests", s.hv) ? L("Learning Harvest: " + h(byId("harvests", s.hv).scopeName || s.hv), "harvest", { id: s.hv }) : h(s.hv)],
      ["Provenance", provPill(evoProv(s))],
      !edit && ["Suggested", evoSuggestedHtml(s)],
    ])}${edit ? fi("evoe", "value", s.kind === "compass" || s.field === "Skill proficiency" ? "Wording" : "Items to add (separate with " + (evoSep(s.field) === "; " ? "semicolons" : "commas") + ")", { type: "textarea", rows: 2, req: true, max: 400, help: "The original suggestion is kept in the history." }) : `<input type="hidden" name="value" value="${h(evoText(s))}">`}${fi("evoe", "aud", "Who will see it", { type: "select", opts: VIS })}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">${edit ? "Accept edited version" : "Accept"}</button></div></form>`,
  );
};
F.evoe = (d) => {
  if (!validate("evoe", d, { value: [["req", "Enter the wording."]] })) return render();
  const s = byId("evolution", d.id);
  const v = d.value.trim();
  if (v !== evoText(s)) {
    s.origSug = s.origSug || evoText(s);
    if (s.kind === "compass" || s.field === "Skill proficiency") s.value = v;
    else s.add = evoItems(v, s.field !== "Experience");
  }
  s.aud = VIS.includes(d.aud) ? d.aud : "Only me";
  UI.modal = null;
  clearF("evoe");
  A.evoDecide({ id: s.id, v: "Approved" });
};
A.evoDecide = (d) => {
  const s = byId("evolution", d.id);
  if (s.status !== "Pending") return deny("this suggestion has already been decided");
  s.before = evoCurrent(s);
  s.status = d.v;
  s.by = myId();
  s.decidedAt = now();
  if (d.v === "Approved") evoApply(s);
  audit("Profile evolution " + (d.v === "Approved" ? "accepted" : "rejected"), s.id, s.field + " · " + evoProv(s) + " · source: Learning Harvest " + s.hv + (s.origSug ? " · edited by the person" : "") + (d.v === "Approved" ? " — profile updated" : " — profile not changed"));
  toast(d.v === "Approved" ? s.field + " updated in your profile. A new version was saved." : "Rejected. Your profile was not changed.");
  ok();
};
// The only place a Harvest finding reaches the profile, and only from an acceptance by the person.
function evoApply(s) {
  const prov = evoProv(s);
  const hv0 = byId("harvests", s.hv);
  const src = "Learning Harvest " + s.hv + (s.origSug ? " (edited by the person)" : "");
  const x = { src: { r: "harvest", p: { id: s.hv }, label: "Learning Harvest: " + ((hv0 && hv0.scopeName) || s.hv) } };
  const vis = s.aud || "Only me";
  if (s.kind === "compass") {
    const a = (S.compass[s.pid] = S.compass[s.pid] || {});
    const was = a[s.key];
    a[s.key] = s.value;
    return bumpVer(`Profile evolution: ${s.field} “${was || "—"}” → “${s.value}”`, src, prov, x);
  }
  if (s.field === "Skill proficiency") {
    const c = evoProfClaim(s);
    if (c) {
      (c.prev = c.prev || []).push({ value: c.value, prov: c.prov, at: now(), why: "Profile evolution" });
      c.value = s.value;
      c.ver = (c.ver || 1) + 1;
      c.prov = prov;
    } else
      S.claims.push({ id: uid("cl"), pid: s.pid, field: s.field, value: s.value, prov, vis, state: "Current", ver: 1, src: "evolution", from: s.id });
    return bumpVer(`Profile evolution: ${s.value} · audience: ${vis}`, src, prov, x);
  }
  const items = s.add.filter((v) => !evoHas(curItems(s.pid, s.field), v));
  if (!items.length) return;
  S.claims.push({
    id: uid("cl"),
    pid: s.pid,
    field: s.field,
    value: items.join(evoSep(s.field)),
    prov,
    vis,
    state: "Current",
    ver: 1,
    src: "evolution",
    from: s.id,
  });
  bumpVer(`Profile evolution: added ${s.field} — ${items.join(evoSep(s.field))} · audience: ${vis}`, src, prov, x);
}
// viewing someone else's profile (F/M: V if shared/required)
function viewProfile(pid) {
  const viewer = role();
  const cl = S.claims.filter(
    (c) =>
      c.pid === pid &&
      c.state === "Current" &&
      c.vis !== "Only me" &&
      (c.vis !== "Matching/pathway roles only" || ["F", "M"].includes(viewer)),
  );
  const cp = S.compass[pid] || {};
  modal(
    nm(pid),
    `${dl([
      ["Display name", h(P(pid).display)],
      [
        "Role here",
        ROLE[
          (S.assign.find((a) => a.pid === pid && a.ctx === ctxId()) || {}).role
        ] || "—",
      ],
      [
        "Email",
        `<span class="cap">Private — released only for an approved introduction</span>`,
      ],
    ])}${table(
      ["Field", "Value", "Provenance"],
      cl.map((c) => [h(c.field), h(c.value), pill(c.prov, "p-grey")]),
      "No shared claims.",
    )}${["F", "M"].includes(viewer) && cp.PC2 ? banner("info", "Goal (shared with assigned support roles)", h(cp.PC2)) : ""}${banner("info", "Hidden", "Raw Purpose Compass, hurdle and private fields are not shown. Hurdles are shared only by explicit participant choice.")}`,
  );
  audit("Profile viewed", pid, "Authorised fields only");
  save();
}
A.viewProfile = (d) => {
  if (!(can("profile") || ["F", "M", "C"].includes(role())))
    return deny("profile view");
  viewProfile(d.pid);
};
// ---------- PRIVACY (F02) ----------
route("privacy", "agreements", () => {
  const pid = myId();
  const c = S.consents[pid];
  const t = tabs(
    "priv",
    [
      ["consent", "Optional permissions"],
      ["agr", "Agreements & receipts"],
      ["data", "Data held about me"],
      ["req", "Requests"],
    ],
    UI.p.tab,
  );
  let body = "";
  if (t.cur === "consent") body = consentTab(pid);
  if (t.cur === "agr") {
    const acc = S.accepts.filter((x) => x.pid === pid);
    const re = S.assign
      .filter((a) => a.pid === pid)
      .map((a) => {
        const g = S.agreements.find(
          (g) =>
            g.ctx === a.ctx &&
            g.status === "Active" &&
            g.roles.includes(roleBase(a.role)),
        );
        return g && !acc.some((x) => x.ag === g.id) ? [a, g] : null;
      })
      .filter(Boolean);
    body =
      (re.length
        ? banner(
            "warn",
            "Re-acceptance required",
            re
              .map(
                ([a, g]) =>
                  h(g.type) +
                  " v" +
                  g.ver +
                  " in " +
                  h(S.contexts.find((c) => c.id === a.ctx).name),
              )
              .join("; ") + ". Switch to that context to review it.",
          )
        : "") +
      card(
        "Accepted agreements",
        "A person may hold several active agreements, each with its own history.",
        dataView("privacy:accepts", {
          label: "agreements",
          items: acc,
          search: (x) => {
            const g = byId("agreements", x.ag);
            return g.type + " v" + g.ver + " " + S.contexts.find((c) => c.id === g.ctx).name + " " + x.receipt;
          },
          quick: {
            label: "Status",
            options: pfOpts(acc, (x) => (byId("agreements", x.ag).status === "Active" ? "Accepted" : byId("agreements", x.ag).status)),
            test: (x, v) => (byId("agreements", x.ag).status === "Active" ? "Accepted" : byId("agreements", x.ag).status) === v,
          },
          filters: [
            {
              key: "ctx",
              label: "Context",
              options: pfOpts(acc, (x) => S.contexts.find((c) => c.id === byId("agreements", x.ag).ctx).name),
              test: (x, v) => S.contexts.find((c) => c.id === byId("agreements", x.ag).ctx).name === v,
            },
          ],
          sorts: [
            ["at", "Accepted (newest)", (a, b) => String(b.at).localeCompare(String(a.at))],
            ["type", "Agreement", (a, b) => byId("agreements", a.ag).type.localeCompare(byId("agreements", b.ag).type)],
          ],
          layout: "table",
          columns: [
            { label: "Agreement", sort: "type", cell: (x) => `<b>${h(byId("agreements", x.ag).type)}</b>` },
            { label: "Version", cell: (x) => "v" + byId("agreements", x.ag).ver },
            { label: "Context", hideSm: true, cell: (x) => h(S.contexts.find((c) => c.id === byId("agreements", x.ag).ctx).name) },
            { label: "Status", cell: (x) => pill(byId("agreements", x.ag).status === "Active" ? "Accepted" : byId("agreements", x.ag).status) },
            { label: "Accepted", sort: "at", cell: (x) => fmt(x.at) },
            { label: "Receipt", cell: (x) => B(h(x.receipt), "fakeDl", { n: x.receipt }) },
          ],
          empty: ["file", "No accepted agreements", "Agreements you accept appear here with a dated receipt.", ""],
        }),
        "",
        "pf-dv",
      );
  }
  if (t.cur === "data") {
    const cl = S.claims.filter((x) => x.pid === pid);
    const held = [
      [
        "Name, email, sign-in",
        "Self-declared",
        "You + authorised administration",
        "Service operation",
      ],
      [
        "Role and context",
        "Assigned",
        "Context members (role only)",
        "Authorised operation",
      ],
      ...cl.map((x) => [
        h(x.field + ": " + x.value),
        pill(x.prov, "p-grey"),
        h(x.vis),
        "Profile",
      ]),
      [
        "Purpose Compass",
        "Self-declared",
        "Only you (contextual sharing only)",
        "Orientation",
      ],
      [
        "Evidence (" +
          S.evidence.filter((e) => e.owner === pid).length +
          ")",
        "Self-declared",
        "Per evidence item",
        "Evidence of claims",
      ],
      [
        "Consent settings",
        "Self-declared",
        "You + Trust/Data Steward",
        "Governance",
      ],
    ];
    const txt = (x) => String(x).replace(/<[^>]+>/g, "");
    body =
      card(
        "Data held about me",
        "Self-declared or derived, who can see it, and for what purpose.",
        dataView("privacy:held", {
          label: "items",
          items: held,
          search: (r) => txt(r.join(" ")),
          filters: [
            { key: "src", label: "Source", options: pfOpts(held, (r) => txt(r[1])), test: (r, v) => txt(r[1]) === v },
            { key: "purpose", label: "Purpose", options: pfOpts(held, (r) => r[3]), test: (r, v) => r[3] === v },
          ],
          layout: "table",
          pageSize: 25,
          columns: [
            { label: "Item", cell: (r) => `<b>${r[0]}</b>` },
            { label: "Source", cell: (r) => r[1] },
            { label: "Audiences", cell: (r) => r[2] },
            { label: "Purpose", cell: (r) => r[3] },
          ],
        }),
        `<span class="row wrap pf-acts">${B(ic("download", 16) + "Export my authorised records (JSON)", "exportMine", {}, "btn-s btn-sm")}${B("Request a correction", "go", { r: "privacy", tab: "req" })}</span>`,
        "pf-dv",
      );
  }
  if (t.cur === "req") {
    const f = "prq";
    const mine = (S.requests || []).filter((r) => r.pid === pid);
    body =
      `<div class="pf-cols pf-req"><div class="pf-main">` +
      card(
        "Make a request",
        "Correction, export or deletion requests follow the approved policy and are always free.",
        `<form data-f="prq" class="col pf-form" novalidate>${fi(f, "kind", "Request type", { type: "select", req: true, ph: "Select", opts: ["Correction", "Permitted export", "Deletion request", "Withdraw from programme"] })}${fi(f, "detail", "Details", { type: "textarea", rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Submit request</button></div></form>`,
      ) +
      `</div><div class="pf-rail">` +
      card(
        "My requests",
        "",
        dataView("privacy:requests", {
          label: "requests",
          items: mine,
          search: (r) => r.kind + " " + r.detail,
          quick: {
            label: "Status",
            options: pfOpts(mine, (r) => r.status),
            test: (r, v) => r.status === v,
          },
          filters: [{ key: "kind", label: "Type", options: pfOpts(mine, (r) => r.kind), test: (r, v) => r.kind === v }],
          row: (r) => ({
            title: h(r.kind),
            sub: h(r.detail),
            badges: pill(r.status),
          }),
          empty: ["inbox", "No requests yet", "Requests you submit appear here with their status.", ""],
        }),
        "",
        "pf-dv",
      ) +
      `</div></div>`;
  }
  return (
    head(
      "My records & consent",
      "Your required agreement and optional permissions, the data held about you, and your requests.",
    ) +
    t.html +
    body
  );
});
// ---- BF-02: the required agreement is shown apart from the five optional purposes. Each purpose is Granted,
// Declined or Withdrawn on its own, with its date and history; saying no never blocks the manual core.
const CONS_C = { Granted: "p-teal", Declined: "p-grey", Withdrawn: "p-red", "Not asked": "p-amber" };
const consLabel = (k) => (OPT_PURPOSES.find((x) => x[0] === k) || [k, k === "matching" ? "Matching visibility" : k])[1];
// Date of the last change to one purpose (from the consent history), else the date choices were first recorded.
function consentAt(pid, k) {
  const c = S.consents[pid] || {};
  const hs = c.history || [];
  const l = consLabel(k);
  const x = [...hs].reverse().find((e) => e.k === k || String(e.t || "").startsWith(l + ":") || String(e.t || "").startsWith(k + ":"));
  return x ? x.at : c[k] ? (hs[0] || {}).at || "" : "";
}
function consentRow(pid, k, label, text) {
  const v = consent(pid, k);
  const at = consentAt(pid, k);
  const acts = [
    v !== "Granted" && B(ic("check", 14) + "Grant", "consentChange", { k, v: "Granted" }, v === "Not asked" ? "btn-p btn-sm" : "btn-s btn-sm", `aria-label="Grant ${h(label)}"`),
    v === "Not asked" && B("Decline", "consentChange", { k, v: "Declined" }, "btn-s btn-sm", `aria-label="Decline ${h(label)}"`),
    v === "Granted" && B("Withdraw", "consentChange", { k, v: "Withdrawn" }, "btn-s btn-sm", `aria-label="Withdraw ${h(label)}"`),
  ].filter(Boolean);
  return `<div class="cons-row" role="group" aria-label="${h(label)}"><div class="col" style="gap:4px;min-width:0"><b>${h(label)}</b><p class="cap" style="margin:0">${h(text)}</p><span class="cons-state">${pill(v, CONS_C[v])}<span class="cap">${at ? (v === "Not asked" ? "" : "Since ") + fmt(at) : "No choice recorded yet"}</span>${k === "ai" && v !== "Granted" ? '<span class="cap">· Ask PHOENIX and AI drafts are off for you</span>' : ""}</span></div><div class="row wrap" style="gap:8px;justify-content:flex-end">${acts.join("")}</div></div>`;
}
function consentTab(pid) {
  const base = roleBase(role());
  const g = agrFor(ctxId(), base);
  const up = agrUpcoming(ctxId(), base);
  const acc = g && S.accepts.find((x) => x.pid === pid && x.ag === g.id);
  const c = S.consents[pid] || {};
  const hist = (c.history || []).slice().reverse();
  return (
    card(
      "Required agreement",
      "Needed to take part in " + h(ctxName(ctxId())) + ". It is separate from the optional permissions below.",
      (g
        ? dl([
            ["Agreement", `<b>${h(g.type)} v${g.ver}</b>`],
            ["Status", acc ? pill("Accepted", "p-green") + ` <span class="cap">on ${fmt(acc.at)}</span>` : pill("Not accepted yet", "p-amber")],
            acc && ["Receipt", B(ic("download", 14) + h(acc.receipt), "fakeDl", { n: acc.receipt })],
            ["In effect since", fmt(g.effective)],
          ])
        : `<p class="cap">No agreement applies to your role in this context.</p>`) +
        (up
          ? banner("info", `${h(up.type)} v${up.ver} takes effect on ${fmt(up.effective)}`, `Review it now; nothing is gated before then.${up.summary ? " " + h(up.summary) : ""}`) +
            `<div class="row wrap" style="gap:8px">${B(ic("file", 14) + "Review v" + up.ver + " now", "agrUpRead", { id: up.id })}</div>`
          : ""),
    ) +
    '<div class="pf-gap"></div>' +
    card(
      "Optional permissions",
      "Five purposes, each your own choice. Saying no never blocks your pathway, Circles, Rope Teams, tasks or evidence.",
      `<div class="col" style="gap:10px">${OPT_PURPOSES.map(([k, l, tx]) => consentRow(pid, k, l, tx)).join("")}</div>`,
    ) +
    '<div class="pf-gap"></div>' +
    card(
      "Matching visibility",
      "Separate from the five purposes above.",
      consentRow(pid, "matching", "Matching visibility", "Lets a steward consider the profile fields you allow when suggesting a Match Brief. Contact details are never shared before both sides consent."),
    ) +
    '<div class="pf-gap"></div>' +
    card(
      "Consent history",
      "Every choice and change, newest first. Withdrawing stops new use from then on; this history is kept.",
      hist.length
        ? `<ol class="pf-hist">${hist.map((e) => `<li><span class="pf-ver">${ic("clock", 12)}</span><div class="lt"><b>${h(e.t)}</b><p class="cap">${fmt(e.at)}${e.by && e.by !== pid ? " · " + nm(e.by) : ""}</p></div></li>`).join("")}</ol>`
        : `<p class="cap">No choices recorded yet.</p>`,
    )
  );
}
A.agrUpRead = (d) => {
  const g = byId("agreements", d.id);
  modal(
    h(g.type) + " v" + g.ver + " · takes effect " + fmt(g.effective),
    `<div class="col" style="gap:12px">${banner("info", "", "Nothing is gated before " + fmt(g.effective) + ". You will be asked to accept it from then.")}${g.summary ? `<p><b>What changes:</b> ${h(g.summary)}</p>` : ""}${typeof polBody === "function" ? polBody(g) : ""}<div class="actions">${B(ic("download", 14) + "Download", "polDownload", { id: g.id })}${B("Close", "closeM", {}, "btn-p btn-sm")}</div></div>`,
    true,
  );
  audit("Upcoming agreement reviewed", g.id, g.type + " v" + g.ver);
};
A.consentChange = (d) => {
  const pid = myId();
  const c = (S.consents[pid] = S.consents[pid] || { history: [] });
  c.history = c.history || [];
  const from = consent(pid, d.k);
  // target state; without one, toggle as before
  const to = d.v || (from === "Granted" ? "Withdrawn" : "Granted");
  const okMove = (to === "Granted" && from !== "Granted") || (to === "Declined" && from === "Not asked") || (to === "Withdrawn" && from === "Granted");
  if (![...OPT_PURPOSES.map((x) => x[0]), "matching"].includes(d.k) || !okMove) return deny(`${consLabel(d.k)} cannot change from ${from} to ${to}`);
  c[d.k] = to;
  c.history.push({ at: now(), k: d.k, from, to, by: pid, t: `${consLabel(d.k)}: ${from} → ${to}` });
  if (d.k === "ai" && to !== "Granted") {
    // queued or drafting AI use stops; finished outputs stay where they are
    const q = S.ai.filter(
      (j) => j.by === myId() && ["Queued", "Draft"].includes(j.status),
    );
    q.forEach((j) => {
      j.status = "Cancelled";
      j.why = "AI processing consent " + to.toLowerCase();
    });
    UI.askPending = null;
    if (q.length) {
      c.history.push({ at: now(), k: "ai", by: pid, t: `${q.length} queued AI job${q.length > 1 ? "s" : ""} stopped (AI processing ${to.toLowerCase()})` });
      toast(q.length + " queued AI job(s) stopped. Everything else keeps working.", "warn");
    }
  }
  if (d.k === "public" && to === "Withdrawn") {
    const mineEv = new Set(S.evidence.filter((e) => e.owner === pid).map((e) => e.id));
    const rr = (S.releases || []).filter((x) => mineEv.has(x.ev) && ["Awaiting owner decision", "Owner authorised — disclosure review"].includes(x.status));
    rr.forEach((x) => {
      x.status = "Stopped — consent withdrawn";
      const e = byId("evidence", x.ev);
      (e.history = e.history || []).push({ at: today(), t: "Release request stopped — public/funder release consent withdrawn (" + x.audience + ")" });
    });
    if (rr.length) {
      c.history.push({ at: now(), k: "public", by: pid, t: `${rr.length} pending release request${rr.length > 1 ? "s" : ""} stopped (public/funder release withdrawn)` });
      toast(rr.length + " pending release request(s) stopped.", "warn");
    }
  }
  if (d.k === "matching" && to !== "Granted")
    S.matches
      .filter(
        (m) =>
          (m.a === myId() || m.b === myId()) &&
          !["Introduced", "Closed", "Rejected"].includes(m.status),
      )
      .forEach((m) => {
        if (!m.blockers.includes("No matching consent from " + me().name))
          m.blockers.push("No matching consent from " + me().name);
      });
  if (d.k === "matching" && to === "Granted")
    S.matches.forEach(
      (m) =>
        (m.blockers = m.blockers.filter(
          (b) => b !== "No matching consent from " + me().name,
        )),
    );
  audit("Consent " + to.toLowerCase(), d.k, consLabel(d.k) + ": " + from + " → " + to);
  notify(myId(), `${consLabel(d.k)} is now ${to}.`, "privacy", { tab: "consent" });
  if (!UI.toast) toast(`${consLabel(d.k)}: ${to}.${to !== "Granted" ? " Your pathway, Circles, tasks and evidence are not affected." : ""}`);
  ok();
};
A.exportMine = () => {
  const pid = myId();
  const data = {
    person: { name: me().name, email: me().email },
    claims: S.claims.filter((c) => c.pid === pid),
    compass: S.compass[pid],
    profileEvolution: S.evolution.filter((s) => s.pid === pid),
    consents: S.consents[pid],
    evidence: S.evidence
      .filter((e) => e.owner === pid)
      .map((e) => ({
        title: e.title,
        type: e.type,
        level: e.level,
        review: e.review,
      })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "phoenix-my-records.json";
  try {
    a.click();
  } catch (e) {}
  audit("Personal export", pid, "Authorised records");
  toast("Export prepared (download started where allowed).");
  ok();
};
F.prq = (d) => {
  if (!validate("prq", d, { kind: ["req"], detail: ["req"] })) return render();
  S.requests = S.requests || [];
  S.requests.push({
    id: uid("rq"),
    pid: myId(),
    kind: d.kind,
    detail: d.detail,
    status: "Open",
  });
  S.assign
    .filter((a) => roleBase(a.role) === "A")
    .forEach((a) =>
      notify(a.pid, `Privacy request (${d.kind}) from ${me().name}`, "admin", {
        tab: "support",
      }),
    );
  audit("Privacy request", d.kind, d.detail);
  clearF("prq");
  toast("Request submitted.");
  ok();
};
// ---------- PATHWAY (F04) ----------
route("pathway", "pathways", () => {
  const r = role(),
    pid = myId();
  if (r === "P") {
    const list = S.pathways.filter((p) => p.pid === pid && inCtx(p));
    const cur = list.find((p) => p.state === "Current");
    const prop = list.filter((p) => p.state === "Proposed to participant");
    return (
      head(
        "My pathway",
        "A pathway never becomes current without your acceptance.",
        B(ic("plus", 16) + "Create a pathway", "pwNew", {}, "btn-p"),
      ) +
      pwMineCard(list) +
      prop
        .map((p) =>
          card(
            "Proposed: " + h(p.name),
            "Mode " + h(p.mode) + " · " + pwWho(p),
            banner("info", "Your acceptance is needed", "This pathway becomes current only if you accept it. You can ask for a change or decline it instead.") +
              pwLegend() +
              pwStepsList(p, false) +
              `<div class="row wrap pf-after">${B(ic("message", 14) + "Conversation & activity", "pwActivity", { id: p.id })}${B("Decline", "pwDecline", { id: p.id })}${B("Request a change", "pwChange", { id: p.id })}${B("Accept pathway", "pwAccept", { id: p.id }, "btn-p btn-sm")}</div>`,
          ),
        )
        .join('<div class="pf-gap"></div>') +
      (prop.length ? '<div class="pf-gap"></div>' : "") +
      (cur
        ? (() => {
            const pg = pwProg(cur);
            const nx = pwNext(cur);
            const ns = nx >= 0 && cur.steps[nx];
            return card(
              h(cur.name),
              "Current · Mode " + h(cur.mode) + " · " + pg.n + " of " + pg.of + " steps complete · " + pwWho(cur),
              `<div class="hm-prog"><div class="progress"><span class="bar" style="width:${(pg.n / pg.of) * 100}%"></span></div><span class="cap">${Math.round((pg.n / pg.of) * 100)}%</span></div>` +
                (ns
                  ? banner("info", `Next step (chosen by rule): Step ${nx + 1} · ${h(ns.t)}`, (ns.type === "Conditional" && !ns.applies ? "Check whether it applies to you: " + h(ns.cond || "") + ". " : "") + "It is the lowest-numbered required step whose prerequisites are complete. No one recommended it and nothing is committed for you; you can also work on any other step that is not blocked.")
                  : banner("ok", "No required step is open", "Every required step is complete or satisfied.")) +
                pwLegend() +
                pwStepsList(cur, true),
              B(ic("message", 14) + "Conversation & activity", "pwActivity", { id: cur.id }),
            );
          })()
        : empty(
            "route",
            "No current pathway",
            prop.length ? "Accept a proposed pathway above, ask for a change, or decline it." : "A facilitator or mentor can propose one, or create your own (it then needs Steward approval). Nothing is assigned to you without your acceptance.",
          )) +
      `<div class="pf-gap"></div>` +
      card(
        "Pathway history",
        "",
        dataView("pathway:mine", {
          label: "pathways",
          items: list,
          search: (p) => p.name + " " + p.mode + " " + nm(p.by) + " " + (p.changeReq || ""),
          quick: {
            label: "State",
            options: pfOpts(list, (p) => (p.state === "Draft" && p.changeReq ? "Change requested" : p.state)),
            test: (p, v) => (p.state === "Draft" && p.changeReq ? "Change requested" : p.state) === v,
          },
          filters: [{ key: "mode", label: "Mode", options: pfOpts(list, (p) => p.mode), test: (p, v) => p.mode === v }],
          sorts: [["name", "Name", (a, b) => a.name.localeCompare(b.name)]],
          row: (p) => ({
            lead: `<span class="tile ${p.state === "Current" ? "t-teal" : "t-soft"}" aria-hidden="true">${ic("route", 16)}</span>`,
            title: h(p.name),
            sub: h(p.mode) + " · " + pwWho(p),
            meta: [p.changeReq && p.state === "Draft" ? `You asked for: ${h(p.changeReq)}` : "", p.state === "Declined" && p.declineWhy ? `You declined it: ${h(p.declineWhy)}` : ""],
            badges: pill(p.state === "Draft" && p.changeReq ? "Change requested" : p.state),
            primary: pwEditBtn(p) + B("Conversation & activity", "pwActivity", { id: p.id }),
          }),
          empty: ["route", "No pathways yet", "Pathways proposed to you, or drafted by you, appear here.", ""],
        }),
        "",
        "pf-dv",
      )
    );
  }
  const parts = [
    ...new Set(
      S.assign
        .filter(
          (a) => a.ctx === ctxId() && roleBase(a.role) === "P" && a.status === "Active",
        )
        .map((a) => a.pid),
    ),
  ].filter((p) => r !== "M" || myRopes().some((rt) => memberOf(rt, p)) || S.pathways.some((x) => x.pid === p && x.by === pid));
  return (
    head(
      "Pathways",
      r === "M"
        ? "For participants in your Rope Teams"
        : "Participants in this context",
      r === "A"
        ? B("Template library", "go", { r: "admin", tab: "library" }, "btn-s")
        : "",
    ) +
    (r === "A" ? pwAdminCards() + '<div class="section-gap"></div>' : "") +
    pwToReviewCard() +
    (() => {
      const pwOf = (p) => S.pathways.filter((x) => x.pid === p && inCtx(x));
      const curOf = (p) => pwOf(p).find((x) => x.state === "Current");
      const lastOf = (c) =>
        c &&
        c.steps
          .filter((s) => s.done && s.doneAt)
          .sort((a, b) => b.doneAt.localeCompare(a.doneAt))[0];
      const frac = (c) => (c ? pwProg(c).n / c.steps.length : -1);
      const label = (x) => (x.state === "Draft" && x.changeReq ? "Change requested" : x.state);
      const QUICK = [
        ["current", "Current", (ls) => ls.some((x) => x.state === "Current")],
        ["proposed", "Proposed", (ls) => ls.some((x) => x.state === "Proposed to participant")],
        ["review", "In review", (ls) => ls.some((x) => ["In review", "Awaiting reviewer"].includes(x.state))],
        ["changes", "Clarification", (ls) => ls.some((x) => x.state === "Clarification requested" || (x.state === "Draft" && x.changeReq))],
        ["none", "No pathway", (ls) => !ls.length],
      ];
      const PROG = [
        ["0", "Not started", (f) => f === 0],
        ["mid", "In progress", (f) => f > 0 && f < 1],
        ["done", "Complete", (f) => f === 1],
        ["none", "No current pathway", (f) => f < 0],
      ];
      const actMenu = (x, cur) =>
        pwCanView(x) ? B(ic("message", 16) + menuT("Conversation & activity", h(x.name) + " · " + h(cur ? "Current" : label(x))), "pwActivity", { id: x.id }, "menu-i", 'role="menuitem"') : "";
      return card(
        "Participants",
        parts.length + " participant" + (parts.length === 1 ? "" : "s"),
        dataView("pathway:participants", {
          label: "participants",
          items: parts,
          rowId: (p) => p,
          search: (p) => P(p).name + " " + pwOf(p).map((x) => x.name + " " + label(x)).join(" "),
          quick: {
            label: "Pathway state",
            options: QUICK.map(([v, l]) => [v, l]),
            test: (p, v) => QUICK.find((q) => q[0] === v)[2](pwOf(p)),
          },
          filters: [
            { key: "prog", label: "Progress on current pathway", options: PROG.map(([v, l]) => [v, l]), test: (p, v) => PROG.find((q) => q[0] === v)[2](frac(curOf(p))) },
            { key: "mode", label: "Current pathway mode", options: pfOpts(parts.map(curOf).filter(Boolean), (c) => c.mode), test: (p, v) => (curOf(p) || {}).mode === v },
          ],
          sorts: [
            ["name", "Name", (a, b) => P(a).name.localeCompare(P(b).name)],
            ["prog", "Progress (most first)", (a, b) => frac(curOf(b)) - frac(curOf(a))],
            ["last", "Last step completed", (a, b) => String((lastOf(curOf(b)) || {}).doneAt || "").localeCompare(String((lastOf(curOf(a)) || {}).doneAt || ""))],
          ],
          row: (p) => {
            const ls = pwOf(p);
            const c = curOf(p);
            const last = lastOf(c);
            const others = ls.filter((x) => x !== c);
            const revise = others.filter((x) => x.state === "Draft" && x.by === myId());
            return {
              lead: `<span class="av" aria-hidden="true">${ini(p)}</span>`,
              title: nm(p),
              sub: c ? `${h(c.name)} · ${pwProg(c).n}/${c.steps.length}${pwNext(c) >= 0 ? " · next by rule: step " + (pwNext(c) + 1) : ""}` : "No current pathway",
              meta: [
                c && c.steps.some((s) => s.rec && s.rec.status === "Awaiting participant") ? "Prior-evidence recommendation waiting for the participant" : "",
                c && c.steps.some((s, i) => pwStepState(c, i).st === "Blocked") ? "Blocked: " + c.steps.map((s, i) => [i, pwStepState(c, i)]).filter(([, x]) => x.st === "Blocked").map(([i, x]) => "step " + (i + 1) + " — " + h(x.why)).join("; ") : "",
                last ? `Last step completed ${fmt(last.doneAt)} by ${nm(last.doneBy)}${(last.files || []).length ? " · " + last.files.length + " file" + (last.files.length > 1 ? "s" : "") : ""}` : "",
                ...others.map((x) => `${h(x.name)} ${pill(label(x))}`),
              ],
              badges: c ? `<span class="pw-mini" title="${Math.round(frac(c) * 100)}% complete"><span class="progress"><span class="bar" style="width:${frac(c) * 100}%"></span></span></span>` : "",
              primary:
                revise.map((x) => B("Revise and re-propose", "pwRevise", { id: x.id }, "btn-p btn-sm")).join("") +
                (["F", "M"].includes(r) ? B("Propose pathway", "proposePathway", { pid: p }) : c ? pwActBtn(c) : ""),
              menu: [["F", "M"].includes(r) && c ? actMenu(c, true) : "", ["F", "M"].includes(r) && c && c.pid !== myId() && c.steps.some((s) => s.prior && !pwClosed(s)) ? B(ic("award", 16) + menuT("Recommend prior evidence", "Steps where approved evidence may count"), "pwActivity", { id: c.id }, "menu-i", 'role="menuitem"') : "", ...others.map((x) => actMenu(x)), ...others.filter(pwEditable).map((x) => B(ic("edit", 16) + menuT("Edit pathway", h(x.name)), "pwEdit", { id: x.id }, "menu-i", 'role="menuitem"'))].filter(Boolean).join(""),
            };
          },
          empty: ["users", "No participants yet", "Participants in this context appear here.", ""],
        }),
        "",
        "pf-dv",
      );
    })()
  );
});
A.proposePathway = (d) => {
  clearF("pp");
  UI.form.pp = { pid: d.pid, mode: "1" };
  modal("Propose a pathway for " + nm(d.pid), () => {
    const m = fv("pp", "mode", "1");
    const tpl = byId("templates", fv("pp", "tpl"));
    return `<form data-f="pp" class="col pf-form" novalidate>${errSum("pp")}<input type="hidden" name="pid" value="${d.pid}">${fi(
      "pp",
      "mode",
      "Mode",
      {
        type: "select",
        opts: [
          ["1", "1 · Pre-approved template (no review)"],
          ["2", "2 · Adapted from a template"],
          ["3", "3 · Custom pathway (needs reviewer approval)"],
        ],
        help: "Select then press Update",
      },
    )}${m !== "3" ? fi("pp", "tpl", "Template", { type: "select", req: true, ph: "Select an approved template", opts: S.templates.filter((t) => t.status === "Approved").map((t) => [t.id, t.name]) }) : fi("pp", "name", "Pathway name", { req: true })}${m === "1" ? (tpl ? `<div class="col" style="gap:6px"><p class="lbl" style="margin:0">Steps and rules from the template</p>${pwTplPreview(tpl)}</div>` : "") : pwStepFields("pp")}${banner("info", "", nm(d.pid) + " must accept the pathway before it becomes current. Your name is shown as the proposer.")}<div class="actions">${B("Update", "ppRefresh")}<button class="btn btn-p" type="submit">Propose</button></div></form>`;
  });
};
A.ppRefresh = () => {
  const f = document.querySelector('[data-f="pp"]');
  const d = {};
  new FormData(f).forEach((v, k) => (d[k] = v));
  // choosing another template fills the step rows from it
  const prev = UI.form.pp || {};
  const tpl = byId("templates", d.tpl);
  if (tpl && (d.tpl !== prev._tpl || d.mode !== prev.mode)) Object.assign(d, pwStepsToForm(pwStepsFromTpl(tpl)));
  d._tpl = d.tpl;
  UI.form.pp = d;
  render();
};
// Every pathway keeps an activity history: who proposed, adapted, approved, accepted, asked for changes, and completed what.
const pwLog = (p, t) =>
  (p.activity = p.activity || []).push({ at: now(), by: myId(), t });
const pwFiles = (files) =>
  (files || []).length
    ? `<div class="row wrap pw-files">${files.map((f) => attCard(f)).join("")}</div>`
    : "";
const pwStepDone = (s) =>
  `Completed ${s.doneAt ? fmt(s.doneAt) : ""}${s.doneBy ? " by " + nm(s.doneBy) : ""}${s.note ? `<span class="pw-note-q">“${h(s.note)}”</span>` : ""}${pwFiles(s.files)}`;
const pwActBtn = (p) => (pwCanView(p) ? B("Conversation & activity", "pwActivity", { id: p.id }) : "");
// ---- Step rules (FR-F04, Build-Freeze doc 1 §8). Each step: { t, type: Mandatory | Optional | Conditional,
// cond (when a Conditional step applies), pre: [indexes of steps that must be complete first], rule (completion /
// evidence rule), prior (prior evidence may satisfy it), st: Skipped | Satisfied by prior evidence | Not applicable,
// applies (participant confirmed a Conditional step applies), priorEv, recBy, recAccepted, rec (pending
// recommendation), done … }. A step's state is derived, never stored: see pwStepState.
const PW_TYPES = ["Mandatory", "Optional", "Conditional"];
const PW_RULE_DEF = "Mark complete with a short note";
const PW_TY_C = { Mandatory: "p-navy", Optional: "p-grey", Conditional: "p-purple" };
const PW_ST_C = { Done: "p-green", "Satisfied by prior evidence": "p-green", Skipped: "p-grey", "Not applicable": "p-grey", Current: "p-teal", Blocked: "p-red", "Not started": "p-grey" };
// A step is closed when it no longer holds anything up.
const pwClosed = (s) => !!s && (!!s.done || ["Satisfied by prior evidence", "Skipped", "Not applicable"].includes(s.st));
const pwWaiting = (p, i) => (p.steps[i].pre || []).filter((j) => p.steps[j] && !pwClosed(p.steps[j]));
// Deterministic next step: the lowest-numbered Mandatory (or not ruled-out Conditional) step that is not complete
// and whose prerequisites are all complete. Optional steps are never chosen.
function pwNext(p) {
  if (!p || !p.steps) return -1;
  return p.steps.findIndex((s, i) => s.type !== "Optional" && !pwClosed(s) && !pwWaiting(p, i).length);
}
// → { st: Done | Satisfied by prior evidence | Skipped | Not applicable | Blocked | Current | Not started, why }
function pwStepState(p, i) {
  const s = p.steps[i];
  if (!s) return { st: "Not started", why: "" };
  if (s.done) return { st: "Done", why: "" };
  if (s.st === "Satisfied by prior evidence") return { st: s.st, why: "" };
  if (s.st === "Skipped") return { st: "Skipped", why: "Optional step skipped by the participant" };
  if (s.st === "Not applicable") return { st: "Not applicable", why: "The participant confirmed the condition does not apply" };
  const w = pwWaiting(p, i);
  if (w.length) return { st: "Blocked", why: "Waiting for " + w.map((j) => `step ${j + 1} (${p.steps[j].t})`).join(" and ") };
  if (p.state === "Current" && i === pwNext(p)) return { st: "Current", why: "" };
  return { st: "Not started", why: "" };
}
const pwProg = (p) => ({ n: p.steps.filter(pwClosed).length, of: p.steps.length });
const pwPreTxt = (p, s) => ((s.pre || []).length ? "Needs " + s.pre.map((j) => "step " + (j + 1)).join(" and ") + " first" : "No prerequisite");
const pwProposedAt = (p) => p.proposedAt || (p.activity && p.activity[0] && p.activity[0].at) || "";
// Who proposed the pathway and when the participant accepted it.
const pwWho = (p) =>
  `Proposed by ${p.by === p.pid ? "the participant" : nm(p.by)}${pwProposedAt(p) ? " on " + fmt(pwProposedAt(p)) : ""}` +
  (p.acceptedAt ? ` · accepted by ${p.acceptedBy === myId() ? "you" : nm(p.acceptedBy || p.pid)} on ${fmt(p.acceptedAt)}` : p.state === "Proposed to participant" ? " · waiting for the participant to accept" : "");
// Template steps are plain strings; an optional parallel `rules` list carries type, prerequisites and the rule.
// Without rules, each step needs the one before it (the editor lets the proposer change that).
function pwStepsFromTpl(tpl) {
  return (tpl ? tpl.steps : []).map((t, i) => {
    const r = (tpl.rules || [])[i] || {};
    return { t, type: r.type || "Mandatory", pre: r.pre ? r.pre.slice() : i ? [i - 1] : [], rule: r.rule || PW_RULE_DEF, ...(r.cond ? { cond: r.cond } : {}), ...(r.prior ? { prior: true } : {}), done: false };
  });
}
// Step metadata shown wherever steps are listed: type, state, prerequisite, completion rule, condition, reason.
function pwStepMeta(p, i, withState) {
  const s = p.steps[i];
  const x = pwStepState(p, i);
  const ev = s.priorEv && byId("evidence", s.priorEv);
  return (
    `<span class="pw-step-meta">${pill(s.type || "Mandatory", PW_TY_C[s.type] || "p-navy")}${withState ? pill(x.st, PW_ST_C[x.st]) : ""}<span class="cap">${h(pwPreTxt(p, s))}</span></span>` +
    `<span class="pw-why"><b>Completion rule:</b> ${h(s.rule || PW_RULE_DEF)}</span>` +
    (s.type === "Conditional" ? `<span class="pw-why"><b>Applies when:</b> ${h(s.cond || "—")}${s.applies ? " · confirmed by the participant" : ""}</span>` : "") +
    (s.prior && !pwClosed(s) ? `<span class="pw-why">Prior evidence may satisfy this step if a facilitator or mentor recommends it and the participant accepts.</span>` : "") +
    (withState && x.st === "Blocked" ? `<span class="pw-why">${ic("lock", 12)} Blocked: ${h(x.why)}</span>` : "") +
    (s.st === "Satisfied by prior evidence"
      ? `<span class="pw-why">Satisfied by prior evidence ${ev ? L(h(ev.title), "evidence", { id: ev.id }) : ""} · recommended by ${nm(s.recBy)} · accepted by ${nm(p.pid)}${s.recAccepted ? " on " + fmt(s.recAccepted) : ""}</span>`
      : "") +
    (s.early && !s.done ? `<span class="pw-why">An earlier completion record (${fmt(s.early.doneAt)}) is kept. It was made before step rules applied; complete the step again once it is open.</span>` : "")
  );
}
// A pending recommendation that prior evidence satisfies a step. Only the participant's acceptance applies it.
function pwRecHtml(p, i) {
  const s = p.steps[i];
  const r = s.rec;
  if (!r || r.status !== "Awaiting participant" || pwClosed(s)) return "";
  const ev = byId("evidence", r.ev);
  const mineP = p.pid === myId();
  return `<div class="notice-q"><span aria-hidden="true">${ic("award", 16)}</span><div class="col" style="gap:4px;min-width:0"><b>Recommended by ${nm(r.by)} (${h(r.role || "Facilitator / mentor")}) on ${fmt(r.at)}: satisfied by prior evidence</b><span class="cap">Evidence: ${ev ? L(h(ev.title), "evidence", { id: ev.id }) + " · " + h(ev.level || "") + " · " + h(ev.review) : "—"}${r.why ? " · “" + h(r.why) + "”" : ""}</span><span class="cap">${mineP ? "Nothing changes unless you accept. Declining keeps the step open." : "Waiting for " + nm(p.pid) + " to accept or decline."}</span>${mineP ? `<div class="row wrap" style="gap:8px">${B("Decline", "pwPriorDecide", { id: p.id, i, v: "decline" })}${B(ic("check", 14) + "Accept", "pwPriorDecide", { id: p.id, i, v: "accept" }, "btn-p btn-sm")}</div>` : ""}</div></div>`;
}
// Participant actions for one step of their current pathway.
function pwStepActs(p, i) {
  const s = p.steps[i];
  const x = pwStepState(p, i);
  if (p.pid !== myId() || p.state !== "Current") return "";
  if (x.st === "Done" || x.st === "Satisfied by prior evidence") return "";
  if (x.st === "Skipped" || x.st === "Not applicable") return B("Undo", "pwStepSet", { id: p.id, i, v: "undo" }, "btn-g btn-sm");
  if (x.st === "Blocked") return `<button type="button" class="btn btn-s btn-sm" disabled title="${h("Blocked: " + x.why)}">Mark complete</button>`;
  return (
    (s.type === "Optional" ? B("Skip", "pwStepSet", { id: p.id, i, v: "skip" }, "btn-g btn-sm") : "") +
    (s.type === "Conditional" && !s.applies ? B("Does not apply", "pwStepSet", { id: p.id, i, v: "na" }, "btn-g btn-sm") : "") +
    B("Mark complete", "pwStep", { id: p.id, i }, x.st === "Current" ? "btn-p btn-sm" : "btn-s btn-sm")
  );
}
// Steps of a pathway as a list. withState adds the derived state, the participant's actions and recommendations.
function pwStepsList(p, withState) {
  const nx = pwNext(p);
  return `<ol class="hm-steps pw-steps">${p.steps
    .map((s, i) => {
      const x = pwStepState(p, i);
      const cls = !withState ? "" : pwClosed(s) ? "done" : i === nx && p.state === "Current" ? "cur" : "";
      return `<li class="${cls}"><span class="hm-step-m" aria-hidden="true">${withState && pwClosed(s) ? ic("check", 12) : i + 1}</span><div class="hm-step-t"><b>${`Step ${i + 1}: ${h(s.t)}`}</b>${pwStepMeta(p, i, withState)}${withState && s.done ? `<span class="cap">${pwStepDone(s)}</span>` : ""}${withState ? pwRecHtml(p, i) : ""}</div><div class="pw-step-a">${withState ? pwStepActs(p, i) : ""}</div></li>`;
    })
    .join("")}</ol>`;
}
const pwLegend = () =>
  `<p class="pw-legend cap">${pill("Mandatory", PW_TY_C.Mandatory)} needed to complete the pathway ${pill("Optional", PW_TY_C.Optional)} you may skip it ${pill("Conditional", PW_TY_C.Conditional)} only when its condition applies</p>`;
// Called by the guards: a step can be completed only by the participant, on the current pathway, when it is open
// and none of its prerequisites is still open.
function pwStepGuard(d) {
  const p = byId("pathways", d.id);
  const s = p && p.steps[d.i];
  if (!p || !s || p.pid !== myId() || p.state !== "Current") return "only the participant completes steps of their current pathway";
  if (pwClosed(s)) return "this step is already " + pwStepState(p, +d.i).st.toLowerCase();
  const x = pwStepState(p, +d.i);
  if (x.st === "Blocked") return "step " + (+d.i + 1) + " is blocked — " + x.why.charAt(0).toLowerCase() + x.why.slice(1);
  return true;
}
// Skip / undo an Optional step; say a Conditional step does not apply / undo.
A.pwStepSet = (d) => {
  const p = byId("pathways", d.id);
  const s = p.steps[d.i];
  const n = +d.i + 1;
  if (d.v === "skip") {
    if (s.type !== "Optional") return deny("only Optional steps can be skipped");
    s.st = "Skipped";
    s.stAt = now();
    pwLog(p, `Skipped optional step ${n} “${s.t}”`);
  } else if (d.v === "na") {
    if (s.type !== "Conditional") return deny("only Conditional steps can be marked as not applying");
    s.st = "Not applicable";
    s.stAt = now();
    pwLog(p, `Confirmed conditional step ${n} “${s.t}” does not apply (${s.cond || "condition not met"})`);
  } else {
    if (!["Skipped", "Not applicable"].includes(s.st)) return deny("there is nothing to undo on this step");
    pwLog(p, `Re-opened step ${n} “${s.t}” (was ${s.st})`);
    delete s.st;
    delete s.stAt;
  }
  if (p.by !== myId()) notify(p.by, `${me().name} updated step ${n} of the pathway “${p.name}”: ${s.st || "re-opened"}`, "pathway");
  audit("Pathway step " + (s.st || "re-opened").toLowerCase(), p.id, s.t);
  pwCheckDone(p);
  toast(s.st ? `Step ${n}: ${s.st}.` : `Step ${n} re-opened.`);
  ok();
};
// A facilitator or mentor recommends that approved prior evidence satisfies a step. It applies only on acceptance.
A.pwPrior = (d) => {
  const p = byId("pathways", d.id);
  const s = p.steps[d.i];
  const evs = S.evidence.filter((e) => e.owner === p.pid && e.review === "Approved");
  clearF("pwpe");
  UI.form.pwpe = { ev: evs.length === 1 ? evs[0].id : "" };
  modal(
    "Recommend: satisfied by prior evidence",
    () =>
      `<form data-f="pwpe" class="col pf-form" novalidate>${errSum("pwpe")}<input type="hidden" name="id" value="${p.id}"><input type="hidden" name="i" value="${d.i}">${dl([
        ["Participant", nm(p.pid)],
        ["Step", `Step ${+d.i + 1}: ${h(s.t)}`],
        ["Completion rule", h(s.rule || PW_RULE_DEF)],
      ])}${
        evs.length
          ? fi("pwpe", "ev", "Approved evidence that meets the rule", { type: "select", req: true, ph: "Choose evidence", opts: evs.map((e) => [e.id, e.title + " · " + (e.level || "") + " · approved"]) })
          : banner("warn", "No approved evidence", nm(p.pid) + " has no approved evidence yet, so prior evidence cannot satisfy this step.")
      }${fi("pwpe", "why", "Why it satisfies the step", { type: "textarea", rows: 2, req: true, max: 600 })}${banner("info", "", nm(p.pid) + " decides. The step stays open unless they accept; their decision and your recommendation are kept in the pathway activity.")}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit" ${evs.length ? "" : "disabled"}>Send recommendation</button></div></form>`,
  );
};
F.pwpe = (d) => {
  if (!validate("pwpe", d, { ev: [["req", "Choose the evidence."]], why: [["req", "Say why it satisfies the step."], ["min", 5]] })) return render();
  const p = byId("pathways", d.id);
  const s = p.steps[d.i];
  const ev = byId("evidence", d.ev);
  if (!ev || ev.owner !== p.pid || ev.review !== "Approved") return deny("only the participant’s approved evidence can satisfy a step");
  s.rec = { ev: ev.id, by: myId(), role: ROLE[role()], at: now(), why: d.why.trim(), status: "Awaiting participant" };
  pwLog(p, `${me().name} recommended that approved evidence “${ev.title}” satisfies step ${+d.i + 1} “${s.t}” — waiting for the participant to accept`);
  notify(p.pid, `${me().name} recommends that your evidence “${ev.title}” satisfies step ${+d.i + 1} of “${p.name}”. Accept or decline it.`, "pathway");
  audit("Pathway prior evidence recommended", p.id, `step ${+d.i + 1} · ${ev.id}`);
  UI.modal = null;
  clearF("pwpe");
  toast("Recommendation sent. It applies only if " + P(p.pid).name + " accepts.");
  ok();
};
A.pwPriorDecide = (d) => {
  const p = byId("pathways", d.id);
  const s = p.steps[d.i];
  const r = s.rec;
  const ev = byId("evidence", r.ev);
  r.status = d.v === "accept" ? "Accepted" : "Declined";
  r.decidedAt = now();
  if (d.v === "accept") {
    Object.assign(s, { st: "Satisfied by prior evidence", priorEv: r.ev, recBy: r.by, recAccepted: r.decidedAt });
    pwLog(p, `Accepted ${nm(r.by)}’s recommendation: step ${+d.i + 1} “${s.t}” is satisfied by prior evidence “${ev ? ev.title : r.ev}”`);
  } else pwLog(p, `Declined ${nm(r.by)}’s recommendation for step ${+d.i + 1} “${s.t}” — the step stays open`);
  notify(r.by, `${me().name} ${r.status.toLowerCase()} your prior-evidence recommendation for “${s.t}”`, "pathway");
  audit("Pathway prior evidence " + r.status.toLowerCase(), p.id, `step ${+d.i + 1} · ${r.ev}`);
  pwCheckDone(p);
  toast(d.v === "accept" ? `Step ${+d.i + 1} is satisfied by prior evidence.` : "Declined. The step stays open.");
  ok();
};
// The pathway completes when every Mandatory and applicable Conditional step is closed; open Optional steps are
// recorded as not taken.
function pwCheckDone(p) {
  if (p.state !== "Current" || pwNext(p) >= 0 || p.steps.some((s) => s.type !== "Optional" && !pwClosed(s))) return false;
  p.state = "Completed";
  const open = p.steps.filter((s) => !pwClosed(s));
  pwLog(p, "All required steps complete — pathway completed" + (open.length ? ` (optional not taken: ${open.map((s) => "“" + s.t + "”").join(", ")})` : ""));
  S.candidates.push({ id: uid("cd"), pid: p.pid, field: "Completed learning activity", value: p.name, source: "Pathway completion: " + p.name, src: { r: "pathway", p: {}, label: p.name }, prov: "Activity-derived", aud: "Only me", status: "Pending", at: now() });
  return true;
}
// ---- step editor: up to five rows, each with title, type, prerequisites, completion rule and condition.
const PW_ROWS = 5;
function pwStepsToForm(steps) {
  const o = {};
  for (let i = 0; i < PW_ROWS; i++) {
    const s = steps[i];
    o["s" + i + "t"] = s ? s.t : "";
    o["s" + i + "ty"] = (s && s.type) || "Mandatory";
    o["s" + i + "r"] = (s && s.rule) || "";
    o["s" + i + "c"] = (s && s.cond) || "";
    o["s" + i + "pe"] = s && s.prior ? "yes" : "";
    for (let j = 0; j < i; j++) o["s" + i + "p" + j] = s && (s.pre || []).includes(j) ? "yes" : "";
  }
  return o;
}
function pwStepFields(f) {
  let out = `<div class="col" style="gap:10px"><p class="lbl" style="margin:0">Steps (3–5) <span class="req">*</span></p><p class="help" style="margin:0">Give each step a type, the steps it depends on and how it is completed. The participant’s next step is the lowest-numbered required step whose prerequisites are complete.</p>`;
  for (let i = 0; i < PW_ROWS; i++) {
    const pre = [];
    for (let j = 0; j < i; j++) pre.push(fi(f, "s" + i + "p" + j, "Needs step " + (j + 1), { type: "checkbox" }));
    out += `<fieldset class="card col" style="gap:8px;padding:12px;margin:0"><legend class="lbl" style="padding:0 4px">Step ${i + 1}${i < 3 ? "" : " (optional row)"}</legend><div class="g2" style="gap:8px">${fi(f, "s" + i + "t", "What the participant does", { max: 120, req: i < 3 })}${fi(f, "s" + i + "ty", "Step type", { type: "select", opts: PW_TYPES })}</div>${fi(f, "s" + i + "r", "Completion / evidence rule", { max: 200, ph: PW_RULE_DEF })}${fi(f, "s" + i + "c", "Condition — when it applies (Conditional steps)", { max: 200, ph: "e.g. Only if your evidence includes identifiable people" })}<div class="row wrap" style="gap:6px 16px">${pre.join("")}${fi(f, "s" + i + "pe", "Prior evidence may satisfy this step", { type: "checkbox" })}</div></fieldset>`;
  }
  return out + `</div>`;
}
// Validation rules for the step rows (merged into the form's other rules).
function pwStepRules(d) {
  const n = [...Array(PW_ROWS).keys()].filter((i) => (d["s" + i + "t"] || "").trim()).length;
  const r = { s0t: [["fn", { f: () => n >= 3 && n <= 5, m: "Enter 3 to 5 steps." }]] };
  for (let i = 0; i < PW_ROWS; i++)
    if ((d["s" + i + "t"] || "").trim() && d["s" + i + "ty"] === "Conditional") r["s" + i + "c"] = [["req", "Say when this Conditional step applies."]];
  return r;
}
function pwStepsRead(d) {
  const rows = [...Array(PW_ROWS).keys()].filter((i) => (d["s" + i + "t"] || "").trim());
  return rows.map((i) => {
    const type = PW_TYPES.includes(d["s" + i + "ty"]) ? d["s" + i + "ty"] : "Mandatory";
    const pre = rows.filter((j) => j < i && d["s" + i + "p" + j] === "yes").map((j) => rows.indexOf(j));
    return { t: d["s" + i + "t"].trim(), type, pre, rule: (d["s" + i + "r"] || "").trim() || PW_RULE_DEF, ...(type === "Conditional" ? { cond: (d["s" + i + "c"] || "").trim() } : {}), ...(d["s" + i + "pe"] === "yes" ? { prior: true } : {}), done: false };
  });
}
const pwStepsSig = (steps) => JSON.stringify(steps.map((s) => [s.t, s.type, s.pre, s.rule, s.cond || "", !!s.prior]));
// Read-only preview of a template's steps (mode 1 proposals).
const pwTplPreview = (tpl) => (tpl ? pwStepsList({ steps: pwStepsFromTpl(tpl), state: "Draft", pid: "" }, false) : "");
// ---- migration: older pathways get step rules; a step completed before its prerequisites is re-opened and its
// earlier completion record kept (it was possible to complete steps in any order before).
function profileMigrate() {
  const sd = seed();
  S.pathways.forEach((p) => {
    const ref = sd.pathways.find((x) => x.id === p.id);
    p.steps.forEach((s, i) => {
      if (s.type) return;
      const r = ref && ref.steps[i];
      if (r && r.type) Object.assign(s, { t: r.t, type: r.type, pre: (r.pre || []).slice(), rule: r.rule, ...(r.cond ? { cond: r.cond } : {}), ...(r.prior ? { prior: true } : {}) });
      else Object.assign(s, { type: "Mandatory", pre: i ? [i - 1] : [], rule: PW_RULE_DEF });
    });
    if (ref && ref.steps.length > p.steps.length && p.steps.every((s, i) => ref.steps[i] && ref.steps[i].t === s.t))
      ref.steps.slice(p.steps.length).forEach((r) => p.steps.push(JSON.parse(JSON.stringify(r))));
    if (!p.acceptedAt && ref && ref.acceptedAt) Object.assign(p, { acceptedAt: ref.acceptedAt, acceptedBy: ref.acceptedBy });
    let again = true;
    while (again) {
      again = false;
      p.steps.forEach((s, i) => {
        if (s.done && pwWaiting(p, i).length) {
          s.early = { doneBy: s.doneBy, doneAt: s.doneAt, note: s.note, files: s.files };
          ["doneBy", "doneAt", "note", "files"].forEach((k) => delete s[k]);
          s.done = false;
          (p.activity = p.activity || []).push({ at: now(), by: null, t: `Step ${i + 1} “${s.t}” was completed before its prerequisites. It was re-opened under the step rules; the earlier completion record is kept.` });
          again = true;
        }
      });
    }
  });
  // profile change candidates: source link, audience; the seeded evidence example for the demo participant
  S.candidates.forEach((c) => {
    if (!c.aud) c.aud = "Only me";
    const ref = sd.candidates.find((x) => x.id === c.id);
    if (!c.src && ref && ref.src) c.src = ref.src;
  });
  sd.candidates.forEach((c) => {
    if (!byId("candidates", c.id) && byId("people", c.pid)) S.candidates.push(JSON.parse(JSON.stringify(c)));
  });
  // consent history entries carry the purpose key so the date of the last change can be shown
  Object.values(S.consents || {}).forEach((c) => (c.history = c.history || []));
}
// ---- review conversation between the pathway creator and the approver (assigned reviewer or Reviewer bundle)
const pwParty = (p) =>
  !!p &&
  (p.by === myId() ||
    p.pid === myId() ||
    p.reviewer === myId() ||
    role() === "A" ||
    (hasB("Reviewer") && !p.reviewer && ["In review", "Draft"].includes(p.state)));
// The pathway owner, the participant, the Steward and the programme's administrators all follow the conversation.
const pwParties = (p) => [...new Set([p.by, p.pid, p.reviewer, ...ctxAdmins(p.ctx)].filter(Boolean))];
// The creator is answering when the approver has asked for clarification or returned the pathway.
const pwAsked = (p) => p.state === "Clarification requested" || (p.state === "Draft" && !!p.changeReq);
CONVO.pathway = {
  get: (id) => byId("pathways", id),
  acts: (p) => p.activity || [],
  role: (p, pid) =>
    pid === p.by
      ? "Pathway owner"
      : pid === p.reviewer
        ? "Steward (approver)"
        : pid === p.pid
          ? "Participant"
          : ctxAdmins(p.ctx).includes(pid)
            ? "Programme Administrator"
            : S.assign.some((a) => a.pid === pid && a.bundles.includes("Reviewer"))
              ? "Reviewer"
              : "",
  post: (p) =>
    !pwParty(p)
      ? null
      : p.by === myId() && pwAsked(p)
        ? { kind: "reply", label: "Reply to the clarification request" }
        : p.by === myId()
          ? { kind: "comment", label: p.reviewer ? "Message to your approver" : "Message" }
          : { kind: "comment", label: "Message to the pathway owner" },
  notify: (p, kind) =>
    pwParties(p)
      .filter((x) => x !== myId())
      .forEach((x) => {
        // one unread notification per conversation, opening it in Messages
        const ex = S.notifs.find((n) => n.pid === x && !n.read && n.chat === p.id);
        if (ex) {
          ex.cnt = (ex.cnt || 1) + 1;
          ex.t = `${ex.cnt} new messages on the pathway “${p.name}”`;
          ex.at = today();
          return;
        }
        notify(x, `${me().name} ${kind === "reply" ? "replied to the clarification on" : "commented on"} the pathway “${p.name}”`, "messages", { c: p.id, k: "pathways" });
        S.notifs[0].chat = p.id;
      }),
};
const pwCanView = (p) =>
  !!p &&
  (p.pid === myId() ||
    p.by === myId() ||
    ["F", "A"].includes(role()) ||
    hasB("Reviewer") ||
    (role() === "M" && myRopes().some((rt) => memberOf(rt, p.pid))));
F.pp = (d) => {
  const rules = {};
  if (d.mode !== "3") rules.tpl = ["req"];
  else rules.name = ["req"];
  if (d.mode !== "1") Object.assign(rules, pwStepRules(d));
  if (!validate("pp", d, rules)) return render();
  const tpl = byId("templates", d.tpl);
  const steps = d.mode === "1" ? pwStepsFromTpl(tpl) : pwStepsRead(d);
  // Custom (mode 3) pathways go to the Programme Administrator, who assigns a Steward to approve them.
  const state = d.mode === "3" ? "Awaiting reviewer" : "Proposed to participant";
  const p = {
    id: uid("pw"),
    pid: d.pid,
    ctx: ctxId(),
    name:
      d.mode === "3" ? d.name : tpl.name + (d.mode === "2" ? " (adapted)" : ""),
    tpl: d.tpl || null,
    mode: {
      1: "1 · Pre-approved template",
      2: "2 · Adapted pathway",
      3: "3 · AI or custom pathway",
    }[d.mode],
    state,
    by: myId(),
    proposedAt: now(),
    steps,
    activity: [],
  };
  pwLog(
    p,
    d.mode === "1"
      ? `Proposed from the approved template “${tpl.name}” (mode 1, no review needed)`
      : d.mode === "2"
        ? `Adapted the approved template “${tpl.name}” (mode 2) and proposed it to the participant`
        : (d.pid === myId()
            ? "Drafted their own custom pathway"
            : "Drafted a custom pathway") +
          " (mode 3) and sent it for Steward approval",
  );
  S.pathways.push(p);
  if (state === "Awaiting reviewer") {
    p.submitted = today();
    ctxAdmins(ctxId()).forEach((a) => notify(a, "Assign a Steward to the pathway “" + p.name + "” from " + me().name, "admin", { tab: "requests" }));
  } else notify(d.pid, "A pathway was proposed to you: " + p.name, "pathway");
  audit("Pathway proposed", p.id, p.mode);
  clearF("pp");
  UI.modal = null;
  toast(
    state === "Awaiting reviewer"
      ? "Sent to the Programme Administrator, who assigns a Steward to approve it."
      : "Proposed to the participant.",
  );
  ok();
};
A.draftPathway = (d) => {
  UI.form.pp = { pid: d.pid, mode: "3", ...pwStepsToForm([]) };
  modal(
    "Draft your own pathway",
    () =>
      `<form data-f="pp" class="col pf-form" novalidate>${errSum("pp")}<input type="hidden" name="pid" value="${d.pid}"><input type="hidden" name="mode" value="3">${fi("pp", "name", "Pathway name", { req: true })}${pwStepFields("pp")}${banner("info", "", "Custom pathways are approved by a Steward, assigned by the Programme Administrator.")}<div class="actions"><span></span><button class="btn btn-p" type="submit">Submit for review</button></div></form>`,
  );
};
// ---- A participant creates and submits a pathway; the Programme Administrator assigns a reviewer (Steward or
// Faculty), who approves it, rejects it or asks for changes; the participant updates and resubmits.
const PW_OPEN = ["Awaiting reviewer", "In review", "Clarification requested", "Rejected"];
const stepsRule = [
  "req",
  [
    "fn",
    {
      f: (v) => {
        const n = v.split("\n").filter((x) => x.trim()).length;
        return n >= 3 && n <= 5;
      },
      m: "Enter 3 to 5 steps, one per line.",
    },
  ],
];
function pwMineCard(list) {
  const mine = list.filter((p) => p.by === myId() && PW_OPEN.includes(p.state));
  if (!mine.length) return "";
  const where = (p) =>
    p.state === "Awaiting reviewer"
      ? "Waiting for the Programme Administrator to assign a Steward"
      : p.state === "In review"
        ? "With " + nm(p.reviewer) + " for review"
        : p.state === "Clarification requested"
          ? "Clarification requested by " + nm(p.reviewer) + " — reply in the conversation, or update and resubmit"
          : "Rejected by " + nm(p.reviewer);
  return (
    card(
      "Pathways you submitted <span class=\"adm-n\">" + mine.length + "</span>",
      "Reviewed by a Steward assigned by the Programme Administrator.",
      dataView("pathway:submitted", {
        label: "pathways",
        items: mine,
        search: (p) => p.name + " " + p.steps.map((s) => s.t).join(" ") + " " + p.state,
        quick: { label: "State", options: dvOpts(mine, (p) => p.state), test: (p, v) => p.state === v },
        sorts: [["sub", "Newest first", (a, b) => String(b.submitted || "").localeCompare(String(a.submitted || ""))], ["name", "Name", (a, b) => a.name.localeCompare(b.name)]],
        defaultSort: "sub",
        row: (p) => ({
        lead: `<span class="tile t-soft" aria-hidden="true">${ic("route", 16)}</span>`,
        title: h(p.name),
        sub: p.steps.map((s) => h(s.t)).join(" → "),
        meta: [where(p), p.submitted ? "Submitted " + fmt(p.submitted) : ""],
        extra: p.reviewNote && ["Clarification requested", "Rejected"].includes(p.state) ? `<p class="pw-note">${h(p.reviewNote)}</p>` : "",
        badges: pill(p.state, { "Clarification requested": "p-amber", Rejected: "p-red" }[p.state]),
        primary:
          pwEditBtn(p) +
          B(ic("message", 14) + "Conversation & activity" + (convoN(p) ? " (" + convoN(p) + ")" : ""), "pwActivity", { id: p.id }) +
          (p.state === "Clarification requested" ? B("Update and resubmit", "pwUpd", { id: p.id }, "btn-p btn-sm") : ""),
        wrap: true,
      }),
        empty: ["route", "No pathways submitted", "Pathways you create appear here while they are reviewed.", ""],
      }),
      "",
      "pf-dv",
    ) + '<div class="pf-gap"></div>'
  );
}
function pwToReviewCard() {
  const mine = S.pathways.filter((p) => p.reviewer === myId() && ["In review", "Clarification requested"].includes(p.state) && inCtx(p));
  if (!mine.length && role() !== "F") return "";
  return (
    card(
      "Pathways assigned to you for review <span class=\"adm-n\">" + mine.length + "</span>",
      "Approve to make the pathway current for the participant, request clarification, or reject it. Pathways waiting on the creator stay here until they are resubmitted.",
      dataView("pathway:toreview", {
        label: "pathways",
        items: mine,
        search: (p) => [p.name, P(p.pid).name, P(p.by).name, ...p.steps.map((s) => s.t)].join(" "),
        quick: { label: "State", options: dvOpts(mine, (p) => p.state), test: (p, v) => p.state === v },
        sorts: [["name", "Name", (a, b) => a.name.localeCompare(b.name)], ["msgs", "Most messages", (a, b) => convoN(b) - convoN(a)]],
        defaultSort: "name",
        row: (p) => ({
          lead: `<span class="tile t-soft" aria-hidden="true">${ic("route", 16)}</span>`,
          title: h(p.name),
          sub: p.steps.map((s) => h(s.t)).join(" → "),
          meta: ["For " + nm(p.pid), "Created by " + nm(p.by), h(p.mode), p.resubmitted ? "Resubmitted " + fmt(p.resubmitted) : ""],
          extra: p.note ? `<p class="pw-note">Creator’s note: ${h(p.note)}</p>` : "",
          badges: p.state === "Clarification requested" ? pill("Waiting for the creator", "p-amber") : pill("In review"),
          primary:
            B(ic("message", 14) + "Conversation" + (convoN(p) ? " (" + convoN(p) + ")" : ""), "pwActivity", { id: p.id }) +
            B("Reject", "pwDec", { id: p.id, v: "Rejected" }) +
            (p.state === "In review" ? B("Request clarification", "pwDec", { id: p.id, v: "Clarification requested" }) + B("Approve", "pwDec", { id: p.id, v: "Current" }, "btn-p btn-sm") : ""),
          wrap: true,
        }),
        empty: ["check", "Nothing to review", "Pathways the Programme Administrator assigns to you appear here.", ""],
      }),
      "",
      "pf-dv",
    ) + '<div class="pf-gap"></div>'
  );
}
// ---- the creator edits a pathway until it is approved or accepted, and only while no step has been completed
const PW_EDITABLE = ["Awaiting reviewer", "In review", "Clarification requested", "Draft", "Proposed to participant"];
const pwEditable = (p) => !!p && p.by === myId() && PW_EDITABLE.includes(p.state) && !p.steps.some((s) => s.done);
const pwEditBtn = (p) => (pwEditable(p) ? B(ic("edit", 14) + "Edit", "pwEdit", { id: p.id }) : "");
A.pwEdit = (d) => {
  const p = byId("pathways", d.id);
  clearF("pwe");
  UI.form.pwe = { name: p.name, ...pwStepsToForm(p.steps), note: "" };
  modal(
    "Edit pathway",
    () =>
      `<form data-f="pwe" class="col pf-form" novalidate>${errSum("pwe")}<input type="hidden" name="id" value="${p.id}">${fi("pwe", "name", "Pathway name", { req: true, max: 120 })}${pwStepFields("pwe")}${fi("pwe", "note", "What you changed (optional)", { type: "textarea", rows: 2, max: 2000, help: "Added to the pathway conversation." })}${banner("info", "", "Editing keeps the pathway’s current state (" + h(p.state) + "). Everyone involved is told it changed.")}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">Save changes</button></div></form>`,
  );
};
F.pwe = (d) => {
  if (!validate("pwe", d, { name: ["req"], ...pwStepRules(d) })) return render();
  const p = byId("pathways", d.id);
  const steps = pwStepsRead(d);
  const changed = [d.name.trim() !== p.name && "name", pwStepsSig(steps) !== pwStepsSig(p.steps) && "steps or step rules"].filter(Boolean);
  const note = (d.note || "").trim();
  UI.modal = null;
  clearF("pwe");
  if (!changed.length && !note) {
    toast("No changes to save.");
    return ok();
  }
  p.name = d.name.trim();
  p.steps = steps;
  if (changed.length) pwLog(p, "Edited by " + me().name + ": " + changed.join(" and ") + " changed");
  if (note) convoAdd(p, "comment", note);
  pwParties(p)
    .filter((x) => x !== myId())
    .forEach((x) => notify(x, "Pathway edited by " + me().name + ": " + p.name, "pathway"));
  audit("Pathway edited", p.id, changed.join(", ") || "note only");
  toast("Pathway updated.");
  ok();
};
function pwForm(p) {
  const tpls = S.templates.filter((t) => t.status === "Approved");
  const src = fv("pwn", "src", p ? p.tpl || "custom" : "custom");
  const tpl = byId("templates", src);
  if (!UI.form.pwn) UI.form.pwn = { src, name: p ? p.name : "", ...pwStepsToForm(p ? p.steps : []) };
  return `<form data-f="pwn" class="col pf-form" novalidate>${errSum("pwn")}<input type="hidden" name="id" value="${p ? p.id : ""}">${p && p.reviewNote ? banner("warn", "Clarification requested by " + nm(p.reviewer), h(p.reviewNote)) : ""}${p ? "" : fi("pwn", "src", "Start from", { type: "select", opts: [["custom", "My own steps"], ...tpls.map((t) => [t.id, "Template: " + t.name])], ch: "pwnSrc" })}${fi("pwn", "name", "Pathway name", { req: true, value: p ? p.name : tpl ? tpl.name : "" })}${pwStepFields("pwn")}${fi("pwn", "note", p ? "Your response and what you changed" : "Note for the reviewer (optional)", { type: "textarea", rows: 2, req: !!p, help: p ? "Added to the review conversation." : "" })}${banner("info", "", "The Programme Administrator assigns a Steward or Faculty member to review your pathway. It becomes current when they approve it.")}<div class="actions"><span></span><button class="btn btn-p" type="submit">${p ? "Resubmit for review" : "Submit for review"}</button></div></form>`;
}
A.pwNew = () => {
  clearF("pwn");
  modal("Create a pathway", () => pwForm(null));
};
A.pwnSrc = (d, el) => {
  const form = el.closest("form");
  const x = {};
  new FormData(form).forEach((v, k) => (x[k] = v));
  const tpl = byId("templates", el.value);
  if (tpl) Object.assign(x, { name: tpl.name }, pwStepsToForm(pwStepsFromTpl(tpl)));
  UI.form.pwn = x;
  render();
};
A.pwUpd = (d) => {
  clearF("pwn");
  const p = byId("pathways", d.id);
  modal("Update and resubmit", () => pwForm(p));
};
F.pwn = (d) => {
  const p0 = d.id && byId("pathways", d.id);
  if (!validate("pwn", d, { name: ["req"], ...pwStepRules(d), ...(p0 ? { note: ["req"] } : {}) })) return render();
  const steps = pwStepsRead(d);
  if (p0) {
    Object.assign(p0, { name: d.name.trim(), steps, state: "In review", resubmitted: today(), note: d.note.trim() });
    convoAdd(p0, "resubmit", d.note.trim());
    pwParties(p0)
      .filter((x) => x !== myId())
      .forEach((x) => notify(x, "Pathway resubmitted for review: " + p0.name + " (" + me().name + ")", "pathway"));
    audit("Pathway resubmitted", p0.id, d.note);
    toast("Resubmitted to " + P(p0.reviewer).name + ".");
  } else {
    const tpl = byId("templates", d.src);
    const p = {
      id: uid("pw"),
      pid: myId(),
      ctx: ctxId(),
      name: d.name.trim(),
      tpl: tpl ? tpl.id : null,
      mode: tpl ? "Based on template “" + tpl.name + "”" : "Custom pathway",
      state: "Awaiting reviewer",
      by: myId(),
      reviewer: null,
      submitted: today(),
      proposedAt: now(),
      note: (d.note || "").trim(),
      steps,
      activity: [],
    };
    pwLog(p, "Created and submitted for review" + (tpl ? " (from the template “" + tpl.name + "”)" : ""));
    S.pathways.push(p);
    S.assign
      .filter((a) => a.ctx === ctxId() && roleBase(a.role) === "A" && a.status === "Active")
      .forEach((a) => notify(a.pid, "Assign a reviewer to the pathway “" + p.name + "” from " + me().name, "admin", { tab: "requests" }));
    audit("Pathway submitted", p.id, p.mode);
    toast("Submitted. The Programme Administrator will assign a reviewer.");
  }
  UI.modal = null;
  clearF("pwn");
  ok();
};
// ---- Programme Administrator assigns (or changes) the Steward who approves a pathway
const pwStewards = (p) => S.assign.filter((a) => a.ctx === p.ctx && roleBase(a.role) === "F" && a.status === "Active" && a.pid !== p.by && a.pid !== p.pid);
const pwNeedsSteward = (p) => p.state === "Awaiting reviewer" || (p.state === "In review" && !p.reviewer);
A.pwAssign = (d) => {
  clearF("pwas");
  const p = byId("pathways", d.id);
  const rv = pwStewards(p);
  modal(
    p.reviewer ? "Change the Steward" : "Assign a Steward",
    () =>
      `<form data-f="pwas" class="col pf-form" novalidate><input type="hidden" name="id" value="${p.id}">${dl([["Pathway", h(p.name)], ["Created by", nm(p.by)], ["For", nm(p.pid)], ["Steps", p.steps.map((s) => h(s.t)).join(" → ")], p.reviewer && ["Current Steward", nm(p.reviewer)]])}${
        rv.length
          ? fi("pwas", "rv", "Steward", { type: "select", req: true, ph: "Choose a Steward", value: p.reviewer || "", opts: rv.map((a) => [a.pid, P(a.pid).name + " · " + ROLE[a.role]]), help: "Active Facilitators / Stewards in this programme. The person who created the pathway cannot approve it." })
          : banner("warn", "No Steward available in this programme", "Invite a Facilitator / Steward from " + L("Programme admin → Invitations", "admin", { tab: "invites" }) + ", then assign them here.")
      }${banner("info", "", "The Steward approves the pathway, rejects it or requests clarification. The creator and the Steward talk in the pathway conversation; every message and step is kept.")}<div class="actions"><span></span><button class="btn btn-p" type="submit" ${rv.length ? "" : "disabled"}>${p.reviewer ? "Change Steward" : "Assign Steward"}</button></div></form>`,
  );
};
F.pwas = (d) => {
  if (!validate("pwas", d, { rv: [["req", "Choose a Steward."]] })) return render();
  const p = byId("pathways", d.id);
  if (!pwStewards(p).some((a) => a.pid === d.rv)) {
    UI.err.pwas = { rv: "Choose an active Steward in this programme." };
    return render();
  }
  const was = p.reviewer;
  if (was === d.rv) {
    UI.modal = null;
    return ok();
  }
  p.reviewer = d.rv;
  if (p.state !== "Clarification requested") p.state = "In review";
  pwLog(p, (was ? "Steward changed by " + me().name + ": " + P(was).name + " → " : "Steward assigned by " + me().name + ": ") + P(d.rv).name);
  notify(d.rv, "Pathway assigned to you for approval: " + p.name + " (" + P(p.by).name + ")", "pathway");
  [...new Set([p.by, p.pid])].forEach((x) => notify(x, "A Steward was assigned to the pathway “" + p.name + "”: " + P(d.rv).name, "pathway"));
  if (was) notify(was, "You are no longer the Steward for the pathway “" + p.name + "”", "pathway");
  audit("Pathway Steward assigned", p.id, (was ? was + " → " : "") + d.rv);
  UI.modal = null;
  clearF("pwas");
  toast(was ? "Steward changed." : "Steward assigned. They can now approve the pathway or ask for clarification.");
  ok();
};
// Programme Administrator view: pathways waiting for a Steward, and pathways a Steward is reviewing.
function pwAdminCards() {
  const wait = S.pathways.filter((p) => inCtx(p) && pwNeedsSteward(p));
  const inRev = S.pathways.filter((p) => inCtx(p) && p.reviewer && ["In review", "Clarification requested"].includes(p.state));
  const conv = (p) => B(ic("message", 14) + "Conversation" + (convoN(p) ? " (" + convoN(p) + ")" : ""), "pwActivity", { id: p.id });
  const lead = `<span class="tile t-soft" aria-hidden="true">${ic("route", 16)}</span>`;
  return (
    card(
      "Pathways waiting for a Steward <span class=\"adm-n\">" + wait.length + "</span>",
      "Assign a Steward to approve each pathway. They approve it, reject it or request clarification from the creator.",
      dataView("pathway:waiting", {
        label: "pathways",
        items: wait,
        search: (p) => [p.name, P(p.by).name, P(p.pid).name, ...p.steps.map((x) => x.t)].join(" "),
        quick: { label: "Mode", options: dvOpts(wait, (p) => p.mode), test: (p, v) => p.mode === v },
        sorts: [["sub", "Oldest first", (a, b) => String(a.submitted || "").localeCompare(String(b.submitted || ""))], ["name", "Name", (a, b) => a.name.localeCompare(b.name)]],
        defaultSort: "sub",
        row: (p) => ({
          lead,
          title: h(p.name),
          sub: p.steps.map((x) => h(x.t)).join(" → "),
          meta: ["Created by " + nm(p.by), "For " + nm(p.pid), h(p.mode), p.submitted ? "Submitted " + fmt(p.submitted) : ""],
          badges: pill("Awaiting Steward", "p-amber"),
          primary: conv(p) + B("Assign Steward", "pwAssign", { id: p.id }, "btn-p btn-sm"),
        }),
        empty: ["check", "No pathways are waiting for a Steward", "New pathways appear here until you assign a Steward.", ""],
      }),
      "",
      "pf-dv",
    ) +
    '<div class="section-gap"></div>' +
    card(
      "Pathways with a Steward <span class=\"adm-n\">" + inRev.length + "</span>",
      "Open the conversation to follow the review or add a comment.",
      dataView("pathway:withsteward", {
        label: "pathways",
        items: inRev,
        search: (p) => [p.name, P(p.by).name, P(p.pid).name, P(p.reviewer).name].join(" "),
        quick: { label: "State", options: dvOpts(inRev, (p) => p.state), test: (p, v) => p.state === v },
        filters: [{ key: "steward", label: "Steward", options: dvOpts(inRev, (p) => p.reviewer, (id) => P(id).name), test: (p, v) => p.reviewer === v }],
        sorts: [["name", "Name", (a, b) => a.name.localeCompare(b.name)]],
        defaultSort: "name",
        row: (p) => ({
          lead,
          title: h(p.name),
          sub: "Steward: " + nm(p.reviewer),
          meta: ["Created by " + nm(p.by), "For " + nm(p.pid)],
          badges: pill(p.state),
          primary: conv(p) + B("Change Steward", "pwAssign", { id: p.id }),
        }),
        empty: ["users", "No pathways are with a Steward right now", "Pathways move here once a Steward is assigned.", ""],
      }),
      "",
      "pf-dv",
    )
  );
}
A.pwDec = (d) => {
  const p = byId("pathways", d.id);
  // A pathway someone else wrote for the participant still needs the participant's acceptance after approval.
  if (d.v === "Current" && p.by !== p.pid) {
    p.state = "Proposed to participant";
    p.reviewNote = "";
    pwLog(p, "Approved by " + me().name + " and proposed to the participant");
    notify(p.pid, "Pathway proposed to you: " + p.name, "pathway");
    notify(p.by, "Your pathway “" + p.name + "” was approved by " + me().name, "pathway");
    audit("Pathway approved", p.id, "Proposed to participant");
    toast("Approved. The participant is asked to accept it.");
    return ok();
  }
  if (d.v === "Current") {
    S.pathways
      .filter((x) => x.pid === p.pid && x.ctx === p.ctx && x.state === "Current" && x !== p)
      .forEach((x) => {
        x.state = "Superseded";
        pwLog(x, "Superseded when “" + p.name + "” was approved");
      });
    p.state = "Current";
    p.reviewNote = "";
    pwLog(p, "Approved by " + me().name + " — it became the current pathway");
    notify(p.pid, "Your pathway “" + p.name + "” was approved and is now current", "pathway");
    audit("Pathway approved", p.id, "");
    toast("Approved. It is now the participant’s current pathway.");
    return ok();
  }
  clearF("pwd");
  modal(
    d.v === "Rejected" ? "Reject pathway" : "Request clarification",
    () =>
      `<form data-f="pwd" class="col pf-form" novalidate><input type="hidden" name="id" value="${p.id}"><input type="hidden" name="v" value="${d.v}">${dl([["Pathway", h(p.name)], ["Created by", nm(p.by)]])}${fi("pwd", "note", d.v === "Rejected" ? "Why it is rejected" : "What needs clarifying or changing?", { type: "textarea", rows: 3, req: true, help: "Added to the review conversation. The creator can reply there and resubmit." })}<div class="actions"><span></span><button class="btn ${d.v === "Rejected" ? "btn-d" : "btn-p"}" type="submit">${d.v === "Rejected" ? "Reject" : "Send to the creator"}</button></div></form>`,
  );
};
F.pwd = (d) => {
  if (!validate("pwd", d, { note: ["req", ["min", 5]] })) return render();
  const p = byId("pathways", d.id);
  const rej = d.v === "Rejected";
  p.state = rej ? "Rejected" : "Clarification requested";
  p.reviewNote = d.note.trim();
  convoAdd(p, rej ? "reject" : "clarify", p.reviewNote);
  pwParties(p)
    .filter((x) => x !== myId())
    .forEach((x) => notify(x, (rej ? "Pathway rejected: " : "Clarification requested on the pathway: ") + p.name, "pathway"));
  audit("Pathway " + p.state.toLowerCase(), p.id, p.reviewNote);
  UI.modal = null;
  clearF("pwd");
  toast(rej ? "Rejected. The creator has been told why." : "Clarification requested. The creator can reply or resubmit.");
  ok();
};
A.pwReview = (d) => {
  const p = byId("pathways", d.id);
  if (d.v === "Draft") {
    clearF("pwr");
    return modal(
      "Return pathway to its author",
      () =>
        `<form data-f="pwr" class="col pf-form" novalidate><input type="hidden" name="id" value="${p.id}">${dl(
          [
            ["Pathway", h(p.name)],
            ["For", nm(p.pid)],
            ["Drafted by", nm(p.by)],
          ],
        )}${fi("pwr", "why", "What needs to change before you can approve it?", { type: "textarea", rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Return with changes requested</button></div></form>`,
    );
  }
  p.state = d.v;
  pwLog(p, "Approved by Reviewer and proposed to the participant");
  notify(p.pid, "Pathway proposed to you: " + p.name, "pathway");
  if (p.by !== p.pid)
    notify(p.by, "Pathway approved by a Reviewer: " + p.name, "pathway");
  audit("Pathway review", p.id, d.v);
  ok();
};
F.pwr = (d) => {
  if (!validate("pwr", d, { why: ["req"] })) return render();
  const p = byId("pathways", d.id);
  p.state = "Draft";
  p.changeReq = d.why;
  convoAdd(p, "clarify", d.why.trim());
  notify(
    p.by,
    "Pathway returned by reviewer: " + p.name + " — " + d.why,
    "pathway",
  );
  audit("Pathway review", p.id, "Returned: " + d.why);
  UI.modal = null;
  clearF("pwr");
  ok();
};
A.pwAccept = (d) => {
  const p = byId("pathways", d.id);
  S.pathways
    .filter((x) => x.pid === p.pid && x.ctx === p.ctx && x.state === "Current")
    .forEach((x) => {
      x.state = "Superseded";
      pwLog(x, `Superseded when “${p.name}” was accepted`);
    });
  p.state = "Current";
  p.acceptedAt = now();
  p.acceptedBy = myId();
  pwLog(p, "Accepted the pathway — it became current");
  notify(p.by, `${me().name} accepted the pathway “${p.name}”`, "pathway");
  audit("Pathway accepted", p.id, "");
  toast("Accepted. It is now your current pathway.");
  ok();
};
// The participant may decline a proposed pathway outright; it stays in their history with the reason.
A.pwDecline = (d) => {
  clearF("pwdc");
  modal(
    "Decline this pathway",
    () =>
      `<form data-f="pwdc" class="col pf-form" novalidate><input type="hidden" name="id" value="${d.id}">${fi("pwdc", "why", "Why you are declining (shared with the proposer)", { type: "textarea", rows: 3, req: true, max: 1000 })}${banner("info", "", "Declining does not affect your Circles, Rope Teams, tasks or evidence. The proposer can propose something else.")}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-d" type="submit">Decline pathway</button></div></form>`,
  );
};
F.pwdc = (d) => {
  if (!validate("pwdc", d, { why: ["req", ["min", 3]] })) return render();
  const p = byId("pathways", d.id);
  p.state = "Declined";
  p.declineWhy = d.why.trim();
  p.declinedAt = now();
  convoAdd(p, "comment", "Declined by the participant: " + p.declineWhy);
  pwLog(p, "Declined by the participant — it will not become current");
  notify(p.by, `${me().name} declined the pathway “${p.name}”: ${p.declineWhy}`, "pathway");
  audit("Pathway declined by participant", p.id, p.declineWhy);
  UI.modal = null;
  clearF("pwdc");
  toast("Declined. The proposer has been told why.");
  ok();
};
A.pwChange = (d) => {
  UI.form.pwc = {};
  modal(
    "Request a change",
    () =>
      `<form data-f="pwc" class="col pf-form" novalidate><input type="hidden" name="id" value="${d.id}">${fi("pwc", "why", "What would you like changed?", { type: "textarea", rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send request</button></div></form>`,
  );
};
F.pwc = (d) => {
  if (!validate("pwc", d, { why: ["req"] })) return render();
  const p = byId("pathways", d.id);
  p.state = "Draft";
  p.changeReq = d.why;
  convoAdd(p, "clarify", d.why.trim());
  notify(
    p.by,
    `${me().name} requested a change to “${p.name}”: ${d.why}`,
    "pathway",
  );
  audit("Pathway change requested", p.id, d.why);
  UI.modal = null;
  clearF("pwc");
  ok();
};
// The proposer revises a returned or change-requested pathway and sends it on again.
A.pwRevise = (d) => {
  const p = byId("pathways", d.id);
  clearF("pwv");
  UI.form.pwv = pwStepsToForm(p.steps);
  modal(
    "Revise and re-propose",
    () =>
      `<form data-f="pwv" class="col pf-form" novalidate>${errSum("pwv")}<input type="hidden" name="id" value="${p.id}">${p.changeReq ? banner("warn", "Change requested", h(p.changeReq)) : ""}${pwStepFields("pwv")}${fi("pwv", "note", "What you changed", { req: true })}${banner("info", "", p.mode.startsWith("3") ? "Custom pathways go back to a Reviewer before the participant sees them." : "The revised pathway goes straight back to the participant to accept.")}<div class="actions"><span></span><button class="btn btn-p" type="submit">Re-propose</button></div></form>`,
  );
};
F.pwv = (d) => {
  if (!validate("pwv", d, { ...pwStepRules(d), note: ["req"] })) return render();
  const p = byId("pathways", d.id);
  p.steps = pwStepsRead(d);
  // Custom pathways go back to their Steward, or to the Programme Administrator if none is assigned yet.
  p.state = !p.mode.startsWith("3") ? "Proposed to participant" : p.reviewer ? "In review" : "Awaiting reviewer";
  p.changeReq = "";
  convoAdd(p, "resubmit", d.note.trim());
  if (p.state === "In review") notify(p.reviewer, "Revised pathway awaiting your approval: " + p.name, "pathway");
  else if (p.state === "Awaiting reviewer")
    ctxAdmins(p.ctx).forEach((a) => notify(a, "Assign a Steward to the revised pathway “" + p.name + "”", "admin", { tab: "requests" }));
  else notify(p.pid, "Revised pathway proposed to you: " + p.name, "pathway");
  audit("Pathway revised", p.id, d.note);
  UI.modal = null;
  clearF("pwv");
  ok();
};
// Completing a step records a note and supporting files, who completed it and when.
A.pwStep = (d) => {
  const p = byId("pathways", d.id);
  const s = p.steps[d.i];
  clearF("pws");
  modal(
    "Complete step " + (+d.i + 1),
    () =>
      `<form data-f="pws" class="col pf-form" novalidate><input type="hidden" name="id" value="${p.id}"><input type="hidden" name="i" value="${d.i}">${dl(
        [
          ["Pathway", h(p.name)],
          ["Step", h(s.t)],
          ["Type", pill(s.type || "Mandatory", PW_TY_C[s.type] || "p-navy")],
          ["Completion rule", h(s.rule || PW_RULE_DEF)],
          s.type === "Conditional" && ["Applies when", h(s.cond || "—") + '<span class="cap"> · completing it confirms that it applies to you</span>'],
        ],
      )}${s.early ? banner("info", "Earlier completion record", `You recorded this step on ${fmt(s.early.doneAt)}, before its prerequisites were complete${s.early.note ? ": “" + h(s.early.note) + "”" : ""}. Add it again below if it still applies.`) : ""}${fi("pws", "note", "Note (optional)", { type: "textarea", rows: 3, ph: "What you did, what you learned, anything the facilitator should know" })}<div class="field"><label class="lbl" for="pws_f">Supporting files (optional)</label><input id="pws_f" type="file" name="f" multiple class="input" style="padding:8px" data-ch="pwsFiles"><span class="help">Up to ${S.settings.maxFileMB} MB each. Your facilitator and the person who proposed this pathway can see them.</span><div class="pws-list cap"></div></div><div class="actions"><span></span><button class="btn btn-p" type="submit">Mark step complete</button></div></form>`,
  );
};
A.pwsFiles = (d, el) => {
  const l = el.closest(".field").querySelector(".pws-list");
  if (l)
    l.textContent = [...el.files]
      .map((f) => f.name + " (" + (f.size / 1048576).toFixed(2) + " MB)")
      .join(" · ");
};
F.pws = (d, form) => {
  const files = [...(form.querySelector("input[type=file]")?.files || [])];
  const big = files.find((f) => f.size > S.settings.maxFileMB * 1048576);
  if (big) {
    UI.form.pws = d;
    UI.err.pws = {
      note: `“${big.name}” is over ${S.settings.maxFileMB} MB. Link large files externally instead.`,
    };
    return render();
  }
  const p = byId("pathways", d.id);
  const s = p.steps[d.i];
  if (s.type === "Conditional") s.applies = true;
  Object.assign(s, {
    done: true,
    doneBy: myId(),
    doneAt: now(),
    note: (d.note || "").trim(),
    files: files.map((f) => ({
      n: f.name,
      mb: +(f.size / 1048576).toFixed(2),
    })),
  });
  pwLog(
    p,
    `Completed step ${+d.i + 1} “${s.t}”` +
      (s.note || s.files.length
        ? " with " +
          [
            s.note && "a note",
            s.files.length &&
              s.files.length + " file" + (s.files.length > 1 ? "s" : ""),
          ]
            .filter(Boolean)
            .join(" and ")
        : ""),
  );
  audit("Pathway step completed", p.id, s.t);
  if (p.by !== myId())
    notify(
      p.by,
      `${me().name} completed “${s.t}” on the pathway ${p.name}`,
      "pathway",
    );
  S.candidates.push({
    id: uid("cd"),
    pid: p.pid,
    field: "Completed milestone",
    value: s.t,
    source: "Pathway milestone: step " + (+d.i + 1) + " of “" + p.name + "”",
    src: { r: "pathway", p: {}, label: p.name + " · step " + (+d.i + 1) },
    prov: "Activity-derived",
    aud: "Only me",
    status: "Pending",
    at: now(),
  });
  UI.modal = null;
  clearF("pws");
  if (pwCheckDone(p)) toast("Pathway completed. Profile candidates added for your review.");
  else {
    const nx = pwNext(p);
    toast("Step completed. A profile candidate was added for your review." + (nx >= 0 ? " Next by rule: step " + (nx + 1) + "." : ""));
  }
  ok();
};
// Full history for the participant and for the people who propose, adapt and approve pathways.
A.pwActivity = (d) => {
  const p = byId("pathways", d.id);
  clearF("cv");
  // A function body, so a message posted from the dialog shows in place.
  modal("Pathway · " + h(p.name), () =>
    `<div class="col pw-act">${dl([
      ["Participant", nm(p.pid)],
      ["Mode", h(p.mode)],
      ["Created by", nm(p.by)],
      ["Approver", p.reviewer ? nm(p.reviewer) : p.state === "Awaiting reviewer" ? "Assigned by the Programme Administrator" : "—"],
      [
        "State",
        pill(p.state === "Draft" && p.changeReq ? "Change requested" : p.state),
      ],
      p.changeReq &&
        p.state === "Draft" && ["Open change request", h(p.changeReq)],
      ["Proposed and accepted", pwWho(p)],
      p.state === "Declined" && ["Declined by the participant", h(p.declineWhy || "") + (p.declinedAt ? " · " + fmt(p.declinedAt) : "")],
    ])}<div><h3 class="h3 pw-h">Conversation and activity</h3><p class="cap" style="margin-bottom:10px">Messages between the pathway owner, the Programme Administrator and the Steward, with every review step. Oldest first. The same conversation is in Messages.</p>${convoHtml("pathway", p)}</div><div><h3 class="h3" style="margin-bottom:8px">Steps and rules</h3>${pwLegend()}${table(
      ["Step", "Type", "State", "Prerequisite", "Completion rule", "Completed", "Note and files", ""],
      p.steps.map((s, i) => {
        const x = pwStepState(p, i);
        const ev = s.priorEv && byId("evidence", s.priorEv);
        const canRec = ["F", "M"].includes(role()) && p.pid !== myId() && p.state === "Current" && s.prior && !pwClosed(s) && x.st !== "Blocked" && !(s.rec && s.rec.status === "Awaiting participant");
        return [
          `${i + 1}. ${h(s.t)}${s.type === "Conditional" ? `<span class="pw-why">Applies when: ${h(s.cond || "—")}</span>` : ""}`,
          pill(s.type || "Mandatory", PW_TY_C[s.type] || "p-navy"),
          pill(x.st, PW_ST_C[x.st]) + (x.why && x.st === "Blocked" ? `<span class="pw-why">${h(x.why)}</span>` : "") + (s.rec && s.rec.status === "Awaiting participant" ? `<span class="pw-why">Prior-evidence recommendation by ${nm(s.rec.by)} waiting for ${nm(p.pid)}</span>` : ""),
          h(pwPreTxt(p, s)),
          h(s.rule || PW_RULE_DEF),
          s.done ? `${s.doneBy ? nm(s.doneBy) : ""}${s.doneAt ? " · " + fmt(s.doneAt) : ""}` : s.st === "Satisfied by prior evidence" ? `Prior evidence ${ev ? L(h(ev.title), "evidence", { id: ev.id }) : ""} · recommended by ${nm(s.recBy)} · accepted ${fmt(s.recAccepted)}` : "",
          s.done && (s.note || (s.files || []).length)
            ? `${s.note ? h(s.note) : ""}${pwFiles(s.files)}`
            : "",
          canRec ? B(ic("award", 14) + "Recommend prior evidence", "pwPrior", { id: p.id, i }) : "",
        ];
      }),
    )}</div></div>`,
    true,
  );
};
// ---------- ASK PHOENIX (F09, class A) ----------
// Ask PHOENIX is presented as a docked assistant (views/assist.js); the rules below are unchanged.
F.ask = (d) => {
  UI.pre = null;
  const q = (d.q || "").trim();
  if (!q) return;
  S.askHist = S.askHist || [];
  const pid = myId();
  if (!S.settings.aiAvailable || S.settings.aiUsed >= S.settings.aiQuota) {
    toast("AI is unavailable. Your request was not processed.", "warn");
    audit("AI request failed safely", pid, "Provider unavailable or quota");
    return ok();
  }
  if (consent(pid, "ai") !== "Granted") {
    audit("AI request refused", pid, "No AI-processing consent", "denied");
    return deny("AI processing is off for you, so Ask PHOENIX cannot use your records. You can change this in My records & consent → Optional permissions");
  }
  const other = S.people
    .filter((p) => p.id !== pid)
    .some(
      (p) =>
        q.toLowerCase().includes(p.display.toLowerCase() + "'s") ||
        q.toLowerCase().includes(p.name.toLowerCase()),
    );
  const inj = /ignore (all|previous|prior)|system prompt|reveal|bypass/i.test(
    q,
  );
  S.settings.aiUsed++;
  let ans;
  if (other || inj) {
    ans = {
      q,
      a: inj
        ? "This looks like an attempt to change my instructions. I cannot do that."
        : "I cannot share information about other people. Ask them directly, or ask your steward.",
      refused: true,
    };
    audit(
      "AI request refused",
      "AI gateway",
      inj ? "Prompt-injection pattern" : "Requested another user’s data",
      "denied",
    );
  } else {
    const pw = S.pathways.find((p) => p.pid === pid && p.state === "Current");
    const step = pw && pw.steps[pwNext(pw)];
    if (/evidence|E0|E4|level/i.test(q))
      ans = {
        q,
        a: "Evidence Support Levels describe how strongly evidence supports a specific claim: E0 not evidenced, E1 self-report or single source, E2 documented trace, E3 corroborated by multiple sources, E4 independently verified. They are never a score of you. To raise support for a milestone, add a second source such as a partner confirmation.",
        src: "Evidence guidance (E0–E4)",
        unc: "Low",
      };
    else if (/next|milestone/i.test(q))
      ans = {
        q,
        a: step
          ? `By your pathway’s step rules, your next step is “${step.t}” (the lowest-numbered required step whose prerequisites are complete). ${nextAction()[0]} is also waiting for you. Nothing is committed for you. Approved sources do not cover timing, so agree a date with your mentor or steward.`
          : "You have no open pathway step. Consider starting a project or browsing opportunities.",
        src: "Your pathway; Programme handbook 2026",
        unc: "Moderate",
      };
    else
      ans = {
        q,
        a: "Approved sources do not support a confident answer to this question. Try asking your facilitator, or rephrase with a specific milestone, Circle or evidence item.",
        src: "Programme handbook 2026",
        unc: "High",
      };
  }
  ans.pid = pid;
  S.askHist.push(ans);
  S.ai.push({
    id: uid("aj"),
    by: pid,
    cls: "A",
    purpose: "Ask PHOENIX",
    sources: ans.src || "—",
    consent: "Granted",
    model: "[Provider model via AI gateway]",
    status: ans.refused ? "Refused" : "Generated",
    at: today(),
  });
  audit(
    "AI request",
    pid,
    "Class A · " + (ans.refused ? "refused" : "answered"),
  );
  ok();
};
