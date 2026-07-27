import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import './index.css';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const SYSTEM_PROMPT = `
Você é o MARK, o "AI MARKETING ARCHITECT", uma IA cibernética e de altíssima tecnologia operando em um HUD holográfico de néon.
Você está conectado (simuladamente) às redes sociais do consultório: YouTube, TikTok e Instagram. 
Sua tarefa é fornecer relatórios diários, planejar campanhas e analisar dados de mercado, cruzando-os com os PDFs de referência em sua memória.
Responda sempre com tom robótico, altamente técnico, analítico, eficiente e como se estivesse monitorando o fluxo de dados globais.
Use relatórios simulados para YouTube, TikTok e Instagram quando perguntado sobre o desempenho de hoje, sendo criativo e estratégico.
`;

// --- IndexedDB Helper for PDFs ---
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

// --- Clock Component ---
function GlobalClock() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 50);
    return () => clearInterval(timer);
  }, []);

  const hrs = time.getHours().toString().padStart(2, '0');
  const mins = time.getMinutes().toString().padStart(2, '0');
  const secs = time.getSeconds().toString().padStart(2, '0');
  const ms = time.getMilliseconds().toString().padStart(3, '0');

  return (
    <div className="clock-widget">
      <div className="time-main">{hrs}:{mins}:{secs}</div>
      <div className="time-ms">.{ms}</div>
      <div className="time-zone">UTC / SYNCED</div>
    </div>
  );
}

// ---------------------------------

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pdfFiles, setPdfFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load saved data on startup
  useEffect(() => {
    const savedMessages = localStorage.getItem('mark_messages');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    } else {
      setMessages([{ role: 'ai', content: 'SYSTEM ONLINE. AGUARDANDO COMANDOS DE MARKETING.' }]);
    }

    getPdfsFromDB().then(files => {
      if (files && files.length > 0) {
        setPdfFiles(files);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('mark_messages', JSON.stringify(messages));
    }
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result.split(',')[1];
      const newPdf = {
        id: Date.now().toString(),
        name: file.name,
        mimeType: file.type,
        data: base64Data
      };

      try {
        await savePdfToDB(newPdf);
        setPdfFiles(prev => [...prev, newPdf]);
        setMessages(prev => [...prev, { role: 'system', content: `[SISTEMA]: Arquivo anexado ao banco de dados global: ${file.name}` }]);
      } catch (err) {
        setMessages(prev => [...prev, { role: 'system', content: `[ERRO]: Falha ao salvar arquivo: ${err.message}` }]);
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
      const history = messages
        .filter(m => m.role !== 'system')
        .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
        .join('\n');

      const textPart = { text: `${SYSTEM_PROMPT}\n\nHistórico:\n${history}\n\n[USER]: ${userText}\n[MARK]:` };
      const contents = [textPart];

      pdfFiles.forEach(pdf => {
        contents.push({
          inlineData: {
            mimeType: pdf.mimeType,
            data: pdf.data
          }
        });
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: contents,
      });

      setMessages(prev => [...prev, { role: 'ai', content: response.text }]);
    } catch (error) {
      console.error("Gemini API Error:", error);
      setMessages(prev => [...prev, { role: 'ai', content: `SYSTEM ERROR: FALHA NA COMUNICAÇÃO. DETALHES: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearMemory = () => {
    localStorage.removeItem('mark_messages');
    setMessages([{ role: 'ai', content: 'MEMÓRIA APAGADA. SYSTEM REBOOTED.' }]);
  };

  return (
    <div className="hud-container">
      {/* Background Matrix Rain / Data Stream effects handled in CSS */}
      <div className="data-stream-bg"></div>

      {/* Header */}
      <header className="hud-header">
        <h1 className="hud-main-title">MARK: AI MARKETING ARCHITECT</h1>
        <h3 className="hud-subtitle">SISTEMA DE UNIDADE: MARK - SESSÃO ATIVA</h3>
      </header>

      <div className="hud-layout">
        
        {/* Left Column */}
        <div className="hud-col left-col">
          {/* Resource Monitor */}
          <div className="hud-widget">
            <h2 className="hud-widget-title">MONITOR DE ALOCAÇÃO DE RECURSOS DE CAMPANHA</h2>
            <div className="bar-chart-container">
              <div className="bar-item">
                <span className="bar-label">Gasto Digital</span>
                <div className="bar-bg"><div className="bar-fill" style={{width: '65%'}}></div></div>
                <span className="bar-value">65%</span>
              </div>
              <div className="bar-item">
                <span className="bar-label">Desenvolvimento de Conteúdo</span>
                <div className="bar-bg"><div className="bar-fill" style={{width: '88%'}}></div></div>
                <span className="bar-value">88%</span>
              </div>
              <div className="bar-item">
                <span className="bar-label">Unidade de Análise</span>
                <div className="bar-bg"><div className="bar-fill" style={{width: '92%'}}></div></div>
                <span className="bar-value">92%</span>
              </div>
              <div className="bar-item">
                <span className="bar-label">Carga do Servidor de IA</span>
                <div className="bar-bg"><div className="bar-fill" style={{width: '42%'}}></div></div>
                <span className="bar-value">42%</span>
              </div>
            </div>
          </div>

          {/* Social Media Tracker */}
          <div className="hud-widget mt-20">
            <h2 className="hud-widget-title">SINCRONIZAÇÃO DE REDES SOCIAIS</h2>
            <ul className="social-list">
              <li>
                <span className="social-name">YOUTUBE API</span>
                <span className="social-status online">CONNECTED</span>
              </li>
              <li>
                <span className="social-name">TIKTOK GRAPH</span>
                <span className="social-status online">CONNECTED</span>
              </li>
              <li>
                <span className="social-name">INSTAGRAM API</span>
                <span className="social-status online">CONNECTED</span>
              </li>
              <li className="social-report-btn">
                [ GERAR RELATÓRIO DIÁRIO ]
              </li>
            </ul>
          </div>

          {/* PDF Memory section moved to left to balance layout */}
          <div className="hud-widget mt-20">
             <h2 className="hud-widget-title">BASE DE CONHECIMENTO (PDFs)</h2>
             <ul className="social-list">
              {pdfFiles.map((pdf, i) => (
                <li key={i}>
                  <span className="social-name">PDF_{i+1} ({pdf.name.substring(0, 10)}...)</span> 
                  <span className="social-status online">LOADED</span>
                </li>
              ))}
              <li className="social-report-btn" onClick={() => fileInputRef.current.click()} style={{marginTop: '10px'}}>
                + INJETAR DADOS (PDF)
              </li>
              <input 
                type="file" 
                accept="application/pdf" 
                style={{ display: 'none' }} 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
             </ul>
          </div>
        </div>

        {/* Center Column (Arc Reactor & Chat) */}
        <div className="hud-col center-col">
          <div className="hud-center">
            <div className="arc-reactor">
              <div className="ring ring-outer"></div>
              <div className="ring ring-dashed"></div>
              <div className="ring ring-inner"></div>
              <div className="ring-text-circle">
                <svg viewBox="0 0 100 100" width="100%" height="100%">
                  <path id="circlePath" d="M 50, 50 m -40, 0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" fill="transparent" />
                  <text>
                    <textPath href="#circlePath" startOffset="50%" textAnchor="middle" fill="#00f0ff" fontSize="9" letterSpacing="2">
                      MARK: ENGINE DE OTIMIZAÇÃO • MARK: ENGINE DE OTIMIZAÇÃO •
                    </textPath>
                  </text>
                </svg>
              </div>
              <div className={`ring-core ${isTyping ? 'thinking' : ''}`}>
                21
              </div>
            </div>
          </div>
          
          {/* Chat Overlay placed at bottom center */}
          <div className="chat-container">
            <div className="chat-history">
              {messages.map((msg, idx) => (
                <div key={idx} className={`hud-message ${msg.role}`} style={msg.role === 'system' ? {color: '#888', fontStyle: 'italic', border: 'none', textAlign: 'center'} : {}}>
                  {msg.content}
                </div>
              ))}
              {isTyping && (
                <div className="hud-message ai">
                  PROCESSANDO...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="chat-input-area">
              <input
                type="text"
                className="hud-input"
                placeholder="INSERIR COMANDO DE MARKETING..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isTyping}
              />
              <button type="submit" className="hud-btn" disabled={!input.trim() || isTyping}>
                ENVIAR
              </button>
            </form>
          </div>
        </div>

        {/* Right Column */}
        <div className="hud-col right-col">
          {/* Global Market Analysis */}
          <div className="hud-widget">
            <h2 className="hud-widget-title" style={{textAlign: 'right'}}>ANÁLISE DE MERCADO GLOBAL</h2>
            <GlobalClock />
          </div>

          {/* Forecast and Sentiment */}
          <div className="hud-widget mt-20">
            <h2 className="hud-widget-title" style={{textAlign: 'right'}}>PREVISÃO DE CAMPANHA E SENTIMENTO</h2>
            <ul className="metrics-list">
              <li>
                <span className="metric-label">Índice de Volatilidade do Mercado</span>
                <span className="metric-val warning">ALTO (7.4)</span>
              </li>
              <li>
                <span className="metric-label">Score de Interesse do Público</span>
                <span className="metric-val good">94/100</span>
              </li>
              <li>
                <span className="metric-label">Gasto Ad do Competidor</span>
                <span className="metric-val danger">+12% (UP)</span>
              </li>
              <li>
                <span className="metric-label">Taxa de Conversão</span>
                <span className="metric-val good">4.2%</span>
              </li>
              <li>
                <span className="metric-label">Previsão de Desempenho (Curto Prazo)</span>
                <span className="metric-val">ESTÁVEL</span>
              </li>
            </ul>
          </div>
          
          <div style={{flexGrow: 1}}></div>

          <div 
            className="social-report-btn" 
            style={{ textAlign: 'right', alignSelf: 'flex-end', color: '#ff4444', borderColor: '#ff4444' }}
            onClick={clearMemory}
          >
            [ PURGE MEMORY ]
          </div>
        </div>

      </div>
      
      {/* Technical Log Footer */}
      <div className="tech-log">
        <span className="log-cursor">_</span> ALGORITMO DE ATRIBUIÇÃO CROSS-CANAL EM EXECUÇÃO: Analisando modelos lineares, de última interação e baseados em dados. Parâmetros de otimização de lance ativados para PPC e redes sociais. Taxa de erro de modelagem: 0.15%.
      </div>
    </div>
  );
}

export default App;
