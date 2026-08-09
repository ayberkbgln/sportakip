# Plan — beslenme ve antrenman takibi

Herkesin kendi telefonuna kurup kullanabileceği bir takip uygulaması. Sunucu yok, hesap
yok, build adımı yok — statik dosyalar. Kullanıcının verisi yalnızca kendi cihazında.

Arayüz metinleri Türkçe. Uygulama kickboksa değil, **her spora** göre kuruluyor: dövüş
sporları, ağırlık, kardiyo, takım sporları, esneklik. Öğün planı, takviyeler ve haftalık
program kodda sabit değil — kurulum sihirbazında kullanıcıdan alınıp cihaza yazılıyor.

> Bu depo daha önce tek kişilik bir plandı. Genelleştirildi: kişiye özel hiçbir ölçü,
> öğün, takviye ya da alışkanlık kodda kalmadı. **Bu durumu koru** — aşağıdaki
> "Gizlilik" bölümüne bak.

---

## Dosya yapısı

```
index.html      iskelet — sadece <head> ve script/style etiketleri
stil.css        tüm görünüm; renkler :root içinde anlam taşıyan değişkenler
veri.js         plan içeriği: sporlar, takviye kütüphanesi, öğün şablonları, rehber
besinler.js     besin veritabanı (539 kalem, gruplu)
app.js          durum, ekranlar, olaylar — uygulamanın mantığı
sw.js           çevrimdışı önbellek (service worker)
manifest.json   ana ekran uygulaması tanımı
icon-*.png      ikonlar (180 apple-touch, 192/512 manifest + maskable)
OKU-BENI.txt    kullanıcı için kurulum notu
CLAUDE.md       bu dosya
```

Yükleme sırası önemli: `veri.js` → `besinler.js` → `app.js`. `app.js` diğer ikisindeki
sabitleri kullanıyor.

---

## Kesin kurallar — bunları bozma

1. **Build adımı ekleme.** npm yok, bundler yok, `package.json` yok. Dosyalar bir statik
   sunucuya konduğu gibi çalışmalı.
2. **Dış bağımlılık ekleme.** CDN'den kütüphane, font, ikon çekme. Uygulama uçak modunda
   çalışmak zorunda. İkonlar satır içi SVG, fontlar sistem fontu. Besin verisi de
   gömülü — çalışma anında dış API çağrısı yok.
3. **Dosya sayısını düşük tut.** Yukarıdaki liste yeterli. Yeni bir ekran, yeni bir dosya
   gerektirmiyor; `app.js` içine bir `vXxx()` fonksiyonu yaz.
4. **Veri yalnızca cihazda.** Analytics yok, uzak sunucuya istek yok, hesap yok.
5. **Depolamaya doğrudan dokunma.** `localStorage` yalnızca `Depo.oku` / `Depo.yaz`
   içinden geçer. İleride hesap ve senkron eklenecekse sadece o iki fonksiyon değişir;
   ekranların hiçbiri depolamayı tanımamalı. Bu ayrımı bozma.
6. **`ANAHTAR` sabitini keyfî değiştirme** (`"fitplan-v2"`). Şema gerçekten kırılacaksa
   önce geçiş kodu yaz, sonra sürümü artır — `goc()` fonksiyonu buna örnek.
7. **`sw.js` içindeki `CACHE` adını her dağıtımda artır** (`plan-v6` → `plan-v7`).
   Artırmazsan kullanıcı eski sürümde takılı kalır — iOS önbelleği inatçıdır.
   Yeni bir dosya eklersen `DOSYALAR` listesine de eklemeyi unutma.
8. **Türkçe karakterler.** Dosyalar UTF-8. `charset` meta etiketini silme.
9. **Tıbbi iddia ekleme.** Rehber'deki "Sağlık notu" bölümü, takviye ekranındaki
   "takviye ilaç değildir" uyarısı ve besin veritabanının başındaki doğruluk notu kalsın.
10. **Kafein kuralını silme.** `uyarilar()` fonksiyonu ve takviyelerin `etiket.kafein`
    alanı bilerek böyle. Kafeinli iki ürünün aynı güne düşmesi ve akşam antrenmanından
    önce kafein alınması uykuyu bozar; uygulama bunu söylemek zorunda.
11. **Cinsiyete göre vücut yağ formülü.** Navy yöntemi kadınlarda farklı katsayılar
    kullanır ve **kalça ölçüsü** ister. `navy()` içindeki bu ayrımı tek formüle indirgeme —
    indirgersen kadın kullanıcılarda sessizce yanlış sonuç üretirsin.
12. **Panel (`.sayfa`) `.wrap` içinde basılmaz.** `.wrap` `position:relative` +
    `z-index` taşıdığı için bir yığın bağlamı yaratıyor; panel onun içine girerse
    `z-index:51` o bağlamda hapsolur ve alt menü panelin üstüne biner. `ciz()`
    paneli `nav`'dan sonra, `.wrap`'in dışına basıyor — orada bırak.
13. **`input` olayında `ciz()` çağırma.** Tüm ekranı yeniden basmak yazarken odağı
    kaybettirir; `input type="number"` üzerinde `setSelectionRange` da çalışmadığı için
    imleç başa düşer ve kullanıcı "40" yazarken "04" görür. Canlı hesap gerekiyorsa
    `canliGuncelle()` gibi yalnız ilgili düğümü tazeleyen bir yol yaz.

---

## Veri modeli

Tek localStorage anahtarı: `fitplan-v2`, JSON string. Kalıcı alanlar `KALICI` dizisinde.

```jsonc
{
  "surum": 2,
  "profil": {
    "cinsiyet": "e",          // "e" | "k" — yağ oranı formülünü belirler
    "dogumYili": 0,
    "boy": 0, "kilo": 0,      // cm, kg
    "aktivite": "orta",       // AKTIVITE id
    "hedef": "yag",           // HEDEFLER id
    "kcal": 0, "protein": 0,  // hesaplanır; kcalElle true ise elle ayarlı
    "suHedef": 12,            // bardak, 1 bardak = 250 ml
    "kcalElle": false,
    "antrSaat": "18:00",      // kafein uyarısı bunu kullanır
    "tamam": false            // false ise kurulum sihirbazı çalışır
  },
  "kurulumAdim": 0,
  "sporlar": ["kickbox"],                       // SPORLAR id listesi
  "program": [                                   // 7 kayıt, index = getDay(), 0 = Pazar
    { "spor": "dinlenme", "sablon": "", "sure": 0 }
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
      "antrenman": { "yapildi": true, "sure": "", "round": "", "mesafe": "",
                     "set": [ { "ad": "Squat", "set": "3", "tekrar": "10", "kg": "60" } ] },
      "aliskanlik": 0
    }
  },
  "olcumler": [ { "tarih": "2026-08-11", "kilo": 0, "bel": 0, "boyun": 0, "kalca": 0 } ],
  "market": { "Yumurta": true },
  "ozelBesinler": [],
  "sonYedek": null
}
```

Örnekteki sayılar sıfır — **bu dosyaya gerçek ölçü yazma.**

Notlar:

- Tarihler her zaman **yerel** `YYYY-AA-GG`. `iso()` saat dilimi kaymasını düzeltir —
  `toISOString()`'i doğrudan kullanma, gün kayar.
- `ogunler[].p` o öğünün günlük kalorinin oranı; slot hedefleri buradan türer.
- `takviyeler[].gunler` boş dizi = her gün. Doluysa `getDay()` değerlerini içerir.
- `gunler[].yenen` düz bir liste; `ogun` alanı hangi slota ait olduğunu söyler.
  Öğün "yendi mi" diye kutucuk yok — ne yediğin kayıtlı, toplamlar oradan çıkıyor.
- `olcumler` **günde tek kayıt** tutar; aynı güne ikinci giriş üzerine yazar.
- `gunler` sınırsız büyür. Yemek kaydıyla birlikte 5 yılda ~5-8 MB; localStorage kotası
  (genelde 5-10 MB) için sınırda. Sorun çıkarsa eski günleri arşivle, silme.
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
| `OGUN_SABLON` | 3/4/5/6 öğün ve 16:8 düzenleri; `p` = günlük kalorinin oranı. |
| `ALISKANLIK_SABLON`, `AZALT_EGRISI` | Bırakma modülü ve haftalık azaltma eğrisi. |
| `MARKET_SABLON` | Alışveriş listesi iskeleti. |
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
| `YARDIMCILAR` | `iso`, `trT`, `haftaBasi`, `esc`, `sayi`, `navy`, `bmr`, `hedefHesapla`, `gunProgram`, `aliskanlikDurum`, `besinAra`, `gunToplam`, `haftaButce`, `butceMesaj`, `uyarilar` |
| `DURUM` | `varsayilan()`, `S`, `KALICI`, `yukle()`, `duzelt()`, `goc()`, `kaydet()`, `kaydetGecikmeli()`, `kurulumGerek()`, `gun()`, `toast()` |
| `PARÇALAR` | `kart()`, `satir()`, `alan()`, `secOp()`, `uyariKutu()`, `tally()`, `ilerleme()`, `halka()`, `grafik()` |
| `KURULUM` | `vKurulum()` + `kAdim0…kAdim7`, `adimGecerli()`, `adimUygula()` |
| `SEKMELER` | `vBugun`, `vYemek`, `vAntrenman`, `vIlerleme`, `vDaha` (+ `dMarket`, `dRehber`, `dTakviye`, `dAyar`, `dYedek`) |
| `PANEL` | `yemekPaneli()` — üç adımlı yemek ekleme (`ara` → `miktar` → kaydet), `araListeHtml()`, `besinHesap()`, `ozelBesinKaydet()` |
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

**Spor eklemek** → `SPORLAR` dizisine bir satır. `log` alanları `LOG_ALAN` anahtarlarından
seçilir; `"set"` koyarsan egzersiz tablosu çıkar.

**Takviye eklemek** → `TAKVIYELER` dizisine bir satır. Kafein içeriyorsa `etiket.kafein`
alanını mg olarak doldur, uyarı motoru gerisini halleder.

**Besin eklemek** → `besinler.js` içinde uygun grubun içine bir satır. **Grup içindeki
sıra önemli:** arama eşit alakadaki sonuçları veritabanı sırasına göre eler, o yüzden
yaygın kalemi grubun başına yaz.

**Öğün düzeni eklemek** → `OGUN_SABLON` dizisine bir kayıt; `p` değerlerinin toplamı 1
olmalı.

**Kalori/protein formülü** → `hedefHesapla()`. Şu an Mifflin-St Jeor × aktivite × hedef
çarpanı, ve kalori bazal metabolizmanın altına inmiyor.

**Haftalık bütçe mantığı** → `haftaButce()` ve `butceMesaj()`. Kayıt girilmemiş geçmiş
günler bilerek hesaba katılmaz; katarsan uygulamayı hafta ortasında kuran kullanıcı o
günlerde sıfır kalori yemiş sayılır ve saçma bir bütçe çıkar.

**Rehber maddesi eklemek** → `REHBER` dizisi, `kosul` alanını doğru ayarla.

**Yeni sekme** → `ADLAR` ve `IKON` nesnelerine ekle, bir `vXxx()` yaz, `ciz()` içindeki
eşlemeye kaydet. Alt menü 5 sütuna sabit (`stil.css` içindeki `.nav-in`); 6. sekme
eklersen o kuralı da güncelle. Alternatif: "Daha" sekmesinin altına bir alt sayfa ekle —
`dXxx()` yaz ve `vDaha()` içindeki eşlemeye koy, alt menüyü hiç değiştirme.

---

## İleride hesap ve senkron eklenirse

`Depo` arayüzü bunun için var. Yapılacaklar:

1. `Depo.oku/yaz`'ı asenkron hâle getir (Promise döndürsün) ve çağıranları `await` et.
2. Çakışma çözümü gerekir: `gunler` gün bazında birleştirilebilir, `olcumler` tarih
   bazında. `profil` ve `ogunler` için "son yazan kazanır" yeterli.
3. Hesap eklenirse gizlilik metni ve veri silme yolu da eklenmeli.

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

- [ ] `node --check` her `.js` dosyasında temiz
- [ ] Konsolda hata yok
- [ ] Var olan `fitplan-v2` verisiyle açılıyor; şema değiştiyse `duzelt()` güncellendi
- [ ] `ayberk-plan-v1` verisiyle açılıyor (göç yolu bozulmadı)
- [ ] `sw.js` içindeki `CACHE` adı artırıldı, yeni dosyalar `DOSYALAR` listesinde
- [ ] 390 px genişlikte taşma yok, alt menü içeriği kapatmıyor
- [ ] Koyu tema kontrastı bozulmadı
- [ ] Sayı alanlarına **tuş tuş** yazılıyor (page.fill() bu hatayı yakalamaz)
- [ ] Kurulum sihirbazı baştan sona geçiliyor (erkek ve kadın akışı ayrı ayrı)
- [ ] Yemek ekleme paneli açılıyor, arama/miktar/düzenleme adımları ekranda kalıyor
- [ ] Yedekle → sil → geri yükle turu çalışıyor
- [ ] Türkçe karakterler bozulmadı
