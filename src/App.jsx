import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './index.css';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const getSystemPrompt = (driveLink) => `
Você é o MARK, o "AI MARKETING ARCHITECT", uma IA operando em um HUD de análise global.
Você está conectado (simuladamente) às redes sociais do consultório: YouTube, TikTok e Instagram. 
O link da nuvem/Drive com os vídeos editados da campanha atual é: "${driveLink || 'NENHUM LINK DEFINIDO'}".
Sua tarefa é fornecer relatórios diários, planejar campanhas e analisar dados de mercado cruzando com os PDFs salvos.
Responda sempre com tom robótico, altamente técnico, analítico e objetivo.
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
    <div className="date-circle-container">
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

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [driveLink, setDriveLink] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem('mark_messages');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    } else {
      setMessages([{ role: 'ai', content: 'SYSTEM ONLINE. AWAITING MARKETING COMMANDS.' }]);
    }
    const savedLink = localStorage.getItem('mark_drive_link');
    if (savedLink) setDriveLink(savedLink);
    
    getPdfsFromDB().then(files => { if (files && files.length > 0) setPdfFiles(files); }).catch(console.error);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('mark_messages', JSON.stringify(messages));
    }
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result.split(',')[1];
      const newPdf = { id: Date.now().toString(), name: file.name, mimeType: file.type, data: base64Data };
      try {
        await savePdfToDB(newPdf);
        setPdfFiles(prev => [...prev, newPdf]);
        setMessages(prev => [...prev, { role: 'system', content: `[DATA INJECT]: ${file.name}` }]);
      } catch (err) {
        setMessages(prev => [...prev, { role: 'system', content: `[ERROR]: ${err.message}` }]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.filter(m => m.role !== 'system').map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n');
      const textPart = { text: `${getSystemPrompt(driveLink)}\n\nHistórico:\n${history}\n\n[USER]: ${userText}\n[MARK]:` };
      const contents = [textPart];

      pdfFiles.forEach(pdf => contents.push({ inlineData: { mimeType: pdf.mimeType, data: pdf.data } }));

      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: contents,
          });
          break; // Success
        } catch (err) {
          if (err.message.includes('503') && retries > 1) {
            retries--;
            await new Promise(r => setTimeout(r, 3000)); // Wait 3s before retrying
          } else {
            throw err;
          }
        }
      }

      setMessages(prev => [...prev, { role: 'ai', content: response.text }]);
    } catch (error) {
      let errorMsg = error.message;
      if (errorMsg.includes('503')) {
        errorMsg = "Servidores do Google em alta demanda (Erro 503). Por favor, tente novamente em alguns instantes.";
      } else if (errorMsg.includes('429')) {
        errorMsg = "Cota da API excedida. Verifique o faturamento no Google AI Studio.";
      }
      setMessages(prev => [...prev, { role: 'ai', content: `[ FALHA DE CONEXÃO ]: ${errorMsg}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="hud-container">
      <div className="hud-bg-texture"></div>

      <div className="hud-layout">
        
        {/* LEFT COLUMN */}
        <div className="hud-col-side">
          <GlobalClock />
          
          <div className="drive-sync-widget" style={{ marginTop: '30px' }}>
            <div style={{color: 'var(--hud-cyan-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px'}}>
              &gt; CLOUD_MEDIA ASSETS
            </div>
            <input 
              type="text" 
              value={driveLink} 
              onChange={(e) => {
                setDriveLink(e.target.value);
                localStorage.setItem('mark_drive_link', e.target.value);
              }}
              placeholder="[ INSERIR URL DO DRIVE AQUI ]"
              style={{
                width: '100%',
                background: 'rgba(0, 229, 255, 0.05)',
                border: '1px solid var(--hud-cyan-dim)',
                color: '#fff',
                padding: '10px',
                fontFamily: 'var(--font-main)',
                fontSize: '0.75rem',
                outline: 'none',
                boxShadow: 'inset 0 0 10px rgba(0, 229, 255, 0.1)'
              }}
            />
            {driveLink && (
              <div style={{marginTop: '5px', fontSize: '0.65rem', color: 'var(--color-good)', letterSpacing: '1px'}}>
                STATUS: ENCRYPTED LINK SYNCED
              </div>
            )}
          </div>
          
          <div style={{flexGrow: 1}}></div>
          
          <div className="cyber-line-vertical" style={{height: '100px', marginLeft: '50px'}}></div>

          <div className="communication-circle">
            <div className="comm-ring">
              <span className="comm-text">GOALS</span>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.8rem'}}>
              <div><span style={{color: '#888'}}>Stories:</span> <span style={{color: '#fff'}}>0/3</span></div>
              <div><span style={{color: '#888'}}>Reels:</span> <span style={{color: '#fff'}}>0/3</span></div>
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

            <div className={`ring-core-glow ${isTyping ? 'thinking' : ''}`}></div>
          </div>

          <div className="chat-container-floating">
            <div className="chat-history-transparent">
              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-msg ${msg.role}`} style={msg.role === 'system' ? {color: '#666', fontSize: '0.7rem'} : {}}>
                  {msg.role === 'user' ? `[USER]: ${msg.content}` : msg.role === 'ai' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  ) : msg.content}
                </div>
              ))}
              {isTyping && <div className="chat-msg ai" style={{animation: 'blink 1s infinite'}}>_ PROCESSANDO...</div>}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="chat-input-wrapper">
              <input
                type="text"
                className="hud-input-floating"
                placeholder="[ INSIRA O COMANDO AQUI ]"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isTyping}
              />
              <button type="submit" className="hud-btn-floating" disabled={!input.trim() || isTyping}>
                ENGAGE
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="hud-col-side" style={{alignItems: 'flex-end'}}>
          
          <div className="pdf-node-container">
            <div className="pdf-list">
              {pdfFiles.map((pdf, i) => (
                <div key={i} className="pdf-item">
                  <span>{pdf.name.substring(0, 15)}</span>
                  <div className="pdf-dot"></div>
                </div>
              ))}
              <div className="pdf-item" style={{cursor: 'pointer', color: '#fff'}} onClick={() => fileInputRef.current.click()}>
                <span>+ ADD_KNOWLEDGE</span>
                <div className="pdf-dot" style={{background: '#fff'}}></div>
              </div>
              <input type="file" accept="application/pdf" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileUpload} />
            </div>
            <div className="pdf-reactor">
              <div className="pdf-core"></div>
            </div>
          </div>

          <div style={{marginTop: '40px', textAlign: 'right', fontSize: '0.8rem', lineHeight: '1.8'}}>
            <div><span className="pdf-dot" style={{display: 'inline-block', marginRight: '10px'}}></span> <span style={{color: '#fff'}}>YOUTUBE</span> <span style={{color: '#888'}}>SYNCED</span></div>
            <div><span className="pdf-dot" style={{display: 'inline-block', marginRight: '10px'}}></span> <span style={{color: '#fff'}}>TIKTOK</span> <span style={{color: '#888'}}>SYNCED</span></div>
            <div><span className="pdf-dot" style={{display: 'inline-block', marginRight: '10px'}}></span> <span style={{color: '#fff'}}>INSTAGRAM</span> <span style={{color: '#888'}}>SYNCED</span></div>
            <div style={{color: 'var(--hud-cyan-dim)', marginTop: '10px', textTransform: 'lowercase', letterSpacing: '1px'}}>mark's system</div>
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
