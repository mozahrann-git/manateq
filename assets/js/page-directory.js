/* مناطق · دليل الأرقام والجروبات */
(function (w, d) {
  "use strict";
  var M = w.MQ, P = w.MQParse, A = w.MQ_ADMIN, D = M.D;
  M.buildAdminHeader("admin-directory.html");

  var reps = A.REPS.slice();
  var profiles = {};
  reps.forEach(function (r) { profiles[r.id] = r.profile || { rules: {}, seen: r.seen || 0 }; });
  var sel = M.qs("r") || reps[0].id;
  var fReg = "الكل", fMat = "all";

  /* ---------- الخط المستقبل ---------- */
  d.getElementById("linebox").innerHTML =
    '<div class="lb1">' +
      '<p class="lbl">رقم الاستقبال المثبّت</p>' +
      '<p class="lnum n">' + A.LINE.number + '</p>' +
      '<p class="lst"><span class="bl"></span>' + A.LINE.status + ' من ' + A.LINE.since + '</p>' +
      '<p class="note" style="margin-top:11px">' + A.LINE.note + '</p>' +
    '</div>' +
    '<div class="lb2">' +
      '<div class="kpi" style="margin:0">' +
        '<div><p class="l">جروبات مرصودة</p><p class="v sig">' + A.LINE.groups + '</p></div>' +
        '<div><p class="l">سيلز مسجّل</p><p class="v sig">' + A.LINE.reps + '</p></div>' +
        '<div><p class="l">نماذج ناضجة</p><p class="v up">' +
          reps.filter(function (r) { return P.maturity(profiles[r.id]).auto; }).length + '</p></div>' +
        '<div><p class="l">محتاجة تدريب</p><p class="v wrn">' +
          reps.filter(function (r) { return !P.maturity(profiles[r.id]).auto; }).length + '</p></div>' +
      '</div>' +
      '<p class="note" style="margin-top:11px">النموذج بيتدرّب لوحده من تصحيحاتك في شاشة الاستقبال. أول ما يوصل 4 قواعد و10 رسائل، رسايل صاحبه بتتعتمد آلياً.</p>' +
    '</div>';

  /* ---------- الفلاتر ---------- */
  d.getElementById("segReg").innerHTML = ["الكل"].concat(Object.keys(D.REGIONS)).map(function (r, i) {
    return '<button type="button" data-v="' + r + '" aria-pressed="' + (i === 0) + '">' + r + '</button>';
  }).join("");
  function bind(id, attr, set) {
    d.getElementById(id).addEventListener("click", function (e) {
      var b = e.target.closest("[" + attr + "]");
      if (!b) return;
      set(b.getAttribute(attr));
      this.querySelectorAll("button").forEach(function (x) {
        x.setAttribute("aria-pressed", x === b ? "true" : "false");
      });
      table();
    });
  }
  bind("segReg", "data-v", function (v) { fReg = v; });
  bind("segMat", "data-m", function (v) { fMat = v; });

  /* ---------- الجدول ---------- */
  function table() {
    var list = reps.filter(function (r) {
      if (fReg !== "الكل" && r.reg !== fReg) return false;
      var auto = P.maturity(profiles[r.id]).auto;
      if (fMat === "auto" && !auto) return false;
      if (fMat === "new" && auto) return false;
      return true;
    });
    d.getElementById("repTb").innerHTML = list.map(function (r) {
      var acc = Math.round(r.ok / r.seen * 100);
      var mat = P.maturity(profiles[r.id]);
      var nRules = Object.keys(profiles[r.id].rules || {}).length;
      return "<tr class='link" + (r.id === sel ? " me" : "") + "' data-r='" + r.id + "'>" +
        "<td><b>" + r.nm + "</b><br><span class='mut' style='font-size:10.5px'>" + r.id + "</span></td>" +
        "<td class='num'>" + r.phone + "</td>" +
        "<td>" + r.dev + "</td>" +
        "<td class='mut' style='font-size:11.5px'>" + r.reg + "</td>" +
        "<td class='mut' style='font-size:11px'>" + r.projects.join(" · ") + "</td>" +
        "<td class='num'>" + r.seen + "</td>" +
        "<td class='num " + (acc >= 90 ? "up" : acc >= 75 ? "wrn" : "dn") + "'>" + acc + "%</td>" +
        "<td><span class='vd " + (mat.c === "up" ? "o" : mat.c === "wrn" ? "n" : "b") + "'>" + mat.lvl +
          "</span> <span class='mut' style='font-size:10.5px'>" + nRules + " قاعدة</span></td>" +
        "<td class='sig' style='font-size:11px;white-space:nowrap'>افتح نموذجه ←</td></tr>";
    }).join("") || "<tr><td colspan='9' class='mut' style='padding:22px;text-align:center'>مفيش سيلز بالفلتر ده.</td></tr>";
    M.stagger(d.getElementById("repTb"));
  }
  d.getElementById("repTb").addEventListener("click", function (e) {
    var tr = e.target.closest("[data-r]");
    if (!tr) return;
    sel = tr.dataset.r; table(); profile();
    d.getElementById("ruleList").scrollIntoView({ block: "center" });
  });

  /* ---------- نموذج القراءة ---------- */
  function profile() {
    var r = reps.filter(function (x) { return x.id === sel; })[0];
    var p = profiles[sel] || { rules: {} };
    var mat = P.maturity(p);
    var rules = Object.keys(p.rules || {});
    var LBL = { price:"السعر", area:"المساحة", garage:"الجراج", maint:"وديعة الصيانة",
      downPct:"نسبة المقدّم", months:"عدد الشهور", cashDisc:"خصم الكاش", delivery:"التسليم",
      inst:"القسط", club:"النادي", rooms:"الغرف" };

    d.getElementById("profNote").innerHTML =
      "نموذج <b>" + r.nm + "</b> · " + r.dev + " — القواعد دي اتعلّمها النظام من تصحيحاتك، ومش مكتوبة بإيد مبرمج.";

    d.getElementById("ruleList").innerHTML = rules.length ? rules.map(function (k) {
      var x = p.rules[k];
      return '<div class="fr"><span class="fk">' + (LBL[k] || k) + '</span>' +
        '<span class="fv" style="font-family:var(--body);font-weight:600">«' + x.kw + '»</span>' +
        '<span class="fcf up">✓</span><span></span>' +
        '<span class="fsrc">بياخد ' + (x.pick === "last" ? "آخر" : "أول") + ' رقم في السطر اللي فيه الكلمة دي' +
        (x.min ? ' · والرقم لازم يكون أكبر من ' + M.f0(x.min) : '') + '</span></div>';
    }).join("") : '<p class="empty" style="padding:24px">مفيش قواعد لسه. أول تصحيح ليه في شاشة الاستقبال هيبني أول قاعدة.</p>';
    M.stagger(d.getElementById("ruleList"));

    var acc = Math.round(r.ok / r.seen * 100);
    d.getElementById("matBox").innerHTML =
      '<div class="matv ' + mat.c + '"><b>' + mat.lvl + '</b>' +
        '<span class="gauge" style="margin-top:9px"><i data-w="' + mat.pct + '" style="background:var(--' +
        (mat.c === "up" ? "up" : mat.c === "wrn" ? "warn" : "down") + ')"></i></span></div>' +
      '<div class="sl" style="margin-top:12px">' +
        '<div><span>قواعد متعلّمة</span><b>' + rules.length + ' / 4</b></div>' +
        '<div><span>رسائل مستقبلة</span><b>' + r.seen + ' / 10</b></div>' +
        '<div><span>تصحيحات اتعملت</span><b>' + (p.corrections || 0) + '</b></div>' +
        '<div><span>دقة القراءة</span><b class="' + (acc >= 90 ? "up" : "wrn") + '">' + acc + '%</b></div>' +
        '<div><span>آخر تحديث للنموذج</span><b class="mut" style="font-size:11.5px">' + (p.updated || "—") + '</b></div>' +
        '<div class="f"><span>اعتماد آلي</span><b class="' + (mat.auto ? "up" : "dn") + '">' +
          (mat.auto ? "مفعّل" : "لسه") + '</b></div>' +
      '</div>' +
      '<p class="note" style="margin-top:11px">' + (mat.auto
        ? "رسايل " + r.nm + " بتتعتمد آلياً لما جودتها تعدّي 8/10 — من غير ما حد يراجعها."
        : "محتاج " + Math.max(0, 4 - rules.length) + " قاعدة و" + Math.max(0, 10 - r.seen) +
          " رسالة كمان عشان يتفعّل الاعتماد الآلي.") + '</p>';
    M.growBars();
  }

  /* ---------- تسجيل سيلز جديد ---------- */
  d.getElementById("addRep").onclick = function () {
    var el = d.createElement("div");
    el.className = "gate";
    el.innerHTML = '<div class="gbox" role="dialog" aria-modal="true">' +
      '<button class="gx" type="button">✕</button><p class="lbl">تسجيل جديد</p>' +
      '<h2>اربط سيلز بجروبه</h2>' +
      '<p class="gnote">الرقم ده هو اللي هيعرّف كل رسالة جاية منه. من غيره الرسالة بتدخل كمجهولة والقراءة بتضعف.</p>' +
      '<label class="glab">اسم السيلز</label><input class="ginp" id="nNm" style="font-family:var(--body)">' +
      '<label class="glab" style="margin-top:11px">رقم الواتساب</label><input class="ginp" id="nPh" type="tel" placeholder="+20 1xx xxx xxxx">' +
      '<label class="glab" style="margin-top:11px">المطوّر</label><input class="ginp" id="nDev" style="font-family:var(--body)">' +
      '<label class="glab" style="margin-top:11px">المنطقة</label>' +
      '<div class="seg" id="nReg" style="margin-top:5px">' + Object.keys(D.REGIONS).map(function (r, i) {
        return '<button type="button" data-v="' + r + '" aria-pressed="' + (i === 0) + '">' + r + '</button>';
      }).join("") + '</div>' +
      '<button class="b1 gbtn" type="button" id="nOk">سجّل واربط</button>' +
      '<p class="gfine">نموذج قراءته هيبدأ فاضي ويتعلّم من أول تصحيح.</p></div>';
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    var reg = Object.keys(D.REGIONS)[0];
    el.querySelector("#nReg").addEventListener("click", function (e) {
      var b = e.target.closest("[data-v]"); if (!b) return;
      reg = b.dataset.v;
      this.querySelectorAll("button").forEach(function (x) {
        x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    });
    function close() { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 220); }
    el.querySelector(".gx").onclick = close;
    el.onclick = function (e) { if (e.target === el) close(); };
    el.querySelector("#nOk").onclick = function () {
      var nm = el.querySelector("#nNm").value.trim();
      var ph = el.querySelector("#nPh").value.trim();
      var dev = el.querySelector("#nDev").value.trim();
      if (!nm || !ph || !dev) {
        [["#nNm", nm], ["#nPh", ph], ["#nDev", dev]].forEach(function (x) {
          if (!x[1]) { var i = el.querySelector(x[0]); i.classList.add("bad");
            setTimeout(function () { i.classList.remove("bad"); }, 900); } });
        return;
      }
      var id = "R-" + String(reps.length + 1).padStart(3, "0");
      var rec = { id: id, nm: nm, phone: ph, dev: dev, reg: reg, projects: [],
        seen: 0, ok: 0, since: "النهاردة", active: 1, profile: { rules: {}, seen: 0, corrections: 0 } };
      reps.push(rec); profiles[id] = rec.profile;
      A.LINE.reps = reps.length;
      sel = id; close(); table(); profile();
      toast("اتسجّل " + nm + " · " + dev + " — رسايله الجاية هتتعرّف من رقمه");
    };
  };

  function toast(t) {
    var el = d.createElement("div");
    el.className = "toast"; el.textContent = t;
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    setTimeout(function () { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 300); }, 4000);
  }

  table(); profile(); M.markSections(); M.reveal();
})(window, document);
