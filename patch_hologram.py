import re

# 1. Update CSS
with open('src/index.css', 'r') as f:
    css = f.read()

# Remove dotted background
css = re.sub(r'background-image: radial-gradient.*?;', '', css)
css = re.sub(r'background-size:.*?;', '', css)

# Update glass-panel-ui to Hologram style
old_glass = """.glass-panel-ui {
  background: rgba(0, 10, 20, 0.6);
  border: 1px solid rgba(0, 229, 255, 0.1);
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  backdrop-filter: blur(10px);
  width: 100%;
  box-sizing: border-box;
}"""

new_glass = """.glass-panel-ui {
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
}

/* Scanlines for hologram */
.glass-panel-ui::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15),
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: -1;
}

/* Animations */
@keyframes floatLeft {
  0% { transform: perspective(1000px) rotateY(15deg) translateY(0px); }
  50% { transform: perspective(1000px) rotateY(15deg) translateY(-10px); }
  100% { transform: perspective(1000px) rotateY(15deg) translateY(0px); }
}

@keyframes floatRight {
  0% { transform: perspective(1000px) rotateY(-15deg) translateY(0px); }
  50% { transform: perspective(1000px) rotateY(-15deg) translateY(-10px); }
  100% { transform: perspective(1000px) rotateY(-15deg) translateY(0px); }
}

@keyframes floatCenter {
  0% { transform: translateX(-50%) translateY(0px); }
  50% { transform: translateX(-50%) translateY(-10px); }
  100% { transform: translateX(-50%) translateY(0px); }
}
"""
css = css.replace(old_glass, new_glass)

# Add animations to desktop media query
css = css.replace('.hud-col-side.right-panel {\n    align-items: flex-end;\n  }', '.hud-col-side.right-panel {\n    align-items: flex-end;\n  }\n  .left-panel .glass-panel-ui {\n    animation: floatLeft 6s ease-in-out infinite;\n    transform-style: preserve-3d;\n  }\n  .right-panel .glass-panel-ui {\n    animation: floatRight 6s ease-in-out infinite;\n    transform-style: preserve-3d;\n    animation-delay: 1s;\n  }')

# Update chat container desktop animation
css = css.replace('transform: translateX(-50%);\n    height: 250px;', 'transform: translateX(-50%);\n    height: 250px;\n    animation: floatCenter 6s ease-in-out infinite;')

# Update chat container mobile styles to look like hologram
old_chat = """.chat-container-floating {
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
}"""

new_chat = """.chat-container-floating {
  width: 100%;
  max-width: 600px;
  height: 300px;
  background: rgba(0, 229, 255, 0.05);
  border: 2px solid var(--hud-cyan);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-shadow: 0 0 15px rgba(0, 229, 255, 0.3), inset 0 0 20px rgba(0, 229, 255, 0.15);
  backdrop-filter: blur(4px);
  margin-top: 20px;
  z-index: 20;
  position: relative;
  overflow: hidden;
}

.chat-container-floating::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15),
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: -1;
}"""
css = css.replace(old_chat, new_chat)

# Add particles canvas fix
css += "\n#tsparticles {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  z-index: 0;\n  pointer-events: none;\n}\n"

with open('src/index.css', 'w') as f:
    f.write(css)

# 2. Update App.jsx
with open('src/App.jsx', 'r') as f:
    app = f.read()

# Imports
app = app.replace("import remarkGfm from 'remark-gfm';", "import remarkGfm from 'remark-gfm';\nimport Particles, { initParticlesEngine } from '@tsparticles/react';\nimport { loadSlim } from '@tsparticles/slim';")

# State & Effect
state_injection = """  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [initParticles, setInitParticles] = useState(false);
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInitParticles(true);
    });
  }, []);

  const particlesOptions = {
    background: { color: { value: "transparent" } },
    fpsLimit: 60,
    interactivity: {
      events: { onHover: { enable: true, mode: "grab" } },
      modes: { grab: { distance: 150, links: { opacity: 0.5 } } }
    },
    particles: {
      color: { value: "#00e5ff" },
      links: { color: "#00e5ff", distance: 150, enable: true, opacity: 0.25, width: 1 },
      move: { direction: "none", enable: true, outModes: { default: "bounce" }, random: false, speed: 0.8, straight: false },
      number: { density: { enable: true, width: 800 }, value: 90 },
      opacity: { value: 0.4 },
      shape: { type: "circle" },
      size: { value: { min: 1, max: 2.5 } },
    },
    detectRetina: true,
  };
"""
app = app.replace("  const messagesEndRef = useRef(null);\n  const fileInputRef = useRef(null);", state_injection)

# JSX Injection
jsx_injection = """<div className={`hud-layout ${isTyping || isProcessingRAG ? "reactor-active" : ""}`}>
      {initParticles && <Particles id="tsparticles" options={particlesOptions} />}
"""
app = app.replace('<div className={`hud-layout ${isTyping || isProcessingRAG ? "reactor-active" : ""}`}>', jsx_injection)

with open('src/App.jsx', 'w') as f:
    f.write(app)

print("Hologram & Particles patch applied.")
