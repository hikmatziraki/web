(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var CATS = window.Store.CATS;

  function fa(n) { return Number(n).toLocaleString("fa-AF"); }
  function price(p) { return p ? fa(p) + " افغانی" : "توافقی"; }
  function rel(ts) {
    var t = new Date(ts).getTime();
    var m = Math.floor((Date.now() - t) / 60000);
    if (m < 1) return "همین حالا";
    if (m < 60) return fa(m) + " دقیقه پیش";
    var h = Math.floor(m / 60);
    if (h < 24) return fa(h) + " ساعت پیش";
    return fa(Math.floor(h / 24)) + " روز پیش";
  }
  function catLabel(id) { var c = CATS.find(function (x) { return x.id === id; }); return c ? c.label : "سایر"; }
  function stars(r) { var a = r ? Math.round(r) : 0; return "★".repeat(a) + "☆".repeat(5 - a); }
  function waLink(num, title) {
    var d = (num || "").replace(/\D/g, "");
    if (d.charAt(0) === "0") d = "93" + d.slice(1);
    return "https://wa.me/" + d + "?text=" + encodeURIComponent("سلام، دربارهٔ آگهی «" + (title || "") + "» در ویترین پیام دادم.");
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function toast(t) {
    var el = $("#toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.innerHTML = '<span class="t"></span>'; document.body.appendChild(el); }
    el.querySelector(".t").textContent = t;
    el.classList.add("on");
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove("on"); }, 2600);
  }
  function loading(el) { if (el) el.innerHTML = '<div class="spin"></div>'; }
  window.UI = { fa: fa, price: price, rel: rel, catLabel: catLabel, stars: stars, waLink: waLink, esc: esc, toast: toast };

  var PH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-4 4-2-2-4 4"/></svg>';
  window.PH = PH;

  function cardHTML(l) {
    var r = l.avg_rating || 0;
    return '<article class="card" data-id="' + l.id + '"><div class="thumb">' + (l.image_url ? '<img src="' + l.image_url + '" alt="" loading="lazy">' : PH) + '</div><div class="body"><div class="tags"><span class="badge cat">' + catLabel(l.cat) + '</span>' + (l.seller_verified ? '<span class="badge ver">تأیید شده</span>' : "") + '</div><h3>' + esc(l.title) + '</h3><div class="price">' + price(l.price) + '</div><div class="meta"><span class="stars">' + stars(r) + '</span><span>' + rel(l.created_at) + '</span></div></div></article>';
  }
  window.cardHTML = cardHTML;
  function bindGrid(g) { if (!g) return; g.addEventListener("click", function (e) { var c = e.target.closest(".card"); if (c) location.href = "listing.html?id=" + c.dataset.id; }); }
  window.bindGrid = bindGrid;

  /* ===== هدر: لوگو + جست‌وجو + منوی همبرگری ‌ ===== */
  async function injectChrome() {
    await Store.ready();
    var u = Store.current();
    var hdr = document.createElement("header"); hdr.className = "head";
    hdr.innerHTML = '<div class="wrap head-in"><a class="logo" href="index.html"><span class="mk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/></svg></span><span>ویترین<small>بازارِ اکانتِ افغانستان</small></span></a><div class="head-actions"><button class="iconbtn" id="searchBtn" aria-label="جست‌وجوی آگهی"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg></button><button class="iconbtn" id="menuBtn" aria-label="منو"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></div></div>';
    document.body.prepend(hdr);
    var sOv = document.createElement("div"); sOv.className = "overlay"; sOv.id = "searchOv";
    sOv.innerHTML = '<div class="search-box"><form id="searchForm"><input id="searchInput" type="search" placeholder="جست‌وجوی آگهی… (مثلاً PUBG)"><button class="btn btn-primary" type="submit">جست‌وجو</button></form></div>';
    var mOv = document.createElement("div"); mOv.className = "overlay"; mOv.id = "menuOv";
    var links = '<a href="index.html">خانه</a><a href="listings.html">آگهی‌ها</a><a href="index.html#how">چگونه کار می‌کند</a><a href="index.html#safety">امنیت</a><a href="index.html#faq">پرسش‌ها</a><a href="index.html#contact">تماس</a>';
    var auth;
    if (!u) auth = '<div class="drawer-auth"><a class="btn btn-ghost" href="login.html">ورود</a><a class="btn btn-primary" href="register.html">ثبت‌نام</a></div>';
    else {
      var extra = "";
      if (u.role === "seller") extra = '<a href="dashboard.html">داشبورد فروشنده</a><a href="post.html">ثبت آگهی جدید</a>';
      if (u.role === "admin") extra = '<a href="admin.html">پنل ادمین</a>';
      auth = extra + '<a href="account.html">تنظیمات حساب</a><div class="drawer-user">سلام، ' + esc(u.name) + ' 👋</div><a href="#" id="logout" class="drawer-logout">خروج از حساب</a>';
    }
    mOv.innerHTML = '<nav class="drawer">' + links + auth + '</nav>';
    document.body.appendChild(sOv); document.body.appendChild(mOv);
    var t = document.createElement("div"); t.className = "toast"; t.id = "toast"; t.innerHTML = '<span class="t"></span>'; document.body.appendChild(t);
    function closeAll() { sOv.classList.remove("on"); mOv.classList.remove("on"); }
    hdr.querySelector("#searchBtn").addEventListener("click", function () { closeAll(); sOv.classList.add("on"); setTimeout(function () { $("#searchInput").focus(); }, 60); });
    hdr.querySelector("#menuBtn").addEventListener("click", function () { closeAll(); mOv.classList.add("on"); });
    sOv.addEventListener("click", function (e) { if (e.target === sOv) sOv.classList.remove("on"); });
    mOv.addEventListener("click", function (e) { if (e.target === mOv) mOv.classList.remove("on"); });
    sOv.querySelector("#searchForm").addEventListener("submit", function (e) { e.preventDefault(); var q = $("#searchInput").value.trim(); location.href = "listings.html" + (q ? "?q=" + encodeURIComponent(q) : ""); });
    var lo = mOv.querySelector("#logout"); if (lo) lo.addEventListener("click", async function (e) { e.preventDefault(); await Store.logout(); location.href = "index.html"; });
  }
  function reveal() { var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: .12 }); document.querySelectorAll(".rv").forEach(function (el) { io.observe(el); }); }

  var P = {
    home: async function () {
      var f = $("#feat"); if (!f) return;
      loading(f);
      var list = await Store.visible({});
      f.innerHTML = list.slice(0, 4).map(cardHTML).join("") || '<div class="empty">هنوز آگهی نیست؛ اولین نفری باش که آگهی می‌گذاری!</div>';
      bindGrid(f);
    },

    listings: async function () {
      var params = new URLSearchParams(location.search); var cat = params.get("cat") || "all", q = params.get("q") || "";
      async function draw() {
        var g = $("#grid"); loading(g);
        var list = await Store.visible({ cat: cat, q: q });
        var c = $("#count"); if (c) c.textContent = fa(list.length) + " آگهی";
        if (g) g.innerHTML = list.map(cardHTML).join("") || '<div class="empty">آگهی‌ای یافت نشد.</div>';
        bindGrid(g);
      }
      $("#cats").innerHTML = '<button class="chip' + (cat === "all" ? " on" : "") + '" data-cat="all">همه</button>' + CATS.map(function (c) { return '<button class="chip' + (cat === c.id ? " on" : "") + '" data-cat="' + c.id + '">' + c.label + "</button>"; }).join("") + '<span class="count" id="count"></span>';
      $("#cats").addEventListener("click", function (e) { var b = e.target.closest("[data-cat]"); if (!b) return; cat = b.dataset.cat; $("#cats").querySelectorAll(".chip").forEach(function (x) { x.classList.toggle("on", x === b); }); draw(); });
      var qi = $("#q"); if (qi) { qi.value = q; qi.addEventListener("input", function (e) { q = e.target.value.trim(); draw(); }); }
      draw();
    },

    listing: async function () {
      var id = new URLSearchParams(location.search).get("id");
      var box = $("#box"); loading(box);
      var l = await Store.get(id);
      if (!l || !l.active || l.hidden || (l.report_count || 0) >= 3) { box.innerHTML = '<div class="empty">این آگهی موجود نیست یا حذف شده است.</div>'; return; }
      Store.view(id);
      var r = l.avg_rating || 0;
      box.innerHTML = '<div class="detail-grid"><div><div class="d-thumb">' + (l.image_url ? '<img src="' + l.image_url + '" alt="">' : PH) + '</div></div>'
        + '<div><div style="display:flex;gap:6px;margin-block-end:8px"><span class="badge cat">' + catLabel(l.cat) + '</span>' + (l.seller_verified ? '<span class="badge ver">تأیید شده</span>' : '<span class="badge off">بدون تأیید</span>') + '</div>'
        + '<h1 style="font-size:22px;font-weight:800;margin-block-end:6px">' + esc(l.title) + '</h1><div style="font-size:19px;font-weight:800;color:var(--accent-deep);margin-block-end:12px">' + price(l.price) + '</div>'
        + '<div style="background:var(--surface-2);border:1px solid var(--line);border-radius:12px;padding:14px;font-size:14px;color:var(--ink-2);white-space:pre-wrap;margin-block-end:16px">' + esc(l.description) + '</div>'
        + '<div style="display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-block-end:16px"><span style="width:44px;height:44px;border-radius:50%;background:var(--accent-soft);color:var(--accent-deep);display:grid;place-items:center;font-weight:800">' + esc((l.seller_name || "?").charAt(0)) + '</span><div><div style="font-weight:700">' + esc(l.seller_name) + '</div><div style="font-size:11.5px;color:var(--ink-3)"><span class="stars">' + stars(r) + '</span> · ' + fa(l.rating_count || 0) + ' امتیاز · ' + fa(l.views || 0) + ' بازدید</div></div></div>'
        + '<a class="btn btn-wa" target="_blank" rel="noopener" href="' + waLink(l.whatsapp, l.title) + '">تماس در واتساپ</a>'
        + '<div class="rate-row" style="display:flex;gap:6px;justify-content:center;margin-block-start:14px">' + [1, 2, 3, 4, 5].map(function (i) { return '<button data-star="' + i + '" aria-label="امتیاز ' + i + ' ستاره" style="background:none;border:none;font-size:22px;color:' + (i <= Math.round(r) ? "#f59e0b" : "var(--line-2)") + '">★</button>'; }).join("") + '</div>'
        + '<button id="rep" style="background:none;border:none;color:var(--ink-3);font-size:12px;width:100%;margin-block-start:10px">گزارشِ تخلف</button>'
        + '<div class="disclaimer" style="margin-block-start:14px">هشدار: پیش از بررسیِ کاملِ اکانت کلِ مبلغ را نده؛ ترجیحاً معاملهٔ رو در رو در مکانِ امن.</div>'
        + '<div class="comments-sec"><h3 style="font-size:15px;font-weight:800;margin-block-end:10px">نظرات</h3><div id="commentList"><div class="spin"></div></div>'
        + (Store.current()
          ? '<form id="commentForm" class="comment-form"><textarea id="commentInput" maxlength="500" placeholder="نظرت را بنویس…" required></textarea><button class="btn btn-primary btn-sm" style="margin-block-start:8px">ثبتِ نظر</button></form>'
          : '<a class="btn btn-ghost btn-sm" href="login.html" style="margin-block-start:6px">برای نظردادن وارد شو</a>')
        + '</div></div></div>';
      box.querySelector(".rate-row").addEventListener("click", async function (e) { var b = e.target.closest("[data-star]"); if (!b) return; var res = await Store.rate(id, +b.dataset.star); if (res.err) { toast(res.err); return; } toast("امتیازت ثبت شد ✓"); P.listing(); });
      box.querySelector("#rep").addEventListener("click", async function () { var res = await Store.report(id); toast(res.err || "گزارشت ثبت شد؛ تشکر �홏"); });
      async function loadComments() {
        var cl = box.querySelector("#commentList");
        var list = await Store.comments(id);
        var me = Store.current();
        cl.innerHTML = list.length ? list.map(function (c) {
          return '<div class="comment"><b>' + esc(c.user_name) + '</b><span class="muted"> · ' + rel(c.created_at) + '</span>' + (me && me.id === c.user_id ? '<button data-delc="' + c.id + '" class="cdel" aria-label="حذفِ نظر">✕</button>' : '') + '<p>' + esc(c.body) + '</p></div>';
        }).join("") : '<div class="empty" style="padding:20px 0">هنوز نظری ثبت نشده؛ اولین نفر باش.</div>';
        cl.querySelectorAll("[data-delc]").forEach(function (btn) {
          btn.addEventListener("click", async function () { await Store.deleteComment(btn.dataset.delc); loadComments(); });
        });
      }
      loadComments();
      var cf = box.querySelector("#commentForm");
      if (cf) cf.addEventListener("submit", async function (e) {
        e.preventDefault();
        var val = box.querySelector("#commentInput").value;
        var btn = cf.querySelector("button"); btn.disabled = true;
        var res = await Store.addComment(id, val);
        btn.disabled = false;
        if (res.err) { toast(res.err); return; }
        box.querySelector("#commentInput").value = "";
        loadComments();
      });
    },

    login: async function () {
      await Store.ready(); if (Store.current()) { location.href = "listings.html"; return; }
      $("#form").addEventListener("submit", async function (e) {
        e.preventDefault(); var btn = e.target.querySelector("button"); btn.disabled = true;
        var r = await Store.login($("#email").value.trim(), $("#pass").value); btn.disabled = false;
        if (r.err) { $("#err").textContent = r.err; return; }
        toast("خوش آمدی 👋"); location.href = r.ok.role === "seller" ? "dashboard.html" : (r.ok.role === "admin" ? "admin.html" : "listings.html");
      });
    },

    register: async function () {
      await Store.ready(); if (Store.current()) { location.href = "listings.html"; return; }
      var role = "buyer";
      document.querySelectorAll(".role").forEach(function (el) { el.addEventListener("click", function () { document.querySelectorAll(".role").forEach(function (x) { x.classList.remove("on"); }); el.classList.add("on"); role = el.dataset.role; var pf = $("#phoneField"); if (pf) pf.style.display = role === "seller" ? "" : "none"; }); });
      $("#form").addEventListener("submit", async function (e) {
        e.preventDefault();
        if ($("#pass").value !== $("#pass2").value) { $("#err").textContent = "تکرار رمز عبور یکسان نیست."; return; }
        var btn = e.target.querySelector("button"); btn.disabled = true;
        var r = await Store.register({ name: $("#name").value.trim(), email: $("#email").value.trim(), pass: $("#pass").value, phone: $("#phone").value.trim(), role: role });
        btn.disabled = false;
        if (r.err) { $("#err").textContent = r.err; return; }
        if (r.pending) { toast("ایمیلِ تأییدیه فرستاده شد؛ پس از تأیید وارد شو."); location.href = "login.html"; return; }
        toast("حساب‌ات ساخته شد 🎉"); location.href = role === "seller" ? "dashboard.html" : "index.html";
      });
    },

    "forgot-password": function () {
      $("#form").addEventListener("submit", async function (e) {
        e.preventDefault();
        var btn = e.target.querySelector("button"); btn.disabled = true;
        var r = await Store.resetRequest($("#email").value.trim());
        btn.disabled = false;
        if (r.err) { $("#err").textContent = r.err; return; }
        $("#form").innerHTML = '<p style="font-size:14px;color:var(--ink-2);line-height:1.9">اگر این ایمیل ثبت باشد، لینکِ بازیابیِ رمز برایت فرستاده شد. صندوقِ ایمیل‌ات (و پوشهٔ اسپم) را بررسی کن.</p>';
      });
    },

    "reset-password": function () {
      $("#form").addEventListener("submit", async function (e) {
        e.preventDefault();
        if ($("#pass").value !== $("#pass2").value) { $("#err").textContent = "تکرار رمز یکسان نیست."; return; }
        if ($("#pass").value.length < 6) { $("#err").textContent = "رمز باید حداقل ۶ حرف باشد."; return; }
        var r = await Store.resetConfirm($("#pass").value);
        if (r.err) { $("#err").textContent = r.err; return; }
        toast("رمزِ عبور تغییر کرد ✓"); setTimeout(function () { location.href = "login.html"; }, 1200);
      });
    },

    account: async function () {
      await Store.ready(); var u = Store.current(); if (!u) { location.href = "login.html"; return; }
      $("#name").value = u.name || "";
      var pf = $("#phoneField");
      if (u.role === "seller") { pf.style.display = ""; var priv = await Store.myPhone(); $("#phone").value = (priv && priv.phone) || ""; }
      else { pf.style.display = "none"; }
      $("#pForm").addEventListener("submit", async function (e) { e.preventDefault(); var r = await Store.updateProfile({ name: $("#name").value.trim(), phone: $("#phone") ? $("#phone").value.trim() : undefined }); toast(r.err || "ذخیره شد ✓"); });
      $("#pwForm").addEventListener("submit", async function (e) {
        e.preventDefault();
        if ($("#np1").value !== $("#np2").value) { toast("تکرار رمز یکسان نیست."); return; }
        if ($("#np1").value.length < 6) { toast("رمز باید حداقل ۶ حرف باشد."); return; }
        var r = await Store.resetConfirm($("#np1").value);
        toast(r.err || "رمزِ عبور تغییر کرد ✓"); if (!r.err) e.target.reset();
      });
    },

    dashboard: async function () {
      await Store.ready(); var u = Store.current(); if (!u || u.role !== "seller") { location.href = "login.html"; return; }
      loading($("#dTable"));
      var mine = await Store.mine();
      var views = 0, rSum = 0, rCnt = 0;
      mine.forEach(function (l) { views += l.views || 0; rSum += (l.avg_rating || 0) * (l.rating_count || 0); rCnt += l.rating_count || 0; });
      $("#dStats").innerHTML = [["آگهی‌ها", mine.length], ["فعال", mine.filter(function (l) { return l.active; }).length], ["بازدید کل", views], ["میانگین امتیاز", rCnt ? (rSum / rCnt).toFixed(1) : "—"]].map(function (s) { return '<div class="hstat"><b>' + fa(s[1]) + '</b><span>' + s[0] + "</span></div>"; }).join("");
      $("#dTable").innerHTML = mine.length ? ('<table class="table"><thead><tr><th>عنوان</th><th>قیمت</th><th>بازدید</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>' + mine.map(function (l) { return "<tr><td>" + esc(l.title) + '</td><td>' + price(l.price) + '</td><td>' + fa(l.views || 0) + '</td><td>' + (l.active ? '<span class="badge ver">فعال</span>' : '<span class="badge off">غیرفعال</span>') + '</td><td class="acts" style="display:flex;gap:6px;flex-wrap:wrap"><a class="btn btn-ghost btn-sm" href="post.html?id=' + l.id + '">ویرایش</a><button class="btn btn-ghost btn-sm" data-tog="' + l.id + '" data-active="' + l.active + '">' + (l.active ? "غیرفعال" : "فعال") + '</button><button class="btn btn-danger btn-sm" data-del="' + l.id + '">حذف</button></td></tr>'; }).join("") + "</tbody></table>") : '<div class="empty">هنوز آگهی نداری؛ از منو «ثبت آگهی جدید» را بزن.</div>';
      $("#dTable").addEventListener("click", async function (e) {
        var t = e.target.closest("[data-tog]"), d = e.target.closest("[data-del]");
        if (t) { await Store.toggleActive(t.dataset.tog, t.dataset.active !== "true"); P.dashboard(); }
        if (d) { if (confirm("این آگهی حذف شود؟")) { await Store.remove(d.dataset.del); toast("آگهی حذف شد."); P.dashboard(); } }
      });
      $("#dRates").innerHTML = mine.filter(function (l) { return (l.rating_count || 0) > 0; }).map(function (l) { return '<div style="display:flex;justify-content:space-between;border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin-block-end:8px;font-size:13px"><span>' + esc(l.title) + '</span><span class="stars">' + stars(l.avg_rating) + ' (' + fa(l.rating_count) + ')</span></div>'; }).join("") || '<div class="empty">هنوز امتیازی نگرفته‌ای.</div>';
    },

    post: async function () {
      await Store.ready(); var u = Store.current(); if (!u || u.role !== "seller") { location.href = "login.html"; return; }
      var id = new URLSearchParams(location.search).get("id"); var editing = null;
      $("#fCat").innerHTML = CATS.map(function (c) { return '<option value="' + c.id + '">' + c.label + "</option>"; }).join("");
      if (id) { var l = await Store.get(id); if (l && l.seller_id === u.id) editing = l; }
      if (editing) { $("#fTitle").value = editing.title; $("#fCat").value = editing.cat; $("#fPrice").value = editing.price || ""; $("#fDesc").value = editing.description; $("#fWa").value = editing.whatsapp; }
      $("#form").addEventListener("submit", async function (e) {
        e.preventDefault();
        var d = { title: $("#fTitle").value.trim(), cat: $("#fCat").value, price: +$("#fPrice").value || 0, desc: $("#fDesc").value.trim(), wa: $("#fWa").value.trim() };
        if (!d.title || !d.desc) { toast("عنوان و توضیحات الزامی است."); return; }
        if (!Store.AF_PHONE.test(d.wa)) { toast("شمارهِ واتساپ معتبر افغانستان (۰۷…) بنویس."); return; }
        var file = $("#fImg").files[0];
        var btn = e.target.querySelector("button[type=submit]"); if (btn) btn.disabled = true;
        var r = editing ? await Store.update(editing.id, d, file) : await Store.add(d, file);
        if (btn) btn.disabled = false;
        if (r.err) { toast(r.err); return; }
        toast("ذخیره شد ✓"); location.href = "dashboard.html";
      });
    },

    admin: async function () {
      await Store.ready(); var u = Store.current(); if (!u || u.role !== "admin") { location.href = "login.html"; return; }
      async function draw() {
        loading($("#aListings"));
        var L = await Store.allListings(), U = await Store.allUsers();
        var rep = L.filter(function (l) { return (l.report_count || 0) > 0 && !l.hidden; });
        var views = 0; L.forEach(function (l) { views += l.views || 0; });
        $("#aStats").innerHTML = [["کاربرها", U.length], ["فروشنده‌ها", U.filter(function (x) { return x.role === "seller"; }).length], ["آگهی‌ها", L.length], ["پنهان", L.filter(function (l) { return l.hidden; }).length], ["گزارش باز", rep.length], ["بازدید کل", views]].map(function (s) { return '<div class="hstat"><b>' + fa(s[1]) + '</b><span>' + s[0] + "</span></div>"; }).join("");
        $("#aReports").innerHTML = rep.length ? rep.map(function (l) { return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-block-end:8px;flex-wrap:wrap"><div><b style="font-size:13.5px">' + esc(l.title) + '</b><div style="font-size:11.5px;color:var(--ink-3)">' + fa(l.report_count) + ' گزارش · ' + esc(l.seller_name) + '</div></div><div style="display:flex;gap:6px"><button class="btn btn-ghost btn-sm" data-unrep="' + l.id + '">رفع گزارش</button><button class="btn btn-danger btn-sm" data-hide="' + l.id + '" data-hidden="' + l.hidden + '">پنهان کردن</button></div></div>'; }).join("") : '<div class="empty">گزارش بازی نیست 🎉</div>';
        $("#aListings").innerHTML = '<table class="table"><thead><tr><th>عنوان</th><th>فروشنده</th><th>بازدید</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>' + L.map(function (l) { return "<tr><td>" + esc(l.title) + '</td><td>' + esc(l.seller_name) + '</td><td>' + fa(l.views || 0) + '</td><td>' + (l.hidden ? '<span class="badge off">پنهان</span>' : '<span class="badge ver">فعال</span>') + '</td><td style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" data-hide="' + l.id + '" data-hidden="' + l.hidden + '">' + (l.hidden ? "آشکار" : "پنهان") + '</button><button class="btn btn-danger btn-sm" data-del="' + l.id + '">حذف</button></td></tr>'; }).join("") + "</tbody></table>";
        $("#aUsers").innerHTML = '<table class="table"><thead><tr><th>نام</th><th>ایمیل</th><th>نقش</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>' + U.filter(function (x) { return x.role !== "admin"; }).map(function (x) { return "<tr><td>" + esc(x.name) + '</td><td>' + esc(x.email || "—") + '</td><td>' + (x.role === "seller" ? "فروشنده" : "خریدار") + '</td><td>' + (x.suspended ? '<span class="badge off">مسدود</span>' : (x.verified ? '<span class="badge ver">تأیید شده</span>' : '<span class="badge off">عادی</span>')) + '</td><td style="display:flex;gap:6px;flex-wrap:wrap">' + (x.role === "seller" ? '<button class="btn btn-ghost btn-sm" data-ver="' + x.id + '" data-verified="' + x.verified + '">' + (x.verified ? "لغو تأیید" : "تأیید فروشنده") + "</button>" : "") + '<button class="btn btn-danger btn-sm" data-sus="' + x.id + '" data-suspended="' + x.suspended + '">' + (x.suspended ? "رفع مسدودی" : "مسدود") + "</button></td></tr>"; }).join("") + "</tbody></table>";
      }
      function act(root) {
        root.addEventListener("click", async function (e) {
          var h = e.target.closest("[data-hide]"), d = e.target.closest("[data-del]"), v = e.target.closest("[data-ver]"), s = e.target.closest("[data-sus]"), r = e.target.closest("[data-unrep]");
          if (h) { await Store.setListingHidden(h.dataset.hide, h.dataset.hidden !== "true"); toast("وضعیت آگهی عوض شد."); draw(); }
          if (d) { if (confirm("آگهی حذف شود؟")) { await Store.remove(d.dataset.del); toast("حذف شد."); draw(); } }
          if (r) { await Store.clearReports(r.dataset.unrep); toast("گزارش‌ها رفع شد."); draw(); }
          if (v) { await Store.setUserFlag(v.dataset.ver, { verified: v.dataset.verified !== "true" }); toast("وضعیت تأیید به‌روز شد."); draw(); }
          if (s) { await Store.setUserFlag(s.dataset.sus, { suspended: s.dataset.suspended !== "true" }); toast("وضعیت کاربر به‌روز شد."); draw(); }
        });
      }
      act($("#aReports")); act($("#aListings")); act($("#aUsers"));
      draw();
    }
  };

  document.addEventListener("DOMContentLoaded", async function () {
    await injectChrome(); reveal();
    var p = document.body.dataset.page;
    if (P[p]) await P[p]();
  });
})();
