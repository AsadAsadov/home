import os
import sqlite3
from datetime import datetime
from functools import wraps
from flask import Flask, request, send_from_directory, render_template_string, redirect, url_for, session, jsonify

app = Flask(__name__)
app.secret_key = "realtime_monitor_key"

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

@app.route("/")
def dashboard():
    if not session.get("logged_in"): return redirect(url_for("login"))
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM agents")
    all_agents = cur.fetchall()
    conn.close()
    
    agents_list = []
    hidden_list = []
    now = datetime.now()
    
    for a in all_agents:
        last_seen_dt = datetime.fromisoformat(a["last_seen"])
        is_online = (now - last_seen_dt).total_seconds() < 7 # Daha həssas vaxt
        
        agent_data = {
            "name": a["name"],
            "online": is_online,
            "last_time": last_seen_dt.strftime("%H:%M:%S"),
            "window": a["active_window"],
            "is_hidden": a["is_hidden"]
        }
        if a.get("is_hidden"): hidden_list.append(agent_data)
        else: agents_list.append(agent_data)

    return render_template_string(HTML_TEMPLATE, agents=agents_list, hidden=hidden_list)

# Login və digər routlar eyni qalır...
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        if request.form.get("email") == ADMIN_EMAIL and request.form.get("password") == ADMIN_PASSWORD:
            session["logged_in"] = True
            return redirect(url_for("dashboard"))
    return "Login Page (Same as before)"

@app.route("/send_command/<name>", methods=["POST"])
def send_command(name):
    cmd_type, val = request.form.get("type"), request.form.get("val", "")
    conn = get_db()
    conn.execute("UPDATE agents SET pending_command = ? WHERE name = ?", (f"{cmd_type}:{val}", name))
    conn.commit()
    conn.close()
    return redirect(url_for("dashboard"))

@app.route("/screens/<filename>")
def get_screen(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PC Monitoring</title>
    <style>
        body { margin: 0; background: #020617; color: #f1f5f9; font-family: 'Inter', sans-serif; display: flex; height: 100vh; }
        .sidebar { width: 240px; background: #0f172a; border-right: 1px solid #1e293b; }
        .sidebar-header { padding: 25px; font-size: 18px; font-weight: bold; color: #22c55e; border-bottom: 1px solid #1e293b; }
        .sidebar-menu { padding: 20px; font-size: 14px; } /* Şrift böyüdüldü */
        .main-content { flex: 1; overflow-y: auto; background: #020617; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 25px; padding: 30px; }
        
        .card { background: #0f172a; border-radius: 12px; border: 1px solid #1e293b; position: relative; overflow: hidden; }
        .img-container { position: relative; width: 100%; height: 180px; background: #000; }
        .screen-img { width: 100%; height: 100%; object-fit: cover; }
        
        /* Offline Qatlaması */
        .offline-overlay { 
            display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(239, 68, 68, 0.6); color: white; font-weight: bold; font-size: 24px;
            justify-content: center; align-items: center; z-index: 10;
        }
        .is-offline .offline-overlay { display: flex; }
        
        .card-info { padding: 15px; }
        .status-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 5px; }
        .dot-online { background: #22c55e; box-shadow: 0 0 8px #22c55e; }
        .dot-offline { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
        
        .btn { padding: 8px; border-radius: 5px; cursor: pointer; font-size: 12px; border: 1px solid #334155; background: #1e293b; color: white; width: 100%; }
        .input-group { display: flex; gap: 5px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="sidebar-header">PC Monitoring</div>
        <div class="sidebar-menu">
            <b style="color:#64748b">GİZLİ SİYAHI</b><br><br>
            {% for h in hidden %}
                <div style="margin-bottom:10px;">● {{ h.name }}</div>
            {% endfor %}
        </div>
    </div>
    <div class="main-content">
        <div class="grid">
            {% for a in agents %}
            <div class="card {{ '' if a.online else 'is-offline' }}">
                <div class="img-container">
                    <div class="offline-overlay">OFFLINE</div>
                    <img src="/screens/{{ a.name }}_last.jpg" class="screen-img">
                </div>
                <div class="card-info">
                    <div style="font-weight:bold; margin-bottom:10px;">
                        <span class="status-dot {{ 'dot-online' if a.online else 'dot-offline' }}"></span>
                        {{ a.name }}
                    </div>
                    <form action="/send_command/{{ a.name }}" method="POST" class="input-group">
                        <input name="val" placeholder="Mesaj..." style="flex:1; background:#020617; border:1px solid #334155; color:white; padding:5px;">
                        <input type="hidden" name="type" value="msg">
                        <button class="btn" style="width:auto;">Göndər</button>
                    </form>
                </div>
            </div>
            {% endfor %}
        </div>
    </div>
    <script>
        setInterval(function(){
            // Səhifəni 1 saniyədən bir gizli şəkildə yeniləyir (şəkilləri təzələyir)
            let images = document.getElementsByClassName('screen-img');
            let t = new Date().getTime();
            for(let img of images) { img.src = img.src.split('?')[0] + '?t=' + t; }
            
            // Real vaxtda statusu yoxlamaq üçün səhifəni avtomatik reload edir (və ya AJAX istifadə edilə bilər)
            // Hazırda 5 saniyədən bir status yeniləməsi üçün:
            if(t % 5000 < 1000) { location.reload(); }
        }, 1000); 
    </script>
</body>
</html>
"""

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050)
