# 📋 TrendHits - Development Logs

Tüm geliştirme aşamaları, mimari kararlar, arayüz güncellemeleri ve dağıtım (deployment) kayıtları bu dosyada tutulmaktadır.

---

## [2026-09-22] - Doğrudan Kaynak Oynatıcı Bağlantıları (Spotify, YouTube Music, Apple Music)

### 1. Parçalara Kaynak Oynatıcı Linkleri Eklendi
- **Dosyalar:** [`public/js/app.js`](./public/js/app.js), [`public/index.html`](./public/index.html), [`public/data/initialTrends.json`](./public/data/initialTrends.json), [`src/db/seedData.js`](./src/db/seedData.js), [`src/db/database.js`](./src/db/database.js), [`src/agents/validatorAgent.js`](./src/agents/validatorAgent.js), [`src/agents/newsletterAgent.js`](./src/agents/newsletterAgent.js)
- **Özellikler:**
  - **Arayüzde Oynatıcı Butonları ve Küçük Resimler (Thumbnails):** 
    - Her şarkı kartının albüm kapağı (küçük resmi / thumbnail) doğrudan ilgili kaynağa (`player_url`) yönlendiren tıklanabilir bir bağlantıya dönüştürüldü. Üzerine gelindiğinde (hover) platform ikonu (Spotify, YouTube Music, Apple Music) animasyonla belirir.
    - Şarkı başlığı ve kartın sağındaki marka rozetleri de doğrudan oynatıcı linkine bağlandı.
    - 30 saniyelik yerel ses önizlemesi için parça detaylarına şık bir `▶ Önizle` butonu eklendi.
  - **Kayan Oynatıcı Çubuğu Entegrasyonu:** Alt kısımda açılan floating player çubuğundaki albüm kapağı resmi ve harici oynatıcı butonu, çalan parçanın orijinal platform linkine bağlandı.
  - **Veritabanı Şeması & Geriye Dönük Doldurma (Backfill):** SQLite `tracks` tablosuna `player_url TEXT` sütunu eklendi; var olan kayıtlar ve yeni eklenen tüm parçalar kaynaklarına göre otomatik olarak Spotify, YouTube Music veya Apple Music oynatıcı linkleriyle dolduruldu.
  - **Validator Ajan Desteği:** Çoklu ajan sistemi her yeni liste taramasında, bulunan parçanın kaynağına göre `player_url` alanını otomatik üretecek şekilde güncellendi.
  - **E-Posta Bülteni Entegrasyonu:** Brevo üzerinden gönderilen HTML e-posta bültenindeki şarkı başlıkları, kullanıcıların doğrudan tıklayıp parçayı dinleyebileceği interaktif bağlantılara dönüştürüldü.

---

## [2026-09-22] - Hata Düzeltmesi: Netlify İstek Hatası ve Güvenli API/Demo Modu Desteği

### 1. Ekran Görüntüsü İncelemesi (`errorLogs/refresh-error.png`)
- **Tespit Edilen Hata:** `Ajan çalıştırma hatası: Failed to execute 'json' on 'Response': Unexpected end of JSON input`
- **Kök Neden:** 
  - Netlify yalnızca statik dosyaları barındırdığı için `POST /api/agents/run` isteğini yakalayıp Netlify Forms mekanizması gereği `HTTP 400 Bad Request ("Bad request, missing form")` veya `404` düz metin yanıtı dönüyordu.
  - İstemci tarafında `res.json()` bu düz metni ayrıştırmaya çalıştığında raw JSON parser hatası oluşuyordu.

### 2. İstemci Tarafı İyileştirmeleri & Güvenli Yanıt Denetimi
- **Dosyalar:** [`public/js/api.js`](./public/js/api.js), [`public/js/app.js`](./public/js/app.js), [`public/data/initialTrends.json`](./public/data/initialTrends.json)
- **`safeFetch` Fonksiyonu:**
  - Tüm API çağrılarında HTTP durum kodları, `content-type: application/json` ve Netlify 400/404 yanıtları tespit edilerek kullanıcıya anlaşılır Türkçe hata mesajları (`Backend API bulunamadı (HTTP 400). Statik barındırmada (Netlify) Node.js sunucusu çalışmıyor veya proxy yönlendirmesi yapılmamış.`) iletilmesi sağlandı.
  - Ham JavaScript `Unexpected end of JSON input` hatası engellendi.
- **Statik Demo Veri Desteği (`public/data/initialTrends.json`):**
  - Netlify üzerinde veya backend çevrimdışıyken arayüzün boş kalmaması için `initialTrends.json` veri seti oluşturuldu.
  - `api.getTrends()` backend'e ulaşamadığında otomatik olarak bu veri setini yükler ve kullanıcıyı bilgilendirir (`Demo Modu: Statik trend verileri yüklendi`).
  - Beğeni (like) etkileşimleri backend çevrimdışıyken de arayüzde simüle edilerek sayfa deneyiminin bozulmaması sağlandı.
- **SSE Bağlantı İyileştirmesi:**
  - Backend çevrimdışıyken EventSource'un sonsuz döngüde hata vermesi engellendi (azami 2 deneme sonrası sessiz duraklatma).

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
