import re

with open('src/App.jsx', 'r') as f:
    content = f.read()

# 1. Left side Draggable positioning fix
content = content.replace(
    '<Draggable handle=".draggable-handle">\n          <div className="hud-col-side" style={{position: \'absolute\', left: \'50px\', top: \'50px\', zIndex: 10}}>',
    '<Draggable handle=".draggable-handle" bounds="parent">\n          <div className="hud-col-side left-panel-3d" style={{zIndex: 10}}>'
)

# 2. Right side Draggable positioning fix
content = content.replace(
    '<Draggable handle=".draggable-handle">\n          <div className="hud-col-side" style={{alignItems: \'flex-end\', position: \'absolute\', right: \'50px\', top: \'50px\', zIndex: 10}}>',
    '<Draggable handle=".draggable-handle" bounds="parent">\n          <div className="hud-col-side right-panel-3d" style={{alignItems: \'flex-end\', zIndex: 10}}>'
)

# 3. Chat container position fix
content = content.replace(
    '<div className="chat-container-floating" style={{position: \'absolute\', bottom: \'20px\'}}>',
    '<div className="chat-container-floating glass-panel" style={{marginTop: \'20px\'}}>'
)

# 4. Add bounds to reactor and chat draggables
content = content.replace(
    '<Draggable handle=".giant-reactor">',
    '<Draggable handle=".giant-reactor" bounds="parent">'
)
content = content.replace(
    '<Draggable handle=".draggable-handle">\n          <div className="chat-container-floating',
    '<Draggable handle=".draggable-handle" bounds="parent">\n          <div className="chat-container-floating'
)

# 5. Add .glass-panel to inner elements in Left column
content = content.replace(
    '<GlobalClock />',
    '<div className="glass-panel" style={{width: "100%", marginBottom: "15px"}}><GlobalClock /></div>'
)
content = content.replace(
    '<div className="drive-sync-widget" style={{ marginTop: \'30px\' }}>',
    '<div className="drive-sync-widget glass-panel" style={{ marginTop: \'15px\', width: "100%", boxSizing: "border-box" }}>'
)
content = content.replace(
    '<div className="communication-circle" style={{cursor: \'pointer\', marginBottom: \'20px\'}} onClick={() => setShowHistoryModal(true)}>',
    '<div className="communication-circle glass-panel" style={{cursor: \'pointer\', marginBottom: \'15px\', width: "100%", boxSizing: "border-box", justifyContent: "flex-start"}} onClick={() => setShowHistoryModal(true)}>'
)
content = content.replace(
    '<div className="goals-widget">',
    '<div className="goals-widget glass-panel" style={{width: "100%", boxSizing: "border-box"}}>'
)

# 6. Add .glass-panel to Right column inner elements
content = content.replace(
    '<div className="pdf-node-container">',
    '<div className="pdf-node-container glass-panel" style={{width: "100%", boxSizing: "border-box"}}>'
)
content = content.replace(
    '<div style={{marginTop: \'40px\', textAlign: \'right\', fontSize: \'0.8rem\', lineHeight: \'1.8\'}}>',
    '<div className="glass-panel" style={{marginTop: \'15px\', textAlign: \'right\', fontSize: \'0.8rem\', lineHeight: \'1.8\', width: "100%", boxSizing: "border-box"}}>'
)
content = content.replace(
    '<div style={{marginTop: \'40px\', textAlign: \'right\', fontSize: \'0.8rem\'}}>',
    '<div className="glass-panel" style={{marginTop: \'15px\', textAlign: \'right\', fontSize: \'0.8rem\', width: "100%", boxSizing: "border-box"}}>'
)
content = content.replace(
    '<div className="atmosphere-container">',
    '<div className="atmosphere-container glass-panel" style={{width: "100%", boxSizing: "border-box", marginTop: "15px"}}>'
)

with open('src/App.jsx', 'w') as f:
    f.write(content)
