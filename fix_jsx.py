with open('src/App.jsx', 'r') as f:
    app = f.read()

app = app.replace('<!-- hud-col-center removed -->', '')

with open('src/App.jsx', 'w') as f:
    f.write(app)

print("Fixed JSX.")
