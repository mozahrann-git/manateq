/* مناطق · القارئ على الخادم
   نفس ملف assets/js/parser.js بالظبط — مش نسخة منه.
   القاعدة اللي بتتصلّح في المتصفح بتتصلّح على الخادم في نفس اللحظة،
   ومستحيل الاتنين يختلفوا. */
"use strict";
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const SRC = path.join(__dirname, "..", "assets", "js", "parser.js");
const w = {};
vm.runInContext(fs.readFileSync(SRC, "utf8"), vm.createContext({ window: w, console }));
const P = w.MQParse;
if (!P || !P.read) throw new Error("القارئ متحمّلش من " + SRC);

/* بيقرا رسالة واحدة بنموذج صاحبها، ويقول هي تستاهل تتعتمد لوحدها ولا لأ */
function readMessage(text, profile) {
  const r = P.read(text, profile || null);
  const q = P.quality(r.fields);
  const cls = P.classify(text, r.fields);
  const mat = P.maturity(profile || { rules: {}, seen: 0 });

  /* «مالهاش لازمة»: تهنئة، رد، صورة من غير بيانات. الفيصل بسيط —
     رسالة من غير سعر ولا مساحة مفيهاش وحدة أصلاً. دي بتتسجّل في
     الخام زي أي حاجة تانية، بس مبتاخدش وقت بني آدم. */
  const junk = !r.fields.price && !r.fields.area;

  /* الاعتماد الآلي: النموذج ناضج + القراءة نضيفة + مفيش حقل ناقص */
  const auto = !!(mat.auto && q.score >= 8 && !q.missing.length && !junk);
  return {
    fields: r.fields, lines: r.lines,
    quality: q, classify: cls, maturity: mat,
    fingerprint: P.fingerprint(r.fields),
    junk, auto, at: Date.now()
  };
}

/* تصحيح بشري → قاعدة في نموذج المرسل.
   P.learn بيعدّل النموذج في مكانه وبيرجّعه هو — مش القاعدة.
   فبنرجّع القاعدة اللي اتولدت عشان اللي بينده يسجّلها في السجل. */
function learnFrom(profile, field, line, value) {
  const prof = P.learn(profile || { rules: {}, seen: 0 }, field, line, value);
  return { profile: prof, rule: (prof.rules || {})[field] || null };
}

module.exports = { readMessage, learnFrom, P };
