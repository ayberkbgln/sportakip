# Plan — kişisel takip PWA'sı

Bu depo, tek kişilik bir beslenme/antrenman takip uygulaması. iPhone'da ana ekrana
eklenip tam ekran çalışacak. Sunucu yok, hesap yok, build adımı yok — statik dosyalar.

Kullanıcı: Ayberk. Kickbox'a yeni başladı, yağ kaybı hedefliyor, Türkçe konuşuyor.
Arayüz metinleri Türkçe olacak.

---

## Görev 1 — Depoyu kur ve yayına al ✅ (kod tarafı tamam)

**Mevcut durum:** kod `ayberkbgln/sportakip` deposunda, dosyalar kökte. Depo **public**
olduğu için Görev 2 uygulandı — kodda artık sabit vücut ölçüsü yok. Geriye yalnızca
kullanıcının tarayıcıdan yapacağı yayın adımı kaldı.

### Seçenek A — GitHub Pages (public depo, en kısa yol)

Depo zaten public, ek bir şey gerekmiyor:

`Settings` → `Pages` → Source: **Deploy from a branch** → Branch: `main` / `(root)` → Save

1-2 dakika sonra adres: `https://ayberkbgln.github.io/sportakip/`

`gh` CLI ile de açılabilir:

```bash
gh api --method POST repos/ayberkbgln/sportakip/pages \
  -f "source[branch]=main" -f "source[path]=/"
```

`gh` kurulu değilse veya oturum açılmamışsa **kullanıcıdan `gh auth login` çalıştırmasını
iste.** Kimlik bilgisi girme, token oluşturma, parola yazma işlerini sen yapma.

### Seçenek B — Private depo + Cloudflare Pages

Depoyu private'a çevirmek istenirse: `Settings` → `General` → `Danger Zone` →
`Change repository visibility` → Private. Sonra `dash.cloudflare.com` → Workers & Pages →
Create → Pages → Connect to Git → `sportakip` deposunu seç. Build ayarları:

| Alan | Değer |
|---|---|
| Framework preset | None |
| Build command | *(boş bırak)* |
| Build output directory | `/` |

Netlify de aynı işi görür (Base directory boş, Publish directory `.`).
Her ikisi de ücretsiz planda private depodan yayın yapar ve HTTPS verir.

### Yayından sonra doğrula

- [ ] Adres tarayıcıda açılıyor, konsol hatası yok
- [ ] `manifest.json` ve `sw.js` 200 dönüyor (404 ise Pages yolu yanlış)
- [ ] Service worker kaydoldu (DevTools → Application → Service Workers)
- [ ] Uçak modunda sayfa hâlâ açılıyor
- [ ] iPhone Safari'de aç → Paylaş → **Ana Ekrana Ekle** → ikon çıkıyor,
      açılışta Safari çubuğu görünmüyor

---

## Görev 2 — Kişisel veriyi koddan çıkar ✅ TAMAMLANDI

Depo public olduğu için zorunluydu. `BOY` ve `ILK_OLCUM` sabitleri kaldırıldı;
vücut ölçüleri artık **yalnızca cihazdaki localStorage'da** tutuluyor. Sonuçta oluşan
tasarım:

1. `S.boy` durumda tutulur, `yukle()` / `kaydet()` ve yedek JSON'u içine dahildir.
2. `S.olcumler` boş dizi olarak başlar — kodda başlangıç ölçümü yoktur.
3. `kurulumGerek()` doğruysa (`!S.boy || S.olcumler.length === 0`) `ciz()` normal
   ekran yerine `vKurulum()`'u basar; alt menü çizilmez.
   - **İlk kurulum** (hiç ölçüm yok): boy + kilo + bel + boyun sorar.
   - **Göç** (eski veri var, `boy` yok): yalnızca boyu sorar, birikmiş veriyi korur.
4. `navy()` `S.boy` kullanır ve boy yoksa `null` döner. Tabloda/kartta `navyStr()`
   sarmalayıcısı `null` gelince `—` basar, çökmez.
5. "Ölçüm" sekmesinin altındaki **Boy** kartından boy sonradan güncellenebilir
   (`data-act="boy-kaydet"`, 100-250 cm doğrulaması).

Ayrıca aynı gerekçeyle: Ölçüm sekmesindeki ara/ana hedefler artık kodda sabit değil,
kullanıcının **kendi ilk ölçümünden** türüyor (`HEDEF` sabiti + `hedefler()`), ve
Rehber'deki sağlık notundan somut bel ölçüsü çıkarıldı — not ve tıbbi uyarı yerinde duruyor.

Kurulum ekranı mevcut tasarım dilini kullanır: aynı CSS değişkenleri, aynı `.card`,
`.lbl`, `input`, `.btn.gold` sınıfları. Yeni stil sınıfı eklenmedi.

---

## Dosya yapısı

```
index.html      Uygulamanın tamamı — HTML + CSS + JS tek dosyada
manifest.json   Ana ekran uygulaması tanımı
sw.js           Çevrimdışı önbellek (service worker)
icon-180.png    apple-touch-icon (iOS ana ekran)
icon-192.png    manifest ikonu
icon-512.png    manifest ikonu
OKU-BENI.txt    Kullanıcı için kurulum notu
CLAUDE.md       Bu dosya
```

---

## Kesin kurallar — bunları bozma

1. **Build adımı ekleme.** npm yok, bundler yok, `package.json` yok.
   Dosyalar bir statik sunucuya konduğu gibi çalışmalı.
2. **Dış bağımlılık ekleme.** CDN'den React, Tailwind, font, ikon kütüphanesi çekme.
   Uygulama uçak modunda çalışmak zorunda. İkonlar satır içi SVG, fontlar sistem fontu.
3. **Tek dosya kalsın.** `index.html` bölünmesin. CSS `<style>`, JS `<script>` içinde.
4. **Veri yalnızca cihazda.** Analytics yok, uzak sunucuya istek yok, hesap yok.
   Ölçüm ve öğün verisi hiçbir yere gönderilmez.
5. **`ANAHTAR` sabitini değiştirme** (`"ayberk-plan-v1"`). Değiştirirsen kullanıcının
   birikmiş verisi erişilemez olur. Veri şeması gerçekten kırılacaksa önce
   geçiş (migration) kodu yaz, sonra sürüm numarasını artır.
6. **`sw.js` içindeki `CACHE` adını her dağıtımda artır** (`plan-v1` → `plan-v2`).
   Artırmazsan kullanıcı eski sürümde takılı kalır — iOS önbelleği inatçıdır.
7. **Türkçe karakterler.** Dosyalar UTF-8. `charset` meta etiketini silme.
8. **Tıbbi iddia ekleme.** Rehber sekmesindeki sağlık notu ve "bu plan tıbbi tavsiye
   değildir" ifadesi kalsın.
9. **Kafein kuralını silme.** Rehber'deki "KAFEİN KURALI" maddesi ve `TAK_KICKBOX` /
   `TAK_AGIRLIK` ayrımı bilerek böyle: iki üründe de porsiyon başına 100 mg kafein var ve
   kullanıcı 20:30-22:00 arası antrenman yapıyor. İkisini aynı güne veya akşam saatine
   taşıma.

---

## Veri modeli

Tek bir localStorage anahtarı: `ayberk-plan-v1`, JSON string.

```jsonc
{
  "boy": 0,                                     // cm — kurulum ekranında sorulur
  "gunler": {
    "2026-08-11": {
      "su": 9,                                  // bardak sayısı, 1 bardak = 250 ml
      "ogun":     { "t1": true, "t3": true },   // öğün id → yendi mi
      "takviye":  { "kreatin": true },          // takviye id → alındı mı
      "antrenman": true,
      "tea": 2                                  // içilen 330 ml kutu sayısı
    }
  },
  "olcumler": [
    { "tarih": "2026-08-11", "kilo": 0, "bel": 0, "boyun": 0 }
  ],
  "market": { "Yumurta — 30 adet": true },      // ürün metni → alındı mı
  "sonYedek": "2026-08-11"
}
```

Örnekteki sayılar sıfır — **bu dosyaya gerçek ölçü yazma**, depo public.

Notlar:

- Tarihler her zaman **yerel** `YYYY-AA-GG`. `iso()` fonksiyonu saat dilimi kaymasını
  düzeltir — `toISOString()`'i doğrudan kullanma, gün kayar.
- `boy` yoksa (eski kayıt) uygulama açılışta yalnızca boyu sorar, geri kalan veri durur.
- Yedek JSON'u `boy`'u da taşır; `boy` içermeyen eski yedekler mevcut boyu ezmez.
- `market` anahtarı ürün metninin kendisi. Ürün metnini değiştirirsen o ürünün işareti
  sıfırlanır; kabul edilebilir ama bilerek yap.
- `gunler` sınırsız büyür. 5 yılda ~2 MB civarı, localStorage kotası için sorun değil.

---

## Kod haritası (`index.html`)

| Bölüm | İçerik |
|---|---|
| `<style>` | Tüm CSS. Renkler `:root` içinde CSS değişkeni. Yeni renk uydurma, mevcutları kullan. |
| `SABİTLER` | `OGUN`, `TAK_GUNLUK` / `TAK_KICKBOX` / `TAK_AGIRLIK`, `HAFTA`, `MARKET`, `HEDEF`, `REHBER` — plan içeriği burada, veriyle kod ayrı. |
| `YARDIMCILAR` | `iso`, `trT`, `gunBilgi`, `ogunler`, `navy`, `navyStr`, `sayi`, `hedefler`, `teaFaz`, `esc` |
| `DURUM` | `S` nesnesi, `yukle()`, `kaydet()`, `kurulumGerek()`, `gun()`, `toast()` |
| `PARÇALAR` | `kart()`, `satir()`, `alan()`, `tally()` — HTML string üreten fonksiyonlar |
| `SEKMELER` | `vKurulum`, `vBugun`, `vPlan`, `vOlcum`, `vMarket`, `vRehber` |
| `ÇİZ` | `ciz()` — tüm ekranı yeniden basar, alt menüyü çizer. Kurulum gerekiyorsa alt menüsüz kurulum ekranını basıp çıkar. |
| `OLAYLAR` | Tek bir delege edilmiş `click` dinleyici, `data-act` özniteliğine göre dallanır |

Mimari kasten basit: **durum değişir → `kaydet()` → `ciz()`**. Sanal DOM yok, framework
yok. Yeni bir etkileşim eklerken `data-act="…"` koy ve click dinleyicisine bir dal ekle.

Kullanıcı girdisi ekrana basılıyorsa `esc()` ile kaçır.

---

## Sık istenecek değişiklikler

**Öğün eklemek/değiştirmek** → `OGUN.antrenman` veya `OGUN.normal` dizisi. Her öğünün
benzersiz `id`'si olmalı (`t1…t6`, `r1…r6`). Var olan bir `id`'yi yeniden kullanma,
geçmiş günlerin işaretleri yanlış öğüne bağlanır.

**Kalori/protein hedefi** → `vPlan()` başlığındaki metin ve `vBugun()` içindeki
`hK`/`hP` hesabı. Hedefler öğün listesinin toplamından türüyor, ayrı bir sabit yok.

**Su hedefi** → `BARDAK_HEDEF` (bardak sayısı) ve `BARDAK_ML`. `tally()` 5'li gruplar
hâlinde çizer, 14 sayısı 5+5+4 olarak güzel bölünür; değiştirirken görünümü kontrol et.

**Ice tea aşamaları** → `teaFaz()`. Başlangıç tarihi `TEA_BASLA` sabitinde.

**Takviye eklemek/çıkarmak** → `TAK_GUNLUK` (her gün), `TAK_KICKBOX` (Pzt/Çar/Cum), `TAK_AGIRLIK`
(Sal/Cmt). `takviyeler(k)` fonksiyonu gün tipine göre birleştirir. Her kalemin benzersiz `id`'si
olmalı — aynı takviye günde birden fazla alınıyorsa `cla1`, `cla2`, `cla3` gibi ayrı id ver,
yoksa hepsi tek kutucuk olur.

**Antrenman programı** → `HAFTA` dizisi. `tip` alanı `kickbox` / `agirlik` / `hafif` /
`dinlenme` olabilir; `dinlenme` günlerinde antrenman kartı gizlenir ve gün yüzdesi
hesabından düşer.

**Yeni sekme** → `ADLAR` ve `IKON` nesnelerine ekle, bir `vXxx()` fonksiyonu yaz,
`ciz()` içindeki eşlemeye kaydet. Alt menü 5 sütuna sabit (`grid-template-columns`);
6. sekme eklersen o kuralı da güncelle.

---

## Gizlilik

Uygulamanın kendisi hiçbir veriyi dışarı göndermiyor. Depo public, ama Görev 2
uygulandığı için kodda kişisel ölçü kalmadı — boy, kilo, bel ve boyun yalnızca cihazın
localStorage'ında.

**Bu durumu koru.** Depoya (koda, CLAUDE.md'ye, örnek JSON'lara, ekran görüntülerine,
commit mesajlarına) gerçek vücut ölçüsü yazma. Ölçüye ihtiyaç duyan yeni bir özellik
`S` üzerinden okusun, sabit yazma. Test için gerçek değil uydurma sayı kullan.

Alternatif isterse: `Settings` → `General` → `Change repository visibility` → Private,
sonra Cloudflare Pages/Netlify ile yayınla (Görev 1, Seçenek B).

---

## Değişiklikten sonra kontrol listesi

- [ ] `node --check` ile JS sözdizimi temiz (script'i geçici dosyaya çıkarıp bak)
- [ ] Konsolda hata yok
- [ ] Var olan localStorage verisiyle açılıyor — şema değiştiyse geçiş kodu var
- [ ] `sw.js` içindeki `CACHE` adı artırıldı
- [ ] 390 px genişlikte (iPhone) taşma yok, alt menü içeriği kapatmıyor
- [ ] Koyu tema kontrastı bozulmadı
- [ ] Yedekle → geri yükle turu çalışıyor
- [ ] Türkçe karakterler bozulmadı
