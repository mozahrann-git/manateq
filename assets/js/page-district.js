/* مناطق · ملف الحي */
(function (w, d) {
  "use strict";
  var M = w.MQ, D = M.D, f0 = M.f0, pc = M.pc, L = M.LINK;

  M.buildHeader("index.html");

  var dist = M.qs("d") || "الهضبة الوسطى";
  if (!D.DISTRICT_INFO[dist]) dist = "الهضبة الوسطى";
  var info = D.DISTRICT_INFO[dist];
  var region = info.region;
  var row = M.districtRow(region, dist) || [dist, D.REGIONS[region].ppm, null, 0, 0];
  var regPpm = D.REGIONS[region].ppm;
  var vs = (row[1] - regPpm) / regPpm * 100;
  var liq = D.LIQUIDITY[dist] || [null, 0];
  var grow = D.GROWTH[dist] || 9;

  d.title = dist + " · مناطق";
  d.getElementById("cReg").textContent = region;
  d.getElementById("cRegLink").href = "index.html";
  d.getElementById("cDist").textContent = dist;
  d.getElementById("dCode").textContent = D.REGIONS[region].code + " · DISTRICT FILE";
  d.getElementById("dName").textContent = dist;
  d.getElementById("dBrief").textContent = info.brief;

  d.getElementById("dChips").innerHTML =
    '<span class="chip">المنطقة <b>' + region + '</b></span>' +
    '<span class="chip">نمو سنوي مسجّل <b class="n up">' + grow.toFixed(1) + '%</b></span>' +
    '<span class="chip">مؤشر الطلب <b class="n">' + row[3] + '</b>/100</span>' +
    (row[4] ? '<span class="est">تقديري · عيّنة صغيرة</span>' : '<span class="chip">مقيس من العقود</span>');

  M.count(d.getElementById("kPpm"), row[1], f0, 1000);
  var kv = d.getElementById("kVs");
  kv.className = "v " + (vs < 0 ? "up" : "dn");
  M.count(kv, vs, pc, 900);
  var ky = d.getElementById("kY");
  if (row[2]) { M.count(ky, row[2], function (v) { return v.toFixed(1) + "%"; }, 900); }
  else { ky.textContent = "—"; ky.className = "v mut"; }
  d.getElementById("kLiq").innerHTML = liq[0]
    ? '<span class="n">' + liq[0] + '</span> يوم <span class="mut" style="font-size:11px;font-family:var(--body)">· ' + liq[1] + ' عملية</span>'
    : "—";

  /* ليه سعره كده */
  var why = d.getElementById("why");
  why.innerHTML = info.why.map(function (x) {
    return '<span class="y"><b>▪</b><span><i class="wt">' + x[0] + '</i>' + x[1] + '</span></span>';
  }).join("");
  M.stagger(why);
  d.getElementById("watch").innerHTML = "<b>خد بالك:</b> " + info.watch;
  d.getElementById("best").textContent = info.best;

  /* الأحياء المجاورة */
  d.getElementById("sibs").innerHTML = M.siblingDistricts(region, dist).map(function (x) {
    var v = (x[1] - row[1]) / row[1] * 100;
    return "<tr class='link' data-d='" + x[0] + "'><td><b>" + x[0] + "</b>" +
      (x[4] ? " <span class='est'>تقديري</span>" : "") + "</td>" +
      "<td class='num'>" + f0(x[1]) + "</td>" +
      "<td class='num " + (v < 0 ? "up" : "dn") + "'>" + pc(v) + "</td>" +
      "<td class='num mut' style='font-size:11px'>" + (x[2] ? x[2].toFixed(1) + "%" : "—") + "</td>" +
      "<td class='sig' style='font-size:11px'>افتح ←</td></tr>";
  }).join("");
  d.getElementById("sibs").addEventListener("click", function (e) {
    var tr = e.target.closest("[data-d]");
    if (tr) w.location.href = L.district(tr.dataset.d);
  });

  /* المشاريع */
  var projs = M.projectsInDistrict(dist);
  d.getElementById("projNote").textContent = projs.length
    ? projs.length + " مشروع مرصود في الحي — اضغط على أي واحد تفتح سجل أسعاره وخطط سداده."
    : "مفيش مشاريع مطوّرين مرصودة في الحي ده دلوقتي. المعروض كله ريسيل من الملاك.";
  d.getElementById("projs").innerHTML = projs.map(function (x) {
    var p = x.p, rp = (p.base + (p.garage || 0) + p.base * p.maintPct / 100) / p.area;
    var v = (rp - row[1]) / row[1] * 100;
    return '<a class="card" href="' + L.project(p.id) + '">' +
      '<span class="cd">' + p.id + ' · ' + p.stT + ' ' + p.pct + '%</span>' +
      '<span class="nm">' + p.nm + '</span><span class="dv">' + p.dev + '</span>' +
      '<span class="rw"><span>متر حقيقي</span><b>' + f0(rp) + '</b></span>' +
      '<span class="rw"><span>مقابل الحي</span><b class="' + (v < 0 ? "up" : "dn") +
      '" style="font-size:11.5px">' + pc(v) + '</b></span></a>';
  }).join("");
  M.stagger(d.getElementById("projs"));

  /* الوحدات — ريسيل ومطوّرين منفصلين */
  var us = M.unitsInDistrict(dist);
  function cmpCell(v) {
    var wd = Math.min(46, Math.abs(v) * 1.6);
    return "<td><span class='cmpcell'><span class='bar2'><i data-w='" + (50 + (v < 0 ? -wd : wd)) +
      "' style='background:" + (v < 0 ? "var(--up)" : "var(--down)") + "'></i></span>" +
      "<span class='n " + (v < 0 ? "up" : "dn") + "' style='font-size:11.5px'>" + pc(v) + "</span></span></td>";
  }
  var res = us.filter(function (u) { return u.k === "resale"; })
    .sort(function (a, b) { return M.capRate(b) - M.capRate(a); });
  d.getElementById("resTb").innerHTML = res.length ? res.map(function (u) {
    var vd = M.verdict(u), cr = M.capRate(u);
    return "<tr class='link' data-u='" + u.id + "'><td><span class='cd'>" + u.id + "</span></td>" +
      "<td><b>" + u.t + "</b><br><span class='mut' style='font-size:11px'>" + u.src + "</span></td>" +
      "<td class='num'>" + u.a + "</td><td class='num'>" + M.val(f0(M.cost(u))) + "</td>" +
      "<td class='num sig'>" + M.val(f0(M.realPpm(u))) + "</td>" + cmpCell(M.vsDistrict(u)) +
      "<td class='num " + (cr >= 8 ? "up" : "") + "'>" + (cr ? M.val(cr.toFixed(1) + "%") : "—") + "</td>" +
      "<td><span class='vd " + vd[1] + "'>" + vd[0] + "</span></td></tr>";
  }).join("") : "<tr><td colspan='8' class='mut' style='padding:20px;text-align:center'>مفيش ريسيل متاح في الحي ده دلوقتي.</td></tr>";
  M.stagger(d.getElementById("resTb"));

  var off = us.filter(function (u) { return u.k !== "resale"; })
    .sort(function (a, b) { return M.vsDistrict(a) - M.vsDistrict(b); });
  d.getElementById("offTb").innerHTML = off.length ? off.map(function (u) {
    var vd = M.verdict(u);
    return "<tr class='link' data-u='" + u.id + "'><td><span class='cd'>" + u.id + "</span></td>" +
      "<td><b>" + u.t + "</b></td>" +
      "<td class='mut' style='font-size:11.5px'>" + (u.dev || "—") + "</td>" +
      "<td class='num'>" + u.a + "</td><td class='num'>" + M.val(f0(M.cost(u))) + "</td>" +
      "<td class='num sig'>" + M.val(f0(M.realPpm(u))) + "</td>" + cmpCell(M.vsDistrict(u)) +
      "<td class='num'>" + u.del + "</td>" +
      "<td><span class='vd " + vd[1] + "'>" + vd[0] + "</span></td></tr>";
  }).join("") : "<tr><td colspan='9' class='mut' style='padding:20px;text-align:center'>مفيش وحدات مطوّرين مرصودة في الحي ده دلوقتي.</td></tr>";
  M.stagger(d.getElementById("offTb"));

  ["resTb", "offTb"].forEach(function (id) {
    d.getElementById(id).addEventListener("click", function (e) {
      var tr = e.target.closest("[data-u]");
      if (tr) w.location.href = L.unit(tr.dataset.u);
    });
  });

  /* فرص الحي */
  var opps = us.filter(function (u) { return M.verdict(u)[0] === "فرصة"; })
    .sort(function (a, b) { return M.vsDistrict(a) - M.vsDistrict(b); });
  var oc = d.getElementById("oppCards");
  oc.innerHTML = opps.length ? opps.map(function (u) {
    var vd = M.verdict(u), cr = M.capRate(u);
    return '<a class="card" href="' + L.unit(u.id) + '" style="border-inline-start-color:var(--sig)">' +
      '<span class="cd">' + u.id + '</span><span class="nm">' + u.t + '</span>' +
      '<span class="dv">' + vd[2] + '</span>' +
      '<span class="rw"><span>' + (cr ? "العائد الصافي" : "التكلفة الحقيقية") + '</span><b class="' +
      (cr ? "up" : "") + '">' + (cr ? cr.toFixed(1) + "%" : f0(M.cost(u))) + '</b></span>' +
      '<span class="rw"><span>افتح الملف</span><b class="sig" style="font-size:11.5px">←</b></span></a>';
  }).join("") : '<p class="empty">مفيش وحدة عدّت القاعدة في ' + dist +
    ' دلوقتي. مناطق مبتعرضش فرصة من غير دليل.</p>';
  M.stagger(oc);

  /* الخريطة — الحي الحالي متعلّم */
  if (w.MQMap) {
    w.MQMap("map", {
      region: region, focus: dist,
      onDistrict: function (x) { if (x !== dist) w.location.href = L.district(x); }
    });
  }

  M.markSections();
  M.growBars();
  M.reveal();
})(window, document);
