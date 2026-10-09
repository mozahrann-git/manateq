/* مناطق · التخزين
   ------------------------------------------------------------
   قاعدة واحدة فوق كل حاجة: الرسالة الخام بتتسجّل الأول، قبل أي قراءة
   وقبل أي حكم. لو القارئ وقع، المادة الخام تفضل سليمة ونعيد قراءتها
   بعدين. اللي بيتكتب مرة مبيتغيّرش — التعديلات بتتسجّل كأحداث جديدة.

   مفيش قاعدة بيانات: ملفات JSONL بتتزاد عليها بس. بسيطة، بتتقرا بالعين،
   وبتتنقل بنسخ فولدر. لما الحجم يكبر، الهجرة لقاعدة حقيقية سهلة
   لأن كل حاجة مسجّلة بترتيبها.
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");

class Store {
  constructor(dir) {
    this.dir = dir;
    this.raw = path.join(dir, "raw");       // الرسائل زي ما وصلت
    this.ev  = path.join(dir, "events");    // القرارات والتصحيحات
    fs.mkdirSync(this.raw, { recursive: true });
    fs.mkdirSync(this.ev, { recursive: true });
    this.statePath = path.join(dir, "state.json");
    this.state = this._load();
    this.seen = new Set();                  // مفاتيح الرسائل اللي دخلت
    this._index();
  }

  _load() {
    try { return JSON.parse(fs.readFileSync(this.statePath, "utf8")); }
    catch (e) { return { reps: {}, msgs: {}, counters: { msg: 5000 } }; }
  }
  _save() {
    const tmp = this.statePath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 1));
    fs.renameSync(tmp, this.statePath);     // كتابة ذرّية: الملف مبيتقطعش في النص
  }
  _index() {
    Object.keys(this.state.msgs || {}).forEach(k => {
      if (this.state.msgs[k].wamid) this.seen.add(this.state.msgs[k].wamid);
    });
  }

  _day(ts) { return new Date(ts || Date.now()).toISOString().slice(0, 10); }
  _append(dir, obj) {
    fs.appendFileSync(path.join(dir, this._day(obj.at) + ".jsonl"),
      JSON.stringify(obj) + "\n", "utf8");
  }

  /* ---------- الرسائل ---------- */

  /* بتتنده قبل أي معالجة. بترجع id لو اتسجّلت، أو null لو مكررة. */
  keep(rec) {
    if (rec.wamid && this.seen.has(rec.wamid)) return null;   // Meta بتعيد الإرسال
    const id = "M-" + (++this.state.counters.msg);
    const row = {
      id,
      wamid: rec.wamid || "",
      from: rec.from || "",
      name: rec.name || "",
      at: rec.at || Date.now(),
      kind: rec.kind || "text",
      text: rec.text || "",
      source: rec.source || "webhook",
      body: rec.body || null                 // الحمولة الأصلية كاملة
    };
    this._append(this.raw, row);
    if (row.wamid) this.seen.add(row.wamid);
    /* الرسالة بتتنسب لصاحبها من لحظة وصولها — مش بعد ما تتقرا.
       لو القارئ وقع، تفضل محسوبة عليه برضه. */
    this.state.msgs[id] = {
      wamid: row.wamid, from: row.from, at: row.at,
      status: "new", read: null, rep: row.from || null
    };
    this._save();
    return id;
  }

  /* القراءة بتتسجّل فوق الرسالة — والخام ما اتلمسش */
  setRead(id, read, repId) {
    const m = this.state.msgs[id];
    if (!m) return false;
    m.read = read; m.rep = repId || null; m.status = read && read.auto ? "auto" : "pending";
    this._save();
    return true;
  }
  decide(id, status, who, note) {
    const m = this.state.msgs[id];
    if (!m) return false;
    m.status = status;
    this._append(this.ev, { at: Date.now(), kind: "decide", msg: id, status, who: who || "", note: note || "" });
    this._save();
    return true;
  }

  messages(filter) {
    filter = filter || {};
    const out = [];
    const ids = Object.keys(this.state.msgs).sort((a, b) =>
      this.state.msgs[b].at - this.state.msgs[a].at);
    for (const id of ids) {
      const m = this.state.msgs[id];
      if (filter.status && m.status !== filter.status) continue;
      if (filter.rep && m.rep !== filter.rep) continue;
      out.push(Object.assign({ id }, m));
      if (filter.limit && out.length >= filter.limit) break;
    }
    return out;
  }
  /* النص الخام بيترجع من ملفه مش من الذاكرة */
  rawOf(id) {
    const m = this.state.msgs[id];
    if (!m) return null;
    const f = path.join(this.raw, this._day(m.at) + ".jsonl");
    try {
      const lines = fs.readFileSync(f, "utf8").split("\n");
      for (const l of lines) {
        if (!l) continue;
        const o = JSON.parse(l);
        if (o.id === id) return o;
      }
    } catch (e) {}
    return null;
  }

  /* ---------- السيلز ---------- */

  /* رقم مجهول بيتسجّل لوحده كـ«مستنّي تعريف» — عمره ما يتسكّت عليه */
  rep(from, name) {
    if (!this.state.reps[from]) {
      this.state.reps[from] = {
        phone: from, nm: name || "", dev: "", reg: "", projects: [],
        since: Date.now(), active: 1, pending: 1,
        profile: { rules: {}, seen: 0, corrections: 0, updated: null }
      };
      this._append(this.ev, { at: Date.now(), kind: "newrep", phone: from, name: name || "" });
      this._save();
    } else if (name && !this.state.reps[from].nm) {
      this.state.reps[from].nm = name;
      this._save();
    }
    return this.state.reps[from];
  }
  reps() { return Object.keys(this.state.reps).map(k => this.state.reps[k]); }
  setRep(phone, patch) {
    const r = this.state.reps[phone];
    if (!r) return null;
    ["nm", "dev", "reg", "projects", "active", "pending"].forEach(k => {
      if (patch[k] !== undefined) r[k] = patch[k];
    });
    this._append(this.ev, { at: Date.now(), kind: "rep", phone, patch });
    this._save();
    return r;
  }
  bumpSeen(phone) {
    const r = this.state.reps[phone];
    if (!r) return;
    r.profile.seen = (r.profile.seen || 0) + 1;
    this._save();
  }
  /* التصحيح البشري بيتحوّل لقاعدة في نموذج الشخص ده.
     العدّاد بيزيد عند القارئ وهو بيولّد القاعدة — فمش بنزوّده هنا
     تاني، وإلا كل تصحيح هيتحسب اتنين. */
  learn(phone, field, rule, who) {
    const r = this.state.reps[phone];
    if (!r) return null;
    r.profile.rules = r.profile.rules || {};
    r.profile.rules[field] = rule;
    r.profile.updated = Date.now();
    this._append(this.ev, { at: Date.now(), kind: "learn", phone, field, rule, who: who || "" });
    this._save();
    return r.profile;
  }

  stats() {
    const all = Object.keys(this.state.msgs);
    const by = s => all.filter(k => this.state.msgs[k].status === s).length;
    return {
      total: all.length,
      pending: by("pending"), auto: by("auto"),
      approved: by("approved"), dropped: by("dropped"), neww: by("new"),
      reps: Object.keys(this.state.reps).length,
      pendingReps: this.reps().filter(r => r.pending).length
    };
  }
}

module.exports = Store;
