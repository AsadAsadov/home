import os
import sqlite3
from datetime import datetime
from functools import wraps
from flask import Flask, request, send_from_directory, render_template_string, redirect, url_for, session, jsonify

app = Flask(__name__)
app.secret_key = "realtime_monitor_ultra_2026"

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
    cur.execute("""
        CREATE TABLE IF NOT EXISTS agents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
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
            <h2 style="text-align:center; color:#22c55e; margin-bottom:25px;">Admin Girişi</h2>
            <input name="email" placeholder="E-poçt" style="width:100%; padding:12px; margin-bottom:15px; background:#020617; border:1px solid #1f2937; color:white; border-radius:6px; box-sizing:border-box;">
            <input name="password" type="password" placeholder="Şifrə" style="width:100%; padding:12px; margin-bottom:20px; background:#020617; border:1px solid #1f2937; color:white; border-radius:6px; box-sizing:border-box;">
            <button style="width:100%; padding:12px; background:#22c55e; border:none; color:#020617; font-weight:bold; cursor:pointer; border-radius:6px;">DAXİL OL</button>
        </form>
    </body>
    """)

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

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
        agent_data = {"name": a["name"], "window": a["active_window"]}
        if a["is_hidden"]: hidden_list.append(agent_data)
        else: agents_list.append(agent_data)
    return render_template_string(HTML_TEMPLATE, agents=agents_list, hidden=hidden_list)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PC Monitoring PRO</title>
    <style>
        body { margin: 0; background: #020617; color: #f1f5f9; font-family: 'Segoe UI', sans-serif; display: flex; height: 100vh; overflow: hidden; }
        .sidebar { width: 260px; background: #0f172a; border-right: 1px solid #1e293b; display: flex; flex-direction: column; }
        .sidebar-header { padding: 30px 20px; font-size: 22px; font-weight: bold; color: #22c55e; border-bottom: 1px solid #1e293b; }
        .sidebar-menu { flex: 1; padding: 20px; overflow-y: auto; }
        .main-content { flex: 1; display: flex; flex-direction: column; overflow-y: auto; }
        header { padding: 15px 30px; background: #020617; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 25px; padding: 30px; }
        .card { background: #0f172a; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden; }
        .img-box { width: 100%; height: 200px; background: #000; cursor: zoom-in; }
        .screen-img { width: 100%; height: 100%; object-fit: cover; }
        .card-info { padding: 15px; }
        .btn { padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; border: 1px solid #334155; background: #1e293b; color: white; transition: 0.2s; }
        .btn:hover { border-color: #22c55e; }
        .btn-danger { color: #ef4444; border-color: #450a0a; }
        .btn-danger:hover { background: #450a0a; border-color: #ef4444; }
        .input-group { display: flex; gap: 8px; margin-top: 10px; }
        input { flex: 1; background: #020617; border: 1px solid #334155; color: white; padding: 8px; border-radius: 6px; outline: none; }
        
        /* Modal (Böyüdülmüş Ekran) */
        #modal { display: none; position: fixed; z-index: 100; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); flex-direction: column; align-items: center; justify-content: center; }
        #modal-img { max-width: 90%; max-height: 70%; border: 2px solid #22c55e; border-radius: 8px; margin-bottom: 20px; }
        .modal-controls { background: #0f172a; padding: 20px; border-radius: 12px; border: 1px solid #1e293b; width: 500px; text-align: center; }
        #close-btn { position: absolute; top: 20px; right: 30px; font-size: 40px; color: white; cursor: pointer; font-weight: bold; }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="sidebar-header">PC Monitor</div>
        <div class="sidebar-menu">
            <div style="color:#64748b; font-size:12px; margin-bottom:10px;">GİZLİ CİHAZLAR</div>
            {% for h in hidden %}
                <div style="background:#1e293b; padding:8px; border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:14px;">{{ h.name }}</span>
                    <a href="/toggle_hide/{{ h.name }}" style="color:#22c55e; text-decoration:none; font-size:11px;">GÖSTƏR</a>
                </div>
            {% endfor %}
        </div>
    </div>

    <div class="main-content">
        <header><div style="font-weight:bold; color:#22c55e;">Canlı İzləmə</div><a href="/logout" style="color:#ef4444; text-decoration:none; font-size:13px;">Çıxış</a></header>
        <div class="grid">
            {% for a in agents %}
            <div class="card">
                <div class="img-box" onclick="openModal('{{ a.name }}')">
                    <img src="/screens/{{ a.name }}_last.jpg" class="screen-img" id="img-{{ a.name }}">
                </div>
                <div class="card-info">
                    <div style="font-weight:bold; margin-bottom:5px;">{{ a.name }}</div>
                    <div style="font-size:11px; color:#64748b; margin-bottom:10px; height:15px; overflow:hidden;">{{ a.window or 'Masaüstü' }}</div>
                    
                    <form action="/send_command/{{ a.name }}" method="POST" class="input-group">
                        <input name="val" placeholder="Təcili mesaj..." required>
                        <input type="hidden" name="type" value="msg">
                        <button class="btn">Göndər</button>
                    </form>
                    
                    <div style="display:flex; gap:8px; margin-top:10px;">
                        <a href="/toggle_hide/{{ a.name }}" style="flex:1;"><button class="btn" style="width:100%;">Gizlət</button></a>
                        <form action="/send_command/{{ a.name }}" method="POST" style="flex:1;">
                            <input type="hidden" name="type" value="cmd">
                            <input type="hidden" name="val" value="shutdown">
                            <button class="btn btn-danger" style="width:100%;" onclick="return confirm('Söndürülsün?')">Söndür</button>
                        </form>
                    </div>
                </div>
            </div>
            {% endfor %}
        </div>
    </div>

    <!-- Böyüdülmüş Görünüş Modalı -->
    <div id="modal">
        <span id="close-btn" onclick="closeModal()">&times;</span>
        <img id="modal-img">
        <div class="modal-controls">
            <h3 id="modal-title" style="margin-top:0; color:#22c55e;">PC</h3>
            <form id="modal-form" method="POST" class="input-group">
                <input name="val" id="modal-input" placeholder="Böyüdülmüş halda mesaj göndər..." required>
                <input type="hidden" name="type" value="msg">
                <button class="btn">Göndər</button>
            </form>
        </div>
    </div>

    <script>
        let currentPc = null;

        function openModal(name) {
            currentPc = name;
            document.getElementById('modal').style.display = 'flex';
            document.getElementById('modal-title').innerText = name;
            document.getElementById('modal-form').action = '/send_command/' + name;
            updateModalImg();
        }

        function closeModal() {
            document.getElementById('modal').style.display = 'none';
            currentPc = null;
        }

        function updateModalImg() {
            if(currentPc) {
                let t = new Date().getTime();
                document.getElementById('modal-img').src = '/screens/' + currentPc + '_last.jpg?t=' + t;
            }
        }

        // Şəkilləri və Modal-ı saniyədə bir yenilə (Refresh olmadan)
        setInterval(function(){
            let t = new Date().getTime();
            // Grid-dəki şəkillər
            let images = document.getElementsByClassName('screen-img');
            for(let img of images) {
                let base = img.src.split('?')[0];
                img.src = base + '?t=' + t;
            }
            // Modal açıqdırsa onu da yenilə
            if(currentPc) { updateModalImg(); }
        }, 1000);
    </script>
</body>
</html>
"""

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050)
