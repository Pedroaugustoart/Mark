import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Particles from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import * as pdfjsLib from 'pdfjs-dist';
import { processFileForRAG, searchRelevantChunks, deleteFileChunks } from './rag';
import './index.css';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

// Spotify config - fill in your credentials
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const SPOTIFY_REDIRECT_URI = window.location.origin + '/';
const SPOTIFY_SCOPES = 'user-read-currently-playing user-read-playback-state';

const getSystemPrompt = (driveLink) => `
Você é o MARK, o "AI MARKETING ARCHITECT", uma IA operando em um HUD de análise global.
Você está conectado (simuladamente) às redes sociais da Prieto & Prieto Odontologia (YouTube, TikTok e Instagram). 
O link da nuvem/Drive com os vídeos editados da campanha atual é: "${driveLink || 'NENHUM LINK DEFINIDO'}".

[CONTEXTO DA MARCA - PRIETO & PRIETO ODONTOLOGIA]
- Localização: Campo Grande - MS (Bairro nobre). Clínica high-end de excelência (desde 1984).
- Liderança: Dr. Marcos Gabriel L. Prieto, autoridade em Ortodontia Lingual no Brasil.
- Diferenciais: Pioneirismo em Ortodontia Lingual (100% invisível), Tecnologia Exclusiva, One-Stop Clinic, Fluxo 100% digital.
- Públicos: Executivos classe A/B+ (discrição), Famílias, Reabilitação estética (B2C), e Dentistas para cursos (B2B).
- Tom de Voz: Sofisticado, científico, ético, moderno. Respeito rigoroso ao CFO/CRO. Sem apelo a preço.

Sua tarefa é fornecer relatórios diários, planejar campanhas e analisar dados de mercado cruzando com os PDFs salvos.
Responda sempre com tom robótico, altamente técnico, analítico e objetivo.

REGRA ABSOLUTA: NUNCA use emojis em suas respostas. Jamais. Nenhum caractere emoji é permitido.

REGRA DE METAS: Sempre que você criar um roteiro de vídeo, Reels ou Story, você DEVE incluir no final da sua mensagem a tag oculta [TASK: Nome do Roteiro] para que o sistema cadastre automaticamente como uma meta diária para gravação. Exemplo: [TASK: Reels sobre Clareamento Dental]
`;

const DB_NAME = 'MarkDB';
const STORE_NAME = 'pdfs';

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
  });
};

const savePdfToDB = async (pdf) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(pdf);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const getPdfsFromDB = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const deletePdfFromDB = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Spotify helpers
function getSpotifyAuthUrl() {
  if (!SPOTIFY_CLIENT_ID) return null;
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'token',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: SPOTIFY_SCOPES,
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function SpotifyWidget() {
  const [track, setTrack] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('spotify_token') || '');
  const [status, setStatus] = useState('DISCONNECTED');
  const [tokenInput, setTokenInput] = useState('');
  const [showInput, setShowInput] = useState(false);

  const fetchNowPlaying = useCallback(async (t) => {
    const activeToken = t || token;
    if (!activeToken) return;
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.status === 401) {
        setToken('');
        localStorage.removeItem('spotify_token');
        setStatus('TOKEN_EXPIRED');
        setTrack(null);
        return;
      }
      if (res.status === 204) {
        setStatus('IDLE');
        setTrack(null);
        return;
      }
      const data = await res.json();
      if (data && data.item) {
        setTrack({
          name: data.item.name,
          artist: data.item.artists.map(a => a.name).join(', '),
          art: data.item.album.images[2]?.url || data.item.album.images[0]?.url,
          progress: data.progress_ms,
          duration: data.item.duration_ms,
          isPlaying: data.is_playing,
        });
        setStatus('STREAMING');
      }
    } catch {
      setStatus('ERROR');
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchNowPlaying(token);
    const interval = setInterval(() => fetchNowPlaying(token), 5000);
    return () => clearInterval(interval);
  }, [token]);

  const handleSaveToken = () => {
    if (!tokenInput.trim()) return;
    const t = tokenInput.trim();
    localStorage.setItem('spotify_token', t);
    setToken(t);
    setTokenInput('');
    setShowInput(false);
    fetchNowPlaying(t);
  };

  const progressPct = track ? (track.progress / track.duration) * 100 : 0;

  return (
    <div className="glass-panel-ui spotify-widget" style={{borderColor: token ? '#1DB954' : 'var(--hud-cyan)', boxShadow: token ? '0 0 15px rgba(29,185,84,0.4), inset 0 0 20px rgba(29,185,84,0.1)' : undefined}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
        <span style={{fontSize: '0.6rem', color: '#1DB954', letterSpacing: '2px'}}>&gt; AUDIO_STREAM / {status}</span>
        <button
          onClick={() => { setShowInput(s => !s); setToken(''); localStorage.removeItem('spotify_token'); }}
          style={{background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.6rem', letterSpacing: '1px', fontFamily: 'var(--font-main)'}}>
          {token ? '[RESET]' : '[SET_TOKEN]'}
        </button>
      </div>

      {!token && (
        <div>
          <div style={{color: '#888', fontSize: '0.65rem', marginBottom: '8px'}}>
            Cole o token do Spotify Developer Console:
          </div>
          <div style={{display: 'flex', gap: '5px'}}>
            <input
              type="text"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              placeholder="BQA..."
              className="hud-input-floating"
              style={{flex: 1, fontSize: '0.6rem'}}
              onKeyDown={e => e.key === 'Enter' && handleSaveToken()}
            />
            <button onClick={handleSaveToken} className="hud-btn-floating" style={{fontSize: '0.6rem', padding: '5px 8px'}}>LINK</button>
          </div>
          <div style={{marginTop: '6px', fontSize: '0.55rem', color: '#555', lineHeight: '1.5'}}>
            Acesse developer.spotify.com &gt; Web API &gt; gere um token com "user-read-currently-playing"
          </div>
        </div>
      )}

      {token && track && (
        <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
          {track.art && (
            <img src={track.art} alt="album" style={{width: '45px', height: '45px', borderRadius: '4px', border: '1px solid #1DB954', boxShadow: '0 0 8px #1DB954', flexShrink: 0}} />
          )}
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{color: '#fff', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '1px'}}>{track.name}</div>
            <div style={{color: '#888', fontSize: '0.65rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{track.artist}</div>
            <div style={{marginTop: '6px', height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px'}}>
              <div style={{height: '100%', width: `${progressPct}%`, background: '#1DB954', boxShadow: '0 0 5px #1DB954', borderRadius: '1px', transition: 'width 1s linear'}} />
            </div>
          </div>
          <div style={{width: '10px', height: '10px', borderRadius: '50%', background: track.isPlaying ? '#1DB954' : '#555', boxShadow: track.isPlaying ? '0 0 8px #1DB954' : 'none', flexShrink: 0, animation: track.isPlaying ? 'blink 2s infinite' : 'none'}} />
        </div>
      )}

      {token && !track && status !== 'TOKEN_EXPIRED' && (
        <div style={{color: '#888', fontSize: '0.7rem'}}>NO_TRACK_DETECTED — Play something on Spotify</div>
      )}

      {status === 'TOKEN_EXPIRED' && (
        <div style={{color: '#f00', fontSize: '0.65rem'}}>TOKEN_EXPIRED — Gere um novo token no Developer Console</div>
      )}
    </div>
  );
}

function GlobalClock() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hrs = time.getHours().toString().padStart(2, '0');
  const mins = time.getMinutes().toString().padStart(2, '0');
  const secs = time.getSeconds().toString().padStart(2, '0');
  
  const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  const month = monthNames[time.getMonth()];
  const date = time.getDate().toString().padStart(2, '0');
  const dayName = dayNames[time.getDay()];

  return (
    <div className="date-circle-container glass-panel-ui">
      <div className="time-display">{hrs}:{mins}:{secs}</div>
      <div className="day-display">{dayName}</div>
      <div className="large-circle">
        <div className="large-circle-inner">
          <div className="month-text">{month}</div>
          <div className="date-text">{date}</div>
        </div>
      </div>
      <div className="storage-info">
        <div className="storage-row">
          <span style={{color: '#888'}}>Full Capacity:</span> <span style={{color: '#fff'}}>133 G</span>
        </div>
        <div className="storage-row" style={{color: 'var(--hud-cyan-dim)'}}>
          <span style={{letterSpacing: '1px'}}>PRIMARY STORAGE &gt;</span>
        </div>
        <div className="storage-row">
          <span style={{color: '#888'}}>Free Capacity:</span> <span style={{color: '#fff'}}>61 G</span>
        </div>
      </div>
      <div className="power-circle">
        <div style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#fff'}}>100%</div>
        <div style={{fontSize: '0.6rem'}}>Power</div>
        <div style={{fontSize: '0.5rem', color: '#888'}}>High</div>
      </div>
    </div>
  );
}

// Knowledge widget overlay positioned near the reactor
function KnowledgeCore({ pdfFiles, fileInputRef, setShowPdfModal }) {
  return (
    <div className="knowledge-core-widget glass-panel-ui">
      <div style={{fontSize: '0.6rem', color: 'var(--hud-cyan)', letterSpacing: '2px', marginBottom: '10px'}}>
        &gt; KNOWLEDGE_BASE / {pdfFiles.length} FILES
      </div>
      <div className="pdf-list">
        {pdfFiles.map((pdf, i) => (
          <div key={i} className="pdf-item">
            <span>{pdf.name.substring(0, 18)}</span>
            <div className="pdf-dot"></div>
            <div className="pdf-line-central"></div>
          </div>
        ))}
        <div className="pdf-item" style={{cursor: 'pointer', color: '#fff'}} onClick={() => fileInputRef.current.click()}>
          <span>+ ADD_KNOWLEDGE</span>
          <div className="pdf-dot" style={{background: '#fff'}}></div>
          <div className="pdf-line-central" style={{background: 'rgba(255,255,255,0.3)'}}></div>
        </div>
        <div className="pdf-item" style={{cursor: 'pointer', color: 'var(--hud-cyan-dim)', marginTop: '5px'}} onClick={() => setShowPdfModal(true)}>
          <span>&gt; MANAGE_KNOWLEDGE</span>
          <div className="pdf-dot" style={{background: 'var(--hud-cyan-dim)'}}></div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [driveLink, setDriveLink] = useState('');
  const [tasks, setTasks] = useState([]);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isProcessingRAG, setIsProcessingRAG] = useState(false);
  const [ragProgress, setRagProgress] = useState({ current: 0, total: 0 });
  const [isListening, setIsListening] = useState(false);
  const [chatAttachment, setChatAttachment] = useState(null); // {type, data, mimeType, name}
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatFileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const particlesOptions = {
    background: { color: { value: "transparent" } },
    fpsLimit: 60,
    interactivity: {
      events: { onHover: { enable: true, mode: "grab" } },
      modes: { grab: { distance: 150, links: { opacity: 0.5 } } }
    },
    particles: {
      color: { value: "#00e5ff" },
      links: { color: "#00e5ff", distance: 150, enable: true, opacity: 0.25, width: 1 },
      move: { direction: "none", enable: true, outModes: { default: "bounce" }, random: false, speed: 0.8, straight: false },
      number: { density: { enable: true, width: 800 }, value: 90 },
      opacity: { value: 0.4 },
      shape: { type: "circle" },
      size: { value: { min: 1, max: 2.5 } },
    },
    detectRetina: true,
  };

  useEffect(() => {
    const savedMessages = localStorage.getItem('mark_messages');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    } else {
      setMessages([{ role: 'ai', content: 'SYSTEM ONLINE. AWAITING MARKETING COMMANDS.' }]);
    }
    const savedLink = localStorage.getItem('mark_drive_link');
    if (savedLink) setDriveLink(savedLink);
    const savedTasks = localStorage.getItem('mark_tasks');
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    
    getPdfsFromDB().then(files => { if (files && files.length > 0) setPdfFiles(files); }).catch(console.error);
    
    const today = new Date().toLocaleDateString();
    const lastBriefing = localStorage.getItem('mark_last_briefing');
    if (lastBriefing !== today) {
      localStorage.setItem('mark_last_briefing', today);
      generateDailyBriefing();
    }
  }, []);

  const generateDailyBriefing = async () => {
    setIsTyping(true);
    const prompt = `ATENCAO: Este e um gatilho automatico de inicializacao do sistema (Morning Briefing).
Como MARK (Arquiteto de Marketing IA), de o seu relatorio matinal corporativo para a diretoria da Prieto & Prieto Odontologia.
Use formatacao Markdown. Sem emojis. Estilo robotico e tecnico.
1. Informe que os sistemas estao online e sincronizados.
2. Apresente 2 tendencias de marketing atuais para clinicas odontologicas high-ticket.
3. De 1 ideia de conteudo de impacto (Reels ou Stories) focada nas personas da clinica.
4. Termine perguntando quais sao as diretrizes para a campanha de hoje.`;

    try {
      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
          });
          break;
        } catch (err) {
          if (err.message.includes('503') && retries > 1) {
            retries--;
            await new Promise(r => setTimeout(r, 3000));
          } else { throw err; }
        }
      }
      
      setMessages(prev => {
        const newMsgs = [...prev, { role: 'system', content: '[ SYSTEM_BOOT ]: INICIANDO VARREDURA DE TENDENCIAS DE MERCADO...' }, { role: 'ai', content: response.text }];
        localStorage.setItem('mark_messages', JSON.stringify(newMsgs));
        return newMsgs;
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('mark_messages', JSON.stringify(messages));
    }
    localStorage.setItem('mark_tasks', JSON.stringify(tasks));
    scrollToBottom();
  }, [messages, tasks, isTyping]);

  useEffect(() => {
    if (driveLink) localStorage.setItem('mark_drive_link', driveLink);
  }, [driveLink]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const extractTextFromPDF = async (arrayBuffer) => {
    const pdf = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + ' \n';
    }
    return fullText;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessingRAG(true);
    setRagProgress({ current: 0, total: 0 });
    
    try {
      const newPdf = { id: Date.now().toString(), name: file.name, mimeType: file.type };
      
      let textToProcess = '';
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        setMessages(prev => [...prev, { role: 'system', content: `[SYSTEM]: Extracting text from PDF...` }]);
        textToProcess = await extractTextFromPDF(arrayBuffer);
      } else {
        textToProcess = await file.text();
      }

      setMessages(prev => [...prev, { role: 'system', content: `[SYSTEM]: Generating semantic embeddings...` }]);
      
      await processFileForRAG(newPdf.id, textToProcess, ai, (current, total) => {
        setRagProgress({ current, total });
      });

      await savePdfToDB(newPdf);
      setPdfFiles(prev => [...prev, newPdf]);
      setMessages(prev => [...prev, { role: 'system', content: `[OK]: "${newPdf.name}" INDEXED INTO VECTOR DATABASE.` }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'system', content: `[ERROR]: ${error.message}` }]);
    } finally {
      setIsProcessingRAG(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleChatFileAttach = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(',')[1];
      setChatAttachment({ type: file.type.startsWith('image/') ? 'image' : 'document', data: base64, mimeType: file.type, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePdf = async (id) => {
    await deletePdfFromDB(id);
    await deleteFileChunks(id);
    setPdfFiles(prev => prev.filter(p => p.id !== id));
  };

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Voice input
  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() && !chatAttachment) return;

    const userText = input.trim();
    const attachment = chatAttachment;
    setMessages(prev => [...prev, { role: 'user', content: userText || `[FILE: ${attachment?.name}]`, attachment }]);
    setInput('');
    setChatAttachment(null);
    setIsTyping(true);

    try {
      const history = messages.filter(m => m.role !== 'system').map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n');
      
      let contextText = '';
      if (pdfFiles.length > 0 && userText) {
        setMessages(prev => [...prev, { role: 'system', content: '[ SYSTEM ]: VECTOR SEARCH ON DATABASE...' }]);
        const relevantChunks = await searchRelevantChunks(userText, ai, 5);
        if (relevantChunks.length > 0) {
          contextText = "\n\n[DADOS DO BANCO VETORIAL (RAG)]:\n" + relevantChunks.map(c => `[Contexto (${(c.score * 100).toFixed(1)}%)]:\n${c.text}`).join('\n\n');
        }
      }

      const textPart = { text: `${getSystemPrompt(driveLink)}${contextText}\n\nHistorico:\n${history}\n\n[USER]: ${userText || '[FILE ATTACHED]'}\n[MARK]:` };
      const parts = [textPart];
      
      if (attachment) {
        parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
      }

      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [{ role: 'user', parts }],
          });
          break;
        } catch (err) {
          if (err.message.includes('503') && retries > 1) {
            retries--;
            await new Promise(r => setTimeout(r, 3000));
          } else { throw err; }
        }
      }

      let aiText = response.text;
      // Strip emojis from output
      aiText = aiText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
      
      const taskRegex = /\[TASK:\s*(.+?)\]/g;
      let match;
      const newTasks = [];
      while ((match = taskRegex.exec(aiText)) !== null) {
        newTasks.push({ id: Date.now().toString() + Math.random(), name: match[1].trim(), completed: false });
      }
      aiText = aiText.replace(taskRegex, '').trim();

      if (newTasks.length > 0) {
        setTasks(prev => [...prev, ...newTasks]);
      }

      setMessages(prev => [...prev, { role: 'ai', content: aiText }]);
    } catch (error) {
      let errorMsg = error.message;
      if (errorMsg.includes('503')) errorMsg = "Servidores em alta demanda (503). Tente novamente.";
      else if (errorMsg.includes('429')) errorMsg = "Cota da API excedida.";
      setMessages(prev => [...prev, { role: 'ai', content: `[ FALHA ]: ${errorMsg}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Enter = newline, Shift+Enter = send
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setInput(prev => prev + '\n');
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="hud-container">
      <div className="hud-bg-texture"></div>

      {showPdfModal && (
        <div className="cyber-modal-overlay">
          <div className="cyber-modal">
            <div className="cyber-modal-header">
              <h2>&gt; KNOWLEDGE_BASE_ARCHIVE</h2>
              <button onClick={() => setShowPdfModal(false)} className="cyber-modal-close">X</button>
            </div>
            <div className="cyber-modal-body">
              {pdfFiles.length === 0 ? (
                <div style={{color: '#888', textAlign: 'center'}}>DATABASE EMPTY.</div>
              ) : (
                <ul className="pdf-manage-list">
                  {pdfFiles.map((pdf) => (
                    <li key={pdf.id}>
                      <span className="pdf-name">{pdf.name}</span>
                      <button onClick={() => handleDeletePdf(pdf.id)} className="pdf-del-btn">PURGE</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="cyber-modal-overlay">
          <div className="cyber-modal" style={{width: '800px', height: '80vh'}}>
            <div className="cyber-modal-header">
              <h2>&gt; SYSTEM_LOGS / REQUEST_HISTORY</h2>
              <button onClick={() => setShowHistoryModal(false)} className="cyber-modal-close">X</button>
            </div>
            <div className="cyber-modal-body" style={{maxHeight: 'calc(80vh - 60px)'}}>
              {messages.length === 0 ? (
                <div style={{color: '#888', textAlign: 'center'}}>NO LOGS FOUND.</div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  {messages.map((msg, idx) => (
                    <div key={idx} style={{
                      padding: '15px',
                      borderLeft: `3px solid ${msg.role === 'user' ? '#fff' : msg.role === 'system' ? '#888' : 'var(--hud-cyan)'}`,
                      background: 'rgba(0,0,0,0.6)',
                    }}>
                      <div style={{color: msg.role === 'user' ? '#fff' : msg.role === 'system' ? '#888' : 'var(--hud-cyan)', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '10px', textTransform: 'uppercase'}}>
                        [{msg.role === 'user' ? 'USER_COMMAND' : msg.role === 'system' ? 'SYSTEM_ALERT' : 'MARK_RESPONSE'}]
                      </div>
                      {msg.role === 'ai' ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      ) : (
                        <div style={{color: msg.role === 'user' ? '#fff' : '#888', fontSize: '0.85rem', lineHeight: '1.6'}}>{msg.content}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`hud-layout ${isTyping || isProcessingRAG ? "reactor-active" : ""}`}>
        <Particles id="tsparticles" options={particlesOptions} init={async (engine) => { await loadSlim(engine); }} />

        {/* LEFT COLUMN */}
        <div className="hud-col-side left-panel">
          
          <GlobalClock />

          <div className="drive-sync-widget glass-panel-ui" style={{marginBottom: '20px'}}>
            <div className="widget-row" style={{marginBottom: '15px'}}>
              <div className="widget-ring" style={{width: '50px', height: '50px'}}>
                <span className="widget-ring-text">CLOUD</span>
              </div>
              <div className="widget-content">
                <span style={{color: '#fff', fontSize: '0.8rem', letterSpacing: '1px'}}>MEDIA ASSETS</span>
                <span style={{color: 'var(--hud-cyan-dim)', fontSize: '0.65rem'}}>G-DRIVE SYNC</span>
              </div>
            </div>
            <input
              type="text"
              className="hud-input-floating"
              placeholder="[ INSERIR URL DO DRIVE AQUI ]"
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              style={{width: '100%', marginBottom: '5px'}}
            />
            {driveLink && (
              <div style={{marginTop: '5px', fontSize: '0.65rem', color: 'var(--color-good)', letterSpacing: '1px'}}>
                STATUS: ENCRYPTED LINK SYNCED
              </div>
            )}
          </div>

          <div className="cyber-line-vertical" style={{height: '50px', marginLeft: '50px'}}></div>

          <div className="glass-panel-ui" style={{cursor: 'pointer', marginBottom: '20px'}} onClick={() => setShowHistoryModal(true)}>
            <div className="widget-row">
              <div className="widget-ring" style={{borderColor: '#fff', boxShadow: '0 0 15px #fff, inset 0 0 10px #fff'}}>
                <span className="widget-ring-text" style={{color: '#fff'}}>LOGS</span>
              </div>
              <div className="widget-content">
                <span style={{color: '#fff', fontSize: '0.9rem', letterSpacing: '1px'}}>REQUEST HISTORY</span>
                <span style={{color: 'var(--hud-cyan-dim)', fontSize: '0.75rem'}}>
                  {messages.filter(m => m.role === 'user').length} COMMANDS ISSUED
                </span>
              </div>
            </div>
          </div>

          <div className="cyber-line-vertical" style={{height: '50px', marginLeft: '50px'}}></div>

          <div className="goals-widget glass-panel-ui" style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
            <div className="widget-row">
              <div className="widget-ring">
                <span className="widget-ring-text">GOALS</span>
              </div>
              <div className="widget-content">
                <span style={{color: '#fff', fontSize: '0.9rem', letterSpacing: '1px'}}>TODAY'S CAMPAIGN</span>
                <span style={{color: 'var(--hud-cyan-dim)', fontSize: '0.75rem'}}>
                  {tasks.filter(t => t.completed).length} / {tasks.length} COMPLETED
                </span>
              </div>
            </div>
            
            <div className="tasks-list-container" style={{paddingLeft: '5px'}}>
              {tasks.length === 0 ? (
                <div style={{color: '#888', fontSize: '0.7rem', paddingLeft: '20px'}}>NO PENDING SCRIPTS</div>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className="task-item">
                    <button className={`task-checkbox ${task.completed ? 'checked' : ''}`} onClick={() => toggleTask(task.id)}>
                      {task.completed ? '✓' : ''}
                    </button>
                    <span className={`task-name ${task.completed ? 'done' : ''}`}>{task.name}</span>
                    <button className="task-delete" onClick={() => deleteTask(task.id)}>X</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div className="hud-col-center">
          <div className="giant-reactor">
            <div className="giant-ring ring-1"></div>
            <div className="giant-ring ring-2"></div>
            <div className="giant-ring ring-3"></div>
            <div className="giant-ring ring-4"></div>
            <div className="giant-ring ring-5"></div>
            
            <div className="orbit-container">
              <div className="orbit-text orbit-1">LEADS_SYNC</div>
              <div className="orbit-text orbit-2">FUNNEL_OPT</div>
              <div className="orbit-text orbit-3">ROAS_MONITOR</div>
              <div className="orbit-text orbit-4">ADS_ENGINE</div>
            </div>

            <div className={`ring-core-glow ${isTyping || isProcessingRAG ? 'thinking' : ''}`}></div>
            <div className="matrix-code-container">
              <div className="matrix-code-content">
                {Array.from({length: 20}).map((_, i) => (
                  <span key={i}>0x{(Math.random()*100000).toString(16).substring(0,4)} INIT SYS<br/>SYS.CALL.{Math.floor(Math.random()*999)}<br/></span>
                ))}
              </div>
            </div>

            {/* KNOWLEDGE CONNECTED TO REACTOR */}
            <KnowledgeCore pdfFiles={pdfFiles} fileInputRef={fileInputRef} setShowPdfModal={setShowPdfModal} />
            <input type="file" accept=".pdf,.md,.txt" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileUpload} />
          </div>

          <div className="chat-container-floating">
            <div className="chat-history-transparent">
              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-msg ${msg.role}`} style={msg.role === 'system' ? {color: '#666', fontSize: '0.7rem'} : {}}>
                  {msg.role === 'user' ? (
                    <div>
                      <span style={{color: '#888'}}>[USER]: </span>{msg.content}
                      {msg.attachment && (
                        <div style={{marginTop: '5px', fontSize: '0.65rem', color: 'var(--hud-cyan-dim)'}}>
                          [ATTACHMENT: {msg.attachment.name}]
                          {msg.attachment.type === 'image' && (
                            <img src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} alt="" style={{display:'block', maxWidth:'100px', maxHeight:'80px', marginTop:'4px', border:'1px solid var(--hud-cyan-dim)', borderRadius:'4px'}} />
                          )}
                        </div>
                      )}
                    </div>
                  ) : msg.role === 'ai' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  ) : msg.content}
                </div>
              ))}
              {isProcessingRAG && (
                <div className="chat-msg system" style={{color: 'var(--hud-cyan)', fontSize: '0.7rem'}}>
                  [ VECTORIZER ]: GENERATING EMBEDDINGS... {ragProgress.current} / {ragProgress.total} CHUNKS
                </div>
              )}
              {isTyping && !isProcessingRAG && <div className="chat-msg ai" style={{animation: 'blink 1s infinite'}}>_ PROCESSANDO...</div>}
              <div ref={messagesEndRef} />
            </div>
            
            {chatAttachment && (
              <div style={{padding: '5px 10px', fontSize: '0.65rem', color: 'var(--hud-cyan)', background: 'rgba(0,229,255,0.05)', borderTop: '1px solid rgba(0,229,255,0.2)', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <span>[ATTACHED: {chatAttachment.name}]</span>
                <button onClick={() => setChatAttachment(null)} style={{background: 'none', border: 'none', color: '#f00', cursor: 'pointer', fontSize: '0.7rem'}}>REMOVE</button>
              </div>
            )}

            <form onSubmit={handleSend} className="chat-input-wrapper">
              <button type="button" className="hud-btn-icon" onClick={() => chatFileInputRef.current?.click()} title="Attach file">
                [+]
              </button>
              <input type="file" accept="image/*,.pdf,.txt,.md" style={{display:'none'}} ref={chatFileInputRef} onChange={handleChatFileAttach} />
              <textarea
                className="hud-input-floating hud-textarea"
                placeholder="[ INSIRA O COMANDO ] Enter=nova linha | Shift+Enter=enviar"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
                rows={1}
              />
              <button type="button" className={`hud-btn-icon ${isListening ? 'listening' : ''}`} onClick={toggleVoice} title="Voice command">
                {isListening ? '[ON]' : '[MIC]'}
              </button>
              <button type="submit" className="hud-btn-floating" disabled={(!input.trim() && !chatAttachment) || isTyping}>
                ENGAGE
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="hud-col-side right-panel" style={{alignItems: 'flex-end'}}>
          
          <SpotifyWidget />

          <div style={{marginTop: '30px', textAlign: 'right', fontSize: '0.8rem', lineHeight: '1.8'}}>
            <div><span className="pdf-dot" style={{display: 'inline-block', marginRight: '10px'}}></span> <span style={{color: '#fff'}}>YOUTUBE</span> <span style={{color: '#888'}}>SYNCED</span></div>
            <div><span className="pdf-dot" style={{display: 'inline-block', marginRight: '10px'}}></span> <span style={{color: '#fff'}}>TIKTOK</span> <span style={{color: '#888'}}>SYNCED</span></div>
            <div><span className="pdf-dot" style={{display: 'inline-block', marginRight: '10px'}}></span> <span style={{color: '#fff'}}>INSTAGRAM</span> <span style={{color: '#888'}}>SYNCED</span></div>
            <div style={{color: 'var(--hud-cyan-dim)', marginTop: '10px', textTransform: 'lowercase', letterSpacing: '1px'}}>mark's system</div>
          </div>

          <div style={{marginTop: '40px', textAlign: 'right', fontSize: '0.8rem'}}>
            <div style={{color: 'var(--hud-cyan-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px'}}>
              &gt; BEST_POSTING_TIMES
            </div>
            <div style={{color: '#fff', lineHeight: '1.6'}}>
              SEG, TER, QUA <br />
              <span style={{color: 'var(--hud-cyan)'}}>18:00 - 21:00</span>
            </div>
          </div>

          <div style={{flexGrow: 1}}></div>

          <div className="atmosphere-container">
            <div className="atmosphere-label">
              <div style={{color: '#888', textTransform: 'lowercase'}}>market heat</div>
              <div style={{color: 'var(--hud-cyan-dim)', fontSize: '0.7rem'}}>Sentiment Analysis</div>
            </div>
            <div className="atmosphere-circle">
              94<span style={{fontSize: '1rem', verticalAlign: 'top', marginTop: '10px'}}>%</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default App;
