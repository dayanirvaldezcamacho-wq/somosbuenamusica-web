"""Genera index.html (web pública) a partir de prototipo.html.
En la versión pública no existe el rol de equipo/administración:
ninguna cuenta puede abrir las pantallas adm*. La administración
vive solo en /admin, protegido por Cloudflare Access."""
import sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
s = (root / 'admin' / 'index.html').read_text(encoding='utf-8')
def rep(old, new):
    global s
    assert s.count(old) == 1, ('no encontrado o repetido', old[:60])
    s = s.replace(old, new)
# 1. Sin barra de prototipo
rep('--pbh:48px;', '--pbh:0px;')
rep('.proto{position:fixed;', '.proto{display:none!important;position:fixed;')
# 2. Ninguna ruta de administración es accesible
rep("function gate(req,route){", "function gate(req,route){  if(req==='equipo')return 'e03';")
# 3. Nadie puede iniciar sesión como equipo
rep("function loginAs(role,email,name){", "function loginAs(role,email,name){if(role==='equipo')role='asistente';")
rep("if(k==='role'){", "if(k==='role'){if(v==='equipo')v='asistente';")
# 4. Si quedó un rol de equipo guardado en el navegador, se descarta
rep("const loggedIn=()=>", "if(S.role==='equipo'){S.role='visitante';S.name='';S.email=''}\nconst loggedIn=()=>")
# 5. En el dominio propio, el icono se sirve como archivo (mejor caché)
import re as _re
s = _re.sub(r'<link rel="icon" type="image/svg\+xml" href="data:[^"]+">', '<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="icon" type="image/svg+xml" href="/favicon.svg">', s, count=1)
(root / 'index.html').write_text(s, encoding='utf-8')
print('index.html generado')
