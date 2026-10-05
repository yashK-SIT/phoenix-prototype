// ---------- AUTHORIZATION LAYER ----------
// Every consequential action is checked here, independent of what the UI shows.
// Returns true, or a human-readable reason that is shown and written to the audit log.
const isSteward = pid => {
  const p = byId('projects', pid);
  return p && ((role() === 'F' && p.stewards.includes(myId())) || role() === 'A');
};
// Inside a space, authority follows the person's role in that space (see views/spaces.js).
const isFac = cid => {
  const c = byId('circles', cid);
  return !!c && (sCan('circles', c, 'facilitate') || spaceAdmin('circles', c));
};
const isOwnerOrFac = cid => {
  const c = byId('circles', cid);
  return !!c && (isFac(cid) || sCan('circles', c, 'poll'));
};
const circleMemMgr = cid => {
  const c = byId('circles', cid);
  return !!c && (isFac(cid) || sCan('circles', c, 'members'));
};
const activeSpace = (kind, id) => {
  const o = byId(kind, id);
  return o && o.state === 'Active';
};
const roomLead = id => {
  const x = byId('rooms', id);
  return !!x && (isLead(x) || role() === 'A');
};
const G = {
  // projects
  clar: d => isSteward(d.id) || 'only an assigned Faculty/Steward can request clarification',
  acceptProj: d =>
    (isSteward(d.id) && byId('projects', d.id).status === 'Submitted') ||
    'only an assigned steward can accept a submitted project',
  acc: d => isSteward(d.id) || 'only an assigned steward can accept this project',
  finalReview: d =>
    (isSteward(d.id) && byId('projects', d.id).stage === 'Final review') ||
    'only an assigned steward can review final deliverables',
  submitProj: d => byId('projects', d.id)?.owner === myId() || 'only the project owner can submit',
  submitFinal: d => byId('projects', d.id)?.owner === myId() || 'only the project owner can submit final deliverables',
  fin: d => byId('projects', d.id)?.owner === myId() || 'only the project owner can submit final deliverables',
  assignStewards: () => role() === 'A' || 'only a Programme Administrator assigns stewards',
  asst: () => role() === 'A' || 'only a Programme Administrator assigns stewards',
  // circles
  circleState: d => isFac(d.id) || 'only the facilitator can change the Circle lifecycle',
  pauseCircle: d => isFac(d.id) || 'only the facilitator can pause a Circle',
  completeCircle: d => isFac(d.id) || 'only the facilitator can complete a Circle',
  memSet: d => (d.kind && d.kind !== 'circles' ? true : isFac(d.c) || 'only the facilitator can change membership'),
  memRole: d => isFac(d.c) || 'only the facilitator can assign member roles',
  newSession: d =>
    (isFac(d.id) && activeSpace('circles', d.id)) || 'only the facilitator can record sessions in an active Circle',
  ses: d => isFac(d.c) || 'only the facilitator can record sessions',
  newPoll: d =>
    (isOwnerOrFac(d.id) && activeSpace('circles', d.id)) ||
    'only the project owner or facilitator can open a poll in an active Circle',
  poll: d => isOwnerOrFac(d.c) || 'only the project owner or facilitator can open a poll',
  closePoll: d => isOwnerOrFac(d.c) || 'only the project owner or facilitator can close a poll',
  repoll: d => isOwnerOrFac(d.c) || 'only the project owner or facilitator can re-poll',
  chat: d => {
    const o = byId(d.kind, d.c);
    return (o && memberOf(o) && o.state === 'Active') || 'you can post only as an active member of an active space';
  },
  rec: d => {
    const c = byId('circles', d.c);
    return (
      (c && (memberOf(c) || isFac(d.c)) && c.state === 'Active') ||
      'records can be added only by members while the Circle is active'
    );
  },
  inviteMem: d =>
    d.kind === 'circles'
      ? isFac(d.c) || 'only the facilitator can invite'
      : (() => {
          const x = byId('ropes', d.c);
          return (
            (x && (x.mentor === myId() || x.members.some(m => m.pid === myId() && m.role === 'Facilitator'))) ||
            'only the mentor or facilitator can invite'
          );
        })(),
  resolveConcern: d => isFac(d.c) || 'only the facilitator can resolve concerns',
  escalateConcern: d => isFac(d.c) || 'only the facilitator can escalate concerns',
  doneCommit: d => {
    const c = byId('circles', d.c);
    const x = c && c.commitments.find(y => y.id === d.id);
    return (
      (x && (x.by === myId() || isFac(d.c))) ||
      'only the person who made the commitment or the facilitator can close it'
    );
  },
  // rope teams & mentors
  mentorReq: d =>
    (byId('mentorReqs', d.id)?.to === myId() && byId('mentorReqs', d.id).status === 'Pending') ||
    'only the requested mentor can respond',
  mentorRequest: () => role() === 'F' || 'only a Faculty/Steward raises Mentor Requests',
  mrq: () => role() === 'F' || 'only a Faculty/Steward raises Mentor Requests',
  checkin: d => byId('ropes', d.id)?.mentor === myId() || 'only the mentor records check-ins',
  ck: d => byId('ropes', d.id)?.mentor === myId() || 'only the mentor records check-ins',
  reqFinal: d => byId('ropes', d.id)?.mentor === myId() || 'only the mentor can finalise requirements',
  privNote: d => byId('ropes', d.id)?.mentor === myId() || 'only the mentor can add private notes',
  supStatus: d => {
    const x = byId('ropes', d.r);
    return (
      (x && (x.mentor === myId() || x.members.some(m => m.pid === myId() && m.role === 'Facilitator'))) ||
      'only the mentor or facilitator can manage support requests'
    );
  },
  ropeClose: d => {
    const x = byId('ropes', d.id);
    return (
      (x && (x.mentor === myId() || x.members.some(m => m.pid === myId() && m.role === 'Facilitator'))) ||
      'only the mentor or facilitator can close a Rope Team'
    );
  },
  // rooms
  newRoom: () => can('rooms') || 'you cannot create or propose a workspace in this role',
  nr: () => can('rooms') || 'you cannot create or propose a workspace in this role',
  ri: d => {
    const x = byId('rooms', d.r);
    return (x && memberOf(x) && x.state === 'Active') || 'only members can add items to an active workspace';
  },
  taskStatus: d => {
    const x = byId('rooms', d.r);
    const t = x && x.tasks.find(k => k.id === d.id);
    return (
      (t && (roomLead(d.r) || t.owner === myId()) && x.state === 'Active') ||
      'only the task owner or project lead can change a task'
    );
  },
  itemState: d => {
    const x = byId('rooms', d.r);
    const it = x && x[d.k].find(k => k.id === d.id);
    return (
      (x && x.state === 'Active' && (roomLead(d.r) || (it && it.owner === myId()))) ||
      'only the item owner or project lead can change this'
    );
  },
  winApprove: d => roomLead(d.r) || 'only the project lead can approve a visible win',
  msAchieve: () => role() === 'F' || hasB('Reviewer') || 'only a Reviewer can validate an evidence-linked milestone',
  coState: d => {
    const x = byId('rooms', d.r);
    const c = x && x.changes.find(y => y.id === d.id);
    if (!c) return 'not found';
    if (['Reviewed'].includes(d.v))
      return role() === 'F' || hasB('Reviewer') || 'only a Faculty/Steward or Reviewer can review';
    if (d.v === 'Approved')
      return (
        ['F', 'A'].includes(role()) || 'human approval by a Faculty/Steward or Programme Administrator is required'
      );
    return roomLead(d.r) || 'only the project lead can move implementation forward';
  },
  roomState: d => {
    const x = byId('rooms', d.r);
    if (!x) return 'not found';
    if (d.v === 'Active' && x.state === 'Pending approval')
      return ['F', 'A'].includes(role()) || 'activation needs approval by a Faculty/Steward or Programme Administrator';
    if (x.state === 'Proposed') return canCreateRoom() || 'only an authorised creator can activate a proposal';
    return memberOf(x) || 'members only';
  },
  roomDecline: () => ['F', 'A'].includes(role()) || canCreateRoom() || 'not permitted',
  joinDecide: () =>
    ['F', 'A'].includes(role()) || 'only a Faculty/Steward or Programme Administrator approves elevated joins',
  roomMem: d => roomLead(d.r) || 'only the project lead can change membership',
  roomInviteNew: d => roomLead(d.r) || 'only the project lead can invite',
  roomClose: d => roomLead(d.r) || 'only the project lead can close the workspace',
  // opportunities & matching
  cardState: d => byId('cards', d.id)?.owner === myId() || 'only the card owner can change its status',
  nominate: () => role() === 'F' || 'only a steward can nominate a match',
  interest: d => {
    const c = byId('cards', d.id);
    return (
      (c && c.status === 'Active' && c.owner !== myId() && !c.interest.includes(myId())) ||
      'you cannot express interest in this card'
    );
  },
  mbState: d => {
    const m = byId('matches', d.id);
    return (m && role() === 'F' && m.steward === myId()) || 'only the assigned steward can decide on a Match Brief';
  },
  mbEdit: d => {
    const m = byId('matches', d.id);
    return (m && role() === 'F' && m.steward === myId()) || 'only the assigned steward can edit a Match Brief';
  },
  mbConsent: d => {
    const m = byId('matches', d.id);
    return (
      (m && (m.a === myId() || m.b === myId()) && m.status === 'Awaiting consent') ||
      'only a party can consent, after steward approval'
    );
  },
  rbDecide: d => {
    const c = byId('cards', d.c);
    const p = c && (c.proposals || []).find(x => x.id === d.id);
    return (p && p.to === myId() && p.status === 'Awaiting consent') || 'only the invited party can respond';
  },
  // evidence
  evr: d => {
    const e = byId('evidence', d.id);
    return (
      (e && e.owner !== myId() && (role() === 'F' || hasB('Reviewer'))) ||
      'only a Reviewer who is not the submitter can review evidence'
    );
  },
  evResub: d => byId('evidence', d.id)?.owner === myId() || 'only the submitter can resubmit',
  evWithdraw: d => byId('evidence', d.id)?.owner === myId() || 'only the owner can withdraw evidence',
  relNew: d => byId('evidence', d.id)?.owner === myId() || 'only the owner can authorise a release',
  relDecide: d => {
    const x = byId('releases', d.id);
    if (!x) return 'not found';
    const e = byId('evidence', x.ev);
    if (['Released', 'Withheld after disclosure review'].includes(d.v))
      return role() === 'A' || 'only a Programme Administrator completes disclosure review';
    return e.owner === myId() || 'only the evidence owner decides on a release';
  },
  repoDelOk: () => role() === 'A' || 'only a Programme Administrator approves deletion',
  // harvest
  hvRel: d =>
    d.v === 'Released'
      ? role() === 'A' || 'only a Programme Administrator approves public/funder release'
      : canComplete() || 'only an authorised Facilitator, Reviewer or Project Lead can request release',
  hvCand: () => canComplete() || 'only an authorised Facilitator, Reviewer or Project Lead can offer candidates',
  // pathway & profile
  pwReview: () => hasB('Reviewer') || 'only an authorised Reviewer approves mode 3 pathways',
  pwAccept: d => byId('pathways', d.id)?.pid === myId() || 'only the participant can accept their pathway',
  pwChange: d => byId('pathways', d.id)?.pid === myId() || 'only the participant can request a change',
  pwStep: d => byId('pathways', d.id)?.pid === myId() || 'only the participant completes their own steps',
  proposePathway: () => ['F', 'M'].includes(role()) || 'only a facilitator or mentor proposes pathways',
  cand: d => byId('candidates', d.id)?.pid === myId() || 'only the participant decides on their profile',
  // funding & payments
  tranche: d => byId('funding', d.f)?.sponsor === myId() || 'only the sponsor releases tranches or reviews summaries',
  summary: d =>
    byId('projects', byId('funding', d.f)?.project)?.owner === myId() ||
    'only the project owner submits progress summaries',
  sum: d =>
    byId('projects', byId('funding', d.f)?.project)?.owner === myId() ||
    'only the project owner submits progress summaries',
  fundApprove: () => hasB('Finance Owner') || 'only the Finance Owner approves funding requests',
  fundSign: d => byId('funding', d.id)?.sponsor === myId() || 'only the sponsor signs the funding agreement',
  fundInterest: () => role() === 'S' || 'only sponsors can request to fund',
  fr: () => role() === 'S' || 'only sponsors can request to fund',
  pitchNew: () => role() === 'P' || 'only project owners pitch sponsors',
  pit: d => byId('projects', d.project)?.owner === myId() || 'you can pitch only your own project',
  prodRel: () => hasB('Finance Owner') || 'only the Finance Owner approves and releases products',
  prodRetire: () => hasB('Finance Owner') || 'only the Finance Owner retires products',
  prodNew: () => role() === 'A' || 'only a Programme Administrator drafts products',
  entGrant: () => role() === 'A' || 'only an authorised administrator grants access',
  eg: () => role() === 'A' || 'only an authorised administrator grants access',
  entRevoke: () => role() === 'A' || 'only an authorised administrator revokes access',
  reconcile: () => hasB('Finance Owner') || 'only the Finance Owner reconciles payments',
  poolNew: () => role() === 'A' || 'only Finance/Programme Administration creates seat pools',
  seatAssign: d =>
    byId('seatPools', d.sp)?.sponsor === myId() || role() === 'A' || 'only the seat assigner can assign seats',
  seat: d => byId('seatPools', d.sp)?.sponsor === myId() || role() === 'A' || 'only the seat assigner can change seats',
  // administration
  roleDecide: d => {
    const a = byId('assign', d.id);
    return (
      (a && (role() === 'A' || (role() === 'O' && a.ctx === ctxId()))) ||
      'only a Programme Administrator or the Organization Representative for that context approves roles'
    );
  },
  userManage: d => {
    const a = byId('assign', d.id);
    return (
      (a && (role() === 'A' || (role() === 'O' && a.ctx === ctxId()))) ||
      'you can manage users only in your own context'
    );
  },
  userStatus: d => {
    const a = byId('assign', d.id);
    return (a && a.pid !== myId() && (role() === 'A' || (role() === 'O' && a.ctx === ctxId()))) || 'not permitted';
  },
  invNew: () => ['A', 'O'].includes(role()) || 'only administrators create invitations',
  inv: d =>
    role() === 'A' ||
    (role() === 'O' && d.ctx === ctxId() && d.role !== 'A' && d.role !== 'S') ||
    'Organization Representatives invite only into their own context',
  invAct: d => {
    const i = byId('invites', d.id);
    return (i && (role() === 'A' || (role() === 'O' && i.ctx === ctxId()))) || 'not permitted';
  },
  agrNew: () => role() === 'A' || 'only a Programme Administrator publishes agreements',
  agrPublish: () => role() === 'A' || 'only a Programme Administrator publishes agreements',
  agrRetire: () => role() === 'A' || 'only a Programme Administrator retires agreements',
  cfg: () => ['A', 'O'].includes(role()) || 'only administrators change configuration',
  vote: d => (d.c ? true : role() === 'A' || 'only a Programme Administrator changes the voting rule'),
  cfgRestore: () => role() === 'A' || 'only a Programme Administrator restores configuration',
  packAct: () => role() === 'A' || 'only a Programme Administrator activates packs',
  srcToggle: () => hasB('AI Owner') || 'only the AI Owner approves AI sources',
  aiRev: () =>
    role() === 'F' ||
    hasB('AI Owner') ||
    hasB('Reviewer') ||
    'only an authorised reviewer releases consequential AI outputs',
  ann: () => role() === 'A' || 'only a Programme Administrator sends announcements',
  // platform
  ctxNew: () => role() === 'T' || 'only the Platform Administrator creates contexts',
  cx: () => role() === 'T' || 'not permitted',
  ctxAdmin: () => role() === 'T' || 'not permitted',
  cxa: () => role() === 'T' || 'not permitted',
  aiToggle: () => role() === 'T' || 'not permitted',
  backup: () => role() === 'T' || 'not permitted',
  restoreTest: () => role() === 'T' || 'not permitted',
  revokeSessions: () => role() === 'T' || 'not permitted',
  lms: () => role() === 'T' || 'not permitted',
  // incidents
  incAct: d => {
    const i = byId('incidents', d.id);
    if (!i) return 'not found';
    if (d.v === 'Appealed')
      return (i.by === myId() && i.state === 'Decision recorded') || 'only the reporter can appeal a recorded decision';
    return hasB('Incident/Safety Owner') || 'only the Incident/Safety Owner manages cases';
  },
  incPause: () => hasB('Incident/Safety Owner') || 'only the Incident/Safety Owner applies an emergency pause',
  incDecide: () => hasB('Incident/Safety Owner') || 'only the Incident/Safety Owner records decisions',
  icd: () => hasB('Incident/Safety Owner') || 'only the Incident/Safety Owner records decisions',
};
Object.assign(G, {
  resState: () => role() === 'A' || 'only a Programme Administrator moderates resources',
  resNew: () => ['A', 'F', 'M'].includes(role()) || 'only administrators, facilitators and mentors add resources',
  res: () => ['A', 'F', 'M'].includes(role()) || 'not permitted',
  initNew: () => role() === 'A' || 'only a Programme Administrator publishes sponsor initiatives',
  ini: () => role() === 'A' || 'not permitted',
  xoNew: () => ['C', 'O'].includes(role()) || 'only an organization member requests cross-organization sharing',
  xo: () => ['C', 'O'].includes(role()) || 'not permitted',
  cohortNew: () => role() === 'O' || 'only an Organization Representative requests a cohort',
  coh: () => role() === 'O' || 'not permitted',
  ropeContrib: d => byId('ropes', d.id)?.mentor === myId() || 'only the mentor records contributions',
  ropeFeedback: d => byId('ropes', d.id)?.mentor === myId() || 'only the mentor sends feedback',
  suggestOpp: d => byId('ropes', d.id)?.mentor === myId() || 'only the mentor suggests opportunities',
  orgEdit: () => (['C', 'O'].includes(role()) && !!me().org) || 'only an organization member edits its profile',
  circleSummary: d => isFac(d.id) || 'only the facilitator drafts a Circle summary',
  summaryDecide: d => isFac(d.id) || 'only the facilitator reviews the summary',
  tplOrg: () => ['A', 'O'].includes(role()) || 'only administrators edit templates',
});
// ---- chat, stage journey, Rope Team reviews, room contributions, collaborator matching
const ropeMod = id => {
  const x = byId('ropes', id);
  return !!x && sCan('ropes', x, 'moderate');
};
const spaceMgr = (kind, id) => {
  const o = byId(kind, id);
  if (!o) return false;
  if (kind === 'circles') return circleMemMgr(id);
  if (kind === 'ropes') return ropeInviter(o);
  return roomLead(id);
};
const activeMember = (kind, id) => {
  const o = byId(kind, id);
  return !!o && memberOf(o) && o.state === 'Active';
};
Object.assign(G, {
  mentorReq: d => {
    const m = byId('mentorReqs', d.id);
    return (m && m.status === 'Pending' && (m.to === myId() || (m.open && role() === 'M'))) || 'only the requested mentor can respond';
  },
  msgHide: d => (d.k === 'circles' ? isFac(d.c) : ropeMod(d.c)) || 'only the facilitator or mentor moderates this chat',
  msgAns: d => {
    const o = byId(d.k, d.c);
    const m = o && o.chat.find(x => x.id === d.id);
    return (m && memberOf(o) && (m.by === myId() || (d.k === 'circles' ? isFac(d.c) : ropeMod(d.c)))) || 'only the person who asked, or a moderator, can mark it answered';
  },
  chatQSum: d => memberOf(byId(d.k, d.c) || {}) || 'members only',
  commitReview: d => isFac(d.c) || 'only the facilitator reviews assigned work',
  crv: d => isFac(d.c) || 'only the facilitator reviews assigned work',
  stageReport: d => {
    const o = byId(d.kind, d.id);
    if (!o || o.state !== 'Active') return 'reports can be sent only from an active space';
    return (d.kind === 'circles' ? o.owner === myId() || (role() === 'F' && o.facilitator === myId()) : o.owner === myId() || o.mentor === myId()) || 'only the space owner sends this report';
  },
  srep: d => {
    const o = byId(d.kind, d.id);
    return (!!o && (d.kind === 'circles' ? o.owner === myId() || isFac(d.id) : o.owner === myId() || o.mentor === myId())) || 'only the space owner sends this report';
  },
  returnTo: d => activeMember(d.from, d.id) || 'only members of an active space can return an issue',
  ret: d => activeMember(d.from, d.id) || 'only members of an active space can return an issue',
  revNew: d => (activeMember('ropes', d.id) && byId('ropes', d.id).mentor !== myId()) || 'only Rope Team participants share work for review',
  rvn: d => (activeMember('ropes', d.id) && byId('ropes', d.id).mentor !== myId()) || 'only Rope Team participants share work for review',
  revRespond: d => (byId('ropes', d.r)?.mentor === myId() && activeMember('ropes', d.r)) || 'only the mentor reviews shared work',
  rvr: d => byId('ropes', d.r)?.mentor === myId() || 'only the mentor reviews shared work',
  engage: d => byId('ropes', d.id)?.mentor === myId() || 'only the mentor reviews the engagement',
  eng: d => byId('ropes', d.id)?.mentor === myId() || 'only the mentor reviews the engagement',
  engageDecide: d => {
    const x = byId('ropes', d.id);
    return (x && role() === 'F' && x.members.some(m => m.pid === myId() && m.role === 'Facilitator') && x.engagement?.status === 'Exit proposed') || 'the Faculty/Steward confirms the mentor’s proposal';
  },
  rcl: d => ropeMod(d.id) || 'only the mentor or facilitator can close a Rope Team',
  taskDecide: d => roomLead(d.r) || 'only the project lead approves proposed tasks',
  rup: d => activeMember('rooms', d.r) || 'only members of an active workspace post updates',
  cbNew: d => (activeMember('rooms', d.r) && role() !== 'F') || 'only workspace members submit contributions',
  cbn: d => (activeMember('rooms', d.r) && role() !== 'F') || 'only workspace members submit contributions',
  cbReview: d => (byId('rooms', d.r) && (role() === 'A' || ((role() === 'F' || hasB('Reviewer')) && memberOf(byId('rooms', d.r))))) || 'only a Faculty/Steward reviews contributions',
  cbr: d => (byId('rooms', d.r) && (role() === 'A' || ((role() === 'F' || hasB('Reviewer')) && memberOf(byId('rooms', d.r))))) || 'only a Faculty/Steward reviews contributions',
  roomLink: d => activeMember('rooms', d.r) || 'only members of an active workspace link objects',
  rlk: d => activeMember('rooms', d.r) || 'only members of an active workspace link objects',
  collabFind: d => (role() === 'F' && isSteward(d.project)) || 'only an assigned Faculty/Steward starts a collaborator match',
  colfFind: d => (role() === 'F' && isSteward(d.project)) || 'only an assigned Faculty/Steward starts a collaborator match',
  colf: d => (role() === 'F' && isSteward(d.project)) || 'only an assigned Faculty/Steward starts a collaborator match',
  poolActivate: () => hasB('Finance Owner') || 'only the Finance Owner confirms invoice payment',
  hvRedraft: d => {
    const x = byId('harvests', d.id);
    return (x && x.state === 'Rejected' && (x.by === myId() || canComplete())) || 'not permitted';
  },
});
// ---- space roles, joins, pathway activity, task board, Action Room chat
const taskOf = d => {
  const x = byId('rooms', d.r);
  return [x, x && x.tasks.find(t => t.id === d.id)];
};
const roomSees = x => !!x && (memberOf(x) || ['A', 'O'].includes(role()));
Object.assign(G, {
  memSet: d => spaceMgr(d.kind || 'circles', d.c) || 'only the facilitator or project owner manages membership here',
  memRole: d => spaceMgr(d.kind || 'circles', d.c) || 'only the facilitator or project owner assigns roles here',
  inviteMem: d =>
    d.kind === 'ropes'
      ? ropeInviter(byId('ropes', d.c)) || 'only the project owner or an assigned Faculty/Steward can invite to a Rope Team'
      : circleMemMgr(d.c) || 'only the facilitator or project owner can invite',
  invm: d =>
    d.kind === 'ropes'
      ? ropeInviter(byId('ropes', d.c)) || 'only the project owner or an assigned Faculty/Steward can invite to a Rope Team'
      : circleMemMgr(d.c) || 'only the facilitator or project owner can invite',
  joinCircle: d => {
    const c = byId('circles', d.id);
    return (c && inCtx(c) && c.state === 'Active' && !memberOf(c)) || 'you can request to join an active Circle you are not in';
  },
  joinRope: d => {
    const x = byId('ropes', d.id);
    return (x && ropeJoinable(x)) || 'you can ask to join only Rope Teams linked to your Circles';
  },
  joinWithdraw: d => (memberRec(byId(d.kind, d.id) || {}) || {}).status === 'Requested' || 'there is no pending request to withdraw',
  newCircle: () => canCreateCircle() || 'you cannot create Circles in this role',
  nc: d =>
    canCreateCircle() &&
    (role() !== 'P' || !d.project || ownCircleProjects().some(p => p.id === d.project))
      ? true
      : 'you can create a Circle only for your own accepted project',
  rec: d => {
    const c = byId('circles', d.c);
    return (c && c.state === 'Active' && (sCan('circles', c, 'record') || isFac(d.c))) || 'records can be added only by contributing members while the Circle is active';
  },
  chat: d => {
    const o = byId(d.kind, d.c);
    return (o && memberOf(o) && o.state === 'Active' && sCan(d.kind, o, 'post')) || 'you can post only as a contributing member of an active space';
  },
  msgHide: d => {
    const o = byId(d.k, d.c);
    return (o && (sCan(d.k, o, 'moderate') || (d.k === 'circles' && isFac(d.c)))) || 'only a moderator of this space can hide messages';
  },
  msgAns: d => {
    const o = byId(d.k, d.c);
    const m = o && o.chat.find(x => x.id === d.id);
    return (m && memberOf(o) && (m.by === myId() || sCan(d.k, o, 'moderate'))) || 'only the person who asked, or a moderator, can mark it answered';
  },
  // rope teams
  checkin: d => sCan('ropes', byId('ropes', d.id), 'mentor') || 'only the mentor records check-ins',
  ck: d => sCan('ropes', byId('ropes', d.id), 'mentor') || 'only the mentor records check-ins',
  supNew: d => sCan('ropes', byId('ropes', d.id), 'ask') || 'only Rope Team members ask for support',
  sup: d => sCan('ropes', byId('ropes', d.id), 'ask') || 'only Rope Team members ask for support',
  supStatus: d => sCan('ropes', byId('ropes', d.r), 'support') || 'only the mentor or facilitator manages support requests',
  ropeClose: d => sCan('ropes', byId('ropes', d.id), 'close') || 'only the mentor or facilitator can close a Rope Team',
  rcl: d => sCan('ropes', byId('ropes', d.id), 'close') || 'only the mentor or facilitator can close a Rope Team',
  revNew: d => (activeMember('ropes', d.id) && sCan('ropes', byId('ropes', d.id), 'share')) || 'only the project owner and members share work for review',
  rvn: d => (activeMember('ropes', d.id) && sCan('ropes', byId('ropes', d.id), 'share')) || 'only the project owner and members share work for review',
  engageDecide: d => {
    const x = byId('ropes', d.id);
    return (x && role() === 'F' && isRopeFac(x) && x.engagement?.status === 'Exit proposed') || 'the Faculty/Steward confirms the mentor’s proposal';
  },
  ropeInvite: d => (memberRec(byId('ropes', d.id) || {}) || {}).status === 'Invited' || 'there is no invitation to respond to',
  mrDetails: d => {
    const m = byId('mentorReqs', d.id);
    return (m && (mentorReqVisible(m) || role() === 'A')) || 'you cannot view this request';
  },
  mrq: d => (role() === 'F' && isSteward(d.project)) || 'only an assigned Faculty/Steward raises Mentor Requests',
  // action rooms
  ri: d => {
    const x = byId('rooms', d.r);
    return (x && x.state === 'Active' && (sCan('rooms', x, 'propose') || role() === 'A')) || 'only contributing members add items to an active ' + WL();
  },
  roomItem: d => {
    const x = byId('rooms', d.r);
    return (x && x.state === 'Active' && (sCan('rooms', x, 'propose') || role() === 'A')) || 'only contributing members add items to an active ' + WL();
  },
  taskMove: d => {
    const [x, k] = taskOf(d);
    if (!k) return 'task not found';
    if (!taskCanMove(x, k)) return 'only the assignee, the project owner or the facilitator can move this task';
    return taskTargets(x, k).includes(d.v) || (k.status === 'Proposed' ? 'only the project owner or facilitator approves proposed tasks' : 'tasks cannot be moved back to Proposed');
  },
  taskView: d => roomSees(byId('rooms', d.r)) || 'members only',
  myTaskOpen: d => roomSees(byId('rooms', d.r)) || 'members only',
  tke: d => {
    const [x, k] = taskOf(d);
    return (k && x.state === 'Active' && (roomLead(d.r) || k.owner === myId())) || 'only the assignee, the project owner or the facilitator can change this task';
  },
  rup: d => (activeMember('rooms', d.r) && sCan('rooms', byId('rooms', d.r), 'post')) || 'only contributing members of an active ' + WL() + ' post updates',
  cbNew: d => (activeMember('rooms', d.r) && sCan('rooms', byId('rooms', d.r), 'contribute')) || 'only members, partners and mentors submit contributions',
  cbn: d => (activeMember('rooms', d.r) && sCan('rooms', byId('rooms', d.r), 'contribute')) || 'only members, partners and mentors submit contributions',
  cbReview: d => (byId('rooms', d.r) && (role() === 'A' || sCan('rooms', byId('rooms', d.r), 'review'))) || 'only a Reviewer or Facilitator in this ' + WL() + ' reviews contributions',
  cbr: d => (byId('rooms', d.r) && (role() === 'A' || sCan('rooms', byId('rooms', d.r), 'review'))) || 'only a Reviewer or Facilitator in this ' + WL() + ' reviews contributions',
  msAchieve: d => sCan('rooms', byId('rooms', d.r), 'review') || hasB('Reviewer') || 'only a Reviewer can validate an evidence-linked milestone',
  joinDecide: d => ['F', 'A'].includes(role()) || roomLead(d.r) || 'only a Faculty/Steward, Programme Administrator or the project owner approves elevated joins',
  // opportunity cards from a Circle
  card: d => {
    if (!d.from) return true;
    const c = byId('circles', d.from);
    return (c && (sCan('circles', c, 'card') || isFac(c.id))) || 'only contributing members of that Circle can create cards from it';
  },
  // pathway
  pwStep: d => {
    const p = byId('pathways', d.id);
    return (p && p.pid === myId() && p.state === 'Current' && p.steps[d.i] && !p.steps[d.i].done) || 'only the participant completes open steps of their current pathway';
  },
  pws: d => {
    const p = byId('pathways', d.id);
    return (p && p.pid === myId() && p.state === 'Current' && p.steps[d.i] && !p.steps[d.i].done) || 'only the participant completes open steps of their current pathway';
  },
  pwr: () => hasB('Reviewer') || 'only an authorised Reviewer returns mode 3 pathways',
  pwRevise: d => {
    const p = byId('pathways', d.id);
    return (p && p.by === myId() && p.state === 'Draft') || 'only the person who proposed this pathway can revise it';
  },
  pwv: d => {
    const p = byId('pathways', d.id);
    return (p && p.by === myId() && p.state === 'Draft') || 'only the person who proposed this pathway can revise it';
  },
  pwActivity: d => pwCanView(byId('pathways', d.id)) || 'you cannot view this pathway',
});
// Wrap handlers. Same key may exist in A (click) and F (form submit); both are guarded.
Object.keys(G).forEach(k => {
  [A, F].forEach(T => {
    if (typeof T[k] === 'function') {
      const orig = T[k];
      T[k] = (d, ...rest) => {
        if (!S.session) return;
        let r;
        try {
          r = G[k](d || {});
        } catch (e) {
          r = 'not permitted';
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
