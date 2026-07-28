import re

# --- 1. CSS BACKGROUND PATCH ---
with open('src/index.css', 'r') as f:
    css = f.read()

# Replace body background with deep black and dots
new_body_bg = """body {
  margin: 0;
  padding: 0;
  font-family: var(--font-main);
  background-color: #000000;
  background-image: radial-gradient(rgba(0, 229, 255, 0.2) 1px, transparent 1px);
  background-size: 40px 40px;
  background-position: 0 0;
  color: #fff;
  overflow: hidden; /* Previne scroll acidental na UI fixa */
}"""

css = re.sub(r'body\s*\{.*?\n\}', new_body_bg, css, flags=re.DOTALL)

with open('src/index.css', 'w') as f:
    f.write(css)

# --- 2. APP.JSX LAYOUT PATCH ---
with open('src/App.jsx', 'r') as f:
    app = f.read()

# Add Draggable import
app = app.replace("import remarkGfm from 'remark-gfm';", "import remarkGfm from 'remark-gfm';\nimport Draggable from 'react-draggable';")

# hud-layout wrapper
app = app.replace('<div className="hud-layout">', '<div className={`hud-layout ${isTyping || isProcessingRAG ? "reactor-active" : ""}`}>')

# LEFT COLUMN
left_col = """        <Draggable handle=".draggable-handle">
          <div className="hud-col-side left-panel-3d glass-panel" style={{position: 'relative'}}>
            <div className="draggable-handle" style={{cursor: 'move', color: 'var(--hud-cyan-dim)', fontSize: '0.6rem', padding: '5px', textAlign: 'center', marginBottom: '10px'}}>::: DRAG :::</div>
"""
app = app.replace('        <div className="hud-col-side">', left_col)
app = app.replace('          </div>\n        </div>\n\n        {/* CENTER COLUMN */}', '          </div>\n          </div>\n        </Draggable>\n\n        {/* CENTER COLUMN */}')

# CENTER COLUMN - REACTOR
reactor = """          <Draggable handle=".giant-reactor">
            <div className="giant-reactor" style={{cursor: 'move'}}>
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
          </Draggable>"""
app = re.sub(r'<div className="giant-reactor">.*?</div>\n          </div>', reactor, app, flags=re.DOTALL)

# CENTER COLUMN - CHAT
chat = """          <Draggable handle=".draggable-handle">
            <div className="chat-container-floating glass-panel" style={{position: 'relative'}}>
              <div className="draggable-handle" style={{cursor: 'move', color: 'var(--hud-cyan-dim)', fontSize: '0.6rem', padding: '5px', textAlign: 'center'}}>::: DRAG TERMINAL :::</div>"""
app = app.replace('<div className="chat-container-floating">', chat)

# Fix missing closing tags for chat replace
app = app.replace('              </button>\n            </form>\n          </div>\n        </div>', '              </button>\n            </form>\n            </div>\n          </Draggable>\n        </div>')

# RIGHT COLUMN
right_col = """        <Draggable handle=".draggable-handle">
          <div className="hud-col-side right-panel-3d glass-panel" style={{alignItems: 'flex-end', position: 'relative'}}>
            <div className="draggable-handle" style={{cursor: 'move', color: 'var(--hud-cyan-dim)', fontSize: '0.6rem', padding: '5px', textAlign: 'center', width: '100%', marginBottom: '10px'}}>::: DRAG :::</div>"""
app = app.replace('        <div className="hud-col-side" style={{alignItems: \'flex-end\'}}>', right_col)
app = app.replace('          </div>\n\n        </div>\n\n      </div>', '          </div>\n\n          </div>\n        </Draggable>\n\n      </div>')


with open('src/App.jsx', 'w') as f:
    f.write(app)

print("Patch v3 applied.")
