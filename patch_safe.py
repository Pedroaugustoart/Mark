import re

# --- 1. CSS PATCH ---
with open('src/index.css', 'r') as f:
    css = f.read()

# Fix goals text truncation
css = css.replace(
    '.task-name {\n  flex-grow: 1;\n  font-size: 0.75rem;\n  color: #fff;\n}',
    '.task-name {\n  flex-grow: 1;\n  font-size: 0.75rem;\n  color: #fff;\n  word-wrap: break-word;\n  white-space: normal;\n  line-height: 1.2;\n}'
)

# Replace body background with dot matrix
new_body_bg = """body {
  margin: 0;
  padding: 0;
  font-family: var(--font-main);
  background-color: #000000;
  background-image: radial-gradient(rgba(0, 229, 255, 0.25) 1px, transparent 1px);
  background-size: 35px 35px;
  background-position: 0 0;
  color: #fff;
}"""
css = re.sub(r'body\s*\{.*?\n\}', new_body_bg, css, flags=re.DOTALL)

# Remove the grainy texture completely
css = re.sub(r'\.hud-bg-texture::after\s*\{.*?\n\}', '', css, flags=re.DOTALL)

# Add Matrix animation and active reactor styles
matrix_css = """
.matrix-code-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  overflow: hidden;
  border-radius: 50%;
  color: rgba(255,255,255,0.7);
  font-family: monospace;
  font-size: 0.55rem;
  line-height: 1.4;
  pointer-events: none;
  display: flex;
  justify-content: center;
}

.matrix-code-content {
  display: flex;
  flex-direction: column;
  white-space: nowrap;
  animation: matrix-scroll 8s linear infinite;
}

@keyframes matrix-scroll {
  0% { transform: translateY(100%); }
  100% { transform: translateY(-150%); }
}

.reactor-active {
  --hud-cyan: #ffdd00 !important;
  --hud-cyan-dim: rgba(255, 221, 0, 0.4) !important;
}
"""
css += matrix_css

with open('src/index.css', 'w') as f:
    f.write(css)

# --- 2. APP.JSX PATCH ---
with open('src/App.jsx', 'r') as f:
    app = f.read()

# Add reactor-active state
app = app.replace('<div className="hud-layout">', '<div className={`hud-layout ${isTyping || isProcessingRAG ? "reactor-active" : ""}`}>')

# Add matrix code and thinking state to reactor core
old_glow = '<div className={`ring-core-glow ${isTyping ? \'thinking\' : \'\'}`}></div>'
new_glow = """<div className={`ring-core-glow ${isTyping || isProcessingRAG ? 'thinking' : ''}`}></div>
            <div className="matrix-code-container">
              <div className="matrix-code-content">
                {Array.from({length: 20}).map((_, i) => (
                  <span key={i}>0x{(Math.random()*100000).toString(16).substring(0,4)} INIT SYS<br/>SYS.CALL.{Math.floor(Math.random()*999)}<br/></span>
                ))}
              </div>
            </div>"""
app = app.replace(old_glow, new_glow)

with open('src/App.jsx', 'w') as f:
    f.write(app)

print("Safe visual patch applied.")
