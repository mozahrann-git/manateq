/* مناطق · البوابات
   اللينكات اللي بتتبعت للسيلز، واللي بيطلبوا إضافته.
   الصفحة دي بتكلّم خط الاستقبال الحقيقي — مش بيانات تجريبية.
   التوكن بيتكتب مرة وبيقعد في الجلسة بس، ومش مكتوب في أي ملف. */
(function (w, d) {
  "use strict";
  var M = w.MQ;
  M.buildAdminHeader("admin-portal.html");

  var API = (w.MQ_API || "").replace(/\/+$/, "");
  var REPS = [], SUBS = [];

  var $ = function (id) { return d.getElementById(id); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g,
      function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; });
  }
  function when(ts) {
    if (!ts) return "—";
    var m = Math.round((Date.now() - ts) / 60000);
    if (m < 60) return "من " + m + " دقيقة";
    if (m < 1440) return "من " + Math.round(m / 60) + " ساعة";
    return "من " + Math.round(m / 1440) + " يوم";
  }
  /* التوكن بييجي من Firebase مع كل نداء — ومبيتخزّنش في أي حتة */
  function api(path, opts) {
    opts = opts || {};
    return w.MQAuth.token().then(function (tok) {
      return w.fetch(API + "/api/" + path, {
        method: opts.method || "GET",
        headers: Object.assign({ authorization: "Bearer " + tok },
          opts.body ? { "content-type": "application/json" } : {}),
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; })
        .then(function (j) { return { status: r.status, json: j }; });
    });
  }

  /* ---------- حالة الاتصال ---------- */
  function conn(state, msg) {
    $("cState").className = "cstate " + state;
    $("cState").innerHTML = msg;
    $("pWrap").hidden = state !== "on";
  }
  function connect() {
    if (!API) {
      conn("off", "<b>خط الاستقبال لسه متحطّش.</b> افتح <code>assets/js/api.js</code> وحطّ دومين السيرفر.");
      return;
    }
    conn("wait", "بنوصل…");
    api("stats").then(function (r) {
      if (r.status === 401) {
        conn("off", "<b>السيرفر رفض دخولك.</b> " + (r.json && r.json.why ? r.json.why : "") +
          " — اتأكد إن إيميلك في <code>MQ_ADMIN_EMAILS</code>.");
        return;
      }
      if (r.status !== 200) { conn("off", "<b>السيرفر مش بيرد.</b>"); return; }
      conn("on", '<b class="up">متصل</b> · ' + r.json.total + " رسالة · " + r.json.reps + " سيلز");
      load();
    }).catch(function () { conn("off", "<b>مش قادر أوصل للسيرفر.</b> اتأكد إنه شغّال."); });
  }

  /* ---------- التحميل ---------- */
  function load() {
    return Promise.all([api("reps"), api("subs")]).then(function (res) {
      REPS = (res[0].json && res[0].json.rows) || [];
      SUBS = (res[1].json && res[1].json.rows) || [];
      line(); subs(); reps();
    });
  }

  function line() {
    var linked = REPS.filter(function (r) { return r.link; }).length;
    var pend = SUBS.filter(function (s) { return s.status === "pending"; }).length;
    [["سيلز مسجّل", REPS.length, "sig"],
     ["ليهم بوابة", linked, linked ? "up" : "wrn"],
     ["لسه من غير", REPS.length - linked, REPS.length - linked ? "wrn" : "up"],
     ["مستنّي تعريف", REPS.filter(function (r) { return r.pending; }).length, "dn"],
     ["طلبات مستنّية", pend, pend ? "dn" : "up"],
     ["اتنشر منهم", SUBS.filter(function (s) { return s.status === "approved"; }).length, "up"]]
    .forEach(function (x, i) {
      if (i === 0) $("pline").innerHTML = "";
      $("pline").innerHTML += '<div class="ops1"><p class="l">' + x[0] + '</p>' +
        '<p class="v ' + x[2] + '">' + x[1] + '</p></div>';
    });
  }

  /* ---------- طلبات السيلز ---------- */
  function subs() {
    var pend = SUBS.filter(function (s) { return s.status === "pending"; });
    $("sCount").textContent = pend.length ? pend.length + " مستنّي" : "مفيش جديد";
    $("sList").innerHTML = SUBS.length ? SUBS.map(function (s) {
      var ST = { pending: ["مستنّي", "n"], approved: ["اتنشر", "o"], rejected: ["اترفض", "b"] };
      var st = ST[s.status] || ST.pending;
      return '<div class="subrow"><div class="sub1">' +
        '<span class="vd ' + st[1] + '">' + st[0] + '</span>' +
        '<b>' + esc(s.name) + '</b>' +
        '<span class="mut" style="font-size:11.5px">' + esc(s.by || "") +
          (s.dev ? " · " + esc(s.dev) : "") + " · " + when(s.at) + '</span></div>' +
        (s.dist || s.del || s.note
          ? '<p class="sub2">' + [s.dist && ("الحي: " + esc(s.dist)),
              s.del && ("التسليم: " + esc(s.del)), s.note && esc(s.note)]
              .filter(Boolean).join(" · ") + '</p>' : "") +
        (s.status === "pending"
          ? '<div class="acts"><button class="b1" type="button" data-ok="' + s.id + '">اعتمد وانشر</button>' +
            '<button class="btn" type="button" data-no="' + s.id + '">ارفض</button></div>'
          : "") + '</div>';
    }).join("") : '<p class="empty">مفيش طلبات لسه.</p>';
  }
  $("sList").addEventListener("click", function (e) {
    var okb = e.target.closest("[data-ok]"), nob = e.target.closest("[data-no]");
    if (!okb && !nob) return;
    var id = (okb || nob).getAttribute(okb ? "data-ok" : "data-no");
    var note = "";
    if (nob) { note = w.prompt("تكتبله سبب الرفض؟ (هيشوفه في بوابته)") || ""; }
    api("subdecide", { method: "POST", body: {
      id: id, status: okb ? "approved" : "rejected", who: "محمد زهران", note: note } })
      .then(function () { toast(okb ? "اتعتمد — ظهر في بوابته" : "اترفض"); load(); });
  });

  /* ---------- السيلز وبواباتهم ---------- */
  function reps() {
    $("rTb").innerHTML = REPS.length ? REPS.map(function (r) {
      return "<tr" + (r.pending ? " class='me'" : "") + ">" +
        "<td><b>" + esc(r.nm || "—") + "</b>" +
          (r.pending ? "<br><span class='mut' style='font-size:10.5px'>مستنّي تعريف</span>" : "") + "</td>" +
        "<td>" + esc(r.dev || "—") + "</td>" +
        "<td class='num mut'>" + esc(r.phone) + "</td>" +
        "<td class='num'>" + ((r.projects || []).length) + "</td>" +
        "<td class='num mut'>" + ((r.profile && r.profile.seen) || 0) + "</td>" +
        "<td style='white-space:nowrap'>" + (r.link
          ? "<button class='fx' type='button' data-copy='" + esc(r.phone) + "'>انسخ اللينك</button> " +
            "<button class='fx' type='button' data-rot='" + esc(r.phone) + "'>جدّده</button> " +
            "<button class='fx' type='button' data-rev='" + esc(r.phone) + "'>ألغِه</button>"
          : "<button class='b1' type='button' data-new='" + esc(r.phone) + "' style='padding:5px 12px;font-size:11px'>اعمل بوابة</button>") +
        "</td></tr>";
    }).join("") : "<tr><td colspan='6'><p class='empty'>مفيش سيلز لسه. استورد الشيت الأول.</p></td></tr>";
    M.stagger($("rTb"));
  }
  $("rTb").addEventListener("click", function (e) {
    var b = e.target.closest("[data-new],[data-rot],[data-rev],[data-copy]");
    if (!b) return;
    var phone = b.getAttribute("data-new") || b.getAttribute("data-rot") ||
                b.getAttribute("data-rev") || b.getAttribute("data-copy");
    if (b.hasAttribute("data-copy")) {
      var r = REPS.filter(function (x) { return x.phone === phone; })[0];
      copy(r && r.link); return;
    }
    if (b.hasAttribute("data-rev")) {
      if (!w.confirm("تلغي بوابة " + phone + "؟ اللينك اللي معاه هيبطّل يشتغل.")) return;
      api("unlink", { method: "POST", body: { phone: phone } })
        .then(function () { toast("اتلغت"); load(); });
      return;
    }
    var rotate = b.hasAttribute("data-rot");
    if (rotate && !w.confirm("تجدّد اللينك؟ القديم هيبطّل على طول.")) return;
    api("link", { method: "POST", body: { phone: phone, rotate: rotate } })
      .then(function (res) {
        if (res.json.link) { copy(res.json.link); toast(rotate ? "لينك جديد — اتنسخ" : "البوابة اتعملت — اللينك اتنسخ"); }
        load();
      });
  });
  function copy(t) {
    if (!t) return;
    var ta = d.createElement("textarea");
    ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
    d.body.appendChild(ta); ta.select();
    try { d.execCommand("copy"); toast("اتنسخ ✓"); } catch (e) { w.prompt("انسخه:", t); }
    ta.remove();
  }
  function toast(t) {
    var el = d.createElement("div"); el.className = "toast"; el.textContent = t;
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    setTimeout(function () { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 300); }, 3600);
  }

  /* مش بنحاول نجيب أي بيانات قبل ما الحارس يعدّي */
  (w.MQAuth ? w.MQAuth.ready() : Promise.resolve(null)).then(function (u) {
    if (u) connect();
  });
  M.markSections(); M.reveal();
})(window, document);
