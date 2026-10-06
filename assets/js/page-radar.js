/* مناطق · اقتناص الفرص */
(function (w, d) {
  "use strict";
  var M = w.MQ, P = w.MQParse, A = w.MQ_ADMIN, D = M.D, f0 = M.f0, pc = M.pc;
  M.buildAdminHeader("admin-radar.html");

  var profiles = {};
  A.REPS.forEach(function (r) { profiles[r.id] = r.profile || { rules: {}, seen: 0 }; });
  function repOf(id) { return A.REPS.filter(function (r) { return r.id === id; })[0] || {}; }

  /* شغّل الكواشف على كل الطابور */
  function scan() {
    var out = [];
    A.QUEUE.forEach(function (m) {
      var r = repOf(m.rep);
      var F = P.read(m.raw, profiles[m.rep]).fields;
      if (!F.price || !F.area) return;
      var fp = (r.dev || "") + "|" + F.area.v;
      var prev = A.HISTORY[fp] || null;
      var trueCost = F.price.v + (F.garage ? F.garage.v : 0) + F.price.v * ((F.maint ? F.maint.v : 5) / 100);
      var realPpm = trueCost / F.area.v;
      var dist = guessDistrict(m.raw, r.reg);
      var dPpm = dist ? M.districtPpm(r.reg, dist) : (D.REGIONS[r.reg] ? D.REGIONS[r.reg].ppm : 0);
      var matches = D.POOL.filter(function (q) {
        return q.reg === r.reg && trueCost >= q.bmin * 0.95 && trueCost <= q.bmax * 1.05 &&
               F.area.v >= q.amin && F.area.v <= q.amax;
      });
      P.detect({ fields: F, prev: prev, districtPpm: dPpm, realPpm: realPpm,
                 repost: A.repostOf(fp), matches: matches })
        .forEach(function (h) {
          out.push({ h: h, m: m, r: r, F: F, cost: trueCost, ppm: realPpm,
                     dist: dist, dPpm: dPpm, matches: matches });
        });
    });
    return out;
  }
  function guessDistrict(raw, reg) {
    if (!reg || !D.REGIONS[reg]) return null;
    var t = P.norm(raw), hit = null;
    D.REGIONS[reg].districts.forEach(function (x) { if (t.indexOf(P.norm(x[0])) > -1) hit = x[0]; });
    return hit;
  }

  var ALL = scan();
  var KINDS = { drop:"نزول سعر", rise:"رفع سعر", under:"تحت متوسط الحي", over:"فوق متوسط الحي",
                disc:"خصم استثنائي", repost:"إعادة طرح", match:"عميل مستني", conflict:"تناقض" };
  var fK = "all", fR = "الكل";

  /* الشريط */
  var byK = {};
  ALL.forEach(function (x) { byK[x.h.k] = (byK[x.h.k] || 0) + 1; });
  var opps = ALL.filter(function (x) { return x.h.c === "up"; }).length;
  d.getElementById("sigline").innerHTML = [
    ["إجمالي التنبيهات", ALL.length, "sig"],
    ["فرص شراء", opps, "up"],
    ["تحذيرات", ALL.filter(function (x) { return x.h.c === "dn"; }).length, "dn"],
    ["للمتابعة", ALL.filter(function (x) { return x.h.c === "wrn"; }).length, "wrn"],
    ["عملاء مستنيين", byK.match || 0, "up"],
    ["رسائل اتفحصت", A.QUEUE.length, "mut"]
  ].map(function (x) {
    return '<div class="ops1"><p class="l">' + x[0] + '</p><p class="v ' + x[2] + '">' + x[1] + '</p></div>';
  }).join("");

  /* الفلاتر */
  d.getElementById("segK").innerHTML = '<button type="button" data-k="all" aria-pressed="true">الكل</button>' +
    Object.keys(byK).map(function (k) {
      return '<button type="button" data-k="' + k + '" aria-pressed="false">' + KINDS[k] + ' ' + byK[k] + '</button>';
    }).join("");
  d.getElementById("segR").innerHTML = ["الكل"].concat(Object.keys(D.REGIONS)).map(function (r, i) {
    return '<button type="button" data-r="' + r + '" aria-pressed="' + (i === 0) + '">' + r + '</button>';
  }).join("");
  function bind(id, attr, set) {
    d.getElementById(id).addEventListener("click", function (e) {
      var b = e.target.closest("[" + attr + "]"); if (!b) return;
      set(b.getAttribute(attr));
      this.querySelectorAll("button").forEach(function (x) {
        x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      feed();
    });
  }
  bind("segK", "data-k", function (v) { fK = v; });
  bind("segR", "data-r", function (v) { fR = v; });

  /* الفيد */
  function feed() {
    var list = ALL.filter(function (x) {
      return (fK === "all" || x.h.k === fK) && (fR === "الكل" || x.r.reg === fR);
    }).sort(function (a, b) {
      var w = { up: 0, dn: 1, wrn: 2 };
      return w[a.h.c] - w[b.h.c];
    });
    d.getElementById("hits").innerHTML = list.length ? list.map(function (x, i) {
      var F = x.F;
      return '<article class="evt" style="--i:' + i + '"><span class="tm"><b>' +
        x.m.at.replace("النهاردة ", "") + '</b>' + x.m.id + '</span><div>' +
        '<div class="hd"><span class="tg ' + (x.h.c === "up" ? "disc" : x.h.c === "dn" ? "up2" : "cons") + '">' +
          x.h.t + '</span>' +
        '<span class="reg">' + (x.r.reg || "—") + (x.dist ? ' · ' + x.dist : '') + '</span>' +
        '<span class="chip">' + x.r.dev + '</span></div>' +
        '<p class="bd">' + x.h.why + '</p>' +
        '<div class="hfig">' +
          '<span>التكلفة الحقيقية<b class="n">' + f0(x.cost) + '</b></span>' +
          '<span>متر حقيقي<b class="n sig">' + f0(x.ppm) + '</b></span>' +
          (x.dPpm ? '<span>مقابل الحي<b class="n ' + (x.ppm < x.dPpm ? "up" : "dn") + '">' +
            pc((x.ppm - x.dPpm) / x.dPpm * 100) + '</b></span>' : '') +
          (F.cashDisc ? '<span>خصم كاش<b class="n up">' + F.cashDisc.v + '%</b></span>' : '') +
          '<span>المساحة<b class="n">' + F.area.v + ' م²</b></span>' +
        '</div>' +
        (x.h.k === "match" && x.matches.length
          ? '<div class="mlist">' + x.matches.map(function (q) {
              return '<span><b>' + q.who + '</b> · ' + q.tag + ' · ميزانية ' + f0(q.bmin) + '–' + f0(q.bmax) +
                ' · ' + q.dist.join(" / ") + '</span>'; }).join("") + '</div>'
          : '') +
        '<p class="src">' + x.r.nm + ' · ' + x.r.phone +
          '<a class="lnk" href="admin-inbox.html">افتح في الاستقبال</a></p>' +
        '</div></article>';
    }).join("") : '<p class="empty">مفيش تنبيهات بالفلتر ده.</p>';
    M.stagger(d.getElementById("hits"));
  }
  feed();

  /* شرح الكواشف */
  var DET = [
    ["PRICE DROP", "نزول سعر", "بيقارن سعر النهاردة بآخر سعر مسجّل لنفس الوحدة من نفس الجروب.", "up",
     "تفاوض: السعر نزل، والمطوّر مستعد يسمع."],
    ["BELOW DISTRICT", "تحت متوسط الحي", "بيحسب المتر الحقيقي ويقارنه بمتوسط الحي نفسه مش المنطقة.", "up",
     "فرصة: دي اللي بتتعرض على المستثمرين."],
    ["CASH DISCOUNT", "خصم استثنائي", "خصم كاش فوق 25% معناه إن السعر المعلن مرجع غير صالح.", "up",
     "تحذير سعر: قارن بالرقم بعد الخصم."],
    ["REPOST", "إعادة طرح", "نفس الوحدة اتطرحت من نفس الجروب أكتر من 3 مرات.", "wrn",
     "الوحدة مش بتتباع — فرصة ضغط أو إشارة مشكلة."],
    ["BUYER MATCH", "عميل مستني", "الوحدة بتطابق طلب مسجّل في حوض الطلبات.", "up",
     "أقصر طريق لعمولة: عميل موجود ومستني."],
    ["CONFLICT", "تناقض", "المطوّر قال رقم النهاردة غير اللي قاله قبل كده.", "dn",
     "يتراجع قبل النشر — مصداقيتنا على المحك."]
  ];
  d.getElementById("detectors").innerHTML = DET.map(function (x) {
    var n = Object.keys(byK).filter(function (k) { return KINDS[k] === x[1]; })
      .reduce(function (a, k) { return a + byK[k]; }, 0);
    return '<article class="pi"><span class="en">' + x[0] + '</span><span class="ar">' + x[1] + '</span>' +
      '<span class="v ' + x[3] + '">' + n + '</span>' +
      '<span class="ex">' + x[2] + '<br><b style="color:var(--txt)">' + x[4] + '</b></span></article>';
  }).join("");
  M.stagger(d.getElementById("detectors"));

  M.markSections(); M.reveal();
})(window, document);
