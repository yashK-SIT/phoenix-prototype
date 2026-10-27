// ---------- ROLE FLOW: how each role works in PHOENIX, from invitation to the next action ----------
// Public page (signed out), opened from the sign-in screen. One flowchart per role plus a cross-role overview.
// The flows follow the WSS Build-Freeze review (doc 1 §6 role flows) as the prototype implements it. The module-access
// table is read live from the role records (Role management) or the default matrix, so it always matches the app.

// Node kinds: s = start/end · a = this role acts · h = another role acts · y = PHOENIX does it automatically
// d = decision with branches · g = moves to another module.
const rfS = (t) => ({ k: "s", t });
const rfA = (t, n) => ({ k: "a", t, n });
const rfY = (t, n) => ({ k: "y", t, n });
const rfH = (r, t, n) => ({ k: "h", r, t, n });
const rfD = (q, br, n) => ({ k: "d", q, br, n });
const rfG = (t) => ({ k: "g", t });
// A decision branch. out: 'cont' = the flow continues below, 'end' = this path stops, any other text = where it goes.
const rfB = (l, nodes, out = "cont") => ({ l, nodes, out });
const RF_ORDER = ["P", "F", "M", "C", "S", "A", "T"];
// Specialist bundles are capabilities attached to a person in a context, not personas. They appear as actors in
// the flows (the person holding the bundle acts) under these codes.
const RF_BUNDLE = {
  RV: "Reviewer",
};
const rfName = (c) => ROLE[c] || RF_BUNDLE[c] || c;
// Role chips: the base roles use the theme's wayfinding colours; '*' means "any member"; bundles are neutral.
const rfChip = (c) =>
  c
    .split("/")
    .map(
      (x) =>
        `<span class="rfl-chip rfl-r-${RF_ORDER.includes(x) ? x : "any"}">${x === "*" ? "Space members" : x === "SYS" ? "PHOENIX" : h(rfName(x)) + (RF_BUNDLE[x] ? " (bundle)" : "")}</span>`,
    )
    .join("");

// ---- shared: invitation (or access request), approval of sensitive roles, sign-in and onboarding for each role
function rfAccess(c) {
  const mfa = ["A", "T"].includes(c);
  const agr =
    {
      C: "partner agreement",
      S: "Sponsor agreement",
    }[c] || rfName(c) + " agreement";
  const gate =
    c === "P"
      ? rfG(
          "Onboarding continues: required agreement, optional permissions and the Purpose Compass (next phases)",
        )
      : rfY(
          "Onboarding gate",
          "Accept the required " +
            agr +
            " (download it or compare it with the previous version). Optional permissions are asked separately and never bundled into it; declining them never blocks the core.",
        );
  const signIn = [
    rfA(
      "Sign in with email and password" +
        (mfa ? ", then enter the two-step verification code" : ""),
      "Wrong details show an error; after 5 failed attempts the account is temporarily locked." +
        (mfa
          ? " The code is always required for Programme and Platform Administrators."
          : ""),
    ),
    gate,
    rfY(
      "Agreement updates",
      "When a new version of your agreement is published, a dialog shows it at sign-in. “Compare with previous policy” shows what changed. You accept to continue, or sign out.",
    ),
    rfY(
      "One identity, several roles",
      "Each role assignment is tied to a programme or organisation context. Switching role or context rebuilds the menu, counts and notifications. A role with an end date expires until it is renewed.",
    ),
  ];
  if (c === "T")
    return [
      rfS("Start: a Platform Administrator account is provisioned for you"),
      rfY(
        "No self-registration or invitation",
        "Invitations can grant every role except Platform Administrator, so this account is set up outside the sign-up flows. Two-step verification is mandatory.",
      ),
      ...signIn,
      rfG("Platform operations"),
    ];
  const inviter = c === "A" ? "A/T" : "A/O";
  const start =
    c === "P" || c === "S"
      ? [
          rfS("Start: open PHOENIX"),
          rfD("Do you have an invitation link?", [
            rfB("No", [
              rfA(
                "Request access",
                "Name, email, programme and a short reason. This does not create an account.",
              ),
              rfD("Organization Admin decides", [
                rfB("Approve", [rfY("A normal single-use invitation is sent")]),
                rfB("Decline", [rfY("Nothing is created")], "end"),
              ]),
            ]),
            rfB("Yes", [
              rfH(
                inviter,
                "You were invited",
                "The invitation fixes your role, context (programme or organisation) and email.",
              ),
            ]),
          ]),
        ]
      : [
          rfS("Start: you receive an invitation"),
          rfH(
            inviter,
            c === "A"
              ? "A Platform Administrator names you as an organisation’s administrator, or an Organization Admin invites you"
              : "An Organization Admin invites you",
            "The invitation sets your role, context, link expiry and an optional role end date. No account exists before an invitation.",
          ),
        ];
  const approval = c === "A"
    ? rfD(
        "Does the role need approval?",
        [
          c === "A" &&
            rfB("Pre-approved by the Platform Administrator", [
              rfY("Role active straight away"),
            ]),
          rfB("Yes (sensitive role)", [
            rfY(
              "“Your role is awaiting approval”",
              "Authorised approvers are notified.",
            ),
            rfD("Approver decides", [
              rfB("Approve role", [rfH("A", "Role becomes active")]),
              rfB(
                "Decline role",
                [
                  rfY(
                    "“Role not activated” with the approver’s note",
                    "The account still exists; other roles are unaffected.",
                  ),
                ],
                "end",
              ),
            ]),
          ]),
        ].filter(Boolean),
        "Only the sensitive Organization Admin role waits for approval.",
      )
    : rfY(
        "Role active straight away",
        rfName(c) +
          " activates without approval. Specialist bundles are approved separately.",
      );
  return [
    ...start,
    rfA(
      "Open the invitation link",
      "PHOENIX checks the link. Expired, withdrawn or used links stop here with a “Request a new invitation” form.",
    ),
    rfD("Does this email already have a PHOENIX account?", [
      rfB("No", [
        rfA(
          "Accept and create your account",
          "Role and email come from the invitation.",
        ),
        rfA("Verify your email"),
      ]),
      rfB("Yes", [
        rfY(
          "No second account",
          "The new role assignment is added to your existing identity.",
        ),
      ]),
    ]),
    approval,
    ...signIn,
  ];
}

// ---- the flows, phase by phase
function rfFlows() {
  const W = WL();
  const V = S.settings.voting;
  return {
    P: {
      lead:
        "Learner or practitioner. Agrees to the core service, chooses optional permissions, sets a purpose, accepts a pathway, and moves through Circles, Rope Teams and " +
        W +
        "s in whatever order fits, keeping control of their own profile.",
      side: ["Conversations, help and safety"],
      phases: [
        ["Authorize", "Invitation and sign-in", rfAccess("P")],
        [
          "Authorize",
          "Required agreement and optional permissions",
          [
            rfA(
              "Accept the required Participant agreement",
              "It covers only what the core service needs. Download it or compare it with the previous version.",
            ),
            rfY(
              "Optional permissions are asked separately",
              "Five purposes, each on its own: AI processing, research and evaluation, cross-organisation sharing, public or funder release, external-system exchange. None is bundled into the agreement.",
            ),
            rfD(
              "Your choice for each purpose",
              [
                rfB("Allow", [rfY("Used for that purpose only")]),
                rfB("Do not allow", [
                  rfY(
                    "The core still works",
                    "Pathway, Circles, tasks and evidence stay available without it.",
                  ),
                ]),
              ],
              "You can change or withdraw each choice later.",
            ),
          ],
        ],
        [
          "Orient",
          "Minimum Purpose Compass",
          [
            rfA(
              "Answer the six Purpose Compass questions",
              "Short reflective questions inspired by IKIGAI.",
            ),
            rfY(
              "Never scored",
              "No rating or ranking is made from your answers. Organization Admins and Sponsors never see them.",
            ),
          ],
        ],
        [
          "Orient",
          "Accept a 3–5 step pathway",
          [
            rfD("Where does the pathway come from?", [
              rfB("Template or your own steps", [
                rfA("Choose a template or draft 3–5 steps"),
              ]),
              rfB("Recommended to you", [
                rfH(
                  "F/M",
                  "A Facilitator, Circle Steward or Mentor recommends a pathway",
                ),
              ]),
            ]),
            rfY(
              "Each step has a requirement type and rules",
              "Mandatory, Optional or Conditional (an explicit IF rule). Statuses are worked out at run time: Available, In progress, Pending review, Completed, Satisfied by prior evidence, Skipped – allowed, Blocked (with reason and next action).",
            ),
            rfD("Your answer", [
              rfB("Accept", [
                rfY(
                  "Pathway becomes current",
                  "Nothing becomes current without your acceptance.",
                ),
              ]),
              rfB(
                "Request a change",
                [rfH("F/M", "Revises and proposes again")],
                "Your answer",
              ),
            ]),
            rfA(
              "Work through the steps",
              "Complete a step, skip an optional one, answer a condition question, or select approved prior evidence — a Reviewer confirms it where the step needs review.",
            ),
          ],
        ],
        [
          "Connect",
          "Join or link a Circle or Rope Team, as relevant",
          [
            rfD("Which space helps now?", [
              rfB("A Circle", [
                rfA(
                  "Ask to join, accept an invitation, or propose one",
                  "Sessions, threaded discussion and equal voting.",
                ),
              ]),
              rfB("A Rope Team", [
                rfA("Join or link a Rope Team", "A small mentored team."),
              ]),
              rfB("Neither yet", [rfY("No mandatory sequence")]),
            ]),
            rfY(
              "Separate linked spaces",
              "Circle, Rope Team and " +
                W +
                " are entered in any valid order and linked to each other, never converted into one another.",
            ),
          ],
        ],
        [
          "Connect",
          "Opportunity, match or direct collaboration",
          [
            rfD("How do you find collaborators?", [
              rfB("Route A: PHOENIX match", [
                rfA("Publish an Opportunity Card, or express interest in one"),
                rfH(
                  "F",
                  "The assigned Steward reviews the Match Brief",
                  "Approve and request consent, ask for clarification, or close.",
                ),
                rfD("Both parties consent?", [
                  rfB("Yes", [rfY("Introduced")]),
                  rfB("No", [rfY("Match Brief closed")], "end"),
                ]),
              ]),
              rfB("Route B: direct", [
                rfA(
                  "Propose a direct authorised collaboration",
                  "Only with people you already share an authorised space or organisation with.",
                ),
              ]),
            ]),
            rfD("After the introduction", [
              rfB("Close", [], "end"),
              rfB("Continue conversation", [], "Decide later"),
              rfB("Link or create a workspace", [
                rfA("Link an existing " + W + " or create a new one"),
              ]),
            ]),
          ],
        ],
        [
          "Act",
          W + ": tasks",
          [
            rfA("Plan tasks and milestones with your collaborators"),
            rfD(
              "Does the assignee accept the task?",
              [
                rfB("Accept", [
                  rfY("Task begins", "To do → In progress → Review → Done."),
                ]),
                rfB("Decline", [rfY("Back to the task owner")], "Reassign"),
              ],
              "No task starts until the assignee accepts it.",
            ),
          ],
        ],
        [
          "Evidence",
          "Evidence: review, level, confidentiality and release",
          [
            rfA(
              "Add evidence",
              "File, link, reflection or record, linked to a task, milestone or space.",
            ),
            rfY(
              "Four things are tracked separately",
              "Review status, evidence level E0–E4, confidentiality, and lifecycle and release. Approving evidence never releases it.",
            ),
            rfD("A person with the Reviewer bundle reviews it", [
              rfB("Approved", [rfY("Level and limitations recorded")]),
              rfB(
                "Needs revision",
                [rfA("Revise and resubmit")],
                "Reviewed again",
              ),
              rfB("Rejected or insufficient", [rfY("Reason recorded")], "end"),
            ]),
            rfD("Release beyond the team?", [
              rfB("No", [rfY("Stays at its confidentiality level")]),
              rfB("Requested", [
                rfH(
                  "A",
                  "Decides the release",
                  "Needs your public or funder release permission. Small numbers are suppressed.",
                ),
              ]),
            ]),
          ],
        ],
        [
          "Learn",
          "Learning Harvest",
          [
            rfA(
              "Contribute to the Learning Harvest",
              "An AI draft is possible only if you allowed AI processing; a person completes the Harvest.",
            ),
            rfY(
              "Dissent and negative findings are kept",
              "They are not smoothed away.",
            ),
          ],
        ],
        [
          "Evolve",
          "Profile change candidate",
          [
            rfY(
              "Candidates arrive with provenance",
              "From completed steps, approved evidence and Harvests. Each shows where it came from.",
            ),
            rfD(
              "Your decision on each candidate",
              [
                rfB("Accept", [rfY("Added to your profile as a new version")]),
                rfB("Edit", [
                  rfA("Edit, then accept"),
                  rfY("Added with your wording"),
                ]),
                rfB("Reject", [rfY("Not added")], "end"),
              ],
              "Only you decide what changes on your profile.",
            ),
          ],
        ],
        [
          "Evolve",
          "Next action",
          [
            rfA(
              "Choose the next action",
              "Continue the pathway, join or link another space, update your Purpose Compass, or change a permission.",
            ),
            rfS("End: the loop starts again"),
          ],
        ],
        [
          "Messages & support",
          "Conversations, help and safety",
          [
            rfA(
              "Post in threaded discussions in your spaces",
              "Members of an active space post; Observers read only.",
            ),
            rfA("Ask PHOENIX", "Private help. Nothing changes on your record."),
            rfA("Report a concern"),
            rfH("A", "Triages, reviews and records a decision"),
            rfD("Accept the decision?", [
              rfB("Yes", [rfY("Case closed")], "end"),
              rfB("No", [rfA("Appeal")], "Reviewed again"),
            ]),
          ],
        ],
      ],
    },
    F: {
      lead:
        "Facilitator / Steward. Creates or approves Circles, runs sessions and threaded discussion, opens equal votes, reviews Match Briefs when assigned as Steward, and links Circles to " +
        W +
        "s and Learning Harvests.",
      side: ["Pathways and evidence"],
      phases: [
        ["Authorize", "Invitation and sign-in", rfAccess("F")],
        [
          "Connect",
          "Create or approve a Circle",
          [
            rfD("How does the Circle start?", [
              rfB("You create it", [
                rfA(
                  "Create the Circle",
                  "Name, purpose, outcome and agreement. You join as Facilitator.",
                ),
              ]),
              rfB("Someone proposes it", [
                rfH("P", "A participant proposes a Circle"),
                rfD("Your decision", [
                  rfB("Approve", [rfY("Circle active")]),
                  rfB("Decline", [rfY("Proposer told why")], "end"),
                ]),
              ]),
            ]),
            rfA(
              "Manage membership",
              "Invite, decide join requests, change roles, remove members.",
            ),
          ],
        ],
        [
          "Deliberate",
          "Sessions and threaded discussion",
          [
            rfA("Run sessions and record decisions and commitments"),
            rfA(
              "Moderate threaded discussion",
              "Asynchronous threads, not real-time chat.",
            ),
          ],
        ],
        [
          "Deliberate",
          "Proposals and equal voting",
          [
            rfA(
              "Open a proposal for a vote",
              "Threshold, quorum, voting window and reminders are configurable (now " +
                V.threshold +
                "% of eligible voters, " +
                V.quorum +
                "% quorum).",
            ),
            rfY(
              "One eligible member = one vote",
              "Equal weight for everyone. The AI source check is advisory only and never passes or fails a vote.",
            ),
            rfD("Result when the window closes", [
              rfB("Threshold and quorum met", [rfY("Decision recorded")]),
              rfB("Tie", [rfY("Returns to Shared for revision")], "Re-vote"),
              rfB("Not met", [rfY("Not adopted; recorded")]),
            ]),
          ],
        ],
        [
          "Connect",
          "Match Briefs (only if assigned as Steward)",
          [
            rfD("Are you the assigned Steward?", [
              rfB("Yes", [
                rfA("Review the Match Brief"),
                rfD("Your decision", [
                  rfB("Approve", [
                    rfH("P/C", "Both parties are asked for consent"),
                  ]),
                  rfB(
                    "Clarify",
                    [rfH("P/C", "Requester clarifies")],
                    "Decide again",
                  ),
                  rfB("Close", [rfY("Brief closed")], "end"),
                ]),
              ]),
              rfB("No", [rfY("Not in your queue")]),
            ]),
          ],
        ],
        [
          "Act",
          "Link or create an " + W,
          [
            rfA(
              "Link an existing " + W + " or create one from the Circle",
              "The spaces stay separate and linked; nothing is converted.",
            ),
            rfH("*", "Members accept and work on tasks"),
          ],
        ],
        [
          "Learn",
          "Learning Harvest",
          [
            rfA(
              "Contribute to or complete the Learning Harvest",
              "A person completes it; dissent and negative findings are kept.",
            ),
          ],
        ],
        [
          "Evolve",
          "Close or continue the Circle",
          [
            rfD("What next for the Circle?", [
              rfB("Continue", [rfY("Circle stays active")], "Back to sessions"),
              rfB("Close", [rfY("Circle closed; records kept")]),
            ]),
            rfS("End: Circle closed"),
          ],
        ],
        [
          "Records",
          "Pathways and evidence",
          [
            rfA(
              "Propose a pathway to a participant",
              "The participant accepts or requests a change.",
            ),
            rfD(
              "Approve evidence?",
              [
                rfB("With the Reviewer bundle", [
                  rfA("Review: status, level E0–E4 and limitations"),
                ]),
                rfB("Without it", [rfY("Comment only; a Reviewer decides")]),
              ],
              "Evidence approval needs the separate Reviewer bundle.",
            ),
          ],
        ],
      ],
    },
    M: {
      lead:
        "Mentor. Supports an assigned participant or Rope Team, recommends pathway changes and opportunities, and contributes to the assigned " +
        W +
        " — recommends, never approves.",
      side: ["Requests from another context"],
      phases: [
        ["Authorize", "Invitation and sign-in", rfAccess("M")],
        [
          "Connect",
          "Assigned participant or Rope Team",
          [
            rfH(
              "F",
              "A Facilitator / Steward raises a Mentor Request",
              "Named to you, or open to every mentor in the programme.",
            ),
            rfD("Your answer", [
              rfB("Accept", [
                rfY("You join the Rope Team or are linked to the participant"),
              ]),
              rfB(
                "Decline",
                [rfY("A named request is declined; an open one stays open")],
                "end",
              ),
            ]),
          ],
        ],
        [
          "Orient",
          "Check-ins and support",
          [
            rfA("Run check-ins and answer support requests"),
            rfA(
              "Keep protected mentor notes",
              "They never leave the Rope Team.",
            ),
          ],
        ],
        [
          "Orient",
          "Pathway recommendations",
          [
            rfD("What do you recommend?", [
              rfB("A pathway step or change", [rfA("Recommend pathway steps")]),
              rfB("Prior evidence covers a step", [
                rfA("Suggest prior evidence (a Reviewer confirms it)"),
              ]),
            ]),
            rfH(
              "P",
              "The participant accepts or declines",
              "Mentors recommend; only the participant makes it current.",
            ),
          ],
        ],
        [
          "Connect",
          "Suggest opportunities",
          [
            rfA("Suggest Opportunity Cards to the participant"),
            rfH("P", "The participant decides whether to express interest"),
          ],
        ],
        [
          "Act",
          "Contribute to the assigned " + W + " and Harvest",
          [
            rfA("Contribute to tasks in the assigned " + W),
            rfA("Contribute to its Learning Harvest"),
          ],
        ],
        [
          "Evolve",
          "Close or continue support",
          [
            rfD("What next?", [
              rfB("Continue", [rfY("Support continues")], "Back to check-ins"),
              rfB("Close", [rfY("Support closed")]),
            ]),
            rfS("End: support closed"),
          ],
        ],
        [
          "Context",
          "Requests from another context",
          [
            rfY(
              "Cross-context notice",
              "A request belonging to another programme or organisation asks you to switch to that context first.",
            ),
            rfA("Switch role or context, then answer it there"),
          ],
        ],
      ],
    },
    C: {
      lead: "Collaborator. Brings resources, expertise or opportunities through a Steward-reviewed match or a direct authorised collaboration, then contributes within a defined mandate.",
      side: [],
      phases: [
        [
          "Authorize",
          "Invitation, partner agreement and sign-in",
          rfAccess("C"),
        ],
        [
          "Connect",
          "Opportunity Card and match",
          [
            rfA(
              "Publish an Opportunity Card",
              "Need, Offer, Asset or Opportunity.",
            ),
            rfD("How does the collaboration start?", [
              rfB("Route A: PHOENIX match", [
                rfH("F", "The assigned Steward reviews the Match Brief"),
                rfD("Both parties consent?", [
                  rfB("Yes", [rfY("Introduced")]),
                  rfB("No", [rfY("Brief closed")], "end"),
                ]),
              ]),
              rfB("Route B: direct", [
                rfA(
                  "Direct authorised collaboration",
                  "Only with people you already share an authorised space or organisation with.",
                ),
              ]),
            ]),
          ],
        ],
        [
          "Connect",
          "After the introduction",
          [
            rfD("What do you do next?", [
              rfB("Close", [], "end"),
              rfB("Continue conversation", [], "Decide later"),
              rfB("Link existing workspace", [rfA("Link an existing " + W)]),
              rfB("Create new workspace", [rfA("Create a new " + W)]),
            ]),
          ],
        ],
        [
          "Act",
          "Contribute within your mandate",
          [
            rfA(
              "Accept tasks and contribute",
              "Within the mandate your organisation granted.",
            ),
            rfA("Add evidence"),
            rfH("RV", "Reviews the evidence"),
            rfS("End: collaboration closes with the " + W),
          ],
        ],
      ],
    },
    S: {
      lead: "Sponsor. Lists projects under an alias, chooses each project’s owner from the people who shortlist it, agrees milestones and records offline payment status in the project’s Action Workspace; buys seat pools or donates, follows aggregate seat use and sees approved, funder-safe outcomes. Identifiable stories need a separate release.",
      side: [],
      phases: [
        ["Authorize", "Access, Sponsor agreement and sign-in", rfAccess("S")],
        [
          "Projects",
          "From a listing on the Explore board to approved milestones and recorded payments",
          [
            rfA(
              "List a project on the Explore board",
              "Shown under an alias made for that project; name and organisation hidden.",
            ),
            rfH(
              "P",
              "Participants and Collaborators shortlist it; it appears in their Projects",
            ),
            rfA(
              "Choose the main owner(s) from the shortlist and where the work starts",
              "Circle, Rope Team or Action Workspace. The project is the same record throughout.",
            ),
            rfH(
              "P",
              "Owner agrees milestones with you in the Action Workspace and assigns the work to the team",
            ),
            rfH("P", "Owner marks a milestone complete with deliverables and evidence"),
            rfD("Is the milestone complete?", [
              rfB("Yes", [
                rfA("Approve it; its payment becomes Due"),
                rfA("Pay offline and record the payment as Paid Offline"),
              ]),
              rfB("Not yet", [
                rfA("Request the missing items or corrections"),
                rfH("P", "Owner resubmits"),
              ]),
              rfB("Cannot agree", [
                rfH("A", "Assigns a Steward with no tie to either side"),
                rfH(
                  "F",
                  "Steward decides from the evidence; both sides under aliases",
                ),
              ]),
            ]),
            rfS(
              "End: milestones approved and payment status recorded; continue from My PHOENIX",
            ),
          ],
        ],
        [
          "Seats",
          "Seat pool or donation",
          [
            rfA("Choose a seat pool or a donation"),
            rfD("How do you pay?", [
              rfB("Hosted payment", [rfA("Pay on the hosted payment page")]),
              rfB("Invoice", [rfA("Request an invoice")]),
            ]),
            rfH("T", "Confirms payment and activates the pool"),
          ],
        ],
        [
          "Outcomes",
          "Utilisation and funder-safe outcomes",
          [
            rfA("See seat utilisation", "Aggregate only."),
            rfA(
              "See approved initiatives, approved evidence summaries and funder-safe Learning Harvests",
              "Small numbers are suppressed.",
            ),
            rfD("Want an identifiable story?", [
              rfB("No", [rfY("Aggregate view only")]),
              rfB("Yes", [
                rfA("Send a separate release request"),
                rfH("A", "Decides, with the person’s own release permission"),
              ]),
            ]),
            rfS("End: continue from My PHOENIX"),
          ],
        ],
      ],
    },
    A: {
      lead: "Organization Admin. Runs invitations and access requests, sensitive-role approvals, pack configuration, voting parameters, resources, reports and configuration versions, release disclosure review and Report a concern cases for the programme.",
      side: ["Evidence review goes to Reviewer bundle holders"],
      phases: [
        [
          "Authorize",
          "Invitation and sign-in with two-step code",
          rfAccess("A"),
        ],
        [
          "Authorize",
          "Invitations and access requests",
          [
            rfA(
              "Invite people",
              "Single or bulk, any role except Platform Administrator.",
            ),
            rfD(
              "An access request arrives",
              [
                rfB("Approve", [rfY("A normal single-use invitation is sent")]),
                rfB("Decline", [rfY("Nothing is created")], "end"),
              ],
              "No account exists before an invitation.",
            ),
            rfD("A sensitive role waits for approval", [
              rfB("Approve", [rfY("Role active; person notified")]),
              rfB("Decline", [rfY("“Role not activated”")], "end"),
            ]),
          ],
        ],
        [
          "Configure",
          "Pack and templates",
          [
            rfA("Configure the programme pack and templates"),
            rfA(
              "Set voting parameters",
              "Threshold, quorum, window and reminders. Equal weight is frozen: one eligible member = one vote.",
            ),
            rfA("Resources"),
          ],
        ],
        ["Reports", "Reports", [rfA("Programme reports and exports")]],
        [
          "Configure",
          "Configuration versions",
          [
            rfA(
              "Save, export or restore a configuration version",
              "Restoring never touches participant data.",
            ),
            rfS("End: programme running; continue from My PHOENIX"),
          ],
        ],
        [
          "Trust & safety",
          "Release disclosure review and incidents",
          [
            rfA(
              "Complete disclosure review for a release",
              "Only after the owner authorises it, and only in this programme.",
            ),
            rfA("Triage, review and decide incidents", "Never a case you reported yourself."),
          ],
        ],
        [
          "Routing",
          "Decisions that go elsewhere",
          [
            rfH("RV", "Evidence review"),
            rfH("T", "Policies, products and payments"),
          ],
        ],
      ],
    },
    T: {
      lead: "Platform Administrator. Runs the platform: system health, contexts, approved role and bundle definitions, Trust/Data: Policies, Finance: Products & Payments, integrations, security, backups and audit. No participant content.",
      side: [],
      phases: [
        ["Authorize", "Provisioned account with two-step code", rfAccess("T")],
        [
          "Operations",
          "System health and contexts",
          [
            rfA("Monitor system health and alerts"),
            rfA("Create and manage contexts (tenants)"),
          ],
        ],
        [
          "Roles",
          "Role and bundle definitions",
          [
            rfD("Is there an approved change reference?", [
              rfB("Yes", [rfA("Apply the approved role or bundle definition")]),
              rfB("No", [rfY("Cannot be applied")], "end"),
            ]),
          ],
        ],
        [
          "Trust/Data",
          "Policies",
          [
            rfA("Draft, compare and publish policy and agreement versions"),
            rfY("People it applies to review and accept the new version"),
          ],
        ],
        [
          "Finance",
          "Products & Payments",
          [
            rfA("Approve, release and retire products"),
            rfA("Verify or reconcile payments; confirm invoices and activate seat pools"),
          ],
        ],
        [
          "Operations",
          "Integrations, security and audit",
          [
            rfA("Manage integrations"),
            rfA("Security, backups and restore"),
            rfA("Audit logs across the platform"),
            rfY(
              "Out of scope",
              "No participant content. Purpose Compass questions are fixed.",
            ),
            rfS("End: platform running"),
          ],
        ],
      ],
    },
  };
}

// ---- the cross-role view: the Alpha loop, with who acts at each step
function rfOverview() {
  const W = WL();
  return [
    [
      "Authorize",
      "Authorize",
      [
        rfS("Start: invitation, or Request access → approval → invitation"),
        rfH(
          "A/O",
          "Invite people; Organization Admins decide access requests and sensitive roles",
        ),
        rfY(
          "Required agreement, then optional permissions",
          "Each person accepts the required agreement; the five optional permissions are asked separately and declining them never blocks the core.",
        ),
      ],
    ],
    [
      "Connect",
      "Connect",
      [
        rfH(
          "P/F/M/C",
          "Join or link a Circle, Rope Team or " + W + " as relevant",
        ),
        rfY(
          "Separate linked spaces",
          "Entered in any valid order, never converted.",
        ),
        rfH(
          "F/C",
          "Steward-reviewed match with mutual consent, or direct authorised collaboration",
        ),
      ],
    ],
    [
      "Orient",
      "Orient",
      [
        rfH("P", "Answers the Purpose Compass (never scored)"),
        rfH("M/F", "Recommend a 3–5 step pathway"),
        rfH("P", "Accepts it; nothing becomes current without that"),
      ],
    ],
    [
      "Deliberate",
      "Deliberate",
      [
        rfH("F", "Runs sessions and threaded discussion"),
        rfH("*", "Vote on proposals: one eligible member = one vote"),
      ],
    ],
    [
      "Act",
      "Act",
      [
        rfH(
          "*",
          "Work in the " + W + "; a task begins once its assignee accepts",
        ),
      ],
    ],
    [
      "Evidence",
      "Evidence",
      [
        rfH("*", "Add evidence"),
        rfH("RV", "Reviews status and level E0–E4"),
        rfH("A", "Decides any release"),
      ],
    ],
    [
      "Learn",
      "Learn",
      [
        rfH(
          "*",
          "Complete the Learning Harvest; dissent and negative findings kept",
        ),
      ],
    ],
    [
      "Evolve",
      "Evolve",
      [
        rfH("P", "Accepts, edits or rejects profile change candidates"),
        rfH("P", "Chooses the next action"),
        rfS("End: the loop continues"),
      ],
    ],
    [
      "Alongside",
      "Supporting flows",
      [
        rfH("S", "Seat pools, aggregate utilisation and funder-safe outcomes"),
        rfH("T", "Runs the platform; no participant content"),
        rfY(
          "Role + context switching",
          "One identity, several role assignments, each tied to a context.",
        ),
      ],
    ],
  ];
}

// ---- rendering
function rfNode(n) {
  if (n.k === "d")
    return `<li class="rfl-n rfl-d"><div class="rfl-dq"><span class="rfl-dia" aria-hidden="true">${ic("question", 14)}</span><b>${h(n.q)}</b>${n.n ? `<span class="cap">${h(n.n)}</span>` : ""}</div><div class="rfl-brs" role="group" aria-label="${h(n.q)}">${n.br
      .map(
        (b) =>
          `<div class="rfl-br"><span class="rfl-bl">${h(b.l)}</span>${b.nodes.length ? `<ol class="rfl-flow rfl-sub">${b.nodes.map(rfNode).join("")}</ol>` : ""}<span class="rfl-out ${b.out === "end" ? "is-end" : b.out === "cont" ? "is-cont" : "is-to"}">${b.out === "end" ? ic("x", 12) + "Path ends" : b.out === "cont" ? ic("arrow", 12) + "Continues" : ic(/^Skips/.test(b.out) ? "arrow" : "refresh", 12) + h(b.out)}</span></div>`,
      )
      .join("")}</div></li>`;
  const icn = { s: "flag", a: "user", h: "users", y: "settings", g: "arrow" }[
    n.k
  ];
  return `<li class="rfl-n rfl-${n.k}"><span class="rfl-ic" aria-hidden="true">${ic(icn, 14)}</span><div class="rfl-b">${n.k === "h" ? `<div class="rfl-who">${rfChip(n.r)}</div>` : ""}<b>${h(n.t)}</b>${n.n ? `<span class="cap">${h(n.n)}</span>` : ""}</div></li>`;
}
// Every other role this role hands off to or waits for, in role order.
const rfPartners = (phases, self) => {
  const seen = new Set();
  const walk = (ns) =>
    ns.forEach((n) => {
      if (n.k === "h")
        n.r
          .split("/")
          .forEach((x) => x !== self && RF_ORDER.includes(x) && seen.add(x));
      if (n.k === "d") n.br.forEach((b) => walk(b.nodes));
    });
  phases.forEach((p) => walk(p[2]));
  return RF_ORDER.filter((x) => seen.has(x));
};
// What the role can open, from the live role record (Role management) or the default matrix.
function rfAccessTable(c) {
  const rec = roleRec(c);
  const rows = Object.keys(MODULES)
    .map((m) => [
      MODULES[m][0],
      (rec && rec.perms ? rec.perms[m] : (MX[m] || {})[c]) || "-",
    ])
    .filter(([, v]) => v !== "-");
  return table(
    ["Module", "Access"],
    rows.map(([l, v]) => [h(l), h(permText(v))]),
    "No module access.",
  );
}
const rfLegend = () =>
  `<ul class="rfl-legend" aria-label="Legend">${[
    ["s", "flag", "Start or end"],
    ["a", "user", "This role acts"],
    ["h", "users", "Another role acts"],
    ["y", "settings", "PHOENIX does it"],
    ["d", "question", "Decision"],
    ["g", "arrow", "Moves on"],
  ]
    .map(
      ([k, i, l]) =>
        `<li class="rfl-lg rfl-${k}"><span class="rfl-ic" aria-hidden="true">${ic(i, 12)}</span>${l}</li>`,
    )
    .join("")}</ul>`;

// ---- one role's data: its phases, which of them run alongside the main path, and its summary
function rfData(cur) {
  if (cur === "all")
    return {
      phases: rfOverview(),
      side: new Set(["Supporting flows"]),
      self: null,
      lead:
        "The Alpha loop: Authorize → Connect → Orient → Deliberate → Act → Evidence → Learn → Evolve, with the role that acts at each step. Circle, Rope Team and " +
        WL() +
        " are separate linked spaces entered in any valid order.",
    };
  const f = rfFlows()[cur];
  return {
    phases: f.phases,
    side: new Set(f.side || []),
    self: cur,
    lead: f.lead,
  };
}
const rfSlug = (c) =>
  c === "all"
    ? "all-roles"
    : rfName(c)
        .toLowerCase()
        .replace(/[^a-z]+/g, "-")
        .replace(/^-|-$/g, "");

// ---- flowchart diagram (SVG). The same data drawn as one connected end-to-end flowchart: the main path runs
// top to bottom from start to end; phases that run alongside it are drawn below as separate flows.
// Fixed colours so the diagram and its exported image look the same in light and dark mode.
const RFX = {
  font: "'Atkinson Hyperlegible Next', 'Segoe UI', Arial, sans-serif",
  ink: "#17221e",
  ink2: "#4f5d57",
  ink3: "#76847e",
  edge: "#7d8c86",
  band: "#f5f8f6",
  bandLine: "#dfe6e2",
  self: ["#1f6450", "#ffffff", "#cfe6dc"],
  sys: ["#eef1ef", "#c9d3ce", "#4f5d57"],
  go: ["#fdeee6", "#e8b39a", "#9a3a12"],
  term: ["#0f2e25", "#ffffff"],
  dec: ["#fff6e0", "#d9a21b", "#5c3d00"],
  end: ["#fdeeee", "#b4232a"],
  loop: ["#ebf3fc", "#1e5aa8"],
  role: {
    P: ["#e3f1eb", "#1f6450"],
    F: ["#f4eef8", "#6e4592"],
    M: ["#e6f4f5", "#0f6f7a"],
    C: ["#eef0f6", "#46557f"],
    S: ["#fff6e0", "#8a5a00"],
    A: ["#fdeee6", "#b4471a"],
    T: ["#eef0f1", "#4f5d57"],
    "*": ["#eef0f1", "#4f5d57"],
  },
};
const RFX_NW = 280; // node width
const RFX_GAP = 26; // vertical gap between steps
const rfxWrap = (t, n) => {
  const out = [];
  let cur = "";
  String(t)
    .split(/\s+/)
    .filter(Boolean)
    .forEach((w) => {
      if (!cur) cur = w;
      else if ((cur + " " + w).length <= n) cur += " " + w;
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
        `<text x="${x}" y="${y + i * o.lh}" font-size="${o.fs}"${o.bold ? ' font-weight="700"' : ""} fill="${o.fill}"${o.anchor ? ` text-anchor="${o.anchor}"` : ""}${o.ls ? ` letter-spacing="${o.ls}"` : ""}>${h(l)}</text>`,
    )
    .join("");
const rfxArrow = (x1, y1, x2, y2) =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${RFX.edge}" stroke-width="1.5" fill="none" marker-end="url(#rfx-ah)"/>`;
const rfxLine = (pts) =>
  `<path d="M${pts.map((p) => p.join(" ")).join("L")}" stroke="${RFX.edge}" stroke-width="1.5" fill="none"/>`;
const rfxPill = (cx, y, t, [bg, fg]) => {
  const w = Math.round(t.length * 6.6 + 22);
  return {
    w,
    svg: `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="22" rx="11" fill="${bg}" stroke="${fg}" stroke-width="1"/><text x="${cx}" y="${y + 15}" font-size="11.5" font-weight="700" fill="${fg}" text-anchor="middle">${h(t)}</text>`,
  };
};
// A step box: header line (who acts), title, optional note.
function rfxNode(n, self) {
  if (n.k === "s") {
    const lines = rfxWrap(n.t, 34);
    const w = Math.min(
      RFX_NW,
      Math.max(150, Math.max(...lines.map((l) => l.length)) * 7.6 + 40),
    );
    const hh = 18 + lines.length * 17;
    return {
      w,
      h: hh,
      exit: !/^End/.test(n.t),
      draw: (cx, y) =>
        `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${hh}" rx="${hh / 2}" fill="${RFX.term[0]}"/>${rfxText(cx, y + 22, lines, { fs: 13, lh: 17, bold: 1, fill: RFX.term[1], anchor: "middle" })}`,
    };
  }
  const roles = n.k === "h" ? n.r.split("/") : [];
  const head =
    n.k === "a"
      ? self
        ? rfName(self)
        : "This role"
      : n.k === "h"
        ? roles
            .map((x) => (x === "*" ? "Space members" : rfName(x)))
            .join(" · ")
        : n.k === "y"
          ? "PHOENIX (automatic)"
          : "Next";
  const [bg, bd, fg, hd, nt] =
    n.k === "a"
      ? [RFX.self[0], RFX.self[0], RFX.self[1], RFX.self[2], RFX.self[2]]
      : n.k === "h"
        ? [
            ...(RFX.role[roles[0]] || RFX.role["*"]),
            RFX.ink,
            (RFX.role[roles[0]] || RFX.role["*"])[1],
            RFX.ink2,
          ]
        : n.k === "y"
          ? [RFX.sys[0], RFX.sys[1], RFX.ink, RFX.sys[2], RFX.ink2]
          : [RFX.go[0], RFX.go[1], RFX.go[2], RFX.go[2], RFX.go[2]];
  const hl = rfxWrap(head.toUpperCase(), 40);
  const tl = rfxWrap(n.t, 34);
  const nl = n.n ? rfxWrap(n.n, 42) : [];
  const hh =
    12 +
    hl.length * 13 +
    4 +
    tl.length * 17 +
    (nl.length ? 4 + nl.length * 14.5 : 0) +
    10;
  return {
    w: RFX_NW,
    h: Math.round(hh),
    exit: true,
    draw: (cx, y) => {
      const x = cx - RFX_NW / 2 + 12;
      let yy = y + 22;
      let out = `<rect x="${cx - RFX_NW / 2}" y="${y}" width="${RFX_NW}" height="${Math.round(hh)}" rx="8" fill="${bg}" stroke="${bd}" stroke-width="1.5"${n.k === "h" ? ' stroke-dasharray="5 3"' : ""}/>`;
      out += rfxText(x, yy, hl, {
        fs: 9.5,
        lh: 13,
        bold: 1,
        fill: hd,
        ls: 0.6,
      });
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
  const brs = n.br.map((b) => {
    const seq = rfxSeq(b.nodes, self);
    const lab = rfxPill(0, 0, b.l, RFX.dec.slice(0, 1).concat(RFX.dec[2]));
    const outT =
      b.out === "end"
        ? "Path ends"
        : b.out === "cont"
          ? ""
          : (/^Skips/.test(b.out) ? "→ " : "↺ ") + b.out;
    const outW = outT ? Math.round(outT.length * 6.6 + 22) : 0;
    return { b, seq, w: Math.max(seq.w, lab.w, outW, 160), outT };
  });
  const BG = 28;
  const brW = brs.reduce((a, x) => a + x.w, 0) + BG * (brs.length - 1);
  const w = Math.max(DW, brW, nl.length ? 340 : 0);
  const busY = DH + NH + 16;
  const topB = busY + 50;
  const bottoms = brs.map((x) => x.seq.h + (x.outT ? 34 : 0));
  const maxB = topB + Math.max(...bottoms);
  const cont = brs.filter((x) => x.b.out === "cont" && x.seq.exit);
  const mergeY = maxB + 22;
  return {
    w,
    h: cont.length ? mergeY : maxB,
    exit: cont.length > 0,
    draw: (cx, y) => {
      let out = `<polygon points="${cx},${y} ${cx + DW / 2},${y + DH / 2} ${cx},${y + DH} ${cx - DW / 2},${y + DH / 2}" fill="${RFX.dec[0]}" stroke="${RFX.dec[1]}" stroke-width="1.5"/>`;
      out += rfxText(cx, y + DH / 2 - ((ql.length - 1) * 15) / 2 + 5, ql, {
        fs: 12.5,
        lh: 15,
        bold: 1,
        fill: RFX.dec[2],
        anchor: "middle",
      });
      if (nl.length)
        out += rfxText(cx, y + DH + 16, nl, {
          fs: 11,
          lh: 14,
          fill: RFX.ink2,
          anchor: "middle",
        });
      let x = cx - brW / 2;
      const centers = brs.map((b) => {
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
          if (b.seq.exit)
            out += rfxLine([
              [c, sb],
              [c, sb + 12],
            ]);
          out += rfxPill(
            c,
            sb + 12,
            b.outT,
            b.b.out === "end"
              ? RFX.end
              : /^Skips/.test(b.b.out)
                ? [RFX.go[0], RFX.go[2]]
                : RFX.loop,
          ).svg;
        } else if (b.seq.exit) {
          out += rfxLine([
            [c, sb],
            [c, y + mergeY],
            [cx, y + mergeY],
          ]);
        }
      });
      if (cont.length)
        out += `<circle cx="${cx}" cy="${y + mergeY}" r="3.5" fill="${RFX.edge}"/>`;
      return out;
    },
  };
}
// A sequence of steps joined by arrows.
function rfxSeq(nodes, self) {
  const items = nodes.map((n) =>
    n.k === "d" ? rfxDecision(n, self) : rfxNode(n, self),
  );
  const w = Math.max(RFX_NW, ...items.map((i) => i.w));
  const h =
    items.reduce((a, i) => a + i.h, 0) +
    RFX_GAP * Math.max(0, items.length - 1);
  return {
    w,
    h,
    exit: items.length ? items[items.length - 1].exit : true,
    draw: (cx, y) => {
      let out = "";
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
  const main = d.phases
    .filter((p) => !d.side.has(p[1]))
    .map((p) => ({ p, seq: rfxSeq(p[2], d.self) }));
  const side = d.phases
    .filter((p) => d.side.has(p[1]))
    .map((p) => ({ p, seq: rfxSeq(p[2], d.self) }));
  side.forEach((s) => (s.w = Math.max(340, s.seq.w + 48)));
  const mainW = Math.max(...main.map((m) => m.seq.w)) + 280;
  const W = Math.round(
    Math.max(1100, mainW + 2 * M, ...side.map((s) => s.w + 2 * M)),
  );
  const cx = W / 2;
  const title = cur === "all" ? "How the roles work together" : rfName(cur);
  const leadL = rfxWrap(d.lead, Math.floor((W - 2 * M) / 7.4));
  let y = M;
  let out = `<text x="${M}" y="${y + 12}" font-size="12" font-weight="700" letter-spacing="1.2" fill="${RFX.ink3}">PHOENIX · ROLE FLOW</text>`;
  out += `<text x="${M}" y="${y + 42}" font-size="26" font-weight="700" fill="${RFX.ink}">${h(title)}</text>`;
  out += rfxText(M, y + 68, leadL, { fs: 14, lh: 19, fill: RFX.ink2 });
  y += 68 + leadL.length * 19 + 6;
  // legend
  const leg = [
    ["Start / end", RFX.term[0], RFX.term[0], "pill"],
    [cur === "all" ? "Role acts" : "This role acts", RFX.self[0], RFX.self[0]],
    ["Another role acts", RFX.role.F[0], RFX.role.F[1], "dash"],
    ["PHOENIX does it", RFX.sys[0], RFX.sys[1]],
    ["Next", RFX.go[0], RFX.go[1]],
    ["Decision", RFX.dec[0], RFX.dec[1], "dia"],
    ["Path ends", RFX.end[0], RFX.end[1], "pill"],
    ["Loops back", RFX.loop[0], RFX.loop[1], "pill"],
  ];
  let lx = M;
  leg.forEach(([l, bg, bd, shape]) => {
    const sw =
      shape === "dia"
        ? `<polygon points="${lx + 9},${y + 2} ${lx + 18},${y + 10} ${lx + 9},${y + 18} ${lx},${y + 10}" fill="${bg}" stroke="${bd}" stroke-width="1.5"/>`
        : `<rect x="${lx}" y="${y + 3}" width="18" height="14" rx="${shape === "pill" ? 7 : 3}" fill="${bg}" stroke="${bd}" stroke-width="1.5"${shape === "dash" ? ' stroke-dasharray="3 2"' : ""}/>`;
    out +=
      sw +
      `<text x="${lx + 25}" y="${y + 15}" font-size="12" fill="${RFX.ink2}">${h(l)}</text>`;
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
    out += `<text x="${M}" y="${y + 34}" font-size="12.5" fill="${RFX.ink2}">${h(cur === "all" ? "Flows that run in parallel with the project." : "These run in parallel with the main path, whenever they are needed.")}</text>`;
    y += 50;
    const rows = [];
    side.forEach((s) => {
      const r = rows[rows.length - 1];
      if (r && r.w + 20 + s.w <= W - 2 * M) {
        r.items.push(s);
        r.w += 20 + s.w;
      } else rows.push({ items: [s], w: s.w });
    });
    rows.forEach((r) => {
      const rh = Math.max(...r.items.map((s) => 54 + s.seq.h + 26));
      let x = M;
      r.items.forEach((s) => {
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
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${h(RFX.font)}" role="img" aria-label="${h("Flowchart: " + title)}"><defs><marker id="rfx-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${RFX.edge}"/></marker></defs><rect width="${W}" height="${H}" fill="#ffffff"/>${out}</svg>`,
  };
}
// Draw a diagram onto a canvas and return a PNG data URL (used by "Download image" and the image export).
function rfxPng(cur, scale = 2) {
  const dg = rfxDiagram(cur);
  const sc = Math.min(scale, 16000 / dg.h, 16000 / dg.w);
  return new Promise((ok_, bad) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = Math.round(dg.w * sc);
      c.height = Math.round(dg.h * sc);
      const x = c.getContext("2d");
      x.fillStyle = "#ffffff";
      x.fillRect(0, 0, c.width, c.height);
      x.scale(sc, sc);
      x.drawImage(img, 0, 0, dg.w, dg.h);
      ok_(c.toDataURL("image/png"));
    };
    img.onerror = bad;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(dg.svg);
  });
}

// ---- the page
const rfPhase = ([mod, title, nodes], i, side) =>
  `<section class="rfl-phase" id="rfl-ph-${i}" aria-labelledby="rfl-ph-${i}-t"><header class="rfl-ph-h"><span class="rfl-num">${i + 1}</span><div><span class="rfl-mod">${h(mod)}${side ? " · runs alongside the main path" : ""}</span><h2 class="h3" id="rfl-ph-${i}-t">${h(title)}</h2></div></header><ol class="rfl-flow">${nodes.map(rfNode).join("")}</ol></section>`;
PUB.roleflow = () => {
  const flows = rfFlows();
  const cur = UI.rf && (UI.rf === "all" || flows[UI.rf]) ? UI.rf : "all";
  const view = UI.rfView === "steps" ? "steps" : "chart";
  const tab = (id, l) =>
    `<button type="button" role="tab" class="rfl-tab ${cur === id ? "on" : ""}" aria-selected="${cur === id}" data-a="rfRole" data-v="${id}">${l}</button>`;
  const d = rfData(cur);
  const phases = d.phases;
  const partners = cur === "all" ? [] : rfPartners(phases, cur);
  const intro =
    cur === "all"
      ? `<div class="rfl-intro"><h2 class="h2">How the roles work together</h2><p class="sub">${h(d.lead)} Choose a role above for its complete journey.</p></div>`
      : `<div class="rfl-intro"><div class="rfl-intro-h"><span class="rfl-chip rfl-r-${cur} rfl-chip-lg">${h(rfName(cur))}</span></div><p class="sub">${h(d.lead)}</p>${partners.length ? `<div class="rfl-with"><span class="cap">Works with</span>${partners.map(rfChip).join("")}</div>` : ""}</div>`;
  const vbtn = (id, l, i) =>
    `<button type="button" class="rfl-vb ${view === id ? "on" : ""}" aria-pressed="${view === id}" data-a="rfView" data-v="${id}">${ic(i, 14)}${l}</button>`;
  const body =
    view === "chart"
      ? `<div class="rfl-chart-bar"><p class="cap">The main path runs from start to end; flows that run alongside it are drawn below. Scroll to see the whole chart.</p>${B(ic("download", 14) + "Download image", "rfPng", { c: cur }, "btn-s btn-sm")}</div><div class="rfl-chart" tabindex="0" aria-label="Flowchart, scrollable">${rfxDiagram(cur).svg}</div>`
      : `${rfLegend()}<nav class="rfl-jump" aria-label="Phases">${phases.map((p, i) => `<button type="button" class="rfl-jb" data-a="rfJump" data-i="${i}">${i + 1}. ${h(phases.filter((q) => q[0] === p[0]).length > 1 ? p[1] : p[0])}</button>`).join("")}</nav><div class="rfl-phases">${phases.map((p, i) => rfPhase(p, i, d.side.has(p[1]))).join("")}</div>`;
  return `<div class="rfl-page"><header class="rfl-top"><div class="brand"><span class="mark">${MARK(20)}</span><span class="wm"><b>PHOENIX</b><span>Foundation</span></span></div><div class="row rfl-top-a">${B(ic("file", 14) + "Print", "rfPrint", {}, "btn-s btn-sm")}${B(ic("chevl", 14) + "Back to sign in", "go", { r: "login" }, "btn-p btn-sm")}</div></header>
  <main class="rfl-main"><div class="rfl-head"><h1 class="h1">Role Flow</h1><p class="sub">How each role works in PHOENIX, from invitation and agreement to evidence, learning and the next action. One identity can hold several role assignments, each tied to a programme or organisation context.</p></div>
  <div class="rfl-tabs" role="tablist" aria-label="Role">${tab("all", "All roles")}${RF_ORDER.map((c) => tab(c, h(rfName(c)))).join("")}</div>
  ${intro}<div class="rfl-views" role="group" aria-label="View">${vbtn("chart", "Flowchart", "steps")}${vbtn("steps", "Step details", "menu")}</div>
  ${body}
  ${cur === "all" ? "" : `<section class="rfl-phase rfl-acc-wrap"><header class="rfl-ph-h"><span class="rfl-num">${ic("shield", 14)}</span><div><span class="rfl-mod">Permissions</span><h2 class="h3">What ${h(rfName(cur))} can open</h2></div></header><p class="cap">Read from the current role settings. Specialist bundles (Reviewer, Trust/Data Steward, Finance Owner, AI Owner, Incident/Safety Owner) are capabilities attached to a person in a context, not personas; they add rights on top of the role and are approved separately.</p>${rfAccessTable(cur)}</section>`}
  </main></div>`;
};
A.rfRole = (d) => {
  UI.rf = d.v;
  render();
  window.scrollTo(0, 0);
};
A.rfView = (d) => {
  UI.rfView = d.v;
  render();
};
A.rfJump = (d) =>
  document
    .getElementById("rfl-ph-" + d.i)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
A.rfPrint = () => window.print();
A.rfPng = (d) =>
  rfxPng(d.c)
    .then((url) => {
      const a = document.createElement("a");
      a.download = "role-flow-" + rfSlug(d.c) + ".png";
      a.href = url;
      a.click();
    })
    .catch(() => {
      toast("The image could not be created in this browser.", "err");
      render();
    });
