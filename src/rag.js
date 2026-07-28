import { GoogleGenAI } from '@google/genai';

const DB_NAME = 'MarkRAG_DB';
const STORE_NAME = 'chunks';

export const initRAGDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('fileId', 'fileId', { unique: false });
      }
    };
  });
};

export const saveChunkToDB = async (chunk) => {
  const db = await initRAGDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(chunk);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteFileChunks = async (fileId) => {
  const db = await initRAGDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('fileId');
    const request = index.getAllKeys(fileId);
    request.onsuccess = () => {
      request.result.forEach(key => store.delete(key));
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

export const getAllChunks = async () => {
  const db = await initRAGDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const chunkText = (text, chunkSize = 1000, overlap = 200) => {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += (chunkSize - overlap);
  }
  return chunks;
};

export const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const processFileForRAG = async (fileId, text, aiClient, onProgress) => {
  const chunks = chunkText(text);
  const total = chunks.length;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    try {
      const response = await aiClient.models.embedContent({
        model: 'gemini-embedding-2',
        contents: chunkText,
      });
      const embedding = response.embeddings[0].values;
      await saveChunkToDB({
        id: `${fileId}_chunk_${i}`,
        fileId,
        text: chunkText,
        embedding
      });
      if (onProgress) onProgress(i + 1, total);
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100)); 
    } catch (err) {
      console.error('Error embedding chunk:', err);
    }
  }
};

export const searchRelevantChunks = async (query, aiClient, topK = 5) => {
  try {
    const response = await aiClient.models.embedContent({
      model: 'gemini-embedding-2',
      contents: query,
    });
    const queryEmbedding = response.embeddings[0].values;
    
    const allChunks = await getAllChunks();
    if (allChunks.length === 0) return [];
    
    const scoredChunks = allChunks.map(chunk => ({
      text: chunk.text,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, topK);
  } catch (err) {
    console.error('Search error:', err);
    return [];
  }
};
