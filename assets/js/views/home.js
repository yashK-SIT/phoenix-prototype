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
          inCtx(p) && projDecidable(p) && (stewardOf(p) || r === "A"),
      )
      .forEach((p) =>
        out.push([
          "Project review",
          p.title,
          projAnswered(p) ? "Owner replied to your clarification request" : "Submitted " + fmt(p.submitted),
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
  // Evidence approval needs the Reviewer bundle; a plain Facilitator does not inherit it (BF-05).
  if (hasB("Reviewer"))
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
  if (r === "F")
    S.rooms
      .filter((x) => inCtx(x) && msIsSteward(x))
      .forEach((x) =>
        msPending(x)
          .filter(([, it]) => byId("evidence", it.ev)?.owner !== me_)
          .forEach(([m, it]) =>
            out.push([
              "Milestone evidence",
              byId("evidence", it.ev)?.title || it.ev,
              "For “" + m.t + "” · " + x.name,
              "room",
              { id: x.id, tab: "plan" },
            ]),
          ),
      );
  if (r === "F")
    S.pathways
      .filter((p) => inCtx(p) && p.reviewer === me_ && p.state === "In review")
      .forEach((p) =>
        out.push([
          "Pathway approval",
          p.name,
          "From " + P(p.by).name,
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
          "admin",
          { tab: "ai" },
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
          { tab: "users" },
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
            eligibleVoter(c, pid, p),
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
      // pathway step rules (FR-F04): a recommendation waiting for the participant first, then the deterministic
      // next step — the lowest-numbered required step whose prerequisites are complete
      const ri = cur.steps.findIndex((s) => s.rec && s.rec.status === "Awaiting participant" && !pwClosed(s));
      if (ri >= 0)
        return [`Accept or decline a recommendation for step ${ri + 1}`, `${nm(cur.steps[ri].rec.by)} recommends that prior evidence satisfies “${h(cur.steps[ri].t)}”. Nothing changes unless you accept.`, "pathway", {}];
      const i = pwNext(cur);
      if (i >= 0)
        return [
          cur.steps[i].type === "Conditional" && !cur.steps[i].applies ? `Check whether step ${i + 1} of your pathway applies` : `Complete step ${i + 1} of your pathway`,
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
    // BF-01: only surface Mentor Requests that belong to the active context
    const m = S.mentorReqs.find((x) => x.to === pid && x.status === "Pending" && mentorReqVisible(x));
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
    // Sponsor Alpha (BF-08): invoices, seats and funder-safe reporting only.
    const inv = S.payments.find(
      (p) => p.pid === pid && p.state === "Invoice due",
    );
    if (inv)
      return [
        "Invoice due",
        h(inv.ref || inv.id) +
          (inv.due ? " · due " + fmt(inv.due) : "") +
          (inv.note ? " · " + h(inv.note) : ""),
        "funding",
        { tab: "invoices" },
      ];
    const exp = S.seatPools.find(
      (s) =>
        s.sponsor === pid &&
        s.status === "Active" &&
        s.until >= today() &&
        (new Date(s.until) - new Date(today())) / 864e5 <= 60,
    );
    if (exp)
      return [
        "Seats expiring soon",
        exp.total + " sponsored seats end on " + fmt(exp.until) + ".",
        "funding",
        { tab: "seats" },
      ];
    if (sponsorCleared().length || funderHarvests().length)
      return [
        "Funder-safe report ready",
        "Approved evidence summaries and programme signals cleared for your reporting.",
        "funding",
        { tab: "reports" },
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
            (ms.filter(msReady).length /
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
        u = sp.reduce((a, s) => a + (s.assignedCount ?? s.assigned.length), 0);
      return t ? Math.round((u / t) * 100) + "%" : "No data yet";
    }
  }
  return "—";
}
// One figure in the summary strip (.kpis). Linked figures open the place where the work is.
const stat = (cls, tile, icon, num, title, sub, r, p) =>
  `<a href="#" class="kpi hm-kpi" data-a="go" data-r="${r || "home"}"${attr(p)}><span class="hm-kpi-l"><span class="hm-kpi-ic ${tile}" aria-hidden="true">${ic(icon, 14)}</span>${title}</span><span class="hm-kpi-n">${num}</span>${sub ? `<span class="cap">${sub}</span>` : ""}</a>`;
// A figure that only reports (no destination).
const hmFig = (tile, icon, num, title, sub) =>
  `<div class="kpi hm-kpi"><span class="hm-kpi-l"><span class="hm-kpi-ic ${tile}" aria-hidden="true">${ic(icon, 14)}</span>${title}</span><span class="hm-kpi-n">${num}</span>${sub ? `<span class="cap">${sub}</span>` : ""}</div>`;
const hmStrip = (items, label) =>
  `<div class="kpis hm-strip" style="--hm-cols:${Math.max(items.length, 1)}" role="group" aria-label="${label || "Summary"}">${items.join("")}</div>`;
const lrow = (icon, title, sub, right = "", tile = "t-soft") =>
  `<div class="lrow"><span class="tile ${tile}">${ic(icon, 18)}</span><div class="lt"><b>${title}</b>${sub ? `<p class="cap">${sub}</p>` : ""}</div>${right}</div>`;
// Row used on My PHOENIX, Profile and Pathway: compact tile, text that takes the space, actions grouped on the right.
const hrow = (icon, title, sub, right = "", tile = "t-soft") =>
  `<div class="lrow hm-row"><span class="tile ${tile}" aria-hidden="true">${ic(icon, 16)}</span><div class="lt"><b>${title}</b>${sub ? `<p class="cap">${sub}</p>` : ""}</div>${right ? `<div class="hm-row-r">${right}</div>` : ""}</div>`;
// Page frame: optional top band, summary strip, then main column and side rail.
const hmCols = (main, rail) =>
  `<div class="hm-cols"><div class="hm-main">${main}</div>${rail ? `<div class="hm-rail">${rail}</div>` : ""}</div>`;
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
  return `<section class="card accent hm-next${rt === "home" ? " is-clear" : ""}" aria-labelledby="hm-next-t"><div class="hm-next-b"><span class="over">Next action</span><h2 class="h2" id="hm-next-t">${t}</h2><p class="muted">${s}</p></div>${rt !== "home" ? `<div class="hm-next-a">${B("Open" + ic("arrow", 16), "go", { r: rt, ...p }, "btn-p")}</div>` : ""}</section>`;
}
// An agreement version published for a future date is announced, not enforced, until it takes effect (route E).
function upcomingAgr() {
  const g = agrUpcoming(ctxId(), role());
  return g
    ? banner("info", `${h(g.type)} v${g.ver} takes effect on ${fmt(g.effective)}`, `${h(g.summary || "")} Nothing is paused before then. ${L("Review it now", "privacy", { tab: "consent" })}`) + '<div style="height:12px"></div>'
    : "";
}
// Render a Doc1 Table 28 continuum rail. `stages`: [{k, done, r, p?, meta}]
function journeyRail(aria, title, sum, stages) {
  const curIdx = stages.findIndex((s) => !s.done);
  stages.forEach((s, i) => {
    s.cur = curIdx < 0 ? i === stages.length - 1 : i === curIdx;
  });
  return `<section class="journey" aria-label="${h(aria)}"><div class="jhead"><span class="jtitle">${ic("route", 15)}${h(title)}</span><span class="cap jsum">${h(sum)}</span></div><ol class="jsteps">${stages
    .map((s) => {
      const st = s.done && !s.cur ? "done" : s.cur ? "cur" : "todo";
      const lab = s.r ? L(s.k, s.r, s.p || {}, "lnk") : h(s.k);
      return `<li class="jstep ${st}"${s.cur ? ' aria-current="step"' : ""}><div class="jbody"><span class="jlabel">${lab}</span><span class="cap jmeta">${h(s.meta)}</span></div></li>`;
    })
    .join("")}</ol></section>`;
}
// Role-shaped A→Z continuum (Doc 1 §6 + Table 28). Not Mary-only — every demo role gets a walkable flow rail.
function roleJourney() {
  const pid = myId();
  const r = role();
  const a = asg();
  const onb = a?.onb || {};
  if (r === "P") {
    const authorized = !!(onb.agreement && onb.consents && onb.profile && onb.compass);
    const connected =
      myCircles().length + myRopes().length > 0 ||
      S.matches.some((m) => (m.a === pid || m.b === pid) && ["Awaiting consent", "Introduced"].includes(m.status));
    const pw = S.pathways.find((p) => p.pid === pid && inCtx(p) && p.state === "Current");
    const oriented = !!pw;
    const deliberated = myCircles().some((c) => (c.decisions || []).length > 0 || (c.polls || []).some((p) => p.votes?.[pid] != null));
    const acted = myRooms().length > 0;
    const evidenced = S.evidence.some((e) => e.owner === pid && inCtx(e));
    const learned =
      S.harvests.some((hv) => (hv.contrib || []).some((c) => c.by === pid)) ||
      (pw && (pw.steps || []).some((s) => /harvest|reflection/i.test(s.t) && s.done));
    const evolved = S.candidates.some((c) => c.pid === pid && ["Accepted", "Edited"].includes(c.status));
    return journeyRail(
      "Your PHOENIX journey",
      "Your journey",
      "Authorize → Evolve · Participant continuum",
      [
        { k: "Authorize", done: authorized, r: "privacy", p: { tab: "consent" }, meta: authorized ? "Agreements & consent on file" : "Finish agreements & consent" },
        { k: "Connect", done: connected, r: "matches", meta: connected ? "Circles, Rope Teams or Match Briefs" : "Join a space or review a Match Brief" },
        { k: "Orient", done: oriented, r: "pathway", meta: oriented ? h(pw.name) : "Accept a learning pathway" },
        { k: "Deliberate", done: deliberated, r: "circles", meta: deliberated ? "Circle decisions on record" : "Vote or decide in a Circle" },
        { k: "Act", done: acted, r: "rooms", meta: acted ? myRooms().length + " " + WL() + (myRooms().length === 1 ? "" : "s") : "Work in an " + WL() },
        { k: "Evidence", done: evidenced, r: "evidence", meta: evidenced ? "Evidence submitted" : "Upload first evidence" },
        { k: "Learn", done: learned, r: "harvests", meta: learned ? "Harvest contribution recorded" : "Contribute to a Learning Harvest" },
        { k: "Evolve", done: evolved, r: "profile", p: { tab: "cand" }, meta: evolved ? "Profile updated from candidates" : "Review profile change candidates" },
      ],
    );
  }
  if (r === "M") {
    const reqs = S.mentorReqs.filter((m) => m.to === pid && mentorReqVisible(m));
    const accepted = reqs.some((m) => m.status === "Accepted") || myRopes().some((rt) => rt.mentor === pid);
    const pending = reqs.some((m) => m.status === "Pending");
    const sharedPw = S.pathways.some((p) => inCtx(p) && (p.by === pid || myRopes().some((rt) => memberOf(rt, p.pid))));
    const reviewed = myRopes().some((rt) => (rt.reviews || []).some((v) => v.status !== "Awaiting review"));
    const supported = myRopes().some((rt) => (rt.support || []).some((s) => s.status === "Resolved"));
    return journeyRail("Mentor flow", "Your mentoring flow", "Requests → Rope Teams → pathway & support (Doc 1 §6.2)", [
      { k: "Requests", done: accepted || !pending, r: "ropeteams", meta: pending ? "Mentor Request waiting" : accepted ? "Request accepted" : "No open requests" },
      { k: "Rope Teams", done: myRopes().some((rt) => rt.mentor === pid), r: "ropeteams", meta: myRopes().filter((rt) => rt.mentor === pid).length + " assigned" },
      { k: "Shared pathway", done: sharedPw, r: "pathway", meta: sharedPw ? "Pathway visible for assigned people" : "Open a shared pathway when linked" },
      { k: "Review work", done: reviewed, r: "ropeteams", meta: reviewed ? "Reviews on record" : "Awaiting shared work to review" },
      { k: "Support", done: supported, r: "messages", meta: supported ? "Support closed" : "Respond to open support needs" },
    ]);
  }
  if (r === "F") {
    const circles = myCircles().length > 0;
    const inbox = typeof inboxItems === "function" ? inboxItems().length === 0 : true;
    const briefs = !S.matches.some((m) => m.steward === pid && ["In steward review", "Clarification requested"].includes(m.status));
    const linked = myRooms().length > 0;
    const hv = S.harvests.some((h) => h.by === pid || (h.scope && myCircles().some((c) => c.id === h.scope)));
    const stages = [
      { k: "Circles", done: circles, r: "circles", meta: circles ? myCircles().length + " active" : "Facilitate a Circle" },
      { k: "Reviews", done: inbox, r: "inbox", meta: inbox ? "Inbox clear" : "Items in Review inbox" },
      { k: "Match Briefs", done: briefs, r: "matches", meta: briefs ? "No briefs waiting" : "Steward review due" },
      { k: "Linked work", done: linked, r: "rooms", meta: linked ? myRooms().length + " linked " + WL() + "s" : "Link an " + WL() },
      { k: "Harvests", done: hv, r: "harvests", meta: hv ? "Harvest in progress or done" : "Complete a Learning Harvest" },
    ];
    if (hasB("Reviewer")) {
      const evQ = S.evidence.filter((e) => e.review === "Submitted" && e.owner !== pid && inCtx(e)).length === 0;
      stages.push({ k: "Evidence", done: evQ, r: "evidence", p: { tab: "queue" }, meta: evQ ? "Review queue clear" : "Evidence awaiting Reviewer" });
    }
    return journeyRail("Facilitator flow", "Your steward flow", "Circles → reviews → linked work → Harvest (Doc 1 §6.3)", stages);
  }
  if (r === "C") {
    const mandate = !!(a.mandate && a.mandate.valid && a.mandate.until >= today());
    const cards = S.cards.some((c) => c.owner === pid && c.status === "Active");
    const mb = S.matches.some((m) => (m.a === pid || m.b === pid) && ["Awaiting consent", "Introduced"].includes(m.status));
    const rooms = myRooms().length > 0;
    const ev = S.evidence.some((e) => e.owner === pid) || myRooms().some((x) => (x.contribs || []).some((c) => c.by === pid));
    return journeyRail("Partner flow", "Your collaboration flow", "Mandate → opportunities → workspaces → evidence (Doc 1 §6.4)", [
      { k: "Mandate", done: mandate, r: "mandate", meta: mandate ? "Active mandate on file" : "Mandate required for binding commitments" },
      { k: "Opportunities", done: cards, r: "opportunities", meta: cards ? "Active card published" : "Publish a need or offer" },
      { k: "Match Briefs", done: mb, r: "matches", meta: mb ? "Brief in progress or introduced" : "Await a steward-approved brief" },
      { k: WL() + "s", done: rooms, r: "rooms", meta: rooms ? "Active in " + myRooms().length : "Join an " + WL() },
      { k: "Evidence", done: ev, r: "evidence", meta: ev ? "Contribution or evidence on record" : "Submit a contribution" },
    ]);
  }
  if (r === "O") {
    const people = S.assign.some((x) => x.ctx === ctxId() && x.status === "Active");
    const inv = S.invites.some((i) => i.ctx === ctxId());
    const spaces = S.circles.some((c) => c.ctx === ctxId()) || S.rooms.some((x) => x.ctx === ctxId());
    const pend = !S.assign.some((x) => x.ctx === ctxId() && x.status === "Pending role approval");
    return journeyRail("Organisation flow", "Your organisation flow", "People → invitations → spaces → progress (Doc 1 §6.5)", [
      { k: "People", done: people, r: "org", p: { tab: "users" }, meta: "Cohort in this context" },
      { k: "Invitations", done: inv, r: "org", p: { tab: "invites" }, meta: inv ? "Invites on file" : "Invite people into the programme" },
      { k: "Role requests", done: pend, r: "org", p: { tab: "users" }, meta: pend ? "No pending approvals" : "Approve pending role requests" },
      { k: "Spaces", done: spaces, r: "org", p: { tab: "spaces" }, meta: spaces ? "Scoped spaces visible" : "No spaces yet" },
      { k: "Progress", done: true, r: "metrics", meta: "Aggregate programme progress" },
      { k: "Reports", done: true, r: "org", p: { tab: "reports" }, meta: "Organisation reports" },
    ]);
  }
  if (r === "S") {
    const seats = (typeof myPools === "function" ? myPools() : []).some((s) => s.status === "Active");
    const inits = S.initiatives.some((i) => i.status === "Published") || (typeof sponsorInitProjects === "function" && sponsorInitProjects().length);
    const cleared = typeof sponsorCleared === "function" && sponsorCleared().length > 0;
    const due = !S.payments.some((p) => p.pid === pid && p.state === "Invoice due");
    return journeyRail("Sponsor flow", "Your sponsorship flow", "Seats → initiatives → safe reports → invoices (Doc 1 §6.6 · BF-08)", [
      { k: "Seats", done: seats, r: "funding", p: { tab: "seats" }, meta: seats ? "Active seat pool" : "Buy seats by invoice" },
      { k: "Initiatives", done: !!inits, r: "funding", p: { tab: "initiatives" }, meta: inits ? "Approved initiatives visible" : "Awaiting published initiatives" },
      { k: "Evidence", done: !!cleared, r: "evidence", meta: cleared ? "Cleared summaries available" : "No funder-cleared evidence yet" },
      { k: "Reports", done: !!cleared || (typeof funderHarvests === "function" && funderHarvests().length > 0), r: "funding", p: { tab: "reports" }, meta: "Funder-safe aggregate reports" },
      { k: "Invoices", done: due, r: "funding", p: { tab: "invoices" }, meta: due ? "Nothing outstanding" : "Invoice due" },
    ]);
  }
  if (r === "A") {
    const packs = !!(S.packs && S.packs.length);
    const tpl = S.templates.some((t) => t.status === "Approved");
    const queue =
      S.projects.filter((p) => inCtx(p) && p.status === "Submitted" && !(p.stewards || []).length).length +
        S.pathways.filter((p) => inCtx(p) && typeof pwNeedsSteward === "function" && pwNeedsSteward(p)).length ===
      0;
    const rolesOk = !S.assign.some((x) => x.ctx === ctxId() && x.status === "Pending role approval");
    const vers = (S.configVersions || []).length > 0;
    return journeyRail("Admin flow", "Your programme operations", "Queues → people → packs → versions (Doc 1 §6.7)", [
      { k: "Approval inbox", done: queue, r: "admin", p: { tab: "requests" }, meta: queue ? "No unassigned reviews" : "Assign reviewers" },
      { k: "Users & roles", done: rolesOk, r: "admin", p: { tab: "users" }, meta: rolesOk ? "No pending role approvals" : "Role requests waiting" },
      { k: "Invitations", done: S.invites.some((i) => i.ctx === ctxId()), r: "admin", p: { tab: "invites" }, meta: "Programme invitations" },
      { k: "Packs", done: packs, r: "admin", p: { tab: "packs" }, meta: packs ? "Pack configuration live" : "Configure a pack" },
      { k: "Templates", done: tpl, r: "admin", p: { tab: "library" }, meta: tpl ? "Approved templates" : "Approve pathway templates" },
      { k: "Announce", done: (S.announcements || []).some((x) => x.ctx === ctxId()), r: "admin", p: { tab: "notify" }, meta: "Send to Explore board audience" },
      { k: "Versions", done: vers, r: "admin", p: { tab: "versions" }, meta: vers ? "Config versions on file" : "Save a configuration version" },
    ]);
  }
  if (r === "T") {
    const healthy = S.integrations.every((i) => ["Healthy", "Configured"].includes(i.status));
    const backup = (S.backups || []).some((b) => /Completed|passed/i.test(b.status));
    return journeyRail("Platform flow", "System health & recovery", "Contexts → roles → integrations → backups (Doc 1 §6.8)", [
      { k: "Contexts", done: S.contexts.length > 0, r: "tenants", meta: S.contexts.length + " contexts" },
      { k: "Roles & bundles", done: (S.roles || []).length > 0, r: "roles", meta: "Role matrix available" },
      { k: "Integrations", done: healthy, r: "platform", p: { tab: "integrations" }, meta: healthy ? "All operating" : "Integration needs attention" },
      { k: "Security", done: (S.security || []).length > 0, r: "platform", p: { tab: "security" }, meta: "Security events logged" },
      { k: "Backups", done: backup, r: "platform", p: { tab: "storage" }, meta: backup ? "Recent backup OK" : "Run or verify a backup" },
      { k: "Audit", done: true, r: "audit", meta: "Technical audit log" },
    ]);
  }
  return "";
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
        hrow(
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
        hrow(
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
          p.status === "Open" && p.votes[pid] == null && eligibleVoter(c, pid, p),
      )
      .forEach((p) =>
        pend.push(
          hrow(
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
        hrow(
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
        hrow(
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
        hrow(
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
    upcomingAgr() +
    `<div class="hm">
 <div class="hm-top">
 <section class="card hm-ns" aria-labelledby="hm-ns-t"><div class="hm-ns-h"><span class="over" id="hm-ns-t">My purpose / current direction</span><span class="row hm-ns-tools"><span class="vis">${ic("lock", 14)}Only you</span>${B(ic("edit", 14) + "Edit", "go", { r: "profile", tab: "compass" }, "btn-g btn-sm", 'aria-label="Edit Purpose Compass"')}</span></div><p class="hm-ns-q${cp.PC2 ? "" : " is-unset"}">${cp.PC2 ? "“" + h(cp.PC2) + "”" : "Set your goal in the Purpose Compass."}</p><dl class="hm-ns-facts"><div><dt>What matters most</dt><dd>${h(cp.PC1 || "—")}</dd></div><div><dt>First milestone</dt><dd>${h(cp.PC5 || "—")}</dd></div></dl><p class="cap hm-ns-n">Your current direction for this programme.</p></section>
 ${nextCard()}</div>
 ${hmStrip([stat("s-purple", "t-purple", "folder", projects.length, "My projects", projects.filter((p) => p.status === "Clarification requested").length + " need clarification", "projects"), stat("s-teal", "t-teal", "users", myCircles().length + myRopes().length + myRooms().length, "Collaborations", `${myCircles().length} Circle${myCircles().length === 1 ? "" : "s"} · ${myRopes().length} Rope Team${myRopes().length === 1 ? "" : "s"} · ${myRooms().length} ${WL()}${myRooms().length === 1 ? "" : "s"}`, "circles"), stat("s-slate", "t-navy", "flag", pend.length, "Pending decisions", "Nothing takes effect until you decide", "home"), stat("s-mist", "t-soft", "award", ev.filter((e) => e.review === "Approved").length, "Evidence approved", ev.filter((e) => e.review === "Submitted").length + " awaiting review", "evidence")], "Your summary")}
 ${roleJourney()}
 ${hmCols(
   `${myTasksCard()}
 ${card("Pending decisions", "Nothing below takes effect until you decide.", pend.length ? pend.join("") : empty("check", "You are all caught up", "Profile suggestions, match consents, votes and release requests appear here."), pend.length ? `<span class="cnt">${pend.length}</span>` : "", "hm-list")}
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
   "hm-tbl",
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
   "hm-tbl",
 )}`,
   `${card("My pathway", pw ? h(pw.name) : "", pw ? `<div class="hm-prog"><div class="progress"><span class="bar" style="width:${(pwProg(pw).n / pw.steps.length) * 100}%"></span></div><span class="cap">${pwProg(pw).n} of ${pw.steps.length}</span></div><ol class="hm-steps">${pw.steps.map((s, i) => { const x = pwStepState(pw, i); return `<li class="${pwClosed(s) ? "done" : x.st === "Current" ? "cur" : ""}"><span class="hm-step-m" aria-hidden="true">${pwClosed(s) ? ic("check", 12) : i + 1}</span><span class="hm-step-t"><b>${h(s.t)}</b><span class="cap">${h(s.type || "Mandatory")} · ${x.st === "Current" ? "Next step" : h(x.st)}${x.st === "Blocked" ? " — " + h(x.why) : ""}${s.rec && s.rec.status === "Awaiting participant" && !pwClosed(s) ? " · recommendation waiting for you" : ""}</span></span></li>`; }).join("")}</ol>` : empty("route", "No current pathway", "A facilitator or mentor may propose one. You decide whether to accept it."), pw ? L("Open", "pathway") : "", "hm-list")}
 ${card("Collaborations", "In this context", [...myCircles().map((c) => hrow("users", h(c.name), "Circle · " + c.members.length + " members" + (unreadIn(c) ? " · " + unreadIn(c) + " unread" : ""), unr(c) + pill(c.state) + " " + L("Open", "circle", { id: c.id }), "t-purple")), ...myRopes().map((c) => hrow("route", h(c.name), "Rope Team · mentor " + (c.mentor ? nm(c.mentor) : "—") + (unreadIn(c) ? " · " + unreadIn(c) + " unread" : ""), unr(c) + pill(c.state) + " " + L("Open", "rope", { id: c.id }), "t-teal")), ...myRooms().map((c) => hrow("room", h(c.name), WL(), pill(c.state) + " " + L("Open", "room", { id: c.id }), "t-navy"))].join("") || empty("users", "No collaborations yet", "When a steward accepts your project, they create a Circle and invite you."), "", "hm-list")}
 ${card("Opportunities for you", "Cards visible to you", opps.map((c) => hrow("megaphone", h(c.title), h(c.kind) + " · expires " + fmt(c.expires), L("View", "card", { id: c.id }))).join("") || empty("megaphone", "No open opportunities", "New cards for your audience appear here."), L("Browse", "opportunities"), "hm-list")}
 <section class="card hm-ask"><div class="hm-ask-h"><span class="tile t-soft" aria-hidden="true">${ic("sparkle", 18)}</span><div><b>Ask PHOENIX</b><p class="cap">${consent(pid, "ai") === "Granted" ? "Private answers from approved sources. Nothing is saved to your record." : `AI processing is off for you, so Ask PHOENIX is unavailable. Everything else keeps working. You can change this in ${L("My records & consent", "privacy", { tab: "consent" })}.`}</p></div></div>${consent(pid, "ai") === "Granted" ? B("What should I do next to reach my milestone?", "askPreset", { q: "What should I do next to reach my milestone?" }, "btn-s") : `<button type="button" class="btn btn-s" disabled title="AI processing is off for you">What should I do next to reach my milestone?</button>`}</section>`,
 )}</div>`
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
  const msMine = S.rooms
    .filter((x) => inCtx(x) && msIsSteward(x))
    .flatMap((x) => msPending(x).map(([m, it]) => [x, m, it]))
    .filter(([, , it]) => byId("evidence", it.ev)?.owner !== pid);
  const attention = S.ropes
    .filter((r) => inCtx(r) && memberOf(r))
    .flatMap((r) =>
      Object.entries(r.indicators || {})
        .filter(
          ([k, v]) => v.pacing !== "On track" || v.support !== "None reported",
        )
        .map(([k, v]) =>
          hrow(
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
        hrow(
          "calendar",
          h(x.t),
          nm(x.by) + " · due " + fmt(x.due) + " · " + h(c.name),
        ),
      ),
  );
  const concerns = myCircles().flatMap((c) =>
    c.concerns
      .filter((x) => x.status !== "Resolved")
      .map((x) => hrow("alert", h(x.t), h(c.name) + " · " + h(x.status))),
  );
  return (
    head(
      "My PHOENIX",
      `Facilitator / Steward · ${h(ctx().name)}`,
      B("Review inbox", "go", { r: "inbox" }, "btn-p"),
    ) +
    `<div class="hm">
 <div class="hm-top">
 <section class="card hm-ns hm-purpose" aria-labelledby="hm-pp-t"><span class="over" id="hm-pp-t">Programme purpose</span><p class="hm-ns-q">${h(ctx().name)}: move climate ideas from learning to accountable local action.</p><div class="hm-spaces">${[["Circles", myCircles().length, "circles", "t-purple", "users"], ["Rope Teams", S.ropes.filter((r) => inCtx(r) && memberOf(r)).length, "ropeteams", "t-teal", "route"], [WL() + "s", myRooms().length, "rooms", "t-navy", "room"]].map(([l, n, r, t, i]) => `<a href="#" data-a="go" data-r="${r}"><span class="tile ${t}" aria-hidden="true">${ic(i, 16)}</span><b>${n}</b><span>${l}</span></a>`).join("")}</div><p class="cap hm-ns-n">Spaces you facilitate or belong to in this programme.</p></section>${nextCard()}</div>
 ${hmStrip([stat("s-purple", "t-purple", "folder", subs.length, "Project submissions", "Awaiting review or clarification", "projects"), stat("s-teal", "t-teal", "link", S.matches.filter((m) => m.steward === pid && m.status === "In steward review").length, "Match Briefs", "Awaiting your review", "matches"), ...(hasB("Reviewer") ? [stat("s-slate", "t-navy", "award", S.evidence.filter((e) => e.review === "Submitted" && e.owner !== pid && inCtx(e)).length, "Evidence to review", "Reviewer bundle · set status and E0–E4", "evidence", { tab: "queue" })] : msMine.length ? [stat("s-slate", "t-navy", "award", msMine.length, "Milestone evidence", "Comment only — approval needs the Reviewer bundle", "evidence", { tab: "queue" })] : []), stat("s-mist", "t-soft", "route", S.pathways.filter((x) => x.reviewer === pid && x.state === "In review").length, "Pathways to review", "Assigned to you", "pathway")], "Your review queue")}
 ${roleJourney()}
 ${hmCols(
   `${myTasksCard()}
 ${msMine.length ? card("Milestone evidence", hasB("Reviewer") ? "Approve every piece before you validate the milestone." : "You can comment as Facilitator / Steward. Approving evidence needs the Reviewer bundle.", msMine.map(([x, m, it]) => lrow("award", h(byId("evidence", it.ev)?.title || it.ev), "For “" + h(m.t) + "” · " + h(x.name) + " · added by " + nm(it.by), B(hasB("Reviewer") ? "Review" : "Open", "msRev", { r: x.id, id: m.id, i: msItems(m).indexOf(it) }, hasB("Reviewer") ? "btn-p btn-sm" : "btn-s btn-sm"))).join(""), hasB("Reviewer") ? L("Review queue", "evidence", { tab: "queue" }) : "", "hm-list") : ""}
 ${card("Project submissions", "", subs.map((p) => hrow("folder", h(p.title), nm(p.owner) + " · " + pill(p.status) + (projAnswered(p) ? " " + pill("Owner replied", "p-navy") : ""), L("Review", "project", { id: p.id }))).join("") || empty("check", "No submissions waiting", ""), subs.length ? `<span class="cnt">${subs.length}</span>` : "", "hm-list")}
 ${card("Upcoming commitments", "", commits.join("") || empty("calendar", "No open commitments", ""), commits.length ? `<span class="cnt">${commits.length}</span>` : "", "hm-list")}`,
   `${card("Participants needing attention", "From Rope Team support indicators (activity-derived or participant-reported)", attention.join("") || empty("users", "No one flagged", ""), "", "hm-list")}
 ${card("Unresolved concerns", "", concerns.join("") || empty("shield", "No unresolved concerns", ""), concerns.length ? `<span class="cnt">${concerns.length}</span>` : "", "hm-list")}`,
 )}</div>`
  );
}
function homeM() {
  // only requests that belong to the active context (BF-01)
  const reqs = S.mentorReqs.filter((m) => m.to === myId() && mentorReqVisible(m));
  const review = myRopes()
    .filter((rt) => rt.mentor === myId())
    .flatMap((rt) =>
      (rt.reviews || [])
        .filter((v) => v.status === "Awaiting review")
        .map((v) =>
          hrow(
            "file",
            h(v.title),
            nm(v.by) + " · " + h(rt.name) + " · " + fmt(v.at),
            B("Review", "go", { r: "rope", id: rt.id, tab: "reviews" }),
          ),
        ),
    );
  const support = myRopes().flatMap((r) =>
    r.support
      .filter((s) => s.status !== "Resolved")
      .map((s) =>
        hrow(
          "message",
          h(s.t),
          nm(s.by) + " · " + h(r.name),
          pill(s.status),
        ),
      ),
  );
  return (
    head(
      "My PHOENIX",
      `Mentor / Advisor · ${h(ctx().name)}`,
      B(ic("message", 16) + "Messages", "go", { r: "messages" }, "btn-s"),
    ) +
    `<div class="hm">
 <div class="hm-top solo">${nextCard()}</div>
 ${hmStrip([hmFig("t-soft", "file", review.length, "Work awaiting your review", "From your Rope Teams"), hmFig("t-soft", "route", reqs.filter((m) => m.status === "Pending").length, "Mentor Requests", "Waiting for your answer"), hmFig("t-teal", "users", myRopes().length, "Assigned Rope Teams", ""), hmFig("t-soft", "message", support.length, "Open support requests", "")], "Your mentoring summary")}
 ${roleJourney()}
 ${hmCols(
   `${myTasksCard()}
 ${card(
   "Work awaiting your review",
   "Shared by participants in your Rope Teams",
   review.join("") ||
     empty(
       "check",
       "Nothing waiting",
       "Participants share work for your review from their Rope Team.",
     ),
   "",
   "hm-list",
 )}
 ${card("Mentor Requests", "", reqs.map((m) => hrow("route", h(m.need), "From " + nm(m.from) + " · " + cName(m.project) + (m.hours ? " · " + h(m.hours) : ""), pill(m.status) + " " + B("Details", "mrDetails", { id: m.id }) + (m.status === "Pending" ? B("Decline", "mentorReq", { id: m.id, v: "Declined" }) + B("Accept", "mentorReq", { id: m.id, v: "Accepted" }, "btn-p btn-sm") : ""))).join("") || empty("route", "No requests", ""), "", "hm-list")}
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
   "hm-tbl",
 )}`,
   `${card(
   "Assigned Rope Teams",
   "",
   myRopes()
     .map((r) =>
       hrow(
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
   "hm-list",
 )}
 ${card(
   "Open support requests",
   "",
   support.join("") || empty("check", "None open", ""),
   "",
   "hm-list",
 )}
 ${card(
   "Concerns you raised",
   "Escalated with appropriate confidentiality",
   (S.mentorConcerns || [])
     .filter((x) => x.by === myId())
     .map((x) =>
       hrow(
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
   "hm-list",
 )}`,
 )}</div>`
  );
}
function homeC() {
  const pid = myId();
  const cards = S.cards.filter((c) => c.owner === pid);
  const mb = S.matches.filter((m) => m.a === pid || m.b === pid);
  const contribs = [
    ...S.rooms.flatMap((x) =>
      (x.contribs || [])
        .filter((c) => c.by === pid)
        .map((c) =>
          hrow(
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
      .map((e) => hrow("file", h(e.title), "Evidence", pill(e.review))),
  ];
  return (
    head(
      "My PHOENIX",
      `Partner / Collaborator · ${h(S.orgs.find((o) => o.id === me().org)?.name || "")}`,
      B(ic("plus", 16) + "Publish a card", "go", { r: "newcard" }, "btn-p"),
    ) +
    `<div class="hm">
 <div class="hm-top solo">${nextCard()}</div>
 ${hmStrip([hmFig("t-soft", "megaphone", cards.length, "Published cards", cards.filter((c) => c.status === "Active").length + " active"), hmFig("t-soft", "link", mb.length, "Match Briefs and invitations", ""), hmFig("t-navy", "room", myRooms().length, WL() + "s", ""), hmFig("t-soft", "award", contribs.length, "Contributions and history", "")], "Your partnership summary")}
 ${roleJourney()}
 ${hmCols(
   `${myTasksCard()}
 ${card("Published cards", "", cards.map((c) => hrow("megaphone", h(c.title), h(c.kind) + " · " + fmt(c.expires), pill(c.status) + " " + L("Open", "card", { id: c.id }))).join("") || empty("megaphone", "No cards", ""), "", "hm-list")}
 ${card("Match Briefs and invitations", "Awaiting your consent", mb.map((m) => hrow("link", nm(m.a === pid ? m.b : m.a), m.status, L("Open", "match", { id: m.id }))).join("") || empty("link", "None", ""), "", "hm-list")}
 ${card(
   "Contributions and history",
   "Work you submitted against a defined responsibility, and how accepted contributions were used",
   contribs.join("") || empty("award", "No contributions yet", ""),
   "",
   "hm-list",
 )}`,
   `${card(
   "Mandate",
   "",
   (asg().mandate
     ? dl([
         ["Status", pill(asg().mandate.valid ? "Active" : "Expired")],
         ["Scope", h(asg().mandate.scope)],
         ["Valid until", fmt(asg().mandate.until)],
       ])
     : `<p class="muted">No mandate on file</p>`) +
     `<div class="row wrap hm-acts">${B(ic("edit", 14) + "Organization profile", "orgEdit")}${B("Request cross-organization sharing", "xoNew")}</div>`,
   "",
   "hm-list",
 )}
 ${card(
   WL() + "s",
   "",
   myRooms()
     .map((r) =>
       hrow(
         "room",
         h(r.name),
         "",
         pill(r.state) + " " + L("Open", "room", { id: r.id }),
         "t-navy",
       ),
     )
     .join("") || empty("room", "None", ""),
   "",
   "hm-list",
 )}`,
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
      B("People & cohorts", "go", { r: "org", tab: "users" }, "btn-p"),
    ) +
    `<div class="hm">
 ${hmStrip([stat("s-purple", "t-purple", "mail", inv.filter((i) => ["Pending", "Resent"].includes(i.status)).length, "Invitations pending", inv.filter((i) => i.status === "Accepted").length + " accepted", "org", { tab: "invites" }), stat("s-teal", "t-teal", "users", metric("m2"), "Circle participation", "Aggregate", "metrics"), stat("s-slate", "t-navy", "flag", metric("m6"), "Milestones completed", "Aggregate", "metrics"), stat("s-mist", "t-soft", "card", S.seatPools.filter((s) => s.sponsor === myId()).reduce((a, s) => a + s.assigned.length, 0) + "/" + S.seatPools.filter((s) => s.sponsor === myId()).reduce((a, s) => a + s.total, 0), "Institution seats", "Assigned / total", "org")], "Your organization summary")}
 ${roleJourney()}
 ${hmCols(
   card("Circle and " + WL() + " activity", "Aggregate only — no individual participant records", table(["Space", "Type", "State", "Members"], [...S.circles.filter((x) => x.ctx === c).map((x) => [h(x.name), "Circle", pill(x.state), x.members.length]), ...S.rooms.filter((x) => x.ctx === c).map((x) => [h(x.name), WL(), pill(x.state), x.members.length])]), "", "hm-tbl"),
   card(
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
     "hm-tbl",
   ),
 )}</div>`
  );
}
function homeS() {
  // Sponsor Alpha (BF-08, Doc 1 §6.6): seats, approved initiatives, approved evidence summaries, funder-safe
  // reports and invoices. Aggregate only; counts below 5 are suppressed (helpers in funding.js).
  const seats = myPools();
  const live = seats.filter((s) => s.status === "Active");
  const tot = live.reduce((a, s) => a + s.total, 0);
  const act = live.reduce((a, s) => a + poolActive(s), 0);
  const ev = sponsorCleared();
  const hv = funderHarvests();
  const projs = sponsorInitProjects();
  const inits = S.initiatives.filter((i) => i.status === "Published");
  const pays = S.payments
    .filter((p) => p.pid === myId() && !p.dup)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const due = pays.filter((p) => p.state === "Invoice due");
  return (
    head(
      "My PHOENIX",
      "Sponsor / Funder · " +
        h(S.orgs.find((o) => o.id === me().org)?.name || ""),
      B("Funder-safe reports", "go", { r: "funding", tab: "reports" }, "btn-p"),
    ) +
    `<div class="hm">
 <div class="hm-top solo">${nextCard()}</div>
 ${hmStrip([stat("s-mist", "t-soft", "card", sup(act) + " / " + tot.toLocaleString("en-US"), "Active sponsored seats", "Utilisation " + supPct(act, tot), "funding", { tab: "seats" }), stat("s-purple", "t-purple", "folder", inits.length + projs.length, "Approved initiatives", inits.length + " initiative" + (inits.length === 1 ? "" : "s") + " · " + projs.length + " project" + (projs.length === 1 ? "" : "s"), "funding", { tab: "initiatives" }), stat("s-teal", "t-teal", "award", sup(ev.length), "Approved evidence summaries", "Cleared for funder reports", "funding", { tab: "reports" }), stat("s-slate", "t-navy", "coin", due.length, "Invoices due", due.length ? "Due " + fmt(due[0].due || due[0].at) : "Nothing outstanding", "funding", { tab: "invoices" })], "Your sponsorship summary")}
 ${roleJourney()}
 ${hmCols(
   `${card(
     "Seat utilisation",
     "Counts only: sponsors never see who holds a seat",
     seats
       .map((s) => {
         const a = poolActive(s);
         return s.status === "Active"
           ? `<div class="hm-seat"><div class="row hm-seat-h"><b>${sup(a)} of ${s.total} seats active</b><span class="cap">${supPct(a, s.total)}</span></div><div class="progress"><span class="bar" style="width:${isSupp(a) ? 0 : Math.round((a / s.total) * 100)}%"></span></div><span class="cap">${h(ctxNameOf(s.ctx))} · valid until ${fmt(s.until)}</span></div>`
           : hrow("card", s.total + " seats · " + h(ctxNameOf(s.ctx)), "Awaiting invoice payment", pill(s.status));
       })
       .join("") || empty("card", "No seat pools", "Buy sponsored seats by invoice.", B("Buy seats by invoice", "checkout", { id: "pd5" }, "btn-p btn-sm")),
     L("Seat utilisation", "funding", { tab: "seats" }),
     "hm-list",
   )}
 ${card(
   "Approved initiatives",
   "Aggregate status only",
   [
     ...inits.map((i) => hrow("megaphone", h(i.title), "Initiative · published " + fmt(i.at))),
     ...projs.map((p) => {
       const ms = projMilestones(p);
       return hrow("folder", h(p.title), h(plainStage(p)) + (ms.length ? " · " + ms.filter((m) => m.status === "Achieved").length + " of " + ms.length + " milestones achieved" : ""));
     }),
   ].join("") || empty("folder", "No approved initiatives yet", ""),
   L("All initiatives", "funding", { tab: "initiatives" }),
   "hm-list",
 )}
 ${card(
   "Approved evidence summaries",
   "Cleared for funder reports by the owner and a disclosure review",
   ev.map((e) => hrow("award", h(e.title), [h(e.type || ""), e.level ? "Support level " + h(e.level) : ""].filter(Boolean).join(" · "))).join("") || empty("award", "No approved evidence summaries yet", ""),
   L("Funder-safe reports", "funding", { tab: "reports" }),
   "hm-list",
 )}`,
   `${card(
     "Funder-safe reports",
     "",
     dl([
       ["Approved evidence summaries", sup(ev.length)],
       ["Funder-safe Harvests", sup(hv.length)],
       ["Programme signals", "Aggregate, small numbers suppressed"],
     ]),
     L("Open reports", "funding", { tab: "reports" }),
     "hm-list hm-kvs",
   )}
 ${card(
   "Invoices and receipts",
   "",
   pays.slice(0, 3).map((p) => hrow("coin", h(p.ref || p.id), h((byId("products", p.product) || {}).name || p.product) + (p.amount ? " · " + h(p.amount) : ""), pill(p.state))).join("") || empty("coin", "No invoices yet", ""),
   L("All invoices", "funding", { tab: "invoices" }),
   "hm-list",
 )}
 ${banner("info", "What sponsors never receive", "Private participant profiles, Purpose Compass responses, private discussions, mentor notes, AI conversations or unapproved evidence. Sponsors are never members of Circles, Rope Teams or Action Workspaces.")}`,
 )}</div>`
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
      B("Approval inbox", "go", { r: "admin", tab: "requests" }, "btn-p"),
    ) +
    `<div class="hm">
 ${hmStrip([stat("s-purple", "t-purple", "inbox", S.projects.filter((p) => inCtx(p) && p.status === "Submitted" && !p.stewards.length).length + S.pathways.filter((p) => inCtx(p) && pwNeedsSteward(p)).length, "Review requests", "Projects and pathways needing a reviewer", "admin", { tab: "requests" }), stat("s-teal", "t-teal", "user", pend.length, "Role requests", "Awaiting approval", "admin", { tab: "users" }), stat("s-slate", "t-navy", "alert", S.incidents.filter((i) => i.state !== "Closed").length, "Open incidents", "", "incidents"), stat("s-mist", "t-soft", "card", S.ents.filter((e) => e.state === "Grace").length, "Payments in grace", "", "billing")], "Programme queues")}
 ${roleJourney()}
 ${hmCols(
   `${card(
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
   "hm-tbl",
 )}`,
   `${card("Inactive or incomplete users", "Onboarding not finished", inactive.map((a) => hrow("user", nm(a.pid), ROLE[a.role], B("Send reminder", "remind", { pid: a.pid }))).join("") || empty("check", "Everyone is active", ""), inactive.length ? `<span class="cnt">${inactive.length}</span>` : "", "hm-list")}
 ${card(
   "Pilot scope and your permissions",
   "",
   dl([
     ["Programme", h(ctx().name) + " · pack " + h(pack().name)],
     ["Scope", "Programme flows and modules"],
     ["Your role", ROLE[role()]],
     [
       "Specialist bundles",
       `<span class="row wrap hm-pills">${asg()
         .bundles.map((b) => pill(b, "p-grey"))
         .join(" ") || "None"}</span>`,
     ],
     [
       "Effective permission",
       "Identity + scoped role + context + mandate + object permission + consent + lifecycle + entitlement",
     ],
   ]),
   L("Open guidance", "resources"),
   "hm-list hm-kvs",
 )}`,
 )}</div>`
  );
}
function homeT() {
  return (
    head(
      "Platform health",
      "Technical operations · no default access to participant content",
    ) +
    `<div class="hm">
 ${hmStrip([hmFig("t-soft", "link", S.integrations.filter((i) => !["Degraded", "Unavailable"].includes(i.status)).length + " of " + S.integrations.length, "Integrations operating", ""), hmFig("t-soft", "lock", S.security.length, "Security events", S.security[0] ? "Latest " + fmt(S.security[0].at) : ""), hmFig("t-soft", "archive", S.backups[0] ? fmt(S.backups[0].at) : "—", "Last backup", S.backups[0] ? h(S.backups[0].status) : ""), hmFig("t-soft", "sparkle", S.settings.aiUsed + "/" + S.settings.aiQuota, "AI requests today", "Used / quota")], "Platform summary")}
 ${roleJourney()}
 ${hmCols(
   `${card("Integration health", "", S.integrations.map((i) => hrow("link", h(i.name), "", pill(i.status))).join(""), L("Manage", "platform", { tab: "integrations" }), "hm-list")}
 ${card("Storage and backups", "", S.backups.map((b) => hrow("archive", fmt(b.at), h(b.size), pill(b.status.includes("passed") ? "Completed" : b.status))).join(""), "", "hm-list")}`,
   `${card(
   "Security events",
   "",
   S.security
     .slice(0, 5)
     .map((s) => hrow("lock", h(s.t), fmt(s.at)))
     .join(""),
   L("All", "platform", { tab: "security" }),
   "hm-list",
 )}
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
   "hm-list hm-kvs",
 )}`,
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

