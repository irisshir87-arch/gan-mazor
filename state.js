(function () {
  "use strict";

  const config = window.GAN_MAZOR_CONFIG || {};
  const BUCKET = "gan-albums";
  const defaults = {
    home: {
      updatedAt: "",
      morning: [
        { name: "יעל", role: "גננת", image: "assets/staff-yael.svg" },
        { name: "מיכל", role: "סייעת", image: "assets/staff-michal.svg" }
      ],
      afternoon: [
        { name: "לירון", role: "מובילת צהרון", image: "assets/staff-liron.svg" },
        { name: "שירה", role: "סייעת", image: "assets/staff-shira.svg" }
      ],
      meetingTitle: "טרם פורסם עדכון",
      meetingDetails: "",
      activityTitle: "טרם פורסם חוג",
      reminder: "אין תזכורת חדשה",
      shabbat: [
        { name: "טרם נבחר", image: "assets/kid-noam.svg" },
        { name: "טרם נבחר", image: "assets/kid-aya.svg" }
      ]
    }
  };

  function assertConfig() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("ספריית Supabase לא נטענה.");
    }
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
      throw new Error("פרטי החיבור ל-Supabase חסרים.");
    }
  }

  assertConfig();

  const client = window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "gan-mazor-auth"
      }
    }
  );

  const clone = value => JSON.parse(JSON.stringify(value));
  const todayIso = () => new Date().toISOString().slice(0, 10);
  const nowIso = () => new Date().toISOString();

  function cleanAuthHash() {
    const authHash = /access_token|refresh_token|error_description/.test(location.hash);
    if (!authHash) return;
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  }

  async function requireContext(roles) {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;

    const session = sessionData.session;
    if (!session) {
      const next = encodeURIComponent(location.pathname.split("/").pop() || "index.html");
      location.replace(`login.html?next=${next}`);
      throw new Error("נדרשת כניסה.");
    }

    cleanAuthHash();

    const { data: membership, error: membershipError } = await client
      .from("memberships")
      .select("id,kindergarten_id,user_id,role,parent_name,child_name,relation_label,approved")
      .eq("user_id", session.user.id)
      .eq("approved", true)
      .maybeSingle();

    if (membershipError) throw membershipError;
    if (!membership) {
      const error = new Error("החשבון עדיין לא אושר לגן מזור.");
      error.code = "MEMBERSHIP_NOT_APPROVED";
      throw error;
    }

    if (Array.isArray(roles) && roles.length && !roles.includes(membership.role)) {
      const error = new Error("אין לחשבון הרשאה למסך הזה.");
      error.code = "ROLE_NOT_ALLOWED";
      throw error;
    }

    const { data: kindergarten, error: kindergartenError } = await client
      .from("kindergartens")
      .select("id,name,slug")
      .eq("id", membership.kindergarten_id)
      .single();

    if (kindergartenError) throw kindergartenError;

    return { session, membership, kindergarten };
  }

  function mapHome(row) {
    if (!row) return clone(defaults.home);
    return {
      updatedAt: row.updated_at
        ? new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" }).format(new Date(row.updated_at))
        : "",
      morning: Array.isArray(row.morning_staff) && row.morning_staff.length ? row.morning_staff : clone(defaults.home.morning),
      afternoon: Array.isArray(row.afternoon_staff) && row.afternoon_staff.length ? row.afternoon_staff : clone(defaults.home.afternoon),
      meetingTitle: row.meeting_title || "טרם פורסם עדכון",
      meetingDetails: row.meeting_details || "",
      activityTitle: row.activity_title || "טרם פורסם חוג",
      reminder: row.reminder || "אין תזכורת חדשה",
      shabbat: Array.isArray(row.shabbat_children) && row.shabbat_children.length ? row.shabbat_children : clone(defaults.home.shabbat)
    };
  }

  async function signedStorageUrl(path, expiresIn = 3600) {
    if (!path) return "";
    const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, expiresIn);
    if (error) {
      console.warn("לא ניתן ליצור קישור חתום לתמונה", error);
      return "";
    }
    return data?.signedUrl || "";
  }

  async function resolveHomeImages(home) {
    const result = clone(home);
    for (const groupName of ["morning", "afternoon"]) {
      for (const person of result[groupName]) {
        if (person.imagePath) {
          const signedUrl = await signedStorageUrl(person.imagePath);
          if (signedUrl) person.image = signedUrl;
        }
      }
    }
    return result;
  }

  async function signedAlbum(album) {
    const photos = [];
    for (const photo of album.album_photos || []) {
      const signedUrl = await signedStorageUrl(photo.storage_path);
      if (signedUrl) {
        photos.push({ id: photo.id, path: photo.storage_path, url: signedUrl });
      }
    }
    return {
      id: album.id,
      date: album.album_date,
      expires: album.expires_at,
      photos
    };
  }

  async function loadSharedData(context) {
    const kindergartenId = context.kindergarten.id;
    const [dailyResult, eventsResult, albumsResult, communityResult, fundResult, expensesResult, initiativesResult] = await Promise.all([
      client.from("daily_updates").select("*").eq("kindergarten_id", kindergartenId).order("update_date", { ascending: false }).limit(1).maybeSingle(),
      client.from("calendar_events").select("*").eq("kindergarten_id", kindergartenId).order("event_date", { ascending: true }),
      client.from("albums").select("id,album_date,expires_at,album_photos(id,storage_path)").eq("kindergarten_id", kindergartenId).gt("expires_at", nowIso()).order("album_date", { ascending: false }),
      client.from("community_items").select("*").eq("kindergarten_id", kindergartenId).eq("status", "open").gt("expires_at", nowIso()).order("created_at", { ascending: false }),
      client.from("committee_funds").select("*").eq("kindergarten_id", kindergartenId).maybeSingle(),
      client.from("committee_expenses").select("*").eq("kindergarten_id", kindergartenId).order("expense_date", { ascending: false }),
      client.from("committee_initiatives").select("*").eq("kindergarten_id", kindergartenId).eq("active", true).order("created_at", { ascending: true })
    ]);

    const firstError = [dailyResult, eventsResult, albumsResult, communityResult, fundResult, expensesResult, initiativesResult]
      .find(result => result.error)?.error;
    if (firstError) throw firstError;

    const initiatives = initiativesResult.data || [];
    const initiativeIds = initiatives.map(item => item.id);
    let responses = [];
    if (initiativeIds.length) {
      const responseResult = await client
        .from("committee_responses")
        .select("id,initiative_id,user_id,response_key,response_value")
        .in("initiative_id", initiativeIds);
      if (responseResult.error) throw responseResult.error;
      responses = responseResult.data || [];
    }

    const albums = [];
    for (const album of albumsResult.data || []) albums.push(await signedAlbum(album));

    const home = await resolveHomeImages(mapHome(dailyResult.data));

    return {
      home,
      dailyRow: dailyResult.data || null,
      events: (eventsResult.data || []).map(row => ({
        id: row.id,
        date: row.event_date,
        title: row.title,
        details: row.details || "",
        type: row.event_type
      })),
      albums,
      community: communityResult.data || [],
      fund: fundResult.data || { kindergarten_id: kindergartenId, collected_amount: 0, paybox_url: "" },
      expenses: expensesResult.data || [],
      initiatives,
      responses
    };
  }

  async function saveDaily(context, home) {
    const payload = {
      kindergarten_id: context.kindergarten.id,
      update_date: todayIso(),
      morning_staff: home.morning,
      afternoon_staff: home.afternoon,
      meeting_title: home.meetingTitle,
      meeting_details: home.meetingDetails,
      activity_title: home.activityTitle,
      reminder: home.reminder,
      shabbat_children: home.shabbat,
      updated_by: context.session.user.id,
      updated_at: nowIso()
    };
    const { data, error } = await client
      .from("daily_updates")
      .upsert(payload, { onConflict: "kindergarten_id,update_date" })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function addEvent(context, event) {
    const { data, error } = await client.from("calendar_events").insert({
      kindergarten_id: context.kindergarten.id,
      event_date: event.date,
      title: event.title,
      details: event.details || null,
      event_type: event.type,
      created_by: context.session.user.id
    }).select().single();
    if (error) throw error;
    return data;
  }

  async function deleteEvent(id) {
    const { error } = await client.from("calendar_events").delete().eq("id", id);
    if (error) throw error;
  }

  function safeFileName(fileName) {
    const extension = fileName.includes(".") ? fileName.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") : "jpg";
    return `${crypto.randomUUID()}.${extension || "jpg"}`;
  }

  async function uploadStaffImage(context, file, slot, previousPath = "") {
    if (!file) return previousPath || "";
    if (!file.type.startsWith("image/")) throw new Error("אפשר להעלות קובץ תמונה בלבד.");
    if (file.size > 5 * 1024 * 1024) throw new Error("תמונת צוות יכולה להיות עד 5MB.");

    const path = `${context.kindergarten.id}/staff/${slot}/${safeFileName(file.name)}`;
    const { error: uploadError } = await client.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg"
    });
    if (uploadError) throw uploadError;

    if (previousPath && previousPath !== path && previousPath.startsWith(`${context.kindergarten.id}/staff/`)) {
      const { error: removeError } = await client.storage.from(BUCKET).remove([previousPath]);
      if (removeError) console.warn("התמונה החדשה נשמרה אך הישנה לא נמחקה", removeError);
    }
    return path;
  }

  async function createAlbum(context, date, files) {
    if (!files.length) throw new Error("בחרי לפחות תמונה אחת.");
    if (files.length > 30) throw new Error("אפשר להעלות עד 30 תמונות בכל אלבום.");

    const expires = new Date(`${date}T23:59:59`);
    expires.setDate(expires.getDate() + 7);

    const { data: album, error: albumError } = await client.from("albums").upsert({
      kindergarten_id: context.kindergarten.id,
      album_date: date,
      expires_at: expires.toISOString(),
      created_by: context.session.user.id
    }, { onConflict: "kindergarten_id,album_date" }).select().single();
    if (albumError) throw albumError;

    const uploadedPaths = [];
    try {
      for (const file of files) {
        if (file.size > 8 * 1024 * 1024) throw new Error(`התמונה ${file.name} גדולה מ-8MB.`);
        const path = `${context.kindergarten.id}/${album.id}/${safeFileName(file.name)}`;
        const { error: uploadError } = await client.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "image/jpeg"
        });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
      }

      const rows = uploadedPaths.map(path => ({ album_id: album.id, storage_path: path }));
      const { error: photosError } = await client.from("album_photos").insert(rows);
      if (photosError) throw photosError;
      return album;
    } catch (error) {
      if (uploadedPaths.length) await client.storage.from(BUCKET).remove(uploadedPaths);
      throw error;
    }
  }

  async function deleteAlbum(album) {
    const paths = (album.photos || []).map(photo => photo.path).filter(Boolean);
    if (paths.length) {
      const { error: storageError } = await client.storage.from(BUCKET).remove(paths);
      if (storageError) throw storageError;
    }
    const { error } = await client.from("albums").delete().eq("id", album.id);
    if (error) throw error;
  }

  async function cleanupExpiredAlbums(context) {
    const { data, error } = await client
      .from("albums")
      .select("id,album_date,expires_at,album_photos(id,storage_path)")
      .eq("kindergarten_id", context.kindergarten.id)
      .lte("expires_at", nowIso());
    if (error) throw error;
    for (const row of data || []) {
      const album = {
        id: row.id,
        photos: (row.album_photos || []).map(photo => ({ path: photo.storage_path }))
      };
      await deleteAlbum(album);
    }
  }

  async function saveFund(context, collected, payboxUrl) {
    const { data, error } = await client.from("committee_funds").upsert({
      kindergarten_id: context.kindergarten.id,
      collected_amount: Number(collected || 0),
      paybox_url: payboxUrl || null,
      updated_by: context.session.user.id,
      updated_at: nowIso()
    }).select().single();
    if (error) throw error;
    return data;
  }

  async function addExpense(context, expense) {
    const { data, error } = await client.from("committee_expenses").insert({
      kindergarten_id: context.kindergarten.id,
      description: expense.description,
      amount: Number(expense.amount),
      expense_date: expense.date,
      created_by: context.session.user.id
    }).select().single();
    if (error) throw error;
    return data;
  }

  async function saveInitiative(context, type, title, payload, active) {
    const { data: existing, error: findError } = await client
      .from("committee_initiatives")
      .select("id")
      .eq("kindergarten_id", context.kindergarten.id)
      .eq("initiative_type", type)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (findError) throw findError;

    const row = {
      kindergarten_id: context.kindergarten.id,
      initiative_type: type,
      title,
      payload,
      active: Boolean(active),
      created_by: context.session.user.id
    };
    if (existing?.id) row.id = existing.id;

    const query = existing?.id
      ? client.from("committee_initiatives").update(row).eq("id", existing.id)
      : client.from("committee_initiatives").insert(row);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }

  async function addCommunityItem(context, item) {
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);
    const { data, error } = await client.from("community_items").insert({
      kindergarten_id: context.kindergarten.id,
      created_by: context.session.user.id,
      item_type: item.type,
      child_name: item.childName || null,
      item_name: item.itemName || null,
      garden_name: item.gardenName || null,
      status: "open",
      expires_at: expires.toISOString()
    }).select().single();
    if (error) throw error;
    return data;
  }

  async function respondToCommunity(context, itemId) {
    const { error } = await client.from("community_responses").upsert({
      community_item_id: itemId,
      responder_id: context.session.user.id
    }, { onConflict: "community_item_id,responder_id" });
    if (error) throw error;
  }

  async function saveCommitteeResponse(context, initiativeId, key, value) {
    const { data, error } = await client.from("committee_responses").upsert({
      initiative_id: initiativeId,
      user_id: context.session.user.id,
      response_key: key,
      response_value: value || null
    }, { onConflict: "initiative_id,user_id,response_key" })
      .select("id,initiative_id,user_id,response_key,response_value")
      .single();
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await client.auth.signOut();
    location.replace("login.html");
  }

  window.GanState = {
    client,
    defaults: clone(defaults),
    todayIso,
    requireContext,
    loadSharedData,
    saveDaily,
    addEvent,
    deleteEvent,
    createAlbum,
    uploadStaffImage,
    deleteAlbum,
    cleanupExpiredAlbums,
    saveFund,
    addExpense,
    saveInitiative,
    addCommunityItem,
    respondToCommunity,
    saveCommitteeResponse,
    signOut
  };
})();
