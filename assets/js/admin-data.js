/* ============================================================
   مناطق · بيانات التشغيل
   دليل السيلز والمطوّرين · الطابور الوارد · نماذج القراءة
   ============================================================ */
(function (w) {
  "use strict";

  /* رقم مناطق اللي بيستقبل كل الرسائل */
  var LINE = {
    number: "+20 10 2200 7733",
    label: "خط استقبال مناطق",
    status: "متصل",
    since: "12 Aug 2026",
    groups: 0, reps: 0,
    note: "الرقم ده بيتسجّل عند سيلز كل مطوّر زي أي بروكر، فالعروض بتوصله مباشرة زي ما بتتبعت للجروب."
  };

  /* ---------- دليل السيلز ----------
     كل سطر: الاسم · رقمه · المطوّر · المنطقة · مشاريعه · رسائل مستقبلة · دقة · حالة النموذج
     الحقل profile هو نموذج القراءة اللي بيتعلّم من تصحيحات الموظف. */
  var REPS = [
    /* ===== المقطم ===== */
    { id:"R-001", nm:"شادي عزمي", phone:"+20 100 441 2287", dev:"Xland Developments", reg:"المقطم",
      projects:["Verona Residence","Xland Heights"], seen:34, ok:31, since:"14 Aug 2026", active:1,
      profile:{ rules:{ price:{kw:"سعر الوحده",pick:"last",min:300000} }, seen:34, corrections:2, updated:"28 Sep 2026" } },
    { id:"R-002", nm:"هبة مصطفى", phone:"+20 111 907 5540", dev:"Ghoniem Group", reg:"المقطم",
      projects:["Zahw Boutique","Ghoniem Park"], seen:28, ok:27, since:"16 Aug 2026", active:1,
      profile:{ rules:{ price:{kw:"سعر الوحده",pick:"last",min:300000}, garage:{kw:"جراج",pick:"last",min:20000},
                        cashDisc:{kw:"cash",pick:"first",min:1} }, seen:28, corrections:4, updated:"30 Sep 2026" } },
    { id:"R-003", nm:"كريم السعيد", phone:"+20 128 330 1192", dev:"NextPoint", reg:"المقطم",
      projects:["Point 90"], seen:9, ok:6, since:"02 Sep 2026", active:1,
      profile:{ rules:{}, seen:9, corrections:0 } },
    { id:"R-004", nm:"منة الشهاب", phone:"+20 106 775 4418", dev:"El Shehab Developments", reg:"المقطم",
      projects:["Shehab Residence"], seen:12, ok:10, since:"28 Aug 2026", active:1,
      profile:{ rules:{ area:{kw:"المساحه",pick:"first",min:40} }, seen:12, corrections:1, updated:"21 Sep 2026" } },
    { id:"R-005", nm:"أحمد مجدي", phone:"+20 115 228 9063", dev:"MMG Developments", reg:"المقطم",
      projects:["MMG Towers"], seen:4, ok:2, since:"25 Sep 2026", active:1,
      profile:{ rules:{}, seen:4, corrections:0 } },

    /* ===== القاهرة الجديدة ===== */
    { id:"R-006", nm:"ياسمين فتحي", phone:"+20 102 668 3374", dev:"تطوير مصر العقارية", reg:"القاهرة الجديدة",
      projects:["النخبة · Alpha Residence"], seen:41, ok:40, since:"12 Aug 2026", active:1,
      profile:{ rules:{ price:{kw:"الاجمالي",pick:"last",min:300000}, downPct:{kw:"المقدم",pick:"first",min:1},
                        area:{kw:"المساحه",pick:"first",min:40}, months:{kw:"سنوات",pick:"last",min:1} },
                seen:41, corrections:5, updated:"01 Oct 2026" } },
    { id:"R-007", nm:"محمود جابر", phone:"+20 109 554 7781", dev:"EgyGab", reg:"القاهرة الجديدة",
      projects:["The Median Residence"], seen:23, ok:19, since:"19 Aug 2026", active:1,
      profile:{ rules:{ cashDisc:{kw:"خصم كاش",pick:"first",min:1} }, seen:23, corrections:2, updated:"02 Oct 2026" } },
    { id:"R-008", nm:"نهى سمير", phone:"+20 112 043 9926", dev:"Hydepark Developments", reg:"القاهرة الجديدة",
      projects:["Hyde Park Extension"], seen:7, ok:6, since:"06 Sep 2026", active:1,
      profile:{ rules:{}, seen:7, corrections:0 } },
    { id:"R-009", nm:"عمر رشدي", phone:"+20 127 881 5503", dev:"ORA Developers", reg:"القاهرة الجديدة",
      projects:["ZED East"], seen:18, ok:16, since:"22 Aug 2026", active:1,
      profile:{ rules:{ price:{kw:"total price",pick:"last",min:300000} }, seen:18, corrections:1, updated:"24 Sep 2026" } },
    { id:"R-010", nm:"سارة الليثي", phone:"+20 100 332 8847", dev:"Urbnlanes", reg:"القاهرة الجديدة",
      projects:["Story Hotel Apartments"], seen:15, ok:11, since:"30 Aug 2026", active:1,
      profile:{ rules:{ area:{kw:"bua",pick:"first",min:40} }, seen:15, corrections:1, updated:"26 Sep 2026" } },

    /* ===== العاصمة الإدارية ===== */
    { id:"R-011", nm:"طارق النيل", phone:"+20 101 227 6639", dev:"Nile Developments", reg:"العاصمة الإدارية",
      projects:["Nile Business City"], seen:16, ok:13, since:"20 Aug 2026", active:1,
      profile:{ rules:{ price:{kw:"الكاتالوج",pick:"last",min:300000} }, seen:16, corrections:3, updated:"29 Sep 2026" } },
    { id:"R-012", nm:"دينا عبده", phone:"+20 114 668 2210", dev:"Pyramids Developments", reg:"العاصمة الإدارية",
      projects:["Pyramids Mall","Grand Square"], seen:21, ok:18, since:"18 Aug 2026", active:1,
      profile:{ rules:{ months:{kw:"شهر",pick:"last",min:6} }, seen:21, corrections:2, updated:"27 Sep 2026" } },
    { id:"R-013", nm:"هاني عز", phone:"+20 106 119 4472", dev:"Taj Misr", reg:"العاصمة الإدارية",
      projects:["De Joya"], seen:11, ok:9, since:"01 Sep 2026", active:1,
      profile:{ rules:{}, seen:11, corrections:0 } },
    { id:"R-014", nm:"مي الدسوقي", phone:"+20 122 773 9018", dev:"Dubai Developments", reg:"العاصمة الإدارية",
      projects:["Dubai Tower CBD"], seen:6, ok:4, since:"11 Sep 2026", active:1,
      profile:{ rules:{}, seen:6, corrections:0 } },
    { id:"R-015", nm:"وليد قاسم", phone:"+20 100 884 6652", dev:"العاصمة العقارية العالمية", reg:"العاصمة الإدارية",
      projects:["Capital Tower · CBD"], seen:19, ok:18, since:"17 Aug 2026", active:1,
      profile:{ rules:{ price:{kw:"السعر",pick:"last",min:300000}, downPct:{kw:"مقدم",pick:"first",min:1} },
                seen:19, corrections:2, updated:"28 Sep 2026" } },

    /* ===== الشيخ زايد ===== */
    { id:"R-016", nm:"إسلام أركان", phone:"+20 103 556 7794", dev:"Arkan Developments", reg:"الشيخ زايد",
      projects:["Arkan Plaza"], seen:13, ok:12, since:"25 Aug 2026", active:1,
      profile:{ rules:{ area:{kw:"مساحه",pick:"first",min:40} }, seen:13, corrections:1, updated:"23 Sep 2026" } },
    { id:"R-017", nm:"رنا ليدرز", phone:"+20 111 229 3385", dev:"Leaders Developments", reg:"الشيخ زايد",
      projects:["Leaders Mall"], seen:8, ok:6, since:"04 Sep 2026", active:1,
      profile:{ rules:{}, seen:8, corrections:0 } },
    { id:"R-018", nm:"شريف حلمي", phone:"+20 128 004 1176", dev:"Palm Hills", reg:"الشيخ زايد",
      projects:["Palm Hills West"], seen:26, ok:24, since:"15 Aug 2026", active:1,
      profile:{ rules:{ price:{kw:"سعر الوحده",pick:"last",min:300000}, delivery:{kw:"تسليم",pick:"last",min:2020} },
                seen:26, corrections:2, updated:"25 Sep 2026" } },
    { id:"R-019", nm:"أمينة الكرمة", phone:"+20 115 667 2240", dev:"El Karma Developments", reg:"الشيخ زايد",
      projects:["Karma Gates"], seen:10, ok:8, since:"31 Aug 2026", active:1,
      profile:{ rules:{}, seen:10, corrections:0 } },
    { id:"R-020", nm:"مصطفى ORA", phone:"+20 102 881 5547", dev:"ORA Developers", reg:"الشيخ زايد",
      projects:["زايد ويست · North Towers"], seen:22, ok:21, since:"16 Aug 2026", active:1,
      profile:{ rules:{ price:{kw:"سعر الوحده",pick:"last",min:300000}, months:{kw:"سنين",pick:"last",min:1} },
                seen:22, corrections:3, updated:"01 Oct 2026" } }
  ];

  /* ---------- الطابور الوارد ----------
     رسائل خام زي ما وصلت. الموظف بيراجعها في شاشة الاستقبال. */
  var QUEUE = [
    { id:"M-5512", rep:"R-002", at:"النهاردة 03:21",
      raw:"🌸 Zahw Boutique Compound | A3-12 🌸\n📍 التوسعات الشرقية — بين هضبة بالم هيلز و نيو جيزة\n\n🏠 3 غرف | 130 م²\n🌊 بحري صريح\n🏘 كورنر — خصوصية أعلى\n🏢 الدور الأول\n\n💰 سعر الوحده: 7,585,301 جنيه\n🚗 جراج: 150,000 جنيه\n\n🎁 September Offers | لفتره محدوده\n💸 Cash | خصم 35% ✅ 4,930,446 جنيه\n💰 50% DP + خصم 25% | 48 شهر" },
    { id:"M-5513", rep:"R-001", at:"النهاردة 14:04",
      raw:"🏠 Verona Residence | الهضبة الوسطى\n\n📐 3 غرف | 137 م²\n🌅 فيو لاندسكيب — الدور التالت\n\n💰 سعر الوحدة: 3,082,500 جنيه\n🎁 عرض أكتوبر | لفترة محدودة\n💵 Cash | خصم 18% ✅ 2,527,650 جنيه\n💳 10% مقدم على 60 شهر\n🔑 استلام فوري — المرحلة الأولى" },
    { id:"M-5514", rep:"R-011", at:"النهاردة 11:38",
      raw:"برج النيل | R7 العاصمة الإدارية\nمساحه 135 م\nالكاتالوج 2,950,000 ج\nبدايه 15% وباقي على 96 شهر\nالتسليم 2026" },
    { id:"M-5515", rep:"R-006", at:"النهاردة 12:15",
      raw:"📢 تحديث أسعار — المرحلة التانية\n\n🏢 النخبة | Alpha Residence\n📍 التسعين الشمالي\n\n⬆️ زيادة 5% اعتباراً من النهاردة\n🏡 Lake View | 150 م² → 4,800,000 جنيه\n💳 المقدم 10% كما هو | 7 سنين\n🔑 التسليم: 2026" },
    { id:"M-5516", rep:"R-010", at:"النهاردة 09:52",
      raw:"Story Hotel Apartments — New Cairo\nBUA 61 sqm\nTotal Price 7,990,269 EGP\nDP 10% over 8 years\nDelivery 2029" },
    { id:"M-5517", rep:"R-003", at:"النهاردة 10:27",
      raw:"السلام عليكم يا جماعة 🌹\nمبروك لينا كلنا النجاح الكبير\nوعقبال باقي المراحل إن شاء الله 🎉" },
    { id:"M-5518", rep:"R-005", at:"النهاردة 13:46",
      raw:"MMG Towers\nدور متكرر — فيو مفتوح\nالسعر حسب الدور يرجى التواصل\n01152289063" },
    { id:"M-5519", rep:"R-007", at:"النهاردة 10:02",
      raw:"⭐ The Median Residence ⭐\n📍 التسعين الجنوبي — التجمع الخامس\n\n🏡 3 غرف + حديقة خاصة | 155 م²\n\n💰 السعر: 14,112,000 جنيه\n💸 خصم كاش 32% ✅ 9,596,160 جنيه\n💳 10% مقدم على 8 سنين\n🔑 التسليم: 2027" }
  ];

  /* آخر سعر مسجّل لكل بصمة — ده اللي بيكشف النزول والرفع */
  var HISTORY = {
    "Ghoniem Group|130":  { price: 7430000, area: 130, date: "21 Jul 2026" },
    "Xland Developments|137": { price: 3194000, area: 137, date: "16 Sep 2026" },
    "تطوير مصر العقارية|150": { price: 4575000, area: 150, date: "22 Jun 2026" },
    "EgyGab|155": { price: 14112000, area: 155, date: "18 Jul 2026" },
    "Nile Developments|135": { price: 3100000, area: 135, date: "12 Sep 2026" }
  };

  /* ---------- أرشيف الطرح ----------
     كل مطوّر له جروب واحد، فتكرار نفس الوحدة معناه إنه بيعيد طرحها —
     وده مؤشر إن الوحدة مش بتتباع. بنسجّل كل طرح بتاريخه وسعره. */
  var POSTS = [
    /* Zahw A3-12 من جروب Ghoniem */
    { rep:"R-002", fp:"Ghoniem Group|130", at:"09 Jun 2026", price:7332000 },
    { rep:"R-002", fp:"Ghoniem Group|130", at:"21 Jul 2026", price:7430000 },
    { rep:"R-002", fp:"Ghoniem Group|130", at:"30 Sep 2026", price:7585301 },
    /* Verona 137 من جروب Xland — أربع طرحات والسعر بينزل */
    { rep:"R-001", fp:"Xland Developments|137", at:"12 Apr 2026", price:3342800 },
    { rep:"R-001", fp:"Xland Developments|137", at:"05 Sep 2026", price:3315400 },
    { rep:"R-001", fp:"Xland Developments|137", at:"16 Sep 2026", price:3192100 },
    { rep:"R-001", fp:"Xland Developments|137", at:"04 Oct 2026", price:3082500 },
    /* Median 155 من جروب EgyGab — نفس السعر بيتكرر بخصم متجدد */
    { rep:"R-007", fp:"EgyGab|155", at:"18 Jul 2026", price:14112000 },
    { rep:"R-007", fp:"EgyGab|155", at:"26 Aug 2026", price:14112000 },
    { rep:"R-007", fp:"EgyGab|155", at:"02 Oct 2026", price:14112000 },
    /* Story 61 من جروب Urbnlanes */
    { rep:"R-010", fp:"Urbnlanes|61", at:"30 Aug 2026", price:7990269 },
    { rep:"R-010", fp:"Urbnlanes|61", at:"22 Sep 2026", price:7990269 },
    { rep:"R-010", fp:"Urbnlanes|61", at:"06 Oct 2026", price:7990269 },
    { rep:"R-010", fp:"Urbnlanes|61", at:"06 Oct 2026", price:7990269 }
  ];

  /* بيرجع: كام مرة اتطرحت · خلال كام يوم · والسعر اتغيّر قد إيه من أول طرح */
  function repostOf(fp) {
    var list = POSTS.filter(function (x) { return x.fp === fp; });
    if (list.length < 2) return null;
    var first = list[0], last = list[list.length - 1];
    var d1 = new Date(first.at), d2 = new Date(last.at);
    var days = Math.max(1, Math.round((d2 - d1) / 86400000));
    return { times: list.length, days: days,
             trend: (last.price - first.price) / first.price * 100,
             from: first.at, to: last.at, prices: list.map(function (x) { return x.price; }) };
  }

  /* سجل القرارات — كل رسالة اتعمل فيها إيه ومين قرر */
  var LOG = [
    { at:"النهاردة 14:12", who:"محمد زهران", act:"اعتمد", on:"M-5510", note:"Verona — نزول 8% اتسجّل في السجل" },
    { at:"النهاردة 13:58", who:"النظام", act:"رفض آلي", on:"M-5509", note:"تهنئة بدون بيانات — جودة 0/10" },
    { at:"النهاردة 13:40", who:"سارة", act:"صحّح", on:"M-5508", note:"السعر من سطر «الكاتالوج» — اتسجّل في نموذج طارق" },
    { at:"النهاردة 12:31", who:"النظام", act:"اعتمد آلي", on:"M-5507", note:"نموذج ياسمين ناضج · جودة 9.2/10" },
    { at:"النهاردة 11:04", who:"محمد زهران", act:"حوّل لفرصة", on:"M-5505", note:"أقل من متوسط الهضبة الوسطى 14%" }
  ];

  LINE.reps = REPS.length;
  LINE.groups = REPS.reduce(function (a, r) { return a + r.projects.length; }, 0);

  w.MQ_ADMIN = { LINE: LINE, REPS: REPS, QUEUE: QUEUE, HISTORY: HISTORY,
                 POSTS: POSTS, repostOf: repostOf, LOG: LOG };
})(window);
