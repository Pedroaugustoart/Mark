import re

with open('src/index.css', 'r') as f:
    css = f.read()

# 1. Update hud-layout
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

# 2. Update columns
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
  max-width: 400px;
  z-index: 2;
  align-items: center; /* Center on mobile */
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
  order: -1; /* Mobile: Reactor on top */
}

@media (min-width: 1024px) {
  .hud-col-side {
    width: 300px;
    max-width: none;
    align-items: flex-start;
    gap: 0;
  }
  .hud-col-side.right-panel {
    align-items: flex-end;
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

# 3. Update Chat Container
old_chat = """.chat-container-floating {
  position: absolute;
  bottom: 20px;
  width: 600px;
  height: 250px;
  background: rgba(0, 15, 25, 0.6);
  border: 1px solid var(--hud-cyan-dim);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  padding: 15px;
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.1);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}"""

new_chat = """.chat-container-floating {
  width: 100%;
  max-width: 600px;
  height: 300px;
  background: rgba(0, 5, 15, 0.85); /* Glassmorphism M.E.N.T.E */
  border: 1px solid rgba(0, 229, 255, 0.2);
  border-top: 1px solid rgba(0, 229, 255, 0.6); /* Premium top glow */
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(0, 229, 255, 0.05);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  margin-top: 20px;
  z-index: 20;
}

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
css = css.replace(old_chat, new_chat)

# 4. Update Reactor
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
  margin: -60px 0; /* Compensate for scale on mobile */
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

# 5. Hide line separators on mobile
css = css.replace('.cyber-line-vertical {', '.cyber-line-vertical {\n  display: none;')
css += "\n@media (min-width: 1024px) {\n  .cyber-line-vertical {\n    display: block;\n  }\n}\n"

# 6. Apply Glassmorphism to Side panels for M.E.N.T.E styling (reduce friction, group info)
glass_classes = """
.glass-panel-ui {
  background: rgba(0, 10, 20, 0.6);
  border: 1px solid rgba(0, 229, 255, 0.1);
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  backdrop-filter: blur(10px);
  width: 100%;
  box-sizing: border-box;
}
"""
css += glass_classes

with open('src/index.css', 'w') as f:
    f.write(css)

print("CSS Mobile First and MENTE updates applied.")

# --- APP.JSX UPDATES ---
with open('src/App.jsx', 'r') as f:
    app = f.read()

# Apply glass-panel-ui to side items
app = app.replace('<div className="goals-widget">', '<div className="goals-widget glass-panel-ui">')
app = app.replace('<div className="pdf-node-container">', '<div className="pdf-node-container glass-panel-ui">')
app = app.replace('<div className="communication-circle"', '<div className="communication-circle glass-panel-ui"')
app = app.replace('<div className="date-circle-container">', '<div className="date-circle-container glass-panel-ui" style={{display: "flex", flexDirection: "column", alignItems: "center"}}>')
app = app.replace('<div className="drive-sync-widget"', '<div className="drive-sync-widget glass-panel-ui"')

with open('src/App.jsx', 'w') as f:
    f.write(app)

print("App.jsx Mobile First updates applied.")

