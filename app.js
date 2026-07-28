(function () {
  "use strict";

  const screens = [...document.querySelectorAll(".screen")];
  const navItems = [...document.querySelectorAll(".nav-item")];
  const toast = document.getElementById("toast");
  let context;
  let data;
  let allowedScreenNames = ["home", "calendar", "albums", "community", "committee"];
  const calendarViewDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let selectedCalendarDate = null;

  // לוח החופשות הרשמי בגנים ובבתי הספר היסודיים בחינוך היהודי, תשפ"ז.
  // החופשות מוצגות אוטומטית ואינן דורשות הזנה ידנית של הצוות.
  const EDUCATION_CLOSURES = [
    { start: "2026-07-01", end: "2026-08-31", title: "חופשת הקיץ" },
    { start: "2026-09-11", end: "2026-09-13", title: "חופשת ראש השנה" },
    { start: "2026-09-20", end: "2026-09-21", title: "חופשת יום כיפור" },
    { start: "2026-09-25", end: "2026-10-04", title: "חופשת סוכות" },
    { start: "2026-12-06", end: "2026-12-12", title: "חופשת חנוכה" },
    { start: "2027-03-23", end: "2027-03-24", title: "חופשת פורים" },
    { start: "2027-04-13", end: "2027-04-29", title: "חופשת פסח" },
    { start: "2027-05-12", end: "2027-05-12", title: "יום העצמאות" },
    { start: "2027-06-10", end: "2027-06-11", title: "חופשת שבועות" },
    { start: "2027-07-01", end: "2027-08-31", title: "חופשת הקיץ" }
  ];

  // חגי ישראל מוצגים כאירועים עצמאיים בלוח, בנוסף לסימון ימי החופשה.
  const ISRAEL_HOLIDAYS = [
    { start: "2026-09-12", end: "2026-09-13", title: "ראש השנה" },
    { start: "2026-09-21", end: "2026-09-21", title: "יום כיפור" },
    { start: "2026-09-26", end: "2026-10-02", title: "סוכות" },
    { start: "2026-10-03", end: "2026-10-03", title: "שמחת תורה" },
    { start: "2026-12-05", end: "2026-12-12", title: "חנוכה" },
    { start: "2027-01-23", end: "2027-01-23", title: "ט״ו בשבט" },
    { start: "2027-03-23", end: "2027-03-23", title: "פורים" },
    { start: "2027-04-22", end: "2027-04-28", title: "פסח" },
    { start: "2027-05-12", end: "2027-05-12", title: "יום העצמאות" },
    { start: "2027-05-25", end: "2027-05-25", title: "ל״ג בעומר" },
    { start: "2027-06-11", end: "2027-06-11", title: "שבועות" }
  ];

  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function showFatal(message) {
    document.body.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f6f6f3">
        <section style="max-width:440px;background:#fff;padding:28px;border-radius:24px;border:1px solid #e3e5e8;text-align:center">
          <h1 style="margin-top:0">גן מזור</h1>
          <p style="line-height:1.7;color:#6e7480">${escapeHtml(message)}</p>
          <a href="login.html" style="display:inline-block;margin-top:12px;color:#17213d;font-weight:700">חזרה למסך הכניסה</a>
        </section>
      </main>`;
  }

  function configureRoleVisibility() {
    const role = context.membership.role;
    allowedScreenNames = role === "staff"
      ? ["home", "calendar", "albums"]
      : ["home", "calendar", "albums", "community", "committee"];

    screens.forEach(screen => {
      const allowed = allowedScreenNames.includes(screen.dataset.screen);
      screen.hidden = !allowed;
      if (!allowed) screen.classList.remove("active");
    });

    navItems.forEach(item => {
      item.hidden = !allowedScreenNames.includes(item.dataset.target);
    });

    const visibleNavItems = navItems.filter(item => !item.hidden);
    const navigation = document.querySelector(".bottom-nav");
    navigation.style.gridTemplateColumns = `repeat(${visibleNavItems.length}, 1fr)`;
  }

  function navigate(target) {
    const safeTarget = allowedScreenNames.includes(target) ? target : "home";
    screens.forEach(screen => screen.classList.toggle("active", screen.dataset.screen === safeTarget));
    navItems.forEach(item => item.classList.toggle("active", item.dataset.target === safeTarget));
    window.scrollTo({ top: 0, behavior: "smooth" });
    history.replaceState(null, "", `#${safeTarget}`);
  }

  navItems.forEach(item => item.addEventListener("click", () => navigate(item.dataset.target)));
  document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.go)));

  const meetingToggle = document.getElementById("meetingToggle");
  const meetingDetails = document.getElementById("meetingDetails");
  meetingToggle.addEventListener("click", () => {
    const expanded = meetingToggle.getAttribute("aria-expanded") === "true";
    meetingToggle.setAttribute("aria-expanded", String(!expanded));
    meetingDetails.hidden = expanded;
  });

  function formatDate(date, options = { day: "2-digit", month: "long", year: "numeric" }) {
    return new Intl.DateTimeFormat("he-IL", options).format(new Date(`${date}T12:00:00`));
  }

  function renderProfile() {
    const { membership } = context;
    document.getElementById("profileLabel").textContent = `${membership.relation_label} ${membership.child_name}`;
    document.querySelector(".profile-avatar").textContent = (membership.parent_name || "ה").charAt(0);

    const profileModal = document.getElementById("profileModal");
    const form = document.getElementById("profileForm");
    document.getElementById("parentName").value = membership.parent_name;
    document.getElementById("childName").value = membership.child_name;
    document.getElementById("relation").value = membership.relation_label;
    [...form.querySelectorAll("input,select")].forEach(field => field.disabled = true);
    const submit = form.querySelector('button[type="submit"]');
    submit.type = "button";
    submit.textContent = "התנתקות";
    submit.addEventListener("click", () => window.GanState.signOut());

    document.getElementById("profileChip").addEventListener("click", () => profileModal.hidden = false);
    document.querySelectorAll("[data-close-modal]").forEach(button => button.addEventListener("click", () => profileModal.hidden = true));
  }

  function renderHome() {
    const home = data.home;
    document.querySelector("#homeScreen .screen-heading .eyebrow").textContent =
      new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
    const people = [...document.querySelectorAll(".staff-card .person")];
    [...home.morning, ...home.afternoon].forEach((person, index) => {
      const node = people[index];
      if (!node) return;
      node.querySelector("strong").textContent = person.name || "";
      node.querySelector("span").textContent = person.role || "";
      node.querySelector("img").src = person.image || people[index].querySelector("img").src;
    });

    document.querySelector("#homeScreen .status-badge").textContent = home.updatedAt ? `עודכן ${home.updatedAt}` : "טרם עודכן";
    document.querySelector("#meetingToggle small").textContent = home.meetingTitle;
    meetingDetails.textContent = home.meetingDetails || "לא פורסמה הרחבה נוספת.";
    document.querySelector(".simple-row small").textContent = home.activityTitle;
    document.querySelector(".reminder-card h3").textContent = home.reminder;

    const kids = [...document.querySelectorAll(".shabbat-kids .kid")];
    home.shabbat.forEach((kid, index) => {
      if (!kids[index]) return;
      kids[index].querySelector("strong").textContent = kid.name || "טרם נבחר";
      if (kid.image) kids[index].querySelector("img").src = kid.image;
    });

    const album = data.albums[0];
    const albumCard = document.querySelector(".daily-album-card");
    albumCard.querySelector("h3").textContent = album ? `${album.photos.length} תמונות מהאלבום האחרון` : "אין אלבום חדש";
    const preview = albumCard.querySelector(".album-preview");
    preview.innerHTML = "";
    (album?.photos || []).slice(0, 3).forEach(photo => {
      const image = document.createElement("img");
      image.src = photo.url;
      image.alt = "תמונה מהאלבום היומי";
      preview.appendChild(image);
    });
    preview.hidden = !album;
  }

  function isoDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function closureForDate(iso) {
    const date = new Date(`${iso}T12:00:00`);
    if (date.getDay() === 6) return null;
    return EDUCATION_CLOSURES.find(closure => iso >= closure.start && iso <= closure.end) || null;
  }

  function holidayForDate(iso) {
    return ISRAEL_HOLIDAYS.find(holiday => iso >= holiday.start && iso <= holiday.end) || null;
  }

  function formatRange(start, end) {
    const startDate = new Date(`${start}T12:00:00`);
    const endDate = new Date(`${end}T12:00:00`);
    if (start === end) return formatDate(start, { day: "numeric", month: "long" });
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.getDate()}–${endDate.getDate()} ${new Intl.DateTimeFormat("he-IL", { month: "long" }).format(endDate)}`;
    }
    return `${formatDate(start, { day: "numeric", month: "short" })}–${formatDate(end, { day: "numeric", month: "short" })}`;
  }

  function calendarItemsForDate(iso) {
    const items = [];
    const holiday = holidayForDate(iso);
    const closure = closureForDate(iso);

    if (holiday) {
      items.push({
        type: "holiday",
        title: holiday.title,
        details: holiday.start === holiday.end ? "חג ישראל" : formatRange(holiday.start, holiday.end)
      });
    }

    if (closure) {
      items.push({
        type: "no-kindergarten",
        title: "אין גן",
        details: closure.title
      });
    }

    data.events
      .filter(event => event.date === iso)
      .forEach(event => items.push({
        type: event.type || "event",
        title: event.title,
        details: event.details || ""
      }));

    return items;
  }

  function calendarTypeLabel(type) {
    return ({
      holiday: "חג",
      birthday: "יום הולדת",
      "no-kindergarten": "אין גן",
      event: "אירוע",
      reminder: "תזכורת"
    })[type] || "אירוע";
  }

  function showCalendarDayDetails(iso) {
    selectedCalendarDate = iso;
    const panel = document.getElementById("calendarDayDetails");
    const title = document.getElementById("calendarSelectedDate");
    const list = document.getElementById("calendarSelectedItems");
    const items = calendarItemsForDate(iso);

    title.textContent = formatDate(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    list.innerHTML = "";

    if (!items.length) {
      list.innerHTML = '<p class="calendar-empty-day">אין אירוע, חג או יום הולדת ביום הזה.</p>';
    } else {
      items.forEach(item => {
        const row = document.createElement("article");
        row.className = `calendar-selected-item ${escapeHtml(item.type)}`;
        row.innerHTML = `
          <span class="calendar-selected-type">${escapeHtml(calendarTypeLabel(item.type))}</span>
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            ${item.details ? `<span>${escapeHtml(item.details)}</span>` : ""}
          </div>`;
        list.appendChild(row);
      });
    }

    panel.hidden = false;
    document.querySelectorAll(".calendar-day").forEach(day => {
      day.classList.toggle("selected", day.dataset.date === iso);
    });
  }

  function renderCalendar() {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const monthLabel = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(calendarViewDate);
    document.getElementById("calendarMonthLabel").textContent = monthLabel;

    const selectedPanel = document.getElementById("calendarDayDetails");
    if (selectedCalendarDate) {
      const selected = new Date(`${selectedCalendarDate}T12:00:00`);
      if (selected.getFullYear() !== year || selected.getMonth() !== month) {
        selectedCalendarDate = null;
        selectedPanel.hidden = true;
      }
    }

    const grid = document.getElementById("calendarGrid");
    grid.innerHTML = "";
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousDays = new Date(year, month, 0).getDate();
    const cells = Math.ceil((first.getDay() + daysInMonth) / 7) * 7;
    const eventsByDate = new Map();

    data.events.forEach(event => {
      const existing = eventsByDate.get(event.date) || [];
      existing.push(event);
      eventsByDate.set(event.date, existing);
    });

    for (let cell = 0; cell < cells; cell += 1) {
      const dayOffset = cell - first.getDay() + 1;
      let displayDay;
      let cellDate;
      let muted = false;

      if (dayOffset < 1) {
        displayDay = previousDays + dayOffset;
        cellDate = new Date(year, month - 1, displayDay);
        muted = true;
      } else if (dayOffset > daysInMonth) {
        displayDay = dayOffset - daysInMonth;
        cellDate = new Date(year, month + 1, displayDay);
        muted = true;
      } else {
        displayDay = dayOffset;
        cellDate = new Date(year, month, displayDay);
      }

      const iso = isoDate(cellDate);
      const dayEvents = eventsByDate.get(iso) || [];
      const closure = closureForDate(iso);
      const holiday = holidayForDate(iso);
      const element = document.createElement("button");
      element.type = "button";
      element.className = "calendar-day";
      element.dataset.date = iso;
      element.setAttribute("aria-label", formatDate(iso, { weekday: "long", day: "numeric", month: "long" }));

      const isSaturday = cellDate.getDay() === 6;
      if (muted) element.classList.add("muted-day");
      if (iso === window.GanState.todayIso()) element.classList.add("today");
      if (!isSaturday && (closure || dayEvents.some(event => event.type === "no-kindergarten"))) element.classList.add("no-kindergarten");
      if (holiday || dayEvents.some(event => event.type === "holiday")) element.classList.add("holiday");
      if (dayEvents.some(event => event.type === "birthday")) element.classList.add("birthday");
      if (dayEvents.some(event => !["birthday", "holiday", "no-kindergarten"].includes(event.type))) element.classList.add("event");

      const descriptions = [
        holiday?.title,
        closure?.title,
        ...dayEvents.map(event => event.title)
      ].filter(Boolean);
      if (descriptions.length) element.title = descriptions.join(" · ");

      element.textContent = displayDay;
      if (selectedCalendarDate === iso) element.classList.add("selected");
      element.addEventListener("click", () => showCalendarDayDetails(iso));
      grid.appendChild(element);
    }

    const monthStart = isoDate(new Date(year, month, 1));
    const monthEnd = isoDate(new Date(year, month + 1, 0));
    const monthlyItems = [
      ...ISRAEL_HOLIDAYS
        .filter(holiday => holiday.end >= monthStart && holiday.start <= monthEnd)
        .map(holiday => ({
          id: `holiday-${holiday.start}`,
          date: holiday.start < monthStart ? monthStart : holiday.start,
          end: holiday.end,
          title: holiday.title,
          details: formatRange(holiday.start, holiday.end),
          type: "holiday",
          official: true
        })),
      ...EDUCATION_CLOSURES
        .filter(closure => closure.end >= monthStart && closure.start <= monthEnd)
        .map(closure => ({
          id: `closure-${closure.start}`,
          date: closure.start < monthStart ? monthStart : closure.start,
          end: closure.end,
          title: "אין גן",
          details: `${closure.title} · ${formatRange(closure.start, closure.end)}`,
          type: "no-kindergarten",
          official: true
        })),
      ...data.events
        .filter(event => event.date >= monthStart && event.date <= monthEnd)
        .map(event => ({ ...event, end: event.date }))
    ].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "he"));

    const eventList = document.querySelector("#calendarScreen .event-list");
    eventList.innerHTML = "";

    if (!monthlyItems.length) {
      eventList.innerHTML = '<article class="event-card"><div><strong>אין אירועים בחודש הזה</strong><span>אירועים חדשים יופיעו כאן</span></div></article>';
      return;
    }

    monthlyItems.forEach(event => {
      const date = new Date(`${event.date}T12:00:00`);
      const card = document.createElement("article");
      card.className = `event-card ${escapeHtml(event.type || "event")}`;
      card.innerHTML = `
        <div class="date-tile"><strong>${String(date.getDate()).padStart(2, "0")}</strong><span>${escapeHtml(new Intl.DateTimeFormat("he-IL", { month: "short" }).format(date))}</span></div>
        <div><strong>${escapeHtml(event.title)}</strong><span>${escapeHtml(event.details || "")}</span></div>`;
      eventList.appendChild(card);
    });
  }

  document.getElementById("calendarDetailsClose").addEventListener("click", () => {
    selectedCalendarDate = null;
    document.getElementById("calendarDayDetails").hidden = true;
    document.querySelectorAll(".calendar-day.selected").forEach(day => day.classList.remove("selected"));
  });

  function renderAlbums() {
    const list = document.querySelector(".albums-list");
    list.innerHTML = "";
    if (!data.albums.length) {
      list.innerHTML = '<article class="album-date-card"><strong>אין אלבומים פעילים</strong><p class="muted">אלבומים חדשים יופיעו כאן ויוסרו אחרי שבוע.</p></article>';
      return;
    }
    data.albums.forEach((album, index) => {
      const card = document.createElement("article");
      card.className = "album-date-card";
      card.innerHTML = `
        <div class="album-date-heading">
          <div><strong>${index === 0 ? "האלבום האחרון" : "אלבום"}</strong><span>${escapeHtml(formatDate(album.date))}</span></div>
          <span>${album.photos.length} תמונות</span>
        </div>
        <div class="photo-grid"></div>`;
      const grid = card.querySelector(".photo-grid");
      album.photos.forEach(photo => {
        const image = document.createElement("img");
        image.src = photo.url;
        image.alt = `תמונה מאלבום ${formatDate(album.date)}`;
        image.loading = "lazy";
        grid.appendChild(image);
      });
      list.appendChild(card);
    });
  }

  const communityConfig = {
    pickup: { label: "איסוף", formTitle: "עזרה באיסוף", icon: "🚗", action: "אני יכול/ה לעזור" },
    give: { label: "מסירה", formTitle: "למסירה", icon: "🎁", action: "מתעניין/ת" },
    park: { label: "גינה", formTitle: "בילוי בגינה", icon: "🌳", action: "מצטרפים" }
  };

  function renderCommunity() {
    const feed = document.getElementById("communityFeed");
    feed.innerHTML = "";
    if (!data.community.length) {
      feed.innerHTML = '<article class="community-card community-empty"><div class="community-card-content"><h3>אין כרגע אירועים בקהילה</h3></div></article>';
      return;
    }

    data.community.forEach(item => {
      const config = communityConfig[item.item_type];
      const title = item.item_type === "give" ? item.item_name : item.child_name;
      const meta = item.item_type === "park"
        ? item.garden_name
        : item.item_type === "pickup"
          ? item.item_name
          : "";
      const isOwner = item.created_by === context.session.user.id;
      const itemResponses = (data.communityResponses || []).filter(response => response.community_item_id === item.id);
      const ownResponse = itemResponses.find(response => response.responder_id === context.session.user.id);

      const card = document.createElement("article");
      card.className = "community-card";
      card.innerHTML = `
        <div class="community-card-icon">${config.icon}</div>
        <div class="community-card-content">
          <span class="tag">${config.label}</span>
          <h3>${escapeHtml(title)}</h3>
          ${meta ? `<p class="community-meta">${escapeHtml(meta)}</p>` : ""}
        </div>
        <div class="community-card-actions">
          ${isOwner
            ? `<span class="community-response-count" title="מספר תגובות">👍 ${itemResponses.length}</span>
               ${item.item_type !== "park"
                 ? `<button class="community-close-btn" type="button" aria-label="סגירת האירוע" title="סגירת האירוע">✓</button>`
                 : ""}`
            : `<button class="community-thumb-btn ${ownResponse ? "active" : ""}" type="button" aria-label="${ownResponse ? "התגובה נשלחה" : "אני מעוניין או יכול לעזור"}" title="${ownResponse ? "התגובה נשלחה" : "שליחת תגובה"}">👍</button>`}
        </div>`;

      if (isOwner) {
        const closeButton = card.querySelector(".community-close-btn");
        if (closeButton) {
          closeButton.addEventListener("click", async () => {
            try {
              await window.GanState.closeCommunityItem(context, item.id);
              data.community = data.community.filter(entry => entry.id !== item.id);
              renderCommunity();
              showToast("האירוע נסגר והוסר מהקהילה.");
            } catch (error) {
              showToast(error.message || "לא ניתן לסגור את האירוע.");
            }
          });
        }
      } else {
        const thumbButton = card.querySelector(".community-thumb-btn");
        thumbButton.addEventListener("click", async () => {
          if (thumbButton.classList.contains("active")) {
            showToast("התגובה כבר נשלחה.");
            return;
          }
          try {
            const savedResponse = await window.GanState.respondToCommunity(context, item.id);
            data.communityResponses = [...(data.communityResponses || []), savedResponse];
            thumbButton.classList.add("active");
            thumbButton.setAttribute("aria-label", "התגובה נשלחה");
            thumbButton.title = "התגובה נשלחה";
            showToast("התגובה נשלחה למפרסם/ת.");
          } catch (error) {
            showToast(error.message || "לא ניתן לשמור את התגובה.");
          }
        });
      }

      feed.appendChild(card);
    });
  }

  function renderCommittee() {
    const pollCard = document.querySelector(".poll-card");
    const treatsCard = document.querySelector(".treats-card");
    const poll = data.initiatives.find(item => item.initiative_type === "poll");
    const treats = data.initiatives.find(item => item.initiative_type === "treats");

    if (!poll) {
      pollCard.hidden = true;
    } else {
      pollCard.hidden = false;
      pollCard.querySelector("h3").textContent = poll.title;
      const options = Array.isArray(poll.payload?.options) ? poll.payload.options : [];
      const votes = data.responses.filter(response => response.initiative_id === poll.id && response.response_key === "vote");
      pollCard.querySelector(".participants").textContent = `${new Set(votes.map(vote => vote.user_id)).size} הצביעו`;
      [...pollCard.querySelectorAll(".poll-option")].forEach((label, index) => {
        const option = options[index];
        if (!option) {
          label.hidden = true;
          return;
        }
        label.hidden = false;
        const value = typeof option === "string" ? option : option.value || option.label;
        label.querySelector("input").value = value;
        label.querySelector("span").textContent = typeof option === "string" ? option : option.label;
        const count = votes.filter(vote => vote.response_value === value).length;
        label.querySelector("small").textContent = votes.length ? `${Math.round(count / votes.length * 100)}%` : "0%";
      });
      const ownVote = votes.find(vote => vote.user_id === context.session.user.id);
      if (ownVote) {
        const selected = pollCard.querySelector(`input[value="${CSS.escape(ownVote.response_value)}"]`);
        if (selected) selected.checked = true;
      }
      document.getElementById("voteBtn").onclick = async () => {
        const selected = pollCard.querySelector('input[name="summerPoll"]:checked');
        if (!selected) return showToast("בחרו אפשרות לפני השליחה.");
        try {
          const savedVote = await window.GanState.saveCommitteeResponse(context, poll.id, "vote", selected.value);
          const existingIndex = data.responses.findIndex(response =>
            response.initiative_id === poll.id &&
            response.user_id === context.session.user.id &&
            response.response_key === "vote"
          );
          if (existingIndex >= 0) data.responses[existingIndex] = savedVote;
          else data.responses.push(savedVote);
          renderCommittee();
          showToast("ההצבעה נשמרה והאחוזים עודכנו.");

          // רענון נוסף מהשרת כדי לכלול הצבעות של הורים אחרים.
          data = await window.GanState.loadSharedData(context);
          renderCommittee();
        } catch (error) {
          showToast(error.message || "לא ניתן לשמור הצבעה.");
        }
      };
    }

    if (!treats) {
      treatsCard.hidden = true;
    } else {
      treatsCard.hidden = false;
      treatsCard.querySelector("h3").textContent = treats.title;
      const items = Array.isArray(treats.payload?.items) ? treats.payload.items : [];
      const claims = data.responses.filter(response => response.initiative_id === treats.id && response.response_key.startsWith("treat:"));
      treatsCard.querySelector(".participants").textContent = `${claims.length} מתוך ${items.length}`;

      const modal = document.getElementById("treatsModal");
      const list = document.getElementById("treatList");
      document.getElementById("treatsModalTitle").textContent = treats.title;
      document.getElementById("treatsModalSummary").textContent = `${claims.length} מתוך ${items.length} פריטים נתפסו`;

      list.innerHTML = "";
      items.forEach((item, index) => {
        const label = typeof item === "string" ? item : item.label;
        const key = typeof item === "string" ? String(index) : String(item.id ?? index);
        const claim = claims.find(response => response.response_key === `treat:${key}`);
        const button = document.createElement("button");
        button.className = `treat-item ${claim ? "taken" : ""}`;
        button.disabled = Boolean(claim);
        button.innerHTML = `<span>${escapeHtml(label)}</span><small>${escapeHtml(claim?.response_value || "פנוי")}</small>`;
        button.addEventListener("click", async () => {
          try {
            await window.GanState.saveCommitteeResponse(context, treats.id, `treat:${key}`, context.membership.child_name);
            showToast(`נרשמתם להביא: ${label}`);
            data = await window.GanState.loadSharedData(context);
            renderCommittee();
            modal.hidden = false;
          } catch (error) {
            showToast(error.message || "לא ניתן להירשם.");
          }
        });
        list.appendChild(button);
      });

      document.getElementById("treatsOpen").onclick = () => {
        modal.hidden = false;
      };
      document.querySelectorAll("[data-close-treats]").forEach(button => {
        button.onclick = () => { modal.hidden = true; };
      });
      modal.onclick = event => {
        if (event.target === modal) modal.hidden = true;
      };
    }

    const totalExpenses = data.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const collected = Number(data.fund.collected_amount || 0);
    document.querySelector(".fund-amount").textContent = `${new Intl.NumberFormat("he-IL").format(collected - totalExpenses)} ₪`;
    const stats = document.querySelectorAll(".fund-stats strong");
    stats[0].textContent = `${new Intl.NumberFormat("he-IL").format(collected)} ₪`;
    stats[1].textContent = `${new Intl.NumberFormat("he-IL").format(totalExpenses)} ₪`;
    const paybox = document.querySelector(".paybox-button");
    paybox.href = data.fund.paybox_url || "#";
    paybox.classList.toggle("disabled", !data.fund.paybox_url);

    const expenseCard = document.querySelector(".expenses-card");
    expenseCard.querySelectorAll(".expense-row").forEach(row => row.remove());
    data.expenses.slice(0, 5).forEach(expense => {
      const row = document.createElement("div");
      row.className = "expense-row";
      row.innerHTML = `<span>${escapeHtml(expense.description)}</span><strong>${new Intl.NumberFormat("he-IL").format(Number(expense.amount))} ₪</strong>`;
      expenseCard.appendChild(row);
    });
  }

  function configureCommunityForm() {
    const modal = document.getElementById("communityModal");
    const form = document.getElementById("communityForm");
    const typeInput = document.getElementById("communityType");
    const valueInput = document.getElementById("communityValue");
    const valueLabel = document.getElementById("communityInputLabel");
    const dayInput = document.getElementById("communityDayValue");
    const dayLabel = document.getElementById("communityDayLabel");
    const extraInput = document.getElementById("communityExtraValue");
    const extraLabel = document.getElementById("communityExtraLabel");

    document.querySelectorAll("[data-community-form]").forEach(button => button.addEventListener("click", () => {
      const type = button.dataset.communityForm;
      typeInput.value = type;
      document.getElementById("communityFormTitle").textContent = communityConfig[type].formTitle;
      if (type === "give") {
        valueLabel.firstChild.textContent = "מה מוסרים?";
        valueInput.value = "";
        valueInput.readOnly = false;
        valueInput.placeholder = "לדוגמה: מיטת תינוק";
      } else {
        valueLabel.firstChild.textContent = "שם הילד";
        valueInput.value = context.membership.child_name;
        valueInput.readOnly = true;
      }
      dayLabel.hidden = type !== "pickup";
      dayInput.required = type === "pickup";
      if (type === "pickup") dayInput.value = "יום ראשון";

      extraLabel.hidden = type !== "park";
      extraInput.required = type === "park";
      extraInput.value = "";
      modal.hidden = false;
    }));

    document.querySelectorAll("[data-close-community]").forEach(button => button.addEventListener("click", () => modal.hidden = true));

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const type = typeInput.value;
      try {
        await window.GanState.addCommunityItem(context, {
          type,
          childName: type === "give" ? "" : context.membership.child_name,
          itemName: type === "give"
            ? valueInput.value.trim()
            : type === "pickup"
              ? dayInput.value
              : "",
          gardenName: type === "park" ? extraInput.value.trim() : ""
        });
        modal.hidden = true;
        form.reset();
        showToast("האירוע פורסם בקהילה.");
        data = await window.GanState.loadSharedData(context);
        renderCommunity();
      } catch (error) {
        showToast(error.message || "לא ניתן לפרסם.");
      }
    });
  }

  async function initialize() {
    try {
      context = await window.GanState.requireContext();
      configureRoleVisibility();
      data = await window.GanState.loadSharedData(context);
      renderProfile();
      renderHome();

      document.querySelector("[data-calendar-next]").addEventListener("click", () => {
        calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
        renderCalendar();
      });
      document.querySelector("[data-calendar-prev]").addEventListener("click", () => {
        calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
        renderCalendar();
      });
      renderCalendar();
      renderAlbums();

      if (allowedScreenNames.includes("community")) {
        renderCommunity();
        configureCommunityForm();
      }

      if (allowedScreenNames.includes("committee")) {
        renderCommittee();
      }

      const target = location.hash.replace("#", "");
      navigate(allowedScreenNames.includes(target) ? target : "home");
    } catch (error) {
      console.error(error);
      showFatal(error.message || "לא ניתן לטעון את האפליקציה.");
    }
  }

  window.addEventListener("hashchange", () => {
    const target = location.hash.replace("#", "");
    navigate(allowedScreenNames.includes(target) ? target : "home");
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js?v=20260728-9").catch(console.warn));
  }

  initialize();
})();
