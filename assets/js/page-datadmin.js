/* مناطق · إدارة البيانات — إضافة وتعديل وحذف كل ركن في الموقع */
(function (w, d) {
  "use strict";
  var M = w.MQ, D = M.D, f0 = M.f0;
  M.buildAdminHeader("admin-data.html");

  var log = [
    { at: "النهاردة 20:14", who: "محمد زهران", act: "تعديل", on: "متوسط متر التوسعات الشرقية · 22,000 ← 48,000" },
    { at: "النهاردة 17:02", who: "سارة", act: "إضافة", on: "وحدة MNQ-108 · الهضبة العليا" },
    { at: "امبارح 11:46", who: "محمد زهران", act: "حذف", on: "وحدة MNQ-107 · اتباعت" }
  ];

  /* تعريف كل جدول: الأعمدة، والقراءة، والحقول اللي تتعدّل */
  var TABLES = {
    units: {
      t: "الوحدات",
      cols: ["الكود", "الوحدة", "المنطقة", "الحي", "المصدر", "المساحة", "السعر المعلن", "التكلفة الحقيقية", "متر حقيقي", "حكم مناطق"],
      rows: function () {
        return D.UNITS.map(function (u) {
          var vd = M.verdict(u);
          return { id: u.id, c: [
            "<span class='cd'>" + u.id + "</span>", "<b>" + u.t + "</b>", u.r, u.d, u.src,
            "<span class='n'>" + u.a + "</span>",
            "<span class='n'>" + f0(u.p) + "</span>",
            "<span class='n'>" + f0(M.cost(u)) + "</span>",
            "<span class='n sig'>" + f0(M.realPpm(u)) + "</span>",
            "<span class='vd " + vd[1] + "'>" + vd[0] + "</span>"
          ] };
        });
      },
      hint: "التكلفة الحقيقية وسعر المتر بيتحسبوا لوحدهم من السعر والجراج والصيانة — مش بتتكتب بالإيد. والحكم بيتغيّر لوحده مع أي تعديل."
    },
    projects: {
      t: "المشاريع",
      cols: ["الكود", "المشروع", "المطوّر", "المنطقة", "الحي", "الإنجاز", "التسليم", "تحديثات سعرية", "آخر تحديث"],
      rows: function () {
        var out = [];
        Object.keys(D.PROJECTS).forEach(function (r) {
          D.PROJECTS[r].forEach(function (p) {
            out.push({ id: p.id, c: [
              "<span class='cd'>" + p.id + "</span>", "<b>" + p.nm + "</b>", p.dev, r, p.dist,
              "<span class='n sig'>" + p.pct + "%</span>", p.del,
              "<span class='n'>" + p.hist.length + "</span>",
              "<span class='mut' style='font-size:11px'>" + p.hist[p.hist.length - 1][0] + "</span>"
            ] });
          });
        });
        return out;
      },
      hint: "سجل الأسعار بيتبني لوحده من الرسائل المعتمدة في الاستقبال — مش بيتكتب هنا."
    },
    devs: {
      t: "المطوّرون",
      cols: ["المطوّر", "المنطقة", "مشاريع", "أدلة موثّقة", "الفئة", "ملاحظة مناطق"],
      rows: function () {
        var out = [];
        Object.keys(D.DEVS).forEach(function (r) {
          D.DEVS[r].forEach(function (x) {
            var ok = x.ev.filter(function (e) { return e[1]; }).length;
            out.push({ id: x.nm, c: [
              "<b>" + x.nm + "</b>", r, "<span class='n'>" + x.projects + "</span>",
              "<span class='n " + (ok >= 5 ? "up" : ok >= 4 ? "wrn" : "dn") + "'>" + ok + " / " + x.ev.length + "</span>",
              "<span class='grade " + (x.grade === "أ" ? "a" : x.grade === "ب" ? "b" : "c") + "'>فئة " + x.grade + "</span>",
              "<span class='mut' style='font-size:11px'>" + x.note.slice(0, 54) + "…</span>"
            ] });
          });
        });
        return out;
      },
      hint: "الفئة محسوبة من الأدلة — متتكتبش بالإيد. غيّر دليل، تتغيّر الفئة."
    },
    districts: {
      t: "الأحياء",
      cols: ["الحي", "المنطقة", "سعر المتر", "العائد", "مؤشر الطلب", "أيام البيع", "العيّنة", "النمو السنوي", "الحالة"],
      rows: function () {
        var out = [];
        Object.keys(D.REGIONS).forEach(function (r) {
          D.REGIONS[r].districts.forEach(function (x) {
            var L = D.LIQUIDITY[x[0]] || [null, 0];
            out.push({ id: x[0], c: [
              "<b>" + x[0] + "</b>", r,
              "<span class='n'>" + f0(x[1]) + "</span>",
              "<span class='n'>" + (x[2] ? x[2].toFixed(1) + "%" : "—") + "</span>",
              "<span class='n'>" + x[3] + "</span>",
              "<span class='n'>" + (L[0] || "—") + "</span>",
              "<span class='n " + (L[1] < 5 ? "wrn" : "up") + "'>" + L[1] + "</span>",
              "<span class='n'>" + (D.GROWTH[x[0]] || "—") + "%</span>",
              x[4] ? "<span class='est'>تقديري</span>" : "<span class='mut' style='font-size:11px'>مقيس</span>"
            ] });
          });
        });
        return out;
      },
      hint: "لما العيّنة تقل عن 5 عمليات، الحي بيتعلّم عليه «تقديري» لوحده على الموقع كله."
    },
    pool: {
      t: "طلبات العملاء",
      cols: ["العميل", "النوع", "المنطقة", "الأحياء", "الميزانية", "المساحة", "الاستلام", "مسجّل من"],
      rows: function () {
        return D.POOL.map(function (q) {
          return { id: q.who, c: [
            "<b>" + q.who + "</b>",
            "<span class='chip'>" + q.tag + "</span>", q.reg,
            "<span class='mut' style='font-size:11px'>" + q.dist.join(" / ") + "</span>",
            "<span class='n'>" + f0(q.bmin) + "–" + f0(q.bmax) + "</span>",
            "<span class='n'>" + q.amin + "–" + q.amax + "</span>", q.del,
            "<span class='mut' style='font-size:11px'>" + q.at + "</span>"
          ] };
        });
      },
      hint: "كل طلب هنا بيتقارن آلياً بكل رسالة جديدة بتوصل. لما يتطابق، بيظهر في اقتناص الفرص."
    }
  };

  var cur = "units";
  function draw() {
    var T = TABLES[cur];
    d.getElementById("dHead").innerHTML = "<tr>" + T.cols.map(function (c) { return "<th>" + c + "</th>"; }).join("") +
      "<th></th></tr>";
    var rows = T.rows();
    d.getElementById("dBody").innerHTML = rows.map(function (r) {
      return "<tr data-id='" + r.id + "'>" + r.c.map(function (c) { return "<td>" + c + "</td>"; }).join("") +
        "<td style='white-space:nowrap'>" +
        "<button class='fx' type='button' data-act='edit'>تعديل</button> " +
        "<button class='fx' type='button' data-act='del'>حذف</button></td></tr>";
    }).join("");
    M.stagger(d.getElementById("dBody"));
    d.getElementById("dHint").innerHTML = "<b>" + rows.length + " صف.</b> " + T.hint;
  }

  d.getElementById("segT").addEventListener("click", function (e) {
    var b = e.target.closest("[data-t]"); if (!b) return;
    cur = b.dataset.t;
    this.querySelectorAll("button").forEach(function (x) {
      x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    draw();
  });

  d.getElementById("dBody").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var tr = b.closest("tr"), id = tr.dataset.id;
    if (b.dataset.act === "del") {
      if (!w.confirm("تحذف «" + id + "» من " + TABLES[cur].t + "؟")) return;
      tr.style.transition = "opacity .25s"; tr.style.opacity = "0";
      setTimeout(function () { tr.remove(); }, 260);
      addLog("حذف", id + " · " + TABLES[cur].t);
      toast("اتحذف " + id + " — والتغيير اتسجّل في السجل");
    } else {
      addLog("تعديل", id + " · " + TABLES[cur].t);
      toast("في النسخة المربوطة بقاعدة البيانات، هنا بتفتح استمارة تعديل «" + id + "» بكل حقوله");
    }
  });
  d.getElementById("addRow").onclick = function () {
    addLog("إضافة", "صف جديد · " + TABLES[cur].t);
    toast("في النسخة المربوطة بقاعدة البيانات، هنا بتفتح استمارة إضافة لـ" + TABLES[cur].t);
  };

  function addLog(act, on) {
    log.unshift({ at: "دلوقتي", who: "محمد زهران", act: act, on: on });
    drawLog();
  }
  function drawLog() {
    d.getElementById("editLog").innerHTML = log.slice(0, 8).map(function (x) {
      var c = x.act === "حذف" ? "dn" : x.act === "إضافة" ? "up" : "wrn";
      return "<tr><td class='num mut'>" + x.at + "</td><td>" + x.who + "</td>" +
        "<td><b class='" + c + "'>" + x.act + "</b></td>" +
        "<td class='mut' style='font-size:11.5px'>" + x.on + "</td></tr>";
    }).join("");
  }
  function toast(t) {
    var el = d.createElement("div"); el.className = "toast"; el.textContent = t;
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    setTimeout(function () { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 300); }, 4000);
  }

  draw(); drawLog(); M.markSections(); M.reveal();
})(window, document);
