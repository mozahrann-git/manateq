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
const Portal = require("./portal");
const FirebaseAuth = require("./auth-firebase");
const { readMessage, learnFrom } = require("./parse");

const store = new Store(cfg.dataDir);
/* البوابة بتوقّع بمفتاح مستقل عن توكن الإدارة — لو واحد اتسرّب
   ميجرّش التاني وراه */
const portal = new Portal(store, cfg.portalSecret);
const fbAuth = new FirebaseAuth(cfg.fbProject, cfg.adminEmails);

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
/* الدخول بطريقتين:
   1. توكن Firebase — ده الطبيعي، الأدمن بيسجّل بإيميله
   2. MQ_ADMIN_TOKEN — مفتاح طوارئ للسكربتات ولو Firebase وقع
   الاتنين بيتفحصوا على الخادم. المتصفح مش بيتصدّق على كلامه. */
async function who(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const t = m[1].trim();
  if (cfg.adminToken && t.length === cfg.adminToken.length && sameSecret(t, cfg.adminToken)) {
    return { email: "token", uid: "token", name: "مفتاح طوارئ" };
  }
  try { return await fbAuth.verify(t); }
  catch (e) { lastAuthErr = e.message; return null; }
}
let lastAuthErr = "";

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

/* ---------- بوابة السيلز ----------
   مفيش توكن إدارة هنا. اللينك الموقّع هو الهوية، وبيشوف صاحبه بس. */
async function portalApi(req, res, url) {
  const p = url.pathname.replace(/^\/api\/portal\/?/, "");

  /* عدّاد المشاهدات — مفتوح، بيتندَه من صفحات الموقع العامة */
  if (p === "view" && req.method === "POST") {
    let b = {};
    try { b = JSON.parse((await readBody(req, 4096)).toString("utf8") || "{}"); } catch (e) {}
    portal.view(b.project);
    return send(res, 204, "");
  }

  const token = url.searchParams.get("t") ||
    (req.headers["x-portal-token"] || "");
  const rep = portal.verify(token);
  if (!rep) return send(res, 401, { error: "اللينك مش صالح أو اتلغى" });

  if (p === "me" && req.method === "GET") return send(res, 200, portal.me(rep));

  if (p === "submit" && req.method === "POST") {
    let b = {};
    try { b = JSON.parse((await readBody(req, 32768)).toString("utf8") || "{}"); }
    catch (e) { return send(res, 400, { error: "bad json" }); }
    const r = portal.submit(rep, b);
    return send(res, r.error ? 409 : 200, r);
  }
  send(res, 404, { error: "no such route" });
}

/* ---------- واجهة الإدارة ---------- */
async function api(req, res, url) {
  const me = await who(req);
  if (!me) return send(res, 401, { error: "unauthorized", why: lastAuthErr || "محتاج دخول" });
  if (url.pathname === "/api/me") return send(res, 200, { me });
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

  if (req.method === "GET" && p === "reps") {
    /* اللينك بيترجع مع كل سيلز عشان تنسخه وتبعتهوله */
    const rows = store.reps().map(r => {
      const o = Object.assign({}, r);
      o.link = r.rev ? (cfg.portalBase + "/portal.html#" + portal.issue(r.phone, false).token) : "";
      return o;
    });
    return send(res, 200, { rows });
  }
  if (req.method === "GET" && p === "subs") {
    return send(res, 200, { rows: portal.subs({ status: url.searchParams.get("status") || null }) });
  }

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
    /* لينك البوابة: أول مرة، أو تدوير لو ضاع */
    if (p === "link") {
      const t = portal.issue(body.phone, !!body.rotate);
      if (!t) return send(res, 404, { error: "unknown rep" });
      return send(res, 200, { link: cfg.portalBase + "/portal.html#" + t.token, rev: t.rev });
    }
    if (p === "unlink") {
      return send(res, portal.revoke(body.phone) ? 200 : 404, { ok: true });
    }
    if (p === "subdecide") {
      const r = portal.decideSub(body.id, body.status, body.who, body.note);
      return send(res, r ? 200 : 404, { sub: r });
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

/* ---------- تقديم صفحات الإدارة ----------
   الإدارة اتشالت من الاستضافة العامة وبقت بتتقدّم من هنا.
   الصفحة نفسها مفيهاش أي بيانات — الحارس الحقيقي على الواجهة،
   ومفيش رقم ولا رسالة بتخرج من غير توكن متفحوص. */
const path = require("path");
const fs = require("fs");
const ROOT = path.join(__dirname, "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json; charset=utf-8" };

function serveStatic(req, res, rel) {
  /* المسار بيتنضّف قبل أي حاجة — مفيش ../ بيطلع برّه المجلد */
  const clean = path.normalize(rel).replace(/^(\.\.[\/\\])+/, "");
  const file = path.join(ROOT, clean);
  if (!file.startsWith(ROOT + path.sep)) return send(res, 403, "forbidden");
  const ext = path.extname(file).toLowerCase();
  if (!TYPES[ext]) return send(res, 404, "not found");
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, "not found");
    res.writeHead(200, {
      "content-type": TYPES[ext],
      "cache-control": ext === ".html" ? "no-store" : "public, max-age=300",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "x-frame-options": "DENY"
    });
    res.end(buf);
  });
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
  if (url.pathname.startsWith("/api/portal")) return portalApi(req, res, url);
  if (url.pathname.startsWith("/api/")) return api(req, res, url);

  /* الموقع كله من هنا: الصفحات العامة، والبوابة، والإدارة ورا دخول.
     مكان واحد ولينك واحد — مش محتاج تنشر في حتتين. */
  if (req.method === "GET") {
    const p = url.pathname;
    if (p === "/") return serveStatic(req, res, "index.html");
    if (p === "/admin") return serveStatic(req, res, "admin.html");
    if (/^\/[a-z0-9-]+\.html$/i.test(p)) return serveStatic(req, res, p.slice(1));
    if (/^\/assets\/[a-z0-9/_.-]+$/i.test(p)) return serveStatic(req, res, p.slice(1));
  }
  send(res, 404, { error: "not found" });
});

if (require.main === module) {
  cfg.assert();
  portal.startFlush(10000);
  server.listen(cfg.port, () => {
    console.log("[مناطق] خط الاستقبال شغال على " + cfg.port);
    console.log("        التخزين: " + cfg.dataDir);
    const s = store.stats();
    console.log("        المسجّل: " + s.total + " رسالة · " + s.reps + " سيلز");
  });
}

module.exports = { server, store, portal, intake };
