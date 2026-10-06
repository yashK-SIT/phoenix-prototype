// ---------- shared selectors ----------
const cName = (id) =>
  h(
    (
      byId("circles", id) ||
      byId("ropes", id) ||
      byId("rooms", id) ||
      byId("projects", id) ||
      byId("cards", id) || { name: id, title: id }
    ).name ||
      (byId("projects", id) || byId("cards", id) || {}).title ||
      id,
  );
const memberOf = (o, pid = myId()) =>
  (o.members || []).some(
    (m) => m.pid === pid && (!m.status || m.status === "Active"),
  );
const memberRec = (o, pid = myId()) =>
  (o.members || []).find((m) => m.pid === pid);
const stageLabel = (s) => (s === "Room" ? WL() : s);
const pathLabel = (s) => String(s || "").replace(/Room/g, WL());
const myCircles = (pid = myId()) =>
  S.circles.filter((c) => inCtx(c) && memberOf(c, pid));
const myRopes = (pid = myId()) =>
  S.ropes.filter((r) => inCtx(r) && memberOf(r, pid));
const myRooms = (pid = myId()) =>
  S.rooms.filter((r) => inCtx(r) && memberOf(r, pid));
const stewardOf = (p) => p.stewards.includes(myId());
function inboxItems() {
  const r = role(),
    out = [];
  const me_ = myId();
  if (r === "F" || r === "A")
    S.projects
      .filter(
        (p) =>
          inCtx(p) && p.status === "Submitted" && (stewardOf(p) || r === "A"),
      )
      .forEach((p) =>
        out.push([
          "Project review",
          p.title,
          "Submitted " + fmt(p.submitted),
          "project",
          { id: p.id },
        ]),
      );
  if (r === "F" || r === "A")
    S.projects
      .filter(
        (p) =>
          inCtx(p) && p.stage === "Final review" && (stewardOf(p) || r === "A"),
      )
      .forEach((p) =>
        out.push([
          "Final deliverables",
          p.title,
          "Final review",
          "project",
          { id: p.id },
        ]),
      );
  if (r === "F" || hasB("Reviewer"))
    S.evidence
      .filter((e) => e.review === "Submitted" && e.owner !== me_)
      .forEach((e) =>
        out.push([
          "Evidence review",
          e.title,
          "From " + P(e.owner).name,
          "evidence",
          { id: e.id },
        ]),
      );
  if (hasB("Reviewer"))
    S.pathways
      .filter((p) => inCtx(p) && p.state === "In review")
      .forEach((p) =>
        out.push([
          "Pathway approval (mode 3)",
          p.name,
          "For " + P(p.pid).name,
          "pathway",
          { id: p.id },
        ]),
      );
  if (r === "F")
    S.matches
      .filter(
        (m) =>
          ["In steward review", "Clarification requested"].includes(m.status) &&
          m.steward === me_,
      )
      .forEach((m) =>
        out.push([
          "Match Brief",
          P(m.a).name + " ↔ " + P(m.b).name,
          m.status,
          "match",
          { id: m.id },
        ]),
      );
  if (r === "F" || r === "A")
    S.harvests
      .filter((x) => ["Draft", "Review"].includes(x.state))
      .forEach((x) =>
        out.push([
          "Learning Harvest",
          x.scopeName,
          x.state,
          "harvest",
          { id: x.id },
        ]),
      );
  if (r === "F" || hasB("AI Owner"))
    S.ai
      .filter((j) => j.status === "In review" && j.cls === "C")
      .forEach((j) =>
        out.push([
          "AI output (Class C)",
          j.purpose,
          "Requested by " + P(j.by).name,
          "inbox",
          {},
        ]),
      );
  if (r === "F")
    S.rooms
      .filter((x) => inCtx(x) && memberOf(x))
      .forEach((x) =>
        (x.contribs || [])
          .filter((c) => c.status === "Submitted")
          .forEach((c) =>
            out.push([
              "Contribution review",
              c.t,
              "From " + P(c.by).name + " · " + x.name,
              "room",
              { id: x.id, tab: "contribs" },
            ]),
          ),
      );
  if (r === "F")
    S.circles
      .filter((c) => inCtx(c) && c.facilitator === me_)
      .forEach((c) =>
        c.commitments
          .filter((x) => x.status === "Awaiting review")
          .forEach((x) =>
            out.push([
              "Circle work review",
              x.t,
              P(x.by).name + " · " + c.name,
              "circle",
              { id: c.id, tab: "records" },
            ]),
          ),
      );
  if (r === "F" || r === "A")
    S.rooms
      .filter((x) => inCtx(x) && x.state === "Pending approval")
      .forEach((x) =>
        out.push([
          WL() + " activation",
          x.name,
          (x.flags || []).join(", "),
          "room",
          { id: x.id },
        ]),
      );
  if (r === "F" || r === "A")
    S.rooms.forEach((x) =>
      (x.changes || [])
        .filter((c) => ["Proposed", "Reviewed"].includes(c.state))
        .forEach((c) =>
          out.push([
            "Change Object",
            c.title,
            c.state,
            "room",
            { id: x.id, tab: "change" },
          ]),
        ),
    );
  if (r === "F" || r === "A")
    S.rooms.forEach((x) =>
      (x.joinReqs || [])
        .filter((j) => j.status === "Pending")
        .forEach((j) =>
          out.push([
            "Elevated join",
            P(j.pid).name + " → " + x.name,
            j.kind,
            "room",
            { id: x.id, tab: "members" },
          ]),
        ),
    );
  if (r === "A")
    S.assign
      .filter((a) => a.status === "Pending role approval")
      .forEach((a) =>
        out.push([
          "Role approval",
          P(a.pid).name + " — " + ROLE[a.role],
          S.contexts.find((c) => c.id === a.ctx).name,
          "admin",
          { tab: "approvals" },
        ]),
      );
  if (hasB("Incident/Safety Owner"))
    S.incidents
      .filter((i) => !["Closed"].includes(i.state))
      .forEach((i) =>
        out.push(["Incident", i.kind, i.state, "incidents", { id: i.id }]),
      );
  if (r === "A")
    S.releases
      .filter((x) => x.status === "Owner authorised — disclosure review")
      .forEach((x) =>
        out.push([
          "Disclosure review",
          byId("evidence", x.ev).title,
          x.audience,
          "evidence",
          { id: x.ev },
        ]),
      );
  return out;
}
function nextAction() {
  const pid = myId(),
    r = role();
  if (r === "P") {
    const mb = S.matches.find(
      (m) =>
        m.status === "Awaiting consent" &&
        ((m.a === pid && !m.consentA) || (m.b === pid && !m.consentB)),
    );
    if (mb)
      return [
        "Respond to an introduction",
        "A steward-approved Match Brief needs your consent.",
        "match",
        { id: mb.id },
      ];
    const cl = S.projects.find(
      (p) =>
        p.owner === pid && inCtx(p) && p.status === "Clarification requested",
    );
    if (cl)
      return [
        "Respond to clarification on your project",
        `Your steward asked for more detail on “${h(cl.title)}”.`,
        "project",
        { id: cl.id },
      ];
    const rr = S.releases.find(
      (x) =>
        x.status === "Awaiting owner decision" &&
        byId("evidence", x.ev).owner === pid,
    );
    if (rr)
      return [
        "Decide on an evidence release",
        h(rr.audience),
        "evidence",
        { id: rr.ev },
      ];
    const fu = S.funding.find(
      (f) =>
        byId("projects", f.project).owner === pid &&
        f.tranches.some((t) => t.state === "Released"),
    );
    if (fu) {
      const t = fu.tranches.find((t) => t.state === "Released");
      return [
        `Submit the ${t.stage} stage progress summary`,
        "Your sponsor needs it before the next tranche.",
        "funding",
        {},
      ];
    }
    const rv = myRopes().flatMap((rt) =>
      (rt.reviews || [])
        .filter(
          (v) =>
            v.by === pid &&
            v.status === "Changes recommended" &&
            !rt.reviews.some((w) => w.prev === v.id),
        )
        .map((v) => [rt, v]),
    )[0];
    if (rv)
      return [
        "Act on mentor feedback",
        h(rv[1].title) + " · " + h(rv[1].response.slice(0, 80)),
        "rope",
        { id: rv[0].id, tab: "reviews" },
      ];
    const wk = myCircles().flatMap((c) =>
      c.commitments
        .filter(
          (x) =>
            x.by === pid &&
            x.assignedBy &&
            ["Open", "Changes requested"].includes(x.status),
        )
        .map((x) => [c, x]),
    )[0];
    if (wk)
      return [
        wk[1].status === "Changes requested"
          ? "Revise assigned work"
          : "Complete an assigned responsibility",
        h(wk[1].t) + " · due " + fmt(wk[1].due),
        "circle",
        { id: wk[0].id, tab: "records" },
      ];
    const po = myCircles().flatMap((c) =>
      c.polls
        .filter(
          (p) =>
            p.status === "Open" &&
            p.votes[pid] == null &&
            eligibleVoter(c, pid),
        )
        .map((p) => [c, p]),
    )[0];
    if (po)
      return [
        "Vote in your Circle",
        h(po[1].q),
        "circle",
        { id: po[0].id, tab: "polls" },
      ];
    const lt = myTasks().find((t) => taskOverdue(t.k));
    if (lt)
      return [
        "Finish an overdue task",
        h(lt.k.t) + " · " + h(lt.x.name) + " · due " + fmt(lt.k.due),
        "room",
        { id: lt.x.id, tab: "plan" },
      ];
    const cd = S.candidates.find(
      (c) => c.pid === pid && c.status === "Pending",
    );
    if (cd)
      return [
        "Review a suggested profile change",
        h(cd.field + ": " + cd.value),
        "profile",
        { tab: "cand" },
      ];
    const pw = S.pathways.find(
      (p) => p.pid === pid && inCtx(p) && p.state === "Proposed to participant",
    );
    if (pw) return ["Review a proposed pathway", h(pw.name), "pathway", {}];
    const cur = S.pathways.find(
      (p) => p.pid === pid && inCtx(p) && p.state === "Current",
    );
    if (cur) {
      const i = cur.steps.findIndex((s) => !s.done);
      if (i >= 0)
        return [
          `Complete step ${i + 1} of your pathway`,
          h(cur.steps[i].t),
          "pathway",
          {},
        ];
    }
    return [
      "Define your first project",
      "Turn an idea, need or opportunity into a structured project a steward can review.",
      "newproject",
      {},
    ];
  }
  if (r === "M") {
    const m = S.mentorReqs.find((x) => x.to === pid && x.status === "Pending");
    if (m)
      return [
        "Respond to a Mentor Request",
        h(m.need) + " · from " + nm(m.from),
        "ropeteams",
        {},
      ];
    const wr = myRopes().flatMap((rt) =>
      (rt.reviews || [])
        .filter((v) => v.status === "Awaiting review")
        .map((v) => [rt, v]),
    )[0];
    if (wr && wr[0].mentor === pid)
      return [
        "Review shared work",
        h(wr[1].title) + " · from " + nm(wr[1].by),
        "rope",
        { id: wr[0].id, tab: "reviews" },
      ];
    const s = myRopes().flatMap((rt) =>
      rt.support.filter((x) => x.status === "Open").map((x) => [rt, x]),
    )[0];
    if (s)
      return [
        "Pick up a support request",
        h(s[1].t),
        "rope",
        { id: s[0].id, tab: "support" },
      ];
  }
  if (r === "C" || r === "P") {
  }
  if (r === "C") {
    const mb = S.matches.find(
      (m) =>
        m.status === "Awaiting consent" &&
        ((m.a === pid && !m.consentA) || (m.b === pid && !m.consentB)),
    );
    if (mb)
      return [
        "Respond to an introduction",
        "A steward-approved Match Brief needs your consent.",
        "match",
        { id: mb.id },
      ];
    const iv = S.rooms.find((x) => (memberRec(x) || {}).status === "Invited");
    if (iv)
      return [
        memberRec(iv).req
          ? "Respond to a collaborator invitation"
          : "Respond to a " + WL() + " invitation",
        h(iv.name),
        "room",
        { id: iv.id },
      ];
    const cb = myRooms().flatMap((x) =>
      (x.contribs || [])
        .filter(
          (c) =>
            c.by === pid &&
            ["Changes requested", "More evidence requested"].includes(c.status),
        )
        .map((c) => [x, c]),
    )[0];
    if (cb)
      return [
        "Revise a contribution",
        h(cb[1].t) + " · " + h(cb[1].status),
        "room",
        { id: cb[0].id, tab: "contribs" },
      ];
  }
  if (r === "S") {
    const t = S.funding
      .filter((f) => f.sponsor === pid)
      .flatMap((f) => f.tranches.map((t, i) => [f, t, i]))
      .find(([f, t]) => t.state === "Summary submitted");
    if (t)
      return [
        "Review a progress summary",
        cName(t[0].project) + " · " + stageLabel(t[1].stage) + " stage",
        "funding",
        { tab: "funded" },
      ];
    const pi = S.pitches.find((p) => p.to === pid && p.status === "Sent");
    if (pi)
      return [
        "Review a new pitch",
        cName(pi.project) + " · from " + nm(pi.from),
        "funding",
        { tab: "pitches" },
      ];
    const ap = S.funding.find(
      (f) => f.sponsor === pid && f.status === "Approved — agreement pending",
    );
    if (ap)
      return [
        "Sign a funding agreement",
        cName(ap.project),
        "funding",
        { tab: "funded" },
      ];
  }
  if (r === "O") {
    const pa = S.assign.find(
      (a) => a.ctx === ctxId() && a.status === "Pending role approval",
    );
    if (pa)
      return [
        "Approve a role request",
        nm(pa.pid) + " — " + ROLE[pa.role],
        "org",
        { tab: "users" },
      ];
    const iv = S.invites.filter(
      (i) => i.ctx === ctxId() && i.status === "Expired",
    ).length;
    if (iv)
      return [
        iv + " invitation(s) expired",
        "Resend or revoke them.",
        "org",
        { tab: "invites" },
      ];
  }
  if (r === "T") {
    const bad = S.integrations.find(
      (i) => !["Healthy", "Configured"].includes(i.status),
    );
    if (bad)
      return [
        "Integration needs attention",
        h(bad.name) + " · " + h(bad.status),
        "platform",
        { tab: "integrations" },
      ];
  }
  {
    const lt = myTasks().find((t) => taskOverdue(t.k));
    if (lt)
      return [
        "Finish an overdue task",
        h(lt.k.t) + " · " + h(lt.x.name) + " · due " + fmt(lt.k.due),
        "room",
        { id: lt.x.id, tab: "plan" },
      ];
  }
  const it = inboxItems();
  if (it.length)
    return [it[0][0] + ": " + h(it[0][1]), h(it[0][2]), it[0][3], it[0][4]];
  return [
    "You are up to date",
    "Nothing needs your action right now.",
    "home",
    {},
  ];
}
function metric(id) {
  const c = ctxId();
  const act = S.assign.filter((a) => a.ctx === c && a.status === "Active");
  const parts = act.filter((a) => roleBase(a.role) === "P");
  switch (id) {
    case "m1":
      return (
        Math.round(
          (act.filter(
            (a) =>
              a.onb.agreement &&
              a.onb.consents &&
              a.onb.profile &&
              a.onb.compass,
          ).length /
            Math.max(1, act.length)) *
            100,
        ) + "%"
      );
    case "m2":
      return (
        parts.filter((a) =>
          S.circles.some(
            (ci) =>
              ci.ctx === c && ci.state === "Active" && memberOf(ci, a.pid),
          ),
        ).length +
        " of " +
        parts.length
      );
    case "m3":
      return (
        parts.filter((a) =>
          S.pathways.some((p) => p.pid === a.pid && p.state === "Current"),
        ).length +
        " of " +
        parts.length
      );
    case "m4":
      return S.cards.filter((x) => x.ctx === c && x.status !== "Draft").length;
    case "m5":
      return S.matches.filter((m) => m.status === "Introduced").length;
    case "m6":
      return S.rooms
        .filter((r) => r.ctx === c)
        .flatMap((r) => r.milestones)
        .filter((m) => m.status === "Achieved").length;
    case "m7": {
      const ms = S.rooms
        .filter((r) => r.ctx === c)
        .flatMap((r) => r.milestones)
        .filter((m) => m.status === "Achieved");
      return ms.length
        ? Math.round(
            (ms.filter(
              (m) =>
                m.evidence &&
                byId("evidence", m.evidence)?.review === "Approved",
            ).length /
              ms.length) *
              100,
          ) + "%"
        : "No data yet";
    }
    case "m8": {
      const ps = [...new Set(act.map((a) => a.pid))];
      return (
        Math.round(
          (ps.filter((p) => S.consents[p] && S.consents[p].history.length)
            .length /
            Math.max(1, ps.length)) *
            100,
        ) + "%"
      );
    }
    case "m9": {
      const j = S.ai.filter((x) => x.cls !== "A");
      return j.length
        ? Math.round(
            (j.filter((x) => x.status !== "Released" || x.reviewed).length /
              j.length) *
              100,
          ) + "%"
        : "No data yet";
    }
    case "m10": {
      const sp = S.seatPools.filter((s) => s.ctx === c);
      const t = sp.reduce((a, s) => a + s.total, 0),
        u = sp.reduce((a, s) => a + s.assigned.length, 0);
      return t ? Math.round((u / t) * 100) + "%" : "No data yet";
    }
  }
  return "—";
}
const stat = (cls, tile, icon, num, title, sub, r, p) =>
  `<a href="#" class="stat ${cls} c3" data-a="go" data-r="${r || "home"}"${attr(p)} style="text-decoration:none;color:inherit"><svg class="deco" width="180" height="180" viewBox="0 0 180 180" fill="none" stroke="currentColor" stroke-width="2" style="color:${{ "s-purple": "#6A4C9C", "s-teal": "#1F7A72", "s-slate": "#0B1A35", "s-mist": "#3A4A66" }[cls]}" aria-hidden="true"><circle cx="90" cy="90" r="40"/><circle cx="90" cy="90" r="60"/><circle cx="90" cy="90" r="80"/></svg><span class="tile ${tile}">${ic(icon)}</span><span class="statnum">${num}</span><div><b>${title}</b><p class="cap">${sub}</p></div></a>`;
const lrow = (icon, title, sub, right = "", tile = "t-soft") =>
  `<div class="lrow"><span class="tile ${tile}">${ic(icon, 18)}</span><div class="lt"><b>${title}</b>${sub ? `<p class="cap">${sub}</p>` : ""}</div>${right}</div>`;
// ---------- HOME ----------
route("home", "home", () => {
  const r = role();
  return {
    P: homeP,
    F: homeF,
    M: homeM,
    C: homeC,
    O: homeO,
    S: homeS,
    A: homeA,
    T: homeT,
  }[r]();
});
function nextCard() {
  const [t, s, rt, p] = nextAction();
  return `<section class="card c5 nextcard"><span class="over">Next action</span><h2 class="h2" style="margin-top:12px">${t}</h2><p class="muted" style="margin-top:8px">${s}</p>${rt !== "home" ? `<div style="margin-top:18px">${B("Open" + ic("arrow", 16), "go", { r: rt, ...p }, "btn-p")}</div>` : ""}<p class="cap" style="margin-top:16px">Chosen by rule from your pending steps, tasks, decisions and reviews — not an AI ranking.</p></section>`;
}
function homeP() {
  const pid = myId(),
    cp = S.compass[pid] || {};
  const projects = S.projects.filter((p) => p.owner === pid && inCtx(p));
  const pend = [];
  S.candidates
    .filter((c) => c.pid === pid && c.status === "Pending")
    .forEach((c) =>
      pend.push(
        lrow(
          "sparkle",
          "Profile change suggested",
          h(c.field + ": " + c.value) + " · " + h(c.source),
          B("Review", "go", { r: "profile", tab: "cand" }),
        ),
      ),
    );
  S.matches
    .filter(
      (m) =>
        m.status === "Awaiting consent" &&
        ((m.a === pid && !m.consentA) || (m.b === pid && !m.consentB)),
    )
    .forEach((m) =>
      pend.push(
        lrow(
          "link",
          "Introduction awaiting your consent",
          "Steward-approved Match Brief",
          B("Review brief", "go", { r: "match", id: m.id }),
        ),
      ),
    );
  myCircles().forEach((c) =>
    c.polls
      .filter(
        (p) =>
          p.status === "Open" && p.votes[pid] == null && eligibleVoter(c, pid),
      )
      .forEach((p) =>
        pend.push(
          lrow(
            "vote",
            "Circle vote: " + h(p.q),
            h(c.name) + " · closes " + fmt(p.closes),
            B("Vote", "go", { r: "circle", id: c.id, tab: "polls" }),
          ),
        ),
      ),
  );
  S.releases
    .filter(
      (x) =>
        x.status === "Awaiting owner decision" &&
        byId("evidence", x.ev).owner === pid,
    )
    .forEach((x) =>
      pend.push(
        lrow(
          "shield",
          "Evidence release request",
          h(x.audience),
          B("Decide", "go", { r: "evidence", id: x.ev }),
        ),
      ),
    );
  S.pathways
    .filter((p) => p.pid === pid && p.state === "Proposed to participant")
    .forEach((p) =>
      pend.push(
        lrow(
          "route",
          "Pathway proposed: " + h(p.name),
          "Mode " + h(p.mode),
          B("Review", "go", { r: "pathway" }),
        ),
      ),
    );
  myRopes()
    .flatMap((rt) =>
      (rt.reviews || [])
        .filter(
          (v) =>
            v.by === pid &&
            v.status !== "Awaiting review" &&
            !rt.reviews.some((w) => w.prev === v.id),
        )
        .map((v) => [rt, v]),
    )
    .filter(([, v]) => v.status === "Changes recommended")
    .forEach(([rt, v]) =>
      pend.push(
        lrow(
          "message",
          "Mentor feedback: " + h(v.title),
          h(v.response.slice(0, 90)),
          B("Open", "go", { r: "rope", id: rt.id, tab: "reviews" }),
        ),
      ),
    );
  const pw = S.pathways.find(
    (p) => p.pid === pid && inCtx(p) && p.state === "Current",
  );
  const ev = S.evidence.filter((e) => e.owner === pid);
  const unr = (o) =>
    unreadIn(o)
      ? `<span class="mbadge" title="Unread messages">${unreadIn(o)}</span> `
      : "";
  const opps = S.cards
    .filter(
      (c) =>
        inCtx(c) && c.status === "Active" && c.owner !== pid && cardVisible(c),
    )
    .slice(0, 3);
  return (
    head(
      "My PHOENIX",
      `Welcome back, ${h(me().display)}. Here is what needs you in ${h(ctx().name)}.`,
      B(
        ic("megaphone", 16) + "Post a need or offer",
        "go",
        { r: "newcard" },
        "btn-s",
      ) +
        B(
          ic("plus", 16) + "Start a project",
          "go",
          { r: "newproject" },
          "btn-p",
        ),
    ) +
    `<div class="g12"><div class="c12 g12">
 <section class="northstar c7"><div class="row" style="justify-content:space-between;gap:12px"><span class="over">My North Star</span><span class="row" style="gap:14px"><span class="vis">${ic("lock", 14)}Only you</span>${B(ic("edit", 14) + "Edit", "go", { r: "profile", tab: "compass" }, "btn-g btn-sm", 'aria-label="Edit Purpose Compass"')}</span></div><p class="ns-q">${cp.PC2 ? "“" + h(cp.PC2) + "”" : "Set your goal in the Purpose Compass."}</p><div class="ns-facts"><div><span class="cap">What matters most</span><b>${h(cp.PC1 || "—")}</b></div><div><span class="cap">First milestone</span><b>${h(cp.PC5 || "—")}</b></div></div><p class="cap" style="margin-top:14px">Your self-declared direction. Never scored.</p></section>
 ${nextCard()}</div>
 <div class="c12 g12">${stat("s-purple", "t-purple", "folder", projects.length, "My projects", projects.filter((p) => p.status === "Clarification requested").length + " need clarification", "projects")}${stat("s-teal", "t-teal", "users", myCircles().length + myRopes().length + myRooms().length, "Collaborations", `${myCircles().length} Circle${myCircles().length === 1 ? "" : "s"} · ${myRopes().length} Rope Team${myRopes().length === 1 ? "" : "s"} · ${myRooms().length} ${WL()}${myRooms().length === 1 ? "" : "s"}`, "circles")}${stat("s-slate", "t-navy", "flag", pend.length, "Pending decisions", "Nothing takes effect until you decide", "home")}${stat("s-mist", "t-slate", "award", ev.filter((e) => e.review === "Approved").length, "Evidence approved", ev.filter((e) => e.review === "Submitted").length + " awaiting review", "evidence")}</div>
 ${myTasksCard()}
 ${card("Pending decisions", "Nothing below takes effect until you decide.", pend.length ? pend.join("") : empty("check", "You are all caught up", "Profile suggestions, match consents, votes and release requests appear here."), "", "c7")}
 ${card("My pathway", pw ? h(pw.name) : "", pw ? `<div class="progress" style="margin-bottom:12px"><span style="width:${(pw.steps.filter((s) => s.done).length / pw.steps.length) * 100}%"></span></div>${pw.steps.map((s, i) => lrow(s.done ? "check" : "route", h(s.t), s.done ? "Done" : i === pw.steps.findIndex((x) => !x.done) ? "Next milestone" : "", s.done ? pill("Done") : "", s.done ? "t-teal" : "t-soft")).join("")}` : empty("route", "No current pathway", "A facilitator or mentor may propose one. You decide whether to accept it."), pw ? L("Open", "pathway") : "", "c5")}
 ${card("Collaborations", "In this context", [...myCircles().map((c) => lrow("users", h(c.name), "Circle · " + c.members.length + " members" + (unreadIn(c) ? " · " + unreadIn(c) + " unread" : ""), unr(c) + pill(c.state) + " " + L("Open", "circle", { id: c.id }), "t-purple")), ...myRopes().map((c) => lrow("route", h(c.name), "Rope Team · mentor " + (c.mentor ? nm(c.mentor) : "—") + (unreadIn(c) ? " · " + unreadIn(c) + " unread" : ""), unr(c) + pill(c.state) + " " + L("Open", "rope", { id: c.id }), "t-teal")), ...myRooms().map((c) => lrow("room", h(c.name), WL(), pill(c.state) + " " + L("Open", "room", { id: c.id }), "t-navy"))].join("") || empty("users", "No collaborations yet", "When a steward accepts your project, they create a Circle and invite you."), "", "c7")}
 ${card("Opportunities for you", "Cards visible to you", opps.map((c) => lrow("megaphone", h(c.title), h(c.kind) + " · expires " + fmt(c.expires), L("View", "card", { id: c.id }))).join("") || empty("megaphone", "No open opportunities", "New cards for your audience appear here."), L("Browse", "opportunities"), "c5")}
 ${card(
   "My projects",
   "Status and stage of the projects you own",
   projects.length
     ? table(
         ["Project", "Status", "Stage", "Next step", ""],
         projects.map((p) => [
           "<b>" + h(p.title) + "</b>",
           pill(p.status),
           p.stage ? pill(stageLabel(p.stage), SC[p.stage]) : "—",
           h(
             p.status === "Draft"
               ? "Finish and submit for review"
               : p.status === "Submitted"
                 ? "Waiting for Faculty/Steward review"
                 : p.status === "Clarification requested"
                   ? "Respond to clarification"
                   : p.stage === "Closed"
                     ? "Closed — contribute to the Learning Harvest"
                     : p.stage === "Final review"
                       ? "Final review in progress"
                       : "Work in the " + stageLabel(p.stage || "Circle"),
           ),
           L("Open", "project", { id: p.id }),
         ]),
       )
     : empty(
         "folder",
         "No projects yet",
         "Start one from an idea, need or opportunity.",
       ),
   L("All projects", "projects"),
   "c12",
 )}
 ${card(
   "Evidence and progress",
   "",
   table(
     ["Evidence", "Claim", "Support level", "Review", "Release"],
     ev.map((e) => [
       L(h(e.title), "evidence", { id: e.id }),
       h(e.claim),
       pill(e.level, "p-navy"),
       pill(e.review),
       h(e.release),
     ]),
   ),
   B(ic("upload", 16) + "Upload evidence", "go", { r: "newevidence" }),
   "c12",
 )}
 <section class="card c12" style="border:1px dashed #6B7585;display:flex;gap:16px;align-items:center;flex-wrap:wrap"><span class="tile t-navy">${ic("sparkle")}</span><div style="flex:1 1 260px"><b>Ask PHOENIX</b><p class="cap">${consent(pid, "ai") === "Granted" ? "Private answers from approved sources. Nothing is saved to your record." : "AI processing is off. You can turn it on in Privacy & consent."}</p></div>${B("What should I do next to reach my milestone?", "askPreset", { q: "What should I do next to reach my milestone?" }, "btn-s")}</section></div>`
  );
}
function homeF() {
  const pid = myId();
  const subs = S.projects.filter(
    (p) =>
      inCtx(p) &&
      stewardOf(p) &&
      ["Submitted", "Clarification requested"].includes(p.status),
  );
  const inbox = inboxItems();
  const attention = S.ropes
    .filter((r) => inCtx(r) && memberOf(r))
    .flatMap((r) =>
      Object.entries(r.indicators || {})
        .filter(
          ([k, v]) => v.pacing !== "On track" || v.support !== "None reported",
        )
        .map(([k, v]) =>
          lrow(
            "user",
            nm(k),
            `${h(v.pacing)} · ${h(v.support)} · ${h(v.absence)}`,
            L("Rope Team", "rope", { id: r.id }),
          ),
        ),
    );
  const commits = myCircles().flatMap((c) =>
    c.commitments
      .filter((x) => x.status === "Open")
      .map((x) =>
        lrow(
          "calendar",
          h(x.t),
          nm(x.by) + " · due " + fmt(x.due) + " · " + h(c.name),
        ),
      ),
  );
  const concerns = myCircles().flatMap((c) =>
    c.concerns
      .filter((x) => x.status !== "Resolved")
      .map((x) => lrow("alert", h(x.t), h(c.name) + " · " + h(x.status))),
  );
  return (
    head(
      "My PHOENIX",
      `Facilitator / Steward · ${h(ctx().name)}`,
      B("Open review inbox", "go", { r: "inbox" }, "btn-p"),
    ) +
    `<div class="g12">
 <section class="card c7 purpose"><span class="over">Programme purpose</span><p class="h2" style="margin-top:8px">${h(ctx().name)}: move climate ideas from learning to accountable local action.</p><div class="purpose-facts">${[["Circles", myCircles().length, "circles"], ["Rope Teams", S.ropes.filter((r) => inCtx(r) && memberOf(r)).length, "ropeteams"], [WL() + "s", myRooms().length, "rooms"]].map(([l, n, r]) => `<a href="#" data-a="go" data-r="${r}"><b>${n}</b><span>${l}</span></a>`).join("")}</div><p class="cap" style="margin-top:8px">Spaces you facilitate or belong to in this programme.</p></section>${nextCard()}
 <div class="c12 g12">${stat("s-purple", "t-purple", "folder", subs.length, "Project submissions", "Awaiting review or clarification", "projects")}${stat("s-teal", "t-teal", "link", S.matches.filter((m) => m.steward === pid && m.status === "In steward review").length, "Match Briefs", "Awaiting your review", "matches")}${stat("s-slate", "t-navy", "award", S.evidence.filter((e) => e.review === "Submitted").length, "Evidence to review", "Set status and E0–E4", "evidence")}${stat("s-mist", "t-slate", "inbox", inbox.length, "Review inbox", "All items needing you", "inbox")}</div>
 ${myTasksCard()}
 ${card("Project submissions", "", subs.map((p) => lrow("folder", h(p.title), nm(p.owner) + " · " + pill(p.status), L("Review", "project", { id: p.id }))).join("") || empty("check", "No submissions waiting", ""), "", "c7")}
 ${card("Participants needing attention", "From Rope Team support indicators (activity-derived or participant-reported)", attention.join("") || empty("users", "No one flagged", ""), "", "c5")}
 ${card("Upcoming commitments", "", commits.join("") || empty("calendar", "No open commitments", ""), "", "c7")}
 ${card("Unresolved concerns", "", concerns.join("") || empty("shield", "No unresolved concerns", ""), "", "c5")}</div>`
  );
}
function homeM() {
  const reqs = S.mentorReqs.filter((m) => m.to === myId());
  return (
    head(
      "My PHOENIX",
      `Mentor / Advisor · ${h(ctx().name)}`,
      B(ic("message", 16) + "Messages", "go", { r: "messages" }, "btn-s"),
    ) +
    `<div class="g12">${nextCard()}
 ${myTasksCard()}
 ${card(
   "Work awaiting your review",
   "Shared by participants in your Rope Teams",
   myRopes()
     .filter((rt) => rt.mentor === myId())
     .flatMap((rt) =>
       (rt.reviews || [])
         .filter((v) => v.status === "Awaiting review")
         .map((v) =>
           lrow(
             "file",
             h(v.title),
             nm(v.by) + " · " + h(rt.name) + " · " + fmt(v.at),
             B("Review", "go", { r: "rope", id: rt.id, tab: "reviews" }),
           ),
         ),
     )
     .join("") ||
     empty(
       "check",
       "Nothing waiting",
       "Participants share work for your review from their Rope Team.",
     ),
   "",
   "c7",
 )}
 ${card("Mentor Requests", "", reqs.map((m) => lrow("route", h(m.need), "From " + nm(m.from) + " · " + cName(m.project) + (m.hours ? " · " + h(m.hours) : ""), pill(m.status) + " " + B("Details", "mrDetails", { id: m.id }) + (m.status === "Pending" ? B("Decline", "mentorReq", { id: m.id, v: "Declined" }) + B("Accept", "mentorReq", { id: m.id, v: "Accepted" }, "btn-p btn-sm") : ""))).join("") || empty("route", "No requests", ""), "", "c7")}
 ${card(
   "Assigned Rope Teams",
   "",
   myRopes()
     .map((r) =>
       lrow(
         "users",
         h(r.name),
         r.members
           .filter(
             (m) =>
               ["Member", "Project owner"].includes(normRole(m.role)) &&
               m.status !== "Removed",
           )
           .map((m) => nm(m.pid))
           .join(", "),
         L("Open", "rope", { id: r.id }),
         "t-teal",
       ),
     )
     .join("") ||
     empty("users", "None yet", "Accept a Mentor Request to join a Rope Team."),
   "",
   "c12",
 )}
 ${card(
   "Authorised progress and support indicators",
   "Only for participants in your Rope Teams",
   table(
     [
       "Participant",
       "Pacing",
       "Workload",
       "Availability",
       "Support needs",
       "Absence",
     ],
     myRopes().flatMap((r) =>
       Object.entries(r.indicators || {}).map(([k, v]) => [
         nm(k),
         h(v.pacing),
         h(v.workload),
         h(v.availability),
         h(v.support),
         h(v.absence),
       ]),
     ),
   ),
   "",
   "c12",
 )}
 ${card(
   "Open support requests",
   "",
   myRopes()
     .flatMap((r) =>
       r.support
         .filter((s) => s.status !== "Resolved")
         .map((s) =>
           lrow(
             "message",
             h(s.t),
             nm(s.by) + " · " + h(r.name),
             pill(s.status),
           ),
         ),
     )
     .join("") || empty("check", "None open", ""),
   "",
   "c12",
 )}
 ${card(
   "Concerns you raised",
   "Escalated with appropriate confidentiality",
   (S.mentorConcerns || [])
     .filter((x) => x.by === myId())
     .map((x) =>
       lrow(
         "alert",
         h(x.t),
         "To " +
           (x.to === "safety" ? "Incident/Safety Owner" : "Steward") +
           " · " +
           cName(x.rope) +
           " · " +
           fmt(x.at),
       ),
     )
     .join("") ||
     empty(
       "shield",
       "No concerns raised",
       "Use “Escalate a concern” in a Rope Team if you notice disengagement or a risk of harm.",
     ),
   "",
   "c12",
 )}</div>`
  );
}
function homeC() {
  const pid = myId();
  const cards = S.cards.filter((c) => c.owner === pid);
  const mb = S.matches.filter((m) => m.a === pid || m.b === pid);
  return (
    head(
      "My PHOENIX",
      `Partner / Collaborator · ${h(S.orgs.find((o) => o.id === me().org)?.name || "")}`,
      B(ic("plus", 16) + "Publish a card", "go", { r: "newcard" }, "btn-p"),
    ) +
    `<div class="g12">${nextCard()}
 ${myTasksCard()}
 ${card(
   "Mandate",
   "",
   (asg().mandate
     ? dl([
         ["Status", pill(asg().mandate.valid ? "Active" : "Expired")],
         ["Scope", h(asg().mandate.scope)],
         ["Valid until", fmt(asg().mandate.until)],
       ])
     : "No mandate on file") +
     `<div style="margin-top:12px" class="row wrap">${B(ic("edit", 14) + "Organization profile", "orgEdit")}${B("Request cross-organization sharing", "xoNew")}</div>`,
   "",
   "c7",
 )}
 ${card("Published cards", "", cards.map((c) => lrow("megaphone", h(c.title), h(c.kind) + " · " + fmt(c.expires), pill(c.status) + " " + L("Open", "card", { id: c.id }))).join("") || empty("megaphone", "No cards", ""), "", "c6")}
 ${card("Match Briefs and invitations", "Awaiting your consent", mb.map((m) => lrow("link", nm(m.a === pid ? m.b : m.a), m.status, L("Open", "match", { id: m.id }))).join("") || empty("link", "None", ""), "", "c6")}
 ${card(
   WL() + "s",
   "",
   myRooms()
     .map((r) =>
       lrow(
         "room",
         h(r.name),
         "",
         pill(r.state) + " " + L("Open", "room", { id: r.id }),
         "t-navy",
       ),
     )
     .join("") || empty("room", "None", ""),
   "",
   "c6",
 )}
 ${card(
   "Contributions and history",
   "Work you submitted against a defined responsibility, and how accepted contributions were used",
   [
     ...S.rooms.flatMap((x) =>
       (x.contribs || [])
         .filter((c) => c.by === pid)
         .map((c) =>
           lrow(
             "award",
             h(c.t),
             h(x.name) +
               (c.used ? " · used in " + h(c.used.split(" — ")[0]) : ""),
             pill(c.status, CB_STATES[c.status]) +
               " " +
               L("Open", "room", { id: x.id, tab: "contribs" }),
           ),
         ),
     ),
     ...S.evidence
       .filter((e) => e.owner === pid)
       .map((e) => lrow("file", h(e.title), "Evidence", pill(e.review))),
   ].join("") || empty("award", "No contributions yet", ""),
   "",
   "c6",
 )}</div>`
  );
}
function homeO() {
  const c = ctxId();
  const inv = S.invites.filter((i) => i.ctx === c);
  return (
    head(
      "My PHOENIX",
      `Organization Representative · ${h(S.orgs.find((o) => o.id === me().org)?.name || "")}`,
      B("Organization workspace", "go", { r: "org" }, "btn-p"),
    ) +
    `<div class="g12">
 <div class="c12 g12">${stat("s-purple", "t-purple", "mail", inv.filter((i) => ["Pending", "Resent"].includes(i.status)).length, "Invitations pending", inv.filter((i) => i.status === "Accepted").length + " accepted", "org", { tab: "invites" })}${stat("s-teal", "t-teal", "users", metric("m2"), "Circle participation", "Aggregate", "metrics")}${stat("s-slate", "t-navy", "flag", metric("m6"), "Milestones completed", "Aggregate", "metrics")}${stat("s-mist", "t-slate", "card", S.seatPools.filter((s) => s.sponsor === myId()).reduce((a, s) => a + s.assigned.length, 0) + "/" + S.seatPools.filter((s) => s.sponsor === myId()).reduce((a, s) => a + s.total, 0), "Institution seats", "Assigned / total", "billing")}</div>
 ${card("Circle and " + WL() + " activity", "Aggregate only — no individual participant records", table(["Space", "Type", "State", "Members"], [...S.circles.filter((x) => x.ctx === c).map((x) => [h(x.name), "Circle", pill(x.state), x.members.length]), ...S.rooms.filter((x) => x.ctx === c).map((x) => [h(x.name), WL(), pill(x.state), x.members.length])]), "", "c7")}
 ${card(
   "Aggregated evidence",
   "Approved evidence counts by type",
   table(
     ["Type", "Approved items"],
     Object.entries(
       S.evidence
         .filter((e) => e.review === "Approved")
         .reduce((a, e) => ((a[e.type] = (a[e.type] || 0) + 1), a), {}),
     ).map(([k, v]) => [h(k), v]),
   ),
   "",
   "c5",
 )}</div>`
  );
}
function homeS() {
  const ints = S.interests[myId()] || [];
  const match = sponsorProjects(false);
  const fu = S.funding.filter((f) => f.sponsor === myId());
  const pit = S.pitches.filter((p) => p.to === myId());
  return (
    head(
      "My PHOENIX",
      "Sponsor / Funder · " +
        h(S.orgs.find((o) => o.id === me().org)?.name || ""),
      B("Projects & funding", "go", { r: "funding" }, "btn-p"),
    ) +
    `<div class="g12">${nextCard()}
 ${card("Projects matching your interests", ints.map(h).join(", "), match.map((p) => lrow("folder", h(p.title), "Stage: " + h(stageLabel(p.stage || "—")) + " · " + (p.tags || []).map(h).join(", "), L("View sponsor brief", "funding", { tab: "discover" }))).join("") || empty("folder", "No matching projects", ""), "", "c7")}
 ${card("Pitches received", "", pit.map((p) => lrow("send", cName(p.project), "From " + nm(p.from) + " · " + money("USD", p.amount), pill(p.status))).join("") || empty("send", "No pitches", ""), L("Open", "funding", { tab: "pitches" }), "c5")}
 ${card(
   "Funding and tranche status",
   "",
   table(
     ["Project", "Total", "Tranche 1", "Tranche 2", "Tranche 3"],
     fu.map((f) => [
       cName(f.project),
       money(f.currency, f.total),
       ...f.tranches.map((t) => pill(t.state)),
     ]),
   ),
   "",
   "c7",
 )}
 ${card(
   "Seat utilisation",
   "",
   S.seatPools
     .filter((s) => s.sponsor === myId())
     .map(
       (s) =>
         `<div class="col" style="gap:6px;margin-bottom:12px"><b>${s.assigned.length} of ${s.total} seats assigned</b><div class="bar"><span style="width:${(s.assigned.length / s.total) * 100}%"></span></div><span class="cap">${h(S.contexts.find((c) => c.id === s.ctx).name)} · until ${fmt(s.until)}</span></div>`,
     )
     .join("") || empty("card", "No seat pools", ""),
   "",
   "c5",
 )}
 ${card(
   "Approved outcomes",
   "Aggregate and funder-released only",
   dl([
     [
       "Released Learning Harvests",
       S.harvests.filter((x) => x.release === "Released").length,
     ],
     [
       "Evidence released to funders",
       S.evidence.filter((e) => e.release === "Approved for funder release")
         .length,
     ],
     [
       "Milestones achieved in funded projects",
       S.funding
         .filter((f) => f.sponsor === myId())
         .reduce(
           (a, f) =>
             a +
             (
               byId("rooms", byId("projects", f.project)?.room) || {
                 milestones: [],
               }
             ).milestones.filter((m) => m.status === "Achieved").length,
           0,
         ),
     ],
   ]),
   L("Approved evidence", "evidence"),
   "c7",
 )}
 ${card(
   "Transactions",
   "Read-only",
   table(
     ["Reference", "Product", "State", "Date"],
     S.payments
       .filter((p) => p.pid === myId() && !p.dup)
       .map((p) => [
         h(p.id),
         h(byId("products", p.product)?.name || p.product),
         pill(p.state),
         fmt(p.at),
       ]),
     "No transactions yet.",
   ),
   L("Seats & payments", "billing"),
   "c5",
 )}
 <div class="c12">${banner("info", "What sponsors never receive", "Private participant profiles, Purpose Compass responses, private discussions, mentor notes, AI conversations or unapproved evidence.")}</div></div>`
  );
}
function homeA() {
  const c = ctxId();
  const pend = S.assign.filter((a) => a.status === "Pending role approval");
  const inactive = S.assign.filter(
    (a) =>
      a.ctx === c && a.status === "Active" && !(a.onb.compass && a.onb.profile),
  );
  return (
    head(
      "My PHOENIX",
      `Programme Administrator · ${h(ctx().name)}`,
      B("Programme admin", "go", { r: "admin" }, "btn-p"),
    ) +
    `<div class="g12">
 <div class="c12 g12">${stat("s-purple", "t-purple", "inbox", inboxItems().length, "Review inbox", "Across the programme", "inbox")}${stat("s-teal", "t-teal", "user", pend.length, "Role requests", "Awaiting approval", "admin", { tab: "approvals" })}${stat("s-slate", "t-navy", "alert", S.incidents.filter((i) => i.state !== "Closed").length, "Open incidents", "", "incidents")}${stat("s-mist", "t-slate", "card", S.ents.filter((e) => e.state === "Grace").length, "Payments in grace", "", "billing")}</div>
 ${card(
   "Programme metrics",
   "Starter registry",
   table(
     ["Metric", "Category", "Value", "Governance gate"],
     S.metrics
       .filter((m) => m.status === "Active")
       .map((m) => [
         h(m.name),
         h(m.cat),
         "<b>" + metric(m.id) + "</b>",
         h(m.gate),
       ]),
   ),
   L("All metrics", "metrics"),
   "c7",
 )}
 ${card(
   "Pilot scope and your permissions",
   "",
   dl([
     ["Programme", h(ctx().name) + " · pack " + h(pack().name)],
     ["Scope", "Twelve Alpha epics (E01–E12) and flows F01–F12"],
     ["Your role", ROLE[role()]],
     [
       "Specialist bundles",
       asg()
         .bundles.map((b) => pill(b, "p-grey"))
         .join(" ") || "None",
     ],
     [
       "Effective permission",
       "Identity + scoped role + context + mandate + object permission + consent + lifecycle + entitlement",
     ],
   ]),
   L("Open guidance", "resources"),
   "c12",
 )}
 ${card("Inactive or incomplete users", "Onboarding not finished", inactive.map((a) => lrow("user", nm(a.pid), ROLE[a.role], B("Send reminder", "remind", { pid: a.pid }))).join("") || empty("check", "Everyone is active", ""), "", "c5")}</div>`
  );
}
function homeT() {
  return (
    head(
      "Platform health",
      "Technical operations · no default access to participant content",
    ) +
    `<div class="g12">
 ${card("Integration health", "", S.integrations.map((i) => lrow("link", h(i.name), "", pill(i.status))).join(""), L("Manage", "platform", { tab: "integrations" }), "c6")}
 ${card(
   "Security events",
   "",
   S.security
     .slice(0, 5)
     .map((s) => lrow("lock", h(s.t), fmt(s.at)))
     .join(""),
   L("All", "platform", { tab: "security" }),
   "c6",
 )}
 ${card("Storage and backups", "", S.backups.map((b) => lrow("archive", fmt(b.at), h(b.size), pill(b.status.includes("passed") ? "Completed" : b.status))).join(""), "", "c6")}
 ${card(
   "AI gateway",
   "",
   dl([
     ["Provider", pill(S.settings.aiAvailable ? "Healthy" : "Unavailable")],
     [
       "Quota used",
       S.settings.aiUsed + " of " + S.settings.aiQuota + " requests today",
     ],
     [
       "Refused requests (logged)",
       S.audit.filter((a) => a.a === "AI request refused").length,
     ],
   ]),
   "",
   "c6",
 )}</div>`
  );
}
A.remind = (d) => {
  notify(d.pid, "Reminder: finish setting up your PHOENIX account", "home");
  audit("Reminder sent", d.pid, "");
  toast("Reminder sent to " + P(d.pid).name);
  ok();
};
// Notifications are a dropdown from the bell (views/assist.js).

