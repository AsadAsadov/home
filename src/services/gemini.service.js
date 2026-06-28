const { GoogleGenAI } = require('@google/genai');

const FALLBACK_REPLY = 'Hazırda AI cavabı hazırlaya bilmirəm. İstəsəniz sizi əməkdaşımıza yönləndirə bilərəm.';
let client;
function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}
async function generateBestHomeReply({ message, contextText }) {
  const ai = getClient();
  if (!ai) return FALLBACK_REPLY;
  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `İstifadəçi mesajı: ${message}\n\nBestHome konteksti:\n${contextText || 'Uyğun təsdiqlənmiş məlumat tapılmadı.'}` }] }],
      config: {
        systemInstruction: ['You are BestHome.az AI assistant.', 'Language: Azerbaijani.', 'Tone: friendly, concise, professional.', 'You help users find real estate listings/projects.', 'Use ONLY provided database context.', 'If no matching info, say you cannot confirm and offer WhatsApp/human support.', 'Never invent prices, availability, credit terms, phone numbers, project facts.', 'Ask one short clarifying question if the user request is vague.', 'If user asks to contact human, clearly offer handoff to a human support colleague.', 'Do not mention internal database or Gemini.'].join('\n'),
        temperature: 0.3,
        maxOutputTokens: 420
      }
    });
    return response?.text || response?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join(' ').trim() || FALLBACK_REPLY;
  } catch (error) {
    console.error('[gemini] reply generation failed:', error.message);
    return FALLBACK_REPLY;
  }
}
module.exports = { generateBestHomeReply, FALLBACK_REPLY };
