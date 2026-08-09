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

  /* ---- Dokunsal geri bildirim ---- */
  async titre(tip) {
    const p = this.eklenti("Haptics");
    if (!p) return;
    try { await p.impact({ style: tip || "Light" }); } catch (e) {}
  }
};

/* Kabuk hazır olduğunda gövdeye sınıf ekle — güvenli alan payları ve
   tarayıcıya özgü kurulum notları buna göre değişiyor. */
if (Yerel.var()) document.documentElement.classList.add("yerel");
