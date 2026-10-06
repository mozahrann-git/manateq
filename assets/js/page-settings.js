/* مناطق · الإعدادات
   كل رقم هنا بيتحسب أثره على الموقع كله قبل ما يتحفظ. */
(function (w, d) {
  "use strict";
  var M = w.MQ, D = M.D, C = M.CONFIG, f0 = M.f0;
  M.buildAdminHeader("admin-settings.html");

  var log = [
    { at: "امبارح 19:40", who: "محمد زهران", k: "متوسط متر التوسعات الشرقية", a: "22,000", b: "48,000",
      i: "حكم وحدتين اتغيّر" }
  ];

  /* لقطة الأحكام الحالية — عشان نقيس الأثر */
  function snapshot() {
    var o = {};
    D.UNITS.forEach(function (u) { o[u.id] = M.verdict(u)[0]; });
    return o;
  }
  function counts() {
    var c = { "فرصة": 0, "محايد": 0, "متضخّم": 0, "انتظر": 0 };
    D.UNITS.forEach(function (u) { c[M.verdict(u)[0]]++; });
    return c;
  }

  var FIELDS = {
    rules: [
      { k: "oppPct", t: "حدّ الفرصة", u: "%", min: -20, max: -1, step: 1,
        get: function () { return C.rules.oppPct; }, set: function (v) { C.rules.oppPct = v; },
        w: "الوحدة بتبقى فرصة لما سعر مترها الحقيقي يقلّ عن متوسط الحي بالنسبة دي." },
      { k: "infPct", t: "حدّ التضخّم", u: "%", min: 2, max: 25, step: 1,
        get: function () { return C.rules.infPct; }, set: function (v) { C.rules.infPct = v; },
        w: "الوحدة بتبقى متضخّمة لما تزيد عن متوسط الحي بالنسبة دي." },
      { k: "cashDisc", t: "خصم الكاش المعتبر", u: "%", min: 10, max: 50, step: 5,
        get: function () { return C.rules.cashDisc; }, set: function (v) { C.rules.cashDisc = v; },
        w: "الخصم اللي بيخلّي الوحدة فرصة حتى لو تسليمها مش فوري." }
    ],
    consts: [
      { k: "maintPct", t: "وديعة الصيانة الافتراضية", u: "%", min: 0, max: 15, step: 1,
        get: function () { return C.maintPct; }, set: function (v) { C.maintPct = v; },
        w: "بتتحسب على السعر المعلن لما المطوّر ميقولش نسبته." },
      { k: "vac", t: "إدارة وشواغر", u: "%", min: 0, max: 30, step: 1,
        get: function () { return Math.round(C.vacancyMgmt * 100); }, set: function (v) { C.vacancyMgmt = v / 100; },
        w: "بتتخصم من الإيجار السنوي قبل حساب العائد الصافي — عشان منفترضش إن الشقة مفضيتش يوم." },
      { k: "bankRate", t: "شهادة بنكية", u: "%", min: 5, max: 35, step: 0.5,
        get: function () { return C.bankRate; }, set: function (v) { C.bankRate = v; },
        w: "مرجع المقارنة في سيناريو الاحتفاظ 5 سنين." },
      { k: "goldRate", t: "نمو الذهب السنوي", u: "%", min: 0, max: 40, step: 0.5,
        get: function () { return C.goldRate; }, set: function (v) { C.goldRate = v; },
        w: "مؤشر مقارنة تاني — مش توصية شراء." },
      { k: "holdYears", t: "مدة السيناريو", u: "سنة", min: 1, max: 15, step: 1,
        get: function () { return C.holdYears; }, set: function (v) { C.holdYears = v; },
        w: "عدد السنين في سيناريو الاحتفاظ." }
    ],
    intake: [
      { k: "autoQ", t: "أقل جودة للاعتماد الآلي", u: "/10", min: 5, max: 10, step: 0.5,
        get: function () { return 8; }, set: function () {},
        w: "الرسالة من نموذج ناضج بتتعتمد لوحدها لو جودتها عدّت الرقم ده." },
      { k: "matRules", t: "قواعد لازمة لنضج النموذج", u: "قاعدة", min: 2, max: 8, step: 1,
        get: function () { return 4; }, set: function () {},
        w: "عدد القواعد المتعلّمة اللي بتخلّي نموذج السيلز ناضج." },
      { k: "matSeen", t: "رسائل لازمة لنضج النموذج", u: "رسالة", min: 3, max: 30, step: 1,
        get: function () { return 10; }, set: function () {},
        w: "عدد الرسائل المستقبلة من نفس الشخص قبل ما نثق في نموذجه." },
      { k: "minSample", t: "أقل عيّنة قبل «تقديري»", u: "عملية", min: 2, max: 15, step: 1,
        get: function () { return 5; }, set: function () {},
        w: "الحي اللي عيّنته أقل من كده بيتعلّم عليه «تقديري» في كل الموقع." }
    ]
  };

  function build(host, arr) {
    d.getElementById(host).innerHTML = arr.map(function (f, i) {
      return '<div class="setrow" style="--i:' + i + '">' +
        '<div class="sl2"><b>' + f.t + '</b><span>' + f.w + '</span></div>' +
        '<div class="sc">' +
          '<input class="rng" type="range" data-k="' + f.k + '" data-h="' + host + '" ' +
            'min="' + f.min + '" max="' + f.max + '" step="' + f.step + '" value="' + f.get() + '" ' +
            'aria-label="' + f.t + '">' +
          '<span class="sv"><b class="n" id="v_' + f.k + '">' + f.get() + '</b><i>' + f.u + '</i></span>' +
        '</div></div>';
    }).join("");
  }

  function impact() {
    var c = counts();
    var tot = D.UNITS.length;
    d.getElementById("impact").innerHTML =
      '<b>الأثر دلوقتي على ' + tot + ' وحدة مرصودة:</b> ' +
      '<span class="n up">' + c["فرصة"] + '</span> فرصة · ' +
      '<span class="n wrn">' + c["محايد"] + '</span> محايد · ' +
      '<span class="n dn">' + c["متضخّم"] + '</span> متضخّم · ' +
      '<span class="n mut">' + c["انتظر"] + '</span> انتظر. ' +
      'أي تغيير هنا بيعيد حساب الأحكام دي فوراً، والمنهجية المنشورة بتتحدّث لوحدها.';
  }

  function onChange(e) {
    var inp = e.target.closest("[data-k]");
    if (!inp) return;
    var host = inp.dataset.h, k = inp.dataset.k;
    var f = FIELDS[host].filter(function (x) { return x.k === k; })[0];
    if (!f) return;
    var before = snapshot(), bc = counts();
    f.set(parseFloat(inp.value));
    d.getElementById("v_" + k).textContent = inp.value;
    impact();
    if (host === "rules") {
      var after = snapshot(), changed = [];
      Object.keys(after).forEach(function (id) { if (after[id] !== before[id]) changed.push(id); });
      var hint = d.getElementById("impact");
      if (changed.length) {
        hint.innerHTML += '<br><b class="wrn">⚠ ' + changed.length + ' وحدة اتغيّر حكمها دلوقتي:</b> ' +
          changed.slice(0, 6).join(" · ") + (changed.length > 6 ? " …" : "");
      }
    }
  }
  function onCommit(e) {
    var inp = e.target.closest("[data-k]");
    if (!inp) return;
    var f = FIELDS[inp.dataset.h].filter(function (x) { return x.k === inp.dataset.k; })[0];
    if (!f) return;
    var c = counts();
    log.unshift({ at: "دلوقتي", who: "محمد زهران", k: f.t, a: "—", b: inp.value + f.u,
      i: c["فرصة"] + " فرصة · " + c["متضخّم"] + " متضخّم" });
    drawLog();
    toast(f.t + " بقى " + inp.value + f.u + " — الأحكام اتحسبت من تاني على " + D.UNITS.length + " وحدة");
  }

  function drawLog() {
    d.getElementById("sLog").innerHTML = log.map(function (x) {
      return "<tr><td class='num mut'>" + x.at + "</td><td>" + x.who + "</td>" +
        "<td><b>" + x.k + "</b></td><td class='num mut'>" + x.a + "</td>" +
        "<td class='num sig'>" + x.b + "</td>" +
        "<td class='mut' style='font-size:11.5px'>" + x.i + "</td></tr>";
    }).join("");
  }
  function toast(t) {
    var el = d.createElement("div"); el.className = "toast"; el.textContent = t;
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    setTimeout(function () { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 300); }, 4200);
  }

  build("rules", FIELDS.rules);
  build("consts", FIELDS.consts);
  build("intake", FIELDS.intake);
  d.addEventListener("input", onChange);
  d.addEventListener("change", onCommit);
  impact(); drawLog(); M.markSections(); M.reveal();
})(window, document);
