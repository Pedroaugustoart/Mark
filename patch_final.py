import re

# 1. UPDATE CSS FOR MOBILE FIRST & PDF LINES
with open('src/index.css', 'r') as f:
    css = f.read()

# Update hud-layout
old_layout = """.hud-layout {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  padding: 50px;
  height: 100vh;
  box-sizing: border-box;
}"""

new_layout = """.hud-layout {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  padding: 20px;
  min-height: 100vh;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
}

@media (min-width: 1024px) {
  .hud-layout {
    flex-direction: row;
    justify-content: space-between;
    align-items: stretch;
    padding: 50px;
    height: 100vh;
    overflow: hidden;
  }
}
"""
css = css.replace(old_layout, new_layout)

# Update columns
old_cols = """.hud-col-side {
  display: flex;
  flex-direction: column;
  width: 300px;
  z-index: 2;
}

.hud-col-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  position: relative;
  z-index: 1;
}"""

new_cols = """.hud-col-side {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 450px;
  z-index: 2;
  align-items: center;
  gap: 20px;
}

.hud-col-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  position: relative;
  z-index: 1;
  order: -1;
}

@media (min-width: 1024px) {
  .hud-col-side {
    width: 300px;
    max-width: none;
    align-items: flex-start;
    gap: 0;
  }
  .hud-col-center {
    justify-content: center;
    flex-grow: 1;
    width: auto;
    order: 0;
  }
}
"""
css = css.replace(old_cols, new_cols)

# Update Chat Container for mobile
old_chat = """.chat-container-floating {
  position: absolute;
  bottom: 20px;
  width: 600px;
  height: 250px;"""
new_chat = """.chat-container-floating {
  position: relative;
  margin-top: 20px;
  width: 100%;
  max-width: 600px;
  height: 300px;"""
css = css.replace(old_chat, new_chat)

css += """
@media (min-width: 1024px) {
  .chat-container-floating {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    height: 250px;
    margin-top: 0;
  }
}
"""

# Update Reactor for mobile
old_reactor = """.giant-reactor {
  position: relative;
  width: 500px;
  height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
}"""
new_reactor = """.giant-reactor {
  position: relative;
  width: 300px;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: scale(0.6);
  margin: -60px 0;
}

@media (min-width: 1024px) {
  .giant-reactor {
    width: 500px;
    height: 500px;
    transform: scale(1);
    margin: 0;
  }
}
"""
css = css.replace(old_reactor, new_reactor)

# Hide line separators on mobile
css = css.replace('.cyber-line-vertical {', '.cyber-line-vertical {\n  display: none;')
css += "\n@media (min-width: 1024px) {\n  .cyber-line-vertical {\n    display: block;\n  }\n}\n"

# Add CSS for PDF connecting lines
pdf_lines_css = """
.pdf-item {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 10px;
  width: 100%;
  position: relative;
}

.pdf-dot {
  width: 8px;
  height: 8px;
  background: var(--hud-cyan);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--hud-cyan);
  margin-left: 10px;
  z-index: 2;
}

.pdf-line {
  flex-grow: 1;
  height: 1px;
  background: rgba(0, 229, 255, 0.4);
  box-shadow: 0 0 5px rgba(0, 229, 255, 0.4);
  margin-left: 0;
  margin-right: -40px; /* extends line to reactor */
  z-index: 1;
  transition: all 0.3s;
}

.pdf-node-container {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 20px;
  overflow: visible; /* allow line to extend */
}

.pdf-list {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  z-index: 2;
}
"""
css += pdf_lines_css

with open('src/index.css', 'w') as f:
    f.write(css)

# 2. UPDATE APP.JSX FOR PDF LINES
with open('src/App.jsx', 'r') as f:
    app = f.read()

# Replace pdf-item maps
old_pdf_map = """              {pdfFiles.map((pdf, i) => (
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
              </div>"""

new_pdf_map = """              {pdfFiles.map((pdf, i) => (
                <div key={i} className="pdf-item">
                  <span>{pdf.name.substring(0, 15)}</span>
                  <div className="pdf-dot"></div>
                  <div className="pdf-line"></div>
                </div>
              ))}
              <div className="pdf-item" style={{cursor: 'pointer', color: '#fff'}} onClick={() => fileInputRef.current.click()}>
                <span>+ ADD_KNOWLEDGE</span>
                <div className="pdf-dot" style={{background: '#fff'}}></div>
                <div className="pdf-line" style={{background: 'rgba(255,255,255,0.3)', boxShadow: '0 0 5px rgba(255,255,255,0.3)'}}></div>
              </div>
              <div className="pdf-item" style={{cursor: 'pointer', color: 'var(--hud-cyan-dim)', marginTop: '5px'}} onClick={() => setShowPdfModal(true)}>
                <span>&gt; MANAGE_KNOWLEDGE</span>
                <div className="pdf-dot" style={{background: 'var(--hud-cyan-dim)'}}></div>
                <div className="pdf-line" style={{background: 'rgba(0, 229, 255, 0.1)', boxShadow: 'none'}}></div>
              </div>"""
app = app.replace(old_pdf_map, new_pdf_map)

# Replace all side panels with glass-panel-ui
app = app.replace('<div className="goals-widget">', '<div className="goals-widget glass-panel-ui">')
app = app.replace('<div className="pdf-node-container">', '<div className="pdf-node-container glass-panel-ui">')
app = app.replace('<div className="communication-circle"', '<div className="communication-circle glass-panel-ui"')
app = app.replace('<div className="date-circle-container">', '<div className="date-circle-container glass-panel-ui" style={{display: "flex", flexDirection: "column", alignItems: "center"}}>')
app = app.replace('<div className="drive-sync-widget"', '<div className="drive-sync-widget glass-panel-ui"')


with open('src/App.jsx', 'w') as f:
    f.write(app)

print("Final patch applied.")
