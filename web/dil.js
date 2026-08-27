/* =====================================================================
   dil.js — TR/EN dil katmanı. app.js'ten ve diğer her şeyden ÖNCE yüklenir.

   Yaklaşım: kodun içindeki dizeler Türkçe kalır (CLAUDE.md: "dize gövdeye
   gömülü olsun"), çeviri T(dize) ile sözlükten okunur. Sözlükte olmayan
   dize Türkçe döner — arayüz hiçbir koşulda kırılmaz, en kötü ihtimalle
   tek bir metin Türkçe kalır ve dil testi bunu yakalar.

   T(s)        → düz çeviri. TR modda s'i aynen döndürür.
   Tf(s, v)    → {ad} yer tutucularını doldurur: Tf("{n} gün", {n:3}).
                 Cümle parçalarını + ile yapıştırma — kelime sırası dilden
                 dile değişir, yer tutucu değişmez.
   dilAyarla(d)→ dili değiştirir ve besin listesini yeni dille yeniden kurar.

   Dil tercihi profil.dil'de durur ("" = cihaz dili). Buradaki DIL yalnız
   ilk boyama için cihazdan tahmin edilir; yukle() gerçek tercihi uygular.
   ===================================================================== */

let DIL = ((navigator.language || "").toLowerCase().indexOf("tr") === 0) ? "tr" : "en";

function dilAyarla(d) {
  DIL = d === "en" ? "en" : "tr";
  document.documentElement.lang = DIL;
  /* besinler.js daha sonra yükleniyor; ilk çağrıda fonksiyon henüz yok */
  if (typeof besinListeKur === "function") besinListeKur();
}

function T(s) {
  if (s == null) return "";
  if (DIL === "tr") return s;
  const c = SOZLUK[s];
  return c === undefined ? s : c;
}

function Tf(s, degerler) {
  let out = T(s);
  for (const a in degerler) out = out.split("{" + a + "}").join(degerler[a]);
  return out;
}

/* ---------------------------------------------------------------------
   Arayüz sözlüğü — app.js ve kopru.js'teki dizeler. veri.js içeriği
   (sporlar, takviyeler, rehber…) aşağıdaki VERI_EN'de, besin adları
   BESIN_EN'de. Yeni bir arayüz metni yazarsan karşılığını buraya ekle;
   test paketi EN modda Türkçe karakter sızıntısını tarıyor.
   --------------------------------------------------------------------- */
const SOZLUK = {

/* --- takvim --- */
"Ocak": "January", "Şubat": "February", "Mart": "March", "Nisan": "April",
"Mayıs": "May", "Haziran": "June", "Temmuz": "July", "Ağustos": "August",
"Eylül": "September", "Ekim": "October", "Kasım": "November", "Aralık": "December",
"Pazar": "Sunday", "Pazartesi": "Monday", "Salı": "Tuesday", "Çarşamba": "Wednesday",
"Perşembe": "Thursday", "Cuma": "Friday", "Cumartesi": "Saturday",
"Paz": "Sun", "Pzt": "Mon", "Sal": "Tue", "Çar": "Wed", "Per": "Thu", "Cum": "Fri", "Cmt": "Sat",

/* --- sekmeler --- */
"Bugün": "Today", "Yemek": "Food", "Antrenman": "Training", "İlerleme": "Progress", "Daha": "More",

/* --- ortak --- */
"dk": "min", "sn": "s", "litre": "liters", "tekrar": "reps", "porsiyon": "serving",
"Geri": "Back", "Devam": "Continue", "Kaydet": "Save", "Ekle": "Add", "Düzenle": "Edit",
"Silindi": "Deleted", "Güncellendi": "Updated", "Hedef": "Goal", "Saat": "Time",
"Doz": "Dose", "Ayarlar": "Settings", "Takviye": "Supplements", "Takviyeler": "Supplements",
"Rehber": "Guide", "Yedek": "Backup", "Su": "Water", "Seri": "Streak", "Sınır": "Cap",
"Öğün": "Meal", "Alışkanlık": "Habit", "Egzersiz": "Exercise", "Egzersizler": "Exercises",
"Set arası": "Rest", "Dinlenme": "Rest day", "Seans": "Sessions", "Tarih": "Date",
"Süre": "Duration", "Kilo": "Weight", "Bel": "Waist", "Boyun": "Neck", "Kalça": "Hip",
"Yağ %": "Fat %", "Şablon": "Template", "Profil": "Profile", "Aktivite": "Activity",
"Cinsiyet": "Sex", "Erkek": "Male", "Kadın": "Female", "mg kafein": "mg caffeine",
"kapalı": "off", "otomatik": "automatic", "elle ayarlı": "set manually",
"kaldır": "remove", "sil": "delete", "kapat": "close", "azalt": "decrease", "artır": "increase",
"yukarı taşı": "move up", "aşağı taşı": "move down",

/* --- kurulum sihirbazı --- */
"Kurulum": "Setup",
"Seni tanıyalım": "Let's get to know you", "Ölçüler": "Measurements", "Hedefin": "Your goal",
"Sporun": "Your sports", "Haftalık program": "Weekly schedule", "Öğün düzeni": "Meal schedule",
"Bırakmak istediğin": "Something to quit",
"Hesaplar bunlara dayanıyor": "The math is based on these",
"İsteğe bağlı — atlayabilirsin": "Optional — you can skip this",
"Kalori hedefin buradan çıkacak": "Your calorie target comes from this",
"Birden fazla seçebilirsin": "Pick as many as you like",
"Hangi gün ne yapıyorsun": "What you do on which day",
"Günde kaç öğün yiyorsun": "How many meals you eat a day",
"Kullandıklarını işaretle": "Check the ones you take",
"Varsa — yoksa atla": "If any — otherwise skip",
"Bitir ve başla": "Finish and start", "Bu adımı atla": "Skip this step",
"Doğum yılı": "Birth year", "Boy cm": "Height cm", "Kilo kg": "Weight kg",
"Bel cm": "Waist cm", "Boyun cm": "Neck cm", "Kalça cm": "Hip cm",
"Vücut yağ oranı formülü cinsiyete göre değişiyor ve kadınlarda kalça ölçüsünü de kullanıyor. Bu yüzden soruyoruz — başka hiçbir yere gitmiyor.":
  "The body-fat formula differs by sex and uses the hip measurement for women. That's why we ask — it goes nowhere else.",
"Bel: göbek deliği hizasından, karnı içe çekmeden, normal nefes verdikten sonra.":
  "Waist: at navel level, without pulling your stomach in, after a normal exhale.",
"Boyun: gırtlağın hemen altından, boynun en dar yerinden (adem elmasının altı).":
  "Neck: just below the larynx, at the narrowest point (below the Adam's apple).",
"Boyun: gırtlağın hemen altından, boynun en dar yerinden.":
  "Neck: just below the larynx, at the narrowest point.",
"Kalça: en geniş yerinden, ayaklar bitişik.":
  "Hip: at the widest point, feet together.",
"Bunları girmezsen uygulama yine çalışır — sadece vücut yağ oranı hesaplanmaz, kilo takibi devam eder.":
  "The app works fine without these — body fat just won't be estimated; weight tracking continues.",
"Aktivite düzeyi": "Activity level",
"Antrenmanın genelde saat kaçta": "What time do you usually train",
"kcal / gün": "kcal / day", "g protein": "g protein", "litre su": "liters of water",
"Günlük harcaman yaklaşık {t} kcal. Su hedefi {s} × {ml} ml. Bu hedefleri ve bardak boyutunu sonradan Ayarlar'dan değiştirebilirsin.":
  "You burn roughly {t} kcal a day. Water target: {s} × {ml} ml. You can change these targets and the glass size later in Settings.",
"Hedef ve aktiviteyi seçince kalori hedefin hesaplanacak.":
  "Pick a goal and an activity level and your calorie target will be calculated.",
"Önce bir önceki adımda spor seç.": "Pick a sport in the previous step first.",
"Otomatik doldur": "Auto-fill",
"Bir güne birden fazla seans ekleyebilirsin ve sıra korunur — ısınma koşusu, sonra kickboks, sonra ağırlık gibi. Dinlenme günleri gün yüzdesi hesabından düşer.":
  "You can add more than one session to a day and the order is kept — warm-up run, then kickboxing, then weights. Rest days are left out of the daily percentage.",
"Adları, saatleri ve payları değiştirebilir, öğün ekleyip çıkarabilirsin. Sonradan Ayarlar'dan da düzenlenir.":
  "You can rename meals, change times and shares, add or remove meals. Also editable later in Settings.",
"Dozları ve hangi günler alacağını Daha → Takviyeler'den ayarlarsın. Takviye ilaç değildir ve ilacın yerine geçmez.":
  "You set doses and days under More → Supplements. Supplements are not medicine and do not replace medication.",
"Kademeli azaltma takvimi kurulur": "Sets up a gradual reduction schedule",
"Ne": "What", "Şu an haftada kaç": "How many per week right now",
"İlk hafta bu sayı üst sınırın olur, sonra her hafta düşer. Amaç sıfırlamak değil — bırakılabilir bir eğimle inmek.":
  "That number becomes your cap for week one, then it drops every week. The goal isn't zero overnight — it's a slope you can actually hold.",
"Azaltmak istediğin bir şey varsa seç. Uygulama haftalık bir üst sınır koyar ve her hafta düşürür. İstemiyorsan bu adımı atla.":
  "If there's something you want to cut down, pick it. The app sets a weekly cap and lowers it every week. If not, skip this step.",
"Cinsiyet seç": "Pick your sex", "Doğum yılını gir": "Enter your birth year",
"Boyu cm olarak gir (100-250)": "Enter height in cm (100-250)",
"Kiloyu kg olarak gir": "Enter weight in kg",
"Bir hedef seç": "Pick a goal", "Aktivite düzeyini seç": "Pick an activity level",
"En az bir spor seç": "Pick at least one sport", "Bir öğün düzeni seç": "Pick a meal layout",

/* --- bugün --- */
"Gün": "Day", "Yemek ekle": "Add food", "Kalori": "Calories",
"Hepsi alındı": "All taken", "7 günde": "last 7 days",
"gün": "days", "Üst üste kayıt girdin": "Days logged in a row",
"Bugün kayıt gir, seri başlasın": "Log something today to start a streak",
"Başlamadan önce": "Before start", "{n}. hafta": "Week {n}",

/* --- uyarılar --- */
"Bugünkü takviyelerde toplam {n} mg kafein var. Sağlıklı yetişkinde yaygın kabul gören günlük sınır 400 mg — kahve ve çayı da buna ekle.":
  "Today's supplements add up to {n} mg of caffeine. The commonly accepted daily limit for a healthy adult is 400 mg — count coffee and tea too.",
"Bugün {n} kafeinli takviye planlı ({m} mg). İkisini aynı güne koyma; birini başka güne al.":
  "{n} caffeinated supplements planned today ({m} mg). Don't stack them on one day — move one to another day.",
"Antrenmanın {t} — kafeinin yarılanma ömrü 5-6 saat. Antrenmandan hemen önce alırsan gece yarısı hâlâ yarısı kanında olur. Kafeinli ürünü sabaha al.":
  "Your training is at {t} — caffeine's half-life is 5-6 hours. Take it right before training and half is still in your blood at midnight. Take caffeinated products in the morning.",
"{a} — yağda çözünür, aç karnına emilimi düşer. Öğünle birlikte al.":
  "{a} — fat-soluble; poorly absorbed on an empty stomach. Take with a meal.",

/* --- haftalık bütçe --- */
"Haftalık bütçe": "Weekly budget", "{n} gün kaldı": "{n} days left",
"Yenen": "Eaten", "Günlük öneri": "Daily suggestion", "Hafta bütçesi": "Week budget",
"Bu haftanın ilk kaydı. Günlük hedefin {v}.":
  "First log of the week. Your daily target is {v}.",
"Bu hafta fazladan yemişsin. Kalan {n} güne yayılınca günde {v} kalıyor — aç kalman gerekmiyor, sadece toparla.{a}":
  "You've eaten over target this week. Spread over the remaining {n} days that leaves {v} a day — no starving needed, just rein it in.{a}",
"Bu hafta hedefinin altında kalmışsın. Kalan {n} günde günde {v} yiyebilirsin.{a}":
  "You're under target this week. You can eat {v} a day for the remaining {n} days.{a}",
"Yolunda gidiyor. Kalan {n} gün için günde {v}.{a}":
  "On track. {v} a day for the remaining {n} days.{a}",
" {n} gün kayıt girmemişsin, o günler hesaba katılmadı.":
  " {n} days had no log and weren't counted.",

/* --- yemek --- */
"Bugün yediklerim": "Today's food",
"Henüz bir şey eklemedin.": "Nothing added yet.",
"Toplam {k} kcal · {p} g protein": "Total {k} kcal · {p} g protein",
"Dünü tekrarla · {n} kalem · {k} kcal": "Repeat yesterday · {n} items · {k} kcal",
"Bu öğünü kaydet": "Save this meal",
"Öğün dışı": "Outside meals",
"Bu kayıtlar artık var olmayan bir öğüne aitti. Silebilir ya da olduğu gibi bırakabilirsin — günlük toplama dahiller.":
  "These entries belonged to a meal that no longer exists. Delete them or leave them — they count toward the daily total.",
"Öğün adı": "Meal name", "Pay %": "Share %",
"+ Öğün ekle": "+ Add meal", "Eşit dağıt": "Distribute evenly",
"Paylar günlük kalorinin dağılımı. Toplam {t} — 100 tutmasa da sorun değil, oranlar orantılı dağıtılır ve gerçek hedef sağdaki sütunda görünür.":
  "Shares split your daily calories. Total {t} — it doesn't have to be 100; shares are normalized and the real target shows in the right column.",
"Yeni öğün": "New meal", "En fazla 10 öğün": "10 meals max",
"En az bir öğün olmalı": "You need at least one meal", "Paylar eşitlendi": "Shares equalized",
"Öğün düzeni güncellendi": "Meal schedule updated",

/* --- yemek paneli --- */
"yemek ekle": "add food", "Miktar": "Amount", "Gram": "Grams", "Karb / Yağ": "Carbs / Fat",
"Ne yedin": "What did you eat", "Protein g": "Protein g",
"100 g'da {k} kcal, {p} g protein": "{k} kcal, {p} g protein per 100 g",
"Ara — tavuk, pilav, muz…": "Search — chicken, rice, banana…",
"Barkod tara": "Scan barcode",
"Listede yoksa elle ekle": "Not in the list? Add it manually",
"Elle ekle ve kaydet": "Add manually and save",
"Elle eklediğin yemek listene kaydedilir, bir dahaki sefere aramada çıkar.":
  "Foods you add manually are saved to your list and show up in search next time.",
"Bulunamadı. Aşağıdan elle ekleyebilirsin.": "No match. You can add it manually below.",
"Kayıtlı öğünler": "Saved meals", "{n} kalem": "{n} items", "Son eklediklerin": "Recently added",
"Kendi eklediklerim": "My own items",
"{a} eklendi": "{a} added", "{n} kalem eklendi": "{n} items added",
"{a} eklendi ve listene kaydedildi": "{a} added and saved to your list",
"Kaydedildi — yemek eklerken tek dokunuşla çıkacak": "Saved — it'll show up with one tap when adding food",
"Önce bu öğüne bir şeyler ekle": "Add something to this meal first",
"Kayıtlı öğün silindi": "Saved meal deleted",
"Dün bu öğünde kayıt yok": "Nothing logged for this meal yesterday",
"Miktarı gir": "Enter the amount", "Ne yediğini yaz": "Type what you ate", "Kalori gir": "Enter calories",

/* --- barkod --- */
"Yeni barkod": "New barcode",
"Bu kodu tanımıyoruz — ambalajdaki besin değeri tablosundan gir. Bir daha taradığında doğrudan miktara geçecek. Değerler yalnızca senin cihazında saklanıyor.":
  "We don't know this code — enter it from the nutrition label on the package. Next scan goes straight to the amount. Values are stored only on your device.",
"Ürün adı": "Product name", "100 g'da kcal": "kcal per 100 g", "100 g'da protein": "Protein per 100 g",
"Bir porsiyon / paket kaç g": "Grams per serving / pack",
"Ürün adını yaz": "Type the product name", "100 g'daki kaloriyi gir": "Enter kcal per 100 g",
"Barkod kaydedildi": "Barcode saved", "Barkod silindi": "Barcode deleted",
"Kod okunamadı": "Couldn't read the code",
"Barkodu çerçeveye getir": "Line the barcode up in the frame", "Vazgeç": "Cancel",
"Kayıtlı barkodlar": "Saved barcodes", "{n} ürün": "{n} products",
"100 g'da {k} kcal · {p} g protein": "{k} kcal · {p} g protein per 100 g",
"Bu eşleşmeler yalnızca senin cihazında. Barkodun ne olduğunu hiçbir yere sormuyoruz — tarama tamamen çevrimdışı.":
  "These mappings live only on your device. We never ask any server what a barcode is — scanning is fully offline.",

/* --- paneller --- */
"Bugünkü takviyeler": "Today's supplements", "Takviye seçili değil.": "No supplements selected.",
"Takviyeleri düzenle": "Edit supplements",
"Bugünkü antrenman": "Today's training", "Bugün dinlenme günü.": "Rest day today.",
"Detay gir": "Log details",
"{h} · bu hafta en fazla {n} {b}": "{h} · at most {n} {b} this week",
" — sınırı aştın, gelecek hafta sıfırdan başlıyorsun.": " — you're over the cap; next week starts fresh.",

/* --- antrenman --- */
"{n} seans · {m} dk planlı": "{n} sessions · {m} min planned",
"Toparlanma antrenmanın parçası": "Recovery is part of training",
"Bugün dinlenme günü. Programı aşağıdan değiştirebilirsin.":
  "Rest day today. You can change the schedule below.",
"Yaptım": "Done", "{n} dk planlı": "{n} min planned",
"Geçen sefer": "Last time",
"Rekor {kg} kg × {t} · 1RM ~{v} kg": "PR {kg} kg × {t} · 1RM ~{v} kg",
"Bugün 1RM ~{v} kg": "Today 1RM ~{v} kg",
"Yeni rekor · 1RM ~{v} kg": "New PR · 1RM ~{v} kg",
"Tekrar": "Reps", "seti tamamla": "complete set", "egzersizi sil": "delete exercise",
"En fazla 12 set": "12 sets max",
"Egzersiz ekle": "Add exercise", "Geçen seferi doldur": "Fill from last time",
"{n} egzersiz dolduruldu": "{n} exercises filled", "Geçen seans kaydı yok": "No previous session logged",
"Seti bitirince sağdaki kutuyu işaretle — dinlenme sayacı kendiliğinden başlar. Her hafta ya bir tekrar ya biraz kilo ekle; aynı ağırlıkla aynı tekrar gelişme değil bakımdır.":
  "Check the box on the right when you finish a set — the rest timer starts by itself. Add a rep or a little weight every week; same weight for the same reps is maintenance, not progress.",
"Sporları düzenle": "Edit sports",
"Haftalık hacim": "Weekly volume", "son 8 hafta": "last 8 weeks",
"Bu hafta tonaj": "This week tonnage",
"Tonaj = tekrar × kg toplamı.": "Tonnage = total reps × kg.",
" Geçen haftaya göre {p}%.": " {p}% vs last week.",
"Vücut ağırlığı hareketleri tonaja girmiyor — onları set sayısından takip et.":
  "Bodyweight movements don't count toward tonnage — track those by set count.",
"Son antrenmanlar": "Recent workouts", "{n} gün": "{n} days",
"Önce spor seç.": "Pick a sport first.",
"{n} seans · {m} dk": "{n} sessions · {m} min",
"Süre dk": "Duration min", "+ Seans ekle": "+ Add session",
"Dinlenme bitti — sıradaki set": "Rest over — next set",
"+1 dk": "+1 min", "Bitir": "End",

/* --- ilerleme --- */
"Boy {n} cm": "Height {n} cm",
"Ölçümü hep aynı şekilde al · sabah · aç karnına": "Measure the same way every time · morning · empty stomach",
"Bu hafta": "This week", "{n} gün geçti": "{n} days in",
"Su tuttu": "Water goal", "Kalori tuttu": "Calorie goal",
"Kalori önerisi": "Calorie suggestion", "son 2 hafta": "last 2 weeks",
"kg / hafta": "kg / week", "Hedef hız": "Target rate", "Önerilen kcal": "Suggested kcal",
"arttı": "went up", "düştü": "went down", "aynı kaldı": "stayed flat",
"kilonu korumak": "to hold your weight", "{x} kg vermek": "to lose {x} kg", "{x} kg almak": "to gain {x} kg",
"Kilon haftada {x} kg {y}, hedefin {h}. Günlük hedefi {d} kcal değiştirmeyi dene ve iki hafta daha ölç.":
  "Your weight {y} by {x} kg/week; the goal is {h}. Try shifting the daily target by {d} kcal and measure for two more weeks.",
"Hedefi {n} kcal yap": "Set target to {n} kcal",
"Günlük hedef {n} kcal · iki hafta böyle git": "Daily target {n} kcal · hold it for two weeks",
"Son ölçüm": "Last measurement",
"Başlangıca göre: kilo {n} kg": "Since start: weight {n} kg",
" · bel {n} cm": " · waist {n} cm", " · yağ {n} puan": " · fat {n} pts",
"Kilo eğrisi": "Weight curve", "{n} ölçüm": "{n} measurements",
"Yeni ölçüm gir": "New measurement", "Bugünün ölçümünü kaydet": "Save today's measurement",
"Hesaplanan yağ oranı: %{n}": "Estimated body fat: {n}%",
"Sadece kilo da girebilirsin — bel ve boyun boş kalırsa yağ oranı hesaplanmaz, kilo yine kaydedilir.":
  "You can enter just the weight — with waist and neck empty, body fat isn't estimated but the weight is still saved.",
"Geçmiş": "History",
"En azından kiloyu gir": "Enter at least your weight",
"Bel, boyundan büyük olmalı": "Waist must be larger than neck",
"Ölçüm kaydedildi": "Measurement saved",
"{a} {b} değerinden {c} {b} değerine değişim": "change from {a} {b} to {c} {b}",
"Grafik için en az iki ölçüm gerekiyor.": "Need at least two measurements for a chart.",

/* --- daha --- */
"Menü": "Menu", "Liste, rehber ve ayarlar": "List, guide and settings",
"Alışveriş listesi": "Shopping list", "{n} kalem işaretli": "{n} items checked",
"Haftalık market listesi": "Weekly grocery list",
"Kafan karıştığında buraya bak": "Look here when you're unsure",
"{n} takviye seçili": "{n} supplements selected",
"Hedefler, profil, program": "Targets, profile, schedule",
"Son yedek: ": "Last backup: ", "Henüz yedek almadın": "No backup yet",
"Verilerin yalnızca bu cihazda. Hiçbir yere gönderilmiyor.":
  "Your data lives only on this device. Nothing is sent anywhere.",
"Gizlilik politikası": "Privacy policy",

/* --- alışveriş --- */
"1 hafta": "1 week", "Alışveriş": "Groceries", "{a} / {t} işaretli": "{a} / {t} checked",
"Sık yediklerin": "Your frequent foods", "son 14 gün": "last 14 days",
"Listende olmayan ama düzenli yediğin şeyler. Dokununca listene eklenir.":
  "Things you eat regularly that aren't on your list. Tap to add.",
"Kendi eklediklerin": "Your own items", "Kendi kalemini ekle": "Add your own item",
"Ne lazım?": "What do you need?", "listeden çıkar": "remove from list",
"İşaretleri temizle (yeni hafta)": "Clear checks (new week)",
"Kalem adı yaz": "Type an item name", "İşaretler temizlendi": "Checks cleared",
"{a} zaten listede": "{a} is already on the list",
"Kendi listen dolu (60)": "Your own list is full (60)",
"{a} listeye eklendi": "{a} added to the list",

/* --- rehber --- */
"Nasıl kullanılır": "How to use",
"Senin seçimlerine göre süzüldü": "Filtered to your choices",

/* --- takviyeler --- */
"{n} seçili": "{n} selected", "Doz ve günleri buradan ayarla": "Set doses and days here",
"Seçili": "Selected", "Hangi günler": "Which days",
"Takviye kullanmıyorsan sorun değil — aşağıdan istediğin zaman ekleyebilirsin.":
  "Not taking supplements? That's fine — add one below whenever you like.",
"Kütüphanedeki hepsi seçili.": "Everything in the library is selected.",
"Takviye ilaç değildir ve ilacın yerine geçmez. Kullandığın ilaçlarla etkileşebilir — eczacına ya da hekimine danış.":
  "Supplements are not medicine and do not replace medication. They can interact with medication you take — ask your pharmacist or doctor.",

/* --- ayarlar --- */
"Hedefler ve profil": "Targets and profile", "Günlük hedefler": "Daily targets",
"Su bardak": "Water glasses", "Bardak boyutu": "Glass size", "Bardak ml": "Glass ml",
"Günlük su hedefin {v} ({n} × {ml} ml). Şişeden içiyorsan boyutu değiştir — litre hedefin korunur, bardak sayısı yeniden hesaplanır.":
  "Your daily water target is {v} ({n} × {ml} ml). Drinking from a bottle? Change the size — the liter target is kept and the glass count recalculated.",
"Otomatiğe dön": "Back to automatic",
"Profiline göre hesaplanan: {k} kcal · {p} g protein · {l} litre su. Günlük harcaman ~{t} kcal.":
  "Calculated from your profile: {k} kcal · {p} g protein · {l} liters of water. You burn ~{t} kcal a day.",
"Kalori 800-6000 arası olmalı": "Calories must be between 800 and 6000",
"Hedefler kaydedildi": "Targets saved",
"Bardak {ml} ml · hedef {n} bardak": "Glass {ml} ml · target {n} glasses",
"Otomatik hedeflere dönüldü": "Back to automatic targets",
"Antrenman saati": "Training time", "Profil kaydedildi": "Profile saved",
"Hedef ve aktivite": "Goal and activity",
"Bırakma takibi": "Quit tracking",
"{ad} · başlangıç haftalık sınır {n} {b} · {t} tarihinde başladı.":
  "{ad} · starting weekly cap {n} {b} · started {t}.",
"Takibi kapat": "Stop tracking",
"Azaltmak istediğin bir şey varsa buradan açabilirsin.":
  "If there's something you want to cut down, turn it on here.",
"Haftada {n} {b} ile başlar": "Starts at {n} {b} a week",
"Takip başladı": "Tracking started", "Takip kapatıldı": "Tracking stopped",
"Telefon": "Phone",
"Sağlık uygulamasıyla senkron": "Sync with the Health app",
"Kilo, su ve antrenman Apple Health'e yazılır. İzni ilk açtığında ister.":
  "Weight, water and workouts are written to Apple Health. Permission is asked the first time you turn it on.",
"Hatırlatıcılar": "Reminders",
"Su ve antrenman saatlerinde bildirim gönderir.": "Sends notifications at water and training times.",
"Su hatırlatıcısı": "Water reminder", "Antrenman hatırlatıcısı": "Training reminder",
"Programda seans olan günlerde {t}": "Days with planned sessions, at {t}",
"Verilerin iCloud hesabının özel alanında saklanıyor — bizim sunucumuz yok, kimse okuyamaz. Cihazlarında otomatik eşitlenir.":
  "Your data is stored in your own iCloud container — we have no server and no one can read it. It syncs across your devices automatically.",
"Sağlık senkronu açıldı": "Health sync on", "Sağlık izni verilmedi": "Health permission denied",
"Hatırlatıcılar açıldı": "Reminders on", "Bildirim izni verilmedi": "Notification permission denied",
"{n} öğün": "{n} meals", "Hazır düzenler": "Preset layouts",
"Hazır bir düzen seçmek yukarıdaki listenin üzerine yazar. Geçmiş kayıtlar silinmez.":
  "Picking a preset overwrites the list above. Past logs are kept.",
"Sporlar": "Sports",
"Tehlikeli bölge": "Danger zone",
"Tüm verini siler ve kurulumu baştan başlatır. Geri alınamaz — önce yedek al.":
  "Deletes all your data and restarts setup. Cannot be undone — back up first.",
"Her şeyi sil": "Delete everything",
"Eminsen bir daha bas": "Tap again to confirm", "Her şey silindi": "Everything deleted",

/* --- yedek --- */
"Verilerini koru": "Protect your data",
"{n} gün önce yedekledin": "Backed up {n} days ago",
"Veriler yalnızca bu cihazda saklanıyor. Ayda bir yedek al — telefon değiştirirsen ya da uygulama verisi silinirse buradan geri yüklersin.":
  "Your data is stored only on this device. Back up once a month — if you switch phones or the app data gets wiped, you restore from here.",
"Yedeği kopyala": "Copy backup", "Dosya indir": "Download file",
"Geri yükle — yedek metnini yapıştır": "Restore — paste your backup text",
"Yedekten geri yükle": "Restore from backup",
"Geri yükleme mevcut verinin üzerine yazar.": "Restoring overwrites current data.",
"Yedek kopyalandı": "Backup copied", "Aşağıdaki kutudan kopyala": "Copy from the box below",
"Dosya indirildi": "File downloaded", "Yedek geri yüklendi": "Backup restored",
"Geçersiz yedek metni": "Invalid backup text",
"Kaydedilemedi — depolama dolu olabilir": "Couldn't save — storage may be full",
"iCloud'dan güncellendi": "Updated from iCloud",
"Eski verin taşındı — öğün işaretleri hariç": "Your old data was migrated — meal checkmarks excluded",

/* --- bildirimler --- */
"Günlük hedefin {l} litre.": "Your daily target is {l} liters."

};

/* ---------------------------------------------------------------------
   veri.js içeriğinin çevirileri (sporlar, hedefler, takviyeler, öğün ve
   alışkanlık şablonları, market ve REHBER). SOZLUK'a katılıyor — render
   noktaları T() ile okuyor. veri.js'e metin eklersen buraya karşılığını da ekle.
   --------------------------------------------------------------------- */
const VERI_EN = {
  /* ---------- HEDEFLER ---------- */
  "Yağ kaybı": "Fat loss",
  "Kaloriyi kısıp kası koru": "Cut calories, keep muscle",
  "Kas kazanımı": "Muscle gain",
  "Kontrollü kalori fazlası": "Controlled calorie surplus",
  "Formu koru": "Maintain",
  "Kilonu tut, alışkanlığı sürdür": "Hold your weight, keep the habit",
  "Performans": "Performance",
  "Antrenman kalitesi önce gelsin": "Training quality comes first",

  /* ---------- AKTIVITE ---------- */
  "Hareketsiz": "Sedentary",
  "Masa başı, antrenman yok": "Desk job, no training",
  "Hafif aktif": "Lightly active",
  "Haftada 1-3 gün antrenman": "Training 1-3 days a week",
  "Orta aktif": "Moderately active",
  "Haftada 3-5 gün antrenman": "Training 3-5 days a week",
  "Çok aktif": "Very active",
  "Haftada 6-7 gün antrenman": "Training 6-7 days a week",
  "Aşırı aktif": "Extremely active",
  "Günde çift idman ya da ağır iş": "Two-a-days or heavy physical work",

  /* ---------- SPORLAR ---------- */
  "Kickboks": "Kickboxing",
  "Boks": "Boxing",
  "BJJ / Güreş": "BJJ / Wrestling",
  "Ağırlık": "Weight training",
  "Vücut ağırlığı": "Bodyweight",
  "Koşu": "Running",
  "Bisiklet": "Cycling",
  "Yüzme": "Swimming",
  "Yürüyüş": "Walking",
  "Kürek / Ergo": "Rowing / Erg",
  "Futbol": "Soccer",
  "Basketbol": "Basketball",
  "Voleybol": "Volleyball",
  "Tenis": "Tennis",
  "Esneme": "Stretching",

  /* ---------- SPOR_TIP_AD ---------- */
  "Dövüş": "Combat",
  "Güç": "Strength",
  "Kardiyo": "Cardio",
  "Takım": "Team",
  "Esneklik": "Flexibility",

  /* ---------- LOG_ALAN ---------- */
  "Süre": "Duration",
  "dk": "min",
  "Raund": "Rounds",
  "Mesafe": "Distance",
  "Tempo": "Pace",
  "dk/km": "min/km",
  "Zorluk": "Effort",

  /* ---------- GUC_SABLON — şablon adları ---------- */
  "Tüm vücut A": "Full body A",
  "Tüm vücut B": "Full body B",
  "İtiş": "Push",
  "Çekiş": "Pull",
  "Bacak": "Legs",
  "Üst vücut": "Upper body",
  "Alt vücut": "Lower body",

  /* ---------- GUC_SABLON — egzersizler ---------- */
  "Bench press / şınav": "Bench press / push-up",
  "Lat çekiş": "Lat pulldown",
  "Romen deadlift": "Romanian deadlift",
  "Omuz press": "Shoulder press",
  "Kürek çekiş": "Row",
  "Karın": "Abs",
  "Barfiks": "Pull-up",
  "Bacak press": "Leg press",
  "Baldır": "Calves",

  /* ---------- TAKVIYELER — adlar ---------- */
  "Kreatin": "Creatine",
  "Kazein": "Casein",
  "Glutamin": "Glutamine",
  "Amino (kafeinli)": "Amino (caffeinated)",
  "L-Karnitin (sade)": "L-Carnitine (plain)",
  "Termojenik / yağ yakıcı": "Thermogenic / fat burner",
  "Kafein tableti": "Caffeine tablet",
  "D vitamini": "Vitamin D",
  "K2 vitamini": "Vitamin K2",
  "Magnezyum": "Magnesium",
  "Çinko": "Zinc",
  "Demir": "Iron",
  "Kolajen": "Collagen",
  "Probiyotik": "Probiotic",
  "Beta-alanin": "Beta-alanine",

  /* ---------- TAKVIYELER — dozlar ---------- */
  "1 ölçek (~30 g)": "1 scoop (~30 g)",
  "1 ölçek": "1 scoop",
  "1 kapsül": "1 capsule",
  "1 doz": "1 dose",
  "1-2 kapsül": "1-2 capsules",
  "1 damla / kapsül": "1 drop / capsule",

  /* ---------- TAKVIYELER — saatler ---------- */
  "antrenman sonrası": "after training",
  "yatmadan önce": "before bed",
  "öğünle": "with a meal",
  "antrenman sırasında": "during training",
  "antrenmandan 30 dk önce": "30 min before training",
  "antrenmandan önce": "before training",
  "sabah": "morning",
  "kahvaltıyla": "with breakfast",
  "akşam": "evening",
  "aç karnına": "on an empty stomach",

  /* ---------- TAKVIYELER — notlar ---------- */
  "Her gün, antrenman olsun olmasın. Saat fark etmez.": "Every day, training or not. Time of day doesn't matter.",
  "Suyla. Yemekten yeterli protein alamadığın günlerde ikinci ölçek.": "With water. A second scoop on days you can't get enough protein from food.",
  "Gece boyu yavaş salınım. Whey'in gece alternatifi.": "Slow release through the night. The nighttime alternative to whey.",
  "Yağ asidi — aç karnına emilimi düşer. Genelde günde 3 kapsül, öğünlere böl.": "A fatty acid — absorption drops on an empty stomach. Usually 3 capsules a day, split across meals.",
  "Aromasız, suyla.": "Unflavored, with water.",
  "Günlük proteini tutturuyorsan etkisi sınırlı.": "Limited benefit if you're hitting your daily protein.",
  "Kafein içerir — akşam antrenmanlarında uykunu böler.": "Contains caffeine — with evening workouts it disrupts your sleep.",
  "Etikette kafein miktarını doğrula, ürüne göre değişir.": "Check the caffeine amount on the label; it varies by product.",
  "Karbonhidratlı bir şeyle emilimi artar. Thermo / kafeinli sürüm kullanıyorsan bunun yerine Termojenik'i seç.": "Absorbed better with something carby. If you use a thermo / caffeinated version, pick Thermogenic instead.",
  "Thermo karnitin dahil çoğunda kafein var — etiketteki mg'ı doğrula. Kürlü kullan, sürekli değil.": "Most of these, thermo carnitine included, contain caffeine — check the mg on the label. Use in cycles, not continuously.",
  "Yarılanma ömrü 5-6 saat.": "Half-life is 5-6 hours.",
  "Yağda çözünür, yemekle al.": "Fat-soluble, take with food.",
  "Yağda çözünür. Dozu kan değerine göre hekimin belirlemeli.": "Fat-soluble. Your doctor should set the dose based on your blood levels.",
  "Yağda çözünür; genelde D3 ile birlikte alınır. Kan sulandırıcı kullanıyorsan hekimine danışmadan başlama.": "Fat-soluble; usually taken together with D3. If you're on blood thinners, don't start without asking your doctor.",
  "Akşam alınması uykuya yardımcı olabilir.": "Taking it in the evening may help with sleep.",
  "Kalsiyum ve demirle aynı anda alma, emilimi düşürür.": "Don't take it at the same time as calcium or iron; it lowers absorption.",
  "C vitamini ile emilimi artar, çay/kahve ile düşer.": "Vitamin C boosts absorption; tea/coffee lowers it.",
  "Ciltte karıncalanma normal, zararsız.": "Skin tingling is normal and harmless.",

  /* ---------- OGUN_SABLON — düzen adları ve açıklamalar ---------- */
  "Tek öğün": "One meal",
  "Günün tamamı tek öğünde (OMAD)": "The whole day in one meal (OMAD)",
  "2 öğün": "2 meals",
  "Kahvaltı atlanır ya da iki büyük öğün": "Skip breakfast, or two big meals",
  "3 öğün": "3 meals",
  "Sade — kahvaltı, öğle, akşam": "Simple — breakfast, lunch, dinner",
  "3 öğün + ara": "3 meals + snack",
  "Aç kalmamak için bir ara öğün": "One snack so you don't go hungry",
  "5 öğün": "5 meals",
  "Sık ve küçük öğünler": "Frequent, small meals",
  "Antrenman odaklı": "Training-focused",
  "Antrenman öncesi ve sonrası ayrı öğün": "Separate pre- and post-workout meals",
  "Aralıklı oruç (16:8)": "Intermittent fasting (16:8)",
  "Öğünler 8 saatlik pencerede": "Meals within an 8-hour window",

  /* ---------- OGUN_SABLON — öğün adları ---------- */
  "Öğün": "Meal",
  "İlk öğün": "First meal",
  "Son öğün": "Last meal",
  "Kahvaltı": "Breakfast",
  "Öğle": "Lunch",
  "Akşam": "Dinner",
  "Ara öğün": "Snack",
  "Antrenman öncesi": "Pre-workout",
  "Antrenman sonrası": "Post-workout",
  "Gece": "Night",

  /* ---------- ALISKANLIK_SABLON ---------- */
  "Şekerli içecek": "Sugary drinks",
  "kutu": "can",
  "Sigara": "Cigarettes",
  "adet": "piece",
  "Alkol": "Alcohol",
  "kadeh": "glass",
  "öğün": "meal",
  "Enerji içeceği": "Energy drinks",
  "Abur cubur": "Junk food",
  "porsiyon": "serving",
  "Kendim yazacağım": "I'll write my own",

  /* ---------- MARKET_SABLON — gruplar ---------- */
  "Sebze": "Vegetables",
  "Meyve": "Fruit",
  "Et ve tavuk": "Meat and chicken",
  "Balık": "Fish",
  "Şarküteri": "Deli",
  "Süt ürünü": "Dairy",
  "Kahvaltılık": "Breakfast foods",
  "Ekmek ve unlu": "Bread and bakery",
  "Tahıl ve bakliyat": "Grains and legumes",
  "Konserve ve hazır": "Canned and ready-made",
  "Yağ, sos, baharat": "Oil, sauces, spices",
  "Kuruyemiş": "Nuts and dried fruit",
  "Dondurulmuş": "Frozen",
  "Atıştırmalık": "Snacks",
  "İçecek": "Drinks",

  /* ---------- MARKET_SABLON — kalemler ---------- */
  "Domates": "Tomatoes",
  "Salatalık": "Cucumbers",
  "Yeşillik / marul": "Greens / lettuce",
  "Soğan": "Onions",
  "Sarımsak": "Garlic",
  "Biber": "Peppers",
  "Brokoli": "Broccoli",
  "Ispanak": "Spinach",
  "Havuç": "Carrots",
  "Kabak": "Zucchini",
  "Patates": "Potatoes",
  "Mantar": "Mushrooms",
  "Mevsim sebzesi": "Seasonal vegetables",
  "Muz": "Bananas",
  "Elma": "Apples",
  "Portakal": "Oranges",
  "Çilek": "Strawberries",
  "Karpuz / kavun": "Watermelon / melon",
  "Üzüm": "Grapes",
  "Avokado": "Avocado",
  "Limon": "Lemons",
  "Mevsim meyvesi": "Seasonal fruit",
  "Tavuk göğsü": "Chicken breast",
  "Tavuk but": "Chicken thighs",
  "Dana kıyma": "Ground beef",
  "Dana kuşbaşı": "Beef stew meat",
  "Biftek / bonfile": "Steak / tenderloin",
  "Hindi": "Turkey",
  "Kuzu": "Lamb",
  "Somon": "Salmon",
  "Levrek / çipura": "Sea bass / sea bream",
  "Hamsi": "Anchovies",
  "Ton balığı (konserve)": "Tuna (canned)",
  "Karides": "Shrimp",
  "Yumurta": "Eggs",
  "Hindi füme": "Smoked turkey",
  "Tavuk salam": "Chicken bologna",
  "Pastırma": "Pastirma (cured beef)",
  "Sucuk": "Sucuk (spicy sausage)",
  "Süt": "Milk",
  "Yoğurt": "Yogurt",
  "Süzme yoğurt": "Greek yogurt",
  "Ayran": "Ayran (yogurt drink)",
  "Beyaz peynir": "Feta cheese",
  "Kaşar": "Kashar cheese",
  "Lor / çökelek": "Curd cheese",
  "Krem peynir": "Cream cheese",
  "Yulaf": "Oats",
  "Zeytin": "Olives",
  "Bal": "Honey",
  "Reçel": "Jam",
  "Tahin": "Tahini",
  "Pekmez": "Grape molasses",
  "Fıstık ezmesi": "Peanut butter",
  "Mısır gevreği": "Cornflakes",
  "Tam buğday ekmek": "Whole wheat bread",
  "Ekmek": "Bread",
  "Lavaş / tortilla": "Lavash / tortillas",
  "Yufka": "Yufka (thin flatbread)",
  "Galeta / grissini": "Rusks / breadsticks",
  "Pirinç": "Rice",
  "Makarna": "Pasta",
  "Kuskus": "Couscous",
  "Kinoa": "Quinoa",
  "Mercimek": "Lentils",
  "Nohut": "Chickpeas",
  "Kuru fasulye": "Dried beans",
  "Un": "Flour",
  "Domates salçası": "Tomato paste",
  "Mısır konservesi": "Canned corn",
  "Bezelye": "Peas",
  "Barbunya": "Borlotti beans",
  "Hazır çorba": "Instant soup",
  "Zeytinyağı": "Olive oil",
  "Ayçiçek yağı": "Sunflower oil",
  "Sirke": "Vinegar",
  "Hardal": "Mustard",
  "Ketçap": "Ketchup",
  "Soya sosu": "Soy sauce",
  "Tuz": "Salt",
  "Karabiber": "Black pepper",
  "Pul biber": "Red pepper flakes",
  "Kekik": "Thyme",
  "Kimyon": "Cumin",
  "Nane": "Mint",
  "Badem": "Almonds",
  "Ceviz": "Walnuts",
  "Fındık": "Hazelnuts",
  "Antep fıstığı": "Pistachios",
  "Kaju": "Cashews",
  "Kuru üzüm": "Raisins",
  "Hurma": "Dates",
  "Kuru kayısı": "Dried apricots",
  "Dondurulmuş sebze": "Frozen vegetables",
  "Dondurulmuş meyve": "Frozen fruit",
  "Dondurulmuş balık": "Frozen fish",
  "Bitter çikolata": "Dark chocolate",
  "Mısır patlağı": "Popcorn",
  "Kraker": "Crackers",
  "Maden suyu": "Sparkling water",
  "Su (damacana)": "Water (large jug)",
  "Çay": "Tea",
  "Kahve": "Coffee",
  "Bitki çayı": "Herbal tea",
  "Şekersiz gazoz": "Diet soda",

  /* ---------- REHBER — bölüm başlıkları ---------- */
  "Nasıl başlanır": "Getting started",
  "Ölçüm — hep aynı şekilde": "Measuring — always the same way",
  "Kalori ve protein": "Calories and protein",
  "Protein tozu": "Protein powder",
  "Kafeinli takviyeler": "Caffeinated supplements",
  "Uyku ve toparlanma": "Sleep and recovery",
  "Güç antrenmanı": "Strength training",
  "Dövüş sporları": "Combat sports",
  "Sağlık notu": "Health note",

  /* ---------- REHBER — Nasıl başlanır ---------- */
  "Sırayı bozma": "Don't break the order",
  "Yirmi maddeyi aynı anda uygularsan iki haftada bırakırsın. 1. hafta sadece su ve uyku. 2. hafta öğün planı. 3. hafta antrenman hacmi.": "Apply twenty things at once and you'll quit within two weeks. Week 1: just water and sleep. Week 2: the meal plan. Week 3: training volume.",
  "Mükemmel değil düzenli": "Consistent, not perfect",
  "Haftanın 5 gününü tutturmak, 2 gün kusursuz olup bırakmaktan iyidir.": "Hitting 5 days a week beats being flawless for 2 days and quitting.",
  "Bir gün bozulursa": "If a day falls apart",
  "Hiçbir şey olmaz. Uygulama haftalık bütçeye bakar — ertesi gün normal planına dön, telafi için aç kalma.": "Nothing happens. The app looks at the weekly budget — go back to your normal plan the next day, and don't starve yourself to make up for it.",
  "Ölçüm sıklığı": "How often to measure",
  "Tartıya her gün çıkabilirsin ama karar verirken haftalık ortalamaya bak. Günlük dalgalanma su ve tuzdur.": "You can step on the scale every day, but base decisions on the weekly average. Daily fluctuation is water and salt.",

  /* ---------- REHBER — Ölçüm ---------- */
  "Ne zaman": "When",
  "Sabah, aç karnına, tuvaletten sonra, antrenmandan önce.": "In the morning, on an empty stomach, after the bathroom, before training.",
  "Bel": "Waist",
  "Göbek deliği hizasından. Mezura yere paralel, karnı İÇE ÇEKMEDEN, normal nefes verdikten sonra.": "At belly-button level. Tape parallel to the floor, WITHOUT sucking your stomach in, after a normal exhale.",
  "Boyun": "Neck",
  "Gırtlağın hemen altından, boynun en dar yerinden. Mezura önde hafif aşağı eğimli, sıkmadan.": "Just below the Adam's apple, at the narrowest point of the neck. Tape angled slightly downward in front, without squeezing.",
  "Kalça": "Hips",
  "En geniş yerinden, ayaklar bitişik. (Kadınlarda Navy formülü bunu da kullanır.)": "At the widest point, feet together. (For women, the Navy formula uses this too.)",
  "Kaç kez": "How many times",
  "Her ölçüyü 2 kez al, ortalamasını gir. 1 cm hata ~1 puan kaydırır.": "Take every measurement twice and enter the average. A 1 cm error shifts the result ~1 point.",
  "Yorumlama": "Interpretation",
  "4 haftada bel 2-3 cm inmişse doğru yoldasın — tartı ne derse desin.": "If your waist is down 2-3 cm in 4 weeks, you're on the right track — whatever the scale says.",
  "Hata payı": "Margin of error",
  "Navy yöntemi ±3-4 puan sapabilir. Mutlak değere değil trende bak.": "The Navy method can be off by ±3-4 points. Look at the trend, not the absolute value.",

  /* ---------- REHBER — Kalori ve protein ---------- */
  "Hedef nereden geliyor": "Where the target comes from",
  "Mifflin-St Jeor formülüyle bazal metabolizman hesaplanıyor, aktivite düzeyinle çarpılıyor, hedefine göre açık ya da fazla ekleniyor. Ayarlar'dan elle değiştirebilirsin.": "Your basal metabolic rate is calculated with the Mifflin-St Jeor formula, multiplied by your activity level, then a deficit or surplus is added based on your goal. You can change it manually in Settings.",
  "Protein neden yüksek": "Why protein is high",
  "Kalori açığındayken yüksek protein kas kaybını azaltır ve seni daha tok tutar.": "In a calorie deficit, high protein reduces muscle loss and keeps you fuller.",
  "Tartmak şart mı": "Do I have to weigh food",
  "İlk iki hafta tart, gözün kalibre olsun. Sonra tahmin yeterli.": "Weigh your food for the first two weeks so your eye gets calibrated. After that, estimating is enough.",
  "Haftalık bütçe": "Weekly budget",
  "Uygulama günlük kaloriyi 7 ile çarpıp haftalık bir bütçe tutuyor. Bir gün taşarsan kalan günlere yayılır — bu gerçek hayata daha uygun.": "The app multiplies your daily calories by 7 and keeps a weekly budget. If you go over one day, it spreads across the remaining days — a better fit for real life.",

  /* ---------- REHBER — Kreatin ---------- */
  "Ne kadar": "How much",
  "Günde 5 gram. Her gün, antrenman olsun olmasın.": "5 grams a day. Every day, training or not.",
  "Hassasiyet": "Precision",
  "4 g da olur 6 g da. Milimetrik olmak gerekmiyor, düzenli olmak gerekiyor.": "4 g works, so does 6 g. You don't need to be exact, you need to be consistent.",
  "Nasıl içilir": "How to mix it",
  "200-300 ml suya at, karıştır, hemen iç. Dibe çökeni bir kez daha suyla çalkalayıp iç.": "Stir it into 200-300 ml of water and drink right away. Swirl what settles at the bottom with more water and drink that too.",
  "Saat fark etmez. Kahvaltıya bağla ki unutma.": "Time of day doesn't matter. Tie it to breakfast so you don't forget.",
  "Yükleme": "Loading",
  "Gerek yok. 3-4 haftada kaslar doygunluğa ulaşır.": "Not needed. Muscles reach saturation in 3-4 weeks.",
  "Atlarsan": "If you skip a day",
  "Hiçbir şey olmaz. Ertesi gün normal doza devam et, çift alma.": "Nothing happens. Continue with the normal dose the next day; don't double up.",
  "Tartı uyarısı": "Scale warning",
  "İlk hafta tartı 1-2 kg artabilir. Kas içi su, yağ değil.": "The scale may go up 1-2 kg in the first week. That's water inside the muscle, not fat.",
  "Su": "Water",
  "Kreatin suyu kasa çeker — su hedefin bu yüzden daha önemli.": "Creatine pulls water into the muscle — which makes your water goal even more important.",

  /* ---------- REHBER — Protein tozu ---------- */
  "Kaç ölçek": "How many scoops",
  "Günde 1 ölçek. Yemekten yeterli protein alamadıysan 2 ölçek de olur.": "1 scoop a day. 2 scoops is fine if you couldn't get enough protein from food.",
  "Ölçek kaybolduysa": "If you lost the scoop",
  "30 g ≈ 3 tepeleme yemek kaşığı. Kaba ölçü — mutfak tartın varsa onu kullan.": "30 g ≈ 3 heaping tablespoons. A rough measure — use your kitchen scale if you have one.",
  "Nasıl hazırlanır": "How to prepare it",
  "250-300 ml su ile. Shaker'da 15-20 saniye çalkala.": "With 250-300 ml of water. Shake for 15-20 seconds in a shaker.",
  "Antrenman sonrası pratik olduğu için orada. 'Anabolik pencere' abartılmış — önemli olan günün toplam proteini.": "It sits after training because that's convenient. The 'anabolic window' is overblown — what matters is the day's total protein.",
  "Şunu net anla": "Get this straight",
  "Protein tozu ilaç değil, yiyecek. Yiyemediğin bir tavuk göğsünün yerine geçiyor, o kadar.": "Protein powder isn't a drug, it's food. It stands in for a chicken breast you couldn't eat, that's all.",
  "Şişkinlik olursa": "If you get bloated",
  "Sebebi çoğu zaman laktoz değil tatlandırıcıdır. İzolat dene.": "The cause is usually the sweetener, not lactose. Try an isolate.",

  /* ---------- REHBER — CLA ---------- */
  "Nasıl alınır": "How to take it",
  "Öğünlerle — kahvaltı, öğle, akşam. Yağ asidi olduğu için aç karnına emilimi düşer.": "With meals — breakfast, lunch, dinner. It's a fatty acid, so absorption drops on an empty stomach.",
  "Beklenti": "Expectations",
  "Etkisi mütevazıdır. Kalori açığının yerine geçmez.": "The effect is modest. It's no substitute for a calorie deficit.",

  /* ---------- REHBER — Kafeinli takviyeler ---------- */
  "Kafein kuralı": "The caffeine rule",
  "Kafeinin yarılanma ömrü 5-6 saat. Akşam 20:30 antrenmanından önce aldığın 200 mg'ın yarısı gece 2'de hâlâ kanında olur. Uyku bozulunca yağ kaybı ve toparlanma yavaşlar.": "Caffeine's half-life is 5-6 hours. Half of the 200 mg you take before an 8:30 pm workout is still in your blood at 2 am. When sleep suffers, fat loss and recovery slow down.",
  "Aynı gün iki ürün": "Two products in one day",
  "Kafeinli iki takviyeyi aynı güne koyma. Uygulama günlük toplamı hesaplayıp uyarıyor.": "Don't put two caffeinated supplements on the same day. The app totals the daily amount and warns you.",
  "Üst sınır": "Upper limit",
  "Sağlıklı yetişkinde günde 400 mg genel kabul gören sınır. Kahve ve çayı da sayıya kat.": "For a healthy adult, 400 mg a day is the generally accepted limit. Count coffee and tea toward it too.",
  "Akşam antrenmanı": "Evening training",
  "Antrenmanın 18:00'den sonraysa kafeinli ürünü sabaha al ya da hiç alma.": "If your training is after 6 pm, take the caffeinated product in the morning or skip it entirely.",

  /* ---------- REHBER — Uyku ve toparlanma ---------- */
  "Neden önemli": "Why it matters",
  "Uyku, antrenmandan sonra gelen ikinci yarısıdır. 6 saat altı uykuda kas kaybı artar, açlık hormonu yükselir.": "Sleep is the second half that comes after training. Under 6 hours of sleep, muscle loss increases and the hunger hormone rises.",
  "Hedef": "Target",
  "7-9 saat. Hafta içi ve sonu aynı saatte kalkmak, toplam süreden daha etkili.": "7-9 hours. Waking up at the same time on weekdays and weekends does more than total duration.",
  "Geç saatte antrenman yapıyorsan bitişten yatışa en az 1 saat bırak.": "If you train late, leave at least 1 hour between finishing and going to bed.",

  /* ---------- REHBER — Güç antrenmanı ---------- */
  "Kural": "The rule",
  "Her hafta ya bir tekrar ya biraz kilo ekle. Aynı ağırlıkla aylarca aynı tekrar, gelişme değil bakımdır.": "Every week add either one rep or a little weight. The same reps at the same weight for months is maintenance, not progress.",
  "Set ve tekrar": "Sets and reps",
  "Kas için 3-4 set × 6-12 tekrar iyi bir orta yol. Son 2 tekrar zorlanmalı.": "For muscle, 3-4 sets × 6-12 reps is a good middle ground. The last 2 reps should be a grind.",
  "Ağırlığı formu bozulmadan kaldırabildiğin kadar artır. Bir kere sakatlanmak üç ayını alır.": "Increase the weight only as far as you can lift it without breaking form. One injury costs you three months.",
  "Dinlenme": "Rest",
  "Aynı kas grubunu üst üste iki gün çalıştırma.": "Don't train the same muscle group two days in a row.",

  /* ---------- REHBER — Dövüş sporları ---------- */
  "Yeni başladıysan": "If you're new",
  "İlk 4-6 hafta teknik ve kondisyon. Sertliğe değil tekrara odaklan.": "The first 4-6 weeks are technique and conditioning. Focus on repetition, not hitting hard.",
  "Sonrası": "After that",
  "Dövüş sporu kardiyoyu zaten veriyor; ekstra kardiyo yerine güç antrenmanı ekle.": "Combat sports already give you cardio; add strength training instead of extra cardio.",
  "Toparlanma": "Recovery",
  "Sparring yapılan günden sonra ağır bacak günü koyma.": "Don't put a heavy leg day right after a sparring day.",
  "Sıvı": "Fluids",
  "Ders başına 0.5-1 litre ekstra su. Terle giden sadece su değil, tuz da.": "An extra 0.5-1 liter of water per class. Sweat takes salt with it, not just water.",

  /* ---------- REHBER — Kardiyo ---------- */
  "Hacim artışı": "Increasing volume",
  "Haftalık mesafeyi %10'dan hızlı artırma — sakatlığın en sık sebebi budur.": "Don't increase weekly distance faster than 10% — that's the most common cause of injury.",
  "Antrenmanların çoğu konuşabildiğin tempoda olmalı. Her seansı yarış gibi koşma.": "Most of your training should be at a pace where you can talk. Don't run every session like a race.",
  "Aç karnına koşmak yağ yakımını belirgin artırmaz. Performansın iyi olduğu saati seç.": "Running fasted doesn't meaningfully increase fat burning. Pick the time of day when you perform well.",

  /* ---------- REHBER — Sağlık notu ---------- */
  "Önce şunu oku": "Read this first",
  "Bu uygulama tıbbi tavsiye değildir. Buradaki içerik genel bilgidir; teşhis ya da tedavi yerine geçmez. Kronik hastalığın, ilaç kullanımın ya da gebelik varsa plana başlamadan hekimine danış.": "This app is not medical advice. The content here is general information; it does not replace diagnosis or treatment. If you have a chronic condition, take medication, or are pregnant, consult your doctor before starting the plan.",
  "Takviyeler": "Supplements",
  "Takviye ilaç değildir ve ilacın yerine geçmez. Kullandığın ilaçlarla etkileşebilir — eczacına ya da hekimine sor.": "Supplements are not medicine and do not replace it. They can interact with medications you take — ask your pharmacist or doctor.",
  "Kontrol": "Checkup",
  "Uzun süredir hareketsizsen ya da bel çevren yüksekse, plana başlarken bir kez açlık kan şekeri, HbA1c, karaciğer enzimleri ve lipid paneli baktırmakta fayda var.": "If you've been inactive for a long time or your waist is on the high side, it's worth getting fasting blood glucose, HbA1c, liver enzymes, and a lipid panel checked once when starting the plan.",
  "Durman gereken durumlar": "When to stop",
  "Göğüs ağrısı, baş dönmesi, bayılma, olağandışı nefes darlığı — antrenmanı bırak ve hekime başvur.": "Chest pain, dizziness, fainting, unusual shortness of breath — stop training and see a doctor."
};
Object.assign(SOZLUK, VERI_EN);

/* ---------------------------------------------------------------------
   Besin adları, grup adları ve porsiyon adları. besinListeKur() listeyi
   aktif dile göre bu haritayla kuruyor (besinler.js). SOZLUK'a katılmıyor;
   T() değil liste kurulumu kullanıyor.
   --------------------------------------------------------------------- */
const BESIN_EN = {

/* ---- Grup adları ---- */
"Tavuk, hindi": "Chicken, turkey",
"Kırmızı et": "Red meat",
"Balık ve deniz": "Fish & seafood",
"Yumurta": "Eggs",
"Süt ürünleri": "Dairy",
"Ekmek ve tahıl": "Bread & grains",
"Baklagiller": "Legumes",
"Sebzeler": "Vegetables",
"Meyveler": "Fruits",
"Kuruyemiş ve tohum": "Nuts & seeds",
"Yağ ve sos": "Fats & sauces",
"Türk yemekleri": "Turkish dishes",
"Hamur işi ve börek": "Pastries & börek",
"Fast food": "Fast food",
"Kahvaltılık": "Breakfast foods",
"Tatlı": "Desserts",
"Atıştırmalık": "Snacks",
"İçecek": "Beverages",
"Takviye ve spor ürünü": "Supplements & sports products",
"Çorba": "Soups",
"Meze ve salata": "Mezes & salads",
"Bölgesel ve ev yemekleri": "Regional & home cooking",
"Dünya mutfağı": "World cuisine",
"Vejetaryen ve vegan": "Vegetarian & vegan",
"Peynir ve şarküteri": "Cheese & deli",
"Kahve ve zincir içecek": "Coffee & café drinks",
"Market ve hazır ürün": "Packaged & convenience foods",
"Baharat ve garnitür": "Spices & garnishes",

/* ---- Porsiyon adları ---- */
"porsiyon": "serving",
"dilim": "slice",
"adet": "piece",
"kutu": "can",
"bardak": "glass",
"kâse": "bowl",
"yemek kaşığı": "tablespoon",
"yaprak": "sheet",
"paket": "pack",
"su bardağı": "cup",
"diş": "clove",
"çay kaşığı": "teaspoon",
"top": "scoop",
"kare": "square",
"şişe": "bottle",
"fincan": "small cup",
"shaker": "shaker",
"kadeh": "glass",
"ölçek": "scoop",
"şiş": "skewer",
"demet": "bunch",

/* ---- Tavuk, hindi ---- */
"Tavuk göğsü, ızgara": "Chicken breast, grilled",
"Tavuk göğsü, haşlama": "Chicken breast, boiled",
"Tavuk göğsü, çiğ": "Chicken breast, raw",
"Tavuk but, ızgara": "Chicken thigh, grilled",
"Tavuk kanat, fırın": "Chicken wings, baked",
"Tavuk şiş": "Chicken shish kebab",
"Tavuk döner": "Chicken doner kebab",
"Tavuk nugget": "Chicken nuggets",
"Tavuk schnitzel": "Chicken schnitzel",
"Tavuk ciğeri": "Chicken liver",
"Hindi göğsü, ızgara": "Turkey breast, grilled",
"Hindi füme": "Smoked turkey",
"Tavuk sote": "Sautéed chicken",

/* ---- Kırmızı et ---- */
"Dana biftek, ızgara": "Beef steak, grilled",
"Dana kıyma, orta yağlı": "Ground beef, medium fat",
"Dana kıyma, yağsız": "Ground beef, lean",
"Dana bonfile": "Beef tenderloin",
"Dana rosto": "Roast beef",
"Dana haşlama": "Beef, boiled",
"Kuzu pirzola": "Lamb chops",
"Kuzu but": "Leg of lamb",
"Kuzu tandır": "Kuzu tandır (slow-roasted lamb)",
"Köfte, ızgara": "Meatballs, grilled",
"Adana kebap": "Adana kebab (spicy ground lamb)",
"Urfa kebap": "Urfa kebab (mild ground lamb)",
"Et döner": "Beef doner kebab",
"İskender kebap": "İskender kebab (doner over bread)",
"Şiş kebap": "Shish kebab",
"Kokoreç": "Kokoreç (grilled lamb intestines)",
"Ciğer, tava": "Liver, pan-fried",
"Sucuk": "Sucuk (spicy beef sausage)",
"Pastırma": "Pastırma (cured beef)",
"Salam": "Salami",
"Sosis": "Frankfurter sausage",
"Jambon, hindi": "Turkey ham",

/* ---- Balık ve deniz ---- */
"Somon, ızgara": "Salmon, grilled",
"Somon, füme": "Salmon, smoked",
"Levrek": "Sea bass",
"Çipura": "Sea bream",
"Hamsi, tava": "Anchovies, pan-fried",
"Hamsi, çiğ": "Anchovies, raw",
"Uskumru": "Mackerel",
"Palamut": "Bonito",
"Sardalya": "Sardines",
"Alabalık": "Trout",
"Ton balığı, suda": "Tuna, canned in water",
"Ton balığı, yağda": "Tuna, canned in oil",
"Karides": "Shrimp",
"Kalamar, ızgara": "Calamari, grilled",
"Midye dolma": "Stuffed mussels",
"Balık ekmek": "Grilled fish sandwich",

/* ---- Yumurta ---- */
"Yumurta, tam, haşlanmış": "Egg, whole, boiled",
"Yumurta, tam, çiğ": "Egg, whole, raw",
"Yumurta, sahanda": "Egg, fried",
"Yumurta beyazı": "Egg white",
"Yumurta sarısı": "Egg yolk",
"Omlet, sade": "Omelet, plain",
"Menemen": "Menemen (egg & tomato scramble)",
"Sucuklu yumurta": "Eggs with sucuk sausage",

/* ---- Süt ürünleri ---- */
"Süt, tam yağlı": "Milk, whole",
"Süt, yarım yağlı": "Milk, reduced-fat",
"Süt, yağsız": "Milk, skim",
"Yoğurt, tam yağlı": "Yogurt, whole milk",
"Yoğurt, light": "Yogurt, light",
"Süzme yoğurt, light": "Greek yogurt, light",
"Süzme yoğurt, tam yağlı": "Greek yogurt, whole milk",
"Kefir": "Kefir",
"Ayran": "Ayran (yogurt drink)",
"Beyaz peynir, tam yağlı": "White cheese (feta-style), full-fat",
"Beyaz peynir, light": "White cheese (feta-style), light",
"Kaşar peyniri": "Kashar cheese (mild yellow cheese)",
"Tulum peyniri": "Tulum cheese (aged goat cheese)",
"Lor peyniri": "Lor cheese (like ricotta)",
"Çökelek": "Çökelek (dry curd cheese)",
"Labne": "Labneh",
"Krem peynir": "Cream cheese",
"Mozzarella": "Mozzarella",
"Kaymak": "Kaymak (clotted cream)",
"Krema": "Cream",

/* ---- Ekmek ve tahıl ---- */
"Ekmek, beyaz": "Bread, white",
"Ekmek, tam buğday": "Bread, whole wheat",
"Ekmek, çavdar": "Bread, rye",
"Ekmek, kepekli": "Bread, bran",
"Ekmek, ekşi maya": "Bread, sourdough",
"Lavaş": "Lavash flatbread",
"Yufka": "Yufka (thin flatbread sheet)",
"Bazlama": "Bazlama (Turkish griddle bread)",
"Simit": "Simit (sesame bread ring)",
"Galeta / grissini": "Breadsticks / grissini",
"Kraker, tuzlu": "Crackers, salted",
"Yulaf ezmesi, kuru": "Rolled oats, dry",
"Yulaf lapası, sütlü": "Oatmeal, with milk",
"Granola": "Granola",
"Proteinli granola": "Protein granola",
"Mısır gevreği, şekerli": "Corn flakes, sweetened",
"Müsli": "Muesli",
"Pirinç, pişmiş": "Rice, cooked",
"Pirinç pilavı, tereyağlı": "Rice pilaf, with butter",
"Esmer pirinç, pişmiş": "Brown rice, cooked",
"Bulgur, pişmiş": "Bulgur, cooked",
"Bulgur pilavı": "Bulgur pilaf",
"Makarna, pişmiş": "Pasta, cooked",
"Tam buğday makarna, pişmiş": "Whole wheat pasta, cooked",
"Kuskus, pişmiş": "Couscous, cooked",
"Kinoa, pişmiş": "Quinoa, cooked",
"Şehriye, pişmiş": "Vermicelli, cooked",
"Erişte": "Erişte (Turkish egg noodles)",
"Un, buğday": "Flour, wheat",
"Mısır unu": "Cornmeal",
"İrmik": "Semolina",

/* ---- Baklagiller ---- */
"Mercimek, pişmiş": "Lentils, cooked",
"Nohut, pişmiş": "Chickpeas, cooked",
"Kuru fasulye, pişmiş": "White beans, cooked",
"Barbunya, pişmiş": "Borlotti beans, cooked",
"Börülce, pişmiş": "Black-eyed peas, cooked",
"Bakla, pişmiş": "Fava beans, cooked",
"Soya fasulyesi, pişmiş": "Soybeans, cooked",
"Edamame": "Edamame",
"Humus": "Hummus",
"Falafel": "Falafel",
"Tofu": "Tofu",

/* ---- Sebzeler ---- */
"Domates": "Tomato",
"Salatalık": "Cucumber",
"Marul": "Lettuce",
"Roka": "Arugula",
"Ispanak, çiğ": "Spinach, raw",
"Ispanak yemeği": "Spinach stew",
"Brokoli, haşlanmış": "Broccoli, boiled",
"Karnabahar, haşlanmış": "Cauliflower, boiled",
"Havuç": "Carrot",
"Soğan": "Onion",
"Sarımsak": "Garlic",
"Biber, yeşil": "Pepper, green",
"Biber, kırmızı": "Pepper, red",
"Patlıcan": "Eggplant",
"Kabak": "Zucchini",
"Taze fasulye": "Green beans",
"Bezelye": "Peas",
"Mısır, haşlanmış": "Corn, boiled",
"Mantar": "Mushrooms",
"Pancar": "Beets",
"Turp": "Radish",
"Kereviz": "Celery",
"Pırasa": "Leeks",
"Lahana": "Cabbage",
"Brüksel lahanası": "Brussels sprouts",
"Kırmızı lahana": "Red cabbage",
"Bamya": "Okra",
"Enginar": "Artichoke",
"Patates, haşlanmış": "Potato, boiled",
"Patates, fırında": "Potato, baked",
"Patates kızartması": "French fries",
"Patates püresi": "Mashed potatoes",
"Tatlı patates, fırında": "Sweet potato, baked",
"Avokado": "Avocado",
"Zeytin, siyah": "Olives, black",
"Zeytin, yeşil": "Olives, green",
"Turşu": "Pickles",
"Salata, mevsim": "Salad, garden",
"Çoban salata": "Shepherd's salad (tomato & cucumber)",

/* ---- Meyveler ---- */
"Elma": "Apple",
"Muz": "Banana",
"Portakal": "Orange",
"Mandalina": "Tangerine",
"Greyfurt": "Grapefruit",
"Üzüm": "Grapes",
"Karpuz": "Watermelon",
"Kavun": "Melon",
"Çilek": "Strawberries",
"Kiraz": "Cherries",
"Vişne": "Sour cherries",
"Şeftali": "Peach",
"Nektarin": "Nectarine",
"Armut": "Pear",
"Kayısı": "Apricot",
"Erik": "Plum",
"İncir, taze": "Fig, fresh",
"Nar": "Pomegranate",
"Ananas": "Pineapple",
"Kivi": "Kiwi",
"Mango": "Mango",
"Yaban mersini": "Blueberries",
"Ahududu": "Raspberries",
"Böğürtlen": "Blackberries",
"Limon": "Lemon",
"Kuru üzüm": "Raisins",
"Kuru kayısı": "Dried apricots",
"Kuru incir": "Dried figs",
"Hurma": "Dates",
"Kuru erik": "Prunes",

/* ---- Kuruyemiş ve tohum ---- */
"Badem": "Almonds",
"Ceviz": "Walnuts",
"Fındık": "Hazelnuts",
"Antep fıstığı": "Pistachios",
"Kaju": "Cashews",
"Yer fıstığı": "Peanuts",
"Ay çekirdeği": "Sunflower seeds",
"Kabak çekirdeği": "Pumpkin seeds",
"Chia tohumu": "Chia seeds",
"Keten tohumu": "Flaxseeds",
"Susam": "Sesame seeds",
"Fıstık ezmesi": "Peanut butter",
"Tahin": "Tahini",
"Fındık kreması, kakaolu": "Chocolate hazelnut spread",
"Leblebi": "Leblebi (roasted chickpeas)",
"Karışık kuruyemiş": "Mixed nuts",

/* ---- Yağ ve sos ---- */
"Zeytinyağı": "Olive oil",
"Ayçiçek yağı": "Sunflower oil",
"Tereyağı": "Butter",
"Margarin": "Margarine",
"Mayonez": "Mayonnaise",
"Ketçap": "Ketchup",
"Hardal": "Mustard",
"Soya sosu": "Soy sauce",
"Salça, domates": "Tomato paste",
"Nar ekşisi": "Pomegranate molasses",
"Sirke": "Vinegar",
"Barbekü sos": "Barbecue sauce",
"Ranch sos": "Ranch dressing",
"Cacık": "Cacık (yogurt & cucumber dip)",
"Haydari": "Haydari (thick yogurt dip)",

/* ---- Türk yemekleri ---- */
"Mercimek çorbası": "Lentil soup",
"Ezogelin çorbası": "Ezogelin soup (lentil & bulgur)",
"Yayla çorbası": "Yayla soup (yogurt & rice)",
"Tarhana çorbası": "Tarhana soup (fermented grain)",
"Domates çorbası": "Tomato soup",
"Tavuk suyu çorba": "Chicken soup",
"İşkembe çorbası": "Tripe soup",
"Düğün çorbası": "Turkish wedding soup",
"Kuru fasulye yemeği": "White bean stew",
"Nohut yemeği": "Chickpea stew",
"Etli nohut": "Chickpea stew with meat",
"Mercimek yemeği": "Lentil stew",
"Karnıyarık": "Karnıyarık (meat-stuffed eggplant)",
"İmam bayıldı": "İmam bayıldı (stuffed eggplant)",
"Musakka": "Moussaka",
"Türlü": "Türlü (mixed vegetable stew)",
"Zeytinyağlı taze fasulye": "Green beans in olive oil",
"Zeytinyağlı yaprak sarma": "Stuffed grape leaves",
"Etli biber dolma": "Stuffed peppers with meat",
"Kabak dolma": "Stuffed zucchini",
"Mantı, yoğurtlu": "Mantı (Turkish dumplings), with yogurt",
"Kısır": "Kısır (bulgur salad)",
"Çiğ köfte": "Çiğ köfte (spiced bulgur balls)",
"Pilav üstü tavuk": "Chicken over rice",
"Etli pilav": "Rice pilaf with meat",
"Sebzeli güveç": "Vegetable casserole",
"Fırın makarna": "Baked pasta",
"Kuru köfte": "Fried meatballs",
"İçli köfte": "İçli köfte (stuffed bulgur meatballs)",
"Lahana sarma": "Stuffed cabbage rolls",
"Ali Nazik": "Ali Nazik (lamb on eggplant-yogurt purée)",
"Hünkar beğendi": "Hünkar beğendi (lamb stew on eggplant purée)",
"Menemen, peynirli": "Menemen (egg & tomato scramble), with cheese",
"Tantuni": "Tantuni (spiced beef wrap)",
"Kumpir": "Kumpir (loaded baked potato)",

/* ---- Hamur işi ve börek ---- */
"Lahmacun": "Lahmacun (Turkish flatbread)",
"Kıymalı pide": "Pide with ground beef",
"Kaşarlı pide": "Pide with cheese",
"Sucuklu pide": "Pide with sucuk sausage",
"Pizza, margarita": "Pizza, margherita",
"Pizza, karışık": "Pizza, supreme",
"Kıymalı börek": "Börek with ground beef",
"Peynirli börek": "Börek with cheese",
"Su böreği": "Su böreği (layered cheese pastry)",
"Ispanaklı börek": "Börek with spinach",
"Poğaça": "Poğaça (savory bun)",
"Açma": "Açma (soft Turkish bun)",
"Kruvasan": "Croissant",
"Milföy": "Puff pastry",
"Gözleme, peynirli": "Gözleme (stuffed flatbread), cheese",
"Gözleme, kıymalı": "Gözleme (stuffed flatbread), ground beef",
"Katmer": "Katmer (layered pastry)",
"Pancake": "Pancake",
"Waffle": "Waffle",
"Tost, kaşarlı": "Grilled cheese sandwich",
"Sandviç, tavuklu": "Sandwich, chicken",

/* ---- Fast food ---- */
"Hamburger, klasik": "Hamburger, classic",
"Cheeseburger": "Cheeseburger",
"Büyük hamburger": "Large hamburger",
"Tavuk burger": "Chicken burger",
"Balık burger": "Fish burger",
"Patates kızartması, orta": "French fries, medium",
"Soğan halkası": "Onion rings",
"Tavuk kanat, baharatlı": "Chicken wings, spicy",
"Hot dog": "Hot dog",
"Kebap dürüm": "Kebab wrap",
"Tavuk dürüm": "Chicken wrap",
"Taco": "Taco",
"Burrito": "Burrito",
"Sushi, maki": "Sushi, maki rolls",
"Noodle, sebzeli": "Noodles with vegetables",
"Pad thai": "Pad thai",

/* ---- Kahvaltılık ---- */
"Bal": "Honey",
"Reçel": "Jam",
"Pekmez": "Pekmez (grape molasses)",
"Tahin-pekmez": "Tahini with grape molasses",
"Kaymak ve bal": "Clotted cream with honey",
"Peynirli tost ekmeği": "Cheese toast bread",
"Serpme kahvaltı": "Turkish breakfast spread",

/* ---- Tatlı ---- */
"Baklava": "Baklava",
"Künefe": "Künefe (cheese pastry in syrup)",
"Şöbiyet": "Şöbiyet (cream-filled baklava)",
"Tulumba": "Tulumba (fried syrup pastry)",
"Revani": "Revani (semolina sponge cake)",
"Şekerpare": "Şekerpare (syrup-soaked cookie)",
"Kadayıf": "Kadayıf (shredded pastry in syrup)",
"Sütlaç": "Rice pudding",
"Kazandibi": "Kazandibi (caramelized milk pudding)",
"Muhallebi": "Muhallebi (milk pudding)",
"Keşkül": "Keşkül (almond milk pudding)",
"Aşure": "Aşure (Noah's pudding)",
"Dondurma, sade": "Ice cream, plain",
"Profiterol": "Profiteroles",
"Cheesecake": "Cheesecake",
"Brownie": "Brownie",
"Kek, sade": "Cake, plain",
"Kurabiye": "Butter cookie",
"Bisküvi, sade": "Tea biscuit, plain",
"Çikolatalı bisküvi": "Tea biscuit, chocolate",
"Çikolata, sütlü": "Chocolate, milk",
"Çikolata, bitter %70": "Chocolate, dark 70%",
"Çikolata, beyaz": "Chocolate, white",
"Gofret": "Wafer bar",
"Lokum": "Turkish delight",
"Helva": "Halva",
"Puding": "Pudding",
"Meyveli yoğurt": "Fruit yogurt",

/* ---- Atıştırmalık ---- */
"Cips, patates": "Chips, potato",
"Cips, mısır": "Chips, corn",
"Patlamış mısır, yağsız": "Popcorn, air-popped",
"Patlamış mısır, tereyağlı": "Popcorn, buttered",
"Çerez karışık": "Snack mix",
"Mısır çerezi": "Corn nuts",
"Kraker, peynirli": "Crackers, cheese",
"Granola bar": "Granola bar",
"Protein bar": "Protein bar",
"Meyveli bar": "Fruit bar",
"Jelibon": "Gummy candy",
"Sakız, şekersiz": "Gum, sugar-free",

/* ---- İçecek ---- */
"Su": "Water",
"Maden suyu": "Sparkling mineral water",
"Çay, şekersiz": "Tea, unsweetened",
"Çay, 2 şekerli": "Tea, 2 sugars",
"Türk kahvesi, sade": "Turkish coffee, unsweetened",
"Türk kahvesi, orta": "Turkish coffee, medium sweet",
"Filtre kahve, sade": "Drip coffee, black",
"Espresso": "Espresso",
"Latte": "Latte",
"Cappuccino": "Cappuccino",
"Sütlü kahve, şekerli": "Coffee with milk, sweetened",
"Sıcak çikolata": "Hot chocolate",
"Kola": "Cola",
"Kola, şekersiz": "Cola, zero sugar",
"Gazoz": "Lemon-lime soda",
"Ice tea, şeftali": "Iced tea, peach",
"Ice tea, şekersiz": "Iced tea, unsweetened",
"Enerji içeceği": "Energy drink",
"Enerji içeceği, şekersiz": "Energy drink, sugar-free",
"Portakal suyu": "Orange juice",
"Vişne suyu": "Sour cherry juice",
"Elma suyu": "Apple juice",
"Limonata": "Lemonade",
"Şalgam suyu": "Şalgam (fermented turnip juice)",
"Boza": "Boza (fermented grain drink)",
"Salep": "Salep (hot milk drink)",
"Smoothie, meyveli": "Smoothie, fruit",
"Protein shake, suyla": "Protein shake, with water",
"Protein shake, sütle": "Protein shake, with milk",
"Bira": "Beer",
"Bira, alkolsüz": "Beer, non-alcoholic",
"Şarap, kırmızı": "Wine, red",
"Şarap, beyaz": "Wine, white",
"Rakı": "Rakı (anise spirit)",
"Votka / cin": "Vodka / gin",
"Viski": "Whiskey",

/* ---- Takviye ve spor ürünü ---- */
"Whey protein tozu": "Whey protein powder",
"Whey izolat tozu": "Whey isolate powder",
"Kazein tozu": "Casein powder",
"Bitkisel protein tozu": "Plant protein powder",
"Kreatin monohidrat": "Creatine monohydrate",
"Glutamin": "Glutamine",
"BCAA / EAA tozu": "BCAA / EAA powder",
"Pre-workout tozu": "Pre-workout powder",
"Maltodekstrin": "Maltodextrin",
"Kilo aldırıcı (gainer)": "Mass gainer",
"Protein süt, hazır": "Protein milk, ready-to-drink",

/* ---- Çorba ---- */
"Brokoli çorbası": "Broccoli soup",
"Mantar çorbası": "Mushroom soup",
"Kabak çorbası": "Zucchini soup",
"Balkabağı çorbası": "Pumpkin soup",
"Sebze çorbası": "Vegetable soup",
"Şehriye çorbası": "Vermicelli soup",
"Analı kızlı çorba": "Analı kızlı soup (meatball & chickpea)",
"Kelle paça çorbası": "Kelle paça (lamb trotter soup)",
"Arabaşı çorbası": "Arabaşı soup (spicy chicken)",
"Toyga çorbası": "Toyga soup (yogurt & wheat)",
"Miso çorbası": "Miso soup",
"Ramen çorbası": "Ramen soup",

/* ---- Meze ve salata ---- */
"Acılı ezme": "Acılı ezme (spicy pepper dip)",
"Şakşuka": "Şakşuka (fried eggplant in tomato sauce)",
"Fava": "Fava (mashed broad bean dip)",
"Piyaz": "Piyaz (white bean salad)",
"Semizotu salatası": "Purslane salad",
"Rus salatası": "Russian salad",
"Patlıcan salatası": "Eggplant salad",
"Atom mezesi": "Atom (spicy yogurt dip)",
"Girit ezmesi": "Girit ezmesi (cheese & herb dip)",
"Közlenmiş biber": "Roasted red peppers",
"Cevizli biber": "Walnut & pepper dip",
"Sarımsaklı yoğurt": "Garlic yogurt",
"Tabule": "Tabbouleh",
"Gavurdağı salatası": "Gavurdağı salad (walnut & tomato)",
"Roka salatası": "Arugula salad",
"Sezar salata": "Caesar salad",
"Ton balıklı salata": "Tuna salad",
"Kinoa salata": "Quinoa salad",
"Deniz börülcesi": "Sea beans (samphire)",
"Zeytinyağlı enginar": "Artichokes in olive oil",

/* ---- Bölgesel ve ev yemekleri ---- */
"Beyti kebap": "Beyti kebab (wrapped in lavash)",
"Patlıcan kebabı": "Eggplant kebab",
"Testi kebabı": "Testi kebab (clay-pot stew)",
"Cağ kebabı": "Cağ kebab (spit-roasted lamb)",
"Ciğer şiş": "Liver shish kebab",
"Kuzu şiş": "Lamb shish kebab",
"Etli ekmek": "Etli ekmek (meat flatbread)",
"Fırın kebabı": "Oven-roasted lamb",
"Hamsili pilav": "Anchovy rice pilaf",
"Mıhlama (kuymak)": "Mıhlama (cornmeal & cheese fondue)",
"Laz böreği": "Laz böreği (custard pastry)",
"Çılbır": "Çılbır (poached eggs on yogurt)",
"Ekşili köfte": "Sour meatball stew",
"Terbiyeli köfte": "Meatball stew with egg-lemon sauce",
"Bezelye yemeği": "Pea stew",
"Ispanak kavurma": "Sautéed spinach",
"Pırasa yemeği": "Leek stew",
"Kereviz yemeği": "Celery root stew",
"Bamya yemeği": "Okra stew",
"Etli taze fasulye": "Green bean stew with meat",
"Etli patates": "Potato stew with meat",
"Kıymalı ıspanak": "Spinach with ground beef",
"Kayseri mantısı": "Kayseri mantı (Turkish dumplings)",
"Çiğ börek": "Çiğ börek (fried meat pastry)",
"Perde pilav": "Perde pilaf (pastry-wrapped rice)",
"Keşkek": "Keşkek (wheat & meat porridge)",
"Kuzu tandır pilav üstü": "Slow-roasted lamb over rice",
"Nohutlu pilav": "Rice pilaf with chickpeas",
"Sebzeli bulgur pilavı": "Bulgur pilaf with vegetables",
"Karnabahar kızartma": "Fried cauliflower",

/* ---- Dünya mutfağı ---- */
"Ramen, tavuklu": "Ramen, chicken",
"Kung pao tavuk": "Kung pao chicken",
"Tatlı ekşi tavuk": "Sweet and sour chicken",
"Spring roll": "Spring roll",
"Dim sum": "Dim sum",
"Tavuk köri": "Chicken curry",
"Butter chicken": "Butter chicken",
"Biryani": "Biryani",
"Naan ekmeği": "Naan bread",
"Shawarma": "Shawarma",
"Gyros": "Gyros",
"Paella": "Paella",
"Risotto": "Risotto",
"Lazanya": "Lasagna",
"Carbonara": "Carbonara",
"Bolonez soslu makarna": "Pasta with bolognese sauce",
"Pesto soslu makarna": "Pasta with pesto sauce",
"Gnocchi": "Gnocchi",
"Fajita": "Fajitas",
"Quesadilla": "Quesadilla",
"Chili con carne": "Chili con carne",
"Poke bowl": "Poke bowl",
"Shakshuka": "Shakshuka",
"Souvlaki": "Souvlaki",
"Currywurst": "Currywurst",

/* ---- Vejetaryen ve vegan ---- */
"Tempeh": "Tempeh",
"Seitan": "Seitan",
"Vegan burger köftesi": "Vegan burger patty",
"Nohut köftesi": "Chickpea patty",
"Mercimek köftesi": "Lentil patties (Turkish-style)",
"Soya kıyma, hazırlanmış": "Soy crumbles, prepared",
"Vegan peynir": "Vegan cheese",
"Besin mayası": "Nutritional yeast",
"Yulaf sütü": "Oat milk",
"Badem sütü": "Almond milk",
"Soya sütü": "Soy milk",
"Hindistan cevizi sütü": "Coconut milk",
"Laktozsuz süt": "Lactose-free milk",
"Mercimek çorbası, vegan": "Lentil soup, vegan",

/* ---- Peynir ve şarküteri ---- */
"Ezine peyniri": "Ezine cheese (aged white cheese)",
"Örgü peyniri": "Braided cheese",
"Dil peyniri": "String cheese",
"Hellim": "Halloumi",
"Cheddar": "Cheddar",
"Parmesan": "Parmesan",
"Rokfor": "Roquefort",
"Tost peyniri": "Cheese slices",
"Skyr": "Skyr",
"Protein yoğurt": "Protein yogurt",
"Süt kaymağı": "Fresh milk cream",

/* ---- Kahve ve zincir içecek ---- */
"Americano": "Americano",
"Flat white": "Flat white",
"Mocha": "Mocha",
"Macchiato": "Macchiato",
"Frappe": "Frappe",
"Cold brew, sade": "Cold brew, black",
"Chai latte": "Chai latte",
"Matcha latte": "Matcha latte",
"Hazır kahve (granül), sütlü": "Instant coffee with milk",
"Bubble tea": "Bubble tea",
"Milkshake": "Milkshake",
"Limonlu soda": "Lemon soda",

/* ---- Market ve hazır ürün ---- */
"Hazır mercimek çorbası (toz)": "Instant lentil soup (powder)",
"Konserve bezelye": "Canned peas",
"Konserve mısır": "Canned corn",
"Konserve barbunya": "Canned borlotti beans",
"Domates konservesi": "Canned tomatoes",
"Hazır makarna sosu": "Jarred pasta sauce",
"Donuk pizza": "Frozen pizza",
"Donuk patates, fırın": "Frozen fries, oven-baked",
"Hazır köfte, pişmiş": "Ready-made meatballs, cooked",
"Tavuk göğsü, hazır pişmiş": "Chicken breast, precooked",
"Kuru üzümlü kek": "Raisin cake",
"Tam buğday galeta": "Whole wheat rusk",
"Mısır patlağı, mikrodalga": "Microwave popcorn",
"Hazır smoothie": "Bottled smoothie",
"Meyveli yoğurt, içilebilir": "Drinkable fruit yogurt",
"Hazır çorba, kutu": "Ready-to-eat soup, carton",
"Fırın poşetinde tavuk": "Oven-bag roasted chicken",

/* ---- Baharat ve garnitür ---- */
"Karabiber": "Black pepper",
"Pul biber": "Red pepper flakes",
"Kimyon": "Cumin",
"Kekik, kuru": "Thyme, dried",
"Nane, kuru": "Mint, dried",
"Tarçın": "Cinnamon",
"Zerdeçal": "Turmeric",
"Maydanoz": "Parsley",
"Dereotu": "Dill",
"Limon suyu": "Lemon juice",
"Tuz": "Salt"

};

/* ---------------------------------------------------------------------
   Egzersiz kütüphanesi, "yağ yak + kas kazan" hedefi ve başlangıç kartı.
   VERI_EN birleşiminden SONRA eklenir ki buradaki karşılıklar geçerli olsun.
   --------------------------------------------------------------------- */
Object.assign(SOZLUK, {

/* hedef */
"Yağ yak + kas kazan": "Lose fat + build muscle",
"Hafif açık + yüksek protein (vücut yenileme)": "Slight deficit + high protein (recomposition)",

/* set önerileri — hedefe göre */
"3 set × 12-15 tekrar · 45-60 sn dinlenme": "3 sets × 12-15 reps · 45-60 s rest",
"3-4 set × 6-12 tekrar · 90-120 sn dinlenme": "3-4 sets × 6-12 reps · 90-120 s rest",
"3-4 set × 8-12 tekrar · ~90 sn dinlenme": "3-4 sets × 8-12 reps · ~90 s rest",
"4-6 set × 3-6 tekrar · 2-3 dk dinlenme": "4-6 sets × 3-6 reps · 2-3 min rest",
"3 set × 8-12 tekrar · 90 sn dinlenme": "3 sets × 8-12 reps · 90 s rest",

/* kütüphane arayüzü */
"Nasıl yapılır, hangi bölge, set önerisi": "How to do them, muscle groups, set suggestions",
"Nasıl yapılır · hangi bölge · senin hedefine göre set": "How to · muscle group · sets for your goal",
"{n} hareket": "{n} exercises",
"Bölge": "Muscle group", "Nerede": "Where",
"Hepsi": "All", "Salon": "Gym", "Ev": "Home",
"Senin hedefin için": "For your goal",
"Bugünkü seansa ekle": "Add to today's session",
"Bu süzgeçle hareket yok.": "No exercises match this filter.",
"{a} zaten seansta": "{a} is already in the session",
"{a} bugünkü seansa eklendi": "{a} added to today's session",
"nasıl yapılır": "how to",
"Öneriler hedefe ve ekipmana göre genel bilgidir, ders değildir. Bir harekette ağrı oluyorsa o hareketi yapma ve bir uzmana danış.":
  "Suggestions are general guidance by goal and equipment, not coaching. If an exercise hurts, don't do it and ask a professional.",

/* bölgeler ve yeni hareket adları */
"Göğüs": "Chest", "Sırt": "Back", "Omuz": "Shoulders", "Kol": "Arms",
"Şınav": "Push-up", "Pike şınav": "Pike push-up", "Sandalye dips": "Chair dips",
"Kablo crossover": "Cable crossover", "Bacak curl": "Leg curl",
"Ev A": "Home A", "Ev B": "Home B",

/* hareket tarifleri */
"Sırtın bankta, ayakların yerde. Kürek kemiklerini geriye sık, barı göğüs alt hizasına indir, dirsekler gövdeyle ~45° açıda itip kalk.":
  "Back on the bench, feet on the floor. Squeeze your shoulder blades back, lower the bar to your lower chest, press up with elbows at ~45° to your torso.",
"Bank 30-45° eğimde. Dambılları göğüs üst hizasından yukarı it, indirirken dirsekleri kontrollü aç. Üst göğüsü hedefler.":
  "Bench at 30-45°. Press the dumbbells up from upper-chest level, open the elbows under control on the way down. Targets the upper chest.",
"Eller omuz genişliğinde, gövde düz bir çizgi. Göğsün yere yaklaşana kadar in, itip kalk. Zorsa dizlerin yerde başla; kolaysa ayakları yükselt.":
  "Hands shoulder-width, body in a straight line. Lower until your chest nears the floor, press up. Too hard? Start on your knees; too easy? Elevate your feet.",
"Paralel barda, hafif öne eğil. Dirsekler 90° olana kadar in, itip kalk. Omuzda batma hissi olursa derinliği azalt.":
  "On parallel bars, lean slightly forward. Lower until elbows hit 90°, press up. If your shoulder pinches, reduce the depth.",
"Kablolar üstte, bir adım önde dur. Kolları hafif dirsek kırık, geniş bir yay çizerek önde birleştir. Sıkışmayı bir saniye tut.":
  "Cables high, stand one step forward. With a slight elbow bend, sweep your arms together in a wide arc. Hold the squeeze for a second.",
"Bara omuzdan biraz geniş tutun. Göğsünü bara doğru çek, üstte çeneni geçir, kontrollü in. Çıkamıyorsan lastik bantla ya da negatif tekrarlarla başla.":
  "Grip slightly wider than shoulders. Pull your chest toward the bar, chin over at the top, lower under control. Can't do one yet? Start with a band or negative reps.",
"Barı omuzdan geniş tut, göğsün üst kısmına çek. Dirsekler aşağı-geriye; omuzları kulaklardan uzak tut, gövdeyi sallama.":
  "Grip wider than shoulders, pull the bar to your upper chest. Elbows down and back; keep shoulders away from your ears, don't swing.",
"Kalçadan öne eğil, sırt düz. Barı karın hizana çek, kürek kemiklerini birbirine yaklaştır, kontrollü bırak.":
  "Hinge forward from the hips, back flat. Pull the bar to your stomach, squeeze the shoulder blades together, lower under control.",
"Bir elin ve dizin bankta (evde sandalyede). Dambılı kalça yönüne doğru çek, sırtı düz tut, gövdeyi döndürme.":
  "One hand and knee on a bench (a chair at home). Pull the dumbbell toward your hip, keep your back flat, don't rotate the torso.",
"Yüzüstü yat, kollar önde. Kollarını ve bacaklarını aynı anda yerden kaldır, iki saniye tut, yavaş bırak. Bel çevresini güçlendirir.":
  "Lie face down, arms forward. Lift arms and legs off the floor together, hold two seconds, lower slowly. Strengthens the lower back.",
"Dambıllar omuz hizasında, dik dur. Yukarı doğru bası yap, tepede dirsekleri kilitleme. Beli aşırı çukurlaştırma — karnı sık.":
  "Dumbbells at shoulder height, stand tall. Press overhead without locking the elbows at the top. Don't over-arch your lower back — brace your core.",
"Hafif dambıllarla yanlara, omuz hizasına kadar kaldır. Dirsekler hafif kırık, omuz silkme yok. Hafif ağırlık + temiz form.":
  "With light dumbbells, raise to the sides up to shoulder height. Slight elbow bend, no shrugging. Light weight, clean form.",
"Halat yüz hizasında. Dirsekleri geniş tutarak halatı yüzüne doğru çek, kürekleri sık. Arka omuz ve duruş için birebir.":
  "Rope at face height. Pull it toward your face with elbows wide, squeeze the shoulder blades. Great for rear delts and posture.",
"Kalça yukarıda ters V pozisyonu. Başını öne-aşağı indirip omuzlarla it. Omuz presinin ekipmansız hâli; kolaylaşınca ayakları yükselt.":
  "Inverted-V position, hips high. Lower your head forward-down and press back up with the shoulders. The no-equipment shoulder press; elevate your feet as it gets easier.",
"Dirsekler gövdeye sabit. Dambılı savurmadan kaldır, yavaş indir. İndirme kaldırmadan uzun sürsün.":
  "Elbows pinned to your sides. Curl without swinging, lower slowly. The way down should take longer than the way up.",
"Avuçlar birbirine bakar. Dirsek sabit, dambılı çekiç tutar gibi kaldır. Ön kolu da çalıştırır.":
  "Palms facing each other. Elbows fixed, curl like holding a hammer. Works the forearms too.",
"Kablo üstte, dirsekler gövdeye yapışık. Barı aşağı it, dirsekten aç-kapa; omuzdan güç alma.":
  "Cable high, elbows glued to your sides. Push the bar down, open and close from the elbow only; don't borrow from the shoulders.",
"Sırtın sandalyeye dönük, eller kenarda. Dirseklerden 90° in, itip kalk. Bacakları uzattıkça zorlaşır.":
  "Back to a chair, hands on its edge. Lower to 90° at the elbows, press up. Straighter legs make it harder.",
"Ayaklar omuz genişliğinde, topuklar yerde. Kalçayı geriye-aşağı gönder, dizler ayak ucu yönünde. Göğüs dik, derinlik rahat gittiğin kadar.":
  "Feet shoulder-width, heels down. Send the hips back and down, knees tracking over the toes. Chest up, go as deep as feels comfortable.",
"Dambılı göğsünün önünde iki elle tut, squat yap. Ağırlık önde olduğu için formu kendiliğinden düzeltir — squat öğrenmenin en iyi yolu.":
  "Hold a dumbbell at your chest with both hands and squat. The front load self-corrects your form — the best way to learn the squat.",
"Ayaklar platformda omuz genişliğinde. Dizleri göğse doğru indir, itip kalk; tepede dizleri kilitleme, beli yastıktan ayırma.":
  "Feet shoulder-width on the platform. Lower your knees toward your chest and press back; don't lock out at the top or lift your lower back off the pad.",
"Bar/dambıl bacak önünde, dizler hafif kırık. Kalçadan geriye eğil, ağırlık bacağa sürtünerek insin, arka bacakta gerilmeyi hissedince kalk. Sırt hep düz.":
  "Bar/dumbbells in front of your thighs, knees slightly bent. Hinge back from the hips, let the weight slide down your legs, stand up when you feel the hamstring stretch. Back stays flat.",
"Bir adım öne çık, arka diz yere yaklaşsın, öne bastığın topukla geri it. Gövde dik; denge için önce ağırlıksız.":
  "Step forward, let the back knee approach the floor, push back through the front heel. Torso upright; go bodyweight first for balance.",
"Arka ayak bankta/sandalyede. Öndeki bacakla in-kalk. Tek bacak kuvveti ve denge — zorlu ama değerli.":
  "Rear foot on a bench/chair. Lower and rise with the front leg. Single-leg strength and balance — tough but worth it.",
"Makinede topukları kalçaya doğru çek, yavaş bırak. Arka bacağı izole eder; koşucular ihmal etmesin.":
  "On the machine, curl your heels toward your glutes, release slowly. Isolates the hamstrings; runners shouldn't skip it.",
"Sırt üstü bankta, bar kalçada. Kalçayı yukarı it, tepede kalçayı sık, çeneni göğse yakın tut.":
  "Upper back on a bench, bar over your hips. Drive the hips up, squeeze the glutes at the top, keep your chin tucked.",
"Sırt üstü yat, dizler kırık. Kalçayı yukarı it, tepede iki saniye sık. Hip thrust'ın ekipmansız hâli.":
  "Lie on your back, knees bent. Drive the hips up, squeeze for two seconds at the top. The no-equipment hip thrust.",
"Basamak kenarında parmak ucunda yüksel, topuğu basamağın altına kadar indir. Tam açıklıkta ve yavaş çalış.":
  "On a step's edge, rise onto your toes, lower the heel below the step. Full range, slow tempo.",
"Dirsekler omuz altında, gövde düz çizgi. Kalça düşmesin, nefes almaya devam et. Süreyi her hafta biraz uzat.":
  "Elbows under shoulders, body in a straight line. Don't let the hips sag, keep breathing. Add a little time every week.",
"Sırt üstü, dizler kırık. Kürek kemiklerini yerden kaldıracak kadar kıvrıl, boynundan çekme; yukarıda nefes ver.":
  "On your back, knees bent. Curl just enough to lift the shoulder blades, don't pull on your neck; exhale at the top.",
"Sırt üstü, eller kalça altında. Bacakları düz kaldırıp yavaş indir; bel yerden kalkıyorsa dizleri kır.":
  "On your back, hands under your hips. Raise straight legs and lower slowly; bend the knees if your lower back lifts.",
"Şınav pozisyonunda dizleri sırayla göğse çek. Tempoyu artırınca kardiyoya döner — ısınma için de iyi.":
  "From a push-up position, drive the knees to your chest alternately. Speed it up and it becomes cardio — good for warm-ups too.",

/* başlangıç kartı */
"Buradan başla": "Start here",
"Yediğini ekle — aşağıdaki yeşil düğme. Tahmin etme, ara; listede yoksa elle gir.":
  "Log what you eat — the green button below. Don't guess, search; add manually if it's not listed.",
"Su içtikçe mavi kutudaki + işaretine bas.": "Tap + in the blue box as you drink water.",
"Antrenmanı yapınca seansı işaretle — setleri girersen rekorlarını da takip ederiz.":
  "Check the session off when you train — enter your sets and we'll track your PRs too.",
"Rehber'i aç": "Open the guide", "Anladım": "Got it",

/* rehber: recomp */
"Yağ yakarken kas kazanmak": "Building muscle while losing fat",
"Bu gerçekçi mi": "Is this realistic",
"Evet ama herkes için değil. En iyi yeni başlayanlarda, uzun aradan dönenlerde ve yağ oranı yüksekken çalışır. Yıllardır düzenli çalışan birinde ikisi aynı anda çok yavaş ilerler.":
  "Yes, but not for everyone. It works best for beginners, people returning after a long break, and at higher body-fat levels. If you've trained consistently for years, both at once move very slowly.",
"Terazi yalan söyler": "The scale lies",
"Yağ giderken kas gelirse kilo yerinde sayar. İlerlemeyi tartıdan değil bel ölçüsünden, fotoğraftan ve kaldırdığın ağırlıktan takip et.":
  "If muscle comes in as fat goes out, the scale barely moves. Track progress by waist measurement, photos and the weight you lift — not the scale.",
"İki kaldıraç": "The two levers",
"Protein hedefini her gün tuttur (kg başına ~2.2 g) ve antrenmanda her hafta ya bir tekrar ya biraz kilo ekle. Bu ikisi olmadan hafif açık sadece yavaş zayıflamadır.":
  "Hit your protein target every day (~2.2 g per kg) and add a rep or a little weight every week. Without those two, a slight deficit is just slow weight loss.",
"Sabır": "Patience",
"Ayda 0.5-1 kg yağ kaybı + görünür kuvvet artışı bu hedefte başarıdır. Daha hızlısını istiyorsan hedefi ikiye böl: önce yağ, sonra kas.":
  "0.5-1 kg of fat lost per month plus visible strength gains is success here. Want it faster? Split the goal: fat first, then muscle.",

/* rehber: evde antrenman */
"Evde antrenman": "Training at home",
"Ekipman şart değil": "No equipment required",
"Şınav, squat, lunge, glute bridge, plank ile tüm vücudu çalıştırırsın. Programda \"Ev A / Ev B\" şablonları hazır; Egzersizler sayfasında nasıl yapılacağı yazıyor.":
  "Push-ups, squats, lunges, glute bridges and planks cover the whole body. The \"Home A / Home B\" templates are ready in your schedule; the Exercises page shows how to do each one.",
"Zorlaştırma mantığı": "How to progress",
"Evde ağırlık artıramazsın, o yüzden tekrarı artır, tempoyu yavaşlat (3 saniyede in), ya da açıyı zorlaştır (ayaklar yüksekte şınav). Kolaylaşan hareket ilerletilmemiş harekettir.":
  "You can't add plates at home, so add reps, slow the tempo (3 seconds down), or make the angle harder (feet-elevated push-ups). An exercise that got easy is an exercise you haven't progressed.",
"Tek dambıl çok şey değiştirir": "One dumbbell changes a lot",
"Goblet squat, dumbbell row, omuz press, Romen deadlift — tek bir ayarlanabilir dambılla ev antrenmanı yıllarca yeter.":
  "Goblet squats, dumbbell rows, shoulder presses, Romanian deadlifts — a single adjustable dumbbell keeps home training useful for years."

});

/* Seçim alt sayfaları, duruş bölümü ve seri/kutlama metinleri */
Object.assign(SOZLUK, {
"Spor ekle": "Add a sport", "Takviye ekle": "Add a supplement", "Tamam": "Done",
"Henüz spor seçmedin.": "No sports selected yet.",
"Birden fazla seçebilirsin; kaldırmak için üstüne dokun. Hangi gün ne yapacağını sonraki adımda ayarlarsın.":
  "Pick as many as you like; tap one to remove it. You'll set which day is which in the next step.",
"Takviye kullanmıyorsan bu adımı olduğu gibi atla.": "Not taking supplements? Just skip this step.",
"Bugün bir kayıt gir, seri sürsün": "Log something today to keep the streak",

"Duruş": "Posture", "Duruş rutini": "Posture routine",
"Duvar melekleri": "Wall angels", "Kedi-deve": "Cat-cow",
"Kapıda göğüs esnetme": "Doorway chest stretch", "Yüz üstü Y-T kaldırış": "Prone Y-T raise",
"Günde 1-2 kez · 8-12 kontrollü tekrar · esnetmelerde 20-30 sn tut":
  "1-2 times a day · 8-12 controlled reps · hold stretches 20-30 s",

"Dik dur ya da otur. Başını öne eğmeden çeneni geriye, boynuna doğru çek — ensen uzasın. İki saniye tut, bırak. Ekrana doğru öne kayan baş için.":
  "Stand or sit tall. Without tilting your head, draw your chin straight back — feel the back of your neck lengthen. Hold two seconds, release. For the head that drifts toward the screen.",
"Sırtın, kalçan ve başın duvara değsin. Kollar 90°, el sırtları duvarda; duvardan koparmadan yukarı-aşağı kaydır. Üst sırtı uyandırır, omuz hareketliliğini açar.":
  "Back, hips and head against a wall. Arms at 90°, backs of hands on the wall; slide them up and down without losing contact. Wakes up the upper back, opens shoulder mobility.",
"Emekleme pozisyonunda. Nefes verirken sırtını tavana doğru kamburlaştır, alırken göğsünü açıp beline çukur ver. Yavaş ve akıcı — omurgayı gezdir.":
  "On all fours. Exhale and round your back toward the ceiling, inhale and open the chest, arching gently. Slow and fluid — take the spine through its range.",
"Ön kolunu kapı pervazına 90° koy, bir adım öne al ve göğsünde gerilmeyi hisset. 20-30 saniye tut, iki tarafta. Kapanan omuzların panzehiri.":
  "Forearm on a door frame at 90°, step forward and feel the stretch across your chest. Hold 20-30 seconds per side. The antidote to rounded shoulders.",
"Direnç bandını omuz genişliğinde, kollar düz tut. Göğüs hizasında yanlara açarken kürek kemiklerini sık, yavaş bırak. Bant yoksa havluyla gergin tutup aynı hareketi yap.":
  "Hold a resistance band shoulder-width, arms straight. Pull it apart at chest height, squeezing the shoulder blades, release slowly. No band? Use a towel held tight and do the same move.",
"Emekleme pozisyonunda çapraz kolu ve bacağı aynı anda uzat, gövden sallanmasın. İki saniye tut, tarafları değiştir. Gövde kontrolü ve bel dostu.":
  "On all fours, extend the opposite arm and leg together without letting your torso sway. Hold two seconds, switch sides. Core control, kind to the lower back.",
"Yüzüstü yat, baş nötr. Kollarını önce Y sonra T şeklinde yerden birkaç santim kaldır, başparmaklar yukarı. Kürek çevresindeki küçük kasları uyandırır.":
  "Lie face down, head neutral. Raise your arms a few centimeters off the floor in a Y, then a T, thumbs up. Wakes the small muscles around the shoulder blades.",

"Masa başı gerçeği": "The desk reality",
"Gün boyu ekrana eğilmek göğüs tarafını kısaltır, üst sırtı zayıflatır; baş öne kayar, omuzlar kapanır. Egzersizler sayfasındaki Duruş bölümü tam bu zinciri hedefler: öndeki kısalanı esnet, arkadaki zayıflayanı çalıştır.":
  "Leaning into a screen all day shortens the front of the chest and weakens the upper back; the head drifts forward, the shoulders close in. The Posture section on the Exercises page targets exactly this chain: stretch what shortened in front, train what weakened behind.",
"Nasıl kullan": "How to use it",
"Duruş hareketleri ağırlık antrenmanı gibi yorucu değildir — günde 5-10 dakika yeter, ideali her gün. Programına \"Duruş rutini\" şablonunu ekleyebilir ya da mola aralarında tek tek yapabilirsin.":
  "Posture work isn't taxing like lifting — 5-10 minutes a day is enough, ideally daily. Add the \"Posture routine\" template to your schedule or do the moves one by one during breaks.",
"Sınırı bil": "Know the limit",
"Bunlar genel bilgidir, tedavi değildir. Süren ağrın, uyuşman ya da karıncalanman varsa çözüm uygulama değil hekim ya da fizyoterapisttir.":
  "This is general information, not treatment. If you have lasting pain, numbness or tingling, the answer is a doctor or physiotherapist — not an app."
});
