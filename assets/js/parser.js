/* ============================================================
   مناطق · محرك القراءة
   ------------------------------------------------------------
   كل سيلز بيكتب بطريقته. فالمحرك بيقرا على تلات مستويات:
     1. نموذج المرسل   — قواعد اتعلّمها من تصحيحات سابقة لنفس الشخص
     2. القواعد العامة  — بتمسك أغلب الرسائل
     3. مراجعة بشرية   — اللي الثقة فيه ضعيفة
   وكل تصحيح بشري بيتحوّل لقاعدة في نموذج المرسل، فالنظام بيبقى
   أذكى كل يوم من غير ما حد يبرمج.

   كل حقل بيرجع معاه: القيمة · الثقة · السطر اللي اتاخد منه · القاعدة اللي مسكته
   ============================================================ */
(function (w) {
  "use strict";

  /* ---------- 1. التطبيع ---------- */
  var AR_DIGITS = { "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9",
                    "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9" };
  function norm(t) {
    if (!t) return "";
    return String(t)
      .replace(/[٠-٩۰-۹]/g, function (c) { return AR_DIGITS[c]; })
      .replace(/[ؗ-ًؚ-ْـ]/g, "")   // تشكيل وتطويل
      .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
      .replace(/[,٬ ]/g, "")                       // فواصل الآلاف
      .replace(/[‏‎]/g, "")
      .replace(/[ \t]+/g, " ");
  }
  function lines(t) {
    return norm(t).split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  /* ---------- 2. القواعد العامة ----------
     كل قاعدة: مفتاح الحقل، كلمات دالة، أقل قيمة مقبولة، ونوع الالتقاط */
  var RULES = [
    { f: "price",    label: "السعر",          kw: ["سعر الوحده","سعر الوحدة","السعر الاجمالي","اجمالي السعر","الاجمالي","السعر","total price","price","سعر الشقه"], min: 300000, pick: "last" },
    { f: "area",     label: "المساحة",        kw: ["المساحه","مساحه","م2","م²","متر","sqm","bua"], min: 40, max: 2000, pick: "first" },
    { f: "garage",   label: "الجراج",          kw: ["جراج","الجراج","garage","parking","موقف"], min: 20000, pick: "last" },
    { f: "maint",    label: "وديعة الصيانة",   kw: ["وديعه الصيانه","الصيانه","maintenance","وديعه"], min: 1, pick: "last" },
    { f: "club",     label: "اشتراك النادي",   kw: ["النادي","اشتراك","club"], min: 1000, pick: "last" },
    { f: "downPct",  label: "نسبة المقدّم",    kw: ["مقدم","المقدم","دفعه اولي","down payment","dp","د.م"], min: 1, max: 100, pct: true, pick: "first" },
    { f: "down",     label: "قيمة المقدّم",    kw: ["مقدم","المقدم","دفعه اولي","down payment","dp"], min: 50000, pick: "last" },
    { f: "months",   label: "عدد الشهور",      kw: ["شهر","شهور","اقساط","قسط","months"], min: 6, max: 180, pick: "last" },
    { f: "years",    label: "عدد السنين",      kw: ["سنه","سنين","سنوات","years"], min: 1, max: 15, pick: "last" },
    { f: "inst",     label: "القسط",           kw: ["القسط","قسط شهري","installment","قسط ربع"], min: 5000, pick: "last" },
    { f: "cashDisc", label: "خصم الكاش",       kw: ["كاش","cash","خصم"], min: 1, max: 60, pct: true, pick: "first" },
    { f: "rooms",    label: "عدد الغرف",       kw: ["غرف","غرفه","rooms","bedrooms"], min: 1, max: 8, pick: "first" }
  ];

  var DELIVERY = [
    /* السنة الأول — عشان «Delivery 2029» ميتقراش «فوري» */
    [/(?:تسليم|استلام|delivery|handover)[^\d]{0,14}(20\d{2})/i, "$1"],
    [/استلام\s*فور|تسليم\s*فور|جاهز\s*للمعاين|ready\s*to\s*move|\brtm\b|\bready\b/i, "فوري"]
  ];

  /* رقم من سطر فيه كلمة دالة */
  function numsIn(line) {
    var m = line.match(/\d+(?:\.\d+)?/g);
    return m ? m.map(Number) : [];
  }
  /* نفس الأرقام ومعاها مكانها في السطر — عشان نعرف مين بعد الكلمة الدالة */
  function numsAt(line) {
    var re = /\d+(?:\.\d+)?/g, m, out = [];
    while ((m = re.exec(line))) out.push({ v: Number(m[0]), i: m.index });
    return out;
  }
  function hasKw(line, kws) {
    var l = line.toLowerCase();
    for (var i = 0; i < kws.length; i++) if (l.indexOf(kws[i].toLowerCase()) > -1) return kws[i];
    return null;
  }

  /* ---------- 3. القراءة ---------- */
  function read(raw, profile) {
    profile = profile || { rules: {} };
    var L = lines(raw), out = {}, used = {};

    /* (أ) نموذج المرسل الأول — قواعده أقوى من القواعد العامة */
    Object.keys(profile.rules || {}).forEach(function (f) {
      var r = profile.rules[f];                       // { kw, pick, min }
      for (var i = 0; i < L.length; i++) {
        if (L[i].toLowerCase().indexOf(String(r.kw).toLowerCase()) === -1) continue;
        var ns = numsIn(L[i]).filter(function (n) { return n >= (r.min || 0); });
        if (!ns.length) continue;
        out[f] = {
          v: r.pick === "first" ? ns[0] : ns[ns.length - 1],
          c: 0.97, line: L[i], rule: "نموذج المرسل · «" + r.kw + "»", learned: true
        };
        used[i] = true;
        break;
      }
    });

    /* (ب) القواعد العامة */
    RULES.forEach(function (R) {
      if (out[R.f]) return;
      var best = null;
      for (var i = 0; i < L.length; i++) {
        var kw = hasKw(L[i], R.kw);
        if (!kw) continue;
        var all = numsAt(L[i]).filter(function (n) {
          return n.v >= (R.min || 0) && (!R.max || n.v <= R.max);
        });
        if (!all.length) continue;
        /* النسب لازم يبقى جنبها % */
        if (R.pct && L[i].indexOf("%") === -1) continue;
        /* الرقم اللي بعد الكلمة الدالة هو المقصود — «Point 90 — مساحه 120 م»
           مساحتها 120 مش 90. لو مفيش رقم بعدها، نرجع لكل أرقام السطر. */
        var ki = L[i].indexOf(kw);
        var after = all.filter(function (n) { return n.i > ki; });
        var pool = after.length ? after : all;
        var ns = pool.map(function (n) { return n.v; });
        var v = R.pick === "first" ? ns[0] : ns[ns.length - 1];
        /* الثقة: أعلى لو السطر فيه رقم واحد بس، وأقل لو فيه أرقام كتير */
        var conf = ns.length === 1 ? 0.92 : (ns.length === 2 ? 0.78 : 0.6);
        if (used[i]) conf -= 0.15;                     // السطر اتاخد منه حقل تاني
        if (!best || conf > best.c) best = { v: v, c: conf, line: L[i], rule: "قاعدة عامة · «" + kw + "»" };
      }
      if (best) out[R.f] = best;
    });

    /* (ج) حقول نصّية */
    for (var i = 0; i < L.length; i++) {
      for (var j = 0; j < DELIVERY.length; j++) {
        var m = L[i].match(DELIVERY[j][0]);
        if (m) {
          out.delivery = { v: DELIVERY[j][1] === "$1" ? m[1] : DELIVERY[j][1],
                           c: 0.9, line: L[i], rule: "قاعدة التسليم" };
          break;
        }
      }
      if (out.delivery) break;
    }
    /* كود الوحدة لو موجود */
    var code = norm(raw).match(/\b([A-Z]{1,4}\d{0,2}[-–]\d{1,4})\b/);
    if (code) out.code = { v: code[1], c: 0.85, line: code[0], rule: "نمط كود وحدة" };

    /* السعر بعد الخصم لو مكتوب صريح */
    for (var k = 0; k < L.length; k++) {
      if (/✅|بعد الخصم|after discount/i.test(L[k])) {
        var ns2 = numsIn(L[k]).filter(function (n) { return n >= 300000; });
        if (ns2.length) { out.cashPrice = { v: ns2[ns2.length - 1], c: 0.9, line: L[k], rule: "سعر بعد الخصم" }; break; }
      }
    }
    /* لو مفيش سعر كاش صريح بس فيه نسبة خصم */
    if (!out.cashPrice && out.price && out.cashDisc) {
      out.cashPrice = { v: out.price.v * (1 - out.cashDisc.v / 100), c: 0.8,
                        line: "—", rule: "محسوب: السعر × (1 − الخصم)" };
    }
    /* سنين ← شهور */
    if (!out.months && out.years) {
      out.months = { v: out.years.v * 12, c: out.years.c - 0.05, line: out.years.line, rule: "محوّل من السنين" };
    }
    return { fields: out, lines: L };
  }

  /* ---------- 4. جودة القراءة ---------- */
  var CORE = ["price", "area", "delivery"];
  var PLUS = ["downPct", "months", "cashDisc", "garage", "maint", "rooms", "inst"];
  function quality(fields) {
    var s = 0, missing = [], weak = [];
    CORE.forEach(function (f) {
      if (fields[f] && fields[f].c >= 0.7) s += 2.5;
      else if (fields[f]) { s += 1.2; weak.push(f); }
      else missing.push(f);
    });
    PLUS.forEach(function (f) { if (fields[f]) s += 0.36; });
    return { score: Math.min(10, Math.round(s * 10) / 10), missing: missing, weak: weak };
  }

  /* ---------- 5. التصنيف ---------- */
  function classify(raw, fields, prev) {
    var t = norm(raw).toLowerCase(), type = "عرض", tag = "resale";
    if (/اطلاق|launch|new phase|مرحله جديده|eoi/.test(t)) { type = "إطلاق"; tag = "launch"; }
    else if (/زياده|رفع اسعار|increase|تحديث اسعار/.test(t)) { type = "رفع سعر"; tag = "up2"; }
    else if (/خصم|offer|عرض|discount/.test(t)) { type = "خصم"; tag = "disc"; }
    else if (/انشاء|اعمال|نسبه تنفيذ|construction|تشطيب/.test(t)) { type = "إنشاءات"; tag = "cons"; }

    /* الأهمية: فرق السعر عن آخر تسجيل هو الفيصل */
    var imp = "low", why = "تحديث روتيني";
    if (prev && fields.price && prev.price) {
      var dv = (fields.price.v - prev.price) / prev.price * 100;
      if (Math.abs(dv) >= 5) { imp = "hot"; why = (dv < 0 ? "نزول" : "رفع") + " " + Math.abs(dv).toFixed(1) + "% عن آخر سعر مسجّل"; }
      else if (Math.abs(dv) >= 1.5) { imp = "mid"; why = "تغيّر " + dv.toFixed(1) + "% عن آخر سعر"; }
      else { imp = "low"; why = "نفس السعر المسجّل — تكرار"; }
    } else if (tag === "launch") { imp = "hot"; why = "إطلاق جديد"; }
    else if (fields.cashDisc && fields.cashDisc.v >= 25) { imp = "hot"; why = "خصم كاش " + fields.cashDisc.v + "%"; }
    else if (!prev) { imp = "mid"; why = "أول تسجيل للوحدة دي"; }

    return { type: type, tag: tag, importance: imp, why: why };
  }

  /* ---------- 6. كواشف الفرص ----------
     كل كاشف بيرجع سببه. مفيش تنبيه من غير سبب. */
  function detect(ctx) {
    /* ctx = { fields, prev, districtPpm, pool, dupCount, trueCost, realPpm } */
    var hits = [];
    var f = ctx.fields;

    if (ctx.prev && f.price && ctx.prev.price) {
      var dv = (f.price.v - ctx.prev.price) / ctx.prev.price * 100;
      if (dv <= -3) hits.push({ k: "drop", t: "نزول سعر", c: "up",
        why: "أقل من آخر سعر مسجّل بـ" + Math.abs(dv).toFixed(1) + "% (" + ctx.prev.date + ")" });
      if (dv >= 4) hits.push({ k: "rise", t: "رفع سعر", c: "dn",
        why: "أعلى من آخر سعر مسجّل بـ" + dv.toFixed(1) + "% — حجة إغلاق للسيلز" });
    }
    if (ctx.realPpm && ctx.districtPpm) {
      var v = (ctx.realPpm - ctx.districtPpm) / ctx.districtPpm * 100;
      if (v <= -5) hits.push({ k: "under", t: "تحت متوسط الحي", c: "up",
        why: "المتر الحقيقي أقل من متوسط الحي بـ" + Math.abs(v).toFixed(0) + "%" });
      if (v >= 8) hits.push({ k: "over", t: "فوق متوسط الحي", c: "dn",
        why: "أعلى من متوسط الحي بـ" + v.toFixed(0) + "% — يتراجع قبل النشر" });
    }
    if (f.cashDisc && f.cashDisc.v >= 25) hits.push({ k: "disc", t: "خصم استثنائي", c: "up",
      why: "خصم كاش " + f.cashDisc.v + "% — السعر المعلن بقى مرجع غير صالح" });
    /* كل مطوّر له جروب واحد — فالتكرار معناه إن المطوّر نفسه بيعيد طرح نفس الوحدة.
       وده أقوى من التكرار بين جروبات: معناه الوحدة مش بتتباع. */
    if (ctx.repost && ctx.repost.times >= 3) {
      var tr = ctx.repost.trend;
      hits.push({ k: "repost", t: "إعادة طرح", c: tr < -2 ? "up" : "wrn",
        why: "رابع طرح لنفس الوحدة من نفس الجروب خلال " + ctx.repost.days + " يوم"
          .replace("رابع", ctx.repost.times === 3 ? "تالت" : ctx.repost.times === 4 ? "رابع" : ctx.repost.times + " طرح") +
          (tr ? " · السعر " + (tr < 0 ? "نزل " : "طلع ") + Math.abs(tr).toFixed(1) + "% من أول طرح" : "") +
          (tr < -2 ? " — فرصة تفاوض حقيقية" : " — الوحدة مش بتتباع") });
    }
    if (ctx.matches && ctx.matches.length) hits.push({ k: "match", t: "عميل مستني", c: "up",
      why: ctx.matches.length + " طلب مسجّل بينطبق على الوحدة دي" });
    if (ctx.prev && f.area && ctx.prev.area && f.area.v !== ctx.prev.area)
      hits.push({ k: "conflict", t: "تناقض", c: "dn",
        why: "المساحة " + f.area.v + " م² والمسجّل عندنا " + ctx.prev.area + " م² — يتراجع" });
    return hits;
  }

  /* ---------- 7. بصمة التكرار ---------- */
  function fingerprint(fields, dev) {
    if (!fields.price || !fields.area) return null;
    var p = Math.round(fields.price.v / 1000) * 1000;   // تقريب ±ألف
    return [dev || "?", fields.area.v, Math.round(p / 20000)].join("|");
  }

  /* ---------- 8. التعلّم بالتصحيح ----------
     الموظف صحّح حقل → بنطلع منه قاعدة تتسجّل في نموذج المرسل */
  function learn(profile, field, line, value) {
    profile = profile || { rules: {}, corrections: 0 };
    var nl = norm(line);
    /* الكلمة الدالة = أطول مقطع عربي/إنجليزي قبل الرقم */
    var before = nl.split(String(value))[0] || nl;
    var words = before.replace(/[^؀-ۿa-zA-Z ]/g, " ").trim().split(/\s+/);
    var kw = words.slice(-2).join(" ").trim() || words[words.length - 1] || "";
    if (!kw) return profile;
    var ns = numsIn(nl);
    profile.rules = profile.rules || {};
    profile.rules[field] = {
      kw: kw,
      pick: ns.indexOf(Number(value)) === ns.length - 1 ? "last" : "first",
      min: Math.max(0, Math.floor(Number(value) * 0.1))
    };
    profile.corrections = (profile.corrections || 0) + 1;
    profile.updated = new Date().toISOString().slice(0, 10);
    return profile;
  }

  /* نضج النموذج — بيحدد إمتى نعتمد رسايله أوتوماتيك */
  function maturity(profile) {
    var n = profile && profile.rules ? Object.keys(profile.rules).length : 0;
    var seen = (profile && profile.seen) || 0;
    if (n >= 4 && seen >= 10) return { lvl: "ناضج", c: "up", pct: 100, auto: true };
    if (n >= 2 && seen >= 5) return { lvl: "بيتعلّم", c: "wrn", pct: 60, auto: false };
    return { lvl: "جديد", c: "dn", pct: Math.min(40, seen * 8), auto: false };
  }

  w.MQParse = {
    norm: norm, lines: lines, read: read, quality: quality, classify: classify,
    detect: detect, fingerprint: fingerprint, learn: learn, maturity: maturity,
    RULES: RULES
  };
})(window);
