// ---------- AUTHORIZATION LAYER ----------
// Every consequential action is checked here, independent of what the UI shows.
// Returns true, or a human-readable reason that is shown and written to the audit log.
const isSteward = (pid) => {
  const p = byId("projects", pid);
  return (
    p && ((role() === "F" && p.stewards.includes(myId())) || role() === "A")
  );
};
// Inside a space, authority follows the person's role in that space (see views/spaces.js).
const isFac = (cid) => {
  const c = byId("circles", cid);
  return !!c && (sCan("circles", c, "facilitate") || spaceAdmin("circles", c));
};
const isOwnerOrFac = (cid) => {
  const c = byId("circles", cid);
  return !!c && (isFac(cid) || sCan("circles", c, "poll"));
};
const circleMemMgr = (cid) => {
  const c = byId("circles", cid);
  return !!c && (isFac(cid) || sCan("circles", c, "members"));
};
const activeSpace = (kind, id) => {
  const o = byId(kind, id);
  return o && o.state === "Active";
};
const roomLead = (id) => {
  const x = byId("rooms", id);
  return !!x && (isLead(x) || role() === "A");
};
const G = {
  // projects
  // Accepting or asking again needs the project submitted, or the owner's reply to the last clarification request.
  clarify: (d) =>
    (isSteward(d.id) && projDecidable(byId("projects", d.id))) ||
    "only the Organization Admin or an assigned Faculty/Steward can request clarification, once the project is submitted or the owner has replied",
  clar: (d) =>
    (isSteward(d.id) && projDecidable(byId("projects", d.id))) ||
    "only the Organization Admin or an assigned Faculty/Steward can request clarification, once the project is submitted or the owner has replied",
  rejectProj: (d) =>
    (isSteward(d.id) &&
      ["Submitted", "Clarification requested"].includes(
        byId("projects", d.id).status,
      )) ||
    "only the Organization Admin or an assigned Faculty/Steward can reject a project under review",
  prej: (d) =>
    (isSteward(d.id) &&
      ["Submitted", "Clarification requested"].includes(
        byId("projects", d.id).status,
      )) ||
    "only the Organization Admin or an assigned Faculty/Steward can reject a project under review",
  // review conversations (projects and pathways); pathway posts from Messages follow the same rule
  pwchat: (d) => {
    const p = byId("pathways", d.id);
    return (
      (p && !!CONVO.pathway.post(p)) ||
      "only the pathway owner, the Organization Admin and the assigned Steward post in this conversation"
    );
  },
  cv: (d) => {
    const c = CONVO[d.k];
    const o = c && c.get(d.id);
    return (
      (o && !!c.post(o)) ||
      "only the submitter and their reviewers post in this conversation"
    );
  },
  acceptProj: (d) =>
    (isSteward(d.id) && projDecidable(byId("projects", d.id))) ||
    "only an assigned steward can accept a project that is submitted or whose owner has replied to the clarification",
  acc: (d) =>
    (isSteward(d.id) && projDecidable(byId("projects", d.id))) ||
    "only an assigned steward can accept a project that is submitted or whose owner has replied to the clarification",
  finalReview: (d) =>
    (isSteward(d.id) && byId("projects", d.id).stage === "Final review") ||
    "only an assigned steward can review final deliverables",
  submitProj: (d) =>
    byId("projects", d.id)?.owner === myId() ||
    "only the project owner can submit",
  submitFinal: (d) =>
    byId("projects", d.id)?.owner === myId() ||
    "only the project owner can submit final deliverables",
  fin: (d) =>
    byId("projects", d.id)?.owner === myId() ||
    "only the project owner can submit final deliverables",
  // The reviewer is assigned once and cannot be changed afterwards.
  assignStewards: (d) =>
    (role() === "A" && byId("projects", d.id)?.stewards.length === 0) ||
    "only an Organization Admin assigns the reviewer, and only while the project has none",
  asst: (d) =>
    (role() === "A" && byId("projects", d.id)?.stewards.length === 0) ||
    "only an Organization Admin assigns the reviewer, and only while the project has none",
  // circles
  circleState: (d) =>
    isFac(d.id) || "only the facilitator can change the Circle lifecycle",
  pauseCircle: (d) => isFac(d.id) || "only the facilitator can pause a Circle",
  memSet: (d) =>
    d.kind && d.kind !== "circles"
      ? true
      : isFac(d.c) || "only the facilitator can change membership",
  memRole: (d) => isFac(d.c) || "only the facilitator can assign member roles",
  newSession: (d) =>
    (isFac(d.id) && activeSpace("circles", d.id)) ||
    "only the facilitator can record sessions in an active Circle",
  ses: (d) => isFac(d.c) || "only the facilitator can record sessions",
  newPoll: (d) =>
    (isOwnerOrFac(d.id) && activeSpace("circles", d.id)) ||
    "only the project owner or facilitator can open a poll in an active Circle",
  poll: (d) =>
    isOwnerOrFac(d.c) ||
    "only the project owner or facilitator can open a poll",
  closePoll: (d) =>
    isOwnerOrFac(d.c) ||
    "only the project owner or facilitator can close a poll",
  repoll: (d) =>
    isOwnerOrFac(d.c) || "only the project owner or facilitator can re-poll",
  // BF-09: advisory AI source check on an open Circle vote; any active member, never changes the vote
  aiCheck: (d) => {
    const c = byId("circles", d.c);
    return (
      (!!c && memberOf(c) && c.state === "Active") ||
      "only members of an active Circle run the AI source check"
    );
  },
  chat: (d) => {
    const o = byId(d.kind, d.c);
    return (
      (o && memberOf(o) && o.state === "Active") ||
      "you can post only as an active member of an active space"
    );
  },
  rec: (d) => {
    const c = byId("circles", d.c);
    return (
      (c && (memberOf(c) || isFac(d.c)) && c.state === "Active") ||
      "records can be added only by members while the Circle is active"
    );
  },
  inviteMem: (d) =>
    d.kind === "circles"
      ? isFac(d.c) || "only the facilitator can invite"
      : (() => {
          const x = byId("ropes", d.c);
          return (
            (x &&
              (x.mentor === myId() ||
                x.members.some(
                  (m) => m.pid === myId() && m.role === "Facilitator",
                ))) ||
            "only the mentor or facilitator can invite"
          );
        })(),
  resolveConcern: (d) =>
    isFac(d.c) || "only the facilitator can resolve concerns",
  escalateConcern: (d) =>
    isFac(d.c) || "only the facilitator can escalate concerns",
  doneCommit: (d) => {
    const c = byId("circles", d.c);
    const x = c && c.commitments.find((y) => y.id === d.id);
    return (
      (x && (x.by === myId() || isFac(d.c))) ||
      "only the person who made the commitment or the facilitator can close it"
    );
  },
  // rope teams & mentors
  mentorReq: (d) =>
    (byId("mentorReqs", d.id)?.to === myId() &&
      byId("mentorReqs", d.id).status === "Pending") ||
    "only the requested mentor can respond",
  checkin: (d) =>
    byId("ropes", d.id)?.mentor === myId() ||
    "only the mentor records check-ins",
  ck: (d) =>
    byId("ropes", d.id)?.mentor === myId() ||
    "only the mentor records check-ins",
  reqFinal: (d) =>
    byId("ropes", d.id)?.mentor === myId() ||
    "only the mentor can finalise requirements",
  privNote: (d) =>
    byId("ropes", d.id)?.mentor === myId() ||
    "only the mentor can add private notes",
  supStatus: (d) => {
    const x = byId("ropes", d.r);
    return (
      (x &&
        (x.mentor === myId() ||
          x.members.some(
            (m) => m.pid === myId() && m.role === "Facilitator",
          ))) ||
      "only the mentor or facilitator can manage support requests"
    );
  },
  ropeClose: (d) => {
    const x = byId("ropes", d.id);
    return (
      (x &&
        (x.mentor === myId() ||
          x.members.some(
            (m) => m.pid === myId() && m.role === "Facilitator",
          ))) ||
      "only the mentor or facilitator can close a Rope Team"
    );
  },
  // rooms
  newRoom: () =>
    can("rooms") || "you cannot create or propose a workspace in this role",
  nr: () =>
    can("rooms") || "you cannot create or propose a workspace in this role",
  ri: (d) => {
    const x = byId("rooms", d.r);
    return (
      (x && memberOf(x) && x.state === "Active") ||
      "only members can add items to an active workspace"
    );
  },
  taskStatus: (d) => {
    const x = byId("rooms", d.r);
    const t = x && x.tasks.find((k) => k.id === d.id);
    return (
      (t && (roomLead(d.r) || t.owner === myId()) && x.state === "Active") ||
      "only the task owner or project lead can change a task"
    );
  },
  itemState: (d) => {
    const x = byId("rooms", d.r);
    const it = x && x[d.k].find((k) => k.id === d.id);
    return (
      (x &&
        x.state === "Active" &&
        (roomLead(d.r) || (it && it.owner === myId()))) ||
      "only the item owner or project lead can change this"
    );
  },
  winApprove: (d) =>
    roomLead(d.r) || "only the project lead can approve a visible win",
  msAchieve: () =>
    role() === "F" ||
    hasB("Reviewer") ||
    "only a Reviewer can validate an evidence-linked milestone",
  coState: (d) => {
    const x = byId("rooms", d.r);
    const c = x && x.changes.find((y) => y.id === d.id);
    if (!c) return "not found";
    // Ordinary changes (tasks, schedule, resources) are the project lead's call; protected changes (charter, outcome,
    // membership, milestones, evidence rules) need a Faculty/Steward or Organization Admin.
    const prot = c.kind !== "Ordinary";
    if (["Reviewed"].includes(d.v))
      return (
        (!prot && roomLead(d.r)) ||
        role() === "F" ||
        hasB("Reviewer") ||
        "only a Faculty/Steward or Reviewer can review a protected change"
      );
    if (d.v === "Approved")
      return (
        (!prot && roomLead(d.r)) ||
        ["F", "A"].includes(role()) ||
        "a protected change needs human approval by a Faculty/Steward or Organization Admin"
      );
    return (
      roomLead(d.r) || "only the project lead can move implementation forward"
    );
  },
  roomState: (d) => {
    const x = byId("rooms", d.r);
    if (!x) return "not found";
    if (d.v === "Active" && x.state === "Pending approval")
      return (
        ["F", "A"].includes(role()) ||
        "activation needs approval by a Faculty/Steward or Organization Admin"
      );
    if (x.state === "Proposed")
      return (
        canCreateRoom() || "only an authorised creator can activate a proposal"
      );
    return memberOf(x) || "members only";
  },
  roomDecline: () =>
    ["F", "A"].includes(role()) || canCreateRoom() || "not permitted",
  joinDecide: () =>
    ["F", "A"].includes(role()) ||
    "only a Faculty/Steward or Organization Admin approves elevated joins",
  roomMem: (d) =>
    roomLead(d.r) || "only the project lead can change membership",
  roomInviteNew: (d) => roomLead(d.r) || "only the project lead can invite",
  roomClose: (d) =>
    roomLead(d.r) || "only the project lead can close the workspace",
  // opportunities & matching
  cardState: (d) =>
    byId("cards", d.id)?.owner === myId() ||
    "only the card owner can change its status",
  nominate: () => role() === "F" || "only a steward can nominate a match",
  interest: (d) => {
    const c = byId("cards", d.id);
    return (
      (c &&
        c.status === "Active" &&
        c.owner !== myId() &&
        !c.interest.includes(myId())) ||
      "you cannot express interest in this card"
    );
  },
  mbState: (d) => {
    const m = byId("matches", d.id);
    return (
      (m && role() === "F" && m.steward === myId()) ||
      "only the assigned steward can decide on a Match Brief"
    );
  },
  mbEdit: (d) => {
    const m = byId("matches", d.id);
    return (
      (m && role() === "F" && m.steward === myId()) ||
      "only the assigned steward can edit a Match Brief"
    );
  },
  mbConsent: (d) => {
    const m = byId("matches", d.id);
    return (
      (m &&
        (m.a === myId() || m.b === myId()) &&
        m.status === "Awaiting consent") ||
      "only a party can consent, after steward approval"
    );
  },
  // post-introduction outcomes: only a party, only on an active introduction, only until a final outcome is recorded
  mbNext: (d) => {
    const m = byId("matches", d.id);
    return (
      (m &&
        (m.a === myId() || m.b === myId()) &&
        m.status === "Introduced" &&
        !m.project &&
        !INTRO_FINAL.includes(m.introState)) ||
      "only a party records what happened next, once, after both have consented"
    );
  },
  rbNext: (d) => {
    const c = byId("cards", d.c);
    const p = c && (c.proposals || []).find((x) => x.id === d.id);
    return (
      (p &&
        [p.from, p.to].includes(myId()) &&
        p.status === "Accepted" &&
        !INTRO_FINAL.includes(p.introState)) ||
      "only a party records what happened next, once the direct collaboration is accepted"
    );
  },
  introLink: (d) => {
    const v = viaOf(d.via);
    return (
      (v &&
        v.parties.includes(myId()) &&
        !INTRO_FINAL.includes(v.o.introState)) ||
      "only a party can link this introduction to a workspace"
    );
  },
  ilk: (d) => {
    const v = viaOf(d.via);
    return (
      (v &&
        v.parties.includes(myId()) &&
        !INTRO_FINAL.includes(v.o.introState)) ||
      "only a party can link this introduction to a workspace"
    );
  },
  rb: (d) =>
    (["P", "C", "F", "M"].includes(role()) && !!byId("cards", d.id)) ||
    "direct collaboration is proposed by a programme member from an opportunity",
  rbDecide: (d) => {
    const c = byId("cards", d.c);
    const p = c && (c.proposals || []).find((x) => x.id === d.id);
    return (
      (p && p.to === myId() && p.status === "Awaiting consent") ||
      "only the invited party can respond"
    );
  },
  // evidence
  evr: (d) => {
    const e = byId("evidence", d.id);
    return (
      (e && e.owner !== myId() && hasB("Reviewer")) ||
      "only a person holding the Reviewer bundle, who is not the submitter, can review evidence"
    );
  },
  evResub: (d) =>
    byId("evidence", d.id)?.owner === myId() ||
    "only the submitter can resubmit",
  evWithdraw: (d) =>
    byId("evidence", d.id)?.owner === myId() ||
    "only the owner can withdraw evidence",
  relNew: (d) =>
    byId("evidence", d.id)?.owner === myId() ||
    "only the owner can authorise a release",
  // confidentiality: the owner sets it; a Reviewer (not the owner) may raise it. Comments: anyone who can see it.
  evConf: (d) => {
    const e = byId("evidence", d.id);
    return (
      (e && (e.owner === myId() || hasB("Reviewer"))) ||
      "only the owner or a Reviewer can change confidentiality"
    );
  },
  evcf: (d) => {
    const e = byId("evidence", d.id);
    return (
      (e && (e.owner === myId() || hasB("Reviewer"))) ||
      "only the owner or a Reviewer can change confidentiality"
    );
  },
  evc: (d) => {
    const e = byId("evidence", d.id);
    return (
      (e && evVisible(e) && role() !== "S") ||
      "only people who can see this evidence can comment on it"
    );
  },
  hvRelNo: () =>
    hasB("Trust/Data Steward") ||
    "only the Trust/Data Steward withholds a release",
  relDecide: (d) => {
    const x = byId("releases", d.id);
    if (!x) return "not found";
    const e = byId("evidence", x.ev);
    if (["Released", "Withheld after disclosure review"].includes(d.v))
      return (
        hasB("Trust/Data Steward") ||
        "only the Trust/Data Steward completes disclosure review for a release"
      );
    return e.owner === myId() || "only the evidence owner decides on a release";
  },
  repoDelOk: () =>
    role() === "A" || "only an Organization Admin approves deletion",
  // harvest
  hvRel: (d) =>
    d.v === "Released"
      ? hasB("Trust/Data Steward") ||
        "only the Trust/Data Steward authorises a public or funder release"
      : canComplete() ||
        "only an authorised Facilitator, Reviewer or Project Lead can request release",
  hvCand: () =>
    canComplete() ||
    "only an authorised Facilitator, Reviewer or Project Lead can offer candidates",
  // pathway & profile
  pwReview: () =>
    hasB("Reviewer") ||
    "only an authorised Reviewer approves custom or AI-drafted pathways",
  // Recommend Pathways: only the participant activates a recommendation; recommenders never activate it
  pwAccept: (d) =>
    (byId("pathways", d.id)?.pid === myId() &&
      byId("pathways", d.id).state === PW_REC) ||
    "only the participant accepts a pathway recommended to them",
  pwChange: (d) =>
    (byId("pathways", d.id)?.pid === myId() &&
      byId("pathways", d.id).state === PW_REC) ||
    "only the participant asks for changes to a pathway recommended to them",
  pwc: (d) => G.pwChange(d),
  pwStep: (d) =>
    byId("pathways", d.id)?.pid === myId() ||
    "only the participant completes their own steps",
  proposePathway: (d) =>
    pwCanRecommend(d.pid) ||
    "only a Facilitator, Circle Steward or the participant’s Rope Team mentor recommends a pathway, within their context",
  pp: (d) => G.proposePathway(d),
  pwAsk: () =>
    roleBase(role()) === "P" ||
    "only participants request a pathway recommendation",
  pwa: (d) =>
    (roleBase(role()) === "P" &&
      (d.to === "any" || pwAskTo().some(([x]) => x === d.to))) ||
    "send the request to a Facilitator, Circle Steward or your Rope Team mentor in this programme",
  pwAskWithdraw: (d) =>
    (byId("pwReqs", d.id)?.pid === myId() &&
      byId("pwReqs", d.id).status === "Open") ||
    "only the participant withdraws their open request",
  cand: (d) =>
    byId("candidates", d.id)?.pid === myId() ||
    "only the participant decides on their profile",
  // funding & payments
  // BF-08: staged project funding, tranches, progress summaries and pitches are outside the Alpha boundary.
  tranche: () => "Staged project funding and pitches are outside the Alpha",
  hold: () => "Staged project funding and pitches are outside the Alpha",
  summary: () => "Staged project funding and pitches are outside the Alpha",
  sum: () => "Staged project funding and pitches are outside the Alpha",
  fundApprove: () => "Staged project funding and pitches are outside the Alpha",
  fundSign: () => "Staged project funding and pitches are outside the Alpha",
  fundInterest: () =>
    "Staged project funding and pitches are outside the Alpha",
  fundSave: () => "Staged project funding and pitches are outside the Alpha",
  fr: () => "Staged project funding and pitches are outside the Alpha",
  pitchNew: () => "Staged project funding and pitches are outside the Alpha",
  pit: () => "Staged project funding and pitches are outside the Alpha",
  pitchDecide: () => "Staged project funding and pitches are outside the Alpha",
  // A sponsor asks for an identifiable story only through a separate release request (owner, then Trust/Data Steward).
  storyReq: (d) =>
    (role() === "S" && sponsorCleared().some((e) => e.id === d.id)) ||
    "only a sponsor can request a story, and only about evidence already cleared for funder reports",
  story: (d) =>
    (role() === "S" && sponsorCleared().some((e) => e.id === d.id)) ||
    "only a sponsor can request a story, and only about evidence already cleared for funder reports",
  invPay: (d) =>
    S.payments.some(
      (p) => p.id === d.id && p.pid === myId() && p.state === "Invoice due",
    ) || "only the invoiced sponsor pays this invoice",
  prodRel: () =>
    hasB("Finance Owner") ||
    "only the Finance Owner approves and releases products",
  prodRetire: () =>
    hasB("Finance Owner") || "only the Finance Owner retires products",
  prodNew: () => role() === "A" || "only an Organization Admin drafts products",
  entGrant: () =>
    role() === "A" || "only an authorised administrator grants access",
  eg: () => role() === "A" || "only an authorised administrator grants access",
  entRevoke: () =>
    role() === "A" || "only an authorised administrator revokes access",
  reconcile: () =>
    hasB("Finance Owner") || "only the Finance Owner reconciles payments",
  poolNew: () =>
    role() === "A" ||
    "only Finance/Organization administration creates seat pools",
  // Sponsors see seat counts only (BF-08): naming or changing individual seat holders stays with the programme / institution.
  seatAssign: (d) =>
    (byId("seatPools", d.sp)?.sponsor === myId() && role() !== "S") ||
    role() === "A" ||
    "only the programme or institution assigns seats; sponsors see seat counts only",
  seat: (d) =>
    (byId("seatPools", d.sp)?.sponsor === myId() && role() !== "S") ||
    role() === "A" ||
    "only the programme or institution changes seats; sponsors see seat counts only",
  // administration
  roleDecide: (d) => {
    const a = byId("assign", d.id);
    return (a && role() === "A") || "only an Organization Admin approves roles";
  },
  userManage: (d) => {
    const a = byId("assign", d.id);
    return (
      (a && role() === "A") || "you can manage users only in your own context"
    );
  },
  userStatus: (d) => {
    const a = byId("assign", d.id);
    return (a && a.pid !== myId() && role() === "A") || "not permitted";
  },
  // user accounts: Organization Admin only; never their own or a Platform Administrator's account
  userNew: () => role() === "A" || "only an Organization Admin adds users",
  userView: (d) =>
    (role() === "A" && !!byId("assign", d.id)) ||
    "only an Organization Admin views user accounts",
  userEdit: (d) =>
    (role() === "A" &&
      !!byId("assign", d.id) &&
      userEditable(byId("assign", d.id).pid)) ||
    "you cannot edit this account",
  usr: (d) =>
    (role() === "A" &&
      (!d.aid ||
        (!!byId("assign", d.aid) &&
          userEditable(byId("assign", d.aid).pid)))) ||
    "you cannot edit this account",
  userDel: (d) =>
    (role() === "A" &&
      S.people.some((p) => p.id === d.pid) &&
      userEditable(d.pid)) ||
    "you cannot delete this account",
  invNew: () => role() === "A" || "only administrators create invitations",
  inv: (d) =>
    role() === "A" || "only an Organization Admin creates invitations",
  invAct: (d) => {
    const i = byId("invites", d.id);
    return (i && role() === "A") || "not permitted";
  },
  cfg: () => role() === "A" || "only administrators change configuration",
  vote: (d) =>
    d.c
      ? true
      : role() === "A" || "only an Organization Admin changes the voting rule",
  cfgRestore: () =>
    role() === "A" || "only an Organization Admin restores configuration",
  packAct: () => role() === "A" || "only an Organization Admin activates packs",
  // build-freeze configuration: pack envelope, voting parameters, versions, organisation requests
  packCfg: () =>
    role() === "A" || "only an Organization Admin configures packs",
  pkc: () => role() === "A" || "only an Organization Admin configures packs",
  votecfg: () =>
    role() === "A" ||
    "only an Organization Admin changes voting parameters (vote weight is frozen)",
  cfgSave: () =>
    role() === "A" || "only an Organization Admin saves configuration versions",
  cfgExport: () =>
    ["A", "T"].includes(role()) || "only administrators export configuration",
  helpq: () => !!S.session || "sign in to contact support",
  sqr: (d) => {
    const q = byId("supportQueries", d.id);
    return (
      (sqMine(q) && q.status !== "Closed") ||
      "only the person who sent this request can reply, while it is not closed"
    );
  },
  sqfwd: (d) =>
    (role() === "A" && sqAdmin(byId("supportQueries", d.id)) && !byId("supportQueries", d.id).fwd) ||
    "only an Organization Admin in the context this request was sent in can forward it, once",
  squ: (d) =>
    sqAdmin(byId("supportQueries", d.id)) ||
    "only the Platform Administrator or an Organization Admin in the context this request was sent in can update it",
  sqProg: (d) =>
    sqAdmin(byId("supportQueries", d.id)) ||
    "only the Platform Administrator or an Organization Admin in the context this request was sent in can update it",
  sqView: (d) =>
    sqSees(byId("supportQueries", d.q)) ||
    "only the requester, Organization Admins in its context and the Platform Administrator can open these attachments",
  sqDl: (d) =>
    sqSees(byId("supportQueries", d.q)) ||
    "only the requester, Organization Admins in its context and the Platform Administrator can download these attachments",
  taskAccept: (d) => {
    const x = byId("rooms", d.r);
    const k = x && x.tasks.find((t) => t.id === d.id);
    return (
      (k &&
        k.owner === myId() &&
        k.acc === "Pending" &&
        x.state === "Active") ||
      "only the assignee accepts or declines a task assigned to them"
    );
  },
  roomContinue: (d) =>
    roomLead(d.r) ||
    "only the project lead continues a " + WL() + " into a new cycle",
  accessDecide: (d) =>
    (role() === "A" &&
      (S.accessReqs || []).some(
        (r) =>
          r.id === d.id &&
          r.ctx === ctxId() &&
          r.status === "Awaiting approval",
      )) ||
    "only an Organization Admin in that programme decides access requests",
  roleDecide: (d) => {
    const a = byId("assign", d.id);
    return (
      (a && a.pid !== myId() && role() === "A") ||
      "only an Organization Admin approves roles — never their own"
    );
  },
  srcToggle: () => hasB("AI Owner") || "only the AI Owner approves AI sources",
  aiRev: () =>
    hasB("AI Owner") ||
    hasB("Reviewer") ||
    "only the AI Owner or a Reviewer releases consequential AI outputs",
  ann: () => role() === "A" || "only an Organization Admin sends announcements",
  // platform
  ctxAdmin: () => role() === "T" || "not permitted",
  cxa: () => role() === "T" || "not permitted",
  aiToggle: () => role() === "T" || "not permitted",
  backup: () => role() === "T" || "not permitted",
  restoreTest: () => role() === "T" || "not permitted",
  revokeSessions: () => role() === "T" || "not permitted",
  lms: () => role() === "T" || "not permitted",
  // incidents
  incAct: (d) => {
    const i = byId("incidents", d.id);
    if (!i) return "not found";
    if (d.v === "Appealed")
      return (
        (i.by === myId() && i.state === "Decision recorded") ||
        "only the reporter can appeal a recorded decision"
      );
    return (
      hasB("Incident/Safety Owner") ||
      "only the Incident/Safety Owner manages cases"
    );
  },
  incPause: () =>
    hasB("Incident/Safety Owner") ||
    "only the Incident/Safety Owner applies an emergency pause",
  incDecide: () =>
    hasB("Incident/Safety Owner") ||
    "only the Incident/Safety Owner records decisions",
  icd: () =>
    hasB("Incident/Safety Owner") ||
    "only the Incident/Safety Owner records decisions",
};
Object.assign(G, {
  resState: () =>
    role() === "A" || "only an Organization Admin moderates resources",
  resNew: () =>
    ["A", "F", "M"].includes(role()) ||
    "only administrators, facilitators and mentors add resources",
  res: () => ["A", "F", "M"].includes(role()) || "not permitted",
  initNew: () =>
    role() === "A" ||
    "only an Organization Admin publishes sponsor initiatives",
  ini: () => role() === "A" || "not permitted",
  xoNew: () =>
    role() === "C" ||
    "only an organization member requests cross-organization sharing",
  xo: () => role() === "C" || "not permitted",
  ropeContrib: (d) =>
    byId("ropes", d.id)?.mentor === myId() ||
    "only the mentor records contributions",
  ropeFeedback: (d) =>
    byId("ropes", d.id)?.mentor === myId() || "only the mentor sends feedback",
  suggestOpp: (d) =>
    byId("ropes", d.id)?.mentor === myId() ||
    "only the mentor suggests opportunities",
  orgEdit: () =>
    (["C", "A"].includes(role()) && !!me().org) ||
    "only an organization member edits its profile",
  circleSummary: (d) =>
    isFac(d.id) || "only the facilitator drafts a Circle summary",
  summaryDecide: (d) =>
    isFac(d.id) || "only the facilitator reviews the summary",
  tplOrg: () => role() === "A" || "only administrators edit templates",
  // Organization Admin owns the approved template library (create, version, publish / retire)
  tplNew: () =>
    role() === "A" || "only the Organization Admin creates pathway templates",
  tpl: () =>
    role() === "A" || "only the Organization Admin creates pathway templates",
  tplEdit: (d) =>
    (role() === "A" && !!byId("templates", d.id)) ||
    "only the Organization Admin versions pathway templates",
  tple: (d) =>
    (role() === "A" && !!byId("templates", d.id)) ||
    "only the Organization Admin versions pathway templates",
  tplState: () =>
    role() === "A" ||
    "only the Organization Admin publishes or retires pathway templates",
});
// ---- chat, stage journey, Rope Team reviews, room contributions, collaborator matching
const ropeMod = (id) => {
  const x = byId("ropes", id);
  return !!x && sCan("ropes", x, "moderate");
};
const spaceMgr = (kind, id) => {
  const o = byId(kind, id);
  if (!o) return false;
  if (kind === "circles") return circleMemMgr(id);
  if (kind === "ropes") return ropeInviter(o);
  return roomLead(id);
};
const activeMember = (kind, id) => {
  const o = byId(kind, id);
  return !!o && memberOf(o) && o.state === "Active";
};
Object.assign(G, {
  mentorReq: (d) => {
    const m = byId("mentorReqs", d.id);
    // re-authorised against the active role and context: a Mentor Request is answered only as Mentor in its context
    if (m && role() !== "M")
      return "switch to your Mentor role to answer a Mentor Request";
    if (m && !mentorReqVisible(m))
      return "this Mentor Request belongs to another context; switch to it first";
    return (
      (m &&
        m.status === "Pending" &&
        (m.to === myId() || (m.open && role() === "M"))) ||
      "only the requested mentor can respond"
    );
  },
  msgHide: (d) =>
    (d.k === "circles" ? isFac(d.c) : ropeMod(d.c)) ||
    "only the facilitator or mentor moderates this chat",
  msgAns: (d) => {
    const o = byId(d.k, d.c);
    const m = o && o.chat.find((x) => x.id === d.id);
    return (
      (m &&
        memberOf(o) &&
        (m.by === myId() || (d.k === "circles" ? isFac(d.c) : ropeMod(d.c)))) ||
      "only the person who asked, or a moderator, can mark it answered"
    );
  },
  chatQSum: (d) => memberOf(byId(d.k, d.c) || {}) || "members only",
  commitReview: (d) =>
    isFac(d.c) || "only the facilitator reviews assigned work",
  crv: (d) => isFac(d.c) || "only the facilitator reviews assigned work",
  stageReport: (d) => {
    const o = byId(d.kind, d.id);
    if (!o || o.state !== "Active")
      return "reports can be sent only from an active space";
    return (
      reportAuthor(d.kind, o) ||
      "only the space owner, facilitator, mentor or lead sends this report"
    );
  },
  srep: (d) => {
    const o = byId(d.kind, d.id);
    return (
      (!!o && o.state === "Active" && reportAuthor(d.kind, o)) ||
      "only the space owner, facilitator, mentor or lead sends this report"
    );
  },
  // links: the source object's lead creates links; a link never changes membership on either side
  linkMake: (d) =>
    canMake(d.k, byId(d.k, d.id), d.make) ||
    "you cannot create a linked " + OBJ_LABEL(d.make) + " from here",
  linkExisting: (d) =>
    linkAuth(d.k, byId(d.k, d.id)) ||
    "only the owner, lead, facilitator or mentor links objects here",
  lkx: (d) =>
    linkAuth(d.k, byId(d.k, d.id)) ||
    "only the owner, lead, facilitator or mentor links objects here",
  unlinkObj: (d) => {
    const l = allLinks().find((x) => x.id === d.id);
    return (
      (l &&
        !l.primary &&
        (l.created_by === myId() ||
          linkAuth(l.source_type, byId(l.source_type, l.source_id)) ||
          linkAuth(l.target_type, byId(l.target_type, l.target_id)))) ||
      "only the person who linked it, or the lead of a linked object, removes a link (never the Primary Origin)"
    );
  },
  newRope: (d) =>
    (["P", "M", "F"].includes(role()) &&
      (!d.fromKind ||
        canMake(d.fromKind, byId(d.fromKind, d.fromId), "ropes"))) ||
    "Participants, Mentors and Faculty/Stewards form Rope Teams — from a space only as one of its contributing members",
  nrt: (d) =>
    (["P", "M", "F"].includes(role()) &&
      (!d.fromKind ||
        canMake(d.fromKind, byId(d.fromKind, d.fromId), "ropes"))) ||
    "Participants, Mentors and Faculty/Stewards form Rope Teams — from a space only as one of its contributing members",
  returnTo: (d) =>
    activeMember(d.from, d.id) ||
    "only members of an active space can return an issue",
  ret: (d) =>
    activeMember(d.from, d.id) ||
    "only members of an active space can return an issue",
  revNew: (d) =>
    (activeMember("ropes", d.id) && byId("ropes", d.id).mentor !== myId()) ||
    "only Rope Team participants share work for review",
  rvn: (d) =>
    (activeMember("ropes", d.id) && byId("ropes", d.id).mentor !== myId()) ||
    "only Rope Team participants share work for review",
  revRespond: (d) =>
    (byId("ropes", d.r)?.mentor === myId() && activeMember("ropes", d.r)) ||
    "only the mentor reviews shared work",
  rvr: (d) =>
    byId("ropes", d.r)?.mentor === myId() ||
    "only the mentor reviews shared work",
  engage: (d) =>
    byId("ropes", d.id)?.mentor === myId() ||
    "only the mentor reviews the engagement",
  eng: (d) =>
    byId("ropes", d.id)?.mentor === myId() ||
    "only the mentor reviews the engagement",
  engageDecide: (d) => {
    const x = byId("ropes", d.id);
    return (
      (x &&
        role() === "F" &&
        x.members.some((m) => m.pid === myId() && m.role === "Facilitator") &&
        x.engagement?.status === "Exit proposed") ||
      "the Faculty/Steward confirms the mentor’s proposal"
    );
  },
  rcl: (d) =>
    ropeMod(d.id) || "only the mentor or facilitator can close a Rope Team",
  taskDecide: (d) =>
    roomLead(d.r) || "only the project lead approves proposed tasks",
  cbNew: (d) =>
    (activeMember("rooms", d.r) && role() !== "F") ||
    "only workspace members submit contributions",
  cbn: (d) =>
    (activeMember("rooms", d.r) && role() !== "F") ||
    "only workspace members submit contributions",
  cbReview: (d) =>
    (byId("rooms", d.r) &&
      (role() === "A" ||
        ((role() === "F" || hasB("Reviewer")) &&
          memberOf(byId("rooms", d.r))))) ||
    "only a Faculty/Steward reviews contributions",
  cbr: (d) =>
    (byId("rooms", d.r) &&
      (role() === "A" ||
        ((role() === "F" || hasB("Reviewer")) &&
          memberOf(byId("rooms", d.r))))) ||
    "only a Faculty/Steward reviews contributions",
  roomLink: (d) =>
    activeMember("rooms", d.r) ||
    "only members of an active workspace link objects",
  rlk: (d) =>
    activeMember("rooms", d.r) ||
    "only members of an active workspace link objects",
  collabFind: (d) =>
    (role() === "F" && isSteward(d.project)) ||
    "only an assigned Faculty/Steward starts a collaborator match",
  colfFind: (d) =>
    (role() === "F" && isSteward(d.project)) ||
    "only an assigned Faculty/Steward starts a collaborator match",
  colf: (d) =>
    (role() === "F" && isSteward(d.project)) ||
    "only an assigned Faculty/Steward starts a collaborator match",
  poolActivate: () =>
    hasB("Finance Owner") || "only the Finance Owner confirms invoice payment",
  hvRedraft: (d) => {
    const x = byId("harvests", d.id);
    return (
      (x && x.state === "Rejected" && (x.by === myId() || canComplete())) ||
      "not permitted"
    );
  },
});
// ---- space roles, joins, pathway activity, task board, Action Room chat
const taskOf = (d) => {
  const x = byId("rooms", d.r);
  return [x, x && x.tasks.find((t) => t.id === d.id)];
};
const roomSees = (x) => !!x && (memberOf(x) || role() === "A");
Object.assign(G, {
  memSet: (d) =>
    spaceMgr(d.kind || "circles", d.c) ||
    "only the facilitator or project owner manages membership here",
  memRole: (d) =>
    spaceMgr(d.kind || "circles", d.c) ||
    "only the facilitator or project owner assigns roles here",
  inviteMem: (d) =>
    d.kind === "ropes"
      ? ropeInviter(byId("ropes", d.c)) ||
        "only the project owner or an assigned Faculty/Steward can invite to a Rope Team"
      : circleMemMgr(d.c) || "only the facilitator or project owner can invite",
  invm: (d) =>
    d.kind === "ropes"
      ? ropeInviter(byId("ropes", d.c)) ||
        "only the project owner or an assigned Faculty/Steward can invite to a Rope Team"
      : circleMemMgr(d.c) || "only the facilitator or project owner can invite",
  joinCircle: (d) => {
    const c = byId("circles", d.id);
    return (
      (c && inCtx(c) && c.state === "Active" && !memberOf(c)) ||
      "you can request to join an active Circle you are not in"
    );
  },
  joinRope: (d) => {
    const x = byId("ropes", d.id);
    return (
      (x && ropeJoinable(x)) ||
      "you can ask to join only Rope Teams linked to your Circles"
    );
  },
  joinWithdraw: (d) =>
    (memberRec(byId(d.kind, d.id) || {}) || {}).status === "Requested" ||
    "there is no pending request to withdraw",
  // Directly (with a stated basis), for an accepted project, or as a linked Circle from an object you lead.
  newCircle: (d) =>
    canCreateCircle() ||
    (d.fromKind &&
      canMake(d.fromKind, byId(d.fromKind, d.fromId), "circles")) ||
    "you cannot create Circles in this role",
  nc: (d) => {
    const from = d.fromKind && byId(d.fromKind, d.fromId);
    if (d.fromKind && !canMake(d.fromKind, from, "circles"))
      return "you can create a linked Circle only from an object you lead or facilitate";
    if (!d.fromKind && !canCreateCircle())
      return "you cannot create Circles in this role";
    const pid = d.fromKind === "projects" ? d.fromId : d.project;
    return (
      role() !== "P" ||
      !pid ||
      pid === NC_NONE ||
      d.fromKind === "projects" ||
      ownCircleProjects().some((p) => p.id === pid) ||
      "you can create a Circle only for your own accepted project"
    );
  },
  rec: (d) => {
    const c = byId("circles", d.c);
    return (
      (c &&
        c.state === "Active" &&
        (sCan("circles", c, "record") || isFac(d.c))) ||
      "records can be added only by contributing members while the Circle is active"
    );
  },
  chat: (d) => {
    const o = byId(d.kind, d.c);
    return (
      (o && memberOf(o) && o.state === "Active" && sCan(d.kind, o, "post")) ||
      "you can post only as a contributing member of an active space"
    );
  },
  msgHide: (d) => {
    const o = byId(d.k, d.c);
    return (
      (o && (sCan(d.k, o, "moderate") || (d.k === "circles" && isFac(d.c)))) ||
      "only a moderator of this space can hide messages"
    );
  },
  msgAns: (d) => {
    const o = byId(d.k, d.c);
    const m = o && o.chat.find((x) => x.id === d.id);
    return (
      (m && memberOf(o) && (m.by === myId() || sCan(d.k, o, "moderate"))) ||
      "only the person who asked, or a moderator, can mark it answered"
    );
  },
  // chat polls: contributing members of an active space open polls and vote; the opener or a moderator closes one
  chatPoll: (d) => {
    const o = byId(d.k, d.c);
    return (
      (o && memberOf(o) && o.state === "Active" && sCan(d.k, o, "post")) ||
      "you can open a poll only as a contributing member of an active space"
    );
  },
  cpoll: (d) => {
    const o = byId(d.kind, d.c);
    return (
      (o && memberOf(o) && o.state === "Active" && sCan(d.kind, o, "post")) ||
      "you can open a poll only as a contributing member of an active space"
    );
  },
  chatPollVote: (d) => {
    const o = byId(d.k, d.c);
    const m = o && (o.chat || []).find((x) => x.id === d.id);
    return (
      (m &&
        m.poll &&
        !m.poll.closed &&
        memberOf(o) &&
        o.state === "Active" &&
        sCan(d.k, o, "post")) ||
      "you can vote only as a contributing member while the poll is open"
    );
  },
  chatPollClose: (d) => {
    const o = byId(d.k, d.c);
    const m = o && (o.chat || []).find((x) => x.id === d.id);
    return (
      (m && m.poll && memberOf(o) && (m.by === myId() || sCan(d.k, o, "moderate"))) ||
      "only the person who opened the poll, or a moderator, can close it"
    );
  },
  // rope teams
  checkin: (d) =>
    sCan("ropes", byId("ropes", d.id), "mentor") ||
    "only the mentor records check-ins",
  ck: (d) =>
    sCan("ropes", byId("ropes", d.id), "mentor") ||
    "only the mentor records check-ins",
  supNew: (d) =>
    sCan("ropes", byId("ropes", d.id), "ask") ||
    "only Rope Team members ask for support",
  sup: (d) =>
    sCan("ropes", byId("ropes", d.id), "ask") ||
    "only Rope Team members ask for support",
  supStatus: (d) =>
    sCan("ropes", byId("ropes", d.r), "support") ||
    "only the mentor or facilitator manages support requests",
  ropeClose: (d) =>
    sCan("ropes", byId("ropes", d.id), "close") ||
    "only the mentor or facilitator can close a Rope Team",
  rcl: (d) =>
    sCan("ropes", byId("ropes", d.id), "close") ||
    "only the mentor or facilitator can close a Rope Team",
  revNew: (d) =>
    (activeMember("ropes", d.id) &&
      sCan("ropes", byId("ropes", d.id), "share")) ||
    "only the project owner and members share work for review",
  rvn: (d) =>
    (activeMember("ropes", d.id) &&
      sCan("ropes", byId("ropes", d.id), "share")) ||
    "only the project owner and members share work for review",
  engageDecide: (d) => {
    const x = byId("ropes", d.id);
    return (
      (x &&
        role() === "F" &&
        isRopeFac(x) &&
        x.engagement?.status === "Exit proposed") ||
      "the Faculty/Steward confirms the mentor’s proposal"
    );
  },
  ropeInvite: (d) =>
    (memberRec(byId("ropes", d.id) || {}) || {}).status === "Invited" ||
    "there is no invitation to respond to",
  mrDetails: (d) => {
    const m = byId("mentorReqs", d.id);
    return (
      (m && (mentorReqVisible(m) || role() === "A")) ||
      "you cannot view this request"
    );
  },
  mrq: (d) => mentorReqOk(d),
  mentorRequest: (d) => mentorReqOk(d),
  pfr: (d) => {
    const c = byId("circles", d.c);
    return (
      (c && canFinalReview(c)) ||
      "only the project owner, Faculty/Steward or facilitator writes the final review"
    );
  },
  cdoc: (d) => {
    const c = byId("circles", d.c);
    return (
      (c && c.state === "Active" && (memberOf(c) || isFac(d.c))) ||
      "only members of this Circle upload documents"
    );
  },
  // action rooms
  ri: (d) => {
    const x = byId("rooms", d.r);
    return (
      (x &&
        x.state === "Active" &&
        (sCan("rooms", x, "propose") || role() === "A")) ||
      "only contributing members add items to an active " + WL()
    );
  },
  roomItem: (d) => {
    const x = byId("rooms", d.r);
    return (
      (x &&
        x.state === "Active" &&
        (sCan("rooms", x, "propose") || role() === "A")) ||
      "only contributing members add items to an active " + WL()
    );
  },
  taskMove: (d) => {
    const [x, k] = taskOf(d);
    if (!k) return "task not found";
    if (!taskCanMove(x, k))
      return "only the assignee, the project owner or the facilitator can move this task";
    return (
      taskTargets(x, k).includes(d.v) ||
      (k.status === "Proposed"
        ? "only the project owner or facilitator approves proposed tasks"
        : "tasks cannot be moved back to Proposed")
    );
  },
  taskView: (d) => roomSees(byId("rooms", d.r)) || "members only",
  myTaskOpen: (d) => roomSees(byId("rooms", d.r)) || "members only",
  tke: (d) => {
    const [x, k] = taskOf(d);
    return (
      (k && x.state === "Active" && (roomLead(d.r) || k.owner === myId())) ||
      "only the assignee, the project owner or the facilitator can change this task"
    );
  },
  cbNew: (d) =>
    (activeMember("rooms", d.r) &&
      sCan("rooms", byId("rooms", d.r), "contribute")) ||
    "only members, partners and mentors submit contributions",
  cbn: (d) =>
    (activeMember("rooms", d.r) &&
      sCan("rooms", byId("rooms", d.r), "contribute")) ||
    "only members, partners and mentors submit contributions",
  cbReview: (d) =>
    (byId("rooms", d.r) &&
      (role() === "A" || sCan("rooms", byId("rooms", d.r), "review"))) ||
    "only a Reviewer or Facilitator in this " + WL() + " reviews contributions",
  cbr: (d) =>
    (byId("rooms", d.r) &&
      (role() === "A" || sCan("rooms", byId("rooms", d.r), "review"))) ||
    "only a Reviewer or Facilitator in this " + WL() + " reviews contributions",
  msAchieve: (d) =>
    sCan("rooms", byId("rooms", d.r), "review") ||
    hasB("Reviewer") ||
    "only a Reviewer can validate an evidence-linked milestone",
  joinDecide: (d) =>
    ["F", "A"].includes(role()) ||
    roomLead(d.r) ||
    "only a Faculty/Steward, Organization Admin or the project owner approves elevated joins",
  // opportunity cards from a Circle
  card: (d) => {
    if (!d.from) return true;
    const c = byId("circles", d.from);
    return (
      (c && (sCan("circles", c, "card") || isFac(c.id))) ||
      "only contributing members of that Circle can create cards from it"
    );
  },
  // pathway
  // step rules (FR-F04): a Blocked step (prerequisite still open) cannot be completed — see pwStepGuard in views/profile.js
  pwStep: (d) => pwStepGuard(d),
  pws: (d) => pwStepGuard(d),
  // Skipping applies to Optional steps only; skipping never needs the step to be open.
  pwStepSet: (d) => {
    const p = byId("pathways", d.id);
    const s = p && p.steps[d.i];
    if (!s || p.pid !== myId() || p.state !== "Current")
      return "only the participant changes steps of their current pathway";
    if (d.v === "skip")
      return (
        (s.type === "Optional" && !pwClosed(s) && !s.pend) ||
        "only an open Optional step can be skipped"
      );
    return s.st === "Skipped" || "there is nothing to undo on this step";
  },
  pwStart: (d) => {
    const p = byId("pathways", d.id);
    return (
      (p &&
        p.pid === myId() &&
        p.state === "Current" &&
        [PW_S.AVAILABLE, PW_S.NOT_STARTED].includes(pwStepState(p, +d.i).st)) ||
      "only the participant starts an open step of their current pathway"
    );
  },
  // Condition answers: the participant answers questions about themselves; a Facilitator confirms staff-set facts.
  pwFact: (d) => {
    const p = byId("pathways", d.id);
    const s = p && p.steps[d.i];
    if (
      !s ||
      s.type !== "Conditional" ||
      !pwFactDef(s) ||
      p.state !== "Current" ||
      s.done ||
      s.pend
    )
      return "this step has no open condition to answer";
    if (!["yes", "no", "clear"].includes(d.v)) return "answer Yes or No";
    return (
      pwFactWho(p, s) ||
      (pwFactDef(s).who === "S"
        ? "only a Facilitator of this participant confirms this condition"
        : "only the participant answers this question")
    );
  },
  pwUseEv: (d) => {
    const p = byId("pathways", d.id);
    const s = p && p.steps[d.i];
    return (
      (s &&
        p.pid === myId() &&
        p.state === "Current" &&
        s.prior &&
        !pwClosed(s) &&
        !s.pend &&
        ![PW_S.LOCKED, PW_S.NA].includes(pwStepState(p, +d.i).st)) ||
      "only the participant selects prior evidence for an open step that allows it"
    );
  },
  pwue: (d) => G.pwUseEv(d),
  // A Facilitator or Mentor suggests; a Reviewer of this programme may select and confirm directly.
  pwPrior: (d) => {
    const p = byId("pathways", d.id);
    const s = p && p.steps[d.i];
    const who =
      (["F", "M"].includes(role()) && pwCanView(p)) ||
      pwStepReviewers(p || {}).includes(myId());
    return (
      (s &&
        who &&
        p.pid !== myId() &&
        p.state === "Current" &&
        s.prior &&
        !pwClosed(s) &&
        !s.pend) ||
      "only a facilitator, mentor or Reviewer of this participant uses prior evidence, on open steps that allow it"
    );
  },
  pwStepRev: (d) => {
    const p = byId("pathways", d.id);
    const s = p && p.steps[d.i];
    return (
      (s &&
        s.pend &&
        p.state === "Current" &&
        p.pid !== myId() &&
        pwStepReviewers(p).includes(myId())) ||
      "only an authorised Reviewer decides on a step waiting for review, and not on their own"
    );
  },
  pwsr: (d) => G.pwStepRev(d),
  pwNewVer: (d) =>
    pwCanNewVer(byId("pathways", d.id)) ||
    "only the recommender or a Facilitator of this participant proposes a changed version of an active pathway, one at a time",
  pwnv: (d) => G.pwNewVer(d),
  pwpe: (d) => G.pwPrior(d),
  pwPriorDecide: (d) => {
    const p = byId("pathways", d.id);
    const s = p && p.steps[d.i];
    return (
      (s &&
        p.pid === myId() &&
        s.rec &&
        s.rec.status === "Awaiting participant" &&
        !pwClosed(s)) ||
      "only the participant accepts or declines a recommendation on their pathway"
    );
  },
  pwDecline: (d) =>
    (byId("pathways", d.id)?.pid === myId() &&
      byId("pathways", d.id).state === PW_REC) ||
    "only the participant declines a pathway recommended to them",
  pwdc: (d) => G.pwDecline(d),
  // profile change candidates and evolution suggestions: only the person decides
  candDlg: (d) =>
    byId("candidates", d.id)?.pid === myId() ||
    "only the participant decides on their profile",
  ce: (d) =>
    (byId("candidates", d.id)?.pid === myId() &&
      byId("candidates", d.id).status !== "Accepted") ||
    "only the participant decides on their profile",
  evoDlg: (d) =>
    (byId("evolution", d.id)?.pid === myId() &&
      byId("evolution", d.id).status === "Pending") ||
    "only the person whose profile it is can accept, edit or reject a suggested change",
  evoe: (d) => G.evoDlg(d),
  pwr: () =>
    hasB("Reviewer") || "only an authorised Reviewer returns mode 3 pathways",
  pwRevise: (d) => {
    const p = byId("pathways", d.id);
    return (
      (p && p.by === myId() && p.state === "Draft") ||
      "only the person who proposed this pathway can revise it"
    );
  },
  pwv: (d) => {
    const p = byId("pathways", d.id);
    return (
      (p && p.by === myId() && p.state === "Draft") ||
      "only the person who proposed this pathway can revise it"
    );
  },
  pwActivity: (d) =>
    pwCanView(byId("pathways", d.id)) || "you cannot view this pathway",
  // participants list: choose a pathway for an action, open a pathway by its name, go from Edit to its conversation
  pwPick: (d) =>
    S.pathways.some((x) => x.pid === d.pid && inCtx(x) && pwCanView(x)) ||
    "you cannot see this participant’s pathways",
  pwOpen: (d) =>
    pwCanView(byId("pathways", d.id)) || "you cannot view this pathway",
  pwEditTalk: (d) =>
    pwCanView(byId("pathways", d.id)) || "you cannot view this pathway",
});
// ---- organizations and role management: Platform Administrator only
const platformOnly = (what) => () =>
  role() === "T" || "only the Platform Administrator " + what;
Object.assign(G, {
  tenantNew: platformOnly("manages organizations"),
  tnt: platformOnly("manages organizations"),
  tenantState: platformOnly("suspends or reactivates organizations"),
  roleNew: () =>
    "new roles are created only from an approved change; the Platform Administrator applies approved definitions",
  rnew: () =>
    "new roles are created only from an approved change; the Platform Administrator applies approved definitions",
  roleEdit: platformOnly("edits roles"),
  redit: platformOnly("edits roles"),
  rperm: (d) =>
    (role() === "T" && !!String(d.ref || "").trim()) ||
    "a permission change needs the reference of an approved change",
  roleReset: platformOnly("resets role permissions"),
  roleState: platformOnly("archives or restores roles"),
  packRoles: platformOnly("sets role names for packs"),
  pkr: platformOnly("sets role names for packs"),
  // Trust/Data Steward governs agreement and consent policy; the Organization Admin configures Compass wording.
  polNew: () =>
    hasB("Trust/Data Steward") || "only the Trust/Data Steward writes policies",
  polEdit: () =>
    hasB("Trust/Data Steward") || "only the Trust/Data Steward writes policies",
  poled: () =>
    hasB("Trust/Data Steward") || "only the Trust/Data Steward writes policies",
  polPublish: () =>
    hasB("Trust/Data Steward") ||
    "only the Trust/Data Steward publishes policies",
  polDel: () =>
    hasB("Trust/Data Steward") ||
    "only the Trust/Data Steward deletes policy drafts",
  cqNew: () =>
    role() === "A" ||
    "only the Organization Admin configures Purpose Compass wording",
  cqEdit: () =>
    role() === "A" ||
    "only the Organization Admin configures Purpose Compass wording",
  cq: () =>
    role() === "A" ||
    "only the Organization Admin configures Purpose Compass wording",
  cqMove: () =>
    role() === "A" ||
    "only the Organization Admin configures Purpose Compass wording",
  cqDel: () =>
    role() === "A" ||
    "only the Organization Admin configures Purpose Compass wording",
});
// ---- Rope Team documents; project owners create their own Action Room; milestone validation
// Mentor Requests form a Rope Team, so they are not raised on the Circle → Room path.
const mentorReqOk = (d) => {
  const pr = byId("projects", d.project);
  if (pr && skipsRope(pr))
    return (
      "this project’s support path goes from the Circle straight to the " +
      WL() +
      ", without a Rope Team"
    );
  return (
    (role() === "F" && isSteward(d.project)) ||
    pr?.owner === myId() ||
    "only the project owner or an assigned Faculty/Steward raises Mentor Requests"
  );
};
const roomFor = (d) => {
  const pr = d.project && byId("projects", d.project);
  if (pr && !canCreateRoom() && !canCreateRoomFor(pr))
    return (
      "you can create an " +
      WL() +
      " only for your own accepted project that does not have one yet"
    );
  return (
    can("rooms") || "you cannot create or propose a workspace in this role"
  );
};
Object.assign(G, {
  rdoc: (d) =>
    activeMember("ropes", d.id) ||
    "only members of an active Rope Team upload documents",
  // owners edit their own records
  // optional purposes, capability scopes and integration adapters (purposes.js)
  scopeSet: (d) =>
    d.level === "tenant"
      ? role() === "T" ||
        "only the Platform Administrator sets organization-level capability scopes"
      : (role() === "A" && d.id === ctxId()) ||
        "only the Organization Admin of this programme sets its optional purposes",
  adapterSet: () =>
    role() === "T" ||
    "only the Platform Administrator manages integration adapters",
  evpur: (d) =>
    byId("evidence", d.id)?.owner === myId() ||
    "only the record owner restricts its purposes",
  payVerify: (d) =>
    ((role() === "A" || hasB("Finance Owner")) &&
      byId("ents", d.id)?.state === "PAYMENT_PENDING") ||
    "only the Finance Owner or Organization Admin confirms a pending payment",
  prc: (d) =>
    ((role() === "A" || hasB("Finance Owner")) &&
      byId("ents", d.id)?.state === "PAYMENT_PENDING") ||
    "only the Finance Owner or Organization Admin confirms a pending payment",
  storyReq: (d) => {
    const e = byId("evidence", d.id);
    if (!(role() === "S" && sponsorCleared().some((x) => x.id === d.id)))
      return "only a sponsor can request a story, and only about evidence already cleared for funder reports";
    return (
      purposeOn("public", e.owner, { ctx: e.ctx, rec: e }) ||
      "this person has not allowed public/funder exchange, so their personal story cannot be requested"
    );
  },
  story: (d) => {
    const e = byId("evidence", d.id);
    if (!(role() === "S" && sponsorCleared().some((x) => x.id === d.id)))
      return "only a sponsor can request a story, and only about evidence already cleared for funder reports";
    return (
      purposeOn("public", e.owner, { ctx: e.ctx, rec: e }) ||
      "this person has not allowed public/funder exchange, so their personal story cannot be requested"
    );
  },
  projDelete: (d) =>
    projDeletable(byId("projects", d.id)) ||
    "only the owner can delete a project, and only while it is a draft",
  projEdit: (d) =>
    projEditable(byId("projects", d.id)) ||
    "only the project owner edits it, until it is closed or rejected",
  pje: (d) =>
    projEditable(byId("projects", d.id)) ||
    "only the project owner edits it, until it is closed or rejected",
  spaceEdit: (d) =>
    (SPACE_EDIT[d.kind] && spaceEditable(d.kind, byId(d.kind, d.id))) ||
    "only the owner edits this space while it is open",
  spe: (d) =>
    (SPACE_EDIT[d.kind] && spaceEditable(d.kind, byId(d.kind, d.id))) ||
    "only the owner edits this space while it is open",
  evEdit: (d) =>
    evEditable(byId("evidence", d.id)) ||
    "only the owner edits evidence, while it is under review",
  eve: (d) =>
    evEditable(byId("evidence", d.id)) ||
    "only the owner edits evidence, while it is under review",
  card: (d) => {
    if (d.id)
      return (
        byId("cards", d.id)?.owner === myId() || "only the card owner edits it"
      );
    if (!d.from) return true;
    const c = byId("circles", d.from);
    return (
      (c && (sCan("circles", c, "card") || isFac(c.id))) ||
      "only contributing members of that Circle can create cards from it"
    );
  },
  pwEdit: (d) =>
    pwEditable(byId("pathways", d.id)) ||
    "only the creator edits a pathway, until it is approved or a step is completed",
  pwe: (d) =>
    pwEditable(byId("pathways", d.id)) ||
    "only the creator edits a pathway, until it is approved or a step is completed",
  // replies are to other people's messages
  msgReply: (d) => {
    const o = byId(d.k, d.c);
    const m = o && (o.chat || []).find((x) => x.id === d.id);
    return (m && m.by !== myId()) || "you reply to other people’s messages";
  },
  newRoom: roomFor,
  nr: roomFor,
  // milestones: members add evidence; only the Steward reviews it and validates the milestone
  msEvidence: (d) =>
    msOpen(d, (x) => activeMember("rooms", x.id)) ||
    "only members of an active " + WL() + " add evidence to an open milestone",
  mse: (d) =>
    msOpen(d, (x) => activeMember("rooms", x.id)) ||
    "only members of an active " + WL() + " add evidence to an open milestone",
  msUnlink: (d) =>
    msOpen(d, (x) => activeMember("rooms", x.id) || msIsSteward(x)) ||
    "only members or the Steward remove evidence from an open milestone",
  msRev: (d) =>
    msRevOk(d) ||
    "only the Steward reviews milestone evidence, and not their own",
  msr: (d) =>
    msRevOk(d) ||
    "only the Steward reviews milestone evidence, and not their own",
  msAchieve: (d) =>
    msOpen(d, msIsSteward) || "only the Steward validates a milestone",
});
// An open milestone in an active Action Room, plus a check on the person.
function msOpen(d, who) {
  const x = byId("rooms", d.r);
  const m = x && x.milestones.find((y) => y.id === d.id);
  return !!m && x.state === "Active" && m.status !== "Achieved" && !!who(x);
}
function msRevOk(d) {
  const x = byId("rooms", d.r);
  const m = x && x.milestones.find((y) => y.id === d.id);
  const it = m && msItems(m)[+d.i];
  const e = it && byId("evidence", it.ev);
  return !!e && msOpen(d, msIsSteward) && e.owner !== myId() && msToReview(it);
}
// ---- deliverables → evidence → Learning Harvest → profile evolution; role assignment expiry
Object.assign(G, {
  hvGen: (d) => {
    const x = byId("rooms", d.r);
    return (
      (x && x.state === "Active" && activeMember("rooms", d.r)) ||
      "only active members of this " + WL() + " generate its Learning Harvest"
    );
  },
  hv2: (d) => {
    const x = byId("harvests", d.id);
    if (!x || x.tpl !== 2) return "Learning Harvest not found";
    if (!["Draft", "Review"].includes(x.state))
      return "this Learning Harvest can no longer be edited";
    const o = byId("rooms", x.scope);
    const comp = canComplete() && ((o && memberOf(o)) || role() === "F");
    if (["approve", "reject"].includes(d.act)) {
      if (x.subject === myId())
        return "a Learning Harvest is approved or rejected by someone other than the person it is about";
      return (
        comp ||
        "only an authorised Faculty/Steward, Reviewer or Project Lead approves or rejects a Learning Harvest"
      );
    }
    return (
      x.by === myId() ||
      comp ||
      "only the person the Harvest is for, or an authorised reviewer, edits it"
    );
  },
  evoDecide: (d) =>
    byId("evolution", d.id)?.pid === myId() ||
    "only the person whose profile it is can approve or reject a suggested change",
  aexp: (d) => {
    const a = byId("assign", d.id);
    return (
      (a && a.pid !== myId() && role() === "A") ||
      "only an administrator in this context sets a role expiry"
    );
  },
});
// ---- pathways created by participants, reviewer assigned by the Organization Admin
Object.assign(G, {
  dmOpen: (d) => {
    const p = byId("projects", d.project);
    if (!p) return "project not found";
    // BF-08: no automatic sponsor ↔ project-owner messaging in the Alpha, from either side.
    if (
      role() === "S" ||
      S.assign.some((a) => a.pid === d.pid && roleBase(a.role) === "S")
    )
      return "Staged project funding and pitches are outside the Alpha";
    return "only the project owner messages a sponsor about this project";
  },
  editSession: (d) =>
    (isFac(d.c) && activeSpace("circles", d.c)) ||
    "only the project owner or facilitator edits sessions in an active Circle",
  pwNew: () =>
    roleBase(role()) === "P" || "only participants create their own pathway",
  pwn: (d) => {
    if (!d.id)
      return (
        roleBase(role()) === "P" || "only participants create their own pathway"
      );
    const p = byId("pathways", d.id);
    return (
      (p && p.by === myId() && p.state === "Clarification requested") ||
      "only the creator can update a pathway after a clarification request"
    );
  },
  pwUpd: (d) =>
    (byId("pathways", d.id)?.by === myId() &&
      byId("pathways", d.id)?.state === "Clarification requested") ||
    "only the creator can update a pathway after a clarification request",
  pwAssign: (d) =>
    (role() === "A" &&
      ["Awaiting reviewer", "In review", "Clarification requested"].includes(
        byId("pathways", d.id)?.state,
      )) ||
    "only the Organization Admin assigns a reviewer to a pathway under review",
  pwas: (d) =>
    (role() === "A" &&
      ["Awaiting reviewer", "In review", "Clarification requested"].includes(
        byId("pathways", d.id)?.state,
      )) ||
    "only the Organization Admin assigns a reviewer to a pathway under review",
  // Any authorised Reviewer may act on a queued pathway (and picks it up); after that only its reviewer decides.
  // The approver may reject while waiting on a clarification; approving or asking again needs it back in review.
  pwDec: (d) => {
    const p = byId("pathways", d.id);
    return (
      (p &&
        pwCanReview(p) &&
        (["Awaiting reviewer", "In review"].includes(p.state) ||
          (d.v === "Rejected" && p.state === "Clarification requested"))) ||
      "only an authorised Reviewer decides on this pathway, and not on their own"
    );
  },
  pwd: (d) => G.pwDec(d),
});
// Bundle and mandate assignment had no guard entry: protect them like other role management.
Object.assign(G, {
  bund: (d) => {
    const a = byId("assign", d.id);
    return (
      (a && a.pid !== myId() && role() === "A") ||
      "only an administrator in this context assigns capability bundles"
    );
  },
  mand: (d) => {
    const a = byId("assign", d.id);
    return (
      (a && role() === "A") ||
      "only an administrator in this context records mandates"
    );
  },
  mandRevoke: (d) => {
    const a = byId("assign", d.id);
    return (
      (a && role() === "A") ||
      "only an administrator in this context revokes mandates"
    );
  },
});
// Documents (views/documents.js): visibility follows the file's space; Rope Team files never leave its members.
Object.assign(G, {
  docUpOpen: (d) => {
    const p = byId("projects", d.id);
    return (
      (docCanOpen(p) &&
        (d.x
          ? docUpOk(d.f, byId(SPACE_KIND[d.f], d.x))
          : docUpSpaces(p, d.f).some((y) => docUpOk(d.f, y)))) ||
      "only active members of this space upload files to it"
    );
  },
  docUp: (d) => {
    const p = byId("projects", d.id);
    const x = byId(SPACE_KIND[d.f], d.x);
    return (
      (docCanOpen(p) &&
        docUpSpaces(p, d.f).includes(x) &&
        docUpOk(d.f, x) &&
        !!docUpTarget(d)) ||
      "only active members of this space upload files to it"
    );
  },
  docDl: (d) => {
    const p = byId("projects", d.id);
    const x = docCanOpen(p) && docFind(p, d.k);
    return (x && docSees(p, x)) || "this file is Private to its space";
  },
  docShare: (d) => {
    const p = byId("projects", d.id);
    const x = docCanOpen(p) && docFind(p, d.k);
    return (x && docShareable(p, x)) || "only Public files you can open can be shared by link";
  },
  docCopyLink: (d) => {
    const p = byId("projects", d.id);
    const x = docCanOpen(p) && docFind(p, d.k);
    return (x && docShareable(p, x)) || "only Public files you can open can be shared by link";
  },
  docVis: (d) => {
    const p = byId("projects", d.id);
    const x = docCanOpen(p) && docFind(p, d.k);
    return (
      (x && docCanVis(p, x)) ||
      (x && x.lock) ||
      "only the person who shared a file, the project owner, its steward or an Organization Admin changes its visibility"
    );
  },
  docZip: (d) =>
    docCanOpen(byId("projects", d.id)) ||
    "only people who can open this project download its Public files",
});
// Public Projects (views/publish.js): a team vote first, then only the owner publishes; only Public files leave.
Object.assign(G, {
  pubVoteNew: (d) => {
    const p = byId("projects", d.id);
    return (
      (pubOpener(p) && ["priv", "no"].includes(pubState(p))) ||
      "only the project owner or its steward opens the team vote, on an accepted project with no open vote"
    );
  },
  pubv: (d) => {
    const p = byId("projects", d.id);
    return (
      (pubOpener(p) && ["priv", "no"].includes(pubState(p))) ||
      "only the project owner or its steward opens the team vote, on an accepted project with no open vote"
    );
  },
  pubCast: (d) => {
    const p = byId("projects", d.id);
    return (
      pubCanVote(p, pubOpen(p)) ||
      "only eligible members of the project team vote, while the vote is open"
    );
  },
  pubCloseNow: (d) => {
    const p = byId("projects", d.id);
    return (
      (pubOpener(p) && !!pubOpen(p)) ||
      "only the project owner or its steward closes the vote"
    );
  },
  pubPublish: (d) => {
    const p = byId("projects", d.id);
    return (
      (p && p.owner === myId() && pubState(p) === "ok") ||
      "only the project owner publishes, after the team approves it by vote"
    );
  },
  pubp: (d) => {
    const p = byId("projects", d.id);
    return (
      (p && p.owner === myId() && pubState(p) === "ok") ||
      "only the project owner publishes, after the team approves it by vote"
    );
  },
  pubUnpublish: (d) =>
    pubCanUnpublish(byId("projects", d.id)) ||
    "only the project owner, its steward or an Organization Admin unpublishes",
  pubDl: (d) => {
    const p = byId("projects", d.id);
    return pubDocs(p).some((x) => x.key === d.k) || "this file is not public";
  },
  pubZip: (d) =>
    pubPublished(byId("projects", d.id)) || "this project is not public",
});
// Project room moves (views/journey.js): an accepted, open project; its owner, steward or an Organization Admin.
Object.assign(G, {
  projMove: (d) =>
    projMover(byId("projects", d.id)) ||
    "only the project owner, its steward or an Organization Admin moves the project",
  pmvConfirm: (d) =>
    projMover(byId("projects", d.id)) ||
    "only the project owner, its steward or an Organization Admin moves the project",
  pmv: (d) =>
    projMover(byId("projects", d.id)) ||
    "only the project owner, its steward or an Organization Admin moves the project",
});
// Open challenges (views/challenges.js): the Sponsor runs the post and the selection; the Sponsor and the Circle owner
// are the two parties to the agreement; an Organization Admin assigns an independent Steward, who decides disputes.
const chEditable = (ch) =>
  chMine(ch) && !ch.project && ch.status !== "Archived";
const chMsOf = (d) => {
  const ch = chById(d.id);
  return [ch, ch && ch.milestones.find((m) => m.id === d.m)];
};
const chTeamSees = (ch) => !!ch && (chMine(ch) || chOnTeam(ch));
const chMsEditOk = (d) => {
  const [ch, m] = chMsOf(d);
  return (
    !!m &&
    !!chSide(ch) &&
    !dspOn(ch, "ms", m.id) &&
    ((["Proposed", "Changes requested"].includes(m.status) &&
      m.by === myId()) ||
      m.status === "Agreed")
  );
};
const chMsVote = (d) => {
  const [ch, m] = chMsOf(d);
  const s = m && chSide(ch);
  return (
    (!!s && m.status === "Proposed" && !m.ok[s]) ||
    "only the other side approves a proposed milestone or asks for changes"
  );
};
const chMsDoneOk = (d) => {
  const [ch, m] = chMsOf(d);
  return (
    (!!m &&
      chOwner(ch) &&
      chLive(ch) &&
      ["Agreed", "More information requested"].includes(m.status) &&
      !dspOn(ch, "ms", m.id)) ||
    "only the Circle owner marks an agreed milestone complete, once the funding commitment is confirmed"
  );
};
const chMsReview = (d) => {
  const [ch, m] = chMsOf(d);
  return (
    (!!m && chMine(ch) && m.status === "Submitted" && !dspOn(ch, "ms", m.id)) ||
    "only the sponsor reviews a milestone awaiting review"
  );
};
const chPayConfOk = (d) => {
  const ch = chById(d.id);
  const p = ch && ch.payments.find((x) => x.id === d.p);
  const s = p && chSide(ch);
  return (
    (!!s &&
      !dspOn(ch, "pay", p.id) &&
      ((p.status === "Pending verification" && !payRec(p, s)) ||
        p.status === "Flagged for review")) ||
    "only the other side confirms a pending payment; either side corrects a flagged one"
  );
};
const chDspNewOk = (d) => {
  const ch = chById(d.id);
  if (!chParty(ch) || !ch.project)
    return "only the sponsor or the Circle owner raises a dispute";
  if (dspOn(ch, d.kind, d.s))
    return "there is already an open dispute about this";
  if (d.kind === "ms") {
    const m = ch.milestones.find((x) => x.id === d.s);
    return (
      (!!m && ["Submitted", "More information requested"].includes(m.status)) ||
      "a milestone dispute is about a completion awaiting review or a request for more information"
    );
  }
  const p = ch.payments.find((x) => x.id === d.s);
  return (
    (d.kind === "pay" && !!p && p.status === "Flagged for review") ||
    "a payment dispute is about a flagged payment"
  );
};
const chDsp = (d) => byId("disputes", d.id);
Object.assign(G, {
  chNew: (d) =>
    (d.id ? chEditable(chById(d.id)) : role() === "S") ||
    "only a Sponsor posts an open challenge, and edits it until the team is formed",
  chEdit: (d) =>
    chEditable(chById(d.id)) ||
    "only the sponsor edits the post, until the team is formed",
  chn: (d) =>
    (d.id ? chEditable(chById(d.id)) : role() === "S") ||
    "only a Sponsor posts an open challenge, and edits it until the team is formed",
  chState: (d) => {
    const ch = chById(d.id);
    if (!chMine(ch) || ch.status === "Archived")
      return "only the sponsor changes the post, until it is archived";
    if (d.v === "Open")
      return (
        (!ch.project && ch.status === "Requests closed") ||
        "applications reopen only before the team is formed"
      );
    return (
      (["Requests closed", "Archived"].includes(d.v) && d.v !== ch.status) ||
      "not permitted"
    );
  },
  chApply: (d) =>
    chCanApply(chById(d.id)) ||
    "only Participants and Partners apply, while the challenge accepts applications",
  cha: (d) =>
    chCanApply(chById(d.id)) ||
    "only Participants and Partners apply, while the challenge accepts applications",
  chWithdraw: (d) => {
    const ch = chById(d.id);
    const a = ch && chApp(ch);
    return (
      (!!a && !ch.project && ["Submitted", "Shortlisted"].includes(a.status)) ||
      "you can withdraw only a pending application, before the team is formed"
    );
  },
  chAppView: (d) =>
    (chMine(chById(d.id)) && chById(d.id).apps.some((a) => a.id === d.app)) ||
    "only the sponsor of this challenge reviews its applications",
  chev: (d) => {
    const ch = chById(d.id);
    const a = ch && ch.apps.find((x) => x.id === d.app);
    return (
      (chMine(ch) &&
        !!a &&
        !ch.project &&
        ch.status !== "Archived" &&
        !["Withdrawn", "Selected"].includes(a.status)) ||
      "only the sponsor evaluates pending applications, before the team is formed"
    );
  },
  chForm: (d) => {
    const ch = chById(d.id);
    return (
      (chEditable(ch) && ch.apps.some((a) => a.status === "Shortlisted")) ||
      "only the sponsor forms the team, once, from a shortlist"
    );
  },
  chf: (d) => {
    const ch = chById(d.id);
    return (
      (chEditable(ch) && ch.apps.some((a) => a.status === "Shortlisted")) ||
      "only the sponsor forms the team, once, from a shortlist"
    );
  },
  chCommit: (d) => {
    const ch = chById(d.id);
    return (
      (chMine(ch) &&
        !!ch.project &&
        (!ch.commit || ch.commit.status !== "Confirmed")) ||
      "only the sponsor records the commitment, until both sides have confirmed it"
    );
  },
  chcm: (d) => {
    const ch = chById(d.id);
    return (
      (chMine(ch) &&
        !!ch.project &&
        (!ch.commit || ch.commit.status !== "Confirmed")) ||
      "only the sponsor records the commitment, until both sides have confirmed it"
    );
  },
  chCommitConf: (d) => {
    const ch = chById(d.id);
    return (
      (chOwner(ch) && !!ch.commit && ch.commit.status !== "Confirmed") ||
      "only the Circle owner confirms the funding commitment"
    );
  },
  chco: (d) => {
    const ch = chById(d.id);
    return (
      (chOwner(ch) && !!ch.commit && ch.commit.status !== "Confirmed") ||
      "only the Circle owner confirms the funding commitment"
    );
  },
  chMs: (d) =>
    (!!chMsOf(d)[1] && chTeamSees(chMsOf(d)[0])) ||
    "only the sponsor and the project team see milestones",
  chmc: (d) =>
    (!!chMsOf(d)[1] && chTeamSees(chMsOf(d)[0])) ||
    "only the sponsor and the project team discuss milestones",
  chMsNew: (d) =>
    (d.m ? chMsEditOk(d) : chParty(chById(d.id)) && !!chById(d.id).project) ||
    "only the sponsor and the Circle owner propose or revise milestones",
  chMsEdit: (d) =>
    chMsEditOk(d) ||
    "only the proposer revises a milestone, and either side proposes a change to an agreed one",
  chms: (d) =>
    (d.m ? chMsEditOk(d) : chParty(chById(d.id)) && !!chById(d.id).project) ||
    "only the sponsor and the Circle owner propose or revise milestones",
  chMsAgree: chMsVote,
  chMsChanges: chMsVote,
  chmr: chMsVote,
  chMsDone: chMsDoneOk,
  chmd: chMsDoneOk,
  chMsMore: chMsReview,
  chmi: chMsReview,
  chMsApprove: chMsReview,
  chma: chMsReview,
  chPay: (d) => {
    const ch = chById(d.id);
    const opts = ch && chLive(ch) ? chPayFor(ch) : [];
    return (
      (chParty(ch) &&
        opts.length > 0 &&
        (!d.ms || opts.some(([v]) => v === "ms:" + d.ms))) ||
      "the sponsor or the Circle owner records a payment once the commitment is confirmed, for initial funding or an approved milestone"
    );
  },
  chp: (d) =>
    (chParty(chById(d.id)) && chLive(chById(d.id))) ||
    "the sponsor or the Circle owner records a payment once the commitment is confirmed",
  chPayConf: chPayConfOk,
  chpc: chPayConfOk,
  chDspNew: chDspNewOk,
  chdn: chDspNewOk,
  chDspAssign: (d) =>
    (role() === "A" &&
      !!chDsp(d) &&
      inCtx(chDsp(d)) &&
      chDsp(d).status === "Awaiting Steward assignment") ||
    "only an Organization Admin in this programme assigns a Steward",
  chda: (d) =>
    (role() === "A" &&
      !!chDsp(d) &&
      inCtx(chDsp(d)) &&
      chDsp(d).status === "Awaiting Steward assignment") ||
    "only an Organization Admin in this programme assigns a Steward",
  chdsa: (d) =>
    (role() === "F" &&
      !!chDsp(d) &&
      chDsp(d).steward === myId() &&
      chDsp(d).status === "Awaiting Steward acceptance") ||
    "only the assigned Steward accepts or declines",
  chds: (d) => {
    const dp = chDsp(d);
    return (
      (!!dp &&
        dspOpen(dp) &&
        (!!dspMine(dp) ||
          (role() === "F" && dp.steward === myId() && !!dp.accepted))) ||
      "only the two sides, and the Steward once they have accepted, post here"
    );
  },
  chdd: (d) =>
    (role() === "F" &&
      !!chDsp(d) &&
      chDsp(d).steward === myId() &&
      chDsp(d).status === "Under review") ||
    "only the independent Steward decides, after confirming independence",
  chDspWithdraw: (d) => {
    const dp = chDsp(d);
    return (
      (!!dp && dp.raisedBy === myId() && dspOpen(dp) && !!dspMine(dp)) ||
      "only the side that raised the dispute withdraws it, before a decision"
    );
  },
});
// A closed Circle, Rope Team or Action Room is read-only: any guarded action aimed at it is refused, whatever the
// screen shows. Viewing, downloads and moving the project back (which reopens it) stay allowed (RO_OK, journey.js).
const closedRoomIn = (d) => {
  for (const v of [d.c, d.r, d.x, d.id]) {
    if (!v) continue;
    for (const k of SPACE_KINDS) {
      const o = byId(k, v);
      if (o && roomClosed(o)) return [k, o];
    }
  }
  return null;
};
// Wrap handlers. Same key may exist in A (click) and F (form submit); both are guarded.
Object.keys(G).forEach((k) => {
  [A, F].forEach((T) => {
    if (typeof T[k] === "function") {
      const orig = T[k];
      T[k] = (d, ...rest) => {
        if (!S.session) return;
        let r;
        try {
          const cl = !RO_OK.includes(k) && closedRoomIn(d || {});
          r = cl
            ? "this " + OBJ_LABEL(cl[0]) + " is closed, so it is read-only"
            : G[k](d || {});
        } catch (e) {
          r = "not permitted";
        }
        if (r !== true) {
          UI.modal = null;
          return deny(r, k);
        }
        return orig(d, ...rest);
      };
    }
  });
});
