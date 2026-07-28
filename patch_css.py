with open('src/index.css', 'r') as f:
    css = f.read()

antigravity_css = """
/* ANTIGRAVITY HUD DESIGN */
.glass-panel {
  background: rgba(0, 15, 25, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 229, 255, 0.15);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(0, 229, 255, 0.05);
  border-radius: 12px;
  transition: all 0.3s ease-out;
  padding: 15px;
}

.glass-panel:hover {
  border-color: rgba(0, 229, 255, 0.4);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.7), inset 0 0 15px rgba(0, 229, 255, 0.1);
  transform: translateY(-2px);
}

.left-panel-3d {
  transform: perspective(1000px) rotateY(10deg);
  transform-style: preserve-3d;
  transition: transform 0.5s ease-out;
}
.left-panel-3d:hover {
  transform: perspective(1000px) rotateY(5deg);
}

.right-panel-3d {
  transform: perspective(1000px) rotateY(-10deg);
  transform-style: preserve-3d;
  transition: transform 0.5s ease-out;
}
.right-panel-3d:hover {
  transform: perspective(1000px) rotateY(-5deg);
}

.hud-container {
  perspective: 1500px;
}
"""

if "ANTIGRAVITY HUD DESIGN" not in css:
    with open('src/index.css', 'a') as f:
        f.write("\n" + antigravity_css)
