import re

# 1. Update index.css
with open('src/index.css', 'r') as f:
    css = f.read()

# Change body background
css = css.replace(
    'background: linear-gradient(135deg, #0b101a 0%, #05080f 100%);',
    'background: linear-gradient(135deg, #020408 0%, #000000 100%);'
)
# Remove pseudo element texture
css = css.replace(
    'body::before {',
    '/* body::before {'
)
css = css.replace(
    'pointer-events: none;\n}',
    'pointer-events: none;\n} */'
)

# Refine glass-panel
css = css.replace(
    'background: rgba(0, 15, 25, 0.4);',
    'background: rgba(0, 5, 10, 0.6);'
)
css = css.replace(
    'border: 1px solid rgba(0, 229, 255, 0.15);',
    'border: 1px solid rgba(0, 229, 255, 0.15);\n  border-top: 1px solid rgba(0, 229, 255, 0.4);'
)

# Update hud-col-side width
css = css.replace(
    '.hud-col-side {\n  display: flex;\n  flex-direction: column;\n  width: 300px;\n  z-index: 2;\n}',
    '.hud-col-side {\n  display: flex;\n  flex-direction: column;\n  width: 350px;\n  z-index: 2;\n}'
)

# Fix hud-container
css = css.replace(
    '.hud-container {\n  position: relative;\n  z-index: 10;\n  display: flex;\n  justify-content: space-between;\n  align-items: stretch;\n  width: 100%;\n  height: 100%;\n}',
    '.hud-container {\n  position: relative;\n  z-index: 10;\n  width: 100%;\n  height: 100%;\n  perspective: 1500px;\n  overflow: hidden;\n}'
)
css = css.replace(
    '.hud-container {\n  perspective: 1500px;\n}',
    ''
)

with open('src/index.css', 'w') as f:
    f.write(css)

# 2. Update App.jsx
with open('src/App.jsx', 'r') as f:
    app = f.read()

# Left panel
app = app.replace(
    '<Draggable handle=".draggable-handle" bounds="parent">\n          <div className="hud-col-side left-panel-3d" style={{zIndex: 10}}>',
    '<Draggable handle=".draggable-handle" bounds="parent">\n          <div className="hud-col-side left-panel-3d" style={{position: "absolute", left: "50px", top: "50px", zIndex: 10}}>'
)
# Remove alignItems: flex-start which might be leftover
app = app.replace(
    '<div className="hud-col-side left-panel" style={{alignItems: \'flex-start\'}}>',
    '<div className="hud-col-side left-panel-3d" style={{position: "absolute", left: "50px", top: "50px", zIndex: 10}}>'
) # Fallback

# Right panel
app = app.replace(
    '<Draggable handle=".draggable-handle" bounds="parent">\n          <div className="hud-col-side right-panel-3d" style={{alignItems: \'flex-end\', zIndex: 10}}>',
    '<Draggable handle=".draggable-handle" bounds="parent">\n          <div className="hud-col-side right-panel-3d" style={{position: "absolute", right: "50px", top: "50px", zIndex: 10}}>'
)

# Reactor
app = app.replace(
    '<div className="hud-col-center">',
    '<!-- hud-col-center removed -->'
)
app = app.replace(
    '<!-- hud-col-center removed -->\n          <Draggable handle=".reactor-container">',
    '<Draggable handle=".reactor-container" bounds="parent">'
)
# Re-replace to fix reactor position
app = app.replace(
    '<Draggable handle=".reactor-container" bounds="parent">\n            <div className="reactor-container" style={{cursor: \'move\'}}>',
    '<Draggable handle=".reactor-container" bounds="parent">\n          <div className="reactor-container" style={{position: "absolute", left: "calc(50% - 250px)", top: "calc(50% - 250px)", cursor: "move"}}>'
) # 250px is half of reactor size (500x500 roughly). Adjusting to just absolute center.

# Chat terminal
app = app.replace(
    '<Draggable handle=".draggable-handle" bounds="parent">\n            <div className="chat-container-floating glass-panel" style={{marginTop: \'20px\', borderRadius: \'16px\'}}>',
    '<Draggable handle=".draggable-handle" bounds="parent">\n          <div className="chat-container-floating glass-panel" style={{position: "absolute", left: "calc(50% - 300px)", bottom: "20px", width: "600px", borderRadius: "16px"}}>'
)
app = app.replace(
    '</Draggable>\n        </div>\n\n        {/* RIGHT COLUMN */}',
    '</Draggable>\n\n        {/* RIGHT COLUMN */}'
)

with open('src/App.jsx', 'w') as f:
    f.write(app)

print("Patch applied.")
