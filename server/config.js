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
    if (this.adminToken.length < 24) {
      console.error("\n[مناطق] MQ_ADMIN_TOKEN قصير. استخدم: openssl rand -hex 32\n");
      process.exit(1);
    }
  }
};
