# Aurevon Dev WhatsApp Bot

Tek bir bot içinde birleştirilmiş 6 akış:
1. Karşılama menüsü
2. Satış sorgusu (mobil/AI/web yönlendirme)
3. Aurevon AI Asistanı (Gemini bağlı, serbest soru-cevap)
4. Teklif oluşturma (adım adım soru-cevap + tahmini fiyat)
5. SSS
6. Ana menüye her an "menu" yazarak dönüş

## 1) Yerelde Test (opsiyonel)

```bash
npm install
cp .env.example .env
# .env dosyasını gerçek bilgilerinizle doldurun
npm start
```

## 2) Render'a Deploy

1. Bu klasörü bir GitHub reposuna yükleyin (private repo olabilir).
2. [render.com](https://render.com) → "New +" → "Web Service"
3. GitHub reponuzu bağlayın.
4. Ayarlar:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. "Environment Variables" bölümüne `.env.example`'daki 5 değişkeni gerçek değerleriyle girin:
   - `WHATSAPP_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WEBHOOK_VERIFY_TOKEN` (kendi belirlediğiniz, örn: `aurevon2026`)
   - `GEMINI_API_KEY`
   - `PORT` (Render genelde otomatik atar, boş bırakabilirsiniz)
6. Deploy edin. Render size bir URL verecek, örn: `https://aurevon-bot.onrender.com`

## 3) Meta Webhook Bağlama

1. [developers.facebook.com](https://developers.facebook.com) → Uygulamanız → WhatsApp → Configuration
2. **Callback URL:** `https://aurevon-bot.onrender.com/webhook`
3. **Verify Token:** Render'da girdiğiniz `WEBHOOK_VERIFY_TOKEN` ile AYNI olmalı
4. "Verify and Save" tıklayın (yeşil onay alırsanız bağlantı başarılı)
5. "Webhook fields" altından **messages** kutusunu işaretleyip Subscribe edin

## 4) Gemini API Key Alma

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) adresine gidin
2. Google hesabınızla giriş yapın → "Create API Key"
3. Üretilen key'i `GEMINI_API_KEY` olarak girin (ücretsiz kotası var)

## 5) Test Etme

WhatsApp test numaranızdan (Meta panelinde verilen) kendi telefonunuzla mesaj atın.
İlk mesajda otomatik karşılama menüsü gelmeyebilir — botu tetiklemek için herhangi bir
mesaj (örn: "merhaba") gönderin, sistem `menu` state'inden başlayıp ana menüyü gösterecektir.

## Notlar

- Oturum bilgileri şu an RAM'de tutuluyor (`sessions` objesi). Render ücretsiz planında
  sunucu uykuya geçip yeniden başlarsa oturumlar sıfırlanır — bu normal bir kullanıcı
  deneyimi sorunu yaratmaz çünkü "menu" yazarak her zaman baştan başlanabilir.
- Gerçek kalıcı veri/teklif kaydı istiyorsanız (örn. tüm teklifleri bir tabloya kaydetmek),
  basit bir Google Sheets entegrasyonu veya küçük bir veritabanı (Supabase, MongoDB Atlas
  ücretsiz tier) eklenebilir — isterseniz bu adımı da ekleyebilirim.
- Fiyat tahmin mantığı (`estimatePrice` fonksiyonu) şu an basit bir örnek; gerçek
  fiyatlandırma politikanıza göre güncellenmeli.
