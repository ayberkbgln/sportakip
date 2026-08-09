import Foundation
import Capacitor

/*
 BulutPlugin — iCloud Drive üzerinden veri aynası.

 Veri, uygulamanın kendi iCloud kapsayıcısındaki tek bir JSON dosyasında
 (plan.json) duruyor. Bizim sunucumuz yok; dosya kullanıcının kendi iCloud
 hesabının özel alanında. Apple cihazlar arasında otomatik eşitliyor.

 Neden NSUbiquitousKeyValueStore değil: onun sınırı 1 MB. Yemek kaydıyla
 birlikte bu uygulamanın verisi yıllar içinde birkaç MB'a çıkabiliyor,
 sessizce kesilmemesi için doküman kapsayıcısı kullanılıyor.

 iCloud kapalıysa hata fırlatmıyoruz — çağıran taraf "veri yok" görüp
 yalnızca cihazdaki kopyayla devam ediyor.
 */
@objc(BulutPlugin)
public class BulutPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BulutPlugin"
    public let jsName = "Bulut"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "oku",   returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "yaz",   returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "durum", returnType: CAPPluginReturnPromise)
    ]

    private let dosyaAdi = "plan.json"

    /// iCloud kapsayıcısındaki Documents klasörü. Kapsayıcı hazır değilse nil.
    private func kapsayici() -> URL? {
        guard let kok = FileManager.default.url(forUbiquityContainerIdentifier: nil) else { return nil }
        let belgeler = kok.appendingPathComponent("Documents", isDirectory: true)
        if !FileManager.default.fileExists(atPath: belgeler.path) {
            try? FileManager.default.createDirectory(at: belgeler, withIntermediateDirectories: true)
        }
        return belgeler
    }

    @objc func durum(_ call: CAPPluginCall) {
        call.resolve(["acik": kapsayici() != nil])
    }

    @objc func oku(_ call: CAPPluginCall) {
        DispatchQueue.global(qos: .userInitiated).async {
            guard let klasor = self.kapsayici() else {
                call.resolve(["veri": NSNull(), "acik": false]); return
            }
            let url = klasor.appendingPathComponent(self.dosyaAdi)

            // Dosya yalnızca bulutta duruyor olabilir; önce indirilmesini iste.
            if !FileManager.default.fileExists(atPath: url.path) {
                try? FileManager.default.startDownloadingUbiquitousItem(at: url)
                // Kısa bir süre bekle; gelmezse "veri yok" dönüyoruz, uygulama
                // cihazdaki kopyayla çalışmaya devam eder.
                var bekleme = 0
                while !FileManager.default.fileExists(atPath: url.path) && bekleme < 20 {
                    Thread.sleep(forTimeInterval: 0.1); bekleme += 1
                }
            }

            var sonuc: String? = nil
            var hata: NSError? = nil
            NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &hata) { okunacak in
                sonuc = try? String(contentsOf: okunacak, encoding: .utf8)
            }
            call.resolve(["veri": sonuc ?? NSNull(), "acik": true])
        }
    }

    @objc func yaz(_ call: CAPPluginCall) {
        guard let veri = call.getString("veri") else {
            call.reject("veri alanı gerekli"); return
        }
        DispatchQueue.global(qos: .utility).async {
            guard let klasor = self.kapsayici() else {
                call.resolve(["yazildi": false, "acik": false]); return
            }
            let url = klasor.appendingPathComponent(self.dosyaAdi)
            var hata: NSError? = nil
            var yazildi = false
            NSFileCoordinator().coordinate(writingItemAt: url, options: .forReplacing, error: &hata) { yazilacak in
                do { try veri.write(to: yazilacak, atomically: true, encoding: .utf8); yazildi = true }
                catch { yazildi = false }
            }
            call.resolve(["yazildi": yazildi, "acik": true])
        }
    }
}
