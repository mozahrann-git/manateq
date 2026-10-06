/* ============================================================
   مناطق · الخريطة
   خريطة حقيقية بشوارع، وفوقها طبقة مناطق:
   حدود الأحياء ملوّنة بسعر المتر، والوحدات نقط بلون حكم مناطق.
   لو مكتبة الخريطة متحمّلتش، بنرسم الحدود بأنفسنا في SVG —
   فالصفحة بتفضل مفيدة في كل الأحوال.
   ============================================================ */
(function (w, d) {
  "use strict";

  function MQMap(hostId, opts) {
    var M = w.MQ, D = M.D;
    var host = d.getElementById(hostId);
    if (!host) return null;
    opts = opts || {};
    var region = opts.region || Object.keys(D.REGIONS)[0];
    var onDistrict = opts.onDistrict || function () {};
    var focus = opts.focus || null;
    var map = null, layers = [];

    /* لون الحي حسب سعر متره مقابل المنطقة */
    function heat(ppm) {
      var base = D.REGIONS[region].ppm;
      var v = (ppm - base) / base;                 // −0.3 .. +0.6
      var t = Math.max(0, Math.min(1, (v + 0.25) / 0.75));
      return { fill: "rgba(255,122,26," + (0.10 + t * 0.42).toFixed(2) + ")",
               line: "rgba(255,122,26," + (0.35 + t * 0.5).toFixed(2) + ")" };
    }
    var VD = { "فرصة": "#3AD483", "محايد": "#F2B233", "متضخّم": "#FF5E55", "انتظر": "#94A0AF" };

    function districtsOf(r) {
      return D.REGIONS[r].districts.filter(function (x) { return D.DISTRICT_GEO[x[0]]; });
    }

    /* ---------- النسخة الكاملة بالخرائط ---------- */
    function buildLeaflet() {
      var geo = D.REGION_GEO[region];
      map = w.L.map(host, {
        center: geo.center, zoom: geo.zoom, zoomControl: true,
        scrollWheelZoom: false, attributionControl: true
      });
      w.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19, subdomains: "abcd"
      }).addTo(map);
      draw();
      return true;
    }

    function draw() {
      layers.forEach(function (l) { map.removeLayer(l); });
      layers = [];
      var geo = D.REGION_GEO[region];
      map.setView(geo.center, geo.zoom);

      /* الأحياء */
      districtsOf(region).forEach(function (x) {
        var c = heat(x[1]);
        var on = focus && x[0] === focus;
        var poly = w.L.polygon(D.DISTRICT_GEO[x[0]], {
          color: on ? "#FF7A1A" : c.line, weight: on ? 3 : 1.4, fillColor: "#FF7A1A",
          fillOpacity: on ? 0.34 : parseFloat(c.fill.split(",")[3]),
          dashArray: x[4] ? "4 4" : null
        }).addTo(map);
        if (on) { try { map.fitBounds(poly.getBounds().pad(1.1)); } catch (e) {} }
        poly.bindTooltip(
          '<b>' + x[0] + '</b><br><span class="n">' + M.f0(x[1]) + '</span> ج.م/م²' +
          (x[4] ? '<br><i>تقديري · عيّنة صغيرة</i>' : ''),
          { className: "mqtip", direction: "top", sticky: true });
        poly.on("click", function () { onDistrict(x[0]); });
        poly.on("mouseover", function () { poly.setStyle({ weight: 2.6 }); });
        poly.on("mouseout", function () { poly.setStyle({ weight: on ? 3 : 1.4 }); });
        layers.push(poly);
      });

      /* الوحدات */
      M.unitsOf(region).forEach(function (u) {
        var pt = D.POINTS[u.id];
        if (!pt) return;
        var vd = M.verdict(u), col = VD[vd[0]] || "#94A0AF";
        var mk = w.L.circleMarker(pt, {
          radius: 6, color: col, weight: 2, fillColor: "#07090C", fillOpacity: 1
        }).addTo(map);
        mk.bindPopup(
          '<div class="mqpop"><span class="cd">' + u.id + '</span>' +
          '<b>' + u.t + '</b>' +
          '<span class="r"><span>متر حقيقي</span><i class="n">' + M.f0(M.realPpm(u)) + '</i></span>' +
          '<span class="r"><span>مقابل الحي</span><i class="n ' + (M.vsDistrict(u) < 0 ? "up" : "dn") + '">' +
            M.pc(M.vsDistrict(u)) + '</i></span>' +
          (M.capRate(u) ? '<span class="r"><span>العائد الصافي</span><i class="n up">' +
            M.capRate(u).toFixed(1) + '%</i></span>' : '') +
          '<span class="vd" style="background:transparent;color:' + col + ';padding:0">' + vd[0] + '</span>' +
          '<a href="' + M.LINK.unit(u.id) + '">افتح ملف الوحدة ←</a></div>',
          { className: "mqpopw", closeButton: true });
        layers.push(mk);
      });
    }

    /* ---------- النسخة الاحتياطية: SVG بحدودنا بس ---------- */
    function buildSvg() {
      var ds = districtsOf(region);
      var all = [];
      ds.forEach(function (x) { D.DISTRICT_GEO[x[0]].forEach(function (p) { all.push(p); }); });
      M.unitsOf(region).forEach(function (u) { if (D.POINTS[u.id]) all.push(D.POINTS[u.id]); });
      if (!all.length) { host.innerHTML = '<p class="empty">مفيش حدود مرسومة للمنطقة دي.</p>'; return; }

      var lats = all.map(function (p) { return p[0]; }), lngs = all.map(function (p) { return p[1]; });
      var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats);
      var minLng = Math.min.apply(null, lngs), maxLng = Math.max.apply(null, lngs);
      var padLat = (maxLat - minLat) * 0.12 || 0.01, padLng = (maxLng - minLng) * 0.12 || 0.01;
      minLat -= padLat; maxLat += padLat; minLng -= padLng; maxLng += padLng;
      var W = 1000, H = 620;
      function X(lng) { return (lng - minLng) / (maxLng - minLng) * W; }
      function Y(lat) { return H - (lat - minLat) / (maxLat - minLat) * H; }

      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="mqsvg" role="img" aria-label="خريطة ' + region + '">';
      ds.forEach(function (x, i) {
        var c = heat(x[1]);
        var pts = D.DISTRICT_GEO[x[0]].map(function (p) { return X(p[1]).toFixed(1) + "," + Y(p[0]).toFixed(1); }).join(" ");
        var cx = D.DISTRICT_GEO[x[0]].reduce(function (a, p) { return a + X(p[1]); }, 0) / D.DISTRICT_GEO[x[0]].length;
        var cy = D.DISTRICT_GEO[x[0]].reduce(function (a, p) { return a + Y(p[0]); }, 0) / D.DISTRICT_GEO[x[0]].length;
        var on = focus && x[0] === focus;
        svg += '<polygon class="dpoly' + (on ? ' on' : '') + '" data-d="' + x[0] + '" points="' + pts +
          '" fill="' + (on ? "rgba(255,122,26,.34)" : c.fill) +
          '" stroke="' + (on ? "#FF7A1A" : c.line) + '" stroke-width="' + (on ? 3 : 1.6) + '"' + (x[4] ? ' stroke-dasharray="5 4"' : '') +
          ' style="animation-delay:' + (i * 90) + 'ms"><title>' + x[0] + ' · ' + M.f0(x[1]) + ' ج.م/م²</title></polygon>' +
          '<text class="dlbl" x="' + cx.toFixed(0) + '" y="' + cy.toFixed(0) + '" text-anchor="middle">' + x[0] + '</text>' +
          '<text class="dnum" x="' + cx.toFixed(0) + '" y="' + (cy + 16).toFixed(0) + '" text-anchor="middle">' + M.f0(x[1]) + '</text>';
      });
      M.unitsOf(region).forEach(function (u, i) {
        var pt = D.POINTS[u.id];
        if (!pt) return;
        var col = VD[M.verdict(u)[0]] || "#94A0AF";
        svg += '<circle class="upt" data-u="' + u.id + '" cx="' + X(pt[1]).toFixed(1) + '" cy="' + Y(pt[0]).toFixed(1) +
          '" r="6" fill="#07090C" stroke="' + col + '" stroke-width="2.2" style="animation-delay:' + (500 + i * 70) + 'ms">' +
          '<title>' + u.id + ' · ' + u.t + ' · ' + M.f0(M.realPpm(u)) + ' ج.م/م²</title></circle>';
      });
      svg += '</svg>';
      host.innerHTML = svg;
      host.querySelectorAll(".dpoly").forEach(function (el) {
        el.addEventListener("click", function () { onDistrict(el.getAttribute("data-d")); });
      });
      host.querySelectorAll(".upt").forEach(function (el) {
        el.addEventListener("click", function () { w.location.href = M.LINK.unit(el.getAttribute("data-u")); });
      });
    }

    var useLeaflet = !!(w.L && w.L.map);
    if (useLeaflet) { try { buildLeaflet(); } catch (e) { useLeaflet = false; } }
    if (!useLeaflet) { host.classList.add("svgmode"); buildSvg(); }

    return {
      setRegion: function (r) {
        region = r;
        if (useLeaflet) draw(); else buildSvg();
      },
      isLive: function () { return useLeaflet; }
    };
  }

  w.MQMap = MQMap;
})(window, document);
