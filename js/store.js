window.Store = (function () {
  "use strict";
  var sb = window.sb;
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var AF_PHONE = /^07\d{8}$/;
  var CATS = [
    { id: "game", label: "بازی" },
    { id: "social", label: "شبکهٔ اجتماعی" },
    { id: "sub", label: "اشتراک و سرویس" },
    { id: "other", label: "سایر" }
  ];
  var _user = null;
  var _ready = null;

  function mapAuthError(msg) {
    var m = String(msg || "");
    if (m.indexOf("Invalid login credentials") > -1) return "ایمیل یا رمز عبور اشتباه است.";
    if (m.indexOf("already registered") > -1 || m.indexOf("already been registered") > -1) return "این ایمیل قبلاً ثبت شده است.";
    if (m.indexOf("Password should be at least") > -1) return "رمز عبور خیلی کوتاه است.";
    if (m.indexOf("rate limit") > -1 || m.indexOf("Too many") > -1) return "تعداد تلاش‌ها زیاد بود؛ کمی صبر کن و دوباره تلاش کن.";
    if (m.indexOf("Email not confirmed") > -1) return "ایمیل‌ات هنوز تأیید نشده؛ لینکِ تأیید را در ایمیلت بزن.";
    if (m.indexOf("network") > -1 || m.indexOf("fetch") > -1) return "مشکلِ اتصال به اینترنت؛ دوباره تلاش کن.";
    return "خطایی رخ داد؛ دوباره تلاش کن.";
  }

  async function loadUser() {
    try {
      var s = await sb.auth.getSession();
      var session = s.data && s.data.session;
      if (!session) { _user = null; return null; }
      var res = await sb.from("profiles").select("*").eq("id", session.user.id).single();
      if (res.error || !res.data) { _user = null; return null; }
      _user = Object.assign({ email: session.user.email }, res.data);
      return _user;
    } catch (e) { _user = null; return null; }
  }

  _ready = loadUser();
  sb.auth.onAuthStateChange(function () { _ready = loadUser(); });

  function resizeImage(file) {
    return new Promise(function (resolve) {
      var rd = new FileReader();
      rd.onload = function () {
        var im = new Image();
        im.onload = function () {
          var c = document.createElement("canvas");
          var s = Math.min(1, 900 / Math.max(im.width, im.height));
          c.width = Math.round(im.width * s);
          c.height = Math.round(im.height * s);
          c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
          c.toBlob(function (blob) { resolve(blob || file); }, "image/jpeg", 0.82);
        };
        im.onerror = function () { resolve(file); };
        im.src = rd.result;
      };
      rd.onerror = function () { resolve(file); };
      rd.readAsDataURL(file);
    });
  }

  var Store = {
    CATS: CATS, EMAIL: EMAIL, AF_PHONE: AF_PHONE,

    ready: function () { return _ready; },
    current: function () { return _user; },

    login: async function (email, pass) {
      var r = await sb.auth.signInWithPassword({ email: email, password: pass });
      if (r.error) return { err: mapAuthError(r.error.message) };
      await loadUser();
      if (_user && _user.suspended) { await sb.auth.signOut(); _user = null; return { err: "این حساب مسدود شده است." }; }
      if (!_user) return { err: "خطایی در بارگذاریِ حساب رخ داد؛ دوباره تلاش کن." };
      return { ok: _user };
    },

    register: async function (d) {
      if (!EMAIL.test(d.email)) return { err: "ایمیل معتبر نیست." };
      if (d.pass.length < 10) return { err: "رمز عبور باید حداقل ۱۰ حرف باشد." };
      if (d.role === "seller" && !AF_PHONE.test(d.phone)) return { err: "برای فروشنده، شمارهِ معتبر افغانستان (۰۷…) الزامی است." };
      var r = await sb.auth.signUp({
        email: d.email, password: d.pass,
        options: {
          data: { name: d.name, role: d.role, phone: d.phone || "" },
          emailRedirectTo: location.origin + "/login.html"
        }
      });
      if (r.error) return { err: mapAuthError(r.error.message) };
      if (!r.data.session) return { pending: true };
      await loadUser();
      return { ok: _user };
    },

    logout: async function () { await sb.auth.signOut(); _user = null; },

    resetRequest: async function (email) {
      var r = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/reset-password.html" });
      if (r.error) return { err: mapAuthError(r.error.message) };
      return { ok: true };
    },
    resetConfirm: async function (pass) {
      var r = await sb.auth.updateUser({ password: pass });
      if (r.error) return { err: mapAuthError(r.error.message) };
      return { ok: true };
    },

    myPhone: async function () {
      if (!_user) return null;
      var r = await sb.from("profile_private").select("phone").eq("id", _user.id).maybeSingle();
      return r.data;
    },
    updateProfile: async function (patch) {
      if (!_user) return { err: "وارد نشده‌ای." };
      if (patch.name) {
        var r1 = await sb.rpc("update_my_profile", { p_name: patch.name, p_phone: patch.phone === undefined ? null : (patch.phone || null) });
        if (r1.error) return { err: "به‌روزرسانیِ نام ناکام شد." };
      }
      if (patch.phone === undefined) {
        var current = await this.myPhone();
        var r2 = await sb.rpc("update_my_profile", { p_name: patch.name || _user.name, p_phone: current && current.phone ? current.phone : null });
        if (r2.error) return { err: "به‌روزرسانیِ پروفایل ناکام شد." };
      }
      await loadUser();
      return { ok: true };
    },

    // ---- Listings (public) ----
    visible: async function (opts) {
      opts = opts || {};
      var q = sb.from("listings_view").select("*").eq("active", true).eq("hidden", false).order("created_at", { ascending: false }).limit(opts.limit || 60);
      if (opts.cat && opts.cat !== "all") q = q.eq("cat", opts.cat);
      if (opts.q) {
        var needle = opts.q.trim();
        if (needle) q = q.or("title.ilike.%" + needle.replace(/[%_]/g, "") + "%,description.ilike.%" + needle.replace(/[%_]/g, "") + "%");
      }
      var r = await q;
      return r.error ? [] : (r.data || []);
    },

    get: async function (id) {
      var r = await sb.from("listings_view").select("*").eq("id", id).maybeSingle();
      return r.data || null;
    },

    view: async function (id) { try { await sb.rpc("increment_listing_views", { p_listing_id: id }); } catch (e) {} },

    uploadImage: async function (file) {
      if (file.size > 5 * 1024 * 1024) return { err: "حجم تصویر باید کمتر از ۵ مگابایت باشد." };
      if (file.type.indexOf("image/") !== 0) return { err: "فایل باید تصویر باشد." };
      var resized = await resizeImage(file);
      var path = _user.id + "/" + Date.now() + ".jpg";
      var up = await sb.storage.from("listing-images").upload(path, resized, { contentType: "image/jpeg" });
      if (up.error) return { err: "آپلود تصویر ناکام شد." };
      var pub = sb.storage.from("listing-images").getPublicUrl(path);
      return { ok: pub.data.publicUrl };
    },

    add: async function (d, imageFile) {
      if (!_user) return { err: "وارد نشده‌ای." };
      var img = null;
      if (imageFile) { var up = await this.uploadImage(imageFile); if (up.err) return up; img = up.ok; }
      var r = await sb.from("listings").insert({
        seller_id: _user.id, title: d.title, cat: d.cat, price: d.price,
        description: d.desc, whatsapp: d.wa, image_url: img
      }).select().single();
      if (r.error) return { err: "ثبت آگهی ناکام شد؛ مطمئن شو شمارهِ واتساپ به‌فرمِ ۰۷xxxxxxxx است." };
      return { ok: r.data };
    },

    update: async function (id, d, imageFile) {
      if (!_user) return { err: "وارد نشده‌ای." };
      var patch = { title: d.title, cat: d.cat, price: d.price, description: d.desc, whatsapp: d.wa };
      if (imageFile) { var up = await this.uploadImage(imageFile); if (up.err) return up; patch.image_url = up.ok; }
      var r = await sb.from("listings").update(patch).eq("id", id).select().single();
      if (r.error) return { err: "ذخیرهٔ تغییرات ناکام شد." };
      return { ok: r.data };
    },

    toggleActive: async function (id, active) {
      var r = await sb.from("listings").update({ active: active }).eq("id", id);
      return r.error ? { err: "خطا رخ داد." } : { ok: true };
    },
    remove: async function (id) {
      var r = await sb.from("listings").delete().eq("id", id);
      return r.error ? { err: "حذف ناکام شد." } : { ok: true };
    },
    mine: async function () {
      if (!_user) return [];
      var r = await sb.from("listings_view").select("*").eq("seller_id", _user.id).order("created_at", { ascending: false });
      return r.data || [];
    },

    rate: async function (id, stars) {
      if (!_user) return { err: "برای امتیازدهی، اول وارد شو." };
      var r = await sb.from("ratings").upsert({ listing_id: id, user_id: _user.id, stars: stars });
      return r.error ? { err: "ثبت امتیاز ناکام شد." } : { ok: true };
    },
    report: async function (id) {
      if (!_user) return { err: "برای گزارش، اول وارد شو." };
      var r = await sb.from("reports").insert({ listing_id: id, user_id: _user.id });
      if (r.error) {
        if (r.error.code === "23505") return { err: "قبلاً این آگهی را گزارش کرده‌ای." };
        return { err: "ثبت گزارش ناکام شد." };
      }
      return { ok: true };
    },

    // ---- Admin ----
    allListings: async function () {
      var r = await sb.from("listings_view").select("*").order("created_at", { ascending: false });
      return r.data || [];
    },
    allUsers: async function () {
      var r = await sb.from("profiles").select("*").order("created_at", { ascending: false });
      return r.data || [];
    },
    setUserFlag: async function (id, patch) {
      var r = await sb.rpc("admin_set_user_flags", { p_user_id: id, p_verified: patch.verified === undefined ? null : patch.verified, p_suspended: patch.suspended === undefined ? null : patch.suspended });
      return r.error ? { err: "عملیات مدیریت انجام نشد." } : { ok: true };
    },
    setListingHidden: async function (id, hidden) {
      var r = await sb.rpc("admin_set_listing_hidden", { p_listing_id: id, p_hidden: hidden });
      return r.error ? { err: "عملیات مدیریت انجام نشد." } : { ok: true };
    },
    clearReports: async function (id) {
      var r = await sb.rpc("admin_clear_reports", { p_listing_id: id });
      return r.error ? { err: "پاک‌سازی گزارش‌ها انجام نشد." } : { ok: true };
    },

    // ---- Comments ----
    comments: async function (listingId) {
      var r = await sb.from("comments").select("*").eq("listing_id", listingId).order("created_at", { ascending: true });
      var list = r.data || [];
      if (!list.length) return [];
      var userIds = Array.from(new Set(list.map(function (c) { return c.user_id; })));
      var profilesRes = await sb.from("profiles_public").select("id,name").in("id", userIds);
      var profileMap = {}; (profilesRes.data || []).forEach(function (p) { profileMap[p.id] = p.name; });
      list.forEach(function (c) { c.user_name = profileMap[c.user_id] || "کاربر"; });
      return list;
    },
    addComment: async function (listingId, body) {
      if (!_user) return { err: "برای نظردادن، اول وارد شو." };
      if (!body || !body.trim()) return { err: "متنِ نظر خالی است." };
      var r = await sb.from("comments").insert({ listing_id: listingId, user_id: _user.id, body: body.trim() });
      return r.error ? { err: "ثبتِ نظر ناکام شد." } : { ok: true };
    },
    deleteComment: async function (id) {
      var r = await sb.from("comments").delete().eq("id", id);
      return r.error ? { err: "حذف ناکام شد." } : { ok: true };
    }
  };

  return Store;
})();
