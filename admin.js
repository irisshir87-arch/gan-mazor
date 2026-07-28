(async function () {
  "use strict";

  const stateApi = window.GanState;
  const toast = document.getElementById("adminToast");
  let context;
  let data;

  const showToast = message => {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window.adminToastTimer);
    window.adminToastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  };

  const values = form => Object.fromEntries(new FormData(form).entries());

  function showFatal(message) {
    document.body.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:24px">
        <section class="admin-card" style="max-width:440px;text-align:center">
          <h1>אזור הניהול</h1><p>${message}</p><a href="index.html">חזרה לאפליקציה</a>
        </section>
      </main>`;
  }

  function configureRoleTabs() {
    const role = context.membership.role;
    const allowed = role === "admin"
      ? ["today", "calendar", "albums", "committee"]
      : role === "staff"
        ? ["today", "calendar", "albums"]
        : role === "committee"
          ? ["committee"]
          : [];

    document.querySelectorAll(".admin-tab").forEach(button => {
      button.hidden = !allowed.includes(button.dataset.adminTarget);
      button.addEventListener("click", () => {
        document.querySelectorAll(".admin-tab").forEach(item => item.classList.toggle("active", item === button));
        document.querySelectorAll(".admin-panel").forEach(panel => panel.classList.toggle("active", panel.dataset.adminPanel === button.dataset.adminTarget));
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    document.querySelectorAll(".admin-panel").forEach(panel => panel.hidden = !allowed.includes(panel.dataset.adminPanel));
    const first = document.querySelector(`.admin-tab[data-admin-target="${allowed[0]}"]`);
    if (first) first.click();
  }

  const todayForm = document.getElementById("todayForm");
  function fillToday() {
    const home = data.home;
    const f = todayForm.elements;
    f.morningName1.value = home.morning[0]?.name || "";
    f.morningRole1.value = home.morning[0]?.role || "";
    f.morningName2.value = home.morning[1]?.name || "";
    f.morningRole2.value = home.morning[1]?.role || "";
    f.afternoonName1.value = home.afternoon[0]?.name || "";
    f.afternoonRole1.value = home.afternoon[0]?.role || "";
    f.afternoonName2.value = home.afternoon[1]?.name || "";
    f.afternoonRole2.value = home.afternoon[1]?.role || "";
    f.meetingTitle.value = home.meetingTitle || "";
    f.meetingDetails.value = home.meetingDetails || "";
    f.activityTitle.value = home.activityTitle || "";
    f.reminder.value = home.reminder || "";
    f.shabbat1.value = home.shabbat[0]?.name || "";
    f.shabbat2.value = home.shabbat[1]?.name || "";
  }

  todayForm.addEventListener("submit", async event => {
    event.preventDefault();
    const formValues = values(todayForm);
    const home = {
      morning: [
        { name: formValues.morningName1, role: formValues.morningRole1, image: data.home.morning[0]?.image || "assets/staff-yael.svg" },
        { name: formValues.morningName2, role: formValues.morningRole2, image: data.home.morning[1]?.image || "assets/staff-michal.svg" }
      ],
      afternoon: [
        { name: formValues.afternoonName1, role: formValues.afternoonRole1, image: data.home.afternoon[0]?.image || "assets/staff-liron.svg" },
        { name: formValues.afternoonName2, role: formValues.afternoonRole2, image: data.home.afternoon[1]?.image || "assets/staff-shira.svg" }
      ],
      meetingTitle: formValues.meetingTitle,
      meetingDetails: formValues.meetingDetails,
      activityTitle: formValues.activityTitle,
      reminder: formValues.reminder,
      shabbat: [
        { name: formValues.shabbat1, image: data.home.shabbat[0]?.image || "assets/kid-noam.svg" },
        { name: formValues.shabbat2, image: data.home.shabbat[1]?.image || "assets/kid-aya.svg" }
      ]
    };
    try {
      await stateApi.saveDaily(context, home);
      data = await stateApi.loadSharedData(context);
      fillToday();
      showToast("עדכון היום נשמר ב-Supabase.");
    } catch (error) {
      showToast(error.message || "לא ניתן לשמור.");
    }
  });

  const adminEvents = document.getElementById("adminEvents");
  function renderEvents() {
    adminEvents.innerHTML = "";
    if (!data.events.length) adminEvents.innerHTML = '<div class="muted">אין אירועים עדיין.</div>';
    data.events.forEach(item => {
      const row = document.createElement("div");
      row.className = "admin-list-row";
      row.innerHTML = `<div><strong></strong><div class="meta"></div></div><span class="small-badge"></span><button class="danger-button">מחיקה</button>`;
      row.querySelector("strong").textContent = item.title;
      row.querySelector(".meta").textContent = `${item.date} · ${item.details || "ללא פרטים"}`;
      const badge = row.querySelector(".small-badge");
      badge.className = `small-badge ${item.type}`;
      badge.textContent = item.type === "no-kindergarten" ? "אין גן" : item.type === "birthday" ? "יום הולדת" : "אירוע";
      row.querySelector("button").addEventListener("click", async () => {
        try {
          await stateApi.deleteEvent(item.id);
          data = await stateApi.loadSharedData(context);
          renderEvents();
          showToast("האירוע נמחק.");
        } catch (error) {
          showToast(error.message || "לא ניתן למחוק.");
        }
      });
      adminEvents.appendChild(row);
    });
  }

  document.getElementById("eventForm").addEventListener("submit", async event => {
    event.preventDefault();
    const formValues = values(event.currentTarget);
    try {
      await stateApi.addEvent(context, {
        date: formValues.eventDate,
        title: formValues.eventTitle,
        details: formValues.eventDetails,
        type: formValues.eventType
      });
      event.currentTarget.reset();
      data = await stateApi.loadSharedData(context);
      renderEvents();
      showToast("האירוע נוסף ללוח השנה.");
    } catch (error) {
      showToast(error.message || "לא ניתן להוסיף אירוע.");
    }
  });

  const adminAlbums = document.getElementById("adminAlbums");
  function renderAlbums() {
    adminAlbums.innerHTML = "";
    if (!data.albums.length) adminAlbums.innerHTML = '<div class="muted">אין אלבומים פעילים.</div>';
    data.albums.forEach(album => {
      const row = document.createElement("div");
      row.className = "admin-list-row";
      row.innerHTML = `<div><strong>${album.date}</strong><div class="meta">${album.photos.length} תמונות · תפוגה: ${new Date(album.expires).toLocaleDateString("he-IL")}</div></div><span class="small-badge">${album.photos.length} תמונות</span><button class="danger-button">מחיקה</button>`;
      row.querySelector("button").addEventListener("click", async () => {
        try {
          await stateApi.deleteAlbum(album);
          data = await stateApi.loadSharedData(context);
          renderAlbums();
          showToast("האלבום נמחק.");
        } catch (error) {
          showToast(error.message || "לא ניתן למחוק אלבום.");
        }
      });
      adminAlbums.appendChild(row);
    });
  }

  document.getElementById("albumForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    try {
      button.disabled = true;
      button.textContent = "מעלה תמונות…";
      await stateApi.createAlbum(context, form.elements.albumDate.value, [...form.elements.albumFiles.files]);
      form.reset();
      data = await stateApi.loadSharedData(context);
      renderAlbums();
      showToast("האלבום נשמר באחסון הפרטי.");
    } catch (error) {
      showToast(error.message || "לא ניתן ליצור אלבום.");
    } finally {
      button.disabled = false;
      button.textContent = "יצירת אלבום";
    }
  });

  const fundForm = document.getElementById("fundForm");
  function fillCommittee() {
    fundForm.elements.collected.value = data.fund.collected_amount || 0;
    fundForm.elements.paybox.value = data.fund.paybox_url || "";

    const poll = data.initiatives.find(item => item.initiative_type === "poll");
    const pollForm = document.getElementById("pollForm");
    const pollOptions = Array.isArray(poll?.payload?.options) ? poll.payload.options : [];
    pollForm.elements.pollTitle.value = poll?.title || "";
    pollForm.elements.pollOption1.value = typeof pollOptions[0] === "string" ? pollOptions[0] : pollOptions[0]?.label || "";
    pollForm.elements.pollOption2.value = typeof pollOptions[1] === "string" ? pollOptions[1] : pollOptions[1]?.label || "";
    pollForm.elements.pollActive.checked = Boolean(poll?.active ?? true);

    const treats = data.initiatives.find(item => item.initiative_type === "treats");
    const treatsForm = document.getElementById("treatsForm");
    const items = Array.isArray(treats?.payload?.items) ? treats.payload.items : [];
    treatsForm.elements.treatsTitle.value = treats?.title || "";
    treatsForm.elements.treatItems.value = items.map(item => typeof item === "string" ? item : item.label).join("\n");
    treatsForm.elements.treatsActive.checked = Boolean(treats?.active ?? true);
  }

  fundForm.addEventListener("submit", async event => {
    event.preventDefault();
    const formValues = values(event.currentTarget);
    try {
      await stateApi.saveFund(context, formValues.collected, formValues.paybox);
      data = await stateApi.loadSharedData(context);
      fillCommittee();
      showToast("קופת הוועד נשמרה.");
    } catch (error) {
      showToast(error.message || "לא ניתן לשמור את הקופה.");
    }
  });

  document.getElementById("expenseForm").addEventListener("submit", async event => {
    event.preventDefault();
    const formValues = values(event.currentTarget);
    try {
      await stateApi.addExpense(context, { description: formValues.description, amount: formValues.amount, date: formValues.expenseDate });
      event.currentTarget.reset();
      data = await stateApi.loadSharedData(context);
      showToast("ההוצאה נוספה.");
    } catch (error) {
      showToast(error.message || "לא ניתן להוסיף הוצאה.");
    }
  });

  document.getElementById("pollForm").addEventListener("submit", async event => {
    event.preventDefault();
    const formValues = values(event.currentTarget);
    try {
      await stateApi.saveInitiative(context, "poll", formValues.pollTitle, {
        options: [
          { id: "option-1", label: formValues.pollOption1, value: formValues.pollOption1 },
          { id: "option-2", label: formValues.pollOption2, value: formValues.pollOption2 }
        ]
      }, event.currentTarget.elements.pollActive.checked);
      data = await stateApi.loadSharedData(context);
      fillCommittee();
      showToast("הסקר נשמר.");
    } catch (error) {
      showToast(error.message || "לא ניתן לשמור סקר.");
    }
  });

  document.getElementById("treatsForm").addEventListener("submit", async event => {
    event.preventDefault();
    const formValues = values(event.currentTarget);
    const items = formValues.treatItems.split("\n").map(label => label.trim()).filter(Boolean).map((label, index) => ({ id: `item-${index + 1}`, label }));
    try {
      await stateApi.saveInitiative(context, "treats", formValues.treatsTitle, { items }, event.currentTarget.elements.treatsActive.checked);
      data = await stateApi.loadSharedData(context);
      fillCommittee();
      showToast("רשימת הכיבוד נשמרה.");
    } catch (error) {
      showToast(error.message || "לא ניתן לשמור רשימת כיבוד.");
    }
  });

  try {
    context = await stateApi.requireContext(["staff", "committee", "admin"]);
    document.querySelector(".admin-topbar .status-badge").textContent = `מחובר/ת · ${context.membership.role}`;
    configureRoleTabs();
    if (["staff", "admin"].includes(context.membership.role)) {
      await stateApi.cleanupExpiredAlbums(context);
    }
    data = await stateApi.loadSharedData(context);
    fillToday();
    renderEvents();
    renderAlbums();
    fillCommittee();
  } catch (error) {
    console.error(error);
    showFatal(error.message || "לא ניתן לפתוח את אזור הניהול.");
  }
})();
