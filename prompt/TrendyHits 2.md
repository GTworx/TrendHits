Bu sistemi uçtan uca hayata geçirmek için gereken mimariyi **3 katman** halinde kurgulayabiliriz:

> 1. **Arayüz & Etkileşim (Frontend \+ DB):** Sol ve sağ listeler, her parçanın yanında canlı Like butonu ve alt kısımda Brevo ile entegre bülten abonelik formu.  
> 2. **Arka Plan & Veritabanı (Backend \+ PostgreSQL/Supabase/SQLite):** Like sayılarını tutan ve Brevo API'sine yeni abone ekleyen servis.  
> 3. **Agentic AI & Otomasyon (Newsletter Sender):** Belirli periyotlarla (örneğin haftada 1 veya her gün) trend listelerini çıkaran ve Brevo Transactional / Campaign API üzerinden abonelere şık bir e-posta bülteni gönderen ajan.

Aşağıda bu sistemi oluşturmak için **Arayüz/Frontend Kodu**, **Backend & Brevo Entegrasyonu** ve **Agentic AI E-posta Gönderim Prompt'u/Kurgusunu** bulabilirsiniz.

### **1\. Veritabanı Şeması (SQL)**

Like sayılarını ve şarkıları tutmak için basit ve esnek bir tablo:

&nbsp;

&nbsp;

&nbsp;

SQL

CREATE TABLE tracks (  
&nbsp;&nbsp;&nbsp;&nbsp;id VARCHAR(64) PRIMARY KEY, \-- örn: 'global-1', 'tr-5' ya da ISRC kodu  
&nbsp;&nbsp;&nbsp;&nbsp;title VARCHAR(255) NOT NULL,  
&nbsp;&nbsp;&nbsp;&nbsp;artist VARCHAR(255) NOT NULL,  
&nbsp;&nbsp;&nbsp;&nbsp;region VARCHAR(10) NOT NULL, \-- 'GLOBAL' veya 'TR'  
&nbsp;&nbsp;&nbsp;&nbsp;likes\_count INT DEFAULT 0,  
&nbsp;&nbsp;&nbsp;&nbsp;updated\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP  
);

### **2\. Frontend & Like Mantığı (React / HTML Görünümü)**

Her parçanın yanına interaktif bir beğeni butonu ve sayacı yerleştirilir:

&nbsp;

&nbsp;

&nbsp;

JavaScript

// TrackItem Bileşeni Örneği  
function TrackRow({ track, onLike }) {  
&nbsp;&nbsp;return (  
&nbsp;&nbsp;&nbsp;&nbsp;\<div className\="flex items-center justify-between p-3 border-b hover:bg-gray-50"\>  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\<div className\="flex items-center gap-3"\>  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\<span className\="font-bold text-gray-500 w-6"\>{track.rank}\</span\>  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\<div\>  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\<p className\="font-semibold text-gray-900"\>{track.title}\</p\>  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\<p className\="text-sm text-gray-500"\>{track.artist}\</p\>  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\</div\>  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\</div\>  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{/\* Beğeni Butonu \*/}  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\<button&nbsp;  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;onClick\={() \=\> onLike(track.id)}  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition"  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\>  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\<svg className\="w-4 h-4 fill-current" viewBox\="0 0 24 24"\>  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\<path d\="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/\>  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\</svg\>  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\<span className\="text-xs font-semibold"\>{track.likes\_count}\</span\>  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\</button\>  
&nbsp;&nbsp;&nbsp;&nbsp;\</div\>  
&nbsp;&nbsp;);  
}

### **3\. Brevo (Sendinblue) Entegrasyonu**

#### **A. Bültene Abone Kaydetme (Node.js / Express API Endpoint)**

Kullanıcı formu doldurduğunda Brevo iletişim listesine (Contacts List) eklenir:

&nbsp;

&nbsp;

&nbsp;

JavaScript

// POST /api/subscribe  
import axios from 'axios';

app.post('/api/subscribe', async (req, res) \=\> {  
&nbsp;&nbsp;const { email } \= req.body;  
&nbsp;&nbsp;const BREVO\_API\_KEY \= process.env.BREVO\_API\_KEY;  
&nbsp;&nbsp;const LIST\_ID \= 2; // Brevo panelinde açtığınız "Music Newsletter" liste ID'si

&nbsp;&nbsp;try {  
&nbsp;&nbsp;&nbsp;&nbsp;const response \= await axios.post(  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'https://api.brevo.com/v3/contacts',  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;email: email,  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;listIds: \[LIST\_ID\],  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;updateEnabled: true  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;},  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;headers: {  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'api-key': BREVO\_API\_KEY,  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'Content-Type': 'application/json'  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}  
&nbsp;&nbsp;&nbsp;&nbsp;);  
&nbsp;&nbsp;&nbsp;&nbsp;res.json({ success: true, message: 'Bültene başarıyla kaydoldunuz\!' });  
&nbsp;&nbsp;} catch (error) {  
&nbsp;&nbsp;&nbsp;&nbsp;res.status(400).json({ success: false, error: error.response?.data?.message || error.message });  
&nbsp;&nbsp;}  
});

### **4\. Agentic AI Newsletter Kurgusu (Ajan Rolü ve Prompt)**

Bu aşamada çalışan **"Music Newsletter Dispatcher Agent"**, iki görevi yerine getirir:

> 1. Güncel listeleri ve veritabanındaki en çok like alan parçaları bir araya getirir.  
> 2. Brevo API'si üzerinden abonelere gidecek modern HTML e-posta şablonunu oluşturur ve gönderim API'sini tetikler.

#### **Ajan Sistem Prompt'u (System Prompt):**

&nbsp;

&nbsp;

&nbsp;

Markdown

\# ROLE & MISSION  
Sen "Music Trend Intelligence & Newsletter Agent"sın.&nbsp;  
Görevin, en güncel Global ve Türkiye müzik trendlerini çekmek, bunları şık bir e-posta bülteni (HTML email) formatına dönüştürmek ve Brevo API aracılığıyla abonelere gönderilmeye hazır hale getirmektir.

\---

\# CONTEXT & TOOLS  
\- Web Search Tool: Billboard, Spotify Top 50 Global & TR verilerini arar.  
\- Database Tool: Parçalara ait beğeni sayılarını (likes*\_count) getirir.*  
*\- Brevo Email Tool / API: Bülten şablonunu aboneler listesine gönderir.*

*\---*

*\# WORKFLOW*

*1\. DATA GATHERING:*  
&nbsp;&nbsp;&nbsp;*\- Global'de en çok dinlenen güncel 20-30 parçayı çek.*  
&nbsp;&nbsp;&nbsp;*\- Türkiye'de en çok dinlenen güncel 20-30 parçayı çek.*  
&nbsp;&nbsp;&nbsp;*\- DB'den gelen like sayılarıyla eşleştir.*

*2\. NEWSLETTER CONTENT COMPILATION:*  
&nbsp;&nbsp;&nbsp;*\- E-posta konusu: "🎧 Haftanın/Günün Hit Parçaları: Global & Türkiye Trendleri"*  
&nbsp;&nbsp;&nbsp;*\- Giriş: Kısa, enerjik bir editoryal giriş yazısı.*  
&nbsp;&nbsp;&nbsp;*\- 2 Sütunlu Responsive HTML Kart Tasarımı:*  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*\* Sol: 🌍 Global Top Hits (Sıra, Sanatçı, Parça, Beğeni Sayısı)*  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*\* Sağ: 🇹🇷 Türkiye Top Hits (Sıra, Sanatçı, Parça, Beğeni Sayısı)*  
&nbsp;&nbsp;&nbsp;*\- Alt Kısım: "En çok beğendiğin parçayı oylamak için web sitemizi ziyaret et\!" çağrısı (CTA butonu).*

*3\. DISPATCH (BREVO ENTEGRASYONU):*  
&nbsp;&nbsp;&nbsp;*\- Hazırlanan HTML içeriğini Brevo'nun \`/v3/smtp/email\` veya \`/v3/emailCampaigns\` uç noktasına JSON payload olarak ilet:*  
&nbsp;&nbsp;&nbsp;*\`\`\`json*  
&nbsp;&nbsp;&nbsp;*{*  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*"sender": { "name": "Hit Müzik Trendleri", "email": "bulten@alanadiniz.com" },*  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*"to": \[{ "email": "abone@email.com" }\], // veya campaign listesi*  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*"subject": "🔥 Trend Müzikler: Global & Türkiye Top Listesi",*  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*"htmlContent": "\<\!DOCTYPE html\>\<html\>...\</html\>"*  
&nbsp;&nbsp;&nbsp;*}*

&nbsp;

&nbsp;

&nbsp;

\---

\#\#\# 5\. Özet Mimari Akışı

\[ Kullanıcı Arayüzü \]

├── Sol Kolon: Global Trendler \+ \[❤️ Like Butonu\]

├── Sağ Kolon: TR Trendler \+ \[❤️ Like Butonu\]

└── Alt Kısım: "Trendleri E-posta ile Al" Formu

│

├── (1. Like Tıklandı) ──\> \[Backend API\] ──\> \[Veritabanı: Like \+1\]

│

└── (2. E-posta Girildi) ─\> \[Brevo Contacts API\] ──\> \[Aboneler Listesi\]

\[ Otomasyon / Cron / Agent \]

├── 1\. Agentic AI trendleri ve like verilerini analiz eder.

├── 2\. Responsive HTML bültenini derler.

└── 3\. Brevo Transactional / Campaign API ile tüm abonelere bülteni postalar.

&nbsp;

&nbsp;

&nbsp;

Bu kurguyu Next.js / Python (FastAPI) gibi belirli bir teknoloji yığını üzerinde projelendirmek ister misiniz? İlgili servis kodlarını tam dosya halinde de hazırlayabilirim.  
