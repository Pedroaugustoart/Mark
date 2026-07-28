import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

async function run() {
  try {
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: "Hello world",
    });
    console.log("Success! Embeddings length:", response.embeddings[0].values.length);
  } catch (err) {
    console.log("Error:", err.message);
  }
}
run();
