import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

async function testModel(modelName) {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ text: "Hello, testing API" }]
    });
    console.log(`[SUCCESS] ${modelName}:`, response.text.substring(0, 50));
  } catch (err) {
    console.log(`[ERROR] ${modelName}:`, err.message);
  }
}

async function run() {
  await testModel('gemini-2.0-flash');
  await testModel('gemini-1.5-flash');
}
run();
