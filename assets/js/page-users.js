/* مناطق · المستخدمين والصلاحيات */
(function (w, d) {
  "use strict";
  var M = w.MQ;
  M.buildAdminHeader("admin-users.html");

  /* الصلاحيات — الترتيب من الأخف للأخطر */
  var PERMS = [
    ["read",    "يقرا الطابور",        "يشوف الرسائل الواردة من غير ما يقرّر"],
    ["fix",     "يصحّح قراءة",         "يعدّل حقل غلط — والتصحيح بيدخل نموذج المرسل"],
    ["approve", "يعتمد رسالة",         "الرسالة بتدخل الوحدات وسجل الأسعار والنبض"],
    ["publish", "ينشر خبر",            "الخبر بيظهر في نبض السوق لكل الزوّار"],
    ["data",    "يعدّل البيانات",      "وحدات ومشاريع ومطوّرين وأحياء"],
    ["delete",  "يحذف",                "حذف نهائي — بيتسجّل باسمه"],
    ["users",   "يدير المستخدمين",     "يضيف ويشيل ويغيّر صلاحيات"],
    ["rules",   "يغيّر قواعد الحكم",    "بيغيّر حكم مناطق على كل وحدة في الموقع"]
  ];
  var ROLES = {
    "مالك":   { c: "up",  p: ["read","fix","approve","publish","data","delete","users","rules"] },
    "مدير":   { c: "sig", p: ["read","fix","approve","publish","data","delete"] },
    "محرّر":  { c: "wrn", p: ["read","fix","approve","publish"] },
    "مدخل":   { c: "mut", p: ["read","fix"] }
  };
  var USERS = [
    { nm: "محمد زهران", role: "مالك",  last: "دلوقتي",        acts: 128 },
    { nm: "سارة",        role: "مدير",  last: "النهاردة 23:40", acts: 94 },
    { nm: "رحيم",        role: "محرّر", last: "النهاردة 19:12", acts: 51 },
    { nm: "منة",         role: "مدخل",  last: "امبارح 16:03",   acts: 23 }
  ];
  var log = [];

  function line() {
    [["مستخدمين", USERS.length, "sig"],
     ["بيعتمدوا رسائل", USERS.filter(function (u) { return has(u, "approve"); }).length, "up"],
     ["بينشروا أخبار", USERS.filter(function (u) { return has(u, "publish"); }).length, "wrn"],
     ["بيحذفوا", USERS.filter(function (u) { return has(u, "delete"); }).length, "dn"],
     ["بيغيّروا القواعد", USERS.filter(function (u) { return has(u, "rules"); }).length, "dn"],
     ["قرارات اتسجّلت", USERS.reduce(function (a, u) { return a + u.acts; }, 0), "mut"]]
    .forEach(function (x, i) {
      if (i === 0) d.getElementById("uline").innerHTML = "";
      d.getElementById("uline").innerHTML += '<div class="ops1"><p class="l">' + x[0] +
        '</p><p class="v ' + x[2] + '">' + x[1] + '</p></div>';
    });
  }
  function has(u, p) { return (u.extra || []).indexOf(p) > -1 || ROLES[u.role].p.indexOf(p) > -1; }

  function table() {
    d.getElementById("uTb").innerHTML = USERS.map(function (u, i) {
      var r = ROLES[u.role];
      var ps = PERMS.filter(function (p) { return has(u, p[0]); });
      return "<tr><td><b>" + u.nm + "</b></td>" +
        "<td><span class='vd " + (r.c === "up" ? "o" : r.c === "sig" ? "o" : "n") + "'>" + u.role + "</span></td>" +
        "<td><span class='mut' style='font-size:11px'>" + ps.length + " من " + PERMS.length + " · " +
          ps.slice(0, 3).map(function (p) { return p[1]; }).join(" · ") + (ps.length > 3 ? " …" : "") + "</span></td>" +
        "<td class='num mut'>" + u.last + "</td><td class='num'>" + u.acts + "</td>" +
        "<td style='white-space:nowrap'>" + (u.role === "مالك"
          ? "<span class='mut' style='font-size:10.5px'>محمي</span>"
          : "<button class='fx' type='button' data-i='" + i + "' data-a='role'>غيّر الدور</button> " +
            "<button class='fx' type='button' data-i='" + i + "' data-a='del'>شيل</button>") + "</td></tr>";
    }).join("");
    M.stagger(d.getElementById("uTb"));
  }
  d.getElementById("uTb").addEventListener("click", function (e) {
    var b = e.target.closest("[data-a]"); if (!b) return;
    var u = USERS[+b.dataset.i];
    if (b.dataset.a === "del") {
      if (!w.confirm("تشيل " + u.nm + "؟")) return;
      USERS.splice(+b.dataset.i, 1);
      add("شيل مستخدم", u.nm); table(); matrix(); line();
      toast("اتشال " + u.nm + " — والتغيير اتسجّل باسمك");
      return;
    }
    var ks = Object.keys(ROLES), ni = (ks.indexOf(u.role) + 1) % ks.length;
    if (ks[ni] === "مالك") ni = (ni + 1) % ks.length;
    var old = u.role; u.role = ks[ni]; u.extra = [];
    add("غيّر دور", u.nm + " · " + old + " ← " + u.role);
    table(); matrix(); line();
    toast(u.nm + " بقى " + u.role);
  });

  function matrix() {
    d.getElementById("pHead").innerHTML = "<tr><th>الصلاحية</th>" +
      USERS.map(function (u) { return "<th>" + u.nm + "</th>"; }).join("") + "</tr>";
    d.getElementById("pBody").innerHTML = PERMS.map(function (p) {
      var danger = p[0] === "rules" || p[0] === "delete" || p[0] === "users";
      return "<tr" + (danger ? " class='me'" : "") + "><td><b>" + p[1] + "</b>" +
        "<br><span class='mut' style='font-size:10.5px'>" + p[2] + "</span></td>" +
        USERS.map(function (u, ui) {
          var on = has(u, p[0]);
          var locked = u.role === "مالك";
          return "<td style='text-align:center'><button class='pcell" + (on ? " on" : "") +
            (locked ? " lk2" : "") + "' type='button' data-u='" + ui + "' data-p='" + p[0] +
            "' aria-pressed='" + on + "'>" + (on ? "✓" : "—") + "</button></td>";
        }).join("") + "</tr>";
    }).join("");
  }
  d.getElementById("pBody").addEventListener("click", function (e) {
    var b = e.target.closest("[data-p]"); if (!b) return;
    var u = USERS[+b.dataset.u], p = b.dataset.p;
    if (u.role === "مالك") { toast("المالك صلاحياته كاملة ومش بتتغيّر"); return; }
    u.extra = u.extra || [];
    var base = ROLES[u.role].p.indexOf(p) > -1;
    if (has(u, p)) {
      if (base) { toast("الصلاحية دي جاية من دور «" + u.role + "» — غيّر الدور عشان تشيلها"); return; }
      u.extra = u.extra.filter(function (x) { return x !== p; });
      add("شال صلاحية", u.nm + " · " + p);
    } else {
      u.extra.push(p);
      add("أضاف صلاحية", u.nm + " · " + p);
      if (p === "rules") toast("⚠ " + u.nm + " بقى يقدر يغيّر قواعد الحكم — دي بتأثر على كل وحدة في الموقع");
    }
    matrix(); table(); line();
  });

  d.getElementById("addU").onclick = function () { toast("في النسخة المربوطة بقاعدة البيانات، هنا بتفتح استمارة دعوة بالإيميل"); };

  function add(act, on) { log.unshift({ act: act, on: on }); }
  function toast(t) {
    var el = d.createElement("div"); el.className = "toast"; el.textContent = t;
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    setTimeout(function () { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 300); }, 4200);
  }

  line(); table(); matrix(); M.markSections(); M.reveal();
})(window, document);
