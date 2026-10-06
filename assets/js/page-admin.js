/* مناطق · خط الإنتاج */
(function (w, d) {
  "use strict";
  var M = w.MQ, P = w.MQParse, A = w.MQ_ADMIN, f0 = M.f0;
  M.buildAdminHeader("admin.html");

  var profiles = {};
  A.REPS.forEach(function (r) { profiles[r.id] = r.profile || { rules: {}, seen: 0 }; });
  var mature = A.REPS.filter(function (r) { return P.maturity(profiles[r.id]).auto; }).length;

  /* الشريط */
  var S = [
    ["الرقم المستقبل", A.LINE.number, "mono"],
    ["جروبات مرصودة", A.LINE.groups, "sig"],
    ["سيلز مسجّل", A.LINE.reps, "sig"],
    ["في الطابور", A.QUEUE.length, A.QUEUE.length > 5 ? "wrn" : "up"],
    ["اتعالج النهاردة", 41, "up"],
    ["نماذج ناضجة", mature + " / " + A.REPS.length, mature ? "up" : "wrn"]
  ];
  d.getElementById("opsline").innerHTML = S.map(function (x) {
    return '<div class="ops1"><p class="l">' + x[0] + '</p><p class="v ' + x[2] + '">' + x[1] + '</p></div>';
  }).join("");

  /* خط الإنتاج */
  var FLOW = [
    { n: 187, t: "وصلت", s: "رسالة من 23 جروب", c: "mut",
      w: "كل رسالة بتتسجّل بوقتها ورقم مرسلها قبل أي حاجة." },
    { n: 34, t: "اتفلترت", s: "تهاني · ردود · صور بدون بيانات", c: "dn",
      w: "مفيش فيها رقم ولا مواصفات — مش خبر." },
    { n: 112, t: "اتعدّت تكرار", s: "نفس الوحدة اتطرحت قبل كده", c: "wrn",
      w: "بتتسجّل في أرشيف الطرح، ومبتتنشرش كخبر جديد." },
    { n: 41, t: "اتسجّلت", s: "حدث موثّق بتاريخه", c: "up",
      w: "دي اللي بتغذّي الوحدات وسجل الأسعار والنبض." },
    { n: 9, t: "اتقنصت كفرصة", s: "كاشف اشتغل عليها", c: "sig",
      w: "نزول سعر · تحت متوسط الحي · عميل مستني." }
  ];
  d.getElementById("flow").innerHTML = FLOW.map(function (x, i) {
    return '<div class="fstep" style="--i:' + i + '">' +
      '<span class="fn2 n ' + x.c + '">' + x.n + '</span>' +
      '<span class="ft">' + x.t + '</span>' +
      '<span class="fs">' + x.s + '</span>' +
      '<span class="fw">' + x.w + '</span>' +
      (i < FLOW.length - 1 ? '<span class="farr">←</span>' : '') + '</div>';
  }).join("");

  /* أنشط الجروبات */
  var top = A.REPS.slice().sort(function (a, b) { return b.seen - a.seen; }).slice(0, 7);
  d.getElementById("topTb").innerHTML = top.map(function (r) {
    var acc = Math.round(r.ok / r.seen * 100);
    var mat = P.maturity(profiles[r.id]);
    return "<tr class='link' data-r='" + r.id + "'><td><b>" + r.nm + "</b><br>" +
      "<span class='mut' style='font-size:10.5px'>" + r.dev + "</span></td>" +
      "<td class='num'>" + r.seen + "</td>" +
      "<td class='num " + (acc >= 90 ? "up" : acc >= 75 ? "wrn" : "dn") + "'>" + acc + "%</td>" +
      "<td><span class='vd " + (mat.c === "up" ? "o" : "n") + "'>" + mat.lvl + "</span></td></tr>";
  }).join("");
  d.getElementById("topTb").addEventListener("click", function (e) {
    var tr = e.target.closest("[data-r]");
    if (tr) w.location.href = "admin-directory.html?r=" + tr.dataset.r;
  });

  /* القرارات */
  d.getElementById("logList").innerHTML = A.LOG.map(function (x, i) {
    var c = x.act.indexOf("رفض") > -1 ? "dn" : x.act.indexOf("صحّح") > -1 ? "wrn" : "up";
    return "<div class='evrow' style='--i:" + i + "'><span class='t'>" + x.at.replace("النهاردة ", "") + "</span>" +
      "<span><b class='" + c + "'>" + x.act + "</b> · " + x.who +
      "<br><span class='mut' style='font-size:11.5px'>" + x.note + "</span></span></div>";
  }).join("");

  /* محتاج قرار */
  var needs = A.QUEUE.map(function (m) {
    var r = A.REPS.filter(function (x) { return x.id === m.rep; })[0] || {};
    var q = P.quality(P.read(m.raw, profiles[m.rep]).fields);
    return { m: m, r: r, q: q };
  }).filter(function (x) { return x.q.score < 8; })
    .sort(function (a, b) { return a.q.score - b.q.score; }).slice(0, 6);

  d.getElementById("todo").innerHTML = needs.map(function (x) {
    var cls = x.q.score >= 5 ? "wrn" : "dn";
    return '<a class="card" href="admin-inbox.html">' +
      '<span class="cd">' + x.m.id + ' · ' + x.m.at + '</span>' +
      '<span class="nm">' + (x.r.nm || "رقم غير مسجّل") + '</span>' +
      '<span class="dv">' + (x.r.dev || "—") + '</span>' +
      '<span class="rw"><span>جودة القراءة</span><b class="' + cls + '">' + x.q.score + '/10</b></span>' +
      '<span class="rw"><span>' + (x.q.missing.length
        ? "ناقص " + x.q.missing.length + " حقل أساسي" : "محتاج مراجعة") +
      '</span><b class="sig" style="font-size:11.5px">راجع ←</b></span></a>';
  }).join("") || '<p class="empty">مفيش حاجة محتاجة قرار. كل الطابور جودته عالية.</p>';
  M.stagger(d.getElementById("todo"));

  M.markSections(); M.reveal();
})(window, document);
