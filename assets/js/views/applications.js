// ---------- SPONSOR APPLICATIONS: interested users → shortlist → project roles → discussion → finalize the team ----------
// The Sponsor's own workflow for one listed project, before its team exists. People who pressed "I'm interested"
// (p.shortlist, sponsor.js) arrive here as Interested. The Sponsor shortlists or declines each one, gives every
// shortlisted person a project role, talks with them in a project discussion, then finalizes the team: applications
// close, the project leaves the Explore board, the discussion becomes read-only and the Project-owner role holders
// become the project's owners (the existing Project module flow continues from there).
// The project discussion (S.spchats) is its own small store and view. It is not a Circle, Rope Team or Action
// Workspace chat and is not listed in Messages. Project roles are team-formation labels: they grant no platform
// permissions; authority still comes from each person's role in the programme.
const SPA_ROLES = ["Project owner", "Participant", "Steward", "Mentor", "Collaborator"];
const SPA_PILL = { Interested: "p-grey", Shortlisted: "p-teal", "Not selected": "p-grey" };
const spaRoles = (p) => [...SPA_ROLES, ...(p.spRoles || [])];
const spaSel = (s) => s.sel || "Interested";
const spaPill = (s) => pill(spaSel(s), SPA_PILL[spaSel(s)]);
const spaShort = (p) => spShortlist(p).filter((s) => s.sel === "Shortlisted");
const spaNew = (p) => spShortlist(p).filter((s) => !s.sel);
// The Sponsor decides while the project is still a listing (open or closed to new applications, not withdrawn).
const spaOpen = (p) => spSponsor(p) && spListing(p) && p.status !== "Withdrawn";
const spaChat = (p) => (S.spchats || []).find((c) => c.pr === p.id) || null;
const spaMember = (c, pid = myId()) => !!c && c.members.some((m) => m.pid === pid && m.status === "Active");
const spaSees = (c) => !!c && inCtx(c) && ((role() === "S" && c.sponsor === myId()) || spaMember(c));
const spaOwnerOk = (p, pid) => roleBase(ctxRole(pid, p.ctx) || "") === "P";
const spaRoleNm = (p, pid) => roleName(ctxRole(pid, p.ctx), p.ctx) || "";
// Who a message is from: the Sponsor under the project's alias (to everyone but themselves), members by name.
const spaWho = (c, pid) => (pid === c.sponsor ? (pid === myId() ? "You (as " + h(c.alias) + ")" : h(c.alias)) + ' <span class="cap">(sponsor)</span>' : nm(pid));
function spaChatClose(p, why) {
  const c = spaChat(p);
  if (!c || c.state !== "Active") return;
  c.state = "Closed";
  c.closedAt = now();
  c.msgs.push({ id: uid("spm"), sys: true, at: now(), t: why + " This discussion is now closed. It stays readable for the people who took part." });
}

// ---- the applicant's view of their own application (listing page and project card, sponsor.js)
function spaMine(p) {
  const s = spShort(p);
  if (!s) return "";
  const c = spaChat(p);
  // "Not selected" is shown only once the team is final; until then the sponsor may still change their mind.
  const st = s.sel === "Shortlisted" ? (spListing(p) ? "Shortlisted by the sponsor" : "Selected for the team") : s.sel === "Not selected" && !spListing(p) ? "Not selected" : "Waiting for the sponsor’s review";
  return dl([["Status", pill(st, s.sel === "Shortlisted" ? "p-teal" : "p-grey")], s.prole && s.sel === "Shortlisted" && ["Project role", h(s.prole)], spaMember(c) && ["Project discussion", L(c.state === "Active" ? "Open the discussion" : "Read the discussion (closed)", "spchat", { id: c.id })]]);
}

// ---------- ALL APPLICATIONS: every interested user across the Sponsor's projects ----------
route("sponsorapps", "funding", () => {
  if (role() !== "S") return spNotS();
  return UI.p.id ? spaProject(byId("projects", UI.p.id)) : spaAll();
});
function spaAll() {
  const mine = S.projects.filter((p) => isSpP(p) && inCtx(p) && p.sponsor === myId());
  const rows = mine.flatMap((p) => spShortlist(p).map((s) => ({ p, s, id: p.id + ":" + s.pid })));
  const n = (v) => rows.filter((r) => spaSel(r.s) === v).length;
  return (
    head("Applications", "Everyone who expressed interest in your projects. Open a project to shortlist people, give them project roles, talk with them and finalize the team.") +
    hmStrip([hmFig("t-soft", "inbox", n("Interested"), "Interested", "Waiting for your review"), hmFig("t-teal", "check", n("Shortlisted"), "Shortlisted", ""), hmFig("t-soft", "x", n("Not selected"), "Not selected", ""), hmFig("t-purple", "megaphone", mine.filter((p) => spListing(p) && p.status !== "Withdrawn").length, "Projects taking applications", "")], "Applications summary") +
    card(
      "All applications",
      "",
      dataView("spa:all", {
        label: "applications",
        items: rows,
        search: (r) => [P(r.s.pid).name, r.p.title, spOrgOf(r.s.pid), r.s.note, r.s.prole].join(" "),
        quick: { label: "Status", options: ["Interested", "Shortlisted", "Not selected"].map((v) => [v, v]), test: (r, v) => spaSel(r.s) === v },
        filters: [{ key: "project", label: "Project", options: mine.filter((p) => spShortlist(p).length).map((p) => [p.id, p.title]), test: (r, v) => r.p.id === v }],
        sorts: [
          ["at", "Newest", (a, b) => String(b.s.at).localeCompare(String(a.s.at))],
          ["name", "Name", (a, b) => P(a.s.pid).name.localeCompare(P(b.s.pid).name)],
        ],
        row: (r) => ({
          lead: `<span class="av">${ini(r.s.pid)}</span>`,
          title: nm(r.s.pid) + ' <span class="cap">' + h(spaRoleNm(r.p, r.s.pid)) + "</span>",
          sub: L(h(r.p.title), "sponsorapps", { id: r.p.id }),
          meta: [h(spOrgOf(r.s.pid) || ""), "Applied " + fmtD(r.s.at), r.s.prole ? "Role <b>" + h(r.s.prole) + "</b>" : ""],
          badges: spaPill(r.s),
          primary: L("Open", "sponsorapps", { id: r.p.id }, "btn btn-s btn-sm"),
        }),
        empty: ["inbox", "No applications yet", "People apply from the Explore board with “View and Apply”.", L("My projects", "sponsorprojects", {}, "btn btn-s btn-sm")],
      }),
    )
  );
}

// ---------- ONE PROJECT: review, shortlist, roles, discussion, finalize ----------
function spaProject(p) {
  if (!p || !spSponsor(p)) return spGone();
  const apps = spShortlist(p);
  const sl = spaShort(p);
  const open = spaOpen(p);
  const c = spaChat(p);
  const noRole = sl.filter((s) => !s.prole);
  const owners = sl.filter((s) => s.prole === "Project owner");
  const steps = [
    [apps.length > 0, "Review interested users"],
    [sl.length > 0, "Shortlist"],
    [sl.length > 0 && !noRole.length, "Assign project roles"],
    [!!c, "Discuss the project"],
    [!!p.finalAt || !spListing(p), "Finalize the team"],
  ];
  const acts = (s) => {
    if (!open) return B("View", "spApp", { id: p.id, pid: s.pid });
    const v = spaSel(s);
    return (
      B("View", "spApp", { id: p.id, pid: s.pid }) +
      (v !== "Shortlisted" ? B(ic("check", 14) + "Shortlist", "spaSel", { id: p.id, pid: s.pid, v: "Shortlisted" }, "btn-p btn-sm") : B(ic("users", 14) + (s.prole ? "Change role" : "Assign role"), "spaRole", { id: p.id, pid: s.pid }, s.prole ? "btn-s btn-sm" : "btn-p btn-sm")) +
      (v === "Interested" ? B("Not selected", "spaSel", { id: p.id, pid: s.pid, v: "Not selected" }) : B("Back to interested", "spaSel", { id: p.id, pid: s.pid, v: "Interested" }))
    );
  };
  const list = dataView("spa:" + p.id, {
    label: "interested users",
    items: apps,
    search: (s) => [P(s.pid).name, spOrgOf(s.pid), s.note, s.prole].join(" "),
    quick: { label: "Status", options: ["Interested", "Shortlisted", "Not selected"].map((v) => [v, v]), test: (s, v) => spaSel(s) === v },
    sorts: [
      ["at", "Applied", (a, b) => String(a.at).localeCompare(String(b.at))],
      ["name", "Name", (a, b) => P(a.pid).name.localeCompare(P(b.pid).name)],
    ],
    row: (s) => ({
      lead: `<span class="av">${ini(s.pid)}</span>`,
      title: nm(s.pid) + ' <span class="cap">' + h(spaRoleNm(p, s.pid)) + (spOrgOf(s.pid) ? " · " + h(spOrgOf(s.pid)) : "") + "</span>",
      sub: s.note ? h(spClip(s.note, 160)) : '<span class="cap">No note</span>',
      meta: ["Applied " + fmtD(s.at), s.share ? "Profile summary shared" : "No profile shared", s.prole ? "Project role <b>" + h(s.prole) + "</b>" : ""],
      badges: spaPill(s),
      primary: `<span class="row wrap sp-acts">${acts(s)}</span>`,
    }),
    empty: ["inbox", "Nobody has applied yet", "People apply from the Explore board with “View and Apply”.", ""],
  });
  const disc = card(
    "Project discussion",
    "For preliminary talks with shortlisted people before the team is final. Separate from Circle, Rope Team and " + WL() + " chats.",
    c
      ? dl([
          ["Status", pill(c.state === "Active" ? "Active" : "Closed")],
          ["Members", c.members.filter((m) => m.status === "Active").length + " shortlisted · you, as " + h(p.alias)],
          ["Messages", String(c.msgs.filter((m) => !m.sys).length)],
        ])
      : `<p class="cap">${sl.length ? "Open a discussion with the " + sl.length + " shortlisted " + (sl.length === 1 ? "person" : "people") + ". People you shortlist later join it automatically." : "Shortlist at least one person to open a discussion."}</p>`,
    c ? L(ic("message", 14) + "Open discussion", "spchat", { id: c.id }, "btn btn-p btn-sm") : open && sl.length ? B(ic("plus", 14) + "Create discussion", "spaChatNew", { id: p.id }, "btn-p btn-sm") : "",
  );
  const team = card(
    p.finalAt ? "Final team" : "Team so far",
    p.finalAt ? "Finalized " + fmtD(p.finalAt) : "Every shortlisted person needs a project role. At least one Participant must be a Project owner.",
    sl.length ? `<ul class="sp-team">${sl.map((s) => `<li><span class="av sm">${ini(s.pid)}</span><span class="sp-team-n">${nm(s.pid)}</span>${s.prole ? pill(s.prole, s.prole === "Project owner" ? "p-green" : "p-navy") : '<span class="cap">No role yet</span>'}</li>`).join("")}</ul>` : '<p class="cap">Nobody shortlisted yet.</p>',
    open && sl.length ? B(ic("check", 14) + "Finalize team", "spaFinal", { id: p.id }, noRole.length || !owners.length ? "btn-s btn-sm" : "btn-p btn-sm") : "",
  );
  return (
    crumbsHtml([["Applications", "sponsorapps"], [h(p.title)]]) +
    head(h(p.title), "Applications · shown to applicants as " + `<span class="sp-alias">${ic("shield", 12)}${h(p.alias)}</span>`, pill(spLabel(p)) + L("Project", "sponsorproject", { id: p.id }, "btn btn-s btn-sm")) +
    `<ol class="sp-steps">${steps.map(([d_, t_], i) => `<li class="${d_ ? "ok" : ""}"><span class="n">${d_ ? ic("check", 12) : i + 1}</span>${t_}</li>`).join("")}</ol>` +
    (!spListing(p) || p.status === "Withdrawn" ? banner("info", p.status === "Withdrawn" ? "Withdrawn" : "Team finalized", p.status === "Withdrawn" ? "This project was withdrawn. Applications are read-only." : "Applications are closed and the project has left the Explore board. The project now continues in the Project module with its owner(s).") : "") +
    hmStrip([hmFig("t-soft", "inbox", spaNew(p).length, "Interested", "Waiting for your review"), hmFig("t-teal", "check", sl.length, "Shortlisted", noRole.length ? noRole.length + " without a role" : "All have a role"), hmFig("t-soft", "x", apps.filter((s) => s.sel === "Not selected").length, "Not selected", "")], "Applications summary") +
    `<div class="sp-body">${hmCols(card("Interested users", "Everyone who pressed “I’m interested” for this project.", list), disc + team)}</div>`
  );
}
A.spaSel = (d) => {
  const p = byId("projects", d.id);
  const s = spShortlist(p).find((x) => x.pid === d.pid);
  const was = spaSel(s);
  if (d.v === "Interested") delete s.sel;
  else s.sel = d.v;
  // when, for the application's activity on the Sponsor's project page
  if (d.v === "Shortlisted") s.shortAt = now();
  if (d.v === "Not selected") s.selAt = now();
  if (d.v !== "Shortlisted") delete s.prole;
  const c = spaChat(p);
  if (c && c.state === "Active") {
    const m = c.members.find((x) => x.pid === s.pid);
    if (d.v === "Shortlisted") {
      if (m) m.status = "Active";
      else c.members.push({ pid: s.pid, status: "Active", at: now() });
      c.msgs.push({ id: uid("spm"), sys: true, at: now(), t: P(s.pid).name + " joined the discussion" });
      notify(s.pid, "You joined the project discussion for “" + p.title + "”", "spchat", { id: c.id });
    } else if (m && m.status === "Active") {
      m.status = "Removed";
      c.msgs.push({ id: uid("spm"), sys: true, at: now(), t: P(s.pid).name + " left the discussion" });
    }
  }
  if (d.v === "Shortlisted") notify(s.pid, p.alias + " shortlisted you for “" + p.title + "”", "sponsorlisting", { id: p.id });
  spLog(p, P(s.pid).name + ": " + was.toLowerCase() + " → " + d.v.toLowerCase());
  audit("Sponsor application " + d.v.toLowerCase(), p.id, s.pid);
  toast({ Shortlisted: "Shortlisted. Give them a project role.", "Not selected": "Marked not selected. They are told when you finalize the team.", Interested: "Moved back to interested." }[d.v]);
  ok();
};
A.spaRole = (d) => {
  const p = byId("projects", d.id);
  const s = spShortlist(p).find((x) => x.pid === d.pid);
  clearF("spar");
  UI.form.spar = { prole: s.prole || "" };
  modal(
    "Project role · " + nm(s.pid),
    () =>
      `<form data-f="spar" class="col fgap" novalidate>${errSum("spar")}<input type="hidden" name="id" value="${p.id}"><input type="hidden" name="pid" value="${s.pid}">${dl([["Applicant", nm(s.pid) + ' <span class="cap">' + h(spaRoleNm(p, s.pid)) + "</span>"], ["Note", s.note ? spText(s.note) : '<span class="cap">No note</span>']])}${fi("spar", "prole", "Role in this project", { type: "select", ph: "Choose a role", opts: spaRoles(p) })}${fi("spar", "custom", "Or define a new role", { max: 40, ph: "e.g. Data lead", help: "Added to this project’s role list. Leave empty to use the role above." })}${banner("info", "", "Project roles describe what each person does in the team. A Project owner must hold a Participant role in this programme; they run the project in the Project module. Roles grant no platform permissions.")}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">Save role</button></div></form>`,
  );
};
F.spar = (d) => {
  const p = byId("projects", d.id);
  const s = spShortlist(p).find((x) => x.pid === d.pid);
  const r = (d.custom || "").trim().slice(0, 40) || d.prole;
  const e = {};
  if (!r) e.prole = "Choose a role or define a new one.";
  else if (r === "Project owner" && !spaOwnerOk(p, s.pid)) e.prole = "A Project owner must hold a Participant role in this programme.";
  UI.form.spar = d;
  UI.err.spar = e;
  if (Object.keys(e).length) return render();
  if (!spaRoles(p).includes(r)) p.spRoles = [...(p.spRoles || []), r];
  s.prole = r;
  spLog(p, P(s.pid).name + ": project role " + r);
  audit("Sponsor application role", p.id, s.pid + " · " + r);
  UI.modal = null;
  clearF("spar");
  toast("Role saved.");
  ok();
};
A.spaChatNew = (d) => {
  const p = byId("projects", d.id);
  S.spchats = S.spchats || [];
  const c = { id: uid("spc"), pr: p.id, ctx: p.ctx, sponsor: p.sponsor, alias: p.alias, name: "Discussion · " + p.title, state: "Active", at: now(), members: spaShort(p).map((s) => ({ pid: s.pid, status: "Active", at: now() })), msgs: [] };
  c.msgs.push({ id: uid("spm"), sys: true, at: now(), t: "Project discussion opened by " + p.alias + " with the shortlisted people. It is for preliminary talks before the team is final, and closes when the sponsor finalizes the team." });
  S.spchats.push(c);
  c.members.forEach((m) => notify(m.pid, p.alias + " opened a project discussion for “" + p.title + "”", "spchat", { id: c.id }));
  spLog(p, "Project discussion opened");
  audit("Sponsor project discussion opened", p.id, c.id);
  toast("Discussion opened. The shortlisted people have been told.");
  save();
  // opened from the Sponsor's project page, it stays there on the Chat room section
  go(d.tab ? "sponsorproject" : "spchat", d.tab ? { id: p.id, tab: d.tab } : { id: c.id });
};

// ---------- PROJECT DISCUSSION: a standalone chat for the Sponsor and the shortlisted people ----------
route("spchat", "any", () => {
  const c = byId("spchats", UI.p.id);
  if (!spaSees(c)) return head("Project discussion", "") + card("", "", empty("message", "This discussion is not available to you", "It is open to the sponsor and the people they shortlisted.", L("Back to My PHOENIX", "home", {}, "btn btn-s btn-sm")));
  const p = byId("projects", c.pr);
  const spon = c.sponsor === myId();
  const live = c.state === "Active";
  const msgs = c.msgs
    .map((m) =>
      m.sys
        ? `<li class="sp-msg-sys"><span class="cap">${fmtD(m.at)} · ${h(m.t)}</span></li>`
        : `<li class="sp-msg${m.by === myId() ? " me" : ""}"><span class="av sm" aria-hidden="true">${m.by === c.sponsor ? "S" : ini(m.by)}</span><div class="sp-msg-b"><div class="sp-msg-h"><b>${spaWho(c, m.by)}</b><span class="cap">${fmt(String(m.at).slice(0, 10))} ${String(m.at).slice(11, 16)}</span></div><p>${spText(m.t)}</p></div></li>`,
    )
    .join("");
  const members = [{ pid: c.sponsor }, ...c.members.filter((m) => m.status === "Active")];
  const s_ = (pid) => spShortlist(p).find((x) => x.pid === pid);
  return (
    crumbsHtml(spon ? [["Applications", "sponsorapps"], [h(p.title), "sponsorapps", { id: p.id }], ["Discussion"]] : [["Explore board", "board"], [h(p.title), "sponsorlisting", { id: p.id }], ["Discussion"]]) +
    head(h(c.name), "Project discussion · " + (live ? "open until the sponsor finalizes the team" : "closed " + fmtD(c.closedAt)), pill(live ? "Active" : "Closed")) +
    (live ? "" : banner("info", "This discussion is closed", "The sponsor finalized the team or withdrew the project. You can still read it.")) +
    `<div class="sp-body">${hmCols(
      card(
        "Messages",
        "Only the sponsor and the shortlisted people see this. It is separate from Circle, Rope Team and " + WL() + " chats.",
        `<ol class="sp-chat">${msgs}</ol>` +
          (live
            ? `<form data-f="spcm" class="col fgap sp-chat-f" novalidate><input type="hidden" name="id" value="${c.id}">${fi("spcm", "t", "Message", { type: "textarea", rows: 3, req: true, max: 2000, help: spon ? "Shown under " + h(c.alias) + "." : "Shown under your name." })}<div class="actions"><span></span><button class="btn btn-p btn-sm" type="submit">${ic("send", 14)}Send</button></div></form>`
            : ""),
      ),
      card("Members", members.length + " in this discussion", `<ul class="sp-team">${members.map((m) => `<li><span class="av sm">${m.pid === c.sponsor ? "S" : ini(m.pid)}</span><span class="sp-team-n">${spaWho(c, m.pid)}</span>${m.pid !== c.sponsor && s_(m.pid) && s_(m.pid).prole ? pill(s_(m.pid).prole, "p-navy") : ""}</li>`).join("")}</ul>`) +
        (spon ? card("Next", "", '<p class="cap">When you are ready, finalize the team from Applications. The discussion then closes.</p>', L("Applications", "sponsorapps", { id: p.id }, "btn btn-s btn-sm")) : ""),
    )}</div>`
  );
});
F.spcm = (d) => {
  if (!validate("spcm", d, { t: ["req"] })) return render();
  const c = byId("spchats", d.id);
  c.msgs.push({ id: uid("spm"), by: myId(), at: now(), t: d.t.trim() });
  const from = c.sponsor === myId() ? c.alias : me().name;
  [c.sponsor, ...c.members.filter((m) => m.status === "Active").map((m) => m.pid)].filter((x) => x !== myId()).forEach((x) => notify(x, from + " wrote in the discussion for “" + c.name.replace(/^Discussion · /, "") + "”", "spchat", { id: c.id }));
  audit("Sponsor project discussion message", c.pr, "");
  clearF("spcm");
  ok();
};

// ---------- FINALIZE THE TEAM ----------
// Records each person's project role; the Project-owner role holders become the project's owners and the project is
// accepted (sponsor.js and the Project module take it from there). Applications close, the project leaves the
// Explore board, everyone not selected is told, and the project discussion becomes read-only.
A.spaFinal = (d) => {
  const p = byId("projects", d.id);
  const sl = spaShort(p);
  const owners = sl.filter((s) => s.prole === "Project owner");
  const noRole = sl.filter((s) => !s.prole);
  const others = spShortlist(p).filter((s) => s.sel !== "Shortlisted");
  clearF("spaf");
  UI.form.spaf = { primary: owners.length === 1 ? owners[0].pid : "", path: SUPPORT_PATHS[0][0] };
  modal(
    "Finalize the team",
    () => {
      const cur = SUPPORT_PATHS.find(([v]) => v === fv("spaf", "path")) || SUPPORT_PATHS[0];
      const blocked = noRole.length || !owners.length;
      return `<form data-f="spaf" class="col fgap" novalidate>${errSum("spaf")}<input type="hidden" name="id" value="${p.id}">${table(["Team member", "Project role"], sl.map((s) => [nm(s.pid) + ' <span class="cap">' + h(spaRoleNm(p, s.pid)) + "</span>", s.prole ? h(s.prole) : '<span class="cap">No role yet</span>']))}${
        blocked
          ? banner("warn", "Not ready yet", (noRole.length ? noRole.length + " shortlisted " + (noRole.length === 1 ? "person has" : "people have") + " no project role. " : "") + (!owners.length ? "Give at least one Participant the role Project owner." : ""))
          : fi("spaf", "primary", "Primary owner", { type: "select", req: true, ph: "Choose a Project owner", opts: owners.map((s) => [s.pid, P(s.pid).name]), help: "Leads the project’s spaces. Every Project owner can manage milestones, payment status and disputes with you." }) + fi("spaf", "path", "Where the work starts", { type: "select", req: true, opts: SUPPORT_PATHS.map(([v]) => [v, pathLabel(v)]), ch: "spafPath", help: cur[1] })
      }${banner("info", "What finalizing does", "Applications close and the project leaves the Explore board. " + (others.length ? others.length + " " + (others.length === 1 ? "person" : "people") + " not selected " + (others.length === 1 ? "is" : "are") + " told. " : "") + (spaChat(p) ? "The project discussion becomes read-only. " : "") + "The project moves to the owner’s Projects as accepted; the owner invites the team to its spaces.")}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit" ${blocked ? "disabled" : ""}>Finalize team</button></div></form>`;
    },
    true,
  );
};
A.spafPath = (d, el) => {
  const f = {};
  new FormData(el.form).forEach((v, k) => (f[k] = v));
  UI.form.spaf = f;
  render();
};
F.spaf = (d) => {
  const p = byId("projects", d.id);
  const sl = spaShort(p);
  const owners = sl.filter((s) => s.prole === "Project owner" && spaOwnerOk(p, s.pid)).map((s) => s.pid);
  const e = {};
  if (sl.some((s) => !s.prole)) e.primary = "Every shortlisted person needs a project role.";
  else if (!owners.length) e.primary = "Give at least one Participant the role Project owner.";
  else if (!owners.includes(d.primary)) e.primary = "Choose the primary owner from the Project owners.";
  if (!SUPPORT_PATHS.some(([v]) => v === d.path)) e.path = "Choose where the work starts.";
  UI.form.spaf = d;
  UI.err.spaf = e;
  if (Object.keys(e).length) return render();
  p.team = sl.map((s) => ({ pid: s.pid, role: s.prole }));
  p.owners = [d.primary, ...owners.filter((x) => x !== d.primary)];
  p.owner = d.primary;
  p.status = "Accepted";
  p.supportPath = d.path;
  p.submitted = today();
  p.finalAt = now();
  spShortlist(p).forEach((s) => {
    if (owners.includes(s.pid)) s.status = "Owner";
    if (s.sel !== "Shortlisted") {
      s.sel = "Not selected";
      notify(s.pid, p.alias + " finalized the team for “" + p.title + "”. You were not selected this time.", "projects", {});
    }
  });
  sl.forEach((s) => notify(s.pid, p.alias + " selected you for “" + p.title + "” as " + s.prole + (p.owners.includes(s.pid) ? ". Start: " + pathLabel(d.path) : ". The owner invites you to the team’s spaces."), "project", { id: p.id }));
  ctxAdmins(p.ctx).forEach((a) => notify(a, "Sponsor project “" + p.title + "” has a team. Assign its Faculty/Steward.", "project", { id: p.id }));
  spaChatClose(p, "The sponsor finalized the team.");
  spLog(p, "Team finalized by " + p.alias + ": " + sl.map((s) => P(s.pid).name + " (" + s.prole + ")").join(", ") + ". Starts: " + pathLabel(d.path));
  audit("Sponsor project team finalized", p.id, p.team.map((t) => t.pid + ":" + t.role).join(","));
  UI.modal = null;
  clearF("spaf");
  toast("Team finalized. Applications are closed and the project moved to the owner’s Projects.");
  ok();
};
