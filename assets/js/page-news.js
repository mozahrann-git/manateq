/* مناطق · إدارة الأخبار المبنية على الاستقبال */
(function (w, d) {
  "use strict";
  var M = w.MQ, D = M.D, A = w.MQ_ADMIN;
  M.buildAdminHeader("admin-news.html");

  /* الأخبار = أحداث النبض + حالة نشر وتاريخ انتهاء */
  var NEWS = D.EVENTS.map(function (e, i) {
    return {
      id: "N-" + (4100 + i), src: e, reg: e.r, kind: e.kT, imp: e.i,
      st: i < 7 ? "live" : (i < 10 ? "draft" : "exp"),
      exp: e.exp || "",
      inv: e.inv, buy: e.buy, brk: e.brk,
      from: e.src, at: e.t + " · " + e.d, proj: e.proj || ""
    };
  });
  var sel = 0, fSt = "all", fReg = "الكل";
  var log = [];

  function line() {
    var live = NEWS.filter(function (n) { return n.st === "live"; }).length;
    [["أخبار مسجّلة", NEWS.length, "sig"],
     ["منشورة", live, "up"],
     ["مسودات", NEWS.filter(function (n) { return n.st === "draft"; }).length, "wrn"],
     ["منتهية", NEWS.filter(function (n) { return n.st === "exp"; }).length, "mut"],
     ["عاجلة", NEWS.filter(function (n) { return n.imp === "hot" && n.st === "live"; }).length, "dn"],
     ["بتاريخ انتهاء", NEWS.filter(function (n) { return n.exp; }).length, "wrn"]]
    .forEach(function (x, i) {
      if (i === 0) d.getElementById("nline").innerHTML = "";
      d.getElementById("nline").innerHTML += '<div class="ops1"><p class="l">' + x[0] +
        '</p><p class="v ' + x[2] + '">' + x[1] + '</p></div>';
    });
  }

  d.getElementById("segReg").innerHTML = ["الكل"].concat(Object.keys(D.REGIONS)).map(function (r, i) {
    return '<button type="button" data-r="' + r + '" aria-pressed="' + (i === 0) + '">' + r + '</button>';
  }).join("");
  function bind(id, attr, set) {
    d.getElementById(id).addEventListener("click", function (e) {
      var b = e.target.closest("[" + attr + "]"); if (!b) return;
      set(b.getAttribute(attr));
      this.querySelectorAll("button").forEach(function (x) {
        x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      list();
    });
  }
  bind("segSt", "data-s", function (v) { fSt = v; });
  bind("segReg", "data-r", function (v) { fReg = v; });

  var ST = { live: ["منشور", "o"], draft: ["مسودة", "n"], exp: ["منتهي", "b"] };

  function filtered() {
    return NEWS.filter(function (n) {
      return (fSt === "all" || n.st === fSt) && (fReg === "الكل" || n.reg === fReg);
    });
  }
  function list() {
    var L = filtered();
    d.getElementById("nlist").innerHTML = L.length ? L.map(function (n) {
      var i = NEWS.indexOf(n);
      return '<button class="nitem" type="button" data-i="' + i + '" aria-pressed="' + (i === sel) + '">' +
        '<span class="ntop"><span class="vd ' + ST[n.st][1] + '">' + ST[n.st][0] + '</span>' +
        '<span class="tg ' + n.src.k + '">' + n.kind + '</span>' +
        '<span class="imp ' + n.imp + '">' + (n.imp === "hot" ? "عاجل" : n.imp === "mid" ? "مؤثر" : "روتيني") + '</span></span>' +
        '<span class="nbody">' + n.inv.replace(/<[^>]+>/g, "").slice(0, 78) + '…</span>' +
        '<span class="nmeta">' + n.reg + ' · ' + n.at + (n.exp ? ' · ' + n.exp : '') + '</span></button>';
    }).join("") : '<p class="empty" style="padding:26px">مفيش أخبار بالفلتر ده.</p>';
    M.stagger(d.getElementById("nlist"));
    editor();
  }
  d.getElementById("nlist").addEventListener("click", function (e) {
    var b = e.target.closest("[data-i]"); if (!b) return;
    sel = +b.dataset.i; list();
  });

  function editor() {
    var n = NEWS[sel];
    if (!n) { d.getElementById("nedit").innerHTML = '<p class="empty">اختار خبر.</p>'; return; }
    d.getElementById("nedit").innerHTML =
      '<div class="nhead"><div><p class="lbl">' + n.id + ' · ' + n.at + '</p>' +
        '<h3>' + n.kind + ' · ' + n.reg + '</h3>' +
        '<p class="nsrc">' + n.from + '</p></div>' +
        '<span class="vd ' + ST[n.st][1] + '">' + ST[n.st][0] + '</span></div>' +

      '<div class="nrow"><span class="lbl">الأهمية</span><div class="seg" id="eImp">' +
        [["hot", "عاجل"], ["mid", "مؤثر"], ["low", "روتيني"]].map(function (x) {
          return '<button type="button" data-v="' + x[0] + '" aria-pressed="' + (n.imp === x[0]) + '">' + x[1] + '</button>';
        }).join("") + '</div></div>' +

      '<div class="nrow"><span class="lbl">ينتهي</span>' +
        '<input class="ginp nin" id="eExp" value="' + n.exp + '" placeholder="سيبه فاضي لو مالوش تاريخ انتهاء"></div>' +

      '<p class="lbl" style="margin-top:14px">الصياغة للتلاتة</p>' +
      '<p class="hint" style="margin:5px 0 9px">نفس الحدث بيتقال بتلات طرق. المستثمر عايز الرقم، المشتري عايز يدفع كام، والبروكر عايز يقفل بيه.</p>' +
      ["inv", "buy", "brk"].map(function (k) {
        var lbl = k === "inv" ? "للمستثمر" : k === "buy" ? "للمشتري" : "للبروكر";
        return '<div class="nfld"><span class="nlbl">' + lbl + '</span>' +
          '<textarea class="nta" data-k="' + k + '">' + n[k].replace(/<[^>]+>/g, "") + '</textarea></div>';
      }).join("") +

      '<div class="acts">' +
        (n.st === "live"
          ? '<button class="btn" type="button" data-act="unpub">اسحب من النبض</button>'
          : '<button class="b1" type="button" data-act="pub">انشر في نبض السوق</button>') +
        '<button class="btn" type="button" data-act="save">احفظ التعديل</button>' +
        (n.proj ? '<a class="btn" href="projects.html?p=' + n.proj + '" style="text-decoration:none">ملف المشروع</a>' : '') +
      '</div>' +
      '<p class="hint" id="eHint">' + (n.st === "live"
        ? "الخبر ده ظاهر دلوقتي في نبض السوق لكل الزوّار."
        : n.st === "draft" ? "مسودة — مش ظاهرة لحد."
        : "منتهي — اختفى من النبض لوحده بعد تاريخه.") + '</p>';

    d.getElementById("eImp").addEventListener("click", function (e) {
      var b = e.target.closest("[data-v]"); if (!b) return;
      n.imp = b.dataset.v;
      this.querySelectorAll("button").forEach(function (x) {
        x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      list();
    });
    d.getElementById("nedit").querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.dataset.act;
        if (a === "pub") { n.st = "live"; add("نشر", n.id); toast("اتنشر في نبض السوق — ظاهر دلوقتي لكل الزوّار"); }
        if (a === "unpub") { n.st = "draft"; add("سحب", n.id); toast("اتسحب من النبض — بقى مسودة"); }
        if (a === "save") {
          d.getElementById("nedit").querySelectorAll(".nta").forEach(function (t) { n[t.dataset.k] = t.value; });
          n.exp = d.getElementById("eExp").value.trim();
          add("تعديل", n.id); toast("اتحفظ ✓");
        }
        line(); list();
      });
    });
  }

  function add(act, on) { log.unshift({ at: "دلوقتي", who: "محمد زهران", act: act, on: on }); }
  function toast(t) {
    var el = d.createElement("div"); el.className = "toast"; el.textContent = t;
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    setTimeout(function () { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 300); }, 3600);
  }

  line(); list(); M.markSections(); M.reveal();
})(window, document);
