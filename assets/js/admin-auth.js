/* ============================================================
   مناطق · حارس لوحة الإدارة
   ------------------------------------------------------------
   بيقف قدام أي صفحة إدارة لحد ما الأدمن يسجّل دخوله بإيميله.

   مهم تفهم ده صح: الحارس ده **مريح مش آمن**. أي حد يقدر يعدّل
   الجافاسكريبت في متصفحه ويعدّي منه. الحماية الحقيقية على الخادم —
   هو اللي بيفحص التوكن ويقرّر يطلّع بيانات ولا لأ. فالصفحة ممكن
   تتفتح، لكن مش هيخرج منها رقم واحد من غير إذنه.
   ============================================================ */
(function (w, d) {
  "use strict";
  var CFG = w.MQ_FB || {};
  var SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  var AUTH = null, USER = null, READY = null;

  /* الواجهة بتستنى الحارس: MQAuth.ready() بترجع وعد بالتوكن */
  var waiters = [];
  w.MQAuth = {
    user: function () { return USER; },
    ready: function () { return READY; },
    token: function () {
      if (!AUTH || !AUTH.currentUser) return Promise.resolve("");
      return AUTH.currentUser.getIdToken();
    },
    signOut: function () { if (AUTH) AUTH.signOut().then(function () { w.location.reload(); }); }
  };

  function screen(title, note, btn) {
    var el = d.getElementById("mqGate");
    if (!el) {
      el = d.createElement("div");
      el.id = "mqGate"; el.className = "agate";
      d.body.appendChild(el);
    }
    el.hidden = false;
    el.innerHTML =
      '<div class="abox">' +
      '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" style="margin-bottom:12px">' +
      '<path d="M3 21V8l9-5 9 5v13" stroke="#FF7A1A" stroke-width="2.6" fill="none"/>' +
      '<path d="M9 21v-7h6v7" stroke="#FF7A1A" stroke-width="2.6" fill="none"/></svg>' +
      '<p class="lbl">MANATEQ · OPERATIONS</p>' +
      '<h2>' + title + '</h2>' +
      '<p class="gnote">' + note + '</p>' +
      (btn ? '<button class="b1" type="button" id="mqGoIn">' + btn + '</button>' : '') +
      '</div>';
    /* الصفحة نفسها متخبّية لحد ما يدخل */
    var m = d.querySelector("main"), h = d.querySelector("header");
    if (m) m.style.visibility = "hidden";
    if (h) h.style.visibility = "hidden";
    return el;
  }
  function open() {
    var el = d.getElementById("mqGate");
    if (el) el.hidden = true;
    var m = d.querySelector("main"), h = d.querySelector("header");
    if (m) m.style.visibility = "";
    if (h) h.style.visibility = "";
  }

  function load(src) {
    return new Promise(function (res, rej) {
      var s = d.createElement("script");
      s.type = "module"; s.textContent = src;
      s.onerror = rej; d.head.appendChild(s); res();
    });
  }

  READY = new Promise(function (resolve) {
    if (!CFG.apiKey || !CFG.projectId) {
      screen("الدخول لسه متظبّطش",
        'افتح <code>assets/js/firebase-config.js</code> وحطّ إعدادات مشروعك من Firebase Console. ' +
        'الخطوات بالترتيب في <code>server/README.md</code>.');
      resolve(null);
      return;
    }
    /* بنحمّل Firebase كوحدات ES ونربطها بالنافذة */
    var boot =
      'import { initializeApp } from "' + SDK + 'firebase-app.js";\n' +
      'import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, setPersistence, browserLocalPersistence }\n' +
      '  from "' + SDK + 'firebase-auth.js";\n' +
      'const app = initializeApp(' + JSON.stringify(CFG) + ');\n' +
      'const auth = getAuth(app);\n' +
      'await setPersistence(auth, browserLocalPersistence);\n' +
      'window.__mqAuth = { auth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider };\n' +
      'window.dispatchEvent(new Event("mq-fb-ready"));\n';

    w.addEventListener("mq-fb-ready", function () {
      var F = w.__mqAuth;
      AUTH = F.auth;
      F.onAuthStateChanged(AUTH, function (u) {
        USER = u;
        if (!u) {
          var el = screen("لوحة مناطق", "سجّل دخولك بإيميل الإدارة.", "ادخل بحساب جوجل");
          var b = d.getElementById("mqGoIn");
          if (b) b.onclick = function () {
            b.disabled = true; b.textContent = "…";
            F.signInWithPopup(AUTH, new F.GoogleAuthProvider()).catch(function (e) {
              b.disabled = false; b.textContent = "ادخل بحساب جوجل";
              screen("مقدرناش ندخّلك", String(e && e.message || e), "جرّب تاني");
              var b2 = d.getElementById("mqGoIn");
              if (b2) b2.onclick = function () { w.location.reload(); };
            });
          };
          resolve(null);
          return;
        }
        open();
        stamp(u);
        resolve(u);
        waiters.forEach(function (f) { f(u); });
        waiters = [];
      });
    }, { once: true });

    load(boot).catch(function () {
      screen("Firebase متحمّلش", "اتأكد إن النت شغّال وإن النطاق ده مصرّح بيه في Firebase Authentication ← Settings ← Authorized domains.");
      resolve(null);
    });
  });

  /* اسم الداخل في الشريط العلوي + زرار خروج */
  function stamp(u) {
    var bar = d.querySelector(".bar .wrap");
    if (!bar || d.getElementById("mqWho")) return;
    var s = d.createElement("span");
    s.id = "mqWho"; s.className = "au on";
    s.innerHTML = '<b>' + (u.email || "").split("@")[0] + '</b>' +
      '<button type="button" id="mqOut" aria-label="خروج">خروج</button>';
    bar.insertBefore(s, bar.firstChild);
    d.getElementById("mqOut").onclick = function () { w.MQAuth.signOut(); };
  }
})(window, document);
