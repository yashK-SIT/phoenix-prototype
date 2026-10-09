// ---------- ACTION ROOMS / WORKSPACES (E07, F07) ----------
// Leading an Action Room follows the person's role in that room: Project owner or Facilitator.
const isLead = (x) =>
  sCan("rooms", x, "lead") || (hasB("Project Lead") && memberOf(x));
const canCreateRoom = () =>
  ["F", "C", "O", "A"].includes(role()) || hasB("Project Lead");
// A project owner creates the Action Room for their own accepted project directly (no proposal step).
const ownRoomProjects = () =>
  S.projects.filter((p) => inCtx(p) && p.owner === myId() && p.status === "Accepted" && !p.room && !["Final review", "Closed"].includes(p.stage));
const canCreateRoomFor = (pr) => canCreateRoom() || (!!pr && ownRoomProjects().includes(pr));
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
        : ownRoomProjects().length
          ? B(ic("plus", 16) + "Create " + WL(), "newRoom", { origin: "Project" }, "btn-p")
        : r === "P" && S.settings.participantCanProposeWorkspace
          ? B(
              "Propose a " + WL(),
              "newRoom",
              { origin: "Community initiative" },
              "btn-s",
            )
          : "",
    ) +
    dataView("rooms", {
      label: WL() + "s",
      items: list,
      search: (x) => [x.name, x.purpose, P(x.lead).name, x.origin.type, cName(x.origin.id), wsRoleTxt("rooms", x)].join(" "),
      searchLabel: "Search " + WL() + "s",
      quick: { label: "State", options: wsOpts(list, (x) => x.state), test: (x, v) => x.state === v },
      filters: [
        { key: "role", label: "Your role", options: wsOpts(list, (x) => wsRoleTxt("rooms", x)), test: (x, v) => wsRoleTxt("rooms", x) === v },
        { key: "lead", label: "Lead", options: wsPeople(list, (x) => x.lead), test: (x, v) => x.lead === v },
        { key: "origin", label: "Origin", options: wsOpts(list, (x) => x.origin.type), test: (x, v) => x.origin.type === v },
      ],
      sorts: [
        ["name", "Name", (a, b) => a.name.localeCompare(b.name)],
        ["activity", "Latest activity", (a, b) => wsLastAt(b).localeCompare(wsLastAt(a))],
        ["progress", "Progress", (a, b) => wsPct(b) - wsPct(a)],
        ["members", "Members", (a, b) => wsActive(b).length - wsActive(a).length],
      ],
      defaultSort: "name",
      row: (x) => ({
        lead: `<span class="tile t-navy" aria-hidden="true">${ic("room", 18)}</span>`,
        title: L(h(x.name), "room", { id: x.id }, "dv-link") + wsUnread(x),
        sub: h(x.purpose || ""),
        meta: [
          `Lead <b>${nm(x.lead)}</b>`,
          `Your role <b>${h(wsRoleTxt("rooms", x))}</b>`,
          h(x.origin.type) + " · " + cName(x.origin.id),
          wsMem(x),
          wsProg(x),
        ],
        badges: pill(x.state) + ((memberRec(x) || {}).status === "Invited" ? pill("Invited") : ""),
        primary:
          (memberRec(x) || {}).status === "Invited"
            ? B(
                "Respond to invite",
                "go",
                { r: "room", id: x.id },
                "btn-p btn-sm",
              )
            : L("Open", "room", { id: x.id }, "btn btn-s btn-sm"),
      }),
      empty: ["room", "No " + WL() + "s yet.", "Execution spaces appear here when you are invited to one or one is created for your project.", ""],
    })
  );
});
// Primary origin: the actual projects this person can start an Action Room for, then the non-project origins.
// Creators see accepted projects in the programme without an Action Room; a project owner sees their own.
const NR_PATHWAY = "_pathway";
const NR_NONE = "_none";
const NR_PROJECT_ORIGINS = ["Project", "Circle decision", "Rope Team recommendation"];
const nrProjects = () =>
  canCreateRoom()
    ? S.projects.filter((p) => inCtx(p) && p.status === "Accepted" && !p.room && !["Final review", "Closed"].includes(p.stage))
    : ownRoomProjects();
const nrOtherOrigins = (otype) =>
  canCreateRoom() || S.settings.participantCanProposeWorkspace
    ? [
        [NR_PATHWAY, "Learning pathway"],
        [NR_NONE, "No project — " + (otype && !["Project", "Learning pathway"].includes(otype) ? otype.toLowerCase() : "institutional or community initiative")],
      ]
    : [];
const nrOriginOpts = (otype) => [
  ...nrProjects().map((p) => [p.id, "Project · " + p.title + " (" + P(p.owner).name + ")"]),
  ...nrOtherOrigins(otype),
];
// The project behind what the button was pressed on: the project itself, or the project of a Circle or Rope Team.
const nrProjectOf = (d) => byId("projects", d.project) || S.projects.find((p) => d.oid && [p.circle, p.rope].includes(d.oid)) || null;
A.newRoom = (d) => {
  clearF("nr");
  const p0 = nrProjectOf(d);
  const opts = nrOriginOpts(d.origin);
  const def = p0 && opts.some(([v]) => v === p0.id)
    ? p0.id
    : d.origin === "Learning pathway"
      ? NR_PATHWAY
      : d.origin && !["Project", "Learning pathway"].includes(d.origin) && opts.some(([v]) => v === NR_NONE)
        ? NR_NONE
        : !canCreateRoom() && nrProjects().length === 1
          ? nrProjects()[0].id
          : "";
  const pr = byId("projects", def);
  UI.form.nr = { name: pr ? pr.title + " — execution" : "", project: def };
  modal(
    (canCreateRoomFor(pr) ? "Create " : "Propose ") + (/^[aeiou]/i.test(WL()) ? "an " : "a ") + WL(),
    () => {
      const cp = byId("projects", fv("nr", "project"));
      const rope = cp && byId("ropes", cp.rope);
      const creator = canCreateRoomFor(cp);
      const linked = d.oid && (!cp || !p0 || cp === p0) ? "Linked to " + cName(d.oid) + " (linked, not duplicated). " : "";
      return `<form data-f="nr" class="col" style="gap:14px" novalidate><input type="hidden" name="oid" value="${h(d.oid || "")}"><input type="hidden" name="p0" value="${p0 ? p0.id : ""}"><input type="hidden" name="otype" value="${h(d.origin || "")}">
 ${opts.length ? fi("nr", "project", "Primary origin", { type: "select", req: true, ph: "Choose the project this " + WL() + " is for", opts, ch: "nrProject", help: linked + (canCreateRoom() ? "Accepted projects in this programme that do not have an " + WL() + " yet." : "Your accepted projects that do not have an " + WL() + " yet.") }) : banner("warn", "No project available", "There is no accepted project without an " + WL() + " that you can start one for.")}
 ${fi("nr", "name", "Name", { req: true })}${fi("nr", "purpose", "Purpose / charter", { type: "textarea", rows: 3, req: true })}${fi("nr", "outcome", "Expected outcome", { type: "textarea", rows: 3, req: true })}
 ${cp && !canCreateRoom() ? banner("info", "", "You lead this " + WL() + " as project owner. Your project’s Steward joins as facilitator to validate milestones, and Circle members are invited." + (rope && !rope.reqFinal ? " The Rope Team has not finalised requirements yet — you can still start, and keep working with your mentor." : "")) : ""}
 <div class="actions"><span></span><button class="btn btn-p" type="submit" ${opts.length ? "" : "disabled"}>${creator ? "Create" : "Propose"}</button></div></form>`;
    },
  );
};
A.nrProject = (d, el) => {
  const pr = byId("projects", el.value);
  const f = {};
  new FormData(el.form).forEach((v, k) => (f[k] = v));
  if (pr) f.name = pr.title + " — execution";
  UI.form.nr = f;
  render();
};
F.nr = (d) => {
  if (
    !validate("nr", d, {
      project: [
        ["req", "Choose the primary origin."],
        ["fn", { f: (v) => nrOriginOpts(d.otype).some(([o]) => o === v), m: "Choose one of the listed origins." }],
      ],
      name: ["req"],
      purpose: ["req"],
      outcome: ["req"],
    })
  )
    return render();
  const flags = [];
  const pr = byId("projects", d.project) || null;
  const p0 = byId("projects", d.p0);
  // Keep the caller's specific origin (e.g. a Circle decision) only while its project is still the one chosen.
  d.origin = pr
    ? pr === p0 && NR_PROJECT_ORIGINS.includes(d.otype)
      ? d.otype
      : "Project"
    : d.project === NR_PATHWAY
      ? "Learning pathway"
      : d.otype && !["Project", "Learning pathway"].includes(d.otype)
        ? d.otype
        : "Institutional project";
  if (d.oid && pr && pr !== p0 && ![pr.circle, pr.rope].includes(d.oid)) d.oid = "";
  const creator = canCreateRoomFor(pr);
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
  // The project's Steward joins as facilitator: they review contributions and validate milestones.
  if (pr)
    pr.stewards.forEach((s) => {
      if (!x.members.some((m) => m.pid === s)) x.members.push({ pid: s, role: "Facilitator", status: "Active" });
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
        t: WL() + " created by " + me().name + "; moved to " + WL() + " stage",
      });
      pr.stewards
        .filter((s) => s !== myId())
        .forEach((s) => notify(s, me().name + " created the " + WL() + " for “" + pr.title + "”. You are its facilitator.", "room", { id: x.id }));
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
  if (!isM && !(myM && myM.status === "Invited") && !["A", "O"].includes(r) && !msIsSteward(x))
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
  const t = subnav(
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
    {
      label: WL() + " sections",
      groups: [
        ["", "", ["overview"]],
        ["Work", "grid", ["plan", "contribs"]],
        ["Conversation", "message", ["chat"]],
        ["Decisions & records", "layers", ["dec", "risk", "change", "ev"]],
        ["People & charter", "users", ["members", "about"]],
      ],
    },
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
 <div class="c12">${msCard(x, isM, lead, ro)}</div></div>`;
  if (t.cur === "dec")
    body = card(
      "Decisions",
      "Draft → Proposed → Approved → Superseded → Closed",
      dataView("ar:dec:" + x.id, {
        label: "decisions",
        items: x.decisions,
        search: (k) => k.t + " " + P(k.owner).name,
        quick: { label: "State", options: wsOpts(x.decisions, (k) => k.state), test: (k, v) => k.state === v },
        filters: [{ key: "owner", label: "Owner", options: wsPeople(x.decisions, (k) => k.owner), test: (k, v) => k.owner === v }],
        sorts: [["t", "Decision", (a, b) => a.t.localeCompare(b.t)], ["state", "State", (a, b) => a.state.localeCompare(b.state)]],
        dense: true,
        row: (k) => ({
          lead: `<span class="av sm" title="${nm(k.owner)}">${ini(k.owner)}</span>`,
          title: h(k.t),
          meta: ["Owner " + nm(k.owner)],
          badges: pill(k.state),
          menu:
            !ro && lead
              ? `<span class="menu-h">Move to</span>` +
                ["Proposed", "Approved", "Superseded", "Closed"]
                  .filter((s) => s !== k.state)
                  .map((s) =>
                    B(s, "itemState", {
                      r: x.id,
                      k: "decisions",
                      id: k.id,
                      v: s,
                    }, "menu-i", 'role="menuitem"'),
                  )
                  .join("")
              : "",
        }),
        empty: ["check", "No decisions recorded yet", "Decisions move from Draft to Proposed, Approved, Superseded and Closed.", ""],
      }),
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
      dataView("ar:risk:" + x.id, {
        label: "risks",
        items: x.risks,
        search: (k) => k.t + " " + P(k.owner).name,
        quick: { label: "State", options: wsOpts(x.risks, (k) => k.state), test: (k, v) => k.state === v },
        filters: [{ key: "owner", label: "Owner", options: wsPeople(x.risks, (k) => k.owner), test: (k, v) => k.owner === v }],
        sorts: [["t", "Risk", (a, b) => a.t.localeCompare(b.t)], ["state", "State", (a, b) => a.state.localeCompare(b.state)]],
        dense: true,
        row: (k) => ({
          lead: `<span class="tile t-soft" aria-hidden="true">${ic("alert", 16)}</span>`,
          title: h(k.t),
          meta: ["Owner " + nm(k.owner)],
          badges: pill(k.state),
          menu:
            !ro && (lead || own(k))
              ? `<span class="menu-h">Move to</span>` +
                ["Mitigated", "Accepted", "Escalated", "Closed"]
                  .filter((s) => s !== k.state)
                  .map((s) =>
                    B(s, "itemState", { r: x.id, k: "risks", id: k.id, v: s }, "menu-i", 'role="menuitem"'),
                  )
                  .join("")
              : "",
        }),
        empty: ["alert", "No risks recorded", "Add a risk or issue so it has an owner and a state.", ""],
      }),
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
      dataView("ar:deps:" + x.id, {
        label: "dependencies",
        items: x.deps,
        search: (k) => k.t + " " + k.on,
        quick: { label: "State", options: wsOpts(x.deps, (k) => k.state), test: (k, v) => k.state === v },
        sorts: [["t", "Dependency", (a, b) => a.t.localeCompare(b.t)], ["state", "State", (a, b) => a.state.localeCompare(b.state)]],
        dense: true,
        row: (k) => ({
          lead: `<span class="tile t-soft" aria-hidden="true">${ic("link", 16)}</span>`,
          title: h(k.t),
          meta: ["On " + h(k.on)],
          badges: pill(k.state, { Blocked: "p-red", Resolved: "p-green" }[k.state]),
          menu:
            !ro && lead
              ? `<span class="menu-h">Move to</span>` +
                ["Open", "Confirmed", "Blocked", "Resolved"]
                  .filter((s) => s !== k.state)
                  .map((s) =>
                    B(s, "itemState", { r: x.id, k: "deps", id: k.id, v: s }, "menu-i", 'role="menuitem"'),
                  )
                  .join("")
              : "",
        }),
        empty: ["link", "No dependencies recorded", "Record the activities, resources or parties this work depends on.", ""],
      }),
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
      dataView("ar:ev:" + x.id, {
        label: "evidence items",
        items: ev,
        search: (e) => [e.title, e.type, e.level, e.review, e.release].join(" "),
        quick: { label: "Review", options: wsOpts(ev, (e) => e.review), test: (e, v) => e.review === v },
        filters: [
          { key: "type", label: "Type", options: wsOpts(ev, (e) => e.type), test: (e, v) => e.type === v },
          { key: "level", label: "Level", options: wsOpts(ev, (e) => e.level), test: (e, v) => e.level === v },
        ],
        sorts: [["title", "Title", (a, b) => a.title.localeCompare(b.title)], ["review", "Review", (a, b) => String(a.review).localeCompare(String(b.review))]],
        row: (e) => ({
          lead: `<span class="tile t-soft" aria-hidden="true">${ic("file", 16)}</span>`,
          title: L(h(e.title), "evidence", { id: e.id }, "dv-link"),
          meta: [h(e.type), "Release " + h(e.release)],
          badges: pill(e.level, "p-navy") + pill(e.review),
        }),
        empty: ["file", "No evidence linked yet", "Evidence uploaded for this " + WL() + " appears here.", ""],
      }),
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
  const acts =
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
        : "";
  // the space header, its facts and the project journey live in Overview; other sections get a one-line context bar
  if (t.cur === "overview") body = spaceHead("rooms", x, h(x.purpose), null, acts) + roleNote("rooms", x) + (pr ? stageTrack(pr, "rooms") : "") + body;
  else body = wsBar("rooms", x, acts) + body;
  // approval / proposal states carry their own actions, so they stay above the sections
  return (
    crumbsHtml([[WL() + "s", "rooms"], [h(x.name)]]) +
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
    withSubnav(t, body)
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
    Object.assign(o, { due: d.due, status: "Not started", evs: [] });
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
// ---- Milestones and their evidence
// 1. A member links evidence to a milestone; every link is sent to the project's Steward for review.
// 2. The Steward reviews each piece: approve, request changes (the submitter revises and resubmits) or reject.
// 3. Once every linked piece is approved, the Steward validates the milestone as achieved.
const MS_PEND = "Awaiting Steward review";
const MS_PILL = { [MS_PEND]: "p-amber", Approved: "p-green", "Changes requested": "p-amber", Rejected: "p-red" };
// The Steward: the project's assigned Steward(s); for a room without one, its Facilitators and Reviewers.
const msStewards = (x) => {
  if (!x) return [];
  const pr = roomProject(x);
  const st = pr ? pr.stewards.filter((s) => S.assign.some((a) => a.pid === s && a.ctx === x.ctx && roleBase(a.role) === "F" && a.status === "Active")) : [];
  return st.length ? st : x.members.filter((m) => (!m.status || m.status === "Active") && ["Facilitator", "Reviewer"].includes(normRole(m.role))).map((m) => m.pid);
};
const msIsSteward = (x) => msStewards(x).includes(myId());
const msItems = (m) => m.evs || [];
// A piece counts only while the Steward's approval stands and the evidence itself is still approved.
const msItemOk = (it) => it.st === "Approved" && byId("evidence", it.ev)?.review === "Approved";
const msReady = (m) => msItems(m).length > 0 && msItems(m).every(msItemOk);
const msToReview = (it) => it.st === MS_PEND || (it.st === "Approved" && !msItemOk(it));
const msPending = (x) => x.milestones.flatMap((m) => (m.status === "Achieved" ? [] : msItems(m).filter(msToReview).map((it) => [m, it])));
function msStep(m) {
  const its = msItems(m);
  if (m.status === "Achieved") return "Validated" + (m.validatedBy ? " by " + nm(m.validatedBy) + " · " + fmt(m.validatedAt) : "") + ".";
  if (!its.length) return "Next: a member adds evidence. It goes to the Steward for review.";
  const n = (f) => its.filter(f).length;
  if (n((it) => it.st === "Rejected")) return "Next: remove or replace the rejected evidence.";
  if (n((it) => it.st === "Changes requested")) return "Next: the submitter revises the evidence and resubmits it; it then returns to the Steward.";
  const p = n(msToReview);
  if (p) return "Next: the Steward reviews " + p + " piece" + (p > 1 ? "s" : "") + " of evidence.";
  return "Next: all evidence is approved. The Steward validates the milestone.";
}
const msTellStewards = (x, t) =>
  msStewards(x)
    .filter((p) => p !== myId())
    .forEach((p) => notify(p, t, "room", { id: x.id, tab: "plan" }));
function msLink(x, m, e) {
  m.evs = msItems(m);
  if (m.evs.some((it) => it.ev === e.id)) return false;
  m.evs.push({ ev: e.id, st: MS_PEND, by: myId(), at: now() });
  if (m.status === "Not started") m.status = "In progress";
  e.history.push({ at: today(), t: "Sent to the Steward for milestone “" + m.t + "” in " + x.name });
  sysMsg(x, me().name + " added “" + e.title + "” to milestone “" + m.t + "” — sent to the Steward for review");
  msTellStewards(x, "Evidence to review for milestone “" + m.t + "” (" + x.name + "): " + e.title);
  audit("Evidence linked to milestone", x.id, m.t + " · " + e.id);
  return true;
}
// Evidence that can be added: linked to this room or to its project's spaces, not withdrawn or rejected, not already added.
const msEvOptions = (x, m) => {
  const pr = roomProject(x);
  return S.evidence.filter((e) => ((e.linked || []).includes(x.id) || (pr && evProjects(e).includes(pr))) && !["Withdrawn", "Rejected"].includes(e.review) && !msItems(m).some((it) => it.ev === e.id));
};
function msCard(x, isM, lead, ro) {
  const stw = msIsSteward(x);
  const stewards = msStewards(x);
  const pend = msPending(x).length;
  const rows = x.milestones
    .map((m) => {
      const its = msItems(m);
      const done = m.status === "Achieved";
      const okN = its.filter(msItemOk).length;
      const steps = [
        [its.length > 0, "Evidence added (" + its.length + ")"],
        [its.length > 0 && okN === its.length, "Steward approval (" + okN + " of " + its.length + ")"],
        [done, "Validated as achieved"],
      ];
      const evs = its
        .map((it, i) => {
          const e = byId("evidence", it.ev);
          if (!e) return "";
          const st = it.st === "Approved" && !msItemOk(it) ? MS_PEND : it.st;
          const act =
            (stw && !done && !ro && e.owner !== myId() && msToReview(it) ? B("Review", "msRev", { r: x.id, id: m.id, i }, "btn-p btn-sm") : "") +
            (!ro && !done && (isM || stw) && it.st !== "Approved" ? CB("Remove", "msUnlink", { r: x.id, id: m.id, i }, "Remove “" + e.title + "” from this milestone? The evidence itself is kept.") : "");
          return `<li class="ms-ev"><div class="col" style="min-width:0;flex:1"><span class="att">${ic("file", 14)}${L(h(e.title), "evidence", { id: e.id })}</span><span class="cap">${h(e.type)} · by ${nm(e.owner)} · added ${fmt(it.at)}${it.rv ? " · reviewed by " + nm(it.rv) + " " + fmt(it.rvAt) : ""}</span>${it.note && it.st !== "Approved" ? `<p class="pw-note">${h(it.note)}</p>` : ""}</div><span class="row wrap" style="gap:6px">${pill(st, MS_PILL[st])}${act}</span></li>`;
        })
        .join("");
      const validate =
        stw && !done && !ro
          ? msReady(m)
            ? CB("Validate as achieved", "msAchieve", { r: x.id, id: m.id }, "Record “" + m.t + "” as achieved? All " + its.length + " piece" + (its.length > 1 ? "s" : "") + " of evidence are approved.", "btn-p btn-sm", "Validate")
            : `<button type="button" class="btn btn-p btn-sm" disabled title="Every piece of evidence must be approved first">Validate as achieved</button>`
          : "";
      return `<article class="ms"><header class="ms-h"><div class="col" style="min-width:0"><b>${h(m.t)}</b><span class="cap">Due ${fmt(m.due)}${dueTag(m.due, done)}</span></div><span class="row wrap" style="gap:6px">${pill(m.status)}${!ro && !done && isM ? B(ic("plus", 14) + "Add evidence", "msEvidence", { r: x.id, id: m.id }) : ""}${validate}</span></header><ol class="ms-steps">${steps.map(([ok_, t], n) => `<li class="${ok_ ? "ok" : ""}"><span class="n">${ok_ ? ic("check", 12) : n + 1}</span>${t}</li>`).join("")}</ol>${evs ? `<ul class="ms-evs">${evs}</ul>` : ""}<p class="cap">${msStep(m)}</p></article>`;
    })
    .join("");
  return card(
    "Milestones",
    "1. A member adds evidence → 2. the Steward reviews and approves every piece → 3. the Steward validates the milestone as achieved." + (stewards.length ? " Steward: " + stewards.map(nm).join(", ") + "." : ""),
    (stw && pend ? banner("warn", pend + " piece" + (pend > 1 ? "s" : "") + " of evidence waiting for your review", "Review each one below. A milestone can be validated once all of its evidence is approved.") : "") +
      (!stewards.length ? banner("warn", "No Steward for this " + WL(), "Ask the Programme Administrator to assign a Steward to the project. Evidence cannot be reviewed or milestones validated without one.") : "") +
      (rows ? `<div class="col" style="gap:12px">${rows}</div>` : empty("flag", "No milestones yet", lead ? "Add a milestone, then add the evidence that shows it is done." : "The project lead adds milestones.")),
    !ro && lead ? B(ic("plus", 14) + "Add milestone", "roomItem", { r: x.id, k: "milestones" }, "btn-p btn-sm") : "",
  );
}
A.msEvidence = (d) => {
  const x = byId("rooms", d.r);
  const m = x.milestones.find((y) => y.id === d.id);
  const ev = msEvOptions(x, m);
  const stewards = msStewards(x);
  clearF("mse");
  modal(
    "Add evidence to “" + h(m.t) + "”",
    () =>
      `<form data-f="mse" class="col" style="gap:14px" novalidate><input type="hidden" name="r" value="${x.id}"><input type="hidden" name="id" value="${m.id}">${ev.length ? fi("mse", "ev", "Evidence", { type: "select", req: true, ph: "Choose evidence", opts: ev.map((e) => [e.id, e.title + " · " + e.review]) }) : '<p class="cap">There is no evidence from this project to add yet. Upload it first.</p>'}${banner("info", "", "Adding evidence sends it to the Steward" + (stewards.length ? " (" + stewards.map((p) => h(P(p).name)).join(", ") + ")" : "") + " for review. The milestone can be validated once every piece of its evidence is approved.")}<div class="actions">${B(ic("upload", 14) + "Upload new evidence", "go", { r: "newevidence", link: x.id, from: x.id, ms: x.id + "|" + m.id })}${ev.length ? '<button class="btn btn-p" type="submit">Add and send for review</button>' : ""}</div></form>`,
  );
};
F.mse = (d) => {
  if (!validate("mse", d, { ev: [["req", "Choose the evidence to add."]] })) return render();
  const x = byId("rooms", d.r);
  const m = x.milestones.find((y) => y.id === d.id);
  const e = byId("evidence", d.ev);
  if (!e || !msEvOptions(x, m).includes(e)) {
    UI.err.mse = { ev: "This evidence cannot be added to this milestone." };
    return render();
  }
  msLink(x, m, e);
  UI.modal = null;
  clearF("mse");
  toast("Added and sent to the Steward for review.");
  ok();
};
A.msUnlink = (d) => {
  const x = byId("rooms", d.r);
  const m = x.milestones.find((y) => y.id === d.id);
  const it = msItems(m)[+d.i];
  if (!it) return render();
  m.evs.splice(+d.i, 1);
  const e = byId("evidence", it.ev);
  sysMsg(x, me().name + " removed “" + (e ? e.title : it.ev) + "” from milestone “" + m.t + "”");
  audit("Evidence removed from milestone", x.id, m.t + " · " + it.ev);
  ok();
};
// The Steward reviews one piece of evidence for one milestone.
A.msRev = (d) => {
  const x = byId("rooms", d.r);
  const m = x.milestones.find((y) => y.id === d.id);
  const it = msItems(m)[+d.i];
  const e = byId("evidence", it.ev);
  clearF("msr");
  UI.form.msr = { level: e.level && e.level !== "E0" ? e.level : "E2", limits: e.limits || "" };
  modal(
    "Review evidence for “" + h(m.t) + "”",
    () =>
      `<div class="col" style="gap:14px">${dl([
        ["Evidence", L(h(e.title), "evidence", { id: e.id })],
        ["Submitted by", nm(e.owner) + (e.history && e.history[0] ? " · " + fmt(e.history[0].at) : "")],
        ["Type", h(e.type)],
        ["Claim", h(e.claim || "—")],
        ["Format", h(e.format || "—")],
        e.file && ["File", `<span class="att">${ic("file", 14)}${h(e.file)}</span>`],
        e.url && ["Link", h(e.url)],
        e.text && ["Written evidence", `<span style="white-space:pre-line">${h(e.text)}</span>`],
        ["Source", h(e.source || "—")],
        ["Current evidence status", pill(e.review) + " " + pill(e.level, "p-navy")],
      ])}<form data-f="msr" class="col" style="gap:12px" novalidate>${errSum("msr")}<input type="hidden" name="r" value="${x.id}"><input type="hidden" name="id" value="${m.id}"><input type="hidden" name="i" value="${d.i}">${fi("msr", "dec", "Decision", {
        type: "select",
        req: true,
        ph: "Choose a decision",
        opts: [
          ["Approved", "Approve — it supports this milestone"],
          ["Changes requested", "Request changes — the submitter revises and resubmits"],
          ["Rejected", "Reject — it does not support this milestone"],
        ],
      })}<div class="f2">${fi("msr", "level", "Evidence Support Level", { type: "select", opts: LEVELS.map(([k, v]) => [k, k + " — " + v]) })}<span></span></div>${fi("msr", "limits", "Limitations or uncertainty", { type: "textarea", rows: 2, help: "Required when you approve. Write “None noted” if there are none." })}${fi("msr", "note", "Note to the submitter", { type: "textarea", rows: 2, help: "Required when you request changes or reject." })}<div class="actions">${B("Cancel", "closeM")}<button class="btn btn-p" type="submit">Save review</button></div></form></div>`,
    true,
  );
};
F.msr = (d) => {
  const okv = validate("msr", d, {
    dec: [["req", "Choose a decision."]],
    limits: [["fn", { f: (v, dd) => dd.dec !== "Approved" || v.length > 0, m: "Describe limitations or uncertainty, or write “None noted”." }]],
    note: [["fn", { f: (v, dd) => dd.dec === "Approved" || v.length >= 5, m: "Tell the submitter what to change, or why it does not support the milestone." }]],
  });
  if (!okv) return render();
  const x = byId("rooms", d.r);
  const m = x.milestones.find((y) => y.id === d.id);
  const it = msItems(m)[+d.i];
  const e = byId("evidence", it.ev);
  const note = (d.note || "").trim();
  it.st = d.dec;
  it.rv = myId();
  it.rvAt = now();
  it.note = note;
  if (d.dec === "Approved") evApplyReview(e, "Approved", d.level, d.limits.trim(), note);
  else if (d.dec === "Changes requested") evApplyReview(e, "Needs Revision", d.level || e.level, (d.limits || e.limits || "").trim() || "—", note);
  else {
    e.history.push({ at: today(), t: "Not accepted for milestone “" + m.t + "” by " + me().name + ": " + note });
    notify(e.owner, "Your evidence “" + e.title + "” does not support the milestone “" + m.t + "”: " + note, "room", { id: x.id, tab: "plan" });
  }
  msEvidenceReviewed(e);
  sysMsg(x, "Steward review of “" + e.title + "” for milestone “" + m.t + "”: " + d.dec);
  if (msReady(m)) notify(x.lead, "All evidence for the milestone “" + m.t + "” is approved. The Steward can validate it.", "room", { id: x.id, tab: "plan" });
  audit("Milestone evidence reviewed", x.id, m.t + " · " + e.id + " · " + d.dec);
  UI.modal = null;
  clearF("msr");
  toast(d.dec === "Approved" ? (msReady(m) ? "Approved. All evidence for this milestone is approved — you can validate it now." : "Approved.") : d.dec === "Changes requested" ? "Changes requested. The submitter has been told." : "Rejected for this milestone.");
  ok();
};
// A Steward's review on the evidence page counts for the milestones they steward that use this evidence.
function msEvidenceReviewed(e) {
  S.rooms.forEach((x) =>
    (x.milestones || []).forEach((m) =>
      msItems(m).forEach((it) => {
        if (it.ev !== e.id || m.status === "Achieved" || it.st === "Rejected" || !msIsSteward(x)) return;
        const st = e.review === "Approved" ? "Approved" : e.review === "Needs Revision" ? "Changes requested" : it.st;
        if (st === it.st) return;
        Object.assign(it, { st, rv: myId(), rvAt: now() });
        sysMsg(x, "Evidence “" + e.title + "” for milestone “" + m.t + "”: " + st.toLowerCase() + " by " + me().name);
      }),
    ),
  );
}
// Revised evidence goes back to the Steward of every milestone that asked for changes.
function msEvidenceResubmitted(e) {
  S.rooms.forEach((x) =>
    (x.milestones || []).forEach((m) =>
      msItems(m)
        .filter((it) => it.ev === e.id && it.st === "Changes requested")
        .forEach((it) => {
          it.st = MS_PEND;
          sysMsg(x, "“" + e.title + "” was revised and sent back to the Steward for milestone “" + m.t + "”");
          msTellStewards(x, "Revised evidence to review for milestone “" + m.t + "” (" + x.name + "): " + e.title);
        }),
    ),
  );
}
A.msAchieve = (d) => {
  const x = byId("rooms", d.r);
  const m = x.milestones.find((m) => m.id === d.id);
  // The UI only offers this once every piece is approved; this check stays as a safeguard.
  if (!msReady(m))
    return deny(
      msItems(m).length
        ? "every piece of evidence for this milestone must be approved by the Steward first (" + msItems(m).filter((it) => !msItemOk(it)).length + " not approved)"
        : "add evidence and have the Steward approve it before the milestone is recorded as achieved",
    );
  m.status = "Achieved";
  m.validatedBy = myId();
  m.validatedAt = now();
  sysMsg(x, "Milestone validated as achieved by " + me().name + ": " + m.t);
  const pr = roomProject(x);
  if (pr) pr.history.push({ at: now(), by: myId(), t: "Milestone achieved: " + m.t });
  const owners = [...new Set(msItems(m).map((it) => byId("evidence", it.ev).owner))];
  owners.forEach((pid) =>
    S.candidates.push({
      id: uid("cd"),
      pid,
      field: "Completed milestone",
      value: m.t + " (" + x.name + ")",
      source: "Validated milestone",
      prov: "Evidence-supported",
      status: "Pending",
    }),
  );
  [...new Set([x.lead, ...owners])].filter((p) => p !== myId()).forEach((p) => notify(p, "Milestone validated: " + m.t, "room", { id: x.id, tab: "plan" }));
  audit("Milestone validated", x.id, m.t + " · " + msItems(m).length + " evidence");
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
    "Key dates and progress. Each milestone is validated by the Steward once all of its evidence is approved.",
    ms.length
      ? `<ol class="mtl ws-tl">${ms
          .slice()
          .sort((a, b) => a.due.localeCompare(b.due))
          .map(
            (m) =>
              `<li class="${m.status === "Achieved" ? "done" : m.status === "In progress" ? "cur" : ""}"><span class="mtl-dot">${m.status === "Achieved" ? ic("check", 13) : ""}</span><div class="col"><b>${h(m.t)}</b><span class="cap">${fmt(m.due)}${dueTag(m.due, m.status === "Achieved")} · ${h(m.status)}${msItems(m).length ? " · evidence approved: " + msItems(m).filter(msItemOk).length + " of " + msItems(m).length : ""}</span></div></li>`,
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
