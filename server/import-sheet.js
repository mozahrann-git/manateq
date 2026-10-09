#!/usr/bin/env node
/* ============================================================
   مناطق · استيراد شيت السيلز
   ------------------------------------------------------------
   صدّر شيت «السيلز» CSV وشغّل:

     node server/import-sheet.js القايمة.csv            # يستورد ويطبع اللينكات
     node server/import-sheet.js القايمة.csv --dry      # يوريك هيعمل إيه وبس
     node server/import-sheet.js القايمة.csv --links    # يطبع اللينكات من غير تعديل

   بيعرف الأعمدة من أسمائها — فترتيبها في الشيت مش مهم.
   وبيحدّث الموجود بدل ما يكرّره: الرقم هو الهوية.
   ============================================================ */
"use strict";
const fs = require("fs");
const Store = require("./store");
const Portal = require("./portal");
const cfg = require("./config");

/* CSV بالأصول: اقتباسات، فواصل جوه الخانة، وأسطر جوه الخانة */
function parseCsv(txt) {
  txt = txt.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) {
      if (c === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim()));
}

/* بندوّر على الترويسة في أول 10 صفوف — فوقها عنوان وشرح */
const WANT = {
  phone: ["رقم السيلز", "واتساب", "phone", "رقم"],
  nm:    ["اسم السيلز", "الاسم", "name"],
  dev:   ["المطوّر", "المطور", "developer"],
  devPhone: ["رقم المطوّر", "رقم المطور"],
  reg:   ["المنطقة", "region"],
  projects: ["المشاريع", "projects"],
  status: ["حالة التواصل", "الحالة", "status"],
  note:  ["ملاحظات", "note"]
};
function mapHeader(cells) {
  const idx = {};
  cells.forEach((raw, i) => {
    const h = String(raw).trim();
    if (!h) return;
    Object.keys(WANT).forEach(k => {
      if (idx[k] !== undefined) return;
      if (WANT[k].some(w => h.indexOf(w) > -1)) idx[k] = i;
    });
  });
  return idx;
}
function findHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const idx = mapHeader(rows[i]);
    if (idx.phone !== undefined && idx.nm !== undefined) return { i, idx };
  }
  return null;
}

/* الرقم هو الهوية، فلازم يبقى بشكل واحد: 2010… من غير + ولا مسافات */
function normPhone(s) {
  let p = String(s || "").replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x0660))
                         .replace(/[^\d+]/g, "");
  p = p.replace(/^\+/, "");
  if (/^0[0-9]{10}$/.test(p)) p = "2" + p;        // 01xxxxxxxxx → 201xxxxxxxxx
  else if (/^1[0-9]{9}$/.test(p)) p = "20" + p;   // 1xxxxxxxxx  → 201xxxxxxxxx
  return /^20[0-9]{10}$/.test(p) ? p : (p.length >= 10 ? p : "");
}

function main() {
  const args = process.argv.slice(2);
  const file = args.find(a => !a.startsWith("--"));
  const dry = args.includes("--dry");
  const linksOnly = args.includes("--links");
  if (!file) {
    console.log("الاستخدام: node server/import-sheet.js <القايمة.csv> [--dry] [--links]");
    process.exit(1);
  }

  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  const head = findHeader(rows);
  if (!head) {
    console.error("ملقيتش ترويسة فيها «رقم السيلز» و«اسم السيلز». صدّرت شيت «السيلز» صح؟");
    process.exit(1);
  }
  const { i: hi, idx } = head;
  console.log("الترويسة في الصف " + (hi + 1) + " · أعمدة: " + Object.keys(idx).join(", ") + "\n");

  const store = new Store(cfg.dataDir);
  const portal = new Portal(store, cfg.portalSecret || "dev-secret-for-dry-run-only");
  const get = (r, k) => idx[k] === undefined ? "" : String(r[idx[k]] || "").trim();

  let added = 0, updated = 0, skipped = 0;
  const out = [];

  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i];
    const phone = normPhone(get(r, "phone"));
    const nm = get(r, "nm");
    if (!phone) {
      if (get(r, "phone")) { skipped++; console.log("  ⚠ سطر " + (i + 1) + ": رقم مش مفهوم «" + get(r, "phone") + "»"); }
      continue;
    }
    if (!nm) { skipped++; console.log("  ⚠ سطر " + (i + 1) + ": " + phone + " من غير اسم"); continue; }

    const projects = get(r, "projects").split(/[,،]/).map(s => s.trim()).filter(Boolean);
    const patch = {
      nm, dev: get(r, "dev"), reg: get(r, "reg"),
      projects, pending: 0
    };
    const existed = !!store.state.reps[phone];
    if (!dry) {
      store.rep(phone, nm);
      store.setRep(phone, patch);
      if (get(r, "devPhone")) store.state.reps[phone].devPhone = get(r, "devPhone");
      if (get(r, "status")) store.state.reps[phone].outreach = get(r, "status");
      if (get(r, "note")) store.state.reps[phone].note = get(r, "note");
      store._save();
    }
    existed ? updated++ : added++;

    let link = "";
    if (!dry) {
      const t = portal.issue(phone, false);
      link = cfg.portalBase + "/portal.html#" + t.token;
    }
    out.push({ phone, nm, dev: patch.dev, link });
  }

  console.log("\n" + (dry ? "تجربة — مفيش حاجة اتكتبت" : "تمام") +
    ": " + added + " جديد · " + updated + " اتحدّث · " + skipped + " اتخطّى");

  if (!dry) {
    console.log("\n──── لينكات البوابة ────");
    out.forEach(o => {
      console.log("\n" + o.nm + (o.dev ? "  —  " + o.dev : "") + "   " + o.phone);
      console.log(o.link);
    });
    /* ملف CSV جاهز ترجّعه في عمود «لينك البوابة» */
    const csv = "رقم السيلز,اسم السيلز,المطوّر,لينك البوابة\n" +
      out.map(o => [o.phone, o.nm, o.dev, o.link]
        .map(x => '"' + String(x).replace(/"/g, '""') + '"').join(",")).join("\n");
    fs.writeFileSync("portal-links.csv", "﻿" + csv, "utf8");
    console.log("\n\nواللينكات كلها في: portal-links.csv");
  }
}

if (require.main === module) main();
module.exports = { parseCsv, normPhone, findHeader };
