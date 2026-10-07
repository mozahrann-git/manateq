/* مناطق · صفحة 03 — الوحدات */
(function (w, d) {
  "use strict";
  var M = w.MQ, D = M.D, C = M.CONFIG, f0 = M.f0, pc = M.pc;
  var cur = Object.keys(D.REGIONS)[0], sel = 0;

  M.buildHeader("units.html");

  /* لو جاي من المنتقي المنبثق بـ ?r=منطقة */
  (function () {
    var r = M.qs("r");
    if (r && D.REGIONS[r]) cur = r;
  })();

  /* لو جاي من لينك فيه ?u=CODE */
  (function () {
    var q = new URLSearchParams(w.location.search).get("u");
    if (!q) return;
    var u = M.unitById(q);
    if (!u) return;
    cur = u.r;
    sel = M.unitsOf(cur).map(function (x) { return x.id; }).indexOf(q);
    if (sel < 0) sel = 0;
  })();

  function picker() {
    d.getElementById("picker").innerHTML = Object.keys(D.REGIONS).map(function (k) {
      return '<button class="pk" type="button" data-r="' + k + '" aria-pressed="' + (k === cur) + '">' +
        '<span class="nm">' + k + '</span><span class="mt"><span>وحدات مرصودة</span><b>' +
        M.unitsOf(k).length + '</b></span></button>';
    }).join("");
  }
  function ulist() {
    var h = d.getElementById("ulist");
    h.innerHTML = M.unitsOf(cur).map(function (u, i) {
      var v = M.vsDistrict(u);
      return '<button class="card" type="button" data-u="' + i + '" aria-pressed="' + (i === sel) + '">' +
        '<span class="cd">' + u.id + '</span><span class="nm">' + u.t + '</span>' +
        '<span class="dv">' + u.d + '</span>' +
        '<span class="rw"><span>متر حقيقي</span><b>' + f0(M.realPpm(u)) + '</b></span>' +
        '<span class="rw"><span>مقابل الحي</span><b class="' + (v < 0 ? "up" : "dn") +
        '" style="font-size:11.5px">' + pc(v) + '</b></span></button>';
    }).join("");
    M.stagger(h);
  }
  function goTo(el) {
    if (!el) return;
    try { el.scrollIntoView({ behavior: M.RM ? "auto" : "smooth", block: "start" }); }
    catch (e) { el.scrollIntoView(); }
  }
  d.getElementById("picker").addEventListener("click", function (e) {
    var b = e.target.closest("[data-r]");
    if (!b) return;
    cur = b.dataset.r; sel = 0; picker(); ulist(); render();
    /* اخترت منطقة ← انزل على وحداتها */
    goTo(d.getElementById("ulist"));
  });
  d.getElementById("ulist").addEventListener("click", function (e) {
    var b = e.target.closest("[data-u]");
    if (!b) return;
    sel = +b.dataset.u; ulist(); render();
    /* اخترت وحدة ← ارجع لتفاصيلها فوق */
    goTo(d.querySelector(".crumb"));
  });

  function render() {
    var u = M.unitsOf(cur)[sel];
    var base = M.districtPpm(u.r, u.d), c = M.cost(u), r = M.realPpm(u),
        v = M.vsDistrict(u), vd = M.verdict(u), rk = M.riskGrade(u), L = M.liquidity(u);

    d.getElementById("cReg").textContent = cur;
    d.getElementById("cDist").innerHTML =
      '<a href="' + M.LINK.district(u.d) + '" style="color:inherit">' + u.d + '</a>';
    d.getElementById("cU").textContent = u.id;
    d.getElementById("uCode").textContent = u.id + " · UNIT FILE";
    d.getElementById("uName").textContent = u.t;
    var vdE = d.getElementById("uVd");
    vdE.className = "vd " + vd[1];
    vdE.textContent = vd[0];
    d.getElementById("uWhy").textContent = vd[2];
    d.getElementById("uChips").innerHTML =
      (u.dev ? '<a class="chip" href="' + M.LINK.developer(u.dev) + '" style="text-decoration:none">المطوّر <b class="sig">' + u.dev + '</b> ←</a>'
             : '<span class="chip">المصدر <b>' + u.src + '</b></span>') +
      '<a class="chip" href="' + M.LINK.district(u.d) + '" style="text-decoration:none">الحي <b class="sig">' + u.d + '</b> ←</a>' +
      '<span class="chip">المساحة <b class="n">' + u.a + '</b> م²</span>' +
      '<span class="chip">التسليم <b>' + u.del + '</b></span>' +
      '<span class="chip">درجة المخاطرة <b class="' + rk[1] + '">فئة ' + rk[0] + '</b></span>' +
      (u.proj ? '<a class="chip lnk" href="projects.html?p=' + u.proj + '" style="border-bottom:0">افتح ملف المشروع ←</a>' : '');

    /* الصور */
    var g = d.getElementById("gal");
    g.innerHTML = [0, 1, 2].map(function () {
      return '<div>' + (u.locked
        ? '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#94A0AF" stroke-width="1.6"><rect x="4" y="11" width="16" height="9"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'
        : '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6B7684" stroke-width="1.6"><rect x="3" y="5" width="18" height="14"/><path d="M3 16l5-5 4 4 3-3 6 6"/></svg>') + '</div>';
    }).join("");
    M.stagger(g);
    d.getElementById("lockNote").textContent = u.locked
      ? "🔒 الصور مشفّرة بطلب المالك. " + u.lockWhy + " بتتفتح للعميل المؤهَّل بعد تأكيد المعاينة."
      : "الصور متاحة بعد التسجيل. مناطق بتوثّق كل عرض ومعاينة قبل ما الصور تتفتح.";

    /* الوحدة المحسوبة */
    var k = M.known(u);
    var rows = [
      ["السعر المعلن", u.p, true],
      ["وديعة الصيانة" + (u.maint ? " " + u.maint + "%" : ""), k.maint ? M.maintOf(u) : null, k.maint],
      ["الجراج", k.garage ? u.garage : null, k.garage],
      ["اشتراك النادي", k.club ? u.club : null, k.club]
    ];
    d.getElementById("calc").innerHTML = rows.map(function (x) {
      return x[2]
        ? "<div class='cr'><span>" + x[0] + "</span><b>" + (x[1] ? M.val(f0(x[1])) : "غير مطلوبة") + "</b></div>"
        : "<div class='cr miss'><span>" + x[0] + "</span><b>غير محددة من المطور</b></div>";
    }).join("") +
      "<div class='cr tot'><span>التكلفة الحقيقية</span><b>" + M.val(f0(c)) + "</b></div>" +
      "<div class='cr tot'><span>سعر المتر الحقيقي</span><b>" + M.val(f0(r)) + "</b></div>";
    M.stagger(d.getElementById("calc"));

    var unk = M.unknownCount(u), naive = M.listedPpm(u);
    var gapEl = d.getElementById("gapNote");
    if (!unk && Math.abs(r - naive) < 1) {
      gapEl.innerHTML = "<b>مفيش بنود مخفية.</b> السعر المعلن هو التكلفة الحقيقية — مفيش وديعة صيانة ولا جراج " +
        "ولا اشتراك نادي. ده اللي بيميّز الريسيل من المالك مباشرة عن وحدات المطوّرين.";
      gapEl.style.borderColor = "var(--up)";
      gapEl.style.background = "rgba(58,212,131,.06)";
      gapEl.querySelector("b").style.color = "var(--up)";
    } else {
    gapEl.innerHTML = unk
      ? "<b>" + unk + " بند لسه غير محدد.</b> يعني التكلفة اللي قدامك هي الحد الأدنى — مش الرقم النهائي. مناطق بتسجّل ده كـ«ناقص» وبتطلبه من المطور بدل ما تحطّ رقم من دماغها."
      : "<b>الفرق اللي السوق بيخبّيه:</b> اللي بيحسب السعر المعلن ÷ المساحة بيطلع معاه <span class='n'>" +
        f0(naive) + "</span> ج.م/م². الرقم الحقيقي <span class='n sig'>" + f0(r) + "</span> — فرق <span class='n'>" +
        pc((r - naive) / naive * 100) + "</span> قبل ما تقارن بأي وحدة تانية.";
      gapEl.style.borderColor = "var(--warn)";
      gapEl.style.background = "rgba(242,178,51,.06)";
    }

    /* الأركان الخمسة */
    var cr = M.capRate(u), nDocs = u.docs.filter(function (x) { return x[1]; }).length;
    var pil = [
      ["ENTRY PRICE", "سعر الدخول", M.val(f0(r)), v < 0 ? "up" : "dn", Math.min(100, 50 - v * 2),
        "متوسط " + u.d + " = " + f0(base) + " ج.م/م². الفرق " + pc(v) + " محسوب على التكلفة الحقيقية مش السعر المعلن."],
      ["CAP RATE", "العائد الصافي", cr ? M.val(cr.toFixed(1) + "%") : "—", cr >= 8 ? "up" : cr ? "wrn" : "mut",
        cr ? Math.min(100, cr * 8) : 0,
        cr ? "الإيجار " + f0(u.rent) + " شهرياً، ناقص 10% إدارة وشواغر، على التكلفة الحقيقية."
           : "مفيش إيجار قبل التسليم — العائد يتحسب بعد " + u.del + "، ومناطق مبتفترضوش."],
      ["LIQUIDITY HORIZON", "أفق السيولة", L[0] ? L[0] + " يوم" : "—",
        L[0] && L[0] <= 40 ? "up" : "wrn", L[0] ? Math.max(8, 100 - L[0]) : 0,
        L[1] ? "متوسط أيام البيع في " + u.d + " من " + L[1] + " عملية مسجّلة عند مناطق" +
               (L[1] < 5 ? " — عيّنة صغيرة، خدها كمؤشر." : ".") : "مفيش عمليات كفاية."],
      ["RISK GRADE", "درجة المخاطرة", "فئة " + rk[0], rk[1], rk[2],
        nDocs + " من " + u.docs.length + " أدلة موثّقة" +
        (unk ? " · " + unk + " بند تكلفة غير محدد" : " · كل بنود التكلفة محددة")],
      ["TOTAL COST", "التكلفة الكلية 5 سنين", M.val(f0(c + (u.k === "resale" ? c * 0.01 * 5 : 0))), "mut", 62,
        u.k === "resale" ? "التكلفة + 1% سنوياً صيانة وضرايب عقارية تقديرية على 5 سنين."
                         : "بعد التسليم بتضاف صيانة سنوية — مش محسوبة قبل الاستلام."]
    ];
    d.getElementById("pil").innerHTML = pil.map(function (x) {
      var col = x[3] === "up" ? "up" : x[3] === "dn" ? "down" : x[3] === "wrn" ? "warn" : "line2";
      return '<article class="pi"><span class="en">' + x[0] + '</span><span class="ar">' + x[1] + '</span>' +
        '<span class="v ' + x[3] + '">' + x[2] + '</span>' +
        '<span class="gauge"><i data-w="' + Math.max(0, Math.min(100, x[4])).toFixed(0) +
        '" style="background:var(--' + col + ')"></i></span>' +
        '<span class="ex">' + x[5] + '</span></article>';
    }).join("");
    M.stagger(d.getElementById("pil"));

    /* السيناريو */
    var s = M.scenario(u);
    var mx = Math.max(s.totalPct, s.bankPct, s.goldPct);
    var rowsC = [
      ["الوحدة دي", s.totalPct, s.totalPct >= s.bankPct ? "up" : "wrn", "إيجار + نمو سعري − تكاليف احتفاظ"],
      ["شهادة بنكية " + C.bankRate + "%", s.bankPct, "mut", "فايدة مركّبة 5 سنين · سعر البنك المعلن"],
      ["ذهب " + C.goldRate + "%", s.goldPct, "mut", "متوسط نمو سنوي · مؤشر مقارنة مش توصية"]
    ];
    d.getElementById("cmp").innerHTML = rowsC.map(function (x) {
      var col = x[2] === "up" ? "up" : x[2] === "wrn" ? "warn" : "line2";
      return '<div class="cmpr"><div class="t"><span>' + x[0] + '</span><b class="' + x[2] + '">' + pc(x[1]) + '</b></div>' +
        '<div class="ctrack"><i data-w="' + (x[1] / mx * 100).toFixed(0) +
        '" style="background:var(--' + col + ')"></i></div><p class="s">' + x[3] + '</p></div>';
    }).join("");
    d.getElementById("sl").innerHTML =
      "<div><span>التكلفة الحقيقية اليوم</span><b>" + M.val(f0(s.cost)) + "</b></div>" +
      "<div><span>إيجار صافي × 5 سنين</span><b class='" + (s.rentTot ? "up" : "mut") + "'>" +
        (s.rentTot ? M.val(f0(s.rentTot)) : "— قبل التسليم") + "</b></div>" +
      "<div><span>نمو سعري " + s.growth.toFixed(1) + "% سنوي</span><b class='up'>" + M.val(f0(s.gain)) + "</b></div>" +
      "<div><span>تكاليف احتفاظ 5 سنين</span><b class='" + (s.holdCost ? "dn" : "mut") + "'>" +
        (s.holdCost ? "−" + f0(s.holdCost) : "— بعد التسليم") + "</b></div>" +
      "<div class='f'><span>قيمة متوقعة بعد 5 سنين</span><b class='sig'>" + M.val(f0(s.endVal)) + "</b></div>" +
      "<div class='f'><span>صافي العائد الكلي</span><b class='" +
        (s.totalPct >= s.bankPct ? "up" : "wrn") + "'>" + M.val(pc(s.totalPct)) + "</b></div>";
    d.getElementById("assump").innerHTML =
      "<b>الافتراضات:</b> نمو " + u.d + " <span class='n'>" + s.growth.toFixed(1) +
      "%</span> سنوي — ده المسجّل عندنا من عقود الحي نفسه، مش متوسط قومي. الإيجار ثابت بدون زيادة (افتراض متحفّظ). " +
      "الشهادة البنكية <span class='n'>" + C.bankRate + "%</span> والذهب <span class='n'>" + C.goldRate +
      "%</span> للمقارنة. الأرقام دي حساب مش ضمان، والسوق ممكن يتحرك عكسها.";

    /* المطابقة */
    var ms = M.can("pro") ? M.matchesFor(u) : [];
    if (!M.can("pro")) {
      d.getElementById("mNote").innerHTML =
        "<b>" + M.matchesFor(u).length + " عميل</b> في حوض الطلبات مواصفاتهم بتنطبق على الوحدة دي. " +
        "أسماؤهم وتفاصيل طلبهم وأزرار التواصل معاهم في <b>أدوات البروكر</b>.";
      d.getElementById("mt").innerHTML =
        '<div class="m" style="grid-template-columns:1fr"><div>' +
        '<p class="who">المطابقة العكسية · أداة بروكر</p>' +
        '<p class="req2">كل عميل سجّل طلبه على مناطق بيتقارن آلياً بكل وحدة جديدة، والمطابقة محسوبة على 5 شروط كل واحد مكتوب اتحقق ولا لأ.</p>' +
        '<div class="act"><button class="b1" type="button" data-gate="pro">افتح أدوات البروكر</button></div>' +
        '</div></div>';
    } else {
    d.getElementById("mNote").innerHTML = ms.length
      ? "<b>" + ms.length + " عميل</b> سجّل طلبه على مناطق قبل ما الوحدة دي تنزل. المطابقة محسوبة على 5 شروط، وكل شرط مكتوب اتحقق ولا لأ — مش نسبة من غير سبب."
      : "مفيش طلب مسجّل بينطبق على الوحدة دي دلوقتي. الطلبات بتتراكم، والمطابقة بتتعاد مع كل تحديث.";
    var mt = d.getElementById("mt");
    mt.innerHTML = ms.map(function (x) {
      var CC = 2 * Math.PI * 30, O = CC * (1 - x.m.score / 100);
      var col = x.m.score >= 85 ? "#3AD483" : x.m.score >= 65 ? "#F2B233" : "#94A0AF";
      return '<article class="m"><div class="ring">' +
        '<svg width="76" height="76" viewBox="0 0 76 76">' +
        '<circle cx="38" cy="38" r="30" fill="none" stroke="#141B24" stroke-width="6"/>' +
        '<circle class="p" cx="38" cy="38" r="30" fill="none" stroke="' + col + '" stroke-width="6" ' +
        'style="--C:' + CC.toFixed(1) + 'px;--O:' + O.toFixed(1) + 'px"/></svg>' +
        '<span class="pct" style="color:' + col + '">' + x.m.score + '%</span></div>' +
        '<div><p class="who">' + x.q.who + ' <span class="chip" style="margin-inline-start:6px">' + x.q.tag + '</span></p>' +
        '<p class="req2">' + x.q.at + ' · ميزانية ' + f0(x.q.bmin) + '–' + f0(x.q.bmax) + ' · ' +
        x.q.amin + '–' + x.q.amax + ' م² · ' + x.q.dist.join(" / ") + ' · استلام ' + x.q.del + '</p>' +
        '<div class="rs">' + x.m.reasons.map(function (r2) {
          return '<span class="' + (r2[0] ? "y" : "n2") + '"><b>' + (r2[0] ? "✓" : "✕") + '</b>' + r2[1] + ': ' + r2[2] + '</span>';
        }).join("") + '</div>' +
        '<div class="act"><button class="btn" type="button">ابعت العرض على واتساب</button>' +
        '<button class="btn" type="button">احجز معاينة</button>' +
        '<button class="btn" type="button">افتح الصور للعميل</button></div></div></article>';
    }).join("");
    M.stagger(mt);
    }

    /* البدائل */
    var alts = D.UNITS.filter(function (x) { return x.d === u.d; })
      .sort(function (a, b) { return M.realPpm(a) - M.realPpm(b); });
    d.getElementById("altTb").innerHTML = alts.map(function (x) {
      var xv = M.verdict(x), xcr = M.capRate(x);
      return "<tr class='" + (x.id === u.id ? "me" : "") + "'><td><span class='cd'>" + x.id + "</span></td>" +
        "<td><b>" + x.t + "</b><br><span class='mut' style='font-size:11px'>" + x.src + (x.dev ? " · " + x.dev : "") + "</span></td>" +
        "<td class='num'>" + x.a + "</td><td class='num'>" + f0(M.cost(x)) + "</td>" +
        "<td class='num sig'>" + f0(M.realPpm(x)) + "</td>" +
        "<td class='num " + (xcr >= 8 ? "up" : "") + "'>" + (xcr ? xcr.toFixed(1) + "%" : "—") + "</td>" +
        "<td class='num'>" + x.del + "</td><td><span class='vd " + xv[1] + "'>" + xv[0] + "</span></td></tr>";
    }).join("");
    M.stagger(d.getElementById("altTb"));

    M.growBars();
    M.swap(d.getElementById("uName"));
    M.swap(d.getElementById("uWhy"));
    M.reveal();
  }

  M.markSections();
  picker(); ulist(); render(); M.reveal();
})(window, document);
