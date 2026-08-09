# Mac'te iOS kabuğunu kurma

Bu dosya, mevcut web uygulamasını App Store'a gidebilecek bir iOS uygulamasına
çevirmek için gereken adımları sırayla anlatıyor. Web tarafı hiç değişmiyor —
`web/` klasörü aynen çalışmaya devam ediyor, PWA olarak da yayınlanabilir.

> **Test edilmedi uyarısı:** Bu depodaki Swift kodu ve yapılandırma dosyaları
> Mac olmayan bir ortamda yazıldı. Sözdizimi ve API kullanımı gözden geçirildi
> ama **hiçbiri derlenip cihazda çalıştırılmadı.** İlk derlemede düzeltme
> gerekmesi normal; hata mesajını bana getir.

---

## 0. Gereksinimler

- macOS + Xcode (App Store'dan, ~10 GB)
- Node.js 20+
- CocoaPods: `sudo gem install cocoapods`
- Apple Developer hesabı (var)

## 1. Bağımlılıkları kur

```bash
git clone https://github.com/ayberkbgln/sportakip
cd sportakip
npm install
```

## 2. iOS projesini oluştur

```bash
npx cap add ios
npx cap sync ios
```

Bu, `ios/` klasörünü üretir. **`ios/` klasörü depoya GİRER** — Capacitor'ın
kendi önerisi bu. Xcode'da açtığın yetenekler, hedefe eklediğin Swift dosyaları
ve Info.plist anahtarları orada duruyor; yok sayarsan her derlemede kaybolur.
`.gitignore` yalnızca `Pods/`, `build/` ve `public/` gibi üretilen çıktıları
dışlıyor.

## 3. Swift eklentilerini projeye kopyala

```bash
cp ios-eklenti/BulutPlugin.swift  ios/App/App/
cp ios-eklenti/SaglikPlugin.swift ios/App/App/
cp ios-eklenti/BarkodPlugin.swift ios/App/App/
cp ios-eklenti/App.entitlements   ios/App/App/
cp magaza/PrivacyInfo.xcprivacy   ios/App/App/
```

Xcode'da (`npx cap open ios`) sol paneldeki **App** hedefine sağ tık →
`Add Files to "App"…` → kopyaladığın beş dosyayı seç. Capacitor eklentileri
`@objc` ile otomatik bulunur, ayrıca kayıt gerekmez.

## 4. Info.plist anahtarlarını ekle

`ios/App/App/Info.plist` dosyasını aç, `ios-eklenti/Info-eklenecek.plist`
içindeki anahtarları en dıştaki `<dict>` bloğuna ekle. **Dosyayı komple
değiştirme**, Capacitor'ın kendi anahtarları duruyor.

Sağlık izin metinleri olmadan uygulama HealthKit'e eriştiği anda çöker ve
inceleme reddedilir — bu adımı atlama. Aynı şey kamera için de geçerli:
`NSCameraUsageDescription` yoksa barkod tarayıcı açıldığı anda çöker.

## 5. Xcode'da yetenekleri aç

`App` hedefi → **Signing & Capabilities**:

| Yetenek | Ayar |
|---|---|
| Team | Kendi geliştirici hesabın |
| Bundle Identifier | `com.ayberkbgln.plan` |
| + Capability → **HealthKit** | Ek kutu işaretlemeye gerek yok |
| + Capability → **iCloud** | **iCloud Documents** işaretli, kapsayıcı `iCloud.com.ayberkbgln.plan` |
| + Capability → **Push Notifications** | Gerekmiyor — yerel bildirim kullanıyoruz |

`App.entitlements` dosyasını eklediysen Xcode çoğunu zaten okur; yine de
listede göründüğünü doğrula.

Bundle id'yi değiştirirsen `capacitor.config.json` ve `App.entitlements`
içindeki iCloud kapsayıcı adını da güncelle.

## 6. Çalıştır

```bash
npx cap open ios
```

Xcode'da cihazını seç → ⌘R. Simülatörde HealthKit sınırlı çalışır, **gerçek
cihazda test et.**

## 7. iOS projesini commit et — bu adımı atlama

```bash
git add ios/
git commit -m "iOS projesi ve Xcode yapılandırması"
git push
```

Bu tek seferlik. Ondan sonra **Mac'e bir daha ihtiyacın yok**: GitHub Actions
her sürüm etiketinde macOS sunucusunda derleyip TestFlight'a yüklüyor
(`.github/workflows/ios.yml`). İmzalama malzemesini Mac'siz üretme adımları
`magaza/IMZA-MACSIZ.md` içinde.

## 8. Web tarafında bir değişiklik yaptıktan sonra

```bash
npx cap sync ios
```

`web/` klasörü `ios/App/App/public/` içine kopyalanır. Xcode'u kapatmana
gerek yok, sadece tekrar çalıştır.

---

## Ne çalışıyor, nasıl doğrularsın

| Özellik | Nerede | Beklenen |
|---|---|---|
| iCloud senkron | Ayarlar → Telefon | İki cihazda aç, birinde su ekle; diğerinde uygulamayı arka plandan getir, "iCloud'dan güncellendi" çıkmalı |
| Sağlık senkronu | Ayarlar → Telefon → Sağlık | Anahtarı açınca iOS izin ekranı çıkar. Kilo kaydet → Sağlık uygulaması → Vücut Ağırlığı'nda görünmeli |
| Su → Sağlık | Bugün → su + | Sağlık → Beslenme → Su |
| Antrenman → Sağlık | Bugün → seans işaretle | Sağlık → Antrenmanlar |
| Hatırlatıcılar | Ayarlar → Telefon → Hatırlatıcılar | İzin ekranı; sonra 10/14/18'de su, program günlerinde antrenman bildirimi |

Bir özellik çalışmazsa Xcode konsolunda `⚡️ [error]` satırlarına bak.

---

## App Store'a gönderirken

**4.2 Minimum Functionality.** Apple, "web sitesinin yeniden paketlenmiş hâli"
olan uygulamaları reddediyor. Bu kabuk üç yerel yetenek taşıyor — HealthKit
entegrasyonu, yerel bildirimler ve iCloud senkronu — ve inceleme notunda
bunları açıkça yazman gerekiyor. Metni `magaza/inceleme-notu.md` içinde hazır.

**Gizlilik.** App Store Connect → App Privacy bölümünde **"Data Not Collected"**
seçilecek. Uygulama hiçbir veriyi cihaz dışına çıkarmıyor; iCloud kullanıcının
kendi hesabının özel alanı, bizim erişimimiz yok. `magaza/gizlilik.md` içinde
hem bu bölümün cevapları hem yayınlanacak gizlilik metni var.

**Sağlık kategorisi.** Health & Fitness kategorisinde uygulama tıbbi iddia
içeremez. Rehber'deki sağlık notu ve takviye uyarıları bu yüzden duruyor —
silme.

**Görseller.** `magaza/icon-1024.png` hazır — alfa kanalsız, Apple'ın istediği
biçimde. Xcode'da `Assets.xcassets` → `AppIcon` → 1024 yuvasına sürükle.
Ayrıca 6.7" ve 6.9" cihaz için ekran görüntüsü gerekiyor; uygulamayı simülatörde
açıp Bugün / Yemek / Antrenman / İlerleme ekranlarından alabilirsin.

**Gizlilik politikası URL'i.** `web/gizlilik.html` hazır.
Adres: `https://ayberkbgln.github.io/sportakip/gizlilik.html`

> **Pages ayarı:** repo → Settings → Pages → Source: **GitHub Actions**.
> "Deploy from a branch" seçeneği yalnızca `/` ve `/docs` klasörlerini kabul
> ediyor, `/web` diye bir seçenek yok — bu yüzden yayın
> `.github/workflows/pages.yml` üzerinden yapılıyor. Ayarı bir kez değiştirmen
> yeterli, sonrası otomatik.
