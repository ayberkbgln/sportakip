import Foundation
import Capacitor
import AVFoundation
import UIKit

/*
 BarkodPlugin — kamera ile barkod okuma.

 Üçüncü taraf kütüphane YOK: AVFoundation'ın kendi metadata çıktısı yeterli.
 ML Kit gibi bir bağımlılık eklenmedi çünkü uygulamanın kuralı bu — dışarıya
 istek yok, dışarıdan kod yok.

 Okunan kod hiçbir yere gönderilmiyor. Barkodun hangi ürün olduğunu bir
 veritabanına sormuyoruz; kullanıcı bir kez kendisi tanımlıyor ve eşleşme
 cihazda kalıyor. Kamera görüntüsü kaydedilmiyor, işlenip atılıyor.

 JS tarafı: Yerel.barkodTara() → { kod: "8690…" }. Kullanıcı vazgeçerse ya da
 izin yoksa kod boş dönüyor; ekran o zaman elle eklemeye düşüyor.
 */
@objc(BarkodPlugin)
public class BarkodPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BarkodPlugin"
    public let jsName = "Barkod"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "tara", returnType: CAPPluginReturnPromise)
    ]

    private var tarayici: TarayiciVC?

    @objc func tara(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let kok = self.bridge?.viewController else {
                call.resolve(["kod": ""]); return
            }
            /* İzin durumu ne olursa olsun tek yoldan geçiyoruz: AVFoundation
               ilk çağrıda sistem sorusunu kendisi gösteriyor. */
            AVCaptureDevice.requestAccess(for: .video) { izin in
                DispatchQueue.main.async {
                    guard izin else { call.resolve(["kod": ""]); return }
                    let vc = TarayiciVC()
                    vc.modalPresentationStyle = .fullScreen
                    vc.bitti = { [weak self] kod in
                        self?.tarayici = nil
                        call.resolve(["kod": kod ?? ""])
                    }
                    self.tarayici = vc
                    kok.present(vc, animated: true)
                }
            }
        }
    }
}

/* Tam ekran tarayıcı. Tek iş yapıyor: bir kod okuyunca kapanıp geri veriyor. */
final class TarayiciVC: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var bitti: ((String?) -> Void)?

    private let oturum = AVCaptureSession()
    private var onizleme: AVCaptureVideoPreviewLayer?
    private var kapandi = false

    private let tipler: [AVMetadataObject.ObjectType] = [
        .ean13, .ean8, .upce, .code128, .code39, .code93, .itf14, .interleaved2of5
    ]

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        guard let cihaz = AVCaptureDevice.default(for: .video),
              let girdi = try? AVCaptureDeviceInput(device: cihaz),
              oturum.canAddInput(girdi) else { kapat(nil); return }
        oturum.addInput(girdi)

        let cikti = AVCaptureMetadataOutput()
        guard oturum.canAddOutput(cikti) else { kapat(nil); return }
        oturum.addOutput(cikti)
        cikti.setMetadataObjectsDelegate(self, queue: .main)
        /* availableMetadataObjectTypes ancak çıktı oturuma eklendikten sonra
           doluyor; desteklenmeyen bir tip atanırsa uygulama çöker. */
        cikti.metadataObjectTypes = tipler.filter { cikti.availableMetadataObjectTypes.contains($0) }

        let katman = AVCaptureVideoPreviewLayer(session: oturum)
        katman.videoGravity = .resizeAspectFill
        katman.frame = view.bounds
        view.layer.addSublayer(katman)
        onizleme = katman

        kurArayuz()
    }

    private func kurArayuz() {
        let cerceve = UIView()
        cerceve.translatesAutoresizingMaskIntoConstraints = false
        cerceve.layer.borderColor = UIColor(red: 0.82, green: 1.0, blue: 0.24, alpha: 1).cgColor
        cerceve.layer.borderWidth = 2
        cerceve.layer.cornerRadius = 16
        view.addSubview(cerceve)

        let not = UILabel()
        not.translatesAutoresizingMaskIntoConstraints = false
        not.text = "Barkodu çerçeveye getir"
        not.textColor = .white
        not.font = .systemFont(ofSize: 15, weight: .medium)
        not.textAlignment = .center
        view.addSubview(not)

        let vazgec = UIButton(type: .system)
        vazgec.translatesAutoresizingMaskIntoConstraints = false
        vazgec.setTitle("Vazgeç", for: .normal)
        vazgec.setTitleColor(.white, for: .normal)
        vazgec.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
        vazgec.backgroundColor = UIColor(white: 0.11, alpha: 0.95)
        vazgec.layer.cornerRadius = 14
        vazgec.contentEdgeInsets = UIEdgeInsets(top: 13, left: 30, bottom: 13, right: 30)
        vazgec.addTarget(self, action: #selector(vazgecildi), for: .touchUpInside)
        view.addSubview(vazgec)

        NSLayoutConstraint.activate([
            cerceve.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            cerceve.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -30),
            cerceve.widthAnchor.constraint(equalTo: view.widthAnchor, multiplier: 0.74),
            cerceve.heightAnchor.constraint(equalTo: cerceve.widthAnchor, multiplier: 0.6),

            not.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            not.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            not.topAnchor.constraint(equalTo: cerceve.bottomAnchor, constant: 22),

            vazgec.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            vazgec.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -30)
        ])
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        /* Oturumu ana kuyrukta başlatmak arayüzü kilitliyor */
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self, !self.oturum.isRunning else { return }
            self.oturum.startRunning()
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        onizleme?.frame = view.bounds
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if oturum.isRunning { oturum.stopRunning() }
    }

    @objc private func vazgecildi() { kapat(nil) }

    func metadataOutput(_ output: AVCaptureMetadataOutput,
                        didOutput metadataObjects: [AVMetadataObject],
                        from connection: AVCaptureConnection) {
        guard !kapandi,
              let ilk = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              let deger = ilk.stringValue, !deger.isEmpty else { return }
        let temiz = deger.filter { $0.isNumber || $0.isLetter }
        guard !temiz.isEmpty else { return }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        kapat(String(temiz.prefix(24)))
    }

    private func kapat(_ kod: String?) {
        guard !kapandi else { return }
        kapandi = true
        if oturum.isRunning { oturum.stopRunning() }
        let geri = bitti
        bitti = nil
        dismiss(animated: true) { geri?(kod) }
    }
}
