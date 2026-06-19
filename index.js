require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// ---------- AYARLAR ----------
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

const WA_API_URL = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;

// Kullanici oturum durumlari (RAM icinde; production'da Redis/DB onerilir)
// state: 'menu' | 'sales' | 'ai' | 'quote_type' | 'quote_platform' | 'quote_budget' | 'quote_timeline'
const sessions = {};

function getSession(userId) {
  if (!sessions[userId]) {
    sessions[userId] = { state: 'menu', quote: {} };
  }
  return sessions[userId];
}

// ---------- WHATSAPP MESAJ GONDERME ----------
async function sendMessage(to, text) {
  try {
    await axios.post(
      WA_API_URL,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      },
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
  } catch (err) {
    console.error('Mesaj gonderim hatasi:', err.response?.data || err.message);
  }
}

// ---------- GEMINI AI CAGRISI ----------
async function askGemini(userText) {
  const systemPrompt = `Sen Aurevon AI'sin, Aurevon Dev adli bir yazilim ve yapay zeka sirketinin WhatsApp asistanisin.
Aurevon Dev; mobil uygulama gelistirme, web sitesi gelistirme ve yapay zeka cozumleri sunan bir teknoloji sirketidir.
Gorevin: Kod sorularini cevaplamak, yazilim/teknoloji tavsiyesi vermek, ve musterileri uygun hizmete yonlendirmek.
Kisa, net ve samimi Turkce cevaplar ver (WhatsApp icin uygun, 3-4 cumleyi gecme).
Eger musteri net bir teklif/fiyat istiyorsa, "Fiyat Teklifi Al" secenegini kullanmasini soyle.`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: userText }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
      }
    );
    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply || 'Üzgünüm, şu an cevap veremiyorum. Lütfen tekrar deneyin.';
  } catch (err) {
    console.error('Gemini hatasi:', err.response?.data || err.message);
    return 'Şu an yapay zeka servisine ulaşamıyorum, birazdan tekrar deneyin 🙏';
  }
}

// ---------- ANA MENU ----------
const MAIN_MENU = `Merhaba 👋 Aurevon Dev'e hoş geldiniz.

1️⃣ Mobil Uygulama Geliştirme
2️⃣ Yapay Zeka Çözümleri
3️⃣ Web Sitesi Geliştirme
4️⃣ Fiyat Teklifi Al
5️⃣ Aurevon AI ile Konuş (Soru-Cevap)
6️⃣ Sık Sorulan Sorular

Lütfen bir numara seçin.`;

const FAQ_TEXT = `📋 Sık Sorulan Sorular

💰 *Fiyatlar*: Proje türüne göre değişir, "4" yazarak teklif alabilirsiniz.
📞 *İletişim*: Bu hat üzerinden 7/24 yazabilirsiniz, ekibimiz size dönüş yapar.
🛠️ *Hizmetler*: Mobil uygulama, web sitesi, yapay zeka sistemleri.
⭐ *Referanslar*: Tamamlanan projelerimizi görmek için ekibimizden örnek talep edebilirsiniz.

Ana menüye dönmek için "menu" yazın.`;

// ---------- MESAJ ISLEME MANTIGI ----------
async function handleIncomingMessage(userId, text) {
  const session = getSession(userId);
  const normalized = text.trim().toLowerCase();

  // Her zaman calisan kacis komutlari
  if (['menu', 'menü', 'geri', 'başla', 'basla'].includes(normalized)) {
    session.state = 'menu';
    return sendMessage(userId, MAIN_MENU);
  }

  switch (session.state) {
    case 'menu': {
      if (normalized === '1') {
        session.state = 'sales';
        session.quote.category = 'Mobil Uygulama';
        return sendMessage(
          userId,
          'Harika! 📱 Mobil uygulama projeniz için biraz bilgi alalım.\n\nNe tür bir uygulama düşünüyorsunuz? (örn: e-ticaret, sosyal medya, hizmet rezervasyon vb.)'
        );
      }
      if (normalized === '2') {
        session.state = 'sales';
        session.quote.category = 'Yapay Zeka Çözümü';
        return sendMessage(
          userId,
          'Süper! 🤖 Yapay zeka çözümünüz hakkında anlatır mısınız? (örn: chatbot, veri analizi, otomasyon vb.)'
        );
      }
      if (normalized === '3') {
        session.state = 'sales';
        session.quote.category = 'Web Sitesi';
        return sendMessage(
          userId,
          'Güzel! 🌐 Nasıl bir web sitesi istiyorsunuz? (örn: kurumsal, e-ticaret, blog vb.)'
        );
      }
      if (normalized === '4') {
        session.state = 'quote_type';
        session.quote = {};
        return sendMessage(
          userId,
          '📝 Teklif hazırlayalım.\n\nProje türü nedir?\n📱 Mobil Uygulama\n🌐 Web Sitesi\n🤖 Yapay Zeka Sistemi\n🎮 Oyun\n\nLütfen birini yazın.'
        );
      }
      if (normalized === '5') {
        session.state = 'ai';
        return sendMessage(
          userId,
          'Ben Aurevon AI 🤖\nYazılım, yapay zeka ve teknoloji konularında size yardımcı olabilirim. Sorunuzu yazabilirsiniz.\n\n(Ana menüye dönmek için "menu" yazın)'
        );
      }
      if (normalized === '6') {
        return sendMessage(userId, FAQ_TEXT);
      }
      // Menüde değilse ve serbest yazdıysa, niyetini anlamaya çalış
      return sendMessage(userId, MAIN_MENU);
    }

    case 'sales': {
      // Müşteri istediği projeyi anlattı, bilgiyi not edip yönlendir
      session.quote.detail = text;
      session.state = 'menu';
      return sendMessage(
        userId,
        `Teşekkürler! Talebinizi aldık:\n📌 ${session.quote.category}\n📝 "${text}"\n\nSize özel bir fiyat teklifi için "4" yazabilir, ya da Aurevon AI ile detayları konuşmak için "5" yazabilirsiniz.\n\nEkibimiz en kısa sürede sizinle iletişime geçecektir. 🙌`
      );
    }

    case 'ai': {
      const aiReply = await askGemini(text);
      return sendMessage(userId, aiReply);
    }

    case 'quote_type': {
      session.quote.type = text;
      session.state = 'quote_platform';
      return sendMessage(userId, 'Android, iOS, her ikisi mi, yoksa platform bağımsız mı? (Web/AI projeleri için "platform bağımsız" yazabilirsiniz)');
    }

    case 'quote_platform': {
      session.quote.platform = text;
      session.state = 'quote_budget';
      return sendMessage(userId, 'Tahmini bütçeniz nedir? (örn: 10.000-20.000 TL, veya "bilmiyorum" yazabilirsiniz)');
    }

    case 'quote_budget': {
      session.quote.budget = text;
      session.state = 'quote_timeline';
      return sendMessage(userId, 'Son olarak, teslim süresi beklentiniz nedir? (örn: 1 ay, 3 ay, esnek)');
    }

    case 'quote_timeline': {
      session.quote.timeline = text;
      session.state = 'menu';
      const q = session.quote;
      const estimate = estimatePrice(q);
      return sendMessage(
        userId,
        `✅ Teklif özeti hazır:\n\n📌 Proje türü: ${q.type}\n📱 Platform: ${q.platform}\n💰 Bütçe: ${q.budget}\n⏱️ Süre: ${q.timeline}\n\n💵 Tahmini proje bedeli: ${estimate}\n\n(Bu rakam ön tahmindir, kesin teklif için ekibimiz sizinle iletişime geçecektir.)\n\nAna menüye dönmek için "menu" yazabilirsiniz.`
      );
    }

    default: {
      session.state = 'menu';
      return sendMessage(userId, MAIN_MENU);
    }
  }
}

// Cok basit bir tahmini fiyat hesaplayici (gercek kullanimda kendi fiyatlandirma mantiginizla degistirin)
function estimatePrice(quote) {
  const type = (quote.type || '').toLowerCase();
  if (type.includes('oyun')) return '40.000 - 80.000 TL';
  if (type.includes('yapay zeka') || type.includes('ai')) return '30.000 - 60.000 TL';
  if (type.includes('mobil')) return '25.000 - 35.000 TL';
  if (type.includes('web')) return '15.000 - 25.000 TL';
  return '20.000 - 40.000 TL';
}

// ---------- WEBHOOK DOGRULAMA (Meta GET istegi) ----------
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook dogrulandi.');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ---------- WEBHOOK MESAJ ALMA (Meta POST istegi) ----------
app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (message && message.type === 'text') {
      const userId = message.from;
      const text = message.text.body;
      await handleIncomingMessage(userId, text);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook isleme hatasi:', err.message);
    res.sendStatus(200); // Meta'ya her zaman 200 donmek onemli, aksi halde tekrar dener
  }
});

// Saglik kontrolu
app.get('/', (req, res) => {
  res.send('Aurevon Dev WhatsApp Bot calisiyor ✅');
});

app.listen(PORT, () => {
  console.log(`Aurevon Bot ${PORT} portunda calisiyor`);
});
