# Plan — beslenme ve antrenman takibi

Herkesin kendi telefonuna kurup kullanabileceği bir takip uygulaması. Sunucu yok, hesap
yok. Kullanıcının verisi yalnızca kendi cihazında ve kendi iCloud alanında.

**İki hedefte çalışıyor:** `web/` klasörü tek başına buildsiz bir PWA; aynı klasör
Capacitor kabuğunun içinde iOS uygulaması olarak da çalışıyor (App Store yolu).

Arayüz metinleri şu an Türkçe. **Planlanan:** App Store sürümü İngilizce çıkacak, TR/EN
seçmeli. Yeni metin yazarken bunu düşün — dize gövdeye gömülü olsun, ama cümleyi
çeviriye uygun kur (dilbilgisi eki uydurma: "Dünü tekrarla" iyi, "Dünkü Kahvaltı'yı
tekrarla" değil). Ayrıca **arayüzde "web/tarayıcı" kelimesi geçmesin** — kullanıcı için
bu bir uygulama; "web" yalnız klasör adı.

Uygulama kickboksa değil, **her spora** göre kuruluyor: dövüş
sporları, ağırlık, kardiyo, takım sporları, esneklik. Öğün planı, takviyeler ve haftalık
program kodda sabit değil — kurulum sihirbazında kullanıcıdan alınıp cihaza yazılıyor.

> Bu depo daha önce tek kişilik bir plandı. Genelleştirildi: kişiye özel hiçbir ölçü,
> öğün, takviye ya da alışkanlık kodda kalmadı. **Bu durumu koru** — aşağıdaki
> "Gizlilik" bölümüne bak.

---

## Dosya yapısı

```
web/                 uygulamanın kendisi — buildsiz, tek başına PWA olarak çalışır
  index.html         iskelet — sadece <head> ve script/style etiketleri
  stil.css           tüm görünüm; renkler :root içinde anlam taşıyan değişkenler
  kopru.js           yerel kabuk köprüsü (Yerel.*) — tarayıcıda hepsi no-op
  veri.js            plan içeriği: sporlar, takviyeler, öğün şablonları, rehber
  besinler.js        besin veritabanı (539 kalem, gruplu)
  app.js             durum, ekranlar, olaylar — uygulamanın mantığı
  sw.js              çevrimdışı önbellek (service worker)
  manifest.json      ana ekran uygulaması tanımı
  gizlilik.html      gizlilik politikası — kendi kendine yeten, stil.css'e bağlı değil
  404.html           bilinmeyen adresler için; Pages bunu otomatik servis eder
  icon-*.png         ikonlar (180 apple-touch, 192/512 manifest + maskable)
  OKU-BENI.txt       kullanıcı için kurulum notu

ios-eklenti/         Xcode projesine elle kopyalanan yerel kaynaklar
  BulutPlugin.swift  iCloud Documents senkronu
  SaglikPlugin.swift HealthKit köprüsü
  App.entitlements   HealthKit + iCloud yetenekleri
  Info-eklenecek.plist  izin metinleri

magaza/              App Store materyalleri (gizlilik, açıklama, inceleme notu,
                     imzalama rehberi, icon-1024.png)
.github/workflows/   ios.yml   → derleme + TestFlight (macOS sunucusunda)
                     pages.yml → web/ klasörünü GitHub Pages'e yayınlar
capacitor.config.json / package.json   iOS kabuğu
KURULUM-MAC.md       Mac'te derleme adımları
CLAUDE.md            bu dosya
```

Yükleme sırası önemli: `kopru.js` → `veri.js` → `besinler.js` → `app.js`.

**Pages ayarı "GitHub Actions" olmalı.** Pages'in "Deploy from a branch" seçeneği
yalnızca `/` ve `/docs` klasörlerini kabul ediyor; uygulama `web/` altında olduğu için
yayın `pages.yml` üzerinden yapılıyor.

**`ios/` klasörü depoya GİRER** (Capacitor'ın önerisi): Xcode yetenekleri, hedefe
eklenmiş Swift dosyaları ve Info.plist anahtarları orada. `.gitignore` yalnızca
`Pods/`, `build/`, `public/` gibi üretilen çıktıları dışlar. Bir kere Mac'te
oluşturulup commit edildikten sonra derleme GitHub Actions'ta yapılıyor
(`.github/workflows/ios.yml`) — Mac'e bir daha gerek yok.

---

## Kesin kurallar — bunları bozma

1. **`web/` buildsiz kalır.** İçindeki dosyalar statik sunucuya konduğu gibi çalışmalı;
   bundler, transpiler, npm paketi girmez. Kökteki `package.json` yalnızca Capacitor
   kabuğu içindir — web tarafı ondan hiçbir şey `import` etmez.
2. **Çalışma anında dış istek yok.** CDN'den kütüphane, font, ikon çekme; uzak API
   çağırma. Uygulama uçak modunda çalışmak zorunda. İkonlar satır içi SVG, fontlar
   sistem fontu, besin verisi gömülü.
3. **Dosya sayısını düşük tut.** Yukarıdaki liste yeterli. Yeni bir ekran, yeni bir dosya
   gerektirmiyor; `app.js` içine bir `vXxx()` fonksiyonu yaz.
4. **Veri kullanıcının kendisinde kalır.** Analytics yok, çökme raporu yok, reklam
   kimliği yok, bizim sunucumuz yok, hesap yok. Senkron yalnızca kullanıcının **kendi**
   iCloud kapsayıcısı üzerinden — geliştiricinin erişimi olmayan bir alan. App Store
   gizlilik formu bu yüzden "Data Not Collected" olarak dolduruluyor; bunu bozan bir
   şey eklersen `magaza/gizlilik.md` de güncellenmek zorunda.
5. **Depolamaya doğrudan dokunma.** `localStorage` yalnızca `Depo.oku` / `Depo.yaz`
   içinden geçer. Bulut aynası da oradan besleniyor (`bulutaGonderGecikmeli`), bu yüzden
   `Depo.yaz` senkron kalmak zorunda — ekranların hiçbiri `await` etmiyor.
6. **`ANAHTAR` sabitini keyfî değiştirme** (`"fitplan-v2"`). Şema gerçekten kırılacaksa
   önce geçiş kodu yaz, sonra sürümü artır — `goc()` fonksiyonu buna örnek.
7. **`sw.js` içindeki `CACHE` adını her dağıtımda artır** (`plan-v10` → `plan-v11`).
   Artırmazsan kullanıcı eski sürümde takılı kalır — iOS önbelleği inatçıdır.
   Yeni bir dosya eklersen `DOSYALAR` listesine de eklemeyi unutma.
8. **Türkçe karakterler.** Dosyalar UTF-8. `charset` meta etiketini silme.
9. **Tıbbi iddia ekleme.** Rehber'deki "Sağlık notu" bölümü, takviye ekranındaki
   "takviye ilaç değildir" uyarısı, besin veritabanının başındaki doğruluk notu ve
   `web/gizlilik.html` içindeki sağlık uyarısı kalsın. App Store'da Health & Fitness
   kategorisinde inceleme bunlara bakıyor.
10. **Kafein kuralını silme.** `uyarilar()` fonksiyonu ve takviyelerin `etiket.kafein`
    alanı bilerek böyle. Kafeinli iki ürünün aynı güne düşmesi ve akşam antrenmanından
    önce kafein alınması uykuyu bozar; uygulama bunu söylemek zorunda.
11. **Cinsiyete göre vücut yağ formülü.** Navy yöntemi kadınlarda farklı katsayılar
    kullanır ve **kalça ölçüsü** ister. `navy()` içindeki bu ayrımı tek formüle indirgeme —
    indirgersen kadın kullanıcılarda sessizce yanlış sonuç üretirsin.
12. **Seans `sid`'lerini yeniden üretme.** Günlük antrenman kaydı
    `gunler[].antrenman.seans[sid]` altında duruyor. Programdaki bir seansın
    `sid`'ini değiştirirsen o seansın geçmiş kaydı öksüz kalır. Seans eklerken
    `yeniSid()` çağır, var olanı asla yeniden yazma.
13. **Panel (`.sayfa`) `.wrap` içinde basılmaz.** `.wrap` `position:relative` +
    `z-index` taşıdığı için bir yığın bağlamı yaratıyor; panel onun içine girerse
    `z-index:51` o bağlamda hapsolur ve alt menü panelin üstüne biner. `ciz()`
    paneli `nav`'dan sonra, `.wrap`'in dışına basıyor — orada bırak.
15. **Yerel özellikler `Yerel.*` üzerinden çağrılır.** `window.Capacitor`'a doğrudan
    dokunma. `kopru.js` tarayıcıda her fonksiyonu sessizce no-op yapıyor; bu sayede
    aynı kod hem PWA'da hem kabukta çalışıyor ve testler native olmadan geçiyor.
16. **HealthKit izni kurulumda toplu istenmez.** Apple'ın beklediği davranış, izni
    özellik ilk açıldığında istemek — Ayarlar → Telefon anahtarındaki akış bu yüzden
    böyle. Kurulum sihirbazına taşıma.
14. **`input` olayında `ciz()` çağırma.** Tüm ekranı yeniden basmak yazarken odağı
    kaybettirir; `input type="number"` üzerinde `setSelectionRange` da çalışmadığı için
    imleç başa düşer ve kullanıcı "40" yazarken "04" görür. Canlı hesap gerekiyorsa
    `canliGuncelle()` gibi yalnız ilgili düğümü tazeleyen bir yol yaz.

---

## Veri modeli

Tek localStorage anahtarı: `fitplan-v2`, JSON string. Kalıcı alanlar `KALICI` dizisinde.

```jsonc
{
  "surum": 2,
  "guncelleme": 0,           // ms — bulut birleştirmesinde "son yazan" kararı
  "profil": {
    "cinsiyet": "e",          // "e" | "k" — yağ oranı formülünü belirler
    "dogumYili": 0,
    "boy": 0, "kilo": 0,      // cm, kg
    "aktivite": "orta",       // AKTIVITE id
    "hedef": "yag",           // HEDEFLER id
    "kcal": 0, "protein": 0,  // hesaplanır; kcalElle true ise elle ayarlı
    "suHedef": 12,            // kaç bardak
    "bardakMl": 250,          // bardak boyutu; günlük hedef = suHedef × bardakMl
    "kcalElle": false,
    "kcalAyarTarih": "",      // son kalori önerisinin uygulandığı gün
    "antrSaat": "18:00",      // kafein uyarısı bunu kullanır
    "tamam": false            // false ise kurulum sihirbazı çalışır
  },
  "kurulumAdim": 0,
  "sporlar": ["kickbox"],                       // SPORLAR id listesi
  "program": [                                   // 7 kayıt, index = getDay(), 0 = Pazar
    { "seanslar": [                              // sıralı; boş liste = dinlenme
      { "sid": "s…", "spor": "kosu",    "sablon": "",            "sure": 12 },
      { "sid": "s…", "spor": "kickbox", "sablon": "",            "sure": 75 },
      { "sid": "s…", "spor": "agirlik", "sablon": "Üst vücut",   "sure": 60 }
    ] }
  ],
  "ogunler": [ { "id": "o1", "ad": "Kahvaltı", "saat": "08:00", "p": 0.28 } ],
  "takviyeler": [ { "id": "kreatin", "ad": "Kreatin", "doz": "5 g", "saat": "08:00",
                    "gunler": [], "etiket": { "kafein": 0 }, "not": "" } ],
  "aliskanlik": { "aktif": true, "ad": "Şekerli içecek", "birim": "kutu",
                  "baslangic": "2026-08-11", "hafta1": 21 },
  "gunler": {
    "2026-08-11": {
      "su": 0,
      "yenen": [ { "uid": "y…", "ogun": "o1", "ad": "…", "kcal": 0, "p": 0, "gram": 0 } ],
      "takviye": { "kreatin": true },
      "antrenman": { "seans": {                  // anahtar = program seansının sid'i
        "s…": { "yapildi": true, "sure": "", "round": "", "mesafe": "",
                "set": [ { "ad": "Squat", "set": "3", "tekrar": "10", "kg": "60" } ] }
      } },
      "aliskanlik": 0,
      "d": 0                                   // ms — gün bazlı birleştirme damgası
    }
  },
  "olcumler": [ { "tarih": "2026-08-11", "kilo": 0, "bel": 0, "boyun": 0, "kalca": 0 } ],
  "market": { "Yumurta": true },        // alışverişte işaretli kalemler
  "marketEk": ["Lahmacun"],             // kullanıcının listeye eklediği kendi kalemleri
  "ozelBesinler": [],
  "kayitliOgun": [ { "id": "m…", "ad": "Kahvaltı · Yulaf +2",
                     "kalemler": [ { "ad": "…", "kcal": 0, "p": 0, "gram": 0 } ] } ],
  "sonYedek": null
}
```

Örnekteki sayılar sıfır — **bu dosyaya gerçek ölçü yazma.**

Notlar:

- Tarihler her zaman **yerel** `YYYY-AA-GG`. `iso()` saat dilimi kaymasını düzeltir —
  `toISOString()`'i doğrudan kullanma, gün kayar.
- `ogunler[].p` bir **ağırlıktır**, mutlak oran değil. Gerçek pay `ogunOran()` ile
  okunurken normalleştirilir (`p / toplamP`). Böylece kullanıcı yüzdeleri elle
  değiştirirken toplamı 100'de tutmak zorunda kalmıyor. Şablonlar 1'e topladığı
  için eski kayıtlar aynen çalışır.
- Öğün sayısı **1'den başlar** — tek öğün yiyen de (OMAD) sık yiyen de kendi düzenini
  kurar. Öğünler eklenip çıkarılabilir, yeniden adlandırılabilir, sıralanabilir.
- Bir öğün silinince ona bağlı `yenen` kayıtları öksüz kalır; Yemek sekmesi bunları
  "Öğün dışı" kartında gösterir. Görünmez kalmamalılar, çünkü günlük toplama giriyorlar.
- **Bulut birleştirmesi** `birlestir()` içinde: `gunler` gün gün (`d` damgası yeni olan
  kazanır), `olcumler` ve `ozelBesinler` anahtar bazında birleşir, gerisi top-level
  `guncelleme`'ye göre "son yazan kazanır". `kaydet()` bugünün `d` damgasını atar —
  uygulama yalnız bugünü düzenlediği için bu yeterli.
- Su hedefi bardak sayısı + bardak boyutu olarak tutulur. Boyut değişince
  `bardakAyarla()` litre hedefini koruyup bardak sayısını yeniden hesaplar.
- `takviyeler[].gunler` boş dizi = her gün. Doluysa `getDay()` değerlerini içerir.
- `gunler[].yenen` düz bir liste; `ogun` alanı hangi slota ait olduğunu söyler.
  Öğün "yendi mi" diye kutucuk yok — ne yediğin kayıtlı, toplamlar oradan çıkıyor.
- Bir gün **birden çok seans** taşıyabilir ve sıra anlamlıdır: ısınma koşusu →
  kickboks → ağırlık → esneme. Günlük kayıt `sid` üzerinden bağlanır, böylece
  programı düzenlemek geçmişi bozmaz. Programdan silinen seansın geçmiş kaydı
  yerinde kalır, sadece artık gösterilmez.
- `olcumler` **günde tek kayıt** tutar; aynı güne ikinci giriş üzerine yazar.
- `kayitliOgun` bir öğünün o günkü kalemlerinin kopyasıdır, canlı bağ değil. Kayıttan
  sonra öğünü değiştirmek şablonu etkilemez — bilerek böyle, "her zamanki kahvaltım"
  sabit kalsın. En fazla 30 kayıt tutulur, yenisi başa eklenir.
- `marketEk` yalnız **kullanıcının kendi eklediği** kalemleri tutar. `MARKET_SABLON`
  ve takviye grubu koddan/durumdan üretilir, oraya yazılmaz. `market` ise işaret
  haritası — "İşaretleri temizle" yalnız onu boşaltır, `marketEk` yerinde kalır.
- `profil.kcalAyarTarih` kalori önerisinin tekrarını engeller: bir öneri uygulandıktan
  sonra 14 gün yeni öneri çıkmaz. Olmasaydı arka arkaya basan kullanıcı hedefini her
  dokunuşta 300 kcal aşağı çekerdi.
- `gunler` sınırsız büyür. Yemek kaydıyla birlikte 5 yılda ~5-8 MB; localStorage kotası
  (genelde 5-10 MB) için sınırda. Sorun çıkarsa eski günleri arşivle, silme.
- Şema göçleri `duzelt()` içinde ve **kalıcı**: `semaDegisti` işaretliyse `yukle()`
  hemen `kaydet()` çağırır, yoksa her açılışta yeniden dönüştürülür ve yedek eski
  şemayla dışarı çıkar. Tek sporlu `program` ve düz `antrenman` kayıtları buradan
  seans listesine çevriliyor; eski günün kaydı o günün ilk seansına bağlanıyor.
- Eski sürümden (`ayberk-plan-v1`) göç `goc()` içinde: su, takviye, antrenman, ice tea
  sayacı ve ölçümler taşınır. Öğün kutucukları taşınmaz — eski şema "yendi mi" tutuyordu,
  yeni şema "ne yedin" tutuyor, aralarında doğru bir eşleme yok.

---

## Kod haritası

### `veri.js` — plan içeriği

| Sabit | İçerik |
|---|---|
| `HEDEFLER` | Yağ kaybı / kas / koruma / performans. `kcal` çarpanı ve `protein` g/kg. |
| `AKTIVITE` | Mifflin-St Jeor çarpanları. |
| `SPORLAR` | 20 spor. `tip` (dovus/guc/kardiyo/takim/esneklik) ve `log` alanları. |
| `LOG_ALAN` | Antrenman günlüğü alan etiketleri. |
| `GUC_SABLON` | Ağırlık antrenmanı egzersiz şablonları. |
| `TAKVIYELER` | 22 takviye. `etiket.kafein` (mg) ve `etiket.tokKarin` uyarı motorunu besler. |
| `OGUN_SABLON` | 1/2/3/4/5/6 öğün ve 16:8 düzenleri; `p` = başlangıç ağırlığı. |
| `ALISKANLIK_SABLON`, `AZALT_EGRISI` | Bırakma modülü ve haftalık azaltma eğrisi. |
| `MARKET_SABLON` | Alışveriş listesi iskeleti — 15 grup, market reyon sırasında. |
| `REHBER` | Rehber içeriği. `kosul` alanı süzme yapar (aşağıya bak). |

`REHBER[].kosul`: `null` = herkese; `"kreatin"` gibi bir takviye id'si = o takviye
seçiliyse; `"@kafein"` = kafeinli takviye varsa; `"@guc"` / `"@dovus"` / `"@kardiyo"` =
o tipte spor seçiliyse.

### `besinler.js` — besin veritabanı

`BESIN_GRUP` — grup adı → satır listesi.
Satır biçimi: `[ad, kcal, protein, karbonhidrat, yağ, porsiyonAdı, porsiyonGram]`.
İlk dört sayı **100 g/ml başına**. Yeni kalem eklemek için ilgili grubun içine bir satır
ekle, başka yeri güncelleme gerekmez. `BESIN_LISTE` düzleştirilmiş, aranabilir hâli;
`sadeAd()` Türkçe karakterleri sadeleştirir (ı→i, ş→s …) ki arama "sut" yazınca da bulsun.

`besinAra()` kelime kelime eşleşir: "izgara tavuk" → "Tavuk göğsü, ızgara". Önce tüm
kelimelerin geçtiği kayıtlar, hiç sonuç yoksa en çok kelimesi geçenler döner. Puanlama
ad başı > kelime başı > orta, tam kelime eşleşmesine ek puan; eşitliği veritabanı sırası
bozar. Ad uzunluğuna göre ceza **yok** — vardı ve "yumurta" aramasında bütün yumurta
yerine yumurta beyazını öne alıyordu.

Kullanıcının elle girdiği yemek `S.ozelBesinler`'e yazılır ve sonraki aramalarda çıkar.
Girilen değerler "1 porsiyon = 100 g" kabul edilir, böylece gramaj hesabı veritabanı
kalemleriyle aynı yoldan geçer.

Değerler yaklaşık referans değerlerdir. **Uydurma sayı ekleme** — emin değilsen kalemi
hiç ekleme, kullanıcı zaten elle girebiliyor.

### `stil.css` — renk sistemi

Renkler yalnız `:root` içinde tanımlı ve **anlam taşıyor**; yeni renk uydurma, mevcut
değişkenlerden birini kullan:

| Değişken | Kullanım |
|---|---|
| `--zemin` / `--yuzey` / `--yuzey2` / `--yuzey3` | sayfa, kart, yükseltilmiş yüzeyler |
| `--cizgi` / `--cizgi-parlak` | ayraç ve kenarlıklar |
| `--metin` / `--soluk` / `--sonuk` | metin hiyerarşisi |
| `--vurgu` | birincil eylem, ilerleme, kalori (asit yeşili) |
| `--su` | hidrasyon |
| `--iyi` | tamamlandı / hedefte |
| `--uyari` | dikkat — kafein, tok karın, slot aşımı |
| `--kotu` | hedef aşıldı / tehlike |

Tasarım yönü "ölçüm aleti": grafit zemin, ince ayraçlar, geniş harf aralıklı mono
mikro-etiketler, kahraman rakamlar. Doku (`body::after` grain) ve üstteki vurgu ışığı
(`body::before`) düz koyu yüzeylerin plastik durmasını engelliyor. Dış font yok —
ayrım paletten, tipografi ölçeğinden ve kompozisyondan geliyor.

### `app.js`

| Bölüm | İçerik |
|---|---|
| `DEPO` | `Depo.oku/yaz/eskiOku`. Depolamaya tek erişim noktası. |
| `YARDIMCILAR` | `iso`, `trT`, `haftaBasi`, `esc`, `sayi`, `navy`, `bmr`, `hedefHesapla`, `kiloOrtalama`, `kaloriOneri`, `aliskanlikDurum`, `besinAra`, `gunToplam`, `haftaButce`, `butceMesaj`, `uyarilar` |
| `ÖĞÜNLER` | `ogunSlotlari`, `ogunOran`, `yeniOid`, `ogunKur`, `ogunDuzenle`, `ogunKaydet`, `kayitToplam` |
| `SEANSLAR` | `gunSeanslari`, `gunSporAdlari`, `gunToplamSure`, `yeniSid`, `seansOku`, `seansYaz`, `antrenmanYapildi`, `yapilanSeans`, `programDuzenle`, `gecenAntrenman`, `setOzet`, `e1rm`, `egzersizRekor`, `sporSeanslariniSil` |
| `ALIŞVERİŞ` | `marketGruplari`, `marketOnerileri`, `marketEkle` |
| `DURUM` | `varsayilan()`, `S`, `KALICI`, `yukle()`, `duzelt()`, `goc()`, `kaydet()`, `kaydetGecikmeli()`, `kurulumGerek()`, `gun()`, `toast()` |
| `PARÇALAR` | `kart()`, `satir()`, `alan()`, `secOp()`, `uyariKutu()`, `tally()`, `ilerleme()`, `halka()`, `grafik()` |
| `KURULUM` | `vKurulum()` + `kAdim0…kAdim7`, `adimGecerli()`, `adimUygula()` |
| `SEKMELER` | `vBugun`, `vYemek`, `vAntrenman`, `vIlerleme`, `vDaha` (+ `dMarket`, `dRehber`, `dTakviye`, `dAyar`, `dYedek`) |
| `PANEL` | `panelHtml()` yönlendirir, `panelSar()` iskelet. `yemekPaneli()` üç adımlı yemek ekleme; takviye / antrenman / alışkanlık detayları da panelde açılır. |
| `SAYAÇ` | `sayacBaslat/Dur/Tik`, `sayacBar()` — set arası dinlenme geri sayımı |
| `ÇİZ` | `ciz()` — kurulum gerekiyorsa alt menüsüz sihirbazı basar ve çıkar |
| `OLAYLAR` | Delege edilmiş `click`, `input`, `change` dinleyicileri |

Mimari kasten basit: **durum değişir → `kaydet()` → `ciz()`**. Sanal DOM yok, framework
yok. Yeni etkileşim eklerken `data-act="…"` koy ve click dinleyicisine bir dal ekle.

**Yeniden çizim ve odak:** `ciz()` tüm ekranı yeniden basar. `input` olayında bunu
**asla** çağırmıyoruz (12. kural). Canlı hesap gösteren yerler `canliGuncelle()` ile
yalnız ilgili düğümü tazeliyor: ölçüm ekranındaki `#on-yag`, gramaj kartındaki
`#bg-kcal` / `#bg-p` / `#bg-ky`. Besin araması da aynı mantıkla yalnız `#ara-liste`
kabının içeriğini değiştiriyor. Diğer alanlar duruma yazıp `kaydetGecikmeli()` çağırıyor.

Kullanıcı girdisi ekrana basılıyorsa `esc()` ile kaçır.

---

## Sık istenecek değişiklikler

**Haftalık programı değiştirmek** → `programDuzenle()` tek bileşen; hem kurulum
sihirbazının 5. adımı hem Antrenman sekmesi onu basıyor. Seans ekleme
`data-seans-ekle`, alan yazımı `data-seans="gün:sıra:alan"`, sıralama
`seans-tasi:gün:sıra:yön`.

**Spor eklemek** → `SPORLAR` dizisine bir satır. `log` alanları `LOG_ALAN` anahtarlarından
seçilir; `"set"` koyarsan egzersiz tablosu çıkar.

**Takviye eklemek** → `TAKVIYELER` dizisine bir satır. Kafein içeriyorsa `etiket.kafein`
alanını mg olarak doldur, uyarı motoru gerisini halleder.

**Besin eklemek** → `besinler.js` içinde uygun grubun içine bir satır. **Grup içindeki
sıra önemli:** arama eşit alakadaki sonuçları veritabanı sırasına göre eler, o yüzden
yaygın kalemi grubun başına yaz.

**Öğün düzeni eklemek** → `OGUN_SABLON` dizisine bir kayıt. `p` değerlerinin toplamı 1
olsun ki düzenleyicide yüzdeler 100 görünsün — zorunlu değil, okurken normalleşiyor.

**Öğün düzenini değiştirmek** → `ogunDuzenle()` tek bileşen; kurulum sihirbazının
6. adımı ve Ayarlar onu basıyor. Ekleme `ogun-ekle`, alan yazımı
`data-ogun="sıra:alan"`, sıralama `ogun-tasi:sıra:yön`, eşitleme `ogun-esit`.
`ogunKur()` şablon uygularken var olan id'leri sırayla yeniden kullanır — böylece
düzeni değiştiren kullanıcının o günkü kayıtları öğünlerine bağlı kalır.

**Kalori/protein formülü** → `hedefHesapla()`. Şu an Mifflin-St Jeor × aktivite × hedef
çarpanı, ve kalori bazal metabolizmanın altına inmiyor.

**Haftalık bütçe mantığı** → `haftaButce()` ve `butceMesaj()`. Kayıt girilmemiş geçmiş
günler bilerek hesaba katılmaz; katarsan uygulamayı hafta ortasında kuran kullanıcı o
günlerde sıfır kalori yemiş sayılır ve saçma bir bütçe çıkar.

**Rehber maddesi eklemek** → `REHBER` dizisi, `kosul` alanını doğru ayarla.

**Alışveriş listesine kalem/grup eklemek** → `MARKET_SABLON`. Grup sırası market
reyonlarını takip ediyor, araya girerken bunu boz­ma. Takviye grubunu koda yazma —
`marketGruplari()` onu `S.takviyeler`'den üretiyor. Ekranda gruplar katlanıyor
(`S.mkAcik`, kalıcı değil); içinde işaret olan grup açık başlar.

**Kalori uyarlaması** → `kaloriOneri()`. 7 günlük iki pencerenin kilo ortalamasını
karşılaştırır, `HAFTALIK_BEKLENTI` ile kıyaslar, 1 kg ≈ 7700 kcal üzerinden günlük
düzeltme önerir (±300 ile sınırlı, bazal metabolizmanın altına inmez). Öneri
kendiliğinden uygulanmaz; `kcalAyarTarih` 14 gün susturur.

**Progresif yükleme** → `e1rm()` (Epley) ve `egzersizRekor()`. Rekor hesabında
**bugünü hariç tut**, yoksa kayıt kendi rekorunu geçemez ve her satır "yeni rekor"
yazar. `set-doldur` geçen seansın ağırlıklarını satırlara yazıyor.

**Bugün ekranı** → hero halka + `.izgara` içinde `.kutu` döşemeleri. Yeni bir döşeme
eklerken `kutular.push(...)` sırasına gir; detay gerekiyorsa `data-act="panel:xxx"` koy
ve `panelHtml()` içine bir dal ekle — ana ekran uzamasın.

**Yeni sekme** → `ADLAR` ve `IKON` nesnelerine ekle, bir `vXxx()` yaz, `ciz()` içindeki
eşlemeye kaydet. Alt menü 5 sütuna sabit (`stil.css` içindeki `.nav-in`); 6. sekme
eklersen o kuralı da güncelle. Alternatif: "Daha" sekmesinin altına bir alt sayfa ekle —
`dXxx()` yaz ve `vDaha()` içindeki eşlemeye koy, alt menüyü hiç değiştirme.

---

## Yerel kabuk (iOS)

`kopru.js` içindeki `Yerel` nesnesi tek geçit. Tarayıcıda her metot sessizce boş döner.

| Alan | Ne yapar |
|---|---|
| `Yerel.bulutOku/bulutYaz/bulutDurum` | iCloud Documents'taki `plan.json` |
| `Yerel.saglikIzin/saglikKiloYaz/saglikSuYaz/saglikAntrenmanYaz/saglikSonKilo` | HealthKit |
| `Yerel.bildirimIzin/bildirimKur` | Yerel bildirimler (`bildirimleriKur()` planlar) |
| `Yerel.titre` | Dokunsal geri bildirim |

Swift tarafının kaynağı `ios-eklenti/` altında; ilk kurulumda Xcode projesine
kopyalanıp hedefe ekleniyor ve `ios/` ile birlikte commit ediliyor. Eklentide
değişiklik yaparsan iki yeri de güncelle. Adımlar `KURULUM-MAC.md` içinde.

Web tarafında bir değişiklik yaptıktan sonra `npx cap sync ios` gerekiyor.

Ekranlarda ya da yardımcılarda `localStorage` araması yapmak zorunda kalıyorsan
5. kural bozulmuş demektir.

---

## Gizlilik

Uygulama hiçbir veriyi dışarı göndermiyor. Depo public; **kodda kişisel veri yok ve
olmamalı.**

Depoya (koda, bu dosyaya, örnek JSON'lara, ekran görüntülerine, commit mesajlarına)
gerçek vücut ölçüsü, gerçek isim ya da kişiye özel bir plan yazma. Ölçüye ihtiyaç duyan
bir özellik `S` üzerinden okusun, sabit yazma. Test için gerçek değil uydurma sayı kullan.

---

## Değişiklikten sonra kontrol listesi

- [ ] `node --check` her `web/*.js` dosyasında temiz
- [ ] Tarayıcıda `Yerel.var()` false; hiçbir yerel çağrı hata vermiyor
- [ ] Konsolda hata yok
- [ ] Var olan `fitplan-v2` verisiyle açılıyor; şema değiştiyse `duzelt()` güncellendi
- [ ] `ayberk-plan-v1` verisiyle açılıyor (göç yolu bozulmadı)
- [ ] `sw.js` içindeki `CACHE` adı artırıldı, yeni dosyalar `DOSYALAR` listesinde
- [ ] 390 px genişlikte taşma yok, alt menü içeriği kapatmıyor
- [ ] Bugün ekranı tek bakışta okunuyor; detaylar panelde açılıyor
- [ ] Koyu tema kontrastı bozulmadı
- [ ] Sayı alanlarına **tuş tuş** yazılıyor (page.fill() bu hatayı yakalamaz)
- [ ] Kurulum sihirbazı baştan sona geçiliyor (erkek ve kadın akışı ayrı ayrı)
- [ ] Bir güne birden çok seans eklenip sıralanıyor; her seans kendi kaydını tutuyor
- [ ] Öğün sayısı 1'e indirilip 6'ya çıkarılıyor; paylar ve slot hedefleri tutuyor
- [ ] Yemek ekleme paneli açılıyor, arama/miktar/düzenleme adımları ekranda kalıyor
- [ ] Yedekle → sil → geri yükle turu çalışıyor
- [ ] Alışverişte grup açılıp kapanıyor, kendi kalemin ekleniyor/siliniyor,
      "işaretleri temizle" `marketEk`'e dokunmuyor
- [ ] Bir öğün kaydedilip panelden tek dokunuşla geri ekleniyor; "dünü tekrarla" doğru
      öğüne yazıyor
- [ ] Aynı egzersizde ağırlık artınca "yeni rekor" çıkıyor, artmayınca çıkmıyor
- [ ] Test sunucusu `stil.css`'i **text/css** olarak servis ediyor — yanlış MIME'de
      sayfa stilsiz açılır ve düzen kontrolleri boşuna geçer
- [ ] Türkçe karakterler bozulmadı
- [ ] İkon değiştiyse dört boyut da (180/192/512 + magaza/icon-1024) yenilendi ve
      1024'lük alfa kanalsız — Apple alfa kanallı ikonu reddediyor
