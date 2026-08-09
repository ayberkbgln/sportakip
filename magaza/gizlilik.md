# Gizlilik — App Store Connect cevapları ve yayınlanacak metin

## App Privacy bölümü (App Store Connect)

Soru: *Does your app collect any data from this app?*
**Cevap: No — Data Not Collected.**

Gerekçe: uygulama hiçbir veriyi geliştiriciye ya da üçüncü tarafa göndermiyor.
Analytics, çökme raporlama, reklam kimliği, uzak sunucu yok. Veri iki yerde:

1. Cihazın kendi depolaması (localStorage)
2. Kullanıcının **kendi** iCloud hesabının özel uygulama kapsayıcısı

Apple'ın tanımına göre "collect", verinin cihazdan çıkıp geliştiriciye
ulaşması demek. iCloud özel kapsayıcı buna girmiyor — geliştiricinin erişimi yok.

Takip (tracking): **Yok.** ATT izni istenmiyor, IDFA kullanılmıyor.

Kamera: barkod okumak için kullanılıyor ama **hiçbir görüntü toplanmıyor** —
kare işlenip atılıyor, kaydedilmiyor, gönderilmiyor. Bu yüzden App Privacy
formunda yine "Data Not Collected". `NSCameraUsageDescription` Info.plist'te.

## Gizlilik manifesti

`magaza/PrivacyInfo.xcprivacy` dosyası projeye ekleniyor:
- `NSPrivacyTracking`: false
- `NSPrivacyCollectedDataTypes`: boş
- Erişilen API'ler: UserDefaults (CA92.1), dosya zaman damgası (C617.1)

Üçüncü taraf SDK yok, dolayısıyla ek manifest gerekmiyor.

## HealthKit taahhüdü

Apple'ın şartı: HealthKit verisi reklam ya da veri madenciliği için
kullanılamaz. Bu uygulamada HealthKit verisi yalnızca:
- Kilo, su ve antrenman **yazmak** için
- Son kiloyu **okumak** için (kullanıcı tartıdan girdiyse)

kullanılıyor ve cihazdan hiç çıkmıyor.

---

# Yayınlanacak gizlilik metni

(App Store Connect'te "Privacy Policy URL" zorunlu — bu metni GitHub Pages'te
yayınla, örn. `https://ayberkbgln.github.io/sportakip/gizlilik.html`)

## Plan — Gizlilik Politikası

**Son güncelleme:** uygulamanın yayın tarihi

### Kısa cevap

Bu uygulama hiçbir kişisel verini toplamıyor, bize göndermiyor ve üçüncü
taraflarla paylaşmıyor. Girdiğin her şey senin cihazında kalıyor.

### Hangi veriler tutuluyor

Uygulamayı kullanırken şunları girebiliyorsun: yaş, cinsiyet, boy, kilo,
vücut ölçüleri, yediklerin, içtiğin su, antrenmanların, kullandığın takviyeler
ve varsa azaltmak istediğin bir alışkanlık.

Bu verilerin tamamı **yalnızca cihazının kendi depolamasında** saklanıyor.

### iCloud

Ayarlar'dan açarsan verilerin, senin Apple hesabına ait iCloud alanında
uygulamaya özel bir dosyaya yazılıyor ve cihazların arasında eşitleniyor.
Bu alan Apple'ın altyapısında ve senin hesabına ait — geliştiricinin buraya
erişimi yok. Kapatmak istersen iOS Ayarlar → Apple hesabın → iCloud
bölümünden bu uygulamayı kapatabilirsin.

### Apple Sağlık

Ayarlar'dan açarsan kilo, su ve antrenman kayıtların Apple Sağlık uygulamasına
yazılıyor; son kilo kaydın oradan okunuyor. İzin ayrıca isteniyor ve istediğin
zaman iOS Ayarlar → Gizlilik ve Güvenlik → Sağlık bölümünden geri alabilirsin.
Sağlık verisi hiçbir koşulda reklam ya da analiz için kullanılmıyor.

### Kamera ve barkod

Yemek eklerken barkod tarayabilirsin. Kamera yalnızca o an açılır, koddaki
karakterleri okur ve kapanır. Görüntü kaydedilmez, saklanmaz ve hiçbir yere
gönderilmez. Barkodun hangi ürün olduğu bir veritabanına sorulmuyor —
uygulama hiçbir ağ isteği yapmıyor; ürünü ilk taramada kullanıcı tanımlıyor
ve eşleşme yalnızca cihazda kalıyor. İzin iOS Ayarlar → Gizlilik ve Güvenlik
→ Kamera bölümünden geri alınabilir.

### Toplamadığımız şeyler

Analytics yok. Çökme raporlama yok. Reklam yok. Reklam kimliği kullanılmıyor.
Hesap açman gerekmiyor, e-posta istemiyoruz. Sunucumuz yok.

### Verini silmek

Ayarlar → Tehlikeli bölge → "Her şeyi sil" tüm verini cihazdan siler.
Uygulamayı silmek de aynı sonucu verir. iCloud kopyası için iOS Ayarlar →
Apple hesabın → iCloud → Depolamayı Yönet bölümünden uygulamanın verisini
silebilirsin.

### Çocuklar

Uygulama 13 yaş altına yönelik değildir ve çocuklardan bilerek veri toplamaz.

### Sağlık uyarısı

Bu uygulama tıbbi tavsiye vermez. İçerdiği bilgiler geneldir; teşhis ya da
tedavi yerine geçmez. Besin değerleri yaklaşık referans değerlerdir.

### İletişim

ayberkbaglan@gmail.com
