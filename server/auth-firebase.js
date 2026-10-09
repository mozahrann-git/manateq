/* ============================================================
   مناطق · التحقق من دخول Firebase
   ------------------------------------------------------------
   الدخول في المتصفح لوحده مسرحية — أي حد يقدر يعدّل الجافاسكريبت
   ويقول «أنا داخل». الحارس الحقيقي هنا: الخادم بيفك توكن Firebase
   ويتأكد من توقيعه بمفاتيح جوجل العامة، وبعدين يبص على الإيميل.

   من غير أي مكتبة — Node لوحده بيعمل RS256.
   ============================================================ */
"use strict";
const crypto = require("crypto");
const https = require("https");

const CERTS = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

function b64urlJson(s) {
  return JSON.parse(Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
}

class FirebaseAuth {
  constructor(projectId, emails) {
    this.projectId = projectId || "";
    /* الإيميلات المسموح لها — بالحروف الصغيرة عشان المقارنة متغلطش */
    this.emails = (emails || []).map(e => String(e).trim().toLowerCase()).filter(Boolean);
    this.keys = null;
    this.keysAt = 0;
  }

  /* مفاتيح جوجل بتتغيّر كل كام ساعة، فبنجيبها ونحتفظ بيها لحد ما تقدم */
  fetchKeys() {
    if (this.keys && Date.now() - this.keysAt < 3600000) return Promise.resolve(this.keys);
    if (this._pending) return this._pending;
    this._pending = new Promise((resolve, reject) => {
      https.get(CERTS, res => {
        if (res.statusCode !== 200) { res.resume(); return reject(new Error("certs " + res.statusCode)); }
        let body = "";
        res.on("data", c => { body += c; });
        res.on("end", () => {
          try {
            this.keys = JSON.parse(body);
            this.keysAt = Date.now();
            resolve(this.keys);
          } catch (e) { reject(e); }
        });
      }).on("error", reject);
    }).finally(() => { this._pending = null; });
    return this._pending;
  }

  /* بيرجّع { email, uid, name } لو التوكن سليم، أو بيرمي خطأ */
  async verify(token) {
    if (!this.projectId) throw new Error("FB_PROJECT_ID ناقص");
    if (!token || typeof token !== "string") throw new Error("مفيش توكن");
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("شكل التوكن غلط");

    const head = b64urlJson(parts[0]);
    const body = b64urlJson(parts[1]);

    if (head.alg !== "RS256") throw new Error("خوارزمية مش مقبولة");
    if (!head.kid) throw new Error("مفيش kid");

    const now = Math.floor(Date.now() / 1000);
    if (body.aud !== this.projectId) throw new Error("التوكن لمشروع تاني");
    if (body.iss !== "https://securetoken.google.com/" + this.projectId) throw new Error("مُصدِر غلط");
    if (!body.sub) throw new Error("مفيش مستخدم");
    if (!(body.exp > now)) throw new Error("التوكن منتهي");
    if (body.iat > now + 300) throw new Error("توكن من المستقبل");

    const keys = await this.fetchKeys();
    const cert = keys[head.kid];
    if (!cert) throw new Error("مفتاح مش معروف");

    const ok = crypto.createVerify("RSA-SHA256")
      .update(parts[0] + "." + parts[1])
      .verify(crypto.createPublicKey(cert),
        Buffer.from(parts[2].replace(/-/g, "+").replace(/_/g, "/"), "base64"));
    if (!ok) throw new Error("التوقيع مش مظبوط");

    const email = String(body.email || "").toLowerCase();
    if (!body.email_verified) throw new Error("الإيميل مش متأكَّد منه");
    if (!this.emails.length) throw new Error("مفيش إيميلات مسموح بيها — حطّ MQ_ADMIN_EMAILS");
    if (this.emails.indexOf(email) < 0) throw new Error("الإيميل ده مش مسموح له");

    return { email, uid: body.sub, name: body.name || "" };
  }
}

module.exports = FirebaseAuth;
