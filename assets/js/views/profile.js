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
        ? `<section class="card pf-ns" aria-labelledby="pf-ns-t"><div class="row pf-ns-h"><span class="over" id="pf-ns-t">North Star</span><span class="vis">${ic("lock", 14)}Only you</span></div><p class="pf-ns-q${cp.PC2 ? "" : " is-unset"}">${cp.PC2 ? "“" + h(cp.PC2) + "”" : "Set your goal in the Purpose Compass."}</p>${cp.PC5 ? `<p class="cap">First milestone: ${h(cp.PC5)}</p>` : ""}<div class="pf-ns-a">${L("Purpose Compass" + ic("chevr", 14), "profile", { tab: "compass" }, "lnk pf-lnk")}</div></section>`
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
    body = card(
      "Profile change candidates",
      "Nothing becomes current without your decision.",
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
          sub: "Source: " + h(c.source),
          badges: `${c.prov === "AI-proposed" ? aiTag("AI-proposed") : pill(c.prov, "p-grey")} ${pill(c.status)}`,
          primary:
            c.status === "Pending"
              ? `<span class="row pf-acts">${B("Edit", "candEdit", { id: c.id })}${B("Accept", "cand", { id: c.id, v: "Accepted" }, "btn-p btn-sm")}</span>`
              : "",
          menu:
            c.status === "Pending"
              ? B(ic("clock", 16) + "Defer", "cand", { id: c.id, v: "Deferred" }, "menu-i", 'role="menuitem"') +
                '<div class="menu-sep"></div>' +
                B(ic("x", 16) + "Reject", "cand", { id: c.id, v: "Rejected" }, "menu-i danger", 'role="menuitem"')
              : "",
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
          { label: "Source", hideSm: true, cell: (v) => pill(v.source, "p-grey") },
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
function bumpVer(what, why, source) {
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
    `Corrected ${c.field}: “${c.value}” → “${d.value}”`,
    d.why,
    "Corrected",
  );
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
    bio: pr.bio || "",
    lang: pr.lang || "",
  };
  modal(
    "Edit basics",
    () =>
      `<form data-f="basics" class="col pf-form" novalidate>${fi("basics", "display", "Display name", { req: true })}${fi("basics", "bio", "Short biography", { type: "textarea", rows: 3, max: 400 })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save new version</button></div></form>`,
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
A.cand = (d) => {
  const c = byId("candidates", d.id);
  c.status = d.v;
  if (d.v === "Accepted") {
    S.claims.push({
      id: uid("cl"),
      pid: c.pid,
      field: c.field,
      value: c.value,
      prov: c.prov === "AI-proposed" ? "Self-declared" : c.prov,
      vis: "Only me",
      state: "Current",
      ver: 1,
    });
    bumpVer(`Accepted ${c.field}: ${c.value}`, c.source, c.prov);
  }
  audit("Profile candidate " + d.v, c.id, c.value);
  ok();
};
A.candEdit = (d) => {
  const c = byId("candidates", d.id);
  UI.form.ce = { value: c.value };
  modal(
    "Edit before accepting",
    () =>
      `<form data-f="ce" class="col pf-form" novalidate><input type="hidden" name="id" value="${c.id}">${fi("ce", "value", h(c.field), { req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Accept edited version</button></div></form>`,
  );
};
F.ce = (d) => {
  if (!validate("ce", d, { value: ["req"] })) return render();
  const c = byId("candidates", d.id);
  c.value = d.value;
  UI.modal = null;
  A.cand({ id: c.id, v: "Accepted" });
};
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
  return `<article class="evo"><header class="evo-h"><span class="over">Suggested profile change</span>${pill(s.status === "Pending" ? "Awaiting your review" : s.status, st)}</header>${dl([
    ["Profile field", `<b>${h(s.field)}</b>`],
    [s.status === "Pending" ? "Current" : "Before", h(evoCurrent(s))],
    ["Suggested", evoSuggestedHtml(s)],
    ["Why this was suggested", h(s.reason)],
    ["Supporting Harvest finding", `<span class="cap">${h(s.finding.sec)}</span><blockquote class="evo-q">${h(s.finding.text || "—")}</blockquote>`],
    ["Supporting evidence and records", `<div class="row wrap pf-links">${links || '<span class="cap">None linked</span>'}</div>`],
  ])}${
    s.status === "Pending"
      ? act
        ? `<div class="evo-act"><span class="cap">Nothing changes in your profile unless you approve.</span><div class="row wrap">${B(ic("x", 14) + "Reject", "evoDecide", { id: s.id, v: "Rejected" })}${B(ic("check", 14) + "Approve", "evoDecide", { id: s.id, v: "Approved" }, "btn-p btn-sm")}</div></div>`
        : `<p class="cap evo-act">Only ${nm(s.pid)} can approve or reject this change.</p>`
      : `<p class="cap evo-act">${s.status} by ${nm(s.by)} on ${fmt(s.decidedAt)} · ${s.status === "Approved" ? "profile updated" : "profile not changed"}</p>`
  }</article>`;
}
A.evoDecide = (d) => {
  const s = byId("evolution", d.id);
  if (s.status !== "Pending") return deny("this suggestion has already been decided");
  s.before = evoCurrent(s);
  s.status = d.v;
  s.by = myId();
  s.decidedAt = now();
  if (d.v === "Approved") evoApply(s);
  audit("Profile evolution " + d.v.toLowerCase(), s.id, s.field + (d.v === "Approved" ? " — profile updated" : " — profile not changed"));
  toast(d.v === "Approved" ? s.field + " updated in your profile. A new version was saved." : "Rejected. Your profile was not changed.");
  ok();
};
// The only place a Harvest finding reaches the profile, and only from an approval by the person.
function evoApply(s) {
  const prov = s.refs.some((r) => r.type === "Evidence") ? "Evidence-supported" : "Activity-derived";
  const src = "Learning Harvest " + s.hv;
  if (s.kind === "compass") {
    const a = (S.compass[s.pid] = S.compass[s.pid] || {});
    const was = a[s.key];
    a[s.key] = s.value;
    return bumpVer(`Profile evolution: ${s.field} “${was || "—"}” → “${s.value}”`, src, prov);
  }
  if (s.field === "Skill proficiency") {
    const c = evoProfClaim(s);
    if (c) {
      c.value = s.value;
      c.ver = (c.ver || 1) + 1;
      c.prov = prov;
    } else
      S.claims.push({ id: uid("cl"), pid: s.pid, field: s.field, value: s.value, prov, vis: "Only me", state: "Current", ver: 1, src: "evolution", from: s.id });
    return bumpVer(`Profile evolution: ${s.value}`, src, prov);
  }
  const items = s.add.filter((v) => !evoHas(curItems(s.pid, s.field), v));
  if (!items.length) return;
  S.claims.push({
    id: uid("cl"),
    pid: s.pid,
    field: s.field,
    value: items.join(evoSep(s.field)),
    prov,
    vis: "Only me",
    state: "Current",
    ver: 1,
    src: "evolution",
    from: s.id,
  });
  bumpVer(`Profile evolution: added ${s.field} — ${items.join(evoSep(s.field))}`, src, prov);
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
      ["agr", "Agreements & receipts"],
      ["data", "Data held about me"],
      ["req", "Requests"],
    ],
    UI.p.tab,
  );
  let body = "";
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
      "Privacy & agreements",
      "Your agreements and receipts, the data held about you, and your requests.",
    ) +
    t.html +
    body
  );
});
A.consentChange = (d) => {
  const c = S.consents[myId()];
  const from = c[d.k],
    to = from === "Granted" ? "Withdrawn" : "Granted";
  c[d.k] = to;
  c.history.push({ at: now(), t: `${d.k}: ${from} → ${to}` });
  if (d.k === "ai" && to !== "Granted") {
    const q = S.ai.filter(
      (j) => j.by === myId() && ["Queued", "Draft"].includes(j.status),
    );
    q.forEach((j) => (j.status = "Cancelled"));
    if (q.length) toast(q.length + " queued AI job(s) cancelled.", "warn");
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
  audit(
    "Consent " + (to === "Granted" ? "granted" : "withdrawn"),
    d.k,
    from + " → " + to,
  );
  notify(myId(), `Your ${d.k} permission is now ${to}.`, "privacy");
  if (!UI.toast) toast(`${d.k}: ${to}`);
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
            "Mode " + h(p.mode) + " · by " + nm(p.by),
            `<ol class="req-list pw-list">${p.steps.map((s) => `<li>${h(s.t)}</li>`).join("")}</ol><div class="row wrap pf-after">${B(ic("clock", 14) + "View activity", "pwActivity", { id: p.id })}${B("Request a change", "pwChange", { id: p.id })}${B("Accept pathway", "pwAccept", { id: p.id }, "btn-p btn-sm")}</div>`,
          ),
        )
        .join('<div class="pf-gap"></div>') +
      (prop.length ? '<div class="pf-gap"></div>' : "") +
      (cur
        ? card(
            h(cur.name),
            "Current · Mode " +
              h(cur.mode) +
              " · " +
              cur.steps.filter((s) => s.done).length +
              " of " +
              cur.steps.length +
              " steps complete",
            `<div class="hm-prog"><div class="progress"><span class="bar" style="width:${(cur.steps.filter((s) => s.done).length / cur.steps.length) * 100}%"></span></div><span class="cap">${Math.round((cur.steps.filter((s) => s.done).length / cur.steps.length) * 100)}%</span></div><ol class="hm-steps pw-steps">` +
              cur.steps
                .map(
                  (s, i) =>
                    `<li class="${s.done ? "done" : i === cur.steps.findIndex((x) => !x.done) ? "cur" : ""}"><span class="hm-step-m" aria-hidden="true">${s.done ? ic("check", 12) : i + 1}</span><div class="hm-step-t"><b>${`Step ${i + 1}: ${h(s.t)}`}</b>${s.done ? `<span class="cap">${pwStepDone(s)}</span>` : ""}</div><div class="pw-step-a">${s.done ? pill("Done") : B("Mark complete", "pwStep", { id: cur.id, i }, "btn-s btn-sm")}</div></li>`,
                )
                .join("") +
              `</ol>`,
            B(ic("clock", 14) + "View activity", "pwActivity", { id: cur.id }),
          )
        : empty(
            "route",
            "No current pathway",
            "A facilitator or mentor can propose one, or draft your own (it then needs reviewer approval).",
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
            sub: h(p.mode) + " · proposed by " + nm(p.by),
            meta: [p.changeReq && p.state === "Draft" ? `You asked for: ${h(p.changeReq)}` : ""],
            badges: pill(p.state === "Draft" && p.changeReq ? "Change requested" : p.state),
            primary: B("View activity", "pwActivity", { id: p.id }),
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
    pwToReviewCard() +
    (() => {
      const pwOf = (p) => S.pathways.filter((x) => x.pid === p && inCtx(x));
      const curOf = (p) => pwOf(p).find((x) => x.state === "Current");
      const lastOf = (c) =>
        c &&
        c.steps
          .filter((s) => s.done && s.doneAt)
          .sort((a, b) => b.doneAt.localeCompare(a.doneAt))[0];
      const frac = (c) => (c ? c.steps.filter((s) => s.done).length / c.steps.length : -1);
      const label = (x) => (x.state === "Draft" && x.changeReq ? "Change requested" : x.state);
      const QUICK = [
        ["current", "Current", (ls) => ls.some((x) => x.state === "Current")],
        ["proposed", "Proposed", (ls) => ls.some((x) => x.state === "Proposed to participant")],
        ["review", "In review", (ls) => ls.some((x) => ["In review", "Awaiting reviewer"].includes(x.state))],
        ["changes", "Changes", (ls) => ls.some((x) => x.state === "Changes requested" || (x.state === "Draft" && x.changeReq))],
        ["none", "No pathway", (ls) => !ls.length],
      ];
      const PROG = [
        ["0", "Not started", (f) => f === 0],
        ["mid", "In progress", (f) => f > 0 && f < 1],
        ["done", "Complete", (f) => f === 1],
        ["none", "No current pathway", (f) => f < 0],
      ];
      const actMenu = (x, cur) =>
        pwCanView(x) ? B(ic("clock", 16) + "View activity: " + h(x.name) + (cur ? " (current)" : ""), "pwActivity", { id: x.id }, "menu-i", 'role="menuitem"') : "";
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
              sub: c ? `${h(c.name)} · ${c.steps.filter((s) => s.done).length}/${c.steps.length}` : "No current pathway",
              meta: [
                last ? `Last step completed ${fmt(last.doneAt)} by ${nm(last.doneBy)}${(last.files || []).length ? " · " + last.files.length + " file" + (last.files.length > 1 ? "s" : "") : ""}` : "",
                ...others.map((x) => `${h(x.name)} ${pill(label(x))}`),
              ],
              badges: c ? `<span class="pw-mini" title="${Math.round(frac(c) * 100)}% complete"><span class="progress"><span class="bar" style="width:${frac(c) * 100}%"></span></span></span>` : "",
              primary:
                revise.map((x) => B("Revise and re-propose", "pwRevise", { id: x.id }, "btn-p btn-sm")).join("") +
                (["F", "M"].includes(r) ? B("Propose pathway", "proposePathway", { pid: p }) : c ? pwActBtn(c) : ""),
              menu: [["F", "M"].includes(r) && c ? actMenu(c, true) : "", ...others.map((x) => actMenu(x))].filter(Boolean).join(""),
            };
          },
          empty: ["users", "No participants yet", "Participants in this context appear here.", ""],
        }),
        "",
        "pf-dv",
      );
    })() +
    (hasB("Reviewer")
      ? `<div class="pf-gap"></div>` +
        card(
          "Awaiting your approval (mode 3)",
          "",
          S.pathways
            .filter((p) => p.state === "In review" && !p.reviewer && inCtx(p))
            .map(
              (p) =>
                `<div class="lrow hm-row"><span class="tile t-soft" aria-hidden="true">${ic("route", 16)}</span><div class="lt"><b>${h(p.name)}</b><p class="cap">For ${nm(p.pid)} · drafted by ${nm(p.by)} · ${p.steps.map((s) => h(s.t)).join(" → ")}</p></div><div class="hm-row-r">${B("View activity", "pwActivity", { id: p.id })}${B("Return", "pwReview", { id: p.id, v: "Draft" })}${B("Approve", "pwReview", { id: p.id, v: "Proposed to participant" }, "btn-p btn-sm")}</div></div>`,
            )
            .join("") || empty("check", "Nothing waiting", ""),
        )
      : "")
  );
});
A.proposePathway = (d) => {
  clearF("pp");
  UI.form.pp = { pid: d.pid, mode: "1" };
  modal("Propose a pathway for " + nm(d.pid), () => {
    const m = fv("pp", "mode", "1");
    const tpl = byId("templates", fv("pp", "tpl"));
    return `<form data-f="pp" class="col pf-form" novalidate><input type="hidden" name="pid" value="${d.pid}">${fi(
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
    )}${m !== "3" ? fi("pp", "tpl", "Template", { type: "select", req: true, ph: "Select an approved template", opts: S.templates.filter((t) => t.status === "Approved").map((t) => [t.id, t.name]) }) : fi("pp", "name", "Pathway name", { req: true })}${m !== "1" ? fi("pp", "steps", "Steps (one per line, 3–5)", { type: "textarea", rows: 5, req: true, value: tpl ? tpl.steps.join("\n") : "" }) : ""}<div class="actions">${B("Update", "ppRefresh")}<button class="btn btn-p" type="submit">Propose</button></div></form>`;
  });
};
A.ppRefresh = () => {
  const f = document.querySelector('[data-f="pp"]');
  const d = {};
  new FormData(f).forEach((v, k) => (d[k] = v));
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
const pwActBtn = (p) => (pwCanView(p) ? B("View activity", "pwActivity", { id: p.id }) : "");
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
  if (d.mode !== "1")
    rules.steps = [
      "req",
      [
        "fn",
        {
          f: (v) => {
            const n = v.split("\n").filter((x) => x.trim()).length;
            return n >= 3 && n <= 5;
          },
          m: "Enter 3 to 5 steps.",
        },
      ],
    ];
  if (!validate("pp", d, rules)) return render();
  const tpl = byId("templates", d.tpl);
  const steps = (
    d.mode === "1" ? tpl.steps : d.steps.split("\n").filter((x) => x.trim())
  ).map((t) => ({
    t: t.trim(),
    done: false,
  }));
  const state = d.mode === "3" ? "In review" : "Proposed to participant";
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
          " (mode 3) and sent it for Reviewer approval",
  );
  S.pathways.push(p);
  if (state === "In review")
    S.assign
      .filter((a) => a.ctx === ctxId() && a.bundles.includes("Reviewer"))
      .forEach((a) =>
        notify(
          a.pid,
          "Custom pathway awaiting approval for " + P(d.pid).name,
          "pathway",
        ),
      );
  else notify(d.pid, "A pathway was proposed to you: " + p.name, "pathway");
  audit("Pathway proposed", p.id, p.mode);
  clearF("pp");
  UI.modal = null;
  toast(
    state === "In review"
      ? "Sent to a Reviewer for approval."
      : "Proposed to the participant.",
  );
  ok();
};
A.draftPathway = (d) => {
  UI.form.pp = { pid: d.pid, mode: "3" };
  modal(
    "Draft your own pathway",
    () =>
      `<form data-f="pp" class="col pf-form" novalidate><input type="hidden" name="pid" value="${d.pid}"><input type="hidden" name="mode" value="3">${fi("pp", "name", "Pathway name", { req: true })}${fi("pp", "steps", "Steps (one per line, 3–5)", { type: "textarea", rows: 5, req: true })}${banner("info", "", "Custom pathways are reviewed by an authorised Reviewer before they are proposed back to you.")}<div class="actions"><span></span><button class="btn btn-p" type="submit">Submit for review</button></div></form>`,
  );
};
// ---- A participant creates and submits a pathway; the Programme Administrator assigns a reviewer (Steward or
// Faculty), who approves it, rejects it or asks for changes; the participant updates and resubmits.
const PW_OPEN = ["Awaiting reviewer", "In review", "Changes requested", "Rejected"];
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
  return (
    card(
      "Pathways you submitted",
      "Reviewed by a Steward or Faculty member assigned by the Programme Administrator.",
      mine
        .map(
          (p) =>
            `<div class="lrow hm-row pw-row"><span class="tile t-soft" aria-hidden="true">${ic("route", 16)}</span><div class="lt"><b>${h(p.name)}</b><p class="cap">${p.steps.map((s) => h(s.t)).join(" → ")}</p><p class="cap pw-state">${p.state === "Awaiting reviewer" ? "Waiting for a reviewer to be assigned" : p.state === "In review" ? "With " + nm(p.reviewer) + " for review" : p.state === "Changes requested" ? "Changes requested by " + nm(p.reviewer) : "Rejected by " + nm(p.reviewer)}</p>${p.reviewNote && ["Changes requested", "Rejected"].includes(p.state) ? `<p class="pw-note">${h(p.reviewNote)}</p>` : ""}</div><div class="hm-row-r">${pill(p.state, { "Changes requested": "p-amber", Rejected: "p-red" }[p.state])}${B("View activity", "pwActivity", { id: p.id })}${p.state === "Changes requested" ? B("Update and resubmit", "pwUpd", { id: p.id }, "btn-p btn-sm") : ""}</div></div>`,
        )
        .join(""),
    ) + '<div class="pf-gap"></div>'
  );
}
function pwToReviewCard() {
  const mine = S.pathways.filter((p) => p.reviewer === myId() && p.state === "In review" && inCtx(p));
  if (!mine.length && role() !== "F") return "";
  return (
    card(
      "Pathways assigned to you for review",
      "Approve to make the pathway current for the participant, ask for changes, or reject it.",
      mine
        .map(
          (p) =>
            `<div class="lrow hm-row pw-row"><span class="tile t-soft" aria-hidden="true">${ic("route", 16)}</span><div class="lt"><b>${h(p.name)}</b><p class="cap">For ${nm(p.pid)} · ${h(p.mode)}${p.resubmitted ? " · resubmitted " + fmt(p.resubmitted) : ""}</p><ol class="req-list pw-list">${p.steps.map((s) => `<li>${h(s.t)}</li>`).join("")}</ol>${p.note ? `<p class="cap">Participant’s note: ${h(p.note)}</p>` : ""}</div><div class="hm-row-r">${B("View activity", "pwActivity", { id: p.id })}${B("Reject", "pwDec", { id: p.id, v: "Rejected" })}${B("Request changes", "pwDec", { id: p.id, v: "Changes requested" })}${B("Approve", "pwDec", { id: p.id, v: "Current" }, "btn-p btn-sm")}</div></div>`,
        )
        .join("") || empty("check", "Nothing to review", "Pathways the Programme Administrator assigns to you appear here."),
    ) + '<div class="pf-gap"></div>'
  );
}
function pwForm(p) {
  const tpls = S.templates.filter((t) => t.status === "Approved");
  const src = fv("pwn", "src", p ? p.tpl || "custom" : "custom");
  const tpl = byId("templates", src);
  return `<form data-f="pwn" class="col pf-form" novalidate><input type="hidden" name="id" value="${p ? p.id : ""}">${p && p.reviewNote ? banner("warn", "Changes requested by " + nm(p.reviewer), h(p.reviewNote)) : ""}${p ? "" : fi("pwn", "src", "Start from", { type: "select", opts: [["custom", "My own steps"], ...tpls.map((t) => [t.id, "Template: " + t.name])], ch: "pwnSrc" })}${fi("pwn", "name", "Pathway name", { req: true, value: p ? p.name : tpl ? tpl.name : "" })}${fi("pwn", "steps", "Steps (one per line, 3–5)", { type: "textarea", rows: 5, req: true, value: p ? p.steps.map((s) => s.t).join("\n") : tpl ? tpl.steps.join("\n") : "" })}${fi("pwn", "note", p ? "What you changed" : "Note for the reviewer (optional)", { type: "textarea", rows: 2, req: !!p })}${banner("info", "", "The Programme Administrator assigns a Steward or Faculty member to review your pathway. It becomes current when they approve it.")}<div class="actions"><span></span><button class="btn btn-p" type="submit">${p ? "Resubmit for review" : "Submit for review"}</button></div></form>`;
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
  if (tpl) Object.assign(x, { name: tpl.name, steps: tpl.steps.join("\n") });
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
  if (!validate("pwn", d, { name: ["req"], steps: stepsRule, ...(p0 ? { note: ["req"] } : {}) })) return render();
  const steps = d.steps
    .split("\n")
    .filter((x) => x.trim())
    .map((t) => ({ t: t.trim(), done: false }));
  if (p0) {
    Object.assign(p0, { name: d.name.trim(), steps, state: "In review", resubmitted: today(), note: d.note.trim() });
    pwLog(p0, "Updated and resubmitted: " + d.note.trim());
    notify(p0.reviewer, "Pathway resubmitted for your review: " + p0.name + " (" + me().name + ")", "pathway");
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
A.pwAssign = (d) => {
  clearF("pwas");
  const p = byId("pathways", d.id);
  const rv = S.assign.filter((a) => a.ctx === p.ctx && roleBase(a.role) === "F" && a.status === "Active");
  modal(
    "Assign a reviewer",
    () =>
      `<form data-f="pwas" class="col pf-form" novalidate><input type="hidden" name="id" value="${p.id}">${dl([["Pathway", h(p.name)], ["Participant", nm(p.pid)], ["Steps", p.steps.map((s) => h(s.t)).join(" → ")]])}${fi("pwas", "rv", "Steward or Faculty member", { type: "select", req: true, ph: "Choose a reviewer", opts: rv.map((a) => [a.pid, P(a.pid).name + " · " + ROLE[a.role]]) })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Assign</button></div></form>`,
  );
};
F.pwas = (d) => {
  if (!validate("pwas", d, { rv: [["req", "Choose a reviewer."]] })) return render();
  const p = byId("pathways", d.id);
  p.reviewer = d.rv;
  p.state = "In review";
  pwLog(p, "Reviewer assigned by " + me().name + ": " + P(d.rv).name);
  notify(d.rv, "Pathway assigned to you for review: " + p.name + " (" + P(p.pid).name + ")", "pathway");
  notify(p.pid, "A reviewer was assigned to your pathway “" + p.name + "”: " + P(d.rv).name, "pathway");
  audit("Pathway reviewer assigned", p.id, d.rv);
  UI.modal = null;
  clearF("pwas");
  toast("Reviewer assigned.");
  ok();
};
A.pwDec = (d) => {
  const p = byId("pathways", d.id);
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
    d.v === "Rejected" ? "Reject pathway" : "Request changes",
    () =>
      `<form data-f="pwd" class="col pf-form" novalidate><input type="hidden" name="id" value="${p.id}"><input type="hidden" name="v" value="${d.v}">${dl([["Pathway", h(p.name)], ["Participant", nm(p.pid)]])}${fi("pwd", "note", d.v === "Rejected" ? "Why it is rejected" : "What needs to change", { type: "textarea", rows: 3, req: true })}<div class="actions"><span></span><button class="btn ${d.v === "Rejected" ? "btn-d" : "btn-p"}" type="submit">${d.v === "Rejected" ? "Reject" : "Send back for changes"}</button></div></form>`,
  );
};
F.pwd = (d) => {
  if (!validate("pwd", d, { note: ["req", ["min", 5]] })) return render();
  const p = byId("pathways", d.id);
  p.state = d.v === "Rejected" ? "Rejected" : "Changes requested";
  p.reviewNote = d.note.trim();
  pwLog(p, (d.v === "Rejected" ? "Rejected by " : "Changes requested by ") + me().name + ": " + p.reviewNote);
  notify(p.pid, (d.v === "Rejected" ? "Your pathway was rejected: " : "Changes requested on your pathway: ") + p.name, "pathway");
  audit("Pathway " + p.state.toLowerCase(), p.id, p.reviewNote);
  UI.modal = null;
  clearF("pwd");
  toast(d.v === "Rejected" ? "Rejected. The participant has been told why." : "Sent back to the participant for changes.");
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
  pwLog(p, "Returned by Reviewer — changes requested: " + d.why);
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
  pwLog(p, "Accepted the pathway — it became current");
  notify(p.by, `${me().name} accepted the pathway “${p.name}”`, "pathway");
  audit("Pathway accepted", p.id, "");
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
  pwLog(p, "Requested changes: " + d.why);
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
  UI.form.pwv = { steps: p.steps.map((s) => s.t).join("\n") };
  modal(
    "Revise and re-propose",
    () =>
      `<form data-f="pwv" class="col pf-form" novalidate><input type="hidden" name="id" value="${p.id}">${p.changeReq ? banner("warn", "Change requested", h(p.changeReq)) : ""}${fi("pwv", "steps", "Steps (one per line, 3–5)", { type: "textarea", rows: 5, req: true })}${fi("pwv", "note", "What you changed", { req: true })}${banner("info", "", p.mode.startsWith("3") ? "Custom pathways go back to a Reviewer before the participant sees them." : "The revised pathway goes straight back to the participant to accept.")}<div class="actions"><span></span><button class="btn btn-p" type="submit">Re-propose</button></div></form>`,
  );
};
F.pwv = (d) => {
  if (
    !validate("pwv", d, {
      steps: [
        "req",
        [
          "fn",
          {
            f: (v) => {
              const n = v.split("\n").filter((x) => x.trim()).length;
              return n >= 3 && n <= 5;
            },
            m: "Enter 3 to 5 steps.",
          },
        ],
      ],
      note: ["req"],
    })
  )
    return render();
  const p = byId("pathways", d.id);
  p.steps = d.steps
    .split("\n")
    .filter((x) => x.trim())
    .map((t) => ({ t: t.trim(), done: false }));
  p.state = p.mode.startsWith("3") ? "In review" : "Proposed to participant";
  p.changeReq = "";
  pwLog(p, "Revised and re-proposed: " + d.note);
  if (p.state === "In review")
    S.assign
      .filter((a) => a.ctx === p.ctx && a.bundles.includes("Reviewer"))
      .forEach((a) =>
        notify(
          a.pid,
          "Revised pathway awaiting approval for " + P(p.pid).name,
          "pathway",
        ),
      );
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
        ],
      )}${fi("pws", "note", "Note (optional)", { type: "textarea", rows: 3, ph: "What you did, what you learned, anything the facilitator should know" })}<div class="field"><label class="lbl" for="pws_f">Supporting files (optional)</label><input id="pws_f" type="file" name="f" multiple class="input" style="padding:8px" data-ch="pwsFiles"><span class="help">Up to ${S.settings.maxFileMB} MB each. Your facilitator and the person who proposed this pathway can see them.</span><div class="pws-list cap"></div></div><div class="actions"><span></span><button class="btn btn-p" type="submit">Mark step complete</button></div></form>`,
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
    source: "Pathway milestone",
    prov: "Activity-derived",
    status: "Pending",
  });
  UI.modal = null;
  clearF("pws");
  if (p.steps.every((x) => x.done)) {
    p.state = "Completed";
    pwLog(p, "All steps complete — pathway completed");
    S.candidates.push({
      id: uid("cd"),
      pid: p.pid,
      field: "Completed learning activity",
      value: p.name,
      source: "Pathway completion",
      prov: "Activity-derived",
      status: "Pending",
    });
    toast("Pathway completed. Profile candidates added for your review.");
  } else
    toast("Step completed. A profile candidate was added for your review.");
  ok();
};
// Full history for the participant and for the people who propose, adapt and approve pathways.
A.pwActivity = (d) => {
  const p = byId("pathways", d.id);
  const acts = (p.activity || [])
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at));
  modal(
    "Pathway activity · " + h(p.name),
    `<div class="col pw-act">${dl([
      ["Participant", nm(p.pid)],
      ["Mode", h(p.mode)],
      ["Proposed by", nm(p.by)],
      [
        "State",
        pill(p.state === "Draft" && p.changeReq ? "Change requested" : p.state),
      ],
      p.changeReq &&
        p.state === "Draft" && ["Open change request", h(p.changeReq)],
    ])}<div><h3 class="h3 pw-h">Steps</h3>${table(
      ["Step", "Status", "Completed by", "Completed on", "Note and files"],
      p.steps.map((s, i) => [
        `${i + 1}. ${h(s.t)}`,
        pill(s.done ? "Done" : "Not started"),
        s.doneBy ? nm(s.doneBy) : "",
        s.doneAt ? fmt(s.doneAt) : "",
        s.done && (s.note || (s.files || []).length)
          ? `${s.note ? h(s.note) : ""}${pwFiles(s.files)}`
          : "",
      ]),
    )}</div><div><h3 class="h3 pw-h">History</h3>${
      acts.length
        ? `<ol class="mtl">${acts.map((a) => `<li class="done"><span class="mtl-dot">${ic("check", 13)}</span><div class="col"><b>${h(a.t)}</b><span class="cap">${nm(a.by)} · ${fmt(a.at)}</span></div></li>`).join("")}</ol>`
        : '<p class="cap">No recorded activity yet.</p>'
    }</div></div>`,
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
    return deny("AI processing consent is not granted");
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
    const step = pw && pw.steps.find((s) => !s.done);
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
          ? `Your next pathway step is “${step.t}”. ${nextAction()[0]} is also waiting for you. Approved sources do not cover timing, so agree a date with your mentor or steward.`
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
