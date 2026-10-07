/* مناطق · ملف المطوّر */
(function (w, d) {
  "use strict";
  var M = w.MQ, D = M.D, f0 = M.f0, pc = M.pc, L = M.LINK;

  M.buildHeader("index.html");

  var name = M.qs("dev") || "Xland Developments";
  var hit = M.developerByName(name);
  if (!hit) { hit = M.developerByName("Xland Developments"); name = "Xland Developments"; }
  var dev = hit.dev, region = hit.region;
  var projs = M.projectsOfDeveloper(name);
  var units = M.unitsOfDeveloper(name);
  var beh = M.priceBehaviour(name);
  var evOk = dev.ev.filter(function (x) { return x[1]; }).length;

  d.title = name + " · مناطق";
  d.getElementById("cReg").textContent = region;
  d.getElementById("cDev").textContent = name;
  d.getElementById("vCode").textContent = D.REGIONS[region].code + " · DEVELOPER FILE";
  d.getElementById("vName").textContent = name;
  var g = d.getElementById("vGrade");
  g.className = "grade " + (dev.grade === "أ" ? "a" : dev.grade === "ب" ? "b" : "c");
  g.textContent = "فئة " + dev.grade;
  d.getElementById("vNote").textContent = dev.note;

  d.getElementById("vChips").innerHTML =
    '<a class="chip" href="' + L.district(projs.length ? projs[0].p.dist : "") + '" style="text-decoration:none">المنطقة <b>' + region + '</b></a>' +
    '<span class="chip">آخر تحديث سعري <b class="n">' + (beh.last || "—") + '</b></span>' +
    '<span class="chip">تحديثات مسجّلة <b class="n">' + beh.moves + '</b></span>';

  var ints = function (v) { return String(Math.round(v)); };
  M.count(d.getElementById("kProj"), projs.length || dev.projects, ints, 800);
  M.count(d.getElementById("kUnits"), units.length, ints, 800);
  var avgPct = projs.length
    ? projs.reduce(function (a, x) { return a + x.p.pct; }, 0) / projs.length : 0;
  M.count(d.getElementById("kPct"), avgPct, function (v) { return Math.round(v) + "%"; }, 900);
  d.getElementById("kEv").innerHTML = '<span class="n ' + (evOk >= 5 ? "up" : evOk >= 4 ? "wrn" : "dn") + '">' +
    evOk + '</span><span class="mut" style="font-size:13px"> / ' + dev.ev.length + '</span>';

  /* الأدلة */
  var ev = d.getElementById("evList");
  ev.innerHTML = dev.ev.map(function (x) {
    return '<span class="' + (x[1] ? "y" : "n2") + '"><b>' + (x[1] ? "✓" : "✕") + '</b><span>' + x[0] +
      '<br><span class="mut" style="font-size:10.5px">' + x[2] + '</span></span></span>';
  }).join("");
  M.stagger(ev);

  /* السلوك السعري */
  var stable = beh.ups <= 1 && beh.downs === 0;
  d.getElementById("beh").innerHTML =
    "<div><span>رفعات أسعار مسجّلة</span><b class='" + (beh.ups > 2 ? "dn" : "") + "'>" + beh.ups + "</b></div>" +
    "<div><span>تخفيضات مسجّلة</span><b class='" + (beh.downs ? "up" : "mut") + "'>" + beh.downs + "</b></div>" +
    "<div><span>إجمالي التحديثات</span><b>" + beh.moves + "</b></div>" +
    "<div><span>أول تحديث مسجّل</span><b class='mut' style='font-size:11.5px'>" + (beh.first || "—") + "</b></div>" +
    "<div class='f'><span>صافي تغيّر السعر</span><b class='" + (beh.avgSpan >= 0 ? "dn" : "up") + "'>" +
      pc(beh.avgSpan) + "</b></div>";

  var read;
  if (beh.downs >= 2) {
    read = "<b>نمط تخفيض.</b> نزّل السعر " + beh.downs + " مرة في الفترة المرصودة. ده بيفتح باب تفاوض حقيقي، " +
      "وفي نفس الوقت بيقول إن البيع بطيء — اللي بيشتري دلوقتي ممكن يلاقي أرخص بعد شهر.";
  } else if (beh.ups >= 2) {
    read = "<b>نمط رفع منتظم.</b> رفع " + beh.ups + " مرة، وإجمالي الزيادة <span class='n dn'>" + pc(beh.avgSpan) +
      "</span>. اللي بيحجز بدري بيكسب الفرق، واللي بيستنى بيدفعه. ده مؤشر طلب لو العقود المسجّلة في المنطقة بتأكده.";
  } else if (stable) {
    read = "<b>سلوك سعري نظيف.</b> تحديث واحد بس في الفترة المرصودة — ده أندر حاجة في السجل عندنا. " +
      "المطوّر اللي بيرفع مرة واحدة بيبيع بالقيمة مش بالضغط.";
  } else {
    read = "<b>سلوك مستقر.</b> " + beh.moves + " تحديث مسجّل بصافي <span class='n'>" + pc(beh.avgSpan) +
      "</span> — مفيش قفزات ولا ضغط بيع واضح.";
  }
  d.getElementById("behRead").innerHTML = read +
    (beh.moves ? "" : " مفيش سجل أسعار كفاية لحد دلوقتي — بنجمّعه مع كل رسالة جديدة.");

  /* خطوط الأسعار */
  d.getElementById("curves").innerHTML = projs.length ? projs.map(function (x, i) {
    var h = x.p.hist, vals = h.map(function (q) { return q[1]; });
    var chg = vals.length > 1 ? (vals[vals.length - 1] - vals[0]) / vals[0] * 100 : 0;
    return '<div style="margin-bottom:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;font-size:12px">' +
      '<span>' + x.p.nm + '</span><b class="n ' + (chg >= 0 ? "dn" : "up") + '">' + pc(chg) + '</b></div>' +
      '<svg class="spark" id="sp' + i + '" style="height:40px" viewBox="0 0 300 40" preserveAspectRatio="none"></svg>' +
      '<p class="mut" style="font-size:10.5px">' + h[0][0] + ' ← ' + h[h.length - 1][0] + ' · ' + h.length + ' تحديث</p></div>';
  }).join("") : '<p class="note">مفيش مشاريع مرصودة بسجل أسعار.</p>';
  projs.forEach(function (x, i) {
    M.drawSpark(d.getElementById("sp" + i), x.p.hist.map(function (q) { return q[1]; }), 300, 40, 5, true);
  });

  /* المشاريع */
  d.getElementById("projs").innerHTML = projs.length ? projs.map(function (x) {
    var p = x.p;
    return '<a class="card" href="' + L.project(p.id) + '">' +
      '<span class="cd">' + p.id + ' · ' + p.stT + '</span>' +
      '<span class="nm">' + p.nm + '</span><span class="dv">' + x.region + ' · ' + p.dist + '</span>' +
      '<span class="rw"><span>الإنجاز المرصود</span><b class="sig">' + p.pct + '%</b></span>' +
      '<span class="gauge" style="margin-top:2px"><i data-w="' + p.pct + '" style="background:var(--sig)"></i></span>' +
      '<span class="rw" style="margin-top:4px"><span>' + p.visit + '</span><b class="sig" style="font-size:11.5px">←</b></span></a>';
  }).join("") : '<p class="empty">مفيش مشاريع مرصودة لهذا المطوّر دلوقتي.</p>';
  M.stagger(d.getElementById("projs"));

  /* الوحدات */
  d.getElementById("uNote").textContent = units.length
    ? units.length + " وحدة متاحة — كل واحدة متقاسة على متوسط حيّها هي، مش على متوسط المنطقة."
    : "مفيش وحدات مرصودة لهذا المطوّر في المعروض الحالي.";
  d.getElementById("uTb").innerHTML = units.length ? units
    .sort(function (a, b) { return M.vsDistrict(a) - M.vsDistrict(b); })
    .map(function (u) {
      var v = M.vsDistrict(u), wd = Math.min(46, Math.abs(v) * 1.6), vd = M.verdict(u);
      return "<tr class='link' data-u='" + u.id + "'><td><span class='cd'>" + u.id + "</span></td>" +
        "<td><b>" + u.t + "</b></td>" +
        "<td><a href='" + L.district(u.d) + "' class='lnk' style='font-size:11.5px'>" + u.d + "</a></td>" +
        "<td class='num'>" + u.a + "</td><td class='num'>" + f0(M.cost(u)) + "</td>" +
        "<td class='num sig'>" + f0(M.realPpm(u)) + "</td>" +
        "<td><span class='cmpcell'><span class='bar2'><i data-w='" + (50 + (v < 0 ? -wd : wd)) +
        "' style='background:" + (v < 0 ? "var(--up)" : "var(--down)") + "'></i></span>" +
        "<span class='n " + (v < 0 ? "up" : "dn") + "' style='font-size:11.5px'>" + pc(v) + "</span></span></td>" +
        "<td class='num'>" + u.del + "</td>" +
        "<td><span class='vd " + vd[1] + "'>" + vd[0] + "</span></td></tr>";
    }).join("")
    : "<tr><td colspan='9' class='mut' style='padding:20px;text-align:center'>مفيش وحدات مرصودة.</td></tr>";
  M.stagger(d.getElementById("uTb"));
  d.getElementById("uTb").addEventListener("click", function (e) {
    var tr = e.target.closest("[data-u]");
    if (tr && !e.target.closest("a")) w.location.href = L.unit(tr.dataset.u);
  });

  M.markSections();
  M.growBars();
  M.reveal();
})(window, document);
