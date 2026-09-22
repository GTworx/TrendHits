# TrendHits 🎧 - Agentic AI Node.js Müzik İstihbarat & Bülten Paneli

TrendHits, dünyada ve Türkiye'de listeleri domine eden güncel hit parçaları anlık olarak tespit eden, otonom çoklu ajan (**Multi-Agent**) mimarisi ile verileri doğrulayıp yan yana sunan ve **Brevo API** altyapısıyla otomatik e-posta bültenine dönüştüren Node.js tabanlı modern bir müzik istihbarat platformudur.

Bu proje, [`prompt/TrendyHits 1.md`](./prompt/TrendyHits%201.md) ve [`prompt/TrendyHits 2.md`](./prompt/TrendyHits%202.md) dosyalarındaki mimari ve teknik gereksinimler birebir referans alınarak geliştirilmiştir.

---

## 🏛️ Çoklu Ajan (Multi-Agent) Mimarisi

Sistem tek bir monolitik script yerine, iş birliği içinde çalışan 5 bağımsız otonom ajandan oluşur:

1. **🧠 Orchestrator Agent (Yönetici - [`src/agents/orchestratorAgent.js`](./src/agents/orchestratorAgent.js)):** Araştırma isteğini alır, alt ajanları eşzamanlı (`Promise.all` ile paralel) çalıştırır, doğrulanmış veriyi SQLite veritabanına işler (mevcut beğeni sayılarını koruyarak) ve SSE (Server-Sent Events) ile istemciye anlık log yayını yapar.
2. **🌍 Global Music Trend Agent (Araştırmacı 1 - [`src/agents/globalTrendAgent.js`](./src/agents/globalTrendAgent.js)):** Billboard Hot 100, Spotify Top 50 Global ve Apple Music Global listelerini tarayarak dünyada en çok dinlenen 25 parçayı derler.
3. **🇹🇷 TR Music Trend Agent (Araştırmacı 2 - [`src/agents/turkeyTrendAgent.js`](./src/agents/turkeyTrendAgent.js)):** Spotify Top 50 Türkiye, YouTube Music TR Trendler ve Apple Music TR listelerini tarayarak yerli ilk 25 parçayı derler.
4. **🛡️ Validator & Formatter Agent (Doğrulayıcı & Çıktı Üretici - [`src/agents/validatorAgent.js`](./src/agents/validatorAgent.js)):** Şarkıcı ve parça imlalarını kontrol eder, çift kayıtları (duplicate) temizler, her iki listenin parça sayılarını tam 25'er adet olarak dengeler ve standart ID (`global-1..25`, `tr-1..25`) atar.
5. **📬 Music Newsletter Dispatcher Agent ([`src/agents/newsletterAgent.js`](./src/agents/newsletterAgent.js)):** Trend listelerini ve veritabanındaki en çok like alan şarkıları birleştirir; duyarlı (responsive) 2 sütunlu HTML e-posta şablonunu oluşturur ve Brevo SMTP API'sine teslim eder.

---

## 🧩 3 Katmanlı Sistem Yapısı

1. **Arayüz & Etkileşim Katmanı ([`public/`](./public)):**
   - **İki Sütunlu Yan Yana Grid:** Sol sütunda *Global Trendler (Dünya)*, sağ sütunda *Türkiye Trendleri*.
   - **Canlı Like Butonu & Sayacı:** Her parçanın yanında kalp ikonu, tıklama animasyonu ve parçacık efekti. Beğeniler anlık olarak SQLite veritabanına kaydedilir.
   - **Ses Önizleme:** Parçalara tıklanarak 30 saniyelik ses önizlemeleri ve dalga visualizer eşliğinde dinleme imkanı.
   - **Gerçek Zamanlı Terminal (SSE):** `GET /api/agents/stream` üzerinden ajanların düşünce ve tarama süreçlerini adım adım gösteren kayar terminal çekmecesi.
   - **Brevo Bülten Formu:** Sayfanın alt kısmında e-posta bülten abonelik kartı.
   - **Bülten Stüdyosu Modalı:** Canlı HTML e-posta önizlemesi, konu başlığı düzenleme, tekil adrese test gönderimi ve Brevo gönderim geçmişi.
   - **Sistem Ayarları Modalı:** Brevo API Key, Liste ID, Gemini API Key ve Cron zamanlayıcı ayarları.

2. **Arka Plan & Veritabanı ([`src/db/database.js`](./src/db/database.js)):**
   - Node.js 24 yerel `node:sqlite` motoru kullanıldı (ekstra C++ derleyicisine ihtiyaç duymaz).
   - `tracks` tablosu (`id`, `rank`, `title`, `artist`, `region`, `likes_count`, `source`, `genre`, `preview_url`, `image_url`).
   - `subscribers` tablosu (Brevo listesi ve yerel aboneler).
   - `newsletters` ve `settings` tabloları.
   - İlk açılışta 50 parçalık doğrulanmış zengin veri seti otomatik yüklenir.

3. **Brevo Entegrasyonu ([`src/services/brevoService.js`](./src/services/brevoService.js)):**
   - `POST /api/subscribe`: Yeni abone Brevo Contacts API (`https://api.brevo.com/v3/contacts`) uç noktasına eklenir.
   - `POST /api/newsletter/dispatch`: Hazırlanan 2 sütunlu bülten `https://api.brevo.com/v3/smtp/email` üzerinden gönderilir (API anahtarı girilmediğinde simülasyon modunda güvenle çalışır ve arayüzden tam HTML önizlemesi sunar).

---

## 📂 Proje Dosya Yapısı

```
TrendHits/
├── prompt/
│   ├── TrendyHits 1.md          # Multi-Agent sistem promptları ve JSON şeması
│   └── TrendyHits 2.md          # 3 katmanlı mimari, Like & Brevo kurgusu
├── src/
│   ├── server.js                # Express 5 sunucusu & API yönlendirmeleri
│   ├── config.js                # Ortam değişkenleri ve yapılandırma
│   ├── db/
│   │   ├── database.js          # SQLite (node:sqlite) veritabanı motoru
│   │   └── seedData.js          # Global ve TR başlangıç veri seti
│   ├── agents/
│   │   ├── orchestratorAgent.js # Orkestratör ajan (SSE event dağıtıcılı)
│   │   ├── globalTrendAgent.js  # Global liste araştırma ajanı
│   │   ├── turkeyTrendAgent.js  # Türkiye liste araştırma ajanı
│   │   ├── validatorAgent.js    # Doğrulayıcı & Tekilleştirici ajan
│   │   └── newsletterAgent.js   # HTML bülten derleyici ajan
│   ├── services/
│   │   ├── brevoService.js      # Brevo Contacts & Transactional Email servisi
│   │   ├── aiService.js         # Gemini AI & iTunes medya zenginleştirici
│   │   └── schedulerService.js  # node-cron otomatik zamanlayıcı
│   └── utils/
│       └── logger.js            # Renkli terminal loglama & Event Emitter
├── public/                      # Frontend Web Paneli
│   ├── index.html               # 2 sütunlu modern responsive dashboard
│   ├── css/styles.css           # Glassmorphism, kalp animasyonları & stiller
│   └── js/
│       ├── app.js               # Reaktif arayüz yöneticisi & durum kontrolü
│       ├── api.js               # REST & SSE istemcisi
│       └── audioPlayer.js       # Ses önizleme oynatıcısı
├── .env.example                 # Örnek konfigürasyon dosyası
├── package.json                 # Bağımlılıklar ve npm betikleri
└── README.md                    # Detaylı dokümantasyon
```

---

## 📡 API Uç Noktaları

| Yöntem | Endpoint | Açıklama |
| :--- | :--- | :--- |
| `GET` | `/api/trends` | İki sütunlu güncel Global ve TR hit parçalarını ve istatistikleri döner. |
| `POST` | `/api/tracks/:id/like` | Parçanın beğeni sayısını (`likes_count`) 1 artırır ve veritabanına yazar. |
| `POST` | `/api/subscribe` | E-postayı SQLite'a ve Brevo Contacts API'sine kaydeder. |
| `POST` | `/api/agents/run` | Çoklu ajan (Orchestrator -> Global + TR -> Validator) pipeline'ını tetikler. |
| `GET` | `/api/agents/stream` | Ajan düşüncelerini ve eylemlerini canlı SSE olarak iletir. |
| `GET` | `/api/agents/logs` | Son ajan çalışma loglarını JSON olarak listeler. |
| `GET` | `/api/newsletter/preview` | Oluşturulan 2 sütunlu duyarlı HTML e-postayı önizler. |
| `POST` | `/api/newsletter/dispatch` | Bülteni Brevo SMTP API ile test adresine veya abonelere gönderir. |
| `GET` | `/api/newsletter/history` | Geçmiş bülten gönderim kayıtlarını döner. |
| `GET` | `/api/settings` | Sistem ayarlarını ve anahtar durumlarını döner. |
| `POST` | `/api/settings` | Brevo anahtarı, liste ID ve zamanlayıcı ayarlarını günceller. |
| `GET` | `/api/stats` | Toplam parça, beğeni ve abone istatistiklerini döner. |

---

## 🚀 Kurulum ve Çalıştırma

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Ortam Değişkenleri (Opsiyonel)
```bash
cp .env.example .env
```
*(Not: API anahtarlarını paneldeki **Ayarlar (⚙️)** butonundan da doğrudan girebilirsiniz).*

### 3. Sunucuyu Başlatın
```bash
npm start
```

Geliştirme modunda:
```bash
npm run dev
```

Tarayıcınızda açın:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📜 Lisans
Bu proje MIT lisansı altındadır.
