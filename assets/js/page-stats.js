/* مناطق · الإحصائيات */
(function (w, d) {
  "use strict";
  var M = w.MQ, P = w.MQParse, A = w.MQ_ADMIN;
  M.buildAdminHeader("admin-stats.html");

  var profiles = {};
  A.REPS.forEach(function (r) { profiles[r.id] = r.profile || { rules: {}, seen: 0 }; });

  var totalSeen = A.REPS.reduce(function (a, r) { return a + r.seen; }, 0);
  var totalOk = A.REPS.reduce(function (a, r) { return a + r.ok; }, 0);
  var mature = A.REPS.filter(function (r) { return P.maturity(profiles[r.id]).auto; }).length;
  var acc = Math.round(totalOk / totalSeen * 100);

  d.getElementById("statline").innerHTML = [
    ["رسائل مستقبلة", totalSeen, "sig"],
    ["اتقرت صح", totalOk, "up"],
    ["دقة القراءة", acc + "%", acc >= 85 ? "up" : "wrn"],
    ["نماذج ناضجة", mature + " / " + A.REPS.length, "up"],
    ["تصحيحات اتعملت", A.REPS.reduce(function (a, r) { return a + ((r.profile || {}).corrections || 0); }, 0), "wrn"],
    ["قواعد متعلّمة", A.REPS.reduce(function (a, r) {
      return a + Object.keys((r.profile || {}).rules || {}).length; }, 0), "sig"]
  ].map(function (x) {
    return '<div class="ops1"><p class="l">' + x[0] + '</p><p class="v ' + x[2] + '">' + x[1] + '</p></div>';
  }).join("");

  /* أداء الجروبات */
  d.getElementById("perfTb").innerHTML = A.REPS.slice()
    .sort(function (a, b) { return (b.ok / b.seen) - (a.ok / a.seen); })
    .map(function (r) {
      var a2 = Math.round(r.ok / r.seen * 100);
      var mat = P.maturity(profiles[r.id]);
      var wd = Math.round(a2 * 0.46);
      return "<tr class='link' data-r='" + r.id + "'>" +
        "<td><b>" + r.nm + "</b><br><span class='mut' style='font-size:10.5px'>" + r.dev + "</span></td>" +
        "<td class='mut' style='font-size:11.5px'>" + r.reg + "</td>" +
        "<td class='num'>" + r.seen + "</td><td class='num up'>" + r.ok + "</td>" +
        "<td><span class='cmpcell'><span class='bar2'><i data-w='" + wd + "' style='background:var(--" +
          (a2 >= 90 ? "up" : a2 >= 75 ? "warn" : "down") + ")'></i></span>" +
        "<span class='n " + (a2 >= 90 ? "up" : a2 >= 75 ? "wrn" : "dn") + "' style='font-size:11.5px'>" +
          a2 + "%</span></span></td>" +
        "<td class='num'>" + Object.keys(profiles[r.id].rules || {}).length + " قاعدة</td>" +
        "<td><span class='vd " + (mat.c === "up" ? "o" : mat.c === "wrn" ? "n" : "b") + "'>" + mat.lvl + "</span></td></tr>";
    }).join("");
  M.stagger(d.getElementById("perfTb"));
  d.getElementById("perfTb").addEventListener("click", function (e) {
    var tr = e.target.closest("[data-r]");
    if (tr) w.location.href = "admin-directory.html?r=" + tr.dataset.r;
  });

  /* التصفية */
  var FUN = [
    [187, "وصلت", "mut", "من 23 جروب مرصود"],
    [153, "فيها بيانات", "mut", "اتشال 34 تهنئة ورد وصورة بدون أرقام"],
    [41, "خبر جديد", "up", "اتشال 112 تكرار — نفس الوحدة اتطرحت قبل كده"],
    [9, "فرصة", "sig", "كاشف اشتغل عليها ومعاه سبب بالأرقام"]
  ];
  d.getElementById("funnel").innerHTML = FUN.map(function (x, i) {
    return '<div class="cmpr" style="--i:' + i + '"><div class="t"><span>' + x[1] + '</span>' +
      '<b class="' + x[2] + '">' + x[0] + '</b></div>' +
      '<div class="ctrack"><i data-w="' + (x[0] / 187 * 100).toFixed(0) + '" style="background:var(--' +
      (x[2] === "up" ? "up" : x[2] === "sig" ? "sig" : "line2") + ')"></i></div>' +
      '<p class="s">' + x[3] + '</p></div>';
  }).join("");

  /* الكواشف */
  var DET = [["نزول سعر", 11, "up"], ["تحت متوسط الحي", 7, "up"], ["عميل مستني", 14, "up"],
             ["خصم استثنائي", 5, "up"], ["إعادة طرح", 19, "wrn"], ["تناقض", 2, "dn"]];
  var mx = Math.max.apply(null, DET.map(function (x) { return x[1]; }));
  d.getElementById("detStats").innerHTML = DET.map(function (x, i) {
    return '<div class="cmpr" style="--i:' + i + '"><div class="t"><span>' + x[0] + '</span>' +
      '<b class="' + x[2] + '">' + x[1] + '</b></div>' +
      '<div class="ctrack" style="height:11px"><i data-w="' + (x[1] / mx * 100).toFixed(0) +
      '" style="background:var(--' + (x[2] === "up" ? "up" : x[2] === "wrn" ? "warn" : "down") + ')"></i></div></div>';
  }).join("");

  /* النضج */
  var buckets = { "ناضج": 0, "بيتعلّم": 0, "جديد": 0 };
  A.REPS.forEach(function (r) { buckets[P.maturity(profiles[r.id]).lvl]++; });
  var MEAN = {
    "ناضج": "رسايله بتتعتمد آلياً — صفر شغل يدوي",
    "بيتعلّم": "محتاج تصحيحات كمان عشان يوصل للاعتماد الآلي",
    "جديد": "كل رسالة منه محتاجة مراجعة كاملة"
  };
  d.getElementById("matTb").innerHTML = Object.keys(buckets).map(function (k) {
    var n = buckets[k], p = Math.round(n / A.REPS.length * 100);
    var c = k === "ناضج" ? "up" : k === "بيتعلّم" ? "wrn" : "dn";
    return "<tr><td><span class='vd " + (c === "up" ? "o" : c === "wrn" ? "n" : "b") + "'>" + k + "</span></td>" +
      "<td class='num'>" + n + "</td>" +
      "<td><span class='cmpcell'><span class='bar2'><i data-w='" + Math.round(p * 0.46) +
        "' style='background:var(--" + (c === "up" ? "up" : c === "wrn" ? "warn" : "down") + ")'></i></span>" +
      "<span class='n'>" + p + "%</span></span></td>" +
      "<td class='mut' style='font-size:11.5px'>" + MEAN[k] + "</td></tr>";
  }).join("");

  M.growBars(); M.markSections(); M.reveal();
})(window, document);
