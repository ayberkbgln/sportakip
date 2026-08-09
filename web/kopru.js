/* =====================================================================
   kopru.js — yerel (native) kabuk köprüsü.

   Uygulama iki yerde çalışıyor:
     • Tarayıcı / PWA  → buradaki her şey sessizce boş döner, davranış değişmez
     • iOS kabuğu      → Capacitor eklentileri devreye girer

   Kural: web tarafı hiçbir zaman "native var mı" diye dallanmak zorunda
   kalmasın. Fonksiyonlar her ortamda çağrılabilir, yoksa no-op olurlar.
   app.js'ten ÖNCE yüklenir.
   ===================================================================== */

const Yerel = {
  /* Capacitor yalnızca yerel kabukta window'a enjekte edilir */
  var() {
    const C = window.Capacitor;
    return !!(C && typeof C.isNativePlatform === "function" && C.isNativePlatform());
  },
  eklenti(ad) {
    const C = window.Capacitor;
    return (C && C.Plugins && C.Plugins[ad]) || null;
  },

  /* ---- iCloud ----
     Veri iCloud Drive'daki özel kapsayıcıya tek bir JSON dosyası olarak
     yazılıyor. Apple'ın kendi altyapısı; bizim sunucumuz yok, hesap yok. */
  async bulutOku() {
    const p = this.eklenti("Bulut");
    if (!p) return null;
    try { const r = await p.oku(); return r && r.veri ? r.veri : null; }
    catch (e) { return null; }
  },
  async bulutYaz(json) {
    const p = this.eklenti("Bulut");
    if (!p) return false;
    try { await p.yaz({ veri: json }); return true; }
    catch (e) { return false; }
  },
  async bulutDurum() {
    const p = this.eklenti("Bulut");
    if (!p) return { acik: false };
    try { return await p.durum(); } catch (e) { return { acik: false }; }
  },

  /* ---- Sağlık (HealthKit) ----
     İzin kullanıcı ilgili özelliği ilk kez açtığında isteniyor, kurulumda
     topluca değil — Apple'ın beklediği davranış bu. */
  async saglikIzin() {
    const p = this.eklenti("Saglik");
    if (!p) return false;
    try { const r = await p.izinIste(); return !!(r && r.izin); }
    catch (e) { return false; }
  },
  async saglikKiloYaz(kg, tarih) {
    const p = this.eklenti("Saglik");
    if (!p || !(kg > 0)) return false;
    try { await p.kiloYaz({ kg, tarih: tarih || new Date().toISOString() }); return true; }
    catch (e) { return false; }
  },
  async saglikSuYaz(ml, tarih) {
    const p = this.eklenti("Saglik");
    if (!p || !(ml > 0)) return false;
    try { await p.suYaz({ ml, tarih: tarih || new Date().toISOString() }); return true; }
    catch (e) { return false; }
  },
  async saglikAntrenmanYaz(tip, dakika, baslangic) {
    const p = this.eklenti("Saglik");
    if (!p || !(dakika > 0)) return false;
    try { await p.antrenmanYaz({ tip, dakika, baslangic: baslangic || new Date().toISOString() }); return true; }
    catch (e) { return false; }
  },
  async saglikSonKilo() {
    const p = this.eklenti("Saglik");
    if (!p) return null;
    try { const r = await p.sonKilo(); return r && r.kg > 0 ? r : null; }
    catch (e) { return null; }
  },

  /* ---- Yerel bildirim ---- */
  async bildirimIzin() {
    const p = this.eklenti("LocalNotifications");
    if (!p) return false;
    try {
      const r = await p.requestPermissions();
      return !!(r && r.display === "granted");
    } catch (e) { return false; }
  },
  async bildirimKur(liste) {
    const p = this.eklenti("LocalNotifications");
    if (!p) return false;
    try {
      const eski = await p.getPending();
      if (eski && eski.notifications && eski.notifications.length)
        await p.cancel({ notifications: eski.notifications });
      if (!liste.length) return true;
      await p.schedule({ notifications: liste });
      return true;
    } catch (e) { return false; }
  },

  /* ---- Barkod ----
     Barkod veritabanı İNTERNETTEN çekilmiyor (2. kural) — çekemeyiz de,
     uygulama uçak modunda çalışmak zorunda. Kamera yalnızca kodun rakamlarını
     okuyor; o kodun hangi ürün olduğunu kullanıcı bir kez kendisi tanımlıyor
     ve eşleşme cihazda kalıyor.

     Buradaki tek istisna: bu fonksiyonun tarayıcıda da bir karşılığı var.
     Kabukta AVFoundation eklentisi, tarayıcıda standart BarcodeDetector
     çalışıyor; ikisi de yoksa "" dönüyor ve ekran özelliği hiç göstermiyor.
     Görüntü hiçbir yere yazılmıyor, kaydedilmiyor. */
  barkodVar() {
    if (this.eklenti("Barkod")) return true;
    return typeof window.BarcodeDetector === "function"
      && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  },
  async barkodTara() {
    const p = this.eklenti("Barkod");
    if (p) {
      try { const r = await p.tara(); return kodTemizle(r && r.kod); }
      catch (e) { return ""; }
    }
    return tarayiciBarkod();
  },

  /* ---- Dokunsal geri bildirim ---- */
  async titre(tip) {
    const p = this.eklenti("Haptics");
    if (!p) return;
    try { await p.impact({ style: tip || "Light" }); } catch (e) {}
  }
};

/* Kod app.js'te data-act içine giriyor; ":" ile bölünen bir dizede yaşayacağı
   için ayırıcı olabilecek her şeyi atıyoruz. */
function kodTemizle(v) {
  return String(v == null ? "" : v).replace(/[^0-9A-Za-z]/g, "").slice(0, 24);
}

/* Tarayıcı tarafı: BarcodeDetector + getUserMedia. Safari'de ikisi de yok,
   o zaman "" dönüyor ve düğme hiç çizilmiyor. Kamera akışı her çıkışta
   kapatılıyor — finally bloğu bunun için. */
async function tarayiciBarkod() {
  if (typeof window.BarcodeDetector !== "function"
      || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return "";
  let akis = null, kap = null, iptal = false;
  try {
    const dedektor = new window.BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"]
    });
    akis = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
    const video = document.createElement("video");
    video.setAttribute("playsinline", "");
    video.muted = true;
    video.srcObject = akis;
    await video.play();

    kap = document.createElement("div");
    kap.className = "tarayici";
    kap.appendChild(video);
    const cerceve = document.createElement("div");
    cerceve.className = "tarayici-hedef";
    const not = document.createElement("p");
    not.className = "tarayici-not";
    not.textContent = "Barkodu çerçeveye getir";
    const kapa = document.createElement("button");
    kapa.type = "button";
    kapa.className = "tarayici-kapa";
    kapa.textContent = "Vazgeç";
    kapa.addEventListener("click", () => { iptal = true; });
    kap.appendChild(cerceve); kap.appendChild(not); kap.appendChild(kapa);
    document.body.appendChild(kap);

    const bitis = Date.now() + 30000;          // 30 sn sonra kendiliğinden bırak
    while (!iptal && Date.now() < bitis) {
      let bulunan = [];
      try { bulunan = await dedektor.detect(video); } catch (e) { bulunan = []; }
      const kod = bulunan.find(b => b && b.rawValue);
      if (kod) { const t = kodTemizle(kod.rawValue); if (t) return t; }
      await new Promise(r => setTimeout(r, 220));
    }
    return "";
  } catch (e) { return ""; }
  finally {
    if (akis) akis.getTracks().forEach(t => t.stop());
    if (kap && kap.parentNode) kap.parentNode.removeChild(kap);
  }
}

/* Kabuk hazır olduğunda gövdeye sınıf ekle — güvenli alan payları ve
   tarayıcıya özgü kurulum notları buna göre değişiyor. */
if (Yerel.var()) document.documentElement.classList.add("yerel");
