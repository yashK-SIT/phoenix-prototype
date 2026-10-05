// ---------- SPACE ROLES: project-wise roles in Circles, Rope Teams and Action Rooms ----------
// A person's platform role decides which modules they can open. Inside a specific Circle, Rope Team or Action Room,
// what they see and can do follows the role they hold in that space.
const SPACE_ROLES = [
  "Project owner",
  "Facilitator",
  "Member",
  "Mentor",
  "Partner",
  "Reviewer",
  "Observer",
];
const SPACE_ROLE_HELP = {
  "Project owner":
    "Owns the project. Leads the work, manages members and joins votes with double weight.",
  Facilitator:
    "Faculty/Steward for this space. Facilitates, moderates, approves and reviews.",
  Member:
    "Contributes, takes on tasks and commitments, votes where votes apply.",
  Mentor:
    "Guides the team, reviews shared work and records mentor contributions.",
  Partner:
    "External or institutional collaborator working against a defined responsibility.",
  Reviewer:
    "Reviews contributions, Change Objects and evidence-linked milestones.",
  Observer: "Read-only. Can follow the work but not post or change anything.",
};
const SPACE_KIND_LABEL = (kind) =>
  ({ circles: "Circle", ropes: "Rope Team", rooms: WL() })[kind] || "space";
// Older records carry free-text roles; map them onto the seven space roles.
function normRole(r) {
  const s = String(r || "");
  if (/^(Project owner|Project Lead)/i.test(s)) return "Project owner";
  if (/^Facilitator/i.test(s)) return "Facilitator";
  if (/^Mentor/i.test(s)) return "Mentor";
  if (/^(Partner|Collaborator|External|Institutional|Finance)/i.test(s))
    return "Partner";
  if (/^(Reviewer|Restricted|Research|Public-release)/i.test(s))
    return "Reviewer";
  if (/^Observer/i.test(s)) return "Observer";
  return "Member";
}
// Default role when someone is added to a space, from their platform role.
const defaultSpaceRole = (platformRole) =>
  ({
    F: "Facilitator",
    M: "Mentor",
    C: "Partner",
    O: "Observer",
    A: "Observer",
  })[platformRole] || "Member";
const ctxRole = (pid, c = ctxId()) =>
  (
    S.assign.find(
      (a) => a.pid === pid && a.ctx === c && a.status === "Active",
    ) || {}
  ).role;
// Structural fields (owner, facilitator, mentor, lead) always decide the role they describe.
function spaceRole(kind, o, pid = myId()) {
  if (!o) return null;
  const m = memberRec(o, pid);
  if (!m || (m.status && m.status !== "Active")) return null;
  if (kind === "circles" && o.facilitator === pid) return "Facilitator";
  if (kind === "ropes" && o.mentor === pid && normRole(m.role) === "Mentor")
    return "Mentor";
  if ((kind === "circles" || kind === "ropes") && o.owner === pid)
    return "Project owner";
  if (kind === "rooms" && o.lead === pid) return "Project owner";
  return normRole(m.role);
}
const ALL_BUT_OBS = SPACE_ROLES.filter((r) => r !== "Observer");
const SPACE_CAN = {
  circles: {
    post: ALL_BUT_OBS,
    record: ALL_BUT_OBS,
    vote: ["Project owner", "Member"],
    poll: ["Project owner", "Facilitator"],
    facilitate: ["Facilitator"],
    members: ["Project owner", "Facilitator"],
    moderate: ["Facilitator"],
    card: ALL_BUT_OBS,
    harvest: ALL_BUT_OBS,
  },
  ropes: {
    post: ALL_BUT_OBS,
    share: ["Project owner", "Member"],
    mentor: ["Mentor"],
    support: ["Mentor", "Facilitator"],
    ask: ALL_BUT_OBS,
    members: ["Project owner", "Facilitator"],
    moderate: ["Mentor", "Facilitator"],
    close: ["Mentor", "Facilitator"],
    ret: ALL_BUT_OBS,
  },
  rooms: {
    post: ALL_BUT_OBS,
    lead: ["Project owner", "Facilitator"],
    propose: ALL_BUT_OBS,
    contribute: ["Member", "Partner", "Mentor"],
    review: ["Reviewer", "Facilitator"],
    moderate: ["Project owner", "Facilitator"],
    members: ["Project owner", "Facilitator"],
    ret: ALL_BUT_OBS,
  },
};
const sCan = (kind, o, act, pid = myId()) => {
  const r = spaceRole(kind, o, pid);
  return !!r && (SPACE_CAN[kind][act] || []).includes(r);
};
// Programme-level authority that applies on top of space roles (administration, organization oversight).
// Organization Representatives manage Circles in their context; Programme Administrators lead Action Rooms.
const spaceAdmin = (kind, o) =>
  (kind === "circles" && role() === "O" && inCtx(o)) || (kind === "rooms" && role() === "A");
const roleTag = (kind, o) => {
  const r = spaceRole(kind, o);
  if (!r)
    return spaceAdmin(kind, o) || ["A", "O"].includes(role())
      ? `<span class="srole" title="Programme oversight — not a member">${ic("shield", 13)}Oversight</span>`
      : "";
  return `<span class="srole" title="${h(SPACE_ROLE_HELP[r])}">${ic("user", 13)}Your role here: <b>${h(r)}</b></span>`;
};
const roleNote = (kind, o) => {
  const r = spaceRole(kind, o);
  return r === "Observer"
    ? banner(
        "info",
        "You are an Observer in this " + SPACE_KIND_LABEL(kind),
        SPACE_ROLE_HELP.Observer,
      )
    : "";
};
// Role selector used in the Members tabs.
const roleSelect = (act, data, cur, label) =>
  `<select class="input" style="min-height:36px;font-size:12px;width:auto" data-ch="${act}"${attr(data)} aria-label="${h(label || "Role in this space")}">${SPACE_ROLES.map((x) => `<option ${x === normRole(cur) ? "selected" : ""}>${x}</option>`).join("")}</select>`;
// Everyone in this context who could be added to a space, with their platform role.
const eligiblePeople = (exclude = [], roles = ["P", "F", "M", "C", "O"]) =>
  S.assign
    .filter(
      (a) =>
        a.ctx === ctxId() &&
        a.status === "Active" &&
        roles.includes(a.role) &&
        !exclude.includes(a.pid),
    )
    .filter((a, i, arr) => arr.findIndex((b) => b.pid === a.pid) === i)
    .map((a) => ({
      pid: a.pid,
      sub:
        ROLE[a.role] +
        (P(a.pid).org
          ? " · " +
            ((S.orgs.find((o) => o.id === P(a.pid).org) || {}).name || "")
          : ""),
      r: a.role,
    }))
    .sort((a, b) => P(a.pid).name.localeCompare(P(b.pid).name));

// ---------- Searchable multi-select ----------
// Opening the list scrolls it into view, so it is not hidden behind a modal's sticky action bar.
const mselShow = (root) => {
  if (root.classList.contains("open")) return;
  root.classList.add("open");
  requestAnimationFrame(() => root.querySelector(".msel-list").scrollIntoView({ block: "nearest" }));
};
// Chips for the current selection, a search box, and a checkbox list that filters as you type (name or role).
// The selection survives re-renders in UI.msel; the form submits the checked boxes under `name`.
UI.msel = UI.msel || {};
function msel(form, name, label, people, def = [], o = {}) {
  const key = form + "_" + name;
  const sel = UI.msel[key] || (UI.msel[key] = [...def]);
  const chip = (pid) =>
    `<span class="mchip" data-pid="${pid}"><span class="av">${ini(pid)}</span>${nm(pid)}<button type="button" class="mchip-x" data-a="mselX" data-k="${key}" data-pid="${pid}" aria-label="Remove ${nm(pid)}">${ic("x", 12)}</button></span>`;
  return `<div class="field msel" data-msel="${key}"><label class="lbl" for="${key}_q">${label}${o.req ? ' <span class="req">*</span>' : ""}</label>
  <div class="msel-box" data-a="mselOpen" data-k="${key}">${sel.map(chip).join("")}<input id="${key}_q" class="msel-q" type="text" autocomplete="off" placeholder="${sel.length ? "Add more…" : h(o.ph || "Search by name or role")}" aria-label="Search people" aria-expanded="false" aria-controls="${key}_list"></div>
  <div class="msel-list" id="${key}_list" role="listbox" aria-multiselectable="true">${
    people.length
      ? people
          .map(
            (p) =>
              `<label class="msel-opt" data-s="${h((P(p.pid).name + " " + p.sub).toLowerCase())}"><input class="chk" type="checkbox" name="${name}" value="${p.pid}" ${sel.includes(p.pid) ? "checked" : ""} data-msel-k="${key}"><span class="av">${ini(p.pid)}</span><span class="col" style="min-width:0"><b>${nm(p.pid)}</b><span class="cap">${h(p.sub)}</span></span></label>`,
          )
          .join("") +
        `<p class="cap msel-none" hidden>No one matches that search.</p>`
      : `<p class="cap" style="padding:10px">${h(o.none || "Everyone eligible is already included.")}</p>`
  }</div>
  <span class="help"><span class="msel-n">${sel.length}</span> selected${o.help ? " · " + o.help : ""}</span>${fe(form, name) ? `<span class="emsg" role="alert">${ic("alert", 14)}${fe(form, name)}</span>` : ""}</div>`;
}
const mselReset = (form, name) => delete UI.msel[form + "_" + name];
function mselSync(root) {
  const key = root.dataset.msel;
  const sel = [...root.querySelectorAll(".msel-list input:checked")].map(
    (i) => i.value,
  );
  UI.msel[key] = sel;
  const box = root.querySelector(".msel-box");
  box.querySelectorAll(".mchip").forEach((c) => c.remove());
  const q = box.querySelector(".msel-q");
  sel.forEach((pid) =>
    q.insertAdjacentHTML(
      "beforebegin",
      `<span class="mchip" data-pid="${pid}"><span class="av">${ini(pid)}</span>${nm(pid)}<button type="button" class="mchip-x" data-a="mselX" data-k="${key}" data-pid="${pid}" aria-label="Remove ${nm(pid)}">${ic("x", 12)}</button></span>`,
    ),
  );
  q.placeholder = sel.length ? "Add more…" : "Search by name or role";
  root.querySelector(".msel-n").textContent = sel.length;
}
A.mselOpen = (d, el, e) => {
  const root = el.closest(".msel");
  if (e && e.target.closest(".mchip-x")) return;
  mselShow(root);
  root.querySelector(".msel-q").setAttribute("aria-expanded", "true");
  root.querySelector(".msel-q").focus();
};
A.mselX = (d, el) => {
  const root = el.closest(".msel");
  const i = root.querySelector(`.msel-list input[value="${d.pid}"]`);
  if (i) i.checked = false;
  mselSync(root);
};
document.addEventListener("change", (e) => {
  const i = e.target;
  if (i.dataset && i.dataset.mselK) mselSync(i.closest(".msel"));
});
document.addEventListener("input", (e) => {
  const q = e.target;
  if (!q.classList || !q.classList.contains("msel-q")) return;
  const root = q.closest(".msel");
  mselShow(root);
  const v = q.value.trim().toLowerCase();
  let shown = 0;
  root.querySelectorAll(".msel-opt").forEach((o) => {
    const hit = !v || o.dataset.s.includes(v);
    o.hidden = !hit;
    if (hit) shown++;
  });
  const none = root.querySelector(".msel-none");
  if (none) none.hidden = shown > 0;
});
document.addEventListener("focusin", (e) => {
  const q = e.target;
  if (q.classList && q.classList.contains("msel-q")) {
    mselShow(q.closest(".msel"));
    q.setAttribute("aria-expanded", "true");
  }
});
document.addEventListener("keydown", (e) => {
  const q = e.target;
  if (q.classList && q.classList.contains("msel-q")) {
    if (e.key === "Enter") {
      e.preventDefault();
      const first = [...q.closest(".msel").querySelectorAll(".msel-opt")].find(
        (o) => !o.hidden,
      );
      if (first) {
        const i = first.querySelector("input");
        i.checked = !i.checked;
        mselSync(q.closest(".msel"));
        q.value = "";
        q.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    if (e.key === "Escape") {
      e.stopPropagation();
      q.closest(".msel").classList.remove("open");
    }
  }
});
document.addEventListener("mousedown", (e) => {
  document.querySelectorAll(".msel.open").forEach((m) => {
    if (!m.contains(e.target)) {
      m.classList.remove("open");
      const q = m.querySelector(".msel-q");
      if (q) q.setAttribute("aria-expanded", "false");
    }
  });
});
// Re-render after a select changes what the form shows; keep what the person already typed.
A.reRender = () => {
  snapForms();
  render();
};
