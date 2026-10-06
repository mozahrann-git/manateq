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
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }) : null;

  function reveal(root) {
    var ns = (root || d).querySelectorAll("[data-rv]:not(.in)");
    for (var i = 0; i < ns.length; i++) {
      if (RM || !IO) ns[i].classList.add("in"); else IO.observe(ns[i]);
    }
  }
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

  /* ---------- الهيكل المشترك ---------- */
  var NAV = [
    ["01", "المناطق", "index.html"],
    ["02", "المشاريع", "projects.html"],
    ["03", "الوحدات", "units.html"],
    ["04", "نبض السوق", "pulse.html"]
  ];
  function buildHeader(active) {
    var host = d.querySelector("[data-header]");
    if (!host) return;
    host.className = "bar";
    host.innerHTML =
      '<div class="wrap">' +
      '<a class="brand" href="index.html">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M3 21V8l9-5 9 5v13" stroke="#FF7A1A" stroke-width="2.6" fill="none"/>' +
      '<path d="M9 21v-7h6v7" stroke="#FF7A1A" stroke-width="2.6" fill="none"/></svg>مناطق</a>' +
      '<nav class="tabs">' + NAV.map(function (x) {
        return '<a href="' + x[2] + '"' + (x[2] === active ? ' class="on" aria-current="page"' : '') +
          '><i class="c">' + x[0] + '</i> ' + x[1] + '</a>';
      }).join("") + '</nav>' +
      '<span class="tick"><span class="bl"></span><span id="mqClock" class="n">00:00:00</span> · CAI</span>' +
      '</div>';
    tickClock();
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
    RM: RM, count: count, reveal: reveal, onSeen: onSeen, stagger: stagger,
    growBars: growBars, swap: swap, drawSpark: drawSpark,
    buildHeader: buildHeader, markSections: markSections, renderProof: renderProof
  };
})(window, document);
