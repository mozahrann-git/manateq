/* ============================================================
   مناطق · المحرك
   الحسابات وقواعد الحكم والحركة. مفيش صفحة بتحسب لوحدها —
   كله بيمرّ من هنا، فالرقم واحد في كل مكان في الموقع.
   ============================================================ */
(function (w, d) {
  "use strict";
  var D = w.MQ_DATA, C = D.CONFIG;

  /* ---------- تنسيق ---------- */
  function f0(n) { return Math.round(n).toLocaleString("en-US"); }
  function pc(n) { return (n > 0 ? "+" : "") + n.toFixed(1) + "%"; }

  /* ---------- حسابات أساسية ---------- */
  // التكلفة الحقيقية = المعلن + وديعة الصيانة + الجراج + النادي
  function maintOf(u) { return u.maint ? u.p * u.maint / 100 : 0; }
  function known(u) { return { maint: u.maint !== null, club: u.club !== null, garage: u.garage !== null }; }
  function unknownCount(u) {
    var k = known(u);
    return (k.maint ? 0 : 1) + (k.club ? 0 : 1) + (k.garage ? 0 : 1);
  }
  function cost(u) { return u.p + maintOf(u) + (u.club || 0) + (u.garage || 0); }
  function realPpm(u) { return cost(u) / u.a; }
  function listedPpm(u) { return u.p / u.a; }

  // متوسط متر الحي — الأساس اللي بنقارن بيه، مش متوسط المنطقة
  function districtPpm(region, district) {
    var R = D.REGIONS[region];
    if (!R) return 30000;
    var row = R.districts.filter(function (x) { return x[0] === district; })[0];
    return row ? row[1] : R.ppm;
  }
  function vsDistrict(u) {
    var b = districtPpm(u.r, u.d);
    return (realPpm(u) - b) / b * 100;
  }
  // العائد الصافي = (الإيجار السنوي − إدارة وشواغر) ÷ التكلفة الحقيقية
  function capRate(u) {
    return u.rent ? (u.rent * 12 * (1 - C.vacancyMgmt)) / cost(u) * 100 : 0;
  }
  function liquidity(u) { return D.LIQUIDITY[u.d] || [null, 0]; }
  function growth(u) { return D.GROWTH[u.d] || 9; }

  // درجة المخاطرة من الأدلة وبنود التكلفة الناقصة
  function riskGrade(u) {
    var ok = 0, tot = u.docs.length;
    u.docs.forEach(function (x) { if (x[1]) ok++; });
    var unk = unknownCount(u);
    if (u.k === "resale" && ok === tot && unk === 0) return ["أ", "up", 92];
    if (ok === tot && unk <= 1) return ["ب", "wrn", 68];
    if (ok < tot) return ["ج", "dn", 34];
    return ["ب", "wrn", 60];
  }

  /* ---------- حكم مناطق · قواعد منشورة ----------
     فرصة  = أقل من متوسط الحي بـ5%+ ومعاه استلام فوري أو خصم كاش 25%+
     متضخّم = أعلى من متوسط الحي بـ8%+
     انتظر  = ورقة ناقصة أو إنجاز غير مرصود
  */
  function verdict(u) {
    var v = vsDistrict(u), r = riskGrade(u);
    if (r[0] === "ج") return ["انتظر", "n", "في ورقة ناقصة — الرقم مش المشكلة، الورق هو المشكلة."];
    if (v <= C.rules.oppPct && u.del === "فوري")
      return ["فرصة", "o", "أقل من متوسط " + u.d + " بـ" + Math.abs(v).toFixed(0) + "% واستلام فوري."];
    if (v <= C.rules.oppPct)
      return ["فرصة", "o", "أقل من متوسط " + u.d + " بـ" + Math.abs(v).toFixed(0) + "%، بس التسليم " + u.del + "."];
    if (v >= C.rules.infPct)
      return ["متضخّم", "b", "أعلى من متوسط " + u.d + " بـ" + v.toFixed(0) + "% من غير مبرر في الورق."];
    return ["محايد", "n", "قريب من متوسط " + u.d + " (" + pc(v) + ") — سعر سوق عادل، مش لقطة."];
  }

  /* ---------- سيناريو الاحتفاظ ---------- */
  function scenario(u, years) {
    var y = years || C.holdYears, c = cost(u), g = growth(u);
    var rentTot = capRate(u) ? u.rent * 12 * (1 - C.vacancyMgmt) * y : 0;
    var endVal = c * Math.pow(1 + g / 100, y);
    var gain = endVal - c;
    var holdCost = u.k === "resale" ? c * 0.01 * y : 0;
    var net = rentTot + gain - holdCost;
    return {
      years: y, cost: c, growth: g, rentTot: rentTot, endVal: endVal, gain: gain,
      holdCost: holdCost, net: net, totalPct: net / c * 100,
      bankPct: (Math.pow(1 + C.bankRate / 100, y) - 1) * 100,
      goldPct: (Math.pow(1 + C.goldRate / 100, y) - 1) * 100
    };
  }

  /* ---------- المطابقة العكسية مع طلبات العملاء ----------
     5 شروط بأوزان معلنة. كل شرط بيرجع سببه — مفيش نسبة من غير سبب.
  */
  var W = { budget: 35, district: 25, area: 20, delivery: 10, need: 10 };
  function matchRequest(u, q) {
    var c = cost(u), rs = [], s = 0;
    var inB = c >= q.bmin * 0.95 && c <= q.bmax * 1.05;
    rs.push([inB, "الميزانية", inB ? f0(c) + " داخل المدى" : f0(c) + " بره مدى " + f0(q.bmin) + "–" + f0(q.bmax)]);
    if (inB) s += W.budget;

    var inD = q.dist.indexOf(u.d) >= 0;
    rs.push([inD, "الحي", inD ? u.d : "طلب " + q.dist.join(" أو ")]);
    if (inD) s += W.district;

    var inA = u.a >= q.amin && u.a <= q.amax;
    rs.push([inA, "المساحة", inA ? u.a + " م²" : u.a + " م² مقابل " + q.amin + "–" + q.amax]);
    if (inA) s += W.area;

    var inDel = q.del === "فوري" ? u.del === "فوري" : true;
    rs.push([inDel, "التسليم", inDel ? u.del : "طلب استلام فوري"]);
    if (inDel) s += W.delivery;

    var cr = capRate(u), nd = q.need === "عائد" ? cr >= 8 : true;
    rs.push([nd, q.need === "عائد" ? "العائد" : "الغرض",
      q.need === "عائد" ? (cr ? cr.toFixed(1) + "%" : "مفيش إيجار قبل التسليم") : "سكن"]);
    if (nd) s += W.need;

    return { score: s, reasons: rs };
  }
  function matchesFor(u, min) {
    return D.POOL.map(function (q) { return { q: q, m: matchRequest(u, q) }; })
      .filter(function (x) { return x.m.score >= (min || 45); })
      .sort(function (a, b) { return b.m.score - a.m.score; });
  }

  /* ---------- قوائم جاهزة ---------- */
  function unitsOf(region) {
    return D.UNITS.filter(function (u) { return !region || region === "الكل" || u.r === region; });
  }
  function rankByValue(list) {
    return list.slice().sort(function (a, b) { return vsDistrict(a) - vsDistrict(b); });
  }
  function opportunities(region) {
    return rankByValue(unitsOf(region)).filter(function (u) { return verdict(u)[0] === "فرصة"; });
  }
  function unitById(id) { return D.UNITS.filter(function (u) { return u.id === id; })[0]; }
  function projectById(id) {
    var out = null;
    Object.keys(D.PROJECTS).forEach(function (r) {
      D.PROJECTS[r].forEach(function (p) { if (p.id === id) out = { region: r, p: p }; });
    });
    return out;
  }


  /* ---------- قوائم حسب الحي والمطوّر ---------- */
  function unitsInDistrict(dist) {
    return D.UNITS.filter(function (u) { return u.d === dist; });
  }
  function projectsInDistrict(dist) {
    var out = [];
    Object.keys(D.PROJECTS).forEach(function (r) {
      D.PROJECTS[r].forEach(function (p) { if (p.dist === dist) out.push({ region: r, p: p }); });
    });
    return out;
  }
  function developerByName(nm) {
    var out = null;
    Object.keys(D.DEVS).forEach(function (r) {
      D.DEVS[r].forEach(function (x) { if (x.nm === nm) out = { region: r, dev: x }; });
    });
    return out;
  }
  function projectsOfDeveloper(nm) {
    var out = [];
    Object.keys(D.PROJECTS).forEach(function (r) {
      D.PROJECTS[r].forEach(function (p) { if (p.dev === nm) out.push({ region: r, p: p }); });
    });
    return out;
  }
  function unitsOfDeveloper(nm) {
    var short = nm.split(" ")[0];
    return D.UNITS.filter(function (u) { return u.dev === nm || (u.dev && nm.indexOf(u.dev) === 0) || u.dev === short; });
  }
  /* سلوك المطوّر السعري محسوب من سجل مشاريعه */
  function priceBehaviour(nm) {
    var ups = 0, downs = 0, total = 0, first = null, last = null, span = [];
    projectsOfDeveloper(nm).forEach(function (x) {
      var h = x.p.hist;
      for (var i = 1; i < h.length; i++) {
        var dv = (h[i][1] - h[i - 1][1]) / h[i - 1][1] * 100;
        if (dv > 0.5) ups++; else if (dv < -0.5) downs++;
        total++;
      }
      if (h.length > 1) span.push((h[h.length - 1][1] - h[0][1]) / h[0][1] * 100);
      if (!first || h[0][0] < first) first = h[0][0];
      last = h[h.length - 1][0];
    });
    var avg = span.length ? span.reduce(function (a, b) { return a + b; }, 0) / span.length : 0;
    return { ups: ups, downs: downs, moves: total, avgSpan: avg, first: first, last: last };
  }
  /* الأحياء المجاورة في نفس المنطقة */
  function siblingDistricts(region, dist) {
    var R = D.REGIONS[region];
    if (!R) return [];
    return R.districts.filter(function (x) { return x[0] !== dist; });
  }
  function regionOfDistrict(dist) {
    var info = D.DISTRICT_INFO && D.DISTRICT_INFO[dist];
    if (info) return info.region;
    var found = null;
    Object.keys(D.REGIONS).forEach(function (r) {
      D.REGIONS[r].districts.forEach(function (x) { if (x[0] === dist) found = r; });
    });
    return found;
  }
  function districtRow(region, dist) {
    var R = D.REGIONS[region];
    if (!R) return null;
    return R.districts.filter(function (x) { return x[0] === dist; })[0] || null;
  }
  /* لينكات موحّدة — عشان مفيش صفحة تخترع مسار بنفسها */
  var LINK = {
    district: function (dist) { return "district.html?d=" + encodeURIComponent(dist); },
    developer: function (nm) { return "developer.html?dev=" + encodeURIComponent(nm); },
    project: function (id) { return "projects.html?p=" + encodeURIComponent(id); },
    unit: function (id) { return "units.html?u=" + encodeURIComponent(id); }
  };
  function qs(name) { return new URLSearchParams(w.location.search).get(name); }


  /* ============================================================
     طبقات الوصول
     ------------------------------------------------------------
     مفتوح للكل : صورة السوق، الخريطة، كلمة الحكم وسببها، المنهجية
     بعد تسجيل : الأرقام اللي بتخليك تتحرك — التكلفة، المتر، العائد، السيناريو، الأدلة
     اشتراك    : أدوات البروكر — الجروبات مترجمة، سجل الأسعار، مطابقة عملائه

     القاعدة: مبنخبّيش حكم ولا سبب. بنخبّي الرقم اللي بتتصرف بيه.
     ============================================================ */
  var TIERS = { guest: 0, member: 1, pro: 2 };
  function tier() {
    try { return localStorage.getItem("mq_tier") || "guest"; } catch (e) { return "guest"; }
  }
  function setTier(t) {
    try { localStorage.setItem("mq_tier", t); } catch (e) {}
    try { d.body.setAttribute("data-tier", t); } catch (e) {}
  }
  function can(need) { return TIERS[tier()] >= TIERS[need || "member"]; }

  /* يلفّ أي قيمة: لو المستخدم مش مؤهّل بترجع مموّهة وجنبها قفل */
  function val(text, need) {
    need = need || "member";
    if (can(need)) return String(text);
    return '<span class="lk" data-need="' + need + '" role="button" tabindex="0" ' +
      'title="سجّل عشان تشوف الرقم">' + String(text) + '</span>';
  }

  /* نافذة التسجيل */
  function gateModal(need) {
    var pro = need === "pro";
    var el = d.createElement("div");
    el.className = "gate";
    el.innerHTML =
      '<div class="gbox" role="dialog" aria-modal="true" aria-label="تسجيل">' +
      '<button class="gx" type="button" aria-label="إغلاق">✕</button>' +
      '<p class="lbl">' + (pro ? "MANATEQ PRO" : "MANATEQ · تسجيل") + '</p>' +
      '<h2>' + (pro ? "أدوات البروكر" : "الرقم ده ليك — بس سجّل الأول") + '</h2>' +
      '<p class="gnote">' + (pro
        ? "الـ50 جروب مترجمين ومرتبين كل يوم، سجل أسعار كامل لكل مشروع، مطابقة عملائك أنت بالوحدات الجديدة، وأدوات إعلان بلينكات متتبعة."
        : "الحكم وسببه مفتوحين للكل — دي مسؤوليتنا. بس التكلفة الحقيقية وسعر المتر والعائد دي الأرقام اللي بتتصرف بيها، وبنطلب مقابلها رقم واتساب واحد.") + '</p>' +
      (pro
        ? '<div class="glist">' +
          '<span><b>✓</b>فيد الجروبات مترجم للمستثمر والمشتري والبروكر</span>' +
          '<span><b>✓</b>سجل أسعار كل مشروع بتواريخه</span>' +
          '<span><b>✓</b>مطابقة عملائك بالوحدات أول ما تنزل</span>' +
          '<span><b>✓</b>نصوص إعلانات ولينكات متتبعة باسمك</span></div>'
        : '<div class="glist">' +
          '<span><b>✓</b>التكلفة الحقيقية مفصّلة بندًا بند</span>' +
          '<span><b>✓</b>سعر المتر الحقيقي والعائد الصافي</span>' +
          '<span><b>✓</b>سيناريو 5 سنين مقابل البنك والذهب</span>' +
          '<span><b>✓</b>ملفات أدلة المطوّرين كاملة</span></div>') +
      '<label class="glab" for="gphone">رقم الواتساب</label>' +
      '<input id="gphone" class="ginp" type="tel" inputmode="numeric" placeholder="01xxxxxxxxx" autocomplete="tel">' +
      '<button class="b1 gbtn" type="button">' + (pro ? "اشترك · 499 ج.م شهرياً" : "سجّل وافتح الأرقام") + '</button>' +
      '<p class="gfine">' + (pro
        ? "فيه نسخة تجريبية 7 أيام. تقدر تلغي في أي وقت."
        : "مجاني. مبنبعتش إعلانات — بنبعت لما تنزل وحدة مطابقة لطلبك بس.") + '</p>' +
      '</div>';
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });

    function close() { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 220); }
    el.querySelector(".gx").onclick = close;
    el.onclick = function (e) { if (e.target === el) close(); };
    d.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { close(); d.removeEventListener("keydown", esc); }
    });
    var inp = el.querySelector(".ginp");
    setTimeout(function () { inp.focus(); }, 120);
    el.querySelector(".gbtn").onclick = function () {
      if (!/^0?1[0-9]{9}$/.test(inp.value.replace(/\s/g, ""))) {
        inp.classList.add("bad"); inp.focus();
        setTimeout(function () { inp.classList.remove("bad"); }, 900);
        return;
      }
      setTier(pro ? "pro" : "member");
      close();
      setTimeout(function () { w.location.reload(); }, 240);
    };
  }

  /* ============================================================
     البلوكات المطويّة — عنوان بس، وبيكبر ناحيتك لما تضغط
     الصفحة تبقى فهرس يختار منه الزائر، مش حيطة بيعدّي عليها.
     ============================================================ */
  function zoomInit(root) {
    var hs = (root || d).querySelectorAll(".zch:not([data-zb])");
    for (var i = 0; i < hs.length; i++) bindZoom(hs[i]);
  }
  function bindZoom(h) {
    h.setAttribute("data-zb", "1");
    var card = h.closest(".zc");
    h.addEventListener("click", function () { toggleZoom(card, h); });
  }
  var ZBAR = 62;   /* ارتفاع الشريط اللاصق */

  /* بيثبّت العنوان تحت عين القارئ طول مدة الطي/الفتح — عشان الصفحة
     متهربش من تحته لما ارتفاعها يتغيّر. */
  function pinHead(h, ms) {
    var target = h.getBoundingClientRect().top, t0 = Date.now();
    (function step() {
      var dy = h.getBoundingClientRect().top - target;
      if (Math.abs(dy) > .5) w.scrollBy(0, dy);
      if (Date.now() - t0 < ms) requestAnimationFrame(step);
    })();
  }

  function toggleZoom(card, h) {
    var open = card.classList.contains("open");

    function flip() {
      if (open) {
        card.classList.remove("open");
        h.setAttribute("aria-expanded", "false");
      } else {
        card.classList.add("open");
        h.setAttribute("aria-expanded", "true");
        reveal(card);
        /* الخريطة وأي حاجة بتتقاس لازم تتقاس من تاني بعد ما المكان يفتح */
        setTimeout(function () { w.dispatchEvent(new Event("resize")); }, 70);
        setTimeout(function () { w.dispatchEvent(new Event("resize")); }, 500);
        /* بعد ما الحركة تهدى: لو البلوك طالع برّه الشاشة، نرفع العنوان
           تحت الشريط عشان يبان أكبر قدر منه — حركة واحدة هادية مش نطة */
        if (!RM) setTimeout(function () {
          var hr = h.getBoundingClientRect(), cr = card.getBoundingClientRect();
          if (cr.bottom > w.innerHeight && hr.top > ZBAR + 20) {
            w.scrollBy({ top: hr.top - (ZBAR + 14), behavior: "smooth" });
          }
        }, 700);
      }
      if (!RM) pinHead(h, 640);
    }

    if (RM) { flip(); return; }
    /* العنوان بره الشاشة أو ملزوق في الشريط؟ نوديه مكان مريح الأول */
    var top = h.getBoundingClientRect().top;
    if (top < ZBAR + 10 || top > w.innerHeight - 120) {
      w.scrollBy({ top: top - (ZBAR + 14), behavior: "smooth" });
      setTimeout(flip, 340);
    } else flip();
  }

  /* ============================================================
     منتقي المنطقة المنبثق
     المناطق والمشاريع والوحدات كلهم بيبدأوا من نفس السؤال: أنهي منطقة؟
     فبدل ما الزائر يدخل الصفحة ويدوّر على المنتقي، بيختار الأول.
     ============================================================ */
  var REGPAGES = { "index.html": "المناطق", "projects.html": "المشاريع", "units.html": "الوحدات" };

  function regionModal(page) {
    if (d.querySelector(".gate.rgate")) return;
    var label = REGPAGES[page] || "المناطق";
    var here = (w.location.pathname.split("/").pop() || "index.html") === page;
    var now = qs("r");

    var el = d.createElement("div");
    el.className = "gate rgate";
    el.innerHTML =
      '<div class="gbox rbox" role="dialog" aria-modal="true" aria-label="اختار المنطقة">' +
      '<button class="gx" type="button" aria-label="إغلاق">✕</button>' +
      '<p class="lbl">MANATEQ · ' + label + '</p>' +
      '<h2>أنهي منطقة؟</h2>' +
      '<p class="gnote">' +
        (page === "index.html" ? "تقرير كامل للمنطقة: أحياؤها ومطوّروها والمعروض فيها."
         : page === "projects.html" ? "هتشوف مشاريع المنطقة دي بس — كل مشروع بسعر متره الحقيقي مقابل حيّه."
         : "هتشوف الوحدات المرصودة في المنطقة دي بس — كل وحدة بحكمها وسبب حكمها.") +
      '</p>' +
      '<div class="picker rpick">' + Object.keys(D.REGIONS).map(function (k) {
        var z = D.REGIONS[k];
        return '<button class="pk" type="button" data-r="' + k + '" aria-pressed="' +
          (here && now === k) + '">' +
          '<span class="nm">' + k + '</span><span class="pp">' + f0(z.ppm) + '</span>' +
          '<span class="mt"><span>ج.م/م²</span><span class="' + (z.g30 >= 0 ? "up" : "dn") + '">' +
          pc(z.g30) + ' · 30ي</span></span></button>';
      }).join("") + '</div>' +
      '<p class="gfine">كل رقم هنا متوسط المنطقة. المقارنة الحقيقية بتحصل على مستوى الحي جوه.</p>' +
      '</div>';
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });

    function close() {
      el.classList.remove("in");
      d.removeEventListener("keydown", esc);
      setTimeout(function () { el.remove(); }, 220);
    }
    function esc(e) { if (e.key === "Escape") close(); }
    el.querySelector(".gx").onclick = close;
    el.onclick = function (e) { if (e.target === el) close(); };
    d.addEventListener("keydown", esc);
    setTimeout(function () { var f = el.querySelector(".pk"); if (f) f.focus(); }, 120);

    el.querySelector(".rpick").addEventListener("click", function (e) {
      var b = e.target.closest("[data-r]");
      if (!b) return;
      var r = b.dataset.r;
      /* نفس الصفحة ونفس المنطقة؟ مفيش داعي نعيد التحميل */
      if (here && now === r) { close(); return; }
      w.location.href = page + "?r=" + encodeURIComponent(r);
    });
  }

  /* بيمسك ضغطة التبويب قبل ما ينتقل — وبيسيب الـ ctrl/⌘ click يفتح تاب جديد زي ما هو */
  function bindRegionTabs(host) {
    if (!host) return;
    host.addEventListener("click", function (e) {
      var a = e.target.closest(".tabs a");
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      var page = (a.getAttribute("href") || "").split("?")[0];
      if (!REGPAGES[page]) return;
      e.preventDefault();
      regionModal(page);
    });
  }

  /* شريط علوي بيقول للمستخدم هو في أي طبقة */
  function tierBar() {
    var t = tier();
    var host = d.querySelector("[data-tierbar]");
    if (!host) return;
    if (t === "guest") {
      host.className = "tbar mini";
      host.innerHTML = '<div class="wrap">' +
        '<button class="tb-b" type="button" data-gate="member">🔓 افتح الأرقام</button>' +
        '<button class="tb-c" type="button" data-hidebar aria-label="إخفاء">✕</button></div>';
      try { if (localStorage.getItem("mq_barhid") === "1") host.hidden = true; } catch (e) {}
    } else {
      host.className = "tbar on";
      host.innerHTML = '<div class="wrap"><span class="tb-l">' +
        (t === "pro" ? '<b class="sig">Manateq Pro</b> · كل الأدوات مفتوحة'
                     : '<b class="up">مسجّل</b> · الأرقام التفصيلية مفتوحة · أدوات البروكر لسه مقفولة') + '</span>' +
        (t === "pro" ? '<button class="tb-x" type="button" data-signout>خروج</button>'
                     : '<span><button class="tb-b" type="button" data-gate="pro">اشترك كبروكر</button>' +
                       '<button class="tb-x" type="button" data-signout>خروج</button></span>') +
        '</div>';
    }
  }

  /* أي ضغطة على رقم مقفول أو زر بوابة بتفتح النافذة */
  function bindGate() {
    d.addEventListener("click", function (e) {
      var g = e.target.closest("[data-gate]");
      if (g) { e.preventDefault(); gateModal(g.getAttribute("data-gate")); return; }
      var l = e.target.closest(".lk");
      if (l) { e.preventDefault(); gateModal(l.getAttribute("data-need") || "member"); return; }
      if (e.target.closest("[data-signout]")) { setTier("guest"); w.location.reload(); }
      if (e.target.closest("[data-hidebar]")) {
        var bar = d.querySelector("[data-tierbar]");
        if (bar) bar.hidden = true;
        try { localStorage.setItem("mq_barhid", "1"); } catch (e2) {}
      }
    });
    d.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var l = e.target.closest && e.target.closest(".lk");
      if (l) { e.preventDefault(); gateModal(l.getAttribute("data-need") || "member"); }
    });
  }

  /* ---------- الحركة ---------- */
  var RM = w.matchMedia && w.matchMedia("(prefers-reduced-motion:reduce)").matches;
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };

  function count(el, to, fmt, ms) {
    if (!el) return;
    if (RM) { el.textContent = fmt(to); return; }
    var from = el._v || 0; el._v = to;
    var t0 = null, dur = ms || 900;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur);
      el.textContent = fmt(from + (to - from) * ease(k));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var IO = ("IntersectionObserver" in w) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      if (e.target.dataset && e.target.dataset.count) {
        count(e.target, +e.target.dataset.count, f0, 1100);
      }
      IO.unobserve(e.target);
    });
  }, { threshold: 0, rootMargin: "0px 0px -24px 0px" }) : null;

  /* أي حاجة قريبة من الشاشة بتتفتح على طول — ومفيش حاجة بتفضل مخفية
     لو المتصفح اتأخر أو المراقب مشتغلش. الحركة زينة، والمحتوى أهم. */
  function showNow(el) { el.classList.add("in"); if (IO) { try { IO.unobserve(el); } catch (e) {} } }
  function reveal(root) {
    var ns = (root || d).querySelectorAll("[data-rv]:not(.in)");
    for (var i = 0; i < ns.length; i++) {
      var el = ns[i];
      if (RM || !IO) { el.classList.add("in"); continue; }
      var r = el.getBoundingClientRect();
      if (r.top < w.innerHeight * 1.35) showNow(el);   // في الشاشة أو قريب منها
      else IO.observe(el);
    }
    clearTimeout(reveal._t);
    reveal._t = setTimeout(function () {               // شبكة أمان
      var rest = (root || d).querySelectorAll("[data-rv]:not(.in)");
      for (var j = 0; j < rest.length; j++) {
        if (rest[j].getBoundingClientRect().top < w.innerHeight * 2.2) showNow(rest[j]);
      }
    }, 1400);
  }
  /* ولو المستخدم سكرول بسرعة، نلحق اللي فات */
  w.addEventListener("scroll", function () {
    clearTimeout(reveal._s);
    reveal._s = setTimeout(function () {
      var ns = d.querySelectorAll("[data-rv]:not(.in)");
      for (var i = 0; i < ns.length; i++) {
        if (ns[i].getBoundingClientRect().top < w.innerHeight * 1.2) showNow(ns[i]);
      }
    }, 90);
  }, { passive: true });
  function onSeen(el, fn) {
    if (RM || !IO || !el) { fn(); return; }
    var o = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { fn(); o.disconnect(); } });
    }, { threshold: 0.3 });
    o.observe(el);
  }
  function stagger(host) {
    if (!host) return;
    var c = host.children;
    for (var i = 0; i < c.length; i++) c[i].style.setProperty("--i", i);
  }
  function growBars(root) {
    requestAnimationFrame(function () {
      var b = (root || d).querySelectorAll("[data-w]");
      for (var i = 0; i < b.length; i++) b[i].style.width = b[i].dataset.w + "%";
    });
  }
  function swap(el) { if (!el) return; el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap"); }

  function sparkPath(a, w2, h, p) {
    var mn = Math.min.apply(null, a), mx = Math.max.apply(null, a), rg = (mx - mn) || 1;
    return a.map(function (v, i) {
      var x = (i / ((a.length - 1) || 1)) * w2, y = h - p - ((v - mn) / rg) * (h - p * 2);
      return (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }).join(" ");
  }
  function sparkPoints(a, w2, h, p) {
    var mn = Math.min.apply(null, a), mx = Math.max.apply(null, a), rg = (mx - mn) || 1;
    return a.map(function (v, i) {
      return { x: (i / ((a.length - 1) || 1)) * w2, y: h - p - ((v - mn) / rg) * (h - p * 2) };
    });
  }
  function drawSpark(svg, series, w2, h, pad, withPoints) {
    if (!svg) return;
    var dPath = sparkPath(series, w2, h, pad);
    var html = '<path class="fl" d="' + dPath + ' L' + w2 + ' ' + h + ' L0 ' + h + ' Z" fill="rgba(255,122,26,.10)"/>' +
      '<path class="ln" d="' + dPath + '" fill="none" stroke="#FF7A1A" stroke-width="1.8" vector-effect="non-scaling-stroke"/>';
    if (withPoints) {
      html += sparkPoints(series, w2, h, pad).map(function (q, i) {
        return '<circle class="pt" cx="' + q.x.toFixed(1) + '" cy="' + q.y.toFixed(1) +
          '" r="2.6" fill="#07090C" stroke="#FF7A1A" stroke-width="1.6" vector-effect="non-scaling-stroke"' +
          ' style="animation-delay:' + (0.35 + i * 0.13) + 's"/>';
      }).join("");
    }
    svg.innerHTML = html;
    try {
      var ln = svg.querySelector(".ln");
      ln.style.setProperty("--L", ln.getTotalLength() + "px");
    } catch (e) { /* بعض المتصفحات القديمة */ }
  }


  /* ============================================================
     الطبقات — تقليل النص بالنقر
     ------------------------------------------------------------
     كل مربع بيبان بعنوانه ورقمه بس. كل نقرة بتفتح طبقة زيادة،
     وعدد الطبقات بييجي من محتوى المربع نفسه مش من رقم ثابت —
     عشان مفيش نقرة تطلع فاضية. وفي آخر طبقة بيظهر شريط
     «فتح بالكامل» بعرض المربع.
     ============================================================ */
  function peelInit(root) {
    var boxes = (root || d).querySelectorAll(".peel:not([data-ready])");
    for (var i = 0; i < boxes.length; i++) (function (box) {
      var ls = box.querySelectorAll("[data-l]");
      var max = 0;
      for (var j = 0; j < ls.length; j++) max = Math.max(max, +ls[j].getAttribute("data-l"));
      box.setAttribute("data-max", max);
      box.setAttribute("data-lv", "0");
      box.setAttribute("data-ready", "1");
      if (max > 0) {
        box.setAttribute("tabindex", "0");
        box.setAttribute("role", "button");
        box.setAttribute("aria-expanded", "false");
        var h = d.createElement("span");
        h.className = "peelhint";
        h.innerHTML = '<i class="pdots"><b></b>' + (max > 1 ? '<b></b>' : '') + (max > 2 ? '<b></b>' : '') + '</i>' +
          '<span>اضغط للتفاصيل</span>';
        box.appendChild(h);
      }
      function open(n) {
        var lv = Math.min(max, n);
        box.setAttribute("data-lv", lv);
        box.setAttribute("aria-expanded", lv > 0 ? "true" : "false");
        var dots = box.querySelectorAll(".pdots b");
        for (var k = 0; k < dots.length; k++) dots[k].classList.toggle("on", k < lv);
        var hint = box.querySelector(".peelhint span");
        if (hint) hint.textContent = lv >= max ? "" : (lv ? "كمّل" : "اضغط للتفاصيل");
      }
      box._peel = open;
      box.addEventListener("click", function (e) {
        if (e.target.closest("a,button,input,.peelgo")) return;
        open((+box.getAttribute("data-lv")) + 1 > max ? 0 : (+box.getAttribute("data-lv")) + 1);
      });
      box.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        if (e.target.closest("a,button")) return;
        e.preventDefault();
        open((+box.getAttribute("data-lv")) + 1 > max ? 0 : (+box.getAttribute("data-lv")) + 1);
      });
    })(boxes[i]);
  }
  /* زرار افتح الكل / اقفل الكل */
  function peelAll(btn, root) {
    if (!btn) return;
    var open = false;
    btn.addEventListener("click", function () {
      open = !open;
      var boxes = (root || d).querySelectorAll(".peel[data-ready]");
      for (var i = 0; i < boxes.length; i++) {
        if (boxes[i]._peel) boxes[i]._peel(open ? +boxes[i].getAttribute("data-max") : 0);
      }
      btn.textContent = open ? "اقفل الكل" : "افتح الكل";
      btn.setAttribute("aria-pressed", open);
    });
  }

  /* ---------- الهيكل المشترك ---------- */
  var NAV = [
    ["01", "المناطق", "index.html"],
    ["02", "المشاريع", "projects.html"],
    ["03", "الوحدات", "units.html"],
    ["04", "نبض السوق", "pulse.html"],
    ["05", "المنهجية", "method.html"]
  ];
  function buildHeader(active) {
    var host = d.querySelector("[data-header]");
    if (!host) return;
    host.className = "bar";
    host.innerHTML =
      '<div class="wrap">' +
      '<span class="tick"><span class="bl"></span><span id="mqClock" class="n">00:00:00</span> · CAI</span>' +
      '<button class="thm" id="mqTheme" type="button" aria-label="تغيير الثيم"></button>' +
      '<nav class="tabs">' + NAV.map(function (x) {
        return '<a href="' + x[2] + '"' + (x[2] === active ? ' class="on" aria-current="page"' : '') +
          '><i class="c">' + x[0] + '</i> ' + x[1] + '</a>';
      }).join("") + '</nav>' +
      '<a class="brand" href="index.html">' +
      '<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M3 21V8l9-5 9 5v13" stroke="#FF7A1A" stroke-width="2.6" fill="none"/>' +
      '<path d="M9 21v-7h6v7" stroke="#FF7A1A" stroke-width="2.6" fill="none"/></svg>' +
      '<span class="bn">Manateq<i>investment</i></span></a>' +
      '</div>';
    bindTheme();
    tickClock();
    focusTab(host);
    bindRegionTabs(host);
    d.body.setAttribute("data-tier", tier());
    tierBar();
    bindGate();
  }
  var SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  function setTheme(t) {
    d.documentElement.setAttribute("data-theme", t);
    var b = d.getElementById("mqTheme");
    if (b) b.innerHTML = t === "light" ? MOON : SUN;
    try { w.localStorage.setItem("mqTheme", t); } catch (e) {}
  }
  function bindTheme() {
    var t = "dark";
    try { t = w.localStorage.getItem("mqTheme") || "dark"; } catch (e) {}
    setTheme(t);
    var b = d.getElementById("mqTheme");
    if (b) b.addEventListener("click", function () {
      setTheme(d.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
    });
  }
  function tickClock() {
    var el = d.getElementById("mqClock");
    if (!el) return;
    function go() {
      var t = new Date(), p = function (x) { return String(x).padStart(2, "0"); };
      el.textContent = p(t.getHours()) + ":" + p(t.getMinutes()) + ":" + p(t.getSeconds());
    }
    go(); setInterval(go, 1000);
  }
  function markSections() {
    var ns = d.querySelectorAll("main section, [data-reveal]");
    for (var i = 0; i < ns.length; i++) ns[i].setAttribute("data-rv", "");
  }


  /* ---------- شريط لوحة التشغيل ---------- */
  var ANAV = [
    ["01", "خط الإنتاج", "admin.html"],
    ["02", "الاستقبال", "admin-inbox.html"],
    ["03", "الأرقام والجروبات", "admin-directory.html"],
    ["04", "اقتناص الفرص", "admin-radar.html"],
    ["05", "الخريطة", "admin-map.html"],
    ["06", "الأخبار", "admin-news.html"],
    ["07", "البيانات", "admin-data.html"],
    ["08", "الإحصائيات", "admin-stats.html"],
    ["09", "المستخدمين", "admin-users.html"],
    ["10", "الإعدادات", "admin-settings.html"]
  ];
  /* على الموبايل القائمة بتتزحلق — نودّي التبويب الحالي قدام عين المستخدم */
  function focusTab(host) {
    var on = host && host.querySelector(".tabs .on");
    if (!on) return;
    var nav = on.parentNode;
    setTimeout(function () {
      if (nav.scrollWidth <= nav.clientWidth + 4) return;
      nav.scrollLeft = on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2;
    }, 30);
  }

  function buildAdminHeader(active) {
    var host = d.querySelector("[data-adminhead]");
    if (!host) return;
    host.className = "bar admin";
    host.innerHTML = '<div class="wrap">' +
      '<span class="tick"><a href="index.html" class="tb-x" style="margin:0 9px 0 0">الموقع ←</a>' +
      '<span class="bl"></span><span id="mqClock" class="n">00:00:00</span></span>' +
      '<nav class="tabs">' + ANAV.map(function (x) {
        return '<a href="' + x[2] + '"' + (x[2] === active ? ' class="on" aria-current="page"' : '') +
          '><i class="c">' + x[0] + '</i> ' + x[1] + '</a>';
      }).join("") + '</nav>' +
      '<a class="brand" href="admin.html"><svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M3 21V8l9-5 9 5v13" stroke="#FF7A1A" stroke-width="2.6" fill="none"/>' +
      '<path d="M9 21v-7h6v7" stroke="#FF7A1A" stroke-width="2.6" fill="none"/></svg>' +
      '<span class="bn">Manateq<i>operations</i></span></a>' +
      '</div>';
    tickClock();
    focusTab(host);
  }

  /* ---------- بلوك البرهان (بيتكرر في أكتر من صفحة) ---------- */
  var READS = [
    ["السعر المعلن ÷ المساحة<br><span class='mut' style='font-size:10.5px'>اللي السوق كله بيقارن بيه</span>",
      58348, "var(--down)", 100, "7,585,301 ÷ 130 م²"],
    ["+ الجراج + وديعة الصيانة<br><span class='mut' style='font-size:10.5px'>التكلفة الحقيقية للتملك</span>",
      62420, "var(--warn)", 100, "8,114,566 ÷ 130 م²"],
    ["سعر الكاش بعد خصم 35%<br><span class='mut' style='font-size:10.5px'>الرقم الوحيد اللي يتقارن</span>",
      41998, "var(--up)", 67, "5,459,711 ÷ 130 م²"]
  ];
  function renderProof(hostId) {
    var host = d.getElementById(hostId);
    if (!host) return;
    host.innerHTML = READS.map(function (x) {
      return '<article class="rd"><p class="k">' + x[0] + '</p>' +
        '<p class="v" style="color:' + x[2] + '">0</p>' +
        '<span class="t"><i data-w="' + x[3] + '" style="background:' + x[2] + '"></i></span>' +
        '<p class="s">' + x[4] + '</p></article>';
    }).join("");
    stagger(host);
    onSeen(host, function () {
      var vs = host.querySelectorAll(".v");
      for (var i = 0; i < vs.length; i++) count(vs[i], READS[i][1], f0, 1100 + i * 140);
      growBars(host);
    });
  }

  w.MQ = {
    D: D, CONFIG: C,
    f0: f0, pc: pc,
    maintOf: maintOf, known: known, unknownCount: unknownCount,
    cost: cost, realPpm: realPpm, listedPpm: listedPpm,
    districtPpm: districtPpm, vsDistrict: vsDistrict, capRate: capRate,
    liquidity: liquidity, growth: growth, riskGrade: riskGrade, verdict: verdict,
    scenario: scenario, matchRequest: matchRequest, matchesFor: matchesFor,
    unitsOf: unitsOf, rankByValue: rankByValue, opportunities: opportunities,
    unitById: unitById, projectById: projectById,
    unitsInDistrict: unitsInDistrict, projectsInDistrict: projectsInDistrict,
    developerByName: developerByName, projectsOfDeveloper: projectsOfDeveloper,
    unitsOfDeveloper: unitsOfDeveloper, priceBehaviour: priceBehaviour,
    siblingDistricts: siblingDistricts, regionOfDistrict: regionOfDistrict,
    districtRow: districtRow, LINK: LINK, qs: qs,
    RM: RM, count: count, reveal: reveal, onSeen: onSeen, stagger: stagger,
    growBars: growBars, swap: swap, drawSpark: drawSpark,
    peelInit: peelInit, peelAll: peelAll,
    buildHeader: buildHeader, buildAdminHeader: buildAdminHeader, markSections: markSections, renderProof: renderProof,
    tier: tier, setTier: setTier, can: can, val: val, gateModal: gateModal,
    regionModal: regionModal, REGPAGES: REGPAGES, zoomInit: zoomInit
  };
})(window, document);
