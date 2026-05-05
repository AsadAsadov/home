import os
import time
import sqlite3
import json
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, send_from_directory, render_template_string, redirect, url_for, session, jsonify

app = Flask(__name__)
app.secret_key = "besthome_monitor_2026_secret"

# ==============================
# KONFİQURASİYA
# ==============================
UPLOAD_FOLDER = "screens"
DB_PATH = "monitor.db"
ADMIN_EMAIL = "adminbesthome@gmail.com"
ADMIN_PASSWORD = "AA161235aa"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ==============================
# DB FUNKSİYALARI
# ==============================
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
            is_hidden INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ==============================
# LOGIN DECORATOR
# ==============================
def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("logged_in"):
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapper

# ==============================
# ROUTER-LAR
# ==============================

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        if request.form.get("email") == ADMIN_EMAIL and request.form.get("password") == ADMIN_PASSWORD:
            session["logged_in"] = True
            return redirect(url_for("dashboard"))
    
    return render_template_string("""
    <body style="background:#050910; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
        <form method="post" style="background:#0f172a; padding:30px; border-radius:15px; width:300px;">
            <h2 style="text-align:center; color:#22c55e;">BestHome Login</h2>
            <input name="email" placeholder="Email" style="width:100%; padding:10px; margin:10px 0; background:#020617; border:1px solid #1f2937; color:white;">
            <input name="password" type="password" placeholder="Şifrə" style="width:100%; padding:10px; margin:10px 0; background:#020617; border:1px solid #1f2937; color:white;">
            <button style="width:100%; padding:10px; background:#22c55e; border:none; color:#020617; font-weight:bold; cursor:pointer;">GİRİŞ</button>
        </form>
    </body>
    """)

@app.route("/upload", methods=["POST"])
def upload():
    pc_name = request.form.get("pc_name", "UNKNOWN")
    active_w = request.form.get("active_window", "")
    active_p = request.form.get("active_process", "")
    file = request.files.get("screenshot")

    if file:
        file.save(os.path.join(UPLOAD_FOLDER, f"{pc_name}_last.jpg"))

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO agents (name, last_seen, active_window, active_process)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
            last_seen=excluded.last_seen,
            active_window=excluded.active_window,
            active_process=excluded.active_process
    """, (pc_name, datetime.utcnow().isoformat(), active_w, active_p))
    conn.commit()
    conn.close()
    return "OK", 200

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

@app.route("/")
@login_required
def dashboard():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM agents")
    all_agents = cur.fetchall()
    conn.close()

    now = datetime.utcnow()
    agents_list = []
    hidden_list = []
    
    online_count = 0
    for a in all_agents:
        last_seen = datetime.fromisoformat(a["last_seen"])
        is_online = (now - last_seen).total_seconds() < 15
        if is_online: online_count += 1
        
        agent_data = {
            "name": a["name"],
            "online": is_online,
            "window": a["active_window"],
            "process": a["active_process"],
            "is_hidden": a["is_hidden"]
        }
        
        if a["is_hidden"]:
            hidden_list.append(agent_data)
        else:
            agents_list.append(agent_data)

    return render_template_string(HTML_TEMPLATE, agents=agents_list, hidden=hidden_list, online_count=online_count)

# ==============================
# MODERN DASHBOARD HTML
# ==============================
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>BestHome Live Monitor</title>
    <style>
        body { margin: 0; background: #020617; color: #e5e7eb; font-family: 'Segoe UI', sans-serif; display: flex; height: 100vh; overflow: hidden; }
        .sidebar { width: 260px; background: #0f172a; border-right: 1px solid #1e293b; display: flex; flex-direction: column; }
        .sidebar-header { padding: 20px; border-bottom: 1px solid #1e293b; font-weight: bold; color: #22c55e; display: flex; align-items: center; gap: 10px; }
        .sidebar-menu { flex: 1; overflow-y: auto; padding: 10px; }
        .sidebar-item { padding: 12px; margin: 5px 0; border-radius: 8px; cursor: pointer; transition: 0.3s; font-size: 14px; display: flex; justify-content: space-between; align-items: center; }
        .sidebar-item:hover { background: #1e293b; }
        .main-content { flex: 1; display: flex; flex-direction: column; overflow-y: auto; }
        header { padding: 15px 25px; background: #020617; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; padding: 25px; }
        .card { background: #0f172a; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden; transition: 0.3s; position: relative; }
        .card:hover { transform: translateY(-5px); border-color: #22c55e; }
        .screen-img { width: 100%; height: 180px; object-fit: cover; background: #000; cursor: pointer; }
        .card-info { padding: 15px; }
        .pc-name { font-weight: bold; font-size: 16px; margin-bottom: 5px; display: flex; align-items: center; gap: 8px; }
        .status-dot { width: 10px; height: 10px; border-radius: 50%; }
        .online { background: #22c55e; box-shadow: 0 0 10px #22c55e; }
        .offline { background: #ef4444; }
        .meta { font-size: 12px; color: #9ca3af; margin: 3px 0; }
        .btn-hide { background: transparent; border: 1px solid #334155; color: #9ca3af; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 11px; margin-top: 10px; }
        .unhide-btn { color: #22c55e; text-decoration: none; font-size: 12px; }
        #overlay { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:1000; justify-content:center; align-items:center; }
        #overlay img { max-width: 95%; max-height: 95%; border: 2px solid #22c55e; border-radius: 10px; }
    </style>
</head>
<body>

    <div class="sidebar">
        <div class="sidebar-header">
            <div style="background:#22c55e; color:#020617; padding:5px; border-radius:5px;">BH</div>
            BestHome Monitor
        </div>
        <div class="sidebar-menu">
            <div style="color:#64748b; font-size:11px; text-transform:uppercase; margin-bottom:10px; padding-left:10px;">Gizlədilən Kompüterlər ({{ hidden|length }})</div>
            {% for h in hidden %}
            <div class="sidebar-item">
                <span>{{ h.name }}</span>
                <a href="/toggle_hide/{{ h.name }}" class="unhide-btn">Göstər</a>
            </div>
            {% endfor %}
        </div>
        <div style="padding:20px; border-top:1px solid #1e293b; font-size:12px; color:#64748b;">
            Online: {{ online_count }}
        </div>
    </div>

    <div class="main-content">
        <header>
            <div style="font-size:18px;">Canlı Monitorinq <span style="color:#22c55e; font-size:14px; margin-left:10px;">● Real-Time</span></div>
            <a href="/logout" style="color:#9ca3af; text-decoration:none; font-size:14px;">Çıxış</a>
        </header>

        <div class="grid">
            {% for a in agents %}
            <div class="card">
                <img src="/screens/{{ a.name }}_last.jpg?t={{ range(1, 99999)|random }}" class="screen-img" onclick="fullScreen(this.src)">
                <div class="card-info">
                    <div class="pc-name">
                        <div class="status-dot {{ 'online' if a.online else 'offline' }}"></div>
                        {{ a.name }}
                    </div>
                    <div class="meta"><b>Proqram:</b> {{ a.process or 'N/A' }}</div>
                    <div class="meta" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><b>Pəncərə:</b> {{ a.window or 'N/A' }}</div>
                    <a href="/toggle_hide/{{ a.name }}"><button class="btn-hide">Gizlət</button></a>
                </div>
            </div>
            {% endfor %}
        </div>
    </div>

    <div id="overlay" onclick="this.style.display='none'">
        <img id="fullImg">
    </div>

    <script>
        let currentFullImgSrc = "";

        function fullScreen(src) {
            // Timestamp hissəsini silib təmiz linki yadda saxlayırıq
            currentFullImgSrc = src.split('?')[0]; 
            document.getElementById('fullImg').src = src;
            document.getElementById('overlay').style.display = 'flex';
        }

        // Real-zamanlı yeniləmə
        setInterval(function(){
            let timestamp = new Date().getTime();
            
            // 1. Kiçik kartlardakı şəkilləri yenilə
            let images = document.getElementsByClassName('screen-img');
            for(let img of images) {
                let baseSrc = img.src.split('?')[0];
                img.src = baseSrc + '?t=' + timestamp;
            }

            // 2. Böyük ekran açıqdırsa, onu da yenilə
            let overlay = document.getElementById('overlay');
            let fullImg = document.getElementById('fullImg');
            
            if (overlay.style.display === 'flex' && currentFullImgSrc !== "") {
                fullImg.src = currentFullImgSrc + '?t=' + timestamp;
            }
        }, 1000);
    </script>
</body>
</html>
"""

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050)
