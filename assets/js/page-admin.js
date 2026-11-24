/* مناطق · الوارد
   رسايل السيلز اللي مستنياك. كل رسالة كارت فيه: مين، وإيه، وبكام.
   زرار واحد واضح. التفاصيل مش بتظهر غير لما تضغط. */
(function (w, d) {
  "use strict";
  var M = w.MQ, P = w.MQParse, A = w.MQ_ADMIN;
  M.buildAdminHeader("admin.html");

  var $ = function (id) { return d.getElementById(id); };
  var f0 = function (n) { return Math.round(n).toLocaleString("en-US"); };
  var REPS = {};
  A.REPS.forEach(function (r) { REPS[r.id] = r; });

  /* الحقول اللي بتفرق في القرار — مش كل حاجة القارئ بيطلّعها */
  var SHOW = [
    ["price", "السعر"], ["area", "المساحة"], ["cashDisc", "خصم الكاش"],
    ["downPct", "المقدّم"], ["months", "التقسيط"], ["delivery", "التسليم"], ["garage", "الجراج"]
  ];
  var MUST = ["price", "area"];

  /* ---------- القراءة ---------- */
  function read(m) {
    var r = REPS[m.rep] || {};
    var res = P.read(m.raw, r.profile || null);
    var F = res.fields;
    Object.keys(m.fix || {}).forEach(function (k) { F[k] = { v: m.fix[k], line: "", fixed: true }; });
    return F;
  }
  function title(m) {
    /* أول سطر من غير الإيموجي والزخرفة */
    var line = (m.raw.split("\n").filter(function (x) { return x.trim(); })[0] || "");
    line = line.replace(/[^؀-ۿA-Za-z0-9 .،,|\-·]/g, " ").replace(/\s{2,}/g, " ").trim();
    line = line.replace(/^[|·\-\s]+|[|·\-\s]+$/g, "");
    var r = REPS[m.rep] || {};
    return line.length > 2 ? line.slice(0, 52) : ((r.projects || [])[0] || "رسالة");
  }
  function fmt(k, v) {
    if (k === "price" || k === "garage") return M.qty(f0(v), "ج");
    if (k === "area") return M.qty(v, "م²");
    if (k === "cashDisc" || k === "downPct") return M.qty(v + "%");
    if (k === "months") return M.qty(v, "شهر");
    return esc(v);
  }
  function line(F) {
    return [F.area ? M.qty(F.area.v, "م²") : "", F.price ? M.qty(f0(F.price.v), "ج") : ""]
      .filter(Boolean).join(' <span class="a3-dot">·</span> ');
  }

  /* ---------- الحالة ---------- */
  var queue = A.QUEUE.map(function (m) {
    var x = Object.assign({ fix: {} }, m);
    var F = read(x);
    x.junk = P.junk(x.raw, F);
    return x;
  });
  var undo = null;

  function missing(F) { return MUST.filter(function (k) { return !F[k]; }); }

  /* ---------- الرسم ---------- */
  function draw() {
    var live = queue.filter(function (m) { return !m.junk && !m.done; });
    var junk = queue.filter(function (m) { return m.junk && !m.done; });
    var lacking = live.filter(function (m) { return missing(read(m)).length; }).length;

    $("sum").innerHTML = live.length
      ? "<b>" + live.length + "</b> " + (live.length === 1 ? "رسالة مستنياك" : "رسايل مستنياك") +
        (lacking ? ' · <span class="wrn">' + lacking + " ناقصها حاجة</span>" : "")
      : "مفيش حاجة مستنياك";

    if (!live.length) {
      $("list").innerHTML = '<div class="a3-empty"><b>خلصت كل حاجة ✓</b>' +
        "أول ما رسالة جديدة توصل من أي سيلز هتلاقيها هنا.</div>";
    } else {
      $("list").innerHTML = live.map(card).join("");
    }

    $("fold").innerHTML = junk.length
      ? '<p class="a3-fold"><span>' + junk.length + " " +
        (junk.length === 1 ? "رسالة مالهاش لازمة اتشالت" : "رسايل مالهاش لازمة اتشالت") +
        " لوحدها (تهاني وردود)</span>" +
        '<button type="button" id="showJunk">وريني</button></p>' +
        '<div class="a3-list" id="junkList" hidden>' + junk.map(junkCard).join("") + "</div>"
      : "";
    var sj = $("showJunk");
    if (sj) sj.onclick = function () {
      var jl = $("junkList"); jl.hidden = !jl.hidden;
      sj.textContent = jl.hidden ? "وريني" : "خبّي";
    };
  }

  function card(m) {
    var r = REPS[m.rep] || {}, F = read(m), miss = missing(F);
    var bits = line(F);
    var pill = miss.length
      ? '<span class="a3-pill wrn">ناقص ' + (miss[0] === "price" ? "السعر" : "المساحة") + "</span>"
      : "";

    return '<div class="a3-card" data-id="' + m.id + '">' +
      '<button class="a3-row" type="button" data-open="' + m.id + '">' +
        '<span class="a3-main">' +
          '<span class="a3-who"><b>' + (r.nm || "—") + "</b><span>" + (r.dev || "") + "</span>" + pill + "</span>" +
          '<span class="a3-what">' + esc(title(m)) + (bits ? '<span class="a3-nums">' + bits + "</span>" : "") + "</span>" +
        "</span>" +
        '<span class="a3-side">' + m.at.replace("النهاردة ", "") + "</span>" +
      "</button>" +
      '<div class="a3-acts">' +
        (miss.length
          ? '<button class="a3-btn go" type="button" data-open="' + m.id + '">كمّل الناقص</button>'
          : '<button class="a3-btn go" type="button" data-ok="' + m.id + '">انشرها</button>') +
        '<button class="a3-btn ghost" type="button" data-open="' + m.id + '">التفاصيل</button>' +
      "</div>" +
      '<div class="a3-more">' + more(m, F) + "</div>" +
    "</div>";
  }

  function more(m, F) {
    var r = REPS[m.rep] || {};
    var rows = SHOW.filter(function (x) { return F[x[0]] || MUST.indexOf(x[0]) > -1; }).map(function (x) {
      var k = x[0], f = F[k];
      return '<div class="a3-f' + (f ? "" : " miss") + '" data-k="' + k + '">' +
        '<span class="k">' + x[1] + "</span>" +
        '<span class="v">' +
          (f ? fmt(k, f.v) : "مش مكتوب في الرسالة") + "</span>" +
        '<button class="fix" type="button" data-fix="' + m.id + '" data-k="' + k + '">' +
          (f ? "غلط؟" : "اكتبه") + "</button></div>";
    }).join("");
    var miss = missing(F);
    return '<p class="a3-lbl">الرسالة زي ما وصلت</p>' +
      '<div class="a3-raw">' + esc(m.raw) + "</div>" +
      '<p class="a3-lbl" style="margin-top:16px">اللي فهمناه منها</p>' +
      '<div class="a3-fields">' + rows + "</div>" +
      '<div class="a3-learn" id="learn-' + m.id + '" hidden></div>' +
      '<div class="a3-acts" style="padding:14px 0 0">' +
        (miss.length ? "" : '<button class="a3-btn go" type="button" data-ok="' + m.id + '">انشرها</button>') +
        '<button class="a3-btn ghost" type="button" data-no="' + m.id + '">مش هننشرها</button>' +
      "</div>";
  }

  function junkCard(m) {
    var r = REPS[m.rep] || {};
    return '<div class="a3-card" data-id="' + m.id + '">' +
      '<div class="a3-row" style="cursor:default"><span class="a3-main">' +
        '<span class="a3-who"><b>' + (r.nm || "—") + "</b><span>" + (r.dev || "") + "</span></span>" +
        '<span class="a3-what" style="font-weight:400;color:var(--muted);font-size:13px">' +
          esc(m.raw.slice(0, 90)) + (m.raw.length > 90 ? "…" : "") + "</span>" +
      "</span></div>" +
      '<div class="a3-acts"><button class="a3-btn ghost" type="button" data-keep="' + m.id + '">' +
        "لأ، دي فيها وحدة</button></div></div>";
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  /* ---------- الأفعال ---------- */
  function byId(id) { return queue.filter(function (m) { return m.id === id; })[0]; }

  function finish(id, how) {
    var m = byId(id); if (!m) return;
    var el = d.querySelector('.a3-card[data-id="' + id + '"]');
    if (el) el.classList.add("gone");
    setTimeout(function () {
      m.done = how;
      undo = m;
      draw();
      toast(how === "ok" ? "اتنشرت على الموقع" : "اتشالت", true);
    }, 260);
  }

  function startFix(btn) {
    var row = btn.closest(".a3-f"), id = btn.getAttribute("data-fix"), k = btn.getAttribute("data-k");
    var m = byId(id), F = read(m), f = F[k];
    var v = row.querySelector(".v");
    var cur = f ? f.v : "";
    v.outerHTML = '<input type="text" inputmode="' + (k === "delivery" ? "text" : "decimal") +
      '" value="' + cur + '" aria-label="القيمة الصح">';
    btn.textContent = "احفظ";
    btn.setAttribute("data-save", "1");
    var inp = row.querySelector("input");
    inp.focus(); inp.select();
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") save(btn); });
  }

  function save(btn) {
    var row = btn.closest(".a3-f"), id = btn.getAttribute("data-fix"), k = btn.getAttribute("data-k");
    var m = byId(id), r = REPS[m.rep] || {};
    var raw = row.querySelector("input").value.trim();
    if (!raw) return;
    var num = parseFloat(raw.replace(/[^\d.]/g, ""));
    var val = k === "delivery" ? raw : num;
    if (k !== "delivery" && !(num > 0)) { row.querySelector("input").classList.add("bad"); return; }

    /* بندوّر على السطر اللي فيه الرقم ده في الرسالة — منه بيتعلّم */
    var learned = false;
    if (k !== "delivery") {
      var digits = String(Math.round(num));
      var line = m.raw.split("\n").filter(function (l) {
        return P.norm(l).replace(/[^\d]/g, "").indexOf(digits) > -1;
      })[0];
      if (line && r.profile) { P.learn(r.profile, k, line, num); learned = true; }
    }
    m.fix[k] = val;

    var card = d.querySelector('.a3-card[data-id="' + id + '"]');
    card.querySelector(".a3-more").innerHTML = more(m, read(m));
    if (learned) {
      var l = $("learn-" + id);
      l.hidden = false;
      l.textContent = "اتعلّمت ✓ رسايل " + (r.nm || "السيلز ده") + " الجاية هتتقرا كده لوحدها.";
    }
    /* لو كده اكتملت، الكارت فوق يتحدّث كمان */
    var F = read(m);
    if (!missing(F).length) {
      var acts = card.querySelector(":scope > .a3-acts");
      acts.innerHTML = '<button class="a3-btn go" type="button" data-ok="' + id + '">انشرها</button>' +
        '<button class="a3-btn ghost" type="button" data-open="' + id + '">قفّل</button>';
      var pill = card.querySelector(".a3-who .a3-pill"); if (pill) pill.remove();
      var what = card.querySelector(".a3-what");
      what.innerHTML = esc(title(m)) + '<span class="a3-nums">' + line(F) + "</span>";
    }
  }

  d.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-ok]")))  return finish(t.getAttribute("data-ok"), "ok");
    if ((t = e.target.closest("[data-no]")))  return finish(t.getAttribute("data-no"), "no");
    if ((t = e.target.closest("[data-save]"))) return save(t);
    if ((t = e.target.closest("[data-fix]"))) return startFix(t);
    if ((t = e.target.closest("[data-keep]"))) {
      var m = byId(t.getAttribute("data-keep")); m.junk = false; draw();
      var c = d.querySelector('.a3-card[data-id="' + m.id + '"]'); if (c) c.classList.add("open");
      return;
    }
    if ((t = e.target.closest("[data-open]"))) {
      var c2 = t.closest(".a3-card");
      c2.classList.toggle("open");
      var b = c2.querySelector(':scope > .a3-acts [data-open]');
      if (b && b.textContent !== "كمّل الناقص") b.textContent = c2.classList.contains("open") ? "قفّل" : "التفاصيل";
    }
  });

  /* ---------- رسالة صغيرة تحت، ومعاها تراجع ---------- */
  function toast(text, canUndo) {
    var old = d.querySelector(".toast"); if (old) old.remove();
    var el = d.createElement("div");
    el.className = "toast";
    el.innerHTML = text + (canUndo ? ' <button type="button" style="background:none;border:0;color:var(--sig);' +
      'font-family:var(--body);font-size:13px;font-weight:700;cursor:pointer;margin-inline-start:10px">تراجع</button>' : "");
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    var b = el.querySelector("button");
    if (b) b.onclick = function () {
      if (undo) { undo.done = false; undo = null; draw(); }
      el.remove();
    };
    setTimeout(function () { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 300); }, 5000);
  }

  draw();
})(window, document);
