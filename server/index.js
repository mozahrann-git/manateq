/* ============================================================
   مناطق · خط الاستقبال
   ------------------------------------------------------------
   بيستقبل رسائل واتساب من Meta، بيسجّل الخام الأول، وبعدين بيقراها
   بنموذج صاحبها. وبيفتح واجهة JSON للإدارة.

   من غير أي مكتبة خارجية — Node لوحده. أقل حاجة ممكن تقع.
   ============================================================ */
"use strict";
const http = require("http");
const crypto = require("crypto");
const cfg = require("./config");
const Store = require("./store");
const { readMessage, learnFrom } = require("./parse");

const store = new Store(cfg.dataDir);

/* ---------- أدوات ---------- */
function send(res, code, obj, extra) {
  const body = typeof obj === "string" ? obj : JSON.stringify(obj);
  const h = Object.assign({
    "content-type": typeof obj === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  }, extra || {});
  if (cfg.origin) {
    h["access-control-allow-origin"] = cfg.origin;
    h["vary"] = "Origin";
  }
  res.writeHead(code, h);
  res.end(body);
}
function readBody(req, cap) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on("data", c => {
      n += c.length;
      if (n > (cap || 1048576)) { reject(new Error("too big")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
/* المقارنة لازم تكون بوقت ثابت — المقارنة العادية بتسرّب المفتاح */
function sameSecret(a, b) {
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}
function signedOk(raw, header) {
  if (!header) return false;
  const want = "sha256=" + crypto.createHmac("sha256", cfg.appSecret).update(raw).digest("hex");
  return sameSecret(want, header);
}
function authed(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return !!(m && sameSecret(m[1].trim(), cfg.adminToken));
}

/* ---------- استقبال رسالة واحدة ---------- */
function intake(rec) {
  const id = store.keep(rec);          // الخام الأول. دايماً.
  if (!id) return { dup: true };       // Meta بتعيد الإرسال — ده طبيعي

  const rep = store.rep(rec.from, rec.name);
  let read = null;
  try {
    read = readMessage(rec.text || "", rep.profile);
  } catch (e) {
    /* القارئ وقع؟ الرسالة محفوظة، وبتستنى بني آدم. مبنخسرش حاجة. */
    console.error("[قراءة] فشلت في " + id + ": " + e.message);
    read = { error: String(e.message), auto: false };
  }
  store.setRead(id, read, rec.from);
  store.bumpSeen(rec.from);
  return { id, auto: !!(read && read.auto), rep: rec.from };
}

/* ---------- مسارات Meta ---------- */
function webhookVerify(req, res, url) {
  const q = url.searchParams;
  if (q.get("hub.mode") === "subscribe" && sameSecret(q.get("hub.verify_token") || "", cfg.verifyToken)) {
    return send(res, 200, q.get("hub.challenge") || "");
  }
  send(res, 403, "forbidden");
}

async function webhookReceive(req, res) {
  let raw;
  try { raw = await readBody(req); }
  catch (e) { return send(res, 413, { error: "too big" }); }

  if (!signedOk(raw, req.headers["x-hub-signature-256"])) {
    console.warn("[أمان] توقيع غلط — الطلب اترفض");
    return send(res, 401, { error: "bad signature" });
  }
  /* بنرد 200 بسرعة مهما حصل. لو اتأخرنا Meta بتعيد الإرسال وبتكرّر. */
  send(res, 200, { ok: true });

  let body;
  try { body = JSON.parse(raw.toString("utf8")); }
  catch (e) { console.error("[استقبال] JSON بايظ"); return; }

  try {
    (body.entry || []).forEach(entry => {
      (entry.changes || []).forEach(ch => {
        const v = ch.value || {};
        const names = {};
        (v.contacts || []).forEach(c => { names[c.wa_id] = (c.profile && c.profile.name) || ""; });
        (v.messages || []).forEach(m => {
          const text =
            (m.text && m.text.body) ||
            (m.image && m.image.caption) ||
            (m.video && m.video.caption) ||
            (m.document && m.document.caption) || "";
          const r = intake({
            wamid: m.id,
            from: m.from,
            name: names[m.from] || "",
            at: m.timestamp ? parseInt(m.timestamp, 10) * 1000 : Date.now(),
            kind: m.type || "text",
            text,
            source: "webhook",
            body: m
          });
          if (!r.dup) console.log("[وصلت] " + r.id + " من " + m.from + (r.auto ? " · اعتماد آلي" : " · مستنية مراجعة"));
        });
      });
    });
  } catch (e) {
    console.error("[استقبال] " + e.stack);
  }
}

/* ---------- واجهة الإدارة ---------- */
async function api(req, res, url) {
  if (!authed(req)) return send(res, 401, { error: "unauthorized" });
  const p = url.pathname.replace(/^\/api\//, "");

  if (req.method === "GET" && p === "stats") return send(res, 200, store.stats());

  if (req.method === "GET" && p === "queue") {
    const rows = store.messages({
      status: url.searchParams.get("status") || null,
      rep: url.searchParams.get("rep") || null,
      limit: parseInt(url.searchParams.get("limit") || "100", 10)
    }).map(m => {
      const raw = store.rawOf(m.id);
      return Object.assign({}, m, { text: raw ? raw.text : "", name: raw ? raw.name : "" });
    });
    return send(res, 200, { rows });
  }

  if (req.method === "GET" && p === "reps") return send(res, 200, { rows: store.reps() });

  if (req.method === "POST") {
    let body = {};
    try { body = JSON.parse((await readBody(req, 262144)).toString("utf8") || "{}"); }
    catch (e) { return send(res, 400, { error: "bad json" }); }

    if (p === "decide") {
      const ok = store.decide(body.id, body.status, body.who, body.note);
      return send(res, ok ? 200 : 404, { ok });
    }
    if (p === "rep") {
      const r = store.setRep(body.phone, body);
      return send(res, r ? 200 : 404, { rep: r });
    }
    /* تصحيح بشري: بيتعلّم قاعدة للشخص ده، وبيعيد قراءة الرسالة فوراً */
    if (p === "correct") {
      const rep = store.state.reps[body.phone];
      if (!rep) return send(res, 404, { error: "unknown rep" });
      const got = learnFrom(rep.profile, body.field, body.line, body.value);
      if (!got.rule) return send(res, 422, { error: "مقدرتش أطلّع قاعدة من السطر ده" });
      store.learn(body.phone, body.field, got.rule, body.who);
      let re = null;
      if (body.id) {
        const raw = store.rawOf(body.id);
        if (raw) { re = readMessage(raw.text, rep.profile); store.setRead(body.id, re, body.phone); }
      }
      return send(res, 200, { profile: rep.profile, read: re });
    }
    /* إعادة قراءة كل اللي مستنّي بالنماذج الحالية — بعد موجة تصحيحات */
    if (p === "reread") {
      let n = 0;
      store.messages({ status: "pending" }).forEach(m => {
        const raw = store.rawOf(m.id);
        const rep = store.state.reps[m.rep];
        if (!raw || !rep) return;
        store.setRead(m.id, readMessage(raw.text, rep.profile), m.rep);
        n++;
      });
      return send(res, 200, { reread: n });
    }
  }
  send(res, 404, { error: "no such route" });
}

/* ---------- الخادم ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");

  if (req.method === "OPTIONS") {
    return send(res, 204, "", {
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "authorization,content-type",
      "access-control-max-age": "600"
    });
  }
  if (url.pathname === "/health") return send(res, 200, { ok: true, up: process.uptime() });
  if (url.pathname === "/webhook") {
    if (req.method === "GET")  return webhookVerify(req, res, url);
    if (req.method === "POST") return webhookReceive(req, res);
    return send(res, 405, { error: "method" });
  }
  if (url.pathname.startsWith("/api/")) return api(req, res, url);
  send(res, 404, { error: "not found" });
});

if (require.main === module) {
  cfg.assert();
  server.listen(cfg.port, () => {
    console.log("[مناطق] خط الاستقبال شغال على " + cfg.port);
    console.log("        التخزين: " + cfg.dataDir);
    const s = store.stats();
    console.log("        المسجّل: " + s.total + " رسالة · " + s.reps + " سيلز");
  });
}

module.exports = { server, store, intake };
