const screens = [...document.querySelectorAll(".screen")];
const navItems = [...document.querySelectorAll(".nav-item")];
const toast = document.getElementById("toast");

function hydrateSharedState() {
  if (!window.GanState) return;
  const state = window.GanState.load();
  const home = state.home;
  const people = [...document.querySelectorAll(".staff-card .person")];
  [...home.morning, ...home.afternoon].forEach((person, index) => {
    const node = people[index];
    if (!node) return;
    node.querySelector("strong").textContent = person.name;
    node.querySelector("span").textContent = person.role;
    node.querySelector("img").src = person.image;
  });
  const updated = document.querySelector("#homeScreen .status-badge");
  if (updated) updated.textContent = `עודכן ${home.updatedAt}`;
  const meeting = document.querySelector("#meetingToggle small");
  if (meeting) meeting.textContent = home.meetingTitle;
  if (meetingDetails) meetingDetails.textContent = home.meetingDetails;
  const activity = document.querySelector(".simple-row small");
  if (activity) activity.textContent = home.activityTitle;
  const reminder = document.querySelector(".reminder-card h3");
  if (reminder) reminder.textContent = home.reminder;
  const kids = [...document.querySelectorAll(".shabbat-kids .kid")];
  home.shabbat.forEach((kid, index) => {
    if (!kids[index]) return;
    kids[index].querySelector("strong").textContent = kid.name;
    kids[index].querySelector("img").src = kid.image;
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function navigate(target) {
  screens.forEach(screen => screen.classList.toggle("active", screen.dataset.screen === target));
  navItems.forEach(item => item.classList.toggle("active", item.dataset.target === target));
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.getElementById("app").focus({ preventScroll: true });
  history.replaceState(null, "", `#${target}`);
}

navItems.forEach(item => item.addEventListener("click", () => navigate(item.dataset.target)));
document.querySelectorAll("[data-go]").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.go)));

const meetingToggle = document.getElementById("meetingToggle");
const meetingDetails = document.getElementById("meetingDetails");
meetingToggle.addEventListener("click", () => {
  const expanded = meetingToggle.getAttribute("aria-expanded") === "true";
  meetingToggle.setAttribute("aria-expanded", String(!expanded));
  meetingDetails.hidden = expanded;
});

const calendarGrid = document.getElementById("calendarGrid");
const days = [
  {n: 28, muted: true}, {n: 29, muted: true}, {n: 30, muted: true}, {n: 1}, {n: 2}, {n: 3}, {n: 4},
  {n: 5}, {n: 6}, {n: 7}, {n: 8}, {n: 9}, {n: 10}, {n: 11},
  {n: 12}, {n: 13}, {n: 14, birthday: true}, {n: 15}, {n: 16}, {n: 17}, {n: 18},
  {n: 19}, {n: 20}, {n: 21}, {n: 22}, {n: 23}, {n: 24, today: true}, {n: 25},
  {n: 26}, {n: 27, noKindergarten: true}, {n: 28, noKindergarten: true}, {n: 29}, {n: 30, event: true}, {n: 31}, {n: 1, muted: true}
];
days.forEach(day => {
  const el = document.createElement("div");
  el.className = "calendar-day";
  if (day.muted) el.classList.add("muted-day");
  if (day.today) el.classList.add("today");
  if (day.noKindergarten) el.classList.add("no-kindergarten");
  if (day.birthday) el.classList.add("birthday");
  if (day.event) el.classList.add("event");
  el.textContent = day.n;
  calendarGrid.appendChild(el);
});

document.getElementById("addReminderBtn").addEventListener("click", () => showToast("בגרסה המחוברת תיפתח הוספת תזכורת"));
document.getElementById("showAllExpenses").addEventListener("click", () => showToast("מוצגות הוצאות הדוגמה של הוועד"));

const profileModal = document.getElementById("profileModal");
const profileChip = document.getElementById("profileChip");
const profileForm = document.getElementById("profileForm");
const profileLabel = document.getElementById("profileLabel");
const parentName = document.getElementById("parentName");
const childName = document.getElementById("childName");
const relation = document.getElementById("relation");

function loadProfile() {
  const profile = JSON.parse(localStorage.getItem("ganMazorProfile") || "null");
  if (!profile) {
    profileModal.hidden = false;
    return;
  }
  profileLabel.textContent = `${profile.relation} ${profile.childName}`;
  document.querySelector(".profile-avatar").textContent = profile.parentName.charAt(0) || "ה";
  parentName.value = profile.parentName;
  childName.value = profile.childName;
  relation.value = profile.relation;
}

profileChip.addEventListener("click", () => profileModal.hidden = false);
document.querySelectorAll("[data-close-modal]").forEach(btn => btn.addEventListener("click", () => profileModal.hidden = true));
profileForm.addEventListener("submit", e => {
  e.preventDefault();
  const profile = {
    parentName: parentName.value.trim(),
    childName: childName.value.trim(),
    relation: relation.value
  };
  localStorage.setItem("ganMazorProfile", JSON.stringify(profile));
  profileModal.hidden = true;
  loadProfile();
hydrateSharedState();
window.addEventListener("gan-state-change", hydrateSharedState);
  showToast("הפרופיל נשמר");
});

const communityModal = document.getElementById("communityModal");
const communityForm = document.getElementById("communityForm");
const communityType = document.getElementById("communityType");
const communityValue = document.getElementById("communityValue");
const communityInputLabel = document.getElementById("communityInputLabel");
const communityExtraLabel = document.getElementById("communityExtraLabel");
const communityExtraValue = document.getElementById("communityExtraValue");
const communityFormTitle = document.getElementById("communityFormTitle");
const communityFeed = document.getElementById("communityFeed");

const formConfig = {
  pickup: { title: "עזרה באיסוף", label: "שם הילד", placeholder: "לדוגמה: נועם", icon: "🚗", action: "אני יכול/ה לעזור" },
  give: { title: "למסירה", label: "מה מוסרים?", placeholder: "לדוגמה: מיטת תינוק", icon: "🎁", action: "מתעניין/ת" },
  park: { title: "בילוי בגינה", label: "שם הילד", placeholder: "לדוגמה: איה", extraLabel: "שם הגינה", extraPlaceholder: "לדוגמה: גינת השקד", icon: "🌳", action: "מצטרפים" }
};

document.querySelectorAll("[data-community-form]").forEach(btn => btn.addEventListener("click", () => {
  const type = btn.dataset.communityForm;
  const config = formConfig[type];
  communityType.value = type;
  communityFormTitle.textContent = config.title;
  communityInputLabel.firstChild.textContent = config.label;
  communityValue.placeholder = config.placeholder;
  communityValue.value = "";
  if (config.extraLabel) {
    communityExtraLabel.hidden = false;
    communityExtraLabel.firstChild.textContent = config.extraLabel;
    communityExtraValue.placeholder = config.extraPlaceholder || "";
    communityExtraValue.value = "";
    communityExtraValue.required = true;
  } else {
    communityExtraLabel.hidden = true;
    communityExtraValue.value = "";
    communityExtraValue.required = false;
  }
  communityModal.hidden = false;
  setTimeout(() => communityValue.focus(), 80);
}));

document.querySelectorAll("[data-close-community]").forEach(btn => btn.addEventListener("click", () => communityModal.hidden = true));

communityForm.addEventListener("submit", e => {
  e.preventDefault();
  const type = communityType.value;
  const config = formConfig[type];
  const value = communityValue.value.trim();
  const extra = communityExtraValue ? communityExtraValue.value.trim() : "";
  const title = type === "pickup" ? value :
                type === "park" ? value : value;
  const meta = type === "pickup" ? "בקשה פתוחה להיום" :
               type === "park" ? extra : "פריט אחד פשוט וברור";

  const card = document.createElement("article");
  card.className = "community-card";
  card.innerHTML = `
    <div class="community-card-icon">${config.icon}</div>
    <div class="community-card-content">
      <span class="tag">${config.title}</span>
      <h3>${title}</h3>
      <p class="community-meta">${meta}</p>
      <button class="secondary-button respond-btn">${config.action}</button>
    </div>`;
  communityFeed.prepend(card);
  card.querySelector(".respond-btn").addEventListener("click", () => showToast("המענה נשלח באופן פרטי למפרסם/ת"));
  communityModal.hidden = true;
  showToast("הפרסום נוסף לקהילה");
});

document.querySelectorAll(".respond-btn").forEach(btn => btn.addEventListener("click", () => showToast("המענה נשלח באופן פרטי למפרסם/ת")));

document.getElementById("voteBtn").addEventListener("click", () => {
  const selected = document.querySelector('input[name="summerPoll"]:checked');
  if (!selected) return showToast("בחרו אפשרות לפני שליחת ההצבעה");
  localStorage.setItem("ganMazorVote", selected.value);
  showToast("ההצבעה נשמרה");
});

document.querySelectorAll(".treat-item:not(.taken)").forEach(btn => btn.addEventListener("click", () => {
  const profile = JSON.parse(localStorage.getItem("ganMazorProfile") || "null");
  const child = profile?.childName || "הילד/ה";
  btn.classList.add("taken");
  btn.disabled = true;
  btn.querySelector("small").textContent = child;
  showToast(`נרשמתם להביא: ${btn.dataset.item}`);
}));

window.addEventListener("hashchange", () => {
  const target = location.hash.replace("#", "");
  if (screens.some(s => s.dataset.screen === target)) navigate(target);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

const initialTarget = location.hash.replace("#", "");
if (screens.some(s => s.dataset.screen === initialTarget)) navigate(initialTarget);
loadProfile();
hydrateSharedState();
window.addEventListener("gan-state-change", hydrateSharedState);
