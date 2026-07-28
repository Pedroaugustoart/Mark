import React, { useState, useRef, useEffect } from 'react';
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
    <div className="date-circle-container glass-panel-ui" style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
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
  const [tasks, setTasks] = useState([]);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isProcessingRAG, setIsProcessingRAG] = useState(false);
  const [ragProgress, setRagProgress] = useState({ current: 0, total: 0 });
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  


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
    
    // Check for daily briefing
    const today = new Date().toLocaleDateString();
    const lastBriefing = localStorage.getItem('mark_last_briefing');
    if (lastBriefing !== today) {
      localStorage.setItem('mark_last_briefing', today);
      generateDailyBriefing();
    }
  }, []);

  const generateDailyBriefing = async () => {
    setIsTyping(true);
    const prompt = `ATENÇÃO: Este é um gatilho automático de inicialização do sistema (Morning Briefing).
Como MARK (Arquiteto de Marketing IA estilo J.A.R.V.I.S.), dê o seu relatório matinal corporativo para a diretoria da Prieto & Prieto Odontologia.
Formate a resposta com estilo cibernético e altamente técnico.
1. Cumprimente informando que os sistemas estão online e sincronizados para a Prieto & Prieto.
2. Apresente 2 tendências de marketing atuais para clínicas odontológicas high-ticket, alinhadas aos diferenciais da clínica (Ortodontia Lingual, Fluxo Digital, etc).
3. Dê 1 ideia de conteúdo de impacto (Reels ou Stories) focada nas personas da clínica para ser gravada hoje.
4. Termine perguntando quais são as diretrizes para a campanha de hoje.
Use formatação Markdown. Seja objetivo, analítico e traga insights valiosos.`;

    try {
      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
          });
          break; // Success
        } catch (err) {
          if (err.message.includes('503') && retries > 1) {
            retries--;
            await new Promise(r => setTimeout(r, 3000));
          } else {
            throw err;
          }
        }
      }
      
      setMessages(prev => {
        const newMsgs = [...prev, { role: 'system', content: '[ SYSTEM_BOOT ]: INICIANDO VARREDURA DE TENDÊNCIAS DE MERCADO...' }, { role: 'ai', content: response.text }];
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
        setMessages(prev => [...prev, { role: 'system', content: `[SYSTEM_BOOT]: Extracting raw text from PDF...` }]);
        textToProcess = await extractTextFromPDF(arrayBuffer);
      } else {
        textToProcess = await file.text();
      }

      setMessages(prev => [...prev, { role: 'system', content: `[SYSTEM_BOOT]: Chunking and generating semantic embeddings...` }]);
      
      await processFileForRAG(newPdf.id, textToProcess, ai, (current, total) => {
        setRagProgress({ current, total });
      });

      await savePdfToDB(newPdf);
      setPdfFiles(prev => [...prev, newPdf]);
      setMessages(prev => [...prev, { role: 'system', content: `[DATA INJECT]: ${file.name} (RAG Indexed)` }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'system', content: `[ERROR]: ${err.message}` }]);
    } finally {
      setIsProcessingRAG(false);
    }
  };

  const handleDeletePdf = async (id) => {
    try {
      await deletePdfFromDB(id);
      await deleteFileChunks(id);
      setPdfFiles(prev => prev.filter(pdf => pdf.id !== id));
      setMessages(prev => [...prev, { role: 'system', content: `[DATA PURGED]: ID ${id} and all semantic vectors` }]);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
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
      
      let contextText = '';
      if (pdfFiles.length > 0) {
        setMessages(prev => [...prev, { role: 'system', content: '[ SYSTEM_BOOT ]: PERFORMING VECTOR SEARCH ON DATABASE...' }]);
        const relevantChunks = await searchRelevantChunks(userText, ai, 5);
        if (relevantChunks.length > 0) {
          contextText = "\n\n[DADOS RECUPERADOS DO BANCO DE DADOS VETORIAL LOCAL (RAG)]:\n" + relevantChunks.map(c => `[Contexto (Relevância ${(c.score * 100).toFixed(1)}%)]:\n${c.text}`).join('\n\n');
        }
      }

      const textPart = { text: `${getSystemPrompt(driveLink)}${contextText}\n\nHistórico:\n${history}\n\n[USER]: ${userText}\n[MARK]:` };
      const contents = [textPart];

      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
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

      let aiText = response.text;
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

      {showPdfModal && (
        <div className="cyber-modal-overlay">
          <div className="cyber-modal">
            <div className="cyber-modal-header">
              <h2>&gt; KNOWLEDGE_BASE_ARCHIVE</h2>
              <button onClick={() => setShowPdfModal(false)} className="cyber-modal-close">X</button>
            </div>
            <div className="cyber-modal-body">
              {pdfFiles.length === 0 ? (
                <div style={{color: '#888', textAlign: 'center'}}>DATABASE EMPTY. NO PDFs INJECTED.</div>
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
                      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
                    }}>
                      <div style={{
                        color: msg.role === 'user' ? '#fff' : msg.role === 'system' ? '#888' : 'var(--hud-cyan)', 
                        fontSize: '0.75rem', 
                        letterSpacing: '1px',
                        marginBottom: '10px',
                        textTransform: 'uppercase'
                      }}>
                        [{msg.role === 'user' ? 'USER_COMMAND' : msg.role === 'system' ? 'SYSTEM_ALERT' : 'MARK_RESPONSE'}]
                      </div>
                      <div className="chat-msg ai" style={{fontSize: '0.9rem', lineHeight: '1.5'}}>
                        {msg.role === 'ai' ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        ) : msg.content}
                      </div>
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
        <div className="hud-col-side">
          <GlobalClock />
          
          <div className="drive-sync-widget glass-panel-ui" style={{ marginTop: '30px' }}>
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
          
          <div className="cyber-line-vertical" style={{height: '50px', marginLeft: '50px'}}></div>

          <div className="communication-circle glass-panel-ui" style={{cursor: 'pointer', marginBottom: '20px'}} onClick={() => setShowHistoryModal(true)}>
            <div className="comm-ring" style={{width: '70px', height: '70px', borderColor: '#fff'}}>
              <span className="comm-text" style={{fontSize: '0.6rem', color: '#fff'}}>LOGS</span>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.8rem'}}>
              <span style={{color: '#fff'}}>REQUEST HISTORY</span>
              <span style={{color: 'var(--hud-cyan-dim)', fontSize: '0.7rem'}}>
                {messages.filter(m => m.role === 'user').length} COMMANDS ISSUED
              </span>
            </div>
          </div>

          <div className="cyber-line-vertical" style={{height: '50px', marginLeft: '50px'}}></div>

          <div className="goals-widget glass-panel-ui">
            <div className="communication-circle glass-panel-ui" style={{marginBottom: '10px'}}>
              <div className="comm-ring" style={{borderColor: 'var(--hud-cyan)'}}>
                <span className="comm-text" style={{color: 'var(--hud-cyan)'}}>GOALS</span>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.8rem'}}>
                <span style={{color: '#fff'}}>TODAY'S CAMPAIGN</span>
                <span style={{color: 'var(--hud-cyan-dim)', fontSize: '0.7rem'}}>
                  {tasks.filter(t => t.completed).length} / {tasks.length} COMPLETED
                </span>
              </div>
            </div>
            
            <div className="tasks-list-container">
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
              {isProcessingRAG && (
                <div className="chat-msg system" style={{color: 'var(--hud-cyan)', fontSize: '0.7rem'}}>
                  [ VECTORIZER ]: GENERATING EMBEDDINGS... {ragProgress.current} / {ragProgress.total} CHUNKS
                </div>
              )}
              {isTyping && !isProcessingRAG && <div className="chat-msg ai" style={{animation: 'blink 1s infinite'}}>_ PROCESSANDO...</div>}
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
          
          <div className="pdf-node-container glass-panel-ui">
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
              <div className="pdf-item" style={{cursor: 'pointer', color: 'var(--hud-cyan-dim)', marginTop: '5px'}} onClick={() => setShowPdfModal(true)}>
                <span>&gt; MANAGE_KNOWLEDGE</span>
                <div className="pdf-dot" style={{background: 'var(--hud-cyan-dim)'}}></div>
              </div>
              <input type="file" accept=".pdf,.md,.txt" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileUpload} />
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
