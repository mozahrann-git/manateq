/* مناطق · صفحة 01 — المناطق (الرئيسية) */
(function (w, d) {
  "use strict";
  var M = w.MQ, D = M.D, f0 = M.f0, pc = M.pc;
  var cur = Object.keys(D.REGIONS)[0];

  M.buildHeader("index.html");

  /* ---------- عدّادات الدعوى ---------- */
  var CST = [[50, "جروب مطوّر مرصود كل يوم"], [187, "رسالة اتقرت النهاردة"],
             [41, "حدث اتسجّل بعد التحقق"], [4, "مناطق تحت الرصد"]];
  var cst = d.getElementById("cst");
  cst.innerHTML = CST.map(function (x) {
    return '<div><p class="v">0</p><p class="l">' + x[1] + '</p></div>';
  }).join("");
  M.stagger(cst);
  cst.querySelectorAll(".v").forEach(function (el, i) {
    M.count(el, CST[i][0], function (x) { return String(Math.round(x)); }, 1000 + i * 110);
  });

  /* ---------- منتقي المناطق ---------- */
  function picker() {
    d.getElementById("picker").innerHTML = Object.keys(D.REGIONS).map(function (k) {
      var z = D.REGIONS[k];
      return '<button class="pk" type="button" data-r="' + k + '" aria-pressed="' + (k === cur) + '">' +
        '<span class="nm">' + k + '</span><span class="pp">' + f0(z.ppm) + '</span>' +
        '<span class="mt"><span>ج.م/م²</span><span class="' + (z.g30 >= 0 ? "up" : "dn") + '">' +
        pc(z.g30) + ' · 30ي</span></span></button>';
    }).join("");
  }
  d.getElementById("picker").addEventListener("click", function (e) {
    var b = e.target.closest("[data-r]");
    if (!b) return;
    cur = b.dataset.r; picker(); render();
  });

  /* ---------- رسم المنطقة ---------- */
  function render() {
    var z = D.REGIONS[cur];
    d.getElementById("rCode").textContent = z.code + " · REGION FILE";
    d.getElementById("rName").textContent = cur;
    d.getElementById("rReview").textContent = "رأي محلل مناطق: " + z.review;
    M.count(d.getElementById("kPpm"), z.ppm, f0, 1000);
    M.count(d.getElementById("kY"), z.yld, function (v) { return v.toFixed(1) + "%"; }, 900);
    M.count(d.getElementById("kLiq"), z.saleDays, function (v) { return Math.round(v) + " يوم"; }, 900);
    var act = d.getElementById("kAct");
    act.className = "v " + (z.d7 >= 0 ? "up" : "dn");
    M.count(act, z.d7, pc, 900);
    var ints = function (v) { return String(Math.round(v)); };
    M.count(d.getElementById("kC"), z.contracts, ints, 800);
    M.count(d.getElementById("kD"), z.demand, function (v) { return Math.round(v) + "/100"; }, 800);
    M.count(d.getElementById("kR"), z.resale, ints, 800);
    M.count(d.getElementById("kO"), z.off, ints, 800);
    M.drawSpark(d.getElementById("spk"), z.spark, 300, 44, 5, false);

    /* الأحياء */
    d.getElementById("dTb").innerHTML = z.districts.map(function (x) {
      var v = (x[1] - z.ppm) / z.ppm * 100, wd = Math.min(46, Math.abs(v) * 1.6);
      return "<tr><td><b>" + x[0] + "</b></td><td class='num'>" + f0(x[1]) + "</td>" +
        "<td><span class='cmpcell'><span class='bar2'><i data-w='" + (50 + (v < 0 ? -wd : wd)) +
        "' style='background:" + (v < 0 ? "var(--up)" : "var(--down)") + "'></i></span>" +
        "<span class='n " + (v < 0 ? "up" : "dn") + "' style='font-size:11.5px'>" + pc(v) + "</span></span></td>" +
        "<td class='num " + (x[2] && x[2] >= 8 ? "up" : "") + "'>" + (x[2] ? x[2].toFixed(1) + "%" : "—") + "</td>" +
        "<td class='num'>" + x[3] + "/100</td>" +
        "<td>" + (x[4] ? "<span class='est'>تقديري · عيّنة صغيرة</span>"
                       : "<span class='mut' style='font-size:11.5px'>مقيس من العقود</span>") + "</td></tr>";
    }).join("");
    M.stagger(d.getElementById("dTb"));

    /* المطوّرون */
    d.getElementById("devs").innerHTML = (D.DEVS[cur] || []).map(function (x) {
      var ok = x.ev.filter(function (e) { return e[1]; }).length;
      return '<article class="dev"><div class="t"><div><p class="nm">' + x.nm + '</p>' +
        '<p class="sub">' + x.projects + ' مشاريع في ' + cur + ' · ' + ok + ' من ' + x.ev.length + ' أدلة موثّقة</p></div>' +
        '<span class="grade ' + (x.grade === "أ" ? "a" : x.grade === "ب" ? "b" : "c") + '">فئة ' + x.grade + '</span></div>' +
        '<div class="ev">' + x.ev.map(function (e) {
          return '<span class="' + (e[1] ? "y" : "n2") + '"><b>' + (e[1] ? "✓" : "✕") + '</b><span>' + e[0] +
            ' <span class="mut" style="font-size:10.5px">· ' + e[2] + '</span></span></span>';
        }).join("") + '</div>' +
        '<p class="devfoot"><span>' + x.note + '</span></p></article>';
    }).join("");
    M.stagger(d.getElementById("devs"));

    /* المعروض */
    var us = M.rankByValue(M.unitsOf(cur));
    var nRes = us.filter(function (u) { return u.k === "resale"; }).length;
    d.getElementById("uNote").textContent =
      "ريسيل من ملاك مباشرين (" + nRes + ") ووحدات مطوّرين (" + (us.length - nRes) +
      ") في مكان واحد — مرتّبة بسعر المتر الحقيقي مقابل متوسط الحي نفسه، مش متوسط المنطقة كلها.";
    d.getElementById("uTb").innerHTML = us.map(function (u) {
      var v = M.vsDistrict(u), wd = Math.min(46, Math.abs(v) * 1.6),
          y = M.capRate(u), vd = M.verdict(u);
      return "<tr class='link' data-u='" + u.id + "'><td><span class='cd'>" + u.id + "</span></td>" +
        "<td><b>" + u.t + "</b><br><span class='mut' style='font-size:11px'>" + u.d + "</span></td>" +
        "<td class='mut' style='font-size:11.5px'>" + u.src + (u.dev ? " · " + u.dev : "") + "</td>" +
        "<td class='num'>" + u.a + "</td><td class='num'>" + f0(M.cost(u)) + "</td>" +
        "<td class='num sig'>" + f0(M.realPpm(u)) + "</td>" +
        "<td><span class='cmpcell'><span class='bar2'><i data-w='" + (50 + (v < 0 ? -wd : wd)) +
        "' style='background:" + (v < 0 ? "var(--up)" : "var(--down)") + "'></i></span>" +
        "<span class='n " + (v < 0 ? "up" : "dn") + "' style='font-size:11.5px'>" + pc(v) + "</span></span></td>" +
        "<td class='num " + (y >= 8 ? "up" : "") + "'>" +
        (y ? y.toFixed(1) + "%" : "<span class='mut' style='font-family:var(--body)'>بعد التسليم</span>") + "</td>" +
        "<td class='num'>" + u.del + "</td>" +
        "<td><span class='vd " + vd[1] + "'>" + vd[0] + "</span></td></tr>";
    }).join("");
    M.stagger(d.getElementById("uTb"));

    /* النبض */
    var pulse = D.EVENTS.filter(function (e) { return e.r === cur; }).slice(0, 4);
    d.getElementById("pulse").innerHTML = pulse.length ? pulse.map(function (e) {
      return "<div class='evrow'><span class='t'>" + e.t + "</span><span>" + e.inv + "</span></div>";
    }).join("") : "<p class='note'>مفيش أحداث مسجّلة في " + cur + " خلال آخر 24 ساعة.</p>";
    M.stagger(d.getElementById("pulse"));

    /* الفرص */
    d.getElementById("oppReg").textContent = cur;
    var opps = M.opportunities(cur).slice(0, 3);
    d.getElementById("opps").innerHTML = opps.length ? opps.map(function (u) {
      var vd = M.verdict(u), y = M.capRate(u), base = M.districtPpm(u.r, u.d);
      return '<div class="opp"><div class="h"><span class="nm">' + u.t +
        ' <span class="mut" style="font-size:11px">· ' + u.id + '</span></span>' +
        '<span class="vd o">' + vd[0] + '</span></div>' +
        '<p class="why">' + vd[2] + ' متوسط ' + u.d + ' <span class="n">' + f0(base) + '</span> ج.م/م².' +
        (u.src === "مالك مباشر" ? " مالك مباشر وأوراق كاملة." : "") + '</p>' +
        '<div class="fig"><span>التكلفة الحقيقية<b>' + f0(M.cost(u)) + '</b></span>' +
        '<span>سعر المتر<b>' + f0(M.realPpm(u)) + '</b></span>' +
        (y ? '<span>العائد الصافي<b class="up">' + y.toFixed(1) + '%</b></span>'
           : '<span>التسليم<b>' + u.del + '</b></span>') +
        '<span>السيولة<b>' + D.REGIONS[cur].saleDays + ' يوم</b></span></div></div>';
    }).join("") : '<p class="note">مفيش وحدة عدّت القاعدة في ' + cur +
      ' دلوقتي. مناطق مبتعرضش فرصة من غير دليل — والقايمة بتتحدّث مع كل تحديث جديد.</p>';
    M.stagger(d.getElementById("opps"));

    M.growBars();
    M.swap(d.getElementById("rName"));
    M.swap(d.getElementById("rReview"));
    M.reveal();
  }

  /* فتح ملف الوحدة من الجدول */
  d.getElementById("uTb").addEventListener("click", function (e) {
    var tr = e.target.closest("[data-u]");
    if (tr) w.location.href = "units.html?u=" + encodeURIComponent(tr.dataset.u);
  });

  /* ---------- البرهان ---------- */
  M.renderProof("reads");

  /* ---------- تسجيل الطلب ---------- */
  var qReg = "الكل", qNeed = "عائد", qDel = "أي", qBud = 3500000, qArea = 110, saved = false;
  d.getElementById("qReg").innerHTML = ["الكل"].concat(Object.keys(D.REGIONS)).map(function (r, i) {
    return '<button type="button" data-v="' + r + '" aria-pressed="' + (i === 0) + '">' + r + '</button>';
  }).join("");
  function bindSeg(id, set) {
    d.getElementById(id).addEventListener("click", function (e) {
      var b = e.target.closest("[data-v]");
      if (!b) return;
      set(b.dataset.v);
      this.querySelectorAll("button").forEach(function (x) {
        x.setAttribute("aria-pressed", x === b ? "true" : "false");
      });
      matchQ();
    });
  }
  bindSeg("qReg", function (v) { qReg = v; });
  bindSeg("qNeed", function (v) { qNeed = v; });
  bindSeg("qDel", function (v) { qDel = v; });
  d.getElementById("qBud").addEventListener("input", function () {
    qBud = +this.value; d.getElementById("qBudV").textContent = f0(qBud); matchQ();
  });
  d.getElementById("qArea").addEventListener("input", function () {
    qArea = +this.value; d.getElementById("qAreaV").textContent = qArea; matchQ();
  });

  function matchQ() {
    var hits = M.unitsOf(qReg).filter(function (u) {
      if (M.cost(u) > qBud * 1.03) return false;
      if (u.a < qArea) return false;
      if (qDel === "فوري" && u.del !== "فوري") return false;
      if (qNeed === "عائد" && M.capRate(u) < 6) return false;
      return true;
    }).sort(function (a, b) {
      return qNeed === "عائد" ? M.capRate(b) - M.capRate(a) : M.vsDistrict(a) - M.vsDistrict(b);
    });

    M.count(d.getElementById("hitN"), hits.length, function (x) { return String(Math.round(x)); }, 420);
    d.getElementById("hitCap").innerHTML = hits.length
      ? "وحدة من <b>" + D.UNITS.length + "</b> مرصودة بتطابق طلبك دلوقتي" +
        (qNeed === "عائد" ? " بعائد صافي 6% فما فوق" : "") +
        ". لو سجّلت، أي رسالة جديدة بتتقارن بالطلب ده آلياً."
      : "مفيش وحدة مطابقة دلوقتي — وده مش مشكلة. الطلب بيفضل شغال، وأول ما تنزل وحدة بالمواصفات دي هتوصلك قبل ما تتنشر.";

    var h = d.getElementById("hits");
    h.innerHTML = hits.slice(0, 4).map(function (u) {
      var cr = M.capRate(u);
      return '<div class="hit"><div><p class="nm">' + u.t + '</p>' +
        '<p class="sb">' + u.r + ' · ' + u.d + ' · ' + u.a + ' م² · ' + u.del + '</p></div>' +
        '<p class="pp ' + (cr >= 8 ? "up" : "sig") + '">' + (cr ? cr.toFixed(1) + "%" : f0(M.realPpm(u))) +
        '<u>' + (cr ? "عائد صافي" : "متر حقيقي") + '</u></p></div>';
    }).join("");
    M.stagger(h);

    if (saved) {
      saved = false;
      d.getElementById("saveBtn").textContent = "احفظ الطلب · وابلّغني أول ما تنزل وحدة مطابقة";
    }
  }
  d.getElementById("saveBtn").addEventListener("click", function () {
    saved = true;
    this.textContent = "✓ اتسجّل في حوض الطلبات";
    d.getElementById("saveNote").innerHTML =
      "<b>طلبك اتسجّل.</b> من دلوقتي كل رسالة بتوصل من الـ50 جروب بتتقارن بالمواصفات دي آلياً، " +
      "ولو طلعت مطابقة هتوصلك قبل ما تتنشر على المنصة. في النسخة المربوطة بقاعدة البيانات هنطلب رقم واتساب في الخطوة دي بس.";
  });
  d.getElementById("qBudV").textContent = f0(qBud);
  d.getElementById("qAreaV").textContent = qArea;

  /* ---------- تشغيل ---------- */
  M.markSections();
  picker(); render(); matchQ(); M.reveal();
})(window, document);
