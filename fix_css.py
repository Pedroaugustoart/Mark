import re
with open('src/index.css', 'r') as f:
    css = f.read()

# Delete the commented block for body::before
css = re.sub(r'/\*\s*body::before\s*\{.*?\n\}\s*\*/', '', css, flags=re.DOTALL)

with open('src/index.css', 'w') as f:
    f.write(css)

print("Fixed CSS.")
