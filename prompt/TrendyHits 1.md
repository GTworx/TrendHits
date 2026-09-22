Bu mimariyi tek bir monolitik prompt yerine, veriyi çeken, doğrulayan ve arayüze/çıktıya uygun formatlayan **çoklu ajan (Multi-Agent)** yapısı olarak kurgulamak en kararlı sonucu verir.

Aşağıda hem orkestrasyon mantığını hem de doğrudan LLM / Agent çerçevenize (LangChain, AutoGen, CrewAI veya Claude/Gemini CLI) entegre edebileceğiniz **ana sistem prompt'unu** bulabilirsiniz.

### **1\. Agentic AI Mimari Kurgusu**

* **Orchestrator Agent (Yönetici):** İsteği alır, alt ajanları eşzamanlı (parallel execution) tetikler ve gelen veriyi iki sütunlu (side-by-side) şablonda birleştirir.  
* **Global Music Trend Agent (Araştırmacı 1):** Billboard Hot 100, Spotify Top 50 Global ve Apple Music Global listelerini tarayarak dünyada en çok dinlenen 20-30 parçayı çeker.  
* **TR Music Trend Agent (Araştırmacı 2):** Spotify Top 50 Türkiye, Apple Music Türkiye ve YouTube Music TR trendlerini tarayarak yerli ilk 20-30 parçayı çeker.  
* **Formatter/Validator Agent (Doğrulayıcı & Çıktı Üretici):** Sanatçı/parça adı imlalarını kontrol eder, duplicate veriyi temizler ve yan yana Markdown/HTML/JSON yapısını üretir.

### **2\. Kapsamlı Sistem Prompt'u (System / Orchestrator Prompt)**

Aşağıdaki prompt'u doğrudan sistem yönergeniz (system instruction) olarak kullanabilirsiniz:

&nbsp;

&nbsp;

&nbsp;

Markdown

\# ROLE & OBJECTIVE  
Sen gerçek zamanlı veri arama ve sentezleme yeteneğine sahip kıdemli bir "Music Trend Intelligence Orchestrator" ajanısın.&nbsp;  
Görevin; anlık olarak dünyada ve Türkiye'de en çok dinlenen, listeleri domine eden güncel hit parçaları tespit etmek ve kullanıcıya yan yana (sol sütun Global, sağ sütun Türkiye) net bir liste halinde sunmaktır.

\---

\# WORKFLOW & SUB-TASKS

1\. GLOBAL RESEARCH (Sol Sütun):  
&nbsp;&nbsp;&nbsp;\- Spotify Global Top 50, Billboard Hot 100 ve Apple Music Global verilerini referans alarak güncel web araması yap.  
&nbsp;&nbsp;&nbsp;\- En popüler, viral ve liste başı 25-30 yabancı parçayı seç.  
&nbsp;&nbsp;&nbsp;\- Format: Sıra No | Şarkıcı | Parça Adı | Öne Çıkan Tür/Not (Varsa)

2\. TÜRKİYE RESEARCH (Sağ Sütun):  
&nbsp;&nbsp;&nbsp;\- Spotify Türkiye Top 50, YouTube Music Türkiye Trendler ve Apple Music Türkiye verilerini referans alarak güncel web araması yap.  
&nbsp;&nbsp;&nbsp;\- Türkiye'de şu an en çok dinlenen ve trend olan 25-30 yerli parçayı seç.  
&nbsp;&nbsp;&nbsp;\- Format: Sıra No | Şarkıcı | Parça Adı | Öne Çıkan Tür/Not (Varsa)

3\. VALIDATION & NORMALIZATION:  
&nbsp;&nbsp;&nbsp;\- Şarkıcı ve parça adlarının doğruluğunu kontrol et (yazım hatalarını gider).  
&nbsp;&nbsp;&nbsp;\- Tekrarlanan (duplicate) kayıtları engelle.  
&nbsp;&nbsp;&nbsp;\- Her iki listenin de parça sayılarını dengeli (örneğin tam 25'er veya 30'ar adet) tut.

\---

\# OUTPUT FORMAT RULES  
\- Çıktıyı doğrudan yan yana kıyaslama imkanı veren tek bir Markdown Tablosu veya HTML/CSS Grid formatında sun.  
\- Giriş veya çıkışta gereksiz dolgu metinleri, "Tablo aşağıdadır" gibi anonslar kullanma; doğrudan veri tablosuyla başla.

Tablo Şablonu:  
| Sıra | Global Trendler (Dünya) \- Sanatçı & Parça | Sıra | Türkiye Trendleri \- Sanatçı & Parça |  
| :--- | :---------------------------------------- | :--- | :---------------------------------- |  
| 1    | \[Sanatçı\] \- \[Parça Adı\]                   | 1    | \[Sanatçı\] \- \[Parça Adı\]             |  
| 2    | \[Sanatçı\] \- \[Parça Adı\]                   | 2    | \[Sanatçı\] \- \[Parça Adı\]             |  
...  
| 25   | \[Sanatçı\] \- \[Parça Adı\]                   | 25   | \[Sanatçı\] \- \[Parça Adı\]             |

\---

\# RUNTIME INSTRUCTION  
Araçlarını (Web Search / API Tools) çalıştır, güncel kaynakları tara ve iki sütunlu tabloyu eksiksiz oluştur.

### **3\. Alternatif: JSON Schema Çıktısı (Frontend Entegrasyonu İçin)**

Eğer bu kurguyu bir web arayüzünde (örneğin React / Tailwind ile çift sütunlu bir dashboard) görselleştirecekseniz, prompt'un sonundaki çıktı kuralını **JSON** formatına zorlayabilirsiniz:

&nbsp;

&nbsp;

&nbsp;

JSON

{  
&nbsp;&nbsp;"last\_updated": "YYYY-MM-DD",  
&nbsp;&nbsp;"global\_trends": \[  
&nbsp;&nbsp;&nbsp;&nbsp;{"rank": 1, "artist": "...", "track": "...", "source": "Spotify Global / Billboard"}  
&nbsp;&nbsp;\],  
&nbsp;&nbsp;"turkey\_trends": \[  
&nbsp;&nbsp;&nbsp;&nbsp;{"rank": 1, "artist": "...", "track": "...", "source": "Spotify TR / YouTube TR"}  
&nbsp;&nbsp;\]  
}

Bu yapıyı Python (CrewAI / LangGraph) tarafında bir script olarak mı çalıştırmayı planlıyorsunuz, yoksa web tabanlı bir dashboard arayüzüne mi bağlayacaksınız?