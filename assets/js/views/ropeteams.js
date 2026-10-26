// ---------- ROPE TEAMS & MENTOR REQUESTS (E04, F05, Section 6.3, Figure 9) ----------
// Mentors are onboarded by invitation (D-05). Engagement on a project starts with a Mentor Request from a
// Faculty/Steward; the mentor accepts or declines, joins the Rope Team, and sees only the project context needed.
const OPEN_REQ = "open";
const isRopeFac = (x) => spaceRole("ropes", x) === "Facilitator";
// Only the project owner or an assigned Faculty/Steward invites people to a Rope Team and decides join requests.
const ropeInviter = (x) => {
  if (!x) return false;
  const pr = byId("projects", x.project);
  return (
    x.owner === myId() ||
    (role() === "F" && ((pr && pr.stewards.includes(myId())) || isRopeFac(x)))
  );
};
// Documents: the Rope Team's own uploads only. Linked spaces keep their documents; nothing is copied across a link.
const ropeDocs = (x) => x.docs || [];
// Rope Teams a person may ask to join: those linked to a Circle they belong to.
const ropeJoinable = (x) =>
  !!x.circle &&
  memberOf(byId("circles", x.circle) || {}) &&
  !memberOf(x) &&
  x.state === "Active";
A.mentorRequest = (d) => {
  clearF("mrq");
  const pr = byId("projects", d.project);
  const mentors = S.assign.filter(
    (a) =>
      a.ctx === ctxId() && roleBase(a.role) === "M" && a.status === "Active",
  );
  modal(
    "Raise a Mentor Request",
    () =>
      `<form data-f="mrq" class="col" style="gap:14px" novalidate><input type="hidden" name="project" value="${pr.id}">${dl(
        [
          ["Project", h(pr.title)],
          ["Stage", pill(stageLabel(pr.stage || "Circle"))],
        ],
      )}${fi("mrq", "need", "Skill gap or support needed", { req: true, ph: "e.g. GIS mapping guidance" })}${fi("mrq", "detail", "What the mentor should help with", { type: "textarea", rows: 3, help: "Shared with the mentor together with the authorised project summary only." })}${fi("mrq", "hours", "Expected time commitment (optional)", { ph: "e.g. 2 hours a week for 4 weeks" })}${fi("mrq", "to", "Send to", { type: "select", req: true, ph: "Choose a mentor or an open request", opts: [[OPEN_REQ, "Open request — visible to mentors in this programme"], ...mentors.map((a) => [a.pid, P(a.pid).name])] })}${banner("info", "Need a collaborator instead?", "Use “Find a collaborator” on the project to start a steward-reviewed match for a defined requirement (F06).")}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send request</button></div></form>`,
  );
};
F.mrq = (d) => {
  if (!validate("mrq", d, { need: ["req"], to: ["req"] })) return render();
  const m = {
    id: uid("mr"),
    from: myId(),
    to: d.to === OPEN_REQ ? null : d.to,
    open: d.to === OPEN_REQ,
    project: d.project,
    need: d.need,
    detail: d.detail || "",
    hours: (d.hours || "").trim(),
    status: "Pending",
    at: today(),
  };
  S.mentorReqs.push(m);
  const pr = byId("projects", d.project);
  const recips = m.open
    ? S.assign
        .filter(
          (a) =>
            a.ctx === pr.ctx &&
            roleBase(a.role) === "M" &&
            a.status === "Active",
        )
        .map((a) => a.pid)
    : [d.to];
  recips.forEach((p) =>
    notify(
      p,
      (m.open
        ? "Open Mentor Request: "
        : "Mentor Request from " + me().name + ": ") + d.need,
      "ropeteams",
    ),
  );
  const c = byId("circles", pr.circle);
  if (c) sysMsg(c, "Mentor Request raised: " + d.need);
  audit("Mentor Request raised", m.id, d.need + (m.open ? " (open)" : ""));
  UI.modal = null;
  clearF("mrq");
  toast(
    m.open
      ? "Open request sent to mentors in this programme."
      : "Mentor Request sent.",
  );
  ok();
};
// BF-01: requests are shown only in the context they belong to (the project's context), never across contexts.
const mentorReqCtx = (m) => (byId("projects", m.project) || {}).ctx || m.ctx;
const mentorReqVisible = (m) =>
  (!mentorReqCtx(m) || mentorReqCtx(m) === ctxId()) &&
  (m.to === myId() || m.from === myId() || (m.open && role() === "M"));
// The Rope Team facilitator is the steward who raised the request; if the project owner raised it, the project's steward
// (or the Circle facilitator) joins as facilitator instead.
const ropeFacilitator = (pr, m, circle) => {
  const f =
    m.from !== pr.owner
      ? m.from
      : pr.stewards[0] || (circle && circle.facilitator);
  return f && f !== pr.owner
    ? [{ pid: f, role: "Facilitator", status: "Active" }]
    : [];
};
A.mentorReq = (d) => {
  const m = byId("mentorReqs", d.id);
  if (d.v === "Declined" && m.open) {
    (m.declinedBy = m.declinedBy || []).push(myId());
    audit("Open Mentor Request declined", m.id, "");
    toast("Declined. The request stays open for other mentors.");
    return ok();
  }
  m.status = d.v;
  if (m.open) m.to = myId();
  notify(
    m.from,
    `${me().name} ${d.v.toLowerCase()} your Mentor Request: ${m.need}`,
    "ropeteams",
  );
  audit("Mentor Request " + d.v, m.id, "");
  if (d.v === "Accepted") {
    const pr = byId("projects", m.project);
    let rt = pr.rope && byId("ropes", pr.rope);
    if (!rt) {
      const circle = byId("circles", pr.circle);
      rt = {
        id: uid("rt"),
        ctx: pr.ctx,
        name: pr.title + " Rope Team",
        charter: "Support: " + m.need + (m.detail ? ". " + m.detail : ""),
        mentor: myId(),
        owner: pr.owner,
        circle: pr.circle,
        project: pr.id,
        state: "Active",
        // Only the people the request names: the owner, the accepting mentor and the facilitator who raised it.
        // Circle members are not carried over — the owner invites anyone else, and each person accepts.
        members: [
          { pid: pr.owner, role: "Project owner", status: "Active" },
          { pid: myId(), role: "Mentor", status: "Active" },
          ...ropeFacilitator(pr, m, circle),
        ],
        origin: { type: "Mentor Request", id: m.id },
        contentVis: ROPE_ONLY,
        chat: [],
        checkins: [],
        support: [],
        reviews: [],
        contribs: [],
        docs: [],
        engagement: null,
        indicators: {},
        privateNotes: [],
        reqFinal: false,
      };
      rt.members
        .filter((x) => ["Project owner", "Member"].includes(x.role))
        .forEach(
          (x) =>
            (rt.indicators[x.pid] = {
              pacing: "On track",
              workload: "—",
              availability: "—",
              support: "None reported",
              absence: "None",
            }),
        );
      S.ropes.push(rt);
      pr.rope = rt.id;
      addLink("ropes", rt.id, "projects", pr.id, "originated-from", true);
      projRoomCreated(pr, "ropes", rt);
      if (!pr.stage) pr.stage = "Rope Team";
      if (circle)
        addLink("ropes", rt.id, "circles", circle.id, "supports", false);
      pr.history.push({
        at: today(),
        t:
          "Rope Team formed and linked to the project" +
          (circle ? " and its Circle" : ""),
      });
      sysMsg(
        rt,
        "Rope Team formed. " + me().name + " joined as mentor for: " + m.need,
      );
      if (circle)
        sysMsg(
          circle,
          "A Rope Team was linked: " +
            rt.name +
            ". Its conversations stay private to its members.",
        );
      rt.members
        .filter((x) => x.pid !== myId())
        .forEach((x) =>
          notify(x.pid, "Rope Team formed for “" + pr.title + "”", "rope", {
            id: rt.id,
          }),
        );
    } else if (!memberOf(rt)) {
      rt.members.push({ pid: myId(), role: "Mentor", status: "Active" });
      if (!rt.mentor || rt.engagement?.status === "Exited") rt.mentor = myId();
      sysMsg(rt, me().name + " joined as mentor for: " + m.need);
    }
    toast("Accepted. You have joined the Rope Team.");
  }
  ok();
};
route("ropeteams", "ropeteams", () => {
  const r = role();
  const list = S.ropes.filter(
    (x) =>
      inCtx(x) &&
      (memberOf(x) ||
        r === "A" ||
        ["Requested", "Invited"].includes((memberRec(x) || {}).status)),
  );
  const joinable = S.ropes.filter(
    (x) => inCtx(x) && !list.includes(x) && ropeJoinable(x),
  );
  const reqs = S.mentorReqs.filter(
    (m) =>
      mentorReqVisible(m) &&
      !(
        m.open &&
        m.status === "Pending" &&
        (m.declinedBy || []).includes(myId())
      ),
  );
  return (
    head(
      r === "M" ? "Rope Teams & Mentor Requests" : "Rope Teams",
      "Small mentoring, support and accountability groups. Not a clinical or care-management system.",
      ["P", "M", "F"].includes(r)
        ? B(ic("plus", 16) + "Form a Rope Team", "newRope", {}, "btn-p")
        : "",
    ) +
    (reqs.length || r === "M"
      ? card(
          "Mentor Requests",
          r === "M"
            ? "Accept only where your expertise is relevant. Declining has no consequences."
            : "Requests you raised or received.",
          dataView("ropeteams:reqs", {
            label: "Mentor Requests",
            items: reqs,
            search: (m) =>
              [
                m.need,
                m.detail,
                cName(m.project),
                P(m.from).name,
                m.to ? P(m.to).name : "",
              ].join(" "),
            quick: {
              label: "Status",
              options: wsOpts(reqs, (m) => m.status),
              test: (m, v) => m.status === v,
            },
            filters: [
              {
                key: "project",
                label: "Project",
                options: [...new Set(reqs.map((m) => m.project))].map((p) => [
                  p,
                  cName(p),
                ]),
                test: (m, v) => m.project === v,
              },
              {
                key: "from",
                label: "From",
                options: wsPeople(reqs, (m) => m.from),
                test: (m, v) => m.from === v,
              },
            ],
            sorts: [
              [
                "at",
                "Newest",
                (a, b) => String(b.at || "").localeCompare(String(a.at || "")),
              ],
              ["need", "Need", (a, b) => a.need.localeCompare(b.need)],
            ],
            defaultSort: "at",
            row: (m) => ({
              lead: `<span class="tile t-teal" aria-hidden="true">${ic("route", 18)}</span>`,
              title: `<b>${h(m.need)}</b>`,
              sub: m.hours
                ? `<span class="ws-ico">${ic("clock", 12)} ${h(m.hours)}</span>`
                : "",
              meta: [
                cName(m.project),
                "From " + nm(m.from),
                "To " +
                  (m.open && m.status === "Pending"
                    ? "mentors in this programme"
                    : m.to
                      ? nm(m.to)
                      : "—"),
                m.at ? fmt(m.at) : "",
              ],
              badges:
                (m.open && m.status === "Pending"
                  ? pill("Open request", "p-purple")
                  : "") + pill(m.status),
              primary:
                B("Details", "mrDetails", { id: m.id }) +
                ((m.to === myId() || (m.open && r === "M")) &&
                m.status === "Pending"
                  ? B("Decline", "mentorReq", { id: m.id, v: "Declined" }) +
                    B(
                      "Accept",
                      "mentorReq",
                      { id: m.id, v: "Accepted" },
                      "btn-p btn-sm",
                    )
                  : ""),
            }),
            empty: [
              "route",
              r === "M"
                ? "No Mentor Requests for you right now."
                : "No requests.",
              "",
              "",
            ],
          }),
        ) + '<div class="section-gap"></div>'
      : "") +
    card(
      "Rope Teams",
      "",
      dataView("ropeteams:list", {
        label: "Rope Teams",
        items: list,
        search: (x) =>
          [
            x.name,
            x.charter,
            x.mentor ? P(x.mentor).name : "",
            cName(x.circle),
            cName(x.project),
            wsRoleTxt("ropes", x),
          ].join(" "),
        quick: {
          label: "State",
          options: wsOpts(list, (x) => x.state),
          test: (x, v) => x.state === v,
        },
        filters: [
          {
            key: "role",
            label: "Your role",
            options: wsOpts(list, (x) => wsRoleTxt("ropes", x)),
            test: (x, v) => wsRoleTxt("ropes", x) === v,
          },
          {
            key: "mentor",
            label: "Mentor",
            options: wsPeople(list, (x) => x.mentor),
            test: (x, v) => x.mentor === v,
          },
          {
            key: "project",
            label: "Project",
            options: [
              ...new Set(list.map((x) => x.project).filter(Boolean)),
            ].map((p) => [p, cName(p)]),
            test: (x, v) => x.project === v,
          },
        ],
        sorts: [
          ["name", "Name", (a, b) => a.name.localeCompare(b.name)],
          [
            "activity",
            "Latest activity",
            (a, b) => wsLastAt(b).localeCompare(wsLastAt(a)),
          ],
          [
            "reviews",
            "Work reviewed",
            (a, b) =>
              (b.reviews || []).filter((v) => v.status !== "Awaiting review")
                .length -
              (a.reviews || []).filter((v) => v.status !== "Awaiting review")
                .length,
          ],
          [
            "members",
            "Members",
            (a, b) => wsActive(b).length - wsActive(a).length,
          ],
        ],
        defaultSort: "name",
        row: (x) => ({
          lead: `<span class="tile t-teal" aria-hidden="true">${ic("route", 18)}</span>`,
          title: L(h(x.name), "rope", { id: x.id }, "dv-link") + wsUnread(x),
          sub: h(x.charter || ""),
          meta: [
            "Mentor <b>" + (x.mentor ? nm(x.mentor) : "—") + "</b>",
            "Your role <b>" + h(wsRoleTxt("ropes", x)) + "</b>",
            primaryLink(x.id)
              ? "Origin: " + cName(primaryLink(x.id).target_id)
              : h((x.origin || {}).type || "Direct"),
            wsMem(x),
          ],
          badges:
            pill(x.state) +
            (joinState(x) === "pending"
              ? pill("Pending")
              : joinState(x) === "invited"
                ? pill("Invited")
                : ""),
          primary:
            joinState(x) === "pending"
              ? B("Withdraw request", "joinWithdraw", {
                  id: x.id,
                  kind: "ropes",
                })
              : joinState(x) === "invited"
                ? B(
                    "Respond to invite",
                    "go",
                    { r: "rope", id: x.id },
                    "btn-p btn-sm",
                  )
                : L("Open", "rope", { id: x.id }, "btn btn-s btn-sm"),
        }),
        empty: [
          "route",
          "No Rope Teams.",
          "Form one directly with a mentor, from a Circle or " +
            WL() +
            " you belong to, or when a mentor accepts a Mentor Request.",
          "",
        ],
      }),
    ) +
    (joinable.length
      ? '<div class="section-gap"></div>' +
        card(
          "Rope Teams linked to your Circles",
          "You can ask to join. The project owner or the Faculty/Steward approves or declines.",
          table(
            ["Rope Team", "Circle", "Mentor", "State", ""],
            joinable.map((x) => [
              `<div class="ws-name"><span class="tile t-teal" aria-hidden="true">${ic("route", 16)}</span><div class="ws-name-t"><b>${h(x.name)}</b></div></div>`,
              cName(x.circle),
              x.mentor ? nm(x.mentor) : "—",
              pill(x.state),
              joinBtn(x, "ropes"),
            ]),
          ),
        )
      : "")
  );
});
route("rope", "ropeteams", () => {
  const x = byId("ropes", UI.p.id);
  if (!x) return empty("route", "Not found", "");
  const r = role();
  const isMem = memberOf(x);
  const myM = memberRec(x);
  const isMentor = sCan("ropes", x, "mentor");
  const isFac = isRopeFac(x);
  const inviter = ropeInviter(x);
  const crumbs = [["Rope Teams", "ropeteams"], [h(x.name)]];
  if (myM && myM.status === "Requested")
    return (
      head(h(x.name), "Rope Team", pill("Pending"), crumbs) +
      banner(
        "info",
        "Your request to join is pending",
        "The project owner or the Faculty/Steward will approve or decline it. You will be notified either way.",
      ) +
      card(
        "",
        "",
        dl([
          ["Charter", h(x.charter)],
          ["Mentor", x.mentor ? nm(x.mentor) : "—"],
          ["Requested", fmt(myM.at || "")],
        ]) +
          `<div class="row ws-acts">${B("Withdraw request", "joinWithdraw", { id: x.id, kind: "ropes" })}</div>`,
      )
    );
  if (myM && myM.status === "Invited")
    return (
      head(h(x.name), "You have been invited to this Rope Team", "", crumbs) +
      card(
        "",
        "",
        `<p>${h(x.charter)}</p>${dl([
          ["Mentor", x.mentor ? nm(x.mentor) : "—"],
          ["Your role", h(normRole(myM.role))],
          ["Circle", cName(x.circle)],
        ])}<div class="row ws-acts">${B("Decline", "ropeInvite", { id: x.id, v: "Declined" })}${B("Accept and join", "ropeInvite", { id: x.id, v: "Active" }, "btn-p btn-sm")}</div>`,
      )
    );
  if (!isMem && r !== "A" && !inviter) {
    if (
      ropeJoinable(x) ||
      (x.circle && memberOf(byId("circles", x.circle) || {}))
    )
      return (
        head(h(x.name), "Rope Team", pill(x.state), crumbs) +
        card(
          "Members only",
          "Only Rope Team members see its chat, reviews and support.",
          dl([
            ["Charter", h(x.charter)],
            ["Mentor", x.mentor ? nm(x.mentor) : "—"],
            ["Circle", cName(x.circle)],
          ]) +
            (x.state === "Active"
              ? `<div class="row ws-acts">${joinBtn(x, "ropes")}</div>`
              : ""),
        )
      );
    return deniedView("ropeteams");
  }
  const ro = x.state !== "Active" || !isMem;
  const canShare = sCan("ropes", x, "share");
  const canAsk = sCan("ropes", x, "ask");
  const pr = byId("projects", x.project);
  x.reviews = x.reviews || [];
  const t = subnav(
    "rt_" + x.id,
    [
      ["overview", "Overview"],
      // ROPE_TEAM_ONLY: chat, reviews, check-ins, support and documents open only for members — never through a
      // link, a platform role or Organization administration.
      isMem && ["chat", "Chat", unreadIn(x) || null],
      isMem && [
        "reviews",
        "Work reviews",
        x.reviews.filter((v) => v.status === "Awaiting review").length || null,
      ],
      isMem && ["checkins", "Check-ins & sessions"],
      isMem && [
        "support",
        "Support requests",
        x.support.filter((s) => s.status !== "Resolved").length || null,
      ],
      (isMentor || isFac) && ["ind", "Support indicators"],
      (isMentor || isFac) && ["notes", "Private notes"],
      isMem && ["docs", "Documents", ropeDocs(x).length || null],
      [
        "members",
        "Members",
        x.members.filter((m) => m.status === "Requested").length || null,
      ],
      ["about", "Charter & links"],
    ],
    UI.p.tab,
    {
      label: "Rope Team sections",
      icons: { overview: "grid" },
      groups: [
        ["", "", ["overview"]],
        ["Conversation", "message", ["chat"]],
        ["Guidance", "route", ["reviews", "checkins", "support", "contrib"]],
        ["Mentor only", "lock", ["ind", "notes"]],
        ["People & charter", "users", ["members", "about"]],
      ],
    },
  );
  let body = "";
  if (t.cur === "chat")
    body =
      `<div class="ws-split ws-chat"><div class="ws-main"><div class="row wrap chatbar"><span class="cap">Rope Team chat — members only. ${isMem ? L("Open in Messages", "messages", { c: x.id, k: "ropes" }) : ""}</span></div>` +
      chatThread("ropes", x, { embedded: true }) +
      `</div><aside class="ws-rail hide-md" aria-label="Members">${wsTeamCard("ropes", x)}</aside></div>`;
  if (t.cur === "reviews")
    body = card(
      "Work for mentor review",
      "Share specific deliverables, designs, documents or approaches. The mentor reviews and recommends improvements; reviews are recorded as mentor contributions.",
      x.reviews
        .slice()
        .reverse()
        .map(
          (v) =>
            `<article class="rvitem"><div class="rv-h"><span class="av" aria-hidden="true">${ini(v.by)}</span><div class="rv-t"><b>${h(v.title)}</b><span class="cap">${nm(v.by)} · ${fmt(v.at)}</span></div>${pill(v.status, { "Looks good": "p-green", "Changes recommended": "p-amber", "Awaiting review": "p-navy" }[v.status])}</div>${v.desc ? `<p class="muted rv-desc">${h(v.desc)}</p>` : ""}${v.att ? `<div class="rv-att">${attCard(v.att)}</div>` : ""}${v.response ? `<div class="rvresp"><span class="cap"><b>${nm(v.reviewer)}</b> · mentor review</span><p>${h(v.response)}</p></div>` : ""}<div class="row wrap rv-acts">${isMentor && !ro && v.status === "Awaiting review" ? B("Review", "revRespond", { r: x.id, id: v.id }, "btn-p btn-sm") : ""}${v.by === myId() && !ro && v.status === "Changes recommended" ? B("Resubmit after changes", "revNew", { id: x.id, re: v.id }) : ""}</div></article>`,
        )
        .join("") ||
        empty(
          "file",
          "Nothing shared for review yet",
          "Participants share work here when they want the mentor’s view.",
        ),
      !ro && canShare
        ? B(
            ic("upload", 14) + "Share work for review",
            "revNew",
            { id: x.id },
            "btn-p btn-sm",
          )
        : "",
    );
  if (t.cur === "checkins")
    body = card(
      "Check-ins and sessions",
      "One-to-one or group guidance and accountability check-ins.",
      dataView("rt:ck:" + x.id, {
        label: "check-ins and sessions",
        items: x.checkins.slice().reverse(),
        search: (c) =>
          [c.kind || "Check-in", c.t, P(c.by).name, c.pacing].join(" "),
        quick: {
          label: "Type",
          options: wsOpts(x.checkins, (c) => c.kind || "Check-in"),
          test: (c, v) => (c.kind || "Check-in") === v,
        },
        filters: [
          {
            key: "pacing",
            label: "Pacing",
            options: wsOpts(x.checkins, (c) => c.pacing),
            test: (c, v) => c.pacing === v,
          },
        ],
        sorts: [
          ["at", "Newest", (a, b) => String(b.at).localeCompare(String(a.at))],
          [
            "oldest",
            "Oldest",
            (a, b) => String(a.at).localeCompare(String(b.at)),
          ],
        ],
        defaultSort: "at",
        row: (c) => ({
          lead: `<span class="sess-date" aria-hidden="true"><b>${c.at ? new Date(String(c.at).slice(0, 10) + "T00:00:00").getDate() : "–"}</b><span>${c.at ? new Date(String(c.at).slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { month: "short" }) : ""}</span></span>`,
          title: `<b>${h(c.kind || "Check-in")}</b>`,
          sub: h(c.t),
          meta: [fmt(c.at), "By " + nm(c.by)],
          badges: pill(
            c.pacing,
            c.pacing === "On track" ? "p-teal" : "p-amber",
          ),
        }),
        empty: ["calendar", "No check-ins recorded yet.", "", ""],
      }),
      isMentor && !ro
        ? B(
            ic("plus", 14) + "Record check-in or session",
            "checkin",
            { id: x.id },
            "btn-p btn-sm",
          )
        : "",
    );
  if (t.cur === "support")
    body = card(
      "Support requests",
      "Create, assign response ownership and track status. Issues returned from the " +
        WL() +
        " arrive here.",
      dataView("rt:sup:" + x.id, {
        label: "support requests",
        items: x.support,
        search: (s) =>
          [s.t, P(s.by).name, s.owner ? P(s.owner).name : "", s.status].join(
            " ",
          ),
        quick: {
          label: "Status",
          options: wsOpts(x.support, (s) => s.status),
          test: (s, v) => s.status === v,
        },
        filters: [
          {
            key: "ret",
            label: "Source",
            options: [
              ["ret", "Returned from another space"],
              ["own", "Raised in this Rope Team"],
            ],
            test: (s, v) => (v === "ret" ? !!s.ret : !s.ret),
          },
        ],
        sorts: [
          ["t", "Request", (a, b) => a.t.localeCompare(b.t)],
          ["status", "Status", (a, b) => a.status.localeCompare(b.status)],
        ],
        row: (s) => ({
          lead: `<span class="av sm" title="${nm(s.by)}">${ini(s.by)}</span>`,
          title: h(s.t),
          meta: ["From " + nm(s.by), "Owner " + (s.owner ? nm(s.owner) : "—")],
          badges: (s.ret ? pill("Returned", "p-amber") : "") + pill(s.status),
          primary:
            (isMentor || isFac) && s.status !== "Resolved" && !ro
              ? (s.status === "Open"
                  ? B("Take ownership", "supStatus", {
                      r: x.id,
                      id: s.id,
                      v: "Assigned",
                    })
                  : "") +
                B("Resolve", "supStatus", { r: x.id, id: s.id, v: "Resolved" })
              : "",
        }),
        empty: ["inbox", "No support requests.", "", ""],
      }),
      !ro && canAsk
        ? B(
            ic("plus", 14) + "Ask for support",
            "supNew",
            { id: x.id },
            "btn-p btn-sm",
          )
        : "",
    );
  if (t.cur === "ind")
    body = card(
      "Participant support indicators",
      "Activity-derived or participant-reported. Visible only to the mentor and facilitator. Never a score.",
      table(
        [
          "Participant",
          "Pacing",
          "Workload",
          "Availability",
          "Support needs",
          "Absence",
        ],
        Object.entries(x.indicators).map(([k, v]) => [
          nm(k),
          h(v.pacing),
          h(v.workload),
          h(v.availability),
          h(v.support),
          h(v.absence),
        ]),
      ),
    );
  if (t.cur === "notes")
    body = card(
      "Private mentor notes",
      pill(ROPE_ONLY, "p-grey") +
        " Never shown in linked spaces, previews, search, notifications, dashboards, exports, Harvests, profiles, AI context or sponsor reports.",
      x.privateNotes.map((n) => lrow("lock", h(n.t), nm(n.by))).join("") ||
        '<p class="cap">None.</p>',
      isMentor
        ? B(
            ic("plus", 14) + "Add note",
            "privNote",
            { id: x.id },
            "btn-s btn-sm",
          )
        : "",
    );
  if (t.cur === "docs") {
    const own = x.docs || [];
    const row = (d) => [
      `<span class="att">${ic("file", 14)}${h(d.n)}</span>`,
      d.mb != null ? d.mb + " MB" : "—",
      nm(d.by),
      fmt(d.at),
      docShareBtnFor(d),
    ];
    const lc = linkedObjs(x.id, "circles").filter((c) =>
      canOpenSpace("circles", c),
    );
    body = card(
      "Documents",
      "Documents uploaded to this Rope Team. Visible only to its members. Documents of linked spaces stay in those spaces" +
        (lc.length
          ? ": " +
            lc
              .map((c) => L(h(c.name), "circle", { id: c.id, tab: "docs" }))
              .join(", ")
          : "") +
        ".",
      table(
        ["Document", "Size", "Uploaded by", "Date", ""],
        own.map(row),
        "No documents yet.",
      ),
      !ro
        ? `<form data-f="rdoc" class="row wrap" style="gap:8px" novalidate><input type="hidden" name="id" value="${x.id}"><input type="file" name="f" class="input" style="padding:6px;max-width:320px" multiple aria-label="Choose documents"><button class="btn btn-p btn-sm" type="submit">${ic("upload", 14)}Upload</button></form>`
        : "",
    );
  }
  if (t.cur === "members") {
    const reqs = x.members
      .map((m, i) => [m, i])
      .filter(([m]) => m.status === "Requested");
    body =
      (reqs.length
        ? card(
            "Join requests",
            inviter
              ? "Approve or decline. The person is notified either way."
              : "Waiting for the project owner or Faculty/Steward.",
            table(
              ["Person", "Platform role", "Requested", ""],
              reqs.map(([m, i]) => [
                nm(m.pid),
                h(roleName(ctxRole(m.pid, x.ctx), x.ctx) || "—"),
                fmt(m.at || ""),
                inviter && x.state === "Active"
                  ? B("Decline", "memSet", {
                      kind: "ropes",
                      c: x.id,
                      i,
                      v: "Declined",
                    }) +
                    B(
                      "Approve",
                      "memSet",
                      { kind: "ropes", c: x.id, i, v: "Active" },
                      "btn-p btn-sm",
                    )
                  : pill("Pending"),
              ]),
            ),
          ) + '<div class="section-gap"></div>'
        : "") +
      card(
        "Members",
        "Roles apply in this Rope Team only. Only the project owner or an assigned Faculty/Steward invites people.",
        table(
          ["Member", "Role in this Rope Team", "Status", ""],
          x.members
            .map((m, i) => [m, i])
            .filter(([m]) => m.status !== "Requested")
            .map(([m, i]) => {
              const fixed =
                m.pid === x.owner ||
                (m.pid === x.mentor && normRole(m.role) === "Mentor");
              const sr = m.pid === x.owner ? "Project owner" : normRole(m.role);
              return [
                nm(m.pid) +
                  ` <span class="cap">${h(roleName(ctxRole(m.pid, x.ctx), x.ctx) || "")}</span>`,
                inviter &&
                x.state === "Active" &&
                !fixed &&
                (!m.status || m.status === "Active")
                  ? roleSelect(
                      "memRole",
                      { kind: "ropes", c: x.id, i },
                      sr,
                      "Role of " + P(m.pid).name,
                    )
                  : h(roleLabel(sr)),
                pill(m.status || "Active"),
                inviter &&
                x.state === "Active" &&
                !fixed &&
                ["Active", "Invited", undefined].includes(m.status)
                  ? CB(
                      "Remove",
                      "memSet",
                      { kind: "ropes", c: x.id, i, v: "Removed" },
                      "Remove " +
                        P(m.pid).name +
                        " from this Rope Team? Their recorded contributions stay in the project record.",
                    )
                  : "",
              ];
            }),
        ),
        inviter && x.state === "Active"
          ? B(
              ic("plus", 14) + "Invite",
              "inviteMem",
              { c: x.id, kind: "ropes" },
              "btn-p btn-sm",
            )
          : "",
      );
  }
  if (t.cur === "about") {
    const eng = x.engagement;
    const secs = pr && pr.sections;
    body = `<div class="g12">${card(
      "Charter",
      "",
      dl([
        ["Charter", h(x.charter)],
        ["Mentor", x.mentor ? nm(x.mentor) : "—"],
        ["Rope Team owner", nm(x.owner)],
        [
          "Primary origin",
          primaryLink(x.id)
            ? OBJ_LABEL(primaryLink(x.id).target_type) +
              " · " +
              cName(primaryLink(x.id).target_id)
            : h((x.origin || {}).type || "Direct entry") +
              ((x.origin || {}).basis ? " · " + h(x.origin.basis) : ""),
        ],
        ["Project", pr ? L(h(pr.title), "project", { id: pr.id }) : "—"],
        ["Content classification", pill(ROPE_ONLY, "p-grey")],
        ["State", pill(x.state)],
        [
          "Members",
          x.members
            .filter((m) => !m.status || m.status === "Active")
            .map(
              (m) =>
                nm(m.pid) +
                ' <span class="cap">(' +
                h(roleLabel(spaceRole("ropes", x, m.pid) || normRole(m.role))) +
                ")</span>",
            )
            .join(", "),
        ],
      ]),
      L("Members", "rope", { id: x.id, tab: "members" }),
      "c7",
    )}<div class="c5 col ws-stack">${linkCard("ropes", x)}${stageGate(pr, "ropes", x)}</div>
 ${
   secs
     ? card(
         "Authorised project context",
         "Only what the Rope Team needs to guide effectively. Purpose Compass, hurdles and private records are never shown here.",
         dl([
           [SECTIONS[0], h(secs[0].text)],
           [SECTIONS[1], `<span class="ws-pre">${h(secs[1].text)}</span>`],
           [SECTIONS[2], `<span class="ws-pre">${h(secs[2].text)}</span>`],
           [SECTIONS[3], `<span class="ws-pre">${h(secs[3].text)}</span>`],
         ]),
         "",
         "c7",
       )
     : ""
 }
 <div class="${secs ? "c5" : "c12"} col ws-stack">${isMem ? reportsCard(pr, "ropes", x) : ""}${
   isMem
     ? card(
         "Mentor engagement",
         "When the need is addressed, the mentor and Faculty/Steward decide whether the engagement continues or ends.",
         `${
           eng
             ? dl([
                 ["Decision", pill(eng.status)],
                 ["Need addressed", h(eng.addressed)],
                 ["Note", h(eng.note || "—")],
                 ["Proposed by", nm(eng.by) + " · " + fmt(eng.at)],
               ])
             : '<p class="cap">Engagement is active.</p>'
         }<div class="row wrap ws-acts">${isMentor && !ro && (!eng || eng.status === "Continuing") ? B("Review engagement", "engage", { id: x.id }, "btn-s btn-sm") : ""}${isFac && eng && eng.status === "Exit proposed" && !ro ? B("Continue instead", "engageDecide", { id: x.id, v: "Continuing" }) + B("Confirm mentor exit", "engageDecide", { id: x.id, v: "Exited" }, "btn-p btn-sm") : ""}${isMentor && !ro ? B("Feedback to facilitator", "ropeFeedback", { id: x.id }) + B("Suggest an opportunity", "suggestOpp", { id: x.id }) : ""}${!ro && (isMentor || isFac) ? B(ic("alert", 14) + "Escalate a concern", "escalateRope", { id: x.id }) : ""}${(isFac || isMentor) && x.state === "Active" ? B("Close Rope Team", "ropeClose", { id: x.id }) : ""}</div>`,
       )
     : ""
 }${
   isFac
     ? card(
         "Mentor feedback",
         "Feedback the mentor sent to the facilitator.",
         S.feedback
           .filter((f) => f.rope === x.id)
           .map((f) => lrow("message", h(f.t), nm(f.by) + " · " + fmt(f.at)))
           .join("") || '<p class="cap">No feedback yet.</p>',
       )
     : ""
 }</div>
 ${returnsCard(x) ? `<div class="c12">${returnsCard(x)}</div>` : ""}</div>`;
  }
  const acts =
    spaceEditBtn("ropes", x) +
    (isMem
      ? L(
          ic("message", 16) + "Open in Messages",
          "messages",
          { c: x.id, k: "ropes" },
          "btn btn-s",
        )
      : "");
  // the space header, its facts and the project journey live in Overview; other sections get a one-line context bar
  if (t.cur === "overview")
    body =
      spaceHead("ropes", x, h(x.charter), null, acts) +
      roleNote("ropes", x) +
      (!isMem
        ? banner(
            "info",
            "Charter and members only",
            "You can see who is in this Rope Team because of your role. Its chat, notes, support, check-ins and documents are " +
              ROPE_ONLY +
              " and open only to its members.",
            "lock",
          )
        : "") +
      linkStrip("ropes", x);
  else body = wsBar("ropes", x, acts) + body;
  return crumbsHtml(crumbs) + withSubnav(t, body);
});
A.checkin = (d) => {
  clearF("ck");
  modal(
    "Record a check-in or session",
    () =>
      `<form data-f="ck" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${fi("ck", "kind", "Type", { type: "select", opts: ["Check-in", "One-to-one guidance session", "Group guidance session"], req: true })}${fi("ck", "t", "Note", { type: "textarea", rows: 3, req: true, help: "Visible to Rope Team members. Use private notes for anything sensitive." })}${fi("ck", "pacing", "Pacing", { type: "select", opts: ["On track", "Slightly behind", "Behind"], req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save</button></div></form>`,
  );
};
F.ck = (d) => {
  if (!validate("ck", d, { t: ["req"] })) return render();
  const x = byId("ropes", d.id);
  x.checkins.push({
    at: today(),
    by: myId(),
    kind: d.kind,
    t: d.t,
    pacing: d.pacing,
  });
  sysMsg(x, (d.kind || "Check-in") + " recorded by " + me().name);
  audit("Check-in recorded", x.id, d.kind || "");
  UI.modal = null;
  clearF("ck");
  ok();
};
A.revNew = (d) => {
  clearF("rvn");
  const x = byId("ropes", d.id);
  const prev = d.re && x.reviews.find((v) => v.id === d.re);
  if (prev)
    UI.form.rvn = {
      title: prev.title.replace(/ \(revised\)$/, "") + " (revised)",
      desc: prev.desc,
    };
  modal(
    prev ? "Resubmit after changes" : "Share work for review",
    () =>
      `<form data-f="rvn" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${x.id}"><input type="hidden" name="re" value="${d.re || ""}">${fi("rvn", "title", "What should the mentor review?", { req: true, ph: "e.g. Survey question set v3" })}${fi("rvn", "desc", "Context and what kind of feedback you want", { type: "textarea", rows: 3, req: true })}<div class="field"><label class="lbl" for="rvn_f">File (optional)</label><input id="rvn_f" type="file" name="f" class="input" style="padding:8px"><span class="help">Up to ${S.settings.maxFileMB} MB. Link video externally.</span></div><div class="actions"><span></span><button class="btn btn-p" type="submit">Send for review</button></div></form>`,
  );
};
F.rvn = (d, form) => {
  if (!validate("rvn", d, { title: ["req"], desc: ["req"] })) return render();
  const file = form.querySelector("input[type=file]")?.files?.[0];
  if (file && file.size > S.settings.maxFileMB * 1048576) {
    UI.err.rvn = {
      title:
        "File over " +
        S.settings.maxFileMB +
        " MB. Link it externally instead.",
    };
    return render();
  }
  const x = byId("ropes", d.id);
  x.reviews.push({
    id: uid("rv"),
    by: myId(),
    title: d.title,
    desc: d.desc,
    att: file ? { n: file.name, mb: +(file.size / 1048576).toFixed(2) } : null,
    at: today(),
    status: "Awaiting review",
    response: "",
    reviewer: null,
    prev: d.re || null,
  });
  if (x.mentor)
    notify(
      x.mentor,
      "Work shared for review in " + x.name + ": " + d.title,
      "rope",
      { id: x.id, tab: "reviews" },
    );
  sysMsg(x, me().name + " shared work for review: " + d.title);
  audit("Work shared for mentor review", x.id, d.title);
  UI.modal = null;
  clearF("rvn");
  toast("Sent to your mentor for review.");
  ok();
};
A.revRespond = (d) => {
  clearF("rvr");
  const x = byId("ropes", d.r);
  const v = x.reviews.find((y) => y.id === d.id);
  modal(
    "Review: " + h(v.title),
    () =>
      `<form data-f="rvr" class="col" style="gap:14px" novalidate><input type="hidden" name="r" value="${x.id}"><input type="hidden" name="id" value="${v.id}">${dl(
        [
          ["From", nm(v.by)],
          ["Shared", fmt(v.at)],
          ["Context", h(v.desc)],
        ],
      )}${fi("rvr", "status", "Outcome", { type: "select", req: true, opts: ["Looks good", "Changes recommended"] })}${fi("rvr", "response", "Your review and recommendations", { type: "textarea", rows: 4, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send review</button></div></form>`,
  );
};
F.rvr = (d) => {
  if (!validate("rvr", d, { response: ["req", ["min", 10]] })) return render();
  const x = byId("ropes", d.r);
  const v = x.reviews.find((y) => y.id === d.id);
  v.status = d.status;
  v.response = d.response;
  v.reviewer = myId();
  (x.contribs = x.contribs || []).push({
    by: myId(),
    kind: "Review of deliverable",
    t: v.title + " — " + d.status.toLowerCase(),
    at: today(),
  });
  notify(v.by, "Mentor review of “" + v.title + "”: " + d.status, "rope", {
    id: x.id,
    tab: "reviews",
  });
  sysMsg(x, "Mentor reviewed “" + v.title + "”: " + d.status);
  audit("Mentor review recorded", x.id, v.title + " · " + d.status);
  UI.modal = null;
  clearF("rvr");
  ok();
};
// Same upload rules as Circle documents.
F.rdoc = (d, form) => {
  const x = byId("ropes", d.id);
  const files = [...(form.querySelector("input[type=file]")?.files || [])];
  if (!files.length) {
    toast("Choose at least one document.", "warn");
    return render();
  }
  const big = files.find((f) => f.size > S.settings.maxFileMB * 1048576);
  if (big) {
    toast(big.name + " is over " + S.settings.maxFileMB + " MB.", "err");
    return render();
  }
  x.docs = x.docs || [];
  files.forEach((f) =>
    x.docs.push({
      id: uid("dc"),
      n: f.name,
      mb: +(f.size / 1048576).toFixed(2),
      by: myId(),
      at: now(),
    }),
  );
  sysMsg(
    x,
    me().name +
      " uploaded " +
      files.length +
      " document" +
      (files.length > 1 ? "s" : ""),
  );
  audit(
    "Rope Team documents uploaded",
    x.id,
    files.map((f) => f.name).join(", "),
  );
  toast("Uploaded.");
  ok();
};
A.engage = (d) => {
  clearF("eng");
  modal(
    "Review the mentor engagement",
    () =>
      `<form data-f="eng" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${fi("eng", "addressed", "Has the need been addressed?", { type: "select", req: true, opts: ["Yes", "Partly", "Not yet"] })}${fi(
        "eng",
        "choice",
        "Proposal",
        {
          type: "select",
          req: true,
          opts: [
            ["Continuing", "Continue the engagement"],
            [
              "Exit proposed",
              "End my engagement (the Faculty/Steward confirms)",
            ],
          ],
        },
      )}${fi("eng", "note", "Note for the Faculty/Steward", { type: "textarea", rows: 3 })}${banner("info", "", "Ending your engagement removes your access to this Rope Team. Your recorded contributions stay in the project record.")}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send</button></div></form>`,
  );
};
F.eng = (d) => {
  if (!validate("eng", d, { addressed: ["req"], choice: ["req"] }))
    return render();
  const x = byId("ropes", d.id);
  x.engagement = {
    status: d.choice,
    addressed: d.addressed,
    note: d.note || "",
    by: myId(),
    at: today(),
  };
  x.members
    .filter((m) => m.role === "Facilitator")
    .forEach((m) =>
      notify(
        m.pid,
        `Mentor engagement review in ${x.name}: ${d.choice === "Continuing" ? "continue" : "exit proposed"} (need addressed: ${d.addressed})`,
        "rope",
        { id: x.id, tab: "about" },
      ),
    );
  audit("Mentor engagement reviewed", x.id, d.choice);
  UI.modal = null;
  clearF("eng");
  toast(
    d.choice === "Continuing"
      ? "Recorded. The engagement continues."
      : "Exit proposed. The Faculty/Steward confirms it.",
  );
  ok();
};
A.engageDecide = (d) => {
  const x = byId("ropes", d.id);
  const ment = x.mentor;
  x.engagement.status = d.v;
  x.engagement.decidedBy = myId();
  if (d.v === "Exited") {
    x.members
      .filter((m) => m.pid === ment && m.role === "Mentor")
      .forEach((m) => (m.status = "Exited"));
    sysMsg(
      x,
      P(ment).name +
        " ended their mentor engagement. Contributions stay in the project record.",
    );
    notify(
      ment,
      "Your engagement with " +
        x.name +
        " has ended. Thank you — please share Harvest input or feedback if you have not yet.",
      "rope",
      { id: x.id },
    );
    toast(
      "Mentor exit confirmed. Raise a new Mentor Request if more support is needed.",
    );
  } else
    notify(
      ment,
      "The Faculty/Steward asked you to continue with " + x.name,
      "rope",
      { id: x.id },
    );
  audit("Mentor engagement " + d.v, x.id, P(ment).name);
  ok();
};
A.supNew = (d) => {
  clearF("sup");
  modal(
    "Ask for support",
    () =>
      `<form data-f="sup" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${fi("sup", "t", "What do you need help with?", { type: "textarea", rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send</button></div></form>`,
  );
};
F.sup = (d) => {
  if (!validate("sup", d, { t: ["req"] })) return render();
  const x = byId("ropes", d.id);
  x.support.push({
    id: uid("su"),
    by: myId(),
    t: d.t,
    owner: null,
    status: "Open",
  });
  if (x.mentor)
    notify(x.mentor, "Support request in " + x.name, "rope", {
      id: x.id,
      tab: "support",
    });
  audit("Support request", x.id, "");
  UI.modal = null;
  clearF("sup");
  ok();
};
A.supStatus = (d) => {
  const x = byId("ropes", d.r);
  const s = x.support.find((s) => s.id === d.id);
  s.status = d.v;
  if (d.v === "Assigned") s.owner = myId();
  if (d.v === "Resolved" && s.ret)
    resolveReturn(s.ret, "guidance given in " + x.name);
  notify(s.by, "Your support request is " + d.v.toLowerCase(), "rope", {
    id: x.id,
  });
  audit("Support request " + d.v, x.id, s.id);
  if (d.v === "Resolved" && s.ret)
    toast(
      "Resolved. The " + WL() + " has been told it can move forward again.",
    );
  ok();
};
A.privNote = (d) => {
  clearF("pn");
  modal(
    "Private note",
    () =>
      `<form data-f="pn" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${fi("pn", "t", "Note", { type: "textarea", rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save</button></div></form>`,
  );
};
F.pn = (d) => {
  if (!validate("pn", d, { t: ["req"] })) return render();
  byId("ropes", d.id).privateNotes.push({ by: myId(), t: d.t });
  UI.modal = null;
  clearF("pn");
  ok();
};
A.escalateRope = (d) => {
  clearF("esc");
  modal(
    "Escalate a concern",
    () =>
      `<form data-f="esc" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${fi("esc", "t", "Concern (e.g. disengagement or risk of harm)", { type: "textarea", rows: 3, req: true })}${fi(
        "esc",
        "to",
        "Escalate to",
        {
          type: "select",
          opts: [
            ["steward", "Steward / facilitator"],
            ["safety", "Incident/Safety Owner"],
          ],
          req: true,
        },
      )}<div class="actions"><span></span><button class="btn btn-d" type="submit">Escalate</button></div></form>`,
  );
};
F.esc = (d) => {
  if (!validate("esc", d, { t: ["req"] })) return render();
  const x = byId("ropes", d.id);
  if (d.to === "safety") {
    const inc = {
      id: uid("in"),
      by: myId(),
      ctx: x.ctx,
      where: x.name,
      kind: "Rope Team concern",
      desc: d.t,
      state: "Reported",
      owner: null,
      paused: false,
      conf: "Restricted to Incident/Safety Owner",
      timeline: [{ at: today(), t: "Reported by mentor" }],
      decision: null,
    };
    S.incidents.push(inc);
    S.assign
      .filter((a) => a.bundles.includes("Incident/Safety Owner"))
      .forEach((a) =>
        notify(a.pid, "Concern escalated from " + x.name, "incidents", {
          id: inc.id,
        }),
      );
  } else {
    x.members
      .filter((m) => m.role === "Facilitator")
      .forEach((m) =>
        notify(m.pid, "Concern escalated in " + x.name, "rope", { id: x.id }),
      );
  }
  (S.mentorConcerns = S.mentorConcerns || []).push({
    by: myId(),
    rope: x.id,
    to: d.to,
    at: today(),
    t: d.t,
  });
  audit("Rope Team concern escalated", x.id, d.to);
  UI.modal = null;
  clearF("esc");
  toast("Escalated with appropriate confidentiality.");
  ok();
};
A.reqFinal = (d) => {
  const x = byId("ropes", d.id);
  x.reqFinal = true;
  // Doc 1 §6.2: mentors support and recommend; they do not finalise or approve.
  sysMsg(
    x,
    "Support recommendation recorded by the mentor. The team decides what to do with it.",
  );
  const pr = byId("projects", x.project);
  if (pr)
    pr.history.push({
      at: today(),
      t: "Mentor support recommendation recorded in the Rope Team",
    });
  x.members
    .filter((m) => m.role === "Facilitator")
    .forEach((m) =>
      notify(m.pid, "Mentor recommendation recorded in " + x.name, "rope", {
        id: x.id,
        tab: "about",
      }),
    );
  audit("Mentor support recommendation recorded", x.id, "");
  ok();
};
A.ropeClose = (d) => {
  clearF("rcl");
  const x = byId("ropes", d.id);
  modal(
    "Close " + h(x.name),
    () =>
      `<form data-f="rcl" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${x.id}">${!x.reqFinal ? banner("info", "No support recommendation recorded yet", "You can still close. Private mentoring notes stay in this Rope Team and are never carried forward.") : ""}${fi("rcl", "outcome", "Outcome and anything carried forward", { type: "textarea", rows: 3, req: true })}${banner("info", "", "The Rope Team becomes read-only. Contributions, reviews and reports stay in the project record. Private mentor notes are not copied anywhere.")}<div class="actions"><span></span><button class="btn btn-d" type="submit">Close Rope Team</button></div></form>`,
  );
};
F.rcl = (d) => {
  if (!validate("rcl", d, { outcome: ["req"] })) return render();
  const x = byId("ropes", d.id);
  x.state = "Closed";
  x.outcome = d.outcome;
  sysMsg(x, "Rope Team closed: " + d.outcome.slice(0, 90));
  x.members
    .filter((m) => m.pid !== myId() && (!m.status || m.status === "Active"))
    .forEach((m) =>
      notify(m.pid, x.name + " was closed", "rope", { id: x.id }),
    );
  audit("Rope Team closed", x.id, d.outcome);
  UI.modal = null;
  clearF("rcl");
  ok();
};
// Full context for a mentor before they decide: project, stage, owner, stewards, the exact help needed and the time asked for.
A.mrDetails = (d) => {
  const m = byId("mentorReqs", d.id);
  const pr = byId("projects", m.project) || {};
  const sec = (i) =>
    pr.sections && pr.sections[i]
      ? `<span style="white-space:pre-line">${h(pr.sections[i].text)}</span>`
      : "—";
  const canAct =
    (m.to === myId() || (m.open && role() === "M")) && m.status === "Pending";
  modal(
    "Mentor Request · " + h(m.need),
    `<div class="col" style="gap:16px">${dl([
      [
        "Status",
        pill(
          m.open && m.status === "Pending" ? "Open request" : m.status,
          m.open && m.status === "Pending" ? "p-purple" : "",
        ),
      ],
      ["Raised by", nm(m.from) + " · " + fmt(m.at)],
      [
        "Help needed",
        "<b>" +
          h(m.need) +
          "</b>" +
          (m.detail
            ? `<p class="muted" style="margin-top:4px">${h(m.detail)}</p>`
            : ""),
      ],
      [
        "Expected time commitment",
        m.hours
          ? h(m.hours)
          : '<span class="cap">Not specified — ask the steward if you need this before deciding.</span>',
      ],
    ])}<div><h3 class="h3" style="margin-bottom:8px">Project</h3>${dl([
      ["Title", h(pr.title || "—")],
      ["Problem", sec(0)],
      ["Objectives", sec(1)],
      ["Current stage", pill(stageLabel(pr.stage || "Circle"))],
      ["Project owner", pr.owner ? nm(pr.owner) : "—"],
      ["Faculty/Steward", (pr.stewards || []).map(nm).join(", ") || "—"],
      ["Circle", pr.circle ? cName(pr.circle) : "—"],
    ])}</div>${banner("info", "What you see", "Only the authorised project summary. Purpose Compass responses, hurdles and private records are never shared with mentors.")}${
      canAct
        ? `<div class="actions">${B("Decline", "mentorReq", { id: m.id, v: "Declined" })}${B("Accept and join the Rope Team", "mentorReq", { id: m.id, v: "Accepted" }, "btn-p btn-sm")}</div>`
        : ""
    }</div>`,
    true,
  );
};
A.ropeInvite = (d) => {
  const x = byId("ropes", d.id);
  const m = memberRec(x);
  m.status = d.v === "Active" ? "Active" : "Declined";
  if (d.v === "Active") {
    if (["Member", "Project owner"].includes(normRole(m.role)))
      x.indicators[m.pid] = x.indicators[m.pid] || {
        pacing: "On track",
        workload: "—",
        availability: "—",
        support: "None reported",
        absence: "None",
      };
    sysMsg(x, me().name + " joined the Rope Team");
  }
  audit(
    "Rope Team invitation " + (d.v === "Active" ? "accepted" : "declined"),
    x.id,
    "",
  );
  if (d.v !== "Active") {
    save();
    return go("ropeteams");
  }
  ok();
};
// ---- form a Rope Team directly or from an object you belong to (WSS clarification 6)
// Voluntary and private: the person forming it chooses a mentor and anyone else; each invitee must accept. Nobody
// joins because they are in the linked Circle or Action Room, and nothing from that space is copied in.
const ropeMentors = () =>
  S.assign
    .filter(
      (a) =>
        a.ctx === ctxId() &&
        roleBase(a.role) === "M" &&
        a.status === "Active" &&
        a.pid !== myId(),
    )
    .map((a) => a.pid)
    .filter((v, i, l) => l.indexOf(v) === i);
A.newRope = (d) => {
  clearF("nrt");
  mselReset("nrt", "m");
  const from = (d.fromKind && byId(d.fromKind, d.fromId)) || null;
  UI.form.nrt = {
    ltype: "supports",
    mentor: role() === "M" ? myId() : "",
    name: from
      ? me().name.split(" ")[0] + " — support for " + (from.name || from.title)
      : "",
  };
  modal("Form a Rope Team", () => {
    const cands = eligiblePeople([myId()], ["P", "F", "M"]);
    return `<form data-f="nrt" class="col" style="gap:14px" novalidate><input type="hidden" name="fromKind" value="${h(d.fromKind || "")}"><input type="hidden" name="fromId" value="${h(d.fromId || "")}">${
      from
        ? dl([
            [
              "Primary origin",
              OBJ_LABEL(d.fromKind) + " · " + h(from.name || from.title),
            ],
          ]) +
          fi("nrt", "ltype", "Relationship", {
            type: "select",
            req: true,
            opts: LINK_TYPES.filter(([v]) => v !== "executes"),
            help:
              "Stored as a link. The " +
              OBJ_LABEL(d.fromKind) +
              " does not control this Rope Team, and its members do not join it.",
          })
        : fi("nrt", "basis", "Basis for this Rope Team", {
            req: true,
            ph: "e.g. Mentoring relationship agreed with the programme for employability skills",
            help: "Direct entry needs a legitimate context: a mentoring relationship, invitation or programme mandate.",
          })
    }${d.fromKind === "projects" ? projBrief(from) : ""}${fi("nrt", "name", "Name", { req: true })}${fi("nrt", "charter", "What support is this for?", { type: "textarea", rows: 3, req: true, ph: "e.g. Confidence and workload support while we adopt the new assessment model" })}${fi("nrt", "mentor", "Mentor", { type: "select", req: true, ph: "Choose a mentor", opts: [...(role() === "M" ? [[myId(), "Me — " + me().name]] : []), ...ropeMentors().map((pid) => [pid, P(pid).name])], help: role() === "M" ? "" : "The mentor is invited and joins only if they accept." })}${msel("nrt", "m", "Invite others (optional)", cands, [], { help: "Each person is invited and must accept." })}${docCreateField("nrt", "ropes")}${banner("info", ROPE_ONLY, "Chat, private mentor notes, support details, check-ins and reflections stay inside this Rope Team. Only a report a member writes on purpose crosses to a linked space.", "lock")}<div class="actions"><span></span><button class="btn btn-p" type="submit">Form Rope Team</button></div></form>`;
  });
};
F.nrt = (d, form) => {
  const from = (d.fromKind && byId(d.fromKind, d.fromId)) || null;
  if (
    !validate("nrt", d, {
      name: ["req"],
      charter: ["req"],
      mentor: [["req", "Choose a mentor."]],
      ...(from ? { ltype: ["req"] } : { basis: ["req"] }),
    })
  )
    return render();
  const files = docTake("nrt", form);
  if (!files) return render();
  const iAmMentor = d.mentor === myId();
  if (!iAmMentor && !ropeMentors().includes(d.mentor)) {
    UI.err.nrt = { mentor: "Choose an active mentor in this programme." };
    return render();
  }
  const pr = d.fromKind === "projects" ? from : null;
  const x = {
    id: uid("rt"),
    ctx: ctxId(),
    name: d.name,
    charter: d.charter,
    mentor: d.mentor,
    owner: myId(),
    circle: null,
    project: pr ? pr.id : null,
    origin: from
      ? { type: OBJ_LABEL(d.fromKind), id: from.id }
      : { type: "Direct — mentoring relationship", basis: d.basis, by: myId() },
    contentVis: ROPE_ONLY,
    state: "Active",
    members: [
      {
        pid: myId(),
        role: iAmMentor ? "Mentor" : "Project owner",
        status: "Active",
      },
    ],
    chat: [],
    checkins: [],
    support: [],
    reviews: [],
    contribs: [],
    docs: [],
    engagement: null,
    indicators: {},
    privateNotes: [],
    reqFinal: false,
  };
  if (!iAmMentor) {
    x.members.push({ pid: d.mentor, role: "Mentor", status: "Invited" });
    x.indicators[myId()] = {
      pacing: "On track",
      workload: "—",
      availability: "—",
      support: "None reported",
      absence: "None",
    };
  }
  []
    .concat(d.m || [])
    .filter((pid) => !x.members.some((m) => m.pid === pid))
    .forEach((pid) =>
      x.members.push({
        pid,
        role: defaultSpaceRole(ctxRole(pid, x.ctx)),
        status: "Invited",
      }),
    );
  S.ropes.push(x);
  // Rope Team documents are ROPE_TEAM_ONLY: always Private
  docAttach(x.docs, files, "Private", pr ? pr.id : null);
  if (from) {
    addLink("ropes", x.id, d.fromKind, from.id, d.ltype, true);
    // the source space learns only that a Rope Team is linked — not who is in it or what it discusses
    if (SPACE_KINDS.includes(d.fromKind))
      sysMsg(
        from,
        "A Rope Team was linked to this " +
          OBJ_LABEL(d.fromKind) +
          ". Its conversations stay private to its members.",
      );
    if (pr) {
      if (!pr.rope) pr.rope = x.id;
      pr.history.push({ at: today(), t: "Rope Team linked by " + me().name });
      projRoomCreated(pr, "ropes", x);
    }
  }
  sysMsg(
    x,
    "Rope Team formed by " +
      me().name +
      (from ? ", linked to " + (from.name || from.title) : ""),
  );
  x.members
    .filter((m) => m.status === "Invited")
    .forEach((m) =>
      notify(
        m.pid,
        me().name +
          " invited you to the Rope Team “" +
          x.name +
          "”" +
          (m.pid === d.mentor ? " as mentor" : ""),
        "rope",
        { id: x.id },
      ),
    );
  audit(
    "Rope Team formed",
    x.id,
    (from
      ? "linked from " + d.fromKind + " " + from.id
      : "direct: " + d.basis) +
      " · mentor " +
      d.mentor,
  );
  UI.modal = null;
  clearF("nrt");
  mselReset("nrt", "m");
  save();
  go("rope", { id: x.id });
};
