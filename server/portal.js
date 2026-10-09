/* ============================================================
   مناطق · بوابة السيلز
   ------------------------------------------------------------
   كل سيلز له لينك خاص بيه. يفتحه يلاقي مشاريعه على مناطق،
   وأرقام مشاهدتها، ويقدر يضيف مشروع جديد.

   قاعدتين مش بنتنازل عنهم:
   1. اللي بيضيفه بيدخل طابور المراجعة — زيّه زي أي رسالة. محدش
      بينشر على مناطق من غير ما نشوفه. المصداقية هي كل اللي عندنا.
   2. اللينك بيشوف صاحبه بس. ومحدش يقدر يزوّره، ولا يشوف غيره.

   مفيش باسوورد: السيلز ده مش هيفتكر باسوورد ولا هيعمل حساب.
   اللينك نفسه هو المفتاح — موقّع، وبيتلغي بضغطة لو ضاع.
   ============================================================ */
"use strict";
const crypto = require("crypto");

function b64u(buf) {
  return Buffer.from(buf).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

class Portal {
  constructor(store, secret) {
    this.store = store;
    this.secret = secret;
  }

  /* التوقيع بياخد الرقم ونسخة اللينك مع بعض. أول ما نزوّد النسخة،
     كل اللينكات القديمة للراجل ده تبقى ورق. */
  _sig(phone, rev) {
    return b64u(crypto.createHmac("sha256", this.secret)
      .update(phone + "." + rev).digest()).slice(0, 32);
  }

  /* بيولّد لينك جديد. rotate=true بيلغي القديم. */
  issue(phone, rotate) {
    const rep = this.store.state.reps[phone];
    if (!rep) return null;
    if (rotate || rep.rev === undefined) rep.rev = (rep.rev || 0) + 1;
    rep.linkedAt = Date.now();
    this.store._save();
    return { token: phone + "." + rep.rev + "." + this._sig(phone, rep.rev), rev: rep.rev };
  }
  revoke(phone) {
    const rep = this.store.state.reps[phone];
    if (!rep) return false;
    rep.rev = (rep.rev || 0) + 1;      // اللينك القديم بطل
    rep.revoked = Date.now();
    this.store._save();
    return true;
  }

  /* بيرجّع السيلز لو اللينك سليم، أو null. المقارنة بوقت ثابت. */
  verify(token) {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [phone, rev, sig] = parts;
    const rep = this.store.state.reps[phone];
    if (!rep || String(rep.rev) !== rev) return null;
    const want = this._sig(phone, rev);
    const A = Buffer.from(want), B = Buffer.from(sig);
    if (A.length !== B.length) return null;
    if (!crypto.timingSafeEqual(A, B)) return null;
    if (rep.active === 0) return null;
    return rep;
  }

  /* ---------- اللي السيلز بيشوفه ---------- */
  me(rep) {
    const st = this.store;
    const subs = (st.state.subs || []).filter(s => s.phone === rep.phone);
    const msgs = st.messages({ rep: rep.phone, limit: 400 });
    const now = Date.now(), day = 86400000;

    /* مشاهدات مشاريعه — الرقم اللي بيرجّعه كل يوم */
    const views = st.state.views || {};
    const mine = {};
    let total7 = 0, totalAll = 0;
    (rep.projects || []).forEach(p => {
      const v = views[p] || {};
      let d7 = 0, all = 0;
      Object.keys(v).forEach(day8 => {
        all += v[day8];
        if (Date.parse(day8 + "T00:00:00Z") >= now - 7 * day) d7 += v[day8];
      });
      mine[p] = { week: d7, all };
      total7 += d7; totalAll += all;
    });

    return {
      rep: {
        nm: rep.nm, dev: rep.dev, reg: rep.reg, phone: rep.phone,
        projects: rep.projects || [], since: rep.since, pending: !!rep.pending
      },
      views: { byProject: mine, week: total7, all: totalAll },
      messages: {
        total: msgs.length,
        week: msgs.filter(m => m.at >= now - 7 * day).length,
        approved: msgs.filter(m => m.status === "approved" || m.status === "auto").length,
        last: msgs.length ? msgs[0].at : null
      },
      model: {
        rules: Object.keys((rep.profile && rep.profile.rules) || {}).length,
        seen: (rep.profile && rep.profile.seen) || 0,
        corrections: (rep.profile && rep.profile.corrections) || 0
      },
      submissions: subs.map(s => ({
        id: s.id, name: s.name, at: s.at, status: s.status, note: s.note || ""
      }))
    };
  }

  /* ---------- طلب إضافة مشروع ---------- */
  submit(rep, body) {
    const st = this.store;
    const name = String(body.name || "").trim().slice(0, 80);
    if (name.length < 2) return { error: "اسم المشروع ناقص" };

    st.state.subs = st.state.subs || [];
    const dup = st.state.subs.find(s =>
      s.phone === rep.phone && s.name === name && s.status === "pending");
    if (dup) return { error: "الطلب ده مستنّي مراجعة بالفعل", id: dup.id };

    const sub = {
      id: "S-" + (st.state.subs.length + 1001),
      phone: rep.phone, by: rep.nm, dev: rep.dev,
      name,
      dist: String(body.dist || "").trim().slice(0, 60),
      reg: String(body.reg || rep.reg || "").trim().slice(0, 60),
      del: String(body.del || "").trim().slice(0, 30),
      note: String(body.note || "").trim().slice(0, 400),
      at: Date.now(), status: "pending"
    };
    st.state.subs.push(sub);
    st._append(st.ev, { at: sub.at, kind: "submit", phone: rep.phone, sub: sub.id, name });
    st._save();
    return { sub };
  }

  decideSub(id, status, who, note) {
    const st = this.store;
    const s = (st.state.subs || []).find(x => x.id === id);
    if (!s) return null;
    s.status = status;
    s.note = note || "";
    s.decidedAt = Date.now();
    /* الاعتماد بيحط المشروع في قايمة السيلز — ساعتها بس بيبقى بتاعه */
    if (status === "approved") {
      const rep = st.state.reps[s.phone];
      if (rep) {
        rep.projects = rep.projects || [];
        if (rep.projects.indexOf(s.name) < 0) rep.projects.push(s.name);
      }
    }
    st._append(st.ev, { at: Date.now(), kind: "subdecide", sub: id, status, who: who || "" });
    st._save();
    return s;
  }
  subs(filter) {
    const all = (this.store.state.subs || []).slice().sort((a, b) => b.at - a.at);
    return filter && filter.status ? all.filter(s => s.status === filter.status) : all;
  }

  /* ---------- عدّاد المشاهدات ----------
     بيتندَه من صفحات الموقع العامة. مفيش هوية ولا كوكي —
     عدّاد لكل مشروع في اليوم وبس. */
  view(project) {
    const p = String(project || "").trim().slice(0, 80);
    if (!p) return false;
    const st = this.store;
    st.state.views = st.state.views || {};
    const day = new Date().toISOString().slice(0, 10);
    st.state.views[p] = st.state.views[p] || {};
    st.state.views[p][day] = (st.state.views[p][day] || 0) + 1;
    this._dirty = true;
    return true;
  }
  /* المشاهدات بتتكتب كل شوية مش مع كل زيارة — عشان القرص ميتعبش */
  startFlush(ms) {
    this._t = setInterval(() => {
      if (this._dirty) { this._dirty = false; this.store._save(); }
    }, ms || 10000);
    if (this._t.unref) this._t.unref();
  }
  stopFlush() { if (this._t) clearInterval(this._t); }
}

module.exports = Portal;
