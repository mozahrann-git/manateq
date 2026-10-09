/* مناطق · إعدادات الخادم
   كل حاجة سرية بتيجي من متغيّرات البيئة — مفيش مفتاح مكتوب في الكود. */
"use strict";
const path = require("path");

function need(k) {
  const v = process.env[k];
  if (!v) {
    console.error("\n[مناطق] المتغيّر " + k + " ناقص. شوف server/README.md\n");
    process.exit(1);
  }
  return v;
}

module.exports = {
  port: parseInt(process.env.PORT || "8787", 10),

  /* من Meta */
  verifyToken: process.env.WA_VERIFY_TOKEN || "",   // إنت بتخترعه وبتكتبه في الاتنين
  appSecret:   process.env.WA_APP_SECRET || "",     // App Secret بتاع تطبيق Meta
  token:       process.env.WA_TOKEN || "",          // توكن الإرسال (اختياري — للرد بس)
  phoneId:     process.env.WA_PHONE_ID || "",       // Phone number ID

  /* دخول الإدارة */
  adminToken:  process.env.MQ_ADMIN_TOKEN || "",

  /* Firebase — دخول الإدارة بالإيميل */
  fbProject: process.env.FB_PROJECT_ID || "",
  adminEmails: (process.env.MQ_ADMIN_EMAILS || "").split(",").map(x => x.trim()).filter(Boolean),

  /* بوابة السيلز — مفتاح مستقل عن توكن الإدارة */
  portalSecret: process.env.MQ_PORTAL_SECRET || "",
  portalBase:   (process.env.MQ_PORTAL_BASE || "https://mozahrann-git.github.io/manateq").replace(/\/+$/, ""),

  /* مكان التخزين */
  dataDir: process.env.MQ_DATA_DIR || path.join(__dirname, "data"),

  /* لو فاضي، أي أصل مسموح — حطّ دومين الموقع في الإنتاج */
  origin: process.env.MQ_ORIGIN || "",

  need,
  /* بنرفض الإقلاع من غير الأساسيات عشان الخادم ميقعدش مفتوح بالغلط */
  assert() {
    if (!this.verifyToken) need("WA_VERIFY_TOKEN");
    if (!this.appSecret)   need("WA_APP_SECRET");
    if (!this.adminToken)  need("MQ_ADMIN_TOKEN");
    if (!this.fbProject)   need("FB_PROJECT_ID");
    if (!this.adminEmails.length) need("MQ_ADMIN_EMAILS");
    if (!this.portalSecret) need("MQ_PORTAL_SECRET");
    if (this.portalSecret.length < 24) {
      console.error("\n[مناطق] MQ_PORTAL_SECRET قصير. استخدم: openssl rand -hex 32\n");
      process.exit(1);
    }
    if (this.adminToken.length < 24) {
      console.error("\n[مناطق] MQ_ADMIN_TOKEN قصير. استخدم: openssl rand -hex 32\n");
      process.exit(1);
    }
  }
};
