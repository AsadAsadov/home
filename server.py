import os
import sqlite3
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, send_from_directory, render_template_string, redirect, url_for, session, jsonify

app = Flask(__name__)
app.secret_key = "pc_monitor_2026_secure"

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
    <body style="background:#050910; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
        <form method="post" style="background:#0f172a; padding:40px; border-radius:12px; width:320px; border: 1px solid #1e293b;">
            <h2 style="text-align:center; color:#22c55e; margin-bottom:25px; font-weight:500;">PC Monitoring</h2>
            <input name="email" placeholder="E-poçt" style="width:100%; padding:12px; margin-bottom:15px; background:#020617; border:1px solid #1f2937; color:white; border-radius:6px; box-sizing:border-box;">
            <input name="password" type="password" placeholder="Şifrə" style="width:100%; padding:12px; margin-bottom:20px; background:#020617; border:1px solid #1f2937; color:white; border-radius:6px; box-sizing:border-box;">
            <button style="width:100%; padding:12px; background:#22c55e; border:none; color:#020617; font-weight:bold; cursor:pointer; border-radius:6px; transition:0.3s;">GİRİŞ</button>
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
    """, (pc_name, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), active_w, active_p))
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
    cmd_type = request.form.get("type")
    val = request.form.get("val", "")
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE agents SET pending_command = ? WHERE name = ?", (f"{cmd_type}:{val}", name))
    conn.commit()
    conn.close()
    return redirect(url_for("dashboard"))

@app.route("/toggle_hide/<name>")
@login_required
def toggle_hide(name):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE agents SET is_hidden = 1 - is_hidden WHERE name = ?", (name,))
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
    
    agents_list = []
    hidden_list = []
    now = datetime.now()
    
    for a in all_agents:
        last_seen_dt = datetime.strptime(a["last_seen"], "%Y-%m-%d %H:%M:%S")
        is_online = (now - last_seen_dt).total_seconds() < 20
        
        agent_data = {
            "name": a["name"],
            "online": is_online,
            "last_time": last_seen_dt.strftime("%H:%M:%S"),
            "last_date": last_seen_dt.strftime("%d.%m.%Y"),
            "window": a["active_window"],
            "is_hidden": a["is_hidden"]
        }
        if a["is_hidden"]: hidden_list.append(agent_data)
        else: agents_list.append(agent_data)

    return render_template_string(HTML_TEMPLATE, agents=agents_list, hidden=hidden_list)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PC Monitoring</title>
    <style>
        body { margin: 0; background: #020617; color: #f1f5f9; font-family: 'Inter', system-ui, sans-serif; display: flex; height: 100vh; overflow: hidden; }
        .sidebar { width: 220px; background: #0f172a; border-right: 1px solid #1e293b; display: flex; flex-direction: column; }
        .sidebar-header { padding: 24px 20px; border-bottom: 1px solid #1e293b; font-weight: 600; color: #22c55e; letter-spacing: 0.5px; }
        .sidebar-menu { flex: 1; padding: 15px; overflow-y: auto; }
        .sidebar-item { padding: 10px; margin-bottom: 8px; border-radius: 6px; background: #1e293b; font-size: 12px; display: flex; justify-content: space-between; align-items: center; }
        .main-content { flex: 1; display: flex; flex-direction: column; overflow-y: auto; }
        header { padding: 15px 30px; background: #020617; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; padding: 30px; }
        .card { background: #0f172a; border-radius: 10px; border: 1px solid #1e293b; overflow: hidden; transition: all 0.3s ease; }
        .card:hover { border-color: #22c55e; transform: translateY(-3px); box-shadow: 0 4px 20px rgba(34, 197, 94, 0.1); }
        .screen-img { width: 100%; height: 160px; object-fit: cover; background: #000; cursor: pointer; border-bottom: 1px solid #1e293b; }
        .card-info { padding: 15px; }
        .pc-header { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; margin-bottom: 10px; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .online { background: #22c55e; box-shadow: 0 0 8px #22c55e; }
        .offline { background: #ef4444; }
        .meta { font-size: 11px; color: #94a3b8; margin: 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .input-group { display: flex; gap: 6px; margin-top: 12px; }
        input { flex: 1; background: #020617; border: 1px solid #1e293b; color: white; font-size: 11px; padding: 6px 10px; border-radius: 4px; outline: none; }
        .btn { padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; border: 1px solid #334155; background: transparent; color: #f1f5f9; transition: 0.2s; }
        .btn-msg:hover { border-color: #22c55e; color: #22c55e; }
        .btn-kill:hover { border-color: #ef4444; color: #ef4444; }
        #overlay { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:1000; justify-content:center; align-items:center; }
        #overlay img { max-width: 92%; max-height: 92%; border: 1px solid #22c55e; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="sidebar-header">PC Monitoring</div>
        <div class="sidebar-menu">
            <div style="color:#64748b; font-size:10px; text-transform:uppercase; margin-bottom:12px; font-weight:bold;">Gizlədilənlər ({{ hidden|length }})</div>
            {% for h in hidden %}
            <div class="sidebar-item">
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:600;">{{ h.name }}</span>
                    <span style="font-size:9px; color:#94a3b8;">{{ h.last_time }} | {{ h.last_date }}</span>
                </div>
                <a href="/toggle_hide/{{ h.name }}" style="color:#22c55e; text-decoration:none; font-size:10px;">AÇ</a>
            </div>
            {% endfor %}
        </div>
    </div>

    <div class="main-content">
        <header>
            <div style="font-size:14px; font-weight:500;">İşçi Masaları</div>
            <a href="/logout" style="color:#64748b; text-decoration:none; font-size:12px;">Çıxış</a>
        </header>

        <div class="grid">
            {% for a in agents %}
            <div class="card">
                <img src="/screens/{{ a.name }}_last.jpg" class="screen-img" onclick="fullScreen(this.src)">
                <div class="card-info">
                    <div class="pc-header">
                        <div class="status-dot {{ 'online' if a.online else 'offline' }}"></div>
                        {{ a.name }}
                        <span style="font-size:10px; color:#64748b; font-weight:normal; margin-left:auto;">
                            {{ a.last_time if a.online else a.last_time + ' (Offline)' }}
                        </span>
                    </div>
                    <div class="meta"><b>Pəncərə:</b> {{ a.window or 'Masaüstü' }}</div>
                    
                    <form action="/send_command/{{ a.name }}" method="POST" class="input-group">
                        <input name="val" placeholder="Mesaj yazın...">
                        <input type="hidden" name="type" value="msg">
                        <button class="btn btn-msg">Göndər</button>
                    </form>
                    
                    <div style="display:flex; gap:6px; margin-top:8px;">
                        <form action="/send_command/{{ a.name }}" method="POST" style="flex:1;">
                            <input type="hidden" name="type" value="cmd">
                            <input type="hidden" name="val" value="shutdown">
                            <button class="btn btn-kill" style="width:100%;">Söndür</button>
                        </form>
                        <a href="/toggle_hide/{{ a.name }}" style="flex:1;"><button class="btn" style="width:100%;">Gizlət</button></a>
                    </div>
                </div>
            </div>
            {% endfor %}
        </div>
    </div>

    <div id="overlay" onclick="this.style.display='none'"><img id="fullImg"></div>

    <script>
        let currentFullImgSrc = "";
        function fullScreen(src) {
            currentFullImgSrc = src.split('?')[0]; 
            document.getElementById('fullImg').src = src;
            document.getElementById('overlay').style.display = 'flex';
        }
        setInterval(function(){
            let timestamp = new Date().getTime();
            let images = document.getElementsByClassName('screen-img');
            for(let img of images) { img.src = img.src.split('?')[0] + '?t=' + timestamp; }
            if (document.getElementById('overlay').style.display === 'flex') {
                document.getElementById('fullImg').src = currentFullImgSrc + '?t=' + timestamp;
            }
        }, 3000);
    </script>
</body>
</html>
"""

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050)
