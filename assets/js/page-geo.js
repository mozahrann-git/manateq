/* مناطق · محرّر الخريطة
   تحكّم كامل في الحدود: ارسم، عدّل رؤوس المضلّع، امسح، وضيف مناطق وأحياء.
   التعديل بيتحفظ على الجهاز ده فوراً وبيبان في الموقع كله —
   والتثبيت لكل الزوّار بيحصل لما نحدّث ملف البيانات. */
(function (w, d) {
  "use strict";
  var M = w.MQ, D = M.D, f0 = M.f0;
  M.buildAdminHeader("admin-geo.html");

  var KEY = "mq_geo";
  var cur = Object.keys(D.REGIONS)[0];
  var sel = null;          /* اسم الحي المحدّد */
  var mode = "view";       /* view | draw | edit */
  var draft = [];          /* نقط الرسم الجاري */
  var map = null, polys = {}, handles = [], ghost = null, pendingName = null;

  /* ---------- الحفظ ---------- */
  function store() {
    try { return JSON.parse(w.localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function save(o) {
    try { w.localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {
      toast("مش قادر أحفظ على الجهاز ده — التخزين مقفول في المتصفح");
    }
    dirtyLine();
  }
  function putGeo(name, pts) {
    var o = store();
    o.DISTRICT_GEO = o.DISTRICT_GEO || {};
    o.DISTRICT_GEO[name] = pts;
    if (o.DROP) o.DROP = o.DROP.filter(function (x) { return x !== name; });
    D.DISTRICT_GEO[name] = pts;
    save(o);
  }
  function dropDistrict(name) {
    var o = store();
    o.DROP = o.DROP || [];
    if (o.DROP.indexOf(name) < 0) o.DROP.push(name);
    if (o.DISTRICT_GEO) delete o.DISTRICT_GEO[name];
    delete D.DISTRICT_GEO[name];
    Object.keys(D.REGIONS).forEach(function (r) {
      D.REGIONS[r].districts = D.REGIONS[r].districts.filter(function (x) { return x[0] !== name; });
    });
    o.REGIONS = o.REGIONS || {};
    Object.keys(D.REGIONS).forEach(function (r) { o.REGIONS[r] = o.REGIONS[r] || {}; o.REGIONS[r].districts = D.REGIONS[r].districts; });
    save(o);
  }
  function putDistrict(region, row) {
    D.REGIONS[region].districts.push(row);
    var o = store();
    o.REGIONS = o.REGIONS || {};
    o.REGIONS[region] = o.REGIONS[region] || {};
    o.REGIONS[region].districts = D.REGIONS[region].districts;
    save(o);
  }
  function putRegion(name, info, geo) {
    D.REGIONS[name] = info;
    D.REGION_GEO[name] = geo;
    var o = store();
    o.REGIONS = o.REGIONS || {}; o.REGION_GEO = o.REGION_GEO || {};
    o.REGIONS[name] = info; o.REGION_GEO[name] = geo;
    save(o);
  }
  function dropRegion(name) {
    (D.REGIONS[name].districts || []).forEach(function (x) { delete D.DISTRICT_GEO[x[0]]; });
    delete D.REGIONS[name]; delete D.REGION_GEO[name];
    var o = store();
    o.DROPR = o.DROPR || [];
    if (o.DROPR.indexOf(name) < 0) o.DROPR.push(name);
    if (o.REGIONS) delete o.REGIONS[name];
    if (o.REGION_GEO) delete o.REGION_GEO[name];
    save(o);
  }

  /* ---------- الخريطة ---------- */
  function buildMap() {
    var host = d.getElementById("gmap");
    if (!w.L || !w.L.map) {
      host.innerHTML = '<p class="empty">مكتبة الخريطة متحمّلتش — المحرّر محتاج اتصال بالإنترنت.</p>';
      return false;
    }
    var g = D.REGION_GEO[cur] || { center: [30.04, 31.3], zoom: 11 };
    map = w.L.map(host, { center: g.center, zoom: g.zoom, zoomControl: true, scrollWheelZoom: false });
    w.MQMap.addTiles(map);
    map.on("click", onMapClick);
    function fix() { try { map.invalidateSize(false); } catch (e) {} }
    if (w.ResizeObserver) new w.ResizeObserver(fix).observe(host);
    w.addEventListener("resize", fix);
    [60, 300, 900].forEach(function (ms) { setTimeout(fix, ms); });
    return true;
  }

  function clearLayers() {
    Object.keys(polys).forEach(function (k) { map.removeLayer(polys[k]); });
    polys = {};
    clearHandles();
    if (ghost) { map.removeLayer(ghost); ghost = null; }
  }
  function clearHandles() {
    handles.forEach(function (h) { map.removeLayer(h); });
    handles = [];
  }

  function drawAll() {
    if (!map) return;
    clearLayers();
    var g = D.REGION_GEO[cur];
    if (g) map.setView(g.center, g.zoom);
    var all = [];
    (D.REGIONS[cur].districts || []).forEach(function (x) {
      var pts = D.DISTRICT_GEO[x[0]];
      if (!pts || pts.length < 3) return;
      pts.forEach(function (p) { all.push(p); });
      var on = x[0] === sel;
      var poly = w.L.polygon(pts, {
        color: on ? "#FF7A1A" : "rgba(255,122,26,.5)", weight: on ? 3 : 1.4,
        fillColor: "#FF7A1A", fillOpacity: on ? 0.3 : 0.12,
        dashArray: x[4] ? "4 4" : null
      }).addTo(map);
      poly.bindTooltip('<b>' + x[0] + '</b><i class="n">' + f0(x[1]) + '</i>',
        { className: "mqlbl" + (on ? " on" : ""), permanent: true, direction: "center", opacity: 1 });
      poly.on("click", function (e) {
        if (mode === "draw") return;
        w.L.DomEvent.stop(e);
        pick(x[0]);
      });
      polys[x[0]] = poly;
    });
    if (all.length && mode === "view") {
      try { map.fitBounds(w.L.latLngBounds(all).pad(0.18)); } catch (e) {}
    }
    if (sel && mode === "edit") editHandles();
    list();
  }

  /* ---------- تحديد وتحرير الرؤوس ---------- */
  function pick(name) {
    sel = name; mode = "view";
    drawAll(); bar();
  }
  function editHandles() {
    clearHandles();
    var pts = D.DISTRICT_GEO[sel];
    if (!pts) return;
    pts.forEach(function (p, i) {
      var mk = w.L.marker(p, { draggable: true, icon: vIcon() }).addTo(map);
      mk.on("drag", function () {
        var ll = mk.getLatLng();
        pts[i] = [+ll.lat.toFixed(5), +ll.lng.toFixed(5)];
        if (polys[sel]) polys[sel].setLatLngs(pts);
      });
      mk.on("dragend", function () { putGeo(sel, pts); info(); });
      mk.on("dblclick", function (e) {
        w.L.DomEvent.stop(e);
        if (pts.length <= 3) { toast("المضلّع لازم 3 رؤوس على الأقل"); return; }
        pts.splice(i, 1); putGeo(sel, pts); drawAll(); editHandles();
      });
      handles.push(mk);
    });
    /* نقط المنتصف: اسحبها تزوّد رأس جديد */
    pts.forEach(function (p, i) {
      var q = pts[(i + 1) % pts.length];
      var mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      var mk = w.L.marker(mid, { draggable: true, icon: vIcon(true) }).addTo(map);
      mk.on("dragend", function () {
        var ll = mk.getLatLng();
        pts.splice(i + 1, 0, [+ll.lat.toFixed(5), +ll.lng.toFixed(5)]);
        putGeo(sel, pts); drawAll(); editHandles();
      });
      handles.push(mk);
    });
  }
  function vIcon(mid) {
    return w.L.divIcon({ className: "vtx" + (mid ? " mid" : ""), iconSize: [mid ? 11 : 14, mid ? 11 : 14] });
  }

  /* ---------- الرسم ---------- */
  function onMapClick(e) {
    if (mode !== "draw") return;
    draft.push([+e.latlng.lat.toFixed(5), +e.latlng.lng.toFixed(5)]);
    paintDraft();
  }
  function paintDraft() {
    if (ghost) { map.removeLayer(ghost); ghost = null; }
    clearHandles();
    if (draft.length) {
      ghost = draft.length > 2
        ? w.L.polygon(draft, { color: "#F2B233", weight: 2.2, fillColor: "#F2B233", fillOpacity: .16, dashArray: "5 4" }).addTo(map)
        : w.L.polyline(draft, { color: "#F2B233", weight: 2.2, dashArray: "5 4" }).addTo(map);
      draft.forEach(function (p) {
        handles.push(w.L.marker(p, { icon: vIcon() }).addTo(map));
      });
    }
    bar();
  }
  function startDraw(name) {
    pendingName = name; sel = name; mode = "draw";
    draft = (name && D.DISTRICT_GEO[name]) ? [] : [];
    paintDraft(); drawAll(); bar();
    toast("اضغط على الخريطة نقطة نقطة · 3 نقط على الأقل · وبعدين «خلّصت»");
  }
  function finishDraw() {
    if (draft.length < 3) { toast("محتاج 3 نقط على الأقل"); return; }
    putGeo(pendingName, draft.slice());
    draft = []; mode = "view";
    if (ghost) { map.removeLayer(ghost); ghost = null; }
    clearHandles(); drawAll(); bar();
    toast("الحدود اتحفظت — بتبان في الموقع كله على الجهاز ده");
  }
  function cancelDraw() {
    draft = []; mode = "view"; pendingName = null;
    if (ghost) { map.removeLayer(ghost); ghost = null; }
    clearHandles(); drawAll(); bar();
  }

  /* ---------- الواجهة ---------- */
  function bar() {
    var b = d.getElementById("gbar");
    if (mode === "draw") {
      b.innerHTML = '<span class="gst wrn">بترسم: <b>' + (pendingName || "—") + '</b> · ' + draft.length + ' نقطة</span>' +
        '<button class="fx" type="button" data-a="undo">تراجع نقطة</button>' +
        '<button class="b1" type="button" data-a="done">خلّصت</button>' +
        '<button class="fx" type="button" data-a="cancel">إلغاء</button>';
      return;
    }
    if (!sel) {
      b.innerHTML = '<span class="gst mut">اضغط على أي حي في الخريطة أو في القايمة عشان تتحكم فيه.</span>';
      return;
    }
    var has = !!D.DISTRICT_GEO[sel];
    b.innerHTML = '<span class="gst">محدّد: <b class="sig">' + sel + '</b></span>' +
      (has ? '<button class="fx" type="button" data-a="' + (mode === "edit" ? "stop" : "edit") + '">' +
        (mode === "edit" ? "قفل التحرير" : "حرّك الرؤوس") + '</button>' : '') +
      '<button class="fx" type="button" data-a="redraw">' + (has ? "ارسم من جديد" : "ارسم الحدود") + '</button>' +
      '<button class="fx" type="button" data-a="del">امسح الحي</button>';
  }
  d.getElementById("gbar").addEventListener("click", function (e) {
    var b = e.target.closest("[data-a]"); if (!b) return;
    var a = b.dataset.a;
    if (a === "undo") { draft.pop(); paintDraft(); }
    if (a === "done") finishDraw();
    if (a === "cancel") cancelDraw();
    if (a === "edit") { mode = "edit"; editHandles(); bar(); toast("اسحب أي رأس · النقط الصغيرة بتزوّد رأس · دبل كليك بيمسح رأس"); }
    if (a === "stop") { mode = "view"; clearHandles(); bar(); }
    if (a === "redraw") startDraw(sel);
    if (a === "del") {
      if (!w.confirm("تمسح «" + sel + "» من " + cur + "؟ الحي وحدوده هيختفوا من الموقع كله.")) return;
      var n = sel; dropDistrict(n); sel = null; mode = "view";
      drawAll(); bar(); line();
      toast("«" + n + "» اتمسح");
    }
  });

  function list() {
    var ds = D.REGIONS[cur].districts || [];
    d.getElementById("glist").innerHTML = ds.length ? ds.map(function (x, i) {
      var has = !!(D.DISTRICT_GEO[x[0]] && D.DISTRICT_GEO[x[0]].length > 2);
      return '<button class="grow' + (x[0] === sel ? " on" : "") + '" type="button" data-d="' + x[0] + '" style="--i:' + i + '">' +
        '<span class="dot ' + (has ? "up" : "dn") + '"></span>' +
        '<span class="mt2"><b>' + x[0] + '</b><i>' + f0(x[1]) + ' ج.م/م²' + (x[4] ? ' · تقديري' : '') + '</i></span>' +
        '<span class="gpt n">' + (has ? D.DISTRICT_GEO[x[0]].length + " رأس" : "مرسومش") + '</span></button>';
    }).join("") : '<p class="empty" style="padding:22px">مفيش أحياء في المنطقة دي. ضيف واحد من تحت.</p>';
    M.stagger(d.getElementById("glist"));
  }
  d.getElementById("glist").addEventListener("click", function (e) {
    var b = e.target.closest("[data-d]"); if (!b) return;
    pick(b.dataset.d);
    var p = polys[b.dataset.d];
    if (p) { try { map.fitBounds(p.getBounds().pad(0.6)); } catch (er) {} }
  });

  function line() {
    var ds = D.REGIONS[cur].districts || [];
    var drawn = ds.filter(function (x) { return D.DISTRICT_GEO[x[0]] && D.DISTRICT_GEO[x[0]].length > 2; }).length;
    var o = store();
    var edits = (o.DISTRICT_GEO ? Object.keys(o.DISTRICT_GEO).length : 0) + (o.DROP ? o.DROP.length : 0) +
                (o.REGION_GEO ? Object.keys(o.REGION_GEO).length : 0) + (o.DROPR ? o.DROPR.length : 0);
    [["المنطقة", cur, "mono"], ["مناطق الموقع", Object.keys(D.REGIONS).length, "sig"],
     ["أحياء المنطقة", ds.length, "sig"], ["مرسومة", drawn, drawn === ds.length ? "up" : "wrn"],
     ["ناقصة حدود", ds.length - drawn, ds.length - drawn ? "dn" : "up"],
     ["تعديلات مش متثبّتة", edits, edits ? "wrn" : "mut"]]
    .forEach(function (x, i) {
      if (i === 0) d.getElementById("gline").innerHTML = "";
      d.getElementById("gline").innerHTML += '<div class="ops1"><p class="l">' + x[0] + '</p>' +
        '<p class="v ' + x[2] + '">' + x[1] + '</p></div>';
    });
  }
  function info() { line(); list(); }

  function regions() {
    d.getElementById("segReg").innerHTML = Object.keys(D.REGIONS).map(function (r) {
      return '<button type="button" data-r="' + r + '" aria-pressed="' + (r === cur) + '">' + r + '</button>';
    }).join("");
  }
  d.getElementById("segReg").addEventListener("click", function (e) {
    var b = e.target.closest("[data-r]"); if (!b) return;
    if (mode === "draw") cancelDraw();
    cur = b.dataset.r; sel = null;
    regions(); drawAll(); bar(); line();
  });

  /* ---------- إضافة حي ---------- */
  d.getElementById("addD").addEventListener("click", function () {
    var nm = (d.getElementById("ndName").value || "").trim();
    var pp = parseFloat(d.getElementById("ndPpm").value);
    if (!nm) { bad("ndName"); return; }
    if (D.DISTRICT_GEO[nm] || (D.REGIONS[cur].districts || []).some(function (x) { return x[0] === nm; })) {
      toast("فيه حي بالاسم ده بالفعل"); bad("ndName"); return;
    }
    if (!(pp > 0)) { bad("ndPpm"); return; }
    var yl = parseFloat(d.getElementById("ndYld").value) || 7;
    var dm = parseFloat(d.getElementById("ndDem").value) || 60;
    var es = d.getElementById("ndEst").getAttribute("aria-pressed") === "true" ? 1 : 0;
    putDistrict(cur, [nm, pp, yl, dm, es]);
    d.getElementById("ndName").value = ""; d.getElementById("ndPpm").value = "";
    info(); startDraw(nm);
  });

  /* ---------- إضافة منطقة ---------- */
  d.getElementById("addR").addEventListener("click", function () {
    var nm = (d.getElementById("nrName").value || "").trim();
    if (!nm) { bad("nrName"); return; }
    if (D.REGIONS[nm]) { toast("فيه منطقة بالاسم ده"); bad("nrName"); return; }
    var c = map ? map.getCenter() : { lat: 30.04, lng: 31.3 };
    var z = map ? map.getZoom() : 11;
    putRegion(nm, { ppm: 0, yld: 0, demand: 0, saleDays: 60, g30: 0, districts: [] },
      { center: [+c.lat.toFixed(4), +c.lng.toFixed(4)], zoom: z });
    d.getElementById("nrName").value = "";
    cur = nm; sel = null;
    regions(); drawAll(); bar(); line();
    toast("«" + nm + "» اتضافت على مركز الشاشة الحالي — ضيف أحياءها دلوقتي");
  });
  d.getElementById("setC").addEventListener("click", function () {
    if (!map) return;
    var c = map.getCenter();
    putRegion(cur, D.REGIONS[cur], { center: [+c.lat.toFixed(4), +c.lng.toFixed(4)], zoom: map.getZoom() });
    toast("مركز وتقريب «" + cur + "» اتحفظوا على المنظر الحالي");
    line();
  });
  d.getElementById("delR").addEventListener("click", function () {
    if (Object.keys(D.REGIONS).length <= 1) { toast("مينفعش تمسح آخر منطقة"); return; }
    if (!w.confirm("تمسح منطقة «" + cur + "» وكل أحياءها؟")) return;
    var n = cur; dropRegion(n);
    cur = Object.keys(D.REGIONS)[0]; sel = null;
    regions(); drawAll(); bar(); line();
    toast("منطقة «" + n + "» اتمسحت");
  });

  function bad(id) {
    var e = d.getElementById(id);
    e.classList.add("bad"); e.focus();
    setTimeout(function () { e.classList.remove("bad"); }, 900);
  }
  d.getElementById("ndEst").addEventListener("click", function () {
    var on = this.getAttribute("aria-pressed") === "true";
    this.setAttribute("aria-pressed", on ? "false" : "true");
  });

  /* ---------- التثبيت والتصدير ---------- */
  function dirtyLine() {
    var o = store();
    var n = (o.DISTRICT_GEO ? Object.keys(o.DISTRICT_GEO).length : 0) + (o.DROP ? o.DROP.length : 0) +
            (o.REGION_GEO ? Object.keys(o.REGION_GEO).length : 0) + (o.DROPR ? o.DROPR.length : 0) +
            (o.REGIONS ? Object.keys(o.REGIONS).length : 0);
    var el = d.getElementById("gdirty");
    el.innerHTML = n
      ? '<b>فيه ' + n + ' تعديل محفوظ على الجهاز ده بس.</b> بيبان ليك في الموقع كله دلوقتي — ' +
        'لكن الزائر لسه شايف الحدود القديمة. نزّل الملف وسلّمه عشان يتثبّت للكل.'
      : 'مفيش تعديلات. الخريطة زي ما هي متسلّمة.';
    el.className = n ? "gap" : "hint";
  }

  function fmt(pts) {
    return "[" + pts.map(function (p) { return "[" + p[0] + "," + p[1] + "]"; }).join(",") + "]";
  }
  d.getElementById("expBtn").addEventListener("click", function () {
    var out = "/* مناطق · حدود الخريطة — متولّد من محرّر الخريطة\n   " +
      new Date().toISOString().slice(0, 16).replace("T", " ") + " */\n(function (w) {\n  var D = w.MQ_DATA;\n\n";
    out += "  D.REGION_GEO = " + JSON.stringify(D.REGION_GEO, null, 2).replace(/\n/g, "\n  ") + ";\n\n";
    out += "  D.DISTRICT_GEO = {\n" + Object.keys(D.DISTRICT_GEO).map(function (k) {
      return '    "' + k + '": ' + fmt(D.DISTRICT_GEO[k]);
    }).join(",\n") + "\n  };\n\n";
    out += "  /* أحياء كل منطقة: [الاسم, سعر المتر, العائد, الطلب, تقديري] */\n";
    out += "  var DIS = {\n" + Object.keys(D.REGIONS).map(function (r) {
      return '    "' + r + '": ' + JSON.stringify(D.REGIONS[r].districts);
    }).join(",\n") + "\n  };\n";
    out += "  Object.keys(DIS).forEach(function (r) {\n" +
           "    D.REGIONS[r] = D.REGIONS[r] || { ppm:0, yld:0, demand:0, saleDays:60, g30:0 };\n" +
           "    D.REGIONS[r].districts = DIS[r];\n  });\n";
    out += "  Object.keys(D.REGIONS).forEach(function (r) { if (!DIS[r]) delete D.REGIONS[r]; });\n";
    out += "})(window);\n";

    d.getElementById("expOut").value = out;
    var blob = new w.Blob([out], { type: "text/javascript;charset=utf-8" });
    var a = d.createElement("a");
    a.href = w.URL.createObjectURL(blob);
    a.download = "manateq-geo.js";
    d.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { w.URL.revokeObjectURL(a.href); }, 1000);
    toast("الملف اتنزّل — سلّمه عشان يتثبّت لكل الزوّار");
  });
  d.getElementById("copyBtn").addEventListener("click", function () {
    var t = d.getElementById("expOut");
    if (!t.value) d.getElementById("expBtn").click();
    t.select();
    try { d.execCommand("copy"); toast("اتنسخ ✓"); } catch (e) { toast("اختار النص وانسخه بإيدك"); }
  });
  d.getElementById("resetBtn").addEventListener("click", function () {
    if (!w.confirm("ترجّع كل الحدود زي ما هي متسلّمة؟ كل تعديلاتك المحلية هتروح.")) return;
    try { w.localStorage.removeItem(KEY); } catch (e) {}
    w.location.reload();
  });

  function toast(t) {
    var el = d.createElement("div"); el.className = "toast"; el.textContent = t;
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    setTimeout(function () { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 300); }, 4200);
  }

  regions();
  if (buildMap()) drawAll(); else list();
  bar(); line(); dirtyLine();
  M.markSections(); M.reveal();
})(window, document);
