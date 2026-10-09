/* مناطق · بوابة السيلز
   صفحة السيلز هو. مشاريعه، أرقامها، وإضافة مشروع جديد.
   اللينك في الهاش مش في المسار — عشان ميدخلش في سجلات الاستضافة. */
(function (w, d) {
  "use strict";
  var API = (w.MQ_API || "").replace(/\/+$/, "");
  var TOKEN = (w.location.hash || "").replace(/^#/, "").trim();
  var ME = null;

  var $ = function (id) { return d.getElementById(id); };
  function f0(n) { return (n || 0).toLocaleString("en-US"); }
  function when(ts) {
    if (!ts) return "—";
    var m = Math.round((Date.now() - ts) / 60000);
    if (m < 2) return "دلوقتي";
    if (m < 60) return "من " + m + " دقيقة";
    if (m < 1440) return "من " + Math.round(m / 60) + " ساعة";
    return "من " + Math.round(m / 1440) + " يوم";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g,
      function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; });
  }

  function api(path, opts) {
    opts = opts || {};
    var url = API + "/api/portal/" + path + (path.indexOf("?") > -1 ? "&" : "?") + "t=" + encodeURIComponent(TOKEN);
    return w.fetch(url, {
      method: opts.method || "GET",
      headers: opts.body ? { "content-type": "application/json" } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        return { status: r.status, json: j };
      });
    });
  }

  function fail(title, note) {
    $("pLoad").hidden = true;          /* من غير ده الرسالة بتتكتب في حتة مخفية */
    $("pBody").hidden = false;
    $("pBody").innerHTML =
      '<div class="pempty"><p class="lbl">MANATEQ · بوابة الشركاء</p>' +
      '<h2>' + esc(title) + '</h2><p class="note">' + note + '</p></div>';
  }

  /* ---------- الرسم ---------- */
  function render() {
    var r = ME.rep, v = ME.views, m = ME.messages, mo = ME.model;

    $("pName").textContent = r.nm || "—";
    $("pDev").textContent = r.dev || "مطوّر لسه متسجّلش";
    $("pReg").textContent = r.reg || "—";
    d.title = (r.nm || "البوابة") + " · مناطق";

    /* الأرقام اللي بتخلّيه يرجع */
    var big = [
      ["مشاهدات مشاريعك", f0(v.week), "آخر 7 أيام", "sig"],
      ["من أول ما بدأنا", f0(v.all), "مشاهدة", "up"],
      ["رسايلك اللي وصلتنا", f0(m.total), m.week + " الأسبوع ده", "mut"],
      ["اتنشرت على مناطق", f0(m.approved), "وحدة وتحديث", "up"]
    ];
    $("pNums").innerHTML = big.map(function (x) {
      return '<div class="ops1"><p class="l">' + x[0] + '</p>' +
        '<p class="v ' + x[3] + '">' + x[1] + '</p>' +
        '<p class="l" style="margin-top:5px">' + esc(x[2]) + '</p></div>';
    }).join("");

    /* مشاريعه */
    var ps = r.projects || [];
    $("pProjN").textContent = ps.length ? ps.length + " مشروع" : "لسه مفيش";
    $("pProj").innerHTML = ps.length ? ps.map(function (p, i) {
      var vv = (v.byProject || {})[p] || { week: 0, all: 0 };
      return '<a class="prow" style="--i:' + i + '" target="_blank" rel="noopener" href="' +
        esc((w.MQ_SITE || "") + "projects.html?p=" + encodeURIComponent(p)) + '">' +
        '<span class="mt2"><b>' + esc(p) + '</b><i>على مناطق · اضغط تشوف الملف</i></span>' +
        '<span class="mv"><b class="n">' + f0(vv.week) + '</b><i>7 أيام</i></span>' +
        '<span class="mv"><b class="n mut">' + f0(vv.all) + '</b><i>الكل</i></span></a>';
    }).join("") :
      '<p class="empty">مفيش مشاريع مربوطة باسمك لسه. ضيف مشروعك من تحت وهيتراجع ويتنشر.</p>';

    /* نموذج قراءته — ده بيشرحله ليه التصحيح مهم */
    $("pModel").innerHTML =
      '<p class="note" style="margin:0 0 10px">مناطق بتتعلّم طريقة كتابتك إنت بالذات. كل ما تصحّحلنا مرة، ' +
      'رسايلك بتتقرا أدق — ومش بنسألك على نفس الحاجة تاني.</p>' +
      '<div class="pbars">' +
        bar("رسايل اتقرت", mo.seen, 30) +
        bar("قواعد اتعلمناها منك", mo.rules, 6) +
        bar("تصحيحات منك", mo.corrections, 6) +
      '</div>';

    /* طلباته */
    var ST = { pending: ["تحت المراجعة", "n"], approved: ["اتنشر", "o"], rejected: ["اترفض", "b"] };
    $("pSubs").innerHTML = ME.submissions.length ? ME.submissions.map(function (s) {
      var st = ST[s.status] || ST.pending;
      return '<div class="srow"><span class="vd ' + st[1] + '">' + st[0] + '</span>' +
        '<b>' + esc(s.name) + '</b>' +
        '<span class="mut" style="font-size:11px">' + when(s.at) + '</span>' +
        (s.note ? '<span class="snote">' + esc(s.note) + '</span>' : '') + '</div>';
    }).join("") : '<p class="hint">مفيش طلبات.</p>';

    $("pLast").textContent = m.last ? "آخر رسالة وصلتنا منك " + when(m.last) : "لسه مجاش منك حاجة";
  }

  function bar(label, val, max) {
    var pct = Math.min(100, Math.round((val / max) * 100));
    return '<div class="pbar"><span class="l">' + label + '</span>' +
      '<span class="t"><i style="width:' + pct + '%"></i></span>' +
      '<b class="n">' + val + '</b></div>';
  }

  /* ---------- إضافة مشروع ---------- */
  function bindForm() {
    $("sBtn").addEventListener("click", function () {
      var nm = $("sName").value.trim();
      if (nm.length < 2) { bad("sName"); return; }
      $("sBtn").disabled = true;
      api("submit", { method: "POST", body: {
        name: nm, dist: $("sDist").value.trim(),
        del: $("sDel").value.trim(), note: $("sNote").value.trim()
      } }).then(function (r) {
        $("sBtn").disabled = false;
        if (r.json.error) { toast(r.json.error); return; }
        $("sName").value = ""; $("sDist").value = ""; $("sDel").value = ""; $("sNote").value = "";
        toast("وصلنا ✓ هنراجعه ونرد عليك");
        load();
      }).catch(function () { $("sBtn").disabled = false; toast("مفيش اتصال — جرّب تاني"); });
    });
  }
  function bad(id) {
    var e = $(id); e.classList.add("bad"); e.focus();
    setTimeout(function () { e.classList.remove("bad"); }, 900);
  }
  function toast(t) {
    var el = d.createElement("div"); el.className = "toast"; el.textContent = t;
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    setTimeout(function () { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 300); }, 3800);
  }

  /* ---------- التحميل ---------- */
  function load() {
    return api("me").then(function (r) {
      if (r.status === 401) {
        fail("اللينك ده مش شغّال",
          "يا إما اتلغى يا إما اتكتب ناقص. كلّم مناطق على <b class=\"sig\">+20 10 2200 7733</b> ونبعتلك لينك جديد.");
        return;
      }
      if (r.status !== 200) { fail("في مشكلة مؤقتة", "جرّب تفتح اللينك تاني بعد شوية."); return; }
      ME = r.json;
      $("pBody").hidden = false;
      $("pLoad").hidden = true;
      render();
    }).catch(function () {
      fail("مش قادر أوصل لمناطق", "اتأكد إن النت شغّال وجرّب تاني.");
    });
  }

  /* ---------- الإقلاع ---------- */
  if (!API) {
    fail("البوابة لسه مش متوصّلة",
      "خط الاستقبال لسه متحطّش. لما يشتغل، اللينك ده هيفتح بوابتك على طول.");
    return;
  }
  if (!TOKEN) {
    fail("محتاج لينك بوابتك",
      "البوابة بتتفتح من اللينك اللي وصلك على الواتساب. لو ضاع منك، كلّمنا على <b class=\"sig\">+20 10 2200 7733</b>.");
    return;
  }
  bindForm();
  load();
  /* بيحدّث نفسه لو الصفحة فضلت مفتوحة */
  setInterval(function () { if (!d.hidden && ME) load(); }, 120000);
})(window, document);
