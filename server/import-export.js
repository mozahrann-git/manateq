#!/usr/bin/env node
/* ============================================================
   مناطق · استيراد محادثات WhatsApp Business
   ------------------------------------------------------------
   ده الجسر اللي بيخلّيك تبدأ تجمع النهاردة من غير ما تستنى الـAPI.
   صدّر المحادثة من التطبيق (بدون وسائط) وشغّل:

     node server/import-export.js ~/exports/*.txt --rep "+201004412287" --me "محمد زهران"

   بيدخّل نفس المخزن اللي الويبهوك بيدخّله، فالرسايل اللي بتتجمع
   دلوقتي هتبقى جوه التاريخ لما الـAPI يشتغل — مش هتضيع ولا واحدة.
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");
const Store = require("./store");
const { readMessage } = require("./parse");
const cfg = require("./config");

/* التصدير بيختلف حسب النظام واللغة، فبنمسك الشكلين:
   iOS   : [09/10/2026, 7:45:12 PM] الاسم: النص
   Android: 09/10/2026, 19:45 - الاسم: النص
   وبالعربي بيبقى ص/م بدل AM/PM، والأرقام ممكن تبقى هندية. */
const IOS = /^‎?\[(\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{1,4})[,\s]+(\d{1,2}:\d{2}(?::\d{2})?)\s*([APap][Mm]|ص|م)?\]\s*([^:]{1,60}?):\s?([\s\S]*)$/;
const AND = /^‎?(\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{1,4})[,\s]+(\d{1,2}:\d{2}(?::\d{2})?)\s*([APap][Mm]|ص|م)?\s*[-–]\s*([^:]{1,60}?):\s?([\s\S]*)$/;

/* سطور النظام — مش رسائل */
const SYSTEM = /(end-to-end|مشفّرة|مشفرة|انضم|أضافك|غيّر|غير رقم|created group|أنشأ|تم حذف|حذف هذه الرسالة|this message was deleted|omitted|تم استبعاد|<Media)/i;

function arabicDigits(s) {
  return s.replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x0660))
          .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x06F0));
}

/* موبايل عربي بيصدّر بأرقام هندية وفاصلة عربية. بنبدّلهم حرف بحرف
   (الطول مبيتغيّرش) عشان نطابق الترويسة — والنص نفسه بنرجّعه من
   السطر الأصلي زي ما هو، مبنلمسوش. */
function headerSafe(s) { return arabicDigits(s).replace(/،/g, ","); }

function stamp(dateStr, timeStr, mer) {
  const d = arabicDigits(dateStr).split(/[\/.\-]/).map(Number);
  const t = arabicDigits(timeStr).split(":").map(Number);
  let y, mo, da;
  if (d[0] > 31) { y = d[0]; mo = d[1]; da = d[2]; }            // YYYY/MM/DD
  else { da = d[0]; mo = d[1]; y = d[2]; }                       // DD/MM/YYYY (الشائع عندنا)
  if (y < 100) y += 2000;
  let h = t[0] || 0;
  const pm = /^[Pp]|^م$/.test(mer || "");
  const am = /^[Aa]|^ص$/.test(mer || "");
  if (pm && h < 12) h += 12;
  if (am && h === 12) h = 0;
  const ms = Date.UTC(y, (mo || 1) - 1, da || 1, h, t[1] || 0, t[2] || 0);
  /* التصدير بالتوقيت المحلي — القاهرة UTC+3 */
  return isNaN(ms) ? Date.now() : ms - 3 * 3600 * 1000;
}

function parseFile(file) {
  const txt = fs.readFileSync(file, "utf8").replace(/\r/g, "");
  const out = [];
  let cur = null;
  for (const line of txt.split("\n")) {
    const n = headerSafe(line);
    const m = n.match(IOS) || n.match(AND);
    if (m) {
      if (cur) out.push(cur);
      /* النص من السطر الأصلي — التبديل 1:1 فالمواضع متطابقة */
      const body = m[5].length ? line.slice(n.length - m[5].length) : "";
      cur = { at: stamp(m[1], m[2], m[3]), who: m[4].trim(), text: body };
    } else if (cur) {
      cur.text += "\n" + line;                 // سطر تاني من نفس الرسالة
    }
  }
  if (cur) out.push(cur);
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const files = [];
  let rep = "", me = "", dry = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--rep") rep = args[++i];
    else if (args[i] === "--me") me = args[++i];
    else if (args[i] === "--dry") dry = true;
    else files.push(args[i]);
  }
  if (!files.length) {
    console.log("الاستخدام: node server/import-export.js <ملف.txt ...> --rep \"+20100…\" [--me \"اسمك\"] [--dry]");
    process.exit(1);
  }
  if (!rep) { console.error("لازم --rep برقم السيلز صاحب المحادثة"); process.exit(1); }

  const store = new Store(cfg.dataDir);
  let kept = 0, skipped = 0, mine = 0, dup = 0;

  files.forEach(f => {
    const rows = parseFile(f);
    console.log("\n" + path.basename(f) + " — " + rows.length + " سطر");
    rows.forEach(r => {
      if (SYSTEM.test(r.text) && r.text.length < 160) { skipped++; return; }
      if (me && r.who.indexOf(me) > -1) { mine++; return; }      // رسائلي أنا
      if (!r.text.trim()) { skipped++; return; }
      if (dry) { kept++; return; }

      /* نفس الرسالة من نفس الشخص في نفس الثانية = نفس الرسالة */
      const key = "imp:" + rep + ":" + r.at + ":" + r.text.length;
      const id = store.keep({
        wamid: key, from: rep, name: r.who, at: r.at,
        kind: "text", text: r.text, source: "import"
      });
      if (!id) { dup++; return; }
      const who = store.rep(rep, r.who);
      try { store.setRead(id, readMessage(r.text, who.profile), rep); } catch (e) {}
      store.bumpSeen(rep);
      kept++;
    });
  });

  console.log("\n" + (dry ? "تجربة — مفيش حاجة اتكتبت" : "اتسجّل") + ": " + kept +
    " رسالة · " + dup + " مكررة · " + mine + " منك انت · " + skipped + " سطور نظام");
  if (!dry) console.log("المخزن: " + cfg.dataDir);
}

if (require.main === module) main();
module.exports = { parseFile, stamp };
