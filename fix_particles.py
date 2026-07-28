with open('src/App.jsx', 'r') as f:
    app = f.read()

# Fix import
app = app.replace("import Particles, { initParticlesEngine } from '@tsparticles/react';", "import Particles from '@tsparticles/react';")

# Remove useEffect and useState for initParticles
state_hook = """  const [initParticles, setInitParticles] = useState(false);
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInitParticles(true);
    });
  }, []);"""
app = app.replace(state_hook, "")

# Fix JSX
app = app.replace("{initParticles && <Particles id=\"tsparticles\" options={particlesOptions} />}", "<Particles id=\"tsparticles\" options={particlesOptions} init={async (engine) => { await loadSlim(engine); }} />")

with open('src/App.jsx', 'w') as f:
    f.write(app)

print("Fixed tsparticles v4 syntax.")
