import Foundation
import Capacitor
import HealthKit

/*
 SaglikPlugin — Apple Health (HealthKit) köprüsü.

 Yazdıklarımız: vücut ağırlığı, içilen su, antrenman seansı.
 Okuduğumuz: yalnızca son vücut ağırlığı (kullanıcı tartıdan girdiyse
 uygulamaya taşımak için).

 Apple kuralları gereği:
   • İzin, ilgili özellik ilk açıldığında isteniyor; kurulumda topluca değil.
     Bu yüzden izinIste ayrı bir metot ve Ayarlar'daki anahtardan çağrılıyor.
   • HealthKit'ten gelen veri reklam ya da veri madenciliği için
     KULLANILMAZ. Bu uygulama zaten hiçbir veriyi cihaz dışına çıkarmıyor.
 */
@objc(SaglikPlugin)
public class SaglikPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SaglikPlugin"
    public let jsName = "Saglik"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "izinIste",       returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "kiloYaz",        returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "suYaz",          returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "antrenmanYaz",   returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sonKilo",        returnType: CAPPluginReturnPromise)
    ]

    private let depo = HKHealthStore()

    private var yazilacaklar: Set<HKSampleType> {
        var s = Set<HKSampleType>()
        if let kilo = HKObjectType.quantityType(forIdentifier: .bodyMass) { s.insert(kilo) }
        if let su = HKObjectType.quantityType(forIdentifier: .dietaryWater) { s.insert(su) }
        s.insert(HKObjectType.workoutType())
        return s
    }
    private var okunacaklar: Set<HKObjectType> {
        var s = Set<HKObjectType>()
        if let kilo = HKObjectType.quantityType(forIdentifier: .bodyMass) { s.insert(kilo) }
        return s
    }

    private func tarihCoz(_ metin: String?) -> Date {
        guard let m = metin else { return Date() }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: m) ?? ISO8601DateFormatter().date(from: m) ?? Date()
    }

    @objc func izinIste(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["izin": false, "sebep": "cihaz desteklemiyor"]); return
        }
        depo.requestAuthorization(toShare: yazilacaklar, read: okunacaklar) { ok, _ in
            call.resolve(["izin": ok])
        }
    }

    @objc func kiloYaz(_ call: CAPPluginCall) {
        guard let kg = call.getDouble("kg"), kg > 0,
              let tip = HKObjectType.quantityType(forIdentifier: .bodyMass) else {
            call.resolve(["yazildi": false]); return
        }
        let tarih = tarihCoz(call.getString("tarih"))
        let miktar = HKQuantity(unit: .gramUnit(with: .kilo), doubleValue: kg)
        let ornek = HKQuantitySample(type: tip, quantity: miktar, start: tarih, end: tarih)
        depo.save(ornek) { ok, _ in call.resolve(["yazildi": ok]) }
    }

    @objc func suYaz(_ call: CAPPluginCall) {
        guard let ml = call.getDouble("ml"), ml > 0,
              let tip = HKObjectType.quantityType(forIdentifier: .dietaryWater) else {
            call.resolve(["yazildi": false]); return
        }
        let tarih = tarihCoz(call.getString("tarih"))
        let miktar = HKQuantity(unit: .literUnit(with: .milli), doubleValue: ml)
        let ornek = HKQuantitySample(type: tip, quantity: miktar, start: tarih, end: tarih)
        depo.save(ornek) { ok, _ in call.resolve(["yazildi": ok]) }
    }

    /// Uygulamadaki spor tipini HealthKit karşılığına eşler.
    private func aktivite(_ tip: String?) -> HKWorkoutActivityType {
        switch tip ?? "" {
        case "dovus":    return .martialArts
        case "guc":      return .traditionalStrengthTraining
        case "kardiyo":  return .running
        case "takim":    return .soccer
        case "esneklik": return .flexibility
        default:         return .other
        }
    }

    @objc func antrenmanYaz(_ call: CAPPluginCall) {
        guard let dakika = call.getDouble("dakika"), dakika > 0 else {
            call.resolve(["yazildi": false]); return
        }
        let baslangic = tarihCoz(call.getString("baslangic"))
        let bitis = baslangic.addingTimeInterval(dakika * 60)

        let yapilandirma = HKWorkoutConfiguration()
        yapilandirma.activityType = aktivite(call.getString("tip"))

        let olusturucu = HKWorkoutBuilder(healthStore: depo, configuration: yapilandirma, device: .local())
        olusturucu.beginCollection(withStart: baslangic) { ok, _ in
            guard ok else { call.resolve(["yazildi": false]); return }
            olusturucu.endCollection(withEnd: bitis) { ok2, _ in
                guard ok2 else { call.resolve(["yazildi": false]); return }
                olusturucu.finishWorkout { _, hata in
                    call.resolve(["yazildi": hata == nil])
                }
            }
        }
    }

    @objc func sonKilo(_ call: CAPPluginCall) {
        guard let tip = HKObjectType.quantityType(forIdentifier: .bodyMass) else {
            call.resolve(["kg": 0]); return
        }
        let sira = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let sorgu = HKSampleQuery(sampleType: tip, predicate: nil, limit: 1, sortDescriptors: [sira]) { _, ornekler, _ in
            guard let o = ornekler?.first as? HKQuantitySample else {
                call.resolve(["kg": 0]); return
            }
            let kg = o.quantity.doubleValue(for: .gramUnit(with: .kilo))
            let f = ISO8601DateFormatter()
            call.resolve(["kg": kg, "tarih": f.string(from: o.endDate)])
        }
        depo.execute(sorgu)
    }
}
