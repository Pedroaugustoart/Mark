import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

async function run() {
  try {
    const response = await ai.models.list();
    // In @google/genai, ai.models.list() might not exist, but let's try fetch directly
  } catch (e) {
    console.error(e);
  }
}
run();
