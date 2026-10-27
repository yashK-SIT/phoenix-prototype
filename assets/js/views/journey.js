// ---------- LINKED SPACES: Circle, Rope Team and Action Workspace (F05, F07; Build-Freeze BF-07) ----------
// Spaces are linked, never converted, and can be entered in any valid order. An issue can be sent to any linked
// space that can help; the work continues once it is resolved.
const projOf = (kind, o) =>
  !o
    ? null
    : kind === "projects"
      ? o
      : kind === "rooms"
        ? S.projects.find((p) => p.room === o.id) || null
        : byId("projects", o.project) || null;
// No mandatory sequence: a Rope Team can always be linked (kept as a function for existing callers).
const skipsRope = () => false;
const circleAgreed = (c) => !!c && (c.decisions || []).length > 0;
const openReturns = (p) =>
  (S.returnLog || []).filter((r) => r.project === p.id && r.status === "Open");
function stageSteps(p) {
  // BF-07: drive status from which spaces are actually linked — never imply Circle → Rope → Room is required.
  const c = projSpace(p, "circles"),
    rt = projSpace(p, "ropes"),
    rm = projSpace(p, "rooms");
  const closing = ["Final review", "Closed"].includes(p.stage);
  const steps = [
    {
      key: "circle",
      kind: "circles",
      label: "Circle",
      o: c,
      icon: "users",
      tile: "t-purple",
      what: "Shared learning, sensemaking, equal-vote decisions",
    },
    !skipsRope(p) && {
      key: "rope",
      kind: "ropes",
      label: "Rope Team",
      o: rt,
      icon: "route",
      tile: "t-teal",
      what: "Mentor support and accountability",
    },
    {
      key: "room",
      kind: "rooms",
      label: WL(),
      o: rm,
      icon: "room",
      tile: "t-navy",
      what: "Tasks, milestones, risks, resources and evidence",
    },
  ].filter(Boolean);
  return steps.map((s) => ({
    ...s,
    st: s.o ? (closing ? "done" : "cur") : "todo",
  }));
}
// Opening a linked space needs independent access to it. A Rope Team opens only for its own members — a link,
// a platform role or Organization administration never opens its protected content (ROPE_TEAM_ONLY).
const canOpenSpace = (kind, o) =>
  !!o &&
  (memberOf(o) ||
    (kind !== "ropes" && role() === "A") ||
    (kind === "circles" && role() === "F" && o.facilitator === myId()) ||
    (kind === "circles" && o.visibility === "Programme"));
// BF-07: Circle = shared learning and sensemaking; Rope Team = protected support and accountability; Action
// Workspace = execution. They are separate, linked objects that can be entered or linked in any valid order —
// no mandatory sequence, and no space is ever converted into another.
function stageTrack(p, hereKind) {
  if (!p) return "";
  const steps = stageSteps(p);
  const rets = openReturns(p);
  const closed = p.stage === "Closed";
  return `<section class="journey" aria-label="Linked spaces"><div class="jhead"><span class="jtitle">${ic("link", 15)}Linked spaces</span><span class="cap jsum">${L(h(p.title), "project", { id: p.id }, "lnk")} · separate spaces · the project moves between them in any order · never converted</span></div><ol class="jsteps jsteps-free">${steps
    .map((s) => {
      const here = s.kind === hereKind;
      const route_ = { circles: "circle", ropes: "rope", rooms: "room" }[
        s.kind
      ];
      const name = s.o ? h(s.o.name) : "Not linked";
      const link =
        s.o && canOpenSpace(s.kind, s.o) && !here
          ? L(name, route_, { id: s.o.id }, "lnk")
          : name;
      const back = rets.filter((r) => r.to.kind === s.kind).length;
      const cur =
        s.o &&
        projHere(p) &&
        projHere(p).kind === s.kind &&
        !closed &&
        p.stage !== "Final review";
      return `<li class="jstep is-${s.o ? "done" : "todo"}${here ? " is-here" : ""}${back ? " has-ret" : ""}"${here ? ' aria-current="step"' : ""}><span class="tile ${s.o ? s.tile : "t-soft"}">${ic(s.icon, 16)}</span><div class="jbody"><span class="jlabel">${s.label}${here ? ' <span class="jhere">You are here</span>' : ""}${cur ? " " + pill("Project is here", "p-amber") : ""}</span><span class="jname">${link}</span><span class="cap jmeta">${s.o ? pill(s.o.state) : h(s.what)}${back ? " " + pill(back + " issue" + (back > 1 ? "s" : "") + " sent here", "p-amber") : ""}</span></div></li>`;
    })
    .join(
      "",
    )}<li class="jstep jfinal is-${closed ? "done" : p.stage === "Final review" ? "cur" : "todo"}"><span class="tile ${closed ? "t-teal" : p.stage === "Final review" ? "t-navy" : "t-soft"}">${ic(closed ? "check" : "award", 16)}</span><div class="jbody"><span class="jlabel">Project close</span><span class="jname">${closed ? "Approved and closed" : p.stage === "Final review" ? "Final review" : "When the work is done"}</span><span class="cap jmeta">Faculty/Steward · Learning Harvest</span></div></li></ol>${rets.length ? `<div class="jret" role="note">${ic("refresh", 16)}<div><b>${rets.length} issue${rets.length > 1 ? "s" : ""} sent to a linked space.</b> <span class="cap">${rets.map((r) => h(r.toName) + ": " + h(r.why.slice(0, 70))).join(" · ")}</span></div></div>` : ""}</section>`;
}
// ---- what is left to do in this space (linking itself lives in the Linked objects panel, links.js)
function stageGate(p, kind, o) {
  if (!o) return "";
  const r = role();
  const steward = !!p && r === "F" && p.stewards.includes(myId());
  const owner = !!p && p.owner === myId();
  const active = o.state === "Active";
  const items = [];
  const acts = [];
  if (active && kind === "ropes" && o.mentor === myId() && !o.reqFinal)
    acts.push(
      B(
        ic("check", 14) + "Record support recommendation",
        "reqFinal",
        { id: o.id },
        "btn-s btn-sm",
      ),
    );
  if (active && steward && kind === "circles")
    acts.push(
      B(ic("link", 14) + "Find a collaborator", "collabFind", {
        project: p.id,
      }),
    );
  if (active && p && !p.rope && kind !== "ropes" && (steward || owner))
    acts.push(
      B(
        ic("route", 14) + "Ask for a mentor",
        "mentorRequest",
        { project: p.id },
        "btn-s btn-sm",
      ),
    );
  if (kind === "rooms" && p && p.room === o.id) {
    const ms = o.milestones || [];
    const done = ms.filter((m) => m.status === "Achieved").length;
    items.push([
      ms.length > 0 && done === ms.length,
      `Milestones achieved with validated evidence (${done} of ${ms.length}).`,
    ]);
    if (owner && p.stage === "Room" && active)
      acts.push(
        B(
          "Submit final deliverables",
          "submitFinal",
          { id: p.id },
          "btn-p btn-sm",
        ),
      );
    if (p.stage === "Final review")
      acts.push(
        '<span class="cap">With the Faculty/Steward for final review.</span>',
      );
  }
  if (!items.length && !acts.length) return "";
  return card(
    kind === "rooms" && items.length ? "Project deliverables" : "Next steps",
    "",
    `${items.length ? `<ul class="gate">${items.map(([ok_, t]) => `<li class="${ok_ ? "ok" : ""}"><span class="gate-ic">${ic(ok_ ? "check" : "clock", 14)}</span><span>${t}</span></li>`).join("")}</ul>` : ""}${acts.length ? `<div class="row wrap gate-act">${acts.join("")}</div>` : ""}`,
    "",
    "gate-card",
  );
}
// Send an issue to a linked Circle or Rope Team. Only the issue text crosses; the target keeps its own privacy.
function backActions(kind, o) {
  if (!o || o.state !== "Active" || !memberOf(o)) return "";
  const tg = [
    ...linkedObjs(o.id, "circles"),
    ...linkedObjs(o.id, "ropes"),
  ].filter((t) => t.state === "Active");
  const btns = tg.map((t) =>
    B(ic("refresh", 14) + "Send an issue to " + h(t.name), "returnTo", {
      from: kind,
      id: o.id,
      to: t.id,
    }),
  );
  return btns.length
    ? `<div class="jback"><span class="jback-k">${ic("refresh", 14)}<span>Needs guidance or a new decision?</span></span><div class="row wrap">${btns.join("")}</div></div>`
    : "";
}
// ---- reports to linked spaces: an intentional release. Only what the author writes crosses the boundary.
const REPORT_KIND = {
  circles: "Circle progress report",
  ropes: "Rope Team guidance report",
  rooms: "Execution update",
};
const reportAuthor = (kind, o) =>
  kind === "circles"
    ? o.owner === myId() || (role() === "F" && o.facilitator === myId())
    : kind === "ropes"
      ? o.owner === myId() || o.mentor === myId()
      : sCan("rooms", o, "lead");
const reportTargets = (o) =>
  SPACE_KINDS.flatMap((k) => linkedObjs(o.id, k)).filter(
    (t) => t.state === "Active",
  );
function reportsCard(p, kind, o) {
  if (!o) return "";
  const inbound = (S.stageReports || []).filter((r) => r.to === o.id);
  const outbound = (S.stageReports || []).filter((r) => r.from === o.id);
  const can_ =
    reportTargets(o).length && reportAuthor(kind, o) && o.state === "Active";
  const rows = [
    ...inbound.map((r) => ["in", r]),
    ...outbound.map((r) => ["out", r]),
  ].sort((a, b) => b[1].at.localeCompare(a[1].at));
  if (!rows.length && !can_) return "";
  return card(
    "Reports to linked spaces",
    "A report is the only thing that crosses a link: the author writes it on purpose. Notes, chat and private records stay where they are.",
    rows
      .map(([dir, r]) =>
        lrow(
          dir === "in" ? "inbox" : "send",
          h(r.kind) +
            " · " +
            (dir === "in" ? "from " + cName(r.from) : "to " + cName(r.to)),
          h(r.t) +
            `<span class="cap lrow-meta">${nm(r.by)} · ${fmt(r.at)}</span>`,
        ),
      )
      .join("") || '<p class="cap">No reports yet.</p>',
    can_
      ? B(
          ic("send", 14) + "Send a report",
          "stageReport",
          { kind, id: o.id },
          "btn-s btn-sm",
        )
      : "",
  );
}
A.stageReport = (d) => {
  clearF("srep");
  const o = byId(d.kind, d.id);
  const tg = reportTargets(o);
  const hint =
    d.kind === "ropes"
      ? "Only what you write here is shared. Private mentor notes, support details and check-ins are " +
        ROPE_ONLY +
        " and are never attached."
      : "What was discussed or decided, open questions and responsibilities the linked space needs.";
  modal(
    "Send " + REPORT_KIND[d.kind].toLowerCase(),
    () =>
      `<form data-f="srep" class="col" style="gap:14px" novalidate><input type="hidden" name="kind" value="${d.kind}"><input type="hidden" name="id" value="${o.id}">${dl([["From", h(o.name)]])}${fi("srep", "to", "To linked space", { type: "select", req: true, opts: tg.map((t) => [t.id, OBJ_LABEL(objKind(t.id)) + " · " + t.name]) })}${fi("srep", "t", "Report", { type: "textarea", rows: 5, req: true, help: hint })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send report</button></div></form>`,
  );
};
F.srep = (d) => {
  if (!validate("srep", d, { to: ["req"], t: ["req", ["min", 20]] }))
    return render();
  const o = byId(d.kind, d.id);
  const tgt = reportTargets(o).find((t) => t.id === d.to);
  if (!tgt) return deny("you can report only to an active linked space");
  const tk = objKind(tgt.id);
  const p = projOf(d.kind, o);
  S.stageReports = S.stageReports || [];
  S.stageReports.push({
    id: uid("sr"),
    project: p ? p.id : null,
    kind: REPORT_KIND[d.kind],
    from: o.id,
    to: tgt.id,
    by: myId(),
    at: today(),
    t: d.t,
  });
  if (p)
    p.history.push({
      at: today(),
      t: REPORT_KIND[d.kind] + " sent to " + tgt.name,
    });
  (tgt.members || [])
    .filter((m) => m.pid !== myId() && (!m.status || m.status === "Active"))
    .forEach((m) =>
      notify(
        m.pid,
        REPORT_KIND[d.kind] + " received from " + o.name,
        OBJ_ROUTE[tk],
        { id: tgt.id },
      ),
    );
  sysMsg(tgt, REPORT_KIND[d.kind] + " received from " + o.name);
  audit("Report released to linked space", o.id, "→ " + tgt.name);
  UI.modal = null;
  clearF("srep");
  toast("Report sent to " + tgt.name + ".");
  ok();
};
// ---- send an issue to a linked Circle or Rope Team; the work continues once it is resolved
const retTarget = (src, id) =>
  [...linkedObjs(src.id, "circles"), ...linkedObjs(src.id, "ropes")].find(
    (t) => t.id === id && t.state === "Active",
  ) || null;
A.returnTo = (d) => {
  clearF("ret");
  const src = byId(d.from, d.id);
  const target = retTarget(src, d.to);
  const isRope = target && !!byId("ropes", target.id);
  modal(
    "Send an issue to " + (target ? h(target.name) : "a linked space"),
    () =>
      `<form data-f="ret" class="col" style="gap:14px" novalidate><input type="hidden" name="from" value="${d.from}"><input type="hidden" name="id" value="${d.id}"><input type="hidden" name="to" value="${h(d.to)}">${
        target
          ? dl([
              ["From", h(src.name)],
              ["To", h(target.name)],
            ])
          : banner(
              "warn",
              "Nothing to send to",
              "That space is not linked to this one, or is no longer active.",
            )
      }${fi("ret", "why", isRope ? "What needs guidance or support from the Rope Team?" : "What needs a new decision from the Circle?", { type: "textarea", rows: 3, req: true })}${banner("info", "", "Only this text is sent. It appears " + (isRope ? "in the Rope Team as a support request owned by the mentor" : "in the Circle as an open concern for the facilitator") + ". You do not gain access to that space; you are told when it is resolved.")}<div class="actions"><span></span><button class="btn btn-p" type="submit" ${target ? "" : "disabled"}>Send issue</button></div></form>`,
  );
};
F.ret = (d) => {
  if (!validate("ret", d, { why: ["req", ["min", 10]] })) return render();
  const src = byId(d.from, d.id);
  const p = projOf(d.from, src);
  const target = retTarget(src, d.to);
  if (!target) {
    toast("That space is not linked to this one.", "err");
    return render();
  }
  const isRope = !!byId("ropes", target.id);
  S.returnLog = S.returnLog || [];
  const ret = {
    id: uid("ret"),
    project: p ? p.id : null,
    from: { kind: d.from, id: src.id },
    to: { kind: isRope ? "ropes" : "circles", id: target.id },
    toName: target.name,
    fromName: src.name,
    why: d.why,
    by: myId(),
    at: today(),
    status: "Open",
  };
  S.returnLog.push(ret);
  if (isRope) {
    target.support.push({
      id: uid("su"),
      by: myId(),
      t: "Sent from " + src.name + ": " + d.why,
      owner: target.mentor,
      status: "Assigned",
      ret: ret.id,
    });
    notify(
      target.mentor,
      "Issue sent to " + target.name + " from " + src.name,
      "rope",
      { id: target.id, tab: "support" },
    );
  } else {
    target.concerns.push({
      id: uid("x"),
      by: myId(),
      t: "Sent from " + src.name + ": " + d.why,
      at: today(),
      status: "Open",
      ret: ret.id,
    });
    notify(
      target.facilitator,
      "Matter sent to " + target.name + " from " + src.name,
      "circle",
      { id: target.id, tab: "records" },
    );
  }
  sysMsg(target, "Issue sent from " + src.name + ": " + d.why.slice(0, 80));
  if (src.returns)
    src.returns.push({ to: target.name, why: d.why, at: today(), ret: ret.id });
  if (p)
    p.history.push({
      at: today(),
      t: "Issue sent from " + src.name + " to " + target.name,
    });
  audit("Matter sent to linked space", src.id, "→ " + target.name);
  UI.modal = null;
  clearF("ret");
  toast("Sent to " + target.name + ". You will be told when it is resolved.");
  ok();
};
function resolveReturn(retId, note) {
  const r = (S.returnLog || []).find((x) => x.id === retId);
  if (!r || r.status !== "Open") return;
  r.status = "Resolved";
  r.resolvedAt = today();
  r.note = note || "";
  const src = byId(r.from.kind, r.from.id);
  if (src) {
    sysMsg(
      src,
      "Returned issue resolved in " + r.toName + (note ? ": " + note : ""),
    );
    (src.members || [])
      .filter((m) => !m.status || m.status === "Active")
      .forEach((m) =>
        notify(
          m.pid,
          "Returned issue resolved in " +
            r.toName +
            " — work can move forward again",
          r.from.kind === "rooms" ? "room" : "rope",
          { id: src.id },
        ),
      );
    (src.returns || [])
      .filter((x) => x.ret === r.id)
      .forEach((x) => (x.status = "Resolved"));
  }
  const p = byId("projects", r.project);
  if (p)
    p.history.push({
      at: today(),
      t: "Returned issue resolved in " + r.toName,
    });
  audit("Returned issue resolved", r.id, r.toName);
}
function returnsCard(o) {
  const mine = (S.returnLog || []).filter(
    (r) => r.from.id === o.id || r.to.id === o.id,
  );
  if (!mine.length) return "";
  return card(
    "Returned issues",
    "Backward movement between stages and its resolution.",
    mine
      .slice()
      .reverse()
      .map((r) =>
        lrow(
          "refresh",
          r.from.id === o.id ? "→ " + h(r.toName) : "← from " + h(r.fromName),
          h(r.why) +
            `<span class="cap lrow-meta">${nm(r.by)} · ${fmt(r.at)}${r.status === "Resolved" ? " · resolved " + fmt(r.resolvedAt) + (r.note ? ": " + h(r.note) : "") : ""}</span>`,
          pill(r.status === "Open" ? "Open" : "Resolved"),
        ),
      )
      .join(""),
  );
}
// ---- maintenance run before every signed-in render
function tick() {
  if (typeof expireCards === "function") expireCards();
  pubTick(); // publication votes close at their closing time (publish.js)
  S.circles.forEach((c) =>
    (c.polls || []).forEach((p) => {
      if (p.status === "Open") pollTick(c, p); // closes at the closing time; sends the configured reminder (circles.js)
    }),
  );
}

// ---------- PROJECT ROOM: where the project's work happens now (Circle, Rope Team or Action Room) ----------
// A project starts in any of the three rooms and moves between them in any order — Circle → Action Room directly,
// Action Room back to Circle, and so on. The rooms stay separate, linked objects: a move changes only which room
// the project is "in" (p.stage), and is recorded with who, when and why. Members, content and permissions never move.
// Moving into a room the project does not have yet opens that room's create form; the move completes when it exists.
const PROJ_ROOMS = [
  {
    kind: "circles",
    stage: "Circle",
    key: "circle",
    icon: "users",
    tile: "t-purple",
  },
  {
    kind: "ropes",
    stage: "Rope Team",
    key: "rope",
    icon: "route",
    tile: "t-teal",
  },
  { kind: "rooms", stage: "Room", key: "room", icon: "room", tile: "t-navy" },
];
const projRoomOf = (v) =>
  PROJ_ROOMS.find((r) => r.kind === v || r.stage === v) || null;
const projRoomLabel = (r) => (r.kind === "rooms" ? WL() : r.stage);
// The project's space of a kind: its own field first, then any open space linked to it.
const projSpace = (p, kind) => {
  const r = projRoomOf(kind);
  return (
    (p &&
      (byId(kind, p[r.key]) ||
        linkedObjs(p.id, kind).find((o) => o.state !== "Closed"))) ||
    null
  );
};
const projHere = (p) => (p ? projRoomOf(p.stage) : null);
// Room status lifecycle: the room the project works in is Active; when it moves, the room it leaves is Closed and
// read-only (guards.js and the read-only view below). Moving back into a closed room reopens it. Content stays where
// it was recorded; nothing is copied or deleted.
const ROOM_CLOSED = ["Closed", "Completed", "Archived/Closed"];
const roomClosed = (o) => !!o && ROOM_CLOSED.includes(o.state);
// The room a project was last in (also while it is in Final review or Closed).
const projLastRoom = (p) =>
  projHere(p) ||
  (p && p.moves && p.moves.length
    ? projRoomOf(p.moves[p.moves.length - 1].to)
    : p && p.room
      ? projRoomOf("rooms")
      : null);
const projMover = (p) =>
  !!p &&
  p.status === "Accepted" &&
  !["Final review", "Closed"].includes(p.stage) &&
  (p.owner === myId() ||
    (role() === "F" && p.stewards.includes(myId())) ||
    role() === "A");
// Moving into an existing room needs it Active; a missing one is created next by the person moving the project,
// so they must be allowed to create it (the same guards as the create buttons).
const projCreateOk = (p, kind) =>
  (kind === "circles"
    ? G.newCircle({ project: p.id })
    : kind === "ropes"
      ? G.newRope({ fromKind: "projects", fromId: p.id })
      : G.newRoom({ origin: "Project", project: p.id })) === true;
const projMoveTargets = (p) =>
  PROJ_ROOMS.filter((r) => r !== projHere(p)).map((r) => {
    const sp = projSpace(p, r.kind);
    // a room closed when the project left it is reopened by moving back; any other state (paused, pending) blocks
    const why = sp
      ? sp.state === "Active" || sp.state === "Closed"
        ? ""
        : "it is " + String(sp.state).toLowerCase()
      : projCreateOk(p, r.kind)
        ? ""
        : "your role cannot create one — ask the project owner";
    return { ...r, sp, why };
  });
function projMoveDone(p, kind, sp, why) {
  const to = projRoomOf(kind);
  const from = projHere(p);
  const fromSp = from && projSpace(p, from.kind);
  // every other room of this project that is still Active closes, so only the destination is Active afterwards
  const closing = [
    fromSp,
    ...PROJ_ROOMS.map((r) => byId(r.kind, p[r.key])),
  ].filter(
    (o, i, l) => o && o !== sp && o.state === "Active" && l.indexOf(o) === i,
  );
  const reopened = sp.state === "Closed";
  if (!p[to.key]) p[to.key] = sp.id;
  if (!linksOf(p.id).some((l) => linkOther(l, p.id) === sp.id))
    addLink(kind, sp.id, "projects", p.id, "related-to", false);
  p.stage = to.stage;
  delete p.pendingMove;
  closing.forEach((o) => {
    Object.assign(o, {
      state: "Closed",
      closedAt: now(),
      closedBy: myId(),
      closedFor: { project: p.id, to: sp.id },
    });
    sysMsg(
      o,
      "This " +
        OBJ_LABEL(objKind(o.id)) +
        " is closed because the project “" +
        p.title +
        "” moved to " +
        projRoomLabel(to) +
        " “" +
        sp.name +
        "”. Everything recorded here stays readable; nothing can be added or changed.",
    );
  });
  if (reopened) {
    Object.assign(sp, {
      state: "Active",
      reopenedAt: now(),
      reopenedBy: myId(),
    });
    delete sp.closedFor;
  }
  (p.moves = p.moves || []).push({
    at: now(),
    by: myId(),
    from: from ? from.stage : null,
    fromSpace: fromSp ? fromSp.id : null,
    to: to.stage,
    space: sp.id,
    closed: closing.map((o) => o.id),
    reopened,
    why: why || "",
  });
  const line =
    (from ? "Moved from " + projRoomLabel(from) + " to " : "Started in ") +
    projRoomLabel(to) +
    " “" +
    sp.name +
    "”" +
    (why ? ": " + why : "");
  p.history.push({ at: now(), by: myId(), t: line + " (" + me().name + ")" });
  sysMsg(
    sp,
    "Project “" +
      p.title +
      "” " +
      (from ? "moved here from " + projRoomLabel(from) : "starts here") +
      (why ? ": " + why : "") +
      ". Members and content of other rooms were not copied.",
  );
  if (fromSp && fromSp !== sp)
    sysMsg(
      fromSp,
      "Project “" +
        p.title +
        "” moved to " +
        projRoomLabel(to) +
        " “" +
        sp.name +
        "”. This " +
        projRoomLabel(from) +
        " stays open and linked.",
    );
  [
    p.owner,
    ...p.stewards,
    ...(sp.members || [])
      .filter((m) => !m.status || m.status === "Active")
      .map((m) => m.pid),
  ]
    .filter((x, i, l) => x && x !== myId() && l.indexOf(x) === i)
    .forEach((x) =>
      notify(
        x,
        "“" +
          p.title +
          "” " +
          (from ? "moved to" : "started in") +
          " " +
          projRoomLabel(to) +
          " “" +
          sp.name +
          "”",
        OBJ_ROUTE[kind],
        { id: sp.id },
      ),
    );
  audit(
    "Project room changed",
    p.id,
    (from ? from.stage + (fromSp ? " " + fromSp.id : "") : "—") +
      " → " +
      to.stage +
      " · " +
      sp.id +
      (closing.length
        ? " · closed " + closing.map((o) => o.id).join(", ")
        : "") +
      (reopened ? " · reopened" : ""),
  );
}
// The room named by the support path chosen on acceptance ("Start in a Circle" …), as a kind.
const projPathKind = (p) =>
  /Circle/.test(p.supportPath || "")
    ? "circles"
    : /Rope/.test(p.supportPath || "")
      ? "ropes"
      : /Room|Workspace/.test(p.supportPath || "")
        ? "rooms"
        : "";
A.projMove = (d) => {
  const p = byId("projects", d.id);
  if (!projMover(p))
    return deny(
      "only the project owner, its steward or an Organization Admin moves the project",
    );
  clearF("pmv");
  // a move left waiting by a create form that was cancelled is dropped
  delete p.pendingMove;
  const ts = projMoveTargets(p);
  const pick = (k) => ts.find((t) => t.kind === k && !t.why);
  UI.form.pmv = {
    to: (pick(d.to) || pick(projPathKind(p)) || ts.find((t) => !t.why) || ts[0])
      .kind,
  };
  const here = projHere(p);
  modal(here ? "Move the project" : "Start the project", () => {
    const t = ts.find((x) => x.kind === fv("pmv", "to")) || ts[0];
    const hereSp = here && projSpace(p, here.kind);
    return `<form data-f="pmv" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${p.id}">${dl(
      [
        ["Project", h(p.title)],
        [
          "Now in",
          here
            ? projRoomLabel(here) + (hereSp ? " · " + h(hereSp.name) : "")
            : "Not started in a room yet",
        ],
      ],
    )}<fieldset class="np-fs col"><legend class="lbl">${here ? "Move to" : "Start in"} <span class="req">*</span></legend><div class="pmv-opts">${ts
      .map(
        (x) =>
          `<label class="choice np-choice pmv-opt ${x.kind === t.kind ? "sel" : ""}${x.why ? " is-off" : ""}"><input type="radio" name="to" value="${x.kind}" ${x.kind === t.kind ? "checked" : ""} ${x.why ? "disabled" : ""} data-ch="pmvTo"><span class="rad" aria-hidden="true"></span><span class="tile ${x.tile}" aria-hidden="true">${ic(x.icon, 16)}</span><span class="col pmv-t"><b>${projRoomLabel(x)}</b><span class="cap">${x.sp ? h(x.sp.name) + (x.why ? " · " + x.why : "") : "Not created yet — you create it next"}</span></span></label>`,
      )
      .join(
        "",
      )}</div>${fe("pmv", "to") ? `<span class="emsg" role="alert">${ic("alert", 14)}${fe("pmv", "to")}</span>` : ""}</fieldset>${fi("pmv", "why", "Why it moves (optional)", { type: "textarea", rows: 2, max: 400, ph: here ? "e.g. The Circle agreed the plan, so execution starts now" : "e.g. The team needs to agree requirements first", help: "Shared with the project team and kept in the project history." })}${banner("info", "", t.sp ? "The project moves to “" + h(t.sp.name) + "”. " + (here ? "The " + projRoomLabel(here) + " stays open and linked; " : "") + "nobody is added or removed, and nothing is copied." : "The " + projRoomLabel(t) + " form opens next, linked to this project. The project moves there as soon as it is created.")}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">${t.sp ? (here ? "Move project" : "Start here") : "Continue to create the " + projRoomLabel(t)}</button></div></form>`;
  });
};
A.pmvTo = () => {
  snapForms();
  render();
};
F.pmv = (d) => {
  const p = byId("projects", d.id);
  if (!projMover(p))
    return deny(
      "only the project owner, its steward or an Organization Admin moves the project",
    );
  const t = projMoveTargets(p).find((x) => x.kind === d.to);
  if (!t || t.why) {
    UI.err.pmv = {
      to: t
        ? "You cannot move into this room: " + t.why + "."
        : "Choose where the project goes.",
    };
    return render();
  }
  const why = (d.why || "").trim();
  clearF("pmv");
  UI.modal = null;
  // a project already in a room: confirm first, because that room closes
  if (projHere(p)) {
    UI.pmvGo = { id: p.id, to: t.kind, why };
    return pmvConfirmDialog(p, t);
  }
  return pmvGo(p, t, why);
};
function pmvConfirmDialog(p, t) {
  const here = projHere(p);
  const hereSp = projSpace(p, here.kind);
  const dest = t.sp
    ? projRoomLabel(t) + " “" + h(t.sp.name) + "”"
    : "a new " + projRoomLabel(t);
  modal(
    "Confirm move",
    `<div class="col" style="gap:14px">${dl([
      ["Project", h(p.title)],
      [
        "From",
        projRoomLabel(here) +
          (hereSp ? " “" + h(hereSp.name) + "”" : "") +
          " " +
          pill("Active"),
      ],
      [
        "To",
        dest +
          " " +
          pill(
            t.sp && t.sp.state === "Closed"
              ? "Closed"
              : t.sp
                ? "Active"
                : "Not created yet",
            t.sp ? "" : "p-grey",
          ),
      ],
    ])}<ul class="pmv-conf">
<li>${ic("lock", 15)}<span><b>${projRoomLabel(here)}${hereSp ? " “" + h(hereSp.name) + "”" : ""} will be closed.</b> Its records, files, decisions and discussion stay readable, but nothing can be added, changed or submitted there.</span></li>
<li>${ic("arrow", 15)}<span><b>${t.sp ? dest + (t.sp.state === "Closed" ? " will be reopened and become active." : " becomes the active room.") : dest + " becomes the active room once you create it."}</b>${t.sp ? "" : " If you cancel the create form, nothing changes."}</span></li>
<li>${ic("clock", 15)}<span>The move is recorded with you, the time and both rooms. Members, content and permissions are not copied between rooms.</span></li>
</ul><div class="actions">${B("Cancel", "pmvCancel")}${B(ic("check", 14) + "Confirm move", "pmvConfirm", { id: p.id }, "btn-p btn-sm")}</div></div>`,
  );
}
A.pmvCancel = () => {
  UI.pmvGo = null;
  closeM();
};
A.pmvConfirm = (d) => {
  const g = UI.pmvGo;
  const p = byId("projects", d.id);
  UI.pmvGo = null;
  UI.modal = null;
  const t =
    g && g.id === d.id && projMoveTargets(p).find((x) => x.kind === g.to);
  if (!t || t.why) {
    toast(
      "The move could not be completed" +
        (t ? ": " + t.why : "") +
        ". Nothing was changed.",
      "err",
    );
    return render();
  }
  pmvGo(p, t, g.why);
};
function pmvGo(p, t, why) {
  if (t.sp) {
    const from = projHere(p);
    projMoveDone(p, t.kind, t.sp, why);
    toast(
      "“" +
        p.title +
        "” is now in " +
        projRoomLabel(t) +
        " “" +
        t.sp.name +
        "”" +
        (from
          ? ". The " + projRoomLabel(from) + " is closed and read-only."
          : "."),
    );
    return ok();
  }
  // not created yet: remember the move, then open the create form linked to the project
  p.pendingMove = { to: t.kind, why, by: myId(), at: now() };
  save();
  if (t.kind === "circles") return A.newCircle({ project: p.id });
  if (t.kind === "ropes")
    return A.newRope({ fromKind: "projects", fromId: p.id });
  return A.newRoom({ origin: "Project", project: p.id });
}
// Called by each create form once its room exists: the project's first room, or one it was waiting to move into.
function projRoomCreated(p, kind, sp) {
  if (!p || !sp || sp.state !== "Active") return;
  const pm = p.pendingMove && p.pendingMove.to === kind ? p.pendingMove : null;
  if (pm || !projHere(p)) projMoveDone(p, kind, sp, pm ? pm.why : "");
}
// The project's room, with the way to move it — on the project page and on each of its rooms.
function projRoomBar(p, hereKind) {
  if (!p || p.status !== "Accepted") return "";
  // in final review or closed, the project is no longer in a room: say so instead of "not started"
  if (["Final review", "Closed"].includes(p.stage)) {
    const lr = projLastRoom(p);
    const lsp = lr && projSpace(p, lr.kind);
    return `<section class="prj-room" aria-label="Project room"><div class="prj-room-w"><span class="tile ${p.stage === "Closed" ? "t-teal" : "t-navy"}" aria-hidden="true">${ic(p.stage === "Closed" ? "check" : "award", 16)}</span><div class="col prj-room-t"><span class="cap">${SPACE_KINDS.includes(hereKind) ? "Project “" + L(h(p.title), "project", { id: p.id }, "lnk") + "”" : "The project"}</span><b>${p.stage === "Closed" ? "Approved and closed" : "In final review with the Faculty/Steward"}</b>${lr ? `<span class="cap">Last room: ${projRoomLabel(lr)}${lsp ? " · " + h(lsp.name) + " " + pill(lsp.state) : ""}</span>` : ""}</div></div></section>`;
  }
  const here = projHere(p);
  const sp = here && projSpace(p, here.kind);
  const mv = projMover(p);
  const last = (p.moves || []).slice(-1)[0];
  const thisIsIt = !!here && hereKind === here.kind;
  const moveHere = mv && SPACE_KINDS.includes(hereKind) && !thisIsIt;
  const btn = !mv
    ? ""
    : moveHere
      ? B(
          ic("arrow", 14) + "Move the project here",
          "projMove",
          { id: p.id, to: hereKind },
          "btn-p btn-sm",
        )
      : B(
          ic("arrow", 14) + (here ? "Move project" : "Start the project"),
          "projMove",
          { id: p.id },
          here ? "btn-s btn-sm" : "btn-p btn-sm",
        );
  const name = sp
    ? canOpenSpace(here.kind, sp) && !thisIsIt
      ? L(h(sp.name), OBJ_ROUTE[here.kind], { id: sp.id }, "lnk")
      : h(sp.name)
    : "";
  const where = here
    ? `<span class="tile ${here.tile}" aria-hidden="true">${ic(here.icon, 16)}</span><div class="col prj-room-t"><span class="cap">${thisIsIt ? "Project “" + h(p.title) + "” is in this room" : SPACE_KINDS.includes(hereKind) ? "Project “" + L(h(p.title), "project", { id: p.id }, "lnk") + "” is in" : "The project is in"}</span><b>${projRoomLabel(here)}${name ? " · " + name : ""}</b>${last ? `<span class="cap">${last.from ? "Moved from " + h(projRoomLabel(projRoomOf(last.from))) : "Started"} ${fmt(last.at)} · ${moveBy(last)}</span>` : ""}</div>`
    : `<span class="tile t-soft" aria-hidden="true">${ic("flag", 16)}</span><div class="col prj-room-t"><b>Not started in a room yet</b><span class="cap">Start in a Circle, Rope Team or ${WL()} — any of them, then move in any order.</span></div>`;
  // an open publication vote this person has not voted on yet (publish.js)
  const pv = pubOpen(p);
  const vote =
    pv && pubCanVote(p, pv) && pv.votes[myId()] == null
      ? L(
          ic("vote", 14) + "Vote on publication",
          "pubvote",
          { id: p.id },
          "btn btn-s btn-sm",
        )
      : "";
  // this room was closed when the project moved on: read-only, with where the work is now
  const hereSp = SPACE_KINDS.includes(hereKind)
    ? byId(hereKind, p[projRoomOf(hereKind).key])
    : null;
  const closedNote =
    hereSp && hereSp.closedFor && roomClosed(hereSp)
      ? banner(
          "info",
          "This " + projRoomLabel(projRoomOf(hereKind)) + " is closed",
          "It closed on " +
            fmt(hereSp.closedAt) +
            " when the project moved to " +
            (sp
              ? projRoomLabel(here) + " “" + h(sp.name) + "”"
              : "another room") +
            ". You can read everything recorded here, but nothing can be added, changed or submitted." +
            (mv ? " Moving the project back here reopens it." : ""),
          "lock",
        )
      : "";
  const status = sp ? " " + pill(sp.state) : "";
  return `${closedNote}<section class="prj-room" aria-label="Project room"><div class="prj-room-w">${where.replace("</b>", status + "</b>")}</div>${btn || vote ? `<div class="prj-room-a">${vote}${btn}</div>` : ""}</section>`;
}
// Creating the project's own Circle, Rope Team or Action Room while it works in another room is a move: it goes
// through Move project, so the person confirms that the current room closes. (Moves already confirmed, and projects
// not yet in a room, create directly as before.)
const projCreateMove = (kind, pid) => {
  const p = byId("projects", pid);
  if (
    !p ||
    p.status !== "Accepted" ||
    !projHere(p) ||
    projHere(p).kind === kind ||
    p[projRoomOf(kind).key]
  )
    return false;
  if (p.pendingMove && p.pendingMove.to === kind) return false;
  if (!projMover(p)) return false;
  A.projMove({ id: p.id, to: kind });
  return true;
};
["newCircle", "newRope", "newRoom"].forEach((k) => {
  const kind = { newCircle: "circles", newRope: "ropes", newRoom: "rooms" }[k];
  const orig = A[k];
  A[k] = (d) =>
    projCreateMove(
      kind,
      (d && (d.project || (d.fromKind === "projects" && d.fromId))) || "",
    )
      ? undefined
      : orig(d);
});
// ---- closed rooms are read-only in the page too: actions that change something are switched off (guards.js also
// refuses them); viewing, tabs, downloads and moving the project back stay available.
const RO_OK = [
  "taskView",
  "myTaskOpen",
  "docDl",
  "docZip",
  "pubDl",
  "pubZip",
  "mrDetails",
  "chatQSum",
  "pwActivity",
  "projMove",
  "pmv",
  "pmvConfirm",
  "fakeDl",
];
const RO_ROUTE = { circle: "circles", rope: "ropes", room: "rooms" };
const roRoom = () => {
  const k = RO_ROUTE[UI.route];
  const o = k && UI.p && byId(k, UI.p.id);
  return o && roomClosed(o) ? o : null;
};
AFTER.push((el) => {
  if (!roRoom()) return;
  const off = (n) => n && typeof G === "object" && G[n] && !RO_OK.includes(n);
  el.querySelectorAll("#main [data-a], .modal [data-a]").forEach((b) => {
    if (off(b.dataset.a)) {
      b.disabled = true;
      b.setAttribute("aria-disabled", "true");
      b.title = "This room is closed: read-only";
      b.classList.add("ro-off");
    }
  });
  el.querySelectorAll("#main form[data-f], .modal form[data-f]").forEach(
    (f) => {
      if (!off(f.dataset.f)) return;
      f.querySelectorAll(
        "input:not([type=hidden]),select,textarea,button",
      ).forEach((i) => {
        i.disabled = true;
        if (i.tagName === "BUTTON") i.title = "This room is closed: read-only";
      });
      f.classList.add("ro-form");
    },
  );
});
// Who made a move. A move made by a sponsor shows the project's alias, never the sponsor's name.
const moveBy = (m) => (m.byLabel ? h(m.byLabel) : nm(m.by));
// Every move, newest first (project page).
function projMovesCard(p) {
  const mv = (p.moves || []).slice().reverse();
  if (!mv.length) return "";
  return card(
    "Room moves",
    "Where the project has been. Each room stays open and linked after the project moves on.",
    mv
      .map((m) =>
        lrow(
          projRoomOf(m.to).icon,
          (m.from
            ? h(projRoomLabel(projRoomOf(m.from))) + " → "
            : "Started in ") +
            h(projRoomLabel(projRoomOf(m.to))) +
            " · " +
            h(objName(m.space)),
          (m.why ? h(m.why) + " · " : "") + moveBy(m) + " · " + fmt(m.at),
          "",
          projRoomOf(m.to).tile,
        ),
      )
      .join(""),
    "",
    "prj-panel",
  );
}
// A short read-only summary of the project a room is being created for, so its details travel with the room.
const projBrief = (p) =>
  p
    ? `<div class="prj-brief">${dl([
        ["Project", h(p.title)],
        ["Owner", nm(p.owner)],
        ["Country", h(p.country || "—") + (p.area ? " · " + h(p.area) : "")],
        [
          "Now in",
          projHere(p)
            ? projRoomLabel(projHere(p))
            : "Not started in a room yet",
        ],
      ])}</div>`
    : "";
