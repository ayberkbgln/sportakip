# App Review Notes (İngilizce — App Store Connect'e yapıştır)

This app is a native iOS application built with a WebView-based UI layer,
but it is **not a repackaged website**. It has no public website counterpart
that offers the same functionality, and it provides substantial native
capabilities that are unavailable outside the app:

1. **HealthKit integration (read + write).** Body weight, dietary water and
   workout sessions are written to Apple Health. The last body-mass sample is
   read back so the user does not have to type it twice. Permissions are
   requested contextually, only when the user enables the feature in Settings
   → Telefon → Sağlık, not during onboarding.

2. **iCloud Documents sync.** The user's data is mirrored to their own private
   iCloud container and merged across their devices. There is no developer
   server involved at any point.

3. **Local notifications.** Water reminders and per-weekday training reminders
   scheduled from the user's own weekly program.

4. **Fully offline.** The entire 539-item food database is bundled in the app.
   The app makes no network requests at runtime whatsoever.

**Privacy:** the app collects no data. There is no account, no analytics, no
crash reporting, no advertising identifier and no developer-controlled server.
The App Privacy section is filled in as "Data Not Collected" accordingly.

**Health disclaimers:** the app includes explicit statements that it does not
provide medical advice, that supplements are not medicine, and that nutrition
values are approximate reference figures. These appear in the in-app guide
(Daha → Rehber → Sağlık notu) and in the food database header.

**Test account:** not required — the app has no login. On first launch an
8-step setup wizard collects the user's own measurements; any values can be
entered.

**Language:** the interface is Turkish.
