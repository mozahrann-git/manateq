/* مناطق · المنشور
   كل اللي ظاهر للزوار دلوقتي. تشوفه، تفتحه زي ما الزائر بيشوفه، أو تخبّيه. */
(function (w, d) {
  "use strict";
  var M = w.MQ, D = M.D;
  M.buildAdminHeader("admin-live.html");

  var $ = function (id) { return d.getElementById(id); };
  var f0 = function (n) { return Math.round(n).toLocaleString("en-US"); };
  var LIVE = !!(w.MQ_API || "").trim();
  var kind = "units", q = "";
  var hidden = {};

  var UNITS = D.UNITS.slice();
  var PROJECTS = [];
  Object.keys(D.PROJECTS).forEach(function (r) {
    D.PROJECTS[r].forEach(function (p) { PROJECTS.push(Object.assign({ reg: r }, p)); });
  });

  /* الأخبار: اللي في النبض دلوقتي — واللي نشرته من الوارد بيطلع أولهم */
  var NEWS = D.EVENTS.map(function (e, i) {
    var tmp = d.createElement("div"); tmp.innerHTML = e.inv || e.buy || "";
    return Object.assign({ id: e.fresh ? "F-" + i : "E-" + i, txt: tmp.textContent }, e);
  });

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  /* الكلام اللاتيني والتواريخ جوّه جملة عربي: كل حتة لوحدها عشان متتقلبش */
  function bd(s) {
    return String(s == null ? "" : s).split(/([A-Za-z0-9][A-Za-z0-9 .,'&\-]*[A-Za-z0-9])/).map(function (p, i) {
      return i % 2 ? "<bdi>" + esc(p) + "</bdi>" : esc(p); }).join("");
  }
  var PILL = { "فرصة": "ok", "متضخّم": "bad", "انتظر": "mut", "محايد": "mut" };

  function match(s) { return !q || String(s).toLowerCase().indexOf(q) > -1; }

  function draw() {
    var shownU = UNITS.filter(function (u) { return !hidden[u.id]; }).length;
    var shownP = PROJECTS.filter(function (p) { return !hidden[p.id]; }).length;
    var shownN = NEWS.filter(function (n) { return !hidden[n.id]; }).length;
    $("sum").innerHTML = "<b>" + shownU + "</b> وحدة و<b>" + shownP + "</b> مشروع و<b>" + shownN +
      "</b> خبر ظاهرين للزوار";

    var rows = kind === "units"
      ? UNITS.filter(function (u) { return match(u.proj + " " + u.t + " " + u.d + " " + u.r + " " + u.id); }).map(unitRow)
      : kind === "projects"
      ? PROJECTS.filter(function (p) { return match(p.nm + " " + p.dev + " " + p.dist + " " + p.reg); }).map(projRow)
      : NEWS.filter(function (n) { return match(n.txt + " " + n.r + " " + n.kT + " " + n.src); }).map(newsRow);

    $("list").innerHTML = rows.length ? rows.join("") :
      '<div class="a3-empty">مفيش حاجة بالاسم ده.</div>';
  }

  function unitRow(u) {
    var vd = M.verdict(u)[0], h = hidden[u.id];
    var name = u.proj || u.t;
    return '<div class="a3-card' + (h ? '" style="opacity:.55' : "") + '" data-id="' + u.id + '">' +
      '<button class="a3-row" type="button" data-open="1">' +
        '<span class="a3-main">' +
          '<span class="a3-who"><b>' + esc(name) + "</b><span>" + esc(u.d) + "</span>" +
            (h ? '<span class="a3-pill mut">مخفية</span>' : "") + "</span>" +
          '<span class="a3-what"><span class="a3-nums" style="margin:0">' + M.qty(u.a, "م²") +
            ' <span class="a3-dot">·</span> ' + M.qty(f0(u.p), "ج") + "</span></span>" +
        "</span>" +
        '<span class="a3-side"><span class="a3-pill ' + (PILL[vd] || "mut") + '">' + vd + "</span></span>" +
      "</button>" +
      '<div class="a3-more">' +
        '<div class="a3-kv">' +
          "<div><span>الكود</span><b class=\"n\">" + esc(u.id) + "</b></div>" +
          "<div><span>النوع</span><b>" + esc(u.t) + " · " + (u.k === "resale" ? "ريسيل" : "من المطوّر") + "</b></div>" +
          "<div><span>المصدر</span><b>" + esc(u.src || u.dev || "—") + "</b></div>" +
          "<div><span>التسليم</span><b>" + esc(u.del) + "</b></div>" +
        "</div>" +
        acts(u.id, M.LINK.unit(u.id), h, "ها") +
      "</div></div>";
  }

  function projRow(p) {
    var h = hidden[p.id];
    return '<div class="a3-card' + (h ? '" style="opacity:.55' : "") + '" data-id="' + p.id + '">' +
      '<button class="a3-row" type="button" data-open="1">' +
        '<span class="a3-main">' +
          '<span class="a3-who"><b>' + esc(p.nm) + "</b><span>" + esc(p.dev) + "</span>" +
            (h ? '<span class="a3-pill mut">مخفي</span>' : "") + "</span>" +
          '<span class="a3-what" style="font-weight:400;font-size:13px;color:var(--muted)">' +
            esc(p.dist) + " · " + esc(p.reg) + "</span>" +
        "</span>" +
        '<span class="a3-side">' + esc(p.stT || "") + "</span>" +
      "</button>" +
      '<div class="a3-more">' +
        '<div class="a3-kv">' +
          "<div><span>المطوّر</span><b>" + esc(p.dev) + "</b></div>" +
          "<div><span>الحي</span><b>" + esc(p.dist) + "</b></div>" +
          "<div><span>التسليم</span><b>" + esc(p.del || "—") + "</b></div>" +
          "<div><span>المتر من</span><b>" + (p.base ? M.qty(f0(p.base), "ج") : "—") + "</b></div>" +
        "</div>" +
        acts(p.id, M.LINK.project(p.id), h, "ه") +
      "</div></div>";
  }

  function newsRow(n) {
    var h = hidden[n.id];
    return '<div class="a3-card' + (h ? '" style="opacity:.55' : "") + '" data-id="' + n.id + '">' +
      '<button class="a3-row" type="button" data-open="1">' +
        '<span class="a3-main">' +
          '<span class="a3-who"><span class="a3-pill ' + (n.fresh ? "news" : "mut") + '">' + esc(n.kT) + "</span>" +
            "<b>" + esc(n.r) + "</b>" + (n.fresh ? "<span>نشرته إنت النهاردة</span>" : "") +
            (h ? '<span class="a3-pill mut">مشال</span>' : "") + "</span>" +
          '<span class="a3-what" style="font-weight:400;font-size:13.5px">' + bd(n.txt.length > 140 ? n.txt.slice(0, 140) + "…" : n.txt) + "</span>" +
        "</span>" +
        '<span class="a3-side">' + esc(n.d === "النهاردة" ? n.t : n.d) + "</span>" +
      "</button>" +
      '<div class="a3-more">' +
        '<p class="a3-lbl">المصدر</p><p style="margin:0;font-size:13px">' + n.src + "</p>" +
        '<div class="a3-acts" style="padding:14px 0 0">' +
          '<a class="a3-btn go" style="text-decoration:none" href="pulse.html" target="_blank" rel="noopener">شوفه في النبض</a>' +
          '<button class="a3-btn ghost" type="button" data-hide="' + n.id + '">' + (h ? "رجّعه" : "شيله من النبض") + "</button>" +
        "</div>" +
      "</div></div>";
  }

  function acts(id, link, h, sfx) {
    return '<div class="a3-acts" style="padding:14px 0 0">' +
      '<a class="a3-btn go" style="text-decoration:none" href="' + link + '" target="_blank" rel="noopener">' +
        "شوف" + sfx + " زي الزائر</a>" +
      '<button class="a3-btn ghost" type="button" data-hide="' + id + '">' +
        (h ? "رجّع" + sfx + " للموقع" : "خبّي" + sfx + " من الموقع") + "</button></div>";
  }

  d.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("#seg [data-k]"))) {
      kind = t.getAttribute("data-k");
      d.querySelectorAll("#seg button").forEach(function (b) {
        b.setAttribute("aria-pressed", b === t ? "true" : "false"); });
      return draw();
    }
    if ((t = e.target.closest("[data-hide]"))) {
      var id = t.getAttribute("data-hide");
      hidden[id] = !hidden[id];
      var fn = NEWS.filter(function (n) { return n.id === id && n.fresh; })[0];
      if (fn) {   /* خبر نشرته من الوارد: بيتشال من النبض فعلاً */
        try {
          var key = "mq_news_new", L = JSON.parse(w.sessionStorage.getItem(key) || "[]");
          if (hidden[id]) { fn._saved = L.filter(function (x) { return x.id === fn.nid; })[0];
            L = L.filter(function (x) { return x.id !== fn.nid; }); }
          else if (fn._saved) L.unshift(fn._saved);
          w.sessionStorage.setItem(key, JSON.stringify(L));
        } catch (e2) {}
        draw();
        var c0 = d.querySelector('.a3-card[data-id="' + id + '"]'); if (c0) c0.classList.add("open");
        return toast(hidden[id] ? "اتشال من النبض" : "رجع للنبض");
      }
      draw();
      var c = d.querySelector('.a3-card[data-id="' + id + '"]'); if (c) c.classList.add("open");
      toast(hidden[id]
        ? (LIVE ? "اتخبّت من الموقع" : "اتعلّمت مخفية هنا — هتتخبّى من الموقع فعلاً لما السيرفر يتربط")
        : "رجعت للموقع");
      return;
    }
    if ((t = e.target.closest("[data-open]"))) t.closest(".a3-card").classList.toggle("open");
  });
  $("q").addEventListener("input", function () { q = this.value.trim().toLowerCase(); draw(); });

  function toast(text) {
    var old = d.querySelector(".toast"); if (old) old.remove();
    var el = d.createElement("div"); el.className = "toast"; el.textContent = text;
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    setTimeout(function () { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 300); }, 3800);
  }

  draw();
})(window, document);
