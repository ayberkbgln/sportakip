# İmzalama malzemesini Mac olmadan üretme

App Store'a yüklemek için iki şey gerekiyor: bir **dağıtım sertifikası** ve bir
**provisioning profile**. İkisi de tarayıcıdan üretilebiliyor; Mac gerekmiyor.
Sertifika isteğini (CSR) normalde Keychain Access üretir ama `openssl` ile de
olur — Windows'ta Git Bash ya da WSL içinde çalışır.

Bu adımlar bir kereliktir. Sonrasında GitHub Actions her push'ta derleyip
TestFlight'a atar.

---

## 1. Özel anahtar ve CSR üret

Windows'ta Git Bash / WSL, Linux'ta doğrudan terminal:

```bash
openssl genrsa -out ios_dagitim.key 2048
openssl req -new -key ios_dagitim.key -out ios_dagitim.csr \
  -subj "/emailAddress=ayberkbaglan@gmail.com/CN=Ayberk/C=TR"
```

`ios_dagitim.key` dosyasını **kaybetme** ve depoya koyma.

## 2. Sertifikayı Apple'dan al

1. developer.apple.com → Certificates, Identifiers & Profiles → **Certificates** → **+**
2. Tür: **Apple Distribution**
3. `ios_dagitim.csr` dosyasını yükle
4. Üretilen `distribution.cer` dosyasını indir

## 3. .p12 dosyasına çevir

```bash
openssl x509 -inform DER -in distribution.cer -out dagitim.pem
openssl pkcs12 -export -legacy \
  -inkey ios_dagitim.key -in dagitim.pem \
  -out dagitim.p12 -passout pass:BURAYA_GUCLU_BIR_SIFRE
```

> `-legacy` bayrağı OpenSSL 3'te gerekiyor; Apple'ın araçları eski PKCS12
> şifrelemesini bekliyor. OpenSSL 1.x kullanıyorsan bayrağı çıkar.

## 4. App ID ve iCloud kapsayıcısı

1. **Identifiers** → **+** → App IDs → App
2. Bundle ID: `com.ayberkbgln.plan` (explicit)
3. Capabilities listesinden işaretle: **HealthKit**, **iCloud** (iCloud Documents)
4. **Identifiers** → iCloud Containers → **+** → `iCloud.com.ayberkbgln.plan`
5. App ID'ye dönüp iCloud yeteneğini düzenle → bu kapsayıcıyı seç

## 5. Provisioning profile

1. **Profiles** → **+** → Distribution → **App Store Connect**
2. App ID: `com.ayberkbgln.plan`
3. Sertifika: az önce ürettiğin dağıtım sertifikası
4. İndir → `plan.mobileprovision`

## 6. App Store Connect API anahtarı

1. appstoreconnect.apple.com → **Users and Access** → **Integrations** → **App Store Connect API**
2. **+** ile anahtar üret, rol: **App Manager**
3. `AuthKey_XXXXXXXXXX.p8` dosyasını indir (**bir kez indirilebiliyor**)
4. **Key ID** ve **Issuer ID** değerlerini not al

## 7. Uygulamayı App Store Connect'te oluştur

**My Apps** → **+** → New App
- Platform: iOS
- Bundle ID: `com.ayberkbgln.plan`
- SKU: `plan-001`
- Ad ve dil: `magaza/aciklama.md` içindekiler

## 8. GitHub secrets'a yükle

Dosyaları base64'e çevir:

```bash
base64 -w0 dagitim.p12            > p12.txt
base64 -w0 plan.mobileprovision   > profil.txt
base64 -w0 AuthKey_XXXXXXXXXX.p8  > key.txt
```

> macOS'ta `-w0` yerine `base64 -i dosya` kullan.

GitHub → repo → Settings → Secrets and variables → **Actions** → New repository secret:

| Secret | İçerik |
|---|---|
| `IOS_P12_BASE64` | `p12.txt` içeriği |
| `IOS_P12_SIFRE` | 3. adımdaki şifre |
| `IOS_PROFIL_BASE64` | `profil.txt` içeriği |
| `ASC_KEY_ID` | Key ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_KEY_BASE64` | `key.txt` içeriği |

Ardından yerel `.p12`, `.p8`, `.key`, `.cer` dosyalarını güvenli bir yere kaldır
ve proje klasöründen sil. `.gitignore` zaten bunları dışlıyor ama yine de.

---

## Sonra ne oluyor

```bash
git tag v1.0.0 && git push origin v1.0.0
```

GitHub Actions macOS sunucusunda derliyor, imzalıyor ve TestFlight'a yüklüyor.
İlerlemeyi repo → **Actions** sekmesinden izliyorsun. Elle tetiklemek için de
aynı sekmede **Run workflow** var.

---

## Mac hâlâ bir kez gerekiyor

Bu belge **imzalamayı** Mac'siz çözüyor. Ama Xcode projesinin kendisi bir kere
Mac'te üretilip yapılandırılmalı:

- `npx cap add ios` ile proje oluşur
- Swift eklentileri hedefe eklenir
- Yetenekler (HealthKit, iCloud) açılır
- `ios/` klasörü commit edilir

Adımlar `KURULUM-MAC.md` içinde ve tek oturumluk iş. Ondan sonra Windows'tan
devam edebilirsin.

**Mac'e hiç dokunmak istemiyorsan** alternatif saatlik kiralık Mac servisleri
var (MacinCloud, MacStadium, AWS EC2 Mac). Tarayıcıdan bağlanıp aynı tek
oturumluk işi orada yaparsın. Gerçek cihazda HealthKit testi için yine de
kendi iPhone'un + bir Mac ya da TestFlight yüklemesi gerekiyor — TestFlight
üzerinden test edersen Mac'e hiç gerek kalmaz.
