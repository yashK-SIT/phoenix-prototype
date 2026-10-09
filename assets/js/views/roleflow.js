// ---------- ROLE FLOW: how each role works in PHOENIX, from registration to project completion ----------
// Public page (signed out), opened from the sign-in screen. One flowchart per role plus a cross-role overview.
// The flows describe the prototype's current rules (guards.js, views/*). The module-access table is read live
// from the role records (Role management) or the default matrix, so it always matches what the app enforces.

// Node kinds: s = start/end · a = this role acts · h = another role acts · y = PHOENIX does it automatically
// d = decision with branches · g = moves to another module.
const rfS = t => ({ k: 's', t });
const rfA = (t, n) => ({ k: 'a', t, n });
const rfY = (t, n) => ({ k: 'y', t, n });
const rfH = (r, t, n) => ({ k: 'h', r, t, n });
const rfD = (q, br, n) => ({ k: 'd', q, br, n });
const rfG = t => ({ k: 'g', t });
// A decision branch. out: 'cont' = the flow continues below, 'end' = this path stops, any other text = where it goes.
const rfB = (l, nodes, out = 'cont') => ({ l, nodes, out });
const RF_ORDER = ['P', 'F', 'M', 'C', 'O', 'S', 'A', 'T'];
const rfName = c => ROLE[c] || c;
// Role chips: the base roles use the theme's wayfinding colours; '*' means "any member".
const rfChip = c =>
  c
    .split('/')
    .map(x => `<span class="rfl-chip rfl-r-${x === '*' ? 'any' : x}">${x === '*' ? 'Space members' : x === 'SYS' ? 'PHOENIX' : h(rfName(x))}</span>`)
    .join('');

// ---- shared: registration, verification, approval, sign-in and onboarding for each role
function rfAccess(c) {
  const mfa = ['A', 'T'].includes(c);
  const onb = [
    'accept the ' + rfName(c) + ' agreement and the service terms (you can download it or compare it with the previous version)',
    'complete the minimum profile (name and display name come from the account; bio and interests are optional' + (c === 'S' ? ', funding interests are required' : '') + ')',
    c === 'P' && 'answer the Purpose Compass baseline (required questions must be answered; “Save and finish later” signs you out)',
  ].filter(Boolean);
  const signIn = [
    rfA('Sign in with email and password' + (mfa ? ', then enter the two-step verification code' : ''), 'Wrong details show an error; after 5 failed attempts the screen says the account is temporarily locked.' + (mfa ? ' The code is required for Programme and Platform Administrators when signing in with a password.' : '')),
    rfY('Onboarding gate', 'Before anything else you ' + onb.join(', then ') + '.'),
    rfY('Policy updates', 'When the Platform Administrator publishes a new version of your agreement, a dialog shows it at sign-in. “Compare with previous policy” shows what changed. You accept to continue, or sign out.'),
    rfY('Role expiry', 'If your role has an end date it expires automatically and you see “Role assignment expired” until an administrator renews it. People with several roles switch between them from the account menu.'),
    rfG('My PHOENIX: your home page with your next action and pending decisions'),
  ];
  if (c === 'T')
    return [
      rfS('Start: a Platform Administrator account is provisioned for you'),
      rfY('No self-registration or invitation', 'Invitations can grant every role except Platform Administrator, so this account is set up outside the sign-up flows.'),
      ...signIn,
    ];
  if (c === 'P' || c === 'S')
    return [
      rfS('Start: open PHOENIX'),
      rfD('Do you have an invitation link?', [
        rfB('No', [rfA('Create an account as ' + rfName(c), 'Participants and Sponsors can register directly. Name, display name, email, date of birth and a password (10+ characters with a number). The account joins the default programme.')]),
        rfB('Yes', [rfA('Open the invitation link and accept', 'PHOENIX checks the link. Expired, withdrawn or used links stop here with a “Request a new invitation” form. A valid link fixes the role, programme and email.')]),
      ]),
      rfD('Does this email already have a PHOENIX account?', [
        rfB('No', [rfA('Verify your email', 'Open the link in the verification email, or send a new one if it expired.'), rfY('Role active straight away', rfName(c) + ' does not need role approval by default.')]),
        rfB('Yes', [rfY('No second account is created', 'You sign in and the new role is added to your existing account.')]),
      ]),
      ...signIn,
    ];
  const inviter = c === 'A' ? 'A/T' : 'A/O';
  return [
    rfS('Start: you receive an invitation'),
    rfH(inviter, c === 'A' ? 'A Platform Administrator names you as an organization’s administrator, or a Programme Administrator invites you' : 'A Programme Administrator, or an Organization Representative in its own programme, invites you', 'The invitation sets your role, programme, link expiry (14 days by default) and an optional role end date. ' + rfName(c) + ' joins by invitation only.'),
    rfA('Open the invitation link', 'PHOENIX checks the link. Expired, withdrawn or already used links stop here with a “Request a new invitation” form, which notifies the Programme Administrators.'),
    rfD('Does this email already have a PHOENIX account?', [
      rfB('No', [rfA('Accept and create your account', 'Role and email come from the invitation. Name, display name, date of birth and a password (10+ characters with a number).'), rfA('Verify your email', 'Open the link in the verification email, or send a new one.')]),
      rfB('Yes', [rfA('Sign in to accept', 'No second account: the role is added to your existing account.')]),
    ]),
    rfD(
      'Does the role need approval?',
      [
        c === 'A' && rfB('Pre-approved by the Platform Administrator', [rfY('Role active straight away', 'Invitations sent when a Platform Administrator names an organization’s admin are pre-approved.')]),
        rfB('Yes (default for ' + rfName(c) + ')', [
          rfY('“Your role is awaiting approval”', 'Programme Administrators are notified.'),
          rfD('Approver decides', [
            rfB('Approve role', [rfH('A/O', 'Role becomes active', 'Approved by a Programme Administrator, or an Organization Representative in its own programme, from Users → Manage.')]),
            rfB('Decline role', [rfY('“Role not activated” screen with the approver’s note', 'The account still exists; other roles are unaffected.')], 'end'),
          ]),
        ]),
      ].filter(Boolean),
      'Approval is set per role in Role management. By default Facilitator, Mentor, Partner, Organization Representative and Programme Administrator need it.',
    ),
    ...signIn,
  ];
}

// ---- the flows, phase by phase; each phase is one module of the app
function rfFlows() {
  const W = WL();
  return {
    P: {
      lead: 'Learner or practitioner. Sets a purpose, follows a learning pathway, proposes projects, and owns and leads them through Circle, Rope Team and ' + W + '.',
      side: ['Learning pathway', 'Profile, claims and candidates', 'Evidence, repository and Learning Harvests', 'Pitches and sponsor funding', 'Opportunities and Match Briefs', 'Conversations, help and safety'],
      phases: [
        ['Account & access', 'Registration, sign-in and onboarding', rfAccess('P')],
        [
          'Pathway',
          'Learning pathway',
          [
            rfD('How does your pathway start?', [
              rfB('You create it', [
                rfA('Create a pathway', 'Start from an approved template or write your own 3–5 steps. It is submitted at once.'),
                rfY('Status “Awaiting reviewer”', 'Programme Administrators are notified.'),
                rfH('A', 'Programme Administrator assigns a Steward', 'An active Facilitator / Steward in the programme, not you. The Steward can be changed later.'),
                rfD('Steward decides', [
                  rfB('Approve', [rfY('Pathway becomes current', 'Any earlier current pathway is marked Superseded.')]),
                  rfB('Request clarification', [rfA('Reply in the conversation, or update the steps and resubmit with a note'), rfY('Back to “In review”')], 'Steward decides again'),
                  rfB('Reject', [rfY('Rejected (final)', 'The reason is posted in the conversation. A rejected pathway cannot be resubmitted.')], 'end'),
                ]),
              ]),
              rfB('A Facilitator or Mentor proposes it', [
                rfH('F/M', 'Proposes a pathway to you', 'From an approved template (as is, or adapted with 3–5 steps) it comes straight to you. A custom pathway first goes through Steward approval as above.'),
                rfD('Your answer', [
                  rfB('Accept', [rfY('Pathway becomes current', 'The proposer is notified.')]),
                  rfB('Request a change', [rfY('Back to the proposer as Draft'), rfH('F/M', 'Revises and proposes again')], 'Your answer'),
                ]),
              ]),
            ]),
            rfA('Mark steps complete', 'In any order, with an optional note and files. The pathway creator is notified.'),
            rfY('Profile candidate for each step', 'Completing every step marks the pathway Completed and adds a “Completed learning activity” candidate. You accept, edit, defer or reject each candidate on your profile.'),
            rfA('Talk in the pathway conversation', 'The pathway owner, the Programme Administrator and the Steward see every message, here and in Messages → Pathways.'),
          ],
        ],
        [
          'Projects',
          'Create and submit a project',
          [
            rfA('Start a project', 'Type (Need, Opportunity or Project idea), title, description (40+ characters), tags, area and funding need. You can save it as a draft.'),
            rfD('Draft the 8 sections with AI?', [
              rfB('Yes, AI is on', [rfY('AI drafts the 8 sections for your review')]),
              rfB('No, or AI unavailable', [rfA('Write the 8 sections yourself')]),
            ]),
            rfA('Review each section', 'Accept, edit, regenerate or reject. All 8 must be accepted or edited before you can submit.'),
            rfA('Submit for review', 'Confirm you reviewed every AI-drafted section and that reviewers in this programme will see the project.'),
            rfY('Status “Submitted”', 'If no reviewer is assigned yet, the Programme Administrators are asked to assign one.'),
          ],
        ],
        [
          'Project review',
          'Reviewer assignment and decision',
          [
            rfH('A', 'Programme Administrator assigns one reviewer', 'An active Facilitator / Steward in the programme, never the owner. The reviewer cannot be changed afterwards; they are “the Steward” for the rest of the project.'),
            rfD('The Steward (or a Programme Administrator) decides', [
              rfB('Request clarification', [rfY('Status “Clarification requested”'), rfA('Reply in the review conversation, or update the sections and resubmit with a note')], 'Steward decides again'),
              rfB('Reject', [rfY('Status “Rejected”', 'You are told why. A rejected project cannot be edited.')], 'end'),
              rfB('Accept', [rfY('Status “Accepted” with a support path', '“Circle → Rope Team → ' + W + '” or “Circle → ' + W + '” (no Rope Team). You are notified.')]),
            ]),
            rfA('Edit project details while it is open', 'Title, type, description, tags, area and funding need, until the project is rejected or closed. Reviewers are notified of changes.'),
          ],
        ],
        [
          'Circles',
          'Circle: agree the problem and the scope',
          [
            rfA('Create the Circle for your accepted project', 'Or the Steward creates it. Name, purpose, outcome, agreement and at least one document.'),
            rfY('Stage “Circle”', 'You are the Project owner; the Steward joins as Facilitator.'),
            rfA('Build the team', 'Invite people as Collaborator, Facilitator or Mentor, and approve or decline join requests. Invitees accept or decline.'),
            rfA('Join other Circles', 'Ask to join an active Circle in your programme (its owner or facilitator decides), or accept an invitation.'),
            rfA('Work together', 'Chat, sessions, records and commitments, documents, an Opportunity Card or a Learning Harvest from the Circle.'),
            rfA('Decide by weighted vote', 'You or the Facilitator open and close polls. Owner counts twice, Collaborators once; 60% of all eligible weight records a decision.'),
            rfD('Which support path was chosen?', [
              rfB('Circle → Rope Team → ' + W, [rfA('Raise a Mentor Request', 'To a named mentor or as an open request to every mentor in the programme.'), rfH('M', 'A mentor accepts'), rfY('Rope Team formed', 'You, the Circle’s Collaborators, the mentor and a facilitator join; Circle documents are copied in. Stage “Rope Team”.')]),
              rfB('Circle → ' + W, [rfY('No Rope Team', 'Mentor Requests are not available. Once a decision is recorded, “Create or link ' + W + '” appears.')], 'Skips to the ' + W + ' phase'),
            ]),
          ],
        ],
        [
          'Rope Teams',
          'Rope Team: get the requirements right (if on the path)',
          [
            rfA('Share work for review'),
            rfH('M', 'Mentor reviews it', '“Looks good” or “Changes recommended”. A mentor contribution is recorded.'),
            rfA('Upload documents, ask for support, take part in check-ins'),
            rfH('M', 'Mentor marks the requirements finalised'),
            rfA('Send a Rope Team report, or return a matter to the Circle', 'Returning raises a concern for the Circle facilitator. The project stage does not move back.'),
          ],
        ],
        [
          W + 's',
          W + ': plan, deliver, prove',
          [
            rfA('Create the ' + W + ' for your accepted project', 'Directly, without a proposal step. The primary origin is your project.'),
            rfY('Stage “' + W + '”', 'Your Steward joins as Facilitator, the Circle’s Collaborators are invited, and any approved collaborator match joins as Partner.'),
            rfA('Plan tasks and milestones', 'As owner your tasks start as To do; members’ proposals wait for your approval.'),
            rfA('Move tasks: To do → In progress → Review'),
            rfH('F', 'Facilitator or reviewer moves Review → Done'),
            rfA('Link evidence to a milestone', 'Or upload it from the milestone.'),
            rfY('Sent to the Steward automatically', 'Status “Awaiting Steward review”; the Steward is notified.'),
            rfD('Steward reviews each piece of evidence', [
              rfB('Approved', [rfY('Counts toward the milestone')]),
              rfB('Changes requested', [rfA('Edit the evidence and resubmit')], 'Steward reviews again'),
              rfB('Rejected', [rfA('Remove it and link other evidence')], 'Steward reviews again'),
            ]),
            rfH('F', 'Steward validates the milestone', 'Only once every linked item is approved. The milestone becomes Achieved and evidence owners get profile candidates.'),
            rfA('Return an issue to the Rope Team or Circle when you need guidance', 'Any member can. The project stage does not move back.'),
          ],
        ],
        [
          'Final review',
          'Final deliverables and closure',
          [
            rfA('Submit final deliverables with a note', 'You see milestone, evidence and open-task counts; they do not block submission.'),
            rfY('Stage “Final review”', 'The Steward is notified.'),
            rfD('Steward’s final review', [
              rfB('Request changes', [rfY('Back to the ' + W + ' stage with the Steward’s note')], 'Submit again'),
              rfB('Approve', [rfY('Project closed', 'The ' + W + ' and Rope Team close and the Circle completes. You get a profile candidate and a reminder if a final Learning Harvest is still needed.')]),
            ]),
            rfS('End: project closed'),
          ],
        ],
        [
          'Profile',
          'Profile, claims and candidates',
          [
            rfA('Update your Purpose Compass', 'Saving creates a new profile version.'),
            rfA('Add, correct or revoke profile claims and choose who sees each one'),
            rfY('Profile candidates arrive', 'From completed pathway steps, approved evidence, validated milestones, project closure and Learning Harvests.'),
            rfD('Your decision on each candidate', [
              rfB('Accept, or edit and accept', [rfY('Added to your profile as a new version')]),
              rfB('Defer', [rfY('Stays in your pending decisions')], 'Decide later'),
              rfB('Reject', [rfY('Not added')], 'end'),
            ]),
            rfA('Accept or reject profile suggestions after an ' + W + ' Learning Harvest is approved', 'Only you decide what changes on your profile.'),
          ],
        ],
        [
          'Records',
          'Evidence, repository and Learning Harvests',
          [
            rfA('Upload evidence', 'File, link, reflection or repository record, linked to one of your spaces. It starts at level E0.'),
            rfH('F', 'A Facilitator / Steward or Reviewer reviews it', 'Approved, Needs revision, Rejected, Insufficient or Restricted, with an evidence level E0–E4 and limitations. Approval adds a profile candidate.'),
            rfA('Authorise funder release of approved evidence'),
            rfH('A', 'Programme Administrator releases or withholds it', 'Released evidence becomes visible to sponsors.'),
            rfA('Start a Learning Harvest', 'Optional AI draft; members are asked to contribute. In an ' + W + ' it needs every required deliverable done and at least one piece of evidence.'),
            rfH('F', 'Facilitator / Steward approves or rejects the Harvest', 'Approval of an ' + W + ' Harvest sends profile suggestions to you.'),
          ],
        ],
        [
          'Funding',
          'Pitches and sponsor funding',
          [
            rfA('Pitch an accepted project to sponsors'),
            rfH('S', 'Sponsor funds it, saves it or declines', 'Funding starts a request in three tranches: Circle, Rope Team and ' + W + '.'),
            rfH('A', 'Finance Owner approves the request; the sponsor signs'),
            rfH('S', 'Sponsor releases a tranche', 'Only when the project has reached that stage and the previous tranche’s summary was accepted.'),
            rfA('Submit a progress summary for the released tranche'),
            rfD('Sponsor’s answer', [rfB('Accept summary', [rfY('Next tranche can be released')]), rfB('Put on hold', [rfA('Update the summary')], 'Sponsor’s answer')]),
            rfA('Message interested sponsors', 'Direct messages exist only between a project owner and a sponsor, about one project.'),
          ],
        ],
        [
          'Discover',
          'Opportunities and Match Briefs',
          [
            rfA('Publish an Opportunity Card', 'Need, Offer, Asset or Opportunity, linked to a project you own or work on. Visible to the programme, or to Circle members when created from a Circle.'),
            rfA('Express interest in someone else’s card'),
            rfH('F', 'Steward reviews the Match Brief', 'Approve and request consent, request clarification or reject.'),
            rfD('Both parties consent?', [rfB('Yes', [rfY('Introduced: contact details shared'), rfA('Close, keep talking, or link or create an ' + W)]), rfB('No', [rfY('Match Brief closed')], 'end')]),
            rfA('Or propose a direct collaboration', 'Only with someone you already share a space or organization with.'),
          ],
        ],
        [
          'Messages & support',
          'Conversations, help and safety',
          [
            rfA('Chat in your Circles, Rope Teams and ' + W + 's', 'Members of an active space post; Observers read only. Mark questions, attach files.'),
            rfA('Ask PHOENIX', 'Private, rule-based help. Nothing changes on your record.'),
            rfA('Report a concern'),
            rfH('A', 'Incident/Safety Owner triages, reviews and records a decision'),
            rfD('Accept the decision?', [rfB('Yes', [rfY('Case closed')], 'end'), rfB('No', [rfA('Appeal')], 'Reviewed again')]),
          ],
        ],
      ],
    },
    F: {
      lead: 'Faculty / Steward. Reviews and accepts projects, facilitates Circles, validates milestones and gives the final approval. Also approves pathways and reviews evidence.',
      side: ['Pathways: propose and approve', 'Evidence, Harvests, Match Briefs and resources'],
      phases: [
        ['Account & access', 'Invitation, approval and sign-in', rfAccess('F')],
        [
          'Project review',
          'Review a project assigned to you',
          [
            rfH('P', 'A participant submits a project'),
            rfH('A', 'Programme Administrator assigns you as its reviewer', 'One reviewer per project, never the owner. It cannot be changed. You are now the project’s Steward.'),
            rfA('Read the project and talk in the review conversation'),
            rfD('Your decision', [
              rfB('Request clarification', [rfH('P', 'Owner replies or updates and resubmits')], 'Decide again'),
              rfB('Reject', [rfY('Owner is told why')], 'end'),
              rfB('Accept and choose the support path', [rfY('“Circle → Rope Team → ' + W + '” or “Circle → ' + W + '”', 'The owner is notified.')]),
            ]),
          ],
        ],
        [
          'Circles',
          'Facilitate the Circle',
          [
            rfA('Create the Circle for a project you steward', 'Or the owner creates it. You join as Facilitator.'),
            rfA('Manage membership', 'Invite, approve or decline join requests, change roles, remove members.'),
            rfA('Run sessions, record decisions, review commitments, resolve concerns'),
            rfA('Open and close polls; final-review poll outcomes', 'Facilitators do not vote. 60% of eligible weight records a decision.'),
            rfA('Approve the AI Circle summary, moderate chat, pause the Circle for repair or resume it'),
            rfD('Support path', [
              rfB('With Rope Team', [rfA('Raise a Mentor Request (or the owner does)'), rfH('M', 'Mentor accepts; Rope Team formed')]),
              rfB('Circle → ' + W, [rfA('Create or link the ' + W + ' once a decision is recorded')], 'Skips to the ' + W + ' phase'),
            ]),
            rfA('Find a collaborator for a requirement', 'Builds a Match Brief from active Partners in the programme; you are its Steward.'),
            rfH('C/P', 'Both parties consent after your approval', 'The collaborator is invited to the ' + W + ' as Partner, or queued until it exists.'),
          ],
        ],
        [
          'Rope Teams',
          'Support the Rope Team',
          [
            rfY('You join as facilitator when you raised the Mentor Request'),
            rfA('See progress indicators, invite members'),
            rfA('Decide on a mentor’s proposed exit; close the Rope Team'),
            rfA('Create the ' + W + ' once the mentor finalises requirements'),
          ],
        ],
        [
          W + 's',
          'Execution: tasks, milestones and evidence',
          [
            rfA('Create ' + W + 's, or activate or decline proposed ones', 'Facilitators can create directly. Proposals from participants are activated or declined by you or a Programme Administrator.'),
            rfY('Added as Facilitator when the owner creates the ' + W + ' for your project'),
            rfA('Approve or decline proposed tasks; move tasks Review → Done'),
            rfA('Review contributions and change objects'),
            rfY('Milestone evidence arrives in your queue automatically'),
            rfD('Review each piece of evidence', [rfB('Approve', [rfY('Set level and limitations')]), rfB('Request changes', [rfH('P', 'Owner edits and resubmits')], 'Review again'), rfB('Reject', [rfY('Owner notified')], 'Review again')]),
            rfA('Validate the milestone', 'Only when every linked item is approved by you.'),
          ],
        ],
        [
          'Final review',
          'Close the project',
          [
            rfH('P', 'Owner submits final deliverables'),
            rfD('Final review', [rfB('Request changes', [rfY('Back to the ' + W + ' stage')], 'Review again'), rfB('Approve', [rfY('Project, ' + W + ' and Rope Team closed; Circle completed')])]),
            rfS('End: project closed'),
          ],
        ],
        [
          'Pathway',
          'Pathways: propose and approve',
          [
            rfA('Propose a pathway to a participant', 'Template as is, adapted (3–5 steps) or custom. Template-based ones go straight to the participant.'),
            rfH('A', 'For custom pathways and participants’ own: the Programme Administrator assigns you as Steward'),
            rfD('Your decision as Steward', [rfB('Approve', [rfY('Current, or proposed to the participant if someone else created it')]), rfB('Request clarification', [rfH('P', 'Creator replies or resubmits')], 'Decide again'), rfB('Reject', [rfY('Final')], 'end')]),
            rfA('Talk with the owner and the Programme Administrator in Messages → Pathways'),
          ],
        ],
        [
          'Records & discover',
          'Evidence, Harvests, Match Briefs and resources',
          [
            rfA('Review evidence in the review queue', 'Any evidence you did not submit: status, level E0–E4 and limitations.'),
            rfA('Approve or reject Learning Harvests; request funder release', 'A Programme Administrator releases to funders.'),
            rfA('Steward Match Briefs on Opportunity Cards; nominate matches'),
            rfA('Suggest a resource', 'A Programme Administrator publishes it.'),
          ],
        ],
      ],
    },
    M: {
      lead: 'Accepts Mentor Requests, guides the Rope Team, reviews shared work and finalises requirements.',
      side: ['Pathways', 'Circles, ' + W + 's, Harvests and messages'],
      phases: [
        ['Account & access', 'Invitation, approval and sign-in', rfAccess('M')],
        [
          'Rope Teams',
          'Mentor Requests',
          [
            rfH('P/F', 'Project owner or Steward raises a Mentor Request', 'Named to you, or open to every mentor in the programme. Not available on the “Circle → ' + W + '” path.'),
            rfD('Your answer', [
              rfB('Accept', [rfY('Rope Team formed', 'Owner, the Circle’s Collaborators, you as mentor and a facilitator. Circle documents are copied in. If one already exists you join it.')]),
              rfB('Decline', [rfY('A named request is declined; an open request stays open for other mentors')], 'end'),
            ]),
          ],
        ],
        [
          'Rope Teams',
          'Guide the team',
          [
            rfH('P', 'Members share work for review'),
            rfD('Your review', [rfB('Looks good', [rfY('Mentor contribution recorded')]), rfB('Changes recommended', [rfH('P', 'Members revise and share again')], 'Review again')]),
            rfA('Run check-ins, answer support requests, see progress indicators'),
            rfA('Mark the requirements finalised', 'The facilitators are notified and can create the ' + W + '.'),
            rfA('Send the Rope Team report to the ' + W),
            rfA('Resolve matters returned from the ' + W),
            rfA('Propose ending your engagement, or close the Rope Team', 'A Facilitator / Steward decides on an exit.'),
            rfH('P/F', 'The work moves on to the ' + W),
            rfS('End: Rope Team closed, or closed with the project at final approval'),
          ],
        ],
        [
          'Pathway',
          'Pathways',
          [
            rfA('Propose pathways to participants in your Rope Teams', 'Template-based ones go to the participant; custom ones need Steward approval first.'),
            rfH('P', 'Participant accepts or requests a change'),
          ],
        ],
        [
          'Collaboration',
          'Circles, ' + W + 's, Harvests and messages',
          [
            rfA('Join Circles and ' + W + 's you are invited to'),
            rfA('Start and contribute to Learning Harvests'),
            rfA('View evidence and Opportunity Cards', 'Mentors cannot upload evidence or create cards.'),
            rfA('Suggest a resource; chat in your spaces; report a concern'),
          ],
        ],
      ],
    },
    C: {
      lead: 'Brings resources, expertise or opportunities. Works in ' + W + 's against a defined responsibility.',
      side: ['Mandate and sharing'],
      phases: [
        ['Account & access', 'Invitation, approval and sign-in', rfAccess('C')],
        [
          'Discover',
          'Opportunities and matches',
          [
            rfA('Publish Opportunity Cards for projects you work on'),
            rfA('Express interest in a card, or propose a direct collaboration', 'Direct only with people you already share a space or organization with.'),
            rfY('A Match Brief is drafted for Steward review', 'The card owner is notified of your interest.'),
            rfH('F', 'Steward finds you for a project requirement, or reviews your interest'),
            rfD('Consent to the Match Brief?', [rfB('Yes (both parties)', [rfY('Introduced; invited to the ' + W + ' as Partner', 'Queued until the ' + W + ' exists.')]), rfB('No', [rfY('Brief closed')], 'end')]),
          ],
        ],
        [
          W + 's',
          'Deliver as a Partner',
          [
            rfA('Accept the ' + W + ' invitation'),
            rfH('P', 'The project owner leads the ' + W + ': tasks, milestones and members'),
            rfA('Submit contributions'),
            rfH('F', 'Facilitator or reviewer: Accepted, Changes requested or More evidence requested'),
            rfA('Create or link ' + W + 's', 'Partners can create ' + W + 's directly.'),
            rfA('Upload evidence; start Learning Harvests'),
            rfH('F', 'Steward gives the project its final approval'),
            rfS('End: the ' + W + ' closes with the project'),
          ],
        ],
        [
          'Organization',
          'Mandate and sharing',
          [
            rfH('A/O', 'Grants you a mandate to act for your organization'),
            rfA('Request cross-organization sharing', 'The request goes to the Programme Administrators.'),
            rfA('Chat in your spaces; report a concern'),
          ],
        ],
      ],
    },
    O: {
      lead: 'Runs the organization’s programme: invitations, role approvals, configuration, oversight of Circles and aggregate reporting.',
      side: ['Aggregate insight'],
      phases: [
        ['Account & access', 'Invitation, approval and sign-in', rfAccess('O')],
        [
          'Organization workspace',
          'People and roles',
          [
            rfA('Invite users', 'Participant, Facilitator, Mentor, Partner or Organization Representative, in your own programme only.'),
            rfH('P/F/M/C/O', 'The invitee accepts and creates an account, or adds the role to an existing one', 'Facilitator, Mentor, Partner and Organization Representative roles then wait for approval.'),
            rfD('A role is waiting for approval', [rfB('Approve', [rfY('Role active; person notified')]), rfB('Decline', [rfY('“Role not activated”')], 'end')]),
            rfA('Deactivate or reactivate roles, set role end dates, grant mandates, assign specialist bundles', 'High-trust bundles (Finance, AI, Trust/Data, Incident/Safety) stay with the Programme Administrator.'),
          ],
        ],
        [
          'Organization workspace',
          'Configuration and growth',
          [
            rfA('Configure the programme', 'Circle and Rope Team labels, optional Purpose Compass questions, whether participants may propose an ' + W + ', Circle and ' + W + ' templates.'),
            rfA('Request a new cohort', 'The Platform Administrator is notified.'),
            rfA('Create an institutional ' + W),
          ],
        ],
        [
          'Circles',
          'Oversight of Circles',
          [
            rfH('F/A', 'A project is accepted by its Steward or a Programme Administrator'),
            rfA('Create a Circle for any accepted project without one', 'You join as Facilitator; the project owner is the Project owner.'),
            rfA('Oversee every Circle in your programme', 'Manage members, sessions, decisions and polls, and pause a Circle for repair.'),
            rfS('End: programme running; continue from My PHOENIX'),
          ],
        ],
        [
          'Reports',
          'Aggregate insight',
          [
            rfA('View projects and spaces, approved evidence and released Learning Harvests', 'Aggregate only; no item details.'),
            rfA('Reports and exports, metrics, audit log for your programme'),
            rfA('Request institution seats or packages', 'The Finance Owner is notified.'),
            rfA('Request cross-organization sharing'),
          ],
        ],
      ],
    },
    S: {
      lead: 'Discovers accepted projects, funds them in stage-wise tranches and follows approved outcomes.',
      side: ['Evidence, initiatives and seats'],
      phases: [
        ['Account & access', 'Registration, sign-in and onboarding', rfAccess('S')],
        [
          'Funding',
          'Find projects to fund',
          [
            rfA('Discover accepted projects', '“Matching my interests” is on by default; remove the filter to see every eligible project. Briefs show only funder-released evidence.'),
            rfH('P', 'Project owners send you pitches'),
            rfD('What do you do?', [
              rfB('Fund it', [rfA('Request funding in three tranches', 'Circle, Rope Team and ' + W + '.')]),
              rfB('Save or decline', [rfY('Declining notifies the owner')], 'end'),
              rfB('Message the owner', [rfA('Direct message about this project')], 'Decide later'),
            ]),
          ],
        ],
        [
          'Funding',
          'Commitment and tranches',
          [
            rfH('A', 'Finance Owner approves the request'),
            rfA('Sign the agreement', 'The owner is notified.'),
            rfA('Release a tranche', 'Only when the project has reached that tranche’s stage and the previous summary was accepted.'),
            rfH('P', 'Owner submits a progress summary'),
            rfD('Your answer', [rfB('Accept summary', [rfY('Next tranche can be released; after the third, funding is fully released')]), rfB('Put on hold with a reason', [rfH('P', 'Owner updates the summary')], 'Your answer')]),
            rfS('End: funding fully released'),
          ],
        ],
        [
          'Outcomes',
          'Evidence, initiatives and seats',
          [
            rfA('See approved evidence released for funders', 'Aggregated; small groups are hidden.'),
            rfH('A', 'Programme Administrator publishes sponsor initiatives'),
            rfA('Buy seat pools by invoice and assign seats to participants', 'A Finance Owner activates the pool.'),
            rfA('Metrics (aggregate); report a concern'),
          ],
        ],
      ],
    },
    A: {
      lead: 'Runs the programme: people and roles, reviewer and Steward assignment, releases, resources, payments and reports.',
      side: ['Programme content', 'Evidence, records and ' + W + 's', 'Products and payments', 'Safety, metrics and audit'],
      phases: [
        ['Account & access', 'Invitation and sign-in with two-step code', rfAccess('A')],
        [
          'Programme admin',
          'Review requests',
          [
            rfH('P', 'A project is submitted'),
            rfA('Assign one reviewer', 'An active Facilitator / Steward in the programme. Fixed once assigned.'),
            rfH('F', 'The reviewer (Steward) requests clarification, accepts with a support path, or rejects', 'You can follow and post in the review conversation.'),
            rfA('Decide on any project when needed', 'Administrators can also request clarification, accept with a support path, reject and give final approval.'),
            rfH('P', 'A pathway is waiting for a Steward'),
            rfA('Assign or change the pathway’s Steward', 'Then follow the pathway conversation in Messages → Pathways.'),
          ],
        ],
        [
          'Programme admin',
          'Users and invitations',
          [
            rfA('Invite users', 'Single or bulk (up to 1,000 emails), any role except Platform Administrator. Resend or revoke.'),
            rfD('A role is waiting for approval', [rfB('Approve', [rfY('Role active; person notified')]), rfB('Decline', [rfY('“Role not activated”')], 'end')]),
            rfA('Add, edit or delete users', 'Users you add are active at once.'),
            rfA('Manage roles', 'Deactivate or activate, set end dates, assign specialist bundles, grant mandates.'),
            rfS('End: programme running; continue from My PHOENIX'),
          ],
        ],
        [
          'Programme admin',
          'Programme content',
          [
            rfA('Pathway library: approve, retire or add templates'),
            rfA('Send announcements; publish sponsor initiatives'),
            rfA('Resolve support queries and privacy requests'),
            rfA('Resources: add, publish, unpublish or reject suggestions'),
          ],
        ],
        [
          'Releases',
          'Evidence, records and ' + W + 's',
          [
            rfH('P', 'Owner authorises funder release of approved evidence'),
            rfD('Release decision', [rfB('Release', [rfY('Visible to sponsors')]), rfB('Withhold', [rfY('Owner notified')], 'end')]),
            rfA('Approve Learning Harvest releases to funders and repository deletions'),
            rfA('Activate or decline proposed ' + W + 's; oversee every ' + W),
          ],
        ],
        [
          'Payments',
          'Products and payments',
          [
            rfH('S', 'A sponsor requests funding for a project'),
            rfA('Approve sponsor funding requests', 'Needs the Finance Owner bundle. The sponsor then signs the agreement.'),
            rfA('Draft products, grant or revoke entitlements, create seat pools'),
            rfA('Release or retire products, activate invoiced seat pools, reconcile payments', 'Needs the Finance Owner bundle.'),
          ],
        ],
        [
          'Oversight',
          'Safety, metrics and audit',
          [
            rfA('Handle incidents (Incident/Safety Owner bundle)', 'Triage, review, record decision, close or reopen; emergency pause of a Circle.'),
            rfA('Reports and exports, metrics, audit log'),
          ],
        ],
      ],
    },
    T: {
      lead: 'Runs the platform: organizations, roles, policies, Purpose Compass and technical operations. No access to programme content.',
      side: ['Roles, agreements and Purpose Compass', 'Technical operations'],
      phases: [
        ['Account & access', 'Provisioned account with two-step code', rfAccess('T')],
        [
          'Organizations',
          'Organizations and programme administrators',
          [
            rfA('Create or edit an organization', 'Its programme is created if missing, and the default policies are copied in.'),
            rfY('Pre-approved invitation to the named admin'),
            rfH('A', 'The admin accepts and runs the programme'),
            rfA('Suspend or reactivate an organization'),
            rfS('End: the organization’s programme is running'),
          ],
        ],
        [
          'Roles & policies',
          'Roles, agreements and Purpose Compass',
          [
            rfA('Create roles and set their module permissions and approval rule'),
            rfA('Draft and publish a new policy version'),
            rfY('Everyone it applies to accepts the new version at their next sign-in'),
            rfA('Manage Purpose Compass questions'),
          ],
        ],
        [
          'Operations',
          'Technical operations',
          [
            rfA('Integrations, security events, health and alerts, storage and backups, LMS deep links'),
            rfA('Audit log across the platform'),
            rfY('No access to participant or project content'),
          ],
        ],
      ],
    },
  };
}

// ---- the cross-role view: one project from submission to closure, with who acts at each step
function rfOverview() {
  const W = WL();
  return [
    ['Access', 'Everyone joins', [rfS('Start: people join PHOENIX'), rfH('P/S', 'Participants and Sponsors register directly'), rfH('F/M/C/O/A', 'Other roles join by invitation; sensitive roles wait for approval'), rfH('A/O', 'Approve roles'), rfH('T', 'Creates organizations and names their Programme Administrators')]],
    ['Projects', 'Submission and review', [rfH('P', 'Creates the project, reviews 8 sections, submits'), rfH('A', 'Assigns one reviewer (the Steward)'), rfD('Steward decides (or a Programme Administrator)', [rfB('Clarify', [rfH('P', 'Replies or resubmits')], 'Decide again'), rfB('Reject', [rfY('Project rejected')], 'end'), rfB('Accept + support path', [rfY('Accepted')])])]],
    ['Circles', 'Circle', [rfH('P/F', 'Owner or Steward creates the Circle'), rfH('*', 'Members discuss, record and vote'), rfH('P/F', 'Owner or Steward raises a Mentor Request (Rope Team path)')]],
    ['Rope Teams', 'Rope Team', [rfH('M', 'Mentor accepts; Rope Team formed'), rfH('M', 'Mentor reviews work and finalises requirements')]],
    [W + 's', W, [rfH('P', 'Owner creates the ' + W), rfH('*', 'Members deliver tasks and link evidence to milestones'), rfH('F', 'Steward reviews evidence and validates milestones')]],
    ['Final review', 'Closure', [rfH('P', 'Owner submits final deliverables'), rfH('F', 'Steward approves (or requests changes)'), rfS('End: project closed')]],
    ['Alongside', 'Supporting flows', [rfH('S', 'Sponsor funds in tranches; owner reports progress'), rfH('C', 'Partner joins through a Steward-approved match'), rfH('A', 'Programme Administrator releases evidence and Harvests to funders'), rfH('F', 'Steward approves pathways that the Programme Administrator assigns')]],
  ];
}

// ---- rendering
function rfNode(n) {
  if (n.k === 'd')
    return `<li class="rfl-n rfl-d"><div class="rfl-dq"><span class="rfl-dia" aria-hidden="true">${ic('question', 14)}</span><b>${h(n.q)}</b>${n.n ? `<span class="cap">${h(n.n)}</span>` : ''}</div><div class="rfl-brs" role="group" aria-label="${h(n.q)}">${n.br
      .map(
        b =>
          `<div class="rfl-br"><span class="rfl-bl">${h(b.l)}</span>${b.nodes.length ? `<ol class="rfl-flow rfl-sub">${b.nodes.map(rfNode).join('')}</ol>` : ''}<span class="rfl-out ${b.out === 'end' ? 'is-end' : b.out === 'cont' ? 'is-cont' : 'is-to'}">${b.out === 'end' ? ic('x', 12) + 'Path ends' : b.out === 'cont' ? ic('arrow', 12) + 'Continues' : ic(/^Skips/.test(b.out) ? 'arrow' : 'refresh', 12) + h(b.out)}</span></div>`,
      )
      .join('')}</div></li>`;
  const icn = { s: 'flag', a: 'user', h: 'users', y: 'settings', g: 'arrow' }[n.k];
  return `<li class="rfl-n rfl-${n.k}"><span class="rfl-ic" aria-hidden="true">${ic(icn, 14)}</span><div class="rfl-b">${n.k === 'h' ? `<div class="rfl-who">${rfChip(n.r)}</div>` : ''}<b>${h(n.t)}</b>${n.n ? `<span class="cap">${h(n.n)}</span>` : ''}</div></li>`;
}
// Every other role this role hands off to or waits for, in role order.
const rfPartners = (phases, self) => {
  const seen = new Set();
  const walk = ns =>
    ns.forEach(n => {
      if (n.k === 'h') n.r.split('/').forEach(x => x !== self && RF_ORDER.includes(x) && seen.add(x));
      if (n.k === 'd') n.br.forEach(b => walk(b.nodes));
    });
  phases.forEach(p => walk(p[2]));
  return RF_ORDER.filter(x => seen.has(x));
};
// What the role can open, from the live role record (Role management) or the default matrix.
function rfAccessTable(c) {
  const rec = roleRec(c);
  const rows = Object.keys(MODULES)
    .map(m => [MODULES[m][0], (rec && rec.perms ? rec.perms[m] : (MX[m] || {})[c]) || '-'])
    .filter(([, v]) => v !== '-');
  return table(['Module', 'Access'], rows.map(([l, v]) => [h(l), h(permText(v))]), 'No module access.');
}
const rfLegend = () =>
  `<ul class="rfl-legend" aria-label="Legend">${[
    ['s', 'flag', 'Start or end'],
    ['a', 'user', 'This role acts'],
    ['h', 'users', 'Another role acts'],
    ['y', 'settings', 'PHOENIX does it'],
    ['d', 'question', 'Decision'],
    ['g', 'arrow', 'Moves on'],
  ]
    .map(([k, i, l]) => `<li class="rfl-lg rfl-${k}"><span class="rfl-ic" aria-hidden="true">${ic(i, 12)}</span>${l}</li>`)
    .join('')}</ul>`;

// ---- one role's data: its phases, which of them run alongside the main path, and its summary
function rfData(cur) {
  if (cur === 'all') return { phases: rfOverview(), side: new Set(['Supporting flows']), self: null, lead: 'One project from submission to closure, with the role that acts at each step.' };
  const f = rfFlows()[cur];
  return { phases: f.phases, side: new Set(f.side || []), self: cur, lead: f.lead };
}
const rfSlug = c => (c === 'all' ? 'all-roles' : rfName(c).toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, ''));

// ---- flowchart diagram (SVG). The same data drawn as one connected end-to-end flowchart: the main path runs
// top to bottom from start to end; phases that run alongside it are drawn below as separate flows.
// Fixed colours so the diagram and its exported image look the same in light and dark mode.
const RFX = {
  font: "'Atkinson Hyperlegible Next', 'Segoe UI', Arial, sans-serif",
  ink: '#17221e',
  ink2: '#4f5d57',
  ink3: '#76847e',
  edge: '#7d8c86',
  band: '#f5f8f6',
  bandLine: '#dfe6e2',
  self: ['#1f6450', '#ffffff', '#cfe6dc'],
  sys: ['#eef1ef', '#c9d3ce', '#4f5d57'],
  go: ['#fdeee6', '#e8b39a', '#9a3a12'],
  term: ['#0f2e25', '#ffffff'],
  dec: ['#fff6e0', '#d9a21b', '#5c3d00'],
  end: ['#fdeeee', '#b4232a'],
  loop: ['#ebf3fc', '#1e5aa8'],
  role: { P: ['#e3f1eb', '#1f6450'], F: ['#f4eef8', '#6e4592'], M: ['#e6f4f5', '#0f6f7a'], C: ['#eef0f6', '#46557f'], O: ['#ebf3fc', '#1e5aa8'], S: ['#fff6e0', '#8a5a00'], A: ['#fdeee6', '#b4471a'], T: ['#eef0f1', '#4f5d57'], '*': ['#eef0f1', '#4f5d57'] },
};
const RFX_NW = 280; // node width
const RFX_GAP = 26; // vertical gap between steps
const rfxWrap = (t, n) => {
  const out = [];
  let cur = '';
  String(t)
    .split(/\s+/)
    .filter(Boolean)
    .forEach(w => {
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= n) cur += ' ' + w;
      else {
        out.push(cur);
        cur = w;
      }
    });
  if (cur) out.push(cur);
  return out;
};
const rfxText = (x, y, lines, o) =>
  lines
    .map(
      (l, i) =>
        `<text x="${x}" y="${y + i * o.lh}" font-size="${o.fs}"${o.bold ? ' font-weight="700"' : ''} fill="${o.fill}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.ls ? ` letter-spacing="${o.ls}"` : ''}>${h(l)}</text>`,
    )
    .join('');
const rfxArrow = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${RFX.edge}" stroke-width="1.5" fill="none" marker-end="url(#rfx-ah)"/>`;
const rfxLine = pts => `<path d="M${pts.map(p => p.join(' ')).join('L')}" stroke="${RFX.edge}" stroke-width="1.5" fill="none"/>`;
const rfxPill = (cx, y, t, [bg, fg]) => {
  const w = Math.round(t.length * 6.6 + 22);
  return { w, svg: `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="22" rx="11" fill="${bg}" stroke="${fg}" stroke-width="1"/><text x="${cx}" y="${y + 15}" font-size="11.5" font-weight="700" fill="${fg}" text-anchor="middle">${h(t)}</text>` };
};
// A step box: header line (who acts), title, optional note.
function rfxNode(n, self) {
  if (n.k === 's') {
    const lines = rfxWrap(n.t, 34);
    const w = Math.min(RFX_NW, Math.max(150, Math.max(...lines.map(l => l.length)) * 7.6 + 40));
    const hh = 18 + lines.length * 17;
    return {
      w,
      h: hh,
      exit: !/^End/.test(n.t),
      draw: (cx, y) => `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${hh}" rx="${hh / 2}" fill="${RFX.term[0]}"/>${rfxText(cx, y + 22, lines, { fs: 13, lh: 17, bold: 1, fill: RFX.term[1], anchor: 'middle' })}`,
    };
  }
  const roles = n.k === 'h' ? n.r.split('/') : [];
  const head =
    n.k === 'a' ? (self ? rfName(self) : 'This role') : n.k === 'h' ? roles.map(x => (x === '*' ? 'Space members' : rfName(x))).join(' · ') : n.k === 'y' ? 'PHOENIX (automatic)' : 'Next';
  const [bg, bd, fg, hd, nt] =
    n.k === 'a'
      ? [RFX.self[0], RFX.self[0], RFX.self[1], RFX.self[2], RFX.self[2]]
      : n.k === 'h'
        ? [...(RFX.role[roles[0]] || RFX.role['*']), RFX.ink, (RFX.role[roles[0]] || RFX.role['*'])[1], RFX.ink2]
        : n.k === 'y'
          ? [RFX.sys[0], RFX.sys[1], RFX.ink, RFX.sys[2], RFX.ink2]
          : [RFX.go[0], RFX.go[1], RFX.go[2], RFX.go[2], RFX.go[2]];
  const hl = rfxWrap(head.toUpperCase(), 40);
  const tl = rfxWrap(n.t, 34);
  const nl = n.n ? rfxWrap(n.n, 42) : [];
  const hh = 12 + hl.length * 13 + 4 + tl.length * 17 + (nl.length ? 4 + nl.length * 14.5 : 0) + 10;
  return {
    w: RFX_NW,
    h: Math.round(hh),
    exit: true,
    draw: (cx, y) => {
      const x = cx - RFX_NW / 2 + 12;
      let yy = y + 22;
      let out = `<rect x="${cx - RFX_NW / 2}" y="${y}" width="${RFX_NW}" height="${Math.round(hh)}" rx="8" fill="${bg}" stroke="${bd}" stroke-width="1.5"${n.k === 'h' ? ' stroke-dasharray="5 3"' : ''}/>`;
      out += rfxText(x, yy, hl, { fs: 9.5, lh: 13, bold: 1, fill: hd, ls: 0.6 });
      yy += hl.length * 13 + 6;
      out += rfxText(x, yy, tl, { fs: 13, lh: 17, bold: 1, fill: fg });
      yy += tl.length * 17 + 1;
      if (nl.length) out += rfxText(x, yy, nl, { fs: 11, lh: 14.5, fill: nt });
      return out;
    },
  };
}
// A decision: diamond, branch labels on the drops, branches side by side, continuing branches merge below.
function rfxDecision(n, self) {
  const ql = rfxWrap(n.q, 22);
  const DW = 230;
  const DH = Math.max(86, ql.length * 15 + 46);
  const nl = n.n ? rfxWrap(n.n, 48) : [];
  const NH = nl.length ? nl.length * 14 + 8 : 0;
  const brs = n.br.map(b => {
    const seq = rfxSeq(b.nodes, self);
    const lab = rfxPill(0, 0, b.l, RFX.dec.slice(0, 1).concat(RFX.dec[2]));
    const outT = b.out === 'end' ? 'Path ends' : b.out === 'cont' ? '' : (/^Skips/.test(b.out) ? '→ ' : '↺ ') + b.out;
    const outW = outT ? Math.round(outT.length * 6.6 + 22) : 0;
    return { b, seq, w: Math.max(seq.w, lab.w, outW, 160), outT };
  });
  const BG = 28;
  const brW = brs.reduce((a, x) => a + x.w, 0) + BG * (brs.length - 1);
  const w = Math.max(DW, brW, nl.length ? 340 : 0);
  const busY = DH + NH + 16;
  const topB = busY + 50;
  const bottoms = brs.map(x => x.seq.h + (x.outT ? 34 : 0));
  const maxB = topB + Math.max(...bottoms);
  const cont = brs.filter(x => x.b.out === 'cont' && x.seq.exit);
  const mergeY = maxB + 22;
  return {
    w,
    h: cont.length ? mergeY : maxB,
    exit: cont.length > 0,
    draw: (cx, y) => {
      let out = `<polygon points="${cx},${y} ${cx + DW / 2},${y + DH / 2} ${cx},${y + DH} ${cx - DW / 2},${y + DH / 2}" fill="${RFX.dec[0]}" stroke="${RFX.dec[1]}" stroke-width="1.5"/>`;
      out += rfxText(cx, y + DH / 2 - ((ql.length - 1) * 15) / 2 + 5, ql, { fs: 12.5, lh: 15, bold: 1, fill: RFX.dec[2], anchor: 'middle' });
      if (nl.length) out += rfxText(cx, y + DH + 16, nl, { fs: 11, lh: 14, fill: RFX.ink2, anchor: 'middle' });
      let x = cx - brW / 2;
      const centers = brs.map(b => {
        const c = x + b.w / 2;
        x += b.w + BG;
        return c;
      });
      out += rfxLine([
        [cx, y + DH],
        [cx, y + busY],
      ]);
      if (brs.length > 1)
        out += rfxLine([
          [centers[0], y + busY],
          [centers[centers.length - 1], y + busY],
        ]);
      brs.forEach((b, i) => {
        const c = centers[i];
        out += rfxArrow(c, y + busY, c, y + topB - 2);
        out += rfxPill(c, y + busY + 12, b.b.l, [RFX.dec[0], RFX.dec[2]]).svg;
        out += b.seq.draw(c, y + topB);
        const sb = y + topB + b.seq.h;
        if (b.outT) {
          if (b.seq.exit) out += rfxLine([[c, sb], [c, sb + 12]]);
          out += rfxPill(c, sb + 12, b.outT, b.b.out === 'end' ? RFX.end : /^Skips/.test(b.b.out) ? [RFX.go[0], RFX.go[2]] : RFX.loop).svg;
        } else if (b.seq.exit) {
          out += rfxLine([
            [c, sb],
            [c, y + mergeY],
            [cx, y + mergeY],
          ]);
        }
      });
      if (cont.length) out += `<circle cx="${cx}" cy="${y + mergeY}" r="3.5" fill="${RFX.edge}"/>`;
      return out;
    },
  };
}
// A sequence of steps joined by arrows.
function rfxSeq(nodes, self) {
  const items = nodes.map(n => (n.k === 'd' ? rfxDecision(n, self) : rfxNode(n, self)));
  const w = Math.max(RFX_NW, ...items.map(i => i.w));
  const h = items.reduce((a, i) => a + i.h, 0) + RFX_GAP * Math.max(0, items.length - 1);
  return {
    w,
    h,
    exit: items.length ? items[items.length - 1].exit : true,
    draw: (cx, y) => {
      let out = '';
      items.forEach((it, i) => {
        out += it.draw(cx, y);
        y += it.h;
        if (i < items.length - 1) {
          if (it.exit) out += rfxArrow(cx, y, cx, y + RFX_GAP - 2);
          y += RFX_GAP;
        }
      });
      return out;
    },
  };
}
// The whole diagram for one role (or 'all'): title, legend, main path in phase bands, alongside flows below.
function rfxDiagram(cur) {
  const d = rfData(cur);
  const M = 32;
  const main = d.phases.filter(p => !d.side.has(p[1])).map(p => ({ p, seq: rfxSeq(p[2], d.self) }));
  const side = d.phases.filter(p => d.side.has(p[1])).map(p => ({ p, seq: rfxSeq(p[2], d.self) }));
  side.forEach(s => (s.w = Math.max(340, s.seq.w + 48)));
  const mainW = Math.max(...main.map(m => m.seq.w)) + 280;
  const W = Math.round(Math.max(1100, mainW + 2 * M, ...side.map(s => s.w + 2 * M)));
  const cx = W / 2;
  const title = cur === 'all' ? 'How the roles work together' : rfName(cur);
  const leadL = rfxWrap(d.lead, Math.floor((W - 2 * M) / 7.4));
  let y = M;
  let out = `<text x="${M}" y="${y + 12}" font-size="12" font-weight="700" letter-spacing="1.2" fill="${RFX.ink3}">PHOENIX · ROLE FLOW</text>`;
  out += `<text x="${M}" y="${y + 42}" font-size="26" font-weight="700" fill="${RFX.ink}">${h(title)}</text>`;
  out += rfxText(M, y + 68, leadL, { fs: 14, lh: 19, fill: RFX.ink2 });
  y += 68 + leadL.length * 19 + 6;
  // legend
  const leg = [
    ['Start / end', RFX.term[0], RFX.term[0], 'pill'],
    [cur === 'all' ? 'Role acts' : 'This role acts', RFX.self[0], RFX.self[0]],
    ['Another role acts', RFX.role.F[0], RFX.role.F[1], 'dash'],
    ['PHOENIX does it', RFX.sys[0], RFX.sys[1]],
    ['Next', RFX.go[0], RFX.go[1]],
    ['Decision', RFX.dec[0], RFX.dec[1], 'dia'],
    ['Path ends', RFX.end[0], RFX.end[1], 'pill'],
    ['Loops back', RFX.loop[0], RFX.loop[1], 'pill'],
  ];
  let lx = M;
  leg.forEach(([l, bg, bd, shape]) => {
    const sw =
      shape === 'dia'
        ? `<polygon points="${lx + 9},${y + 2} ${lx + 18},${y + 10} ${lx + 9},${y + 18} ${lx},${y + 10}" fill="${bg}" stroke="${bd}" stroke-width="1.5"/>`
        : `<rect x="${lx}" y="${y + 3}" width="18" height="14" rx="${shape === 'pill' ? 7 : 3}" fill="${bg}" stroke="${bd}" stroke-width="1.5"${shape === 'dash' ? ' stroke-dasharray="3 2"' : ''}/>`;
    out += sw + `<text x="${lx + 25}" y="${y + 15}" font-size="12" fill="${RFX.ink2}">${h(l)}</text>`;
    lx += 25 + l.length * 6.6 + 22;
  });
  y += 40;
  // main path
  out += `<text x="${M}" y="${y + 14}" font-size="13" font-weight="700" letter-spacing="1" fill="${RFX.ink}">MAIN PATH · START TO END</text>`;
  y += 28;
  let prevExit = null;
  main.forEach((m, i) => {
    const bh = 54 + m.seq.h + 26;
    out += `<rect x="${M}" y="${y}" width="${W - 2 * M}" height="${bh}" rx="12" fill="${RFX.band}" stroke="${RFX.bandLine}"/>`;
    out += `<circle cx="${M + 26}" cy="${y + 27}" r="13" fill="${RFX.self[0]}"/><text x="${M + 26}" y="${y + 32}" font-size="12.5" font-weight="700" fill="#fff" text-anchor="middle">${i + 1}</text>`;
    out += `<text x="${M + 48}" y="${y + 22}" font-size="10.5" font-weight="700" letter-spacing="0.8" fill="${RFX.ink3}">${h(m.p[0].toUpperCase())}</text><text x="${M + 48}" y="${y + 39}" font-size="15" font-weight="700" fill="${RFX.ink}">${h(m.p[1])}</text>`;
    const top = y + 54;
    if (prevExit != null) out += rfxArrow(cx, prevExit, cx, top - 2);
    out += m.seq.draw(cx, top);
    prevExit = m.seq.exit ? top + m.seq.h : null;
    y += bh + (i < main.length - 1 ? 18 : 0);
  });
  // alongside flows, packed in rows
  if (side.length) {
    y += 40;
    out += `<text x="${M}" y="${y + 14}" font-size="13" font-weight="700" letter-spacing="1" fill="${RFX.ink}">ALONGSIDE THE MAIN PATH</text>`;
    out += `<text x="${M}" y="${y + 34}" font-size="12.5" fill="${RFX.ink2}">${h(cur === 'all' ? 'Flows that run in parallel with the project.' : 'These run in parallel with the main path, whenever they are needed.')}</text>`;
    y += 50;
    const rows = [];
    side.forEach(s => {
      const r = rows[rows.length - 1];
      if (r && r.w + 20 + s.w <= W - 2 * M) {
        r.items.push(s);
        r.w += 20 + s.w;
      } else rows.push({ items: [s], w: s.w });
    });
    rows.forEach(r => {
      const rh = Math.max(...r.items.map(s => 54 + s.seq.h + 26));
      let x = M;
      r.items.forEach(s => {
        out += `<rect x="${x}" y="${y}" width="${s.w}" height="${rh}" rx="12" fill="${RFX.band}" stroke="${RFX.bandLine}"/>`;
        out += `<text x="${x + 18}" y="${y + 22}" font-size="10.5" font-weight="700" letter-spacing="0.8" fill="${RFX.ink3}">${h(s.p[0].toUpperCase())}</text><text x="${x + 18}" y="${y + 39}" font-size="15" font-weight="700" fill="${RFX.ink}">${h(s.p[1])}</text>`;
        out += s.seq.draw(x + s.w / 2, y + 54);
        x += s.w + 20;
      });
      y += rh + 20;
    });
    y -= 20;
  }
  y += 36;
  out += `<text x="${M}" y="${y}" font-size="11.5" fill="${RFX.ink3}">Based on the PHOENIX prototype’s current rules · ${h(fmt(today()))}</text>`;
  const H = Math.round(y + 24);
  return {
    w: W,
    h: H,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${h(RFX.font)}" role="img" aria-label="${h('Flowchart: ' + title)}"><defs><marker id="rfx-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${RFX.edge}"/></marker></defs><rect width="${W}" height="${H}" fill="#ffffff"/>${out}</svg>`,
  };
}
// Draw a diagram onto a canvas and return a PNG data URL (used by "Download image" and the image export).
function rfxPng(cur, scale = 2) {
  const dg = rfxDiagram(cur);
  const sc = Math.min(scale, 16000 / dg.h, 16000 / dg.w);
  return new Promise((ok_, bad) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.round(dg.w * sc);
      c.height = Math.round(dg.h * sc);
      const x = c.getContext('2d');
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, c.width, c.height);
      x.scale(sc, sc);
      x.drawImage(img, 0, 0, dg.w, dg.h);
      ok_(c.toDataURL('image/png'));
    };
    img.onerror = bad;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(dg.svg);
  });
}

// ---- the page
const rfPhase = ([mod, title, nodes], i, side) =>
  `<section class="rfl-phase" id="rfl-ph-${i}" aria-labelledby="rfl-ph-${i}-t"><header class="rfl-ph-h"><span class="rfl-num">${i + 1}</span><div><span class="rfl-mod">${h(mod)}${side ? ' · runs alongside the main path' : ''}</span><h2 class="h3" id="rfl-ph-${i}-t">${h(title)}</h2></div></header><ol class="rfl-flow">${nodes.map(rfNode).join('')}</ol></section>`;
PUB.roleflow = () => {
  const flows = rfFlows();
  const cur = UI.rf && (UI.rf === 'all' || flows[UI.rf]) ? UI.rf : 'all';
  const view = UI.rfView === 'steps' ? 'steps' : 'chart';
  const tab = (id, l) => `<button type="button" role="tab" class="rfl-tab ${cur === id ? 'on' : ''}" aria-selected="${cur === id}" data-a="rfRole" data-v="${id}">${l}</button>`;
  const d = rfData(cur);
  const phases = d.phases;
  const partners = cur === 'all' ? [] : rfPartners(phases, cur);
  const intro =
    cur === 'all'
      ? `<div class="rfl-intro"><h2 class="h2">How the roles work together</h2><p class="sub">One project from submission to closure, with the role that acts at each step. Choose a role above for its complete journey.</p></div>`
      : `<div class="rfl-intro"><div class="rfl-intro-h"><span class="rfl-chip rfl-r-${cur} rfl-chip-lg">${h(rfName(cur))}</span></div><p class="sub">${h(d.lead)}</p>${partners.length ? `<div class="rfl-with"><span class="cap">Works with</span>${partners.map(rfChip).join('')}</div>` : ''}</div>`;
  const vbtn = (id, l, i) => `<button type="button" class="rfl-vb ${view === id ? 'on' : ''}" aria-pressed="${view === id}" data-a="rfView" data-v="${id}">${ic(i, 14)}${l}</button>`;
  const body =
    view === 'chart'
      ? `<div class="rfl-chart-bar"><p class="cap">The main path runs from start to end; flows that run alongside it are drawn below. Scroll to see the whole chart.</p>${B(ic('download', 14) + 'Download image', 'rfPng', { c: cur }, 'btn-s btn-sm')}</div><div class="rfl-chart" tabindex="0" aria-label="Flowchart, scrollable">${rfxDiagram(cur).svg}</div>`
      : `${rfLegend()}<nav class="rfl-jump" aria-label="Phases">${phases.map((p, i) => `<button type="button" class="rfl-jb" data-a="rfJump" data-i="${i}">${i + 1}. ${h(phases.filter(q => q[0] === p[0]).length > 1 ? p[1] : p[0])}</button>`).join('')}</nav><div class="rfl-phases">${phases.map((p, i) => rfPhase(p, i, d.side.has(p[1]))).join('')}</div>`;
  return `<div class="rfl-page"><header class="rfl-top"><div class="brand"><span class="mark">${MARK(20)}</span><span class="wm"><b>PHOENIX</b><span>Foundation Alpha</span></span></div><div class="row rfl-top-a">${B(ic('file', 14) + 'Print', 'rfPrint', {}, 'btn-s btn-sm')}${B(ic('chevl', 14) + 'Back to sign in', 'go', { r: 'login' }, 'btn-p btn-sm')}</div></header>
  <main class="rfl-main"><div class="rfl-head"><h1 class="h1">Role Flow</h1><p class="sub">How each role works in PHOENIX, from registration and sign-in to approvals and project completion. Based on the prototype’s current rules.</p></div>
  <div class="rfl-tabs" role="tablist" aria-label="Role">${tab('all', 'All roles')}${RF_ORDER.map(c => tab(c, h(rfName(c)))).join('')}</div>
  ${intro}<div class="rfl-views" role="group" aria-label="View">${vbtn('chart', 'Flowchart', 'steps')}${vbtn('steps', 'Step details', 'menu')}</div>
  ${body}
  ${cur === 'all' ? '' : `<section class="rfl-phase rfl-acc-wrap"><header class="rfl-ph-h"><span class="rfl-num">${ic('shield', 14)}</span><div><span class="rfl-mod">Permissions</span><h2 class="h3">What ${h(rfName(cur))} can open</h2></div></header><p class="cap">Read from the current role settings. Specialist bundles (Reviewer, Project Lead, Finance Owner, AI Owner, Incident/Safety Owner) add rights on top of the role and are assigned by a Programme Administrator.</p>${rfAccessTable(cur)}</section>`}
  </main></div>`;
};
A.rfRole = d => {
  UI.rf = d.v;
  render();
  window.scrollTo(0, 0);
};
A.rfView = d => {
  UI.rfView = d.v;
  render();
};
A.rfJump = d => document.getElementById('rfl-ph-' + d.i)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
A.rfPrint = () => window.print();
A.rfPng = d =>
  rfxPng(d.c)
    .then(url => {
      const a = document.createElement('a');
      a.download = 'role-flow-' + rfSlug(d.c) + '.png';
      a.href = url;
      a.click();
    })
    .catch(() => {
      toast('The image could not be created in this browser.', 'err');
      render();
    });
