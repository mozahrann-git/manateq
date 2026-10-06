/* مناطق · شاشة الاستقبال
   الرسالة الخام جنب القراءة، وكل حقل مكتوب جنبه ثقته والسطر اللي اتاخد منه.
   التصحيح بيتحوّل لقاعدة في نموذج المرسل. */
(function (w, d) {
  "use strict";
  var M = w.MQ, P = w.MQParse, A = w.MQ_ADMIN, D = M.D;
  var f0 = M.f0, pc = M.pc;

  M.buildAdminHeader("admin-inbox.html");

  /* ---------- حالة ---------- */
  var queue = A.QUEUE.slice();
  var profiles = {};
  A.REPS.forEach(function (r) { profiles[r.id] = JSON.parse(JSON.stringify(r.profile || { rules: {}, seen: 0 })); });
  var cur = 0, overrides = {}, log = A.LOG.slice();

  function repOf(id) { return A.REPS.filter(function (r) { return r.id === id; })[0]; }
  function msg() { return queue[cur]; }

  /* ---------- خط الإنتاج ---------- */
  function opsline() {
    var done = A.QUEUE.length - queue.length;
    var S = [
      ["الرقم المستقبل", A.LINE.number, "mono"],
      ["جروبات مرصودة", A.LINE.groups, "sig"],
      ["سيلز مسجّل", A.LINE.reps, "sig"],
      ["في الطابور", queue.length, queue.length > 5 ? "wrn" : "up"],
      ["اتعالج النهاردة", done + 41, "up"],
      ["نماذج ناضجة", A.REPS.filter(function (r) { return P.maturity(profiles[r.id]).auto; }).length, "up"]
    ];
    d.getElementById("opsline").innerHTML = S.map(function (x) {
      return '<div class="ops1"><p class="l">' + x[0] + '</p><p class="v ' + (x[2] === "mono" ? "mono" : x[2]) + '">' +
        x[1] + '</p></div>';
    }).join("");
  }

  /* ---------- الطابور ---------- */
  function qlist() {
    d.getElementById("qn").textContent = queue.length;
    d.getElementById("qlist").innerHTML = queue.map(function (m, i) {
      var r = repOf(m.rep) || { nm: "غير معروف", dev: "—" };
      var q = P.quality(P.read(m.raw, profiles[m.rep]).fields);
      var cls = q.score >= 8 ? "up" : q.score >= 5 ? "wrn" : "dn";
      return '<button class="qi" type="button" data-i="' + i + '" aria-pressed="' + (i === cur) + '">' +
        '<span class="qt"><b>' + r.nm + '</b><i class="n ' + cls + '">' + q.score + '</i></span>' +
        '<span class="qd">' + r.dev + '</span>' +
        '<span class="qm">' + m.raw.split("\n")[0].slice(0, 40) + '</span>' +
        '<span class="qa">' + m.at + '</span></button>';
    }).join("") || '<p class="empty" style="padding:28px 14px">الطابور فاضي. كل اللي وصل اتعالج.</p>';
    M.stagger(d.getElementById("qlist"));
  }
  d.getElementById("qlist").addEventListener("click", function (e) {
    var b = e.target.closest("[data-i]");
    if (!b) return;
    cur = +b.dataset.i; overrides = {}; render();
  });

  /* ---------- القراءة ---------- */
  var LBL = { price:"السعر المعلن", area:"المساحة", garage:"الجراج", maint:"وديعة الصيانة",
    club:"اشتراك النادي", downPct:"نسبة المقدّم", down:"قيمة المقدّم", months:"عدد الشهور",
    years:"سنين", inst:"القسط", cashDisc:"خصم الكاش", cashPrice:"السعر بعد الخصم",
    rooms:"الغرف", delivery:"التسليم", code:"كود الوحدة" };
  var ORDER = ["price","area","cashDisc","cashPrice","garage","maint","club","downPct","months","inst","delivery","rooms","code"];

  function render() {
    var m = msg();
    if (!m) {
      d.getElementById("mId").textContent = "—";
      d.getElementById("mRep").textContent = "الطابور فاضي";
      d.getElementById("mSub").textContent = "كل اللي وصل النهاردة اتعالج.";
      d.getElementById("rawbox").value = "";
      d.getElementById("flist").innerHTML = "";
      d.getElementById("sigs").innerHTML = "";
      d.getElementById("verdictBox").innerHTML = "";
      d.getElementById("mScore").textContent = "—";
      opsline(); qlist();
      return;
    }
    var r = repOf(m.rep) || { nm:"رقم غير مسجّل", dev:"—", reg:"—", projects:[] };
    var prof = profiles[m.rep] || { rules:{}, seen:0 };
    d.getElementById("mId").textContent = m.id + " · " + m.at;
    d.getElementById("mRep").textContent = r.nm;
    d.getElementById("mSub").innerHTML = r.dev + ' · ' + r.reg +
      (r.projects.length ? ' · <span class="mut">' + r.projects.join(" · ") + '</span>' : '') +
      ' · <span class="n mut">' + (r.phone || "") + '</span>';
    d.getElementById("rawbox").value = m.raw;

    var mat = P.maturity(prof);
    d.getElementById("profChip").innerHTML = 'نموذج القراءة <b class="' + mat.c + '">' + mat.lvl + '</b>' +
      ' · ' + Object.keys(prof.rules || {}).length + ' قاعدة' +
      (mat.auto ? ' · <b class="up">اعتماد آلي</b>' : '');
    parse();
    opsline(); qlist();
  }

  function parse() {
    var m = msg(); if (!m) return;
    var r = repOf(m.rep) || {};
    var prof = profiles[m.rep] || { rules:{} };
    var raw = d.getElementById("rawbox").value;
    var res = P.read(raw, prof);
    var F = res.fields;
    Object.keys(overrides).forEach(function (k) {
      F[k] = { v: overrides[k], c: 1, line: "تصحيح يدوي", rule: "صحّحه الموظف", fixed: true };
    });
    var q = P.quality(F);

    var sc = d.getElementById("mScore");
    sc.className = "qscore " + (q.score >= 8 ? "up" : q.score >= 5 ? "wrn" : "dn");
    sc.innerHTML = '<b class="n">' + q.score + '</b><i>/10</i>';

    /* الحقول */
    var html = ORDER.filter(function (k) { return F[k] || ["price","area","delivery"].indexOf(k) > -1; })
      .map(function (k) {
        var f = F[k];
        if (!f) {
          return '<div class="fr miss"><span class="fk">' + (LBL[k] || k) + '</span>' +
            '<span class="fv">غير مذكور في الرسالة</span>' +
            '<button class="fx" type="button" data-fix="' + k + '">أضف</button></div>';
        }
        var cls = f.c >= 0.9 ? "up" : f.c >= 0.7 ? "wrn" : "dn";
        var v = typeof f.v === "number" && f.v > 999 ? f0(f.v) : f.v;
        return '<div class="fr' + (f.fixed ? " fixed" : "") + '">' +
          '<span class="fk">' + (LBL[k] || k) + '</span>' +
          '<span class="fv n">' + v + '</span>' +
          '<span class="fc ' + cls + '" title="ثقة القراءة">' + Math.round(f.c * 100) + '%</span>' +
          '<button class="fx" type="button" data-fix="' + k + '">صحّح</button>' +
          '<span class="fsrc">' + f.rule + (f.learned ? ' <b class="up">·مُتعلَّم</b>' : '') +
          '<br><i>' + (f.line || "—").slice(0, 64) + '</i></span></div>';
      }).join("");
    d.getElementById("flist").innerHTML = html;
    M.stagger(d.getElementById("flist"));

    /* الحساب والحكم */
    var dev = r.dev || "", fp = F.area ? dev + "|" + F.area.v : null;
    var prev = fp && A.HISTORY[fp] ? A.HISTORY[fp] : null;
    var cls2 = P.classify(raw, F, prev);
    var trueCost = F.price ? F.price.v + (F.garage ? F.garage.v : 0) +
      (F.price.v * ((F.maint ? F.maint.v : 5) / 100)) : 0;
    var realPpm = trueCost && F.area ? trueCost / F.area.v : 0;
    var dist = guessDistrict(raw, r.reg);
    var dPpm = dist ? M.districtPpm(r.reg, dist) : (D.REGIONS[r.reg] ? D.REGIONS[r.reg].ppm : 0);

    d.getElementById("verdictBox").innerHTML =
      '<div class="dr"><span>التصنيف</span><b>' + cls2.type + '</b></div>' +
      '<div class="dr"><span>الأهمية</span><b class="' +
        (cls2.importance === "hot" ? "dn" : cls2.importance === "mid" ? "wrn" : "mut") + '">' +
        (cls2.importance === "hot" ? "عاجل" : cls2.importance === "mid" ? "مؤثر" : "روتيني") +
        '</b><i>' + cls2.why + '</i></div>' +
      '<div class="dr"><span>الحي المرجّح</span><b>' + (dist || "—") + '</b>' +
        '<i>متوسط متره ' + (dPpm ? f0(dPpm) : "—") + '</i></div>' +
      '<div class="dr"><span>التكلفة الحقيقية</span><b class="sig n">' + (trueCost ? f0(trueCost) : "—") + '</b>' +
        '<i>السعر + الجراج + وديعة الصيانة</i></div>' +
      '<div class="dr"><span>سعر المتر الحقيقي</span><b class="sig n">' + (realPpm ? f0(realPpm) : "—") + '</b>' +
        (realPpm && dPpm ? '<i class="' + (realPpm < dPpm ? "up" : "dn") + '">' +
          pc((realPpm - dPpm) / dPpm * 100) + ' مقابل الحي</i>' : '') + '</div>';

    /* كواشف الفرص */
    var hits = P.detect({
      fields: F, prev: prev, districtPpm: dPpm, realPpm: realPpm,
      repost: fp ? A.repostOf(fp) : null,
      matches: F.price && F.area ? matchPool(trueCost, F.area.v, r.reg) : []
    });
    d.getElementById("sigs").innerHTML = hits.length
      ? '<p class="lbl" style="margin-bottom:8px">كواشف الفرص</p>' + hits.map(function (h) {
          return '<div class="sig1 ' + h.c + '"><b>' + h.t + '</b><span>' + h.why + '</span></div>';
        }).join("")
      : '<p class="hint">مفيش كاشف اشتغل على الرسالة دي.</p>';

    /* التوصية */
    var auto = P.maturity(profiles[m.rep] || {}).auto && q.score >= 8;
    d.getElementById("actHint").innerHTML = q.score < 4
      ? '<b class="dn">جودة ضعيفة.</b> الرسالة دي مفيهاش بيانات كفاية — الأرجح ترفض.'
      : auto
        ? '<b class="up">مؤهّلة للاعتماد الآلي.</b> نموذج ' + (repOf(m.rep) || {}).nm + ' ناضج والجودة ' + q.score + '/10.'
        : q.missing.length
          ? 'ناقص: <b class="wrn">' + q.missing.map(function (x) { return LBL[x] || x; }).join(" · ") + '</b> — صحّحها أو اعتمد بدونها وهتتكتب «غير محددة».'
          : 'القراءة مكتملة. اعتمد عشان تتسجّل في الوحدات وسجل الأسعار والنبض.';
  }

  /* تخمين الحي من نص الرسالة */
  function guessDistrict(raw, reg) {
    if (!reg || !D.REGIONS[reg]) return null;
    var t = P.norm(raw);
    var hit = null;
    D.REGIONS[reg].districts.forEach(function (x) {
      if (t.indexOf(P.norm(x[0])) > -1) hit = x[0];
    });
    return hit;
  }
  function matchPool(cost, area, reg) {
    return D.POOL.filter(function (q) {
      return (!reg || q.reg === reg) && cost >= q.bmin * 0.95 && cost <= q.bmax * 1.05 &&
             area >= q.amin && area <= q.amax;
    });
  }

  /* ---------- التصحيح والتعلّم ---------- */
  var fixField = null;
  d.getElementById("flist").addEventListener("click", function (e) {
    var b = e.target.closest("[data-fix]");
    if (!b) return;
    fixField = b.dataset.fix;
    var m = msg(), r = repOf(m.rep) || { nm: "المرسل" };
    var res = P.read(d.getElementById("rawbox").value, profiles[m.rep]);
    var f = res.fields[fixField];
    d.getElementById("fixTitle").textContent = LBL[fixField] || fixField;
    d.getElementById("fixLine").innerHTML = f
      ? 'النظام قرأها <b class="n">' + f.v + '</b> من السطر:<br><i class="mut">' + f.line + '</i>'
      : 'الحقل ده مش موجود في القراءة. اكتب قيمته والسطر اللي فيه.';
    d.getElementById("fixVal").value = f ? f.v : "";
    d.getElementById("fixWho").textContent = r.nm;
    var g = d.getElementById("fixGate");
    g.hidden = false; requestAnimationFrame(function () { g.classList.add("in"); });
    setTimeout(function () { d.getElementById("fixVal").focus(); }, 120);
  });
  function closeFix() {
    var g = d.getElementById("fixGate");
    g.classList.remove("in");
    setTimeout(function () { g.hidden = true; }, 200);
  }
  d.getElementById("fixX").onclick = closeFix;
  d.getElementById("fixGate").onclick = function (e) { if (e.target === this) closeFix(); };
  d.getElementById("fixOk").onclick = function () {
    var v = d.getElementById("fixVal").value.trim().replace(/,/g, "");
    if (!v) return;
    var num = Number(v);
    overrides[fixField] = isNaN(num) ? v : num;
    var m = msg();
    if (d.getElementById("fixLearn").checked && !isNaN(num)) {
      var raw = d.getElementById("rawbox").value;
      var line = P.lines(raw).filter(function (L) { return L.indexOf(String(num)) > -1; })[0] || "";
      if (line) {
        profiles[m.rep] = P.learn(profiles[m.rep], fixField, line, num);
        toast("اتسجّلت قاعدة جديدة في نموذج " + (repOf(m.rep) || {}).nm +
              " — الرسايل الجاية منه هتتقري صح لوحدها");
      }
    }
    closeFix(); parse(); opsline();
  };

  /* ---------- القرارات ---------- */
  function decide(act, note) {
    var m = msg(); if (!m) return;
    var r = repOf(m.rep) || { nm: "—" };
    log.unshift({ at: "دلوقتي", who: "محمد زهران", act: act, on: m.id, note: note });
    queue.splice(cur, 1);
    if (cur >= queue.length) cur = Math.max(0, queue.length - 1);
    overrides = {};
    render(); drawLog();
  }
  d.getElementById("okBtn").onclick = function () {
    var raw = d.getElementById("rawbox").value;
    var m = msg(); if (!m) return;
    var F = P.read(raw, profiles[m.rep]).fields;
    var q = P.quality(F);
    decide("اعتمد", "جودة " + q.score + "/10 — اتسجّلت في الوحدات وسجل الأسعار والنبض");
    toast("اتسجّلت ✓ · ظهرت في الوحدات وسجل الأسعار ونبض السوق");
  };
  d.getElementById("noBtn").onclick = function () {
    var m = msg(); if (!m) return;
    var q = P.quality(P.read(d.getElementById("rawbox").value, profiles[m.rep]).fields);
    decide("رفض", q.score < 4 ? "جودة " + q.score + "/10 — مفيش بيانات" : "رفض يدوي");
  };
  d.getElementById("skipBtn").onclick = function () {
    if (queue.length < 2) return;
    var m = queue.splice(cur, 1)[0];
    queue.push(m);
    overrides = {};
    render();
  };
  d.getElementById("addBtn").onclick = function () {
    queue.unshift({ id: "M-" + (5600 + queue.length), rep: "R-001", at: "دلوقتي",
      raw: "الصق رسالة الواتساب هنا…" });
    cur = 0; overrides = {}; render();
    d.getElementById("rawbox").focus();
    d.getElementById("rawbox").select();
  };
  d.getElementById("rawbox").addEventListener("input", function () {
    var m = msg(); if (m) { m.raw = this.value; overrides = {}; parse(); qlist(); }
  });

  function drawLog() {
    d.getElementById("logTb").innerHTML = log.slice(0, 10).map(function (x) {
      var c = x.act.indexOf("رفض") > -1 ? "dn" : x.act.indexOf("صحّح") > -1 ? "wrn" : "up";
      return "<tr><td class='num mut'>" + x.at + "</td><td>" + x.who + "</td>" +
        "<td><b class='" + c + "'>" + x.act + "</b></td>" +
        "<td><span class='cd'>" + x.on + "</span></td>" +
        "<td class='mut' style='font-size:11.5px'>" + x.note + "</td></tr>";
    }).join("");
    M.stagger(d.getElementById("logTb"));
  }

  function toast(t) {
    var el = d.createElement("div");
    el.className = "toast"; el.textContent = t;
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    setTimeout(function () { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 300); }, 4200);
  }

  render(); drawLog(); M.reveal();
})(window, document);
