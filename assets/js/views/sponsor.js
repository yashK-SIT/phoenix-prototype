// ---------- SPONSOR PROJECTS: Explore board → Project module → Action Workspace (replaces the Open Challenges module) ----------
// A Sponsor lists a project under an alias made for it. It is one record in S.projects from the start, so applying
// never copies it. Participants and Collaborators open it from the Explore board ("View and Apply") and send their
// interest (stored in p.shortlist); it then appears in their Projects. The Sponsor designates the main owner(s) from
// the applicants and chooses where the work starts; from then on the
// project follows the existing project flow (Circle, Rope Team and Action Workspace, linked in any order).
// Sponsor-defined milestones are ordinary Action Workspace milestones carrying a sponsor requirement (m.sp): agreed by
// both sides, completed by the owner, approved by the Sponsor. Payment status is recorded by hand: PHOENIX has no
// payment gateway and never initiates, processes or verifies a payment. A disagreement goes to an independent human
// Steward, who sees both sides under aliases, never their names or organisations.
// Sponsors are never members of the workspace: they see its milestones, payments and disputes only (route sproom).
const SP_CUR = ["USD", "GBP", "EUR", "INR", "KES", "ZAR"];
const SP_TYPES = [
  ["Need", "Something you or a community lacks."],
  ["Opportunity", "An opening others could take up."],
  ["Project idea", "Something you want to build or test."],
];
const SP_WORDS = [
  ["Amber", "Cedar", "Cobalt", "Juniper", "Harbor", "Linden", "Saffron", "Willow", "Quartz", "Meadow", "Indigo", "Russet"],
  ["Heron", "Kestrel", "Lantern", "Compass", "Beacon", "Fern", "Otter", "Summit", "Wren", "Orchard", "Delta", "Falcon"],
];
Object.assign(SC, {
  "Open for applications": "p-teal",
  "Applications closed": "p-grey",
  "Interest sent": "p-teal",
  Withdrawn: "p-grey",
  Shortlisted: "p-teal",
  Agreed: "p-teal",
  "Awaiting sponsor review": "p-amber",
  "More information requested": "p-amber",
  "In dispute": "p-red",
  "Awaiting Steward assignment": "p-amber",
  "Awaiting Steward acceptance": "p-amber",
  Decided: "p-navy",
  "Team formed": "p-green",
  Selected: "p-green",
  "Flagged for review": "p-red",
  "Pending verification": "p-amber",
});
// Payment status is recorded, never processed. "Disputed" is set only by a dispute, never by hand.
const PAY_ST = ["Pending", "Due", "Paid Offline", "On Hold", "Disputed"];
const PAY_MANUAL = PAY_ST.filter((s) => s !== "Disputed");
const PAY_PILL = { Pending: "p-grey", Due: "p-amber", "Paid Offline": "p-green", "On Hold": "p-grey", Disputed: "p-red" };
const payPill = (s) => pill(s, PAY_PILL[s]);
const SP_OFFLINE =
  "PHOENIX records payment status only. It has no payment gateway and never initiates, processes, holds or verifies a payment: money moves offline between the Sponsor and the project owner.";
// An alias nobody else holds: "<prefix> · <Word> <Word> <nn>". It belongs to one project (or one dispute) only.
function spAlias(prefix) {
  const taken = new Set([...S.projects.map((p) => p.alias), ...(S.disputes || []).flatMap((d) => Object.values(d.aliases || {}))]);
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  let a;
  do a = prefix + " · " + pick(SP_WORDS[0]) + " " + pick(SP_WORDS[1]) + " " + (10 + Math.floor(Math.random() * 90));
  while (taken.has(a));
  return a;
}

// ---- selectors and who is who
const isSpP = (p) => !!p && !!p.sponsor;
const SP_LISTING = ["Open", "Listing closed", "Withdrawn"];
// Still a listing: no owner designated yet.
const spListing = (p) => isSpP(p) && SP_LISTING.includes(p.status);
const spListed = (p) => isSpP(p) && p.status === "Open" && (!p.brief.closes || p.brief.closes >= today());
const spLabel = (p) => ({ Open: "Open for applications", "Listing closed": "Applications closed", Withdrawn: "Withdrawn" })[p.status] || p.status;
const spOwners = (p) => (p && p.owners) || [];
const spSponsor = (p) => isSpP(p) && role() === "S" && p.sponsor === myId();
const spOwner = (p) => isSpP(p) && role() !== "S" && spOwners(p).includes(myId());
// The two parties to the agreement: the Sponsor, and the designated owner(s) who act for the team.
const spSide = (p) => (spSponsor(p) ? "sponsor" : spOwner(p) ? "owner" : null);
const spShortlist = (p) => (p.shortlist || []).filter((s) => s.status !== "Withdrawn");
const spShort = (p, pid = myId()) => !!p && spShortlist(p).find((s) => s.pid === pid);
const spCanShort = (p) => ["P", "C"].includes(role()) && inCtx(p) && spListed(p) && p.sponsor !== myId() && !spShort(p);
// Participants and Collaborators open a sponsor project in Projects once they applied to it or own it.
const spSees = (p) => isSpP(p) && (spOwners(p).includes(myId()) || !!spShort(p));
const spRoom = (p) => (p && p.room && byId("rooms", p.room)) || null;
const spOfRoom = (x) => {
  const p = roomProject(x);
  return isSpP(p) ? p : null;
};
const spTeam = (p) => {
  const x = spRoom(p);
  return [...new Set([...spOwners(p), ...(x ? x.members.filter((m) => !m.status || m.status === "Active").map((m) => m.pid) : [])])];
};
// Financial records: the two sides, and Organization Admins of the programme (read-only).
const spFin = (p) => !!spSide(p) || (role() === "A" && inCtx(p));
const spCur = (p) => (p.brief && p.brief.currency) || "USD";
// Everyone but the Sponsor sees the project's alias.
const spWho = (p) => (p.sponsor === myId() ? nm(p.sponsor) + ' <span class="cap">(you)</span>' : h(p.alias));
const spNm = (p, pid) =>
  pid === p.sponsor
    ? (p.sponsor === myId() ? "You" : h(p.alias)) + ' <span class="cap">(sponsor)</span>'
    : nm(pid) + (spOwners(p).includes(pid) ? ' <span class="cap">(project owner)</span>' : "");
const spLog = (p, t) => p.history.push({ at: now(), by: myId(), t });
const fmtD = (s) => fmt(String(s || "").slice(0, 10));
const spClip = (s, n) => (String(s || "").length > n ? String(s).slice(0, n).replace(/\s+\S*$/, "") + "…" : String(s || ""));
const spText = (s) => (s ? h(s).replace(/\n/g, "<br>") : '<span class="cap">—</span>');
const spFiles = (fs) =>
  (fs || []).length
    ? `<span class="sp-files">${fs.map((f) => `<button type="button" class="sp-file" data-a="fakeDl" data-n="${h(f.n)}">${ic("clip", 13)}${h(f.n)}</button>`).join("")}</span>`
    : "";
// File names and sizes from a multi-file input; null (with a message) when a file is too large or not allowed.
function spTakeFiles(form) {
  const fs = [...((form && form.querySelector("input[type=file]")) || { files: [] }).files];
  const big = fs.find((f) => f.size > S.settings.maxFileMB * 1048576);
  if (big) {
    toast(big.name + " is over " + S.settings.maxFileMB + " MB. Link large media instead.", "err");
    return null;
  }
  const bad = fs.find((f) => /\.(exe|bat|cmd|sh|msi)$/i.test(f.name));
  if (bad) {
    toast(bad.name + ": this file type is not allowed.", "err");
    return null;
  }
  return fs.map((f) => ({ n: f.name, mb: +(f.size / 1048576).toFixed(2) }));
}
// The Sponsor works in a scoped view of the workspace (sproom); everyone else in the workspace itself.
const spWsRoute = (p, pid) => (pid === p.sponsor ? "sproom" : "room");
const spTell = (p, x, pids, t, tab, extra = {}) =>
  [...new Set(pids)]
    .filter((pid) => pid && pid !== myId())
    .forEach((pid) => notify(pid, t, spWsRoute(p, pid), { id: x.id, tab: tab || (pid === p.sponsor ? "ms" : "plan"), ...extra }));
const spOther = (p, side) => (side === "sponsor" ? spOwners(p) : [p.sponsor]);

// ---- sponsor milestones: ordinary workspace milestones with a sponsor requirement (m.sp)
const spMs = (x) => ((x && x.milestones) || []).filter((m) => m.sp);
const SR_LABEL = { Submitted: "Awaiting sponsor review" };
const srLabel = (m) => SR_LABEL[m.sp.sr] || m.sp.sr;
const SR_AGREED = ["Agreed", "Submitted", "More information requested", "Approved"];
const spMsTotal = (x, skip) => spMs(x).filter((m) => m.id !== skip).reduce((a, m) => a + (+m.sp.amount || 0), 0);
// ---- payment status records
const spPays = (x) => (x.payments = x.payments || []);
const spMsPays = (x, m) => spPays(x).filter((p) => p.ms === m.id);
const spSum = (x, st) => spPays(x).filter((p) => p.status === st).reduce((a, p) => a + (+p.amount || 0), 0);
const spMsPayState = (x, m) => {
  const ps = spMsPays(x, m);
  if (!ps.length) return "";
  for (const s of ["Disputed", "On Hold", "Due", "Pending"]) if (ps.some((p) => p.status === s)) return s;
  return "Paid Offline";
};
// ---- disputes
const spDsps = (x) => (S.disputes || []).filter((d) => d.room === x.id);
const dspOpen = (d) => !["Decided", "Withdrawn"].includes(d.status);
const dspOn = (x, kind, id) => spDsps(x).find((d) => d.subject.kind === kind && d.subject.id === id && dspOpen(d)) || null;
// While a person is the independent Steward on an open dispute, the project's identifying records stay hidden from them.
const spHidden = (p) => !!p && (S.disputes || []).some((d) => d.pr === p.id && d.steward === myId() && dspOpen(d));

// ---- what is waiting for the person signed in (My PHOENIX next action, menu counts): [title, detail, route, params]
function spTodo() {
  const out = [];
  S.projects
    .filter((p) => isSpP(p) && inCtx(p))
    .forEach((p) => {
      const side = spSide(p);
      if (!side) return;
      if (side === "sponsor" && spListing(p) && p.status !== "Withdrawn") {
        const n = spaNew(p).length;
        if (n) out.push(["Review " + n + " new application" + (n === 1 ? "" : "s"), h(p.title), "sponsorapps", { id: p.id }]);
        else if (spaShort(p).length) out.push(["Assign roles and finalize the team", h(p.title) + " · " + spaShort(p).length + " shortlisted", "sponsorapps", { id: p.id }]);
      }
      const x = spRoom(p);
      if (!x) return;
      const go_ = side === "sponsor" ? ["sproom", { id: x.id, tab: "ms" }] : ["room", { id: x.id, tab: "plan" }];
      const add = (t, s) => out.push([t, h(p.title) + " · " + s, ...go_]);
      spMs(x).forEach((m) => {
        const s = m.sp;
        if (s.sr === "Proposed" && !s.ok[side]) add("Review a proposed milestone", h(m.t));
        if (s.sr === "Changes requested" && s.by === myId()) add("Revise a milestone", h(m.t));
        if (dspOn(x, "ms", m.id)) return;
        if (side === "sponsor" && s.sr === "Submitted") add("Review a completed milestone", h(m.t));
        if (side === "owner" && s.sr === "More information requested") add("Send what the sponsor asked for", h(m.t));
      });
      if (side === "sponsor")
        spPays(x)
          .filter((y) => y.status === "Due")
          .forEach((y) => out.push(["Record an offline payment", h(p.title) + " · " + h(y.ref) + " is due", "sproom", { id: x.id, tab: "pay" }]));
    });
  return out;
}

// ---------- EXPLORE BOARD: listing, details page and expressions of interest ----------
// "View and Apply" opens the sponsor's full listing; "I'm interested" records an application on the same project
// record (p.shortlist), so the Sponsor's page, the owner choice and the Project module read it unchanged.
const spBoardSub = (p) =>
  [h(p.type || "Project"), (p.tags || []).slice(0, 2).map(h).join(", "), p.area ? h(p.area) : "", p.brief.budget ? "Budget " + money(spCur(p), p.brief.budget) : "", p.brief.closes ? "applications close " + fmt(p.brief.closes) : ""]
    .filter(Boolean)
    .join(" · ");
function spBoardAct(p) {
  if (p.sponsor === myId()) return L("Manage project", "sponsorproject", { id: p.id }, "btn btn-s btn-sm");
  if (spShort(p)) return pill("Interest sent") + L("View details", "sponsorlisting", { id: p.id }, "btn btn-s btn-sm");
  if (spCanShort(p)) return L("View and Apply", "sponsorlisting", { id: p.id }, "btn btn-p btn-sm");
  return L("View details", "sponsorlisting", { id: p.id }, "btn btn-s btn-sm");
}
const spBoardItems = () =>
  S.projects
    .filter((p) => inCtx(p) && spListed(p))
    .map((p) => ({ k: "opp", kl: "Sponsor project", at: p.at, t: p.title, d: spClip(p.brief.problem, 240), s: spBoardSub(p), who: h(p.alias), src: "Programme audience", act: spBoardAct(p) }));
// Who may read a listing: anyone in the programme while it is listed; afterwards its applicants, its sponsor, and
// Faculty/Stewards and Organization Admins of the programme.
const spListingSees = (p) => isSpP(p) && inCtx(p) && (spListed(p) || !!spShort(p) || p.sponsor === myId() || ["F", "A"].includes(role()));
const spOrgOf = (pid) => (S.orgs.find((o) => o.id === P(pid).org) || {}).name || "";
// The profile summary an applicant chose to share with the sponsor, for this project only.
function spProfile(s) {
  if (!s.share) return '<p class="cap">Not shared. The applicant sent their name, role, organisation and note only.</p>';
  const pr = (S.profiles || {})[s.pid] || {};
  const cl = S.claims.filter((c) => c.pid === s.pid && c.state === "Current" && c.vis === "Authorised discovery");
  const ev = S.evidence.filter((e) => e.owner === s.pid && e.review === "Approved").length;
  const done = S.projects.filter((p) => p.owner === s.pid && p.stage === "Closed").length;
  return dl([
    ["Bio", pr.bio ? h(pr.bio) : '<span class="cap">No bio</span>'],
    ["Discoverable claims", cl.length ? cl.map((c) => h(c.field) + ": " + h(c.value) + ` <span class="cap">(${h(c.prov)})</span>`).join("<br>") : '<span class="cap">None</span>'],
    ["Approved evidence", ev + " item" + (ev === 1 ? "" : "s")],
    ["Completed projects", String(done)],
  ]);
}
function spApplyCard(p) {
  const mine = spShort(p);
  if (p.sponsor === myId()) return card("Your project", "", '<p class="cap">This is how people in the programme see your listing.</p>', L("Manage project", "sponsorproject", { id: p.id }, "btn btn-s btn-sm"));
  if (mine)
    return card(
      "Interest sent",
      "",
      banner("ok", "Your application was sent to the sponsor", "Sent " + fmtD(mine.at) + ". The sponsor reviews applications, shortlists people and finalizes the team; you are told at each step. The project is also listed in your Projects.") +
        spaMine(p) +
        (mine.note ? dl([["Your note", spText(mine.note)]]) : ""),
      "",
      "accent",
    );
  if (!["P", "C"].includes(role())) return card("Who can apply", "", '<p class="cap">Participants and Collaborators in this programme apply to sponsor projects.</p>');
  if (!spCanShort(p)) return card("Applications closed", "", '<p class="cap">This project is not accepting applications.</p>');
  return card(
    "Interested?",
    "Applications close " + fmt(p.brief.closes),
    `<form data-f="spsl" class="col fgap" novalidate><input type="hidden" name="id" value="${p.id}">${fi("spsl", "note", "Why you are interested (optional)", { type: "textarea", rows: 4, max: 1000, help: "What you would bring. The sponsor reads this when choosing the project owner." })}${fi("spsl", "share", "Also share my profile summary (bio, discoverable claims, counts of approved evidence and completed projects)", { type: "checkbox" })}${banner("info", "", "The sponsor sees your name, your role in this programme, your organisation and your note. The sponsor stays under the alias.")}<button class="btn btn-p btn-block" type="submit">${ic("check", 16)}I’m interested</button></form>`,
    "",
    "accent",
  );
}
route("sponsorlisting", "any", () => {
  const p = byId("projects", UI.p.id);
  if (!p || !spListingSees(p)) return head("Sponsor project", "") + card("", "", empty("megaphone", "This project is not available", "It may have closed or been withdrawn.", L("Explore board", "board", {}, "btn btn-s btn-sm")));
  const b = p.brief;
  const x = spRoom(p);
  const ms = x ? spMs(x) : [];
  const fact = (k, v) => `<div class="sp-fact"><span class="cap">${k}</span><b>${v}</b></div>`;
  const main =
    `<div class="sp-facts">${fact("Type", h(p.type || "Project"))}${fact("Location", h([p.area, p.country].filter(Boolean).join(", ") || "—"))}${fact("Indicative budget", b.budget ? money(spCur(p), b.budget) : "Agreed with the owner")}${fact("Applications close", b.closes ? fmt(b.closes) : "—")}</div>` +
    card("About the project", "", `<p class="sp-lead">${spText(b.problem)}</p>${(p.tags || []).length ? `<div class="rec-tags prj-tags">${p.tags.map((t) => `<span class="rec-tag">${h(t)}</span>`).join("")}</div>` : ""}`) +
    card("Objectives and expected outcomes", "", dl([["Objectives", spText(b.objectives)], ["Expected outcomes", spText(b.outcomes)]])) +
    card("Requirements and eligibility", "", dl([["What the project needs", spText(b.needs)], ["Who can apply", b.eligibility ? spText(b.eligibility) : "Participants and Collaborators in " + h(ctxName(p.ctx))], ["Project owner", "Chosen by the sponsor from the people who apply; holds a Participant role"]])) +
    card(
      "Milestones and payment",
      "",
      ms.length
        ? table(["#", "Milestone", "Due", "Amount"], ms.map((m) => [String(m.sp.n), h(m.t), m.due ? fmt(m.due) : "—", money(spCur(p), m.sp.amount)]))
        : `<p class="cap">Milestones, with deliverables, acceptance criteria and amounts, are agreed between the sponsor and the chosen owner in the project’s ${WL()}. Payments are made offline; PHOENIX records their status only.</p>`,
    );
  const rail =
    spApplyCard(p) +
    card("Sponsor", "", `<div class="sp-alias-box">${ic("shield", 18)}<div><b><span class="sp-alias">${h(p.alias)}</span></b><p class="cap">An alias made for this project. The sponsor’s name and organisation are not shown.</p></div></div>`) +
    card("What happens next", "", `<ol class="sp-how sp-how-v">${[["Apply", "Send your interest with a short note."], ["Selection", "The sponsor chooses the project owner from the applicants."], ["Start", "The owner starts the work in a Circle, Rope Team or " + WL() + " and invites the team."]].map(([t_, d_], i) => `<li><span class="sp-how-n" aria-hidden="true">${i + 1}</span><div><b>${t_}</b><p class="cap">${d_}</p></div></li>`).join("")}</ol>`);
  return (
    head(h(p.title), "Sponsor project · listed " + fmtD(p.at) + " by " + `<span class="sp-alias">${ic("shield", 12)}${h(p.alias)}</span>`, pill(spShort(p) ? "Interest sent" : spLabel(p)), [["Explore board", "board"], [h(p.title)]]) +
    `<div class="sp-body sp-listing">${hmCols(main, rail)}</div>`
  );
});
// I'm interested: one application per person and project. A withdrawn application is reopened, never duplicated.
F.spsl = (d) => {
  const p = byId("projects", d.id);
  if (spShort(p)) {
    toast("You have already applied to this project.");
    return go("sponsorlisting", { id: p.id });
  }
  p.shortlist = p.shortlist || [];
  const prev = p.shortlist.find((x) => x.pid === myId());
  const rec = { pid: myId(), at: now(), note: (d.note || "").trim(), share: d.share === "yes", status: "Shortlisted" };
  if (prev) {
    Object.assign(prev, rec);
    delete prev.out;
  } else p.shortlist.push(rec);
  spLog(p, me().name + " applied (expressed interest)");
  notify(p.sponsor, me().name + " applied to your project “" + p.title + "”", "sponsorproject", { id: p.id });
  audit("Sponsor project application", p.id, rec.share ? "profile summary shared" : "");
  clearF("spsl");
  toast("Thank you. Your interest was sent to the sponsor.");
  save();
  go("sponsorlisting", { id: p.id });
};
A.spUnshort = (d) => {
  const p = byId("projects", d.id);
  const s = spShort(p);
  if (!s) return render();
  s.status = "Withdrawn";
  s.out = now();
  spLog(p, me().name + " withdrew their application");
  audit("Sponsor project application withdrawn", p.id, "");
  toast("Application withdrawn.");
  save();
  go("projects");
};
// The sponsor reads one application: what the applicant sent, and the profile summary if they chose to share it.
A.spApp = (d) => {
  const p = byId("projects", d.id);
  const s = p && spShortlist(p).find((x) => x.pid === d.pid);
  if (!s || !spSponsor(p)) return deny("only the sponsor sees applications to their own project");
  modal(
    "Application · " + nm(s.pid),
    () =>
      `<div class="col fgap">${dl([
        ["Applicant", nm(s.pid)],
        ["Role in this programme", h(roleName(ctxRole(s.pid, p.ctx), p.ctx) || "—")],
        ["Organisation", h(spOrgOf(s.pid) || "—")],
        ["Applied", fmtD(s.at)],
        ["Note", s.note ? spText(s.note) : '<span class="cap">No note</span>'],
      ])}<h3 class="h3">Profile summary</h3>${spProfile(s)}<div class="actions"><span></span>${B("Close", "closeM")}</div></div>`,
  );
};

// ---------- SPONSOR: list, create and edit ----------
const spNotS = () =>
  head("Sponsor projects", "") +
  card("", "", empty("megaphone", "Sponsor projects are managed by their Sponsor", "Participants and Collaborators find them on the Explore board and apply there.", L("Explore board", "board", {}, "btn btn-s btn-sm")));
const spHow = () =>
  card(
    "How a sponsor project works",
    "",
    `<ol class="sp-how">${[
      ["List", "List the project. It appears under Opportunities on the Explore board under an alias made for it."],
      ["Applications", "Participants and Collaborators view it and send their interest. It appears in their Projects."],
      ["Owner", "Choose the main owner(s) from the applicants and where the work starts."],
      ["Milestones", "Agree milestones with the owner in the project’s " + WL() + "."],
      ["Approve", "Review completed milestones, approve them or ask for what is missing."],
      ["Payments", "Pay offline and record the payment status. Disagreements go to an independent Steward."],
    ]
      .map(([t, s], i) => `<li><span class="sp-how-n" aria-hidden="true">${i + 1}</span><div><b>${t}</b><p class="cap">${s}</p></div></li>`)
      .join("")}</ol>`,
    "",
    "sp-how-card",
  );
route("sponsorprojects", "funding", () => {
  if (role() !== "S") return spNotS();
  const mine = S.projects.filter((p) => isSpP(p) && inCtx(p) && p.sponsor === myId());
  return (
    head("My projects", "Projects you sponsor, listed under an alias. You see each project’s milestones, payments and disputes; the team’s own work stays with the team.", B(ic("plus", 16) + "Create project", "spNew", {}, "btn-p")) +
    spHow() +
    card(
      "Your projects",
      "",
      dataView("sp:mine", {
        label: "projects",
        items: mine,
        search: (p) => [p.title, p.alias, p.brief.problem, spLabel(p)].join(" "),
        quick: { label: "Status", options: [...new Set(mine.map(spLabel))].map((v) => [v, v]), test: (p, v) => spLabel(p) === v },
        sorts: [
          ["at", "Newest", (a, b) => String(b.at).localeCompare(String(a.at))],
          ["title", "Title", (a, b) => a.title.localeCompare(b.title)],
        ],
        row: (p) => {
          const x = spRoom(p);
          const todo = spTodo().filter((t) => (t[3].id === p.id || (x && t[3].id === x.id))).length;
          return {
            lead: `<span class="tile t-ember" aria-hidden="true">${ic("megaphone", 18)}</span>`,
            title: L(h(p.title), "sponsorproject", { id: p.id }, "dv-link"),
            sub: h(p.alias),
            meta: [
              spListing(p) ? spShortlist(p).length + " application" + (spShortlist(p).length === 1 ? "" : "s") : "Owner <b>" + spOwners(p).map(nm).join(", ") + "</b>",
              x ? spMs(x).length + " milestone" + (spMs(x).length === 1 ? "" : "s") : "",
              todo ? "<b>" + todo + " waiting for you</b>" : "",
            ],
            badges: pill(spLabel(p)),
            primary: L("Open", "sponsorproject", { id: p.id }, "btn btn-s btn-sm"),
          };
        },
        empty: ["megaphone", "No projects yet", "Create a project to find people for work you want to fund.", B("Create project", "spNew", {}, "btn-p btn-sm")],
      }),
    )
  );
});
A.spNew = (d) => {
  const p = d.id && byId("projects", d.id);
  clearF("spn");
  UI.spAlias = p ? p.alias : spAlias("Sponsor");
  UI.form.spn = p
    ? { id: p.id, type: p.type, title: p.title, problem: p.brief.problem, tags: (p.tags || []).slice(), objectives: p.brief.objectives, outcomes: p.brief.outcomes, needs: p.brief.needs, eligibility: p.brief.eligibility || "", country: p.country, area: p.area || "", budget: p.brief.budget || "", currency: spCur(p), closes: p.brief.closes }
    : { type: "Project idea", currency: "USD", country: ctxCountry(ctxId()) };
  go("sponsornew", p ? { id: p.id } : {});
};
A.spEdit = (d) => A.spNew(d);
// Choosing a starting point re-renders the cards without losing what was typed.
A.spType = (d, el) => {
  const x = {};
  new FormData(el.closest("form")).forEach((v, k) => (k === "tags" ? (x.tags = [].concat(x.tags || [], v)) : (x[k] = v)));
  UI.form.spn = x;
  render();
};
route("sponsornew", "funding", () => {
  const f = "spn";
  const p = UI.p.id && byId("projects", UI.p.id);
  if (role() !== "S" || (UI.p.id && !(spSponsor(p) && spListing(p) && p.status !== "Withdrawn"))) return spNotS();
  if (!UI.form.spn) UI.form.spn = { type: "Project idea", currency: "USD" };
  if (!UI.spAlias) UI.spAlias = p ? p.alias : spAlias("Sponsor");
  const type = fv(f, "type", "Project idea");
  const tags = [].concat(fv(f, "tags", []));
  const sec = (n, t) => `<div class="np-sh"><span class="np-n" aria-hidden="true">${n}</span><h2 class="h3">${t}</h2></div>`;
  return (
    head(
      p ? "Edit project" : "Define a new project",
      "Start in your own words. Participants and Collaborators read this to decide whether to apply.",
      "",
      [["My projects", "sponsorprojects"], p ? [h(p.title), "sponsorproject", { id: p.id }] : null, [p ? "Edit" : "New project"]].filter(Boolean),
    ) +
    `<div class="g12 np-wrap"><form data-f="spn" class="card c8 col np-form" novalidate>${errSum(f)}<input type="hidden" name="id" value="${p ? p.id : ""}">
  <div class="np-sec">${sec(1, "The idea")}
  <fieldset class="np-fs col"><legend class="lbl">What are you starting with? <span class="req">*</span></legend><div class="g3 np-choices">${SP_TYPES.map(
    ([v, dd]) =>
      `<label class="choice np-choice ${type === v ? "sel" : ""}"><input type="radio" name="type" value="${v}" ${type === v ? "checked" : ""} data-ch="spType"><span class="rad" aria-hidden="true"></span><span class="col np-ct"><b>${v}</b><span class="cap">${dd}</span></span></label>`,
  ).join("")}</div></fieldset>
  ${fi(f, "title", "Working title", { req: true, max: 120, ph: "e.g. Community cooling map for Ward 7" })}
  ${fi(f, "problem", "Describe it in your own words", { type: "textarea", rows: 6, req: true, max: 3000, ph: "What is the need or idea? Who is affected? What would be different if it worked?", help: "At least 40 characters." })}</div>
  <div class="np-sec">${sec(2, "Who should find it")}
  <fieldset class="np-fs col"><legend class="lbl">Areas of interest</legend><div class="np-chips">${[...PROJECT_AREAS, ...tags.filter((t) => !PROJECT_AREAS.includes(t))].map((a) => `<label class="chipchk np-chip"><input type="checkbox" name="tags" value="${h(a)}" ${tags.includes(a) ? "checked" : ""}><span>${h(a)}</span></label>`).join("")}</div><div class="field np-other"><label class="lbl" for="spn_areaOther">Add your own</label><input id="spn_areaOther" name="areaOther" class="input" value="${h(fv(f, "areaOther", ""))}" placeholder="Comma-separated, e.g. Air quality, School gardens" maxlength="160"></div><span class="help">Helps Participants and Collaborators find your project under Opportunities on the Explore board.</span></fieldset></div>
  <div class="np-sec">${sec(3, "Place")}
  <div class="f2">${countryField(f, { help: "The country the project takes place in." })}${fi(f, "area", "Location or programme area (optional)", { ph: "e.g. Ward 7, Excelsior City" })}</div></div>
  <div class="np-sec">${sec(4, "Goals and needs")}
  <div class="f2">${fi(f, "objectives", "Objectives", { type: "textarea", rows: 3, req: true, max: 2000, help: "At least 20 characters." })}${fi(f, "outcomes", "Expected outcomes", { type: "textarea", rows: 3, req: true, max: 2000, help: "At least 20 characters." })}</div>
  ${fi(f, "needs", "Specific needs", { type: "textarea", rows: 3, req: true, max: 2000, ph: "Skills, resources, time commitment, permissions", help: "People read this to decide whether to apply." })}
  ${fi(f, "eligibility", "Eligibility (optional)", { type: "textarea", rows: 2, max: 1000, ph: "e.g. Based in Wards 3 or 7; available on Saturdays", help: "Shown on the project page under “Who can apply”." })}</div>
  <div class="np-sec">${sec(5, "Budget and applications")}
  <div class="f2">${fi(f, "budget", "Indicative budget (optional)", { type: "number", min: 0, step: "1", help: "A guide for the team. Milestone amounts are agreed with the project owner." })}${fi(f, "currency", "Currency", { type: "select", opts: SP_CUR })}</div>
  ${fi(f, "closes", "Applications close on", { type: "date", req: true, help: "You can stop applications earlier." })}
  ${banner("info", "Payments stay offline", SP_OFFLINE)}</div>
  <div class="actions">${L("Cancel", p ? "sponsorproject" : "sponsorprojects", p ? { id: p.id } : {}, "btn btn-g")}<button class="btn btn-p" type="submit">${p ? "Save changes" : "Create project"}</button></div></form>
  <aside class="c4 col np-side"><div class="sp-alias-box">${ic("shield", 18)}<div><b>This project shows as <span class="sp-alias">${h(UI.spAlias)}</span></b><p class="cap">The alias is made for this project only. Your name, organisation and contact details never appear on it, in its ${WL()} or in notices to the team.</p></div></div>${card("What happens next", "", `<p class="cap">Your project is listed under Opportunities on the Explore board. Participants and Collaborators apply; you choose the main owner(s) and where the work starts, then agree milestones in the project’s ${WL()}.</p>`, "", "quiet")}</aside></div>`
  );
});
F.spn = (d) => {
  if (
    !validate("spn", d, {
      title: ["req"],
      type: ["req"],
      problem: ["req", ["min", 40]],
      objectives: ["req", ["min", 20]],
      outcomes: ["req", ["min", 20]],
      needs: ["req", ["min", 10]],
      country: countryRules(),
      budget: [["fn", { f: (v) => !v || +v >= 0, m: "Enter an amount of 0 or more, or leave it empty." }]],
      closes: ["req", "date"],
    })
  )
    return render();
  const tags = [...new Set([...[].concat(d.tags || []), ...(d.areaOther || "").split(",")].map((x) => x.trim().slice(0, 40)).filter(Boolean))];
  const brief = { problem: d.problem.trim(), objectives: d.objectives.trim(), outcomes: d.outcomes.trim(), needs: d.needs.trim(), eligibility: (d.eligibility || "").trim(), budget: d.budget ? +d.budget : null, currency: d.currency || "USD", closes: d.closes };
  const fields = { type: d.type, title: d.title.trim(), desc: brief.problem, tags, country: d.country, area: (d.area || "").trim() };
  let p = d.id && byId("projects", d.id);
  if (p) {
    Object.assign(p, fields);
    p.brief = brief;
    spLog(p, "Project details edited by the sponsor");
    audit("Sponsor project edited", p.id, "");
    toast("Project updated.");
  } else {
    const alias = S.projects.some((x) => x.alias === UI.spAlias) ? spAlias("Sponsor") : UI.spAlias;
    p = { id: uid("pr"), ctx: ctxId(), sponsor: myId(), alias, ...fields, brief, status: "Open", stage: null, owner: null, owners: [], shortlist: [], stewards: [], sections: null, clar: [], thread: [], history: [], at: now() };
    S.projects.push(p);
    spLog(p, "Listed on the Explore board as " + alias);
    audit("Sponsor project created", p.id, alias);
    toast("Project created. It is listed under Opportunities on the Explore board as " + alias + ".");
  }
  UI.spAlias = null;
  clearF("spn");
  save();
  go("sponsorproject", { id: p.id });
};
// Stop or reopen applications, or withdraw the listing. Applicants are told when it is withdrawn.
A.spState = (d) => {
  const p = byId("projects", d.id);
  p.status = d.v;
  if (d.v === "Withdrawn") {
    spShortlist(p).forEach((s) => notify(s.pid, "The sponsor project “" + p.title + "” was withdrawn by " + p.alias, "projects", {}));
    spaChatClose(p, "The sponsor withdrew the project.");
  }
  const t = { Open: ["Applications reopened", "Applications are open again."], "Listing closed": ["Applications stopped", "No new applications will be accepted."], Withdrawn: ["Listing withdrawn and removed from the Explore board", "Withdrawn. It no longer appears on the Explore board."] }[d.v];
  spLog(p, t[0]);
  audit("Sponsor project " + d.v.toLowerCase(), p.id, "");
  toast(t[1]);
  ok();
};

// ---------- SPONSOR: one project ----------
const spGone = () => head("Project", "") + card("", "", empty("megaphone", "This project is not available", "It may have been withdrawn, or it belongs to another sponsor.", L("My projects", "sponsorprojects", {}, "btn btn-s btn-sm")));
function spBriefCard(p, cls = "") {
  if (!isSpP(p)) return "";
  const b = p.brief;
  return card(
    "Sponsor’s brief",
    "Listed by " + spWho(p),
    dl([
      ["Problem", spText(b.problem)],
      ["Objectives", spText(b.objectives)],
      ["Expected outcomes", spText(b.outcomes)],
      ["Specific needs", spText(b.needs)],
      b.budget && ["Indicative budget", money(spCur(p), b.budget)],
      b.eligibility && ["Eligibility", spText(b.eligibility)],
      b.closes && ["Applications close", fmt(b.closes)],
    ]),
    "",
    cls,
  );
}
// The Sponsor's own page for a project they listed (My projects → Open): one header, and its sections in a left
// sub-navigation, as on a Circle. Challenge is the brief; Selection holds the applications and the chat room with the
// shortlist; Team & delivery holds the team, milestones, payments and disputes. Milestones, payments and disputes are
// the project's Action Workspace records, read and acted on here: the Sponsor is still never a member of the workspace.
const spdLabel = (p) => (p.spArchived ? "Archived" : spListing(p) ? spLabel(p) : p.stage === "Closed" ? "Closed" : "Team formed");
const spdOwnerT = (p) => (p.circle ? "Circle owner" : "Project owner");
// An application's place in selection: New, Shortlisted or Not selected while the project is a listing; Selected or
// Not selected once the team is final (team membership counts, for projects finalized before roles were recorded).
const spdSt = (p, s) =>
  s.status === "Withdrawn"
    ? "Withdrawn"
    : spListing(p)
      ? { Shortlisted: "Shortlisted", "Not selected": "Not selected" }[s.sel] || "New"
      : s.sel === "Shortlisted" || spTeam(p).includes(s.pid)
        ? "Selected"
        : "Not selected";
const SPD_ST = { New: "p-navy", Shortlisted: "p-teal", Selected: "p-green", "Not selected": "p-grey", Withdrawn: "p-grey" };
const spdPill = (p, s) => pill(spdSt(p, s), SPD_ST[spdSt(p, s)]);
const spdKpis = (xs) => `<div class="kpis spd-kpis">${xs.map(([l, v]) => `<div class="kpi"><span class="lt">${l}</span><span class="fig">${v}</span></div>`).join("")}</div>`;
const spdTl = (items) =>
  `<ol class="mtl ws-tl">${items.map(([t, at]) => `<li class="done"><span class="mtl-dot">${ic("check", 12)}</span><div class="col"><b>${h(t)}</b><span class="cap">${fmtD(at)}</span></div></li>`).join("")}</ol>`;
const spdNever = () =>
  banner("info", "What sponsors never receive", "Private participant profiles, Purpose Compass responses, private discussions, mentor notes, AI conversations or unapproved evidence. You are never a member of the team’s Circle, Rope Team or " + WL() + ".");
// Sponsor milestones waiting for the sponsor: a proposal to approve, or a completed milestone to review.
const spdMsTodo = (x) => spMs(x).filter((m) => !dspOn(x, "ms", m.id) && (m.sp.sr === "Submitted" || (m.sp.sr === "Proposed" && !m.sp.ok.sponsor)));
route("sponsorproject", "funding", () => {
  const p = byId("projects", UI.p.id);
  if (!p || !spSponsor(p)) return spGone();
  const x = spRoom(p);
  // A dispute opens inside Disputes from a link (tab + d); choosing any section from the menu drops it.
  if (!UI.p.tab) delete UI.p.d;
  const t = subnav(
    "spd_" + p.id,
    [
      ["ov", "Challenge"],
      ["apps", "Applications", spListing(p) ? spaNew(p).length || null : null],
      ["chat", "Chat room"],
      ["team", "Team & project"],
      ["ms", "Funding & milestones", x ? spdMsTodo(x).length || null : null],
      ["pay", "Payments", x ? spdPayable(x, p).length || null : null],
      ["dsp", "Disputes", x ? spDsps(x).filter(dspOpen).length || null : null],
    ],
    UI.p.tab,
    {
      label: "Project sections",
      icons: { ov: "megaphone" },
      groups: [
        ["", "", ["ov"]],
        ["Selection", "users", ["apps", "chat"]],
        ["Team & delivery", "flag", ["team", "ms", "pay", "dsp"]],
      ],
    },
  );
  const body = { ov: spdOverview, apps: spdApps, chat: spdChat, team: spdTeam, ms: spdMs, pay: spdPay, dsp: spdDsp }[t.cur](p, x);
  return spdHead(p) + withSubnav(t, `<div class="sp-body spd-body">${body}</div>`);
});
function spdHead(p) {
  let acts = "";
  if (spListing(p) && p.status !== "Withdrawn") {
    acts += B(ic("edit", 14) + "Edit", "spEdit", { id: p.id });
    acts +=
      p.status === "Open"
        ? CB("Stop new applications", "spState", { id: p.id, v: "Listing closed" }, "Stop new applications? You can still review, shortlist and finalize the team, and you can reopen applications later.")
        : B("Reopen applications", "spState", { id: p.id, v: "Open" });
  }
  if (!p.spArchived)
    acts += CB(
      ic("archive", 14) + "Archive post",
      "spdArchive",
      { id: p.id, v: "archive" },
      spListing(p) && p.status !== "Withdrawn"
        ? "Archive this post? It leaves the Explore board, the chat room closes, and the people who applied are told."
        : "Archive this post? Its chat room stays closed and readable. The project, its milestones, payments and disputes are not affected.",
      "btn-s btn-sm",
      "Archive post",
    );
  else if (!spListing(p)) acts += B(ic("archive", 14) + "Restore post", "spdArchive", { id: p.id, v: "restore" });
  return (
    crumbsHtml([["My projects", "sponsorprojects"], [h(p.title)]]) +
    `<div class="shead-main spd-head"><span class="tile t-ember" aria-hidden="true">${ic("megaphone", 20)}</span><div class="shead-t"><div class="shead-kind">Sponsor project · created by you · others see <span class="sp-alias">${ic("shield", 12)}${h(p.alias)}</span></div><div class="row wrap prj-ttl"><h1 class="h1">${h(p.title)}</h1>${pill(spdLabel(p))}</div><div class="shead-meta"><span>Posted ${fmtD(p.at)}</span><span>${spListed(p) ? "Applications close " + fmtD(p.brief.closes) : "Not accepting applications"}</span>${p.country ? `<span>Country · ${h(p.country)}</span>` : ""}${p.brief.budget ? `<span>Indicative budget · ${money(spCur(p), p.brief.budget)}</span>` : ""}</div></div>${acts ? `<div class="shead-a">${acts}</div>` : ""}</div>`
  );
}
// Archiving a listing withdraws it (applicants are told); archiving after the team is formed only files the post away.
A.spdArchive = (d) => {
  const p = byId("projects", d.id);
  if (d.v === "restore") {
    p.spArchived = null;
    spLog(p, "Post restored by the sponsor");
    audit("Sponsor project restored", p.id, "");
    toast("Post restored.");
    return ok();
  }
  if (spListing(p) && p.status !== "Withdrawn") {
    p.status = "Withdrawn";
    spShortlist(p).forEach((s) => notify(s.pid, "The sponsor project “" + p.title + "” was withdrawn by " + p.alias, "projects", {}));
  }
  spaChatClose(p, "The sponsor archived the post.");
  p.spArchived = now();
  spLog(p, "Post archived by the sponsor");
  audit("Sponsor project archived", p.id, "");
  toast(spListing(p) ? "Post archived. It no longer appears on the Explore board." : "Post archived. The project carries on with the team.");
  ok();
};

// ---- Challenge: the brief, the alias and the activity
function spdOverview(p) {
  const b = p.brief;
  const main = card(
    "The challenge",
    "What you need, why, and what success looks like.",
    dl([
      ["Starting with", h(p.type)],
      ["Description", spText(b.problem)],
      ["Objectives", spText(b.objectives)],
      ["Expected outcomes", spText(b.outcomes)],
      ["Specific needs", spText(b.needs)],
      b.eligibility && ["Who can apply", spText(b.eligibility)],
      (p.tags || []).length && ["Areas of interest", `<span class="rec-tags">${p.tags.map((x) => `<span class="rec-tag">${h(x)}</span>`).join("")}</span>`],
      ["Where", h(p.country || "—") + (p.area ? " · " + h(p.area) : "")],
      b.budget && ["Indicative budget", money(spCur(p), b.budget) + '<div class="cap">A guide for the team. Milestone amounts are agreed with the project owner.</div>'],
      b.closes && ["Applications close", fmtD(b.closes)],
    ]),
    spListing(p) && p.status !== "Withdrawn" ? B(ic("edit", 14) + "Edit", "spEdit", { id: p.id }) : "",
  );
  const id = card(
    "Your identity on this project",
    "",
    `<p class="muted">Everyone else sees <span class="sp-alias">${ic("shield", 12)}${h(p.alias)}</span>. Your name, organisation and contact details are not shown on the listing, in the chat room, in the team’s spaces or in notices to applicants.</p><p class="cap">${L("Preview the listing", "sponsorlisting", { id: p.id })}</p>`,
  );
  const act = card(
    "Activity",
    "Kept with the project",
    p.history.length
      ? spdTl(
          p.history
            .slice()
            .reverse()
            .slice(0, 12)
            .map((y) => [y.t, y.at]),
        )
      : '<p class="cap">No activity yet.</p>',
  );
  return hmCols(main, id + act + spdNever());
}

// ---- Applications: everyone who applied, the sponsor's private evaluation, shortlist and team
function spdApps(p) {
  const all = p.shortlist || [];
  const n = (v) => all.filter((s) => spdSt(p, s) === v).length;
  const sts = ["New", "Shortlisted", "Selected", "Not selected", "Withdrawn"].filter((v) => n(v));
  const sl = spaShort(p);
  const noRole = sl.filter((s) => !s.prole);
  const owners = sl.filter((s) => s.prole === "Project owner");
  const c = spaChat(p);
  const next =
    spaOpen(p) && sl.length
      ? card(
          "Shortlist ready",
          sl.length + " shortlisted · " + (noRole.length ? noRole.length + " without a project role" : "every one has a project role"),
          `<p class="cap">Give each shortlisted person a project role, talk with them in the chat room, then finalize the team. At least one Participant must be a Project owner.</p>`,
          (c ? L(ic("message", 14) + "Open chat room", "sponsorproject", { id: p.id, tab: "chat" }, "btn btn-s btn-sm") : B(ic("message", 14) + "Open chat room", "spaChatNew", { id: p.id, tab: "chat" })) +
            B(ic("check", 14) + "Finalize team", "spaFinal", { id: p.id }, noRole.length || !owners.length ? "btn-s btn-sm" : "btn-p btn-sm"),
          "accent",
        )
      : "";
  return (
    next +
    spdKpis([
      ["New", n("New")],
      ["Shortlisted", n("Shortlisted") + n("Selected")],
      ["Not selected", n("Not selected")],
      ["Withdrawn", n("Withdrawn")],
    ]) +
    card(
      "Applications",
      "Read what each person wrote and what they chose to share, rate the fit and shortlist. Your ratings and notes are visible only to you.",
      dataView("spd:apps:" + p.id, {
        label: "applications",
        items: all,
        search: (s) => [P(s.pid).name, s.note, s.exp, s.prole, spdSt(p, s)].join(" "),
        quick: { label: "Status", options: sts.map((v) => [v, v]), test: (s, v) => spdSt(p, s) === v },
        sorts: [
          ["new", "Newest first", (a, b) => String(b.at).localeCompare(String(a.at))],
          ["fit", "Best fit first", (a, b) => (b.fit || 0) - (a.fit || 0)],
        ],
        defaultSort: "new",
        row: (s) => {
          const st = spdSt(p, s);
          return {
            lead: `<span class="av" aria-hidden="true">${ini(s.pid)}</span>`,
            title: nm(s.pid),
            sub: h(spaRoleNm(p, s.pid) || "") + (spOrgOf(s.pid) ? " · " + h(spOrgOf(s.pid)) : ""),
            meta: ["Applied " + fmtD(s.at), s.avail ? h(s.avail) : "", s.fit ? "Fit <b>" + s.fit + " of 5</b>" : "Not rated", s.share ? "Profile summary shared" : "Profile not shared", s.prole && spListing(p) ? "Project role <b>" + h(s.prole) + "</b>" : ""],
            badges: spdPill(p, s),
            primary: B(st === "New" ? "Review" : "Open", "spdApp", { id: p.id, pid: s.pid }, st === "New" ? "btn-p btn-sm" : "btn-s btn-sm"),
          };
        },
        empty: ["users", "No applications yet", "Participants and Collaborators apply from the Explore board with “View and Apply”.", ""],
      }),
    )
  );
}
A.spdApp = (d) => {
  const p = byId("projects", d.id);
  const s = (p.shortlist || []).find((x) => x.pid === d.pid);
  if (!s) return;
  clearF("spdev");
  UI.form.spdev = { fit: s.fit ? String(s.fit) : "", snote: s.snote || "" };
  modal(
    "Application from " + nm(s.pid),
    () => {
      const st = spdSt(p, s);
      const edit = spaOpen(p) && st !== "Withdrawn";
      const log = [
        st === "Selected" && ["Selected for the team", p.finalAt || p.submitted],
        st === "Not selected" && (s.selAt || p.finalAt) && ["Not selected", s.selAt || p.finalAt],
        s.shortAt && ["Shortlisted", s.shortAt],
        ["Applied", s.at],
      ].filter(Boolean);
      return `<div class="col fgap">${dl([
        ["Status", spdPill(p, s)],
        ["Role", h(spaRoleNm(p, s.pid) || "—") + (spOrgOf(s.pid) ? " · " + h(spOrgOf(s.pid)) : "")],
        ["Applied", fmtD(s.at)],
        ["Availability", s.avail ? h(s.avail) : '<span class="cap">Not given</span>'],
        ["What they would bring", spText(s.note)],
        ["Relevant experience", spText(s.exp)],
        s.prole && ["Project role", h(s.prole)],
      ])}${s.share ? `<h3 class="h3">Profile summary</h3>${spProfile(s)}` : banner("info", "Profile summary not shared", "This person chose not to share a profile summary. Judge the application on what they wrote. If you shortlist them, you can ask questions once you proceed to chat.")}${
        edit
          ? `<form data-f="spdev" class="col fgap spd-eval" novalidate><input type="hidden" name="id" value="${p.id}"><input type="hidden" name="pid" value="${s.pid}"><h3 class="h3">Your evaluation</h3><div class="f2">${fi("spdev", "fit", "Fit with your requirements", {
              type: "select",
              ph: "Not rated",
              opts: [
                ["5", "5 · Excellent fit"],
                ["4", "4 · Strong fit"],
                ["3", "3 · Possible fit"],
                ["2", "2 · Weak fit"],
                ["1", "1 · Poor fit"],
              ],
            })}</div>${fi("spdev", "snote", "Your notes (only you see these)", { type: "textarea", rows: 3, max: 2000 })}<div class="actions"><button class="btn btn-s" type="submit" name="v" value="save">Save evaluation</button><div class="row wrap">${
              st === "Shortlisted" ? B(ic("users", 14) + (s.prole ? "Change role" : "Assign role"), "spaRole", { id: p.id, pid: s.pid }) + '<button class="btn btn-s" type="submit" name="v" value="Interested">Back to new</button>' : ""
            }${st !== "Not selected" ? '<button class="btn btn-s" type="submit" name="v" value="Not selected">Not selected</button>' : ""}${st !== "Shortlisted" ? '<button class="btn btn-p" type="submit" name="v" value="Shortlisted">Shortlist</button>' : ""}</div></div></form>`
          : dl([
              ["Your fit rating", s.fit ? s.fit + " of 5" : "—"],
              ["Your notes", spText(s.snote)],
            ])
      }<details class="ws-done" open><summary class="cap">Activity</summary>${spdTl(log)}</details></div>`;
    },
    true,
  );
};
// The evaluation is the sponsor's own (rating and notes); a status button also shortlists or declines, as in Applications.
F.spdev = (d) => {
  const p = byId("projects", d.id);
  const s = spShortlist(p).find((x) => x.pid === d.pid);
  s.fit = d.fit ? +d.fit : null;
  s.snote = (d.snote || "").trim().slice(0, 2000);
  audit("Sponsor application evaluated", p.id, s.pid);
  UI.modal = null;
  clearF("spdev");
  if (["Shortlisted", "Not selected", "Interested"].includes(d.v) && d.v !== (s.sel || "Interested")) return A.spaSel({ id: p.id, pid: s.pid, v: d.v });
  toast("Evaluation saved. Only you see it.");
  ok();
};

// ---- Chat room: the sponsor and the shortlisted people, before the team is final (S.spchats, applications.js)
const spdChatNm = (c, pid) => (pid === c.sponsor ? (pid === myId() ? "You" : h(c.alias)) : nm(pid));
const spdSeen = (c, m) =>
  c.members.filter((x) => x.status === "Active" && readMark(c.id, x.pid) >= m.at).map((x) => P(x.pid).display || P(x.pid).name);
function spdChat(p) {
  const c = spaChat(p);
  if (!c)
    return card(
      "Chat room",
      "",
      empty(
        "message",
        "No chat room yet",
        spaOpen(p) ? (spaShort(p).length ? "Open a chat room with the people you shortlisted. People you shortlist later join it automatically." : "Shortlist at least one person in Applications to open the chat room.") : "No chat room was opened while this project was taking applications.",
        spaOpen(p) && spaShort(p).length ? B(ic("plus", 14) + "Open chat room", "spaChatNew", { id: p.id, tab: "chat" }, "btn-p btn-sm") : "",
      ),
    );
  const live = c.state === "Active";
  const members = [{ pid: c.sponsor }, ...c.members.filter((m) => m.status === "Active")];
  const byM = Object.fromEntries(c.msgs.filter((m) => m.id).map((m) => [m.id, m]));
  let day = "";
  let prev = null;
  const rows = c.msgs
    .map((m) => {
      let out = "";
      if (String(m.at).slice(0, 10) !== day) {
        day = String(m.at).slice(0, 10);
        prev = null;
        out += `<div class="mday"><span>${dayLabel(m.at)}</span></div>`;
      }
      if (m.sys) {
        prev = null;
        return out + `<div class="msys">${ic("info", 13)}<span>${h(m.t)}</span><span class="mtime">${tm(m.at)}</span></div>`;
      }
      const mine = m.by === myId();
      const grouped = prev && prev.by === m.by && new Date(m.at) - new Date(prev.at) < 6e5;
      prev = m;
      const rp = m.reply && byM[m.reply];
      const seen = mine ? spdSeen(c, m) : [];
      const tools = live
        ? (!mine ? B(ic("reply", 15), "spdReply", { c: c.id, id: m.id }, "mtool", 'aria-label="Reply" title="Reply"') : "") +
          (m.q && !m.ans ? B(ic("check", 15), "spdAns", { c: c.id, id: m.id }, "mtool", 'aria-label="Mark answered" title="Mark answered"') : "")
        : "";
      return (
        out +
        `<div class="mrow ${mine ? "mine" : ""} ${grouped ? "grp" : ""}" id="msg-${m.id}">${!mine ? (grouped ? '<span class="mav-sp"></span>' : `<span class="av" title="${h(P(m.by).name)}">${ini(m.by)}</span>`) : ""}<div class="mcol">${!mine && !grouped ? `<div class="mwho">${spdChatNm(c, m.by)}<span class="cap"> · Applicant</span></div>` : ""}<div class="mbub bubble ${mine ? "me" : ""} ${m.q ? "q" : ""}">${rp ? `<a href="#msg-${rp.id}" class="mquote"><b>${rp.by ? spdChatNm(c, rp.by) : "System"}</b><span>${h(String(rp.t || "").slice(0, 90))}</span></a>` : ""}${m.q ? `<div class="mqtag">${ic("question", 13)}${m.ans ? "Question · answered" : "Open question"}</div>` : ""}<div class="mtext">${spText(m.t)}</div><div class="mmeta">${tm(m.at)}${mine ? `<span class="mtick ${seen.length && seen.length >= members.length - 1 ? "seen" : ""}" title="${seen.length ? "Seen by " + h(seen.join(", ")) : "Sent"}">${ic(seen.length ? "checks" : "check", 14)}</span>` : ""}</div></div></div>${tools ? `<div class="mtools">${tools}</div>` : ""}</div>`
      );
    })
    .join("");
  const newest = c.msgs.filter((m) => !m.sys).slice(-1)[0];
  const seenLast = newest && newest.by === myId() ? spdSeen(c, newest) : [];
  const reply = UI.spdRe && UI.spdRe.c === c.id ? byM[UI.spdRe.id] : null;
  const asQ = UI.spdQ === c.id;
  const avatars = members
    .slice(0, 4)
    .map((m) => `<span class="av" title="${h(spdChatNm(c, m.pid).replace(/<[^>]+>/g, ""))}">${ini(m.pid)}</span>`)
    .join("");
  return (
    (live
      ? banner("info", "Chat with your shortlist", "Clarifications and coordination before the team is final happen here. Only you and the shortlisted people take part; you appear as " + h(c.alias) + ". It closes when you finalize the team.")
      : banner("info", "Chat room closed", "Selection is complete, so the room no longer takes new messages. It stays readable for the people who took part, under the programme’s data-retention rules. Project work continues in the team’s " + (p.circle ? "Circle" : "spaces") + ".")) +
    `<section class="mthread emb spd-chat" aria-label="Chat room: ${h(p.title)}"><header class="mth-h"><span class="mav tile p t-ember" aria-hidden="true">${ic("megaphone", 18)}</span><div class="mth-t"><span class="mname">Challenge · ${h(p.title)}</span><span class="cap">Challenge chat room · ${members.length} members${live ? "" : " · Closed"}</span></div><span class="mavs hide-sm">${avatars}</span></header><div class="msgs" role="log" aria-live="polite">${rows || `<div class="mempty">${empty("message", "No messages yet", "Start the conversation. Only you and the shortlisted people see it.")}</div>`}${seenLast.length ? `<div class="mseen">Seen by ${h(seenLast.join(", "))}</div>` : ""}</div>${
      live
        ? `<form data-f="spdcm" class="composer ${asQ ? "asq" : ""}" novalidate><input type="hidden" name="id" value="${c.id}"><input type="hidden" name="re" value="${reply ? reply.id : ""}">${reply ? `<div class="mreplying">${ic("reply", 14)}<div class="mreplying-t"><b>Replying to ${spdChatNm(c, reply.by)}</b><span class="cap mprev">${h(String(reply.t || "").slice(0, 90))}</span></div>${B(ic("x", 14), "spdReplyX", {}, "mtool", 'aria-label="Cancel reply"')}</div>` : ""}<div class="mcomp"><textarea name="t" rows="1" class="mta" placeholder="Write a message" aria-label="Message" maxlength="2000">${h(UI.spdDraft || "")}</textarea><button type="button" class="iconbtn mqbtn ${asQ ? "on" : ""}" data-a="spdAsQ" data-id="${c.id}" aria-pressed="${asQ}" title="Send as a question">${ic("question")}</button><button class="btn btn-p msend" type="submit" aria-label="Send message" title="Send (Enter)">${ic("send", 18)}</button></div><div class="mhelp">${asQ ? "<b>Sending as a question.</b> " : ""}Enter to send · Shift+Enter for a new line · shown under ${h(c.alias)}</div></form>`
        : `<div class="mro">${ic("lock", 16)}<span>This chat room is closed. The conversation is read-only.</span></div>`
    }</section>`
  );
}
// Reply and question mode re-render the composer; what was typed is kept.
const spdKeep = () => (UI.spdDraft = (document.querySelector('form[data-f="spdcm"] textarea') || {}).value || "");
A.spdReply = (d) => {
  spdKeep();
  UI.spdRe = { c: d.c, id: d.id };
  render();
};
A.spdReplyX = () => {
  spdKeep();
  UI.spdRe = null;
  render();
};
A.spdAsQ = (d) => {
  spdKeep();
  UI.spdQ = UI.spdQ === d.id ? null : d.id;
  render();
};
A.spdAns = (d) => {
  const c = byId("spchats", d.c);
  const m = c.msgs.find((x) => x.id === d.id);
  m.ans = true;
  audit("Sponsor chat question marked answered", c.pr, m.id);
  ok();
};
F.spdcm = (d) => {
  const text = (d.t || "").trim();
  if (!text) {
    toast("Write a message first.", "warn");
    return render();
  }
  const c = byId("spchats", d.id);
  c.msgs.push({ id: uid("spm"), by: myId(), at: now(), t: text.slice(0, 2000), ...(UI.spdQ === c.id ? { q: true } : {}), ...(d.re && c.msgs.some((m) => m.id === d.re) ? { reply: d.re } : {}) });
  c.members.filter((m) => m.status === "Active").forEach((m) => notify(m.pid, c.alias + " wrote in the discussion for “" + c.name.replace(/^Discussion · /, "") + "”", "spchat", { id: c.id }));
  audit("Sponsor project discussion message", c.pr, "");
  UI.spdQ = null;
  UI.spdRe = null;
  UI.spdDraft = "";
  ok();
};

// ---- Team & project: who was chosen, where the work happens
function spdTeam(p, x) {
  if (spListing(p)) {
    const sl = spaShort(p);
    return hmCols(
      card(
        "Team so far",
        "Every shortlisted person needs a project role. At least one Participant must be a Project owner.",
        sl.length ? `<ul class="sp-team">${sl.map((s) => `<li><span class="av sm">${ini(s.pid)}</span><span class="sp-team-n">${nm(s.pid)}</span>${s.prole ? pill(s.prole, s.prole === "Project owner" ? "p-green" : "p-navy") : '<span class="cap">No role yet</span>'}${spaOpen(p) ? B(ic("users", 14) + (s.prole ? "Change role" : "Assign role"), "spaRole", { id: p.id, pid: s.pid }) : ""}</li>`).join("")}</ul>` : empty("users", "Shortlist people first", "Review applications and shortlist at least one person.", B("Review applications", "tab", { k: "spd_" + p.id, v: "apps" }, "btn-p btn-sm")),
        spaOpen(p) && sl.length ? B(ic("check", 14) + "Finalize team", "spaFinal", { id: p.id }, "btn-p btn-sm") : "",
      ),
      card("What finalizing does", "", `<p class="cap">Applications close and the project leaves the Explore board. People not selected are told, the chat room becomes read-only, and the Project owner(s) start the work in the Circle, Rope Team or ${WL()} you choose.</p>`, "", "quiet") + spdNever(),
    );
  }
  const team = (p.team || []).length
    ? p.team
    : spShortlist(p)
        .filter((s) => spdSt(p, s) === "Selected")
        .map((s) => ({ pid: s.pid, role: s.prole || (spOwners(p).includes(s.pid) ? "Project owner" : roleName(ctxRole(s.pid, p.ctx), p.ctx) || "Member") }));
  const ci = p.circle && byId("circles", p.circle);
  const others = team.filter((tm_) => !spOwners(p).includes(tm_.pid));
  return hmCols(
    card(
      "Project team",
      "Formed " + fmtD(p.finalAt || p.submitted),
      dl([
        [spOwners(p).length > 1 ? "Project owners" : spdOwnerT(p), spOwners(p).map(nm).join(", ") + '<div class="cap">Agrees milestones with you, confirms payments received and speaks for the team in a dispute.</div>'],
        ["Team members", others.map((tm_) => nm(tm_.pid) + " " + pill(tm_.role, "p-navy")).join("<br>") || '<span class="cap">Only the owner</span>'],
        ["Started in", h(pathLabel(p.supportPath) || "—")],
        ["Faculty/Steward", p.stewards.map(nm).join(", ") || '<span class="cap">Assigned by the Organization Admin</span>'],
        ["Circle", ci ? h(ci.name) : '<span class="cap">None linked</span>'],
        [WL(), x ? h(x.name) : '<span class="cap">Not linked yet</span>'],
        ["Where it is now", p.stage ? h(stageLabel(p.stage)) : '<span class="cap">Not started</span>'],
      ]),
    ),
    card(
      "History",
      "",
      p.history.length
        ? spdTl(
            p.history
              .slice()
              .reverse()
              .map((y) => [y.t, y.at]),
          )
        : '<p class="cap">—</p>',
    ) + spdNever(),
  );
}

// ---- Funding & milestones: the sponsor requirements in the project's Action Workspace
function spdNoWs(p, what) {
  return card(
    what,
    "",
    empty("flag", spListing(p) ? "Finalize the team first" : "Waiting for the team’s " + WL(), spListing(p) ? "Milestones, payments and disputes start once the team is final and the work has an " + WL() + "." : "The project owner links an " + WL() + " when execution starts. Milestones, payments and disputes are kept there and appear here."),
  );
}
function spdMs(p, x) {
  if (!x) return spdNoWs(p, "Funding & milestones");
  const cur = spCur(p);
  const sum = (ms) => ms.reduce((a, m) => a + (+m.sp.amount || 0), 0);
  const ms = spMs(x);
  return (
    spdKpis([
      ["Indicative budget", money(cur, p.brief.budget || 0)],
      ["Agreed in milestones", money(cur, sum(ms.filter((m) => SR_AGREED.includes(m.sp.sr))))],
      ["Approved", money(cur, sum(ms.filter((m) => m.sp.sr === "Approved")))],
      ["Waiting for you", spdMsTodo(x).length],
    ]) +
    spMsList(x, p) +
    banner("info", "Recorded, never processed", SP_OFFLINE, "coin")
  );
}

// ---- Payments: what each side recorded. The sponsor records a payment made here; the owner's confirmation is their
// own record, or their "Paid Offline" status update in the workspace. Neither side's figure stands in for the other's.
function spdRec(p, y, side) {
  const own = side === "sponsor" ? y.sp : y.ow;
  if (own) return own;
  const who = side === "sponsor" ? (pid) => pid === p.sponsor : (pid) => spOwners(p).includes(pid);
  const l = (y.hist || []).filter((e) => e.to === "Paid Offline" && who(e.by)).slice(-1)[0];
  return l ? { amount: +y.amount, date: side === "sponsor" ? y.paidOn || l.at : l.at, ref: l.ref || (side === "sponsor" ? y.offRef : ""), files: [] } : null;
}
const spdEq = (a, b) => Math.abs(+a - +b) < 0.005;
function spdPayState(x, p, y) {
  if (dspOn(x, "pay", y.id)) return "Flagged for review";
  const s = spdRec(p, y, "sponsor");
  const o = spdRec(p, y, "owner");
  if (s && o) return spdEq(s.amount, o.amount) ? "Confirmed" : "Flagged for review";
  if (s || o) return "Pending verification";
  // a payment shown as Disputed because its milestone is disputed keeps the state it had before
  const st = y.status === "Disputed" ? y.prev || "Pending" : y.status;
  return st === "Paid Offline" ? "Confirmed" : st === "Due" ? "Due" : st === "On Hold" ? "On hold" : "Not due yet";
}
const SPD_PAY = { Confirmed: "p-green", "Pending verification": "p-amber", "Flagged for review": "p-red", Due: "p-amber", "On hold": "p-grey" };
const spdPayPill = (st) => (st === "Not due yet" ? '<span class="cap">Not due yet</span>' : pill(st, SPD_PAY[st]));
const spdAmt = (p, y) => +((spdRec(p, y, "sponsor") || y).amount || 0);
// Payments the sponsor can record as made: due (an approved milestone, or an advance), with no sponsor record yet.
const spdPayable = (x, p) => spPays(x).filter((y) => !spdRec(p, y, "sponsor") && y.status === "Due" && !dspOn(x, "pay", y.id));
const spdPayForT = (x, y) => {
  const m = y.ms && x.milestones.find((z) => z.id === y.ms);
  return m ? "Milestone " + m.sp.n + " · " + m.t : y.kind || "Other payment";
};
function spdPayCell(p, y, side, none) {
  const r = spdRec(p, y, side);
  if (!r) return `<span class="cap">${none || "—"}</span>`;
  return `<div class="spd-conf">${ic("check", 13)}<span>${side === "sponsor" ? "Paid" : "Received"} ${money(spCur(p), r.amount)}</span><span class="cap">${fmtD(r.date)}${r.ref ? " · ref " + h(r.ref) : ""}</span>${spFiles(r.files)}</div>`;
}
function spdPay(p, x) {
  if (!x) return spdNoWs(p, "Payments");
  const cur = spCur(p);
  const ps = spPays(x);
  const st = (y) => spdPayState(x, p, y);
  const tot = (v) => ps.filter((y) => st(y) === v).reduce((a, y) => a + spdAmt(p, y), 0);
  const committed = +p.brief.budget || spMsTotal(x);
  const conf = tot("Confirmed");
  const pend = tot("Pending verification");
  const ownT = spdOwnerT(p);
  const live = x.state === "Active";
  const msRows = spMs(x)
    .filter((m) => SR_AGREED.includes(m.sp.sr))
    .map((m) => {
      const y = spMsPays(x, m).slice(-1)[0];
      const s = y ? st(y) : "Not due yet";
      const sr = y && spdRec(p, y, "sponsor");
      return [
        `<b>${m.sp.n} · ${h(m.t)}</b>`,
        money(cur, m.sp.amount),
        pill(srLabel(m)),
        y && s !== "Not due yet" ? h(y.ref) + (sr && sr.ref ? `<div class="cap">${h(sr.ref)}</div>` : y.offRef ? `<div class="cap">${h(y.offRef)}</div>` : "") : '<span class="cap">—</span>',
        y ? spdPayCell(p, y, "sponsor") : '<span class="cap">—</span>',
        y ? spdPayCell(p, y, "owner") : '<span class="cap">—</span>',
        spdPayPill(s),
      ];
    });
  const acts = (y) => {
    const dsp = dspOn(x, "pay", y.id);
    if (dsp) return L(ic("shield", 14) + h(dsp.ref), "sponsorproject", { id: p.id, tab: "dsp", d: dsp.id }, "btn btn-s btn-sm");
    if (!live || y.status === "Disputed") return "";
    const s = st(y);
    if (s === "Flagged for review") return B("Correct my record", "spdPay", { id: p.id, y: y.id }) + B(ic("shield", 14) + "Escalate to a Steward", "spDspNew", { r: x.id, kind: "pay", s: y.id });
    if (!spdRec(p, y, "sponsor") && y.status === "Due") return B("Record payment", "spdPay", { id: p.id, y: y.id }, "btn-p btn-sm");
    return "";
  };
  const hist = ps
    .slice()
    .sort((a, b) => String(b.at).localeCompare(String(a.at)) || String(b.ref).localeCompare(String(a.ref)))
    .map((y) => [
      `<span class="mono">${h(y.ref)}</span><div class="cap">${fmtD(y.at)}</div>`,
      h(spdPayForT(x, y)),
      money(cur, spdAmt(p, y)),
      spdPayCell(p, y, "sponsor", "Not recorded"),
      spdPayCell(p, y, "owner", "Not confirmed"),
      spdPayPill(st(y)),
      acts(y),
    ]);
  return (
    spdKpis([
      ["Committed", money(cur, committed)],
      ["Confirmed by both", money(cur, conf)],
      ["Pending verification", money(cur, pend)],
      ["Flagged for review", ps.filter((y) => st(y) === "Flagged for review").length],
      ["Still to pay", money(cur, Math.max(0, committed - conf - pend))],
    ]) +
    card(
      "Milestone payments",
      "For each milestone: the agreed amount, its approval and the payment confirmations from both sides.",
      table(["Milestone", "Agreed amount", "Milestone status", "Payment reference", "Sponsor", ownT, "Payment status"], msRows, "No agreed milestones yet. Agree them in Funding & milestones."),
      "",
      "spd-paytbl",
    ) +
    card(
      "Payment history",
      "Every payment either side recorded, with both confirmations and supporting records. Newest first.",
      table(["Recorded", "Payment", "Amount", "Sponsor", ownT, "Status", ""], hist, "No payments recorded yet."),
      live ? B(ic("plus", 14) + "Record a payment made", "spdPay", { id: p.id }, "btn-p btn-sm") : "",
      "spd-paytbl",
    ) +
    banner("info", "Recorded, never processed", SP_OFFLINE + " If the two confirmations differ, the payment is flagged for review rather than marked complete.", "coin")
  );
}
A.spdPay = (d) => {
  const p = byId("projects", d.id);
  const x = spRoom(p);
  const y = d.y && spPays(x).find((z) => z.id === d.y);
  const r = y && spdRec(p, y, "sponsor");
  const cur = spCur(p);
  const opts = spdPayable(x, p);
  clearF("spdp");
  UI.form.spdp = { for: y ? y.id : opts.length ? opts[0].id : "new", amount: String(r ? r.amount : y ? y.amount : opts.length ? opts[0].amount : ""), date: r ? String(r.date).slice(0, 10) : today(), ref: r ? r.ref || "" : (y && y.offRef) || "" };
  modal(r ? "Correct your payment record · " + h(y.ref) : "Record a payment made", () =>
    `<form data-f="spdp" class="col fgap" novalidate>${errSum("spdp")}<input type="hidden" name="id" value="${p.id}">${
      y
        ? `<input type="hidden" name="for" value="${y.id}">` + dl([["For", h(spdPayForT(x, y))], ["Reference", `<span class="mono">${h(y.ref)}</span>`], ["Amount due", money(cur, y.amount)]])
        : fi("spdp", "for", "What the payment is for", { type: "select", req: true, opts: [...opts.map((z) => [z.id, z.ref + " · " + spdPayForT(x, z) + " · " + cur + " " + (+z.amount).toLocaleString("en-US")]), ["new", "Initial project funding or an advance (new record)"]], help: "A milestone payment can be recorded once you have approved the milestone." })
    }<div class="f2">${fi("spdp", "amount", "Amount paid (" + h(cur) + ")", { type: "number", req: true, min: 0.01, step: "0.01" })}${fi("spdp", "date", "Date paid", { type: "date", req: true, maxv: today() })}</div>${fi("spdp", "ref", "Payment reference (optional)", { max: 80, ph: "e.g. bank transfer reference" })}<div class="field"><label class="lbl" for="spdp_files">Supporting records (optional)</label><input id="spdp_files" class="input" type="file" name="files" multiple><span class="help">For example a remittance advice. Up to ${S.settings.maxFileMB} MB each.</span></div>${fi("spdp", "note", "Note (optional)", { type: "textarea", rows: 2, max: 1000 })}${banner("info", "Independent confirmation", "The " + spdOwnerT(p).toLowerCase() + " confirms what they received separately. If the two figures differ, the payment is flagged for review. " + SP_OFFLINE)}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">Record payment</button></div></form>`,
  );
};
F.spdp = (d, form) => {
  if (
    !validate("spdp", d, {
      for: ["req"],
      amount: ["req", "num", ["fn", { f: (v) => +v > 0, m: "Enter an amount above 0." }]],
      date: ["req", ["fn", { f: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && v <= today(), m: "Enter the date it was paid (today or earlier)." }]],
    })
  )
    return render();
  const files = spTakeFiles(form);
  if (!files) return render();
  const p = byId("projects", d.id);
  const x = spRoom(p);
  const note = (d.note || "").trim();
  let y = d.for !== "new" && spPays(x).find((z) => z.id === d.for);
  if (!y) y = spPayAdd(x, { ms: null, kind: "Advance", amount: +d.amount, due: "", status: "Due", note }, "Recorded by the sponsor as a payment made");
  const had = !!y.sp;
  y.sp = { amount: +d.amount, date: d.date, ref: (d.ref || "").trim(), files: files.length ? files : (y.sp && y.sp.files) || [], note, by: myId(), at: now() };
  if (!y.offRef && y.sp.ref) y.offRef = y.sp.ref;
  y.hist.push({ at: now(), by: myId(), from: y.status, to: y.status, amount: +d.amount, ref: y.sp.ref || undefined, note: (had ? "Sponsor corrected their record of the payment made" : "Sponsor recorded a payment made") + " on " + fmtD(d.date) + (note ? ": " + note : "") });
  spTell(p, x, spOwners(p), p.alias + " recorded a payment made for “" + p.title + "”: " + y.ref + ", " + spCur(p) + " " + (+d.amount).toLocaleString("en-US") + ". Confirm what you received.", "pay");
  audit("Sponsor recorded a payment made", x.id, y.id + " · " + d.amount);
  UI.modal = null;
  clearF("spdp");
  toast("Payment recorded. Nothing was paid through PHOENIX; the " + spdOwnerT(p).toLowerCase() + " confirms what they received.");
  ok();
};

// ---- Disputes: the list, and one dispute opened in place
function spdDsp(p, x) {
  const intro = banner("info", "Independent Steward", "If you cannot agree on a milestone’s completion or acceptance, or on a payment, escalate it from the milestone or the payment. A human Steward with no tie to either side reviews the evidence and decides. Both sides appear under aliases.", "shield");
  if (!x) return intro + spdNoWs(p, "Disputes");
  const dp = UI.p.tab === "dsp" && UI.p.d && byId("disputes", UI.p.d);
  if (dp && dp.room === x.id && dspSees(dp)) {
    const v = dspView(dp);
    return `<p class="cap">${L(ic("chevl", 14) + "All disputes", "sponsorproject", { id: p.id, tab: "dsp" })}</p>` + head("Dispute " + h(dp.ref), "About " + h(dspSubject(dp)) + " · raised " + fmtD(dp.at), pill(dp.status)) + hmCols(v.main, v.rail);
  }
  return (
    intro +
    card(
      "Disputes",
      "",
      table(
        ["Reference", "About", "Raised by", "Raised", "Status", ""],
        spDsps(x)
          .slice()
          .reverse()
          .map((d_) => [`<span class="mono">${h(d_.ref)}</span>`, h(dspSubject(d_)), d_.side === "sponsor" ? "Your side" : DSP_SIDE[d_.side], fmtD(d_.at), pill(d_.status), L("Open", "sponsorproject", { id: p.id, tab: "dsp", d: d_.id }, "btn btn-s btn-sm")]),
        "No disputes. They are raised from a milestone under review or a payment record.",
      ),
    )
  );
}
// ---------- PROJECT PAGE: sponsor summary in the existing Project module ----------
function spProjCard(p) {
  if (!isSpP(p)) return "";
  const mine = spShort(p);
  if (spListing(p))
    return card(
      "Sponsor project",
      "Listed by " + spWho(p),
      dl([
        ["Status", pill(spLabel(p))],
        ["Applications", spShortlist(p).length + (spShortlist(p).length === 1 ? " person" : " people")],
        mine && ["You", "Applied " + fmtD(mine.at)],
      ]) + (mine ? spaMine(p) : "") + `<p class="cap">The sponsor chooses the team from the people who applied. The project then starts here, in your Projects. ${L("View the full listing", "sponsorlisting", { id: p.id })}</p>`,
      mine && p.status !== "Withdrawn" ? CB("Withdraw application", "spUnshort", { id: p.id }, "Withdraw your application to “" + p.title + "”? The sponsor will no longer see you as interested.") : "",
      "prj-panel",
    );
  const x = spRoom(p);
  const fin = spFin(p);
  return card(
    "Sponsor agreement",
    "Sponsored by " + spWho(p),
    dl([
      ["Main owner(s)", spOwners(p).map(nm).join(", ")],
      ["Milestones", x && spMs(x).length ? spMs(x).filter((m) => m.sp.sr === "Approved").length + " approved · " + spMs(x).filter((m) => SR_AGREED.includes(m.sp.sr)).length + " agreed · " + spMs(x).length + " in total" : '<span class="cap">Agreed in the ' + WL() + "</span>"],
      fin && x && ["Paid offline", money(spCur(p), spSum(x, "Paid Offline"))],
      fin && x && ["Due", money(spCur(p), spSum(x, "Due"))],
    ]) + (x ? "" : `<p class="cap">Milestones, payment status and disputes are kept in the project’s ${WL()}. ${spOwner(p) ? "Create or link it when execution starts." : ""}</p>`),
    x && (memberOf(x) || role() === "A") ? L("Milestones" + (fin ? ", payments & disputes" : ""), "room", { id: x.id, tab: "plan" }, "btn btn-s btn-sm") : "",
    "prj-panel",
  );
}
const spHiddenView = () =>
  head("Project", "") +
  card("", "", empty("shield", "Hidden while you are the independent Steward", "You are deciding a dispute about this project, so its identifying records stay hidden from you until the dispute is decided. Review it from Dispute reviews.", L("Dispute reviews", "disputes", {}, "btn btn-s btn-sm")));

// ---------- ACTION WORKSPACE: sponsor milestones inside the existing milestone interface ----------
// One block inside a milestone of the existing Milestones card: the sponsor's requirement, its review status, the
// team's assigned work and, for the two sides, its payment status.
function spMsBlock(x, m, sponsorView) {
  const p = spOfRoom(x);
  if (!p || !m.sp) return "";
  const s = m.sp;
  const fin = spFin(p);
  const dsp = dspOn(x, "ms", m.id);
  const ps = fin ? spMsPayState(x, m) : "";
  const tasks = (x.tasks || []).filter((t) => t.ms === m.id);
  const done = tasks.filter((t) => t.status === "Done").length;
  const work = sponsorView
    ? tasks.length
      ? done + " of " + tasks.length + " task" + (tasks.length === 1 ? "" : "s") + " done"
      : '<span class="cap">Not assigned yet</span>'
    : tasks.length
      ? tasks.map((t) => `<span class="sp-task">${h(t.t)} <span class="cap">→ ${nm(t.owner)}</span> ${pill(t.status)}</span>`).join("")
      : '<span class="cap">No tasks linked yet. The owner assigns the work.</span>';
  const canAssign = !sponsorView && spOwner(p) && x.state === "Active" && ["Agreed", "More information requested"].includes(s.sr) && !dsp;
  return `<div class="sp-ms"><div class="row wrap sp-ms-p">${pill("Sponsor requirement " + s.n, "p-purple")}${pill(srLabel(m))}${dsp ? pill("In dispute") : ""}${ps ? payPill(ps) : ""}</div>${dl([
    ["Deliverables", spText(spClip(s.deliv, 220))],
    ["Acceptance criteria", spText(spClip(s.criteria, 220))],
    fin && ["Amount on approval", money(spCur(p), s.amount)],
    ["Assigned work", `<span class="sp-tasks">${work}</span>`],
  ])}<div class="row wrap sp-ms-a">${B("Requirement details", "spMs", { r: x.id, m: m.id }, spTodo().some((t) => t[1].includes(h(m.t)) && t[3].id === x.id) ? "btn-p btn-sm" : "btn-s btn-sm")}${canAssign ? B(ic("plus", 14) + "Assign work", "roomItem", { r: x.id, k: "tasks", ms: m.id }) : ""}</div></div>`;
}
function spMsStep(m) {
  return (
    {
      Proposed: "Next: the other side approves the proposed milestone or asks for changes.",
      "Changes requested": "Next: whoever proposed it revises the milestone.",
      Agreed: "Next: the owner assigns the work; the owner marks it complete with the deliverables.",
      Submitted: "Next: the sponsor reviews the submission, approves it or asks for what is missing.",
      "More information requested": "Next: the owner sends what the sponsor asked for.",
      Approved: "Approved by the sponsor" + (m.sp.approvedAt ? " · " + fmtD(m.sp.approvedAt) : "") + ".",
    }[m.sp.sr] || ""
  );
}
const spMsOk = (m, k) => (m.sp.ok[k] ? `${ic("check", 13)}${fmtD(m.sp.ok[k])}` : '<span class="cap">not yet</span>');
// The Sponsor's scoped Milestones section: the sponsor requirements only, in the same milestone layout.
function spMsList(x, p) {
  const side = spSide(p);
  const rows = spMs(x)
    .map((m) => `<article class="ms"><header class="ms-h"><div class="col" style="min-width:0"><b>${h(m.t)}</b><span class="cap">${m.due ? "Due " + fmt(m.due) + dueTag(m.due, m.sp.sr === "Approved") : "No deadline"}</span></div></header>${spMsBlock(x, m, true)}<p class="cap">${spMsStep(m)}</p></article>`)
    .join("");
  return card(
    "Milestones",
    "Defined with the project owner, completed by the team, approved by you. The milestones are the " + WL() + "’s own; the team’s tasks, discussion and evidence stay with the team.",
    rows ? `<div class="col" style="gap:12px">${rows}</div>` : empty("flag", "No milestones yet", "Propose one; the project owner approves it before it is agreed."),
    side && x.state === "Active" ? B(ic("plus", 14) + "Propose a milestone", "spMsNew", { r: x.id }, "btn-p btn-sm") : "",
  );
}
// The fields both sides agree: deliverables, outcome, acceptance criteria, an optional deadline and the amount.
A.spMsNew = (d) => {
  const x = byId("rooms", d.r);
  const p = spOfRoom(x);
  const m = d.m && x.milestones.find((y) => y.id === d.m);
  clearF("spms");
  UI.form.spms = m ? { t: m.t, deliv: m.sp.deliv, outcome: m.sp.outcome, criteria: m.sp.criteria, due: m.due || "", amount: String(m.sp.amount), why: "" } : {};
  modal(
    m ? (m.sp.sr === "Agreed" ? "Propose a change to milestone " + m.sp.n : "Revise milestone " + m.sp.n) : "Propose a sponsor milestone",
    () =>
      `<form data-f="spms" class="col fgap" novalidate>${errSum("spms")}<input type="hidden" name="r" value="${x.id}"><input type="hidden" name="m" value="${m ? m.id : ""}">${fi("spms", "t", "Milestone", { req: true, max: 120, ph: "e.g. Prototype shades on five stalls" })}${fi("spms", "deliv", "Deliverables", { type: "textarea", rows: 3, req: true, max: 2000 })}<div class="f2">${fi("spms", "outcome", "Expected outcome", { type: "textarea", rows: 3, req: true, max: 1000 })}${fi("spms", "criteria", "Acceptance criteria", { type: "textarea", rows: 3, req: true, max: 1000, help: "How the sponsor will judge that it is complete." })}</div><div class="f2">${fi("spms", "due", "Deadline (optional)", { type: "date" })}${fi("spms", "amount", "Amount paid on approval (" + h(spCur(p)) + ")", { type: "number", req: true, min: 0, step: "0.01", help: p.brief.budget ? "Other milestones total " + spCur(p) + " " + spMsTotal(x, m && m.id).toLocaleString("en-US") + " of a " + spCur(p) + " " + (+p.brief.budget).toLocaleString("en-US") + " budget." : "" })}</div>${m ? fi("spms", "why", "What changed and why", { type: "textarea", rows: 2, req: true, max: 500 }) : ""}${banner("info", "", "The other side approves it before it is agreed. " + (spSide(p) === "owner" ? "You approve for the team as project owner." : "A project owner approves it for the team."))}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">${m ? "Send revised milestone" : "Propose milestone"}</button></div></form>`,
    true,
  );
};
A.spMsEdit = (d) => A.spMsNew(d);
F.spms = (d) => {
  const x = byId("rooms", d.r);
  const p = spOfRoom(x);
  const m = d.m && x.milestones.find((y) => y.id === d.m);
  if (
    !validate("spms", d, {
      t: ["req"],
      deliv: ["req", ["min", 10]],
      outcome: ["req", ["min", 10]],
      criteria: ["req", ["min", 10]],
      due: ["date"],
      amount: ["req", ["fn", { f: (v) => +v >= 0, m: "Enter an amount of 0 or more." }]],
      ...(m ? { why: ["req", ["min", 5]] } : {}),
    })
  )
    return render();
  const side = spSide(p);
  const f = { deliv: d.deliv.trim(), outcome: d.outcome.trim(), criteria: d.criteria.trim(), amount: +d.amount };
  let y = m;
  if (y) {
    y.sp.versions.push({ t: y.t, ...y.sp, versions: undefined, subs: undefined, notes: undefined, due: y.due, at: now() });
    y.t = d.t.trim();
    y.due = d.due || "";
    Object.assign(y.sp, f);
    y.sp.notes.push({ id: uid("mn"), by: myId(), at: now(), kind: "revise", t: "Revised: " + d.why.trim() });
  } else {
    y = { id: uid("ms"), t: d.t.trim(), due: d.due || "", status: "Not started", evs: [], sp: { n: spMs(x).length + 1, ...f, notes: [], subs: [], versions: [] } };
    x.milestones.push(y);
  }
  Object.assign(y.sp, { by: myId(), sr: "Proposed", ok: { sponsor: side === "sponsor" ? now() : null, owner: side === "owner" ? now() : null } });
  spTell(p, x, spOther(p, side), (side === "sponsor" ? p.alias : me().name) + (m ? " revised" : " proposed") + " milestone " + y.sp.n + " for “" + p.title + "”: " + y.t + ". Approve it or ask for changes.");
  sysMsg(x, "Sponsor milestone " + y.sp.n + (m ? " revised" : " proposed") + ": " + y.t);
  audit("Sponsor milestone " + (m ? "revised" : "proposed"), x.id, y.id);
  UI.modal = null;
  clearF("spms");
  toast("Sent to the other side for approval.");
  ok();
};
function spMsActs(x, p, m) {
  const side = spSide(p);
  const s = m.sp;
  const dsp = dspOn(x, "ms", m.id);
  const out = [];
  if (!side || x.state !== "Active") return dsp ? spDspLink(x, p, dsp) : "";
  if (s.sr === "Proposed" && !s.ok[side])
    out.push(B("Ask for changes", "spMsChanges", { r: x.id, m: m.id }), B(ic("check", 14) + (side === "owner" ? "Approve for the team" : "Approve milestone"), "spMsAgree", { r: x.id, m: m.id }, "btn-p btn-sm"));
  if (["Proposed", "Changes requested"].includes(s.sr) && s.by === myId())
    out.push(B(ic("edit", 14) + "Revise", "spMsEdit", { r: x.id, m: m.id }, s.sr === "Changes requested" ? "btn-p btn-sm" : "btn-s btn-sm"));
  if (s.sr === "Agreed" && !dsp) out.push(B(ic("edit", 14) + "Propose a change", "spMsEdit", { r: x.id, m: m.id }));
  if (side === "owner" && ["Agreed", "More information requested"].includes(s.sr) && !dsp)
    out.push(B(ic("check", 14) + (s.sr === "Agreed" ? "Mark complete" : "Send what was asked for"), "spMsDone", { r: x.id, m: m.id }, "btn-p btn-sm"));
  if (side === "sponsor" && s.sr === "Submitted" && !dsp)
    out.push(B("Request missing items", "spMsMore", { r: x.id, m: m.id }), B(ic("check", 14) + "Approve milestone", "spMsApprove", { r: x.id, m: m.id }, "btn-p btn-sm"));
  if (["Proposed", "Changes requested", "Submitted", "More information requested"].includes(s.sr) && !dsp)
    out.push(B(ic("shield", 14) + "Escalate to a Steward", "spDspNew", { r: x.id, kind: "ms", s: m.id }));
  if (dsp) out.push(spDspLink(x, p, dsp));
  return out.join("");
}
// The Sponsor opens a dispute inside their project page; everyone else inside the workspace.
const spDspLink = (x, p, dp) =>
  spSponsor(p) ? L(ic("shield", 14) + "Open dispute " + h(dp.ref), "sponsorproject", { id: p.id, tab: "dsp", d: dp.id }, "btn btn-s btn-sm") : L(ic("shield", 14) + "Open dispute " + h(dp.ref), "room", { id: x.id, tab: "dsp", d: dp.id }, "btn btn-s btn-sm");
// View only: the two sides, workspace members and Organization Admins see a sponsor milestone in full.
A.spMs = (d) => {
  const x = byId("rooms", d.r);
  const p = spOfRoom(x);
  const m = x && x.milestones.find((y) => y.id === d.m);
  if (!m || !m.sp || !(spSide(p) || memberOf(x) || role() === "A")) return deny("only the sponsor, the project team and Organization Admins see this milestone");
  clearF("spmc");
  const fin = spFin(p);
  modal(
    "Milestone " + m.sp.n + " · " + h(m.t),
    () => {
      const s = m.sp;
      const ps = spMsPays(x, m);
      const tasks = (x.tasks || []).filter((t) => t.ms === m.id);
      return `<div class="col fgap sp-msd"><div class="row wrap" style="gap:8px">${pill(srLabel(m))}${dspOn(x, "ms", m.id) ? pill("In dispute") : ""}${fin && spMsPayState(x, m) ? payPill(spMsPayState(x, m)) : ""}</div>${dl([
        ["Deliverables", spText(s.deliv)],
        ["Expected outcome", spText(s.outcome)],
        ["Acceptance criteria", spText(s.criteria)],
        ["Deadline", m.due ? fmtD(m.due) + dueTag(m.due, s.sr === "Approved") : '<span class="cap">None</span>'],
        fin && ["Amount paid on approval", money(spCur(p), s.amount)],
        ["Proposed by", spNm(p, s.by)],
        ["Approved by", `Sponsor ${spMsOk(m, "sponsor")} · Project owner ${spMsOk(m, "owner")}`],
        !spSponsor(p) && ["Assigned work", tasks.length ? tasks.map((t) => h(t.t) + " → " + nm(t.owner) + " " + pill(t.status)).join("<br>") : '<span class="cap">No tasks linked yet</span>'],
      ])}${
        s.subs.length
          ? `<section class="col fgap"><h3 class="h3">Submissions and reviews</h3>${s.subs
              .slice()
              .reverse()
              .map(
                (b, i) =>
                  `<div class="sp-sub"><div class="row wrap sp-sub-h"><b>Submission ${s.subs.length - i}</b><span class="cap">${fmtD(b.at)} · ${spNm(p, b.by)}</span></div><p>${spText(b.note)}</p>${spFiles(b.files)}${(b.evs || []).length ? `<div class="cap">Evidence: ${b.evs.map((id) => byId("evidence", id)).filter(Boolean).map((e) => h(e.title) + " " + pill(e.review)).join("<br>")}</div>` : ""}${b.decision ? `<div class="sp-dec">${pill(b.decision.v)} <span class="cap">${fmtD(b.decision.at)} · ${b.decision.steward ? "Independent Steward decision " + h(b.decision.steward) : spNm(p, b.decision.by)}</span>${b.decision.note ? `<p>${spText(b.decision.note)}</p>` : ""}</div>` : '<div class="cap">Awaiting the sponsor’s review</div>'}</div>`,
              )
              .join("")}</section>`
          : ""
      }${fin && ps.length ? `<section class="col fgap"><h3 class="h3">Payment status</h3>${ps.map((y) => lrow("coin", h(y.ref) + " · " + payPill(y.status), money(spCur(p), y.amount) + (y.offRef ? " · ref " + h(y.offRef) : "") + (y.due ? " · due " + fmtD(y.due) : ""))).join("")}</section>` : ""}<section class="col fgap"><h3 class="h3">Discussion</h3>${
        s.notes.length
          ? `<ol class="sp-notes">${s.notes.map((n) => `<li class="${n.kind}"><b>${n.kind === "steward" ? "Independent Steward" : spNm(p, n.by)}</b><span class="cap"> · ${fmtD(n.at)}${n.kind === "changes" ? " · asked for changes" : n.kind === "revise" ? " · revision" : ""}</span><p>${spText(n.t)}</p></li>`).join("")}</ol>`
          : '<p class="cap">No discussion yet.</p>'
      }${spSide(p) && x.state === "Active" ? `<form data-f="spmc" class="col fgap" novalidate><input type="hidden" name="r" value="${x.id}"><input type="hidden" name="m" value="${m.id}">${fi("spmc", "t", "Add to the discussion", { type: "textarea", rows: 2, req: true, max: 2000, help: "The sponsor and the project team see this. It is kept with the milestone." })}<div class="actions"><span></span><button class="btn btn-s btn-sm" type="submit">${ic("send", 14)}Post</button></div></form>` : ""}</section>${s.versions.length ? `<details class="ws-done"><summary class="cap">${s.versions.length} earlier version${s.versions.length > 1 ? "s" : ""}</summary>${s.versions.map((v) => `<p class="cap">${fmtD(v.at)} · ${h(v.t)}${fin ? " · " + money(spCur(p), v.amount) : ""} · was ${h(v.sr)}</p>`).join("")}</details>` : ""}<div class="actions sp-ms-acts"><span></span><div class="row wrap">${spMsActs(x, p, m)}</div></div></div>`;
    },
    true,
  );
};
F.spmc = (d) => {
  if (!validate("spmc", d, { t: ["req", ["min", 2]] })) return render();
  const x = byId("rooms", d.r);
  const p = spOfRoom(x);
  const m = x.milestones.find((y) => y.id === d.m);
  m.sp.notes.push({ id: uid("mn"), by: myId(), at: now(), kind: "comment", t: d.t.trim() });
  spTell(p, x, [p.sponsor, ...spOwners(p)], (myId() === p.sponsor ? p.alias : me().name) + " commented on milestone " + m.sp.n + " of “" + p.title + "”");
  audit("Sponsor milestone comment", x.id, m.id);
  clearF("spmc");
  ok();
};
A.spMsAgree = (d) => {
  const x = byId("rooms", d.r);
  const p = spOfRoom(x);
  const m = x.milestones.find((y) => y.id === d.m);
  const side = spSide(p);
  m.sp.ok[side] = now();
  if (m.sp.ok.sponsor && m.sp.ok.owner) {
    m.sp.sr = "Agreed";
    m.sp.agreedAt = now();
    spPaySync(x, m);
  }
  spTell(p, x, spOther(p, side), "Milestone " + m.sp.n + " of “" + p.title + "” is " + (m.sp.sr === "Agreed" ? "agreed by both sides" : "approved by the other side"));
  sysMsg(x, "Sponsor milestone " + m.sp.n + " approved by the " + (side === "sponsor" ? "sponsor" : "project owner") + (m.sp.sr === "Agreed" ? "; agreed" : ""));
  audit("Sponsor milestone approved", x.id, m.id + " · " + side);
  UI.modal = null;
  toast(m.sp.sr === "Agreed" ? "Milestone agreed by both sides. The owner can now assign the work." : "Approved. Waiting for the other side.");
  ok();
};
// A short reason form used by "ask for changes", "request missing items" and "approve completion".
function spNoteModal(title, f, d, label, req, help, btn) {
  clearF(f);
  modal(title, () => `<form data-f="${f}" class="col fgap" novalidate><input type="hidden" name="r" value="${d.r}"><input type="hidden" name="m" value="${d.m}">${fi(f, "note", label, { type: "textarea", rows: 4, req, max: 2000, help })}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">${btn}</button></div></form>`);
}
A.spMsChanges = (d) => spNoteModal("Ask for changes", "spmr", d, "What needs to change", true, "Whoever proposed it revises the milestone and sends it again.", "Ask for changes");
F.spmr = (d) => {
  if (!validate("spmr", d, { note: ["req", ["min", 10]] })) return render();
  const x = byId("rooms", d.r);
  const p = spOfRoom(x);
  const m = x.milestones.find((y) => y.id === d.m);
  m.sp.sr = "Changes requested";
  m.sp.notes.push({ id: uid("mn"), by: myId(), at: now(), kind: "changes", t: d.note.trim() });
  spTell(p, x, [m.sp.by], "Changes requested on milestone " + m.sp.n + " of “" + p.title + "”");
  audit("Sponsor milestone changes requested", x.id, m.id);
  UI.modal = null;
  clearF("spmr");
  toast("Sent. The milestone goes back for revision.");
  ok();
};
// The owner marks a milestone complete with a note, files and any evidence from the project.
A.spMsDone = (d) => {
  const x = byId("rooms", d.r);
  const p = spOfRoom(x);
  const m = x.milestones.find((y) => y.id === d.m);
  const evs = S.evidence.filter((e) => evProjects(e).includes(p) && e.review !== "Rejected");
  const ask = m.sp.sr === "More information requested" ? m.sp.subs.slice(-1)[0] : null;
  const open = (x.tasks || []).filter((t) => t.ms === m.id && t.status !== "Done");
  clearF("spmd");
  modal(
    (ask ? "Send what was asked for · milestone " : "Mark milestone complete · ") + m.sp.n,
    () =>
      `<form data-f="spmd" class="col fgap" novalidate>${errSum("spmd")}<input type="hidden" name="r" value="${x.id}"><input type="hidden" name="m" value="${m.id}">${dl([
        ["Milestone", h(m.t)],
        ["Acceptance criteria", spText(m.sp.criteria)],
      ])}${ask && ask.decision ? banner("warn", "The sponsor asked for", spText(ask.decision.note)) : ""}${open.length ? banner("warn", open.length + " linked task" + (open.length > 1 ? "s are" : " is") + " not done", open.map((t) => h(t.t) + " → " + nm(t.owner)).join("; ") + ". You can still submit; the sponsor decides.") : ""}${fi("spmd", "note", "What was delivered", { type: "textarea", rows: 4, req: true, max: 3000, help: "How each acceptance criterion is met. At least 20 characters." })}<div class="field"><label class="lbl" for="spmd_files">Supporting documents and deliverables (optional)</label><input id="spmd_files" class="input" type="file" name="files" multiple><span class="help">Up to ${S.settings.maxFileMB} MB each. File names are recorded with the submission.</span></div><div class="field"><span class="lbl">Evidence from the project (optional)</span>${chkGroup("evs", evs.map((e) => [e.id, h(e.title) + ` <span class="cap">· ${h(e.review)}</span>`]), [])}</div><div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">Send to the sponsor</button></div></form>`,
    true,
  );
};
F.spmd = (d, form) => {
  if (!validate("spmd", d, { note: ["req", ["min", 20]] })) return render();
  const files = spTakeFiles(form);
  if (!files) return render();
  const x = byId("rooms", d.r);
  const p = spOfRoom(x);
  const m = x.milestones.find((y) => y.id === d.m);
  m.sp.subs.push({ id: uid("msb"), at: now(), by: myId(), note: d.note.trim(), files, evs: [].concat(d.evs || []), decision: null });
  m.sp.sr = "Submitted";
  if (m.status === "Not started") m.status = "In progress";
  spTell(p, x, [p.sponsor], me().name + " marked milestone " + m.sp.n + " of “" + p.title + "” complete. Review it.");
  sysMsg(x, "Sponsor milestone " + m.sp.n + " submitted as complete (submission " + m.sp.subs.length + ")");
  audit("Sponsor milestone submitted", x.id, m.id + " · " + files.length + " file(s)");
  UI.modal = null;
  clearF("spmd");
  toast("Sent to the sponsor for approval.");
  ok();
};
A.spMsMore = (d) => spNoteModal("Request missing items or corrections", "spmi", d, "What is missing or needs correcting", true, "The milestone returns to the team. They address it and send it again.", "Send request");
A.spMsApprove = (d) => spNoteModal("Approve milestone", "spma", d, "Note to the team (optional)", false, "Approving records that the acceptance criteria are met. Its payment status becomes Due.", "Approve milestone");
// The sponsor's decision on the latest submission; approval also marks the workspace milestone achieved.
function spMsDecide(d, v, by) {
  const x = byId("rooms", d.r);
  const p = spOfRoom(x);
  const m = x.milestones.find((y) => y.id === d.m);
  const s = m.sp.subs.slice(-1)[0];
  if (s) s.decision = { v, by: myId(), at: now(), note: (d.note || "").trim(), ...(by ? { steward: by } : {}) };
  m.sp.sr = v;
  if (v === "Approved") {
    m.sp.approvedAt = now();
    Object.assign(m, { status: "Achieved", validatedBy: myId(), validatedAt: now() });
    if (p.history) p.history.push({ at: now(), by: myId(), t: "Milestone approved: " + m.t });
  }
  spPaySync(x, m, v === "Approved" ? "Milestone " + m.sp.n + " approved" : "");
  spTell(p, x, spTeam(p), "Milestone " + m.sp.n + " of “" + p.title + "”: " + (v === "Approved" ? "approved" + (by ? " by the independent Steward" : " by the sponsor") : (by ? "the independent Steward" : "the sponsor") + " asked for missing items"));
  sysMsg(x, "Sponsor milestone " + m.sp.n + ": " + v.toLowerCase());
  audit("Sponsor milestone " + v.toLowerCase(), x.id, m.id);
  UI.modal = null;
  return [x, p, m];
}
F.spmi = (d) => {
  if (!validate("spmi", d, { note: ["req", ["min", 20]] })) return render();
  spMsDecide(d, "More information requested");
  clearF("spmi");
  toast("Sent. The milestone returns to the team until they resubmit.");
  ok();
};
F.spma = (d) => {
  spMsDecide(d, "Approved");
  clearF("spma");
  toast("Milestone approved. Its payment is now Due; record it once paid offline.");
  ok();
};

// ---------- ACTION WORKSPACE: payment status (manual, offline) ----------
function spPayAdd(x, f, why) {
  const p = { id: uid("pay"), ref: "PAY-" + String(spPays(x).length + 1).padStart(3, "0"), at: now(), paidOn: "", offRef: "", note: "", hist: [], ...f };
  p.hist.push({ at: now(), by: myId(), from: null, to: p.status, amount: p.amount, note: why || "Recorded" });
  spPays(x).push(p);
  return p;
}
function spPaySet(x, y, to, note, extra = {}) {
  y.hist.push({ at: now(), by: myId(), from: y.status, to, note, ...extra });
  y.status = to;
}
// Keeps a milestone's payment record in step with its approval: created Pending when agreed, Due once approved, back to
// Pending when the sponsor asks for more. A payment recorded Paid Offline, On Hold or Disputed is never changed here.
function spPaySync(x, m, why) {
  if (!SR_AGREED.includes(m.sp.sr) || !(+m.sp.amount > 0)) return;
  let y = spMsPays(x, m)[0];
  if (!y) y = spPayAdd(x, { ms: m.id, kind: "Milestone payment", amount: +m.sp.amount, due: "", status: "Pending" }, "Created automatically when milestone " + m.sp.n + " was agreed");
  if (["Pending", "Due"].includes(y.status) && +y.amount !== +m.sp.amount) {
    y.hist.push({ at: now(), by: myId(), from: y.status, to: y.status, amount: +m.sp.amount, note: "Amount follows the agreed milestone" });
    y.amount = +m.sp.amount;
  }
  if (y.status === "Pending" && m.sp.sr === "Approved") spPaySet(x, y, "Due", "Automatic: " + (why || "milestone approved"));
  if (y.status === "Due" && m.sp.sr !== "Approved") spPaySet(x, y, "Pending", "Automatic: milestone not approved yet");
}
const spPayFor = (x, y) => {
  const m = y.ms && x.milestones.find((z) => z.id === y.ms);
  return m ? "Milestone " + m.sp.n + " · " + h(m.t) : h(y.kind || "Other payment");
};
function spPayTab(x, p) {
  const side = spSide(p);
  const cur = spCur(p);
  const ro = x.state !== "Active";
  const ps = spPays(x);
  const last = (y) => y.hist[y.hist.length - 1];
  const rows = ps.map((y) => {
    const dsp = dspOn(x, "pay", y.id) || (y.ms && dspOn(x, "ms", y.ms));
    const l = last(y);
    return [
      `<span class="mono">${h(y.ref)}</span>`,
      spPayFor(x, y),
      money(cur, y.amount),
      y.due ? fmtD(y.due) + dueTag(y.due, y.status === "Paid Offline") : '<span class="cap">—</span>',
      payPill(y.status) + (y.paidOn ? `<div class="cap">Paid ${fmtD(y.paidOn)}</div>` : ""),
      y.offRef ? h(y.offRef) : '<span class="cap">—</span>',
      l ? spNm(p, l.by) + `<div class="cap">${fmtD(l.at)}</div>` : "",
      `<span class="row wrap" style="gap:6px">${B("History", "spPayHist", { r: x.id, p: y.id })}${side && !ro && y.status !== "Disputed" ? B("Update status", "spPayUpd", { r: x.id, p: y.id }, "btn-p btn-sm") : ""}${side && !ro && !dsp && y.status !== "Disputed" ? B(ic("shield", 14) + "Escalate", "spDspNew", { r: x.id, kind: "pay", s: y.id }) : ""}${dsp ? spDspLink(x, p, dsp) : ""}</span>`,
    ];
  });
  return (
    banner("info", "Recorded, never processed", SP_OFFLINE + " Either side records the status; every change is kept with who made it.", "coin") +
    '<div class="section-gap"></div>' +
    hmStrip(
      [
        hmFig("t-soft", "coin", money(cur, p.brief.budget || 0), "Indicative budget", "Milestones total " + money(cur, spMsTotal(x))),
        hmFig("t-teal", "check", money(cur, spSum(x, "Paid Offline")), "Paid offline", "Recorded by the two sides"),
        hmFig("t-purple", "clock", money(cur, spSum(x, "Due")), "Due", ps.filter((y) => y.status === "Due").length + " record(s)"),
        hmFig("t-navy", "alert", money(cur, spSum(x, "Disputed") + spSum(x, "On Hold")), "Disputed or on hold", ""),
      ],
      "Payment status summary",
    ) +
    card(
      "Payment status",
      "A milestone’s payment is created when the milestone is agreed, and becomes Due when the sponsor approves it. " + (role() === "A" ? "You can read these records; only the two sides update them." : ""),
      table(["Ref", "For", "Amount", "Due date", "Status", "Offline reference", "Last update", ""], rows, "No payment records yet. They are created when a milestone with an amount is agreed."),
      side && !ro ? B(ic("plus", 14) + "Add payment record", "spPayNew", { r: x.id }, "btn-s btn-sm") : "",
      "sp-paytbl",
    )
  );
}
// A record not tied to a milestone (an advance, expenses): either side adds it.
A.spPayNew = (d) => {
  const x = byId("rooms", d.r);
  const p = spOfRoom(x);
  clearF("sppn");
  UI.form.sppn = { kind: "Advance", status: "Pending" };
  modal(
    "Add a payment record",
    () =>
      `<form data-f="sppn" class="col fgap" novalidate>${errSum("sppn")}<input type="hidden" name="r" value="${x.id}"><div class="f2">${fi("sppn", "kind", "What it is for", { type: "select", opts: ["Advance", "Expenses", "Other"] })}${fi("sppn", "amount", "Amount (" + h(spCur(p)) + ")", { type: "number", req: true, min: 0.01, step: "0.01" })}</div><div class="f2">${fi("sppn", "status", "Status", { type: "select", opts: PAY_MANUAL })}${fi("sppn", "due", "Due date (optional)", { type: "date" })}</div>${fi("sppn", "note", "Note", { type: "textarea", rows: 2, max: 1000, help: "What was agreed about this payment." })}${banner("info", "", "Milestone payments are created automatically when a milestone is agreed. " + SP_OFFLINE)}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">Add record</button></div></form>`,
  );
};
F.sppn = (d) => {
  if (!validate("sppn", d, { amount: ["req", "num"], status: [["fn", { f: (v) => PAY_MANUAL.includes(v), m: "Choose a status." }]] })) return render();
  const x = byId("rooms", d.r);
  const p = spOfRoom(x);
  const y = spPayAdd(x, { ms: null, kind: d.kind || "Other", amount: +d.amount, due: d.due || "", status: d.status, note: (d.note || "").trim() }, "Recorded" + (d.note ? ": " + d.note.trim() : ""));
  spTell(p, x, spOther(p, spSide(p)), "Payment record " + y.ref + " added to “" + p.title + "”: " + y.status, "pay");
  audit("Payment status recorded", x.id, y.id + " · " + y.status);
  UI.modal = null;
  clearF("sppn");
  toast("Payment record added.");
  ok();
};
// A milestone payment can be Due or Paid Offline only once the sponsor has approved the milestone.
const spPayAllowed = (x, y, to) => {
  const m = y.ms && x.milestones.find((z) => z.id === y.ms);
  return !m || !["Due", "Paid Offline"].includes(to) || m.sp.sr === "Approved";
};
A.spPayUpd = (d) => {
  const x = byId("rooms", d.r);
  const p = spOfRoom(x);
  const y = spPays(x).find((z) => z.id === d.p);
  clearF("sppu");
  UI.form.sppu = { status: y.status, amount: String(y.amount), due: y.due || "", paidOn: y.paidOn || "", offRef: y.offRef || "" };
  modal(
    "Update payment status · " + h(y.ref),
    () =>
      `<form data-f="sppu" class="col fgap" novalidate>${errSum("sppu")}<input type="hidden" name="r" value="${x.id}"><input type="hidden" name="p" value="${y.id}">${dl([
        ["For", spPayFor(x, y)],
        ["Current status", payPill(y.status)],
      ])}<div class="f2">${fi("sppu", "status", "New status", { type: "select", req: true, opts: PAY_MANUAL, help: "Disputed is set only by escalating to an independent Steward." })}${fi("sppu", "amount", "Amount (" + h(spCur(p)) + ")", { type: "number", req: true, min: 0.01, step: "0.01" })}</div><div class="f2">${fi("sppu", "due", "Due date (optional)", { type: "date" })}${fi("sppu", "paidOn", "Paid on", { type: "date", maxv: today(), help: "Needed for Paid Offline." })}</div>${fi("sppu", "offRef", "Offline payment reference (optional)", { max: 80, ph: "e.g. bank transfer reference" })}${fi("sppu", "note", "Note", { type: "textarea", rows: 2, max: 1000, help: "Needed when you put a payment on hold or change its amount." })}${banner("info", "", SP_OFFLINE)}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">Save status</button></div></form>`,
  );
};
F.sppu = (d) => {
  const x = byId("rooms", d.r);
  const y = spPays(x).find((z) => z.id === d.p);
  const changed = +d.amount !== +y.amount;
  if (
    !validate("sppu", d, {
      status: [["fn", { f: (v) => PAY_MANUAL.includes(v), m: "Choose a status." }], ["fn", { f: (v) => spPayAllowed(x, y, v), m: "A milestone payment becomes Due or Paid Offline only after the sponsor approves the milestone." }]],
      amount: ["req", "num"],
      paidOn: [["fn", { f: (v, dd) => dd.status !== "Paid Offline" || (!!v && v <= today()), m: "Enter the date it was paid (today or earlier)." }]],
      note: [["fn", { f: (v, dd) => (dd.status !== "On Hold" && +dd.amount === +y.amount) || v.length >= 5, m: "Say why it is on hold or why the amount changed." }]],
    })
  )
    return render();
  const p = spOfRoom(x);
  const from = y.status;
  y.hist.push({ at: now(), by: myId(), from, to: d.status, amount: changed ? +d.amount : undefined, ref: d.offRef || undefined, note: (d.note || "").trim() });
  Object.assign(y, { status: d.status, amount: +d.amount, due: d.due || "", paidOn: d.status === "Paid Offline" ? d.paidOn : "", offRef: (d.offRef || "").trim() });
  spTell(p, x, spOther(p, spSide(p)), "Payment " + y.ref + " of “" + p.title + "”: " + from + " → " + y.status, "pay");
  audit("Payment status updated", x.id, y.id + " · " + from + " → " + y.status);
  UI.modal = null;
  clearF("sppu");
  toast("Payment status saved. Nothing was paid through PHOENIX.");
  ok();
};
A.spPayHist = (d) => {
  const x = byId("rooms", d.r);
  const p = spOfRoom(x);
  const y = spPays(x).find((z) => z.id === d.p);
  if (!spFin(p)) return deny("only the two sides and Organization Admins see payment records");
  modal(
    "Status history · " + h(y.ref),
    () =>
      `<div class="col fgap">${dl([["For", spPayFor(x, y)], ["Now", payPill(y.status) + " · " + money(spCur(p), y.amount)]])}<ol class="mtl ws-tl">${y.hist
        .slice()
        .reverse()
        .map((l) => `<li class="done"><span class="mtl-dot">${ic("check", 12)}</span><div class="col"><b>${l.from ? h(l.from) + " → " : ""}${h(l.to)}${l.amount != null ? " · " + money(spCur(p), l.amount) : ""}</b><span class="cap">${fmtD(l.at)} · ${spNm(p, l.by)}${l.ref ? " · ref " + h(l.ref) : ""}</span>${l.note ? `<p class="cap">${h(l.note)}</p>` : ""}</div></li>`)
        .join("")}</ol><div class="actions"><span></span>${B("Close", "closeM")}</div></div>`,
  );
};

// ---------- DISPUTES: independent Steward, anonymised sides ----------
const DSP_SIDE = { sponsor: "Sponsor side", owner: "Team side" };
const dspProj = (dp) => byId("projects", dp.pr);
const dspRoom = (dp) => byId("rooms", dp.room);
const dspSubject = (dp) => {
  const x = dspRoom(dp);
  if (!x) return "";
  if (dp.subject.kind === "ms") {
    const m = x.milestones.find((y) => y.id === dp.subject.id);
    return "Milestone " + (m ? m.sp.n + " · " + m.t : "");
  }
  const y = spPays(x).find((z) => z.id === dp.subject.id);
  return "Payment " + (y ? y.ref : "");
};
// Inside a dispute nobody is named: the sponsor and everyone on the team appear under the dispute's two aliases.
const dspAlias = (dp, pid) => {
  const p = dspProj(dp);
  if (pid === p.sponsor) return dp.aliases.sponsor;
  if (spTeam(p).includes(pid)) return dp.aliases.team;
  if (pid === dp.steward) return "Independent Steward";
  return "Organization administration";
};
const dspMine = (dp) => spSide(dspProj(dp));
const dspSees = (dp) => !!dp && inCtx(dp) && (!!dspMine(dp) || (role() === "F" && dp.steward === myId()) || role() === "A");
const dspAdmins = (dp) => ctxAdmins(dp.ctx);
const dspParties = (dp) => {
  const p = dspProj(dp);
  return [p.sponsor, ...spOwners(p)];
};
// Who could act as Steward, and why someone cannot: a human Faculty/Steward in the programme with no tie to either side.
function dspCands(dp) {
  const p = dspProj(dp);
  const spOrg = P(p.sponsor).org;
  const team = spTeam(p);
  const teamOrgs = team.map((x) => P(x).org).filter(Boolean);
  const spaces = SPACE_KINDS.flatMap((k) => [byId(k, p[projRoomOf(k).key]), ...linkedObjs(p.id, k)]).filter(Boolean);
  const facs = [...new Set(S.assign.filter((a) => a.ctx === p.ctx && roleBase(a.role) === "F" && a.status === "Active").map((a) => a.pid))].filter((x) => x !== p.sponsor);
  return facs.map((pid) => {
    const o = P(pid).org;
    const why = team.includes(pid)
      ? "is on the project team"
      : (p.shortlist || []).some((s) => s.pid === pid)
        ? "shortlisted this project"
        : o && o === spOrg
          ? "belongs to the sponsor’s organisation"
          : o && teamOrgs.includes(o)
            ? "belongs to a team member’s organisation"
            : p.stewards.includes(pid)
              ? "is the project’s Faculty/Steward"
              : spaces.some((s) => (s.members || []).some((m) => m.pid === pid))
                ? "is a member or facilitator of one of the project’s spaces"
                : (dp.declined || []).some((x) => x.pid === pid)
                  ? "declared a conflict of interest on this dispute"
                  : "";
    return { pid, why };
  });
}
// Raising or settling a dispute moves the affected payment records to Disputed and back.
function dspPaysOf(dp) {
  const x = dspRoom(dp);
  return dp.subject.kind === "pay" ? spPays(x).filter((y) => y.id === dp.subject.id) : spPays(x).filter((y) => y.ms === dp.subject.id && y.status !== "Paid Offline");
}
A.spDspNew = (d) => {
  const x = byId("rooms", d.r);
  const m = d.kind === "ms" && x.milestones.find((y) => y.id === d.s);
  const subj = m ? "Milestone " + m.sp.n + " · " + h(m.t) : "Payment " + h(spPays(x).find((y) => y.id === d.s).ref);
  clearF("spdn");
  modal(
    "Escalate to an independent Steward",
    () =>
      `<form data-f="spdn" class="col fgap" novalidate>${errSum("spdn")}<input type="hidden" name="r" value="${x.id}"><input type="hidden" name="kind" value="${d.kind}"><input type="hidden" name="s" value="${d.s}">${dl([["About", subj]])}${fi("spdn", "reason", "What is disputed, and why", { type: "textarea", rows: 4, req: true, max: 3000, help: "At least 40 characters. Refer to the agreed milestone, its acceptance criteria or the payment records." })}${fi("spdn", "want", "The outcome you are asking for", { type: "textarea", rows: 2, req: true, max: 1000 })}<div class="field"><label class="lbl" for="spdn_files">Supporting evidence (optional)</label><input id="spdn_files" class="input" type="file" name="files" multiple></div>${banner("info", "How a dispute is decided", "The Organization Admin assigns a human Steward who is not affiliated with either side. The Steward reviews the milestone and its acceptance criteria, submissions, reviews, the milestone discussion and the payment records, then decides. Both sides appear under new aliases: names and organisations are not shown to the Steward or to the other side in the dispute. Any payment involved shows as Disputed until it is resolved.")}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">Escalate</button></div></form>`,
    true,
  );
};
F.spdn = (d, form) => {
  if (!validate("spdn", d, { reason: ["req", ["min", 40]], want: ["req", ["min", 10]] })) return render();
  const files = spTakeFiles(form);
  if (!files) return render();
  const x = byId("rooms", d.r);
  const p = spOfRoom(x);
  const side = spSide(p);
  S.disputes = S.disputes || [];
  const dp = {
    id: uid("dsp"),
    // next number after the highest ref in use, so a removed dispute never lets a ref repeat
    ref: "DSP-" + String(S.disputes.reduce((n, o) => Math.max(n, +String(o.ref || "").replace(/\D/g, "") || 0), 0) + 1).padStart(4, "0"),
    pr: p.id,
    room: x.id,
    ctx: p.ctx,
    subject: { kind: d.kind, id: d.s },
    raisedBy: myId(),
    side,
    at: now(),
    reason: d.reason.trim(),
    want: d.want.trim(),
    aliases: { sponsor: spAlias("Sponsor side"), team: spAlias("Team side") },
    status: "Awaiting Steward assignment",
    steward: null,
    declined: [],
    thread: [],
    decision: null,
    log: [],
  };
  dp.thread.push({ id: uid("dst"), by: myId(), at: now(), kind: "statement", t: d.reason.trim() + "\n\nOutcome sought: " + d.want.trim(), files });
  dp.log.push({ at: now(), t: "Raised by the " + DSP_SIDE[side].toLowerCase() + " (" + dspAlias(dp, myId()) + ")" });
  S.disputes.push(dp);
  dspPaysOf(dp).forEach((y) => {
    y.prev = y.status;
    spPaySet(x, y, "Disputed", "Automatic: dispute " + dp.ref + " raised");
  });
  spTell(p, x, spOther(p, side), "Dispute " + dp.ref + " was raised about " + dspSubject(dp) + " of “" + p.title + "”. An independent Steward will decide.", "dsp", { d: dp.id });
  dspAdmins(dp).forEach((a) => notify(a, "Dispute " + dp.ref + " needs an independent Steward", "dispute", { id: dp.id }));
  sysMsg(x, "Dispute " + dp.ref + " raised about " + dspSubject(dp));
  audit("Sponsor dispute raised", dp.id, dspSubject(dp) + " · " + side);
  UI.modal = null;
  clearF("spdn");
  toast("Escalated. The Organization Admin assigns an independent Steward.");
  save();
  go(spWsRoute(p, myId()), { id: x.id, tab: "dsp", d: dp.id });
};
function spDspTab(x, p) {
  const dp = UI.p.tab === "dsp" && UI.p.d && byId("disputes", UI.p.d);
  if (dp && dp.room === x.id && dspSees(dp)) {
    const v = dspView(dp);
    return `<p class="cap">${L(ic("chevl", 14) + "All disputes", spSponsor(p) ? "sproom" : "room", { id: x.id, tab: "dsp" })}</p>` + head("Dispute " + h(dp.ref), "About " + h(dspSubject(dp)) + " · raised " + fmtD(dp.at), pill(dp.status)) + hmCols(v.main, v.rail);
  }
  const side = spSide(p);
  const ds = spDsps(x);
  return (
    banner("info", "Independent Steward", "If you cannot agree on a milestone or a payment through the milestone review, escalate it from the milestone or the payment. A human Steward with no tie to either side reviews the evidence and decides. Both sides appear under aliases.", "shield") +
    '<div class="section-gap"></div>' +
    card(
      "Disputes",
      "",
      table(
        ["Reference", "About", "Raised by", "Raised", "Status", ""],
        ds
          .slice()
          .reverse()
          .map((dp) => [`<span class="mono">${h(dp.ref)}</span>`, h(dspSubject(dp)), side && dp.side === side ? "Your side" : DSP_SIDE[dp.side], fmtD(dp.at), pill(dp.status), spDspLink(x, p, dp)]),
        "No disputes. They are raised from a milestone under review or a payment record.",
      ),
    )
  );
}
route("disputes", "any", () => {
  const r = role();
  if (!["A", "F"].includes(r))
    return head("Disputes", "") + card("", "", empty("shield", "Disputes are handled by Organization Admins and independent Stewards", "Sponsors and project owners follow their disputes in the project’s " + WL() + ".", L("Back to My PHOENIX", "home", {}, "btn btn-s btn-sm")));
  const list = (S.disputes || []).filter((dp) => inCtx(dp) && (r === "A" || dp.steward === myId()));
  return (
    head(r === "A" ? "Disputes" : "Dispute reviews", r === "A" ? "Disagreements between sponsors and project teams. Assign a human Steward with no tie to either side. You see aliases, not names." : "Disputes you are asked to decide as an independent Steward. Both sides appear under aliases.") +
    banner("info", "Independence", "A Steward must be a person, never an AI, and must not be the sponsor, on the project team, someone who shortlisted the project, a member or facilitator of the project’s spaces, or from either side’s organisation. PHOENIX checks these ties; the Steward also confirms independence before seeing the evidence.", "shield") +
    '<div class="section-gap"></div>' +
    card(
      r === "A" ? "Disputes in " + h(ctxName(ctxId())) : "Assigned to you",
      "",
      table(
        ["Reference", "About", "Raised", r === "A" ? "Steward" : "Raised by", "Status", ""],
        list
          .slice()
          .reverse()
          .map((dp) => [
            `<span class="mono">${h(dp.ref)}</span>`,
            h(dspSubject(dp)),
            fmtD(dp.at),
            r === "A" ? (dp.steward ? nm(dp.steward) : '<span class="cap">Not assigned</span>') : h(dp.aliases[dp.side === "sponsor" ? "sponsor" : "team"]),
            pill(dp.status),
            r === "A" && dp.status === "Awaiting Steward assignment" ? B("Assign Steward", "spDspAssign", { id: dp.id }, "btn-p btn-sm") : L("Open", "dispute", { id: dp.id }, "btn btn-s btn-sm"),
          ]),
        r === "A" ? "No disputes in this programme." : "No disputes are assigned to you.",
      ),
    )
  );
});
A.spDspAssign = (d) => {
  const dp = byId("disputes", d.id);
  clearF("spda");
  const cs = dspCands(dp);
  modal(
    "Assign an independent Steward · " + h(dp.ref),
    () =>
      `<form data-f="spda" class="col fgap" novalidate>${errSum("spda")}<input type="hidden" name="id" value="${dp.id}">${dl([
        ["About", h(dspSubject(dp))],
        ["Sides", h(dp.aliases.sponsor) + " and " + h(dp.aliases.team)],
      ])}<fieldset class="np-fs col"><legend class="lbl">Faculty/Stewards in this programme <span class="req">*</span></legend><div class="sp-cands">${cs
        .map((c) => `<label class="choice sp-cand ${c.why ? "is-off" : ""}"><input type="radio" name="s" value="${c.pid}" ${c.why ? "disabled" : ""}><span class="rad" aria-hidden="true"></span><span class="col"><b>${nm(c.pid)}</b><span class="cap">${c.why ? "Not independent: " + h(c.why) : "No tie to either side found"}</span></span></label>`)
        .join("")}</div>${fe("spda", "s") ? `<span class="emsg" role="alert">${ic("alert", 14)}${fe("spda", "s")}</span>` : ""}</fieldset>${cs.every((c) => c.why) ? banner("warn", "Nobody independent is available", "Invite a Facilitator / Steward from outside both organisations from " + L("Programme admin → Invitations", "admin", { tab: "invites" }) + ", then assign them here.") : banner("info", "", "The Steward confirms their independence before they see the evidence, and can decline with a conflict.")}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit" ${cs.every((c) => c.why) ? "disabled" : ""}>Assign</button></div></form>`,
    true,
  );
};
F.spda = (d) => {
  const dp = byId("disputes", d.id);
  const c = dspCands(dp).find((x) => x.pid === d.s);
  if (!c || c.why) {
    UI.err.spda = { s: c ? "This person is not independent: " + c.why + "." : "Choose an independent Steward." };
    return render();
  }
  Object.assign(dp, { steward: d.s, status: "Awaiting Steward acceptance", assignedBy: myId(), assignedAt: now() });
  dp.log.push({ at: now(), t: "Steward assigned by the Organization Admin" });
  notify(d.s, "You are asked to act as independent Steward on dispute " + dp.ref + ". Confirm you have no tie to either side before you see the evidence.", "dispute", { id: dp.id });
  spTell(dspProj(dp), dspRoom(dp), dspParties(dp), "An independent Steward was assigned to dispute " + dp.ref, "dsp", { d: dp.id });
  audit("Dispute Steward assigned", dp.id, d.s);
  UI.modal = null;
  clearF("spda");
  toast("Assigned. The Steward confirms independence before reviewing.");
  ok();
};
const dspThread = (dp) =>
  dp.thread.length
    ? `<ol class="sp-notes">${dp.thread.map((t) => `<li class="${t.kind}"><b>${h(dspAlias(dp, t.by))}</b><span class="cap"> · ${fmtD(t.at)}${t.kind === "question" ? " · question to both sides" : ""}</span><p>${spText(t.t)}</p>${spFiles(t.files)}</li>`).join("")}</ol>`
    : '<p class="cap">No statements yet.</p>';
// The evidence pack: the milestone or payment, submissions, reviews, discussion and payment history, under aliases.
function dspPack(dp) {
  const p = dspProj(dp);
  const x = dspRoom(dp);
  const cur = spCur(p);
  const al = (pid) => h(dspAlias(dp, pid));
  const payHist = (y) =>
    `<ol class="sp-notes">${y.hist.map((l) => `<li><b>${l.from ? h(l.from) + " → " : ""}${h(l.to)}${l.amount != null ? " · " + money(cur, l.amount) : ""}</b><span class="cap"> · ${fmtD(l.at)} · ${al(l.by)}${l.ref ? " · ref " + h(l.ref) : ""}</span>${l.note ? `<p>${h(l.note)}</p>` : ""}</li>`).join("")}</ol>`;
  if (dp.subject.kind === "ms") {
    const m = x.milestones.find((y) => y.id === dp.subject.id);
    const s = m.sp;
    const ps = spMsPays(x, m);
    return (
      card(
        "The milestone",
        "As agreed by both sides",
        dl([
          ["Milestone", s.n + " · " + h(m.t)],
          ["Deliverables", spText(s.deliv)],
          ["Expected outcome", spText(s.outcome)],
          ["Acceptance criteria", spText(s.criteria)],
          ["Deadline", m.due ? fmtD(m.due) : "None"],
          ["Amount paid on approval", money(cur, s.amount)],
          ["Agreed", s.agreedAt ? fmtD(s.agreedAt) : "Not agreed yet"],
          ["Status now", pill(srLabel(m))],
        ]),
      ) +
      card(
        "Submissions and reviews",
        "",
        s.subs
          .map(
            (b, i) =>
              `<div class="sp-sub"><div class="row wrap sp-sub-h"><b>Submission ${i + 1}</b><span class="cap">${fmtD(b.at)} · ${al(b.by)}</span></div><p>${spText(b.note)}</p>${spFiles(b.files)}${(b.evs || []).length ? `<div class="cap">Evidence: ${b.evs.map((id) => byId("evidence", id)).filter(Boolean).map((e) => h(e.title) + " " + pill(e.review)).join("<br>")}</div>` : ""}${b.decision ? `<div class="sp-dec">${pill(b.decision.v)} <span class="cap">${fmtD(b.decision.at)} · ${b.decision.steward ? "Steward decision" : al(b.decision.by)}</span>${b.decision.note ? `<p>${spText(b.decision.note)}</p>` : ""}</div>` : '<div class="cap">No review yet</div>'}</div>`,
          )
          .join("") || '<p class="cap">No submissions.</p>',
      ) +
      card("Milestone discussion", "Messages the two sides exchanged about this milestone", s.notes.length ? `<ol class="sp-notes">${s.notes.map((n) => `<li class="${n.kind}"><b>${n.kind === "steward" ? "Independent Steward" : al(n.by)}</b><span class="cap"> · ${fmtD(n.at)}</span><p>${spText(n.t)}</p></li>`).join("")}</ol>` : '<p class="cap">No discussion.</p>') +
      (ps.length ? card("Payment records for this milestone", "", ps.map((y) => `<div class="sp-sub"><div class="row wrap sp-sub-h"><b>${h(y.ref)} · ${money(cur, y.amount)}</b>${payPill(y.status)}</div>${payHist(y)}</div>`).join("")) : "")
    );
  }
  const y = spPays(x).find((z) => z.id === dp.subject.id);
  const m = y.ms && x.milestones.find((z) => z.id === y.ms);
  return card(
    "The payment record",
    "Every status change, with the side that made it",
    dl([
      ["Payment", h(y.ref) + " · " + (m ? "Milestone " + m.sp.n + " · " + h(m.t) + " (" + money(cur, m.sp.amount) + ", " + h(srLabel(m)) + ")" : h(y.kind))],
      ["Amount", money(cur, y.amount)],
      ["Offline reference", y.offRef ? h(y.offRef) : "—"],
      ["Status", payPill(y.status)],
    ]) + payHist(y),
  );
}
// The dispute itself, for the two sides (inside their workspace), the Steward and Organization Admins (Disputes).
function dspView(dp) {
  const p = dspProj(dp);
  const mineSide = dspMine(dp);
  const stew = role() === "F" && dp.steward === myId();
  const accepted = !!dp.accepted;
  const sideRow = (k, a) =>
    `<div class="lrow"><span class="tile t-soft">${ic("shield", 16)}</span><div class="lt"><b>${h(a)}</b><p class="cap">${k === "sponsor" ? "The sponsor" : "The project team; its owner speaks for it"}${mineSide && (mineSide === k || (mineSide === "owner" && k === "team")) ? " · your side" : ""}</p></div></div>`;
  const parties = card(
    "The two sides",
    "Names and organisations are not shown in a dispute, to the Steward or to each other.",
    sideRow("sponsor", dp.aliases.sponsor) + sideRow("team", dp.aliases.team) + `<div class="lrow"><span class="tile t-soft">${ic("user", 16)}</span><div class="lt"><b>Independent Steward</b><p class="cap">${dp.steward ? nm(dp.steward) + (accepted ? " · confirmed independence " + fmtD(dp.accepted.at) : " · awaiting acceptance") : "Not assigned yet"}</p></div></div>`,
    "",
    "sp-dsp-parties",
  );
  // The alias ↔ party mapping is kept for administration and audit; an Organization Admin reveals it deliberately.
  const shown = role() === "A" && (UI.dspReveal || {})[dp.id];
  const mapping =
    role() === "A"
      ? card(
          "Alias mapping (restricted)",
          "For administration and audit only. Never shown to the Steward or to either side.",
          shown ? dl([[h(dp.aliases.sponsor), nm(p.sponsor) + ' <span class="cap">· ' + h((S.orgs.find((o) => o.id === P(p.sponsor).org) || {}).name || "") + "</span>"], [h(dp.aliases.team), spOwners(p).map(nm).join(", ") + ' <span class="cap">and the project team</span>']]) : '<p class="cap">Hidden. Revealing it is recorded in the audit log.</p>',
          shown ? "" : CB("Reveal", "spDspReveal", { id: dp.id }, "Reveal who is behind the two aliases of " + dp.ref + "? This is recorded in the audit log."),
        )
      : "";
  // the Steward confirms independence before any evidence is shown
  if (stew && dp.status === "Awaiting Steward acceptance")
    return {
      main: card(
        "Confirm your independence",
        "You see the evidence only after you confirm.",
        `<form data-f="spdsa" class="col fgap" novalidate><input type="hidden" name="id" value="${dp.id}">${fi("spdsa", "attest", "I am not affiliated with either side or their organisations, and I have no personal or financial interest in this project or its outcome", { type: "checkbox" })}${fi("spdsa", "why", "If you have a conflict, say what it is", { type: "textarea", rows: 2, max: 500, help: "Needed only if you decline. The Organization Admin assigns someone else." })}<div class="actions"><button class="btn btn-s" type="submit" name="v" value="decline">Decline: I have a conflict</button><button class="btn btn-p" type="submit" name="v" value="accept">Accept and review</button></div></form>`,
        "",
        "accent",
      ),
      rail: parties,
    };
  const canPost = dspOpen(dp) && (!!mineSide || (stew && accepted));
  const decide = stew && dp.status === "Under review";
  const kinds =
    dp.subject.kind === "ms"
      ? [
          ["accept", "Milestone accepted as complete: it is recorded as approved and its payment becomes Due"],
          ["more", "Further work required: the milestone returns to the team until the items below are delivered"],
        ]
      : [
          ["paid", "Payment made: recorded as Paid Offline at the amount below"],
          ["due", "Payment still owed: recorded as Due at the amount below"],
        ];
  const main =
    card(
      "The dispute",
      "Raised " + fmtD(dp.at) + " by " + h(dp.aliases[dp.side === "sponsor" ? "sponsor" : "team"]),
      dl([
        ["About", h(dspSubject(dp)) + (stew ? "" : " · “" + h(p.title) + "”")],
        ["What is disputed", spText(dp.reason)],
        ["Outcome sought", spText(dp.want)],
      ]),
    ) +
    (dp.decision
      ? card(
          "Decision",
          "Recorded " + fmtD(dp.decision.at) + " by the independent Steward",
          dl([
            ["Outcome", "<b>" + h((kinds.find(([v]) => v === dp.decision.v) || [, dp.decision.v])[1]) + "</b>" + (dp.decision.amount != null ? " · " + money(spCur(p), dp.decision.amount) : "")],
            ["Reasons", spText(dp.decision.reasons)],
            dp.decision.next && ["What happens next", spText(dp.decision.next)],
          ]),
          "",
          "accent",
        )
      : "") +
    dspPack(dp) +
    card(
      "Statements, evidence and questions",
      "Both sides and the Steward see everything here.",
      dspThread(dp) +
        (canPost
          ? `<form data-f="spds" class="col fgap" novalidate><input type="hidden" name="id" value="${dp.id}">${fi("spds", "t", stew ? "Question to both sides" : "Add a statement or evidence", { type: "textarea", rows: 3, req: true, max: 3000, help: "Shown under " + h(stew ? "Independent Steward" : dspAlias(dp, myId())) + ". Do not include names or organisations." })}<div class="field"><label class="lbl" for="spds_files">Files (optional)</label><input id="spds_files" class="input" type="file" name="files" multiple></div><div class="actions"><span></span><button class="btn btn-s btn-sm" type="submit">${ic("send", 14)}Post</button></div></form>`
          : ""),
    ) +
    (decide
      ? card(
          "Record your decision",
          "Base it on the agreed milestone, the acceptance criteria and the documented facts.",
          `<form data-f="spdd" class="col fgap" novalidate>${errSum("spdd")}<input type="hidden" name="id" value="${dp.id}"><fieldset class="np-fs col"><legend class="lbl">Decision <span class="req">*</span></legend>${kinds.map(([v, l]) => `<label class="choice"><input type="radio" name="v" value="${v}" ${fv("spdd", "v") === v ? "checked" : ""}><span class="rad" aria-hidden="true"></span><span>${h(l)}</span></label>`).join("")}${fe("spdd", "v") ? `<span class="emsg" role="alert">${ic("alert", 14)}${fe("spdd", "v")}</span>` : ""}</fieldset>${dp.subject.kind === "pay" ? fi("spdd", "amount", "Amount (" + h(spCur(p)) + ")", { type: "number", req: true, min: 0.01, step: "0.01" }) : ""}${fi("spdd", "reasons", "Reasons", { type: "textarea", rows: 4, req: true, max: 3000, help: "At least 40 characters. Both sides read this." })}${fi("spdd", "next", "What happens next", { type: "textarea", rows: 2, max: 1000, help: dp.subject.kind === "ms" ? "For further work, list exactly what must be delivered." : "Optional." })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Record decision</button></div></form>`,
          "",
          "accent",
        )
      : "");
  const rail =
    parties +
    mapping +
    (role() === "A" && dp.status === "Awaiting Steward assignment" ? card("Needs a Steward", "", '<p class="cap">Assign a Faculty/Steward with no tie to either side.</p>', B("Assign Steward", "spDspAssign", { id: dp.id }, "btn-p btn-sm")) : "") +
    (dp.raisedBy === myId() && dspOpen(dp) ? card("Withdraw", "", '<p class="cap">If you have settled it with the other side, withdraw the dispute.</p>', CB("Withdraw dispute", "spDspWithdraw", { id: dp.id }, "Withdraw dispute " + dp.ref + "? The milestone or payment returns to where it was.")) : "") +
    card("Record", "", `<ol class="mtl ws-tl">${dp.log.slice().reverse().map((l) => `<li class="done"><span class="mtl-dot">${ic("check", 12)}</span><div class="col"><b>${h(l.t)}</b><span class="cap">${fmtD(l.at)}</span></div></li>`).join("")}</ol>`);
  return { main, rail };
}
route("dispute", "any", () => {
  const dp = byId("disputes", UI.p.id);
  if (!dspSees(dp)) return head("Dispute", "") + card("", "", empty("shield", "This dispute is not available to you", "Disputes are visible to the two sides, the assigned Steward and Organization Admins in the same programme.", L("Back to My PHOENIX", "home", {}, "btn btn-s btn-sm")));
  const p = dspProj(dp);
  const x = dspRoom(dp);
  const side = dspMine(dp);
  const crumbs =
    side === "sponsor"
      ? [["My projects", "sponsorprojects"], [h(p.title), "sponsorproject", { id: p.id }], [h(x.name), "sproom", { id: x.id, tab: "dsp" }], [h(dp.ref)]]
      : side
        ? [[WL() + "s", "rooms"], [h(x.name), "room", { id: x.id, tab: "dsp" }], [h(dp.ref)]]
        : [[role() === "A" ? "Disputes" : "Dispute reviews", "disputes"], [h(dp.ref)]];
  const v = dspView(dp);
  return crumbsHtml(crumbs) + head("Dispute " + h(dp.ref), "About " + h(dspSubject(dp)) + " · raised " + fmtD(dp.at), pill(dp.status)) + hmCols(v.main, v.rail);
});
A.spDspReveal = (d) => {
  const dp = byId("disputes", d.id);
  UI.dspReveal = { ...(UI.dspReveal || {}), [dp.id]: true };
  audit("Dispute aliases revealed", dp.id, "Organization Admin");
  toast("Revealed. This is recorded in the audit log.");
  ok();
};
F.spdsa = (d) => {
  const dp = byId("disputes", d.id);
  if (d.v === "decline") {
    if (!validate("spdsa", d, { why: [["req", "Say what the conflict is."], ["min", 5]] })) return render();
    dp.declined.push({ pid: myId(), at: now(), why: d.why.trim() });
    Object.assign(dp, { steward: null, status: "Awaiting Steward assignment" });
    dp.log.push({ at: now(), t: "The assigned Steward declined with a conflict of interest" });
    dspAdmins(dp).forEach((a) => notify(a, "The Steward declined dispute " + dp.ref + " with a conflict. Assign someone else.", "dispute", { id: dp.id }));
    audit("Dispute Steward declined", dp.id, "conflict declared");
    clearF("spdsa");
    toast("Declined. The Organization Admin assigns someone else.");
    save();
    return go("disputes");
  }
  if (!validate("spdsa", d, { attest: [["req", "Confirm your independence to review this dispute."]] })) return render();
  Object.assign(dp, { status: "Under review", accepted: { at: now(), attest: true } });
  dp.log.push({ at: now(), t: "Steward confirmed independence and started the review" });
  spTell(dspProj(dp), dspRoom(dp), dspParties(dp), "The independent Steward started reviewing dispute " + dp.ref, "dsp", { d: dp.id });
  audit("Dispute Steward accepted", dp.id, "independence confirmed");
  clearF("spdsa");
  toast("Independence confirmed. The evidence is now visible to you.");
  ok();
};
F.spds = (d, form) => {
  if (!validate("spds", d, { t: ["req", ["min", 5]] })) return render();
  const files = spTakeFiles(form);
  if (!files) return render();
  const dp = byId("disputes", d.id);
  const stew = dp.steward === myId();
  dp.thread.push({ id: uid("dst"), by: myId(), at: now(), kind: stew ? "question" : "statement", t: d.t.trim(), files });
  const msg = (stew ? "The Steward asked a question on dispute " : "New statement on dispute ") + dp.ref;
  spTell(dspProj(dp), dspRoom(dp), dspParties(dp), msg, "dsp", { d: dp.id });
  if (dp.steward && dp.steward !== myId()) notify(dp.steward, msg, "dispute", { id: dp.id });
  audit("Dispute " + (stew ? "question" : "statement") + " posted", dp.id, files.length + " file(s)");
  clearF("spds");
  toast("Posted.");
  ok();
};
F.spdd = (d) => {
  const dp = byId("disputes", d.id);
  const pay = dp.subject.kind === "pay";
  if (
    !validate("spdd", d, {
      v: [["req", "Choose a decision."]],
      reasons: ["req", ["min", 40]],
      ...(pay ? { amount: ["req", "num"] } : {}),
      ...(!pay && d.v === "more" ? { next: [["req", "List what must be delivered."], ["min", 10]] } : {}),
    })
  )
    return render();
  const x = dspRoom(dp);
  const p = dspProj(dp);
  dp.decision = { v: d.v, reasons: d.reasons.trim(), next: (d.next || "").trim(), amount: pay ? +d.amount : null, at: now(), by: myId() };
  dp.status = "Decided";
  dp.log.push({ at: now(), t: "Decision recorded by the independent Steward" });
  // the decision takes effect on the milestone or the payment record
  if (pay) {
    const y = spPays(x).find((z) => z.id === dp.subject.id);
    y.amount = +d.amount;
    spPaySet(x, y, d.v === "paid" ? "Paid Offline" : "Due", "Steward decision " + dp.ref, { amount: +d.amount });
    delete y.prev;
  } else {
    const m = x.milestones.find((z) => z.id === dp.subject.id);
    const v = d.v === "accept" ? "Approved" : "More information requested";
    dspPaysOf(dp)
      .filter((y) => y.status === "Disputed")
      .forEach((y) => {
        spPaySet(x, y, y.prev && y.prev !== "Due" ? y.prev : "Pending", "Dispute " + dp.ref + " decided");
        delete y.prev;
      });
    spMsDecide({ r: x.id, m: m.id, note: d.reasons.trim() + (d.next ? "\n\n" + d.next.trim() : "") }, v, dp.ref);
    m.sp.notes.push({ id: uid("mn"), by: myId(), at: now(), kind: "steward", t: "Steward decision " + dp.ref + ": " + (v === "Approved" ? "accepted as complete." : "further work required. " + d.next.trim()) });
  }
  spTell(p, x, dspParties(dp), "Dispute " + dp.ref + " has been decided", "dsp", { d: dp.id });
  dspAdmins(dp).forEach((a) => notify(a, "Dispute " + dp.ref + " has been decided", "dispute", { id: dp.id }));
  audit("Dispute decided", dp.id, d.v);
  clearF("spdd");
  toast("Decision recorded. Both sides have been told.");
  ok();
};
A.spDspWithdraw = (d) => {
  const dp = byId("disputes", d.id);
  const x = dspRoom(dp);
  dp.status = "Withdrawn";
  dp.log.push({ at: now(), t: "Withdrawn by the side that raised it" });
  dspPaysOf(dp)
    .filter((y) => y.status === "Disputed")
    .forEach((y) => {
      spPaySet(x, y, y.prev || "Pending", "Dispute " + dp.ref + " withdrawn");
      delete y.prev;
    });
  spTell(dspProj(dp), x, dspParties(dp), "Dispute " + dp.ref + " was withdrawn", "dsp", { d: dp.id });
  [dp.steward, ...dspAdmins(dp)].filter((v) => v && v !== myId()).forEach((v) => notify(v, "Dispute " + dp.ref + " was withdrawn", "dispute", { id: dp.id }));
  sysMsg(x, "Dispute " + dp.ref + " withdrawn");
  audit("Dispute withdrawn", dp.id, "");
  toast("Dispute withdrawn.");
  ok();
};

// ---------- THE SPONSOR'S VIEW OF THE ACTION WORKSPACE: milestones, payments and disputes only ----------
route("sproom", "funding", () => {
  const x = byId("rooms", UI.p.id);
  const p = x && spOfRoom(x);
  if (!p || !spSponsor(p)) return spGone();
  const t = subnav(
    "spr_" + x.id,
    [
      ["ms", "Milestones", spMs(x).filter((m) => m.sp.sr === "Submitted" || (m.sp.sr === "Proposed" && !m.sp.ok.sponsor)).length || null],
      ["pay", "Payments", spPays(x).filter((y) => y.status === "Due").length || null],
      ["dsp", "Disputes", spDsps(x).filter(dspOpen).length || null],
    ],
    UI.p.tab,
    { label: WL() + " sections", icons: { ms: "flag", pay: "coin", dsp: "shield" } },
  );
  const body = t.cur === "pay" ? spPayTab(x, p) : t.cur === "dsp" ? spDspTab(x, p) : spMsList(x, p);
  return (
    crumbsHtml([["My projects", "sponsorprojects"], [h(p.title), "sponsorproject", { id: p.id }], [h(x.name)]]) +
    wsBar("rooms", x) +
    banner("info", "Your view of this " + WL(), "You see this project’s milestones, payment status and disputes. You are not a member: the team’s tasks, discussion, members and evidence stay with the team.", "lock") +
    withSubnav(t, body)
  );
});

// ---------- MIGRATION AND SEED ----------
// Earlier browser data held sponsor projects as Open Challenges (S.challenges). They become sponsor projects in
// S.projects: one record each, never a copy. Milestones move into the project's Action Workspace; mutually-confirmed
// payments become manual payment status records; disputes are re-pointed. The selection chat rooms are retired.
function spFromChallenges() {
  const PAY = (y, open) => (y.status === "Confirmed" ? "Paid Offline" : open ? "Disputed" : y.status === "Pending verification" ? "Due" : "On Hold");
  S.challenges.forEach((ch) => {
    let p = ch.project && byId("projects", ch.project);
    const brief = { problem: ch.problem, objectives: ch.objectives, outcomes: ch.outcomes, needs: ch.needs, budget: ch.budget || (ch.commit && ch.commit.amount) || null, currency: (ch.commit && ch.commit.currency) || ch.currency || "USD", closes: ch.closes };
    const SEL = { Shortlisted: "Shortlisted", Selected: "Shortlisted", "Not selected": "Not selected" };
    const shortlist = (ch.apps || []).filter((a) => a.status !== "Withdrawn").map((a) => ({ pid: a.pid, at: a.at, note: a.pitch || "", share: !!a.share, ...(SEL[a.status] ? { sel: SEL[a.status] } : {}), status: ch.team && ch.team.owner === a.pid ? "Owner" : "Shortlisted" }));
    if (!p) {
      p = { id: uid("pr"), ctx: ch.ctx, type: ch.type || "Project idea", title: ch.title, desc: ch.problem, tags: ch.skills || [], country: ch.country, area: ch.area || "", stage: null, owner: null, owners: [], stewards: [], sections: null, clar: [], thread: [], history: (ch.log || []).map((l) => ({ at: l.at, by: l.by, t: l.t })), at: ch.at, status: ch.status === "Archived" ? "Withdrawn" : ch.status === "Open" ? "Open" : "Listing closed" };
      S.projects.push(p);
    }
    Object.assign(p, { sponsor: ch.sponsor, alias: ch.alias, brief, shortlist, owners: ch.team ? [ch.team.owner] : p.owners || [] });
    if (ch.team) shortlist.filter((s) => s.sel === "Shortlisted").forEach((s) => (s.prole = s.pid === ch.team.owner ? "Project owner" : "Participant"));
    if (ch.team) p.team = shortlist.filter((s) => s.sel === "Shortlisted").map((s) => ({ pid: s.pid, role: s.prole }));
    const cr = ch.room && (S.chrooms || []).find((r) => r.id === ch.room);
    if (cr && !(S.spchats || []).some((c) => c.pr === p.id))
      (S.spchats = S.spchats || []).push({ id: cr.id, pr: p.id, ctx: cr.ctx, sponsor: ch.sponsor, alias: ch.alias, name: "Discussion · " + p.title, state: cr.state === "Active" ? "Active" : "Closed", at: (cr.chat[0] || {}).at || ch.at, closedAt: cr.closedAt, members: cr.members.filter((m) => m.pid !== ch.sponsor).map((m) => ({ pid: m.pid, status: m.status === "Active" ? "Active" : "Removed", at: ch.at })), msgs: cr.chat.map((m) => ({ id: m.id, sys: !!m.sys, by: m.by, at: m.at, t: m.t })) });
    delete p.challenge;
    if (!ch.team) return;
    let x = spRoom(p);
    if (!x && (ch.milestones.length || ch.payments.length)) {
      x = { id: uid("ar"), ctx: ch.ctx, name: p.title + " — delivery", purpose: ch.objectives, charter: ch.objectives, outcome: ch.outcomes, lead: ch.team.owner, origin: { type: "Project", id: p.id }, mandate: null, related: [p.id], state: "Active", flags: [], members: [{ pid: ch.team.owner, role: "Project owner", status: "Active" }, ...(ch.team.facilitator ? [{ pid: ch.team.facilitator, role: "Facilitator", status: "Active" }] : []), ...ch.team.members.filter((v) => v !== ch.team.owner).map((pid) => ({ pid, role: "Member", status: "Active" }))], chat: [], joinReqs: [], tasks: [], milestones: [], decisions: [], risks: [], deps: [], resources: [], wins: [], changes: [], returns: [], links: [], final: null, docs: [] };
      S.rooms.push(x);
      p.room = x.id;
      addLink("rooms", x.id, "projects", p.id, "originated-from", !p.circle);
    }
    if (!x) return;
    x.payments = x.payments || [];
    ch.milestones.forEach((m) => {
      if (x.milestones.some((y) => y.id === m.id)) return;
      x.milestones.push({ id: m.id, t: m.t, due: m.due || "", status: m.status === "Approved" ? "Achieved" : ["Submitted", "More information requested"].includes(m.status) ? "In progress" : "Not started", evs: [], sp: { n: m.n, deliv: m.deliv, outcome: m.outcome, criteria: m.criteria, amount: +m.amount || 0, sr: m.status, by: m.by, ok: m.ok || {}, agreedAt: m.agreedAt || null, approvedAt: m.approvedAt || null, subs: m.subs || [], notes: m.notes || [], versions: m.versions || [] } });
    });
    ch.payments.forEach((y) => {
      if (x.payments.some((z) => z.id === y.id) || y.status === "Not established") return;
      const open = (S.disputes || []).some((d) => d.ch === ch.id && d.subject.kind === "pay" && d.subject.id === y.id && dspOpen(d));
      const st = PAY(y, open);
      const sp = y.sp || y.ow || {};
      x.payments.push({ id: y.id, ref: y.ref, ms: y.ms, kind: y.kind, amount: +(y.final || sp.amount || 0), due: "", status: st, prev: open ? "Due" : undefined, paidOn: st === "Paid Offline" ? sp.date || "" : "", offRef: (y.sp && y.sp.ref) || "", note: sp.note || "", at: y.at, hist: [{ at: y.at, by: sp.by || ch.sponsor, from: null, to: st, amount: +(y.final || sp.amount || 0), note: "Carried over from the earlier mutual confirmation record (" + y.status + ")" }] });
    });
    spMs(x).forEach((m) => {
      if (!spMsPays(x, m).length) spPaySync(x, m);
    });
    (S.disputes || []).filter((d) => d.ch === ch.id).forEach((d) => Object.assign(d, { pr: p.id, room: x.id }));
  });
  delete S.challenges;
}
function spMigrate() {
  S.disputes = S.disputes || [];
  S.spchats = S.spchats || [];
  // Collaborators see the sponsor projects they shortlisted in Projects: the system role gains view access once.
  const rc = roleRec("C");
  if (rc && rc.system && rc.perms && normPerm(rc.perms.projects) === "-" && !S.spPermC) rc.perms.projects = "V";
  S.spPermC = true;
  if (S.challenges) {
    spFromChallenges();
    S.spSeeded = true;
  }
  delete S.chrooms;
  (S.disputes || []).forEach((d) => delete d.ch);
  // Browsers seeded twice hold two disputes per id; byId() then finds the wrong copy. Keep the first of each.
  const seen = new Set();
  S.disputes = S.disputes.filter((d) => !seen.has(d.id) && seen.add(d.id));
  if (S.spSeeded) return spdSeed();
  S.spSeeded = true;
  allLinks();
  const t = (d, h_ = "09:00") => d + "T" + h_;
  // 1 · listed, shortlisted by two Participants and a Collaborator; the sponsor has not chosen an owner yet
  S.projects.push({
    id: "prs1",
    ctx: "c1",
    sponsor: "p6",
    alias: "Sponsor · Cobalt Heron 27",
    type: "Project idea",
    title: "Rainwater harvesting for community gardens",
    desc: "Six community gardens in Wards 3 and 7 rely on mains water through the summer, which most volunteers pay for themselves. We want a low-cost rainwater harvesting kit that volunteers can install and maintain without specialist tools.",
    tags: ["Water", "Food resilience", "Community engagement"],
    country: "United States",
    area: "Wards 3 and 7",
    brief: {
      problem: "Six community gardens in Wards 3 and 7 rely on mains water through the summer, which most volunteers pay for themselves. We want a low-cost rainwater harvesting kit that volunteers can install and maintain without specialist tools.",
      objectives: "Design and test a rainwater kit on two gardens, then document it so the other four can install it themselves.",
      outcomes: "Two working installations, a measured reduction in mains water use, and an illustrated install guide.",
      needs: "Basic plumbing or construction skills, community engagement, and someone comfortable measuring water use over eight weeks.",
      budget: 8000,
      currency: "USD",
      closes: "2026-11-15",
    },
    status: "Open",
    stage: null,
    owner: null,
    owners: [],
    stewards: [],
    sections: null,
    clar: [],
    thread: [],
    at: t("2026-10-06"),
    shortlist: [
      { pid: "p9", at: t("2026-10-08", "10:15"), note: "I run the volunteer rota for the Ward 7 cooling survey and know most of the garden leads. I can organise installation days and keep the measurement log going every week.", status: "Shortlisted" },
      { pid: "p4", at: t("2026-10-09", "14:40"), note: "GreenGrid can model roof catchment and size the tanks for each garden, and lend two flow meters for the measurement period.", share: true, sel: "Shortlisted", status: "Shortlisted" },
      { pid: "p10", at: t("2026-10-11", "18:05"), note: "I grew up with rainwater tanks and can teach volunteers to clean and maintain them. I would like to write the install guide.", status: "Shortlisted" },
    ],
    history: [
      { at: t("2026-10-06"), by: "p6", t: "Listed on the Explore board as Sponsor · Cobalt Heron 27" },
      { at: t("2026-10-08", "10:15"), by: "p9", t: "Daniel Kim applied (expressed interest)" },
      { at: t("2026-10-09", "14:40"), by: "p4", t: "Leah Park applied (expressed interest)" },
      { at: t("2026-10-11", "18:05"), by: "p10", t: "Ana Lopez applied (expressed interest)" },
    ],
  });
  // 2 · owner chosen, started in a Circle, delivery in an Action Workspace with four sponsor milestones
  S.projects.push({
    id: "prc2",
    ctx: "c1",
    sponsor: "p6",
    alias: "Sponsor · Saffron Kestrel 64",
    owner: "p1",
    owners: ["p1"],
    status: "Accepted",
    stage: "Circle",
    stewards: ["p2"],
    clar: [],
    thread: [],
    sections: null,
    type: "Opportunity",
    title: "Low-cost shade for Ward 4 market stalls",
    desc: "Stallholders at the Ward 4 market have no shade in the afternoon. Heat drives customers away and spoils produce. Existing gazebos are too expensive and too heavy for one person.",
    tags: ["Urban heat", "Livelihoods"],
    country: "United States",
    area: "Ward 4 market",
    brief: {
      problem: "Stallholders at the Ward 4 market have no shade in the afternoon. Heat drives customers away and spoils produce. Existing gazebos are too expensive and too heavy for one person.",
      objectives: "Design a shade one stallholder can put up in five minutes, test it on five stalls, then roll it out with a maintenance guide.",
      outcomes: "Shades on at least 20 stalls, measured temperature reduction under the shade, and stallholders able to maintain them.",
      needs: "Design and making skills, a survey of the stalls, and time with stallholders on market days.",
      budget: 12000,
      currency: "USD",
      closes: "2026-09-10",
    },
    shortlist: [
      { pid: "p1", at: t("2026-08-27"), note: "I lead the Ward 7 cooling map and already measure street temperatures. I can run the stall survey and coordinate the testing with stallholders.", status: "Owner" },
      { pid: "p9", at: t("2026-08-28"), note: "I can build prototypes and run Saturday installs.", status: "Shortlisted" },
      { pid: "p10", at: t("2026-08-30"), note: "I can write the maintenance guide and translate it for stallholders.", status: "Shortlisted" },
    ],
    supportPath: "Start in a Circle",
    submitted: "2026-09-12",
    circle: "cic2",
    room: "arc2",
    at: t("2026-08-25"),
    moves: [{ at: t("2026-09-12", "10:00"), by: "p6", byLabel: "Sponsor · Saffron Kestrel 64", from: null, to: "Circle", space: "cic2", why: "Starting space chosen by the sponsor" }],
    history: [
      { at: t("2026-08-25"), by: "p6", t: "Listed on the Explore board as Sponsor · Saffron Kestrel 64" },
      { at: t("2026-09-12", "10:00"), by: "p6", t: "Main owner chosen by Sponsor · Saffron Kestrel 64: Mary Ellis. Starts: Circle" },
      { at: t("2026-09-12", "10:00"), t: "Started in Circle “Low-cost shade for Ward 4 market stalls Circle”" },
      { at: t("2026-09-14"), t: "Linked the Action Workspace “Ward 4 market shades — delivery”" },
    ],
  });
  S.circles.push({
    id: "cic2",
    ctx: "c1",
    name: "Low-cost shade for Ward 4 market stalls Circle",
    purpose: "Agree scope and plan for “Low-cost shade for Ward 4 market stalls”, a sponsor project.",
    outcome: "Shades tested with stallholders and a rollout plan they agree.",
    owner: "p1",
    facilitator: "p2",
    project: "prc2",
    origin: { type: "Project", id: "prc2" },
    visibility: "Members only",
    docs: [],
    state: "Active",
    agreement: "Circle working agreement v1",
    members: [
      { pid: "p1", role: "Project owner", status: "Active" },
      { pid: "p2", role: "Facilitator", status: "Active" },
      { pid: "p9", role: "Member", status: "Active" },
      { pid: "p10", role: "Member", status: "Active" },
    ],
    chat: [
      { id: "mc201", sys: true, at: t("2026-09-12", "10:00"), t: "Circle formed for the sponsor project “Low-cost shade for Ward 4 market stalls”. Sponsor: Sponsor · Saffron Kestrel 64." },
      { id: "mc202", by: "p1", at: t("2026-09-13", "09:30"), t: "Welcome all. First job: the stall survey. Daniel, can you take the north row?" },
      { id: "mc203", by: "p9", at: t("2026-09-13", "09:41"), t: "Yes, Saturday morning works." },
    ],
    sessions: [],
    reflections: [],
    commitments: [],
    concerns: [],
    decisions: [{ t: "Prototype with canvas and aluminium poles", at: "2026-09-26", by: "Circle vote — 3 of 3 eligible voted “Approve” (100%) · threshold 60% · quorum 50% met" }],
    polls: [],
    pause: null,
    createdBy: "p1",
  });
  const M = (id, n, t_, deliv, outcome, criteria, due, amount, sr, status, extra = {}) => ({
    id,
    t: t_,
    due,
    status,
    evs: [],
    sp: { n, deliv, outcome, criteria, amount, sr, by: "p6", ok: { sponsor: t("2026-09-15"), owner: t("2026-09-16") }, agreedAt: t("2026-09-16"), approvedAt: null, notes: [], subs: [], versions: [], ...extra },
  });
  const H = (at, by, from, to, amount, note, ref) => ({ at, by, from, to, amount, note, ref });
  S.rooms.push({
    id: "arc2",
    ctx: "c1",
    name: "Ward 4 market shades — delivery",
    purpose: "Design, test and roll out low-cost market stall shades with stallholders.",
    charter: "Design a shade one stallholder can put up in five minutes, test it on five stalls, then roll it out with a maintenance guide.",
    outcome: "Shades on at least 20 stalls, measured temperature reduction under the shade, and stallholders able to maintain them.",
    lead: "p1",
    origin: { type: "Project", id: "prc2" },
    mandate: null,
    related: ["prc2"],
    state: "Active",
    flags: [],
    members: [
      { pid: "p1", role: "Project owner", status: "Active" },
      { pid: "p2", role: "Facilitator", status: "Active" },
      { pid: "p9", role: "Member", status: "Active" },
      { pid: "p10", role: "Member", status: "Active" },
    ],
    chat: [{ id: "mc401", sys: true, at: t("2026-09-14"), t: "Action Workspace linked to the sponsor project. Sponsor milestones are agreed here with Sponsor · Saffron Kestrel 64." }],
    joinReqs: [],
    tasks: [
      { id: "tk401", key: "SHD-1", t: "Survey north row stalls", owner: "p9", due: "2026-09-27", status: "Done", by: "p1", prio: "High", desc: "", partners: [], evidence: [], ms: "chm1", log: [{ at: t("2026-09-16"), by: "p1", t: "Created" }], acc: "Accepted" },
      { id: "tk402", key: "SHD-2", t: "Timed setup test with each prototype stallholder", owner: "p9", due: "2026-10-31", status: "In progress", by: "p1", prio: "High", desc: "Record each stallholder’s setup time on a market day.", partners: [], evidence: [], ms: "chm2", log: [{ at: t("2026-10-19"), by: "p1", t: "Created" }], acc: "Accepted" },
      { id: "tk403", key: "SHD-3", t: "Draft the maintenance guide (English and Spanish)", owner: "p10", due: "2026-11-28", status: "To do", by: "p1", prio: "Medium", desc: "", partners: [], evidence: [], ms: "chm4", opt: true, log: [{ at: t("2026-10-21"), by: "p1", t: "Created" }], acc: "Pending" },
    ],
    milestones: [
      M("chm1", 1, "Stall survey and design brief", "Survey of all 34 stalls (size, orientation, afternoon sun) and a one-page design brief agreed with stallholders.", "A shared understanding of what the shade must do.", "All 34 stalls surveyed; brief signed off by at least 5 stallholders.", "2026-09-30", 3000, "Approved", "Achieved", {
        approvedAt: t("2026-10-02"),
        subs: [{ id: "msb1", at: t("2026-09-29"), by: "p1", note: "Surveyed all 34 stalls over two Saturdays. Brief agreed with 7 stallholders at the market meeting.", files: [{ n: "stall-survey-34.xlsx", mb: 0.4 }, { n: "design-brief-v2.pdf", mb: 1.1 }], evs: [], decision: { v: "Approved", by: "p6", at: t("2026-10-02"), note: "Clear and complete. Thank you." } }],
      }),
      M("chm2", 2, "Prototype shades on five stalls", "Five prototype shades installed and used for four market days, with temperature readings under and outside each shade.", "Evidence that the design works and stallholders can handle it alone.", "Five shades in use for four market days; temperature readings for each day; each stallholder can put up their shade alone in under five minutes.", "2026-10-30", 3000, "More information requested", "In progress", {
        subs: [{ id: "msb2", at: t("2026-10-14"), by: "p1", note: "Five shades installed on stalls 3, 8, 12, 19 and 27 and used on four market days. Average 6 °C cooler under the shade. All five stallholders put them up alone.", files: [{ n: "temperature-log-oct.csv", mb: 0.2 }, { n: "prototype-photos.zip", mb: 18.5 }], evs: [], decision: { v: "More information requested", by: "p6", at: t("2026-10-16"), note: "Please add a timed record of each stallholder putting up their shade. The criteria say under five minutes; the photos do not show that." } }],
        notes: [
          { id: "mn1", by: "p1", at: t("2026-10-17"), kind: "comment", t: "We timed it on the day but did not write the times down per stallholder. Re-running a timed test would cost another market day and the stallholders’ goodwill. The photos are taken at the start and end of setup." },
          { id: "mn2", by: "p6", at: t("2026-10-18"), kind: "comment", t: "I understand, but the criterion is explicit. Without a record I cannot approve this milestone." },
        ],
      }),
      M("chm3", 3, "Community workshop on shade care", "A workshop for stallholders on putting up, storing and repairing the shades, with an attendance sheet.", "Stallholders confident to look after their shades.", "Workshop held with at least 12 stallholders; attendance sheet and short feedback form.", "2026-10-18", 2000, "Submitted", "In progress", {
        subs: [{ id: "msb3", at: t("2026-10-19"), by: "p1", note: "Workshop held on 18 October with 15 stallholders. Attendance sheet and 14 feedback forms attached; 13 said they could repair a torn panel.", files: [{ n: "workshop-attendance.pdf", mb: 0.3 }, { n: "feedback-summary.pdf", mb: 0.5 }], evs: [], decision: null }],
      }),
      M("chm4", 4, "Rollout to 20 stalls and maintenance guide", "Shades installed on 20 more stalls and an illustrated maintenance guide in English and Spanish.", "Shade across most of the market, kept in good repair by stallholders.", "At least 20 more stalls with shades in use; guide printed and shared with every stallholder.", "2026-12-05", 2000, "Proposed", "Not started", { ok: { sponsor: t("2026-10-20"), owner: null }, agreedAt: null }),
    ],
    payments: [
      { id: "cpy1", ref: "PAY-001", ms: null, kind: "Advance", amount: 2000, due: "2026-09-16", status: "Paid Offline", paidOn: "2026-09-16", offRef: "HWF-TRF-0916", note: "Advance for materials", at: t("2026-09-14"), hist: [H(t("2026-09-14"), "p6", null, "Due", 2000, "Advance for materials, agreed with the owner"), H(t("2026-09-17"), "p1", "Due", "Paid Offline", undefined, "Received in the project account", "HWF-TRF-0916")] },
      { id: "cpy2", ref: "PAY-002", ms: "chm1", kind: "Milestone payment", amount: 3000, due: "2026-10-12", status: "Disputed", prev: "Due", paidOn: "", offRef: "HWF-TRF-1006", note: "", at: t("2026-09-16"), hist: [H(t("2026-09-16"), "p1", null, "Pending", 3000, "Created automatically when milestone 1 was agreed"), H(t("2026-10-02"), "p6", "Pending", "Due", undefined, "Automatic: milestone 1 approved"), H(t("2026-10-10"), "p1", "Due", "Disputed", undefined, "Automatic: dispute DSP-0001 raised")] },
      { id: "cpy3", ref: "PAY-003", ms: "chm2", kind: "Milestone payment", amount: 3000, due: "", status: "Pending", paidOn: "", offRef: "", note: "", at: t("2026-09-16"), hist: [H(t("2026-09-16"), "p1", null, "Pending", 3000, "Created automatically when milestone 2 was agreed")] },
      { id: "cpy4", ref: "PAY-004", ms: "chm3", kind: "Milestone payment", amount: 2000, due: "", status: "Pending", paidOn: "", offRef: "", note: "", at: t("2026-09-16"), hist: [H(t("2026-09-16"), "p1", null, "Pending", 2000, "Created automatically when milestone 3 was agreed")] },
    ],
    decisions: [],
    risks: [],
    deps: [],
    resources: [],
    wins: [],
    changes: [],
    returns: [],
    links: [],
    final: null,
    docs: [],
  });
  const L_ = (st, sid, type, primary) => S.links.push({ id: "olc" + sid, source_type: st, source_id: sid, target_type: "projects", target_id: "prc2", link_type: type, context_id: "c1", created_by: "p1", created_at: t("2026-09-12", "10:00"), primary });
  L_("circles", "cic2", "originated-from", true);
  L_("rooms", "arc2", "originated-from", false);
  // a disputed payment already with an independent Steward (Kofi Mensah has no tie to either side), and a milestone
  // dispute waiting for the Organization Admin to assign one
  const seedDsp = [
    {
      id: "dsp1",
      ref: "DSP-0001",
      pr: "prc2",
      room: "arc2",
      ctx: "c1",
      subject: { kind: "pay", id: "cpy2" },
      raisedBy: "p1",
      side: "owner",
      at: t("2026-10-10"),
      reason: "The sponsor recorded USD 3,000 for milestone 1 but USD 2,700 arrived in the project account. We cannot record a payment as made when we did not fully receive it.",
      want: "Record USD 2,700 as paid and the remaining USD 300 as still owed.",
      aliases: { sponsor: "Sponsor side · Linden Otter 38", team: "Team side · Quartz Wren 52" },
      status: "Awaiting Steward acceptance",
      steward: "p13",
      assignedBy: "p7",
      assignedAt: t("2026-10-12"),
      declined: [],
      decision: null,
      thread: [
        { id: "dm1", by: "p1", at: t("2026-10-10"), kind: "statement", t: "The sponsor recorded USD 3,000 for milestone 1 but USD 2,700 arrived in the project account. We cannot record a payment as made when we did not fully receive it.\n\nOutcome sought: Record USD 2,700 as paid and the remaining USD 300 as still owed.", files: [{ n: "bank-statement-oct.pdf", mb: 0.2 }] },
        { id: "dm2", by: "p6", at: t("2026-10-11"), kind: "statement", t: "We sent USD 3,000; the remittance advice is attached. Any fee was charged by the receiving bank.", files: [{ n: "remittance-1006.pdf", mb: 0.1 }] },
      ],
      log: [
        { at: t("2026-10-10"), t: "Raised by the team side (Team side · Quartz Wren 52)" },
        { at: t("2026-10-12"), t: "Steward assigned by the Organization Admin" },
      ],
    },
    {
      id: "dsp2",
      ref: "DSP-0002",
      pr: "prc2",
      room: "arc2",
      ctx: "c1",
      subject: { kind: "ms", id: "chm2" },
      raisedBy: "p1",
      side: "owner",
      at: t("2026-10-19"),
      reason: "All five stallholders put up their shades alone, and the start and end photos show it took under five minutes. Re-running a timed test would cost another market day. We believe the acceptance criteria are met.",
      want: "Accept milestone 2 as complete.",
      aliases: { sponsor: "Sponsor side · Russet Beacon 19", team: "Team side · Meadow Fern 71" },
      status: "Awaiting Steward assignment",
      steward: null,
      declined: [],
      decision: null,
      thread: [{ id: "dm3", by: "p1", at: t("2026-10-19"), kind: "statement", t: "All five stallholders put up their shades alone, and the start and end photos show it took under five minutes. Re-running a timed test would cost another market day. We believe the acceptance criteria are met.\n\nOutcome sought: Accept milestone 2 as complete.", files: [] }],
      log: [{ at: t("2026-10-19"), t: "Raised by the team side (Team side · Meadow Fern 71)" }],
    },
  ];
  S.disputes.push(...seedDsp.filter((o) => !byId("disputes", o.id)));
  // milestone 2's payment shows as Disputed while DSP-0002 is open
  const y3 = S.rooms.find((x) => x.id === "arc2").payments.find((y) => y.id === "cpy3");
  y3.prev = "Pending";
  y3.status = "Disputed";
  y3.hist.push(H(t("2026-10-19"), "p1", "Pending", "Disputed", undefined, "Automatic: dispute DSP-0002 raised"));
  spdSeed();
}
// Detail for the Sponsor's project page on the seeded funded project, added once (also to browsers seeded earlier):
// what each applicant wrote about availability and experience, the sponsor's private fit ratings, the closed chat room
// with the shortlist, and each side's own record of the two payments made so far.
function spdSeed() {
  if (S.spdSeeded) return;
  S.spdSeeded = true;
  const p = byId("projects", "prc2");
  const x = byId("rooms", "arc2");
  if (!p || !x || p.sponsor !== "p6") return;
  const t = (d, h_ = "09:00") => d + "T" + h_;
  const APP = {
    p1: { avail: "1–2 days a week", exp: "Leads the Ward 7 cooling map; measures street temperatures with a borrowed sensor kit.", fit: 5, share: true, shortAt: t("2026-09-05") },
    p9: { avail: "1–2 days a week", exp: "Builds and repairs market stall frames; ran Saturday installs for the Ward 7 survey.", fit: 4, share: true, shortAt: t("2026-09-05") },
    p10: { avail: "A few hours a week", exp: "Ward newsletter writing.", fit: 4, shortAt: t("2026-09-05") },
  };
  (p.shortlist || []).forEach((s) => APP[s.pid] && s.fit == null && Object.assign(s, APP[s.pid]));
  S.spchats = S.spchats || [];
  if (!S.spchats.some((c) => c.pr === p.id)) {
    S.spchats.push({
      id: "spc2",
      pr: p.id,
      ctx: p.ctx,
      sponsor: p.sponsor,
      alias: p.alias,
      name: "Discussion · " + p.title,
      state: "Closed",
      at: t("2026-09-05"),
      closedAt: t("2026-09-12", "10:05"),
      members: ["p1", "p9", "p10"].map((pid) => ({ pid, status: "Active", at: t("2026-09-05") })),
      msgs: [
        { id: "spm201", sys: true, at: t("2026-09-05"), t: "Chat room for the open challenge “" + p.title + "”. Only the sponsor and shortlisted applicants take part. The sponsor appears as " + p.alias + "." },
        { id: "spm202", by: "p1", at: t("2026-09-05", "11:00"), t: "Would you fund an advance for materials, or is everything paid per milestone?", q: true, ans: true },
        { id: "spm203", by: p.sponsor, at: t("2026-09-05", "15:20"), t: "An advance of USD 2,000 for materials is fine, the rest per approved milestone.", reply: "spm202" },
        { id: "spm204", sys: true, at: t("2026-09-12", "10:00"), t: "The team has been formed. Project work continues in the team’s own Circle." },
        { id: "spm205", sys: true, at: t("2026-09-12", "10:05"), t: "Selection is complete. This chat room is closed for further discussion. It stays readable for the people who took part, under the programme’s data-retention rules." },
      ],
    });
    S.chatRead = S.chatRead || {};
    (S.chatRead.p1 = S.chatRead.p1 || {}).spc2 = t("2026-09-12", "10:05");
  }
  const y1 = spPays(x).find((y) => y.id === "cpy1");
  const y2 = spPays(x).find((y) => y.id === "cpy2");
  if (y1 && !y1.sp) y1.sp = { amount: 2000, date: "2026-09-16", ref: "HWF-TRF-0916", files: [], by: p.sponsor, at: t("2026-09-16") };
  if (y2 && !y2.sp) y2.sp = { amount: 3000, date: "2026-10-06", ref: "HWF-TRF-1006", files: [{ n: "remittance-1006.pdf", mb: 0.1 }], by: p.sponsor, at: t("2026-10-06") };
  if (y2 && !y2.ow) y2.ow = { amount: 2700, date: "2026-10-08", ref: "", files: [{ n: "bank-statement-oct.pdf", mb: 0.2 }], by: "p1", at: t("2026-10-08") };
}
