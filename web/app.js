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
    try {
      const j = JSON.stringify(d);
      localStorage.setItem(ANAHTAR, j);
      /* Bulut aynası: yazma senkron kalıyor, iCloud'a gönderim arka planda.
         Böylece hiçbir ekran await etmek zorunda kalmıyor. */
      bulutaGonderGecikmeli(j);
      return true;
    } catch (e) { return false; }
  },
  eskiOku() {
    try { const h = localStorage.getItem(ESKI_ANAHTAR); return h ? JSON.parse(h) : null; }
    catch (e) { return null; }
  }
};

/* ---- Bulut senkronu ----
   Cihazda tutulan veri asıl kaynak; iCloud yalnızca ayna. Açılışta uzaktaki
   kopya okunup birleştiriliyor. Çakışma çözümü CLAUDE.md'de anlatıldığı gibi:
   gunler gün gün (damgası yeni olan), olcumler tarih bazında, gerisi "son
   yazan kazanır". */
let bulutT = null;
function bulutaGonderGecikmeli(json) {
  if (!Yerel.var()) return;
  clearTimeout(bulutT);
  bulutT = setTimeout(() => Yerel.bulutYaz(json), 1500);
}

function birlestir(a, b) {
  if (!a) return b;
  if (!b) return a;
  const yeni = (b.guncelleme || 0) > (a.guncelleme || 0) ? b : a;
  const c = Object.assign({}, yeni);

  c.gunler = {};
  const tumGun = new Set(Object.keys(a.gunler || {}).concat(Object.keys(b.gunler || {})));
  tumGun.forEach(k => {
    const ga = (a.gunler || {})[k], gb = (b.gunler || {})[k];
    if (!ga) { c.gunler[k] = gb; return; }
    if (!gb) { c.gunler[k] = ga; return; }
    c.gunler[k] = (gb.d || 0) > (ga.d || 0) ? gb : ga;
  });

  const olc = new Map();
  (a.olcumler || []).concat(b.olcumler || []).forEach(o => { if (o && o.tarih) olc.set(o.tarih, o); });
  c.olcumler = Array.from(olc.values()).sort((x, y) => x.tarih < y.tarih ? -1 : 1);

  const bes = new Map();
  (a.ozelBesinler || []).concat(b.ozelBesinler || []).forEach(x => { if (x && x.ad) bes.set(sadeAd(x.ad), x); });
  c.ozelBesinler = Array.from(bes.values());

  return c;
}

async function bulutSenkron() {
  if (!Yerel.var()) return;
  const ham = await Yerel.bulutOku();
  if (!ham) { Yerel.bulutYaz(JSON.stringify(kalici())); return; }
  let uzak = null;
  try { uzak = JSON.parse(ham); } catch (e) { return; }
  if (!uzak || typeof uzak !== "object") return;
  const once = JSON.stringify(kalici());
  const karma = birlestir(kalici(), uzak);
  KALICI.forEach(x => { if (karma[x] !== undefined) S[x] = karma[x]; });
  duzelt();
  if (JSON.stringify(kalici()) !== once) { kaydet(); ciz(); toast(T("iCloud'dan güncellendi")); }
}

/* =================== YARDIMCILAR =================== */
const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const GUN_AD = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
const GUN_KISA = ["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];

/* Yerel tarih — toISOString() doğrudan kullanılırsa gün kayar */
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const bugun = () => iso(new Date());
const tarihMs = s => new Date(s + "T00:00:00").getTime();
/* Tarih biçimi dile göre: TR "6 Ağustos 2026", EN "August 6, 2026" */
const trT = s => { const d = new Date(s + "T00:00:00");
  return DIL === "en" ? T(AYLAR[d.getMonth()]) + " " + d.getDate() + ", " + d.getFullYear()
                      : d.getDate() + " " + AYLAR[d.getMonth()] + " " + d.getFullYear(); };
const trKisa = s => { const d = new Date(s + "T00:00:00");
  return DIL === "en" ? T(AYLAR[d.getMonth()]).slice(0, 3) + " " + d.getDate()
                      : d.getDate() + " " + AYLAR[d.getMonth()].slice(0, 3); };
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

/* ---- Kilo trendi ve kalori uyarlaması ----
   Formül insanı tahmin eder, terazi ölçer. İki hafta veri birikince gerçek
   değişim hızına bakıp günlük kaloriye düzeltme öneriyoruz. Günlük tartı
   dalgalanması su ve tuzdur; karar 7 günlük ortalamalardan çıkıyor.
   Öneri kendiliğinden uygulanmaz — kabul etmek kullanıcının.               */
const HAFTALIK_BEKLENTI = { yag: -0.5, kas: 0.25, recomp: -0.25, koru: 0, perf: 0 };   // kg / hafta

function kiloOrtalama(bitis, gunSayi) {
  const bas = gunEkle(bitis, -(gunSayi - 1));
  const l = S.olcumler.filter(o => o.tarih >= bas && o.tarih <= bitis && +o.kilo > 0);
  return l.length ? l.reduce((a, o) => a + +o.kilo, 0) / l.length : null;
}

function kaloriOneri() {
  const p = S.profil;
  if (!p.kcal || !p.hedef) return null;
  const k = bugun();
  /* Bir öneriyi uyguladıktan sonra iki hafta susuyoruz: trend daha yeni
     kaloriyi görmedi. Susmasak arka arkaya basan kullanıcının hedefi her
     dokunuşta 300 kcal daha aşağı inerdi. */
  if (p.kcalAyarTarih && p.kcalAyarTarih > gunEkle(k, -14)) return null;
  const yeni = kiloOrtalama(k, 7), eski = kiloOrtalama(gunEkle(k, -7), 7);
  if (yeni == null || eski == null) return null;
  const gercek = yeni - eski;                                  // kg / hafta
  const beklenen = HAFTALIK_BEKLENTI[p.hedef] || 0;
  /* 1 kg vücut kütlesi ≈ 7700 kcal; haftalık sapmayı güne bölüyoruz. */
  const duzeltme = kis(Math.round((beklenen - gercek) * 7700 / 7 / 10) * 10, -300, 300);
  if (Math.abs(duzeltme) < 60) return null;                    // gürültüyü öneriye çevirme
  const taban = bmr(p.kilo, p.boy, yasHesap(), p.cinsiyet);
  let yeniKcal = p.kcal + duzeltme;
  if (taban) yeniKcal = Math.max(Math.round(taban / 10) * 10, yeniKcal);
  if (yeniKcal === p.kcal) return null;
  return { gercek, beklenen, duzeltme, yeniKcal };
}

/* Bugünün programı ve sporu */
const sporBul = id => SPORLAR.find(s => s.id === id) || null;

/* ---- Egzersiz kütüphanesi ----
   Ada göre bulur; kayıt hangi dilde yazılmışsa yakalasın diye hem Türkçe
   hem çevrilmiş adla karşılaştırır. Set/tekrar önerisi kullanıcının
   HEDEFİNE göre — hareket başına ayrı reçete tutmuyoruz. */
function kutBul(ad) {
  const a = sadeAd(ad || "");
  if (!a) return null;
  return EGZERSIZLER.find(x => sadeAd(x.ad) === a || sadeAd(T(x.ad)) === a) || null;
}
function setOner(bolge) {
  /* Duruş hareketleri kuvvet reçetesine uymaz: sık ve hafif çalışılır */
  if (bolge === "durus") return T("Günde 1-2 kez · 8-12 kontrollü tekrar · esnetmelerde 20-30 sn tut");
  const h = S.profil.hedef;
  if (h === "kas")    return T("3-4 set × 6-12 tekrar · 90-120 sn dinlenme");
  if (h === "recomp") return T("3-4 set × 8-12 tekrar · ~90 sn dinlenme");
  if (h === "perf")   return T("4-6 set × 3-6 tekrar · 2-3 dk dinlenme");
  if (h === "yag")    return T("3 set × 12-15 tekrar · 45-60 sn dinlenme");
  return T("3 set × 8-12 tekrar · 90 sn dinlenme");
}
const yerAd = y => y === "salon" ? T("Salon") : y === "ev" ? T("Ev") : T("Salon") + " · " + T("Ev");
/* Bugünün ilk güç seansı — kütüphaneden tek dokunuşla egzersiz eklemek için */
const bugunGucSeansi = () => gunSeanslari(bugun()).find(x => ((sporBul(x.spor) || {}).log || []).indexOf("set") !== -1) || null;

/* ---- Seanslar ----
   Bir gün birden fazla seans taşıyabilir ve sıra önemlidir: ısınma koşusu →
   kickboks → ağırlık → esneme. program[gün].seanslar sıralı bir listedir;
   boş liste dinlenme günü demektir. Her seansın kalıcı bir sid'i var, günlük
   kayıt buna bağlanıyor — programı düzenlemek geçmiş kaydı bozmasın diye. */
const gunSeanslari = k => ((S.program[haftaninGunu(k)] || {}).seanslar) || [];
const gunSporAdlari = k => gunSeanslari(k).map(s => T((sporBul(s.spor) || {}).ad)).filter(Boolean);
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
  if (f < 0) return { hafta: 0, limit: a.hafta1, ad: T("Başlamadan önce") };
  const h = Math.floor(f / 7);
  const c = AZALT_EGRISI[Math.min(h, AZALT_EGRISI.length - 1)];
  return { hafta: h + 1, limit: Math.max(1, Math.round(a.hafta1 * c)), ad: Tf("{n}. hafta", { n: h + 1 }) };
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
  return S.ozelBesinler.map(b => ({ ...b, grup: T("Kendi eklediklerim"), ara: sadeAd(b.ad), ozel: true }));
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
  const v = n => `<strong style="color:var(--vurgu)">${n} kcal</strong>`;
  if (!hb.kayitliGun)
    return Tf("Bu haftanın ilk kaydı. Günlük hedefin {v}.", { v: v(hedef) });
  const a = hb.atlanan ? Tf(" {n} gün kayıt girmemişsin, o günler hesaba katılmadı.", { n: hb.atlanan }) : "";
  if (hb.gunlukOneri < hedef * 0.85)
    return Tf("Bu hafta fazladan yemişsin. Kalan {n} güne yayılınca günde {v} kalıyor — aç kalman gerekmiyor, sadece toparla.{a}",
              { n: hb.kalanGun, v: v(hb.gunlukOneri), a });
  if (hb.gunlukOneri > hedef * 1.15)
    return Tf("Bu hafta hedefinin altında kalmışsın. Kalan {n} günde günde {v} yiyebilirsin.{a}",
              { n: hb.kalanGun, v: v(hb.gunlukOneri), a });
  return Tf("Yolunda gidiyor. Kalan {n} gün için günde {v}.{a}",
            { n: hb.kalanGun, v: v(hb.gunlukOneri), a });
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
    out.push({ tip: "kirmizi", m: Tf("Bugünkü takviyelerde toplam {n} mg kafein var. Sağlıklı yetişkinde yaygın kabul gören günlük sınır 400 mg — kahve ve çayı da buna ekle.", { n: toplam }) });
  else if (kafeinli.length > 1)
    out.push({ tip: "sari", m: Tf("Bugün {n} kafeinli takviye planlı ({m} mg). İkisini aynı güne koyma; birini başka güne al.", { n: kafeinli.length, m: toplam }) });

  if (toplam > 0 && antrSaat >= 17 && antrenmanVar)
    out.push({ tip: "sari", m: Tf("Antrenmanın {t} — kafeinin yarılanma ömrü 5-6 saat. Antrenmandan hemen önce alırsan gece yarısı hâlâ yarısı kanında olur. Kafeinli ürünü sabaha al.", { t: S.profil.antrSaat }) });

  const acKarnina = tk.filter(t => (t.etiket || {}).tokKarin);
  if (acKarnina.length)
    out.push({ tip: "sari", m: Tf("{a} — yağda çözünür, aç karnına emilimi düşer. Öğünle birlikte al.", { a: acKarnina.map(t => T(t.ad)).join(", ") }) });

  return out;
}

/* =================== DURUM =================== */
function varsayilan() {
  return {
    surum: 2,
    guncelleme: 0,
    profil: { dil: "",   // "" = cihaz dili; "tr" | "en" = elle seçim
              cinsiyet: "", dogumYili: null, boy: null, kilo: null, aktivite: "", hedef: "",
              kcal: null, protein: null, suHedef: 12, bardakMl: 250, kcalElle: false,
              kcalAyarTarih: "",   // son kalori önerisinin uygulandığı gün
              antrSaat: "18:00", dinlenme: 90, tamam: false,
              /* yalnız yerel kabukta anlamlı; tarayıcıda hep kapalı kalır */
              saglik: false, bildirim: false, bildirimSu: true, bildirimAntrenman: true },
    kurulumAdim: 0,
    sporlar: [],
    program: Array.from({ length: 7 }, () => ({ seanslar: [] })),
    ogunler: [],
    takviyeler: [],
    aliskanlik: null,
    gunler: {},
    olcumler: [],
    market: {},
    marketEk: [],        // kullanıcının listeye eklediği kendi kalemleri
    ozelBesinler: [],
    kayitliOgun: [],     // [{ id, ad, kalemler:[{ad,kcal,p,gram}] }] — tek dokunuşla eklenen öğün
    barkod: {},          // kod → { ad, kcal, p, k, y, pAd, pGram, sonGram } — cihazda kalan kişisel eşleme
    ipucuKapali: false,  // Bugün'deki başlangıç kartı kapatıldı mı
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
  seciliOgun: "",     // Yemek sekmesinde açık olan öğün
  panel: "",          // açık detay paneli: takviye | antrenman | aliskanlik
  mkAcik: {},         // alışverişte açık olan gruplar — kalıcı değil
  yedekMetin: ""
});

const KALICI = ["surum","guncelleme","profil","kurulumAdim","sporlar","program","ogunler","takviyeler",
                "aliskanlik","gunler","olcumler","market","marketEk","ozelBesinler","kayitliOgun",
                "barkod","ipucuKapali","sonYedek"];

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
  ["sporlar","ogunler","takviyeler","olcumler","ozelBesinler","marketEk","kayitliOgun"]
    .forEach(a => { if (!Array.isArray(S[a])) S[a] = []; });
  /* Kayıtlı öğünlerde kalem listesi bozuksa kaydı at — panelde çökmesin */
  S.kayitliOgun = S.kayitliOgun.filter(o => o && o.id && Array.isArray(o.kalemler) && o.kalemler.length);
  if (!S.gunler || typeof S.gunler !== "object") S.gunler = {};

  if (!S.barkod || typeof S.barkod !== "object") S.barkod = {};

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

  /* Egzersiz kaydı set bazına geçti. Eski satır ({ad,set:"3",tekrar:"10",kg:"60"})
     "üç kez 10×60" demekti; üç ayrı sete açıyoruz. Böylece geçmiş tonaj hesabı
     da doğru çıkıyor — tek satır tutulduğunda hacim üç katı eksik görünürdü. */
  for (const k in S.gunler) {
    const sn = ((S.gunler[k] || {}).antrenman || {}).seans || {};
    for (const id in sn) {
      const l = sn[id];
      if (!l || !Array.isArray(l.set)) continue;
      l.set = l.set.map(e => {
        if (!e || typeof e !== "object") return { ad: "", setler: bosSetler() };
        if (Array.isArray(e.setler)) return e;
        semaDegisti = true;
        const adet = Math.round(sayi(e.set));
        const n = adet >= 1 ? kis(adet, 1, 20) : 3;
        return { ad: e.ad || "",
                 setler: Array.from({ length: n },
                   () => ({ tekrar: e.tekrar || "", kg: e.kg || "", ok: !!l.yapildi })) };
      });
    }
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

function kalici() {
  const d = {}; KALICI.forEach(a => d[a] = S[a]);
  return d;
}
function kaydet() {
  /* Bugünün kaydına değişiklik damgası — bulut birleştirmesi buna bakıyor */
  const k = bugun();
  if (S.gunler[k]) S.gunler[k].d = Date.now();
  S.guncelleme = Date.now();
  if (!Depo.yaz(kalici())) toast(T("Kaydedilemedi — depolama dolu olabilir"));
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

const ilerlemeInce = (oran, renk) => {
  const y = kis(Math.round(oran * 100), 0, 100);
  return `<div class="bar ince"><div class="fill" style="width:${y}%;background:${renk || "var(--vurgu)"}"></div></div>`;
};

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
     <span><i style="background:${renk}"></i>${T("Kalori")}</span>
     <span><i style="background:var(--iyi)"></i>Protein ${Math.round(protein)} / ${hedefProtein || "—"} g</span>
   </div>`;
}

/* Basit çizgi grafiği — dış kütüphane yok.
   basamak: eksen etiketlerinin ondalık hanesi. Kilo için 1 (85.4 kg), tonaj
   gibi büyük sayılarda 0 — "12480.0 kg" okunmuyor. */
function grafik(noktalar, birim, basamak) {
  const bs = basamak == null ? 1 : basamak;
  if (noktalar.length < 2) return `<p class="bos">${T("Grafik için en az iki ölçüm gerekiyor.")}</p>`;
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
     <text class="etiket" x="0" y="${(y(v) + 3).toFixed(1)}">${v.toFixed(bs)}</text>`).join("");
  const noktaG = noktalar.map((n, i) => `<circle class="nokta" cx="${x(i).toFixed(1)}" cy="${y(n.deger).toFixed(1)}" r="3.2"/>`).join("");
  const ilkSon = `<text class="etiket" x="${sol}" y="${H - 4}">${esc(trKisa(noktalar[0].tarih))}</text>
    <text class="etiket" x="${W - sag}" y="${H - 4}" text-anchor="end">${esc(trKisa(noktalar[noktalar.length - 1].tarih))}</text>`;
  return `<svg class="grafik" viewBox="0 0 ${W} ${H}" role="img"
    aria-label="${esc(Tf("{a} {b} değerinden {c} {b} değerine değişim", { a: noktalar[0].deger, b: birim, c: noktalar[noktalar.length - 1].deger }))}">
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
  let h = `<header class="top"><p class="eyebrow">${T("Kurulum")} · ${a + 1}/${ADIM_SAYI}</p>
   <h1>${T(basliklar[a])}</h1><p class="sub">${T(altlar[a])}</p>
   <div class="adimlar">${Array.from({ length: ADIM_SAYI }, (_, i) => `<div class="adim ${i <= a ? "on" : ""}"></div>`).join("")}</div></header>`;

  h += [kAdim0, kAdim1, kAdim2, kAdim3, kAdim4, kAdim5, kAdim6, kAdim7][a]();

  const sonAdim = a === ADIM_SAYI - 1;
  h += `<div class="row" style="margin-top:14px">
    ${a > 0 ? `<button class="btn ghost" data-act="k-geri">${T("Geri")}</button>` : ""}
    <button class="btn gold" data-act="k-ileri">${sonAdim ? T("Bitir ve başla") : T("Devam")}</button></div>`;
  if ([1, 6, 7].indexOf(a) !== -1)
    h += `<button class="btn ghost blok" data-act="k-atla" style="margin-top:9px">${T("Bu adımı atla")}</button>`;
  return h;
}

function kAdim0() {
  const p = S.profil;
  return kart("", "",
    `<label class="lbl sol">Dil / Language</label>
     <div class="row" style="margin-bottom:13px">
       <button class="btn ${DIL === "tr" ? "gold" : "ghost"}" data-act="dil:tr">Türkçe</button>
       <button class="btn ${DIL === "en" ? "gold" : "ghost"}" data-act="dil:en">English</button></div>
     <label class="lbl sol">${T("Cinsiyet")}</label>
     <div class="sec-lst" style="margin-bottom:13px">
       ${secOp("k-cins:e", p.cinsiyet === "e", T("Erkek"), "")}
       ${secOp("k-cins:k", p.cinsiyet === "k", T("Kadın"), "")}</div>
     <div class="row" style="margin-bottom:11px">${alan("dogumYili", T("Doğum yılı"))}${alan("boy", T("Boy cm"))}${alan("kilo", T("Kilo kg"))}</div>
     <p class="note">${T("Vücut yağ oranı formülü cinsiyete göre değişiyor ve kadınlarda kalça ölçüsünü de kullanıyor. Bu yüzden soruyoruz — başka hiçbir yere gitmiyor.")}</p>`);
}

function kAdim1() {
  const kadin = S.profil.cinsiyet === "k";
  return kart("", "",
    `<div class="row" style="margin-bottom:11px">${alan("bel", T("Bel cm"))}${alan("boyun", T("Boyun cm"))}${kadin ? alan("kalca", T("Kalça cm")) : ""}</div>
     <p class="note">${T("Bel: göbek deliği hizasından, karnı içe çekmeden, normal nefes verdikten sonra.")}
     ${kadin ? T("Boyun: gırtlağın hemen altından, boynun en dar yerinden.")
             : T("Boyun: gırtlağın hemen altından, boynun en dar yerinden (adem elmasının altı).")}${
       kadin ? " " + T("Kalça: en geniş yerinden, ayaklar bitişik.") : ""}<br><br>
     ${T("Bunları girmezsen uygulama yine çalışır — sadece vücut yağ oranı hesaplanmaz, kilo takibi devam eder.")}</p>`);
}

function kAdim2() {
  const p = S.profil, h = hedefHesapla();
  return kart("", "",
    `<label class="lbl sol">${T("Hedef")}</label>
     <div class="sec-lst" style="margin-bottom:15px">
       ${HEDEFLER.map(x => secOp("k-hedef:" + x.id, p.hedef === x.id, T(x.ad), T(x.d))).join("")}</div>
     <label class="lbl sol">${T("Aktivite düzeyi")}</label>
     <div class="sec-lst" style="margin-bottom:13px">
       ${AKTIVITE.map(x => secOp("k-akt:" + x.id, p.aktivite === x.id, T(x.ad), T(x.d))).join("")}</div>
     <label class="lbl sol">${T("Antrenmanın genelde saat kaçta")}</label>
     <input type="time" data-fld="antrSaat" value="${esc(p.antrSaat || "18:00")}" style="margin-bottom:11px">
     ${h ? `<div class="stat"><div class="sc"><div class="sn" style="color:var(--vurgu)">${h.kcal}</div><div class="sl">${T("kcal / gün")}</div></div>
       <div class="sc"><div class="sn">${h.protein}</div><div class="sl">${T("g protein")}</div></div>
       <div class="sc"><div class="sn">${(h.suMl / 1000).toFixed(1)}</div><div class="sl">${T("litre su")}</div></div></div>
       <p class="note" style="margin-top:10px">${Tf("Günlük harcaman yaklaşık {t} kcal. Su hedefi {s} × {ml} ml. Bu hedefleri ve bardak boyutunu sonradan Ayarlar'dan değiştirebilirsin.",
         { t: h.tdee, s: h.su, ml: bardakMl() })}</p>`
      : `<p class="note">${T("Hedef ve aktiviteyi seçince kalori hedefin hesaplanacak.")}</p>`}`);
}

/* Seçim ekranları liste değil "ekle" düzeninde: 20 sporu alt alta basmak
   telefonda kaydırma işkencesi ve seçim yükü (choice overload). Ekranda
   yalnız SEÇİLENLER durur; ekleme alt sayfada, gruplu ve kapatınca biter. */
function kAdim3() {
  const secili = S.sporlar.map(sporBul).filter(Boolean);
  return kart("", "",
    (secili.length
      ? secili.map(x => satir({ ad: T(x.ad), desc: T(SPOR_TIP_AD[x.tip]), on: true, act: "k-spor:" + x.id })).join("")
      : `<p class="bos">${T("Henüz spor seçmedin.")}</p>`) +
    `<button class="btn gold blok" data-act="panel:sporSec" style="margin-top:12px">+ ${T("Spor ekle")}</button>
     <p class="note" style="margin-top:10px">${T("Birden fazla seçebilirsin; kaldırmak için üstüne dokun. Hangi gün ne yapacağını sonraki adımda ayarlarsın.")}</p>`);
}

function kAdim4() {
  if (!S.sporlar.length) return kart("", "", `<p class="bos">${T("Önce bir önceki adımda spor seç.")}</p>`);
  return kart("", "",
    `<button class="btn ghost blok" data-act="k-prog-oto" style="margin-bottom:14px">${T("Otomatik doldur")}</button>` +
    programDuzenle() +
    `<p class="note" style="margin-top:12px">${T("Bir güne birden fazla seans ekleyebilirsin ve sıra korunur — ısınma koşusu, sonra kickboks, sonra ağırlık gibi. Dinlenme günleri gün yüzdesi hesabından düşer.")}</p>`);
}

function kAdim5() {
  let h = kart("", "",
    `<div class="sec-lst">${OGUN_SABLON.map(o => secOp("k-ogun:" + o.id, S.f.ogunSablon === o.id, T(o.ad), T(o.d))).join("")}</div>`);
  if (S.ogunler.length)
    h += `<p class="sec">${T("Düzenle")}</p>` + kart("", "", ogunDuzenle() +
      `<p class="note" style="margin-top:8px">${T("Adları, saatleri ve payları değiştirebilir, öğün ekleyip çıkarabilirsin. Sonradan Ayarlar'dan da düzenlenir.")}</p>`);
  return h;
}

function kAdim6() {
  return kart("", "",
    (S.takviyeler.length
      ? S.takviyeler.map(t => satir({ ad: T(t.ad), saat: T(t.saat),
          desc: T(t.doz) + ((t.etiket || {}).kafein ? " · " + t.etiket.kafein + " " + T("mg kafein") : ""),
          on: true, act: "k-tak:" + t.id })).join("")
      : `<p class="bos">${T("Takviye kullanmıyorsan bu adımı olduğu gibi atla.")}</p>`) +
    `<button class="btn gold blok" data-act="panel:takSec" style="margin-top:12px">+ ${T("Takviye ekle")}</button>
     <p class="note" style="margin-top:12px">${T("Dozları ve hangi günler alacağını Daha → Takviyeler'den ayarlarsın. Takviye ilaç değildir ve ilacın yerine geçmez.")}</p>`);
}

function kAdim7() {
  const a = S.aliskanlik;
  return kart("", "",
    `<div class="sec-lst" style="margin-bottom:13px">
      ${ALISKANLIK_SABLON.map(x => secOp("k-alis:" + x.id, S.f.alisId === x.id, T(x.ad), x.id === "ozel" ? "" : T("Kademeli azaltma takvimi kurulur"))).join("")}</div>
     ${S.f.alisId ? `<div class="row" style="margin-bottom:11px">
        ${S.f.alisId === "ozel" ? alan("alisAd", T("Ne"), "text") : ""}
        ${alan("alisHafta1", T("Şu an haftada kaç"))}</div>
      <p class="note">${T("İlk hafta bu sayı üst sınırın olur, sonra her hafta düşer. Amaç sıfırlamak değil — bırakılabilir bir eğimle inmek.")}</p>`
      : `<p class="note">${T("Azaltmak istediğin bir şey varsa seç. Uygulama haftalık bir üst sınır koyar ve her hafta düşürür. İstemiyorsan bu adımı atla.")}</p>`}`);
}

/* =================== SEKME: BUGÜN =================== */
function vBugun() {
  const k = bugun(), g = gun(k), p = S.profil;
  const seanslar = gunSeanslari(k), adlar = gunSporAdlari(k);
  const tk = gununTakviyeleri(k), top = gunToplam(k), hb = haftaButce(k);
  const dinlenme = seanslar.length === 0;
  const ad = aliskanlikDurum(k);

  const toplamIs = tk.length + p.suHedef + seanslar.length + (S.ogunler.length || 1);
  const ogunDolu = S.ogunler.filter(o => g.yenen.some(y => y.ogun === o.id)).length;
  const biten = tk.filter(t => g.takviye[t.id]).length + Math.min(g.su, p.suHedef)
    + yapilanSeans(k) + (S.ogunler.length ? ogunDolu : (g.yenen.length ? 1 : 0));

  /* Sıkışık başlık: gün, spor ve gün yüzdesi tek satırda. Uzun yığın yerine
     hero halka + dokunulabilir kutu ızgarası — ekran kaydırmadan okunuyor. */
  let h = `<header class="top sik">
    <div class="bas-sol"><p class="eyebrow">${T(GUN_AD[haftaninGunu(k)])} · ${trKisa(k)}</p>
      <h1>${dinlenme ? T("Dinlenme") : esc(adlar.join(" + "))}</h1></div>
    <div class="bas-sag"><div class="rozet${biten >= toplamIs ? " tam" : ""}">%${Math.round(biten / toplamIs * 100)}</div>
      <span class="sl">${T("Gün")}</span></div></header>`;

  uyarilar(k).forEach(u => { h += uyariKutu(u); });

  /* İlk günlerde yol gösteren kart — üç işi tek tek söylüyor. Kapatınca
     bir daha çıkmıyor; 7 günden fazla kaydı olan zaten öğrenmiştir. */
  if (!S.ipucuKapali && Object.keys(S.gunler).length <= 7)
    h += kart(T("Buradan başla"), "",
      `<p class="note" style="margin-bottom:6px">1 · ${T("Yediğini ekle — aşağıdaki yeşil düğme. Tahmin etme, ara; listede yoksa elle gir.")}</p>
       <p class="note" style="margin-bottom:6px">2 · ${T("Su içtikçe mavi kutudaki + işaretine bas.")}</p>
       <p class="note" style="margin-bottom:11px">3 · ${T("Antrenmanı yapınca seansı işaretle — setleri girersen rekorlarını da takip ederiz.")}</p>
       <div class="row">
         <button class="btn ghost" data-act="panel-git:daha:rehber">${T("Rehber'i aç")}</button>
         <button class="btn" data-act="ipucu-kapat">${T("Anladım")}</button></div>`);

  /* Hero — günün kalorisi */
  h += `<div class="hero">
    ${halka(top.kcal, p.kcal, top.p, p.protein)}
    ${hb ? `<p class="note hero-not">${butceMesaj(hb)}</p>` : ""}
    <button class="btn gold blok" data-act="yem-hizli">${T("Yemek ekle")}</button></div>`;

  /* Kutu ızgarası */
  const kutular = [];

  kutular.push(`<div class="kutu su-kutu">
    <p class="kutu-t">${T("Su")}</p>
    <p class="kutu-n" style="color:var(--su)">${(g.su * bardakMl() / 1000).toFixed(1)}<small>L</small></p>
    <p class="kutu-alt">${g.su} / ${p.suHedef} × ${bardakMl()} ml</p>
    ${ilerlemeInce(p.suHedef ? g.su / p.suHedef : 0, "var(--su)")}
    <div class="kutu-ara">
      <button class="mini" data-act="su-" aria-label="${T("azalt")}">−</button>
      <button class="mini artir" data-act="su+" aria-label="${T("artır")}">+</button></div></div>`);

  if (!dinlenme)
    kutular.push(`<button class="kutu" data-act="panel:antrenman">
      <p class="kutu-t">${T("Antrenman")}</p>
      <p class="kutu-n">${yapilanSeans(k)}<small>/${seanslar.length}</small></p>
      <p class="kutu-alt">${esc(adlar.join(" · "))}</p>
      ${ilerlemeInce(seanslar.length ? yapilanSeans(k) / seanslar.length : 0)}</button>`);

  if (tk.length) {
    const alinan = tk.filter(t => g.takviye[t.id]).length;
    kutular.push(`<button class="kutu" data-act="panel:takviye">
      <p class="kutu-t">${T("Takviye")}</p>
      <p class="kutu-n">${alinan}<small>/${tk.length}</small></p>
      <p class="kutu-alt">${alinan === tk.length ? T("Hepsi alındı") : esc(tk.filter(t => !g.takviye[t.id]).map(t => T(t.ad)).join(", "))}</p>
      ${ilerlemeInce(alinan / tk.length, "var(--iyi)")}</button>`);
  }

  if (ad) {
    const hafta = aliskanlikHafta(k), asti = hafta > ad.limit;
    kutular.push(`<button class="kutu" data-act="panel:aliskanlik">
      <p class="kutu-t">${esc(T(S.aliskanlik.ad))}</p>
      <p class="kutu-n" style="color:${asti ? "var(--kotu)" : "var(--iyi)"}">${hafta}<small>/${ad.limit}</small></p>
      <p class="kutu-alt">${T("7 günde")} · ${esc(ad.ad)}</p>
      ${ilerlemeInce(ad.limit ? hafta / ad.limit : 0, asti ? "var(--kotu)" : "var(--iyi)")}</button>`);
  }

  const sr = seri();
  const bugunDolu = g.yenen.length > 0 || (g.su || 0) > 0 || antrenmanYapildi(k);
  kutular.push(`<button class="kutu" data-act="tab:ilerleme">
    <p class="kutu-t">${T("Seri")}</p>
    <p class="kutu-n">${sr}<small>${T("gün")}</small></p>
    <p class="kutu-alt">${sr > 1 ? (bugunDolu ? T("Üst üste kayıt girdin") : T("Bugün bir kayıt gir, seri sürsün")) : T("Bugün kayıt gir, seri başlasın")}</p>
    ${ilerlemeInce(Math.min(sr / 30, 1), "var(--vurgu)")}</button>`);

  h += `<div class="izgara">${kutular.join("")}</div>`;
  return h;
}

/* Üst üste kaç gün kayıt girildi — yemek, su ya da antrenman sayılır.
   Bugün henüz boşsa seri kırılmış sayılmaz, dünden geriye bakılır. */
function seri() {
  const dolu = t => {
    const g = S.gunler[t];
    if (!g) return false;
    return (g.yenen || []).length > 0 || (g.su || 0) > 0 || antrenmanYapildi(t);
  };
  let k = bugun(), n = 0;
  if (!dolu(k)) k = gunEkle(k, -1);
  while (dolu(k) && n < 3650) { n++; k = gunEkle(k, -1); }
  return n;
}

/* =================== SEKME: YEMEK =================== */
function vYemek() {
  const k = bugun(), g = gun(k), p = S.profil, top = gunToplam(k), hb = haftaButce(k);

  let h = `<header class="top"><p class="eyebrow">${trT(k)}</p><h1>${T("Yemek")}</h1>
   <p class="sub">${top.kcal} / ${p.kcal || "—"} kcal · ${Math.round(top.p)} / ${p.protein || "—"} g protein</p>
   ${ilerleme(p.kcal ? top.kcal / p.kcal : 0, top.kcal > p.kcal ? "var(--kotu)" : "var(--vurgu)")}</header>`;

  if (hb)
    h += kart(T("Haftalık bütçe"), Tf("{n} gün kaldı", { n: hb.kalanGun }),
      `<div class="stat"><div class="sc"><div class="sn">${(hb.oncekiler / 1000).toFixed(1)}k</div><div class="sl">${T("Yenen")}</div></div>
        <div class="sc"><div class="sn" style="color:var(--vurgu)">${hb.gunlukOneri}</div><div class="sl">${T("Günlük öneri")}</div></div>
        <div class="sc"><div class="sn">${(hb.haftaHedef / 1000).toFixed(1)}k</div><div class="sl">${T("Hafta bütçesi")}</div></div></div>
       <p class="note" style="margin-top:11px">${butceMesaj(hb)}</p>`);

  /* Öğün seçici — altı kartı alt alta yığmak yerine yatay şerit. Seçili
     öğünün kalemleri altında açılıyor, ekran kısa kalıyor. */
  const slot = ogunSlotlari();
  if (!S.seciliOgun || !slot.some(o => o.id === S.seciliOgun)) S.seciliOgun = slot[0].id;
  const aktif = slot.find(o => o.id === S.seciliOgun) || slot[0];

  h += `<div class="serit">${slot.map(o => {
    const kal = g.yenen.filter(y => y.ogun === o.id);
    const sK = kal.reduce((a, y) => a + y.kcal, 0);
    return `<button class="serit-op ${o.id === aktif.id ? "on" : ""}" data-act="ogun-sec:${esc(o.id)}">
      <span class="serit-ad">${esc(o.ad)}</span>
      <span class="serit-n">${sK}</span>
      <span class="serit-alt">${o.saat ? esc(o.saat) : "kcal"}</span></button>`;
  }).join("")}</div>`;

  {
    const kalemler = g.yenen.filter(y => y.ogun === aktif.id);
    const dun = ((S.gunler[gunEkle(k, -1)] || {}).yenen || []).filter(y => y.ogun === aktif.id);
    const sK = kalemler.reduce((a, y) => a + y.kcal, 0), sP = kalemler.reduce((a, y) => a + y.p, 0);
    const hedefK = p.kcal ? Math.round(p.kcal * ogunOran(aktif)) : null;
    const slotAsti = hedefK && sK > hedefK * 1.15;
    h += kart(esc(aktif.ad) + (aktif.saat ? " · " + esc(aktif.saat) : ""),
      hedefK ? `<span${slotAsti ? ' style="color:var(--uyari)"' : ""}>${sK}</span> / ${hedefK} kcal` : `${sK} kcal`,
      (kalemler.length
        ? kalemler.map(y => `<div class="item" data-act="yem-duzenle:${esc(y.uid)}">
            <div class="ib"><div class="it"><span class="name">${esc(y.ad)}</span>${y.gram ? `<span class="time">${y.gram} g</span>` : ""}</div>
            <div class="macro">${y.kcal} kcal · ${(+y.p).toFixed(1)} g protein</div></div>
            <div class="uc"><button class="sil" data-act="yem-sil:${esc(y.uid)}" aria-label="${T("sil")}">×</button></div></div>`).join("")
        : `<p class="bos">${T("Henüz bir şey eklemedin.")}</p>`) +
      (kalemler.length ? `<div class="macro" style="margin:10px 0 10px">${Tf("Toplam {k} kcal · {p} g protein", { k: sK, p: sP.toFixed(1) })}</div>` : "") +
      `<button class="btn gold blok" data-act="yem-ac:${esc(aktif.id)}">${T("Yemek ekle")}</button>` +
      /* Tekrar eden öğünü yeniden aratmak, kalori takibini bırakmanın bir
         numaralı sebebi. İki kestirme: dünü tekrarla, öğünü şablon olarak
         kaydet.                                                            */
      (!kalemler.length && dun.length
        ? `<button class="btn ghost blok" data-act="yem-dun:${esc(aktif.id)}" style="margin-top:9px">${
            Tf("Dünü tekrarla · {n} kalem · {k} kcal", { n: dun.length, k: dun.reduce((a, y) => a + y.kcal, 0) })}</button>` : "") +
      (kalemler.length
        ? `<button class="btn ghost blok" data-act="ogun-kaydet:${esc(aktif.id)}" style="margin-top:9px">${T("Bu öğünü kaydet")}</button>` : ""));
  }

  /* Öğün düzeni değişince eski kayıtlar hiçbir slota denk gelmeyebilir.
     Görünmez kalmasınlar — toplamlara zaten giriyorlar. */
  const bilinen = new Set(ogunSlotlari().map(o => o.id));
  const oksuz = g.yenen.filter(y => !bilinen.has(y.ogun));
  if (oksuz.length)
    h += kart(T("Öğün dışı"), `${oksuz.reduce((a, y) => a + y.kcal, 0)} kcal`,
      oksuz.map(y => `<div class="item" data-act="yem-duzenle:${esc(y.uid)}">
        <div class="ib"><div class="it"><span class="name">${esc(y.ad)}</span>${y.gram ? `<span class="time">${y.gram} g</span>` : ""}</div>
        <div class="macro">${y.kcal} kcal · ${(+y.p).toFixed(1)} g protein</div></div>
        <div class="uc"><button class="sil" data-act="yem-sil:${esc(y.uid)}" aria-label="${T("sil")}">×</button></div></div>`).join("") +
      `<p class="note" style="margin-top:10px">${T("Bu kayıtlar artık var olmayan bir öğüne aitti. Silebilir ya da olduğu gibi bırakabilirsin — günlük toplama dahiller.")}</p>`);

  return h;
}

const ogunSlotlari = () => S.ogunler.length
  ? S.ogunler : [{ id: "genel", ad: T("Bugün yediklerim"), saat: "", p: 1 }];

/* p bir ağırlıktır, mutlak oran değil: kullanıcı yüzdeleri elle değiştirdiğinde
   toplam 100 tutmak zorunda kalmasın diye okurken normalleştiriyoruz. Şablonlar
   zaten 1'e toplandığı için eski kayıtlar aynen çalışır. */
function ogunOran(o) {
  const t = ogunSlotlari().reduce((a, x) => a + (+x.p > 0 ? +x.p : 0), 0);
  if (!t) return 1 / ogunSlotlari().length;
  return (+o.p > 0 ? +o.p : 0) / t;
}
const yeniOid = () => "o" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
const yeniKid = () => "m" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);

/* ---- Kayıtlı öğünler ----
   Çoğu insan sabah aynı şeyi yiyor. Aynı beş kalemi her gün baştan aratmak,
   kalori takibini bırakmanın bir numaralı sebebi; bir kez kaydedip tek
   dokunuşla ekliyoruz.                                                     */
const kayitToplam = m => m.kalemler.reduce(
  (a, y) => ({ kcal: a.kcal + (+y.kcal || 0), p: a.p + (+y.p || 0) }), { kcal: 0, p: 0 });

function ogunKaydet(oid) {
  const kalemler = gun().yenen.filter(y => y.ogun === oid)
    .map(y => ({ ad: y.ad, kcal: +y.kcal || 0, p: +y.p || 0, gram: +y.gram || 0 }));
  if (!kalemler.length) return null;
  const slot = ogunSlotlari().find(o => o.id === oid);
  const ad = `${slot ? slot.ad : T("Öğün")} · ${kalemler[0].ad}${kalemler.length > 1 ? " +" + (kalemler.length - 1) : ""}`;
  const kayit = { id: yeniKid(), ad, kalemler };
  S.kayitliOgun.unshift(kayit);
  if (S.kayitliOgun.length > 30) S.kayitliOgun.length = 30;
  return kayit;
}

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
        <input type="text" data-ogun="${i}:ad" value="${esc(o.ad)}" placeholder="${T("Öğün adı")}"
          style="text-align:left;flex:1;min-width:0;padding:8px 10px;font-size:14px">
        <span class="seans-ara">
          ${i > 0 ? `<button class="seans-ok" data-act="ogun-tasi:${i}:-1" aria-label="${T("yukarı taşı")}">↑</button>` : ""}
          ${i < S.ogunler.length - 1 ? `<button class="seans-ok" data-act="ogun-tasi:${i}:1" aria-label="${T("aşağı taşı")}">↓</button>` : ""}
          ${S.ogunler.length > 1 ? `<button class="sil" data-act="ogun-sil:${i}" aria-label="${T("kaldır")}">×</button>` : ""}
        </span></div>
      <div class="row">
        <div class="alan"><label class="lbl">${T("Saat")}</label>
          <input type="time" data-ogun="${i}:saat" value="${esc(o.saat || "")}"></div>
        <div class="alan"><label class="lbl">${T("Pay %")}</label>
          <input type="number" inputmode="numeric" data-ogun="${i}:p" value="${yuzde(o)}"></div>
        <div class="alan"><label class="lbl">${T("Hedef")}</label>
          <input type="text" id="og-hedef-${i}" value="${hedefK ? Math.round(hedefK * ogunOran(o)) + " kcal" : "—"}" readonly
            style="text-align:center;color:var(--vurgu);border-style:dashed"></div>
      </div></div>`).join("")}
    <div class="row" style="margin-top:10px">
      <button class="btn ghost" data-act="ogun-ekle">${T("+ Öğün ekle")}</button>
      <button class="btn ghost" data-act="ogun-esit">${T("Eşit dağıt")}</button></div>
    <p class="note" style="margin-top:10px">${Tf("Paylar günlük kalorinin dağılımı. Toplam {t} — 100 tutmasa da sorun değil, oranlar orantılı dağıtılır ve gerçek hedef sağdaki sütunda görünür.",
      { t: `<strong id="og-toplam">${toplamYuzde}%</strong>` })}</p>`;
}

/* ---------------------------------------------------------------------
   Yemek ekleme paneli.

   Sayfaya kart olarak eklenmiyor, sayfanın ÜSTÜNE oturuyor (position:fixed).
   Önceden gramaj kartı uzun sayfanın en altına basılıyordu; kullanıcı bir
   besine dokununca kart görüş alanının dışında kalıyor ve hiçbir şey olmamış
   gibi görünüyordu. Panel sabit olduğu için o hata sınıfı tamamen kalkıyor.
   --------------------------------------------------------------------- */
/* Panel iskeleti. Yemek ekleme, takviye, antrenman ve alışkanlık detayları
   hep bunun içinde açılıyor — ana ekran kısa kalsın diye. */
function panelSar(baslik, govde, alt) {
  return `<div class="perde" data-act="panel-kapat"></div>
    <div class="sayfa"><div class="tut"></div>
      <div class="sayfa-bas"><p class="card-t">${esc(baslik)}</p>
        <button class="sayfa-kapa" data-act="panel-kapat" aria-label="${T("kapat")}">×</button></div>
      <div class="sayfa-govde">${govde}</div>
      ${alt ? `<div class="sayfa-alt">${alt}</div>` : ""}</div>`;
}

function panelHtml() {
  if (S.araHedef) return yemekPaneli();
  const k = bugun(), g = gun(k);

  if (S.panel === "takviye") {
    const tk = gununTakviyeleri(k);
    return panelSar(T("Bugünkü takviyeler"),
      tk.map(t => satir({ ad: T(t.ad), saat: T(t.saat), desc: T(t.doz), macro: T(t.not),
                          on: !!g.takviye[t.id], act: "tak:" + t.id })).join("") || `<p class="bos">${T("Takviye seçili değil.")}</p>`,
      `<button class="btn ghost blok" data-act="panel-git:daha:takviye">${T("Takviyeleri düzenle")}</button>`);
  }

  if (S.panel === "antrenman") {
    const seanslar = gunSeanslari(k);
    return panelSar(T("Bugünkü antrenman"),
      seanslar.map((s, i) => {
        const sp = sporBul(s.spor);
        return satir({ ad: `${i + 1}. ${sp ? T(sp.ad) : s.spor}`, saat: s.sure ? s.sure + " " + T("dk") : "",
                       desc: T(s.sablon) || "", on: !!seansOku(k, s.sid).yapildi, act: "seans-tik:" + s.sid });
      }).join("") || `<p class="bos">${T("Bugün dinlenme günü.")}</p>`,
      `<button class="btn gold blok" data-act="panel-git:antrenman:">${T("Detay gir")}</button>`);
  }

  if (S.panel === "sporSec") {
    const gruplar = {};
    SPORLAR.forEach(x => { (gruplar[x.tip] = gruplar[x.tip] || []).push(x); });
    let ic = "";
    for (const t in gruplar)
      ic += `<p class="sec">${T(SPOR_TIP_AD[t])}</p><div class="sec-lst">${
        gruplar[t].map(x => secOp("k-spor:" + x.id, S.sporlar.indexOf(x.id) !== -1, T(x.ad), "")).join("")}</div>`;
    return panelSar(T("Spor ekle"), ic,
      `<button class="btn gold blok" data-act="panel-kapat">${T("Tamam")}</button>`);
  }

  if (S.panel === "takSec") {
    return panelSar(T("Takviye ekle"),
      `<div class="sec-lst">${TAKVIYELER.map(t => secOp("k-tak:" + t.id, S.takviyeler.some(x => x.id === t.id), T(t.ad),
        T(t.doz) + " · " + T(t.saat) + ((t.etiket || {}).kafein ? " · " + t.etiket.kafein + " " + T("mg kafein") : ""))).join("")}</div>`,
      `<button class="btn gold blok" data-act="panel-kapat">${T("Tamam")}</button>`);
  }

  if (S.panel === "nasil") {
    const eg = kutBul(S.f.nasilAd);
    if (eg) return panelSar(T(eg.ad),
      `<div class="row wrapped" style="gap:7px;margin-bottom:12px">
         <span class="chip gold">${T(BOLGE_AD[eg.bolge])}</span>
         <span class="chip">${yerAd(eg.yer)}</span></div>
       <p class="gv" style="margin:0 0 12px">${esc(T(eg.nasil))}</p>
       <p class="macro">${T("Senin hedefin için")}: ${setOner(eg.bolge)}</p>`,
      `<button class="btn ghost blok" data-act="panel-git:daha:kutuphane">${T("Egzersizler")}</button>`);
  }

  if (S.panel === "aliskanlik" && S.aliskanlik) {
    const d = aliskanlikDurum(k), hafta = aliskanlikHafta(k), asti = hafta > d.limit;
    return panelSar(T(S.aliskanlik.ad),
      `<div class="stat" style="margin-bottom:14px">
        <div class="sc"><div class="sn">${g.aliskanlik}</div><div class="sl">${T("Bugün")}</div></div>
        <div class="sc"><div class="sn" style="color:${asti ? "var(--kotu)" : "var(--iyi)"}">${hafta}</div><div class="sl">${T("7 günde")}</div></div>
        <div class="sc"><div class="sn">${d.limit}</div><div class="sl">${T("Sınır")}</div></div></div>
       <p class="note">${Tf("{h} · bu hafta en fazla {n} {b}", { h: esc(d.ad), n: d.limit, b: esc(T(S.aliskanlik.birim)) })}${
         asti ? T(" — sınırı aştın, gelecek hafta sıfırdan başlıyorsun.") : "."}</p>`,
      `<div class="row"><button class="btn ghost sm" data-act="alis-" aria-label="${T("azalt")}">−</button>
       <button class="btn" data-act="alis+">+ 1 ${esc(T(S.aliskanlik.birim))}</button></div>`);
  }
  return "";
}

function yemekPaneli() {
  if (!S.araHedef) return "";
  const hedefAd = (ogunSlotlari().find(o => o.id === S.araHedef) || {}).ad || "";
  const perde = `<div class="perde" data-act="ara-kapat"></div>`;
  const kapat = `<button class="sayfa-kapa" data-act="ara-kapat" aria-label="${T("kapat")}">×</button>`;

  /* 3. adım — elle girilen kalemi düzenle */
  if (S.f.elleDuzenle)
    return perde + `<div class="sayfa"><div class="tut"></div>
      <div class="sayfa-bas"><p class="card-t">${T("Düzenle")}</p>${kapat}</div>
      <div class="sayfa-govde">
        <div class="row" style="margin-bottom:10px">${alan("elAd", T("Ne yedin"), "text")}</div>
        <div class="row">${alan("elKcal", "kcal")}${alan("elP", T("Protein g"))}</div>
      </div>
      <div class="sayfa-alt"><div class="row">
        <button class="btn ghost" data-act="besin-iptal">${T("Geri")}</button>
        <button class="btn gold" data-act="el-guncelle">${T("Kaydet")}</button></div></div></div>`;

  /* 2b. adım — tanınmayan barkod. Ürünü bir kez tanımlıyorsun, eşleşme
     cihazda kalıyor; ikinci taramada doğrudan miktara geçiyor. */
  if (S.f.barkodKod)
    return perde + `<div class="sayfa"><div class="tut"></div>
      <div class="sayfa-bas"><p class="card-t">${T("Yeni barkod")}</p>${kapat}</div>
      <div class="sayfa-govde">
        <p class="panel-ad">${esc(S.f.barkodKod)}</p>
        <p class="note" style="margin-bottom:14px">${T("Bu kodu tanımıyoruz — ambalajdaki besin değeri tablosundan gir. Bir daha taradığında doğrudan miktara geçecek. Değerler yalnızca senin cihazında saklanıyor.")}</p>
        <div class="row" style="margin-bottom:10px">${alan("bkAd", T("Ürün adı"), "text")}</div>
        <div class="row" style="margin-bottom:10px">${alan("bkKcal", T("100 g'da kcal"))}${alan("bkP", T("100 g'da protein"))}</div>
        <div class="row">${alan("bkGram", T("Bir porsiyon / paket kaç g"))}</div>
      </div>
      <div class="sayfa-alt"><div class="row">
        <button class="btn ghost" data-act="besin-iptal">${T("Geri")}</button>
        <button class="btn gold" data-act="bk-kaydet">${T("Kaydet")}</button></div></div></div>`;

  /* 2. adım — miktar */
  if (S.f.besin) {
    const b = S.f.besin, c = besinHesap();
    const carpanlar = [0.5, 1, 1.5, 2, 3];
    const secili = sayi(S.f.besinGram);
    const chipler = carpanlar.map(x => {
      const gr = Math.round(b.pGram * x);
      const on = Math.abs(secili - gr) < 0.5;
      const kesir = { 0.5: "½", 1.5: "1½" }[x] || String(x);
      const etiket = `${kesir} ${b.ozel ? T("porsiyon") : b.pAd}`;
      return `<button class="chip ${on ? "gold" : ""}" data-act="porsiyon:${gr}">${esc(etiket)}${b.ozel ? "" : ` · ${gr} g`}</button>`;
    }).join("");
    return perde + `<div class="sayfa"><div class="tut"></div>
      <div class="sayfa-bas"><p class="card-t">${S.f.duzenleUid ? T("Düzenle") : T("Miktar")}</p>${kapat}</div>
      <div class="sayfa-govde">
        <p class="panel-ad">${esc(b.ad)}</p>
        <p class="macro" style="margin:0 0 14px">${esc(b.grup)}${b.ozel ? "" : ` · ${Tf("100 g'da {k} kcal, {p} g protein", { k: b.kcal, p: b.p })}`}</p>
        <div class="row wrapped" style="gap:7px;margin-bottom:14px">${chipler}</div>
        ${b.ozel ? "" : `<div class="row" style="margin-bottom:14px">${alan("besinGram", T("Gram"))}</div>`}
        <div class="stat">
          <div class="sc"><div class="sn" id="bg-kcal" style="color:var(--vurgu)">${c.kcal}</div><div class="sl">kcal</div></div>
          <div class="sc"><div class="sn" id="bg-p">${c.p}</div><div class="sl">${T("Protein g")}</div></div>
          <div class="sc"><div class="sn" id="bg-ky">${c.ky}</div><div class="sl">${T("Karb / Yağ")}</div></div></div>
      </div>
      <div class="sayfa-alt"><div class="row">
        <button class="btn ghost" data-act="besin-iptal">${T("Geri")}</button>
        <button class="btn gold" data-act="besin-ekle">${S.f.duzenleUid ? T("Kaydet") : T("Ekle")}</button></div></div></div>`;
  }

  /* 1. adım — arama */
  return perde + `<div class="sayfa"><div class="tut"></div>
    <div class="sayfa-bas"><p class="card-t">${esc(hedefAd)} · ${T("yemek ekle")}</p>${kapat}</div>
    <div class="sayfa-govde">
      <input type="text" data-ara="1" value="${esc(S.ara)}" placeholder="${T("Ara — tavuk, pilav, muz…")}"
        style="text-align:left" autocomplete="off" autocapitalize="off" spellcheck="false">
      ${Yerel.barkodVar() ? `<button class="btn ghost blok" data-act="barkod" style="margin-top:9px">${T("Barkod tara")}</button>` : ""}
      <div id="ara-liste">${araListeHtml()}</div>
      <p class="sec">${T("Listede yoksa elle ekle")}</p>
      <div class="row" style="margin-bottom:9px">${alan("elAd", T("Ne yedin"), "text")}</div>
      <div class="row" style="margin-bottom:11px">${alan("elKcal", "kcal")}${alan("elP", T("Protein g"))}</div>
      <button class="btn blok" data-act="el-ekle">${T("Elle ekle ve kaydet")}</button>
      <p class="note" style="margin-top:9px">${T("Elle eklediğin yemek listene kaydedilir, bir dahaki sefere aramada çıkar.")}</p>
    </div></div>`;
}

function araListeHtml() {
  const sonuc = besinAra(S.ara);
  const bos = S.ara.length < 2;
  const son = bos ? sonBesinler(8) : [];
  const kayit = bos ? S.kayitliOgun : [];
  return `${sonuc.length ? `<div class="ara-sonuc">${sonuc.map((b, i) =>
      `<button class="ara-op" data-act="bes-sec:${i}"><span class="ib"><span class="name">${esc(b.ad)}</span>
        <span class="macro">${esc(b.grup)} · ${esc(b.pAd)} ${b.pGram} g</span></span>
       <span class="ara-sag">${Math.round(b.kcal * b.pGram / 100)} kcal</span></button>`).join("")}</div>` : ""}
    ${(S.ara.length >= 2 && !sonuc.length) ? `<p class="bos">${T("Bulunamadı. Aşağıdan elle ekleyebilirsin.")}</p>` : ""}
    ${kayit.length ? `<p class="sec" style="margin:16px 0 4px">${T("Kayıtlı öğünler")}</p>
      <div class="ara-sonuc" style="padding:0 13px">${kayit.map((m, i) => { const t = kayitToplam(m); return `<div class="item" data-act="kyt-ekle:${i}">
        <div class="ib"><div class="it"><span class="name">${esc(m.ad)}</span>
          <span class="time">${Tf("{n} kalem", { n: m.kalemler.length })}</span></div>
          <div class="macro">${Math.round(t.kcal)} kcal · ${t.p.toFixed(1)} g protein</div></div>
        <div class="uc"><button class="sil" data-act="kyt-sil:${i}" aria-label="${T("sil")}">×</button></div></div>`; }).join("")}</div>` : ""}
    ${son.length ? `<p class="sec" style="margin:16px 0 4px">${T("Son eklediklerin")}</p>
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
  return v == null ? "" : Tf("Hesaplanan yağ oranı: %{n}", { n: `<strong style="color:var(--vurgu)">${v.toFixed(1)}</strong>` });
}

/* =================== SEKME: ANTRENMAN =================== */
function vAntrenman() {
  const k = bugun(), seanslar = gunSeanslari(k), adlar = gunSporAdlari(k);
  let h = `<header class="top"><p class="eyebrow">${T(GUN_AD[haftaninGunu(k)])}</p>
   <h1>${seanslar.length ? esc(adlar.join(" + ")) : T("Dinlenme")}</h1>
   <p class="sub">${seanslar.length
     ? Tf("{n} seans · {m} dk planlı", { n: seanslar.length, m: gunToplamSure(k) })
     : T("Toparlanma antrenmanın parçası")}</p></header>`;

  if (!seanslar.length)
    h += kart("", "", `<p class="bos">${T("Bugün dinlenme günü. Programı aşağıdan değiştirebilirsin.")}</p>`);

  seanslar.forEach((s, i) => {
    const spor = sporBul(s.spor);
    if (!spor) return;
    const log = seansOku(k, s.sid);
    const alanlar = spor.log.filter(x => x !== "set");
    let ic = satir({ ad: T("Yaptım"), saat: s.sure ? Tf("{n} dk planlı", { n: s.sure }) : "", desc: T(s.sablon) || "",
                     on: !!log.yapildi, act: "seans-tik:" + s.sid });
    if (alanlar.length)
      ic += `<div class="row wrapped" style="margin-top:12px">${alanlar.map(x =>
        `<div class="alan"><label class="lbl" for="in-${s.sid}-${x}">${T(LOG_ALAN[x].ad)}${LOG_ALAN[x].birim ? " " + T(LOG_ALAN[x].birim) : ""}</label>
         <input id="in-${s.sid}-${x}" type="number" inputmode="decimal" data-log="${s.sid}:${x}"
          value="${esc(log[x] == null ? "" : log[x])}" placeholder="—"></div>`).join("")}</div>`;
    h += kart(`${i + 1}. ${esc(T(spor.ad))}`, T(SPOR_TIP_AD[spor.tip]) || "", ic);

    if (spor.log.indexOf("set") !== -1) {
      /* Şablonu ilk açılışta satırlara çevir — sonra kullanıcı üzerine yazar */
      const w = seansYaz(k, s.sid);
      if (!Array.isArray(w.set) || !w.set.length) {
        const sb = GUC_SABLON[s.sablon];
        w.set = (sb || ["", "", ""]).map(ad => ({ ad: T(ad), setler: bosSetler() }));
        kaydetGecikmeli();
      }
      const onceki = gecenAntrenman(s.spor);
      h += kart(T("Egzersizler"), s.sablon ? esc(T(s.sablon)) : "",
        w.set.map((e, ei) => {
          const setler = e.setler || [];
          const rekor = egzersizRekor(e.ad, k), enIyi = setlerEnIyi(setler);
          const yeniRekor = enIyi != null && (!rekor || enIyi > rekor.v + 0.05);
          const alt = [onceki[e.ad] ? T("Geçen sefer") + " " + setOzet(onceki[e.ad]) : "",
                       rekor ? Tf("Rekor {kg} kg × {t} · 1RM ~{v} kg", { kg: rekor.kg, t: rekor.tekrar, v: Math.round(rekor.v) }) : "",
                       (enIyi != null && !yeniRekor) ? Tf("Bugün 1RM ~{v} kg", { v: Math.round(enIyi) }) : ""].filter(Boolean).join(" · ");
          return `<div class="gr">
          <div class="row" style="margin-bottom:9px">
            <div class="alan"><input type="text" data-set="${s.sid}:${ei}:ad" value="${esc(e.ad)}" placeholder="${T("Egzersiz")}" style="text-align:left"></div>
            ${kutBul(e.ad) ? `<button class="chip" data-act="nasil:${s.sid}:${ei}" aria-label="${T("nasıl yapılır")}"
              style="cursor:pointer;padding:9px 13px;flex:none">?</button>` : ""}
            <button class="sil" data-act="set-sil:${s.sid}:${ei}" aria-label="${T("egzersizi sil")}">×</button></div>
          <div class="setr-bas"><span>Set</span><span>${T("Tekrar")}</span><span>Kg</span><span></span></div>
          ${setler.map((st, si) => `<div class="setr${st.ok ? " ok" : ""}">
            <span class="setr-n">${si + 1}</span>
            <input type="number" inputmode="numeric" data-setr="${s.sid}:${ei}:${si}:tekrar" value="${esc(st.tekrar)}" placeholder="—">
            <input type="number" inputmode="decimal" data-setr="${s.sid}:${ei}:${si}:kg" value="${esc(st.kg)}" placeholder="—">
            <button class="setr-ok${st.ok ? " on" : ""}" data-act="setr-ok:${s.sid}:${ei}:${si}" aria-label="${T("seti tamamla")}">${TIK}</button>
          </div>`).join("")}
          <div class="row wrapped" style="gap:7px;margin-top:4px">
            <button class="chip" data-act="setr-ekle:${s.sid}:${ei}" style="cursor:pointer;padding:9px 12px">+ Set</button>
            ${setler.length > 1 ? `<button class="chip" data-act="setr-sil:${s.sid}:${ei}" style="cursor:pointer;padding:9px 12px">− Set</button>` : ""}</div>
          ${yeniRekor ? `<div class="row wrapped" style="gap:7px;margin-top:9px"><span class="chip gold">${Tf("Yeni rekor · 1RM ~{v} kg", { v: Math.round(enIyi) })}</span></div>` : ""}
          ${alt ? `<div class="macro">${esc(alt)}</div>` : ""}</div>`; }).join("") +
        `<div class="row wrapped" style="gap:7px;margin-top:12px">
           <span class="sl" style="align-self:center;margin:0 4px 0 0">${T("Set arası")}</span>
           ${[60, 90, 120, 180].map(sn => `<button class="chip${dinlenmeSn() === sn ? " gold" : ""}" data-act="dinlenme:${sn}"
             style="cursor:pointer;padding:9px 12px">${sn < 120 ? sn + " " + T("sn") : (sn / 60) + " " + T("dk")}</button>`).join("")}</div>
         <div class="row" style="margin-top:10px">
           <button class="btn ghost" data-act="set-ekle:${s.sid}">${T("Egzersiz ekle")}</button>
           ${Object.keys(onceki).length ? `<button class="btn ghost" data-act="set-doldur:${s.sid}">${T("Geçen seferi doldur")}</button>` : ""}</div>
         <p class="note" style="margin-top:10px">${T("Seti bitirince sağdaki kutuyu işaretle — dinlenme sayacı kendiliğinden başlar. Her hafta ya bir tekrar ya biraz kilo ekle; aynı ağırlıkla aynı tekrar gelişme değil bakımdır.")}</p>`);
    }
  });

  /* Haftalık program */
  h += `<p class="sec">${T("Haftalık program")}</p>`;
  h += kart("", "", programDuzenle() +
    `<div class="row" style="margin-top:14px">
       <button class="btn ghost" data-act="spor-duzenle">${T("Sporları düzenle")}</button>
       <button class="btn ghost" data-act="panel-git:daha:kutuphane">${T("Egzersizler")}</button></div>`);

  /* Haftalık hacim — progresif yükleme gerçekten oluyor mu, aylık ölçekte.
     Tek seansa bakınca göremezsin; hacim eğrisi yatay gidiyorsa ilerlemiyorsun. */
  const hacim = haftaHacim(8);
  if (hacim.filter(x => x.set > 0).length >= 2) {
    const son = hacim[hacim.length - 1], onceki = hacim[hacim.length - 2];
    const fark = onceki.deger ? Math.round((son.deger - onceki.deger) / onceki.deger * 100) : null;
    h += kart(T("Haftalık hacim"), T("son 8 hafta"),
      `<div class="stat" style="margin-bottom:12px">
        <div class="sc"><div class="sn" style="color:var(--vurgu)">${(son.deger / 1000).toFixed(1)}t</div><div class="sl">${T("Bu hafta tonaj")}</div></div>
        <div class="sc"><div class="sn">${son.set}</div><div class="sl">Set</div></div>
        <div class="sc"><div class="sn">${son.seans}</div><div class="sl">${T("Seans")}</div></div></div>
       ${grafik(hacim, "kg", 0)}
       <p class="note" style="margin-top:11px">${T("Tonaj = tekrar × kg toplamı.")}${
         fark == null ? "" : Tf(" Geçen haftaya göre {p}%.", { p: (fark > 0 ? "+" : "") + fark })}
       ${T("Vücut ağırlığı hareketleri tonaja girmiyor — onları set sayısından takip et.")}</p>`);
  }

  /* Son antrenmanlar */
  const gecmis = Object.keys(S.gunler).filter(antrenmanYapildi).sort().reverse().slice(0, 10);
  if (gecmis.length) {
    const sidSpor = {};
    S.program.forEach(p => (p.seanslar || []).forEach(x => { sidSpor[x.sid] = x.spor; }));
    h += kart(T("Son antrenmanlar"), Tf("{n} gün", { n: gecmis.length }),
      `<div class="kaydir"><table><thead><tr><th>${T("Tarih")}</th><th>${T("Seans")}</th><th>${T("Süre")}</th></tr></thead><tbody>
       ${gecmis.map(x => {
         const sn = (S.gunler[x].antrenman || {}).seans || {};
         const yapilan = Object.keys(sn).filter(id => sn[id].yapildi);
         const ad = yapilan.map(id => T((sporBul(sidSpor[id]) || {}).ad)).filter(Boolean).join(" + ") || T("Antrenman");
         const sure = yapilan.reduce((a, id) => a + (+sn[id].sure || 0), 0);
         return `<tr><td>${trKisa(x)}</td><td>${esc(ad)}</td><td>${sure ? sure + " " + T("dk") : "—"}</td></tr>`;
       }).join("")}
       </tbody></table></div>`);
  }
  return h;
}

/* Haftalık program düzenleyici. Kurulum sihirbazı ve Antrenman sekmesi aynı
   bileşeni kullanır. Bir güne sırayla birden çok seans eklenebilir. */
function programDuzenle() {
  const secili = S.sporlar.map(sporBul).filter(Boolean);
  if (!secili.length) return `<p class="bos">${T("Önce spor seç.")}</p>`;
  return S.program.map((p, gi) => {
    const list = p.seanslar || [];
    const sure = list.reduce((a, s) => a + (+s.sure || 0), 0);
    return `<div class="gr">
      <div class="it" style="margin-bottom:9px"><span class="name">${T(GUN_AD[gi])}</span>
        ${list.length ? `<span class="chip gold">${Tf("{n} seans · {m} dk", { n: list.length, m: sure })}</span>`
                      : `<span class="chip">${T("Dinlenme")}</span>`}</div>
      ${list.map((s, si) => {
        const spor = sporBul(s.spor);
        return `<div class="seans">
          <div class="seans-bas">
            <span class="seans-no">${si + 1}</span>
            <span class="name">${esc(spor ? T(spor.ad) : s.spor)}</span>
            <span class="seans-ara">
              ${si > 0 ? `<button class="seans-ok" data-act="seans-tasi:${gi}:${si}:-1" aria-label="${T("yukarı taşı")}">↑</button>` : ""}
              ${si < list.length - 1 ? `<button class="seans-ok" data-act="seans-tasi:${gi}:${si}:1" aria-label="${T("aşağı taşı")}">↓</button>` : ""}
              <button class="sil" data-act="seans-sil:${gi}:${si}" aria-label="${T("kaldır")}">×</button></span></div>
          <div class="row">
            <div class="alan"><label class="lbl">${T("Süre dk")}</label>
              <input type="number" inputmode="numeric" data-seans="${gi}:${si}:sure" value="${esc(s.sure || "")}" placeholder="—"></div>
            ${spor && spor.tip === "guc" ? `<div class="alan"><label class="lbl">${T("Şablon")}</label>
              <select data-seans="${gi}:${si}:sablon"><option value="">—</option>
                ${Object.keys(GUC_SABLON).map(n => `<option value="${esc(n)}" ${s.sablon === n ? "selected" : ""}>${esc(T(n))}</option>`).join("")}
              </select></div>` : ""}</div></div>`;
      }).join("")}
      <select data-seans-ekle="${gi}" style="margin-top:${list.length ? 9 : 0}px">
        <option value="">${T("+ Seans ekle")}</option>
        ${secili.map(x => `<option value="${x.id}">${esc(T(x.ad))}</option>`).join("")}
      </select></div>`;
  }).join("");
}

/* ---- Set bazlı kayıt ----
   Bir egzersiz artık tek satır değil, set listesi:
   { ad: "Squat", setler: [ {tekrar,kg,ok}, … ] }
   "3×10 @60" diye tek satır tutmak gerçek antrenmanı anlatmıyordu — setler
   arasında tekrar da ağırlık da düşer, tonaj hesabı da o yüzden yanlış çıkardı. */
const bosSetler = (n) => Array.from({ length: n || 3 }, () => ({ tekrar: "", kg: "", ok: false }));
const dinlenmeSn = () => (+S.profil.dinlenme > 0 ? +S.profil.dinlenme : 90);

/* Bir sporun en son yapılan seansındaki egzersizler → { ad: [ {tekrar,kg} … ] }.
   Metin değil nesne dönüyor: hem ekranda özet basılıyor hem "geçen seferi
   doldur" düğmesi aynı kaydı satırlara yazıyor. */
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
      set.forEach(e => {
        const dolu = (e.setler || []).filter(st => st.tekrar || st.kg);
        if (e.ad && dolu.length) m[e.ad] = dolu.map(st => ({ tekrar: st.tekrar || "", kg: st.kg || "" }));
      });
      if (Object.keys(m).length) return m;
    }
  }
  return {};
}

/* "60 kg × 10, 8, 6" — aynı ağırlıktaki ardışık setler tek parçada toplanır,
   yoksa satır ekrana sığmıyor. Ağırlıksız hareketlerde kg yazılmıyor. */
function setOzet(l) {
  if (!Array.isArray(l) || !l.length) return "";
  const par = [];
  l.forEach(st => {
    const kg = String(st.kg || ""), tk = st.tekrar || "?";
    const son = par[par.length - 1];
    if (son && son.kg === kg) son.tekrar.push(tk);
    else par.push({ kg, tekrar: [tk] });
  });
  return par.map(p => +p.kg > 0 ? `${p.kg} kg × ${p.tekrar.join(", ")}`
                                : `${p.tekrar.join(", ")} ${T("tekrar")}`).join(" · ");
}

/* ---- Progresif yükleme ----
   Tahmini 1RM (Epley): kg × (1 + tekrar/30). Mutlak doğru bir sayı değil,
   karşılaştırma birimi — 5×80 ile 8×70'i aynı cetvele koyuyor. 30'un
   üstündeki tekrarda formül anlamını yitiriyor, orada hesaplamıyoruz. */
function e1rm(kg, tekrar) {
  const w = sayi(kg), r = sayi(tekrar);
  if (!(w > 0) || !(r > 0) || r > 30) return null;
  return w * (1 + r / 30);
}

/* Bir egzersizin geçmişteki en iyi tahmini 1RM'i. hariç = hesaba katılmayacak
   gün (bugünkü kayıt kendi rekorunu geçemez, yoksa hep "yeni rekor" yazar). */
function egzersizRekor(ad, haric) {
  const s = sadeAd(ad || "");
  if (!s) return null;
  let en = null;
  for (const k in S.gunler) {
    if (k === haric) continue;
    const sn = (S.gunler[k].antrenman || {}).seans || {};
    for (const id in sn) {
      for (const e of (sn[id].set || [])) {
        if (sadeAd(e.ad || "") !== s) continue;
        for (const st of (e.setler || [])) {
          const v = e1rm(st.kg, st.tekrar);
          if (v != null && (!en || v > en.v)) en = { v, kg: st.kg, tekrar: st.tekrar, tarih: k };
        }
      }
    }
  }
  return en;
}

/* Bir seansın o günkü en iyi tahmini 1RM'i — "yeni rekor" rozeti buna bakıyor */
const setlerEnIyi = setler => (setler || []).reduce((a, st) => {
  const v = e1rm(st.kg, st.tekrar);
  return v != null && (a == null || v > a) ? v : a;
}, null);

/* ---- Haftalık hacim ----
   Tonaj = Σ (tekrar × kg). Vücut ağırlığı hareketleri (kg yok) tonaja
   girmiyor, o yüzden set sayısı da veriliyor — ikisi birlikte okunmalı.
   Hafta başı `haftaBasi()` ile aynı: pazartesi. */
function haftaHacim(haftaSayi) {
  const bas = haftaBasi(bugun()), out = [];
  for (let i = haftaSayi - 1; i >= 0; i--) {
    const hb = gunEkle(bas, -7 * i);
    let tonaj = 0, set = 0, seans = 0;
    for (let g = 0; g < 7; g++) {
      const sn = ((S.gunler[gunEkle(hb, g)] || {}).antrenman || {}).seans || {};
      let varMi = false;
      for (const id in sn) {
        if (sn[id].yapildi) varMi = true;
        for (const e of (sn[id].set || []))
          for (const st of (e.setler || [])) {
            const tk = sayi(st.tekrar), kg = sayi(st.kg);
            if (tk > 0) { set++; if (kg > 0) tonaj += tk * kg; }
          }
      }
      if (varMi) seans++;
    }
    out.push({ tarih: hb, deger: Math.round(tonaj), set, seans });
  }
  return out;
}

/* =================== SEKME: İLERLEME =================== */
function vIlerleme() {
  const artan = [...S.olcumler].sort((a, b) => a.tarih < b.tarih ? -1 : 1);
  const son = artan[artan.length - 1], ilk = artan[0];
  const p = S.profil, kadin = p.cinsiyet === "k";

  let h = `<header class="top"><p class="eyebrow">${p.boy ? Tf("Boy {n} cm", { n: p.boy }) : T("İlerleme")}</p><h1>${T("İlerleme")}</h1>
   <p class="sub">${T("Ölçümü hep aynı şekilde al · sabah · aç karnına")}</p></header>`;

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
  h += kart(T("Bu hafta"), Tf("{n} gün geçti", { n: gecen }),
    `<div class="stat"><div class="sc"><div class="sn" style="color:var(--vurgu)">${antrSayi}</div><div class="sl">${T("Seans")}</div></div>
      <div class="sc"><div class="sn">${suGun}</div><div class="sl">${T("Su tuttu")}</div></div>
      <div class="sc"><div class="sn">${kcalGun}</div><div class="sl">${T("Kalori tuttu")}</div></div></div>`);

  /* İki haftalık trend hedefle uyuşmuyorsa kaloriyi yeniden ayarlamayı öner.
     Formül insanı tahmin eder, terazi ölçer. */
  const on = kaloriOneri();
  if (on) {
    const yon = T(on.gercek > 0.05 ? "arttı" : on.gercek < -0.05 ? "düştü" : "aynı kaldı");
    const hedefSoz = on.beklenen === 0 ? T("kilonu korumak")
      : Tf(on.beklenen < 0 ? "{x} kg vermek" : "{x} kg almak", { x: Math.abs(on.beklenen).toFixed(2) });
    h += kart(T("Kalori önerisi"), T("son 2 hafta"),
      `<div class="stat" style="margin-bottom:12px">
        <div class="sc"><div class="sn">${on.gercek > 0 ? "+" : ""}${on.gercek.toFixed(2)}</div><div class="sl">${T("kg / hafta")}</div></div>
        <div class="sc"><div class="sn">${on.beklenen > 0 ? "+" : ""}${on.beklenen.toFixed(2)}</div><div class="sl">${T("Hedef hız")}</div></div>
        <div class="sc"><div class="sn" style="color:var(--vurgu)">${on.yeniKcal}</div><div class="sl">${T("Önerilen kcal")}</div></div></div>
       <p class="note" style="margin-bottom:11px">${Tf("Kilon haftada {x} kg {y}, hedefin {h}. Günlük hedefi {d} kcal değiştirmeyi dene ve iki hafta daha ölç.",
         { x: Math.abs(on.gercek).toFixed(2), y: yon, h: hedefSoz, d: (on.duzeltme > 0 ? "+" : "") + on.duzeltme })}</p>
       <button class="btn gold blok" data-act="kcal-oneri:${on.yeniKcal}">${Tf("Hedefi {n} kcal yap", { n: on.yeniKcal })}</button>`);
  }

  if (son) {
    const fSon = navy(son), fIlk = ilk ? navy(ilk) : null;
    let fark = "";
    if (ilk && ilk.tarih !== son.tarih)
      fark = `<p class="note" style="margin-top:12px">${Tf("Başlangıca göre: kilo {n} kg", { n: (son.kilo - ilk.kilo).toFixed(1) })}${
        (son.bel && ilk.bel) ? Tf(" · bel {n} cm", { n: (son.bel - ilk.bel).toFixed(1) }) : ""}${
        (fSon != null && fIlk != null) ? Tf(" · yağ {n} puan", { n: (fSon - fIlk).toFixed(1) }) : ""}</p>`;
    h += kart(T("Son ölçüm"), trT(son.tarih),
      `<div class="stat"><div class="sc"><div class="sn" style="color:var(--vurgu)">${navyStr(son)}</div><div class="sl">${T("Yağ %")}</div></div>
        <div class="sc"><div class="sn">${son.bel || "—"}</div><div class="sl">${T("Bel cm")}</div></div>
        <div class="sc"><div class="sn">${son.kilo}</div><div class="sl">${T("Kilo kg")}</div></div></div>${fark}`);
    h += kart(T("Kilo eğrisi"), Tf("{n} ölçüm", { n: artan.length }), grafik(artan.map(o => ({ tarih: o.tarih, deger: o.kilo })), "kg"));
  }

  h += kart(T("Yeni ölçüm gir"), "",
    `<div class="row" style="margin-bottom:11px">${alan("kilo", T("Kilo kg"))}${alan("bel", T("Bel cm"))}${alan("boyun", T("Boyun cm"))}</div>
     ${kadin ? `<div class="row" style="margin-bottom:11px">${alan("kalca", T("Kalça cm"))}</div>` : ""}
     <button class="btn gold blok" data-act="olcum">${T("Bugünün ölçümünü kaydet")}</button>
     <p class="note" id="on-yag" style="margin-top:10px;text-align:center">${onizlemeYag()}</p>
     <p class="note" style="margin-top:10px">${T("Sadece kilo da girebilirsin — bel ve boyun boş kalırsa yağ oranı hesaplanmaz, kilo yine kaydedilir.")}</p>`);

  if (artan.length)
    h += kart(T("Geçmiş"), "",
      `<div class="kaydir"><table><thead><tr><th>${T("Tarih")}</th><th>${T("Kilo")}</th><th>${T("Bel")}</th><th>${T("Boyun")}</th>${kadin ? `<th>${T("Kalça")}</th>` : ""}<th>${T("Yağ %")}</th></tr></thead>
       <tbody>${[...artan].reverse().map(o => `<tr><td>${trKisa(o.tarih)}</td><td>${o.kilo}</td><td>${o.bel || "—"}</td><td>${o.boyun || "—"}</td>
       ${kadin ? `<td>${o.kalca || "—"}</td>` : ""}<td style="color:var(--vurgu)">${navyStr(o)}</td></tr>`).join("")}</tbody></table></div>`);
  return h;
}

/* =================== SEKME: DAHA =================== */
function vDaha() {
  if (S.daha) return { market: dMarket, kutuphane: dKutuphane, rehber: dRehber, takviye: dTakviye, ayar: dAyar, yedek: dYedek }[S.daha]();
  const say = Object.values(S.market).filter(Boolean).length;
  let h = `<header class="top"><p class="eyebrow">${T("Menü")}</p><h1>${T("Daha")}</h1>
   <p class="sub">${T("Liste, rehber ve ayarlar")}</p></header>`;
  h += kart("", "",
    [["market", T("Alışveriş listesi"), say ? Tf("{n} kalem işaretli", { n: say }) : T("Haftalık market listesi")],
     ["kutuphane", T("Egzersizler"), T("Nasıl yapılır, hangi bölge, set önerisi")],
     ["rehber", T("Rehber"), T("Kafan karıştığında buraya bak")],
     ["takviye", T("Takviyeler"), Tf("{n} takviye seçili", { n: S.takviyeler.length })],
     ["ayar", T("Ayarlar"), T("Hedefler, profil, program")],
     ["yedek", T("Yedek"), S.sonYedek ? T("Son yedek: ") + trKisa(S.sonYedek) : T("Henüz yedek almadın")]]
    .map(([id, ad, d]) => `<div class="item" data-act="daha:${id}"><div class="ib">
      <div class="it"><span class="name">${ad}</span></div><div class="desc">${esc(d)}</div></div>
      <div class="uc"><span class="ara-sag">›</span></div></div>`).join(""));
  h += `<p class="note" style="text-align:center;margin-top:18px">${T("Verilerin yalnızca bu cihazda. Hiçbir yere gönderilmiyor.")}<br>
   <a href="gizlilik.html" style="color:var(--vurgu)">${T("Gizlilik politikası")}</a></p>`;
  return h;
}

const geriBtn = ad => `<button class="btn ghost blok" data-act="daha:" style="margin-bottom:14px">‹ ${T(ad)}</button>`;

/* ---- Alışveriş listesi ----
   Şablon + seçili takviyeler + kullanıcının kendi kalemleri. Takviye grubu
   kodda sabit değil, kullanıcının seçtiklerinden üretiliyor.               */
function marketGruplari() {
  const g = MARKET_SABLON.map(x => ({ k: T(x.k), i: x.i.map(T) }));
  if (S.takviyeler.length) g.push({ k: T("Takviye"), i: S.takviyeler.map(t => T(t.ad)) });
  if (S.marketEk.length) g.push({ k: T("Kendi eklediklerin"), i: S.marketEk.slice(), ozel: true });
  return g;
}

/* Son 14 günde en az iki kez yediğin ama listede olmayan kalemler.
   "Öğün planından alışveriş listesi" işini veritabanı tahminiyle değil,
   gerçekten ne yediğinle yapıyoruz — uydurma çıkmıyor.                     */
function marketOnerileri(n) {
  const sinir = gunEkle(bugun(), -14), say = {};
  Object.keys(S.gunler).filter(k => k >= sinir).forEach(k =>
    (S.gunler[k].yenen || []).forEach(y => { if (y && y.ad) say[y.ad] = (say[y.ad] || 0) + 1; }));
  const listede = new Set();
  marketGruplari().forEach(gr => gr.i.forEach(x => listede.add(sadeAd(x))));
  return Object.keys(say)
    .filter(ad => say[ad] >= 2 && !listede.has(sadeAd(ad)))
    .sort((a, b) => say[b] - say[a] || (a < b ? -1 : 1))
    .slice(0, n || 8);
}

function dMarket() {
  const gruplar = marketGruplari();
  const tum = gruplar.reduce((a, g) => a + g.i.length, 0);
  const alinan = gruplar.reduce((a, g) => a + g.i.filter(x => S.market[x]).length, 0);
  let h = `<header class="top"><p class="eyebrow">${T("1 hafta")}</p><h1>${T("Alışveriş")}</h1>
   <p class="sub">${Tf("{a} / {t} işaretli", { a: alinan, t: tum })}</p>
   ${ilerleme(tum ? alinan / tum : 0, "var(--iyi)")}</header>` + geriBtn("Daha");

  const oner = marketOnerileri(8);
  if (oner.length)
    h += kart(T("Sık yediklerin"), T("son 14 gün"),
      `<div class="row wrapped" style="gap:7px">${oner.map(ad =>
        `<button class="chip" data-act="mk-oner:${esc(ad)}" style="cursor:pointer;padding:9px 12px">+ ${esc(ad)}</button>`).join("")}</div>
       <p class="note" style="margin-top:10px">${T("Listende olmayan ama düzenli yediğin şeyler. Dokununca listene eklenir.")}</p>`);

  /* Katlanır gruplar: 100'den fazla kalem tek sayfada alt alta dizilirse
     hiç kimse sonuna kadar inmiyor. İçinde işaret olan grup açık başlar. */
  h += gruplar.map(g => {
    const say = g.i.filter(x => S.market[x]).length;
    const acik = S.mkAcik[g.k] === undefined ? say > 0 : !!S.mkAcik[g.k];
    return kart("", "",
      `<div class="item" data-act="mk-grup:${esc(g.k)}">
         <div class="ib"><div class="it"><span class="name">${esc(g.k)}</span>
           <span class="time">${say ? say + " / " + g.i.length : Tf("{n} kalem", { n: g.i.length })}</span></div></div>
         <div class="uc"><span class="ara-sag">${acik ? "⌄" : "›"}</span></div></div>
       ${acik ? g.i.map(x => satir({ ad: x, on: !!S.market[x], act: "mk:" + x,
           uc: g.ozel ? `<button class="sil" data-act="mk-ek-sil:${esc(x)}" aria-label="${T("listeden çıkar")}">×</button>` : "" })).join("") : ""}`);
  }).join("");

  h += kart(T("Kendi kalemini ekle"), "",
    `<div class="row">
       <div class="alan"><input type="text" data-fld="mkAd" value="${esc(S.f.mkAd || "")}"
         placeholder="${T("Ne lazım?")}" style="text-align:left" autocomplete="off"></div>
       <button class="btn" data-act="mk-ek">${T("Ekle")}</button></div>`);
  h += `<button class="btn ghost blok" data-act="mk-sifirla" style="margin-top:12px">${T("İşaretleri temizle (yeni hafta)")}</button>`;
  return h;
}

/* ---- Egzersiz kütüphanesi sayfası ----
   Bölge + yer süzgeci, dokununca açılan tarif, hedefe göre set önerisi.
   Bugünkü programda güç seansı varsa hareket tek dokunuşla o seansa eklenir. */
function dKutuphane() {
  const b = S.f.kutB || "hepsi", y = S.f.kutY || "hepsi";
  const liste = EGZERSIZLER.map((e, i) => ({ ...e, i }))
    .filter(e => (b === "hepsi" || e.bolge === b) && (y === "hepsi" || e.yer === y || e.yer === "ikisi"));
  const guc = bugunGucSeansi();

  let h = `<header class="top"><p class="eyebrow">${Tf("{n} hareket", { n: EGZERSIZLER.length })}</p><h1>${T("Egzersizler")}</h1>
   <p class="sub">${T("Nasıl yapılır · hangi bölge · senin hedefine göre set")}</p></header>` + geriBtn("Daha");

  h += kart("", "",
    `<label class="lbl sol">${T("Bölge")}</label>
     <div class="row wrapped" style="gap:7px;margin-bottom:11px">
       ${["hepsi"].concat(Object.keys(BOLGE_AD)).map(x =>
         `<button class="chip ${b === x ? "gold" : ""}" data-act="kut-b:${x}"
           style="cursor:pointer;padding:9px 12px">${x === "hepsi" ? T("Hepsi") : T(BOLGE_AD[x])}</button>`).join("")}</div>
     <label class="lbl sol">${T("Nerede")}</label>
     <div class="row wrapped" style="gap:7px">
       ${[["hepsi", T("Hepsi")], ["salon", T("Salon")], ["ev", T("Ev")]].map(([x, ad]) =>
         `<button class="chip ${y === x ? "gold" : ""}" data-act="kut-y:${x}"
           style="cursor:pointer;padding:9px 12px">${ad}</button>`).join("")}</div>
     <p class="note" style="margin-top:11px">${T("Öneriler hedefe ve ekipmana göre genel bilgidir, ders değildir. Bir harekette ağrı oluyorsa o hareketi yapma ve bir uzmana danış.")}</p>`);

  h += kart("", "", liste.map(e => {
    const acik = S.f.kutAcik === e.i;
    return `<div class="item" data-act="kut-ac:${e.i}">
      <div class="ib"><div class="it"><span class="name">${esc(T(e.ad))}</span>
        <span class="time">${T(BOLGE_AD[e.bolge])}</span></div>
        <div class="desc">${yerAd(e.yer)}</div></div>
      <div class="uc"><span class="ara-sag">${acik ? "⌄" : "›"}</span></div></div>
    ${acik ? `<div class="gr" style="padding-top:4px">
      <div class="gv">${esc(T(e.nasil))}</div>
      <div class="macro" style="margin-top:8px">${T("Senin hedefin için")}: ${setOner(e.bolge)}</div>
      ${guc ? `<button class="btn ghost blok" data-act="kut-ekle:${e.i}" style="margin-top:10px">${T("Bugünkü seansa ekle")}</button>` : ""}
    </div>` : ""}`;
  }).join("") || `<p class="bos">${T("Bu süzgeçle hareket yok.")}</p>`);
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
    if (b.kosul[0] === "#") return S.profil.hedef === b.kosul.slice(1);
    return S.takviyeler.some(t => t.id === b.kosul);
  };
  let h = `<header class="top"><p class="eyebrow">${T("Nasıl kullanılır")}</p><h1>${T("Rehber")}</h1>
   <p class="sub">${T("Senin seçimlerine göre süzüldü")}</p></header>` + geriBtn("Daha");
  REHBER.filter(gorunur).forEach(b => {
    h += `<p class="sec">${esc(T(b.b))}</p>` + kart("", "",
      b.s.map(([k, v]) => `<div class="gr"><div class="gk">${esc(T(k))}</div><div class="gv">${esc(T(v))}</div></div>`).join(""));
  });
  return h;
}

function dTakviye() {
  let h = `<header class="top"><p class="eyebrow">${Tf("{n} seçili", { n: S.takviyeler.length })}</p><h1>${T("Takviyeler")}</h1>
   <p class="sub">${T("Doz ve günleri buradan ayarla")}</p></header>` + geriBtn("Daha");

  uyarilar(bugun()).forEach(u => { h += uyariKutu(u); });

  if (S.takviyeler.length)
    h += kart(T("Seçili"), "", S.takviyeler.map((t, i) => `<div class="gr">
      <div class="it" style="margin-bottom:6px"><span class="name">${esc(T(t.ad))}</span>
        ${(t.etiket || {}).kafein ? `<span class="chip ember">${t.etiket.kafein} ${T("mg kafein")}</span>` : ""}
        <button class="sil" data-act="tak-sil:${i}" style="margin-left:auto" aria-label="${T("kaldır")}">×</button></div>
      <div class="row" style="margin-bottom:8px">
        <div class="alan"><label class="lbl">${T("Doz")}</label><input type="text" data-tak="${i}:doz" value="${esc(t.doz)}" style="text-align:left"></div>
        <div class="alan"><label class="lbl">${T("Saat")}</label><input type="text" data-tak="${i}:saat" value="${esc(t.saat)}" style="text-align:left"></div></div>
      <label class="lbl sol">${T("Hangi günler")}</label>
      <div class="row wrapped">${GUN_KISA.map((g, gi) => {
        const acik = !t.gunler || !t.gunler.length || t.gunler.indexOf(gi) !== -1;
        return `<button class="chip ${acik ? "gold" : ""}" data-act="tak-gun:${i}:${gi}" style="cursor:pointer;background:none">${T(g)}</button>`;
      }).join("")}</div>
      ${t.not ? `<div class="macro" style="margin-top:8px">${esc(T(t.not))}</div>` : ""}</div>`).join(""));
  else
    h += kart("", "", `<p class="bos">${T("Takviye kullanmıyorsan sorun değil — aşağıdan istediğin zaman ekleyebilirsin.")}</p>`);

  h += kart("", "", `<button class="btn gold blok" data-act="panel:takSec">+ ${T("Takviye ekle")}</button>`);
  h += `<p class="note" style="margin-top:14px">${T("Takviye ilaç değildir ve ilacın yerine geçmez. Kullandığın ilaçlarla etkileşebilir — eczacına ya da hekimine danış.")}</p>`;
  return h;
}

function dAyar() {
  const p = S.profil, hs = hedefHesapla();
  let h = `<header class="top"><p class="eyebrow">${T("Ayarlar")}</p><h1>${T("Ayarlar")}</h1>
   <p class="sub">${T("Hedefler ve profil")}</p></header>` + geriBtn("Daha");

  h += kart("Dil / Language", DIL === "en" ? "English" : "Türkçe",
    `<div class="row">
       <button class="btn ${DIL === "tr" ? "gold" : "ghost"}" data-act="dil:tr">Türkçe</button>
       <button class="btn ${DIL === "en" ? "gold" : "ghost"}" data-act="dil:en">English</button></div>`);

  h += kart(T("Günlük hedefler"), p.kcalElle ? T("elle ayarlı") : T("otomatik"),
    `<div class="row" style="margin-bottom:11px">${alan("aKcal", "kcal")}${alan("aProtein", T("Protein g"))}${alan("aSu", T("Su bardak"))}</div>
     <label class="lbl sol">${T("Bardak boyutu")}</label>
     <div class="row wrapped" style="gap:7px;margin-bottom:10px">
       ${[200, 250, 330, 500, 750, 1000].map(ml =>
         `<button class="chip ${bardakMl() === ml ? "gold" : ""}" data-act="bardak:${ml}"
           style="cursor:pointer;padding:9px 12px">${ml} ml</button>`).join("")}</div>
     <div class="row" style="margin-bottom:11px">${alan("aBardak", T("Bardak ml"))}</div>
     <p class="note" style="margin-bottom:11px">${Tf("Günlük su hedefin {v} ({n} × {ml} ml). Şişeden içiyorsan boyutu değiştir — litre hedefin korunur, bardak sayısı yeniden hesaplanır.",
       { v: `<strong id="su-toplam">${(suHedefMl() / 1000).toFixed(2)} ${T("litre")}</strong>`, n: S.profil.suHedef, ml: bardakMl() })}</p>
     <div class="row"><button class="btn gold" data-act="ayar-hedef">${T("Kaydet")}</button>
      ${hs ? `<button class="btn ghost" data-act="ayar-oto">${T("Otomatiğe dön")}</button>` : ""}</div>
     ${hs ? `<p class="note" style="margin-top:11px">${Tf("Profiline göre hesaplanan: {k} kcal · {p} g protein · {l} litre su. Günlük harcaman ~{t} kcal.",
       { k: hs.kcal, p: hs.protein, l: (hs.suMl / 1000).toFixed(1), t: hs.tdee })}</p>` : ""}`);

  h += kart(T("Profil"), "",
    `<div class="row" style="margin-bottom:11px">${alan("pDogum", T("Doğum yılı"))}${alan("pBoy", T("Boy cm"))}${alan("pKilo", T("Kilo kg"))}</div>
     <label class="lbl sol">${T("Cinsiyet")}</label>
     <div class="sec-lst" style="margin-bottom:11px">
       ${secOp("ayar-cins:e", p.cinsiyet === "e", T("Erkek"), "")}
       ${secOp("ayar-cins:k", p.cinsiyet === "k", T("Kadın"), "")}</div>
     <label class="lbl sol">${T("Antrenman saati")}</label>
     <input type="time" data-fld="pAntrSaat" value="${esc(p.antrSaat || "18:00")}" style="margin-bottom:11px">
     <button class="btn gold blok" data-act="ayar-profil">${T("Kaydet")}</button>`);

  h += kart(T("Hedef ve aktivite"), "",
    `<label class="lbl sol">${T("Hedef")}</label>
     <div class="sec-lst" style="margin-bottom:13px">${HEDEFLER.map(x => secOp("ayar-hedefTip:" + x.id, p.hedef === x.id, T(x.ad), T(x.d))).join("")}</div>
     <label class="lbl sol">${T("Aktivite")}</label>
     <div class="sec-lst">${AKTIVITE.map(x => secOp("ayar-akt:" + x.id, p.aktivite === x.id, T(x.ad), T(x.d))).join("")}</div>`);

  const a = S.aliskanlik;
  h += kart(T("Bırakma takibi"), a && a.aktif ? esc(T(a.ad)) : T("kapalı"),
    a && a.aktif
      ? `<p class="note" style="margin-bottom:11px">${Tf("{ad} · başlangıç haftalık sınır {n} {b} · {t} tarihinde başladı.",
           { ad: esc(T(a.ad)), n: a.hafta1, b: esc(T(a.birim)), t: trKisa(a.baslangic) })}</p>
         <button class="btn ghost blok" data-act="alis-kapat">${T("Takibi kapat")}</button>`
      : `<p class="note" style="margin-bottom:11px">${T("Azaltmak istediğin bir şey varsa buradan açabilirsin.")}</p>
         <div class="sec-lst" style="margin-bottom:11px">${ALISKANLIK_SABLON.filter(x => x.id !== "ozel").map(x => secOp("alis-ac:" + x.id, false, T(x.ad), Tf("Haftada {n} {b} ile başlar", { n: x.baslangic, b: T(x.birim) }))).join("")}</div>`);

  if (Yerel.var())
    h += kart(T("Telefon"), "", `
      <div class="sec-lst">
        ${secOp("yer-saglik", !!p.saglik, T("Sağlık uygulamasıyla senkron"),
                T("Kilo, su ve antrenman Apple Health'e yazılır. İzni ilk açtığında ister."))}
        ${secOp("yer-bildirim", !!p.bildirim, T("Hatırlatıcılar"),
                T("Su ve antrenman saatlerinde bildirim gönderir."))}
        ${p.bildirim ? secOp("yer-bild-su", !!p.bildirimSu, T("Su hatırlatıcısı"), "10:00 · 14:00 · 18:00") : ""}
        ${p.bildirim ? secOp("yer-bild-antr", !!p.bildirimAntrenman, T("Antrenman hatırlatıcısı"),
                             Tf("Programda seans olan günlerde {t}", { t: esc(p.antrSaat || "18:00") })) : ""}
      </div>
      <p class="note" style="margin-top:11px">${T("Verilerin iCloud hesabının özel alanında saklanıyor — bizim sunucumuz yok, kimse okuyamaz. Cihazlarında otomatik eşitlenir.")}</p>`);

  h += kart(T("Öğün düzeni"), Tf("{n} öğün", { n: S.ogunler.length }), ogunDuzenle());
  h += kart(T("Hazır düzenler"), "",
    `<div class="sec-lst">${OGUN_SABLON.map(o => secOp("ayar-ogun:" + o.id, false, T(o.ad), T(o.d))).join("")}</div>
     <p class="note" style="margin-top:11px">${T("Hazır bir düzen seçmek yukarıdaki listenin üzerine yazar. Geçmiş kayıtlar silinmez.")}</p>`);

  h += kart(T("Sporlar"), Tf("{n} seçili", { n: S.sporlar.length }),
    `<div class="row wrapped" style="gap:7px">${S.sporlar.map(sporBul).filter(Boolean)
       .map(x => `<span class="chip gold">${esc(T(x.ad))}</span>`).join("")
       || `<span class="macro">${T("Henüz spor seçmedin.")}</span>`}</div>
     <button class="btn ghost blok" data-act="panel:sporSec" style="margin-top:12px">${T("Sporları düzenle")}</button>`);

  const kodlar = Object.keys(S.barkod);
  if (kodlar.length)
    h += kart(T("Kayıtlı barkodlar"), Tf("{n} ürün", { n: kodlar.length }),
      kodlar.map(kod => `<div class="item">
        <div class="ib"><div class="it"><span class="name">${esc(S.barkod[kod].ad)}</span>
          <span class="time">${esc(kod)}</span></div>
          <div class="macro">${Tf("100 g'da {k} kcal · {p} g protein", { k: S.barkod[kod].kcal, p: S.barkod[kod].p })}</div></div>
        <div class="uc"><button class="sil" data-act="bk-sil:${esc(kod)}" aria-label="${T("sil")}">×</button></div></div>`).join("") +
      `<p class="note" style="margin-top:11px">${T("Bu eşleşmeler yalnızca senin cihazında. Barkodun ne olduğunu hiçbir yere sormuyoruz — tarama tamamen çevrimdışı.")}</p>`);

  h += `<p class="sec">${T("Tehlikeli bölge")}</p>` + kart("", "",
    `<p class="note" style="margin-bottom:11px">${T("Tüm verini siler ve kurulumu baştan başlatır. Geri alınamaz — önce yedek al.")}</p>
     <button class="btn tehlike blok" data-act="sifirla">${T("Her şeyi sil")}</button>`);
  return h;
}

function dYedek() {
  const gunSayi = S.sonYedek ? Math.floor((Date.now() - tarihMs(S.sonYedek)) / 864e5) : null;
  return `<header class="top"><p class="eyebrow">${T("Verilerini koru")}</p><h1>${T("Yedek")}</h1>
   <p class="sub">${S.sonYedek ? Tf("{n} gün önce yedekledin", { n: gunSayi }) : T("Henüz yedek almadın")}</p></header>` + geriBtn("Daha") +
   kart("", "",
    `<p class="note" style="margin-bottom:12px">${T("Veriler yalnızca bu cihazda saklanıyor. Ayda bir yedek al — telefon değiştirirsen ya da uygulama verisi silinirse buradan geri yüklersin.")}</p>
     <div class="row" style="margin-bottom:9px">
       <button class="btn gold" data-act="yedek-kopyala">${T("Yedeği kopyala")}</button>
       <button class="btn" data-act="yedek-indir">${T("Dosya indir")}</button></div>
     <label class="lbl sol" style="margin-top:12px">${T("Geri yükle — yedek metnini yapıştır")}</label>
     <textarea id="yedek-in" placeholder='{"profil":…}'>${esc(S.yedekMetin)}</textarea>
     <button class="btn ghost blok" data-act="yedek-yukle" style="margin-top:9px">${T("Yedekten geri yükle")}</button>
     <p class="note" style="margin-top:11px">${T("Geri yükleme mevcut verinin üzerine yazar.")}</p>`);
}

/* ---- Yerel bildirimler ----
   Su hatırlatıcısı gün içine yayılıyor, antrenman hatırlatıcısı programda
   seans olan günlere. Kabuk yoksa hiçbiri kurulmuyor. */
function bildirimleriKur() {
  if (!Yerel.var() || !S.profil.bildirim) return;
  const liste = [];
  let id = 1;

  if (S.profil.bildirimSu) {
    /* 10:00-20:00 arası üç hatırlatma — daha sık olursa insanlar kapatıyor */
    [10, 14, 18].forEach(saat => {
      liste.push({
        id: id++, title: T("Su"), body: Tf("Günlük hedefin {l} litre.", { l: (suHedefMl() / 1000).toFixed(1) }),
        schedule: { on: { hour: saat, minute: 0 }, allowWhileIdle: false }
      });
    });
  }

  if (S.profil.bildirimAntrenman) {
    const [sa, dk] = String(S.profil.antrSaat || "18:00").split(":").map(Number);
    S.program.forEach((p, gi) => {
      if (!(p.seanslar || []).length) return;
      const adlar = p.seanslar.map(x => T((sporBul(x.spor) || {}).ad)).filter(Boolean).join(" + ");
      liste.push({
        id: id++, title: T("Antrenman"), body: adlar,
        /* Capacitor'da hafta günü 1 = Pazar, bizim dizide 0 = Pazar */
        schedule: { on: { weekday: gi + 1, hour: sa || 18, minute: dk || 0 } }
      });
    });
  }
  Yerel.bildirimKur(liste);
}

/* =================== DİNLENME SAYACI ===================
   Set arası geri sayım. Ekranın altında sabit bir şeritte duruyor; her saniye
   ciz() çağırmıyoruz, yalnız şeritteki rakamı tazeliyoruz (14. kural). */
let sayacT = null, sayacBitis = 0;

function sayacBaslat(sn) {
  sayacBitis = Date.now() + sn * 1000;
  clearInterval(sayacT);
  sayacT = setInterval(sayacTik, 250);
  ciz();
}
function sayacDur() { clearInterval(sayacT); sayacT = null; sayacBitis = 0; }
function sayacTik() {
  const kalan = Math.max(0, Math.ceil((sayacBitis - Date.now()) / 1000));
  const el = document.getElementById("sayac-n");
  if (el) el.textContent = `${Math.floor(kalan / 60)}:${String(kalan % 60).padStart(2, "0")}`;
  if (kalan <= 0) { sayacDur(); ciz(); toast(T("Dinlenme bitti — sıradaki set")); }
}
function sayacBar() {
  if (!sayacBitis) return "";
  const kalan = Math.max(0, Math.ceil((sayacBitis - Date.now()) / 1000));
  return `<div class="sayac" id="sayac">
    <span class="sl">${T("Set arası")}</span>
    <span class="sayac-n" id="sayac-n">${Math.floor(kalan / 60)}:${String(kalan % 60).padStart(2, "0")}</span>
    <button class="mini" data-act="sayac-ekle:60">${T("+1 dk")}</button>
    <button class="mini" data-act="sayac-dur">${T("Bitir")}</button></div>`;
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
  document.body.classList.toggle("kilit", !!(S.araHedef || S.panel));
  if (kurulumGerek()) { app.innerHTML = `<div class="wrap solo">${vKurulum()}</div>${panelHtml()}`; return; }
  const v = { bugun: vBugun, yemek: vYemek, antrenman: vAntrenman, ilerleme: vIlerleme, daha: vDaha }[S.tab]();
  app.innerHTML = `<div class="wrap">${v}</div>
   <nav><div class="nav-in">${Object.keys(ADLAR).map(id =>
     `<button class="tab ${S.tab === id ? "on" : ""}" data-act="tab:${id}" aria-label="${T(ADLAR[id])}">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
       stroke-linecap="round" stroke-linejoin="round"><path d="${IKON[id]}"/></svg><span>${T(ADLAR[id])}</span></button>`).join("")}
   </div></nav>
   ${panelHtml()}${sayacBar()}`;

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
    if (!p.cinsiyet) return T("Cinsiyet seç");
    if (!(d >= 1920 && d <= new Date().getFullYear() - 10)) return T("Doğum yılını gir");
    if (!(b >= 100 && b <= 250)) return T("Boyu cm olarak gir (100-250)");
    if (!(kg >= 25 && kg <= 400)) return T("Kiloyu kg olarak gir");
    p.dogumYili = Math.round(d); p.boy = b; p.kilo = kg;
    return null;
  }
  if (a === 2) {
    if (!p.hedef) return T("Bir hedef seç");
    if (!p.aktivite) return T("Aktivite düzeyini seç");
    return null;
  }
  if (a === 3 && !S.sporlar.length) return T("En az bir spor seç");
  if (a === 5 && !S.ogunler.length) return T("Bir öğün düzeni seç");
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
    const ad = S.f.alisId === "ozel" ? (S.f.alisAd || T("Alışkanlık")) : T(sb.ad);
    S.aliskanlik = { aktif: true, ad, birim: sb ? T(sb.birim) : T("adet"), baslangic: bugun(), hafta1: Math.round(h1) };
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
  /* Öğün adımı boş kutularla açılmasın: en yaygın düzen ön-seçili gelir,
     kullanıcı isterse değiştirir. Bir zorunlu dokunuş eksilir. */
  if (a === 5 && !S.ogunler.length) { ogunKur("3ogun"); S.f.ogunSablon = "3ogun"; }
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
  S.ogunler = s.ogunler.map((o, i) => ({ id: eski[i] || yeniOid(), ad: T(o.ad), saat: o.saat, p: o.p }));
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
    S.panel = ""; kurulumFormDoldur(); kaydet(); return ciz();
  }
  if (a === "k-geri") { S.kurulumAdim = Math.max(0, S.kurulumAdim - 1); S.panel = ""; kurulumFormDoldur(); kaydet(); return ciz(); }
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

  /* ---- egzersiz kütüphanesi ---- */
  if (a.startsWith("kut-b:")) { S.f.kutB = par(1); S.f.kutAcik = null; return ciz(); }
  if (a.startsWith("kut-y:")) { S.f.kutY = par(1); S.f.kutAcik = null; return ciz(); }
  if (a.startsWith("kut-ac:")) {
    const i = parseInt(par(1), 10);
    S.f.kutAcik = S.f.kutAcik === i ? null : i;
    return ciz();
  }
  if (a.startsWith("kut-ekle:")) {
    const eg = EGZERSIZLER[parseInt(par(1), 10)], seans = bugunGucSeansi();
    if (!eg || !seans) return;
    const l = seansYaz(bugun(), seans.sid);
    if (!Array.isArray(l.set)) l.set = [];
    const ad = T(eg.ad);
    if (l.set.some(x => sadeAd(x.ad) === sadeAd(ad))) { toast(Tf("{a} zaten seansta", { a: ad })); return; }
    const bos = l.set.find(x => !x.ad);
    if (bos) { bos.ad = ad; if (!Array.isArray(bos.setler)) bos.setler = bosSetler(); }
    else l.set.push({ ad, setler: bosSetler() });
    toast(Tf("{a} bugünkü seansa eklendi", { a: ad }));
    kaydet(); return ciz();
  }
  if (a.startsWith("nasil:")) {
    const e = (seansOku(bugun(), par(1)).set || [])[parseInt(par(2), 10)];
    if (!e || !kutBul(e.ad)) return;
    S.f.nasilAd = e.ad; S.panel = "nasil";
    return ciz();
  }
  if (a === "ipucu-kapat") { S.ipucuKapali = true; kaydet(); return ciz(); }

  /* ---- dil ---- */
  if (a.startsWith("dil:")) {
    S.profil.dil = par(1);
    dilAyarla(S.profil.dil);
    kaydet(); return ciz();
  }

  /* ---- gezinme ---- */
  if (a.startsWith("tab:")) { S.tab = par(1); S.daha = ""; S.araHedef = ""; S.ara = ""; S.panel = ""; S.f = {}; window.scrollTo(0, 0); return ciz(); }
  if (a.startsWith("panel:")) { S.panel = par(1); return ciz(); }
  if (a.startsWith("ogun-sec:")) { S.seciliOgun = a.slice(9); return ciz(); }
  if (a === "panel-kapat") { S.panel = ""; return ciz(); }
  if (a.startsWith("panel-git:")) {
    S.panel = ""; S.tab = par(1) || "bugun"; S.daha = par(2) || "";
    if (S.daha === "ayar") ayarFormDoldur();
    window.scrollTo(0, 0); return ciz();
  }
  /* Hero'daki hızlı ekleme: ilk boş öğünü seçip yemek panelini açar */
  if (a === "yem-hizli") {
    const g0 = gun(), slot = ogunSlotlari();
    const bos = slot.find(o => !g0.yenen.some(y => y.ogun === o.id)) || slot[0];
    S.tab = "yemek"; S.panel = ""; S.araHedef = bos.id; S.ara = ""; S.f = {}; S.odakAra = true;
    window.scrollTo(0, 0); return ciz();
  }
  if (a.startsWith("daha:")) {
    S.daha = par(1) || "";
    if (S.daha === "ayar") ayarFormDoldur(); else S.f = {};
    window.scrollTo(0, 0); return ciz();
  }

  const g = gun();

  /* ---- bugün ---- */
  if (a === "su+") {
    g.su = Math.min(g.su + 1, 30);
    if (S.profil.saglik) Yerel.saglikSuYaz(bardakMl());
    Yerel.titre("Light");
  }
  else if (a === "su-") { g.su = Math.max(0, g.su - 1); }
  else if (a === "alis+") { g.aliskanlik = (g.aliskanlik || 0) + 1; }
  else if (a === "alis-") { g.aliskanlik = Math.max(0, (g.aliskanlik || 0) - 1); }
  else if (a.startsWith("seans-tik:")) {
    const sid = par(1), l = seansYaz(bugun(), sid);
    l.yapildi = !l.yapildi;
    Yerel.titre("Medium");
    if (l.yapildi && S.profil.saglik) {
      const s = gunSeanslari(bugun()).find(x => x.sid === sid);
      const sp = s ? sporBul(s.spor) : null;
      if (sp) Yerel.saglikAntrenmanYaz(sp.tip, +l.sure || (s.sure || sp.sure));
    }
  }
  else if (a.startsWith("tak:")) { const id = par(1); g.takviye[id] = !g.takviye[id]; }
  else if (a.startsWith("mk:")) { const x = a.slice(3); S.market[x] = !S.market[x]; Yerel.titre("Light"); }
  else if (a.startsWith("mk-grup:")) {
    const ad = a.slice(8), gr = marketGruplari().find(x => x.k === ad);
    const say = gr ? gr.i.filter(x => S.market[x]).length : 0;
    const acik = S.mkAcik[ad] === undefined ? say > 0 : !!S.mkAcik[ad];
    S.mkAcik[ad] = !acik; return ciz();          // yalnız görünüm — kaydedilecek bir şey yok
  }
  else if (a.startsWith("mk-oner:")) { marketEkle(a.slice(8)); }
  else if (a === "mk-ek") {
    const ad = String(S.f.mkAd || "").trim();
    if (!ad) { toast(T("Kalem adı yaz")); return; }
    marketEkle(ad); S.f.mkAd = "";
  }
  else if (a.startsWith("mk-ek-sil:")) {
    const x = a.slice(10);
    S.marketEk = S.marketEk.filter(v => v !== x);
    delete S.market[x];
  }
  else if (a === "mk-sifirla") { S.market = {}; toast(T("İşaretler temizlendi")); }

  /* ---- yemek ---- */
  else if (a.startsWith("yem-ac:")) { S.araHedef = par(1); S.ara = ""; S.f = {}; S.odakAra = true; }
  else if (a === "ara-kapat") { S.araHedef = ""; S.ara = ""; S.f = {}; }
  else if (a.startsWith("sayac:")) { sayacBaslat(parseInt(par(1), 10)); return; }
  /* "+1 dk" gerçekten ekliyor; yeniden başlatmıyor */
  else if (a.startsWith("sayac-ekle:")) {
    if (!sayacBitis) return;
    sayacBitis += (parseInt(par(1), 10) || 60) * 1000;
    sayacTik(); return;
  }
  else if (a === "sayac-dur") { sayacDur(); return ciz(); }
  else if (a.startsWith("bes-sec:")) {
    const b = besinAra(S.ara)[parseInt(par(1), 10)];
    if (b) { S.f.besin = b; S.f.besinGram = String(b.pGram); }
  }
  else if (a.startsWith("porsiyon:")) { S.f.besinGram = par(1); }
  /* Barkod: bilinen kod doğrudan miktara, bilinmeyen kod tanımlama adımına */
  else if (a === "barkod") {
    Yerel.barkodTara().then(kod => {
      if (!kod) { toast(T("Kod okunamadı")); return; }
      const kayit = S.barkod[kod];
      if (kayit) {
        S.f = { besin: { ...kayit, grup: "Barkod" }, besinGram: String(kayit.sonGram || kayit.pGram || 100),
                barkodKodu: kod };
        toast(kayit.ad);
      } else {
        S.f = { barkodKod: kod, bkAd: "", bkKcal: "", bkP: "", bkGram: "" };
      }
      kaydet(); ciz();
    });
    return;
  }
  else if (a === "bk-kaydet") {
    const kod = S.f.barkodKod, ad = String(S.f.bkAd || "").trim();
    const kc = sayi(S.f.bkKcal), pr = sayi(S.f.bkP), gr = sayi(S.f.bkGram);
    if (!kod) return;
    if (!ad) { toast(T("Ürün adını yaz")); return; }
    /* 100 g'da 900 kcal saf yağ demek; üstü etiket okuma hatasıdır */
    if (!(kc >= 0 && kc <= 900)) { toast(T("100 g'daki kaloriyi gir")); return; }
    const pGram = gr > 0 && gr <= 5000 ? Math.round(gr) : 100;
    const kayit = { ad, kcal: Math.round(kc), p: isFinite(pr) && pr >= 0 ? +pr.toFixed(1) : 0,
                    k: 0, y: 0, pAd: "porsiyon", pGram };
    S.barkod[kod] = { ...kayit, sonGram: pGram };
    ozelBesinKaydet(kayit.ad, kayit.kcal, kayit.p);   // aramada da çıksın
    S.f = { besin: { ...kayit, grup: "Barkod" }, besinGram: String(pGram), barkodKodu: kod };
    toast(T("Barkod kaydedildi"));
  }
  else if (a.startsWith("bk-sil:")) {
    delete S.barkod[a.slice(7)];
    toast(T("Barkod silindi"));
  }
  else if (a.startsWith("bes-son:")) {
    const b = sonBesinler(8)[parseInt(par(1), 10)];
    if (b) { yemekEkle({ ad: b.ad, kcal: b.kcal, p: b.p, gram: b.gram }); S.ara = ""; S.odakAra = true; toast(Tf("{a} eklendi", { a: b.ad })); }
  }
  else if (a === "besin-ekle") {
    const b = S.f.besin, gr = sayi(S.f.besinGram);
    if (!b) return;
    if (!(gr > 0 && gr <= 5000)) { toast(T("Miktarı gir")); return; }
    /* Barkodla geldiyse bu miktarı hatırla — ürünü hep aynı porsiyonda yiyorsun */
    if (S.f.barkodKodu && S.barkod[S.f.barkodKodu]) S.barkod[S.f.barkodKodu].sonGram = Math.round(gr);
    const yeni = { ad: b.ad, kcal: Math.round(b.kcal * gr / 100), p: +(b.p * gr / 100).toFixed(1), gram: Math.round(gr) };
    if (S.f.duzenleUid) {
      const y = g.yenen.find(x => x.uid === S.f.duzenleUid);
      if (y) Object.assign(y, yeni);
      S.araHedef = ""; S.f = {}; toast(T("Güncellendi"));
    } else {
      yemekEkle(yeni);
      S.f = {}; S.ara = ""; S.odakAra = true; toast(Tf("{a} eklendi", { a: b.ad }));
    }
  }
  else if (a === "besin-iptal") {
    if (S.f.duzenleUid || S.f.elleDuzenle) { S.araHedef = ""; S.f = {}; }
    else { S.f = {}; S.odakAra = true; }
  }
  else if (a === "el-ekle") {
    const ad = String(S.f.elAd || "").trim(), kc = sayi(S.f.elKcal), pr = sayi(S.f.elP);
    if (!ad) { toast(T("Ne yediğini yaz")); return; }
    if (!(kc >= 0 && kc <= 20000)) { toast(T("Kalori gir")); return; }
    const pro = isFinite(pr) && pr >= 0 ? +pr.toFixed(1) : 0;
    ozelBesinKaydet(ad, Math.round(kc), pro);
    yemekEkle({ ad, kcal: Math.round(kc), p: pro, gram: 100 });
    S.f = {}; S.ara = ""; S.odakAra = true;
    toast(Tf("{a} eklendi ve listene kaydedildi", { a: ad }));
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
    if (!ad) { toast(T("Ne yediğini yaz")); return; }
    if (!(kc >= 0 && kc <= 20000)) { toast(T("Kalori gir")); return; }
    y.ad = ad; y.kcal = Math.round(kc); y.p = isFinite(pr) && pr >= 0 ? +pr.toFixed(1) : 0;
    S.araHedef = ""; S.f = {}; toast(T("Güncellendi"));
  }
  else if (a.startsWith("ogun-kaydet:")) {
    const kayit = ogunKaydet(a.slice(12));
    toast(kayit ? T("Kaydedildi — yemek eklerken tek dokunuşla çıkacak") : T("Önce bu öğüne bir şeyler ekle"));
  }
  else if (a.startsWith("kyt-ekle:")) {
    const m = S.kayitliOgun[parseInt(par(1), 10)];
    if (!m) return;
    m.kalemler.forEach(y => yemekEkle({ ad: y.ad, kcal: y.kcal, p: y.p, gram: y.gram }));
    S.araHedef = ""; S.ara = ""; S.f = {};
    toast(Tf("{n} kalem eklendi", { n: m.kalemler.length }));
  }
  else if (a.startsWith("kyt-sil:")) {
    S.kayitliOgun.splice(parseInt(par(1), 10), 1);
    toast(T("Kayıtlı öğün silindi"));
  }
  else if (a.startsWith("yem-dun:")) {
    const oid = a.slice(8);
    const dun = ((S.gunler[gunEkle(bugun(), -1)] || {}).yenen || []).filter(y => y.ogun === oid);
    if (!dun.length) { toast(T("Dün bu öğünde kayıt yok")); return; }
    dun.forEach(y => yemekEkle({ ad: y.ad, kcal: y.kcal, p: y.p, gram: y.gram }, oid));
    toast(Tf("{n} kalem eklendi", { n: dun.length }));
  }
  else if (a.startsWith("yem-sil:")) {
    const uid = a.slice(8);
    g.yenen = g.yenen.filter(y => y.uid !== uid);
    if (S.f.duzenleUid === uid || S.f.elleDuzenle === uid) { S.araHedef = ""; S.f = {}; }
    toast(T("Silindi"));
  }

  /* ---- antrenman ---- */
  else if (a.startsWith("set-ekle:")) {
    const l = seansYaz(bugun(), par(1));
    l.set = (l.set || []).concat([{ ad: "", setler: bosSetler() }]);
  }
  else if (a.startsWith("set-sil:")) {
    const l = seansYaz(bugun(), par(1));
    (l.set || []).splice(parseInt(par(2), 10), 1);
  }
  /* Set satırları. Yeni set, son setin tekrar/ağırlığıyla açılıyor — çoğu
     zaman aynısını yapacaksın, değişecekse zaten üzerine yazıyorsun. */
  else if (a.startsWith("setr-ekle:")) {
    const e = (seansYaz(bugun(), par(1)).set || [])[parseInt(par(2), 10)];
    if (!e) return;
    if (!Array.isArray(e.setler)) e.setler = bosSetler(0);
    if (e.setler.length >= 12) { toast(T("En fazla 12 set")); return; }
    const son = e.setler[e.setler.length - 1];
    e.setler.push({ tekrar: son ? son.tekrar : "", kg: son ? son.kg : "", ok: false });
  }
  else if (a.startsWith("setr-sil:")) {
    const e = (seansYaz(bugun(), par(1)).set || [])[parseInt(par(2), 10)];
    if (!e || !Array.isArray(e.setler) || e.setler.length <= 1) return;
    e.setler.pop();
  }
  else if (a.startsWith("setr-ok:")) {
    const e = (seansYaz(bugun(), par(1)).set || [])[parseInt(par(2), 10)];
    const st = e && (e.setler || [])[parseInt(par(3), 10)];
    if (!st) return;
    st.ok = !st.ok;
    Yerel.titre("Light");
    /* Seti bitirmek dinlenmeyi başlatıyor — telefonu bırakıp sayaç kurmuyorsun */
    if (st.ok) sayacBaslat(dinlenmeSn());
  }
  else if (a.startsWith("dinlenme:")) {
    S.profil.dinlenme = kis(parseInt(par(1), 10) || 90, 15, 600);
    sayacBaslat(S.profil.dinlenme);
  }
  /* Geçen seansın ağırlıklarını satırlara yazar. Sıfırdan yazmak yerine
     üstüne bir tekrar / biraz kilo eklemek istiyorsun — asıl iş o. */
  else if (a.startsWith("set-doldur:")) {
    const sid = par(1), s = gunSeanslari(bugun()).find(x => x.sid === sid);
    if (!s) return;
    const onceki = gecenAntrenman(s.spor), l = seansYaz(bugun(), sid);
    if (!Array.isArray(l.set)) l.set = [];
    const kopya = ad => onceki[ad].map(st => ({ tekrar: st.tekrar, kg: st.kg, ok: false }));
    let n = 0;
    l.set.forEach(e => { if (onceki[e.ad]) { e.setler = kopya(e.ad); n++; } });
    Object.keys(onceki).forEach(ad => {
      if (l.set.some(e => e.ad === ad)) return;
      const bosSatir = l.set.find(e => !e.ad);
      if (bosSatir) { bosSatir.ad = ad; bosSatir.setler = kopya(ad); }
      else l.set.push({ ad, setler: kopya(ad) });
      n++;
    });
    toast(n ? Tf("{n} egzersiz dolduruldu", { n }) : T("Geçen seans kaydı yok"));
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
    if (!(kilo > 0)) { toast(T("En azından kiloyu gir")); return; }
    if (bel && boyun && S.profil.cinsiyet !== "k" && bel <= boyun) { toast(T("Bel, boyundan büyük olmalı")); return; }
    const o = { tarih: bugun(), kilo };
    if (bel) o.bel = bel; if (boyun) o.boyun = boyun;
    if (S.profil.cinsiyet === "k" && kalca) o.kalca = kalca;
    S.olcumler = [...S.olcumler.filter(x => x.tarih !== o.tarih), o];
    S.profil.kilo = kilo;
    if (S.profil.saglik) Yerel.saglikKiloYaz(kilo);
    if (!S.profil.kcalElle) { const hh = hedefHesapla(); if (hh) { S.profil.kcal = hh.kcal; S.profil.protein = hh.protein; } }
    S.f = {}; toast(T("Ölçüm kaydedildi"));
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
    if (!(kc >= 800 && kc <= 6000)) { toast(T("Kalori 800-6000 arası olmalı")); return; }
    S.profil.kcal = Math.round(kc);
    if (pr > 0) S.profil.protein = Math.round(pr);
    if (su > 0) S.profil.suHedef = kis(Math.round(su), 1, 40);
    const bml = sayi(S.f.aBardak);
    if (bml >= 50 && bml <= 2000) S.profil.bardakMl = Math.round(bml);
    S.profil.kcalElle = true; ayarFormDoldur(); toast(T("Hedefler kaydedildi"));
  }
  else if (a.startsWith("bardak:")) {
    bardakAyarla(parseInt(par(1), 10));
    ayarFormDoldur(); toast(Tf("Bardak {ml} ml · hedef {n} bardak", { ml: bardakMl(), n: S.profil.suHedef }));
  }
  else if (a === "ayar-oto") {
    S.profil.kcalElle = false;
    const h = hedefHesapla();
    if (h) { S.profil.kcal = h.kcal; S.profil.protein = h.protein; S.profil.suHedef = h.su; toast(T("Otomatik hedeflere dönüldü")); }
  }
  else if (a === "ayar-profil") {
    const d = sayi(S.f.pDogum), b = sayi(S.f.pBoy), kg = sayi(S.f.pKilo);
    if (d >= 1920 && d <= new Date().getFullYear() - 10) S.profil.dogumYili = Math.round(d);
    if (b >= 100 && b <= 250) S.profil.boy = b;
    if (kg >= 25 && kg <= 400) S.profil.kilo = kg;
    if (S.f.pAntrSaat) S.profil.antrSaat = S.f.pAntrSaat;
    if (!S.profil.kcalElle) { const h = hedefHesapla(); if (h) { S.profil.kcal = h.kcal; S.profil.protein = h.protein; S.profil.suHedef = h.su; } }
    ayarFormDoldur(); toast(T("Profil kaydedildi"));
  }
  else if (a === "yer-saglik") {
    if (S.profil.saglik) S.profil.saglik = false;
    else {
      /* İzin, özellik ilk açıldığında isteniyor — kurulumda topluca değil */
      Yerel.saglikIzin().then(ok2 => {
        S.profil.saglik = ok2;
        kaydet(); ciz();
        toast(ok2 ? T("Sağlık senkronu açıldı") : T("Sağlık izni verilmedi"));
      });
      return;
    }
  }
  else if (a === "yer-bildirim") {
    if (S.profil.bildirim) { S.profil.bildirim = false; Yerel.bildirimKur([]); }
    else {
      Yerel.bildirimIzin().then(ok2 => {
        S.profil.bildirim = ok2;
        kaydet(); bildirimleriKur(); ciz();
        toast(ok2 ? T("Hatırlatıcılar açıldı") : T("Bildirim izni verilmedi"));
      });
      return;
    }
  }
  else if (a === "yer-bild-su") { S.profil.bildirimSu = !S.profil.bildirimSu; bildirimleriKur(); }
  else if (a === "yer-bild-antr") { S.profil.bildirimAntrenman = !S.profil.bildirimAntrenman; bildirimleriKur(); }
  else if (a.startsWith("ayar-cins:")) { S.profil.cinsiyet = par(1); }
  else if (a.startsWith("ayar-hedefTip:")) { S.profil.hedef = par(1); if (!S.profil.kcalElle) { const h = hedefHesapla(); if (h) { S.profil.kcal = h.kcal; S.profil.protein = h.protein; } } }
  else if (a.startsWith("ayar-akt:")) { S.profil.aktivite = par(1); if (!S.profil.kcalElle) { const h = hedefHesapla(); if (h) { S.profil.kcal = h.kcal; S.profil.protein = h.protein; } } }
  else if (a.startsWith("ayar-ogun:")) { ogunKur(par(1)); toast(T("Öğün düzeni güncellendi")); }
  else if (a === "ogun-ekle") {
    if (S.ogunler.length >= 10) { toast(T("En fazla 10 öğün")); return; }
    const son = S.ogunler[S.ogunler.length - 1];
    S.ogunler.push({ id: yeniOid(), ad: T("Yeni öğün"), saat: son ? son.saat : "12:00",
                     p: S.ogunler.length ? 1 / (S.ogunler.length + 1) : 1 });
  }
  else if (a.startsWith("ogun-sil:")) {
    if (S.ogunler.length <= 1) { toast(T("En az bir öğün olmalı")); return; }
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
    toast(T("Paylar eşitlendi"));
  }
  else if (a.startsWith("ayar-spor:")) {
    const id = par(1), i = S.sporlar.indexOf(id);
    if (i === -1) S.sporlar.push(id);
    else { S.sporlar.splice(i, 1); sporSeanslariniSil(id); }
  }
  else if (a.startsWith("alis-ac:")) {
    const sb = ALISKANLIK_SABLON.find(x => x.id === par(1));
    if (sb) { S.aliskanlik = { aktif: true, ad: T(sb.ad), birim: T(sb.birim), baslangic: bugun(), hafta1: sb.baslangic }; toast(T("Takip başladı")); }
  }
  else if (a === "alis-kapat") { S.aliskanlik = null; toast(T("Takip kapatıldı")); }
  else if (a.startsWith("kcal-oneri:")) {
    const v = parseInt(par(1), 10);
    if (!(v > 0)) return;
    /* Elle ayarlanmış sayılıyor: bir daha formül üzerine yazmasın. */
    S.profil.kcal = v; S.profil.kcalElle = true; S.profil.kcalAyarTarih = bugun();
    toast(Tf("Günlük hedef {n} kcal · iki hafta böyle git", { n: v }));
  }
  else if (a === "sifirla") {
    if (!S.f.silOnay) { S.f.silOnay = true; toast(T("Eminsen bir daha bas")); ciz(); return; }
    localStorage.removeItem(ANAHTAR);
    S = Object.assign(varsayilan(), { tab: "bugun", f: {}, ara: "", araHedef: "", daha: "", yedekMetin: "" });
    toast(T("Her şey silindi")); return ciz();
  }

  /* ---- yedek ---- */
  else if (a === "yedek-kopyala") {
    const j = yedekJson();
    S.sonYedek = bugun();
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(j).then(() => toast(T("Yedek kopyalandı")), () => { S.yedekMetin = j; ciz(); toast(T("Aşağıdaki kutudan kopyala")); });
    else { S.yedekMetin = j; toast(T("Aşağıdaki kutudan kopyala")); }
  }
  else if (a === "yedek-indir") {
    const url = URL.createObjectURL(new Blob([yedekJson(true)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "fitplan-yedek-" + bugun() + ".json";
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    S.sonYedek = bugun(); toast(T("Dosya indirildi"));
  }
  else if (a === "yedek-yukle") {
    const ta = document.getElementById("yedek-in");
    try {
      const d = JSON.parse(ta.value);
      if (!d || typeof d !== "object") throw 0;
      KALICI.forEach(x => { if (d[x] !== undefined) S[x] = d[x]; });
      duzelt();
      S.profil.tamam = true; S.yedekMetin = ""; toast(T("Yedek geri yüklendi"));
    } catch (err) { toast(T("Geçersiz yedek metni")); return; }
  }
  else return;

  kaydet(); ciz();
});

/* Bir spor listeden çıkarılınca o spora ait seanslar programdan da silinir,
   yoksa programda tanınmayan seans kalır. */
function sporSeanslariniSil(id) {
  S.program.forEach(p => { p.seanslar = (p.seanslar || []).filter(s => s.spor !== id); });
}

function yemekEkle(y, ogunId) {
  const g = gun();
  g.yenen.push({ uid: "y" + Date.now() + Math.round(Math.random() * 1e4) + g.yenen.length,
                 ogun: ogunId || S.araHedef || "genel", ...y });
}

/* Alışveriş listesine kalem ekle. Ad iki yerden geliyor: kullanıcının yazdığı
   metin ve "sık yediklerin" önerisi. data-act'ı ":" ile böldüğümüz için ad
   içindeki iki nokta temizleniyor. */
function marketEkle(ad) {
  const t = String(ad).replace(/:/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!t) return;
  const s = sadeAd(t);
  if (marketGruplari().some(g => g.i.some(x => sadeAd(x) === s))) { toast(Tf("{a} zaten listede", { a: t })); return; }
  if (S.marketEk.length >= 60) { toast(T("Kendi listen dolu (60)")); return; }
  S.marketEk.push(t);
  S.mkAcik["Kendi eklediklerin"] = true;
  toast(Tf("{a} listeye eklendi", { a: t }));
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
  if (t.dataset.setr) {
    const [sid, i, si, alan] = t.dataset.setr.split(":");
    const e = (seansYaz(bugun(), sid).set || [])[i];
    if (e && e.setler && e.setler[si]) { e.setler[si][alan] = t.value; kaydetGecikmeli(); }
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
/* Kayıtlı dil tercihi varsa uygula; yoksa cihaz dili (dil.js'teki tahmin)
   geçerli kalır. Besin listesi de burada doğru dille yeniden kurulur. */
dilAyarla(S.profil.dil || DIL);
if (kurulumGerek()) kurulumFormDoldur();
ciz();
if (gocBildir) setTimeout(() => toast(T("Eski verin taşındı — öğün işaretleri hariç")), 600);

/* Yerel kabukta: iCloud'dan çek, bildirimleri tazele */
if (Yerel.var()) {
  bulutSenkron();
  document.addEventListener("resume", bulutSenkron);
  setTimeout(bildirimleriKur, 1200);
}

if ("serviceWorker" in navigator)
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
