import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import './index.css';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const SYSTEM_PROMPT = `
Você é o Mark, um Assistente de Marketing em forma de IA projetado no estilo Jarvis HUD.
Seu objetivo é apoiar o marketing de um consultório odontológico estruturando ações, campanhas e sugerindo conteúdos (stories, reels). 
Responda sempre de forma técnica, analítica, prestativa e como uma inteligência artificial avançada (estilo sci-fi).
Se receber documentos (PDFs), analise-os e use as informações para fundamentar suas respostas.
`;

function App() {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'SYSTEM ONLINE. AGUARDANDO COMANDOS DE MARKETING.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pdfFiles, setPdfFiles] = useState([]); // Store uploaded PDFs as base64
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      setPdfFiles(prev => [...prev, {
        name: file.name,
        mimeType: file.type,
        data: base64Data
      }]);
      setMessages(prev => [...prev, { role: 'system', content: `[SISTEMA]: Arquivo anexado ao banco de dados: ${file.name}` }]);
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
      // Build conversation history for context
      const history = messages
        .filter(m => m.role !== 'system')
        .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
        .join('\n');

      const textPart = { text: `${SYSTEM_PROMPT}\n\nHistórico:\n${history}\n\n[USER]: ${userText}\n[MARK]:` };
      
      const contents = [textPart];

      // Append PDFs as inline data parts if they exist
      pdfFiles.forEach(pdf => {
        contents.push({
          inlineData: {
            mimeType: pdf.mimeType,
            data: pdf.data
          }
        });
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro',
        contents: contents,
      });

      setMessages(prev => [...prev, { role: 'ai', content: response.text }]);
    } catch (error) {
      console.error("Gemini API Error:", error);
      setMessages(prev => [...prev, { role: 'ai', content: 'SYSTEM ERROR: FALHA NA COMUNICAÇÃO COM O NÚCLEO DE IA.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="hud-container">
      {/* Left Panel */}
      <div className="hud-panel" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2 className="hud-title">STATUS DO SISTEMA</h2>
          <div className="hud-widget">
            <ul className="hud-list">
              <li className="hud-list-item"><span>POWER</span> <span>100% (HIGH)</span></li>
              <li className="hud-list-item"><span>PRIMARY STORAGE</span> <span>133 G</span></li>
              <li className="hud-list-item"><span>FREE CAPACITY</span> <span>61 G</span></li>
            </ul>
          </div>
        </div>

        <div>
          <h2 className="hud-title">METAS SEMANAIS</h2>
          <div className="hud-widget">
            <ul className="hud-list">
              <li className="hud-list-item"><span>STORIES DIÁRIOS</span> <span style={{ color: 'var(--hud-cyan)' }}>0/3</span></li>
              <li className="hud-list-item"><span>REELS (FEED)</span> <span style={{ color: 'var(--hud-cyan)' }}>0/3</span></li>
              <li className="hud-list-item"><span>ANÁLISE DE MERCADO</span> <span>PENDENTE</span></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Center Panel (Arc Reactor) */}
      <div className="hud-center">
        <div className="arc-reactor">
          <div className="ring ring-outer"></div>
          <div className="ring ring-dashed"></div>
          <div className="ring ring-inner"></div>
          <div className={`ring-core ${isTyping ? 'thinking' : ''}`}>
          </div>
        </div>
        
        {/* Chat Overlay */}
        <div className="chat-overlay">
          <div className="chat-history">
            {messages.map((msg, idx) => (
              <div key={idx} className={`hud-message ${msg.role}`} style={msg.role === 'system' ? {color: '#888', fontStyle: 'italic', border: 'none', textAlign: 'center'} : {}}>
                {msg.content}
              </div>
            ))}
            {isTyping && (
              <div className="hud-message ai">
                PROCESSANDO DADOS...
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
              ENVIAR &gt;
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel */}
      <div className="hud-panel" style={{ justifyContent: 'space-between', textAlign: 'right' }}>
        <div>
          <h2 className="hud-title">BANCO DE DADOS</h2>
          <div className="hud-widget">
            <ul className="hud-list" style={{ alignItems: 'flex-end' }}>
              <li className="hud-list-item" style={{ width: '100%' }}><span>ESTUDOS DE CASO</span> <span>ONLINE</span></li>
              <li className="hud-list-item" style={{ width: '100%' }}><span>INVISALIGN REFS</span> <span>SYNCED</span></li>
              
              {pdfFiles.map((pdf, i) => (
                <li key={i} className="hud-list-item" style={{ width: '100%', color: 'var(--hud-cyan)' }}>
                  <span>PDF_{i+1}</span> <span>LOADED</span>
                </li>
              ))}

              <li 
                className="hud-list-item" 
                style={{ width: '100%', borderBottom: 'none', cursor: 'pointer', color: '#fff', display: 'flex', justifyContent: 'flex-end' }}
                onClick={() => fileInputRef.current.click()}
              >
                + ANEXAR PDF
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

        <div>
          <div className="hud-widget" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', textShadow: '0 0 10px var(--hud-cyan)' }}>
              ATMOS
            </div>
            <div className="hud-text">ANÁLISE ATMOSFÉRICA</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
