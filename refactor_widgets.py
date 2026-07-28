import re

# --- 1. UPDATE CSS ---
with open('src/index.css', 'r') as f:
    css = f.read()

# Update glass-panel-ui background to solid dark
old_glass = """.glass-panel-ui {
  background: rgba(0, 229, 255, 0.05); /* Faint cyan */
  border: 2px solid var(--hud-cyan);
  border-radius: 8px; /* Sharper */
  padding: 15px;
  box-shadow: 0 0 15px rgba(0, 229, 255, 0.3), inset 0 0 20px rgba(0, 229, 255, 0.15);
  backdrop-filter: blur(4px);
  width: 100%;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  z-index: 5;
}"""

new_glass = """.glass-panel-ui {
  background: rgba(4, 10, 16, 0.85); /* Solid dark for Image 2 style */
  border: 2px solid var(--hud-cyan);
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 0 15px rgba(0, 229, 255, 0.4), inset 0 0 30px rgba(0, 229, 255, 0.2);
  backdrop-filter: blur(10px);
  width: 100%;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  z-index: 5;
}"""
css = css.replace(old_glass, new_glass)

# Update scanlines to be more prominent
css = css.replace("background: repeating-linear-gradient(\n    0deg,\n    rgba(0, 0, 0, 0.15),\n    rgba(0, 0, 0, 0.15) 1px,\n    transparent 1px,\n    transparent 3px\n  );", 
"background: repeating-linear-gradient(\n    0deg,\n    rgba(0, 229, 255, 0.05),\n    rgba(0, 229, 255, 0.05) 1px,\n    transparent 1px,\n    transparent 3px\n  );")

# Update chat container to match dark aesthetic
css = css.replace("background: rgba(0, 229, 255, 0.05);", "background: rgba(4, 10, 16, 0.85);")

# Add CSS for central PDF widget positioning
css += """
.pdf-node-container-central {
  position: relative;
  z-index: 50;
  width: 350px;
  margin-top: 20px;
}

@media (min-width: 1024px) {
  .pdf-node-container-central {
    position: absolute;
    top: -50px;
    right: -250px;
    width: 320px;
    margin-top: 0;
  }
}

.widget-row {
  display: flex;
  align-items: center;
  gap: 15px;
  width: 100%;
}

.widget-ring {
  flex-shrink: 0;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: 3px solid var(--hud-cyan);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 15px var(--hud-cyan), inset 0 0 10px var(--hud-cyan);
}

.widget-ring-text {
  font-size: 0.6rem;
  color: var(--hud-cyan);
  letter-spacing: 1px;
  font-weight: bold;
}

.widget-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: center;
}
"""

with open('src/index.css', 'w') as f:
    f.write(css)


# --- 2. UPDATE APP.JSX ---
with open('src/App.jsx', 'r') as f:
    app = f.read()

# 2.1 Cut PDF Node Container from Right Panel
pdf_block_regex = r'(<div className="pdf-node-container glass-panel-ui">.*?<div className="pdf-reactor">\s*<div className="pdf-core"></div>\s*</div>\s*</div>)'
match = re.search(pdf_block_regex, app, re.DOTALL)
if match:
    pdf_block = match.group(1)
    # Change class to central
    pdf_block_central = pdf_block.replace('"pdf-node-container glass-panel-ui"', '"pdf-node-container glass-panel-ui pdf-node-container-central"')
    # Remove from original location
    app = app.replace(pdf_block, "")
    
    # Inject into giant-reactor
    reactor_end = """            <div className="matrix-code-container">
              <div className="matrix-code-content">
                {Array.from({length: 20}).map((_, i) => (
                  <span key={i}>0x{(Math.random()*100000).toString(16).substring(0,4)} INIT SYS<br/>SYS.CALL.{Math.floor(Math.random()*999)}<br/></span>
                ))}
              </div>
            </div>
          </div>"""
    app = app.replace(reactor_end, reactor_end + "\n\n          {/* KNOWLEDGE IN CENTRAL CORE */}\n          " + pdf_block_central)
else:
    print("Could not find pdf block to extract!")

# 2.2 Standardize Goals Widget to Horizontal
old_goals = """<div className="goals-widget glass-panel-ui">
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
            
            <div className="tasks-list-container">"""

new_goals = """<div className="goals-widget glass-panel-ui" style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
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
            
            <div className="tasks-list-container" style={{paddingLeft: '5px'}}>"""
app = app.replace(old_goals, new_goals)

# 2.3 Standardize Drive Link Widget
old_drive = """<div className="drive-sync-widget glass-panel-ui" style={{marginBottom: '20px'}}>
            <div style={{fontSize: '0.7rem', color: 'var(--hud-cyan-dim)', marginBottom: '10px'}}>&gt; CLOUD_MEDIA ASSETS</div>
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
          </div>"""

new_drive = """<div className="drive-sync-widget glass-panel-ui" style={{marginBottom: '20px'}}>
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
          </div>"""
app = app.replace(old_drive, new_drive)

# 2.4 Standardize Logs Widget
old_logs = """<div className="communication-circle glass-panel-ui" style={{cursor: 'pointer', marginBottom: '20px'}} onClick={() => setShowHistoryModal(true)}>
            <div className="comm-ring" style={{width: '70px', height: '70px', borderColor: '#fff'}}>
              <span className="comm-text" style={{fontSize: '0.6rem', color: '#fff'}}>LOGS</span>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.8rem'}}>
              <span style={{color: '#fff'}}>REQUEST HISTORY</span>
              <span style={{color: 'var(--hud-cyan-dim)', fontSize: '0.7rem'}}>
                {messages.filter(m => m.role === 'user').length} COMMANDS ISSUED
              </span>
            </div>
          </div>"""

new_logs = """<div className="glass-panel-ui" style={{cursor: 'pointer', marginBottom: '20px'}} onClick={() => setShowHistoryModal(true)}>
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
          </div>"""
app = app.replace(old_logs, new_logs)


with open('src/App.jsx', 'w') as f:
    f.write(app)

print("Widget refactoring complete.")
