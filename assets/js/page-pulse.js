/* مناطق · صفحة 04 — نبض السوق */
(function (w, d) {
  "use strict";
  var M = w.MQ, D = M.D;

  M.buildHeader("pulse.html");

  d.getElementById("today").textContent =
    new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  /* المؤشرات الكلية */
  var mc = d.getElementById("macro");
  mc.innerHTML = D.MACRO.map(function (x) {
    return '<div class="mc"><p class="l">' + x[0] + '</p><p class="v ' + x[3] + '">' + x[1] +
      '</p><p class="s">' + x[2] + '</p></div>';
  }).join("");
  M.stagger(mc);

  /* نشرة اليوم */
  var bf = d.getElementById("brief");
  bf.innerHTML = D.BRIEF.map(function (x) {
    return '<p><i>' + x[0] + '</i><span>' + x[1] + '</span></p>';
  }).join("");
  M.stagger(bf);

  /* عدّادات التشغيل */
  var op = d.getElementById("ops");
  op.innerHTML = D.OPS.map(function (x) {
    return '<div class="op"><p class="v">0</p><p class="l">' + x[1] + '</p></div>';
  }).join("");
  M.stagger(op);
  op.querySelectorAll(".v").forEach(function (el, i) {
    M.count(el, D.OPS[i][0], function (x) { return String(Math.round(x)); }, 900 + i * 90);
  });

  /* الفلاتر */
  var aud = "inv", reg = "الكل", imp = "all";
  d.getElementById("segReg").innerHTML = ["الكل"].concat(Object.keys(D.REGIONS)).map(function (r, i) {
    return '<button type="button" data-g="' + r + '" aria-pressed="' + (i === 0) + '">' + r + '</button>';
  }).join("");

  function bind(id, attr, set) {
    d.getElementById(id).addEventListener("click", function (e) {
      var b = e.target.closest("[" + attr + "]");
      if (!b) return;
      set(b.getAttribute(attr));
      this.querySelectorAll("button").forEach(function (x) {
        x.setAttribute("aria-pressed", x === b ? "true" : "false");
      });
      feed();
    });
  }
  bind("segAud", "data-a", function (v) { aud = v; });
  bind("segReg", "data-g", function (v) { reg = v; });
  bind("segImp", "data-i", function (v) { imp = v; });

  function feed() {
    var list = D.EVENTS.filter(function (x) {
      return (reg === "الكل" || x.r === reg) && (imp === "all" || x.i === imp);
    });
    var h = d.getElementById("feed");
    h.innerHTML = list.length ? list.map(function (x) {
      return '<article class="evt"><span class="tm"><b>' + x.t + '</b>' + x.d + '</span><div>' +
        '<div class="hd"><span class="tg ' + x.k + '">' + x.kT + '</span>' +
        '<span class="imp ' + x.i + '">' + (x.i === "hot" ? "عاجل" : x.i === "mid" ? "مؤثر" : "روتيني") + '</span>' +
        '<span class="reg">' + x.r + '</span>' +
        (x.exp ? '<span class="exp">' + x.exp + '</span>' : '') + '</div>' +
        '<p class="bd">' + x[aud] + '</p>' +
        '<p class="src">' + x.src +
        (x.proj ? '<a class="lnk" href="projects.html?p=' + x.proj + '">افتح ملف المشروع</a>' : '') +
        (aud === "brk" ? '<span class="lnk">انسخ النص للعميل</span>' : '') +
        (aud === "inv" ? '<a class="lnk" href="units.html">افتح الوحدات</a>' : '') +
        '</p></div></article>';
    }).join("") : '<p class="empty">مفيش أحداث بالفلتر ده. جرّب منطقة تانية أو شيل فلتر الأهمية.</p>';
    M.stagger(h);
  }
  feed();

  /* كثافة الطرح */
  var tot = 0, mx = 0;
  Object.keys(D.HEAT).forEach(function (k) {
    D.HEAT[k].forEach(function (v) { tot += v; if (v > mx) mx = v; });
  });
  var html = '<span></span>' + D.DAYS.map(function (x) { return '<span class="dh">' + x + '</span>'; }).join("");
  Object.keys(D.HEAT).forEach(function (k, ri) {
    html += '<span class="rh">' + k + '</span>';
    D.HEAT[k].forEach(function (v, ci) {
      var a = v / mx;
      var bg = a < 0.2 ? "#141B24" : "rgba(255,122,26," + (0.18 + a * 0.82).toFixed(2) + ")";
      html += '<span class="cell" style="background:' + bg + ';transition-delay:' + ((ri * 7 + ci) * 22) +
        'ms" title="' + k + ' · ' + D.DAYS[ci] + ' · ' + v + ' رسالة">' +
        (a >= 0.55 ? '<span>' + v + '</span>' : '') + '</span>';
    });
  });
  d.getElementById("heat").innerHTML = html;
  d.getElementById("heatTot").innerHTML =
    "إجمالي <span class='n sig'>" + tot + "</span> رسالة مسجّلة في 7 أيام";
  /* المربعات بتتفتح لما توصلها */
  (function () {
    var cells = d.querySelectorAll(".cell");
    if (M.RM) { cells.forEach(function (c) { c.classList.add("in"); }); return; }
    M.onSeen(d.getElementById("heat"), function () {
      cells.forEach(function (c) { c.classList.add("in"); });
    });
  })();

  M.markSections();
  M.reveal();
})(window, document);
