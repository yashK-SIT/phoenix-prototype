// ---------- ACTION ROOMS / WORKSPACES (E07, F07) ----------
// Leading an Action Room follows the person's role in that room: Project owner or Facilitator.
const isLead = (x) =>
  sCan("rooms", x, "lead") || (hasB("Project Lead") && memberOf(x));
const canCreateRoom = () =>
  ["F", "C", "O", "A"].includes(role()) || hasB("Project Lead");
route("rooms", "rooms", () => {
  const r = role();
  const list = S.rooms.filter(
    (x) =>
      inCtx(x) &&
      ((memberRec(x) && memberRec(x).status !== "Removed") ||
        ["A", "O"].includes(r)),
  );
  return (
    head(
      WL() + "s",
      "Execution spaces where agreed work is planned, assigned and delivered.",
      canCreateRoom()
        ? B(
            ic("plus", 16) + "Create " + WL(),
            "newRoom",
            { origin: "Institutional project" },
            "btn-p",
          )
        : r === "P" && S.settings.participantCanProposeWorkspace
          ? B(
              "Propose a " + WL(),
              "newRoom",
              { origin: "Community initiative" },
              "btn-s",
            )
          : "",
    ) +
    `<section class="card ws-listcard">` +
    table(
      [WL(), "Lead", "Your role", "Origin", "Members", "Progress", "State", ""],
      list.map((x) => [
        `<div class="ws-name"><span class="tile t-navy" aria-hidden="true">${ic("room", 16)}</span><div class="ws-name-t"><b>${h(x.name)}</b>${unreadIn(x) && memberOf(x) ? ` <span class="mbadge">${unreadIn(x)}</span>` : ""}${x.purpose ? `<span class="cap">${h(x.purpose)}</span>` : ""}</div></div>`,
        nm(x.lead),
        spaceRole("rooms", x)
          ? h(spaceRole("rooms", x))
          : (memberRec(x) || {}).status === "Invited"
            ? pill("Invited")
            : '<span class="cap">Oversight</span>',
        h(x.origin.type) + " · " + cName(x.origin.id),
        `<span class="ws-mem"><span class="avstack">${x.members.filter((m) => m.status === "Active").slice(0, 4).map((m) => `<span class="av sm" title="${nm(m.pid)}">${ini(m.pid)}</span>`).join("")}</span><span>${x.members.length}</span></span>`,
        ((req) => `<span class="ws-prog"><span class="progress" aria-hidden="true"><span class="bar" style="width:${req.length ? Math.round((req.filter((k) => k.status === "Done").length / req.length) * 100) : 0}%"></span></span><span class="cap">${req.length ? req.filter((k) => k.status === "Done").length + " of " + req.length + " done" : "No deliverables yet"}</span></span>`)((x.tasks || []).filter((k) => !["Proposed", "Declined"].includes(k.status) && !k.opt)),
        pill(x.state),
        (memberRec(x) || {}).status === "Invited"
          ? B(
              "Respond to invite",
              "go",
              { r: "room", id: x.id },
              "btn-p btn-sm",
            )
          : L("Open", "room", { id: x.id }),
      ]),
      "No " + WL() + "s yet.",
    ) +
    `</section>`
  );
});
A.newRoom = (d) => {
  clearF("nr");
  const pr = d.project && byId("projects", d.project);
  UI.form.nr = {
    name: pr ? pr.title + " — execution" : "",
    origin: d.origin === "Learning pathway" ? "Learning pathway" : "Project",
    oid: d.oid || "",
    project: d.project || "",
  };
  modal(
    (canCreateRoom() ? "Create " : "Propose ") + (/^[aeiou]/i.test(WL()) ? "an " : "a ") + WL(),
    () => `<form data-f="nr" class="col" style="gap:14px" novalidate><input type="hidden" name="project" value="${d.project || ""}"><input type="hidden" name="oid" value="${d.oid || ""}">
 ${fi("nr", "name", "Name", { req: true })}${fi("nr", "purpose", "Purpose / charter", { type: "textarea", rows: 3, req: true })}${fi("nr", "outcome", "Expected outcome", { type: "textarea", rows: 3, req: true })}
 ${fi("nr", "origin", "Primary origin", { type: "select", req: true, opts: ["Project", "Learning pathway"], help: d.oid ? "Linked to " + cName(d.oid) + " (linked, not duplicated)" : "" })}
 <div class="actions"><span></span><button class="btn btn-p" type="submit">${canCreateRoom() ? "Create" : "Propose"}</button></div></form>`,
  );
};
F.nr = (d) => {
  if (!validate("nr", d, { name: ["req"], purpose: ["req"], outcome: ["req"] }))
    return render();
  const flags = [];
  const creator = canCreateRoom();
  const pr = d.project && byId("projects", d.project);
  const st = !creator
    ? "Proposed"
    : flags.length
      ? "Pending approval"
      : "Active";
  const x = {
    id: uid("ar"),
    ctx: ctxId(),
    name: d.name,
    purpose: d.purpose,
    charter: d.purpose,
    outcome: d.outcome,
    lead: pr ? pr.owner : myId(),
    origin: { type: d.origin, id: d.oid || pr?.id || null },
    related: pr ? [pr.id] : [],
    state: st,
    flags,
    members: [
      { pid: pr ? pr.owner : myId(), role: "Project owner", status: "Active" },
    ],
    chat: [],
    joinReqs: [],
    tasks: [],
    milestones: [],
    decisions: [],
    risks: [],
    deps: [],
    resources: [],
    wins: [],
    changes: [],
    returns: [],
    final: null,
  };
  if (pr && !x.members.some((m) => m.pid === myId()))
    x.members.push({
      pid: myId(),
      role:
        defaultSpaceRole(role()) === "Observer"
          ? "Member"
          : defaultSpaceRole(role()),
      status: "Active",
    });
  if (pr) {
    const c = byId("circles", pr.circle);
    if (c)
      c.members
        .filter(
          (m) =>
            m.status === "Active" && m.pid !== pr.owner && m.role === "Member",
        )
        .forEach((m) =>
          x.members.push({ pid: m.pid, role: "Member", status: "Invited" }),
        );
  }
  if (pr && pr.pendingCollab) {
    pr.pendingCollab.forEach((pc) => {
      if (!x.members.some((m) => m.pid === pc.pid))
        x.members.push({
          pid: pc.pid,
          role: "Partner",
          label: pc.req,
          status: "Invited",
          req: pc.req,
          contrib: pc.contrib,
          match: pc.match,
        });
    });
    pr.pendingCollab = [];
  }
  S.rooms.push(x);
  if (pr) {
    pr.room = x.id;
    if (st === "Active") {
      pr.stage = "Room";
      pr.history.push({
        at: today(),
        t: WL() + " created; moved to " + WL() + " stage",
      });
    }
  }
  if (st !== "Active")
    S.assign
      .filter((a) => a.ctx === ctxId() && ["F", "A"].includes(roleBase(a.role)))
      .forEach((a) =>
        notify(a.pid, `${WL()} ${st.toLowerCase()}: ${x.name}`, "room", {
          id: x.id,
        }),
      );
  x.members
    .filter((m) => m.status === "Invited")
    .forEach((m) =>
      notify(m.pid, "Invitation to join " + x.name, "room", { id: x.id }),
    );
  audit(WL() + " " + st, x.id, flags.join(", "));
  UI.modal = null;
  clearF("nr");
  save();
  go("room", { id: x.id });
};
route("room", "rooms", () => {
  const x = byId("rooms", UI.p.id);
  if (!x) return empty("room", "Not found", "");
  const r = role();
  const isM = memberOf(x);
  const lead = isLead(x) || r === "A";
  const canReview = sCan("rooms", x, "review") || r === "A";
  const canPropose = sCan("rooms", x, "propose");
  const myM = memberRec(x);
  if (!isM && !(myM && myM.status === "Invited") && !["A", "O"].includes(r))
    return deniedView("rooms");
  if (myM && myM.status === "Invited")
    return (
      head(h(x.name), "You are invited to this " + WL()) +
      card(
        "",
        "",
        `<p>${h(x.charter)}</p>${
          myM.req
            ? `<div class="ws-gap">${dl([
                [
                  "Project",
                  cName(
                    (S.projects.find((p) => p.room === x.id) || {}).id || "",
                  ) || "—",
                ],
                ["Requirement you were matched to", h(myM.req)],
                ["Expected contribution", h(myM.contrib || "—")],
                ["Lead", nm(x.lead)],
              ])}</div>${banner("info", "", "You can accept or decline without obligation. If you accept, you join with this defined responsibility and submit contributions for Faculty/Steward review.")}`
            : ""
        }<div class="row ws-acts">${B("Decline", "roomInvite", { id: x.id, v: "Removed" })}${B("Accept", "roomInvite", { id: x.id, v: "Active" }, "btn-p btn-sm")}</div>`,
      )
    );
  const ro = x.state !== "Active";
  const pr = S.projects.find((p) => p.room === x.id);
  x.updates = x.updates || [];
  x.contribs = x.contribs || [];
  x.links = x.links || [];
  x.chat = x.chat || [];
  const pendC = x.contribs.filter((c) => c.status === "Submitted").length;
  const t = tabs(
    "ar_" + x.id,
    [
      ["overview", "Overview"],
      [
        "plan",
        "Tasks & milestones",
        x.tasks.filter((k) => k.status === "Proposed").length || null,
      ],
      ["chat", "Chat", isM && unreadIn(x) ? unreadIn(x) : null],
      ["contribs", "Contributions", pendC || null],
      ["dec", "Decisions"],
      ["risk", "Risks & dependencies"],
      ["change", "Change Objects", x.changes.length || null],
      ["ev", "Evidence"],
      ["members", "Members"],
      ["about", "Charter & lineage"],
    ],
    UI.p.tab,
  );
  let body = "";
  const own = (o) => o.owner === myId();
  if (t.cur === "overview") body = roomOverview(x, pr, lead, ro);
  if (t.cur === "contribs") body = roomContribs(x, lead, ro);
  if (t.cur === "chat")
    body =
      `<div class="ws-split ws-chat"><div class="ws-main"><div class="row wrap chatbar"><span class="cap">Group chat for members of this ${WL()}. ${isM ? L("Open in Messages", "messages", { c: x.id, k: "rooms" }) : ""}</span></div>` +
      chatThread("rooms", x, { embedded: true }) +
      `</div><aside class="ws-rail hide-md" aria-label="Members">${wsTeamCard("rooms", x)}</aside></div>`;
  if (t.cur === "plan")
    body = `<div class="g12">${roomFlowBanner(x)}<div class="c12">${taskBoard(x, lead, ro)}</div>
 ${card(
   "Milestones",
   "Evidence-linked completion is validated by a Reviewer.",
   table(
     ["Milestone", "Due", "Status", "Evidence", ""],
     x.milestones.map((m) => [
       h(m.t),
       fmt(m.due) + dueTag(m.due, m.status === "Achieved"),
       pill(m.status),
       m.evidence
         ? L(h(byId("evidence", m.evidence)?.title || m.evidence), "evidence", {
             id: m.evidence,
           }) +
           " " +
           pill(byId("evidence", m.evidence)?.review || "")
         : "—",
       !ro
         ? (m.status !== "Achieved" && isM
             ? B("Link evidence", "msEvidence", { r: x.id, id: m.id })
             : "") +
           (m.status !== "Achieved" && m.evidence && canReview
             ? B(
                 "Validate as achieved",
                 "msAchieve",
                 { r: x.id, id: m.id },
                 "btn-p btn-sm",
               )
             : "")
         : "",
     ]),
   ),
   !ro && lead
     ? B(
         ic("plus", 14) + "Add milestone",
         "roomItem",
         { r: x.id, k: "milestones" },
         "btn-p btn-sm",
       )
     : "",
   "c12",
 )}</div>`;
  if (t.cur === "dec")
    body = card(
      "Decisions",
      "Draft → Proposed → Approved → Superseded → Closed",
      table(
        ["Decision", "Owner", "State", ""],
        x.decisions.map((k) => [
          h(k.t),
          nm(k.owner),
          pill(k.state),
          !ro && lead
            ? ["Proposed", "Approved", "Superseded", "Closed"]
                .filter((s) => s !== k.state)
                .map((s) =>
                  B(s, "itemState", {
                    r: x.id,
                    k: "decisions",
                    id: k.id,
                    v: s,
                  }),
                )
                .join("")
            : "",
        ]),
      ),
      !ro && canPropose
        ? B(
            ic("plus", 14) + "Record decision",
            "roomItem",
            { r: x.id, k: "decisions" },
            "btn-p btn-sm",
          )
        : "",
    );
  if (t.cur === "risk")
    body = `<div class="g12">${card(
      "Risks and issues",
      "Open → Mitigated / Accepted / Escalated → Closed",
      table(
        ["Risk", "Owner", "State", ""],
        x.risks.map((k) => [
          h(k.t),
          nm(k.owner),
          pill(k.state),
          !ro && (lead || own(k))
            ? ["Mitigated", "Accepted", "Escalated", "Closed"]
                .filter((s) => s !== k.state)
                .map((s) =>
                  B(s, "itemState", { r: x.id, k: "risks", id: k.id, v: s }),
                )
                .join("")
            : "",
        ]),
      ),
      !ro && canPropose
        ? B(
            ic("plus", 14) + "Add risk",
            "roomItem",
            { r: x.id, k: "risks" },
            "btn-p btn-sm",
          )
        : "",
      "c12",
    )}${card(
      "Dependencies",
      "The dependent activity, resource or party and its status.",
      table(
        ["Dependency", "On", "State", ""],
        x.deps.map((k) => [
          h(k.t),
          h(k.on),
          pill(k.state, { Blocked: "p-red", Resolved: "p-green" }[k.state]),
          !ro && lead
            ? ["Open", "Confirmed", "Blocked", "Resolved"]
                .filter((s) => s !== k.state)
                .map((s) =>
                  B(s, "itemState", { r: x.id, k: "deps", id: k.id, v: s }),
                )
                .join("")
            : "",
        ]),
      ),
      !ro && lead
        ? B(
            ic("plus", 14) + "Add dependency",
            "roomItem",
            { r: x.id, k: "deps" },
            "btn-s btn-sm",
          )
        : "",
      "c12",
    )}</div>`;
  if (t.cur === "change")
    body = card(
      "Change Objects",
      "Proposed → Reviewed → Approved → In Implementation → Completed → Closed. Human approval required before it becomes an approved action record.",
      x.changes
        .map(
          (c) =>
            `<article class="co-item"><header class="co-h"><span class="tile t-soft" aria-hidden="true">${ic("layers", 16)}</span><b>${h(c.title)}</b>${pill(c.state)}</header>${dl(
              [
                ["Context", h(c.context)],
                ["Intended change", h(c.intended)],
                ["Stakeholders", h(c.stakeholders)],
                ["Success conditions", h(c.success || "—")],
                ["Risks / dependencies", h(c.risks || "—")],
                [
                  "Version",
                  "v" +
                    c.ver +
                    " · " +
                    c.history
                      .map(
                        (v) => "v" + v.ver + " " + nm(v.by) + ": " + h(v.why),
                      )
                      .join(" · "),
                ],
              ],
            )}<div class="row wrap co-acts">${!ro ? { Proposed: canReview && B("Mark reviewed", "coState", { r: x.id, id: c.id, v: "Reviewed" }), Reviewed: (r === "F" || r === "A") && B("Approve", "coState", { r: x.id, id: c.id, v: "Approved" }, "btn-p btn-sm"), Approved: lead && B("Start implementation", "coState", { r: x.id, id: c.id, v: "In Implementation" }), "In Implementation": lead && B("Mark completed", "coState", { r: x.id, id: c.id, v: "Completed" }), Completed: lead && B("Close", "coState", { r: x.id, id: c.id, v: "Closed" }) }[c.state] || "" : ""}${!ro && canPropose && !["Completed", "Closed"].includes(c.state) ? B("Revise (new version)", "coRevise", { r: x.id, id: c.id }) : ""}</div></article>`,
        )
        .join("") ||
        empty(
          "layers",
          "No Change Objects",
          "Compose a structured, versioned record of an intended change.",
        ),
      !ro && canPropose
        ? B(
            ic("plus", 14) + "Compose Change Object",
            "coNew",
            { r: x.id },
            "btn-p btn-sm",
          )
        : "",
    );
  if (t.cur === "ev") {
    const ev = S.evidence.filter(
      (e) =>
        e.linked.includes(x.id) &&
        (e.owner === myId() ||
          e.review === "Approved" ||
          r === "F" ||
          canReview ||
          hasB("Reviewer") ||
          e.vis === "Room"),
    );
    body = card(
      "Evidence linked to this " + WL(),
      "",
      table(
        ["Evidence", "Type", "Level", "Review", "Release"],
        ev.map((e) => [
          L(h(e.title), "evidence", { id: e.id }),
          h(e.type),
          pill(e.level, "p-navy"),
          pill(e.review),
          h(e.release),
        ]),
      ),
      !ro && canPropose
        ? B(
            ic("upload", 14) + "Upload evidence",
            "go",
            { r: "newevidence", link: x.id },
            "btn-p btn-sm",
          )
        : "",
    );
  }
  if (t.cur === "members")
    body = card(
      "Members and join approvals",
      "Risk- and authority-based join rules apply.",
      table(
        ["Member", "Role in this " + WL(), "Status", ""],
        x.members.map((m, i) => {
          const sr = m.pid === x.lead ? "Project owner" : normRole(m.role);
          return [
            nm(m.pid) +
              ` <span class="cap">${h(ROLE[ctxRole(m.pid, x.ctx)] || "")}${m.label ? " · " + h(m.label) : ""}</span>`,
            lead && m.pid !== x.lead && !ro && m.status === "Active"
              ? roleSelect(
                  "memRole",
                  { kind: "rooms", c: x.id, i },
                  sr,
                  "Role of " + P(m.pid).name,
                )
              : h(roleLabel(sr)) +
                (m.req
                  ? `<div class="cap">Responsibility: ${h(m.req)}</div>`
                  : ""),
            pill(m.status),
            lead && m.pid !== x.lead && !ro && m.status !== "Removed"
              ? CB(
                  "Remove",
                  "roomMem",
                  { r: x.id, i, v: "Removed" },
                  "Remove " +
                    P(m.pid).name +
                    " from this " +
                    WL() +
                    "? Their contributions stay in the record.",
                )
              : "",
          ];
        }),
      ) +
        `<h3 class="h3 ws-subh">Join requests</h3>` +
        table(
          ["Person", "Join case", "Status", "Note", ""],
          x.joinReqs.map((j) => [
            nm(j.pid),
            h(j.kind),
            pill(j.status),
            h(j.note || ""),
            j.status === "Pending" && (r === "F" || r === "A" || lead)
              ? B("Decline", "joinDecide", {
                  r: x.id,
                  id: j.id,
                  v: "Declined",
                }) +
                B(
                  "Approve",
                  "joinDecide",
                  { r: x.id, id: j.id, v: "Approved" },
                  "btn-p btn-sm",
                )
              : "",
          ]),
        ),
      !ro && lead
        ? B(
            ic("plus", 14) + "Invite or add",
            "roomInviteNew",
            { r: x.id },
            "btn-p btn-sm",
          )
        : "",
    );
  if (t.cur === "about")
    body = `<div class="g12">${card("Charter", "", dl([["Purpose / charter", h(x.charter)], ["Expected outcome", h(x.outcome || "—")], ["Lead", nm(x.lead)], ["State", pill(x.state)], x.flags.length && ["Approval flags", x.flags.map(h).join(", ")], ["Primary origin", h(x.origin.type) + " · " + (x.origin.id ? cName(x.origin.id) : "—")], ["Related objects", x.related.map(cName).join(", ") || "—"], ["Linked learning activities and records", x.links.map((l) => pill(l.type, "p-grey") + " " + h(l.label)).join("<br>") || "—"]]), !ro && isM ? B(ic("link", 14) + "Link by reference", "roomLink", { r: x.id }) : "", "c7")}
 ${card("Lifecycle", "Draft · Proposed · Pending approval · Active · Closed", `<div class="col" style="gap:8px">${x.state === "Proposed" && canCreateRoom() ? B("Activate", "roomState", { r: x.id, v: x.flags.length ? "Pending approval" : "Active" }, "btn-p btn-sm") + B("Decline (back to Draft)", "roomDecline", { r: x.id }) : ""}${x.state === "Proposed" && !canCreateRoom() ? '<p class="cap">Proposed. An authorised Faculty/Steward, Project Lead, Partner, Organization Representative or Programme Administrator activates it.</p>' : ""}${x.state === "Pending approval" && (r === "F" || r === "A") ? B("Approve activation", "roomState", { r: x.id, v: "Active" }, "btn-p btn-sm") + B("Decline (back to Draft)", "roomDecline", { r: x.id }) : ""}${x.state === "Draft" && isM ? B("Re-propose", "roomState", { r: x.id, v: "Proposed" }) : ""}${x.declineReason ? banner("warn", "Approval declined", h(x.declineReason)) : ""}${!ro && isM && !pr ? B(ic("refresh", 14) + "Return issue to Circle", "returnTo", { from: "rooms", id: x.id, to: "circle" }) : ""}${!ro && isM ? B(ic("sparkle", 14) + "Start a Learning Harvest", "newHarvest", { scope: x.id }) : ""}${x.state === "Active" && lead && !pr ? B("Close " + WL(), "roomClose", { r: x.id }) : ""}${pr ? `<p class="cap">Final deliverables are submitted from the Overview tab or the ${L("project", "project", { id: pr.id })}. Backward movement is on the Overview tab.</p>` : ""}</div>`, "", "c5")}
 ${returnsCard(x) ? `<div class="c12">${returnsCard(x)}</div>` : ""}</div>`;
  return (
    spaceHead(
      "rooms",
      x,
      h(x.purpose),
      [[WL() + "s", "rooms"], [h(x.name)]],
      isM
        ? L(
            ic("message", 16) + "Open in Messages",
            "messages",
            { c: x.id, k: "rooms" },
            "btn btn-s",
          ) +
            (x.state === "Active" && (lead || canPropose)
              ? B(
                  ic("plus", 16) + (lead ? "Create task" : "Propose task"),
                  "roomItem",
                  { r: x.id, k: "tasks" },
                  "btn-p",
                )
              : "")
        : "",
    ) +
    roleNote("rooms", x) +
    (pr ? stageTrack(pr, "rooms") : "") +
    (x.state === "Pending approval"
      ? banner(
          "warn",
          "Awaiting approval",
          "This " +
            WL() +
            " needs approval because it: " +
            x.flags.map(h).join(", ") +
            ". " +
            (r === "F" || r === "A"
              ? 'You can approve or decline activation.<span class="row wrap ws-banact">' +
                B(
                  "Approve activation",
                  "roomState",
                  { r: x.id, v: "Active" },
                  "btn-p btn-sm",
                ) +
                B("Decline (back to Draft)", "roomDecline", { r: x.id }) +
                "</span>"
              : "Approval is with a Faculty/Steward or Programme Administrator in this context; it is in their Review inbox."),
        )
      : "") +
    (x.state === "Proposed"
      ? banner(
          "info",
          "Proposed",
          canCreateRoom()
            ? "Activate it to start work" +
                (x.flags.length
                  ? " (it then needs Faculty/Steward or Programme Administrator approval)"
                  : "") +
                ', or decline it back to Draft.<span class="row wrap ws-banact">' +
                B(
                  "Activate",
                  "roomState",
                  {
                    r: x.id,
                    v: x.flags.length ? "Pending approval" : "Active",
                  },
                  "btn-p btn-sm",
                ) +
                B("Decline (back to Draft)", "roomDecline", { r: x.id }) +
                "</span>"
            : "An authorised Faculty/Steward, Project Lead, Partner, Organization Representative or Programme Administrator activates it.",
        )
      : "") +
    t.html +
    body
  );
});
A.roomInvite = (d) => {
  const x = byId("rooms", d.id);
  x.members.find((m) => m.pid === myId()).status = d.v;
  if (d.v === "Active") sysMsg(x, me().name + " joined the " + WL());
  audit(WL() + " invitation " + d.v, x.id, "");
  if (d.v !== "Active") {
    save();
    return go("rooms");
  }
  ok();
};
A.roomItem = (d) => {
  const k = d.k;
  clearF("ri");
  mselReset("ri", "partners");
  const x = byId("rooms", d.r);
  const mem = x.members
    .filter((m) => m.status === "Active")
    .map((m) => [m.pid, P(m.pid).name]);
  modal(
    {
      tasks: isLead(x) || role() === "A" ? "Create task" : "Propose task",
      milestones: "Add milestone",
      decisions: "Record decision",
      risks: "Add risk",
      deps: "Add dependency",
      resources: "Add resource",
      wins: "Record a visible win",
    }[k],
    () =>
      `<form data-f="ri" class="col" style="gap:14px" novalidate><input type="hidden" name="r" value="${x.id}"><input type="hidden" name="k" value="${k}"><input type="hidden" name="st" value="${d.st || ""}">${fi("ri", "t", k === "deps" ? "Dependent activity / resource" : "Title", { req: true })}${["tasks", "decisions", "risks"].includes(k) ? fi("ri", "owner", k === "tasks" ? "Assignee" : "Owner", { type: "select", req: true, opts: mem, value: d.owner || myId(), help: k === "tasks" ? "Any active member of this " + WL() + "." : "" }) : ""}${["tasks", "milestones"].includes(k) ? fi("ri", "due", "Due date", { type: "date", req: true }) : ""}${k === "tasks" ? fi("ri", "prio", "Priority", { type: "select", opts: TASK_PRIOS, value: "Medium" }) + fi("ri", "desc", "Description", { type: "textarea", rows: 3 }) + msel("ri", "partners", "Partners / contributors", roomActive(x).map((m) => ({ pid: m.pid, sub: spaceRole("rooms", x, m.pid) || "" })), [], { help: "People who contribute to this deliverable besides the assignee." }) + fi("ri", "req", "Required deliverable — must be done before evidence upload and the Learning Harvest", { type: "checkbox", value: "yes" }) : ""}${k === "deps" ? fi("ri", "on", "Depends on (party)", { req: true }) : ""}${k === "resources" ? fi("ri", "from", "Provided by", { req: true }) : ""}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save</button></div></form>`,
  );
};
F.ri = (d) => {
  const rules = { t: ["req"] };
  if (["tasks", "milestones"].includes(d.k)) rules.due = ["req", "date"];
  if (d.k === "deps") rules.on = ["req"];
  if (d.k === "resources") rules.from = ["req"];
  if (!validate("ri", d, rules)) return render();
  const x = byId("rooms", d.r);
  const lead = isLead(x) || role() === "A";
  const o = { id: uid("it"), t: d.t };
  if (d.k === "tasks" && d.st && lead && TASK_COLS.includes(d.st)) o.st0 = d.st;
  if (d.k === "tasks")
    Object.assign(o, {
      owner: d.owner,
      due: d.due,
      status: lead ? "To do" : "Proposed",
      by: myId(),
      key: nextTaskKey(x),
      prio: d.prio || "Medium",
      desc: d.desc || "",
      partners: [].concat(d.partners || []).filter((p) => p !== d.owner),
      evidence: [],
      ...(d.req === "yes" ? {} : { opt: true }),
      log: [{ at: now(), by: myId(), t: lead ? "Created" : "Proposed" }],
    });
  if (d.k === "tasks" && !lead)
    x.members
      .filter(
        (m) =>
          ["Project owner", "Facilitator"].includes(
            spaceRole("rooms", x, m.pid),
          ) && m.pid !== myId(),
      )
      .forEach((m) =>
        notify(m.pid, "Task proposed in " + x.name + ": " + d.t, "room", {
          id: x.id,
          tab: "plan",
        }),
      );
  if (d.k === "milestones")
    Object.assign(o, { due: d.due, status: "Not started", evidence: null });
  if (d.k === "decisions") Object.assign(o, { owner: d.owner, state: "Draft" });
  if (d.k === "risks") Object.assign(o, { owner: d.owner, state: "Open" });
  if (d.k === "deps") Object.assign(o, { on: d.on, state: "Open" });
  if (d.k === "resources")
    Object.assign(o, { from: d.from, status: "Committed" });
  if (d.k === "wins") Object.assign(o, { status: "Proposed" });
  if (o.st0) {
    o.status = o.st0;
    delete o.st0;
  }
  x[d.k].push(o);
  if (d.k === "tasks")
    sysMsg(
      x,
      (lead ? "Task created: " : "Task proposed: ") +
        o.t +
        " → " +
        P(o.owner).name,
    );
  if (o.owner && o.owner !== myId())
    notify(o.owner, "Assigned to you in " + x.name + ": " + o.t, "room", {
      id: x.id,
    });
  audit(WL() + " " + d.k.slice(0, -1) + " added", x.id, o.t);
  UI.modal = null;
  clearF("ri");
  ok();
};

A.itemState = (d) => {
  const x = byId("rooms", d.r);
  const k = x[d.k].find((t) => t.id === d.id);
  k.state = d.v;
  if (d.k === "risks" && d.v === "Escalated")
    S.assign
      .filter((a) => a.ctx === x.ctx && roleBase(a.role) === "F")
      .forEach((a) =>
        notify(a.pid, "Risk escalated in " + x.name + ": " + k.t, "room", {
          id: x.id,
          tab: "risk",
        }),
      );
  audit(d.k + " state", x.id, k.t + " → " + d.v);
  ok();
};
A.winApprove = (d) => {
  const x = byId("rooms", d.r);
  x.wins.find((w) => w.t === d.t).status = "Approved";
  audit("Visible win approved", x.id, d.t);
  ok();
};
A.msEvidence = (d) => {
  const x = byId("rooms", d.r);
  const ev = S.evidence.filter(
    (e) =>
      e.linked.includes(x.id) && !["Withdrawn", "Rejected"].includes(e.review),
  );
  modal(
    "Link evidence to milestone",
    `<form data-f="mse" class="col" style="gap:14px"><input type="hidden" name="r" value="${x.id}"><input type="hidden" name="id" value="${d.id}">${ev.length ? fi("mse", "ev", "Evidence", { type: "select", opts: ev.map((e) => [e.id, e.title + " (" + e.review + ")"]) }) : '<p class="cap">No evidence linked to this ' + WL() + " yet.</p>"}<div class="actions">${B("Upload new evidence", "go", { r: "newevidence", link: x.id })}${ev.length ? '<button class="btn btn-p" type="submit">Link</button>' : ""}</div></form>`,
  );
};
F.mse = (d) => {
  const x = byId("rooms", d.r);
  const m = x.milestones.find((m) => m.id === d.id);
  m.evidence = d.ev;
  if (m.status === "Not started") m.status = "In progress";
  audit("Evidence linked to milestone", x.id, m.t);
  UI.modal = null;
  ok();
};
A.msAchieve = (d) => {
  const x = byId("rooms", d.r);
  const m = x.milestones.find((m) => m.id === d.id);
  const ev = byId("evidence", m.evidence);
  if (!ev || ev.review !== "Approved")
    return deny(
      "evidence must be approved before the milestone is recorded as achieved",
    );
  m.status = "Achieved";
  S.candidates.push({
    id: uid("cd"),
    pid: ev.owner,
    field: "Completed milestone",
    value: m.t + " (" + x.name + ")",
    source: "Validated milestone",
    prov: "Evidence-supported",
    status: "Pending",
  });
  notify(x.lead, "Milestone validated: " + m.t, "room", { id: x.id });
  audit("Milestone validated", x.id, m.t);
  toast("Milestone recorded as achieved.");
  ok();
};
A.coNew = (d) => {
  clearF("co");
  modal(
    "Compose a Change Object",
    () =>
      `<form data-f="co" class="col" style="gap:12px" novalidate><input type="hidden" name="r" value="${d.r}">${fi("co", "title", "Title", { req: true })}${fi("co", "context", "Context", { type: "textarea", rows: 2, req: true })}${fi("co", "intended", "Intended change", { type: "textarea", rows: 2, req: true })}<div class="f2">${fi("co", "stakeholders", "Stakeholders", { req: true })}${fi("co", "parties", "Responsible parties", { req: true })}</div>${fi("co", "outcomes", "Intended outcomes", { req: true })}${fi("co", "success", "Success conditions", { req: true })}<div class="f2">${fi("co", "assumptions", "Assumptions")}${fi("co", "risks", "Risks and dependencies")}</div><div class="f2">${fi("co", "metrics", "Metrics")}${fi("co", "evref", "Evidence references")}</div><div class="actions"><span></span><button class="btn btn-p" type="submit">Propose</button></div></form>`,
    true,
  );
};
F.co = (d) => {
  if (
    !validate("co", d, {
      title: ["req"],
      context: ["req"],
      intended: ["req"],
      stakeholders: ["req"],
      parties: ["req"],
      outcomes: ["req"],
      success: ["req"],
    })
  )
    return render();
  const x = byId("rooms", d.r);
  x.changes.push({
    id: uid("co"),
    ...d,
    state: "Proposed",
    ver: 1,
    history: [{ ver: 1, by: myId(), why: "Initial" }],
  });
  S.assign
    .filter((a) => a.ctx === x.ctx && roleBase(a.role) === "F")
    .forEach((a) =>
      notify(a.pid, "Change Object proposed in " + x.name, "room", {
        id: x.id,
        tab: "change",
      }),
    );
  audit("Change Object proposed", x.id, d.title);
  UI.modal = null;
  clearF("co");
  ok();
};
A.coState = (d) => {
  const x = byId("rooms", d.r);
  const c = x.changes.find((c) => c.id === d.id);
  c.state = d.v;
  audit("Change Object " + d.v, x.id, c.title);
  ok();
};
A.coRevise = (d) => {
  const x = byId("rooms", d.r);
  const c = x.changes.find((c) => c.id === d.id);
  UI.form.cor = { intended: c.intended, success: c.success || "" };
  modal(
    "Revise Change Object",
    () =>
      `<form data-f="cor" class="col" style="gap:12px" novalidate><input type="hidden" name="r" value="${x.id}"><input type="hidden" name="id" value="${c.id}">${fi("cor", "intended", "Intended change", { type: "textarea", rows: 2, req: true })}${fi("cor", "success", "Success conditions", { req: true })}${fi("cor", "why", "Reason for revision", { req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save new version</button></div></form>`,
  );
};
F.cor = (d) => {
  if (
    !validate("cor", d, { intended: ["req"], success: ["req"], why: ["req"] })
  )
    return render();
  const x = byId("rooms", d.r);
  const c = x.changes.find((c) => c.id === d.id);
  c.intended = d.intended;
  c.success = d.success;
  c.ver++;
  c.history.push({ ver: c.ver, by: myId(), why: d.why });
  c.state = "Proposed";
  audit("Change Object revised", x.id, "v" + c.ver);
  UI.modal = null;
  clearF("cor");
  ok();
};
A.roomMem = (d) => {
  const x = byId("rooms", d.r);
  x.members[d.i].status = d.v;
  audit(WL() + " membership " + d.v, x.id, x.members[d.i].pid);
  ok();
};
const JOIN_RULES = {
  "Participant in this context": "Invitation acceptance",
  "External organization representative": "Additional approval / mandate check",
  "Institutional representative (can bind the organization)":
    "Mandate required",
  "Reviewer / approver": "Explicit role approval",
  "Finance / resource authority": "Explicit authority approval",
  "Restricted / sensitive access": "Additional access approval",
  "Research-related access": "Research permission + role approval",
  "Public-release authority": "Explicit authority approval",
  Sponsor: "No automatic membership",
};
A.roomInviteNew = (d) => {
  clearF("rin");
  const x = byId("rooms", d.r);
  modal(
    "Invite or add to " + h(x.name),
    () =>
      `<form data-f="rin" class="col" style="gap:14px" novalidate><input type="hidden" name="r" value="${x.id}">${fi("rin", "pid", "Person", { type: "select", req: true, ph: "Select", opts: S.assign.filter((a) => a.ctx === x.ctx && a.status === "Active" && !memberOf(x, a.pid)).map((a) => [a.pid, P(a.pid).name + " — " + ROLE[a.role]]) })}${fi("rin", "role", "Role in this " + WL(), { type: "select", req: true, opts: INVITE_ROLES.map((r) => [r, roleLabel(r)]), help: "You can change the role later in Members. Sponsors cannot be added." })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Continue</button></div></form>`,
    true,
  );
};
F.rin = (d) => {
  if (!validate("rin", d, { pid: ["req"], role: ["req"] })) return render();
  const x = byId("rooms", d.r);
  const a = S.assign.find((a) => a.pid === d.pid && a.ctx === x.ctx);
  d.kind = "Participant in this context";
  if (roleBase(a.role) === "S") {
    x.joinReqs.push({
      id: uid("jr"),
      pid: d.pid,
      kind: "Sponsor",
      status: "Declined",
      note: "Sponsors have no automatic workspace membership.",
    });
    audit("Join denied", x.id, "Sponsor", "denied");
    UI.modal = null;
    toast(
      "Sponsors cannot be added to a " +
        WL() +
        ". They receive progress summaries instead.",
      "err",
    );
    return ok();
  }
  if (
    d.kind === "Research-related access" &&
    consent(d.pid, "research") !== "Granted"
  ) {
    UI.modal = null;
    return deny("research permission is not granted by this person");
  }
  if (
    d.kind === "Institutional representative (can bind the organization)" &&
    !(a.mandate && a.mandate.valid)
  ) {
    UI.modal = null;
    return deny("no valid mandate on file");
  }
  if (d.kind === "Participant in this context") {
    const rl = INVITE_ROLES.includes(d.role) ? d.role : "Member";
    x.members.push({ pid: d.pid, role: rl, status: "Invited" });
    notify(d.pid, "Invitation to join " + x.name + " as " + roleLabel(rl), "room", { id: x.id });
  } else {
    x.joinReqs.push({
      id: uid("jr"),
      pid: d.pid,
      kind: d.kind,
      status: "Pending",
      note: JOIN_RULES[d.kind],
    });
    S.assign
      .filter((a) => a.ctx === x.ctx && ["F", "A"].includes(roleBase(a.role)))
      .forEach((a) =>
        notify(a.pid, "Elevated join request for " + x.name, "room", {
          id: x.id,
          tab: "members",
        }),
      );
  }
  audit("Join requested", x.id, d.kind);
  UI.modal = null;
  clearF("rin");
  ok();
};
A.joinDecide = (d) => {
  const x = byId("rooms", d.r);
  const j = x.joinReqs.find((j) => j.id === d.id);
  j.status = d.v;
  if (d.v === "Approved") {
    x.members.push({
      pid: j.pid,
      role:
        normRole(j.kind) === "Member"
          ? /Finance|External|Institutional/.test(j.kind)
            ? "Partner"
            : "Member"
          : normRole(j.kind),
      label: j.kind,
      status: "Invited",
    });
    notify(j.pid, "Invitation to join " + x.name, "room", { id: x.id });
  }
  audit("Join " + d.v, x.id, j.kind);
  ok();
};
A.roomState = (d) => {
  const x = byId("rooms", d.r);
  x.state = d.v;
  x.declineReason = null;
  const pr = S.projects.find((p) => p.room === x.id);
  if (d.v === "Active" && pr && pr.stage !== "Room") {
    pr.stage = "Room";
    pr.history.push({ at: today(), t: WL() + " activated" });
  }
  x.members.forEach((m) =>
    notify(m.pid, x.name + " is now " + d.v, "room", { id: x.id }),
  );
  if (d.v === "Pending approval")
    S.assign
      .filter(
        (a) =>
          a.ctx === x.ctx &&
          ["F", "A"].includes(roleBase(a.role)) &&
          !x.members.some((m) => m.pid === a.pid),
      )
      .forEach((a) =>
        notify(a.pid, `${WL()} pending approval: ${x.name}`, "room", {
          id: x.id,
        }),
      );
  audit(WL() + " state", x.id, d.v);
  ok();
};
A.roomDecline = (d) => {
  clearF("rdc");
  modal(
    "Decline activation",
    () =>
      `<form data-f="rdc" class="col" style="gap:14px" novalidate><input type="hidden" name="r" value="${d.r}">${fi("rdc", "why", "Reason (recorded)", { type: "textarea", rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-d" type="submit">Decline</button></div></form>`,
  );
};
F.rdc = (d) => {
  if (!validate("rdc", d, { why: ["req"] })) return render();
  const x = byId("rooms", d.r);
  x.state = "Draft";
  x.declineReason = d.why;
  notify(x.lead, "Activation declined for " + x.name + ": " + d.why, "room", {
    id: x.id,
  });
  audit(WL() + " approval declined", x.id, d.why);
  UI.modal = null;
  clearF("rdc");
  ok();
};
A.roomClose = (d) => {
  const x = byId("rooms", d.r);
  if (
    !S.harvests.some(
      (h) => h.scope === x.id && ["Approved", "Released"].includes(h.state),
    )
  ) {
    toast(
      "Complete a Learning Harvest before closing (F07 exit state).",
      "warn",
    );
    return A.newHarvest({ scope: x.id });
  }
  x.state = "Closed";
  audit(WL() + " closed", x.id, "");
  ok();
};
// ---- Deliverables completed → upload evidence → Learning Harvest → profile evolution
// Marking tasks done never completes the Harvest: it needs evidence, then a reviewed and approved Harvest.
function roomFlowState(x) {
  const req = x.tasks.filter((k) => !["Proposed", "Declined"].includes(k.status) && !k.opt);
  const done = req.filter((k) => k.status === "Done");
  return {
    req,
    done,
    allDone: req.length > 0 && done.length === req.length,
    ev: roomEvidence(x),
    hv: S.harvests.find((v) => v.tpl === 2 && v.scope === x.id && v.subject === myId()),
  };
}
const hvDone = (v) => !!v && ["Approved", "Released"].includes(v.state);
function roomFlow(x) {
  const st = roomFlowState(x);
  const act = memberOf(x) && x.state === "Active";
  const hv = st.hv;
  const pend = hv ? S.evolution.filter((s) => s.hv === hv.id && s.status === "Pending").length : 0;
  const opt = x.tasks.filter((k) => k.opt && !["Proposed", "Declined"].includes(k.status)).length;
  const others = S.harvests.filter((v) => v.tpl === 2 && v.scope === x.id && v !== hv);
  const step = (n, title, sub, state, btns) =>
    `<li class="rf-step is-${state}"><span class="rf-n">${state === "done" ? ic("check", 14) : n}</span><div class="rf-b"><b>${title}</b><span class="cap">${sub}</span>${btns ? `<div class="row wrap rf-act">${btns}</div>` : ""}</div></li>`;
  const s1 = st.allDone ? "done" : "cur";
  const s2 = !st.allDone ? "todo" : st.ev.length ? "done" : "cur";
  const s3 = !st.allDone || !st.ev.length ? "todo" : hvDone(hv) ? "done" : "cur";
  const s4 = !hvDone(hv) ? "todo" : pend ? "cur" : "done";
  return card(
    "From deliverables to learning",
    "Deliverables completed → upload evidence → Learning Harvest → profile evolution. Marking tasks done does not complete the Learning Harvest.",
    `<ol class="rf">${step(
      1,
      "Deliverables completed",
      st.req.length
        ? `${st.done.length} of ${st.req.length} required deliverable${st.req.length > 1 ? "s" : ""} done${opt ? ` · ${opt} optional` : ""}`
        : "No required deliverables yet. Add tasks on the Tasks & milestones tab.",
      s1,
      !st.allDone ? L("Open the task board", "room", { id: x.id, tab: "plan" }, "btn btn-s btn-sm") : "",
    )}${step(
      2,
      "Upload evidence",
      !st.allDone
        ? "Available when every required deliverable is done."
        : st.ev.length
          ? `${st.ev.length} evidence item${st.ev.length > 1 ? "s" : ""} submitted for this ${WL()}. Add more if other work needs support.`
          : "All required deliverables are complete. Upload evidence that supports the work: documents, files, links, outputs, records or reflections.",
      s2,
      st.allDone && act
        ? B(ic("upload", 14) + "Upload evidence", "go", { r: "newevidence", link: x.id, from: x.id }, st.ev.length ? "btn-s btn-sm" : "btn-p btn-sm")
        : "",
    )}${step(
      3,
      "Generate Learning Harvest",
      hv
        ? `${pill(hv.state)} ${hvDone(hv) ? "Approved." : "Not complete until it is reviewed and approved."}`
        : st.allDone && st.ev.length
          ? "Built from your Purpose Compass Baseline, the completed deliverables, the evidence, partner contributions and linked records."
          : "Available after evidence is submitted.",
      s3,
      hv
        ? L(ic("sparkle", 14) + "Open Learning Harvest", "harvest", { id: hv.id }, "btn btn-s btn-sm")
        : st.allDone && st.ev.length && act
          ? B(ic("sparkle", 14) + "Generate Learning Harvest", "hvGen", { r: x.id }, "btn-p btn-sm")
          : "",
    )}${step(
      4,
      "Profile evolution",
      !hvDone(hv)
        ? "When the Harvest is approved, possible profile changes are offered to you for review. Nothing is applied automatically."
        : pend
          ? `${pend} suggested change${pend > 1 ? "s" : ""} waiting for your review.`
          : `${hv.evoN || 0} suggestion${hv.evoN === 1 ? "" : "s"} identified · all reviewed.`,
      s4,
      pend ? L("Review profile changes", "profile", { tab: "evo" }, "btn btn-p btn-sm") : "",
    )}</ol>${others.length ? `<p class="cap rf-others">Other members' Learning Harvests for this ${WL()}: ${others.map((v) => L(nm(v.subject), "harvest", { id: v.id }) + " " + pill(v.state)).join(" · ")}</p>` : ""}`,
    "",
    "c12",
  );
}
function roomFlowBanner(x) {
  const st = roomFlowState(x);
  if (!st.allDone || st.hv) return "";
  return `<div class="c12">${banner(
    "ok",
    "All required deliverables are done",
    (st.ev.length
      ? "Evidence has been submitted. Next step: generate the Learning Harvest."
      : "Next step: upload evidence that supports the completed work.") +
      (memberOf(x) && x.state === "Active"
        ? `<span class="row wrap ws-banact">${st.ev.length ? B(ic("sparkle", 14) + "Generate Learning Harvest", "hvGen", { r: x.id }, "btn-p btn-sm") : B(ic("upload", 14) + "Upload evidence", "go", { r: "newevidence", link: x.id, from: x.id }, "btn-p btn-sm")}</span>`
        : ""),
  )}</div>`;
}
// ---- Overview: progress, timeline, next action, wins, reports (Section 7.7 minimum execution features)
function roomOverview(x, pr, lead, ro) {
  const tasks = x.tasks.filter(
    (k) => !["Proposed", "Declined"].includes(k.status),
  );
  const done = tasks.filter((k) => k.status === "Done").length;
  const ms = x.milestones;
  const msDone = ms.filter((m) => m.status === "Achieved").length;
  const openRisks = x.risks.filter((k) =>
    ["Open", "Escalated"].includes(k.state),
  ).length;
  const next = [
    ...tasks
      .filter((k) => k.status !== "Done")
      .map((k) => ({ ...k, kind: "Task" })),
    ...ms
      .filter((m) => m.status !== "Achieved")
      .map((m) => ({ ...m, kind: "Milestone" })),
  ].sort((a, b) => (a.due || "9").localeCompare(b.due || "9"))[0];
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const kpi = (label, val, sub, w) =>
    `<div class="kpi"><span class="lt">${label}</span><span class="kpi-v">${val}</span>${w != null ? `<div class="progress" aria-hidden="true"><span class="bar" style="width:${w}%"></span></div>` : ""}<span class="cap">${sub}</span></div>`;
  return `<div class="ws-ov"><div class="ws-ov-main"><section class="kpis ws-kpis" aria-label="Progress">${kpi("Tasks done", done + " of " + tasks.length, pct(done, tasks.length) + "% complete", pct(done, tasks.length))}${kpi("Milestones achieved", msDone + " of " + ms.length, "Validated against approved evidence", pct(msDone, ms.length))}${kpi("Open risks", openRisks, openRisks ? "Each has an owner" : "Nothing open")}${kpi("Next due", next ? fmt(next.due) : "—", next ? h(next.kind + ": " + next.t) + dueTag(next.due, false) : "Nothing scheduled")}</section>${roomFlow(x)}
  ${card(
    "Milestone timeline",
    "Key dates and progress. Evidence-linked completion is validated by a Reviewer.",
    ms.length
      ? `<ol class="mtl ws-tl">${ms
          .slice()
          .sort((a, b) => a.due.localeCompare(b.due))
          .map(
            (m) =>
              `<li class="${m.status === "Achieved" ? "done" : m.status === "In progress" ? "cur" : ""}"><span class="mtl-dot">${m.status === "Achieved" ? ic("check", 13) : ""}</span><div class="col"><b>${h(m.t)}</b><span class="cap">${fmt(m.due)}${dueTag(m.due, m.status === "Achieved")} · ${h(m.status)}${m.evidence ? " · evidence: " + h(byId("evidence", m.evidence)?.title || m.evidence) : ""}</span></div></li>`,
          )
          .join("")}</ol>`
      : empty(
          "flag",
          "No milestones yet",
          lead
            ? "Add milestones with target dates on the Tasks & milestones tab."
            : "The project lead adds milestones.",
        ),
    L("Tasks & milestones", "room", { id: x.id, tab: "plan" }),
  )}${pr ? reportsCard(pr, "rooms", x) : ""}</div>
  <aside class="ws-ov-rail" aria-label="Moving forward">${pr ? stageGate(pr, "rooms", x) : ""}${returnsCard(x)}${wsTeamCard("rooms", x)}</aside></div>`;
}
A.taskDecide = (d) => {
  const x = byId("rooms", d.r);
  const k = x.tasks.find((t) => t.id === d.id);
  k.status = d.v;
  (k.log = k.log || []).push({
    at: now(),
    by: myId(),
    t: d.v === "Declined" ? "Declined" : "Approved and moved to " + d.v,
  });
  sysMsg(x, "Task " + (d.v === "Declined" ? "declined: " : "approved: ") + k.t);
  if (UI.modal) UI.modal = null;
  notify(
    k.by || k.owner,
    `Task ${d.v === "Declined" ? "declined" : "approved"} in ${x.name}: ${k.t}`,
    "room",
    { id: x.id, tab: "plan" },
  );
  if (d.v !== "Declined" && k.owner !== k.by)
    notify(k.owner, "Assigned to you in " + x.name + ": " + k.t, "room", {
      id: x.id,
    });
  audit(
    "Proposed task " + (d.v === "Declined" ? "declined" : "approved"),
    x.id,
    k.t,
  );
  ok();
};
// ---- Collaborator contributions against a defined responsibility (Section 6.4, PCP-10)
const CB_STATES = {
  Submitted: "p-navy",
  "Changes requested": "p-amber",
  "More evidence requested": "p-amber",
  Accepted: "p-green",
};
function roomContribs(x, lead, ro) {
  const rev = sCan("rooms", x, "review") || role() === "A";
  return card(
    "Contributions",
    "Partners and collaborators submit work against their defined responsibility. A Faculty/Steward accepts it, requests changes or asks for more evidence. Accepted contributions join the project record.",
    x.contribs
      .slice()
      .reverse()
      .map(
        (c) =>
          `<article class="rvitem"><div class="rv-h"><span class="av" aria-hidden="true">${ini(c.by)}</span><div class="rv-t"><b>${h(c.t)}</b><span class="cap">${nm(c.by)} · responsibility: ${h(c.resp)} · ${fmt(c.at)}</span></div>${pill(c.status, CB_STATES[c.status])}</div>${c.desc ? `<p class="muted rv-desc">${h(c.desc)}</p>` : ""}${c.att ? `<div class="rv-att">${attCard(c.att)}</div>` : ""}${c.used ? `<div class="rvresp"><span class="cap"><b>How it was used</b></span><p>${h(c.used)}</p></div>` : ""}${c.history && c.history.length > 1 ? `<details class="rv-hist"><summary class="cap">History (${c.history.length})</summary>${c.history.map((hh) => `<p class="cap">${fmt(hh.at)} · ${h(hh.t)}</p>`).join("")}</details>` : ""}<div class="row wrap rv-acts">${rev && !ro && c.status === "Submitted" ? B("Review contribution", "cbReview", { r: x.id, id: c.id }, "btn-p btn-sm") : ""}${c.by === myId() && !ro && ["Changes requested", "More evidence requested"].includes(c.status) ? B("Revise and resubmit", "cbNew", { r: x.id, re: c.id }) : ""}</div></article>`,
      )
      .join("") ||
      empty(
        "award",
        "No contributions yet",
        "Partners submit contributions here once they have a defined responsibility.",
      ),
    !ro && sCan("rooms", x, "contribute")
      ? B(
          ic("upload", 14) + "Submit a contribution",
          "cbNew",
          { r: x.id },
          "btn-p btn-sm",
        )
      : "",
  );
}
A.cbNew = (d) => {
  clearF("cbn");
  const x = byId("rooms", d.r);
  const prev = d.re && x.contribs.find((c) => c.id === d.re);
  const myRole = (x.members.find((m) => m.pid === myId()) || {}).role || "";
  UI.form.cbn = prev
    ? { resp: prev.resp, t: prev.t, desc: prev.desc }
    : {
        resp:
          (x.members.find((m) => m.pid === myId()) || {}).req ||
          (myRole.startsWith("Collaborator — ") ? myRole.slice(15) : ""),
      };
  modal(
    prev ? "Revise and resubmit" : "Submit a contribution",
    () =>
      `<form data-f="cbn" class="col" style="gap:14px" novalidate><input type="hidden" name="r" value="${x.id}"><input type="hidden" name="re" value="${d.re || ""}">${prev ? banner("warn", "Steward feedback", h((prev.history.slice(-1)[0] || {}).t || "")) : ""}${fi("cbn", "resp", "Responsibility this delivers against", { req: true, help: "The requirement you were matched or invited for." })}${fi("cbn", "t", "Contribution", { req: true })}${fi("cbn", "desc", "What you are submitting and how it meets the responsibility", { type: "textarea", rows: 3, req: true })}<div class="field"><label class="lbl" for="cbn_f">File (optional)</label><input id="cbn_f" type="file" name="f" class="input" style="padding:8px"><span class="help">Up to ${S.settings.maxFileMB} MB.</span></div><div class="actions"><span></span><button class="btn btn-p" type="submit">Submit for steward review</button></div></form>`,
  );
};
F.cbn = (d, form) => {
  if (!validate("cbn", d, { resp: ["req"], t: ["req"], desc: ["req"] }))
    return render();
  const file = form.querySelector("input[type=file]")?.files?.[0];
  if (file && file.size > S.settings.maxFileMB * 1048576) {
    UI.err.cbn = {
      t:
        "File over " +
        S.settings.maxFileMB +
        " MB. Link it externally instead.",
    };
    return render();
  }
  const x = byId("rooms", d.r);
  const prev = d.re && x.contribs.find((c) => c.id === d.re);
  const att = file
    ? { n: file.name, mb: +(file.size / 1048576).toFixed(2) }
    : prev
      ? prev.att
      : null;
  if (prev) {
    Object.assign(prev, {
      resp: d.resp,
      t: d.t,
      desc: d.desc,
      att,
      status: "Submitted",
    });
    prev.history.push({ at: today(), t: "Resubmitted after feedback" });
  } else
    x.contribs.push({
      id: uid("cb"),
      by: myId(),
      resp: d.resp,
      t: d.t,
      desc: d.desc,
      att,
      status: "Submitted",
      at: today(),
      used: "",
      history: [{ at: today(), t: "Submitted for steward review" }],
    });
  S.assign
    .filter(
      (a) =>
        a.ctx === x.ctx &&
        x.members.some(
          (m) => m.pid === a.pid && sCan("rooms", x, "review", a.pid),
        ),
    )
    .forEach((a) =>
      notify(
        a.pid,
        "Contribution submitted in " + x.name + ": " + d.t,
        "room",
        { id: x.id, tab: "contribs" },
      ),
    );
  audit("Contribution submitted", x.id, d.t);
  UI.modal = null;
  clearF("cbn");
  toast("Submitted for Faculty/Steward review.");
  ok();
};
A.cbReview = (d) => {
  clearF("cbr");
  const x = byId("rooms", d.r);
  const c = x.contribs.find((y) => y.id === d.id);
  const targets = [
    ...x.tasks
      .filter((k) => k.status !== "Declined")
      .map((k) => "Task: " + k.t),
    ...x.milestones.map((m) => "Milestone: " + m.t),
    "Project record",
  ];
  modal(
    "Review contribution",
    () =>
      `<form data-f="cbr" class="col" style="gap:14px" novalidate><input type="hidden" name="r" value="${x.id}"><input type="hidden" name="id" value="${c.id}">${dl(
        [
          ["From", nm(c.by)],
          ["Responsibility", h(c.resp)],
          ["Contribution", h(c.t)],
          ["Detail", h(c.desc)],
        ],
      )}${fi("cbr", "v", "Decision", { type: "select", req: true, opts: ["Accepted", "Changes requested", "More evidence requested"] })}${fi("cbr", "used", "If accepted: where it is used", { type: "select", opts: targets })}${fi("cbr", "note", "Feedback to the contributor", { type: "textarea", rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Record decision</button></div></form>`,
  );
};
F.cbr = (d) => {
  if (!validate("cbr", d, { v: ["req"], note: ["req"] })) return render();
  const x = byId("rooms", d.r);
  const c = x.contribs.find((y) => y.id === d.id);
  c.status = d.v;
  c.reviewer = myId();
  if (d.v === "Accepted")
    c.used = (d.used || "Project record") + " — " + d.note;
  c.history.push({ at: today(), t: d.v + " by " + me().name + ": " + d.note });
  if (d.v === "Accepted")
    S.candidates.push({
      id: uid("cd"),
      pid: c.by,
      field: "Accepted contribution",
      value: c.t + " (" + x.name + ")",
      source: "Contribution accepted by " + me().name,
      prov: "Reviewer-verified",
      status: "Pending",
    });
  notify(c.by, `Your contribution “${c.t}” — ${d.v}`, "room", {
    id: x.id,
    tab: "contribs",
  });
  audit("Contribution " + d.v, x.id, c.t);
  UI.modal = null;
  clearF("cbr");
  ok();
};
// ---- link related objects and learning activities by reference (F07 step 4)
A.roomLink = (d) => {
  clearF("rlk");
  const x = byId("rooms", d.r);
  const pr = S.projects.find((p) => p.room === x.id) || {};
  const opts = [
    ...S.templates
      .filter((t) => t.status === "Approved")
      .map((t) => [
        "Learning pathway|" + t.id + "|" + t.name,
        "Learning pathway: " + t.name,
      ]),
    ...(S.resources || [])
      .filter((r) => r.status === "Published")
      .map((r) => [
        "Learning resource|" + r.id + "|" + r.title,
        "Resource: " + r.title,
      ]),
    ...S.cards
      .filter((c) => inCtx(c) && c.status === "Active")
      .map((c) => [
        "Opportunity Card|" + c.id + "|" + c.title,
        "Card: " + c.title,
      ]),
    ...S.records
      .filter(
        (r) =>
          r.state === "Active" &&
          r.linked.some((l) => [x.id, pr.circle, pr.rope].includes(l)),
      )
      .map((r) => [
        "Repository record|" + r.id + "|" + r.title,
        "Record: " + r.title,
      ]),
  ].filter((o) => !x.links.some((l) => o[0].split("|")[1] === l.id));
  modal(
    "Link by reference",
    () =>
      `<form data-f="rlk" class="col" style="gap:14px" novalidate><input type="hidden" name="r" value="${x.id}">${fi("rlk", "obj", "Learning activity, resource, card or record", { type: "select", req: true, ph: "Select", opts })}${banner("info", "Linked, not duplicated", "Only a reference is stored. The object keeps its own permissions; private content stays in its original space.")}<div class="actions"><span></span><button class="btn btn-p" type="submit">Link</button></div></form>`,
  );
};
F.rlk = (d) => {
  if (!validate("rlk", d, { obj: ["req"] })) return render();
  const x = byId("rooms", d.r);
  const [type, id, label] = d.obj.split("|");
  x.links.push({ type, id, label });
  audit("Linked by reference", x.id, type + " " + id);
  UI.modal = null;
  clearF("rlk");
  ok();
};
