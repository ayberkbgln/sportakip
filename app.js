/* =====================================================================
   app.js — durum, ekranlar ve olaylar.

   Mimari kasten basit: durum değişir → kaydet() → ciz(). Sanal DOM yok,
   framework yok. Yeni etkileşim eklerken data-act="…" koy ve click
   dinleyicisine bir dal ekle.

   Depolama tek bir yerden geçer (Depo.oku / Depo.yaz). İleride hesap ve
   cihazlar arası senkron eklenecekse yalnızca o iki fonksiyon değişir;
   ekranların hiçbiri depolamayı doğrudan tanımaz.
   ===================================================================== */

/* =================== DEPO =================== */
const ANAHTAR = "fitplan-v2";
const ESKI_ANAHTAR = "ayberk-plan-v1";   // ilk sürümün anahtarı, göç için okunur

const Depo = {
  oku() {
    try { const h = localStorage.getItem(ANAHTAR); return h ? JSON.parse(h) : null; }
    catch (e) { return null; }
  },
  yaz(d) {
    try { localStorage.setItem(ANAHTAR, JSON.stringify(d)); return true; }
    catch (e) { return false; }
  },
  eskiOku() {
    try { const h = localStorage.getItem(ESKI_ANAHTAR); return h ? JSON.parse(h) : null; }
    catch (e) { return null; }
  }
};

/* =================== YARDIMCILAR =================== */
const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const GUN_AD = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
const GUN_KISA = ["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];

/* Yerel tarih — toISOString() doğrudan kullanılırsa gün kayar */
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const bugun = () => iso(new Date());
const tarihMs = s => new Date(s + "T00:00:00").getTime();
const trT = s => { const d = new Date(s + "T00:00:00"); return d.getDate() + " " + AYLAR[d.getMonth()] + " " + d.getFullYear(); };
const trKisa = s => { const d = new Date(s + "T00:00:00"); return d.getDate() + " " + AYLAR[d.getMonth()].slice(0, 3); };
const haftaninGunu = s => new Date(s + "T00:00:00").getDay();

/* Haftanın başı = pazartesi */
function haftaBasi(k) {
  const d = new Date(k + "T00:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}
function gunEkle(k, n) { const d = new Date(k + "T00:00:00"); d.setDate(d.getDate() + n); return iso(d); }

const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
const sayi = v => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : NaN; };
const yuvarla = (n, b) => Math.round(n / b) * b;
const kis = (n, alt, ust) => Math.max(alt, Math.min(ust, n));

/* Navy vücut yağ oranı. Kadınlarda kalça ölçüsü de gerekir ve katsayılar
   farklıdır — cinsiyet sorulmadan bu hesap yanlış sonuç verir. */
function navy(o) {
  const boy = S.profil.boy;
  if (!boy || !o || !o.bel || !o.boyun) return null;
  if (S.profil.cinsiyet === "k") {
    if (!o.kalca) return null;
    const t = o.bel + o.kalca - o.boyun;
    if (t <= 0) return null;
    return 495 / (1.29579 - 0.35004 * Math.log10(t) + 0.22100 * Math.log10(boy)) - 450;
  }
  if (o.bel <= o.boyun) return null;
  return 495 / (1.0324 - 0.19077 * Math.log10(o.bel - o.boyun) + 0.15456 * Math.log10(boy)) - 450;
}
const navyStr = o => { const v = navy(o); return v == null ? "—" : v.toFixed(1); };

/* Mifflin-St Jeor */
function bmr(kilo, boy, yas, cinsiyet) {
  if (!kilo || !boy || !yas) return null;
  return 10 * kilo + 6.25 * boy - 5 * yas + (cinsiyet === "k" ? -161 : 5);
}
const bardakMl = () => +S.profil.bardakMl > 0 ? +S.profil.bardakMl : 250;
const suHedefMl = () => bardakMl() * (S.profil.suHedef || 0);

/* Bardak boyutu değişince günlük ml hedefi korunur, bardak sayısı yeniden
   hesaplanır — kullanıcı litre hedefini kaybetmesin. */
function bardakAyarla(ml) {
  const p = S.profil, eski = suHedefMl();
  p.bardakMl = kis(Math.round(ml), 50, 2000);
  if (eski > 0) p.suHedef = kis(Math.round(eski / p.bardakMl), 1, 40);
}

const yasHesap = () => S.profil.dogumYili ? new Date().getFullYear() - S.profil.dogumYili : null;

/* Kalori ve protein hedefi profilden türer. Kullanıcı Ayarlar'dan elle
   değiştirirse kcalElle işaretlenir ve bir daha üzerine yazılmaz. */
function hedefHesapla() {
  const p = S.profil, yas = yasHesap();
  const b = bmr(p.kilo, p.boy, yas, p.cinsiyet);
  const akt = AKTIVITE.find(a => a.id === p.aktivite);
  const hed = HEDEFLER.find(h => h.id === p.hedef);
  if (!b || !akt || !hed) return null;
  const tdee = b * akt.k;
  /* Kalori açığı bazal metabolizmanın altına inmesin */
  const kcal = Math.max(Math.round(tdee * hed.kcal / 10) * 10, Math.round(b / 10) * 10);
  const suMl = Math.round(p.kilo * 35);                       // ~35 ml/kg
  return { tdee: Math.round(tdee), kcal, protein: Math.round(p.kilo * hed.protein),
           suMl, su: kis(Math.round(suMl / bardakMl()), 1, 40) };
}

/* Bugünün programı ve sporu */
const sporBul = id => SPORLAR.find(s => s.id === id) || null;

/* ---- Seanslar ----
   Bir gün birden fazla seans taşıyabilir ve sıra önemlidir: ısınma koşusu →
   kickboks → ağırlık → esneme. program[gün].seanslar sıralı bir listedir;
   boş liste dinlenme günü demektir. Her seansın kalıcı bir sid'i var, günlük
   kayıt buna bağlanıyor — programı düzenlemek geçmiş kaydı bozmasın diye. */
const gunSeanslari = k => ((S.program[haftaninGunu(k)] || {}).seanslar) || [];
const gunSporAdlari = k => gunSeanslari(k).map(s => (sporBul(s.spor) || {}).ad).filter(Boolean);
const gunToplamSure = k => gunSeanslari(k).reduce((a, s) => a + (+s.sure || 0), 0);
const yeniSid = () => "s" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);

const seansOku = (k, sid) => {
  const a = (S.gunler[k] || {}).antrenman || {};
  return (a.seans || {})[sid] || {};
};
function seansYaz(k, sid) {
  const a = gun(k).antrenman;
  if (!a.seans) a.seans = {};
  if (!a.seans[sid]) a.seans[sid] = { yapildi: false };
  return a.seans[sid];
}
const antrenmanYapildi = k => {
  const s = ((S.gunler[k] || {}).antrenman || {}).seans || {};
  return Object.keys(s).some(id => s[id] && s[id].yapildi);
};
const yapilanSeans = k => {
  const s = ((S.gunler[k] || {}).antrenman || {}).seans || {};
  return Object.keys(s).filter(id => s[id] && s[id].yapildi).length;
};

function gununTakviyeleri(k) {
  const g = haftaninGunu(k);
  return S.takviyeler.filter(t => !t.gunler || t.gunler.length === 0 || t.gunler.indexOf(g) !== -1);
}

/* ---- Alışkanlık azaltma ---- */
function aliskanlikDurum(k) {
  const a = S.aliskanlik;
  if (!a || !a.aktif) return null;
  const f = Math.floor((tarihMs(k) - tarihMs(a.baslangic)) / 864e5);
  if (f < 0) return { hafta: 0, limit: a.hafta1, ad: "Başlamadan önce" };
  const h = Math.floor(f / 7);
  const c = AZALT_EGRISI[Math.min(h, AZALT_EGRISI.length - 1)];
  return { hafta: h + 1, limit: Math.max(1, Math.round(a.hafta1 * c)), ad: (h + 1) + ". hafta" };
}
function aliskanlikHafta(k) {
  let t = 0;
  for (let i = 0; i < 7; i++) t += (S.gunler[gunEkle(k, -i)] || {}).aliskanlik || 0;
  return t;
}

/* ---- Besin arama ----
   Kelime kelime eşleşir: "izgara tavuk" yazınca "Tavuk göğsü, ızgara" bulunur.
   Düz alt dizi araması bunu bulamıyordu. Önce tüm kelimelerin geçtiği kayıtlar
   (VE), hiç sonuç yoksa en çok kelimesi geçenler (VEYA) döner.               */
function ozelListe() {
  return S.ozelBesinler.map(b => ({ ...b, grup: "Kendi eklediklerim", ara: sadeAd(b.ad), ozel: true }));
}

function besinAra(q) {
  const s = sadeAd(q).trim();
  if (s.length < 2) return [];
  const kelimeler = s.split(/\s+/).filter(k => k.length);
  const ozel = ozelListe();
  const ozelAd = new Set(ozel.map(b => b.ara));
  const hepsi = ozel.concat(BESIN_LISTE.filter(b => !ozelAd.has(b.ara)));

  const puanla = (b, k) => {
    const i = b.ara.indexOf(k);
    if (i === -1) return -1;
    const oncesi = i === 0 || /[^a-z0-9]/.test(b.ara[i - 1]);
    const sonra = b.ara[i + k.length];
    const sonrasi = sonra === undefined || /[^a-z0-9]/.test(sonra);
    let p = i === 0 ? 100 : oncesi ? 60 : 20;
    /* Tam kelime eşleşmesi ağır bassın: "süt" araması "Sütlaç"ı değil
       "Süt, tam yağlı"yı öne almalı. */
    if (oncesi && sonrasi) p += 70;
    return p;
  };

  const ve = [], veya = [];
  for (let idx = 0; idx < hepsi.length; idx++) {
    const b = hepsi[idx];
    let toplam = 0, eksik = false, tutan = 0;
    for (const k of kelimeler) {
      const p = puanla(b, k);
      if (p < 0) eksik = true; else { toplam += p; tutan++; }
    }
    if (!tutan) continue;
    /* Birebir ad en öne, kendi eklediklerin öncelikli. Ad uzunluğuna göre
       ceza YOK: eşit alakada veritabanı sırası daha iyi bir işaret, çünkü her
       grupta yaygın kalem önce yazılı. Uzunluğa bakınca "yumurta" araması
       bütün yumurta yerine yumurta beyazını, "peynir" beyaz peynir yerine
       krem peyniri öne alıyordu. */
    const puan = toplam + (b.ozel ? 40 : 0) + (b.ara === s ? 300 : 0);
    (eksik ? veya : ve).push({ b, puan, tutan, idx });
  }
  const sirala = l => l.sort((x, y) => y.tutan - x.tutan || y.puan - x.puan || x.idx - y.idx).map(x => x.b);
  return (ve.length ? sirala(ve) : sirala(veya)).slice(0, 40);
}

/* Kayıtlı bir yemeği adından bul — düzenlerken gramaj hesabını geri kurmak için.
   Besin adları veritabanında benzersiz. */
function besinBul(ad) {
  const s = sadeAd(ad);
  return ozelListe().concat(BESIN_LISTE).find(b => b.ara === s) || null;
}
/* Son eklenen besinler — çoğu insan aynı 20 şeyi yiyor */
function sonBesinler(n) {
  const gor = new Set(), out = [];
  const gunKeys = Object.keys(S.gunler).sort().reverse();
  for (const k of gunKeys) {
    for (const y of (S.gunler[k].yenen || []).slice().reverse()) {
      if (gor.has(y.ad)) continue;
      gor.add(y.ad); out.push(y);
      if (out.length >= n) return out;
    }
  }
  return out;
}

/* ---- Günün toplamları ---- */
function gunToplam(k) {
  const y = (S.gunler[k] || {}).yenen || [];
  return y.reduce((a, x) => ({ kcal: a.kcal + x.kcal, p: a.p + x.p }), { kcal: 0, p: 0 });
}

/* Haftalık kalori bütçesi. Bir gün taşarsan kalan günlere yayılır —
   günlük sıfırlama, gerçek hayatta insanları planı bırakmaya itiyor.

   Hiç yemek girilmemiş geçmiş günler bütçeye HİÇ katılmaz: ne hedef ne
   harcama sayılır. Aksi hâlde uygulamayı hafta ortasında kurmuş biri o
   günlerde sıfır kalori yemiş sayılır ve saçma bir bütçe çıkar. */
function haftaButce(k) {
  const hedef = S.profil.kcal;
  if (!hedef) return null;
  const bas = haftaBasi(k), gecen = Math.round((tarihMs(k) - tarihMs(bas)) / 864e5);
  let oncekiler = 0, kayitliGun = 0;
  for (let i = 0; i < gecen; i++) {
    const t = gunToplam(gunEkle(bas, i)).kcal;
    if (t > 0) { oncekiler += t; kayitliGun++; }
  }
  const kalanGun = 7 - gecen;                        // bugün dahil
  const sayilanGun = kayitliGun + kalanGun;
  const kalanButce = hedef * sayilanGun - oncekiler;
  return {
    haftaHedef: hedef * sayilanGun, oncekiler, kalanGun, kayitliGun,
    atlanan: gecen - kayitliGun,
    kalanButce: Math.round(kalanButce),
    gunlukOneri: Math.max(0, Math.round(kalanButce / kalanGun)),
    bugunYenen: gunToplam(k).kcal
  };
}

/* Haftalık bütçeyi insan diline çevirir */
function butceMesaj(hb) {
  const hedef = S.profil.kcal;
  if (!hb.kayitliGun)
    return `Bu haftanın ilk kaydı. Günlük hedefin <strong style="color:var(--vurgu)">${hedef} kcal</strong>.`;
  const atlandi = hb.atlanan ? ` ${hb.atlanan} gün kayıt girmemişsin, o günler hesaba katılmadı.` : "";
  if (hb.gunlukOneri < hedef * 0.85)
    return `Bu hafta fazladan yemişsin. Kalan ${hb.kalanGun} güne yayılınca günde <strong style="color:var(--vurgu)">${hb.gunlukOneri} kcal</strong> kalıyor — aç kalman gerekmiyor, sadece toparla.${atlandi}`;
  if (hb.gunlukOneri > hedef * 1.15)
    return `Bu hafta hedefinin altında kalmışsın. Kalan ${hb.kalanGun} günde günde <strong style="color:var(--vurgu)">${hb.gunlukOneri} kcal</strong> yiyebilirsin.${atlandi}`;
  return `Yolunda gidiyor. Kalan ${hb.kalanGun} gün için günde <strong style="color:var(--vurgu)">${hb.gunlukOneri} kcal</strong>.${atlandi}`;
}

/* ---- Uyarı motoru ----
   Kafein kuralı buradan geliyor: iki kafeinli ürünü aynı güne koymamak ve
   akşam antrenmanından önce kafein almamak. Uykuyu bozunca yağ kaybı ve
   toparlanma yavaşlar. */
function uyarilar(k) {
  const out = [], tk = gununTakviyeleri(k);
  const kafeinli = tk.filter(t => (t.etiket || {}).kafein > 0);
  const toplam = kafeinli.reduce((a, t) => a + t.etiket.kafein, 0);
  const antrSaat = parseInt(S.profil.antrSaat || "0", 10);
  const antrenmanVar = gunSeanslari(k).length > 0;

  if (toplam > 400)
    out.push({ tip: "kirmizi", m: `Bugünkü takviyelerde toplam ${toplam} mg kafein var. Sağlıklı yetişkinde yaygın kabul gören günlük sınır 400 mg — kahve ve çayı da buna ekle.` });
  else if (kafeinli.length > 1)
    out.push({ tip: "sari", m: `Bugün ${kafeinli.length} kafeinli takviye planlı (${toplam} mg). İkisini aynı güne koyma; birini başka güne al.` });

  if (toplam > 0 && antrSaat >= 17 && antrenmanVar)
    out.push({ tip: "sari", m: `Antrenmanın ${S.profil.antrSaat} — kafeinin yarılanma ömrü 5-6 saat. Antrenmandan hemen önce alırsan gece yarısı hâlâ yarısı kanında olur. Kafeinli ürünü sabaha al.` });

  const acKarnina = tk.filter(t => (t.etiket || {}).tokKarin);
  if (acKarnina.length)
    out.push({ tip: "sari", m: `${acKarnina.map(t => t.ad).join(", ")} — yağda çözünür, aç karnına emilimi düşer. Öğünle birlikte al.` });

  return out;
}

/* =================== DURUM =================== */
function varsayilan() {
  return {
    surum: 2,
    profil: { cinsiyet: "", dogumYili: null, boy: null, kilo: null, aktivite: "", hedef: "",
              kcal: null, protein: null, suHedef: 12, bardakMl: 250, kcalElle: false,
              antrSaat: "18:00", tamam: false },
    kurulumAdim: 0,
    sporlar: [],
    program: Array.from({ length: 7 }, () => ({ seanslar: [] })),
    ogunler: [],
    takviyeler: [],
    aliskanlik: null,
    gunler: {},
    olcumler: [],
    market: {},
    ozelBesinler: [],
    sonYedek: null
  };
}

let S = Object.assign(varsayilan(), {
  tab: "bugun",
  f: {},              // geçici form alanları — kaydedilmez
  ara: "",            // besin arama kutusu
  araHedef: "",       // aramanın hangi öğüne ekleyeceği
  daha: "",           // Daha sekmesindeki alt sayfa
  odakAra: false,     // panel açılınca arama kutusuna odaklan
  yedekMetin: ""
});

const KALICI = ["surum","profil","kurulumAdim","sporlar","program","ogunler","takviyeler",
                "aliskanlik","gunler","olcumler","market","ozelBesinler","sonYedek"];

let semaDegisti = false;

function yukle() {
  const d = Depo.oku();
  if (d) {
    KALICI.forEach(a => { if (d[a] !== undefined) S[a] = d[a]; });
    duzelt();
    /* Göç bellekte kalmasın: dönüştürülen şemayı hemen yaz, yoksa her
       açılışta yeniden dönüştürülür ve yedek alınca eski şema dışarı çıkar. */
    if (semaDegisti) kaydet();
    return;
  }
  const eski = Depo.eskiOku();
  if (eski) { goc(eski); return; }
}

/* Şema düzeltmeleri — eksik alanlarla açılan eski kayıtlar çökmesin */
function duzelt() {
  const v = varsayilan();
  S.profil = Object.assign(v.profil, S.profil || {});
  if (!(+S.profil.bardakMl > 0)) S.profil.bardakMl = 250;
  if (!Array.isArray(S.program) || S.program.length !== 7) S.program = v.program;

  /* Tek spordan seans listesine geçiş. Eski kayıt: {spor, sablon, sure} */
  S.program = S.program.map((p, i) => {
    if (p && Array.isArray(p.seanslar)) return p;
    semaDegisti = true;
    if (!p || !p.spor || p.spor === "dinlenme") return { seanslar: [] };
    return { seanslar: [{ sid: "g" + i + "s1", spor: p.spor, sablon: p.sablon || "", sure: p.sure || 0 }] };
  });
  ["sporlar","ogunler","takviyeler","olcumler","ozelBesinler"].forEach(a => { if (!Array.isArray(S[a])) S[a] = []; });
  if (!S.gunler || typeof S.gunler !== "object") S.gunler = {};

  /* Günlük antrenman kaydı düz alandan seans haritasına. Eski kayıt o günün
     ilk seansına bağlanır; program tek sporluyken zaten tek seans üretildi,
     yani geçmiş birebir korunuyor. */
  for (const k in S.gunler) {
    const gn = S.gunler[k];
    if (!gn || typeof gn !== "object") continue;
    const a = gn.antrenman;
    if (a && typeof a === "object" && a.seans) continue;
    semaDegisti = true;
    const hedef = ((S.program[haftaninGunu(k)] || {}).seanslar || [])[0];
    const sid = hedef ? hedef.sid : "eski";
    const eski = { yapildi: !!(a && a.yapildi) };
    if (a && typeof a === "object") {
      ["sure", "round", "mesafe", "tempo", "yogunluk"].forEach(f => { if (a[f] !== undefined) eski[f] = a[f]; });
      if (Array.isArray(a.set)) eski.set = a.set;
    }
    gn.antrenman = { seans: eski.yapildi || eski.set ? { [sid]: eski } : {} };
  }
  if (!S.market || typeof S.market !== "object") S.market = {};

  /* Ölçümler günde tek kayıt. Yedekten dönen ya da göçle gelen veri bu
     kuralı bozabiliyor; aynı tarihten birden fazlası varsa sonuncusu kalır.
     Tarihe göre sıralı tutuyoruz ki grafik ve "başlangıca göre" doğru olsun. */
  const tek = new Map();
  S.olcumler.filter(o => o && o.tarih).forEach(o => tek.set(o.tarih, o));
  S.olcumler = [...tek.values()].sort((a, b) => a.tarih < b.tarih ? -1 : 1);
}

/* İlk sürümden (ayberk-plan-v1) göç. Su, takviye, antrenman ve ice tea
   sayacı taşınır. Öğün işaretleri taşınmaz: eski sürüm sabit bir öğün
   listesinden kutucuk tutuyordu, yeni sürüm ne yediğini kaydediyor —
   ikisi arasında doğru bir eşleme yok. */
function goc(eski) {
  if (eski.boy) S.profil.boy = eski.boy;
  if (Array.isArray(eski.olcumler)) S.olcumler = eski.olcumler.map(o => ({ tarih: o.tarih, kilo: o.kilo, bel: o.bel, boyun: o.boyun }));
  if (S.olcumler.length) S.profil.kilo = S.olcumler[S.olcumler.length - 1].kilo;
  if (eski.market) S.market = eski.market;
  if (eski.sonYedek) S.sonYedek = eski.sonYedek;
  for (const k in (eski.gunler || {})) {
    const g = eski.gunler[k];
    S.gunler[k] = {
      su: g.su || 0, yenen: [], takviye: g.takviye || {},
      antrenman: { yapildi: !!g.antrenman }, aliskanlik: g.tea || 0
    };
  }
  if (eski.gunler && Object.keys(eski.gunler).length) {
    S.aliskanlik = { aktif: true, ad: "Şekerli içecek", birim: "kutu", baslangic: Object.keys(eski.gunler).sort()[0], hafta1: 21 };
  }
  gocBildir = true;
  duzelt();
  kaydet();
}
let gocBildir = false;

function kaydet() {
  const d = {}; KALICI.forEach(a => d[a] = S[a]);
  if (!Depo.yaz(d)) toast("Kaydedilemedi — depolama dolu olabilir");
}
let kaydetT;
function kaydetGecikmeli() { clearTimeout(kaydetT); kaydetT = setTimeout(kaydet, 400); }

const kurulumGerek = () => !S.profil.tamam;

function gun(k) {
  k = k || bugun();
  if (!S.gunler[k]) S.gunler[k] = { su: 0, yenen: [], takviye: {}, antrenman: { seans: {} }, aliskanlik: 0 };
  const g = S.gunler[k];
  if (!Array.isArray(g.yenen)) g.yenen = [];
  if (!g.takviye) g.takviye = {};
  if (!g.antrenman || typeof g.antrenman !== "object") g.antrenman = { seans: {} };
  if (!g.antrenman.seans) g.antrenman.seans = {};
  return g;
}

let toastT;
function toast(m) {
  const t = document.getElementById("toast");
  t.textContent = m; t.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2200);
}

/* =================== PARÇALAR =================== */
const TIK  = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#17111C" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const TIK_S= '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#241A06" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const UNLEM= '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 8v5M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>';

const kart = (t, v, ic) => `<div class="card">${(t || v) ? `<div class="card-h"><p class="card-t">${t || ""}</p><span class="card-v">${v || ""}</span></div>` : ""}${ic}</div>`;

const satir = o => `<div class="item ${o.on ? "done" : ""}" ${o.act ? `data-act="${esc(o.act)}"` : ""}>
 <div class="box ${o.on ? "on" : ""}">${TIK}</div>
 <div class="ib"><div class="it"><span class="name">${esc(o.ad)}</span>${o.saat ? `<span class="time">${esc(o.saat)}</span>` : ""}</div>
 ${o.desc ? `<div class="desc">${esc(o.desc)}</div>` : ""}${o.macro ? `<div class="macro">${esc(o.macro)}</div>` : ""}</div>
 ${o.uc || ""}</div>`;

const alan = (k, l, tip) => `<div class="alan"><label class="lbl" for="in-${k}">${esc(l)}</label>
 <input id="in-${k}" type="${tip || "number"}" ${tip === "text" ? "" : 'inputmode="decimal"'} data-fld="${k}" value="${esc(S.f[k] == null ? "" : S.f[k])}" placeholder="—"></div>`;

const secOp = (act, on, ad, d) => `<button class="sec-op ${on ? "on" : ""}" data-act="${esc(act)}">
 <span class="tik">${TIK_S}</span><span class="ib"><span class="name">${esc(ad)}</span>${d ? `<span class="desc">${esc(d)}</span>` : ""}</span></button>`;

const uyariKutu = u => `<div class="uyari ${u.tip === "kirmizi" ? "kirmizi" : ""}" style="color:${u.tip === "kirmizi" ? "var(--kotu)" : "var(--vurgu)"}">${UNLEM}<p>${esc(u.m)}</p></div>`;

function tally(n, hedef) {
  let g = [], kal = hedef; while (kal > 0) { g.push(Math.min(5, kal)); kal -= 5; }
  let s = 0, h = "";
  g.forEach(c => { const bas = s; s += c; const tam = c === 5; h += '<div class="grp">';
    for (let i = 0; i < (tam ? 4 : c); i++) h += `<div class="mark ${bas + i < n ? "on" : ""}"></div>`;
    if (tam) h += `<div class="slash ${bas + 4 < n ? "on" : ""}"></div>`; h += "</div>"; });
  return `<div class="tally">${h}</div>`;
}

function ilerleme(oran, renk) {
  const y = kis(Math.round(oran * 100), 0, 100);
  return `<div class="bar"><div class="fill" style="width:${y}%;background:${renk || (y >= 85 ? "var(--iyi)" : "var(--vurgu)")}"></div></div>`;
}

/* Günün kalorisi ve proteini için iç içe iki yay. Rakam kahraman olsun diye
   çubuk yerine halka: tek bakışta "ne kadarını yedim" okunuyor.
   SVG sunum özniteliklerinde var() çalışmaz — renkleri style ile veriyoruz. */
function halka(kcal, hedefKcal, protein, hedefProtein) {
  const R1 = 60, R2 = 45, C1 = 2 * Math.PI * R1, C2 = 2 * Math.PI * R2;
  const o1 = kis(hedefKcal ? kcal / hedefKcal : 0, 0, 1);
  const o2 = kis(hedefProtein ? protein / hedefProtein : 0, 0, 1);
  const asti = hedefKcal && kcal > hedefKcal;
  const renk = asti ? "var(--kotu)" : "var(--vurgu)";
  return `<div class="halka">
    <svg viewBox="0 0 150 150" aria-hidden="true">
      <circle class="iz" cx="75" cy="75" r="${R1}"/>
      <circle class="yay" cx="75" cy="75" r="${R1}" style="stroke:${renk}"
        stroke-dasharray="${C1.toFixed(1)}" stroke-dashoffset="${(C1 * (1 - o1)).toFixed(1)}"/>
      <circle class="iz ince" cx="75" cy="75" r="${R2}"/>
      <circle class="yay ince" cx="75" cy="75" r="${R2}" style="stroke:var(--iyi)"
        stroke-dasharray="${C2.toFixed(1)}" stroke-dashoffset="${(C2 * (1 - o2)).toFixed(1)}"/>
    </svg>
    <div class="halka-ic">
      <div class="halka-n" style="color:${renk}">${kcal}</div>
      <div class="halka-l">/ ${hedefKcal || "—"} kcal</div>
    </div></div>
   <div class="halka-alt">
     <span><i style="background:${renk}"></i>Kalori</span>
     <span><i style="background:var(--iyi)"></i>Protein ${Math.round(protein)} / ${hedefProtein || "—"} g</span>
   </div>`;
}

/* Basit çizgi grafiği — dış kütüphane yok */
function grafik(noktalar, birim) {
  if (noktalar.length < 2) return `<p class="bos">Grafik için en az iki ölçüm gerekiyor.</p>`;
  const W = 440, H = 150, sol = 38, sag = 10, ust = 14, alt = 22;
  const dgr = noktalar.map(n => n.deger);
  let min = Math.min(...dgr), max = Math.max(...dgr);
  if (max - min < 1) { min -= 1; max += 1; }
  const pay = (max - min) * 0.12; min -= pay; max += pay;
  const x = i => sol + i * (W - sol - sag) / (noktalar.length - 1);
  const y = v => ust + (max - v) / (max - min) * (H - ust - alt);
  const d = noktalar.map((n, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(n.deger).toFixed(1)}`).join(" ");
  const dolgu = `${d} L${x(noktalar.length - 1).toFixed(1)} ${H - alt} L${sol} ${H - alt} Z`;
  const kilavuz = [max - pay, (max + min) / 2, min + pay].map(v =>
    `<line class="kilavuz" x1="${sol}" y1="${y(v).toFixed(1)}" x2="${W - sag}" y2="${y(v).toFixed(1)}"/>
     <text class="etiket" x="0" y="${(y(v) + 3).toFixed(1)}">${v.toFixed(1)}</text>`).join("");
  const noktaG = noktalar.map((n, i) => `<circle class="nokta" cx="${x(i).toFixed(1)}" cy="${y(n.deger).toFixed(1)}" r="3.2"/>`).join("");
  const ilkSon = `<text class="etiket" x="${sol}" y="${H - 4}">${esc(trKisa(noktalar[0].tarih))}</text>
    <text class="etiket" x="${W - sag}" y="${H - 4}" text-anchor="end">${esc(trKisa(noktalar[noktalar.length - 1].tarih))}</text>`;
  return `<svg class="grafik" viewBox="0 0 ${W} ${H}" role="img"
    aria-label="${esc(noktalar[0].deger + " " + birim + " değerinden " + noktalar[noktalar.length - 1].deger + " " + birim + " değerine değişim")}">
    <defs><linearGradient id="gr-dolgu" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D2FF3E" stop-opacity=".22"/>
      <stop offset="100%" stop-color="#D2FF3E" stop-opacity="0"/></linearGradient></defs>
    ${kilavuz}<path class="alan-dolgu" d="${dolgu}"/><path class="cizgi" d="${d}"/>${noktaG}${ilkSon}</svg>`;
}

/* =================== KURULUM =================== */
const ADIM_SAYI = 8;

function vKurulum() {
  const a = S.kurulumAdim;
  const basliklar = ["Seni tanıyalım","Ölçüler","Hedefin","Sporun","Haftalık program","Öğün düzeni","Takviyeler","Bırakmak istediğin"];
  const altlar = ["Hesaplar bunlara dayanıyor","İsteğe bağlı — atlayabilirsin","Kalori hedefin buradan çıkacak",
                  "Birden fazla seçebilirsin","Hangi gün ne yapıyorsun","Günde kaç öğün yiyorsun",
                  "Kullandıklarını işaretle","Varsa — yoksa atla"];
  let h = `<header class="top"><p class="eyebrow">Kurulum · ${a + 1}/${ADIM_SAYI}</p>
   <h1>${basliklar[a]}</h1><p class="sub">${altlar[a]}</p>
   <div class="adimlar">${Array.from({ length: ADIM_SAYI }, (_, i) => `<div class="adim ${i <= a ? "on" : ""}"></div>`).join("")}</div></header>`;

  h += [kAdim0, kAdim1, kAdim2, kAdim3, kAdim4, kAdim5, kAdim6, kAdim7][a]();

  const sonAdim = a === ADIM_SAYI - 1;
  h += `<div class="row" style="margin-top:14px">
    ${a > 0 ? `<button class="btn ghost" data-act="k-geri">Geri</button>` : ""}
    <button class="btn gold" data-act="k-ileri">${sonAdim ? "Bitir ve başla" : "Devam"}</button></div>`;
  if ([1, 6, 7].indexOf(a) !== -1)
    h += `<button class="btn ghost blok" data-act="k-atla" style="margin-top:9px">Bu adımı atla</button>`;
  return h;
}

function kAdim0() {
  const p = S.profil;
  return kart("", "",
    `<label class="lbl sol">Cinsiyet</label>
     <div class="sec-lst" style="margin-bottom:13px">
       ${secOp("k-cins:e", p.cinsiyet === "e", "Erkek", "")}
       ${secOp("k-cins:k", p.cinsiyet === "k", "Kadın", "")}</div>
     <div class="row" style="margin-bottom:11px">${alan("dogumYili", "Doğum yılı")}${alan("boy", "Boy cm")}${alan("kilo", "Kilo kg")}</div>
     <p class="note">Vücut yağ oranı formülü cinsiyete göre değişiyor ve kadınlarda kalça ölçüsünü de kullanıyor. Bu yüzden soruyoruz — başka hiçbir yere gitmiyor.</p>`);
}

function kAdim1() {
  const kadin = S.profil.cinsiyet === "k";
  return kart("", "",
    `<div class="row" style="margin-bottom:11px">${alan("bel", "Bel cm")}${alan("boyun", "Boyun cm")}${kadin ? alan("kalca", "Kalça cm") : ""}</div>
     <p class="note">Bel: göbek deliği hizasından, karnı içe çekmeden, normal nefes verdikten sonra. Boyun: adem elmasının hemen altından.${kadin ? " Kalça: en geniş yerinden, ayaklar bitişik." : ""}<br><br>
     Bunları girmezsen uygulama yine çalışır — sadece vücut yağ oranı hesaplanmaz, kilo takibi devam eder.</p>`);
}

function kAdim2() {
  const p = S.profil, h = hedefHesapla();
  return kart("", "",
    `<label class="lbl sol">Hedef</label>
     <div class="sec-lst" style="margin-bottom:15px">
       ${HEDEFLER.map(x => secOp("k-hedef:" + x.id, p.hedef === x.id, x.ad, x.d)).join("")}</div>
     <label class="lbl sol">Aktivite düzeyi</label>
     <div class="sec-lst" style="margin-bottom:13px">
       ${AKTIVITE.map(x => secOp("k-akt:" + x.id, p.aktivite === x.id, x.ad, x.d)).join("")}</div>
     <label class="lbl sol">Antrenmanın genelde saat kaçta</label>
     <input type="time" data-fld="antrSaat" value="${esc(p.antrSaat || "18:00")}" style="margin-bottom:11px">
     ${h ? `<div class="stat"><div class="sc"><div class="sn" style="color:var(--vurgu)">${h.kcal}</div><div class="sl">kcal / gün</div></div>
       <div class="sc"><div class="sn">${h.protein}</div><div class="sl">g protein</div></div>
       <div class="sc"><div class="sn">${(h.suMl / 1000).toFixed(1)}</div><div class="sl">litre su</div></div></div>
       <p class="note" style="margin-top:10px">Günlük harcaman yaklaşık ${h.tdee} kcal.
       Su hedefi ${h.su} × ${bardakMl()} ml. Bu hedefleri ve bardak boyutunu sonradan Ayarlar'dan değiştirebilirsin.</p>`
      : `<p class="note">Hedef ve aktiviteyi seçince kalori hedefin hesaplanacak.</p>`}`);
}

function kAdim3() {
  const gruplar = {};
  SPORLAR.forEach(s => { (gruplar[s.tip] = gruplar[s.tip] || []).push(s); });
  let h = "";
  for (const t in gruplar)
    h += `<p class="sec">${SPOR_TIP_AD[t]}</p>` + kart("", "",
      `<div class="sec-lst">${gruplar[t].map(s => secOp("k-spor:" + s.id, S.sporlar.indexOf(s.id) !== -1, s.ad, "")).join("")}</div>`);
  return h;
}

function kAdim4() {
  if (!S.sporlar.length) return kart("", "", `<p class="bos">Önce bir önceki adımda spor seç.</p>`);
  return kart("", "",
    `<button class="btn ghost blok" data-act="k-prog-oto" style="margin-bottom:14px">Otomatik doldur</button>` +
    programDuzenle() +
    `<p class="note" style="margin-top:12px">Bir güne birden fazla seans ekleyebilirsin ve sıra korunur —
     ısınma koşusu, sonra kickboks, sonra ağırlık gibi. Dinlenme günleri gün yüzdesi hesabından düşer.</p>`);
}

function kAdim5() {
  let h = kart("", "",
    `<div class="sec-lst">${OGUN_SABLON.map(o => secOp("k-ogun:" + o.id, S.f.ogunSablon === o.id, o.ad, o.d)).join("")}</div>`);
  if (S.ogunler.length)
    h += `<p class="sec">Düzenle</p>` + kart("", "", ogunDuzenle() +
      `<p class="note" style="margin-top:8px">Adları, saatleri ve payları değiştirebilir, öğün ekleyip çıkarabilirsin. Sonradan Ayarlar'dan da düzenlenir.</p>`);
  return h;
}

function kAdim6() {
  const secili = id => S.takviyeler.some(t => t.id === id);
  return kart("", "",
    `<div class="sec-lst">${TAKVIYELER.map(t => secOp("k-tak:" + t.id, secili(t.id), t.ad,
      t.doz + " · " + t.saat + ((t.etiket || {}).kafein ? " · " + t.etiket.kafein + " mg kafein" : ""))).join("")}</div>
     <p class="note" style="margin-top:12px">Dozları ve hangi günler alacağını Daha → Takviyeler'den ayarlarsın. Takviye ilaç değildir ve ilacın yerine geçmez.</p>`);
}

function kAdim7() {
  const a = S.aliskanlik;
  return kart("", "",
    `<div class="sec-lst" style="margin-bottom:13px">
      ${ALISKANLIK_SABLON.map(x => secOp("k-alis:" + x.id, S.f.alisId === x.id, x.ad, x.id === "ozel" ? "" : "Kademeli azaltma takvimi kurulur")).join("")}</div>
     ${S.f.alisId ? `<div class="row" style="margin-bottom:11px">
        ${S.f.alisId === "ozel" ? alan("alisAd", "Ne", "text") : ""}
        ${alan("alisHafta1", "Şu an haftada kaç")}</div>
      <p class="note">İlk hafta bu sayı üst sınırın olur, sonra her hafta düşer. Amaç sıfırlamak değil — bırakılabilir bir eğimle inmek.</p>`
      : `<p class="note">Azaltmak istediğin bir şey varsa seç. Uygulama haftalık bir üst sınır koyar ve her hafta düşürür. İstemiyorsan bu adımı atla.</p>`}`);
}

/* =================== SEKME: BUGÜN =================== */
function vBugun() {
  const k = bugun(), g = gun(k), p = S.profil;
  const seanslar = gunSeanslari(k), adlar = gunSporAdlari(k);
  const tk = gununTakviyeleri(k), top = gunToplam(k), hb = haftaButce(k);
  const dinlenme = seanslar.length === 0;

  const toplamIs = tk.length + p.suHedef + seanslar.length + (S.ogunler.length || 1);
  const ogunDolu = S.ogunler.filter(o => g.yenen.some(y => y.ogun === o.id)).length;
  const biten = tk.filter(t => g.takviye[t.id]).length + Math.min(g.su, p.suHedef)
    + yapilanSeans(k) + (S.ogunler.length ? ogunDolu : (g.yenen.length ? 1 : 0));
  const yz = Math.round(biten / toplamIs * 100);

  let h = `<header class="top"><p class="eyebrow">${GUN_AD[haftaninGunu(k)]} · ${trT(k)}</p>
   <h1>${dinlenme ? "Dinlenme günü" : esc(adlar.join(" + "))}</h1>
   <p class="sub">${dinlenme ? "Toparlanma antrenmanın parçası"
     : `${seanslar.length} seans · ${gunToplamSure(k)} dk · ${esc(p.antrSaat || "")}`}</p>
   ${ilerleme(biten / toplamIs)}<p class="sub">Gün %${yz} tamam</p></header>`;

  uyarilar(k).forEach(u => { h += uyariKutu(u); });

  /* Kalori ve protein */
  h += kart("Bugün yenen", g.yenen.length ? g.yenen.length + " kayıt" : "",
    halka(top.kcal, p.kcal, top.p, p.protein) +
    (hb ? `<hr><p class="note">${butceMesaj(hb)}</p>` : "") +
    `<button class="btn gold blok" data-act="tab:yemek" style="margin-top:14px">Yemek ekle</button>`);

  /* Su */
  h += kart("Su", `${g.su * bardakMl()} / ${suHedefMl()} ml`,
    tally(g.su, p.suHedef) + `<div class="row">
     <button class="btn" data-act="su+" style="color:var(--su);border-color:rgba(79,214,232,.4)">+ 1 bardak (${bardakMl()} ml)</button>
     <button class="btn ghost sm" data-act="su-" aria-label="azalt">−</button></div>`);

  /* Takviye */
  if (tk.length)
    h += kart("Takviye", tk.length + " kalem",
      tk.map(t => satir({ ad: t.ad, saat: t.saat, desc: t.doz, macro: t.not, on: !!g.takviye[t.id], act: "tak:" + t.id })).join(""));

  /* Antrenman — gün birden çok seans taşıyabilir, her biri ayrı işaretlenir */
  if (!dinlenme)
    h += kart("Antrenman", `${yapilanSeans(k)} / ${seanslar.length} seans`,
      seanslar.map((s, i) => {
        const sp = sporBul(s.spor);
        return satir({
          ad: `${i + 1}. ${sp ? sp.ad : s.spor}`,
          saat: s.sure ? s.sure + " dk" : "",
          desc: s.sablon || "",
          on: !!seansOku(k, s.sid).yapildi,
          act: "seans-tik:" + s.sid
        });
      }).join("") +
      `<button class="btn ghost blok" data-act="tab:antrenman" style="margin-top:12px">Detay gir</button>`);

  /* Alışkanlık */
  const ad = aliskanlikDurum(k);
  if (ad) {
    const hafta = aliskanlikHafta(k), asti = hafta > ad.limit;
    h += kart(esc(S.aliskanlik.ad), ad.ad,
      `<div class="stat" style="margin-bottom:12px">
        <div class="sc"><div class="sn">${g.aliskanlik}</div><div class="sl">Bugün</div></div>
        <div class="sc"><div class="sn" style="color:${asti ? "var(--kotu)" : "var(--iyi)"}">${hafta}</div><div class="sl">7 günde</div></div>
        <div class="sc"><div class="sn">${ad.limit}</div><div class="sl">Sınır</div></div></div>
       <p class="note" style="margin-bottom:12px">Bu hafta en fazla ${ad.limit} ${esc(S.aliskanlik.birim)}${asti ? " — sınırı aştın, gelecek hafta sıfırdan başlıyorsun." : "."}</p>
       <div class="row"><button class="btn" data-act="alis+">+ 1 ${esc(S.aliskanlik.birim)}</button>
       <button class="btn ghost sm" data-act="alis-" aria-label="azalt">−</button></div>`);
  }
  return h;
}

/* =================== SEKME: YEMEK =================== */
function vYemek() {
  const k = bugun(), g = gun(k), p = S.profil, top = gunToplam(k), hb = haftaButce(k);

  let h = `<header class="top"><p class="eyebrow">${trT(k)}</p><h1>Yemek</h1>
   <p class="sub">${top.kcal} / ${p.kcal || "—"} kcal · ${Math.round(top.p)} / ${p.protein || "—"} g protein</p>
   ${ilerleme(p.kcal ? top.kcal / p.kcal : 0, top.kcal > p.kcal ? "var(--kotu)" : "var(--vurgu)")}</header>`;

  if (hb)
    h += kart("Haftalık bütçe", `${hb.kalanGun} gün kaldı`,
      `<div class="stat"><div class="sc"><div class="sn">${(hb.oncekiler / 1000).toFixed(1)}k</div><div class="sl">Yenen</div></div>
        <div class="sc"><div class="sn" style="color:var(--vurgu)">${hb.gunlukOneri}</div><div class="sl">Günlük öneri</div></div>
        <div class="sc"><div class="sn">${(hb.haftaHedef / 1000).toFixed(1)}k</div><div class="sl">Hafta bütçesi</div></div></div>
       <p class="note" style="margin-top:11px">${butceMesaj(hb)}</p>
       <p class="note" style="margin-top:8px">Bir gün taştıysan uygulama seni sıfırlamaz — kalan bütçeyi kalan günlere böler. Haftalık toplam, günlük mükemmellikten daha çok işe yarar.</p>`);

  /* Öğün slotları */
  ogunSlotlari().forEach(o => {
    const kalemler = g.yenen.filter(y => y.ogun === o.id);
    const sK = kalemler.reduce((a, y) => a + y.kcal, 0), sP = kalemler.reduce((a, y) => a + y.p, 0);
    const hedefK = p.kcal ? Math.round(p.kcal * ogunOran(o)) : null;
    /* Slot hedefini belirgin biçimde aşınca sayıyı boya — yoksa fark edilmiyor */
    const slotAsti = hedefK && sK > hedefK * 1.15;
    h += kart(esc(o.ad) + (o.saat ? " · " + esc(o.saat) : ""),
      hedefK ? `<span${slotAsti ? ' style="color:var(--uyari)"' : ""}>${sK}</span> / ${hedefK} kcal` : `${sK} kcal`,
      (kalemler.length
        ? kalemler.map(y => `<div class="item" data-act="yem-duzenle:${esc(y.uid)}">
            <div class="ib"><div class="it"><span class="name">${esc(y.ad)}</span>${y.gram ? `<span class="time">${y.gram} g</span>` : ""}</div>
            <div class="macro">${y.kcal} kcal · ${(+y.p).toFixed(1)} g protein</div></div>
            <div class="uc"><button class="sil" data-act="yem-sil:${esc(y.uid)}" aria-label="sil">×</button></div></div>`).join("")
        : `<p class="bos">Henüz bir şey eklemedin.</p>`) +
      (kalemler.length ? `<div class="macro" style="margin:10px 0 10px">Toplam ${sK} kcal · ${sP.toFixed(1)} g protein</div>` : "") +
      `<button class="btn ghost blok" data-act="yem-ac:${esc(o.id)}">Yemek ekle</button>`);
  });

  /* Öğün düzeni değişince eski kayıtlar hiçbir slota denk gelmeyebilir.
     Görünmez kalmasınlar — toplamlara zaten giriyorlar. */
  const bilinen = new Set(ogunSlotlari().map(o => o.id));
  const oksuz = g.yenen.filter(y => !bilinen.has(y.ogun));
  if (oksuz.length)
    h += kart("Öğün dışı", `${oksuz.reduce((a, y) => a + y.kcal, 0)} kcal`,
      oksuz.map(y => `<div class="item" data-act="yem-duzenle:${esc(y.uid)}">
        <div class="ib"><div class="it"><span class="name">${esc(y.ad)}</span>${y.gram ? `<span class="time">${y.gram} g</span>` : ""}</div>
        <div class="macro">${y.kcal} kcal · ${(+y.p).toFixed(1)} g protein</div></div>
        <div class="uc"><button class="sil" data-act="yem-sil:${esc(y.uid)}" aria-label="sil">×</button></div></div>`).join("") +
      `<p class="note" style="margin-top:10px">Bu kayıtlar artık var olmayan bir öğüne aitti. Silebilir ya da olduğu gibi bırakabilirsin — günlük toplama dahiller.</p>`);

  return h;
}

const ogunSlotlari = () => S.ogunler.length
  ? S.ogunler : [{ id: "genel", ad: "Bugün yediklerim", saat: "", p: 1 }];

/* p bir ağırlıktır, mutlak oran değil: kullanıcı yüzdeleri elle değiştirdiğinde
   toplam 100 tutmak zorunda kalmasın diye okurken normalleştiriyoruz. Şablonlar
   zaten 1'e toplandığı için eski kayıtlar aynen çalışır. */
function ogunOran(o) {
  const t = ogunSlotlari().reduce((a, x) => a + (+x.p > 0 ? +x.p : 0), 0);
  if (!t) return 1 / ogunSlotlari().length;
  return (+o.p > 0 ? +o.p : 0) / t;
}
const yeniOid = () => "o" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);

/* Öğün düzeni düzenleyici — kurulum sihirbazı ve Ayarlar aynı bileşeni kullanır.
   Öğün sayısı 1'den başlar; tek öğün yiyen de sık yiyen de kendi düzenini kurar. */
function ogunDuzenle() {
  const hedefK = S.profil.kcal;
  /* Kutuda yazdığın sayı aynen saklanır; "Hedef" sütunu ise normalleştirilmiş
     gerçek payı gösterir. Böylece ne yazdığınla ne olduğu ayrı ayrı okunur. */
  const yuzde = o => Math.round((+o.p > 0 ? +o.p : 0) * 100);
  const toplamYuzde = S.ogunler.reduce((a, o) => a + yuzde(o), 0);
  return `${S.ogunler.map((o, i) => `<div class="seans">
      <div class="seans-bas">
        <span class="seans-no">${i + 1}</span>
        <input type="text" data-ogun="${i}:ad" value="${esc(o.ad)}" placeholder="Öğün adı"
          style="text-align:left;flex:1;min-width:0;padding:8px 10px;font-size:14px">
        <span class="seans-ara">
          ${i > 0 ? `<button class="seans-ok" data-act="ogun-tasi:${i}:-1" aria-label="yukarı taşı">↑</button>` : ""}
          ${i < S.ogunler.length - 1 ? `<button class="seans-ok" data-act="ogun-tasi:${i}:1" aria-label="aşağı taşı">↓</button>` : ""}
          ${S.ogunler.length > 1 ? `<button class="sil" data-act="ogun-sil:${i}" aria-label="kaldır">×</button>` : ""}
        </span></div>
      <div class="row">
        <div class="alan"><label class="lbl">Saat</label>
          <input type="time" data-ogun="${i}:saat" value="${esc(o.saat || "")}"></div>
        <div class="alan"><label class="lbl">Pay %</label>
          <input type="number" inputmode="numeric" data-ogun="${i}:p" value="${yuzde(o)}"></div>
        <div class="alan"><label class="lbl">Hedef</label>
          <input type="text" id="og-hedef-${i}" value="${hedefK ? Math.round(hedefK * ogunOran(o)) + " kcal" : "—"}" readonly
            style="text-align:center;color:var(--vurgu);border-style:dashed"></div>
      </div></div>`).join("")}
    <div class="row" style="margin-top:10px">
      <button class="btn ghost" data-act="ogun-ekle">+ Öğün ekle</button>
      <button class="btn ghost" data-act="ogun-esit">Eşit dağıt</button></div>
    <p class="note" style="margin-top:10px">Paylar günlük kalorinin dağılımı. Toplam
    <strong id="og-toplam">${toplamYuzde}%</strong> — 100 tutmasa da sorun değil, oranlar
    orantılı dağıtılır ve gerçek hedef sağdaki sütunda görünür.</p>`;
}

/* ---------------------------------------------------------------------
   Yemek ekleme paneli.

   Sayfaya kart olarak eklenmiyor, sayfanın ÜSTÜNE oturuyor (position:fixed).
   Önceden gramaj kartı uzun sayfanın en altına basılıyordu; kullanıcı bir
   besine dokununca kart görüş alanının dışında kalıyor ve hiçbir şey olmamış
   gibi görünüyordu. Panel sabit olduğu için o hata sınıfı tamamen kalkıyor.
   --------------------------------------------------------------------- */
function yemekPaneli() {
  if (!S.araHedef) return "";
  const hedefAd = (ogunSlotlari().find(o => o.id === S.araHedef) || {}).ad || "";
  const perde = `<div class="perde" data-act="ara-kapat"></div>`;
  const kapat = `<button class="sayfa-kapa" data-act="ara-kapat" aria-label="kapat">×</button>`;

  /* 3. adım — elle girilen kalemi düzenle */
  if (S.f.elleDuzenle)
    return perde + `<div class="sayfa"><div class="tut"></div>
      <div class="sayfa-bas"><p class="card-t">Düzenle</p>${kapat}</div>
      <div class="sayfa-govde">
        <div class="row" style="margin-bottom:10px">${alan("elAd", "Ne yedin", "text")}</div>
        <div class="row">${alan("elKcal", "kcal")}${alan("elP", "Protein g")}</div>
      </div>
      <div class="sayfa-alt"><div class="row">
        <button class="btn ghost" data-act="besin-iptal">Geri</button>
        <button class="btn gold" data-act="el-guncelle">Kaydet</button></div></div></div>`;

  /* 2. adım — miktar */
  if (S.f.besin) {
    const b = S.f.besin, c = besinHesap();
    const carpanlar = [0.5, 1, 1.5, 2, 3];
    const secili = sayi(S.f.besinGram);
    const chipler = carpanlar.map(x => {
      const gr = Math.round(b.pGram * x);
      const on = Math.abs(secili - gr) < 0.5;
      const kesir = { 0.5: "½", 1.5: "1½" }[x] || String(x);
      const etiket = `${kesir} ${b.ozel ? "porsiyon" : b.pAd}`;
      return `<button class="chip ${on ? "gold" : ""}" data-act="porsiyon:${gr}">${esc(etiket)}${b.ozel ? "" : ` · ${gr} g`}</button>`;
    }).join("");
    return perde + `<div class="sayfa"><div class="tut"></div>
      <div class="sayfa-bas"><p class="card-t">${S.f.duzenleUid ? "Düzenle" : "Miktar"}</p>${kapat}</div>
      <div class="sayfa-govde">
        <p class="panel-ad">${esc(b.ad)}</p>
        <p class="macro" style="margin:0 0 14px">${esc(b.grup)}${b.ozel ? "" : ` · 100 g'da ${b.kcal} kcal, ${b.p} g protein`}</p>
        <div class="row wrapped" style="gap:7px;margin-bottom:14px">${chipler}</div>
        ${b.ozel ? "" : `<div class="row" style="margin-bottom:14px">${alan("besinGram", "Gram")}</div>`}
        <div class="stat">
          <div class="sc"><div class="sn" id="bg-kcal" style="color:var(--vurgu)">${c.kcal}</div><div class="sl">kcal</div></div>
          <div class="sc"><div class="sn" id="bg-p">${c.p}</div><div class="sl">Protein g</div></div>
          <div class="sc"><div class="sn" id="bg-ky">${c.ky}</div><div class="sl">Karb / Yağ</div></div></div>
      </div>
      <div class="sayfa-alt"><div class="row">
        <button class="btn ghost" data-act="besin-iptal">Geri</button>
        <button class="btn gold" data-act="besin-ekle">${S.f.duzenleUid ? "Kaydet" : "Ekle"}</button></div></div></div>`;
  }

  /* 1. adım — arama */
  return perde + `<div class="sayfa"><div class="tut"></div>
    <div class="sayfa-bas"><p class="card-t">${esc(hedefAd)} · yemek ekle</p>${kapat}</div>
    <div class="sayfa-govde">
      <input type="text" data-ara="1" value="${esc(S.ara)}" placeholder="Ara — tavuk, pilav, muz…"
        style="text-align:left" autocomplete="off" autocapitalize="off" spellcheck="false">
      <div id="ara-liste">${araListeHtml()}</div>
      <p class="sec">Listede yoksa elle ekle</p>
      <div class="row" style="margin-bottom:9px">${alan("elAd", "Ne yedin", "text")}</div>
      <div class="row" style="margin-bottom:11px">${alan("elKcal", "kcal")}${alan("elP", "Protein g")}</div>
      <button class="btn blok" data-act="el-ekle">Elle ekle ve kaydet</button>
      <p class="note" style="margin-top:9px">Elle eklediğin yemek listene kaydedilir, bir dahaki sefere aramada çıkar.</p>
    </div></div>`;
}

function araListeHtml() {
  const sonuc = besinAra(S.ara);
  const son = S.ara.length < 2 ? sonBesinler(8) : [];
  return `${sonuc.length ? `<div class="ara-sonuc">${sonuc.map((b, i) =>
      `<button class="ara-op" data-act="bes-sec:${i}"><span class="ib"><span class="name">${esc(b.ad)}</span>
        <span class="macro">${esc(b.grup)} · ${esc(b.pAd)} ${b.pGram} g</span></span>
       <span class="ara-sag">${Math.round(b.kcal * b.pGram / 100)} kcal</span></button>`).join("")}</div>` : ""}
    ${(S.ara.length >= 2 && !sonuc.length) ? `<p class="bos">Bulunamadı. Aşağıdan elle ekleyebilirsin.</p>` : ""}
    ${son.length ? `<p class="sec" style="margin:16px 0 4px">Son eklediklerin</p>
      <div class="ara-sonuc">${son.map((b, i) => `<button class="ara-op" data-act="bes-son:${i}">
        <span class="ib"><span class="name">${esc(b.ad)}</span><span class="macro">${b.gram} g</span></span>
        <span class="ara-sag">${b.kcal} kcal</span></button>`).join("")}</div>` : ""}`;
}

function besinHesap() {
  const b = S.f.besin;
  if (!b) return { kcal: 0, p: "0.0", ky: "0 / 0" };
  const gr = sayi(S.f.besinGram);
  const g = gr > 0 ? gr : 0;
  return { kcal: Math.round(b.kcal * g / 100), p: (b.p * g / 100).toFixed(1),
           ky: `${(b.k * g / 100).toFixed(0)} / ${(b.y * g / 100).toFixed(0)}` };
}

/* Ölçüm ekranındaki canlı yağ oranı satırı */
function onizlemeYag() {
  const o = { bel: sayi(S.f.bel), boyun: sayi(S.f.boyun), kalca: sayi(S.f.kalca) };
  const v = navy(o);
  return v == null ? "" : `Hesaplanan yağ oranı: <strong style="color:var(--vurgu)">%${v.toFixed(1)}</strong>`;
}

/* =================== SEKME: ANTRENMAN =================== */
function vAntrenman() {
  const k = bugun(), seanslar = gunSeanslari(k), adlar = gunSporAdlari(k);
  let h = `<header class="top"><p class="eyebrow">${GUN_AD[haftaninGunu(k)]}</p>
   <h1>${seanslar.length ? esc(adlar.join(" + ")) : "Dinlenme"}</h1>
   <p class="sub">${seanslar.length
     ? `${seanslar.length} seans · ${gunToplamSure(k)} dk planlı`
     : "Toparlanma antrenmanın parçası"}</p></header>`;

  if (!seanslar.length)
    h += kart("", "", `<p class="bos">Bugün dinlenme günü. Programı aşağıdan değiştirebilirsin.</p>`);

  seanslar.forEach((s, i) => {
    const spor = sporBul(s.spor);
    if (!spor) return;
    const log = seansOku(k, s.sid);
    const alanlar = spor.log.filter(x => x !== "set");
    let ic = satir({ ad: "Yaptım", saat: s.sure ? s.sure + " dk planlı" : "", desc: s.sablon || "",
                     on: !!log.yapildi, act: "seans-tik:" + s.sid });
    if (alanlar.length)
      ic += `<div class="row wrapped" style="margin-top:12px">${alanlar.map(x =>
        `<div class="alan"><label class="lbl" for="in-${s.sid}-${x}">${LOG_ALAN[x].ad}${LOG_ALAN[x].birim ? " " + LOG_ALAN[x].birim : ""}</label>
         <input id="in-${s.sid}-${x}" type="number" inputmode="decimal" data-log="${s.sid}:${x}"
          value="${esc(log[x] == null ? "" : log[x])}" placeholder="—"></div>`).join("")}</div>`;
    h += kart(`${i + 1}. ${esc(spor.ad)}`, SPOR_TIP_AD[spor.tip] || "", ic);

    if (spor.log.indexOf("set") !== -1) {
      /* Şablonu ilk açılışta satırlara çevir — sonra kullanıcı üzerine yazar */
      const w = seansYaz(k, s.sid);
      if (!Array.isArray(w.set) || !w.set.length) {
        const sb = GUC_SABLON[s.sablon];
        w.set = (sb || ["", "", ""]).map(ad => ({ ad, set: "", tekrar: "", kg: "" }));
        kaydetGecikmeli();
      }
      const onceki = gecenAntrenman(s.spor);
      h += kart("Egzersizler", s.sablon ? esc(s.sablon) : "",
        w.set.map((e, ei) => `<div class="gr">
          <div class="row" style="margin-bottom:7px">
            <div class="alan"><input type="text" data-set="${s.sid}:${ei}:ad" value="${esc(e.ad)}" placeholder="Egzersiz" style="text-align:left"></div>
            <button class="sil" data-act="set-sil:${s.sid}:${ei}" aria-label="sil">×</button></div>
          <div class="row">
            <div class="alan"><label class="lbl">Set</label><input type="number" inputmode="numeric" data-set="${s.sid}:${ei}:set" value="${esc(e.set)}" placeholder="—"></div>
            <div class="alan"><label class="lbl">Tekrar</label><input type="number" inputmode="numeric" data-set="${s.sid}:${ei}:tekrar" value="${esc(e.tekrar)}" placeholder="—"></div>
            <div class="alan"><label class="lbl">Kg</label><input type="number" inputmode="decimal" data-set="${s.sid}:${ei}:kg" value="${esc(e.kg)}" placeholder="—"></div></div>
          ${onceki[e.ad] ? `<div class="macro">Geçen sefer: ${esc(onceki[e.ad])}</div>` : ""}</div>`).join("") +
        `<button class="btn ghost blok" data-act="set-ekle:${s.sid}" style="margin-top:12px">Egzersiz ekle</button>
         <p class="note" style="margin-top:10px">Her hafta ya bir tekrar ya biraz kilo ekle. Aynı ağırlıkla aynı tekrar, gelişme değil bakımdır.</p>`);
    }
  });

  /* Haftalık program */
  h += `<p class="sec">Haftalık program</p>`;
  h += kart("", "", programDuzenle() +
    `<button class="btn ghost blok" data-act="spor-duzenle" style="margin-top:14px">Sporları düzenle</button>`);

  /* Son antrenmanlar */
  const gecmis = Object.keys(S.gunler).filter(antrenmanYapildi).sort().reverse().slice(0, 10);
  if (gecmis.length) {
    const sidSpor = {};
    S.program.forEach(p => (p.seanslar || []).forEach(x => { sidSpor[x.sid] = x.spor; }));
    h += kart("Son antrenmanlar", gecmis.length + " gün",
      `<div class="kaydir"><table><thead><tr><th>Tarih</th><th>Seans</th><th>Süre</th></tr></thead><tbody>
       ${gecmis.map(x => {
         const sn = (S.gunler[x].antrenman || {}).seans || {};
         const yapilan = Object.keys(sn).filter(id => sn[id].yapildi);
         const ad = yapilan.map(id => (sporBul(sidSpor[id]) || {}).ad).filter(Boolean).join(" + ") || "Antrenman";
         const sure = yapilan.reduce((a, id) => a + (+sn[id].sure || 0), 0);
         return `<tr><td>${trKisa(x)}</td><td>${esc(ad)}</td><td>${sure ? sure + " dk" : "—"}</td></tr>`;
       }).join("")}
       </tbody></table></div>`);
  }
  return h;
}

/* Haftalık program düzenleyici. Kurulum sihirbazı ve Antrenman sekmesi aynı
   bileşeni kullanır. Bir güne sırayla birden çok seans eklenebilir. */
function programDuzenle() {
  const secili = S.sporlar.map(sporBul).filter(Boolean);
  if (!secili.length) return `<p class="bos">Önce spor seç.</p>`;
  return S.program.map((p, gi) => {
    const list = p.seanslar || [];
    const sure = list.reduce((a, s) => a + (+s.sure || 0), 0);
    return `<div class="gr">
      <div class="it" style="margin-bottom:9px"><span class="name">${GUN_AD[gi]}</span>
        ${list.length ? `<span class="chip gold">${list.length} seans · ${sure} dk</span>`
                      : `<span class="chip">Dinlenme</span>`}</div>
      ${list.map((s, si) => {
        const spor = sporBul(s.spor);
        return `<div class="seans">
          <div class="seans-bas">
            <span class="seans-no">${si + 1}</span>
            <span class="name">${esc(spor ? spor.ad : s.spor)}</span>
            <span class="seans-ara">
              ${si > 0 ? `<button class="seans-ok" data-act="seans-tasi:${gi}:${si}:-1" aria-label="yukarı taşı">↑</button>` : ""}
              ${si < list.length - 1 ? `<button class="seans-ok" data-act="seans-tasi:${gi}:${si}:1" aria-label="aşağı taşı">↓</button>` : ""}
              <button class="sil" data-act="seans-sil:${gi}:${si}" aria-label="kaldır">×</button></span></div>
          <div class="row">
            <div class="alan"><label class="lbl">Süre dk</label>
              <input type="number" inputmode="numeric" data-seans="${gi}:${si}:sure" value="${esc(s.sure || "")}" placeholder="—"></div>
            ${spor && spor.tip === "guc" ? `<div class="alan"><label class="lbl">Şablon</label>
              <select data-seans="${gi}:${si}:sablon"><option value="">—</option>
                ${Object.keys(GUC_SABLON).map(n => `<option value="${esc(n)}" ${s.sablon === n ? "selected" : ""}>${esc(n)}</option>`).join("")}
              </select></div>` : ""}</div></div>`;
      }).join("")}
      <select data-seans-ekle="${gi}" style="margin-top:${list.length ? 9 : 0}px">
        <option value="">+ Seans ekle</option>
        ${secili.map(x => `<option value="${x.id}">${esc(x.ad)}</option>`).join("")}
      </select></div>`;
  }).join("");
}

/* Bir sporun en son yapılan seansından egzersiz → "3×10 @ 40 kg" özeti */
function gecenAntrenman(sporId) {
  const sidSpor = {};
  S.program.forEach(p => (p.seanslar || []).forEach(x => { sidSpor[x.sid] = x.spor; }));
  const bug = bugun();
  const gunler = Object.keys(S.gunler).filter(k => k < bug).sort().reverse();
  for (const k of gunler) {
    const sn = (S.gunler[k].antrenman || {}).seans || {};
    for (const id in sn) {
      if (sidSpor[id] !== sporId || !sn[id].yapildi) continue;
      const set = sn[id].set;
      if (!Array.isArray(set) || !set.length) continue;
      const m = {};
      set.forEach(e => { if (e.ad && (e.kg || e.tekrar)) m[e.ad] = `${e.set || "?"}×${e.tekrar || "?"}${e.kg ? " @ " + e.kg + " kg" : ""}`; });
      if (Object.keys(m).length) return m;
    }
  }
  return {};
}

/* =================== SEKME: İLERLEME =================== */
function vIlerleme() {
  const artan = [...S.olcumler].sort((a, b) => a.tarih < b.tarih ? -1 : 1);
  const son = artan[artan.length - 1], ilk = artan[0];
  const p = S.profil, kadin = p.cinsiyet === "k";

  let h = `<header class="top"><p class="eyebrow">${p.boy ? "Boy " + p.boy + " cm" : "İlerleme"}</p><h1>İlerleme</h1>
   <p class="sub">Ölçümü hep aynı şekilde al · sabah · aç karnına</p></header>`;

  /* Hafta özeti */
  const bas = haftaBasi(bugun());
  let antrSayi = 0, suGun = 0, kcalGun = 0, gecen = 0;
  for (let i = 0; i < 7; i++) {
    const k = gunEkle(bas, i); if (k > bugun()) break;
    gecen++;
    const g = S.gunler[k]; if (!g) continue;
    antrSayi += yapilanSeans(k);
    if ((g.su || 0) >= p.suHedef) suGun++;
    if (p.kcal && gunToplam(k).kcal > 0 && gunToplam(k).kcal <= p.kcal) kcalGun++;
  }
  h += kart("Bu hafta", gecen + " gün geçti",
    `<div class="stat"><div class="sc"><div class="sn" style="color:var(--vurgu)">${antrSayi}</div><div class="sl">Seans</div></div>
      <div class="sc"><div class="sn">${suGun}</div><div class="sl">Su tuttu</div></div>
      <div class="sc"><div class="sn">${kcalGun}</div><div class="sl">Kalori tuttu</div></div></div>`);

  if (son) {
    const fSon = navy(son), fIlk = ilk ? navy(ilk) : null;
    let fark = "";
    if (ilk && ilk.tarih !== son.tarih)
      fark = `<p class="note" style="margin-top:12px">Başlangıca göre: kilo ${(son.kilo - ilk.kilo).toFixed(1)} kg${
        (son.bel && ilk.bel) ? ` · bel ${(son.bel - ilk.bel).toFixed(1)} cm` : ""}${
        (fSon != null && fIlk != null) ? ` · yağ ${(fSon - fIlk).toFixed(1)} puan` : ""}</p>`;
    h += kart("Son ölçüm", trT(son.tarih),
      `<div class="stat"><div class="sc"><div class="sn" style="color:var(--vurgu)">${navyStr(son)}</div><div class="sl">Yağ %</div></div>
        <div class="sc"><div class="sn">${son.bel || "—"}</div><div class="sl">Bel cm</div></div>
        <div class="sc"><div class="sn">${son.kilo}</div><div class="sl">Kilo kg</div></div></div>${fark}`);
    h += kart("Kilo eğrisi", artan.length + " ölçüm", grafik(artan.map(o => ({ tarih: o.tarih, deger: o.kilo })), "kg"));
  }

  h += kart("Yeni ölçüm gir", "",
    `<div class="row" style="margin-bottom:11px">${alan("kilo", "Kilo kg")}${alan("bel", "Bel cm")}${alan("boyun", "Boyun cm")}</div>
     ${kadin ? `<div class="row" style="margin-bottom:11px">${alan("kalca", "Kalça cm")}</div>` : ""}
     <button class="btn gold blok" data-act="olcum">Bugünün ölçümünü kaydet</button>
     <p class="note" id="on-yag" style="margin-top:10px;text-align:center">${onizlemeYag()}</p>
     <p class="note" style="margin-top:10px">Sadece kilo da girebilirsin — bel ve boyun boş kalırsa yağ oranı hesaplanmaz, kilo yine kaydedilir.</p>`);

  if (artan.length)
    h += kart("Geçmiş", "",
      `<div class="kaydir"><table><thead><tr><th>Tarih</th><th>Kilo</th><th>Bel</th><th>Boyun</th>${kadin ? "<th>Kalça</th>" : ""}<th>Yağ %</th></tr></thead>
       <tbody>${[...artan].reverse().map(o => `<tr><td>${trKisa(o.tarih)}</td><td>${o.kilo}</td><td>${o.bel || "—"}</td><td>${o.boyun || "—"}</td>
       ${kadin ? `<td>${o.kalca || "—"}</td>` : ""}<td style="color:var(--vurgu)">${navyStr(o)}</td></tr>`).join("")}</tbody></table></div>`);
  return h;
}

/* =================== SEKME: DAHA =================== */
function vDaha() {
  if (S.daha) return { market: dMarket, rehber: dRehber, takviye: dTakviye, ayar: dAyar, yedek: dYedek }[S.daha]();
  const say = Object.values(S.market).filter(Boolean).length;
  let h = `<header class="top"><p class="eyebrow">Menü</p><h1>Daha</h1>
   <p class="sub">Liste, rehber ve ayarlar</p></header>`;
  h += kart("", "",
    [["market", "Alışveriş listesi", say ? say + " kalem işaretli" : "Haftalık market listesi"],
     ["rehber", "Rehber", "Kafan karıştığında buraya bak"],
     ["takviye", "Takviyeler", S.takviyeler.length + " takviye seçili"],
     ["ayar", "Ayarlar", "Hedefler, profil, program"],
     ["yedek", "Yedek", S.sonYedek ? "Son yedek: " + trKisa(S.sonYedek) : "Henüz yedek almadın"]]
    .map(([id, ad, d]) => `<div class="item" data-act="daha:${id}"><div class="ib">
      <div class="it"><span class="name">${ad}</span></div><div class="desc">${esc(d)}</div></div>
      <div class="uc"><span class="ara-sag">›</span></div></div>`).join(""));
  h += `<p class="note" style="text-align:center;margin-top:18px">Verilerin yalnızca bu cihazda. Hiçbir yere gönderilmiyor.</p>`;
  return h;
}

const geriBtn = ad => `<button class="btn ghost blok" data-act="daha:" style="margin-bottom:14px">‹ ${ad}</button>`;

function dMarket() {
  const tum = MARKET_SABLON.reduce((a, g) => a + g.i.length, 0);
  const alinan = Object.values(S.market).filter(Boolean).length;
  let h = `<header class="top"><p class="eyebrow">1 hafta</p><h1>Alışveriş</h1>
   <p class="sub">${alinan} / ${tum} alındı</p></header>` + geriBtn("Daha");
  MARKET_SABLON.forEach(g => {
    h += `<p class="sec">${esc(g.k)}</p>` + kart("", "",
      g.i.map(x => satir({ ad: x, on: !!S.market[x], act: "mk:" + x })).join(""));
  });
  h += `<button class="btn ghost blok" data-act="mk-sifirla">Listeyi sıfırla (yeni hafta)</button>`;
  return h;
}

function dRehber() {
  /* kosul: takviye id'si, "@kafein" (kafeinli takviye varsa) ya da
     "@guc" / "@dovus" / "@kardiyo" (o tipte spor seçiliyse) */
  const tipler = new Set(S.sporlar.map(id => (sporBul(id) || {}).tip));
  const kafeinVar = S.takviyeler.some(t => (t.etiket || {}).kafein > 0);
  const gorunur = b => {
    if (!b.kosul) return true;
    if (b.kosul === "@kafein") return kafeinVar;
    if (b.kosul[0] === "@") return tipler.has(b.kosul.slice(1));
    return S.takviyeler.some(t => t.id === b.kosul);
  };
  let h = `<header class="top"><p class="eyebrow">Nasıl kullanılır</p><h1>Rehber</h1>
   <p class="sub">Senin seçimlerine göre süzüldü</p></header>` + geriBtn("Daha");
  REHBER.filter(gorunur).forEach(b => {
    h += `<p class="sec">${esc(b.b)}</p>` + kart("", "",
      b.s.map(([k, v]) => `<div class="gr"><div class="gk">${esc(k)}</div><div class="gv">${esc(v)}</div></div>`).join(""));
  });
  return h;
}

function dTakviye() {
  let h = `<header class="top"><p class="eyebrow">${S.takviyeler.length} seçili</p><h1>Takviyeler</h1>
   <p class="sub">Doz ve günleri buradan ayarla</p></header>` + geriBtn("Daha");

  uyarilar(bugun()).forEach(u => { h += uyariKutu(u); });

  if (S.takviyeler.length)
    h += kart("Seçili", "", S.takviyeler.map((t, i) => `<div class="gr">
      <div class="it" style="margin-bottom:6px"><span class="name">${esc(t.ad)}</span>
        ${(t.etiket || {}).kafein ? `<span class="chip ember">${t.etiket.kafein} mg kafein</span>` : ""}
        <button class="sil" data-act="tak-sil:${i}" style="margin-left:auto" aria-label="kaldır">×</button></div>
      <div class="row" style="margin-bottom:8px">
        <div class="alan"><label class="lbl">Doz</label><input type="text" data-tak="${i}:doz" value="${esc(t.doz)}" style="text-align:left"></div>
        <div class="alan"><label class="lbl">Saat</label><input type="text" data-tak="${i}:saat" value="${esc(t.saat)}" style="text-align:left"></div></div>
      <label class="lbl sol">Hangi günler</label>
      <div class="row wrapped">${GUN_KISA.map((g, gi) => {
        const acik = !t.gunler || !t.gunler.length || t.gunler.indexOf(gi) !== -1;
        return `<button class="chip ${acik ? "gold" : ""}" data-act="tak-gun:${i}:${gi}" style="cursor:pointer;background:none">${g}</button>`;
      }).join("")}</div>
      ${t.not ? `<div class="macro" style="margin-top:8px">${esc(t.not)}</div>` : ""}</div>`).join(""));
  else
    h += kart("", "", `<p class="bos">Takviye kullanmıyorsan sorun değil — aşağıdan istediğin zaman ekleyebilirsin.</p>`);

  h += `<p class="sec">Ekle</p>` + kart("", "",
    `<div class="sec-lst">${TAKVIYELER.filter(t => !S.takviyeler.some(x => x.id === t.id))
      .map(t => secOp("tak-ekle:" + t.id, false, t.ad, t.doz + " · " + t.saat + ((t.etiket || {}).kafein ? " · " + t.etiket.kafein + " mg kafein" : ""))).join("")
      || `<p class="bos">Kütüphanedeki hepsi seçili.</p>`}</div>`);
  h += `<p class="note" style="margin-top:14px">Takviye ilaç değildir ve ilacın yerine geçmez. Kullandığın ilaçlarla etkileşebilir — eczacına ya da hekimine danış.</p>`;
  return h;
}

function dAyar() {
  const p = S.profil, hs = hedefHesapla();
  let h = `<header class="top"><p class="eyebrow">Ayarlar</p><h1>Ayarlar</h1>
   <p class="sub">Hedefler ve profil</p></header>` + geriBtn("Daha");

  h += kart("Günlük hedefler", p.kcalElle ? "elle ayarlı" : "otomatik",
    `<div class="row" style="margin-bottom:11px">${alan("aKcal", "kcal")}${alan("aProtein", "Protein g")}${alan("aSu", "Su bardak")}</div>
     <label class="lbl sol">Bardak boyutu</label>
     <div class="row wrapped" style="gap:7px;margin-bottom:10px">
       ${[200, 250, 330, 500, 750, 1000].map(ml =>
         `<button class="chip ${bardakMl() === ml ? "gold" : ""}" data-act="bardak:${ml}"
           style="cursor:pointer;padding:9px 12px">${ml} ml</button>`).join("")}</div>
     <div class="row" style="margin-bottom:11px">${alan("aBardak", "Bardak ml")}</div>
     <p class="note" style="margin-bottom:11px">Günlük su hedefin
       <strong id="su-toplam">${(suHedefMl() / 1000).toFixed(2)} litre</strong>
       (${S.profil.suHedef} × ${bardakMl()} ml). Şişeden içiyorsan boyutu değiştir —
       litre hedefin korunur, bardak sayısı yeniden hesaplanır.</p>
     <div class="row"><button class="btn gold" data-act="ayar-hedef">Kaydet</button>
      ${hs ? `<button class="btn ghost" data-act="ayar-oto">Otomatiğe dön</button>` : ""}</div>
     ${hs ? `<p class="note" style="margin-top:11px">Profiline göre hesaplanan: ${hs.kcal} kcal · ${hs.protein} g protein · ${(hs.suMl / 1000).toFixed(1)} litre su. Günlük harcaman ~${hs.tdee} kcal.</p>` : ""}`);

  h += kart("Profil", "",
    `<div class="row" style="margin-bottom:11px">${alan("pDogum", "Doğum yılı")}${alan("pBoy", "Boy cm")}${alan("pKilo", "Kilo kg")}</div>
     <label class="lbl sol">Cinsiyet</label>
     <div class="sec-lst" style="margin-bottom:11px">
       ${secOp("ayar-cins:e", p.cinsiyet === "e", "Erkek", "")}
       ${secOp("ayar-cins:k", p.cinsiyet === "k", "Kadın", "")}</div>
     <label class="lbl sol">Antrenman saati</label>
     <input type="time" data-fld="pAntrSaat" value="${esc(p.antrSaat || "18:00")}" style="margin-bottom:11px">
     <button class="btn gold blok" data-act="ayar-profil">Kaydet</button>`);

  h += kart("Hedef ve aktivite", "",
    `<label class="lbl sol">Hedef</label>
     <div class="sec-lst" style="margin-bottom:13px">${HEDEFLER.map(x => secOp("ayar-hedefTip:" + x.id, p.hedef === x.id, x.ad, x.d)).join("")}</div>
     <label class="lbl sol">Aktivite</label>
     <div class="sec-lst">${AKTIVITE.map(x => secOp("ayar-akt:" + x.id, p.aktivite === x.id, x.ad, x.d)).join("")}</div>`);

  const a = S.aliskanlik;
  h += kart("Bırakma takibi", a && a.aktif ? esc(a.ad) : "kapalı",
    a && a.aktif
      ? `<p class="note" style="margin-bottom:11px">${esc(a.ad)} · başlangıç haftalık sınır ${a.hafta1} ${esc(a.birim)} · ${trKisa(a.baslangic)} tarihinde başladı.</p>
         <button class="btn ghost blok" data-act="alis-kapat">Takibi kapat</button>`
      : `<p class="note" style="margin-bottom:11px">Azaltmak istediğin bir şey varsa buradan açabilirsin.</p>
         <div class="sec-lst" style="margin-bottom:11px">${ALISKANLIK_SABLON.filter(x => x.id !== "ozel").map(x => secOp("alis-ac:" + x.id, false, x.ad, "Haftada " + x.baslangic + " " + x.birim + " ile başlar")).join("")}</div>`);

  h += kart("Öğün düzeni", S.ogunler.length + " öğün", ogunDuzenle());
  h += kart("Hazır düzenler", "",
    `<div class="sec-lst">${OGUN_SABLON.map(o => secOp("ayar-ogun:" + o.id, false, o.ad, o.d)).join("")}</div>
     <p class="note" style="margin-top:11px">Hazır bir düzen seçmek yukarıdaki listenin üzerine yazar. Geçmiş kayıtlar silinmez.</p>`);

  h += kart("Sporlar", S.sporlar.length + " seçili",
    `<div class="sec-lst">${SPORLAR.map(s => secOp("ayar-spor:" + s.id, S.sporlar.indexOf(s.id) !== -1, s.ad, SPOR_TIP_AD[s.tip])).join("")}</div>`);

  h += `<p class="sec">Tehlikeli bölge</p>` + kart("", "",
    `<p class="note" style="margin-bottom:11px">Tüm verini siler ve kurulumu baştan başlatır. Geri alınamaz — önce yedek al.</p>
     <button class="btn tehlike blok" data-act="sifirla">Her şeyi sil</button>`);
  return h;
}

function dYedek() {
  const gunSayi = S.sonYedek ? Math.floor((Date.now() - tarihMs(S.sonYedek)) / 864e5) : null;
  return `<header class="top"><p class="eyebrow">Verilerini koru</p><h1>Yedek</h1>
   <p class="sub">${S.sonYedek ? gunSayi + " gün önce yedekledin" : "Henüz yedek almadın"}</p></header>` + geriBtn("Daha") +
   kart("", "",
    `<p class="note" style="margin-bottom:12px">Veriler yalnızca bu cihazda saklanıyor. Ayda bir yedek al — telefon değiştirirsen ya da tarayıcı verisi silinirse buradan geri yüklersin.</p>
     <div class="row" style="margin-bottom:9px">
       <button class="btn gold" data-act="yedek-kopyala">Yedeği kopyala</button>
       <button class="btn" data-act="yedek-indir">Dosya indir</button></div>
     <label class="lbl sol" style="margin-top:12px">Geri yükle — yedek metnini yapıştır</label>
     <textarea id="yedek-in" placeholder='{"profil":…}'>${esc(S.yedekMetin)}</textarea>
     <button class="btn ghost blok" data-act="yedek-yukle" style="margin-top:9px">Yedekten geri yükle</button>
     <p class="note" style="margin-top:11px">Geri yükleme mevcut verinin üzerine yazar.</p>`);
}

/* =================== ÇİZ =================== */
const IKON = {
  bugun: "M12 2v4M5 5l2.5 2.5M2 12h4M19 5l-2.5 2.5M22 12h-4M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z",
  yemek: "M4 3v7a2 2 0 0 0 4 0V3M6 10v11M18 3v18M18 3c-1.7 0-3 2-3 4.5S16.3 12 18 12",
  antrenman: "M6.5 6.5v11M3.5 9v5M17.5 6.5v11M20.5 9v5M6.5 12h11",
  ilerleme: "M3 3v18h18M7 15l4-4 3 3 5-6",
  daha: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"
};
const ADLAR = { bugun: "Bugün", yemek: "Yemek", antrenman: "Antrenman", ilerleme: "İlerleme", daha: "Daha" };

function ciz() {
  const app = document.getElementById("app");
  document.body.classList.toggle("kilit", !!S.araHedef);
  if (kurulumGerek()) { app.innerHTML = `<div class="wrap solo">${vKurulum()}</div>`; return; }
  const v = { bugun: vBugun, yemek: vYemek, antrenman: vAntrenman, ilerleme: vIlerleme, daha: vDaha }[S.tab]();
  app.innerHTML = `<div class="wrap">${v}</div>
   <nav><div class="nav-in">${Object.keys(ADLAR).map(id =>
     `<button class="tab ${S.tab === id ? "on" : ""}" data-act="tab:${id}" aria-label="${ADLAR[id]}">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
       stroke-linecap="round" stroke-linejoin="round"><path d="${IKON[id]}"/></svg><span>${ADLAR[id]}</span></button>`).join("")}
   </div></nav>
   ${yemekPaneli()}`;

  /* Panel yeni açıldıysa arama kutusuna odaklan — kullanıcı hemen yazmaya başlasın */
  if (S.odakAra) {
    S.odakAra = false;
    const inp = app.querySelector("[data-ara]");
    if (inp) inp.focus();
  }
}

/* Kurulum sihirbazı adım doğrulaması */
function adimGecerli(a) {
  const p = S.profil;
  if (a === 0) {
    const d = sayi(S.f.dogumYili), b = sayi(S.f.boy), kg = sayi(S.f.kilo);
    if (!p.cinsiyet) return "Cinsiyet seç";
    if (!(d >= 1920 && d <= new Date().getFullYear() - 10)) return "Doğum yılını gir";
    if (!(b >= 100 && b <= 250)) return "Boyu cm olarak gir (100-250)";
    if (!(kg >= 25 && kg <= 400)) return "Kiloyu kg olarak gir";
    p.dogumYili = Math.round(d); p.boy = b; p.kilo = kg;
    return null;
  }
  if (a === 2) {
    if (!p.hedef) return "Bir hedef seç";
    if (!p.aktivite) return "Aktivite düzeyini seç";
    return null;
  }
  if (a === 3 && !S.sporlar.length) return "En az bir spor seç";
  if (a === 5 && !S.ogunler.length) return "Bir öğün düzeni seç";
  return null;
}

function adimUygula(a) {
  const p = S.profil;
  if (a === 1) {
    const bel = sayi(S.f.bel), boyun = sayi(S.f.boyun), kalca = sayi(S.f.kalca);
    if (bel && boyun) {
      const o = { tarih: bugun(), kilo: p.kilo, bel, boyun };
      if (p.cinsiyet === "k" && kalca) o.kalca = kalca;
      S.olcumler = [...S.olcumler.filter(x => x.tarih !== o.tarih), o];
    }
  }
  if (a === 2) {
    const h = hedefHesapla();
    if (h && !p.kcalElle) { p.kcal = h.kcal; p.protein = h.protein; p.suHedef = h.su; }
  }
  if (a === 5 && !S.ogunler.length) ogunKur(S.f.ogunSablon || "3ogun");
  if (a === 7 && S.f.alisId) {
    const sb = ALISKANLIK_SABLON.find(x => x.id === S.f.alisId);
    const h1 = sayi(S.f.alisHafta1) || (sb ? sb.baslangic : 14);
    const ad = S.f.alisId === "ozel" ? (S.f.alisAd || "Alışkanlık") : sb.ad;
    S.aliskanlik = { aktif: true, ad, birim: sb ? sb.birim : "adet", baslangic: bugun(), hafta1: Math.round(h1) };
  }
}

/* Form alanlarını mevcut değerlerle doldurur — kullanıcı boş kutulara
   bakmasın, neyi değiştirdiğini görsün. */
function kurulumFormDoldur() {
  const p = S.profil, a = S.kurulumAdim;
  S.f = {};
  if (a === 0) { S.f.dogumYili = p.dogumYili || ""; S.f.boy = p.boy || ""; S.f.kilo = p.kilo || ""; }
  if (a === 1) {
    const son = [...S.olcumler].sort((x, y) => x.tarih < y.tarih ? 1 : -1)[0];
    if (son) { S.f.bel = son.bel || ""; S.f.boyun = son.boyun || ""; S.f.kalca = son.kalca || ""; }
  }
}
function ayarFormDoldur() {
  const p = S.profil;
  S.f = { aKcal: p.kcal || "", aProtein: p.protein || "", aSu: p.suHedef || "", aBardak: p.bardakMl || 250,
          pDogum: p.dogumYili || "", pBoy: p.boy || "", pKilo: p.kilo || "", pAntrSaat: p.antrSaat || "" };
}

/* Şablon uygularken var olan id'leri sırayla yeniden kullanıyoruz; böylece
   düzeni değiştiren kullanıcının o günkü kayıtları öğünlerine bağlı kalıyor. */
function ogunKur(sablonId) {
  const s = OGUN_SABLON.find(x => x.id === sablonId);
  if (!s) return;
  const eski = S.ogunler.map(o => o.id);
  S.ogunler = s.ogunler.map((o, i) => ({ id: eski[i] || yeniOid(), ad: o.ad, saat: o.saat, p: o.p }));
}

function programOto() {
  const secili = S.sporlar.map(sporBul).filter(Boolean);
  if (!secili.length) return;
  /* Pazar dinlenme, kalan altı güne seçili sporları sırayla dağıt,
     ardışık iki güç günü gelmesin diye tipe göre sırala */
  const sirali = secili.slice().sort((a, b) => (a.tip === "guc") - (b.tip === "guc"));
  const gunSira = [1, 3, 5, 2, 6, 4];
  S.program = Array.from({ length: 7 }, () => ({ seanslar: [] }));
  const adet = Math.min(gunSira.length, Math.max(3, secili.length * 2));
  for (let i = 0; i < adet; i++) {
    const s = sirali[i % sirali.length];
    S.program[gunSira[i]].seanslar = [{ sid: yeniSid(), spor: s.id,
      sablon: s.tip === "guc" ? Object.keys(GUC_SABLON)[i % 2] : "", sure: s.sure }];
  }
}

/* =================== OLAYLAR =================== */
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const a = el.dataset.act;
  const par = (n) => a.split(":")[n];

  /* ---- kurulum ---- */
  if (a === "k-ileri") {
    const hata = adimGecerli(S.kurulumAdim);
    if (hata) { toast(hata); return; }
    adimUygula(S.kurulumAdim);
    if (S.kurulumAdim === ADIM_SAYI - 1) {
      S.profil.tamam = true; S.tab = "bugun";
      if (!S.ogunler.length) ogunKur("4ogun");
      if (S.program.every(p => !(p.seanslar || []).length)) programOto();
    } else S.kurulumAdim++;
    kurulumFormDoldur(); kaydet(); return ciz();
  }
  if (a === "k-geri") { S.kurulumAdim = Math.max(0, S.kurulumAdim - 1); kurulumFormDoldur(); kaydet(); return ciz(); }
  if (a === "k-atla") {
    if (S.kurulumAdim === ADIM_SAYI - 1) { S.profil.tamam = true; S.tab = "bugun";
      if (!S.ogunler.length) ogunKur("4ogun");
      if (S.program.every(p => !(p.seanslar || []).length)) programOto(); }
    else S.kurulumAdim++;
    kurulumFormDoldur(); kaydet(); return ciz();
  }
  if (a.startsWith("k-cins:"))  { S.profil.cinsiyet = par(1); kaydet(); return ciz(); }
  if (a.startsWith("k-hedef:")) { S.profil.hedef = par(1); kaydet(); return ciz(); }
  if (a.startsWith("k-akt:"))   { S.profil.aktivite = par(1); kaydet(); return ciz(); }
  if (a.startsWith("k-spor:"))  {
    const id = par(1), i = S.sporlar.indexOf(id);
    if (i === -1) S.sporlar.push(id); else { S.sporlar.splice(i, 1); sporSeanslariniSil(id); }
    kaydet(); return ciz();
  }
  if (a === "k-prog-oto") { programOto(); kaydet(); return ciz(); }
  if (a.startsWith("k-ogun:")) { S.f.ogunSablon = par(1); ogunKur(par(1)); kaydet(); return ciz(); }
  if (a.startsWith("k-tak:")) {
    const id = par(1), i = S.takviyeler.findIndex(t => t.id === id);
    if (i === -1) { const t = TAKVIYELER.find(x => x.id === id); S.takviyeler.push({ ...t, gunler: [] }); }
    else S.takviyeler.splice(i, 1);
    kaydet(); return ciz();
  }
  if (a.startsWith("k-alis:")) { S.f.alisId = par(1);
    const sb = ALISKANLIK_SABLON.find(x => x.id === S.f.alisId);
    if (sb && S.f.alisHafta1 == null) S.f.alisHafta1 = String(sb.baslangic);
    return ciz(); }

  /* ---- gezinme ---- */
  if (a.startsWith("tab:")) { S.tab = par(1); S.daha = ""; S.araHedef = ""; S.ara = ""; S.f = {}; window.scrollTo(0, 0); return ciz(); }
  if (a.startsWith("daha:")) {
    S.daha = par(1) || "";
    if (S.daha === "ayar") ayarFormDoldur(); else S.f = {};
    window.scrollTo(0, 0); return ciz();
  }

  const g = gun();

  /* ---- bugün ---- */
  if (a === "su+") { g.su = Math.min(g.su + 1, 30); }
  else if (a === "su-") { g.su = Math.max(0, g.su - 1); }
  else if (a === "alis+") { g.aliskanlik = (g.aliskanlik || 0) + 1; }
  else if (a === "alis-") { g.aliskanlik = Math.max(0, (g.aliskanlik || 0) - 1); }
  else if (a.startsWith("seans-tik:")) {
    const l = seansYaz(bugun(), par(1)); l.yapildi = !l.yapildi;
  }
  else if (a.startsWith("tak:")) { const id = par(1); g.takviye[id] = !g.takviye[id]; }
  else if (a.startsWith("mk:")) { const x = a.slice(3); S.market[x] = !S.market[x]; }
  else if (a === "mk-sifirla") { S.market = {}; toast("Liste sıfırlandı"); }

  /* ---- yemek ---- */
  else if (a.startsWith("yem-ac:")) { S.araHedef = par(1); S.ara = ""; S.f = {}; S.odakAra = true; }
  else if (a === "ara-kapat") { S.araHedef = ""; S.ara = ""; S.f = {}; }
  else if (a.startsWith("bes-sec:")) {
    const b = besinAra(S.ara)[parseInt(par(1), 10)];
    if (b) { S.f.besin = b; S.f.besinGram = String(b.pGram); }
  }
  else if (a.startsWith("porsiyon:")) { S.f.besinGram = par(1); }
  else if (a.startsWith("bes-son:")) {
    const b = sonBesinler(8)[parseInt(par(1), 10)];
    if (b) { yemekEkle({ ad: b.ad, kcal: b.kcal, p: b.p, gram: b.gram }); S.ara = ""; S.odakAra = true; toast(b.ad + " eklendi"); }
  }
  else if (a === "besin-ekle") {
    const b = S.f.besin, gr = sayi(S.f.besinGram);
    if (!b) return;
    if (!(gr > 0 && gr <= 5000)) { toast("Miktarı gir"); return; }
    const yeni = { ad: b.ad, kcal: Math.round(b.kcal * gr / 100), p: +(b.p * gr / 100).toFixed(1), gram: Math.round(gr) };
    if (S.f.duzenleUid) {
      const y = g.yenen.find(x => x.uid === S.f.duzenleUid);
      if (y) Object.assign(y, yeni);
      S.araHedef = ""; S.f = {}; toast("Güncellendi");
    } else {
      yemekEkle(yeni);
      S.f = {}; S.ara = ""; S.odakAra = true; toast(b.ad + " eklendi");
    }
  }
  else if (a === "besin-iptal") {
    if (S.f.duzenleUid || S.f.elleDuzenle) { S.araHedef = ""; S.f = {}; }
    else { S.f = {}; S.odakAra = true; }
  }
  else if (a === "el-ekle") {
    const ad = String(S.f.elAd || "").trim(), kc = sayi(S.f.elKcal), pr = sayi(S.f.elP);
    if (!ad) { toast("Ne yediğini yaz"); return; }
    if (!(kc >= 0 && kc <= 20000)) { toast("Kalori gir"); return; }
    const pro = isFinite(pr) && pr >= 0 ? +pr.toFixed(1) : 0;
    ozelBesinKaydet(ad, Math.round(kc), pro);
    yemekEkle({ ad, kcal: Math.round(kc), p: pro, gram: 100 });
    S.f = {}; S.ara = ""; S.odakAra = true;
    toast(ad + " eklendi ve listene kaydedildi");
  }
  else if (a.startsWith("yem-duzenle:")) {
    const y = g.yenen.find(x => x.uid === a.slice(12));
    if (!y) return;
    S.araHedef = y.ogun; S.ara = "";
    const b = y.gram > 0 ? besinBul(y.ad) : null;
    /* Gramajı bilinen ve veritabanında bulunan kalem miktar adımında açılır;
       elle girilmiş eski kayıtlar doğrudan kcal/protein olarak düzenlenir. */
    S.f = b ? { besin: b, besinGram: String(y.gram), duzenleUid: y.uid }
            : { elleDuzenle: y.uid, elAd: y.ad, elKcal: String(y.kcal), elP: String(y.p) };
  }
  else if (a === "el-guncelle") {
    const y = g.yenen.find(x => x.uid === S.f.elleDuzenle);
    const ad = String(S.f.elAd || "").trim(), kc = sayi(S.f.elKcal), pr = sayi(S.f.elP);
    if (!y) return;
    if (!ad) { toast("Ne yediğini yaz"); return; }
    if (!(kc >= 0 && kc <= 20000)) { toast("Kalori gir"); return; }
    y.ad = ad; y.kcal = Math.round(kc); y.p = isFinite(pr) && pr >= 0 ? +pr.toFixed(1) : 0;
    S.araHedef = ""; S.f = {}; toast("Güncellendi");
  }
  else if (a.startsWith("yem-sil:")) {
    const uid = a.slice(8);
    g.yenen = g.yenen.filter(y => y.uid !== uid);
    if (S.f.duzenleUid === uid || S.f.elleDuzenle === uid) { S.araHedef = ""; S.f = {}; }
    toast("Silindi");
  }

  /* ---- antrenman ---- */
  else if (a.startsWith("set-ekle:")) {
    const l = seansYaz(bugun(), par(1));
    l.set = (l.set || []).concat([{ ad: "", set: "", tekrar: "", kg: "" }]);
  }
  else if (a.startsWith("set-sil:")) {
    const l = seansYaz(bugun(), par(1));
    (l.set || []).splice(parseInt(par(2), 10), 1);
  }
  else if (a.startsWith("seans-sil:")) {
    const gi = parseInt(par(1), 10), si = parseInt(par(2), 10);
    (S.program[gi].seanslar || []).splice(si, 1);
  }
  else if (a.startsWith("seans-tasi:")) {
    const gi = parseInt(par(1), 10), si = parseInt(par(2), 10), yon = parseInt(par(3), 10);
    const l = S.program[gi].seanslar || [], hedef = si + yon;
    if (hedef >= 0 && hedef < l.length) { const t = l[si]; l[si] = l[hedef]; l[hedef] = t; }
  }
  else if (a === "spor-duzenle") { S.tab = "daha"; S.daha = "ayar"; ayarFormDoldur(); window.scrollTo(0, 0); }

  /* ---- ölçüm ---- */
  else if (a === "olcum") {
    const kilo = sayi(S.f.kilo), bel = sayi(S.f.bel), boyun = sayi(S.f.boyun), kalca = sayi(S.f.kalca);
    if (!(kilo > 0)) { toast("En azından kiloyu gir"); return; }
    if (bel && boyun && S.profil.cinsiyet !== "k" && bel <= boyun) { toast("Bel, boyundan büyük olmalı"); return; }
    const o = { tarih: bugun(), kilo };
    if (bel) o.bel = bel; if (boyun) o.boyun = boyun;
    if (S.profil.cinsiyet === "k" && kalca) o.kalca = kalca;
    S.olcumler = [...S.olcumler.filter(x => x.tarih !== o.tarih), o];
    S.profil.kilo = kilo;
    if (!S.profil.kcalElle) { const hh = hedefHesapla(); if (hh) { S.profil.kcal = hh.kcal; S.profil.protein = hh.protein; } }
    S.f = {}; toast("Ölçüm kaydedildi");
  }

  /* ---- takviye yönetimi ---- */
  else if (a.startsWith("tak-ekle:")) {
    const t = TAKVIYELER.find(x => x.id === par(1));
    if (t) S.takviyeler.push({ ...t, gunler: [] });
  }
  else if (a.startsWith("tak-sil:")) { S.takviyeler.splice(parseInt(par(1), 10), 1); }
  else if (a.startsWith("tak-gun:")) {
    const t = S.takviyeler[parseInt(par(1), 10)], gi = parseInt(par(2), 10);
    if (t) {
      if (!t.gunler || !t.gunler.length) t.gunler = [0, 1, 2, 3, 4, 5, 6];
      const i = t.gunler.indexOf(gi);
      if (i === -1) t.gunler.push(gi); else t.gunler.splice(i, 1);
      t.gunler.sort();
    }
  }

  /* ---- ayarlar ---- */
  else if (a === "ayar-hedef") {
    const kc = sayi(S.f.aKcal), pr = sayi(S.f.aProtein), su = sayi(S.f.aSu);
    if (!(kc >= 800 && kc <= 6000)) { toast("Kalori 800-6000 arası olmalı"); return; }
    S.profil.kcal = Math.round(kc);
    if (pr > 0) S.profil.protein = Math.round(pr);
    if (su > 0) S.profil.suHedef = kis(Math.round(su), 1, 40);
    const bml = sayi(S.f.aBardak);
    if (bml >= 50 && bml <= 2000) S.profil.bardakMl = Math.round(bml);
    S.profil.kcalElle = true; ayarFormDoldur(); toast("Hedefler kaydedildi");
  }
  else if (a.startsWith("bardak:")) {
    bardakAyarla(parseInt(par(1), 10));
    ayarFormDoldur(); toast(`Bardak ${bardakMl()} ml · hedef ${S.profil.suHedef} bardak`);
  }
  else if (a === "ayar-oto") {
    S.profil.kcalElle = false;
    const h = hedefHesapla();
    if (h) { S.profil.kcal = h.kcal; S.profil.protein = h.protein; S.profil.suHedef = h.su; toast("Otomatik hedeflere dönüldü"); }
  }
  else if (a === "ayar-profil") {
    const d = sayi(S.f.pDogum), b = sayi(S.f.pBoy), kg = sayi(S.f.pKilo);
    if (d >= 1920 && d <= new Date().getFullYear() - 10) S.profil.dogumYili = Math.round(d);
    if (b >= 100 && b <= 250) S.profil.boy = b;
    if (kg >= 25 && kg <= 400) S.profil.kilo = kg;
    if (S.f.pAntrSaat) S.profil.antrSaat = S.f.pAntrSaat;
    if (!S.profil.kcalElle) { const h = hedefHesapla(); if (h) { S.profil.kcal = h.kcal; S.profil.protein = h.protein; S.profil.suHedef = h.su; } }
    ayarFormDoldur(); toast("Profil kaydedildi");
  }
  else if (a.startsWith("ayar-cins:")) { S.profil.cinsiyet = par(1); }
  else if (a.startsWith("ayar-hedefTip:")) { S.profil.hedef = par(1); if (!S.profil.kcalElle) { const h = hedefHesapla(); if (h) { S.profil.kcal = h.kcal; S.profil.protein = h.protein; } } }
  else if (a.startsWith("ayar-akt:")) { S.profil.aktivite = par(1); if (!S.profil.kcalElle) { const h = hedefHesapla(); if (h) { S.profil.kcal = h.kcal; S.profil.protein = h.protein; } } }
  else if (a.startsWith("ayar-ogun:")) { ogunKur(par(1)); toast("Öğün düzeni güncellendi"); }
  else if (a === "ogun-ekle") {
    if (S.ogunler.length >= 10) { toast("En fazla 10 öğün"); return; }
    const son = S.ogunler[S.ogunler.length - 1];
    S.ogunler.push({ id: yeniOid(), ad: "Yeni öğün", saat: son ? son.saat : "12:00",
                     p: S.ogunler.length ? 1 / (S.ogunler.length + 1) : 1 });
  }
  else if (a.startsWith("ogun-sil:")) {
    if (S.ogunler.length <= 1) { toast("En az bir öğün olmalı"); return; }
    S.ogunler.splice(parseInt(par(1), 10), 1);
  }
  else if (a.startsWith("ogun-tasi:")) {
    const i = parseInt(par(1), 10), yon = parseInt(par(2), 10), h2 = i + yon;
    if (h2 >= 0 && h2 < S.ogunler.length) {
      const t = S.ogunler[i]; S.ogunler[i] = S.ogunler[h2]; S.ogunler[h2] = t;
    }
  }
  else if (a === "ogun-esit") {
    const pay = 1 / Math.max(1, S.ogunler.length);
    S.ogunler.forEach(o => { o.p = pay; });
    toast("Paylar eşitlendi");
  }
  else if (a.startsWith("ayar-spor:")) {
    const id = par(1), i = S.sporlar.indexOf(id);
    if (i === -1) S.sporlar.push(id);
    else { S.sporlar.splice(i, 1); sporSeanslariniSil(id); }
  }
  else if (a.startsWith("alis-ac:")) {
    const sb = ALISKANLIK_SABLON.find(x => x.id === par(1));
    if (sb) { S.aliskanlik = { aktif: true, ad: sb.ad, birim: sb.birim, baslangic: bugun(), hafta1: sb.baslangic }; toast("Takip başladı"); }
  }
  else if (a === "alis-kapat") { S.aliskanlik = null; toast("Takip kapatıldı"); }
  else if (a === "sifirla") {
    if (!S.f.silOnay) { S.f.silOnay = true; toast("Emin misen düğmeye bir daha bas"); ciz(); return; }
    localStorage.removeItem(ANAHTAR);
    S = Object.assign(varsayilan(), { tab: "bugun", f: {}, ara: "", araHedef: "", daha: "", yedekMetin: "" });
    toast("Her şey silindi"); return ciz();
  }

  /* ---- yedek ---- */
  else if (a === "yedek-kopyala") {
    const j = yedekJson();
    S.sonYedek = bugun();
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(j).then(() => toast("Yedek kopyalandı"), () => { S.yedekMetin = j; ciz(); toast("Aşağıdaki kutudan kopyala"); });
    else { S.yedekMetin = j; toast("Aşağıdaki kutudan kopyala"); }
  }
  else if (a === "yedek-indir") {
    const url = URL.createObjectURL(new Blob([yedekJson(true)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "fitplan-yedek-" + bugun() + ".json";
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    S.sonYedek = bugun(); toast("Dosya indirildi");
  }
  else if (a === "yedek-yukle") {
    const ta = document.getElementById("yedek-in");
    try {
      const d = JSON.parse(ta.value);
      if (!d || typeof d !== "object") throw 0;
      KALICI.forEach(x => { if (d[x] !== undefined) S[x] = d[x]; });
      duzelt();
      S.profil.tamam = true; S.yedekMetin = ""; toast("Yedek geri yüklendi");
    } catch (err) { toast("Geçersiz yedek metni"); return; }
  }
  else return;

  kaydet(); ciz();
});

/* Bir spor listeden çıkarılınca o spora ait seanslar programdan da silinir,
   yoksa programda tanınmayan seans kalır. */
function sporSeanslariniSil(id) {
  S.program.forEach(p => { p.seanslar = (p.seanslar || []).filter(s => s.spor !== id); });
}

function yemekEkle(y) {
  const g = gun();
  g.yenen.push({ uid: "y" + Date.now() + Math.round(Math.random() * 1e4), ogun: S.araHedef || "genel", ...y });
}

/* Elle girilen yemek kullanıcının kendi listesine kaydedilir; bir daha
   yazmasın, aramada çıksın. Girilen değerler "1 porsiyon = 100 g" kabul
   edilir, böylece gramaj hesabı veritabanı kalemleriyle aynı yoldan geçer. */
function ozelBesinKaydet(ad, kcal, p) {
  const s = sadeAd(ad);
  const kayit = { ad, kcal, p, k: 0, y: 0, pAd: "porsiyon", pGram: 100 };
  const i = S.ozelBesinler.findIndex(b => sadeAd(b.ad) === s);
  if (i === -1) S.ozelBesinler.push(kayit); else S.ozelBesinler[i] = kayit;
}
function yedekJson(guzel) {
  const d = {}; KALICI.forEach(a => d[a] = S[a]);
  return JSON.stringify(d, null, guzel ? 2 : 0);
}

/* Alan yazımları.

   BURADA ciz() ÇAĞIRMA. Tüm ekranı yeniden basmak yazarken odağı kaybettirir;
   odağı geri koysan bile `input type="number"` üzerinde setSelectionRange
   çalışmadığı için imleç başa düşer ve kullanıcı "40" yazarken "04" görür.
   Onun yerine yalnızca hesaplanan düğümleri güncelliyoruz. */
function canliGuncelle() {
  const ogT = document.getElementById("og-toplam");
  if (ogT) {
    let toplam = 0;
    S.ogunler.forEach((o, i) => {
      const oran = ogunOran(o), el = document.getElementById("og-hedef-" + i);
      toplam += Math.round((+o.p > 0 ? +o.p : 0) * 100);
      if (el) el.value = S.profil.kcal ? Math.round(S.profil.kcal * oran) + " kcal" : "—";
    });
    ogT.textContent = toplam + "%";
  }
  const yag = document.getElementById("on-yag");
  if (yag) yag.innerHTML = onizlemeYag();
  const kcal = document.getElementById("bg-kcal");
  if (kcal) {
    const c = besinHesap();
    kcal.textContent = c.kcal;
    document.getElementById("bg-p").textContent = c.p;
    document.getElementById("bg-ky").textContent = c.ky;
  }
}

document.addEventListener("input", e => {
  const t = e.target;

  if (t.dataset.fld) {
    S.f[t.dataset.fld] = t.value;
    if (t.dataset.fld === "antrSaat") S.profil.antrSaat = t.value;
    canliGuncelle();
    return kaydetGecikmeli();
  }
  if (t.dataset.ara != null) {
    S.ara = t.value;
    const liste = document.getElementById("ara-liste");
    if (liste) liste.innerHTML = araListeHtml();
    return;
  }
  if (t.dataset.log) {
    const [sid, alan] = t.dataset.log.split(":");
    seansYaz(bugun(), sid)[alan] = t.value;
    return kaydetGecikmeli();
  }
  if (t.dataset.set) {
    const [sid, i, alan] = t.dataset.set.split(":");
    const l = seansYaz(bugun(), sid).set;
    if (l && l[i]) { l[i][alan] = t.value; kaydetGecikmeli(); }
    return;
  }
  if (t.dataset.ogun) {
    const [i, alan] = t.dataset.ogun.split(":");
    const o = S.ogunler[i];
    if (o) {
      if (alan === "p") {
        /* Yüzde olarak girilir, ağırlık olarak saklanır. Diğer öğünlerin
           payını bozmamak için okurken normalleştiriliyor. */
        const y = sayi(t.value);
        o.p = y > 0 ? y / 100 : 0;
        canliGuncelle();
      } else o[alan] = t.value;
      kaydetGecikmeli();
    }
    return;
  }
  if (t.dataset.seans) {
    const [gi, si, alan] = t.dataset.seans.split(":");
    const sn = (S.program[gi] || {}).seanslar || [];
    if (sn[si]) { sn[si][alan] = alan === "sure" ? (sayi(t.value) || 0) : t.value; kaydetGecikmeli(); }
    return;
  }
  if (t.dataset.tak) {
    const [i, alan] = t.dataset.tak.split(":");
    if (S.takviyeler[i]) { S.takviyeler[i][alan] = t.value; kaydetGecikmeli(); }
    return;
  }
  if (t.id === "yedek-in") { S.yedekMetin = t.value; return; }
});

document.addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.seansEkle != null) {
    const gi = parseInt(t.dataset.seansEkle, 10), spor = sporBul(t.value);
    if (!spor) return;
    const p = S.program[gi];
    p.seanslar = (p.seanslar || []).concat([{ sid: yeniSid(), spor: spor.id, sablon: "", sure: spor.sure }]);
    kaydet(); return ciz();
  }
  /* select ile gelen seans alanları (şablon) — input olayı tetiklemiyor */
  if (t.dataset.seans && t.tagName === "SELECT") {
    const [gi, si, alan] = t.dataset.seans.split(":");
    const sn = (S.program[gi] || {}).seanslar || [];
    if (sn[si]) { sn[si][alan] = t.value; kaydet(); return ciz(); }
  }
});

/* =================== BAŞLAT =================== */
yukle();
if (kurulumGerek()) kurulumFormDoldur();
ciz();
if (gocBildir) setTimeout(() => toast("Eski verin taşındı — öğün işaretleri hariç"), 600);

if ("serviceWorker" in navigator)
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
