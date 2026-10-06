/* مناطق · صفحة 02 — المشاريع */
(function (w, d) {
  "use strict";
  var M = w.MQ, D = M.D, f0 = M.f0, pc = M.pc;
  var cur = Object.keys(D.PROJECTS)[0], sel = 0;

  M.buildHeader("projects.html");

  /* لو جاي من لينك فيه ?p=CODE نفتح المشروع ده */
  (function () {
    var q = new URLSearchParams(w.location.search).get("p");
    if (!q) return;
    var hit = M.projectById(q);
    if (!hit) return;
    cur = hit.region;
    sel = D.PROJECTS[cur].map(function (x) { return x.id; }).indexOf(q);
    if (sel < 0) sel = 0;
  })();

  /* ---------- حسابات المشروع ---------- */
  function trueCost(p, price) { return price + (p.garage || 0) + price * (p.maintPct / 100); }
  function realPpm(p, price, area) { return trueCost(p, price) / area; }
  function basePpm(p) { return M.districtPpm(cur, p.dist); }
  function planCost(p, pl) {
    var after = p.base * (1 - pl[4] / 100);
    return after + (p.garage || 0) + p.base * (p.maintPct / 100);
  }
  function docsOk(p) { return p.docs.filter(function (x) { return x[1]; }).length >= 4; }
  function verdictOf(p, price, area, del) {
    var base = basePpm(p), v = (realPpm(p, price, area) - base) / base * 100;
    if (!docsOk(p)) return ["انتظر", "n"];
    if (v <= M.CONFIG.rules.oppPct) return ["فرصة", "o"];
    if (v >= M.CONFIG.rules.infPct) return ["متضخّم", "b"];
    return ["محايد", "n"];
  }

  /* ---------- المنتقيات ---------- */
  function picker() {
    d.getElementById("picker").innerHTML = Object.keys(D.PROJECTS).map(function (k) {
      return '<button class="pk" type="button" data-r="' + k + '" aria-pressed="' + (k === cur) + '">' +
        '<span class="nm">' + k + '</span><span class="mt"><span>مشاريع مرصودة</span><b>' +
        D.PROJECTS[k].length + '</b></span></button>';
    }).join("");
  }
  function plist() {
    var h = d.getElementById("plist");
    h.innerHTML = D.PROJECTS[cur].map(function (p, i) {
      var rp = realPpm(p, p.base, p.area), v = (rp - basePpm(p)) / basePpm(p) * 100;
      return '<button class="card" type="button" data-p="' + i + '" aria-pressed="' + (i === sel) + '">' +
        '<span class="cd">' + p.id + ' · ' + p.stT + '</span>' +
        '<span class="nm">' + p.nm + '</span><span class="dv">' + p.dev + ' · ' + p.dist + '</span>' +
        '<span class="rw"><span>متر حقيقي</span><b>' + f0(rp) + '</b></span>' +
        '<span class="rw"><span>مقابل الحي</span><b class="' + (v < 0 ? "up" : "dn") +
        '" style="font-size:11.5px">' + pc(v) + '</b></span></button>';
    }).join("");
    M.stagger(h);
  }
  d.getElementById("picker").addEventListener("click", function (e) {
    var b = e.target.closest("[data-r]");
    if (!b) return;
    cur = b.dataset.r; sel = 0; picker(); plist(); render();
  });
  d.getElementById("plist").addEventListener("click", function (e) {
    var b = e.target.closest("[data-p]");
    if (!b) return;
    sel = +b.dataset.p; plist(); render();
  });

  /* ---------- الرسم ---------- */
  function render() {
    var p = D.PROJECTS[cur][sel], base = basePpm(p);
    d.getElementById("cReg").textContent = cur;
    var cd = d.getElementById("cDist");
    cd.innerHTML = '<a href="' + M.LINK.district(p.dist) + '" style="color:inherit">' + p.dist + '</a>';
    d.getElementById("cProj").textContent = p.nm;
    d.getElementById("pCode").textContent = p.id + " · PROJECT FILE";
    d.getElementById("pName").textContent = p.nm;
    d.getElementById("pReview").textContent = "رأي محلل مناطق: " + p.review;
    var chips = d.getElementById("pChips");
    if (chips) {
      chips.innerHTML =
        '<a class="chip" href="' + M.LINK.developer(p.dev) + '" style="text-decoration:none">المطوّر <b class="sig">' + p.dev + '</b> ←</a>' +
        '<a class="chip" href="' + M.LINK.district(p.dist) + '" style="text-decoration:none">الحي <b class="sig">' + p.dist + '</b> ←</a>' +
        '<span class="chip">المنطقة <b>' + cur + '</b></span>';
    }
    d.getElementById("pVisit").textContent = p.visit;
    M.count(d.getElementById("pPct"), p.pct, function (v) { return Math.round(v) + "%"; }, 1000);
    var bar = d.getElementById("pBar");
    bar.style.width = "0%";
    requestAnimationFrame(function () { bar.style.width = p.pct + "%"; });

    var rp = realPpm(p, p.base, p.area), v = (rp - base) / base * 100;
    M.count(d.getElementById("kPpm"), rp, f0, 1000);
    var kv = d.getElementById("kVs");
    kv.className = "v " + (v < 0 ? "up" : "dn");
    M.count(kv, v, pc, 900);

    var h = p.hist, chg = h.length > 1 ? (h[h.length - 1][1] - h[0][1]) / h[0][1] * 100 : 0;
    var kc = d.getElementById("kChg");
    kc.className = "v " + (chg < 0 ? "up" : "dn");
    M.count(kc, chg, pc, 900);

    var insts = p.plans.filter(function (x) { return x[5] === "inst"; });
    var minD = insts.length ? Math.min.apply(null, insts.map(function (x) { return x[1]; })) : 100;
    var maxM = Math.max.apply(null, p.plans.map(function (x) { return x[2]; }));
    M.count(d.getElementById("kDown"), minD, function (x) { return Math.round(x) + "%"; }, 800);
    d.getElementById("kYears").textContent = (maxM / 12).toFixed(0) + " سنين";
    d.getElementById("kDel").textContent = p.del;
    d.getElementById("kSrc").innerHTML = "متوسط متر <b>" + p.dist + "</b> = <span class='n'>" + f0(base) +
      "</span> ج.م/م². سعر المتر هنا محسوب على التكلفة الكاملة، وآخر تحديث من " + h[h.length - 1][0] + ".";

    /* سجل الأسعار */
    M.drawSpark(d.getElementById("spk"), h.map(function (x) { return x[1]; }), 300, 92, 10, true);
    d.getElementById("histNote").innerHTML = h.length + " تحديث مسجّل من <b>" + h[0][0] +
      "</b> لحد <b>" + h[h.length - 1][0] + "</b> · إجمالي التغيّر <span class='n " +
      (chg < 0 ? "up" : "dn") + "'>" + pc(chg) + "</span>";

    var tl = d.getElementById("tl");
    tl.innerHTML = h.slice().reverse().map(function (e, i, arr) {
      var prev = arr[i + 1], dl = "";
      if (prev) {
        var dv = (e[1] - prev[1]) / prev[1] * 100;
        dl = "<span class='dl " + (dv > 0 ? "u" : "d") + "'>" + pc(dv) + "</span>";
      }
      return "<div class='tli" + (i === 0 ? " hot" : "") + "'><span class='dt'>" + e[0] + "</span>" +
        "<span class='ax'></span><span class='bd'><span class='pv n'>" + f0(e[1]) + "</span>" + dl +
        "<br>" + e[2] + "<span class='sr'>" + e[3] + "</span></span></div>";
    }).join("");
    M.stagger(tl);

    /* خطط السداد */
    var costs = p.plans.map(function (x) { return planCost(p, x) / p.area; });
    var cheapest = Math.min.apply(null, costs);
    d.getElementById("planTb").innerHTML = p.plans.map(function (pl, i) {
      var c = planCost(p, pl), ppm = c / p.area;
      var inst = pl[5] === "cash" ? 0 : (p.base * (1 - pl[4] / 100) * (1 - pl[1] / 100)) / pl[2];
      return "<tr><td><b>" + pl[0] + "</b>" + (costs[i] === cheapest ? "<span class='best'>أقل تكلفة</span>" : "") + "</td>" +
        "<td class='num'>" + pl[1] + "%</td>" +
        "<td class='num'>" + (pl[2] ? pl[2] + " شهر" : "—") + "</td>" +
        "<td class='num'>" + (inst ? f0(inst) : "—") + "</td>" +
        "<td class='num " + (pl[4] ? "up" : "") + "'>" + (pl[4] ? pl[4] + "%" : "—") + "</td>" +
        "<td class='num'>" + f0(c) + "</td>" +
        "<td class='num sig'>" + f0(ppm) + "</td></tr>";
    }).join("");
    M.stagger(d.getElementById("planTb"));

    /* الوحدات */
    d.getElementById("uNote").innerHTML = "كل وحدة متقاسة على متوسط <b>" + p.dist +
      "</b> لوحده — مش على متوسط " + cur + " كلها. المقارنة بالحي هي اللي بتدي معنى، والمقارنة بالمنطقة بتخبّي.";
    var us = p.units.slice().sort(function (a, b) {
      return realPpm(p, a[2], a[1]) - realPpm(p, b[2], b[1]);
    });
    d.getElementById("uTb").innerHTML = us.map(function (u) {
      var r = realPpm(p, u[2], u[1]), uv = (r - base) / base * 100,
          wd = Math.min(46, Math.abs(uv) * 1.6), vd = verdictOf(p, u[2], u[1], u[3]);
      return "<tr><td><b>" + u[0] + "</b></td><td class='num'>" + u[1] + "</td>" +
        "<td class='num'>" + f0(u[2]) + "</td><td class='num'>" + f0(trueCost(p, u[2])) + "</td>" +
        "<td class='num sig'>" + f0(r) + "</td>" +
        "<td><span class='cmpcell'><span class='bar2'><i data-w='" + (50 + (uv < 0 ? -wd : wd)) +
        "' style='background:" + (uv < 0 ? "var(--up)" : "var(--down)") + "'></i></span>" +
        "<span class='n " + (uv < 0 ? "up" : "dn") + "' style='font-size:11.5px'>" + pc(uv) + "</span></span></td>" +
        "<td class='num'>" + u[3] + "</td><td><span class='vd " + vd[1] + "'>" + vd[0] + "</span></td></tr>";
    }).join("");
    M.stagger(d.getElementById("uTb"));

    /* الرسالة الخام */
    d.getElementById("msgMeta").innerHTML = p.msg.from + " · <span class='n'>" + p.msg.at + "</span>";
    d.getElementById("raw").textContent = p.msg.raw;
    d.getElementById("ext").innerHTML = p.msg.ext.map(function (e) {
      return "<div><span>" + e[0] + "</span><b>" + e[1] + "</b></div>";
    }).join("");
    d.getElementById("flag").innerHTML = p.msg.flag;

    /* الأدلة */
    var dv = d.getElementById("docs");
    dv.innerHTML = p.docs.map(function (e) {
      return '<span class="' + (e[1] ? "y" : "n2") + '"><b>' + (e[1] ? "✓" : "✕") + '</b><span>' + e[0] +
        ' <span class="mut" style="font-size:10.5px">· ' + e[2] + '</span></span></span>';
    }).join("");
    M.stagger(dv);
    d.getElementById("analyst").textContent = p.analyst;

    M.growBars();
    M.swap(d.getElementById("pName"));
    M.swap(d.getElementById("pReview"));
    M.reveal();
  }

  M.markSections();
  picker(); plist(); render(); M.reveal();
})(window, document);
