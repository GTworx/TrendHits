# 📋 TrendHits - Development Logs

Tüm geliştirme aşamaları, mimari kararlar, arayüz güncellemeleri ve dağıtım (deployment) kayıtları bu dosyada tutulmaktadır.

---

## [2026-09-22] - Başlık Güncellemesi ve Netlify Dağıtım Yapılandırması

### 1. Arayüz Başlık Güncellemesi
- **Dosya:** [`public/index.html`](./public/index.html)
- **Değişiklik:** Ana kahraman (hero) başlığındaki metin güncellendi.
  - **Önceki:** `Müzik İstihbarat & Otomatik Bülten Orkestrasyonu`
  - **Yeni:** `Yerli ve Yabancı Müzik Trendleri Otomatik Bülten Orkestrasyonu`
- **Amaç:** Panelin yerli ve yabancı trend odağını daha net ve kullanıcı dostu şekilde vurgulamak.

### 2. Netlify Root Dağıtım Yapılandırması (`netlify.toml`)
- **Dosya:** [`netlify.toml`](./netlify.toml)
- **Sorun:** Proje Netlify'a yüklendiğinde statik dosyalar `public` klasöründe yer aldığı için siteye doğrudan root (`/`) üzerinden değil, `/public` dizini üzerinden erişiliyordu ya da ana dizinde `index.html` bulunamadığı için 404 hatası oluşuyordu.
- **Çözüm:** Kök dizine `netlify.toml` dosyası eklendi ve yayın dizini `publish = "public"` olarak ayarlandı.
  ```toml
  [build]
    publish = "public"
  ```
- **Sonuç:** Netlify artık `public/` altındaki `index.html`, `css/` ve `js/` dosyalarını doğrudan sitenin kök etki alanından (`https://site-adi.netlify.app/`) sunar.
- **Backend / API Notu:** Node.js Express arka planı (`src/server.js`) harici bir serviste (Render, Railway vb.) barındırıldığında, `netlify.toml` içerisindeki proxy yönlendirmeleri açılarak `/api/*` isteklerinin backend servisine iletilmesi sağlanabilir.

---

## [2026-09-22] - Versiyon 1.1: Canlı Önizleme, Ayarlar Modalı ve Bülten Stüdyosu

### Arayüz & Etkileşim Geliştirmeleri
- **Canlı Ses Önizleme:** iTunes API üzerinden 30 saniyelik parça önizlemeleri ve dalga visualizer eklendi ([`public/js/audioPlayer.js`](./public/js/audioPlayer.js)).
- **Bülten Stüdyosu Modalı:** Gönderim öncesi canlı HTML e-posta önizlemesi, konu başlığı düzenleme ve tekil test adresiyle Brevo üzerinden test e-postası atabilme özelliği eklendi.
- **Sistem Ayarları Modalı:** Brevo API Key, Liste ID, Gemini API Key ve Cron çalışma sıklığını arayüzden yönetebilme desteği sağlandı.
- **Beğeni (Like) Sistemi:** Anlık kalp animasyonu, parçacık efekti ve SQLite'ta artımlı beğeni sayacı (`POST /api/tracks/:id/like`).

---

## [2026-09-22] - Versiyon 1.0: Çoklu Ajan (Multi-Agent) Mimarisi ve İlk Kurulum

### Temel Mimari ve Servisler
- **Orchestrator Agent:** Paralel ajan tetikleme, SSE üzerinden istemciye gerçek zamanlı durum yayını ([`src/agents/orchestratorAgent.js`](./src/agents/orchestratorAgent.js)).
- **Global & TR Trend Ajanları:** Billboard, Spotify ve Apple Music listelerinden popüler parçaları çeken araştırma ajanları ([`src/agents/globalTrendAgent.js`](./src/agents/globalTrendAgent.js), [`src/agents/turkeyTrendAgent.js`](./src/agents/turkeyTrendAgent.js)).
- **Validator & Formatter Agent:** Çift kayıtları filtreleyen, imla hatalarını gideren ve verileri standart 25'erli listelere dengeleyen ajan ([`src/agents/validatorAgent.js`](./src/agents/validatorAgent.js)).
- **Newsletter Dispatcher Agent:** Brevo API ile entegre duyarlı 2 sütunlu HTML bülten şablonu üretici ([`src/agents/newsletterAgent.js`](./src/agents/newsletterAgent.js)).
- **Veritabanı:** Node.js 24 yerel `node:sqlite` motoru ile ekstra C++ derleyicisine ihtiyaç duymayan hafif veri katmanı ([`src/db/database.js`](./src/db/database.js)).
