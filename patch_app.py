import re

with open('src/App.jsx', 'r') as f:
    content = f.read()

# 1. Add Draggable import
content = content.replace(
    "import remarkGfm from 'remark-gfm';",
    "import remarkGfm from 'remark-gfm';\nimport Draggable from 'react-draggable';"
)

# 2. Add reactor-active to hud-container
content = content.replace(
    '<div className="hud-layout">',
    '<div className={`hud-layout ${isTyping || isProcessingRAG ? \'reactor-active\' : \'\'}`}>'
)

# 3. Left column wrapper
content = content.replace(
    '<div className="hud-col-side">',
    '<Draggable handle=".draggable-handle">\n          <div className="hud-col-side" style={{position: \'absolute\', left: \'50px\', top: \'50px\', zIndex: 10}}>\n            <div className="draggable-handle" style={{cursor: \'move\', color: \'var(--hud-cyan-dim)\', fontSize: \'0.6rem\', padding: \'5px\', width: \'100%\'}}>::: DRAG :::</div>'
)
content = content.replace(
    '</div>\n\n        {/* CENTER COLUMN */}',
    '</div>\n        </Draggable>\n\n        {/* CENTER COLUMN */}'
)

# 4. Center column reactor
content = content.replace(
    '<div className="giant-reactor">',
    '<Draggable handle=".giant-reactor">\n          <div className="giant-reactor" style={{cursor: \'move\'}}>'
)
# Add matrix code to reactor
matrix_code = '''
            <div className={`ring-core-glow ${isTyping || isProcessingRAG ? 'thinking' : ''}`}></div>
            <div className="matrix-code-container">
              <div className="matrix-code-content">
                {Array.from({length: 20}).map((_, i) => (
                  <span key={i}>0x{(Math.random()*100000).toString(16).substring(0,4)} INIT SYS<br/>SYS.CALL.{Math.floor(Math.random()*999)}<br/></span>
                ))}
              </div>
            </div>
          </div>
          </Draggable>'''
content = content.replace(
    '<div className={`ring-core-glow ${isTyping ? \'thinking\' : \'\'}`}></div>\n          </div>',
    matrix_code
)

# 5. Chat container
content = content.replace(
    '<div className="chat-container-floating">',
    '<Draggable handle=".draggable-handle">\n          <div className="chat-container-floating" style={{position: \'absolute\', bottom: \'20px\'}}>\n            <div className="draggable-handle" style={{cursor: \'move\', color: \'var(--hud-cyan-dim)\', fontSize: \'0.6rem\', padding: \'5px\', textAlign: \'center\'}}>::: DRAG TERMINAL :::</div>'
)
content = content.replace(
    '</form>\n          </div>\n        </div>',
    '</form>\n          </div>\n          </Draggable>\n        </div>'
)

# 6. Right column wrapper
content = content.replace(
    '<div className="hud-col-side" style={{alignItems: \'flex-end\'}}>',
    '<Draggable handle=".draggable-handle">\n          <div className="hud-col-side" style={{alignItems: \'flex-end\', position: \'absolute\', right: \'50px\', top: \'50px\', zIndex: 10}}>\n            <div className="draggable-handle" style={{cursor: \'move\', color: \'var(--hud-cyan-dim)\', fontSize: \'0.6rem\', padding: \'5px\', width: \'100%\', textAlign: \'right\'}}>::: DRAG :::</div>'
)
content = content.replace(
    '</div>\n\n      </div>\n    </div>',
    '</div>\n        </Draggable>\n\n      </div>\n    </div>'
)

with open('src/App.jsx', 'w') as f:
    f.write(content)

