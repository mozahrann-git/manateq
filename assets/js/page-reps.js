/* مناطق · السيلز
   مين بيبعت، ومين سكت، وطلباتهم. أي حاجة محتاجة قرارك بتطلع فوق. */
(function (w, d) {
  "use strict";
  var M = w.MQ, A = w.MQ_ADMIN;
  M.buildAdminHeader("admin-reps.html");

  var $ = function (id) { return d.getElementById(id); };
  var QUIET = 5;                       /* يوم من غير رسالة = ساكت */
  var LIVE = !!(w.MQ_API || "").trim();
  var reps = A.REPS.slice();
  var subs = (A.SUBS || []).slice();
  var unknown = (A.UNKNOWN || []).slice();
  var filter = "all";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function ago(n) {
    if (n === 0) return "النهاردة";
    if (n === 1) return "امبارح";
    if (n === 2) return "من يومين";
    return "من " + n + " " + (n <= 10 ? "أيام" : "يوم");
  }
  function waLink(phone) { return "https://wa.me/" + String(phone).replace(/[^\d]/g, ""); }

  /* ---------- اللي محتاج قرارك ---------- */
  function alerts() {
    var h = "";
    unknown.forEach(function (u, i) {
      h += '<div class="a3-alert" data-u="' + i + '">' +
        "<h3>رقم جديد بعتلك — مين ده؟</h3>" +
        '<p><bdi dir="ltr">' + esc(u.phone) + "</bdi> · " + esc(u.at) + "</p>" +
        "<p>اسمه على واتساب: <bdi>" + esc(u.name) + "</bdi></p>" +
        '<div class="q">' + esc(u.first) + "</div>" +
        '<div class="a3-acts" style="padding:12px 0 0">' +
          '<button class="a3-btn go" type="button" data-add="' + i + '">سجّله</button>' +
          '<button class="a3-btn ghost" type="button" data-skip="' + i + '">مش سيلز</button>' +
        "</div></div>";
    });
    subs.forEach(function (s, i) {
      var r = reps.filter(function (x) { return x.id === s.rep; })[0] || {};
      h += '<div class="a3-alert" data-s="' + i + '">' +
        "<h3>" + esc(r.nm || "سيلز") + " عايز يضيف مشروع</h3>" +
        "<p><b style=\"color:var(--txt)\">" + esc(s.name) + "</b> · " + esc(s.dist) +
          (s.del ? " · تسليم " + esc(s.del) : "") + "</p>" +
        (s.note ? "<p>" + esc(s.note) + "</p>" : "") +
        '<div class="a3-acts" style="padding:12px 0 0">' +
          '<button class="a3-btn go" type="button" data-sok="' + i + '">ضيفه</button>' +
          '<button class="a3-btn ghost" type="button" data-sno="' + i + '">لأ</button>' +
        "</div></div>";
    });
    $("alerts").innerHTML = h;
  }

  /* ---------- القايمة ---------- */
  function draw() {
    var quiet = reps.filter(function (r) { return r.last >= QUIET; });
    $("sum").innerHTML = "<b>" + reps.length + "</b> سيلز · " +
      (reps.length - quiet.length) + " بيبعتوا" +
      (quiet.length ? ' · <span class="wrn">' + quiet.length + " ساكتين</span>" : "");

    var list = (filter === "quiet" ? quiet : reps).slice()
      .sort(function (a, b) { return a.last - b.last || a.nm.localeCompare(b.nm, "ar"); });

    $("list").innerHTML = list.length ? list.map(row).join("") :
      '<div class="a3-empty"><b>محدش ساكت ✓</b>كل السيلز بعتوا في آخر ' + QUIET + " أيام.</div>";
  }

  function row(r) {
    var q = r.last >= QUIET;
    var pill = q ? '<span class="a3-pill ' + (r.last >= 14 ? "bad" : "wrn") + '">ساكت ' + ago(r.last) + "</span>" : "";
    var n = (r.projects || []).length;
    return '<div class="a3-card" data-id="' + r.id + '">' +
      '<button class="a3-row" type="button" data-open="1">' +
        '<span class="a3-main">' +
          '<span class="a3-who"><b>' + esc(r.nm) + "</b>" + pill + "</span>" +
          '<span class="a3-what" style="font-weight:400;font-size:13px;color:var(--muted)">' +
            "<bdi>" + esc(r.dev) + "</bdi> · " + M.qty(n, n === 1 ? "مشروع" : "مشاريع") + "</span>" +
        "</span>" +
        '<span class="a3-side">' + (q ? "" : ago(r.last)) + "</span>" +
      "</button>" +
      '<div class="a3-more">' +
        '<div class="a3-kv">' +
          "<div><span>الرقم</span><b><bdi dir=\"ltr\">" + esc(r.phone) + "</bdi></b></div>" +
          "<div><span>المنطقة</span><b>" + esc(r.reg) + "</b></div>" +
          "<div><span>مشاريعه</span><b>" + esc((r.projects || []).join("، ")) + "</b></div>" +
          "<div><span>آخر رسالة</span><b>" + ago(r.last) + "</b></div>" +
          "<div><span>بعتلنا</span><b>" + r.seen + " رسالة</b></div>" +
        "</div>" +
        '<div class="a3-acts" style="padding:14px 0 0">' +
          '<a class="a3-btn go" style="text-decoration:none" href="' + waLink(r.phone) +
            '" target="_blank" rel="noopener">كلّمه واتساب</a>' +
          '<button class="a3-btn ghost" type="button" data-portal="' + r.id + '">لينك بوابته</button>' +
        "</div>" +
        '<p class="a3-note" id="pn-' + r.id + '" hidden></p>' +
      "</div></div>";
  }

  /* ---------- الأفعال ---------- */
  d.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("#seg [data-f]"))) {
      filter = t.getAttribute("data-f");
      d.querySelectorAll("#seg button").forEach(function (b) {
        b.setAttribute("aria-pressed", b === t ? "true" : "false"); });
      return draw();
    }
    if ((t = e.target.closest("[data-portal]"))) {
      var id = t.getAttribute("data-portal"), note = $("pn-" + id);
      note.hidden = false;
      note.textContent = LIVE
        ? "بنعمل اللينك…"
        : "البوابات بتشتغل لما السيرفر يتربط. لحد ساعتها، مفيش لينك تبعته.";
      return;
    }
    if ((t = e.target.closest("[data-add]"))) {
      var i = +t.getAttribute("data-add"), u = unknown[i];
      var box = t.closest(".a3-alert");
      box.innerHTML = "<h3>سجّل " + esc(u.phone) + "</h3>" +
        '<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">' +
          '<input class="a3-search" style="margin:0" id="nNm" placeholder="اسمه" value="' + esc(u.name.split("|")[0].trim()) + '">' +
          '<input class="a3-search" style="margin:0" id="nDev" placeholder="المطوّر" value="' + esc((u.name.split("|")[1] || "").trim()) + '">' +
        "</div>" +
        '<div class="a3-acts" style="padding:12px 0 0">' +
          '<button class="a3-btn go" type="button" data-addok="' + i + '">احفظ</button></div>';
      $("nNm").focus();
      return;
    }
    if ((t = e.target.closest("[data-addok]"))) {
      var j = +t.getAttribute("data-addok"), uu = unknown[j];
      var nm = $("nNm").value.trim(), dv = $("nDev").value.trim();
      if (!nm) { $("nNm").classList.add("bad"); return; }
      reps.push({ id: "R-N" + j, nm: nm, dev: dv || "—", phone: uu.phone, reg: "—",
        projects: [], seen: 1, last: 0 });
      unknown.splice(j, 1);
      alerts(); draw(); toast("اتسجّل " + nm + " — رسايله هتوصل الوارد من دلوقتي");
      return;
    }
    if ((t = e.target.closest("[data-skip]"))) {
      unknown.splice(+t.getAttribute("data-skip"), 1); alerts();
      toast("تمام، الرقم ده مش هيظهر تاني"); return;
    }
    if ((t = e.target.closest("[data-sok]"))) {
      var s = subs.splice(+t.getAttribute("data-sok"), 1)[0];
      var r = reps.filter(function (x) { return x.id === s.rep; })[0];
      if (r) r.projects = (r.projects || []).concat([s.name]);
      alerts(); draw(); toast("«" + s.name + "» اتضاف لمشاريع " + (r ? r.nm : "السيلز")); return;
    }
    if ((t = e.target.closest("[data-sno]"))) {
      subs.splice(+t.getAttribute("data-sno"), 1); alerts(); toast("اترفض"); return;
    }
    if ((t = e.target.closest("[data-open]"))) {
      t.closest(".a3-card").classList.toggle("open");
    }
  });

  function toast(text) {
    var old = d.querySelector(".toast"); if (old) old.remove();
    var el = d.createElement("div"); el.className = "toast"; el.textContent = text;
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    setTimeout(function () { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 300); }, 3500);
  }

  alerts(); draw();
})(window, document);
