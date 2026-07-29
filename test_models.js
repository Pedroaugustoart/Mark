const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({apiKey: process.env.VITE_GEMINI_API_KEY});
async function list() {
  const models = await ai.models.list();
  for (const m of models) {
    console.log(m.name);
  }
}
list();
