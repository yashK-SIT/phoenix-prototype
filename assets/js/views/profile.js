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
      (["C", "A"].includes(role()) && me().org
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
          sub: "Source: " + h(c.source || "—"),
          meta: [
            candSrcLink(c),
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
        "Your profile only changes when you accept",
        "After a Learning Harvest is approved, PHOENIX identifies possible profile changes from it. Each one shows what would change, why, and the finding and records behind it. Each one shows its source and provenance. Accept it, edit it and accept, or reject it: accepting updates your profile and saves a new version; rejecting leaves it unchanged. Both are recorded.",
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
  c.revokedAt = now();
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
    at: now(),
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
      `<form data-f="basics" class="col pf-form" novalidate>${fi("basics", "display", "Display name", { req: true })}${fi("basics", "ageNote", "Age confirmation", { value: me().ageConfirmed ? ("Confirmed " + fmt(me().ageConfirmed === true ? today() : me().ageConfirmed)) : "Not recorded", disabled: true, help: "Confirmed when you joined. A date of birth is not collected." })}${fi("basics", "bio", "Short biography", { type: "textarea", rows: 3, max: 400 })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save new version</button></div></form>`,
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
const candSrcLink = (c) => {
  const s = c.src;
  const okLink = s && s.r && (s.r !== "evidence" || byId("evidence", s.p && s.p.id)) && (s.r !== "harvest" || byId("harvests", s.p && s.p.id));
  return okLink ? L("Open source: " + h(s.label || s.r), s.r, s.p || {}) : "";
};
const candSrc = (c) => h(c.source || "—") + (candSrcLink(c) ? "<br>" + candSrcLink(c) : "");
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
      at: now(),
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
        (e) => e.linked.includes(room.id) && e.owner === pid && e.review !== "Rejected" && (e.lifecycle || "Active") === "Active",
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
    ["Source", hv ? L("Learning Harvest: " + h(hv.scopeName || hv.id), "harvest", { id: hv.id }) + (hv.ai ? " " + aiTag("AI-drafted Harvest") : "") : "Learning Harvest " + h(s.hv)],
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
      S.claims.push({ id: uid("cl"), pid: s.pid, field: s.field, value: s.value, prov, vis, state: "Current", ver: 1, at: now(), src: "evolution", from: s.id });
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
    at: now(),
    src: "evolution",
    from: s.id,
  });
  bumpVer(`Profile evolution: added ${s.field} — ${items.join(evoSep(s.field))} · audience: ${vis}`, src, prov, x);
}
// Claims another person may see: current, not "Only me", and matching/pathway-only claims for F/M viewers only.
const sharedClaims = (pid, viewer = role()) =>
  S.claims.filter(
    (c) =>
      c.pid === pid &&
      c.state === "Current" &&
      c.vis !== "Only me" &&
      (c.vis !== "Matching/pathway roles only" || ["F", "M"].includes(viewer)),
  );
// viewing someone else's profile (F/M: V if shared/required)
function viewProfile(pid) {
  const viewer = role();
  const cl = sharedClaims(pid, viewer);
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
        "You + Organization Admin",
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
  const x = [...hs].reverse().find((e) => e.k === k || String(e.t || "").startsWith(l) || String(e.t || "").startsWith(k + ":"));
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
  // the person's own choice, then the effective state once organization and programme scopes are applied
  const sc = SCOPES.some((x) => x[0] === k);
  const pc = sc ? purposeCheck(k, pid) : null;
  const eff = sc
    ? `<span class="cons-state"><code class="cap">${scopeCode(k)}</code>${pill("Effective: " + scopeWord(k, pc.ok), pc.ok ? "p-green" : "p-grey")}${pc.ok ? "" : `<span class="cap">${pc.level === "user" ? "Off by your choice" : h(pc.why) + " Your own choice is kept for when it is turned back on."}</span>`}</span>`
    : "";
  return `<div class="cons-row" role="group" aria-label="${h(label)}"><div class="col" style="gap:4px;min-width:0"><b>${h(label)}</b><p class="cap" style="margin:0">${h(text)}</p><span class="cons-state">${pill(v, CONS_C[v])}<span class="cap">${at ? (v === "Not asked" ? "" : "Since ") + fmt(at) : "No choice recorded yet"}</span>${k === "ai" && v !== "Granted" ? '<span class="cap">· Ask PHOENIX and AI drafts are off for you</span>' : ""}</span>${eff}</div><div class="row wrap" style="gap:8px;justify-content:flex-end">${acts.join("")}</div></div>`;
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
      "Five purposes, each your own choice. Saying no never blocks your pathway, Circles, Rope Teams, tasks or evidence. Only a pathway step that itself needs a permission waits for it, and it tells you why.",
      `<div class="col" style="gap:10px">${OPT_PURPOSES.map(([k, l, tx]) => consentRow(pid, k, l, tx)).join("")}</div>` +
        banner("info", "Whatever you choose here, you can still", CORE_WITHOUT_OPTIONAL.join(" · ") + ". Your organization or programme can also turn a purpose off; that never turns on anything you declined."),
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
          m.status !== "Introduced" && !MB_ENDED.includes(m.status),
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
  if (!UI.toast) toast(`${consLabel(d.k)}: ${to}.${to !== "Granted" ? " Your pathway, Circles, tasks and evidence keep working; only a pathway step that needs this permission waits for it." : ""}`);
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
    list.forEach(pwSync);
    const cur = list.find((p) => p.state === "Current") || list.filter((p) => p.state === "Completed").slice(-1)[0];
    const prop = list.filter((p) => p.state === PW_REC);
    return (
      head(
        "My pathway",
        "A pathway never becomes current without your acceptance.",
        B(ic("message", 16) + "Request a recommendation", "pwAsk", {}, "btn-s") + B(ic("plus", 16) + "Create a pathway", "pwNew", {}, "btn-p"),
      ) +
      pwMineCard(list) +
      pwMyReqsCard() +
      prop
        .map((p) =>
          card(
            "Recommended: " + h(p.name),
            pwWho(p),
            pwAccPill(p) +
              pwRecInfo(p) +
              (p.prev ? banner("warn", "A changed version of your current pathway", "Version " + p.ver + " replaces “" + h((byId("pathways", p.prev) || {}).name || "") + "” only if you accept. Steps you already closed carry over where the step is unchanged. Until then your current version stays active.") : "") +
              banner("info", "Your decision is needed", "Accept it to make it your pathway, or reject it. Nothing becomes active until you accept. You can also ask for changes. Rejecting does not affect your Circles, Rope Teams, tasks or evidence.") +
              pwLegend() +
              pwStepsList(p, false) +
              `<div class="row wrap pf-after">${B(ic("message", 14) + "Conversation & activity", "pwActivity", { id: p.id })}${B("Ask for changes", "pwChange", { id: p.id })}${B(ic("x", 14) + "Reject", "pwDecline", { id: p.id }, "btn-d btn-sm")}${B(ic("check", 14) + "Accept pathway", "pwAccept", { id: p.id }, "btn-p btn-sm")}</div>`,
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
              "Current" + (cur.ver > 1 ? " · version " + cur.ver : "") + " · Mode " + h(cur.mode) + " · " + pg.n + " of " + pg.of + " steps closed · " + pwWho(cur),
              `<div class="hm-prog"><div class="progress"><span class="bar" style="width:${(pg.n / pg.of) * 100}%"></span></div><span class="cap">${Math.round((pg.n / pg.of) * 100)}%</span></div>` +
                pwAccPill(cur) +
                (ns
                  ? banner("info", `Next step: Step ${nx + 1} · ${h(ns.t)}`, "The lowest-numbered required step that is available. You can also work on any other available step.")
                  : banner(cur.state === "Completed" ? "ok" : "info", cur.state === "Completed" ? "Pathway completed" : "No required step is available right now", cur.state === "Completed" ? "Every required step is closed." : "Each remaining step shows why it is waiting and what unlocks it.")) +
                pwLegend() +
                pwStepsList(cur, true),
              B(ic("message", 14) + "Conversation & activity", "pwActivity", { id: cur.id }),
            );
          })()
        : empty(
            "route",
            "No current pathway",
            prop.length
              ? "Accept or reject a recommended pathway above, or ask for changes."
              : "Choose an approved template, request a recommendation from a Facilitator, Circle Steward or your mentor, or draft your own (a Reviewer approves it). Nothing is assigned to you without your acceptance.",
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
            meta: [p.changeReq && p.state === "Draft" ? `You asked for: ${h(p.changeReq)}` : "", p.state === "Declined" && p.declineWhy ? `You rejected it: ${h(p.declineWhy)}` : ""],
            badges: pill(p.state === "Draft" && p.changeReq ? "Change requested" : p.state),
            primary: pwEditBtn(p) + B("Conversation & activity", "pwActivity", { id: p.id }),
          }),
          empty: ["route", "No pathways yet", "Pathways recommended to you, or drafted by you, appear here.", ""],
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
    pwStepRevCard() +
    pwReqsCard() +
    (() => {
      const pwOf = (p) => S.pathways.filter((x) => x.pid === p && inCtx(x)).map((x) => (pwSync(x), x));
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
        ["proposed", "Recommended", (ls) => ls.some((x) => x.state === PW_REC)],
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
      // A pathway name opens that pathway: its Edit pathway form when this person may edit it, otherwise its details.
      const pwName = (x) => `<button type="button" class="pw-name-l" data-a="pwOpen" data-id="${x.id}" title="${pwEditable(x) ? "Edit this pathway" : "Open this pathway"}">${h(x.name)}</button>`;
      const mi = (icon, t, sub, a, data) => B(ic(icon, 16) + menuT(t, sub), a, data, "menu-i", 'role="menuitem"');
      const miOff = (icon, t, why) => `<div class="menu-i is-off" role="menuitem" aria-disabled="true">${ic(icon, 16)}${menuT(t, "Not available: " + h(why))}</div>`;
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
            return {
              lead: `<span class="av" aria-hidden="true">${ini(p)}</span>`,
              title: nm(p),
              sub: c ? `${pwName(c)} · ${pwProg(c).n}/${c.steps.length}${pwNext(c) >= 0 ? " · next by rule: step " + (pwNext(c) + 1) : ""}` : "No current pathway",
              meta: [
                c && c.steps.some((s) => s.rec && s.rec.status === "Awaiting participant") ? "Prior-evidence recommendation waiting for the participant" : "",
                c && c.steps.some((s, i) => pwStepState(c, i).st === "Blocked") ? "Blocked: " + c.steps.map((s, i) => [i, pwStepState(c, i)]).filter(([, x]) => x.st === "Blocked").map(([i, x]) => "step " + (i + 1) + " — " + h(x.why)).join("; ") : "",
                last ? `Last step completed ${fmt(last.doneAt)} by ${nm(last.doneBy)}${(last.files || []).length ? " · " + last.files.length + " file" + (last.files.length > 1 ? "s" : "") : ""}` : "",
                c ? "Acceptance: " + pwAcceptance(c) + (c.ver > 1 ? " · version " + c.ver : "") : "",
                ...others.map((x) => `<span class="pw-req">${pwName(x)}${pill(label(x))}</span>`),
              ],
              badges: c ? `<span class="pw-mini" title="${Math.round(frac(c) * 100)}% complete"><span class="progress"><span class="bar" style="width:${frac(c) * 100}%"></span></span></span>` : "",
              primary: ["F", "M"].includes(r) && pwCanRecommend(p) ? B("Recommend pathway", "proposePathway", { pid: p }) : "",
              // One three-dot menu per participant. Conversation & activity and Edit pathway first list this person's
              // pathways to choose from; an action nobody here can use is shown disabled with the reason.
              menu: [
                ls.some(pwCanView) ? mi("message", "Conversation & activity", "Choose from " + ls.filter(pwCanView).length + " pathway" + (ls.filter(pwCanView).length === 1 ? "" : "s"), "pwPick", { pid: p, v: "talk" }) : "",
                ls.length ? (ls.some(pwEditable) ? mi("edit", "Edit pathway", ls.filter(pwEditable).length + " you can edit · choose one", "pwPick", { pid: p, v: "edit" }) : miOff("edit", "Edit pathway", "none of these pathways can be edited by you")) : "",
                ...ls.filter((x) => x.state === "Draft" && x.by === myId()).map((x) => mi("refresh", "Revise and re-propose", h(x.name) + " · changes requested", "pwRevise", { id: x.id })),
                c && pwCanNewVer(c) ? B(ic("refresh", 16) + menuT("Propose a changed version", "The participant accepts it before it replaces the current one"), "pwNewVer", { id: c.id }, "menu-i", 'role="menuitem"') : "", ["F", "M"].includes(r) && c && c.pid !== myId() && c.steps.some((s) => s.prior && !pwClosed(s)) ? B(ic("award", 16) + menuT("Recommend prior evidence", "Steps where approved evidence may count"), "pwActivity", { id: c.id }, "menu-i", 'role="menuitem"') : "",
              ].filter(Boolean).join(""),
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
// Recommend Pathways: an action over the existing pathway system — select an approved template, optionally adapt it
// within its rules, say why, send to the participant. The participant accepts, asks for changes or declines.
A.proposePathway = (d) => {
  clearF("pp");
  const rq = d.req && byId("pwReqs", d.req);
  UI.form.pp = { pid: d.pid, mode: "1", req: d.req || "" };
  const dir = role() === "F";
  modal("Recommend a pathway to " + nm(d.pid), () => {
    const m = fv("pp", "mode", "1");
    const tpl = byId("templates", fv("pp", "tpl"));
    const circles = pwStewardCircles(d.pid);
    // After Update, an adaptation is checked against the template's adaptation rules.
    const env = m === "2" && tpl && UI.form.pp._tpl === tpl.id ? pwEnvelope(tpl, pwStepsRead(UI.form.pp)) : null;
    return `<form data-f="pp" class="col pf-form" novalidate>${errSum("pp")}<input type="hidden" name="pid" value="${d.pid}"><input type="hidden" name="req" value="${h(d.req || "")}">${
      rq ? banner("info", nm(d.pid) + " asked for a recommendation", "“" + h(rq.goal) + "”") : ""
    }${fi("pp", "mode", "What you recommend", {
      type: "select",
      opts: dir
        ? [
            ["1", "1 · Approved template, unchanged"],
            ["2", "2 · Adapted from a template"],
            ["3", "3 · Custom pathway"],
          ]
        : [
            ["1", "1 · Approved template, unchanged (no review)"],
            ["2", "2 · Adapted from a template (review only if outside its rules)"],
            ["3", "3 · Custom pathway (an authorised Reviewer approves it first)"],
          ],
      help: "The form below changes to match.",
      ch: "ppRefresh",
    })}${m !== "3" ? fi("pp", "tpl", "Approved template", { type: "select", req: true, ch: "ppRefresh", ph: "Select an approved template", opts: S.templates.filter((t) => t.status === "Approved").map((t) => [t.id, t.name + " · v" + tplVer(t)]) }) : fi("pp", "name", "Pathway name", { req: true })}${
      m === "1" ? (tpl ? `<div class="col" style="gap:6px"><p class="lbl" style="margin:0">Steps and rules from the template</p>${pwTplPreview(tpl)}</div>` : "") : pwStepFields("pp")
    }${
      m === "2"
        ? env
          ? env.ok
            ? banner("ok", "Within the template’s adaptation rules", "It goes straight to " + nm(d.pid) + " to accept. Press “Check adaptation rules” again after changing steps.")
            : banner("warn", "Outside the template’s adaptation rules", h(env.why.join("; ")) + (dir ? ". It still goes straight to " + nm(d.pid) + ", recorded as adapted outside the template’s rules." : ". An authorised Reviewer approves it before " + nm(d.pid) + " sees it."))
          : banner("info", "Adaptation rules (assumed rule)", "Keep every Mandatory step of the template as it is. Optional and Conditional steps may be added, removed or reworded." + (dir ? "" : " Anything else needs a Reviewer.") + " Press “Check adaptation rules” after editing the steps.")
        : ""
    }${fi("pp", "reason", "Why you recommend it", { type: "textarea", rows: 2, req: true, max: 300, help: "Shown to " + nm(d.pid) + " with your name and role." })}${
      circles.length
        ? fi("pp", "circle", "Connect to a Circle you steward (optional)", { type: "select", opts: [["", "No Circle"], ...circles.map((c) => [c.id, c.name])], help: "Links the pathway to that Circle’s learning and action. You recommend as its Circle Steward." })
        : ""
    }${banner("info", "", (dir ? "Sent straight to " + nm(d.pid) + " — no further approval. " : "") + nm(d.pid) + " must accept before it becomes their pathway. They can reject it or ask for changes without losing access to anything else.")}<div class="actions">${m === "2" ? B("Check adaptation rules", "ppRefresh") : "<span></span>"}<button class="btn btn-p" type="submit">Send recommendation</button></div></form>`;
  }, true);
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
// ---- Pathway engine (FR-F04, WSS clarification 5). Three separate layers, never one enum:
//  A. design-time requirement type of a step: Mandatory | Optional | Conditional, with the rules below;
//  B. runtime step status, always derived (pwStepState): Locked, Not started, Available, In progress, Pending review,
//     Completed, Satisfied by prior evidence, Skipped – allowed, Not applicable, Blocked. Available is the step the
//     rules offer next; Not started is any other open step the participant has not begun;
//  C. pathway-level participant acceptance (pwAcceptance): Proposed, Accepted, Declined, Superseded.
// Step design fields: t, type, pre [step indexes], preDone [those in pre that must be completed — a skip does not
// count], rule, when (Conditional: "fact:<key>", "role:<code>", or "ask" with the question in cond), from (available
// from this date), consent (an optional permission the step itself needs), review (the step requires evidence review:
// a Reviewer approves its completion), prior (approved prior evidence may satisfy it; a Reviewer always confirms it).
// Runtime fields: started, done / doneBy / doneAt / note / files, st (Skipped | Satisfied by prior evidence |
// Not applicable — kept in step with the condition by pwSync), pend (waiting for a Reviewer), priorEv / priorBy /
// priorOk / priorAt (provenance), rec (a facilitator's or mentor's prior-evidence suggestion), returned.
const PW_TYPES = ["Mandatory", "Optional", "Conditional"];
const PW_RULE_DEF = "Mark complete with a short note";
const PW_TY_C = { Mandatory: "p-navy", Optional: "p-grey", Conditional: "p-purple" };
const PW_S = { LOCKED: "Locked", NOT_STARTED: "Not started", AVAILABLE: "Available", PROGRESS: "In progress", PENDING: "Pending review", DONE: "Completed", PRIOR: "Satisfied by prior evidence", SKIP: "Skipped – allowed", NA: "Not applicable", BLOCKED: "Blocked" };
const PW_ST_C = { Completed: "p-green", "Satisfied by prior evidence": "p-green", "Skipped – allowed": "p-grey", "Not applicable": "p-grey", Available: "p-teal", "Not started": "p-grey", "In progress": "p-teal", "Pending review": "p-amber", Blocked: "p-red", Locked: "p-grey" };
const PW_CLOSED = [PW_S.DONE, PW_S.PRIOR, PW_S.SKIP, PW_S.NA];
const PW_OPEN = [PW_S.AVAILABLE, PW_S.NOT_STARTED, PW_S.PROGRESS];
// Deterministic conditions: each is explicit stored data that can be tested. AI never decides whether a step applies.
// Rule kinds come from the client text: "IF work involves minors" and "IF participant_role = Facilitator" (point 5),
// "Conditional on Steps 1–2" (point 1), plus a yes/no question written by the person who designs the step.
const PW_FACTS = {
  minors: { label: "work involves minors (under 18)", q: "Does your work involve minors (under 18)?", who: "P" },
};
const PW_ROLE_CONDS = ["F", "M", "C"];
const pwWhenOpts = () => [
  ["", "Choose the rule"],
  ...Object.entries(PW_FACTS).map(([k, f]) => ["fact:" + k, "IF " + f.label + " = Yes (" + (f.who === "S" ? "a Facilitator confirms" : "the participant answers") + ")"]),
  ...PW_ROLE_CONDS.map((r) => ["role:" + r, "IF the participant also holds the " + ROLE[r] + " role (automatic)"]),
  ["after", "IF the steps it depends on (below) are completed (automatic)"],
  ["ask", "IF the participant answers Yes to the question below"],
];
const pwFactKey = (s, i) => (s.when === "ask" ? "ask" + i : String(s.when || "").replace(/^fact:/, ""));
const pwFactDef = (s) =>
  s.when === "ask" ? { label: s.cond || "this step applies", q: s.cond || "Does this step apply to you?", who: "P" } : String(s.when || "").startsWith("fact:") ? PW_FACTS[s.when.slice(5)] || null : null;
const pwWhenTxt = (s) => {
  if (!s.when) return s.cond || "—";
  if (s.when.startsWith("role:")) return "IF the participant also holds the " + ROLE[s.when.slice(5)] + " role";
  if (s.when === "after") return (s.pre || []).length ? "IF step " + s.pre.map((j) => j + 1).join(" and step ") + " " + (s.pre.length > 1 ? "are" : "is") + " completed" : "Always (no steps to wait for)";
  const f = pwFactDef(s);
  return s.when === "ask" ? "IF the participant answers Yes: “" + (s.cond || "") + "”" : "IF " + (f ? f.label : s.when) + " = Yes";
};
// A Conditional step's condition → true | false | null (not yet known). Other steps always apply.
function pwCond(p, i) {
  const s = p.steps[i];
  if (!s || s.type !== "Conditional") return true;
  if (!s.when) return null;
  if (s.when.startsWith("role:")) return S.assign.some((a) => a.pid === p.pid && a.ctx === p.ctx && a.status === "Active" && roleBase(a.role) === s.when.slice(5));
  // "Conditional on Steps 1–2": applies once those steps are completed; not applicable if one was skipped or ruled out
  if (s.when === "after") {
    const deps = (s.pre || []).map((j) => p.steps[j]).filter(Boolean);
    if (deps.some((x) => ["Skipped", "Not applicable"].includes(x.st))) return false;
    return deps.every((x) => x.done || x.st === "Satisfied by prior evidence") ? true : null;
  }
  const v = ((p.facts || {})[pwFactKey(s, i)] || {}).v;
  return v === "yes" ? true : v === "no" ? false : null;
}
const pwActive = (p) => !!p && ["Current", "Completed"].includes(p.state);
// A step is closed when it no longer holds anything up.
const pwClosed = (s) => !!s && (!!s.done || ["Satisfied by prior evidence", "Skipped", "Not applicable"].includes(s.st));
const pwRequired = (p, i) => p.steps[i].type === "Mandatory" || (p.steps[i].type === "Conditional" && pwCond(p, i) !== false);
// Keep "Not applicable" in step with the condition (facts can change; role conditions follow the participant's roles).
function pwSync(p) {
  (p.steps || []).forEach((s, i) => {
    if (s.type !== "Conditional" || s.done) return;
    const c = pwCond(p, i);
    if (c === false && !s.st) s.st = "Not applicable";
    else if (c !== false && s.st === "Not applicable") delete s.st;
  });
}
// Why a step is blocked, each with the action that unlocks it. Never just a disabled button.
function pwBlockers(p, i) {
  const s = p.steps[i];
  const out = [];
  if (s.type === "Conditional" && s.when !== "after" && pwCond(p, i) === null) {
    const f = pwFactDef(s);
    out.push({ code: "cond", why: "It is not yet known whether this step applies: " + (f ? f.q : pwWhenTxt(s)), next: f && f.who === "S" ? "Wait for a Facilitator to confirm" : "Answer the question on this step" });
  }
  (s.pre || []).forEach((j) => {
    const sj = p.steps[j];
    if (!sj) return;
    const xj = pwRaw(p, j);
    if (xj.st === PW_S.PENDING) out.push({ code: "review", why: `Step ${j + 1} evidence is awaiting review.`, next: "Await Reviewer decision" });
    else if (xj.st === PW_S.SKIP && (s.preDone || []).includes(j)) out.push({ code: "dep", why: `Step ${j + 1} (${sj.t}) was skipped, but this step needs it completed.`, next: `Undo the skip and complete step ${j + 1}` });
    else if (!PW_CLOSED.includes(xj.st)) out.push({ code: "pre", why: `Step ${j + 1} (${sj.t}) is not complete yet.`, next: xj.st === PW_S.BLOCKED ? `Step ${j + 1}: ${xj.next}` : `Complete step ${j + 1} first` });
  });
  if (s.from && today() < s.from) out.push({ code: "date", why: "This activity becomes available on " + fmt(s.from) + ".", next: "Nothing to do until then" });
  // Missing consent blocks only a step that itself needs that permission; nothing else in the pathway is affected.
  if (s.consent && consent(p.pid, s.consent) !== "Granted")
    out.push({
      code: "consent",
      why: `This step needs your “${consLabel(s.consent)}” permission, which is ${consent(p.pid, s.consent).toLowerCase()}.`,
      next: "Grant it in My records & consent" + (s.type === "Optional" ? ", or skip this optional step" : ", or ask your facilitator for a version without this step"),
    });
  return out;
}
// → { st, why, next } — the runtime status, derived every time, never stored.
function pwStepState(p, i) {
  const x = pwRaw(p, i);
  return x.st === PW_S.AVAILABLE && i !== pwNext(p) ? { ...x, st: PW_S.NOT_STARTED } : x;
}
// Status before Available / Not started are told apart (an open step is "Available" here).
function pwRaw(p, i) {
  const s = p.steps[i];
  if (!s) return { st: PW_S.LOCKED, why: "" };
  if (s.done) return { st: PW_S.DONE, why: "" };
  if (s.st === "Satisfied by prior evidence") return { st: PW_S.PRIOR, why: "" };
  if (s.st === "Skipped") return { st: PW_S.SKIP, why: "Optional step skipped by the participant" };
  if (s.type === "Conditional" && pwCond(p, i) === false) return { st: PW_S.NA, why: pwWhenTxt(s) + " — the answer is No" };
  if (!pwActive(p)) return { st: PW_S.LOCKED, why: "Steps open only after the participant accepts the pathway.", next: p.state === PW_REC ? "Accept the pathway" : "Wait until the pathway is approved and accepted" };
  if (s.pend) return { st: PW_S.PENDING, why: s.pend.kind === "prior" ? "Prior evidence is waiting for a Reviewer to confirm it meets this step." : "The completion is waiting for a Reviewer to check it.", next: "Await Reviewer decision" };
  const b = pwBlockers(p, i);
  if (b.length) return { st: PW_S.BLOCKED, why: b.map((x) => x.why).join(" "), next: b[0].next, all: b };
  return { st: s.started ? PW_S.PROGRESS : PW_S.AVAILABLE, why: "" };
}
// Deterministic next step: the lowest-numbered required step that is Available or In progress.
function pwNext(p) {
  if (!p || !p.steps) return -1;
  return p.steps.findIndex((s, i) => pwRequired(p, i) && [PW_S.AVAILABLE, PW_S.PROGRESS].includes(pwRaw(p, i).st));
}
const pwProg = (p) => ({ n: p.steps.filter(pwClosed).length, of: p.steps.length });
const pwPreTxt = (p, s) =>
  ((s.pre || []).length ? "Needs " + s.pre.map((j) => "step " + (j + 1) + ((s.preDone || []).includes(j) ? " (completed)" : "")).join(" and ") + " first" : "No prerequisite") + (s.from ? " · available from " + fmt(s.from) : "");
// Pathway-level participant acceptance, separate from the pathway's workflow state.
const pwAcceptance = (p) =>
  p.state === PW_REC ? "Proposed" : p.state === "Draft" && p.partChange ? "Proposed — changes requested" : pwActive(p) ? "Accepted" : p.state === "Declined" ? "Rejected" : p.state === "Superseded" ? "Superseded" : "Not yet proposed";
const PW_ACC_C = { Proposed: "p-amber", "Proposed — changes requested": "p-amber", Accepted: "p-green", Rejected: "p-red", Superseded: "p-grey", "Not yet proposed": "p-grey" };
const pwAccPill = (p) => pill("Acceptance: " + pwAcceptance(p), PW_ACC_C[pwAcceptance(p)]);
const pwProposedAt = (p) => p.proposedAt || (p.activity && p.activity[0] && p.activity[0].at) || "";
// Who proposed the pathway and when the participant accepted it.
const pwWho = (p) =>
  (p.by === p.pid ? "Created by the participant" : "Recommended by " + pwRoleLine(p)) +
  (pwProposedAt(p) ? " on " + fmt(pwProposedAt(p)) : "") +
  (p.acceptedAt ? ` · accepted by ${p.acceptedBy === myId() ? "you" : nm(p.acceptedBy || p.pid)} on ${fmt(p.acceptedAt)}` : p.state === PW_REC ? " · waiting for the participant to accept" : "");
// Template steps are plain strings; an optional parallel `rules` list carries the design-time rules.
// Without rules, each step needs the one before it (the editor lets the proposer change that).
const PW_DESIGN = ["when", "cond", "from", "consent", "review", "prior"];
// Design-time rules of a step (what a template stores), without runtime fields.
const pwDesignOf = (s) => {
  const r = { type: s.type, pre: (s.pre || []).slice(), rule: s.rule };
  if ((s.preDone || []).length) r.preDone = s.preDone.slice();
  PW_DESIGN.forEach((k) => s[k] != null && s[k] !== "" && (r[k] = Array.isArray(s[k]) ? s[k].slice() : s[k]));
  return r;
};
function pwStepsFromTpl(tpl) {
  return (tpl ? tpl.steps : []).map((t, i) => {
    const r = (tpl.rules || [])[i] || {};
    const o = { t, type: r.type || "Mandatory", pre: r.pre ? r.pre.slice() : i ? [i - 1] : [], rule: r.rule || PW_RULE_DEF, done: false };
    if ((r.preDone || []).length) o.preDone = r.preDone.slice();
    PW_DESIGN.forEach((k) => r[k] != null && r[k] !== false && (o[k] = Array.isArray(r[k]) ? r[k].slice() : r[k]));
    return o;
  });
}
// The participant (P facts) or a Facilitator / the recommender (S facts) records whether a condition holds.
const pwFactWho = (p, s) => {
  const f = pwFactDef(s);
  if (!f) return false;
  if (f.who === "P") return p.pid === myId();
  return p.pid !== myId() && ((role() === "F" && pwCanView(p)) || p.by === myId());
};
function pwFactHtml(p, i) {
  const s = p.steps[i];
  const f = pwFactDef(s);
  if (s.type !== "Conditional" || !f || !pwActive(p)) return "";
  const a = (p.facts || {})[pwFactKey(s, i)];
  const can = pwFactWho(p, s) && !s.done && p.state === "Current";
  if (a)
    return `<span class="pw-why">Answer recorded: <b>${a.v === "yes" ? "Yes" : "No"}</b> by ${nm(a.by)} on ${fmt(a.at)}${can ? " · " + B("Change answer", "pwFact", { id: p.id, i, v: "clear" }, "btn-g btn-sm") : ""}</span>`;
  return `<div class="notice-q"><span aria-hidden="true">${ic("info", 16)}</span><div class="col" style="gap:4px;min-width:0"><b>${h(f.q)}</b><span class="cap">${f.who === "S" ? "A Facilitator records this." : "Your answer decides whether this step applies. It is stored and shown to your facilitator."}</span>${can ? `<div class="row wrap" style="gap:8px">${B("No", "pwFact", { id: p.id, i, v: "no" })}${B("Yes", "pwFact", { id: p.id, i, v: "yes" }, "btn-p btn-sm")}</div>` : ""}</div></div>`;
}
// Deterministic evidence suggestion: words from the step's title and rule found in the title or claim of the
// participant's approved evidence. A suggestion never completes a step; the participant or a Reviewer selects it.
const PW_STOP = new Set(["with", "your", "from", "that", "this", "have", "will", "into", "about", "record", "complete", "completed", "short", "note", "evidence", "submitted"]);
function pwEvMatches(p, i) {
  const s = p.steps[i];
  const keys = (s.t + " " + (s.rule || "")).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 4 && !PW_STOP.has(w));
  return S.evidence
    .filter((e) => e.owner === p.pid && e.review === "Approved")
    .map((e) => ({ e, n: keys.filter((k) => (e.title + " " + (e.claim || "")).toLowerCase().includes(k)).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((x) => x.e);
}
// Prior evidence is an "authorised equivalent": when the participant selects it, a Reviewer confirms it
// (Evidence proposed → Reviewer approved → Satisfied by prior evidence). A Reviewer may select it directly.
const pwPriorNeedsReview = () => true;
function pwPriorHtml(p, i) {
  const s = p.steps[i];
  if (!s.prior || pwClosed(s) || s.pend || p.pid !== myId() || p.state !== "Current") return "";
  const x = pwStepState(p, i);
  if (![...PW_OPEN, PW_S.BLOCKED].includes(x.st)) return "";
  const m = pwEvMatches(p, i)[0];
  const any = S.evidence.some((e) => e.owner === p.pid && e.review === "Approved");
  if (!m && !any) return "";
  return `<div class="notice-q"><span aria-hidden="true">${ic("award", 16)}</span><div class="col" style="gap:4px;min-width:0">${
    m ? `<b>Existing evidence may satisfy this requirement: “${h(m.title)}”</b>` : "<b>Approved prior evidence may satisfy this step</b>"
  }<span class="cap">Nothing changes until you select it.${pwPriorNeedsReview(s) ? " A Reviewer then confirms it." : ""}</span><div class="row wrap" style="gap:8px">${B(m ? "Use this evidence" : "Choose evidence", "pwUseEv", { id: p.id, i, ev: m ? m.id : "" }, "btn-s btn-sm")}</div></div></div>`;
}
// Step metadata shown wherever steps are listed: type, status, prerequisites, rule, condition, review, provenance.
function pwStepMeta(p, i, withState) {
  const s = p.steps[i];
  const x = pwStepState(p, i);
  const ev = s.priorEv && byId("evidence", s.priorEv);
  const pev = s.pend && s.pend.ev && byId("evidence", s.pend.ev);
  return (
    `<span class="pw-step-meta">${pill(s.type || "Mandatory", PW_TY_C[s.type] || "p-navy")}${withState ? pill(x.st, PW_ST_C[x.st]) : ""}<span class="cap">${h(pwPreTxt(p, s))}</span></span>` +
    `<span class="pw-why"><b>Completion rule:</b> ${h(s.rule || PW_RULE_DEF)}${s.review ? " · a Reviewer checks completion" : ""}${s.consent ? " · needs your “" + h(consLabel(s.consent)) + "” permission" : ""}</span>` +
    (s.type === "Conditional" ? `<span class="pw-why"><b>Applies when:</b> ${h(pwWhenTxt(s))}</span>` : "") +
    (s.prior && !pwClosed(s) ? `<span class="pw-why">Approved prior evidence may satisfy this step${pwPriorNeedsReview(s) ? " once a Reviewer confirms it" : ""}.</span>` : "") +
    (withState && x.st === PW_S.BLOCKED
      ? `<div class="notice-q pw-block"><span aria-hidden="true">${ic("lock", 16)}</span><div class="col" style="gap:2px;min-width:0"><b>Blocked</b><span class="cap"><b>Reason:</b> ${h(x.why)}</span><span class="cap"><b>Next action:</b> ${h(x.next)}${(x.all || []).some((b) => b.code === "consent") && p.pid === myId() ? " · " + L("Open My records & consent", "privacy", { tab: "consent" }) : ""}</span></div></div>`
      : "") +
    (withState && x.st === PW_S.PENDING
      ? `<div class="notice-q"><span aria-hidden="true">${ic("clock", 16)}</span><div class="col" style="gap:2px;min-width:0"><b>Pending review</b><span class="cap">${h(x.why)}${pev ? " Evidence: " + L(h(pev.title), "evidence", { id: pev.id }) : ""}${s.pend.why ? " · “" + h(s.pend.why) + "”" : ""}</span><span class="cap"><b>Next action:</b> ${h(x.next)}</span></div></div>`
      : "") +
    (withState && s.returned && !pwClosed(s) && !s.pend ? `<span class="pw-why"><b>Returned by ${nm(s.returned.by)}</b> on ${fmt(s.returned.at)}: “${h(s.returned.why)}”</span>` : "") +
    (s.st === "Satisfied by prior evidence"
      ? `<span class="pw-why">Satisfied by prior evidence ${ev ? L(h(ev.title), "evidence", { id: ev.id }) : ""} · selected by ${nm(s.priorBy || s.recBy)}${s.priorOk ? " · confirmed by " + nm(s.priorOk) + " (Reviewer)" : s.recAccepted ? " · accepted by " + nm(p.pid) : ""}${s.priorAt || s.recAccepted ? " on " + fmt(s.priorAt || s.recAccepted) : ""}</span>`
      : "") +
    (s.done && s.reviewedBy ? `<span class="pw-why">Checked by ${nm(s.reviewedBy)} (Reviewer) on ${fmt(s.reviewedAt)}</span>` : "") +
    (s.early && !s.done ? `<span class="pw-why">An earlier completion record (${fmt(s.early.doneAt)}) is kept. It was made before step rules applied; complete the step again once it is open.</span>` : "")
  );
}
// A facilitator's or mentor's suggestion that prior evidence satisfies a step. Only the participant's acceptance
// applies it — and then a Reviewer confirms it where the step needs review.
function pwRecHtml(p, i) {
  const s = p.steps[i];
  const r = s.rec;
  if (!r || r.status !== "Awaiting participant" || pwClosed(s) || s.pend) return "";
  const ev = byId("evidence", r.ev);
  const mineP = p.pid === myId();
  return `<div class="notice-q"><span aria-hidden="true">${ic("award", 16)}</span><div class="col" style="gap:4px;min-width:0"><b>Suggested by ${nm(r.by)} (${h(r.role || "Facilitator / mentor")}) on ${fmt(r.at)}: satisfied by prior evidence</b><span class="cap">Evidence: ${ev ? L(h(ev.title), "evidence", { id: ev.id }) + " · " + h(ev.level || "") + " · " + h(ev.review) : "—"}${r.why ? " · “" + h(r.why) + "”" : ""}</span><span class="cap">${mineP ? "Nothing changes unless you accept." + (pwPriorNeedsReview(s) ? " A Reviewer then confirms it." : "") + " Declining keeps the step open." : "Waiting for " + nm(p.pid) + " to accept or decline."}</span>${mineP ? `<div class="row wrap" style="gap:8px">${B("Decline", "pwPriorDecide", { id: p.id, i, v: "decline" })}${B(ic("check", 14) + "Accept", "pwPriorDecide", { id: p.id, i, v: "accept" }, "btn-p btn-sm")}</div>` : ""}</div></div>`;
}
// Participant actions for one step of their current pathway. A blocked step shows its reason, not a disabled button.
function pwStepActs(p, i) {
  const s = p.steps[i];
  const x = pwStepState(p, i);
  if (p.pid !== myId() || p.state !== "Current") return "";
  if (x.st === PW_S.SKIP) return B("Undo skip", "pwStepSet", { id: p.id, i, v: "undo" }, "btn-g btn-sm");
  const skip = s.type === "Optional" ? B("Skip", "pwStepSet", { id: p.id, i, v: "skip" }, "btn-g btn-sm") : "";
  if (x.st === PW_S.BLOCKED) return skip;
  if (!PW_OPEN.includes(x.st)) return "";
  return skip + (x.st !== PW_S.PROGRESS ? B("Start", "pwStart", { id: p.id, i }, "btn-g btn-sm") : "") + B("Mark complete", "pwStep", { id: p.id, i }, i === pwNext(p) ? "btn-p btn-sm" : "btn-s btn-sm");
}
// Steps of a pathway as a list. withState adds the runtime status, the participant's actions and suggestions.
function pwStepsList(p, withState) {
  if (withState) pwSync(p);
  const nx = pwNext(p);
  return `<ol class="hm-steps pw-steps">${p.steps
    .map((s, i) => {
      const cls = !withState ? "" : pwClosed(s) ? "done" : i === nx && p.state === "Current" ? "cur" : "";
      return `<li class="${cls}"><span class="hm-step-m" aria-hidden="true">${withState && pwClosed(s) ? ic("check", 12) : i + 1}</span><div class="hm-step-t"><b>${`Step ${i + 1}: ${h(s.t)}`}</b>${pwStepMeta(p, i, withState)}${withState && s.done ? `<span class="cap">${pwStepDone(s)}</span>` : ""}${withState ? pwFactHtml(p, i) + pwPriorHtml(p, i) + pwRecHtml(p, i) : ""}</div><div class="pw-step-a">${withState ? pwStepActs(p, i) : ""}</div></li>`;
    })
    .join("")}</ol>`;
}
// Each tag stays with its explanation when the legend wraps.
const pwLegend = () =>
  `<p class="pw-legend cap">${[
    [pill("Mandatory", PW_TY_C.Mandatory), "needed to complete the pathway"],
    [pill("Optional", PW_TY_C.Optional), "you may skip it"],
    [pill("Conditional", PW_TY_C.Conditional), "needed only when its rule is true"],
    [pill("Available", PW_ST_C.Available), "the next step by the rules"],
    [pill("Not started", PW_ST_C["Not started"]), "open, not begun"],
  ]
    .map(([t, l]) => `<span class="pw-lg-i">${t}${l}</span>`)
    .join("")}</p>`;
// Called by the guards: only the participant completes an Available or In-progress step of their current pathway.
function pwStepGuard(d) {
  const p = byId("pathways", d.id);
  const s = p && p.steps[d.i];
  if (!p || !s || p.pid !== myId() || p.state !== "Current") return "only the participant completes steps of their current pathway";
  const x = pwStepState(p, +d.i);
  if (x.st === PW_S.BLOCKED) return "step " + (+d.i + 1) + " is blocked — " + x.why + " Next action: " + x.next;
  return PW_OPEN.includes(x.st) || "this step is " + x.st.toLowerCase();
}
A.pwStart = (d) => {
  const p = byId("pathways", d.id);
  const s = p.steps[d.i];
  s.started = now();
  pwLog(p, `Started step ${+d.i + 1} “${s.t}”`);
  toast(`Step ${+d.i + 1} is in progress.`);
  ok();
};
// Skip / undo an Optional step. Skipping does not block later steps unless one needs it completed.
A.pwStepSet = (d) => {
  const p = byId("pathways", d.id);
  const s = p.steps[d.i];
  const n = +d.i + 1;
  if (d.v === "skip") {
    if (s.type !== "Optional") return deny("only Optional steps can be skipped");
    s.st = "Skipped";
    s.stAt = now();
    pwLog(p, `Skipped optional step ${n} “${s.t}”`);
  } else {
    if (s.st !== "Skipped") return deny("there is nothing to undo on this step");
    pwLog(p, `Re-opened step ${n} “${s.t}” (was skipped)`);
    delete s.st;
    delete s.stAt;
  }
  if (p.by !== myId()) notify(p.by, `${me().name} ${s.st ? "skipped" : "re-opened"} step ${n} of the pathway “${p.name}”`, "pathway");
  audit("Pathway step " + (s.st ? "skipped" : "re-opened"), p.id, s.t);
  pwCheckDone(p);
  toast(s.st ? `Step ${n}: skipped – allowed.` : `Step ${n} re-opened.`);
  ok();
};
// Record the answer to a step's condition. The stored rule stays explicit; the answer is data with who and when.
A.pwFact = (d) => {
  const p = byId("pathways", d.id);
  const s = p.steps[d.i];
  const f = pwFactDef(s);
  const k = pwFactKey(s, +d.i);
  p.facts = p.facts || {};
  if (d.v === "clear") {
    delete p.facts[k];
    pwLog(p, `Cleared the answer to “${f.q}” for step ${+d.i + 1}`);
  } else {
    p.facts[k] = { v: d.v, by: myId(), at: now() };
    pwLog(p, `Answered “${f.q}” — ${d.v === "yes" ? "Yes: step " + (+d.i + 1) + " applies" : "No: step " + (+d.i + 1) + " does not apply"}`);
  }
  pwSync(p);
  [p.pid, p.by].filter((x) => x && x !== myId()).forEach((x) => notify(x, `${me().name} recorded “${f.q}” on “${p.name}”: ${d.v === "clear" ? "cleared" : d.v === "yes" ? "Yes" : "No"}`, "pathway"));
  audit("Pathway condition answered", p.id, k + "=" + d.v);
  pwCheckDone(p);
  toast(d.v === "clear" ? "Answer cleared." : d.v === "yes" ? `Step ${+d.i + 1} applies.` : `Step ${+d.i + 1} does not apply.`);
  ok();
};
// ---- prior evidence. A suggestion never completes a step. The participant (or a Reviewer) selects the evidence;
// where review is required: Evidence proposed → Reviewer approved → Satisfied by prior evidence, with provenance.
const pwStepReviewers = (p) => [...new Set(S.assign.filter((a) => a.ctx === p.ctx && a.status === "Active" && (a.bundles || []).includes("Reviewer") && a.pid !== p.pid).map((a) => a.pid))];
function pwApplyPrior(p, i, ev, by, okBy, why) {
  const s = p.steps[i];
  delete s.pend;
  Object.assign(s, { st: "Satisfied by prior evidence", priorEv: ev.id, priorBy: by, priorOk: okBy || null, priorAt: now(), priorWhy: why || "" });
  pwStepCand(p, i, s);
  pwLog(p, `Step ${i + 1} “${s.t}” satisfied by prior evidence “${ev.title}” — selected by ${P(by).name}${okBy ? ", confirmed by " + P(okBy).name + " (Reviewer)" : ""}`);
}
function pwProposePrior(p, i, ev, why) {
  const s = p.steps[i];
  if (!pwPriorNeedsReview(s)) {
    pwApplyPrior(p, i, ev, myId(), null, why);
    return "Step " + (i + 1) + " is satisfied by prior evidence.";
  }
  s.pend = { kind: "prior", ev: ev.id, by: myId(), at: now(), why: why || "" };
  pwLog(p, `Selected approved evidence “${ev.title}” for step ${i + 1} “${s.t}” — waiting for a Reviewer`);
  pwStepReviewers(p).forEach((x) => notify(x, `${P(p.pid).name}: prior evidence “${ev.title}” proposed for “${s.t}” — review it`, "pathway"));
  return "Sent to a Reviewer. The step shows Pending review until they decide.";
}
A.pwUseEv = (d) => {
  const p = byId("pathways", d.id);
  const s = p.steps[d.i];
  const evs = S.evidence.filter((e) => e.owner === p.pid && e.review === "Approved");
  clearF("pwue");
  UI.form.pwue = { ev: d.ev || (evs.length === 1 ? evs[0].id : "") };
  modal("Use prior evidence for step " + (+d.i + 1), () =>
    `<form data-f="pwue" class="col pf-form" novalidate>${errSum("pwue")}<input type="hidden" name="id" value="${p.id}"><input type="hidden" name="i" value="${d.i}">${dl([
      ["Step", h(s.t)],
      ["Completion rule", h(s.rule || PW_RULE_DEF)],
    ])}${fi("pwue", "ev", "Your approved evidence", { type: "select", req: true, ph: "Choose evidence", opts: evs.map((e) => [e.id, e.title + " · " + (e.level || "") + " · approved"]) })}${fi("pwue", "why", "Why it meets the requirement", { type: "textarea", rows: 2, req: true, max: 600 })}${banner(
      "info",
      "",
      pwPriorNeedsReview(s) ? "A Reviewer confirms that the evidence meets this step. Until then the step shows Pending review. A suggestion or similarity match never completes a step on its own." : "This step does not need review: it is satisfied as soon as you confirm, and the evidence used is recorded.",
    )}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">${pwPriorNeedsReview(s) ? "Send for review" : "Use this evidence"}</button></div></form>`,
  );
};
F.pwue = (d) => {
  if (!validate("pwue", d, { ev: [["req", "Choose the evidence."]], why: [["req", "Say why it meets the requirement."], ["min", 5]] })) return render();
  const p = byId("pathways", d.id);
  const ev = byId("evidence", d.ev);
  if (!ev || ev.owner !== p.pid || ev.review !== "Approved") return deny("only your own approved evidence can satisfy a step");
  const msg = pwProposePrior(p, +d.i, ev, d.why.trim());
  audit("Pathway prior evidence selected", p.id, `step ${+d.i + 1} · ${ev.id}`);
  pwCheckDone(p);
  UI.modal = null;
  clearF("pwue");
  toast(msg);
  ok();
};
// A facilitator or mentor suggests prior evidence (the participant decides); a Reviewer may select it directly.
A.pwPrior = (d) => {
  const p = byId("pathways", d.id);
  const s = p.steps[d.i];
  const evs = S.evidence.filter((e) => e.owner === p.pid && e.review === "Approved");
  const rv = pwStepReviewers(p).includes(myId());
  clearF("pwpe");
  UI.form.pwpe = { ev: (pwEvMatches(p, +d.i)[0] || evs[0] || {}).id || "" };
  modal(rv ? "Apply prior evidence (Reviewer)" : "Suggest: satisfied by prior evidence", () =>
    `<form data-f="pwpe" class="col pf-form" novalidate>${errSum("pwpe")}<input type="hidden" name="id" value="${p.id}"><input type="hidden" name="i" value="${d.i}">${dl([
      ["Participant", nm(p.pid)],
      ["Step", `Step ${+d.i + 1}: ${h(s.t)}`],
      ["Completion rule", h(s.rule || PW_RULE_DEF)],
    ])}${
      evs.length
        ? fi("pwpe", "ev", "Approved evidence that meets the rule", { type: "select", req: true, ph: "Choose evidence", opts: evs.map((e) => [e.id, e.title + " · " + (e.level || "") + " · approved"]) })
        : banner("warn", "No approved evidence", nm(p.pid) + " has no approved evidence yet, so prior evidence cannot satisfy this step.")
    }${fi("pwpe", "why", "Why it satisfies the step", { type: "textarea", rows: 2, req: true, max: 600 })}${banner(
      "info",
      "",
      rv ? "As a Reviewer you select and confirm it: the step becomes Satisfied by prior evidence, with the evidence and your name recorded." : nm(p.pid) + " decides. The step stays open unless they accept" + (pwPriorNeedsReview(s) ? ", and a Reviewer then confirms it." : "."),
    )}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit" ${evs.length ? "" : "disabled"}>${rv ? "Apply evidence" : "Send suggestion"}</button></div></form>`,
  );
};
F.pwpe = (d) => {
  if (!validate("pwpe", d, { ev: [["req", "Choose the evidence."]], why: [["req", "Say why it satisfies the step."], ["min", 5]] })) return render();
  const p = byId("pathways", d.id);
  const s = p.steps[d.i];
  const ev = byId("evidence", d.ev);
  if (!ev || ev.owner !== p.pid || ev.review !== "Approved") return deny("only the participant’s approved evidence can satisfy a step");
  if (pwStepReviewers(p).includes(myId())) {
    pwApplyPrior(p, +d.i, ev, myId(), myId(), d.why.trim());
    notify(p.pid, `${me().name} (Reviewer) confirmed that your evidence “${ev.title}” satisfies step ${+d.i + 1} of “${p.name}”`, "pathway");
    audit("Pathway prior evidence applied by Reviewer", p.id, `step ${+d.i + 1} · ${ev.id}`);
    pwCheckDone(p);
    toast(`Step ${+d.i + 1} is satisfied by prior evidence.`);
  } else {
    s.rec = { ev: ev.id, by: myId(), role: ROLE[role()], at: now(), why: d.why.trim(), status: "Awaiting participant" };
    pwLog(p, `${me().name} suggested that approved evidence “${ev.title}” satisfies step ${+d.i + 1} “${s.t}” — waiting for the participant`);
    notify(p.pid, `${me().name} suggests that your evidence “${ev.title}” satisfies step ${+d.i + 1} of “${p.name}”. Accept or decline it.`, "pathway");
    audit("Pathway prior evidence recommended", p.id, `step ${+d.i + 1} · ${ev.id}`);
    toast("Suggestion sent. It applies only if " + P(p.pid).name + " accepts" + (pwPriorNeedsReview(s) ? " and a Reviewer confirms it." : "."));
  }
  UI.modal = null;
  clearF("pwpe");
  ok();
};
A.pwPriorDecide = (d) => {
  const p = byId("pathways", d.id);
  const s = p.steps[d.i];
  const r = s.rec;
  const ev = byId("evidence", r.ev);
  r.status = d.v === "accept" ? "Accepted" : "Declined";
  r.decidedAt = now();
  let msg = "Declined. The step stays open.";
  if (d.v === "accept") {
    Object.assign(s, { recBy: r.by, recAccepted: r.decidedAt });
    msg = pwProposePrior(p, +d.i, ev, r.why);
  } else pwLog(p, `Declined ${nm(r.by)}’s suggestion for step ${+d.i + 1} “${s.t}” — the step stays open`);
  notify(r.by, `${me().name} ${r.status.toLowerCase()} your prior-evidence suggestion for “${s.t}”`, "pathway");
  audit("Pathway prior evidence " + r.status.toLowerCase(), p.id, `step ${+d.i + 1} · ${r.ev}`);
  pwCheckDone(p);
  toast(msg);
  ok();
};
// ---- Reviewer decisions on steps waiting for review (prior evidence, or a completion that needs checking)
const pwStepCand = (p, i, s) =>
  S.candidates.push({
    id: uid("cd"),
    pid: p.pid,
    field: "Completed milestone",
    value: s.t,
    source: "Pathway milestone: step " + (i + 1) + " of “" + p.name + "”",
    src: { r: "pathway", p: {}, label: p.name + " · step " + (i + 1) },
    prov: "Activity-derived",
    aud: "Only me",
    status: "Pending",
    at: now(),
  });
const pwPendItems = () =>
  S.pathways
    .filter((p) => inCtx(p) && p.state === "Current" && p.pid !== myId() && pwStepReviewers(p).includes(myId()))
    .flatMap((p) => p.steps.map((s, i) => [p, i, s]).filter(([, , s]) => s.pend));
A.pwStepRev = (d) => {
  const p = byId("pathways", d.id);
  const i = +d.i;
  const s = p.steps[i];
  if (d.v === "return") {
    clearF("pwsr");
    return modal("Return step " + (i + 1) + " to " + nm(p.pid), () =>
      `<form data-f="pwsr" class="col pf-form" novalidate>${errSum("pwsr")}<input type="hidden" name="id" value="${p.id}"><input type="hidden" name="i" value="${i}">${dl([["Step", h(s.t)], ["Completion rule", h(s.rule || PW_RULE_DEF)]])}${fi("pwsr", "why", "What is missing", { type: "textarea", rows: 3, req: true, max: 600 })}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">Return to the participant</button></div></form>`,
    );
  }
  const pe = s.pend;
  if (pe.kind === "prior") pwApplyPrior(p, i, byId("evidence", pe.ev), pe.by, myId(), pe.why);
  else {
    delete s.pend;
    Object.assign(s, { done: true, doneBy: pe.by, doneAt: pe.at, note: pe.note || "", files: pe.files || [], reviewedBy: myId(), reviewedAt: now() });
    pwLog(p, `Reviewer ${me().name} confirmed step ${i + 1} “${s.t}” is complete`);
    pwStepCand(p, i, s);
  }
  notify(p.pid, `${me().name} (Reviewer) approved step ${i + 1} “${s.t}” of “${p.name}”`, "pathway");
  audit("Pathway step review approved", p.id, `step ${i + 1} · ${pe.kind}`);
  toast(pwCheckDone(p) ? "Approved. The pathway is now complete." : "Approved.");
  ok();
};
F.pwsr = (d) => {
  if (!validate("pwsr", d, { why: ["req", ["min", 5]] })) return render();
  const p = byId("pathways", d.id);
  const i = +d.i;
  const s = p.steps[i];
  const kind = s.pend.kind;
  delete s.pend;
  s.started = s.started || now();
  s.returned = { by: myId(), at: now(), why: d.why.trim() };
  pwLog(p, `Reviewer ${me().name} returned step ${i + 1} “${s.t}” (${kind === "prior" ? "prior evidence not accepted" : "completion not confirmed"}): ${d.why.trim()}`);
  notify(p.pid, `${me().name} returned step ${i + 1} “${s.t}” of “${p.name}”: ${d.why.trim()}`, "pathway");
  audit("Pathway step review returned", p.id, `step ${i + 1} · ${kind}`);
  UI.modal = null;
  clearF("pwsr");
  toast("Returned. The participant sees why.");
  ok();
};
function pwStepRevCard() {
  const items = pwPendItems();
  if (!items.length) return "";
  return (
    card(
      "Pathway steps waiting for your review <span class=\"adm-n\">" + items.length + "</span>",
      "Prior evidence proposed for a step, and completions that need checking. Nothing is satisfied until you approve.",
      table(
        ["Participant", "Pathway and step", "Waiting for", ""],
        items.map(([p, i, s]) => {
          const ev = s.pend.ev && byId("evidence", s.pend.ev);
          return [
            nm(p.pid),
            `${h(p.name)}<span class="pw-why">Step ${i + 1}: ${h(s.t)} · ${h(s.rule || PW_RULE_DEF)}</span>`,
            (s.pend.kind === "prior" ? "Prior evidence: " + (ev ? L(h(ev.title), "evidence", { id: ev.id }) + " · " + h(ev.level || "") : "—") : "Completion check" + (s.pend.note ? ": “" + h(s.pend.note) + "”" : "")) +
              (s.pend.why ? `<span class="pw-why">“${h(s.pend.why)}”</span>` : "") +
              `<span class="pw-why">${fmt(s.pend.at)}</span>` +
              ((s.pend.files || []).length ? pwFiles(s.pend.files) : ""),
            B("Return", "pwStepRev", { id: p.id, i, v: "return" }) + B("Approve", "pwStepRev", { id: p.id, i, v: "ok" }, "btn-p btn-sm"),
          ];
        }),
      ),
      "",
      "pf-dv",
    ) + '<div class="pf-gap"></div>'
  );
}
// The pathway completes when every Mandatory step and every Conditional step whose rule is true is closed. A
// Conditional step whose rule is not yet known still needs an answer. Open Optional steps are recorded as not taken.
function pwCheckDone(p) {
  pwSync(p);
  if (p.state !== "Current" || p.steps.some((s, i) => pwRequired(p, i) && !pwClosed(s))) return false;
  p.state = "Completed";
  const open = p.steps.filter((s) => !pwClosed(s));
  pwLog(p, "All required steps complete — pathway completed" + (open.length ? ` (optional not taken: ${open.map((s) => "“" + s.t + "”").join(", ")})` : ""));
  S.candidates.push({ id: uid("cd"), pid: p.pid, field: "Completed learning activity", value: p.name, source: "Pathway completion: " + p.name, src: { r: "pathway", p: {}, label: p.name }, prov: "Activity-derived", aud: "Only me", status: "Pending", at: now() });
  return true;
}
// ---- step editor: up to five rows — title, type, rule, condition, date, review, prior evidence, dependencies.
const PW_ROWS = 5;
function pwStepsToForm(steps) {
  const o = {};
  for (let i = 0; i < PW_ROWS; i++) {
    const s = steps[i];
    o["s" + i + "t"] = s ? s.t : "";
    o["s" + i + "ty"] = (s && s.type) || "Mandatory";
    o["s" + i + "r"] = (s && s.rule) || "";
    o["s" + i + "w"] = (s && s.when) || "";
    o["s" + i + "c"] = (s && s.cond) || "";
    o["s" + i + "fr"] = (s && s.from) || "";
    o["s" + i + "rv"] = s && s.review ? "yes" : "";
    o["s" + i + "pe"] = s && s.prior ? "yes" : "";
    o["s" + i + "cs"] = (s && s.consent) || "";
    for (let j = 0; j < i; j++) o["s" + i + "p" + j] = s && (s.pre || []).includes(j) ? ((s.preDone || []).includes(j) ? "done" : "yes") : "";
  }
  return o;
}
// Three step cards are always shown; rows 4 and 5 appear when filled in or added. Each card keeps the essentials
// (what, type, completion rule) open; conditions, timing, review and dependencies sit in a panel that opens by
// itself when any of them is set, has an error, or the step is Conditional.
const PW_MIN = 3;
const pwRowsShown = (f) => {
  const d = UI.form[f] || {};
  let last = -1;
  for (let i = 0; i < PW_ROWS; i++) if ((d["s" + i + "t"] || "").trim()) last = i;
  return Math.min(PW_ROWS, Math.max(PW_MIN, last + 1, +d._rows || 0));
};
const PW_LEAN_HIDE = ["w", "c", "fr", "cs"];
const pwRowMore = (f, i, lean) => {
  const d = UI.form[f] || {};
  const k = ["w", "c", "fr", "rv", "pe", "cs", ...[...Array(i).keys()].map((j) => "p" + j)].filter((x) => !lean || !PW_LEAN_HIDE.includes(x));
  return k.filter((x) => d["s" + i + x]).length;
};
// o.lean (Create pathway): no "Applies when", "Yes / no question", "Available from" or "Needs an optional permission"
// fields. Values a template already set for them are kept as hidden fields, so an unchanged template stays unchanged.
function pwStepFields(f, o = {}) {
  const lean = !!o.lean;
  const rows = pwRowsShown(f);
  const d = UI.form[f] || {};
  const err = UI.err[f] || {};
  let out = `<section class="pw-ed" aria-labelledby="${f}_steps_h"><div class="pw-ed-h"><h3 class="h3" id="${f}_steps_h">Steps <span class="req">*</span></h3><span class="cap">${rows} of ${PW_ROWS} · at least ${PW_MIN}</span></div><p class="help pw-ed-help">Give each step a requirement type and, if needed, rules. Statuses such as Blocked or Satisfied by prior evidence are worked out while the participant follows the pathway — they are not set here.</p><input type="hidden" name="_rows" value="${rows}">`;
  for (let i = 0; i < rows; i++) {
    const s = "s" + i;
    const pre = [];
    for (let j = 0; j < i; j++) {
      const t = (d["s" + j + "t"] || "").trim();
      pre.push(fi(f, s + "p" + j, "Step " + (j + 1) + (t ? ": " + h(t.length > 28 ? t.slice(0, 27) + "…" : t) : ""), { type: "select", opts: [["", "No dependency"], ["yes", "Done or skipped"], ["done", "Completed (a skip is not enough)"]] }));
    }
    const n = pwRowMore(f, i, lean);
    const errIn = Object.keys(err).some((k) => k !== "s0t" && k.startsWith(s) && !/^s\d+(t|ty|r)$/.test(k));
    const ui = (UI.pwOpen || {})[f + i];
    const open = ui != null ? ui : n > 0 || errIn || d[s + "ty"] === "Conditional";
    const rm = i === rows - 1 && i >= PW_MIN ? `<button type="button" class="btn btn-g btn-sm pw-ed-rm" data-a="pwRowRm" data-f="${f}" data-i="${i}" aria-label="Remove step ${i + 1}">${ic("x", 14)}<span class="hide-sm">Remove</span></button>` : "";
    out += `<div class="pw-ed-step" role="group" aria-labelledby="${f}_${s}_h"><div class="pw-ed-sh"><span class="np-n" aria-hidden="true">${i + 1}</span><b id="${f}_${s}_h">Step ${i + 1}</b><span class="cap">${i < PW_MIN ? "Required row" : "Extra row"}</span>${rm}</div>
<div class="pw-ed-main">${fi(f, s + "t", "What the participant does", { max: 120, req: i < PW_MIN, ph: "e.g. Complete the safeguarding module" })}${fi(f, s + "ty", "Requirement type", { type: "select", opts: PW_TYPES, ch: "pwTy" })}</div>
${fi(f, s + "r", "Completion or evidence rule", { max: 200, ph: PW_RULE_DEF })}
<details class="pw-ed-more" data-open="${f + i}" ${open ? "open" : ""}><summary><span>${lean ? "Review and dependencies" : "Conditions, timing and review"}</span>${n ? `<span class="pill p-teal">${n} set</span>` : '<span class="cap">Optional</span>'}${ic("chev", 14)}</summary><div class="pw-ed-body">
${
  lean
    ? PW_LEAN_HIDE.map((k) => `<input type="hidden" name="${s + k}" value="${h(d[s + k] || "")}">`).join("")
    : `<div class="pw-ed-grid">${fi(f, s + "w", "Applies when (Conditional only)", { type: "select", opts: pwWhenOpts() })}${fi(f, s + "c", "Yes / no question", { max: 200, ph: "e.g. Will you run sessions outdoors?" })}${fi(f, s + "fr", "Available from", { type: "date" })}${fi(f, s + "cs", "Needs an optional permission", { type: "select", opts: [["", "None"], ...OPT_PURPOSES.map(([k, l]) => [k, l])] })}</div>
<p class="help pw-ed-note">Conditions are stored, testable rules — never decided by AI. A permission holds back only this step; the rest of the pathway is unaffected.</p>`
}
<div class="pw-ed-checks">${fi(f, s + "rv", "Requires evidence review (a Reviewer approves completion)", { type: "checkbox" })}${fi(f, s + "pe", "May be satisfied by prior evidence (a Reviewer confirms it)", { type: "checkbox" })}</div>
${pre.length ? `<div class="pw-ed-deps"><span class="lbl">Depends on</span><div class="pw-ed-grid">${pre.join("")}</div></div>` : ""}
</div></details></div>`;
  }
  out += rows < PW_ROWS ? `<div class="pw-ed-add">${B(ic("plus", 14) + "Add step " + (rows + 1), "pwRowAdd", { f, n: rows + 1 }, "btn-s btn-sm")}<span class="cap">Up to ${PW_ROWS} steps.</span></div>` : `<p class="cap pw-ed-add">${PW_ROWS} steps is the maximum.</p>`;
  return out + `</section>`;
}
// Rows are added and removed in place. render() builds the page before it reads the form back, so each handler
// takes the snapshot first to keep everything typed so far.
A.pwRowAdd = (d) => {
  snapForms();
  UI.form[d.f] = { ...(UI.form[d.f] || {}), _rows: Math.min(PW_ROWS, +d.n) };
  (UI.pwOpen = UI.pwOpen || {})[d.f + (+d.n - 1)] = undefined;
  render();
  setTimeout(() => document.getElementById(d.f + "_s" + (+d.n - 1) + "t")?.focus(), 0);
};
A.pwRowRm = (d, el) => {
  // clear the row in the page first: render() reads the form back from the page
  el.closest(".pw-ed-step").querySelectorAll("input,select,textarea").forEach((x) => (x.type === "checkbox" ? (x.checked = false) : (x.value = x.tagName === "SELECT" && x.name.endsWith("ty") ? "Mandatory" : "")));
  snapForms();
  UI.form[d.f] = { ...(UI.form[d.f] || {}), _rows: Math.max(PW_MIN, +d.i) };
  if (UI.err[d.f]) Object.keys(UI.err[d.f]).forEach((k) => k.startsWith("s" + d.i) && delete UI.err[d.f][k]);
  render();
};
// Choosing Conditional opens the step's rules panel.
A.pwTy = (d, el) => {
  const m = /^s(\d+)ty$/.exec(el.name);
  const f = el.form && el.form.dataset.f;
  if (m && f && el.value === "Conditional") (UI.pwOpen = UI.pwOpen || {})[f + m[1]] = true;
  snapForms();
  render();
};
// The rules panel stays as the person left it across re-renders.
document.addEventListener(
  "toggle",
  (e) => {
    const k = e.target && e.target.dataset && e.target.dataset.open;
    if (k) (UI.pwOpen = UI.pwOpen || {})[k] = e.target.open;
  },
  true,
);
// Validation rules for the step rows (merged into the form's other rules).
function pwStepRules(d, o = {}) {
  const n = [...Array(PW_ROWS).keys()].filter((i) => (d["s" + i + "t"] || "").trim()).length;
  const r = { s0t: [["fn", { f: () => n >= 3 && n <= 5, m: "Enter 3 to 5 steps." }]] };
  for (let i = 0; i < PW_ROWS; i++) {
    if (!(d["s" + i + "t"] || "").trim() || d["s" + i + "ty"] !== "Conditional") continue;
    if (o.lean && !d["s" + i + "w"]) {
      r["s" + i + "ty"] = [["fn", { f: () => false, m: "A Conditional step needs a rule for when it applies, which this form does not set. Choose Mandatory or Optional, or start from a template that already has the condition." }]];
      continue;
    }
    r["s" + i + "w"] = [["req", "Choose the rule that decides when this Conditional step applies."]];
    if (d["s" + i + "w"] === "ask") r["s" + i + "c"] = [["req", "Write the yes/no question."]];
    if (d["s" + i + "w"] === "after" && ![...Array(i).keys()].some((j) => ["yes", "done"].includes(d["s" + i + "p" + j])))
      r["s" + i + "w"] = [["fn", { f: () => false, m: "Choose the steps it depends on below." }]];
  }
  return r;
}
function pwStepsRead(d) {
  const rows = [...Array(PW_ROWS).keys()].filter((i) => (d["s" + i + "t"] || "").trim());
  return rows.map((i) => {
    const type = PW_TYPES.includes(d["s" + i + "ty"]) ? d["s" + i + "ty"] : "Mandatory";
    const deps = rows.filter((j) => j < i && ["yes", "done"].includes(d["s" + i + "p" + j]));
    const preDone = deps.filter((j) => d["s" + i + "p" + j] === "done").map((j) => rows.indexOf(j));
    const when = type === "Conditional" ? d["s" + i + "w"] || "" : "";
    return {
      t: d["s" + i + "t"].trim(),
      type,
      pre: deps.map((j) => rows.indexOf(j)),
      ...(preDone.length ? { preDone } : {}),
      rule: (d["s" + i + "r"] || "").trim() || PW_RULE_DEF,
      ...(when ? { when } : {}),
      ...(when === "ask" ? { cond: (d["s" + i + "c"] || "").trim() } : {}),
      ...(d["s" + i + "fr"] ? { from: d["s" + i + "fr"] } : {}),
      ...(d["s" + i + "rv"] === "yes" ? { review: true } : {}),
      ...(d["s" + i + "pe"] === "yes" ? { prior: true } : {}),
      ...(d["s" + i + "cs"] ? { consent: d["s" + i + "cs"] } : {}),
      done: false,
    };
  });
}
const pwStepsSig = (steps) => JSON.stringify(steps.map((s) => [s.t, ...pwMatSig1(s)]));
// Material = anything that changes what the participant must do. Rewording a step title is not material.
const pwMatSig1 = (s) => [s.type, s.pre || [], s.preDone || [], s.rule, s.when || "", s.when === "ask" ? s.cond || "" : "", s.from || "", s.consent || "", !!s.review, !!s.prior];
const pwMaterialSig = (steps) => JSON.stringify(steps.map(pwMatSig1));
// Read-only preview of a template's steps (mode 1 proposals).
const pwTplPreview = (tpl) => (tpl ? pwStepsList({ steps: pwStepsFromTpl(tpl), state: "Draft", pid: "" }, false) : "");
// ---- migration: older pathways get step rules; a step completed before its prerequisites is re-opened and its
// earlier completion record kept (it was possible to complete steps in any order before).
function profileMigrate() {
  const sd = seed();
  // Recommend Pathways: template versions, the seeded recommendation example and requests, recommendation fields,
  // and "Proposed to participant" renamed "Recommended".
  const cp = (x) => JSON.parse(JSON.stringify(x));
  S.pwReqs = S.pwReqs || cp(sd.pwReqs || []);
  sd.templates.forEach((t) => {
    if (!byId("templates", t.id)) S.templates.push(cp(t));
  });
  S.templates.forEach((t) => (t.ver = t.ver || 1));
  sd.pathways.forEach((r) => {
    if (!byId("pathways", r.id) && byId("people", r.pid)) S.pathways.push(cp(r));
  });
  // WSS clarification 5: free-text conditions become explicit rules; a participant's earlier "applies / does not
  // apply" choice becomes a recorded answer.
  const whenOf = (t) => (/minor|under 18|child/i.test(t || "") ? "fact:minors" : /ready|facilitator agrees|after steps/i.test(t || "") ? "after" : "ask");
  S.templates.forEach((t) => (t.rules || []).forEach((r) => r.type === "Conditional" && !r.when && (r.when = whenOf(r.cond))));
  S.pathways.forEach((p) => {
    p.steps.forEach((st, i) => {
      if (st.type !== "Conditional" || st.when) return;
      st.when = whenOf(st.cond);
      if (st.when !== "ask") delete st.cond;
      const k = pwFactKey(st, i);
      p.facts = p.facts || {};
      if (st.applies) p.facts[k] = { v: "yes", by: p.pid, at: st.doneAt || now() };
      else if (st.st === "Not applicable") p.facts[k] = { v: "no", by: p.pid, at: st.stAt || now() };
      delete st.applies;
    });
  });
  // Rule kinds without a source in the client documents are retired: "identifiable people" becomes the step's own
  // yes/no question (answer kept); "Facilitator confirmed readiness" becomes "Conditional on" its dependency steps.
  const retire = (st, i, facts) => {
    if (st.when === "fact:identifiable") {
      st.when = "ask";
      st.cond = "Does your reflection or evidence quote identifiable people (interview notes, testimony or photos)?";
      if (facts && facts.identifiable) (facts["ask" + i] = facts.identifiable), delete facts.identifiable;
    } else if (st.when === "fact:ready") {
      st.when = "after";
      if (facts) delete facts.ready;
    }
    delete st.priorReview;
    delete st.evKeys;
  };
  S.templates.forEach((t) => (t.rules || []).forEach((r, i) => retire(r, i, null)));
  S.pathways.forEach((p) => p.steps.forEach((st, i) => retire(st, i, p.facts)));
  // design fields added later (permission a step needs): copy from the seed where the step matches
  const fill = (st, r) => r && st.t === r.t && ["consent"].forEach((k) => st[k] == null && r[k] != null && (st[k] = cp(r[k])));
  S.templates.forEach((t) => {
    const r = sd.templates.find((x) => x.id === t.id);
    if (r) (t.rules || []).forEach((x, i) => r.rules && r.rules[i] && ["consent"].forEach((k) => x[k] == null && r.rules[i][k] != null && (x[k] = cp(r.rules[i][k]))));
  });
  S.pathways.forEach((p) => {
    const r = sd.pathways.find((x) => x.id === p.id);
    if (r) p.steps.forEach((st, i) => fill(st, r.steps[i]));
  });
  sd.evidence.filter((e) => e.id === "ev6").forEach((e) => !byId("evidence", e.id) && byId("people", e.owner) && S.evidence.push(cp(e)));
  // Facilitator / Circle Steward recommendations no longer wait for a Reviewer: any still queued go to the participant.
  S.pathways.forEach((p) => {
    if (!pwDirect(p) || !["Awaiting reviewer", "In review", "Clarification requested"].includes(p.state)) return;
    Object.assign(p, { state: PW_REC, reviewer: null, reviewNote: "" });
    (p.activity = p.activity || []).push({ at: now(), by: null, t: "Sent directly to the participant (the Reviewer step for Facilitator recommendations was removed)" });
  });
  // requests answered before their status followed the participant's decision
  (S.pwReqs || []).forEach((q) => {
    const p = q.status === "Answered" && byId("pathways", q.pathway);
    if (p) q.status = p.state === "Declined" ? "Rejected" : p.acceptedAt ? "Accepted" : p.state === PW_REC ? "Recommended" : p.partChange ? "Changes requested" : "With reviewer";
  });
  S.pathways.forEach((p) => {
    if (p.state === "Proposed to participant") p.state = PW_REC;
    const ref = sd.pathways.find((x) => x.id === p.id);
    ["byRole", "reason", "tplVer"].forEach((k) => {
      if (p[k] == null && ref && ref[k] != null) p[k] = ref[k];
    });
  });
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
        if (s.done && (s.pre || []).some((j) => p.steps[j] && !pwClosed(p.steps[j]))) {
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
    (hasB("Reviewer") && !p.reviewer && ["Awaiting reviewer", "In review", "Draft"].includes(p.state)));
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
        ? "Reviewer (approver)"
        : pid === p.pid
          ? "Participant"
          : ctxAdmins(p.ctx).includes(pid)
            ? "Organization Admin"
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
// ---- Recommend Pathways (WSS clarification 1). A recommendation is an action over the pathway system, not a third
// pathway engine. Unchanged approved template → straight to the participant; adaptation within the template's rules →
// straight to the participant; custom, AI-drafted or outside the rules → an authorised Reviewer first. In every case
// the participant accepts the version that becomes current.
const PW_REC = "Recommended";
const tplVer = (t) => (t && t.ver) || 1;
const PW_MODE = {
  template: "1 · Pre-approved template",
  adapted: "2 · Adapted pathway",
  outside: "2 · Adapted pathway (outside template rules)",
  custom: "3 · AI or custom pathway",
};
// Facilitators / Circle Stewards recommend to participants in their context; Mentors only to participants in their Rope Teams.
const pwCanRecommend = (pid) =>
  ["F", "M"].includes(role()) &&
  !!pid &&
  pid !== myId() &&
  S.assign.some((a) => a.pid === pid && a.ctx === ctxId() && roleBase(a.role) === "P" && a.status === "Active") &&
  (role() === "F" || myRopes().some((rt) => memberOf(rt, pid)));
// Circles this person stewards that the participant belongs to; a recommendation can be connected to one.
const pwStewardCircles = (pid) => (role() === "F" ? S.circles.filter((c) => inCtx(c) && c.facilitator === myId() && memberOf(c, pid)) : []);
// Assumed rule (adaptation envelope): every Mandatory template step is kept with the same wording and still Mandatory;
// Optional and Conditional steps may be added, removed or reworded; 3–5 steps in total (checked by the step editor).
function pwEnvelope(tpl, steps) {
  if (!tpl) return { ok: false, why: ["it is not based on an approved template"] };
  const key = (t) => String(t || "").trim().toLowerCase();
  const why = pwStepsFromTpl(tpl)
    .filter((m) => m.type === "Mandatory" && !steps.some((s) => (key(s.t) === key(m.t) || key(s.tplT) === key(m.t)) && s.type === "Mandatory"))
    .map((m) => `the Mandatory step “${m.t}” was removed, reworded or made optional`);
  return { ok: !why.length, why };
}
const pwUnchanged = (tpl, steps) => !!tpl && pwStepsSig(steps) === pwStepsSig(pwStepsFromTpl(tpl));
// → template | adapted | outside | custom. Only template and adapted skip the Reviewer.
const pwRoute = (tpl, steps, custom) => (custom || !tpl ? "custom" : pwUnchanged(tpl, steps) ? "template" : pwEnvelope(tpl, steps).ok ? "adapted" : "outside");
const pwSkipsReview = (route) => route === "template" || route === "adapted";
// A Facilitator or Circle Steward's recommendation goes straight to the participant on every route: no Reviewer and no
// Organization Admin step. Mentor recommendations and a participant's own pathways still go to a Reviewer.
const pwDirect = (p) => !!p && p.by !== p.pid && p.byRole !== "Mentor";
const pwSends = (p, route) => pwSkipsReview(route) || pwDirect(p);
// The request a recommendation answered follows it: Recommended → Accepted / Rejected / Changes requested.
const PW_REQ_C = { Open: "p-amber", Recommended: "p-blue", "With reviewer": "p-grey", "Changes requested": "p-amber", Accepted: "p-green", Rejected: "p-red", Withdrawn: "p-grey", Answered: "p-green" };
function pwReqSet(p, status) {
  const q = p.req && byId("pwReqs", p.req);
  if (q && q.status !== "Withdrawn") Object.assign(q, { status, decidedAt: now() });
}
// Authorised reviewers: active Reviewer-bundle holders in the pathway's context, never its author or participant.
// Pathways go to this shared queue; the Organization Admin steps in only when nobody can review.
const pwReviewers = (p) =>
  [...new Set(S.assign.filter((a) => a.ctx === p.ctx && a.status === "Active" && (a.bundles || []).includes("Reviewer") && a.pid !== p.by && a.pid !== p.pid).map((a) => a.pid))];
const pwCanReview = (p) => !!p && (p.reviewer ? p.reviewer === myId() : p.state === "Awaiting reviewer" && hasB("Reviewer") && pwReviewers(p).includes(myId()));
function pwToQueue(p) {
  p.submitted = p.submitted || today();
  if (p.reviewer) {
    p.state = "In review";
    return notify(p.reviewer, "Pathway awaiting your review: " + p.name + " (" + me().name + ")", "pathway");
  }
  p.state = "Awaiting reviewer";
  const rv = pwReviewers(p);
  if (rv.length) rv.forEach((x) => notify(x, "Pathway waiting in the review queue: “" + p.name + "” from " + me().name, "pathway"));
  else ctxAdmins(p.ctx).forEach((a) => notify(a, "No Reviewer is available for the pathway “" + p.name + "”. Grant the Reviewer bundle or assign a reviewer.", "admin", { tab: "requests" }));
}
const pwRoleLine = (p) => nm(p.by) + (p.byRole ? " — " + h(p.byRole) : "");
// What the participant sees on a recommendation: who, in what role, why, and which template version.
function pwRecInfo(p) {
  const t = p.tpl && byId("templates", p.tpl);
  const c = p.circle && byId("circles", p.circle);
  return dl([
    ["Recommended by", pwRoleLine(p)],
    ["Why", p.reason ? h(p.reason) : "—"],
    t && ["Template", h(t.name) + " · version " + (p.tplVer || tplVer(t)) + " · " + h(p.mode.replace(/^\d · /, ""))],
    !t && ["Type", h(p.mode) + (p.reviewer ? " · approved by " + nm(p.reviewer) : "")],
    c && ["Circle", h(c.name)],
  ]);
}
F.pp = (d) => {
  const rules = { reason: ["req", ["min", 10]] };
  if (d.mode !== "3") rules.tpl = ["req"];
  else rules.name = ["req"];
  if (d.mode !== "1") Object.assign(rules, pwStepRules(d));
  if (!validate("pp", d, rules)) return render();
  const tpl = byId("templates", d.tpl);
  const steps = d.mode === "1" ? pwStepsFromTpl(tpl) : pwStepsRead(d);
  const route = pwRoute(d.mode === "3" ? null : tpl, steps, d.mode === "3");
  const circle = pwStewardCircles(d.pid).find((c) => c.id === d.circle);
  const p = {
    id: uid("pw"),
    pid: d.pid,
    ctx: ctxId(),
    name: route === "custom" ? d.name.trim() : tpl.name + (route === "template" ? "" : " (adapted)"),
    tpl: route === "custom" ? null : tpl.id,
    tplVer: route === "custom" ? null : tplVer(tpl),
    mode: PW_MODE[route],
    state: PW_REC,
    by: myId(),
    byRole: role() === "M" ? "Mentor" : circle ? "Circle Steward" : "Facilitator",
    reason: d.reason.trim(),
    circle: circle ? circle.id : null,
    req: d.req || null,
    proposedAt: now(),
    steps,
    activity: [],
  };
  pwLog(
    p,
    route === "template"
      ? `Recommended the approved template “${tpl.name}” v${p.tplVer} unchanged (no review needed)`
      : route === "adapted"
        ? `Adapted the approved template “${tpl.name}” v${p.tplVer} within its rules and recommended it`
        : route === "outside"
          ? `Adapted the approved template “${tpl.name}” v${p.tplVer} outside its rules (${pwEnvelope(tpl, steps).why.join("; ")}) — ${pwDirect(p) ? "sent directly to the participant" : "sent for Reviewer approval"}`
          : "Drafted a custom pathway (mode 3) — " + (pwDirect(p) ? "sent directly to the participant" : "sent for Reviewer approval"),
  );
  S.pathways.push(p);
  const sent = pwSends(p, route);
  if (sent) notify(d.pid, `${me().name} (${p.byRole}) recommends a pathway: ${p.name}. Review it, then accept or reject it.`, "pathway");
  else pwToQueue(p);
  const rq = d.req && byId("pwReqs", d.req);
  if (rq && rq.status === "Open") Object.assign(rq, { status: sent ? "Recommended" : "With reviewer", by: myId(), pathway: p.id, answeredAt: now() });
  audit("Pathway recommended", p.id, p.mode + " · " + p.byRole);
  clearF("pp");
  UI.modal = null;
  toast(sent ? "Recommended. " + nm(d.pid) + " can now accept or reject it." : "Sent to an authorised Reviewer. " + nm(d.pid) + " sees it after approval.");
  ok();
};
// ---- A participant asks for a recommendation: any Facilitator / Circle Steward in the programme, or a named one,
// or the mentor of one of their Rope Teams. Answering it is a normal recommendation.
const pwFacs = () => [...new Set(S.assign.filter((a) => a.ctx === ctxId() && roleBase(a.role) === "F" && a.status === "Active" && a.pid !== myId()).map((a) => a.pid))];
const pwMyMentors = () => [...new Set(myRopes().map((rt) => rt.mentor).filter((x) => x && x !== myId()))];
const pwAskTo = () => [["any", "Any Facilitator or Circle Steward in this programme"], ...pwFacs().map((x) => [x, P(x).name + " · Facilitator / Steward"]), ...pwMyMentors().map((x) => [x, P(x).name + " · your Rope Team mentor"])];
const pwReqTo = (q) => (q.to === "any" ? "any Facilitator or Circle Steward" : P(q.to).name);
// Open requests this Facilitator / Mentor can answer.
const pwReqsForMe = () => (S.pwReqs || []).filter((q) => inCtx(q) && q.status === "Open" && (q.to === myId() || (q.to === "any" && role() === "F")) && pwCanRecommend(q.pid));
A.pwAsk = () => {
  clearF("pwa");
  const cp = (S.compass || {})[myId()] || {};
  UI.form.pwa = { goal: cp.PC2 || "", to: "any" };
  modal(
    "Request a pathway recommendation",
    () =>
      `<form data-f="pwa" class="col pf-form" novalidate>${errSum("pwa")}${fi("pwa", "goal", "What do you want to be able to do?", { type: "textarea", rows: 3, req: true, max: 600, help: "Filled in from your Purpose Compass goal if you set one. Only the people you send it to see it." })}${fi("pwa", "to", "Send to", { type: "select", opts: pwAskTo() })}${banner("info", "", "A recommendation never becomes your pathway on its own. You accept it, ask for changes or decline it.")}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">Send request</button></div></form>`,
  );
};
F.pwa = (d) => {
  if (!validate("pwa", d, { goal: ["req", ["min", 10]] })) return render();
  const q = { id: uid("pq"), pid: myId(), ctx: ctxId(), goal: d.goal.trim(), to: d.to || "any", status: "Open", at: now() };
  (S.pwReqs = S.pwReqs || []).push(q);
  (q.to === "any" ? pwFacs() : [q.to]).forEach((x) => notify(x, me().name + " asks for a pathway recommendation: “" + q.goal + "”", "pathway"));
  audit("Pathway recommendation requested", q.id, q.to);
  UI.modal = null;
  clearF("pwa");
  toast("Request sent to " + pwReqTo(q) + ".");
  ok();
};
A.pwAskWithdraw = (d) => {
  const q = byId("pwReqs", d.id);
  q.status = "Withdrawn";
  q.closedAt = now();
  audit("Pathway recommendation request withdrawn", q.id, "");
  toast("Request withdrawn.");
  ok();
};
// Participant: their requests and what came of them.
function pwMyReqsCard() {
  const mine = (S.pwReqs || []).filter((q) => q.pid === myId() && inCtx(q)).sort((a, b) => String(b.at).localeCompare(String(a.at)));
  if (!mine.length) return "";
  return (
    card(
      "Your recommendation requests <span class=\"adm-n\">" + mine.filter((q) => q.status === "Open").length + "</span>",
      "",
      table(
        ["Asked", "Sent to", "Status", ""],
        mine.map((q) => {
          const pw = q.pathway && byId("pathways", q.pathway);
          return [
            `“${h(q.goal)}”<span class="pw-why">${fmt(q.at)}</span>`,
            h(pwReqTo(q)),
            pill(q.status, PW_REQ_C[q.status]) + (pw ? `<span class="pw-why">${h(pw.name)} · ${pwRoleLine(pw)}</span>` : ""),
            q.status === "Open" ? B("Withdraw", "pwAskWithdraw", { id: q.id }, "btn-g btn-sm") : "",
          ];
        }),
      ),
      "",
      "pf-dv",
    ) + '<div class="pf-gap"></div>'
  );
}
// Facilitator / Circle Steward / Mentor: open requests addressed to them.
function pwReqsCard() {
  if (!["F", "M"].includes(role())) return "";
  const qs = pwReqsForMe();
  if (!qs.length) return "";
  return (
    card(
      "Recommendation requests <span class=\"adm-n\">" + qs.length + "</span>",
      "Participants asking for a pathway. Recommend one; they decide whether to accept it.",
      table(
        ["Participant", "What they want to be able to do", "Asked", ""],
        qs.map((q) => [nm(q.pid), h(q.goal), fmt(q.at) + (q.to === "any" ? '<span class="pw-why">Sent to any Facilitator or Circle Steward</span>' : ""), B("Recommend pathway", "proposePathway", { pid: q.pid, req: q.id }, "btn-p btn-sm")]),
      ),
      "",
      "pf-dv",
    ) + '<div class="pf-gap"></div>'
  );
}
A.draftPathway = (d) => {
  UI.form.pp = { pid: d.pid, mode: "3", ...pwStepsToForm([]) };
  modal(
    "Draft your own pathway",
    () =>
      `<form data-f="pp" class="col pf-form" novalidate>${errSum("pp")}<input type="hidden" name="pid" value="${d.pid}"><input type="hidden" name="mode" value="3">${fi("pp", "name", "Pathway name", { req: true })}${pwStepFields("pp")}${banner("info", "", "Custom pathways are approved by an authorised Reviewer in this programme.")}<div class="actions"><span></span><button class="btn btn-p" type="submit">Submit for review</button></div></form>`, true,
  );
};
// ---- A participant creates and submits a pathway; the Organization Admin assigns a reviewer (Steward or
// Faculty), who approves it, rejects it or asks for changes; the participant updates and resubmits.
const PW_SUBMITTED = ["Awaiting reviewer", "In review", "Clarification requested", "Rejected"];
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
  const mine = list.filter((p) => p.by === myId() && PW_SUBMITTED.includes(p.state));
  if (!mine.length) return "";
  const where = (p) =>
    p.state === "Awaiting reviewer"
      ? pwReviewers(p).length
        ? "In the review queue — an authorised Reviewer in this programme picks it up"
        : "Waiting for a Reviewer — the Organization Admin has been told none is available"
      : p.state === "In review"
        ? "With " + nm(p.reviewer) + " for review"
        : p.state === "Clarification requested"
          ? "Clarification requested by " + nm(p.reviewer) + " — reply in the conversation, or update and resubmit"
          : "Rejected by " + nm(p.reviewer);
  return (
    card(
      "Pathways you submitted <span class=\"adm-n\">" + mine.length + "</span>",
      "Reviewed by an authorised Reviewer in this programme.",
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
  // Your own reviews plus the shared queue every authorised Reviewer in the programme sees.
  const mine = S.pathways.filter((p) => inCtx(p) && ((p.reviewer === myId() && ["In review", "Clarification requested"].includes(p.state)) || (!p.reviewer && pwCanReview(p))));
  if (!mine.length && !hasB("Reviewer")) return "";
  return (
    card(
      "Pathways waiting for your review <span class=\"adm-n\">" + mine.length + "</span>",
      "Custom pathways, and adaptations outside a template’s rules, from participants and Mentors come here without Organization Admin assignment. Facilitator and Circle Steward recommendations go straight to the participant and never come here. Approving a pathway someone recommended sends it to the participant to accept; a participant’s own pathway becomes current. Pathways waiting on the creator stay here until they are resubmitted.",
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
          extra: (p.reason ? `<p class="pw-note">Why it is recommended: ${h(p.reason)}</p>` : "") + (p.note ? `<p class="pw-note">Creator’s note: ${h(p.note)}</p>` : ""),
          badges: p.state === "Clarification requested" ? pill("Waiting for the creator", "p-amber") : p.reviewer ? pill("In review") : pill("Review queue", "p-amber"),
          primary:
            B(ic("message", 14) + "Conversation" + (convoN(p) ? " (" + convoN(p) + ")" : ""), "pwActivity", { id: p.id }) +
            B("Reject", "pwDec", { id: p.id, v: "Rejected" }) +
            (p.state !== "Clarification requested" ? B("Request clarification", "pwDec", { id: p.id, v: "Clarification requested" }) + B("Approve", "pwDec", { id: p.id, v: "Current" }, "btn-p btn-sm") : ""),
          wrap: true,
        }),
        empty: ["check", "Nothing to review", "Custom pathways in this programme appear here for any authorised Reviewer.", ""],
      }),
      "",
      "pf-dv",
    ) + '<div class="pf-gap"></div>'
  );
}
// ---- the creator edits a pathway until it is approved or accepted, and only while no step has been completed
const PW_EDITABLE = ["Awaiting reviewer", "In review", "Clarification requested", "Draft", "Proposed to participant"];
const pwEditable = (p) => !!p && p.by === myId() && PW_EDITABLE.includes(p.state) && !p.steps.some((s) => s.done);
// Why the creator-only edit rule does not allow editing this pathway now (shown instead of a missing action).
const pwEditWhy = (p) =>
  p.by !== myId()
    ? "only " + P(p.by).name + ", who created it, edits it"
    : p.steps.some((s) => s.done)
      ? "a step is already completed"
      : p.state === PW_REC
        ? "it is with the participant, who can accept it or ask for changes"
        : "not editable while " + String(p.state).toLowerCase();
// Choose which of a participant's pathways an action applies to (Edit pathway or Conversation & activity).
// The current pathway comes first; a pathway the action cannot be used on is listed disabled with the reason.
A.pwPick = (d) => {
  const edit = d.v === "edit";
  const ls = S.pathways
    .filter((x) => x.pid === d.pid && inCtx(x) && (edit || pwCanView(x)))
    .sort((a, b) => (b.state === "Current") - (a.state === "Current") || String(b.proposedAt || "").localeCompare(String(a.proposedAt || "")));
  const st = (x) => (x.state === "Draft" && x.changeReq ? "Change requested" : x.state);
  const ok = (x) => (edit ? pwEditable(x) : pwCanView(x));
  modal(
    (edit ? "Edit pathway" : "Conversation & activity") + " · " + nm(d.pid),
    () =>
      `<div class="col pw-pick-w"><p class="cap">${edit ? "Choose the pathway to edit. Only pathways you created, before they are accepted or a step is completed, can be edited." : "Choose the pathway whose conversation and activity you want to open."}</p><ul class="pw-pick">${ls
        .map((x) => {
          const body = `<span class="pw-pick-t"><b>${h(x.name)}</b><span class="cap">${h(x.mode || "")} · created by ${nm(x.by)}${convoN(x) ? " · " + convoN(x) + " message" + (convoN(x) > 1 ? "s" : "") : ""}</span>${ok(x) ? "" : `<span class="cap pw-pick-why">${ic("lock", 13)}Not available: ${h(pwEditWhy(x))}</span>`}</span><span class="pw-pick-s">${pill(st(x))}</span>`;
          return `<li>${ok(x) ? `<button type="button" class="pw-pick-i" data-a="${edit ? "pwEdit" : "pwActivity"}" data-id="${x.id}" data-from="${h(d.pid)}" data-fv="${h(d.v)}">${body}${ic("chevr", 16)}</button>` : `<div class="pw-pick-i is-off" aria-disabled="true">${body}</div>`}</li>`;
        })
        .join("")}</ul><div class="actions">${B("Cancel", "closeM")}<span></span></div></div>`,
  );
};
// Clicking a pathway name: edit it when permitted, otherwise open its details and say why it is read-only.
A.pwOpen = (d) => {
  const x = byId("pathways", d.id);
  if (pwEditable(x)) return A.pwEdit({ id: x.id, from: x.pid, fv: "edit" });
  A.pwActivity({ id: x.id, from: x.pid, fv: "talk", why: pwEditWhy(x) });
};
// From Edit pathway to its Conversation & activity: unsaved edits are kept for the way back.
A.pwEditTalk = (d) => {
  snapForms();
  A.pwActivity({ id: d.id, back: "edit", from: d.from || "", fv: d.fv || "" });
};
const pwEditBtn = (p) => (pwEditable(p) ? B(ic("edit", 14) + "Edit", "pwEdit", { id: p.id }) : "");
A.pwEdit = (d) => {
  const p = byId("pathways", d.id);
  // Coming back from this pathway's conversation keeps the unsaved edits; any other opening starts from the saved pathway.
  if (!(d.keep && UI.pweFor === p.id && UI.form.pwe)) {
    clearF("pwe");
    UI.form.pwe = { name: p.name, ...pwStepsToForm(p.steps), note: "" };
  }
  UI.pweFor = p.id;
  const from = d.from || "";
  const fv = d.fv || "";
  modal(
    "Edit pathway · " + h(p.name),
    () =>
      // Same sections and sticky action bar as Create pathway (pwForm).
      `<form data-f="pwe" class="col pf-form pw-form" novalidate>${errSum("pwe")}<input type="hidden" name="id" value="${p.id}">
<div class="pw-ed-nav">${from ? B(ic("chevl", 14) + "All pathways for " + nm(from), "pwPick", { pid: from, v: fv || "edit" }, "btn-g btn-sm") : "<span></span>"}${pwCanView(p) ? B(ic("message", 14) + "Conversation & activity" + (convoN(p) ? ` <span class="cnt">${convoN(p)}</span>` : ""), "pwEditTalk", { id: p.id, from, fv }, "btn-s btn-sm") : ""}</div>
<section class="pw-sec" aria-labelledby="pwe_about_h"><h3 class="h3" id="pwe_about_h">About this pathway</h3><div class="pw-top">${fi("pwe", "name", "Pathway name", { req: true, max: 120 })}</div>${banner("info", "", "For " + nm(p.pid) + ". Editing keeps the pathway’s current state (" + h(p.state) + "). Everyone involved is told it changed.")}</section>
<section class="pw-sec">${pwStepFields("pwe")}</section>
<section class="pw-sec">${fi("pwe", "note", "What you changed (optional)", { type: "textarea", rows: 2, max: 2000, help: "Added to the pathway conversation." })}</section>
<div class="actions pw-acts">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">Save changes</button></div></form>`, true,
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
  const info =
    !p && tpl
      ? banner(
          "info",
          "Approved template " + h(tpl.name) + " · v" + tplVer(tpl),
          "Kept unchanged, it becomes your current pathway straight away — no review needed." +
            (pwCur() ? " Your current pathway “" + h(pwCur().name) + "” is kept in your history as Superseded." : "") +
            " If you change any step, it goes to an authorised Reviewer first.",
        )
      : banner("info", "", "An authorised Reviewer in this programme approves your pathway. It becomes current when they approve it.");
  return `<form data-f="pwn" class="col pf-form pw-form" novalidate>${errSum("pwn")}<input type="hidden" name="id" value="${p ? p.id : ""}">${p && p.reviewNote ? banner("warn", "Clarification requested by " + nm(p.reviewer), h(p.reviewNote)) : ""}
<section class="pw-sec" aria-labelledby="pwn_about_h"><h3 class="h3" id="pwn_about_h">About this pathway</h3><div class="${p ? "" : "f2 "}pw-top">${p ? "" : fi("pwn", "src", "Start from", { type: "select", opts: [["custom", "My own steps"], ...tpls.map((t) => [t.id, "Template: " + t.name])], ch: "pwnSrc" })}${fi("pwn", "name", "Pathway name", { req: true, max: 120, value: p ? p.name : tpl ? tpl.name : "", ph: "e.g. Community facilitation foundations" })}</div>${info}</section>
<section class="pw-sec">${pwStepFields("pwn", { lean: true })}</section>
<section class="pw-sec">${fi("pwn", "note", p ? "Your response and what you changed" : "Note for the reviewer (optional)", { type: "textarea", rows: 3, req: !!p, max: 2000, help: p ? "Added to the review conversation." : "Anything the reviewer should know, such as why you chose these steps." })}</section>
<div class="actions pw-acts">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">${p ? "Resubmit for review" : tpl ? "Start this pathway" : "Submit for review"}</button></div></form>`;
}
const pwCur = (pid = myId()) => S.pathways.find((x) => x.pid === pid && x.ctx === ctxId() && x.state === "Current");
A.pwNew = () => {
  clearF("pwn");
  modal("Create a pathway", () => pwForm(null), true);
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
  modal("Update and resubmit", () => pwForm(p), true);
};
F.pwn = (d) => {
  const p0 = d.id && byId("pathways", d.id);
  if (!validate("pwn", d, { name: ["req"], ...pwStepRules(d, { lean: true }), ...(p0 ? { note: ["req"] } : {}) })) return render();
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
    const asIs = tpl && tpl.status === "Approved" && pwUnchanged(tpl, steps);
    const p = {
      id: uid("pw"),
      pid: myId(),
      ctx: ctxId(),
      name: d.name.trim(),
      tpl: tpl ? tpl.id : null,
      tplVer: tpl ? tplVer(tpl) : null,
      mode: asIs ? PW_MODE.template : tpl ? "Based on template “" + tpl.name + "”" : "Custom pathway",
      state: "Awaiting reviewer",
      by: myId(),
      byRole: "Participant",
      reviewer: null,
      proposedAt: now(),
      note: (d.note || "").trim(),
      steps,
      activity: [],
    };
    S.pathways.push(p);
    if (asIs) {
      // An approved template chosen unchanged by the participant: choosing it is the acceptance; no review.
      const cur = pwCur();
      if (cur) {
        cur.state = "Superseded";
        pwLog(cur, "Superseded when “" + p.name + "” was started");
      }
      Object.assign(p, { state: "Current", acceptedAt: now(), acceptedBy: myId() });
      pwLog(p, "Chose the approved template “" + tpl.name + "” v" + p.tplVer + " unchanged — it became current (no review needed)");
      audit("Pathway started from template", p.id, tpl.id + " v" + p.tplVer);
      toast("Started. “" + p.name + "” is now your current pathway.");
    } else {
      pwLog(p, "Created and submitted for review" + (tpl ? " (changed from the template “" + tpl.name + "”)" : ""));
      pwToQueue(p);
      audit("Pathway submitted", p.id, p.mode);
      toast(pwReviewers(p).length ? "Submitted to the review queue. An authorised Reviewer will pick it up." : "Submitted. No Reviewer is available yet; the Organization Admin has been told.");
    }
  }
  UI.modal = null;
  clearF("pwn");
  ok();
};
// ---- Optional: the Organization Admin assigns (or changes) a named reviewer. Not needed for the normal flow —
// pathways go to the shared Reviewer queue. Candidates: Reviewer-bundle holders and Facilitators / Stewards.
const pwStewards = (p) =>
  S.assign
    .filter((a) => a.ctx === p.ctx && a.status === "Active" && a.pid !== p.by && a.pid !== p.pid && (roleBase(a.role) === "F" || (a.bundles || []).includes("Reviewer")))
    .filter((a, i, all) => all.findIndex((b) => b.pid === a.pid) === i);
// Needs the Organization Admin only when nobody can pick it up.
const pwNeedsSteward = (p) => (p.state === "Awaiting reviewer" && !pwReviewers(p).length) || (p.state === "In review" && !p.reviewer);
A.pwAssign = (d) => {
  clearF("pwas");
  const p = byId("pathways", d.id);
  const rv = pwStewards(p);
  modal(
    p.reviewer ? "Change the reviewer" : "Assign a reviewer",
    () =>
      `<form data-f="pwas" class="col pf-form" novalidate><input type="hidden" name="id" value="${p.id}">${dl([["Pathway", h(p.name)], ["Created by", nm(p.by)], ["For", nm(p.pid)], ["Steps", p.steps.map((s) => h(s.t)).join(" → ")], p.reviewer && ["Current Steward", nm(p.reviewer)]])}${
        rv.length
          ? fi("pwas", "rv", "Reviewer", { type: "select", req: true, ph: "Choose a reviewer", value: p.reviewer || "", opts: rv.map((a) => [a.pid, P(a.pid).name + " · " + roleName(a.role, a.ctx) + ((a.bundles || []).includes("Reviewer") ? " + Reviewer bundle" : "")]), help: "Reviewer-bundle holders and Facilitators / Stewards in this programme. The creator and the participant cannot approve it." })
          : banner("warn", "No reviewer available in this programme", "Grant the Reviewer bundle or invite a Facilitator / Steward from " + L("Programme admin → Invitations", "admin", { tab: "invites" }) + ", then assign them here.")
      }${banner("info", "", "Optional. Pathways normally go to the shared Reviewer queue without assignment. Assigning a named reviewer takes it out of the queue.")}<div class="actions"><span></span><button class="btn btn-p" type="submit" ${rv.length ? "" : "disabled"}>${p.reviewer ? "Change reviewer" : "Assign reviewer"}</button></div></form>`,
  );
};
F.pwas = (d) => {
  if (!validate("pwas", d, { rv: [["req", "Choose a reviewer."]] })) return render();
  const p = byId("pathways", d.id);
  if (!pwStewards(p).some((a) => a.pid === d.rv)) {
    UI.err.pwas = { rv: "Choose an active reviewer in this programme." };
    return render();
  }
  const was = p.reviewer;
  if (was === d.rv) {
    UI.modal = null;
    return ok();
  }
  p.reviewer = d.rv;
  if (p.state !== "Clarification requested") p.state = "In review";
  pwLog(p, (was ? "Reviewer changed by " + me().name + ": " + P(was).name + " → " : "Reviewer assigned by " + me().name + ": ") + P(d.rv).name);
  notify(d.rv, "Pathway assigned to you for review: " + p.name + " (" + P(p.by).name + ")", "pathway");
  [...new Set([p.by, p.pid])].forEach((x) => notify(x, "A reviewer was assigned to the pathway “" + p.name + "”: " + P(d.rv).name, "pathway"));
  if (was) notify(was, "You are no longer the reviewer for the pathway “" + p.name + "”", "pathway");
  audit("Pathway reviewer assigned", p.id, (was ? was + " → " : "") + d.rv);
  UI.modal = null;
  clearF("pwas");
  toast(was ? "Reviewer changed." : "Reviewer assigned. They can now approve the pathway or ask for clarification.");
  ok();
};
// Organization Admin view: pathways waiting for a Steward, and pathways a Steward is reviewing.
function pwAdminCards() {
  const wait = S.pathways.filter((p) => inCtx(p) && p.state === "Awaiting reviewer");
  const inRev = S.pathways.filter((p) => inCtx(p) && p.reviewer && ["In review", "Clarification requested"].includes(p.state));
  const conv = (p) => B(ic("message", 14) + "Conversation" + (convoN(p) ? " (" + convoN(p) + ")" : ""), "pwActivity", { id: p.id });
  const lead = `<span class="tile t-soft" aria-hidden="true">${ic("route", 16)}</span>`;
  return (
    card(
      "Pathway review queue <span class=\"adm-n\">" + wait.length + "</span>",
      "Custom pathways and adaptations outside a template’s rules from participants and Mentors go straight to this programme’s authorised Reviewers. Facilitator and Circle Steward recommendations need no approval. You only need to act when no Reviewer is available; assigning a named reviewer is optional.",
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
          badges: pwNeedsSteward(p) ? pill("No Reviewer available", "p-red") : pill("With " + pwReviewers(p).length + " Reviewer" + (pwReviewers(p).length > 1 ? "s" : ""), "p-amber"),
          primary: conv(p) + B("Assign reviewer", "pwAssign", { id: p.id }, pwNeedsSteward(p) ? "btn-p btn-sm" : "btn-s btn-sm"),
        }),
        empty: ["check", "The review queue is empty", "Custom pathways appear here while they wait for a Reviewer.", ""],
      }),
      "",
      "pf-dv",
    ) +
    '<div class="section-gap"></div>' +
    card(
      "Pathways with a reviewer <span class=\"adm-n\">" + inRev.length + "</span>",
      "Open the conversation to follow the review or add a comment.",
      dataView("pathway:withsteward", {
        label: "pathways",
        items: inRev,
        search: (p) => [p.name, P(p.by).name, P(p.pid).name, P(p.reviewer).name].join(" "),
        quick: { label: "State", options: dvOpts(inRev, (p) => p.state), test: (p, v) => p.state === v },
        filters: [{ key: "steward", label: "Reviewer", options: dvOpts(inRev, (p) => p.reviewer, (id) => P(id).name), test: (p, v) => p.reviewer === v }],
        sorts: [["name", "Name", (a, b) => a.name.localeCompare(b.name)]],
        defaultSort: "name",
        row: (p) => ({
          lead,
          title: h(p.name),
          sub: "Reviewer: " + nm(p.reviewer),
          meta: ["Created by " + nm(p.by), "For " + nm(p.pid)],
          badges: pill(p.state),
          primary: conv(p) + B("Change reviewer", "pwAssign", { id: p.id }),
        }),
        empty: ["users", "No pathways are with a reviewer right now", "Pathways move here once a Reviewer picks one up or you assign one.", ""],
      }),
      "",
      "pf-dv",
    )
  );
}
// A Reviewer acting on a queued pathway picks it up: they become its reviewer.
const pwPickUp = (p) => {
  if (p.reviewer) return;
  p.reviewer = myId();
  if (p.state === "Awaiting reviewer") p.state = "In review";
  pwLog(p, "Picked up from the review queue by " + me().name);
};
A.pwDec = (d) => {
  const p = byId("pathways", d.id);
  if (d.v === "Current") pwPickUp(p);
  // A pathway someone else wrote for the participant still needs the participant's acceptance after approval.
  if (d.v === "Current" && p.by !== p.pid) {
    p.state = PW_REC;
    p.reviewNote = "";
    pwReqSet(p, "Recommended");
    pwLog(p, "Approved by " + me().name + " (Reviewer) and recommended to the participant");
    notify(p.pid, `${P(p.by).name} (${p.byRole || "Facilitator"}) recommends a pathway: ${p.name}. Review it, then accept or reject it.`, "pathway");
    notify(p.by, "Your pathway “" + p.name + "” was approved by " + me().name + " and sent to " + P(p.pid).name, "pathway");
    audit("Pathway approved", p.id, "Recommended to participant");
    toast("Approved. The participant decides whether to accept it.");
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
  pwPickUp(p);
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
  if (p.prev) pwCarryOver(byId("pathways", p.prev), p);
  p.state = "Current";
  p.acceptedAt = now();
  p.acceptedBy = myId();
  pwSync(p);
  pwReqSet(p, "Accepted");
  pwLog(p, "Accepted the recommended pathway" + (p.tpl ? " (template version " + (p.tplVer || 1) + ")" : "") + " — it became current");
  notify(p.by, `${me().name} accepted the pathway “${p.name}”`, "pathway");
  audit("Pathway accepted", p.id, "");
  toast("Accepted. It is now your current pathway.");
  ok();
};
// The participant may reject a recommended pathway outright; it stays in their history with the reason.
// The stored state stays "Declined" so earlier records keep working; it is shown as Rejected.
A.pwDecline = (d) => {
  clearF("pwdc");
  modal(
    "Reject this pathway",
    () =>
      `<form data-f="pwdc" class="col pf-form" novalidate><input type="hidden" name="id" value="${d.id}">${fi("pwdc", "why", "Why you are rejecting it (shared with the person who recommended it)", { type: "textarea", rows: 3, req: true, max: 1000 })}${banner("info", "", "Rejecting does not affect your Circles, Rope Teams, tasks or evidence. They can recommend something else.")}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-d" type="submit">Reject pathway</button></div></form>`,
  );
};
F.pwdc = (d) => {
  if (!validate("pwdc", d, { why: ["req", ["min", 3]] })) return render();
  const p = byId("pathways", d.id);
  p.state = "Declined";
  p.declineWhy = d.why.trim();
  p.declinedAt = now();
  pwReqSet(p, "Rejected");
  convoAdd(p, "comment", "Rejected by the participant: " + p.declineWhy);
  pwLog(p, "Rejected by the participant — it will not become current");
  notify(p.by, `${me().name} rejected the pathway “${p.name}”: ${p.declineWhy}`, "pathway");
  audit("Pathway rejected by participant", p.id, p.declineWhy);
  UI.modal = null;
  clearF("pwdc");
  toast("Rejected. The person who recommended it has been told why.");
  ok();
};
A.pwChange = (d) => {
  UI.form.pwc = {};
  modal(
    "Ask for changes",
    () =>
      `<form data-f="pwc" class="col pf-form" novalidate><input type="hidden" name="id" value="${d.id}">${fi("pwc", "why", "What would you like changed?", { type: "textarea", rows: 3, req: true })}${banner("info", "", "The pathway stays inactive. " + nm(byId("pathways", d.id).by) + " revises it and recommends it again; you then decide.")}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send request</button></div></form>`,
  );
};
F.pwc = (d) => {
  if (!validate("pwc", d, { why: ["req"] })) return render();
  const p = byId("pathways", d.id);
  p.state = "Draft";
  p.changeReq = d.why;
  p.partChange = true;
  pwReqSet(p, "Changes requested");
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
      `<form data-f="pwv" class="col pf-form" novalidate>${errSum("pwv")}<input type="hidden" name="id" value="${p.id}">${p.changeReq ? banner("warn", "Change requested", h(p.changeReq)) : ""}${pwStepFields("pwv")}${fi("pwv", "note", "What you changed", { req: true })}${banner("info", "", pwDirect(p) ? "It goes straight back to " + nm(p.pid) + " to accept or reject." : pwCustom(p) ? "Custom pathways go back to a Reviewer before the participant sees them." : "If the revised steps stay within the template’s adaptation rules, it goes straight back to the participant to accept; otherwise a Reviewer approves it first.")}<div class="actions"><span></span><button class="btn btn-p" type="submit">Re-recommend</button></div></form>`, true,
  );
};
// Steps read back from the editor keep the template wording of a step whose title was reworded (minor change).
const pwKeepTplT = (was, steps) => (steps.forEach((s, i) => was[i] && was[i].tplT && s.t === was[i].t && (s.tplT = was[i].tplT)), steps);
// Custom (not template-based) pathways, and a participant's own pathways, always need a Reviewer.
const pwCustom = (p) => !p.tpl || p.mode.startsWith("3") || p.by === p.pid;
F.pwv = (d) => {
  if (!validate("pwv", d, { ...pwStepRules(d), note: ["req"] })) return render();
  const p = byId("pathways", d.id);
  p.steps = pwKeepTplT(p.steps, pwStepsRead(d));
  p.partChange = false;
  const route = pwRoute(byId("templates", p.tpl), p.steps, pwCustom(p));
  if (!pwCustom(p)) p.mode = PW_MODE[route];
  p.changeReq = "";
  convoAdd(p, "resubmit", d.note.trim());
  if (pwSends(p, route)) {
    p.state = PW_REC;
    pwReqSet(p, "Recommended");
    pwLog(p, "Revised and re-recommended to the participant (" + p.mode + ")");
    notify(p.pid, `${me().name} revised and re-recommended “${p.name}”. Review it, then accept or reject it.`, "pathway");
  } else {
    pwLog(p, "Revised and sent for Reviewer approval (" + p.mode + ")");
    pwToQueue(p);
  }
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
          s.type === "Conditional" && ["Applies when", h(pwWhenTxt(s))],
          s.review && ["Review", "A Reviewer checks this completion. The step shows Pending review until they decide."],
        ],
      )}${s.early ? banner("info", "Earlier completion record", `You recorded this step on ${fmt(s.early.doneAt)}, before its prerequisites were complete${s.early.note ? ": “" + h(s.early.note) + "”" : ""}. Add it again below if it still applies.`) : ""}${fi("pws", "note", "Note (optional)", { type: "textarea", rows: 3, ph: "What you did, what you learned, anything the facilitator should know" })}<div class="field"><label class="lbl" for="pws_f">Supporting files (optional)</label><input id="pws_f" type="file" name="f" multiple class="input" style="padding:8px" data-ch="pwsFiles"><span class="help">Up to ${S.settings.maxFileMB} MB each. Your facilitator and the person who proposed this pathway can see them.</span><div class="pws-list cap"></div></div><div class="actions"><span></span><button class="btn btn-p" type="submit">${s.review ? "Send for review" : "Mark step complete"}</button></div></form>`,
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
  const fl = files.map((f) => ({ n: f.name, mb: +(f.size / 1048576).toFixed(2) }));
  if (s.review) {
    s.pend = { kind: "complete", by: myId(), at: now(), note: (d.note || "").trim(), files: fl };
    delete s.returned;
    pwLog(p, `Submitted step ${+d.i + 1} “${s.t}” for Reviewer check`);
    pwStepReviewers(p).forEach((x) => notify(x, `${me().name} submitted “${s.t}” (${p.name}) — check the completion`, "pathway"));
    audit("Pathway step submitted for review", p.id, s.t);
    UI.modal = null;
    clearF("pws");
    toast("Sent for review. The step shows Pending review until a Reviewer decides.");
    return ok();
  }
  delete s.returned;
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
  // EXTERNAL_DATA_EXCHANGE: completion status goes back to the learning platform only if allowed; never blocks the step
  lmsSendCompletion(p, s);
  if (p.by !== myId())
    notify(
      p.by,
      `${me().name} completed “${s.t}” on the pathway ${p.name}`,
      "pathway",
    );
  pwStepCand(p, +d.i, s);
  UI.modal = null;
  clearF("pws");
  if (pwCheckDone(p)) toast("Pathway completed. Profile candidates added for your review.");
  else {
    const nx = pwNext(p);
    toast("Step completed. A profile candidate was added for your review." + (nx >= 0 ? " Next by rule: step " + (nx + 1) + "." : ""));
  }
  ok();
};
// ---- A materially changed version of an active pathway needs the participant's acceptance again. The current version
// stays active until they accept; closed steps carry over where the step itself is unchanged.
const pwPendingVer = (p) => S.pathways.find((x) => x.prev === p.id && ![ "Declined", "Superseded", "Rejected"].includes(x.state));
const pwCanNewVer = (p) => !!p && p.state === "Current" && p.pid !== myId() && (p.by === myId() || pwCanRecommend(p.pid)) && !pwPendingVer(p);
function pwCarryOver(old, p) {
  if (!old) return;
  const key = (s) => [s.t.trim().toLowerCase(), s.type, s.rule].join("|");
  let n = 0;
  p.steps.forEach((s, i) => {
    const o = old.steps.find((x) => key(x) === key(s));
    if (old.steps[i] && old.steps[i].tplT && s.t === old.steps[i].t) s.tplT = old.steps[i].tplT;
    if (!o || !pwClosed(o) || o.st === "Not applicable") return;
    ["done", "doneBy", "doneAt", "note", "files", "reviewedBy", "reviewedAt", "st", "stAt", "priorEv", "priorBy", "priorOk", "priorAt", "priorWhy", "recBy", "recAccepted"].forEach((k) => o[k] != null && (s[k] = o[k]));
    n++;
  });
  p.facts = Object.assign({}, old.facts || {}, p.facts || {});
  pwLog(p, `Carried over ${n} closed step${n === 1 ? "" : "s"} from version ${old.ver || 1}`);
}
A.pwNewVer = (d) => {
  const p = byId("pathways", d.id);
  clearF("pwnv");
  UI.form.pwnv = { ...pwStepsToForm(p.steps), why: "" };
  modal("Propose a changed version of " + h(p.name), () =>
    `<form data-f="pwnv" class="col pf-form" novalidate>${errSum("pwnv")}<input type="hidden" name="id" value="${p.id}">${banner("info", "Material or minor change", "Rewording step titles only is a minor change: it applies straight away and " + nm(p.pid) + " is told. Any other change — steps added, removed or reordered, requirement type, rule, condition, dependency, date, permission, review or evidence settings — is material: version " + ((p.ver || 1) + 1) + " needs " + nm(p.pid) + "’s acceptance, and version " + (p.ver || 1) + " stays active until then. Closed steps carry over where the step is unchanged.")}${pwStepFields("pwnv")}${fi("pwnv", "why", "What changed and why", { type: "textarea", rows: 2, req: true, max: 300, help: "Shown to " + nm(p.pid) + "." })}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">Send new version</button></div></form>`, true,
  );
};
F.pwnv = (d) => {
  if (!validate("pwnv", d, { why: ["req", ["min", 10]], ...pwStepRules(d) })) return render();
  const old = byId("pathways", d.id);
  const steps = pwKeepTplT(old.steps, pwStepsRead(d));
  if (pwStepsSig(steps) === pwStepsSig(old.steps)) {
    UI.err.pwnv = { why: "Nothing in the steps changed, so there is no new version to accept." };
    return render();
  }
  if (pwMaterialSig(steps) === pwMaterialSig(old.steps)) {
    // minor change: titles (or suggestion keywords) only — applied in place, progress kept, participant told
    const was = old.steps.map((s) => s.t);
    // tplT keeps the template's wording, so a reworded title still counts as the same template step
    old.steps.forEach((s, i) => Object.assign(s, { ...(s.t !== steps[i].t && !s.tplT ? { tplT: s.t } : {}), t: steps[i].t }));
    const ch = was.map((t, i) => (t !== old.steps[i].t ? `step ${i + 1} “${t}” → “${old.steps[i].t}”` : "")).filter(Boolean);
    pwLog(old, `Minor change by ${me().name} (not material, no re-acceptance needed): ${ch.join("; ")} — ${d.why.trim()}`);
    notify(old.pid, `${me().name} reworded your pathway “${old.name}” (minor change, nothing you must do differently): ${d.why.trim()}`, "pathway");
    audit("Pathway minor change", old.id, ch.join("; "));
    UI.modal = null;
    clearF("pwnv");
    toast("Minor change applied. " + P(old.pid).name + " was told; no re-acceptance needed.");
    return ok();
  }
  const tpl = byId("templates", old.tpl);
  const route = pwRoute(tpl, steps, pwCustom(old));
  const p = {
    ...JSON.parse(JSON.stringify(old)),
    id: uid("pw"),
    ver: (old.ver || 1) + 1,
    prev: old.id,
    mode: pwCustom(old) ? old.mode : PW_MODE[route],
    state: PW_REC,
    by: myId(),
    byRole: role() === "M" ? "Mentor" : old.circle ? "Circle Steward" : "Facilitator",
    reason: d.why.trim(),
    proposedAt: now(),
    acceptedAt: null,
    acceptedBy: null,
    reviewer: null,
    thread: [],
    steps,
    activity: [],
  };
  pwLog(p, `Proposed version ${p.ver} of “${old.name}”: ${p.reason}`);
  pwLog(old, `${me().name} proposed version ${p.ver}; this version stays active until ${P(old.pid).name} accepts it`);
  S.pathways.push(p);
  if (pwSends(p, route)) notify(p.pid, `${me().name} proposes a changed version of “${p.name}”: ${p.reason}. Accept or reject it, or ask for changes.`, "pathway");
  else pwToQueue(p);
  audit("Pathway new version proposed", p.id, "v" + p.ver + " of " + old.id);
  UI.modal = null;
  clearF("pwnv");
  toast(p.state === PW_REC ? "Sent. " + P(p.pid).name + " decides whether to accept the new version." : "Sent to an authorised Reviewer first.");
  ok();
};
// Full history for the participant and for the people who propose, adapt and approve pathways.
A.pwActivity = (d) => {
  const p = byId("pathways", d.id);
  clearF("cv");
  // A function body, so a message posted from the dialog shows in place.
  // Layout: status strip and details, then one block per step (no wide table), then the conversation with its form last.
  modal("Pathway · " + h(p.name), () => {
    const steps = p.steps.map((s, i) => {
      const x = pwStepState(p, i);
      const ev = s.priorEv && byId("evidence", s.priorEv);
      const canRec = G.pwPrior({ id: p.id, i }) === true && !(s.rec && s.rec.status === "Awaiting participant");
      const canRev = s.pend && pwStepReviewers(p).includes(myId()) && p.pid !== myId();
      const fact = s.type === "Conditional" && pwFactDef(s) && pwFactDef(s).who === "S" && pwFactWho(p, s) && !s.done && p.state === "Current";
      const done = s.done
        ? `${s.doneBy ? nm(s.doneBy) : ""}${s.doneAt ? " · " + fmt(s.doneAt) : ""}${s.reviewedBy ? '<span class="pw-why">Checked by ' + nm(s.reviewedBy) + "</span>" : ""}`
        : s.st === "Satisfied by prior evidence"
          ? `Prior evidence ${ev ? L(h(ev.title), "evidence", { id: ev.id }) : ""} · selected by ${nm(s.priorBy || s.recBy)}${s.priorOk ? " · confirmed by " + nm(s.priorOk) : ""} · ${fmt(s.priorAt || s.recAccepted)}`
          : "";
      const note = s.done && (s.note || (s.files || []).length) ? `${s.note ? h(s.note) : ""}${pwFiles(s.files)}` : "";
      const why = [
        x.why && [PW_S.BLOCKED, PW_S.PENDING, PW_S.NA, PW_S.LOCKED].includes(x.st) ? `<span><b>Reason:</b> ${h(x.why)}</span>` : "",
        x.next ? `<span><b>Next action:</b> ${h(x.next)}</span>` : "",
        s.rec && s.rec.status === "Awaiting participant" ? `<span>Prior-evidence suggestion by ${nm(s.rec.by)} waiting for ${nm(p.pid)}</span>` : "",
      ].filter(Boolean);
      const acts =
        (canRec ? B(pwStepReviewers(p).includes(myId()) ? "Apply prior evidence" : "Suggest evidence", "pwPrior", { id: p.id, i }, "btn-s btn-sm") : "") +
        (canRev ? B("Return", "pwStepRev", { id: p.id, i, v: "return" }, "btn-s btn-sm") + B("Approve", "pwStepRev", { id: p.id, i, v: "ok" }, "btn-p btn-sm") : "") +
        (fact ? B("No", "pwFact", { id: p.id, i, v: "no" }, "btn-s btn-sm") + B("Confirm Yes", "pwFact", { id: p.id, i, v: "yes" }, "btn-p btn-sm") : "");
      const kv = (l, v) => `<div class="pw-sd-f"><span class="lbl">${l}</span><div>${v || '<span class="cap">—</span>'}</div></div>`;
      return `<li class="pw-sd"><div class="pw-sd-h"><span class="pw-sd-n" aria-hidden="true">${i + 1}</span><div class="pw-sd-t"><b><span class="sr">Step ${i + 1}: </span>${h(s.t)}</b>${s.type === "Conditional" ? `<span class="pw-why">Applies when: ${h(pwWhenTxt(s))}</span>` : ""}</div><div class="pw-sd-tags">${pill(s.type || "Mandatory", PW_TY_C[s.type] || "p-navy")}${pill(x.st, PW_ST_C[x.st])}</div></div>${why.length ? `<div class="pw-sd-why${x.st === PW_S.BLOCKED ? " is-blocked" : ""}">${why.join("")}</div>` : ""}<div class="pw-sd-kv">${kv("Prerequisite", h(pwPreTxt(p, s)))}${kv("Completion rule", h(s.rule || PW_RULE_DEF) + (s.review ? '<span class="pw-why">A Reviewer checks completion</span>' : ""))}${kv("Completed", done)}${kv("Note and files", note)}</div>${acts ? `<div class="pw-sd-a">${acts}</div>` : ""}</li>`;
    });
    const nav =
      d.back === "edit" && pwEditable(p)
        ? B(ic("chevl", 14) + "Back to Edit pathway", "pwEdit", { id: p.id, keep: 1, from: d.from || "", fv: d.fv || "" }, "btn-g btn-sm")
        : d.from
          ? B(ic("chevl", 14) + "All pathways for " + nm(d.from), "pwPick", { pid: d.from, v: d.fv || "talk" }, "btn-g btn-sm")
          : "";
    return `<div class="col pw-act">${nav ? `<div class="pw-ed-nav">${nav}${pwEditable(p) && d.back !== "edit" ? B(ic("edit", 14) + "Edit pathway", "pwEdit", { id: p.id, from: d.from || "", fv: "edit" }, "btn-s btn-sm") : "<span></span>"}</div>` : ""}${d.why ? banner("info", "You can view this pathway but not edit it", "Not editable: " + h(d.why) + ".") : ""}<div class="pw-act-st">${pill(p.state === "Draft" && p.changeReq ? "Change requested" : p.state)}${pwAccPill(p)}${p.ver > 1 ? `<span class="cap">Version ${p.ver}</span>` : ""}<span class="cap">${pwProg(p).n} of ${p.steps.length} steps closed</span></div><section class="pw-act-sec" aria-labelledby="pwa_d"><h3 class="h3" id="pwa_d">Details</h3>${dl([
      ["Participant", nm(p.pid)],
      ["Mode", h(p.mode)],
      ["Created by", pwRoleLine(p)],
      p.reason && ["Why it was recommended", h(p.reason)],
      p.tpl && ["Template", h((byId("templates", p.tpl) || {}).name || "—") + " · version " + (p.tplVer || 1)],
      ["Reviewer", p.reviewer ? nm(p.reviewer) : p.state === "Awaiting reviewer" ? "In the review queue — any authorised Reviewer" : pwDirect(p) ? "Not needed — sent by a Facilitator / Circle Steward straight to the participant" : pwCustom(p) ? "—" : "Not needed (approved template or allowed adaptation)"],
      ["Pathway state", pill(p.state === "Draft" && p.changeReq ? "Change requested" : p.state) + (p.ver > 1 ? " · version " + p.ver : "")],
      ["Participant acceptance", pwAccPill(p) + (p.acceptedAt ? " · " + fmt(p.acceptedAt) : p.declinedAt ? " · " + fmt(p.declinedAt) : "")],
      p.prev && ["Replaces", h((byId("pathways", p.prev) || {}).name || p.prev) + " (earlier version)"],
      Object.keys(p.facts || {}).length && ["Condition answers", Object.entries(p.facts).map(([k, a]) => `${h((PW_FACTS[k] || {}).label || (/^ask\d+$/.test(k) && p.steps[+k.slice(3)] ? p.steps[+k.slice(3)].cond : k))}: <b>${a.v === "yes" ? "Yes" : "No"}</b> (${nm(a.by)}, ${fmt(a.at)})`).join("<br>")],
      p.changeReq && p.state === "Draft" && ["Open change request", h(p.changeReq)],
      ["Recommended and accepted", pwWho(p)],
      p.state === "Declined" && ["Rejected by the participant", h(p.declineWhy || "") + (p.declinedAt ? " · " + fmt(p.declinedAt) : "")],
    ])}</section><section class="pw-act-sec" aria-labelledby="pwa_s"><div class="pw-act-sh"><h3 class="h3" id="pwa_s">Steps and rules</h3>${pwLegend()}</div><ol class="pw-sds">${steps.join("")}</ol></section><section class="pw-act-sec" aria-labelledby="pwa_c"><h3 class="h3" id="pwa_c">Conversation and activity</h3><p class="cap">Messages between the pathway owner, the Organization Admin and the Steward, with every review step. Oldest first. The same conversation is in Messages.</p>${convoHtml("pathway", p)}</section></div>`;
  }, true);
};
// ---------- ASK PHOENIX (F09, class A) ----------
// Ask PHOENIX is presented as a docked assistant (views/assist.js); the rules below are unchanged.
F.ask = (d) => {
  UI.pre = null;
  const q = (d.q || "").trim();
  if (!q) return;
  S.askHist = S.askHist || [];
  const pid = myId();
  // Through the AI adapter: purpose check (organization, programme, person) and provider status. On any failure the
  // question is kept in the box and the manual routes are offered; nothing else in PHOENIX is affected.
  const r = S.settings.aiUsed >= S.settings.aiQuota ? { state: "Unavailable", why: "Today’s AI quota is used up." } : adapterCall("ai", { pid, op: "Ask PHOENIX" });
  if (r.state !== "OK") {
    UI.pre = { askQ: q };
    return aiFallback(r, "Your question is still in the box. Use Help & support to ask a person, or search opportunities and your pathway directly.");
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
