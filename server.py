import os
import sqlite3
from datetime import datetime
from functools import wraps
from flask import Flask, request, send_from_directory, render_template_string, redirect, url_for, session, jsonify

app = Flask(__name__)
app.secret_key = "realtime_monitor_final_v3"

UPLOAD_FOLDER = "screens"
DB_PATH = "monitor.db"
ADMIN_EMAIL = "adminbesthome@gmail.com"
ADMIN_PASSWORD = "AA161235aa"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()
    # 'alias' sütunu əlavə edildi ki, kompüterin adını dəyişə biləsən
    cur.execute("""
        CREATE TABLE IF NOT EXISTS agents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            alias TEXT DEFAULT NULL,
            last_seen TEXT,
            active_window TEXT,
            active_process TEXT,
            is_hidden INTEGER DEFAULT 0,
            pending_command TEXT DEFAULT NULL
        )
    """)
    conn.commit()
    conn.close()

init_db()

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("logged_in"): return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapper

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        if request.form.get("email") == ADMIN_EMAIL and request.form.get("password") == ADMIN_PASSWORD:
            session["logged_in"] = True
            return redirect(url_for("dashboard"))
    return render_template_string("""
    <body style="background:#020617; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
        <form method="post" style="background:#0f172a; padding:40px; border-radius:12px; width:320px; border: 1px solid #1e293b;">
            <h2 style="text-align:center; color:#22c55e; margin-bottom:25px;">Giriş</h2>
            <input name="email" placeholder="E-poçt" style="width:100%; padding:12px; margin-bottom:15px; background:#020617; border:1px solid #1f2937; color:white; border-radius:6px; box-sizing:border-box;">
            <input name="password" type="password" placeholder="Şifrə" style="width:100%; padding:12px; margin-bottom:20px; background:#020617; border:1px solid #1f2937; color:white; border-radius:6px; box-sizing:border-box;">
            <button style="width:100%; padding:12px; background:#22c55e; border:none; color:#020617; font-weight:bold; cursor:pointer; border-radius:6px;">DAXİL OL</button>
        </form>
    </body>
    """)

@app.route("/upload", methods=["POST"])
def upload():
    pc_name = request.form.get("pc_name", "UNKNOWN")
    active_w = request.form.get("active_window", "")
    active_p = request.form.get("active_process", "")
    file = request.files.get("screenshot")
    if file: file.save(os.path.join(UPLOAD_FOLDER, f"{pc_name}_last.jpg"))
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO agents (name, last_seen, active_window, active_process)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
            last_seen=excluded.last_seen,
            active_window=excluded.active_window,
            active_process=excluded.active_process
    """, (pc_name, datetime.now().isoformat(), active_w, active_p))
    cur.execute("SELECT pending_command FROM agents WHERE name = ?", (pc_name,))
    row = cur.fetchone()
    cmd = row["pending_command"] if row else None
    if cmd: cur.execute("UPDATE agents SET pending_command = NULL WHERE name = ?", (pc_name,))
    conn.commit()
    conn.close()
    return jsonify({"command": cmd})

@app.route("/rename/<name>", methods=["POST"])
@login_required
def rename_pc(name):
    new_alias = request.form.get("alias")
    conn = get_db()
    if not new_alias or new_alias.strip() == "":
        conn.execute("UPDATE agents SET alias = NULL WHERE name = ?", (name,))
    else:
        conn.execute("UPDATE agents SET alias = ? WHERE name = ?", (new_alias, name))
    conn.commit()
    conn.close()
    return redirect(url_for("dashboard"))

@app.route("/send_command/<name>", methods=["POST"])
@login_required
def send_command(name):
    cmd_type, val = request.form.get("type"), request.form.get("val", "")
    conn = get_db()
    conn.execute("UPDATE agents SET pending_command = ? WHERE name = ?", (f"{cmd_type}:{val}", name))
    conn.commit()
    conn.close()
    return redirect(url_for("dashboard"))

@app.route("/toggle_hide/<name>")
@login_required
def toggle_hide(name):
    conn = get_db()
    conn.execute("UPDATE agents SET is_hidden = 1 - is_hidden WHERE name = ?", (name,))
    conn.commit()
    conn.close()
    return redirect(url_for("dashboard"))

@app.route("/screens/<filename>")
@login_required
def get_screen(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/")
@login_required
def dashboard():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM agents")
    all_agents = cur.fetchall()
    conn.close()
    agents_list, hidden_list = [], []
    for a in all_agents:
        display_name = a["alias"] if a["alias"] else a["name"]
        agent_data = {"name": a["name"], "display": display_name, "window": a["active_window"]}
        if a["is_hidden"]: hidden_list.append(agent_data)
        else: agents_list.append(agent_data)
    return render_template_string(HTML_TEMPLATE, agents=agents_list, hidden=hidden_list)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PC Monitor</title>
    <style>
        body { margin: 0; background: #020617; color: #f1f5f9; font-family: sans-serif; display: flex; height: 100vh; overflow: hidden; }
        .sidebar { width: 180px; background: #0f172a; border-right: 1px solid #1e293b; display: flex; flex-direction: column; transition: 0.3s; }
        .sidebar-header { padding: 20px 15px; font-size: 16px; font-weight: bold; color: #22c55e; border-bottom: 1px solid #1e293b; }
        .sidebar-menu { flex: 1; padding: 15px; overflow-y: auto; font-size: 13px; }
        .main-content { flex: 1; display: flex; flex-direction: column; overflow-y: auto; }
        header { padding: 12px 25px; background: #020617; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 20px; padding: 25px; }
        .card { background: #0f172a; border-radius: 10px; border: 1px solid #1e293b; overflow: hidden; }
        .img-box { width: 100%; aspect-ratio: 16/9; background: #000; cursor: zoom-in; }
        .screen-img { width: 100%; height: 100%; object-fit: contain; }
        .card-info { padding: 12px; }
        .pc-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .btn { padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; border: 1px solid #334155; background: #1e293b; color: white; }
        .input-group { display: flex; gap: 5px; margin-top: 8px; }
        input { flex: 1; background: #020617; border: 1px solid #334155; color: white; padding: 6px; border-radius: 4px; font-size: 11px; outline: none; }
        
        #modal { display: none; position: fixed; z-index: 100; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); flex-direction: column; align-items: center; justify-content: center; }
        #modal-img { max-width: 95%; max-height: 80%; object-fit: contain; border: 1px solid #22c55e; }
        #close-btn { position: absolute; top: 15px; right: 25px; font-size: 35px; color: white; cursor: pointer; }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="sidebar-header">PC Monitor</div>
        <div class="sidebar-menu">
            <div style="color:#64748b; font-size:10px; margin-bottom:10px; letter-spacing:1px;">GİZLİ SİYAHI</div>
            {% for h in hidden %}
                <div style="margin-bottom:8px; font-size:12px; display:flex; justify-content:space-between;">
                    <span title="{{ h.name }}">{{ h.display }}</span>
                    <a href="/toggle_hide/{{ h.name }}" style="color:#22c55e; text-decoration:none;">+</a>
                </div>
            {% endfor %}
        </div>
    </div>

    <div class="main-content">
        <header><div style="font-size:14px;">Canlı İzləmə</div><a href="/logout" style="color:#ef4444; text-decoration:none; font-size:12px;">Çıxış</a></header>
        <div class="grid">
            {% for a in agents %}
            <div class="card">
                <div class="img-box" onclick="openModal('{{ a.name }}')">
                    <img src="/screens/{{ a.name }}_last.jpg" class="screen-img" id="img-{{ a.name }}">
                </div>
                <div class="card-info">
                    <div class="pc-title-row">
                        <form action="/rename/{{ a.name }}" method="POST" style="display:flex; gap:5px; flex:1;">
                            <input name="alias" value="{{ a.display }}" style="font-weight:bold; border:none; background:transparent; padding:0;" title="Adı dəyişmək üçün bura yazın və Enter sıxın">
                        </form>
                        <span style="font-size:10px; color:#475569;">{{ a.name }}</span>
                    </div>
                    
                    <form action="/send_command/{{ a.name }}" method="POST" class="input-group">
                        <input name="val" placeholder="Mesaj..." required>
                        <input type="hidden" name="type" value="msg">
                        <button class="btn">Göndər</button>
                    </form>
                    
                    <div style="display:flex; gap:5px; margin-top:10px;">
                        <a href="/toggle_hide/{{ a.name }}" style="flex:1;"><button class="btn" style="width:100%;">Gizlət</button></a>
                        <form action="/send_command/{{ a.name }}" method="POST" style="flex:1;">
                            <input type="hidden" name="type" value="cmd">
                            <input type="hidden" name="val" value="shutdown">
                            <button class="btn" style="width:100%; color:#ef4444;" onclick="return confirm('Söndürülsün?')">Söndür</button>
                        </form>
                    </div>
                </div>
            </div>
            {% endfor %}
        </div>
    </div>

    <div id="modal">
        <span id="close-btn" onclick="closeModal()">&times;</span>
        <img id="modal-img">
        <div style="margin-top:20px; width:400px;">
            <form id="modal-form" method="POST" class="input-group">
                <input name="val" id="modal-input" placeholder="Böyüdülmüş halda mesaj...">
                <input type="hidden" name="type" value="msg">
                <button class="btn">Göndər</button>
            </form>
        </div>
    </div>

    <script>
        let currentPc = null;
        function openModal(name) { currentPc = name; document.getElementById('modal').style.display = 'flex'; updateModalImg(); }
        function closeModal() { document.getElementById('modal').style.display = 'none'; currentPc = null; }
        function updateModalImg() { if(currentPc) { document.getElementById('modal-img').src = '/screens/' + currentPc + '_last.jpg?t=' + new Date().getTime(); } }

        setInterval(function(){
            let t = new Date().getTime();
            let images = document.getElementsByClassName('screen-img');
            for(let img of images) { img.src = img.src.split('?')[0] + '?t=' + t; }
            if(currentPc) { updateModalImg(); }
        }, 1000);
    </script>
</body>
</html>