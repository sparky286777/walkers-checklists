"""Builds index.html from src/page.html, with the logo built into the page.

Run from the repository root:  python3 src/build.py
"""
import base64, io, os
from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
img = Image.open(os.path.join(root, 'logo.png'))
img.thumbnail((320, 320))
buf = io.BytesIO()
img.save(buf, 'PNG', optimize=True)
logo = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

page = open(os.path.join(root, 'src', 'page.html'), encoding='utf-8').read()
open(os.path.join(root, 'index.html'), 'w', encoding='utf-8').write(page.replace('{{LOGO}}', logo))
print('index.html built')
