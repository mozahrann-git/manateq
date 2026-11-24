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

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  var PILL = { "فرصة": "ok", "متضخّم": "bad", "انتظر": "mut", "محايد": "mut" };

  function match(s) { return !q || String(s).toLowerCase().indexOf(q) > -1; }

  function draw() {
    var shownU = UNITS.filter(function (u) { return !hidden[u.id]; }).length;
    var shownP = PROJECTS.filter(function (p) { return !hidden[p.id]; }).length;
    $("sum").innerHTML = "<b>" + shownU + "</b> وحدة و<b>" + shownP + "</b> مشروع ظاهرين للزوار";

    var rows = kind === "units"
      ? UNITS.filter(function (u) { return match(u.proj + " " + u.t + " " + u.d + " " + u.r + " " + u.id); }).map(unitRow)
      : PROJECTS.filter(function (p) { return match(p.nm + " " + p.dev + " " + p.dist + " " + p.reg); }).map(projRow);

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
