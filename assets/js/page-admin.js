/* مناطق · الوارد
   رسايل السيلز اللي مستنياك. كل رسالة كارت فيه: مين، وإيه، وبكام —
   وإيه اللي مناطق هتقوله عنها لما تتنشر.

   الفرصة مش بتتحدد بإيد حد. القاعدة المنشورة هي اللي بتحددها: المتر
   الحقيقي مقابل متوسط الحي. إنت بتشوف الحكم قبل ما تنشر، وبتقرر تنشر
   ولا لأ — بس مش بتغيّر الحكم. ده اللي بيخلّي كلمة «فرصة» على مناطق
   ليها وزن.

   والخبر بيطلع من نفس الرسالة: لو فيها رفع سعر أو نزول أو خصم كبير
   أو إطلاق، الكارت بيقولك «ده خبر» ونشرة واحدة بتنزّل الاتنين. */
(function (w, d) {
  "use strict";
  var M = w.MQ, P = w.MQParse, A = w.MQ_ADMIN, D = M.D, C = M.CONFIG;
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
  var PILL = { "فرصة": "ok", "متضخّم": "bad", "محايد": "mut", "انتظر": "mut" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  /* الكلام اللاتيني والتواريخ جوّه جملة عربي: كل حتة لوحدها عشان متتقلبش */
  function bd(s) {
    return String(s == null ? "" : s).split(/([A-Za-z0-9][A-Za-z0-9 .,'&\-]*[A-Za-z0-9])/).map(function (p, i) {
      return i % 2 ? "<bdi>" + esc(p) + "</bdi>" : esc(p); }).join("");
  }

  /* ---------- القراءة ---------- */
  function read(m) {
    var r = REPS[m.rep] || {};
    var F = P.read(m.raw, r.profile || null).fields;
    Object.keys(m.fix || {}).forEach(function (k) { F[k] = { v: m.fix[k], line: "", fixed: true }; });
    return F;
  }
  function title(m) {
    var line = (m.raw.split("\n").filter(function (x) { return x.trim(); })[0] || "");
    line = line.replace(/[^؀-ۿA-Za-z0-9 .،,|\-·]/g, " ").replace(/\s{2,}/g, " ").trim();
    line = line.replace(/^[|·\-\s]+|[|·\-\s]+$/g, "");
    var r = REPS[m.rep] || {};
    return line.length > 2 ? line.slice(0, 52) : ((r.projects || [])[0] || "رسالة");
  }
  /* اسم المشروع للخبر — أقصر من العنوان */
  function project(m) {
    var r = REPS[m.rep] || {}, t = P.norm(m.raw).toLowerCase();
    var hit = (r.projects || []).filter(function (p) {
      var key = P.norm(p.split("·").pop()).toLowerCase().trim().split(" ")[0];
      return key.length > 2 && t.indexOf(key) > -1;
    })[0];
    if (hit) return hit.split("·").pop().trim();
    return title(m).split("|")[0].trim();
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

  /* الحي: من الرسالة لو مكتوب، أو اللي إنت اخترته.
     بندوّر على الاسم كامل، أو على حتة مميزة فيه زي «R7» و«CBD». */
  function guessDistrict(raw, reg) {
    if (!reg || !D.REGIONS[reg]) return null;
    var t = P.norm(raw), hit = null;
    D.REGIONS[reg].districts.forEach(function (x) {
      if (hit) return;
      var name = x[0];
      if (t.indexOf(P.norm(name)) > -1) { hit = name; return; }
      var keys = name.match(/[A-Za-z0-9]{2,}/g) || [];
      if (keys.some(function (k) { return new RegExp("\\b" + k + "\\b", "i").test(raw); })) hit = name;
    });
    return hit;
  }

  /* ---------- الحكم والخبر ---------- */
  function assess(m) {
    var r = REPS[m.rep] || {}, F = read(m);
    var reg = r.reg && D.REGIONS[r.reg] ? r.reg : null;
    var dist = m.dist || guessDistrict(m.raw, reg);

    var fp = F.area ? r.dev + "|" + F.area.v : null;
    var prev = fp && A.HISTORY[fp] ? A.HISTORY[fp] : null;
    var cls = P.classify(m.raw, F, prev);

    var vd = null, u = null;
    if (F.price && F.area && reg && dist) {
      var del = F.delivery ? String(F.delivery.v) : "—";
      u = { id: m.id, r: reg, d: dist, p: F.price.v, a: F.area.v,
            garage: F.garage ? F.garage.v : 0, club: 0,
            maint: F.maint ? F.maint.v : 5,   /* وديعة الصيانة 5% — نفس اللي على الموقع لو مش مكتوبة */
            del: /فوري|فورى|ready|rtm/i.test(del) ? "فوري" : del,
            k: "primary", docs: [], src: r.dev };
      vd = M.verdict(u);
    }
    var hits = P.detect({
      fields: F, prev: prev,
      districtPpm: u ? M.districtPpm(reg, dist) : 0,
      realPpm: u ? M.realPpm(u) : 0,
      repost: fp ? A.repostOf(fp) : null
    }).filter(function (h) { return h.k !== "under" && h.k !== "over"; });  /* دول الحكم نفسه */

    return { F: F, reg: reg, dist: dist, prev: prev, cls: cls, vd: vd, hits: hits,
             news: newsOf(m, F, cls, prev, r) };
  }

  /* الرسالة تبقى خبر لو فيها حاجة اتغيّرت في السوق — مش لمجرد إنها وصلت */
  function newsOf(m, F, cls, prev, r) {
    var n = autoNews(m, F, cls, prev, r);
    if (m.newsText !== undefined) {
      if (!m.newsText) return null;
      return { text: m.newsText, k: n ? n.k : "field", kT: n ? n.kT : "خبر" };
    }
    return n;
  }
  function autoNews(m, F, cls, prev, r) {
    var p = project(m), dev = r.dev || "المطوّر";
    if (cls.tag === "launch") return { k: "launch", kT: "إطلاق", text: dev + " أطلقت " + p + "." };
    if (cls.tag === "up2") {
      var pct = (P.norm(m.raw).match(/زياد[هة]\s*(\d+(?:\.\d+)?)\s*%/) || [])[1];
      return { k: "up2", kT: "رفع سعر", text: dev + " رفعت أسعار " + p + (pct ? " " + pct + "%" : "") + "." };
    }
    if (prev && F.price) {
      var dv = (F.price.v - prev.price) / prev.price * 100;
      if (Math.abs(dv) >= 1.5) {
        return { k: dv < 0 ? "disc" : "up2", kT: dv < 0 ? "تخفيض" : "رفع سعر",
          text: p + ": السعر " + (dv < 0 ? "نزل " : "طلع ") + Math.abs(dv).toFixed(1) +
          "% عن آخر سعر اتسجّل يوم " + prev.date + "." };
      }
    }
    if (F.cashDisc && F.cashDisc.v >= C.rules.cashDisc) {
      return { k: "disc", kT: "خصم", text: dev + " بتدّي خصم كاش " + F.cashDisc.v + "% على " + p + "." };
    }
    return null;
  }

  function missing(a) {
    var out = [];
    if (!a.F.price) out.push(["price", "السعر"]);
    if (!a.F.area) out.push(["area", "المساحة"]);
    if (!a.dist) out.push(["dist", "الحي"]);
    return out;
  }

  /* ---------- الحالة ---------- */
  var queue = A.QUEUE.map(function (m) {
    var x = Object.assign({ fix: {} }, m);
    x.junk = P.junk(x.raw, read(x));
    return x;
  });
  var undo = null;

  /* ---------- الرسم ---------- */
  function draw() {
    var live = queue.filter(function (m) { return !m.junk && !m.done; });
    var junk = queue.filter(function (m) { return m.junk && !m.done; });
    var as = live.map(assess);
    var lacking = as.filter(function (a) { return missing(a).length; }).length;
    var opp = as.filter(function (a) { return a.vd && a.vd[0] === "فرصة"; }).length;
    var news = as.filter(function (a) { return a.news; }).length;

    $("sum").innerHTML = live.length
      ? "<b>" + live.length + "</b> " + (live.length === 1 ? "رسالة مستنياك" : "رسايل مستنياك") +
        (opp ? ' · <span style="color:var(--up)">' + opp + " فرصة</span>" : "") +
        (news ? " · " + news + " خبر" : "") +
        (lacking ? ' · <span class="wrn">' + lacking + " ناقصها حاجة</span>" : "")
      : "مفيش حاجة مستنياك";

    $("list").innerHTML = live.length ? live.map(function (m, i) { return card(m, as[i]); }).join("") :
      '<div class="a3-empty"><b>خلصت كل حاجة ✓</b>' +
      "أول ما رسالة جديدة توصل من أي سيلز هتلاقيها هنا.</div>";

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

  function card(m, a) {
    var r = REPS[m.rep] || {}, miss = missing(a), bits = line(a.F);
    var pill = miss.length ? '<span class="a3-pill wrn">ناقص ' + miss[0][1] + "</span>" : "";

    return '<div class="a3-card" data-id="' + m.id + '">' +
      '<button class="a3-row" type="button" data-open="' + m.id + '">' +
        '<span class="a3-main">' +
          '<span class="a3-who"><b>' + esc(r.nm || "—") + "</b><bdi>" + esc(r.dev || "") + "</bdi>" + pill + "</span>" +
          '<span class="a3-what">' + esc(title(m)) + (bits ? '<span class="a3-nums">' + bits + "</span>" : "") + "</span>" +
          says(a) +
        "</span>" +
        '<span class="a3-side">' + esc(m.at.replace("النهاردة ", "")) + "</span>" +
      "</button>" +
      '<div class="a3-acts">' + mainActs(m, a) + "</div>" +
      '<div class="a3-more">' + more(m, a) + "</div>" +
    "</div>";
  }

  /* اللي مناطق هتقوله: الحكم، والخبر لو فيه */
  function says(a) {
    var h = "";
    if (a.vd) {
      h += '<span class="a3-say"><span class="a3-pill ' + (PILL[a.vd[0]] || "mut") + '">' + a.vd[0] + "</span>" +
        "<span>" + bd(a.vd[2]) + "</span></span>";
    }
    if (a.news) {
      h += '<span class="a3-say"><span class="a3-pill news">خبر</span><span>' + bd(a.news.text) + "</span></span>";
    }
    return h;
  }

  function mainActs(m, a) {
    var miss = missing(a);
    if (miss.length) {
      return '<button class="a3-btn go" type="button" data-open="' + m.id + '">كمّل الناقص</button>' +
        '<button class="a3-btn ghost" type="button" data-open="' + m.id + '">التفاصيل</button>';
    }
    return '<button class="a3-btn go" type="button" data-ok="' + m.id + '">' +
        (a.news && m.newsOn !== false ? "انشرها + الخبر" : "انشرها") + "</button>" +
      '<button class="a3-btn ghost" type="button" data-open="' + m.id + '">التفاصيل</button>';
  }

  function more(m, a) {
    var F = a.F;
    var rows = SHOW.filter(function (x) { return F[x[0]] || x[0] === "price" || x[0] === "area"; }).map(function (x) {
      var k = x[0], f = F[k];
      return '<div class="a3-f' + (f ? "" : " miss") + '" data-k="' + k + '">' +
        '<span class="k">' + x[1] + "</span>" +
        '<span class="v">' + (f ? fmt(k, f.v) : "مش مكتوب في الرسالة") + "</span>" +
        '<button class="fix" type="button" data-fix="' + m.id + '" data-k="' + k + '">' +
          (f ? "غلط؟" : "اكتبه") + "</button></div>";
    }).join("");

    /* الحي — من غيره مفيش حكم */
    var opts = a.reg ? D.REGIONS[a.reg].districts.map(function (x) {
      return '<option' + (x[0] === a.dist ? " selected" : "") + ">" + esc(x[0]) + "</option>";
    }).join("") : "";
    rows += '<div class="a3-f' + (a.dist ? "" : " miss") + '">' +
      '<span class="k">الحي</span>' +
      (a.reg
        ? '<select class="a3-sel" data-dist="' + m.id + '" aria-label="الحي">' +
            (a.dist ? "" : '<option value="" selected>اختار الحي…</option>') + opts + "</select>"
        : '<span class="v">المنطقة بتاعة السيلز ده مش متسجّلة</span>') +
      "</div>";

    var verdict = a.vd
      ? '<p class="a3-lbl" style="margin-top:18px">حكم مناطق</p>' +
        '<div class="a3-say big"><span class="a3-pill ' + (PILL[a.vd[0]] || "mut") + '">' + a.vd[0] + "</span>" +
          "<span>" + bd(a.vd[2]) + "</span></div>" +
        (a.hits.length ? '<ul class="a3-sig">' + a.hits.map(function (h) {
          return "<li><b>" + esc(h.t) + "</b> — " + bd(h.why) + "</li>"; }).join("") + "</ul>" : "") +
        '<p class="a3-note">الحكم بيتحسب بالقاعدة المنشورة: المتر الحقيقي (السعر + الصيانة + الجراج) مقابل متوسط الحي. ' +
          "مش بيتغيّر بالإيد — لو مش مقتنع بيه، متنشرش.</p>"
      : "";

    var news = a.news
      ? '<p class="a3-lbl" style="margin-top:18px">في نبض السوق</p>' +
        '<label class="a3-chk"><input type="checkbox" data-newson="' + m.id + '"' +
          (m.newsOn === false ? "" : " checked") + "> انشر الخبر ده مع الوحدة</label>" +
        '<textarea class="a3-news" data-newstext="' + m.id + '" rows="2">' + esc(a.news.text) + "</textarea>"
      : "";

    var miss = missing(a);
    return '<p class="a3-lbl">الرسالة زي ما وصلت</p>' +
      '<div class="a3-raw">' + esc(m.raw) + "</div>" +
      '<p class="a3-lbl" style="margin-top:16px">اللي فهمناه منها</p>' +
      '<div class="a3-fields">' + rows + "</div>" +
      '<div class="a3-learn" id="learn-' + m.id + '" hidden></div>' +
      verdict + news +
      '<div class="a3-acts" style="padding:16px 0 0">' +
        (miss.length ? "" : '<button class="a3-btn go" type="button" data-ok="' + m.id + '">' +
          (a.news && m.newsOn !== false ? "انشرها + الخبر" : "انشرها") + "</button>") +
        '<button class="a3-btn ghost" type="button" data-no="' + m.id + '">مش هننشرها</button>' +
      "</div>";
  }

  function junkCard(m) {
    var r = REPS[m.rep] || {};
    return '<div class="a3-card" data-id="' + m.id + '">' +
      '<div class="a3-row" style="cursor:default"><span class="a3-main">' +
        '<span class="a3-who"><b>' + esc(r.nm || "—") + "</b><bdi>" + esc(r.dev || "") + "</bdi></span>" +
        '<span class="a3-what" style="font-weight:400;color:var(--muted);font-size:13px">' +
          esc(m.raw.slice(0, 90)) + (m.raw.length > 90 ? "…" : "") + "</span>" +
      "</span></div>" +
      '<div class="a3-acts"><button class="a3-btn ghost" type="button" data-keep="' + m.id + '">' +
        "لأ، دي فيها وحدة</button></div></div>";
  }

  /* ---------- إعادة رسم كارت واحد من غير ما الصفحة تتنطّط ---------- */
  function redraw(id, keepOpen) {
    var m = byId(id), a = assess(m);
    var old = d.querySelector('.a3-card[data-id="' + id + '"]');
    if (!old) return draw();
    var tmp = d.createElement("div");
    tmp.innerHTML = card(m, a);
    var fresh = tmp.firstChild;
    if (keepOpen) fresh.classList.add("open");
    old.replaceWith(fresh);
    /* العدّادات فوق */
    var live = queue.filter(function (x) { return !x.junk && !x.done; }).map(assess);
    var lacking = live.filter(function (x) { return missing(x).length; }).length;
    var opp = live.filter(function (x) { return x.vd && x.vd[0] === "فرصة"; }).length;
    var news = live.filter(function (x) { return x.news; }).length;
    $("sum").innerHTML = "<b>" + live.length + "</b> " + (live.length === 1 ? "رسالة مستنياك" : "رسايل مستنياك") +
      (opp ? ' · <span style="color:var(--up)">' + opp + " فرصة</span>" : "") +
      (news ? " · " + news + " خبر" : "") +
      (lacking ? ' · <span class="wrn">' + lacking + " ناقصها حاجة</span>" : "");
    return fresh;
  }

  /* ---------- الأفعال ---------- */
  function byId(id) { return queue.filter(function (m) { return m.id === id; })[0]; }

  function publishNews(m, a) {
    if (!a.news || m.newsOn === false) return false;
    var r = REPS[m.rep] || {};
    var item = { id: "N-" + m.id, at: m.at, r: a.reg, d: a.dist, dev: r.dev,
                 text: a.news.text, k: a.news.k, kT: a.news.kT };
    try {
      var list = JSON.parse(w.sessionStorage.getItem("mq_news_new") || "[]");
      list.unshift(item);
      w.sessionStorage.setItem("mq_news_new", JSON.stringify(list.slice(0, 50)));
    } catch (e) {}
    return true;
  }
  function unpublishNews(m) {
    try {
      var list = JSON.parse(w.sessionStorage.getItem("mq_news_new") || "[]")
        .filter(function (x) { return x.id !== "N-" + m.id; });
      w.sessionStorage.setItem("mq_news_new", JSON.stringify(list));
    } catch (e) {}
  }

  function finish(id, how) {
    var m = byId(id); if (!m) return;
    var a = assess(m);
    var el = d.querySelector('.a3-card[data-id="' + id + '"]');
    if (el) el.classList.add("gone");
    setTimeout(function () {
      m.done = how;
      var withNews = how === "ok" && publishNews(m, a);
      m.hadNews = withNews;
      undo = m;
      draw();
      toast(how === "ok"
        ? (withNews ? "اتنشرت · والخبر نزل في النبض" : "اتنشرت على الموقع")
        : "اتشالت", true);
    }, 260);
  }

  function startFix(btn) {
    var row = btn.closest(".a3-f"), id = btn.getAttribute("data-fix"), k = btn.getAttribute("data-k");
    var m = byId(id), f = read(m)[k];
    var v = row.querySelector(".v");
    v.outerHTML = '<input type="text" inputmode="' + (k === "delivery" ? "text" : "decimal") +
      '" value="' + (f ? esc(f.v) : "") + '" aria-label="القيمة الصح">';
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
      var ln = m.raw.split("\n").filter(function (l) {
        return P.norm(l).replace(/[^\d]/g, "").indexOf(digits) > -1;
      })[0];
      if (ln && r.profile) { P.learn(r.profile, k, ln, num); learned = true; }
    }
    m.fix[k] = val;
    redraw(id, true);
    if (learned) {
      var l = $("learn-" + id);
      l.hidden = false;
      l.textContent = "اتعلّمت ✓ رسايل " + (r.nm || "السيلز ده") + " الجاية هتتقرا كده لوحدها.";
    }
  }

  d.addEventListener("change", function (e) {
    var t;
    if ((t = e.target.closest("[data-dist]"))) {
      var m = byId(t.getAttribute("data-dist"));
      m.dist = t.value || null;
      redraw(m.id, true);
      return;
    }
    if ((t = e.target.closest("[data-newson]"))) {
      var m2 = byId(t.getAttribute("data-newson"));
      m2.newsOn = t.checked;
      var c = d.querySelector('.a3-card[data-id="' + m2.id + '"]');
      c.querySelector(":scope > .a3-acts").innerHTML = mainActs(m2, assess(m2));
      c.querySelectorAll(".a3-more [data-ok]").forEach(function (b) {
        b.textContent = t.checked ? "انشرها + الخبر" : "انشرها"; });
    }
  });
  d.addEventListener("input", function (e) {
    var t = e.target.closest("[data-newstext]");
    if (t) byId(t.getAttribute("data-newstext")).newsText = t.value.trim();
  });

  d.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-ok]")))  return finish(t.getAttribute("data-ok"), "ok");
    if ((t = e.target.closest("[data-no]")))  return finish(t.getAttribute("data-no"), "no");
    if ((t = e.target.closest("[data-save]"))) return save(t);
    if ((t = e.target.closest("[data-fix]"))) return startFix(t);
    if ((t = e.target.closest("[data-keep]"))) {
      var m = byId(t.getAttribute("data-keep")); m.junk = false; draw();
      var c = d.querySelector('#list .a3-card[data-id="' + m.id + '"]'); if (c) c.classList.add("open");
      return;
    }
    if ((t = e.target.closest("[data-open]"))) {
      var c2 = t.closest(".a3-card");
      c2.classList.toggle("open");
      var b = c2.querySelector(":scope > .a3-acts .ghost[data-open]");
      if (b) b.textContent = c2.classList.contains("open") ? "قفّل" : "التفاصيل";
    }
  });

  /* ---------- رسالة صغيرة تحت، ومعاها تراجع ---------- */
  function toast(text, canUndo) {
    var old = d.querySelector(".toast"); if (old) old.remove();
    var el = d.createElement("div");
    el.className = "toast";
    el.innerHTML = esc(text) + (canUndo ? ' <button type="button" style="background:none;border:0;color:var(--sig);' +
      'font-family:var(--body);font-size:13px;font-weight:700;cursor:pointer;margin-inline-start:10px">تراجع</button>' : "");
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    var b = el.querySelector("button");
    if (b) b.onclick = function () {
      if (undo) {
        if (undo.hadNews) unpublishNews(undo);
        undo.done = false; undo.hadNews = false; undo = null; draw();
      }
      el.remove();
    };
    setTimeout(function () { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 300); }, 5000);
  }

  draw();
})(window, document);
