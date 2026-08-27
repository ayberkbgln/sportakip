/* =====================================================================
   veri.js — plan içeriği. Kod değil veri; buradaki hiçbir şey kişiye özel
   değildir. Kullanıcıya ait her şey app.js içindeki durumda ve cihazda durur.
   ===================================================================== */

/* ---------- Hedef ve aktivite ---------- */
const HEDEFLER = [
  { id: "yag",   ad: "Yağ kaybı",      d: "Kaloriyi kısıp kası koru",        kcal: 0.80, protein: 2.0 },
  { id: "kas",   ad: "Kas kazanımı",   d: "Kontrollü kalori fazlası",         kcal: 1.10, protein: 1.8 },
  { id: "recomp",ad: "Yağ yak + kas kazan", d: "Hafif açık + yüksek protein (vücut yenileme)", kcal: 0.90, protein: 2.2 },
  { id: "koru",  ad: "Formu koru",     d: "Kilonu tut, alışkanlığı sürdür",   kcal: 1.00, protein: 1.6 },
  { id: "perf",  ad: "Performans",     d: "Antrenman kalitesi önce gelsin",   kcal: 1.05, protein: 1.8 }
];

const AKTIVITE = [
  { id: "az",   ad: "Hareketsiz",     d: "Masa başı, antrenman yok",          k: 1.2 },
  { id: "hafif",ad: "Hafif aktif",    d: "Haftada 1-3 gün antrenman",         k: 1.375 },
  { id: "orta", ad: "Orta aktif",     d: "Haftada 3-5 gün antrenman",         k: 1.55 },
  { id: "cok",  ad: "Çok aktif",      d: "Haftada 6-7 gün antrenman",         k: 1.725 },
  { id: "asiri",ad: "Aşırı aktif",    d: "Günde çift idman ya da ağır iş",    k: 1.9 }
];

/* ---------- Sporlar ----------
   log: antrenman günlüğünde hangi alanların sorulacağı.
   sure=dakika, round=raund, mesafe=km, tempo=dk/km, set=egzersiz satırları,
   yogunluk=1-5 arası zorluk                                             */
const SPORLAR = [
  { id: "kickbox",  ad: "Kickboks",    tip: "dovus",    sure: 75, log: ["sure", "round", "yogunluk"] },
  { id: "boks",     ad: "Boks",        tip: "dovus",    sure: 75, log: ["sure", "round", "yogunluk"] },
  { id: "muaythai", ad: "Muay Thai",   tip: "dovus",    sure: 75, log: ["sure", "round", "yogunluk"] },
  { id: "mma",      ad: "MMA",         tip: "dovus",    sure: 90, log: ["sure", "round", "yogunluk"] },
  { id: "bjj",      ad: "BJJ / Güreş", tip: "dovus",    sure: 90, log: ["sure", "round", "yogunluk"] },
  { id: "agirlik",  ad: "Ağırlık",     tip: "guc",      sure: 60, log: ["sure", "set"] },
  { id: "vucut",    ad: "Vücut ağırlığı", tip: "guc",   sure: 40, log: ["sure", "set"] },
  { id: "crossfit", ad: "CrossFit",    tip: "guc",      sure: 60, log: ["sure", "yogunluk"] },
  { id: "kosu",     ad: "Koşu",        tip: "kardiyo",  sure: 40, log: ["sure", "mesafe", "tempo"] },
  { id: "bisiklet", ad: "Bisiklet",    tip: "kardiyo",  sure: 60, log: ["sure", "mesafe"] },
  { id: "yuzme",    ad: "Yüzme",       tip: "kardiyo",  sure: 45, log: ["sure", "mesafe"] },
  { id: "yuruyus",  ad: "Yürüyüş",     tip: "kardiyo",  sure: 40, log: ["sure", "mesafe"] },
  { id: "kurek",    ad: "Kürek / Ergo",tip: "kardiyo",  sure: 30, log: ["sure", "mesafe"] },
  { id: "futbol",   ad: "Futbol",      tip: "takim",    sure: 90, log: ["sure", "yogunluk"] },
  { id: "basketbol",ad: "Basketbol",   tip: "takim",    sure: 90, log: ["sure", "yogunluk"] },
  { id: "voleybol", ad: "Voleybol",    tip: "takim",    sure: 90, log: ["sure", "yogunluk"] },
  { id: "tenis",    ad: "Tenis",       tip: "takim",    sure: 60, log: ["sure", "yogunluk"] },
  { id: "yoga",     ad: "Yoga",        tip: "esneklik", sure: 45, log: ["sure"] },
  { id: "pilates",  ad: "Pilates",     tip: "esneklik", sure: 45, log: ["sure"] },
  { id: "esneme",   ad: "Esneme",      tip: "esneklik", sure: 20, log: ["sure"] }
];

const SPOR_TIP_AD = { dovus: "Dövüş", guc: "Güç", kardiyo: "Kardiyo", takim: "Takım", esneklik: "Esneklik" };

/* Antrenman günlüğü alanlarının etiketleri */
const LOG_ALAN = {
  sure:     { ad: "Süre",       birim: "dk" },
  round:    { ad: "Raund",      birim: "" },
  mesafe:   { ad: "Mesafe",     birim: "km" },
  tempo:    { ad: "Tempo",      birim: "dk/km" },
  yogunluk: { ad: "Zorluk",     birim: "/5" }
};

/* Güç antrenmanı şablonları — kullanıcı üzerine yazabilir */
const GUC_SABLON = {
  "Tüm vücut A": ["Squat", "Bench press / şınav", "Lat çekiş", "Plank"],
  "Tüm vücut B": ["Romen deadlift", "Omuz press", "Kürek çekiş", "Karın"],
  "İtiş":        ["Bench press", "Omuz press", "Dips", "Triceps"],
  "Çekiş":       ["Barfiks", "Kürek çekiş", "Face pull", "Biceps"],
  "Bacak":       ["Squat", "Romen deadlift", "Bacak press", "Baldır"],
  "Üst vücut":   ["Bench press", "Kürek çekiş", "Omuz press", "Barfiks"],
  "Alt vücut":   ["Squat", "Hip thrust", "Lunge", "Baldır"],
  "Ev A":        ["Şınav", "Squat", "Glute bridge", "Plank"],
  "Ev B":        ["Pike şınav", "Lunge", "Superman", "Leg raise"],
  "Duruş rutini":["Chin tuck", "Duvar melekleri", "Band pull-apart", "Bird dog"]
};

/* ---------- Egzersiz kütüphanesi ----------
   Hareketin nasıl yapıldığı, hangi bölgeyi çalıştırdığı ve nerede
   yapılabildiği. Set/tekrar önerisi hareketin üstüne değil kullanıcının
   HEDEFİNE göre veriliyor (setOner, app.js) — aynı squat, yağ kaybında
   başka, kas kazanımında başka çalışılır.

   Öneriler ölçülere göre DEĞİL hedef + ekipmana göre. Vücut ölçüsünden
   "sana bu hareket uygun" çıkarmak fizyoterapistlik taslamak olur; ağrı ve
   sakatlık uygulamanın işi değil, uzmanın işi. Genel form ipucu veriyoruz,
   teşhis değil.

   yer: "salon" | "ev" | "ikisi". Ev = ekipmansız ya da tek dambıl.        */
const BOLGE_AD = { gogus: "Göğüs", sirt: "Sırt", omuz: "Omuz", kol: "Kol", bacak: "Bacak", karin: "Karın", durus: "Duruş" };

const EGZERSIZLER = [
  { ad: "Bench press", bolge: "gogus", yer: "salon",
    nasil: "Sırtın bankta, ayakların yerde. Kürek kemiklerini geriye sık, barı göğüs alt hizasına indir, dirsekler gövdeyle ~45° açıda itip kalk." },
  { ad: "Incline dumbbell press", bolge: "gogus", yer: "salon",
    nasil: "Bank 30-45° eğimde. Dambılları göğüs üst hizasından yukarı it, indirirken dirsekleri kontrollü aç. Üst göğüsü hedefler." },
  { ad: "Şınav", bolge: "gogus", yer: "ikisi",
    nasil: "Eller omuz genişliğinde, gövde düz bir çizgi. Göğsün yere yaklaşana kadar in, itip kalk. Zorsa dizlerin yerde başla; kolaysa ayakları yükselt." },
  { ad: "Dips", bolge: "gogus", yer: "salon",
    nasil: "Paralel barda, hafif öne eğil. Dirsekler 90° olana kadar in, itip kalk. Omuzda batma hissi olursa derinliği azalt." },
  { ad: "Kablo crossover", bolge: "gogus", yer: "salon",
    nasil: "Kablolar üstte, bir adım önde dur. Kolları hafif dirsek kırık, geniş bir yay çizerek önde birleştir. Sıkışmayı bir saniye tut." },

  { ad: "Barfiks", bolge: "sirt", yer: "ikisi",
    nasil: "Bara omuzdan biraz geniş tutun. Göğsünü bara doğru çek, üstte çeneni geçir, kontrollü in. Çıkamıyorsan lastik bantla ya da negatif tekrarlarla başla." },
  { ad: "Lat çekiş", bolge: "sirt", yer: "salon",
    nasil: "Barı omuzdan geniş tut, göğsün üst kısmına çek. Dirsekler aşağı-geriye; omuzları kulaklardan uzak tut, gövdeyi sallama." },
  { ad: "Kürek çekiş", bolge: "sirt", yer: "salon",
    nasil: "Kalçadan öne eğil, sırt düz. Barı karın hizana çek, kürek kemiklerini birbirine yaklaştır, kontrollü bırak." },
  { ad: "Dumbbell row", bolge: "sirt", yer: "ikisi",
    nasil: "Bir elin ve dizin bankta (evde sandalyede). Dambılı kalça yönüne doğru çek, sırtı düz tut, gövdeyi döndürme." },
  { ad: "Superman", bolge: "sirt", yer: "ev",
    nasil: "Yüzüstü yat, kollar önde. Kollarını ve bacaklarını aynı anda yerden kaldır, iki saniye tut, yavaş bırak. Bel çevresini güçlendirir." },

  { ad: "Omuz press", bolge: "omuz", yer: "ikisi",
    nasil: "Dambıllar omuz hizasında, dik dur. Yukarı doğru bası yap, tepede dirsekleri kilitleme. Beli aşırı çukurlaştırma — karnı sık." },
  { ad: "Lateral raise", bolge: "omuz", yer: "ikisi",
    nasil: "Hafif dambıllarla yanlara, omuz hizasına kadar kaldır. Dirsekler hafif kırık, omuz silkme yok. Hafif ağırlık + temiz form." },
  { ad: "Face pull", bolge: "omuz", yer: "salon",
    nasil: "Halat yüz hizasında. Dirsekleri geniş tutarak halatı yüzüne doğru çek, kürekleri sık. Arka omuz ve duruş için birebir." },
  { ad: "Pike şınav", bolge: "omuz", yer: "ev",
    nasil: "Kalça yukarıda ters V pozisyonu. Başını öne-aşağı indirip omuzlarla it. Omuz presinin ekipmansız hâli; kolaylaşınca ayakları yükselt." },

  { ad: "Biceps curl", bolge: "kol", yer: "ikisi",
    nasil: "Dirsekler gövdeye sabit. Dambılı savurmadan kaldır, yavaş indir. İndirme kaldırmadan uzun sürsün." },
  { ad: "Hammer curl", bolge: "kol", yer: "ikisi",
    nasil: "Avuçlar birbirine bakar. Dirsek sabit, dambılı çekiç tutar gibi kaldır. Ön kolu da çalıştırır." },
  { ad: "Triceps pushdown", bolge: "kol", yer: "salon",
    nasil: "Kablo üstte, dirsekler gövdeye yapışık. Barı aşağı it, dirsekten aç-kapa; omuzdan güç alma." },
  { ad: "Sandalye dips", bolge: "kol", yer: "ev",
    nasil: "Sırtın sandalyeye dönük, eller kenarda. Dirseklerden 90° in, itip kalk. Bacakları uzattıkça zorlaşır." },

  { ad: "Squat", bolge: "bacak", yer: "ikisi",
    nasil: "Ayaklar omuz genişliğinde, topuklar yerde. Kalçayı geriye-aşağı gönder, dizler ayak ucu yönünde. Göğüs dik, derinlik rahat gittiğin kadar." },
  { ad: "Goblet squat", bolge: "bacak", yer: "ikisi",
    nasil: "Dambılı göğsünün önünde iki elle tut, squat yap. Ağırlık önde olduğu için formu kendiliğinden düzeltir — squat öğrenmenin en iyi yolu." },
  { ad: "Bacak press", bolge: "bacak", yer: "salon",
    nasil: "Ayaklar platformda omuz genişliğinde. Dizleri göğse doğru indir, itip kalk; tepede dizleri kilitleme, beli yastıktan ayırma." },
  { ad: "Romen deadlift", bolge: "bacak", yer: "ikisi",
    nasil: "Bar/dambıl bacak önünde, dizler hafif kırık. Kalçadan geriye eğil, ağırlık bacağa sürtünerek insin, arka bacakta gerilmeyi hissedince kalk. Sırt hep düz." },
  { ad: "Lunge", bolge: "bacak", yer: "ikisi",
    nasil: "Bir adım öne çık, arka diz yere yaklaşsın, öne bastığın topukla geri it. Gövde dik; denge için önce ağırlıksız." },
  { ad: "Bulgarian split squat", bolge: "bacak", yer: "ikisi",
    nasil: "Arka ayak bankta/sandalyede. Öndeki bacakla in-kalk. Tek bacak kuvveti ve denge — zorlu ama değerli." },
  { ad: "Bacak curl", bolge: "bacak", yer: "salon",
    nasil: "Makinede topukları kalçaya doğru çek, yavaş bırak. Arka bacağı izole eder; koşucular ihmal etmesin." },
  { ad: "Hip thrust", bolge: "bacak", yer: "salon",
    nasil: "Sırt üstü bankta, bar kalçada. Kalçayı yukarı it, tepede kalçayı sık, çeneni göğse yakın tut." },
  { ad: "Glute bridge", bolge: "bacak", yer: "ev",
    nasil: "Sırt üstü yat, dizler kırık. Kalçayı yukarı it, tepede iki saniye sık. Hip thrust'ın ekipmansız hâli." },
  { ad: "Baldır", bolge: "bacak", yer: "ikisi",
    nasil: "Basamak kenarında parmak ucunda yüksel, topuğu basamağın altına kadar indir. Tam açıklıkta ve yavaş çalış." },

  { ad: "Plank", bolge: "karin", yer: "ev",
    nasil: "Dirsekler omuz altında, gövde düz çizgi. Kalça düşmesin, nefes almaya devam et. Süreyi her hafta biraz uzat." },
  { ad: "Crunch", bolge: "karin", yer: "ev",
    nasil: "Sırt üstü, dizler kırık. Kürek kemiklerini yerden kaldıracak kadar kıvrıl, boynundan çekme; yukarıda nefes ver." },
  { ad: "Leg raise", bolge: "karin", yer: "ev",
    nasil: "Sırt üstü, eller kalça altında. Bacakları düz kaldırıp yavaş indir; bel yerden kalkıyorsa dizleri kır." },
  { ad: "Mountain climber", bolge: "karin", yer: "ev",
    nasil: "Şınav pozisyonunda dizleri sırayla göğse çek. Tempoyu artırınca kardiyoya döner — ısınma için de iyi." },

  /* Duruş — masa başında öne kayan baş ve kapanan omuzlara karşı.
     Kural: öndeki kısalanı esnet, arkadaki zayıflayanı çalıştır.
     Tedavi değil genel bilgi; süren ağrıda uzman gerekir (rehberde yazıyor). */
  { ad: "Chin tuck", bolge: "durus", yer: "ev",
    nasil: "Dik dur ya da otur. Başını öne eğmeden çeneni geriye, boynuna doğru çek — ensen uzasın. İki saniye tut, bırak. Ekrana doğru öne kayan baş için." },
  { ad: "Duvar melekleri", bolge: "durus", yer: "ev",
    nasil: "Sırtın, kalçan ve başın duvara değsin. Kollar 90°, el sırtları duvarda; duvardan koparmadan yukarı-aşağı kaydır. Üst sırtı uyandırır, omuz hareketliliğini açar." },
  { ad: "Kedi-deve", bolge: "durus", yer: "ev",
    nasil: "Emekleme pozisyonunda. Nefes verirken sırtını tavana doğru kamburlaştır, alırken göğsünü açıp beline çukur ver. Yavaş ve akıcı — omurgayı gezdir." },
  { ad: "Kapıda göğüs esnetme", bolge: "durus", yer: "ev",
    nasil: "Ön kolunu kapı pervazına 90° koy, bir adım öne al ve göğsünde gerilmeyi hisset. 20-30 saniye tut, iki tarafta. Kapanan omuzların panzehiri." },
  { ad: "Band pull-apart", bolge: "durus", yer: "ikisi",
    nasil: "Direnç bandını omuz genişliğinde, kollar düz tut. Göğüs hizasında yanlara açarken kürek kemiklerini sık, yavaş bırak. Bant yoksa havluyla gergin tutup aynı hareketi yap." },
  { ad: "Bird dog", bolge: "durus", yer: "ev",
    nasil: "Emekleme pozisyonunda çapraz kolu ve bacağı aynı anda uzat, gövden sallanmasın. İki saniye tut, tarafları değiştir. Gövde kontrolü ve bel dostu." },
  { ad: "Yüz üstü Y-T kaldırış", bolge: "durus", yer: "ev",
    nasil: "Yüzüstü yat, baş nötr. Kollarını önce Y sonra T şeklinde yerden birkaç santim kaldır, başparmaklar yukarı. Kürek çevresindeki küçük kasları uyandırır." }
];

/* ---------- Takviye kütüphanesi ----------
   etiket alanları uyarı motorunu besler:
   kafein  → porsiyon başına mg
   tokKarin→ aç karnına alınmamalı
   uyku    → uykuya yakın alınmamalı (saat kısıtı kafeinle aynı mantık)      */
const TAKVIYELER = [
  { id: "kreatin",  ad: "Kreatin",            doz: "5 g",            saat: "08:00", etiket: {},
    not: "Her gün, antrenman olsun olmasın. Saat fark etmez." },
  { id: "whey",     ad: "Whey protein",       doz: "1 ölçek (~30 g)",saat: "antrenman sonrası", etiket: {},
    not: "Suyla. Yemekten yeterli protein alamadığın günlerde ikinci ölçek." },
  { id: "kazein",   ad: "Kazein",             doz: "1 ölçek",        saat: "yatmadan önce", etiket: {},
    not: "Gece boyu yavaş salınım. Whey'in gece alternatifi." },
  { id: "cla",      ad: "CLA",                doz: "1 kapsül",       saat: "öğünle", etiket: { tokKarin: true },
    not: "Yağ asidi — aç karnına emilimi düşer. Genelde günde 3 kapsül, öğünlere böl." },
  { id: "glutamin", ad: "Glutamin",           doz: "5 g",            saat: "yatmadan önce", etiket: {},
    not: "Aromasız, suyla." },
  { id: "bcaa",     ad: "BCAA / EAA",         doz: "1 ölçek",        saat: "antrenman sırasında", etiket: {},
    not: "Günlük proteini tutturuyorsan etkisi sınırlı." },
  { id: "preworkout", ad: "Pre-workout",      doz: "1 ölçek",        saat: "antrenmandan 30 dk önce", etiket: { kafein: 200, uyku: true },
    not: "Kafein içerir — akşam antrenmanlarında uykunu böler." },
  { id: "amino",    ad: "Amino (kafeinli)",   doz: "1 ölçek",        saat: "antrenmandan önce", etiket: { kafein: 100, uyku: true },
    not: "Etikette kafein miktarını doğrula, ürüne göre değişir." },
  { id: "karnitin", ad: "L-Karnitin (sade)",  doz: "2 g",            saat: "antrenmandan önce", etiket: {},
    not: "Karbonhidratlı bir şeyle emilimi artar. Thermo / kafeinli sürüm kullanıyorsan bunun yerine Termojenik'i seç." },
  { id: "termojenik", ad: "Termojenik / yağ yakıcı", doz: "1 doz",    saat: "sabah", etiket: { kafein: 200, uyku: true },
    not: "Thermo karnitin dahil çoğunda kafein var — etiketteki mg'ı doğrula. Kürlü kullan, sürekli değil." },
  { id: "kafein",   ad: "Kafein tableti",     doz: "1 tablet",       saat: "sabah", etiket: { kafein: 200, uyku: true },
    not: "Yarılanma ömrü 5-6 saat." },
  { id: "omega3",   ad: "Omega-3",            doz: "1-2 kapsül",     saat: "öğünle", etiket: { tokKarin: true },
    not: "Yağda çözünür, yemekle al." },
  { id: "dvit",     ad: "D vitamini",         doz: "1 damla / kapsül", saat: "öğünle", etiket: { tokKarin: true },
    not: "Yağda çözünür. Dozu kan değerine göre hekimin belirlemeli." },
  { id: "k2",       ad: "K2 vitamini",        doz: "1 kapsül",       saat: "öğünle", etiket: { tokKarin: true },
    not: "Yağda çözünür; genelde D3 ile birlikte alınır. Kan sulandırıcı kullanıyorsan hekimine danışmadan başlama." },
  { id: "multi",    ad: "Multivitamin",       doz: "1 tablet",       saat: "kahvaltıyla", etiket: { tokKarin: true },
    not: "" },
  { id: "magnezyum",ad: "Magnezyum",          doz: "1 tablet",       saat: "yatmadan önce", etiket: {},
    not: "Akşam alınması uykuya yardımcı olabilir." },
  { id: "cinko",    ad: "Çinko",              doz: "1 tablet",       saat: "yatmadan önce", etiket: { tokKarin: true },
    not: "Kalsiyum ve demirle aynı anda alma, emilimi düşürür." },
  { id: "demir",    ad: "Demir",              doz: "1 tablet",       saat: "sabah", etiket: { tokKarin: true },
    not: "C vitamini ile emilimi artar, çay/kahve ile düşer." },
  { id: "b12",      ad: "B12",                doz: "1 tablet",       saat: "sabah", etiket: {}, not: "" },
  { id: "ashwa",    ad: "Ashwagandha",        doz: "1 kapsül",       saat: "akşam", etiket: {}, not: "" },
  { id: "kollajen", ad: "Kolajen",            doz: "10 g",           saat: "sabah", etiket: {}, not: "" },
  { id: "probiyotik", ad: "Probiyotik",       doz: "1 kapsül",       saat: "aç karnına", etiket: {}, not: "" },
  { id: "beta",     ad: "Beta-alanin",        doz: "3-5 g",          saat: "antrenmandan önce", etiket: {},
    not: "Ciltte karıncalanma normal, zararsız." },
  { id: "hmb",      ad: "HMB",                doz: "3 g",            saat: "öğünle", etiket: {}, not: "" }
];

/* ---------- Öğün şablonları ----------
   Oranlar kalori hedefine göre ölçeklenir; gramaj kullanıcıya kalır.
   p = o öğünün günlük kalorinin yüzdesi                                    */
const OGUN_SABLON = [
  { id: "1ogun", ad: "Tek öğün", d: "Günün tamamı tek öğünde (OMAD)",
    ogunler: [
      { ad: "Öğün", saat: "18:00", p: 1 }] },
  { id: "2ogun", ad: "2 öğün", d: "Kahvaltı atlanır ya da iki büyük öğün",
    ogunler: [
      { ad: "İlk öğün", saat: "12:30", p: 0.45 },
      { ad: "Son öğün", saat: "19:30", p: 0.55 }] },
  { id: "3ogun", ad: "3 öğün", d: "Sade — kahvaltı, öğle, akşam",
    ogunler: [
      { ad: "Kahvaltı", saat: "08:00", p: 0.30 },
      { ad: "Öğle",     saat: "13:00", p: 0.35 },
      { ad: "Akşam",    saat: "19:30", p: 0.35 }] },
  { id: "4ogun", ad: "3 öğün + ara", d: "Aç kalmamak için bir ara öğün",
    ogunler: [
      { ad: "Kahvaltı", saat: "08:00", p: 0.28 },
      { ad: "Öğle",     saat: "13:00", p: 0.30 },
      { ad: "Ara öğün", saat: "17:00", p: 0.12 },
      { ad: "Akşam",    saat: "19:30", p: 0.30 }] },
  { id: "5ogun", ad: "5 öğün", d: "Sık ve küçük öğünler",
    ogunler: [
      { ad: "Kahvaltı",  saat: "08:00", p: 0.25 },
      { ad: "Ara öğün",  saat: "11:00", p: 0.13 },
      { ad: "Öğle",      saat: "13:30", p: 0.27 },
      { ad: "Ara öğün",  saat: "17:00", p: 0.12 },
      { ad: "Akşam",     saat: "20:00", p: 0.23 }] },
  { id: "6ogun", ad: "Antrenman odaklı", d: "Antrenman öncesi ve sonrası ayrı öğün",
    ogunler: [
      { ad: "Kahvaltı",          saat: "08:00", p: 0.24 },
      { ad: "Ara öğün",          saat: "11:00", p: 0.13 },
      { ad: "Öğle",              saat: "13:30", p: 0.25 },
      { ad: "Antrenman öncesi",  saat: "18:00", p: 0.18 },
      { ad: "Antrenman sonrası", saat: "21:30", p: 0.13 },
      { ad: "Gece",              saat: "22:30", p: 0.07 }] },
  { id: "if", ad: "Aralıklı oruç (16:8)", d: "Öğünler 8 saatlik pencerede",
    ogunler: [
      { ad: "İlk öğün",  saat: "12:00", p: 0.40 },
      { ad: "Ara öğün",  saat: "16:00", p: 0.20 },
      { ad: "Son öğün",  saat: "19:30", p: 0.40 }] }
];

/* ---------- Bırakma / azaltma modülü ----------
   Kademeli azaltma: her hafta haftalık üst sınır düşer.                    */
const ALISKANLIK_SABLON = [
  { id: "sekerli", ad: "Şekerli içecek", birim: "kutu",   baslangic: 21 },
  { id: "sigara",  ad: "Sigara",         birim: "adet",   baslangic: 140 },
  { id: "alkol",   ad: "Alkol",          birim: "kadeh",  baslangic: 14 },
  { id: "fastfood",ad: "Fast food",      birim: "öğün",   baslangic: 7 },
  { id: "enerji",  ad: "Enerji içeceği", birim: "kutu",   baslangic: 7 },
  { id: "atistir", ad: "Abur cubur",     birim: "porsiyon", baslangic: 14 },
  { id: "ozel",    ad: "Kendim yazacağım", birim: "adet", baslangic: 14 }
];

/* Haftalık sınırın başlangıca göre çarpanı. Son madde sonrasında sabit kalır. */
const AZALT_EGRISI = [1, 0.6, 0.35, 0.2, 0.12, 0.08, 0.05];

/* ---------- Market kategorileri ----------
   Sıra market reyonlarını takip ediyor: önce manav, sonra kasap, şarküteri,
   süt reyonu, kuru gıda, en sonda içecek. Böylece liste dükkânda yukarıdan
   aşağı okunuyor, geri dönüp durmuyorsun.

   Ekranda hepsi birden basılmıyor — her grup katlanır (`dMarket`), üstte de
   son iki haftada gerçekten yediklerinden çıkan öneriler duruyor. Kullanıcı
   kendi kalemini de ekleyebiliyor (`S.marketEk`), takviye grubu da seçili
   takviyelerden kendiliğinden üretiliyor; burada sabit liste yok.          */
const MARKET_SABLON = [
  { k: "Sebze",             i: ["Domates", "Salatalık", "Yeşillik / marul", "Soğan", "Sarımsak", "Biber",
                                "Brokoli", "Ispanak", "Havuç", "Kabak", "Patates", "Mantar", "Mevsim sebzesi"] },
  { k: "Meyve",             i: ["Muz", "Elma", "Portakal", "Çilek", "Karpuz / kavun", "Üzüm",
                                "Avokado", "Limon", "Mevsim meyvesi"] },
  { k: "Et ve tavuk",       i: ["Tavuk göğsü", "Tavuk but", "Dana kıyma", "Dana kuşbaşı", "Biftek / bonfile",
                                "Hindi", "Kuzu"] },
  { k: "Balık",             i: ["Somon", "Levrek / çipura", "Hamsi", "Ton balığı (konserve)", "Karides"] },
  { k: "Şarküteri",         i: ["Yumurta", "Hindi füme", "Tavuk salam", "Pastırma", "Sucuk"] },
  { k: "Süt ürünü",         i: ["Süt", "Yoğurt", "Süzme yoğurt", "Kefir", "Ayran", "Beyaz peynir",
                                "Kaşar", "Lor / çökelek", "Krem peynir"] },
  { k: "Kahvaltılık",       i: ["Yulaf", "Zeytin", "Bal", "Reçel", "Tahin", "Pekmez", "Fıstık ezmesi",
                                "Mısır gevreği"] },
  { k: "Ekmek ve unlu",     i: ["Tam buğday ekmek", "Ekmek", "Lavaş / tortilla", "Yufka", "Galeta / grissini"] },
  { k: "Tahıl ve bakliyat", i: ["Pirinç", "Bulgur", "Makarna", "Kuskus", "Kinoa", "Mercimek", "Nohut",
                                "Kuru fasulye", "Un"] },
  { k: "Konserve ve hazır", i: ["Domates salçası", "Mısır konservesi", "Bezelye", "Barbunya", "Hazır çorba"] },
  { k: "Yağ, sos, baharat", i: ["Zeytinyağı", "Ayçiçek yağı", "Sirke", "Hardal", "Ketçap", "Soya sosu",
                                "Tuz", "Karabiber", "Pul biber", "Kekik", "Kimyon", "Nane"] },
  { k: "Kuruyemiş",         i: ["Badem", "Ceviz", "Fındık", "Antep fıstığı", "Kaju", "Kuru üzüm",
                                "Hurma", "Kuru kayısı"] },
  { k: "Dondurulmuş",       i: ["Dondurulmuş sebze", "Dondurulmuş meyve", "Dondurulmuş balık"] },
  { k: "Atıştırmalık",      i: ["Bitter çikolata", "Protein bar", "Mısır patlağı", "Kraker"] },
  { k: "İçecek",            i: ["Maden suyu", "Su (damacana)", "Çay", "Kahve", "Bitki çayı", "Şekersiz gazoz"] }
];

/* ---------- Rehber ----------
   kosul: null = herkese; takviye id'si = o takviye seçiliyse; "@kafein" =
   kafeinli takviye varsa; "@guc" gibi = o tipte spor seçiliyse; "#recomp"
   gibi = profildeki hedef oysa.                                            */
const REHBER = [
  { b: "Nasıl başlanır", kosul: null, s: [
    ["Sırayı bozma", "Yirmi maddeyi aynı anda uygularsan iki haftada bırakırsın. 1. hafta sadece su ve uyku. 2. hafta öğün planı. 3. hafta antrenman hacmi."],
    ["Mükemmel değil düzenli", "Haftanın 5 gününü tutturmak, 2 gün kusursuz olup bırakmaktan iyidir."],
    ["Bir gün bozulursa", "Hiçbir şey olmaz. Uygulama haftalık bütçeye bakar — ertesi gün normal planına dön, telafi için aç kalma."],
    ["Ölçüm sıklığı", "Tartıya her gün çıkabilirsin ama karar verirken haftalık ortalamaya bak. Günlük dalgalanma su ve tuzdur."]] },

  { b: "Ölçüm — hep aynı şekilde", kosul: null, s: [
    ["Ne zaman", "Sabah, aç karnına, tuvaletten sonra, antrenmandan önce."],
    ["Bel", "Göbek deliği hizasından. Mezura yere paralel, karnı İÇE ÇEKMEDEN, normal nefes verdikten sonra."],
    ["Boyun", "Gırtlağın hemen altından, boynun en dar yerinden. Mezura önde hafif aşağı eğimli, sıkmadan."],
    ["Kalça", "En geniş yerinden, ayaklar bitişik. (Kadınlarda Navy formülü bunu da kullanır.)"],
    ["Kaç kez", "Her ölçüyü 2 kez al, ortalamasını gir. 1 cm hata ~1 puan kaydırır."],
    ["Yorumlama", "4 haftada bel 2-3 cm inmişse doğru yoldasın — tartı ne derse desin."],
    ["Hata payı", "Navy yöntemi ±3-4 puan sapabilir. Mutlak değere değil trende bak."]] },

  { b: "Yağ yakarken kas kazanmak", kosul: "#recomp", s: [
    ["Bu gerçekçi mi", "Evet ama herkes için değil. En iyi yeni başlayanlarda, uzun aradan dönenlerde ve yağ oranı yüksekken çalışır. Yıllardır düzenli çalışan birinde ikisi aynı anda çok yavaş ilerler."],
    ["Terazi yalan söyler", "Yağ giderken kas gelirse kilo yerinde sayar. İlerlemeyi tartıdan değil bel ölçüsünden, fotoğraftan ve kaldırdığın ağırlıktan takip et."],
    ["İki kaldıraç", "Protein hedefini her gün tuttur (kg başına ~2.2 g) ve antrenmanda her hafta ya bir tekrar ya biraz kilo ekle. Bu ikisi olmadan hafif açık sadece yavaş zayıflamadır."],
    ["Sabır", "Ayda 0.5-1 kg yağ kaybı + görünür kuvvet artışı bu hedefte başarıdır. Daha hızlısını istiyorsan hedefi ikiye böl: önce yağ, sonra kas."]] },

  { b: "Evde antrenman", kosul: "@guc", s: [
    ["Ekipman şart değil", "Şınav, squat, lunge, glute bridge, plank ile tüm vücudu çalıştırırsın. Programda \"Ev A / Ev B\" şablonları hazır; Egzersizler sayfasında nasıl yapılacağı yazıyor."],
    ["Zorlaştırma mantığı", "Evde ağırlık artıramazsın, o yüzden tekrarı artır, tempoyu yavaşlat (3 saniyede in), ya da açıyı zorlaştır (ayaklar yüksekte şınav). Kolaylaşan hareket ilerletilmemiş harekettir."],
    ["Tek dambıl çok şey değiştirir", "Goblet squat, dumbbell row, omuz press, Romen deadlift — tek bir ayarlanabilir dambılla ev antrenmanı yıllarca yeter."]] },

  { b: "Duruş", kosul: null, s: [
    ["Masa başı gerçeği", "Gün boyu ekrana eğilmek göğüs tarafını kısaltır, üst sırtı zayıflatır; baş öne kayar, omuzlar kapanır. Egzersizler sayfasındaki Duruş bölümü tam bu zinciri hedefler: öndeki kısalanı esnet, arkadaki zayıflayanı çalıştır."],
    ["Nasıl kullan", "Duruş hareketleri ağırlık antrenmanı gibi yorucu değildir — günde 5-10 dakika yeter, ideali her gün. Programına \"Duruş rutini\" şablonunu ekleyebilir ya da mola aralarında tek tek yapabilirsin."],
    ["Sınırı bil", "Bunlar genel bilgidir, tedavi değildir. Süren ağrın, uyuşman ya da karıncalanman varsa çözüm uygulama değil hekim ya da fizyoterapisttir."]] },

  { b: "Kalori ve protein", kosul: null, s: [
    ["Hedef nereden geliyor", "Mifflin-St Jeor formülüyle bazal metabolizman hesaplanıyor, aktivite düzeyinle çarpılıyor, hedefine göre açık ya da fazla ekleniyor. Ayarlar'dan elle değiştirebilirsin."],
    ["Protein neden yüksek", "Kalori açığındayken yüksek protein kas kaybını azaltır ve seni daha tok tutar."],
    ["Tartmak şart mı", "İlk iki hafta tart, gözün kalibre olsun. Sonra tahmin yeterli."],
    ["Haftalık bütçe", "Uygulama günlük kaloriyi 7 ile çarpıp haftalık bir bütçe tutuyor. Bir gün taşarsan kalan günlere yayılır — bu gerçek hayata daha uygun."]] },

  { b: "Kreatin", kosul: "kreatin", s: [
    ["Ne kadar", "Günde 5 gram. Her gün, antrenman olsun olmasın."],
    ["Hassasiyet", "4 g da olur 6 g da. Milimetrik olmak gerekmiyor, düzenli olmak gerekiyor."],
    ["Nasıl içilir", "200-300 ml suya at, karıştır, hemen iç. Dibe çökeni bir kez daha suyla çalkalayıp iç."],
    ["Ne zaman", "Saat fark etmez. Kahvaltıya bağla ki unutma."],
    ["Yükleme", "Gerek yok. 3-4 haftada kaslar doygunluğa ulaşır."],
    ["Atlarsan", "Hiçbir şey olmaz. Ertesi gün normal doza devam et, çift alma."],
    ["Tartı uyarısı", "İlk hafta tartı 1-2 kg artabilir. Kas içi su, yağ değil."],
    ["Su", "Kreatin suyu kasa çeker — su hedefin bu yüzden daha önemli."]] },

  { b: "Protein tozu", kosul: "whey", s: [
    ["Kaç ölçek", "Günde 1 ölçek. Yemekten yeterli protein alamadıysan 2 ölçek de olur."],
    ["Ölçek kaybolduysa", "30 g ≈ 3 tepeleme yemek kaşığı. Kaba ölçü — mutfak tartın varsa onu kullan."],
    ["Nasıl hazırlanır", "250-300 ml su ile. Shaker'da 15-20 saniye çalkala."],
    ["Ne zaman", "Antrenman sonrası pratik olduğu için orada. 'Anabolik pencere' abartılmış — önemli olan günün toplam proteini."],
    ["Şunu net anla", "Protein tozu ilaç değil, yiyecek. Yiyemediğin bir tavuk göğsünün yerine geçiyor, o kadar."],
    ["Şişkinlik olursa", "Sebebi çoğu zaman laktoz değil tatlandırıcıdır. İzolat dene."]] },

  { b: "CLA", kosul: "cla", s: [
    ["Nasıl alınır", "Öğünlerle — kahvaltı, öğle, akşam. Yağ asidi olduğu için aç karnına emilimi düşer."],
    ["Beklenti", "Etkisi mütevazıdır. Kalori açığının yerine geçmez."]] },

  { b: "Kafeinli takviyeler", kosul: "@kafein", s: [
    ["Kafein kuralı", "Kafeinin yarılanma ömrü 5-6 saat. Akşam 20:30 antrenmanından önce aldığın 200 mg'ın yarısı gece 2'de hâlâ kanında olur. Uyku bozulunca yağ kaybı ve toparlanma yavaşlar."],
    ["Aynı gün iki ürün", "Kafeinli iki takviyeyi aynı güne koyma. Uygulama günlük toplamı hesaplayıp uyarıyor."],
    ["Üst sınır", "Sağlıklı yetişkinde günde 400 mg genel kabul gören sınır. Kahve ve çayı da sayıya kat."],
    ["Akşam antrenmanı", "Antrenmanın 18:00'den sonraysa kafeinli ürünü sabaha al ya da hiç alma."]] },

  { b: "Uyku ve toparlanma", kosul: null, s: [
    ["Neden önemli", "Uyku, antrenmandan sonra gelen ikinci yarısıdır. 6 saat altı uykuda kas kaybı artar, açlık hormonu yükselir."],
    ["Hedef", "7-9 saat. Hafta içi ve sonu aynı saatte kalkmak, toplam süreden daha etkili."],
    ["Antrenman sonrası", "Geç saatte antrenman yapıyorsan bitişten yatışa en az 1 saat bırak."]] },

  { b: "Güç antrenmanı", kosul: "@guc", s: [
    ["Kural", "Her hafta ya bir tekrar ya biraz kilo ekle. Aynı ağırlıkla aylarca aynı tekrar, gelişme değil bakımdır."],
    ["Set ve tekrar", "Kas için 3-4 set × 6-12 tekrar iyi bir orta yol. Son 2 tekrar zorlanmalı."],
    ["Form", "Ağırlığı formu bozulmadan kaldırabildiğin kadar artır. Bir kere sakatlanmak üç ayını alır."],
    ["Dinlenme", "Aynı kas grubunu üst üste iki gün çalıştırma."]] },

  { b: "Dövüş sporları", kosul: "@dovus", s: [
    ["Yeni başladıysan", "İlk 4-6 hafta teknik ve kondisyon. Sertliğe değil tekrara odaklan."],
    ["Sonrası", "Dövüş sporu kardiyoyu zaten veriyor; ekstra kardiyo yerine güç antrenmanı ekle."],
    ["Toparlanma", "Sparring yapılan günden sonra ağır bacak günü koyma."],
    ["Sıvı", "Ders başına 0.5-1 litre ekstra su. Terle giden sadece su değil, tuz da."]] },

  { b: "Kardiyo", kosul: "@kardiyo", s: [
    ["Hacim artışı", "Haftalık mesafeyi %10'dan hızlı artırma — sakatlığın en sık sebebi budur."],
    ["Tempo", "Antrenmanların çoğu konuşabildiğin tempoda olmalı. Her seansı yarış gibi koşma."],
    ["Yağ kaybı", "Aç karnına koşmak yağ yakımını belirgin artırmaz. Performansın iyi olduğu saati seç."]] },

  { b: "Sağlık notu", kosul: null, s: [
    ["Önce şunu oku", "Bu uygulama tıbbi tavsiye değildir. Buradaki içerik genel bilgidir; teşhis ya da tedavi yerine geçmez. Kronik hastalığın, ilaç kullanımın ya da gebelik varsa plana başlamadan hekimine danış."],
    ["Takviyeler", "Takviye ilaç değildir ve ilacın yerine geçmez. Kullandığın ilaçlarla etkileşebilir — eczacına ya da hekimine sor."],
    ["Kontrol", "Uzun süredir hareketsizsen ya da bel çevren yüksekse, plana başlarken bir kez açlık kan şekeri, HbA1c, karaciğer enzimleri ve lipid paneli baktırmakta fayda var."],
    ["Durman gereken durumlar", "Göğüs ağrısı, baş dönmesi, bayılma, olağandışı nefes darlığı — antrenmanı bırak ve hekime başvur."]] }
];
