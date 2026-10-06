/* مناطق · خريطة العمليات */
(function (w, d) {
  "use strict";
  var M = w.MQ, P = w.MQParse, A = w.MQ_ADMIN, D = M.D, f0 = M.f0, pc = M.pc;
  M.buildAdminHeader("admin-map.html");

  var cur = Object.keys(D.REGIONS)[0];
  var profiles = {};
  A.REPS.forEach(function (r) { profiles[r.id] = r.profile || { rules: {}, seen: 0 }; });

  /* شريط فوق */
  function line() {
    var us = M.unitsOf(cur);
    var opp = us.filter(function (u) { return M.verdict(u)[0] === "فرصة"; }).length;
    var inf = us.filter(function (u) { return M.verdict(u)[0] === "متضخّم"; }).length;
    var reps = A.REPS.filter(function (r) { return r.reg === cur; });
    [["المنطقة", cur, "mono"], ["وحدات على الخريطة", us.length, "sig"],
     ["فرص", opp, "up"], ["متضخّمة", inf, "dn"],
     ["جروبات المنطقة", reps.length, "sig"],
     ["أحياء مرسومة", D.REGIONS[cur].districts.filter(function (x) { return D.DISTRICT_GEO[x[0]]; }).length, "mut"]]
    .forEach(function (x, i, arr) {
      if (i === 0) d.getElementById("mline").innerHTML = "";
      d.getElementById("mline").innerHTML += '<div class="ops1"><p class="l">' + x[0] + '</p>' +
        '<p class="v ' + x[2] + '">' + x[1] + '</p></div>';
    });
  }

  /* منتقي المنطقة */
  d.getElementById("segReg").innerHTML = Object.keys(D.REGIONS).map(function (r, i) {
    return '<button type="button" data-r="' + r + '" aria-pressed="' + (i === 0) + '">' + r + '</button>';
  }).join("");
  d.getElementById("segReg").addEventListener("click", function (e) {
    var b = e.target.closest("[data-r]");
    if (!b) return;
    cur = b.dataset.r;
    this.querySelectorAll("button").forEach(function (x) {
      x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    d.getElementById("mReg").textContent = cur;
    if (mqmap) mqmap.setRegion(cur);
    line(); list();
  });

  var mqmap = w.MQMap ? w.MQMap("map", {
    region: cur,
    onDistrict: function (dist) { w.location.href = M.LINK.district(dist); }
  }) : null;

  /* القائمة الجانبية */
  function list() {
    var us = M.rankByValue(M.unitsOf(cur));
    d.getElementById("mlist").innerHTML = us.map(function (u, i) {
      var vd = M.verdict(u), v = M.vsDistrict(u);
      var col = vd[0] === "فرصة" ? "up" : vd[0] === "متضخّم" ? "dn" : "wrn";
      return '<a class="mrow" href="' + M.LINK.unit(u.id) + '" style="--i:' + i + '">' +
        '<span class="dot ' + col + '"></span>' +
        '<span class="mt2"><b>' + u.t + '</b><i>' + u.d + ' · ' + u.a + ' م²</i></span>' +
        '<span class="mv"><b class="n">' + f0(M.realPpm(u)) + '</b>' +
        '<i class="n ' + (v < 0 ? "up" : "dn") + '">' + pc(v) + '</i></span></a>';
    }).join("");
    M.stagger(d.getElementById("mlist"));
  }

  /* تغطية الفريق */
  d.getElementById("covTb").innerHTML = Object.keys(D.REGIONS).map(function (k) {
    var reps = A.REPS.filter(function (r) { return r.reg === k; });
    var mature = reps.filter(function (r) { return P.maturity(profiles[r.id]).auto; }).length;
    var ds = D.REGIONS[k].districts;
    var drawn = ds.filter(function (x) { return D.DISTRICT_GEO[x[0]]; }).length;
    var us = M.unitsOf(k).length;
    var covered = {};
    M.unitsOf(k).forEach(function (u) { covered[u.d] = 1; });
    var cov = Math.round(Object.keys(covered).length / ds.length * 100);
    return "<tr class='link' data-r='" + k + "'><td><b>" + k + "</b></td>" +
      "<td class='num'>" + reps.length + "</td><td class='num'>" + us + "</td>" +
      "<td class='num'>" + Object.keys(covered).length + " / " + ds.length + "</td>" +
      "<td class='num " + (mature ? "up" : "wrn") + "'>" + mature + " / " + reps.length + "</td>" +
      "<td><span class='cmpcell'><span class='bar2'><i data-w='" + Math.round(cov * 0.46) +
        "' style='background:var(--" + (cov >= 60 ? "up" : cov >= 35 ? "warn" : "down") + ")'></i></span>" +
      "<span class='n'>" + cov + "%</span></span></td></tr>";
  }).join("");
  d.getElementById("covTb").addEventListener("click", function (e) {
    var tr = e.target.closest("[data-r]");
    if (!tr) return;
    cur = tr.dataset.r;
    d.getElementById("segReg").querySelectorAll("button").forEach(function (x) {
      x.setAttribute("aria-pressed", x.dataset.r === cur ? "true" : "false"); });
    d.getElementById("mReg").textContent = cur;
    if (mqmap) mqmap.setRegion(cur);
    line(); list();
    d.querySelector(".opsmap").scrollIntoView({ block: "center" });
  });

  d.getElementById("mReg").textContent = cur;
  line(); list(); M.growBars(); M.markSections(); M.reveal();
})(window, document);
