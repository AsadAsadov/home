import os
import sqlite3
import time
import zipfile
from contextlib import closing
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path

from flask import (
    Flask,
    jsonify,
    redirect,
    render_template_string,
    request,
    send_from_directory,
    session,
    url_for,
    send_file,
    Response,
)

UPLOAD_FOLDER = Path("screens")
VIDEO_FOLDER = Path("videos")
DB_PATH = Path("monitor.db")
ADMIN_EMAIL = "adminbesthome@gmail.com"
ADMIN_PASSWORD = "AA161235aa"
ONLINE_SECONDS = 10
KEEP_SCREEN_SECONDS = 180
CLEANUP_INTERVAL_SECONDS = 30

UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
VIDEO_FOLDER.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)
app.secret_key = "besthome_monitor_secret_123"
LAST_CLEANUP = 0.0
RECORD_REQUESTS = {} # pc_name: timestamp

def utcnow_iso():
    return datetime.now(timezone.utc).isoformat()

def parse_utc(ts):
    return datetime.fromisoformat(ts)

def humanize_time(last_seen_dt):
    now = datetime.now(timezone.utc)
    diff = now - last_seen_dt
    seconds = int(diff.total_seconds())

    if seconds < 5:
        return "indi"
    if seconds < 60:
        return f"{seconds} san əvvəl"
    if seconds < 3600:
        minutes = seconds // 60
        return f"{minutes} dəq əvvəl"
    if seconds < 86400:
        hours = seconds // 3600
        return f"{hours} saat əvvəl"
    return last_seen_dt.strftime("%d.%m %H:%M")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    with closing(get_db()) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS agents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                display_name TEXT,
                last_seen TEXT NOT NULL,
                active_window TEXT,
                active_process TEXT,
                cpu_usage REAL DEFAULT 0,
                ram_usage REAL DEFAULT 0,
                os_name TEXT DEFAULT '',
                os_version TEXT DEFAULT '',
                hidden INTEGER DEFAULT 0,
                group_id INTEGER DEFAULT NULL,
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                color TEXT DEFAULT '#38bdf8'
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS screenshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_name TEXT,
                filename TEXT,
                created_at TEXT
            )
            """
        )

        columns = {row[1] for row in cur.execute("PRAGMA table_info(agents)").fetchall()}
        migrations = {
            "display_name": "ALTER TABLE agents ADD COLUMN display_name TEXT",
            "group_id": "ALTER TABLE agents ADD COLUMN group_id INTEGER DEFAULT NULL",
        }
        for column, sql in migrations.items():
            if column not in columns:
                cur.execute(sql)

        conn.commit()

def login_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not session.get("logged_in"):
            return redirect(url_for("login"))
        return func(*args, **kwargs)

    return wrapper

def cleanup_storage():
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=KEEP_SCREEN_SECONDS)
    cutoff_iso = cutoff.isoformat()

    with closing(get_db()) as conn:
        cur = conn.cursor()
        old_rows = cur.execute(
            "SELECT filename FROM screenshots WHERE created_at <?", (cutoff_iso,)
        ).fetchall()

        for row in old_rows:
            path = UPLOAD_FOLDER / row["filename"]
            try:
                if path.exists():
                    path.unlink()
            except OSError:
                pass

        cur.execute("DELETE FROM screenshots WHERE created_at <?", (cutoff_iso,))
        conn.commit()

def maybe_cleanup():
    global LAST_CLEANUP
    if time.time() - LAST_CLEANUP >= CLEANUP_INTERVAL_SECONDS:
        cleanup_storage()
        LAST_CLEANUP = time.time()

def fetch_all_data():
    with closing(get_db()) as conn:
        cur = conn.cursor()
        agents = cur.execute(
            """
            SELECT a.*, g.name as group_name, g.color as group_color
            FROM agents a
            LEFT JOIN groups g ON a.group_id = g.id
            ORDER BY a.name ASC
            """
        ).fetchall()
        groups = cur.execute("SELECT * FROM groups ORDER BY name ASC").fetchall()

    now = datetime.now(timezone.utc)
    online_cutoff = now - timedelta(seconds=ONLINE_SECONDS)

    online_agents = []
    offline_agents = []
    hidden_agents = []
    total_cpu = 0
    total_ram = 0
    agent_count = 0

    for row in agents:
        last_seen = parse_utc(row["last_seen"])
        agent = {
            "name": row["name"],
            "display_name": row["display_name"] or row["name"],
            "active_window": row["active_window"] or "—",
            "active_process": row["active_process"] or "—",
            "last_seen_human": humanize_time(last_seen),
            "last_seen_ts": last_seen.timestamp(),
            "cpu_usage": row["cpu_usage"] or 0,
            "ram_usage": row["ram_usage"] or 0,
            "os_display": " ".join(p for p in [row["os_name"] or "", row["os_version"] or ""] if p) or "Naməlum",
            "online": last_seen >= online_cutoff,
            "hidden": row["hidden"],
            "group_id": row["group_id"],
            "group_name": row["group_name"],
            "group_color": row["group_color"] or "#38bdf8",
        }

        if not row["hidden"]:
            total_cpu += agent["cpu_usage"]
            total_ram += agent["ram_usage"]
            agent_count += 1

        if row["hidden"] == 1:
            hidden_agents.append(agent)
        elif agent["online"]:
            online_agents.append(agent)
        else:
            offline_agents.append(agent)

    stats = {
        "total": len(agents),
        "online": len(online_agents),
        "avg_cpu": round(total_cpu / agent_count, 1) if agent_count else 0,
        "avg_ram": round(total_ram / agent_count, 1) if agent_count else 0,
    }

    return online_agents, offline_agents, hidden_agents, [dict(g) for g in groups], stats

@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        if request.form.get("email") == ADMIN_EMAIL and request.form.get("password") == ADMIN_PASSWORD:
            session["logged_in"] = True
            return redirect(url_for("dashboard"))
        error = "Email və ya şifrə yanlışdır."

    return render_template_string(
        """
        <!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
        <title>BestHome Monitor</title>
        <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#050910;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:-apple-system,sans-serif;color:#fff;padding:16px}
       .card{background:#0f172a;padding:20px;border-radius:16px;width:100%;max-width:320px;border:1px solid #1e293b}h2{font-size:18px;margin-bottom:16px;text-align:center}
        label{font-size:13px;color:#94a3b8;margin-bottom:6px;display:block}input{width:100%;padding:10px 12px;border-radius:8px;margin-bottom:12px;border:1px solid #1f2937;background:#020617;color:#fff;font-size:14px}
        input:focus{outline:none;border-color:#22c55e}button{width:100%;padding:11px;border-radius:8px;background:#22c55e;border:none;cursor:pointer;font-weight:600;font-size:15px;color:#000}
        button:active{background:#16a34a}.error{background:#7f1d1d;padding:10px;border-radius:8px;margin-bottom:12px;font-size:13px;text-align:center}</style></head>
        <body><div class="card"><h2>BestHome Monitor</h2>{% if error %}<div class="error">{{ error }}</div>{% endif %}
        <form method="POST"><label>Email</label><input name="email" type="email" required><label>Şifrə</label><input name="password" type="password" required><button>Giriş</button></form></div></body></html>
        """, error=error)

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/upload", methods=["POST"])
def upload():
    maybe_cleanup()
    pc_name = (request.form.get("pc_name") or "").strip()
    screenshot = request.files.get("screenshot")
    if not pc_name or screenshot is None:
        return "Invalid", 400

    now = datetime.now(timezone.utc)
    screenshot.save(UPLOAD_FOLDER / f"{pc_name}_last.jpg")

    with closing(get_db()) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO agents (name, display_name, last_seen, active_window, active_process, cpu_usage, ram_usage, os_name, os_version)
            VALUES (?,?,?,?,?,?,?,?,?)
            ON CONFLICT(name) DO UPDATE SET
                last_seen=excluded.last_seen, active_window=excluded.active_window, active_process=excluded.active_process,
                cpu_usage=excluded.cpu_usage, ram_usage=excluded.ram_usage, os_name=excluded.os_name, os_version=excluded.os_version
            """,
            (pc_name, pc_name, now.isoformat(), request.form.get("active_window", ""), request.form.get("active_process", ""),
             float(request.form.get("cpu_usage", 0) or 0), float(request.form.get("ram_usage", 0) or 0),
             request.form.get("os_name", ""), request.form.get("os_version", "")),
        )
        conn.commit()
    return "OK", 200

@app.route("/api/command/<pc_name>")
def get_command(pc_name):
    # 2 dəqiqəlik qeydiyyat sorğusu
    if RECORD_REQUESTS.get(pc_name) and time.time() - RECORD_REQUESTS[pc_name] < 5:
        RECORD_REQUESTS.pop(pc_name, None)
        return jsonify({"command": "record", "duration": 120})
    return jsonify({"command": "none"})

@app.route("/upload_video", methods=["POST"])
def upload_video():
    pc_name = request.form.get("pc_name")
    video = request.files.get("video")
    if not pc_name or not video:
        return "Invalid", 400

    # Videonu birbaşa brauzerə göndər, serverdə saxlama
    video_path = VIDEO_FOLDER / f"{pc_name}_{int(time.time())}.mp4"
    video.save(video_path)

    # Faylı göndər və sil
    response = send_file(video_path, as_attachment=True, download_name=f"{pc_name}_record.mp4")

    @response.call_on_close
    def cleanup():
        try:
            video_path.unlink()
        except:
            pass
    return response

@app.route("/agent/<name>/record", methods=["POST"])
@login_required
def request_record(name):
    RECORD_REQUESTS[name] = time.time()
    return jsonify({"ok": True})

@app.route("/agent/<name>/hide", methods=["POST"])
@login_required
def hide_agent(name):
    with closing(get_db()) as conn:
        conn.execute("UPDATE agents SET hidden = 1 WHERE name =?", (name,))
        conn.commit()
    return redirect(url_for("dashboard"))

@app.route("/agent/<name>/unhide", methods=["POST"])
@login_required
def unhide_agent(name):
    with closing(get_db()) as conn:
        conn.execute("UPDATE agents SET hidden = 0 WHERE name =?", (name,))
        conn.commit()
    return redirect(url_for("dashboard"))

@app.route("/agent/<name>/rename", methods=["POST"])
@login_required
def rename_agent(name):
    new_name = request.form.get("display_name", "").strip()
    if new_name:
        with closing(get_db()) as conn:
            conn.execute("UPDATE agents SET display_name =? WHERE name =?", (new_name, name))
            conn.commit()
    return redirect(url_for("dashboard"))

@app.route("/agent/<name>/set_group", methods=["POST"])
@login_required
def set_group(name):
    group_id = request.form.get("group_id")
    if group_id == "0": group_id = None
    with closing(get_db()) as conn:
        conn.execute("UPDATE agents SET group_id =? WHERE name =?", (group_id, name))
        conn.commit()
    return redirect(url_for("dashboard"))

@app.route("/group/create", methods=["POST"])
@login_required
def create_group():
    name = request.form.get("name", "").strip()
    color = request.form.get("color", "#38bdf8")
    if name:
        with closing(get_db()) as conn:
            try:
                conn.execute("INSERT INTO groups (name, color) VALUES (?,?)", (name, color))
                conn.commit()
            except sqlite3.IntegrityError:
                pass
    return redirect(url_for("dashboard"))

@app.route("/group/<int:group_id>/delete", methods=["POST"])
@login_required
def delete_group(group_id):
    with closing(get_db()) as conn:
        conn.execute("DELETE FROM groups WHERE id =?", (group_id,))
        conn.commit()
    return redirect(url_for("dashboard"))

@app.route("/screens/<path:filename>")
@login_required
def screens(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route("/api/agents")
@login_required
def api_agents():
    online, offline, hidden, groups, stats = fetch_all_data()
    return jsonify({"online": online, "offline": offline, "hidden": hidden, "groups": groups, "stats": stats})

@app.route("/agent/<name>")
@login_required
def agent_detail(name):
    with closing(get_db()) as conn:
        row = conn.execute("SELECT * FROM agents WHERE name =?", (name,)).fetchone()
    if row is None:
        return redirect(url_for("dashboard"))

    last_seen = parse_utc(row["last_seen"])
    agent = {
        "name": row["name"], "display_name": row["display_name"] or row["name"],
        "active_window": row["active_window"] or "—", "active_process": row["active_process"] or "—",
        "last_seen_human": humanize_time(last_seen), "last_seen_ts": last_seen.timestamp(),
        "cpu_usage": row["cpu_usage"] or 0, "ram_usage": row["ram_usage"] or 0,
        "os_display": " ".join(p for p in [row["os_name"] or "", row["os_version"] or ""] if p) or "Naməlum",
    }

    return render_template_string(
        """
        <!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>{{ a.display_name }}</title>
        <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#020617;color:#e5e7eb;font-family:-apple-system,sans-serif;padding:12px}
       .card{border:1px solid #1e293b;border-radius:12px;padding:14px;background:#0f172a;max-width:700px;margin:0 auto}
       .meta{margin-top:10px;font-size:13px;color:#cbd5e1;line-height:1.6}img{width:100%;border-radius:8px;margin-top:10px;cursor:pointer}
        a{color:#38bdf8;text-decoration:none;font-size:14px}.fullscreen{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:none;justify-content:center;align-items:center;z-index:999}
       .fullscreen img{max-width:95%;max-height:95%;width:auto;height:auto;object-fit:contain}.close{position:absolute;top:15px;right:20px;font-size:36px;color:#fff;cursor:pointer}
       .rec-btn{background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;margin-top:10px}
       .rec-btn:disabled{background:#64748b}</style>
        <script>
            let agentName = "{{ a.name }}";
            function openFullscreen(src){document.getElementById('fsimg').src=src;document.getElementById('fullscreen').style.display='flex'}
            function closeFullscreen(){document.getElementById('fullscreen').style.display='none'}
            document.addEventListener('keydown',e=>{if(e.key==='Escape')closeFullscreen()});

            function startRecord(){
                document.getElementById('recbtn').disabled=true;
                document.getElementById('recbtn').textContent='Qeydiyyat başladı...';
                fetch('/agent/'+agentName+'/record',{method:'POST'}).then(()=>alert('2 dəqiqəlik qeydiyyat başladı. Bitəndə avtomatik yüklənəcək.'));
                setTimeout(()=>{document.getElementById('recbtn').disabled=false;document.getElementById('recbtn').textContent='● 2 Dəq Qeydiyyat'},5000);
            }

            function refreshData(){
                fetch('/api/agents').then(r=>r.json()).then(data=>{
                    const agent=[...data.online,...data.offline,...data.hidden].find(x=>x.name===agentName);
                    if(agent){
                        document.getElementById('img').src=`/screens/${agent.name}_last.jpg?t=${agent.last_seen_ts}`;
                        document.getElementById('lastseen').textContent=agent.last_seen_human;
                        document.getElementById('cpu').textContent=agent.cpu_usage.toFixed(1);
                        document.getElementById('ram').textContent=agent.ram_usage.toFixed(1);
                        document.getElementById('window').textContent=agent.active_window;
                        document.getElementById('process').textContent=agent.active_process;
                    }
                });
            }
            setInterval(refreshData, 1000);
        </script></head><body><a href="/">← Geri</a><div class="card">
        <h3>{{ a.display_name }}</h3><small style="color:#94a3b8;">PC: {{ a.name }}</small>
        <button id="recbtn" class="rec-btn" onclick="startRecord()">● 2 Dəq Qeydiyyat</button>
        <img id="img" onclick="openFullscreen(this.src)" src="/screens/{{ a.name }}_last.jpg?t={{ a.last_seen_ts }}">
        <div class="meta">Son aktivlik: <span id="lastseen">{{ a.last_seen_human }}</span><br>
        Prosessor: <span id="cpu">{{ '%.1f'|format(a.cpu_usage) }}</span>% | Yaddaş: <span id="ram">{{ '%.1f'|format(a.ram_usage) }}</span>%<br>
        ƏS: {{ a.os_display }}<br>Pəncərə: <span id="window">{{ a.active_window }}</span><br>Proses: <span id="process">{{ a.active_process }}</span></div>
        <div id="fullscreen" class="fullscreen" onclick="closeFullscreen()"><span class="close" onclick="closeFullscreen()">&times;</span><img id="fsimg" src=""></div>
        </body></html>
        """, a=agent)

@app.route("/")
@login_required
def dashboard():
    maybe_cleanup()
    online, offline, hidden, groups, stats = fetch_all_data()

    return render_template_string(
        """
        <!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Dashboard</title>
        <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#020617;color:#e5e7eb;font-family:-apple-system,sans-serif}
        header{padding:10px 12px;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#020617;z-index:100}
       .stats{background:#0f172a;margin:10px 12px;padding:10px;border-radius:10px;border:1px solid #1e293b;font-size:12px;display:flex;gap:16px;flex-wrap:wrap}
       .stat-item span{color:#38bdf8;font-weight:600}.search{padding:0 12px 10px}.search input{width:100%;padding:8px 12px;border-radius:8px;border:1px solid #1e293b;background:#0f172a;color:#fff;font-size:14px}
       .section{padding:10px 12px 4px;font-size:15px;font-weight:600;color:#e5e7eb;display:flex;justify-content:space-between;align-items:center;cursor:pointer}
       .section.arrow{transition:transform 0.2s}.section.collapsed.arrow{transform:rotate(-90deg)}
       .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;padding:0 12px 12px}
       .grid.hidden{display:none}.card{border:1px solid #1e293b;border-radius:10px;padding:10px;background:#0f172a;position:relative}
       .menu-btn{background:none;border:none;color:#94a3b8;cursor:pointer;font-size:18px;padding:0 4px}
       .menu-box{position:absolute;right:8px;top:32px;background:#1e293b;border:1px solid #334155;border-radius:8px;display:none;z-index:10;min-width:120px}
       .menu-box button,.menu-box a{background:none;border:none;color:#fff;padding:8px 12px;width:100%;text-align:left;cursor:pointer;font-size:13px;display:block;text-decoration:none}
       .menu-box button:active,.menu-box a:active{background:#334155}.meta{margin-top:6px;font-size:11px;color:#94a3b8;line-height:1.5}
       .pc-name{color:#38bdf8;cursor:pointer;text-decoration:none;font-weight:600;font-size:14px}.pc-name:hover{text-decoration:underline}
       .screen-img{width:100%;border-radius:6px;margin-top:6px;max-height:140px;object-fit:cover;cursor:pointer}
       .fullscreen{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:none;justify-content:center;align-items:center;z-index:999}
       .fullscreen img{max-width:95%;max-height:95%;width:auto;height:auto;object-fit:contain}.close{position:absolute;top:15px;right:20px;font-size:36px;color:#fff;cursor:pointer}
       .status{margin-top:3px;font-size:11px}.loading{position:fixed;top:50px;right:12px;background:#22c55e;color:#000;padding:4px 10px;border-radius:6px;font-size:11px;display:none;z-index:200}
       .bar{height:4px;background:#1e293b;border-radius:2px;margin-top:3px;overflow:hidden}.bar-fill{height:100%;transition:width 0.3s}
       .group-tag{font-size:10px;padding:2px 6px;border-radius:4px;margin-left:6px}
       .modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:none;justify-content:center;align-items:center;z-index:999}
       .modal-content{background:#0f172a;padding:20px;border-radius:12px;border:1px solid #1e293b;max-width:300px;width:90%}
       .modal input,.modal select{width:100%;padding:8px 10px;border-radius:6px;border:1px solid #1e293b;background:#020617;color:#fff;margin-bottom:10px}
       .modal button{width:100%;padding:9px;border-radius:6px;border:none;cursor:pointer;font-weight:600;margin-top:5px}
       .btn-primary{background:#22c55e;color:#000}.btn-danger{background:#ef4444;color:#fff}
        </style>
        <script>
            let allData = {};
            function toggleMenu(name){document.querySelectorAll('.menu-box').forEach(el=>{if(el.id!=='menu_'+name)el.style.display='none'});const el=document.getElementById('menu_'+name);el.style.display=el.style.display==='block'?'none':'block';event.stopPropagation()}
            function openFullscreen(src){document.getElementById('fsimg').src=src;document.getElementById('fullscreen').style.display='flex';event.stopPropagation()}
            function closeFullscreen(){document.getElementById('fullscreen').style.display='none'}
            function toggleSection(id){document.getElementById(id).classList.toggle('hidden');document.getElementById(id+'-section').classList.toggle('collapsed')}
            function showModal(id){document.getElementById(id).style.display='flex'}
            function hideModal(id){document.getElementById(id).style.display='none'}
            function editName(name,current){document.getElementById('edit-name-input').value=current;document.getElementById('edit-name-form').action='/agent/'+name+'/rename';showModal('edit-modal')}
            function startRecord(name){fetch('/agent/'+name+'/record',{method:'POST'}).then(()=>alert('2 dəqiqəlik qeydiyyat başladı. Bitəndə avtomatik yüklənəcək.'))}
            document.addEventListener('keydown',e=>{if(e.key==='Escape')closeFullscreen()});
            document.addEventListener('click',()=>{document.querySelectorAll('.menu-box').forEach(el=>el.style.display='none')});

            function getBarColor(val){if(val>90)return'#ef4444';if(val>70)return'#f59e0b';return'#22c55e'}

            function renderCards(agents,isOnline,isHidden=false){
                if(agents.length===0)return'<div class="empty">Agent yoxdur.</div>';
                return agents.map(a=>`
                    <div class="card" data-name="${a.display_name.toLowerCase()}" data-group="${a.group_id||0}">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                            <div><a href="/agent/${a.name}" class="pc-name">${a.display_name}</a>
                            ${a.group_name?`<span class="group-tag" style="background:${a.group_color}20;color:${a.group_color}">${a.group_name}</span>`:''}<br>
                            <small style="color:#64748b;font-size:11px;">${a.name}</small></div>
                            <div><button class="menu-btn" onclick="toggleMenu('${isHidden?'h':''}${a.name}')">⋮</button>
                            <div id="menu_${isHidden?'h':''}${a.name}" class="menu-box">
                                <a href="#" onclick="editName('${a.name}','${a.display_name}');return false;">✏️ Adı dəyiş</a>
                                <a href="#" onclick="startRecord('${a.name}');return false;">● Qeydiyyat</a>
                                <form method="POST" action="/agent/${a.name}/set_group" style="padding:8px 12px;border-top:1px solid #334155">
                                    <select name="group_id" onchange="this.form.submit()" style="width:100%;background:#020617;color:#fff;border:1px solid #334155;border-radius:4px;padding:4px;font-size:12px">
                                        <option value="0">Qrupsuz</option>
                                        ${allData.groups.map(g=>`<option value="${g.id}" ${a.group_id==g.id?'selected':''}>${g.name}</option>`).join('')}
                                    </select>
                                </form>
                                ${isHidden?`<form method="POST" action="/agent/${a.name}/unhide"><button>👁 Göstər</button></form>`:`<form method="POST" action="/agent/${a.name}/hide"><button>👁 Gizlət</button></form>`}
                            </div></div></div>
                        <div class="status" style="color:${isHidden?'#64748b':isOnline?'#4ade80':'#f87171'};">● ${isHidden?'GİZLİ':isOnline?'ONLAYN':'OFLAYN'}</div>
                        <img onclick="openFullscreen(this.src)" class="screen-img" src="/screens/${a.name}_last.jpg?t=${a.last_seen_ts}" style="opacity:${isHidden?0.3:isOnline?1:0.5};">
                        <div class="meta">${a.last_seen_human}<br>
                        CPU ${a.cpu_usage.toFixed(0)}%<div class="bar"><div class="bar-fill" style="width:${a.cpu_usage}%;background:${getBarColor(a.cpu_usage)}"></div></div>
                        RAM ${a.ram_usage.toFixed(0)}%<div class="bar"><div class="bar-fill" style="width:${a.ram_usage}%;background:${getBarColor(a.ram_usage)}"></div></div>
                        ${a.active_window.substring(0,30)}</div>
                    </div>
                `).join('');
            }

            function updateDashboard(data){
                allData=data;
                document.getElementById('stat-total').textContent=data.stats.total;
                document.getElementById('stat-online').textContent=data.stats.online;
                document.getElementById('stat-cpu').textContent=data.stats.avg_cpu;
                document.getElementById('stat-ram').textContent=data.stats.avg_ram;
                document.getElementById('online-count').textContent=data.online.length;
                document.getElementById('offline-count').textContent=data.offline.length;
                document.getElementById('hidden-count').textContent=data.hidden.length;
                document.getElementById('online-grid').innerHTML=renderCards(data.online,true);
                document.getElementById('offline-grid').innerHTML=renderCards(data.offline,false);
                document.getElementById('hidden-grid').innerHTML=renderCards(data.hidden,false,true);
                filterSearch();
            }

            function filterSearch(){
                const term=document.getElementById('search').value.toLowerCase();
                document.querySelectorAll('.card').forEach(card=>{
                    const name=card.dataset.name||'';
                    card.style.display=name.includes(term)?'block':'none';
                });
            }

            function refreshData(){
                document.getElementById('loading').style.display='block';
                fetch('/api/agents').then(r=>r.json()).then(data=>{
                    updateDashboard(data);
                    setTimeout(()=>document.getElementById('loading').style.display='none',200);
                }).catch(()=>document.getElementById('loading').style.display='none');
            }

            setInterval(refreshData, 1000);
            document.addEventListener('DOMContentLoaded',()=>{
                allData={groups:{{ groups|tojson }}};
                refreshData();
            });
        </script></head><body>
        <div id="loading" class="loading">Yenilənir...</div>
        <header><div>BestHome Monitor</div><a href="/logout" style="color:#94a3b8;text-decoration:none;font-size:13px;">Çıxış</a></header>
        <div class="stats">
            <div class="stat-item">Cəmi: <span id="stat-total">{{ stats.total }}</span></div>
            <div class="stat-item">Onlayn: <span id="stat-online">{{ stats.online }}</span></div>
            <div class="stat-item">Orta CPU: <span id="stat-cpu">{{ stats.avg_cpu }}</span>%</div>
            <div class="stat-item">Orta RAM: <span id="stat-ram">{{ stats.avg_ram }}</span>%</div>
        </div>
        <div class="search"><input id="search" type="text" placeholder="🔍 PC axtar..." oninput="filterSearch()"></div>

        <div class="section" id="online-grid-section" onclick="toggleSection('online-grid')">
            <span>Onlayn (<span id="online-count">{{ online_agents|length }}</span>)</span><span class="arrow">▼</span>
        </div>
        <div class="grid" id="online-grid"></div>

        <div class="section collapsed" id="offline-grid-section" onclick="toggleSection('offline-grid')">
            <span>Oflayn (<span id="offline-count">{{ offline_agents|length }}</span>)</span><span class="arrow">▼</span>
        </div>
        <div class="grid hidden" id="offline-grid"></div>

        <div class="section collapsed" id="hidden-grid-section" onclick="toggleSection('hidden-grid')">
            <span>Gizlədilən (<span id="hidden-count">{{ hidden_agents|length }}</span>)</span><span class="arrow">▼</span>
        </div>
        <div class="grid hidden" id="hidden-grid"></div>

        <div style="padding:0 12px 12px"><button onclick="showModal('group-modal')" style="width:100%;padding:10px;border-radius:8px;background:#1e293b;border:1px solid #334155;color:#fff;cursor:pointer;font-size:13px;">+ Yeni Qrup Yarat</button></div>

        <div id="fullscreen" class="fullscreen" onclick="closeFullscreen()"><span class="close" onclick="closeFullscreen()">&times;</span><img id="fsimg" src=""></div>

        <div id="edit-modal" class="modal" onclick="hideModal('edit-modal')"><div class="modal-content" onclick="event.stopPropagation()">
            <h3 style="margin-bottom:12px;font-size:16px">PC Adını Dəyiş</h3>
            <form id="edit-name-form" method="POST"><input id="edit-name-input" name="display_name" type="text" required><button class="btn-primary">Yadda saxla</button></form>
            <button class="btn-danger" onclick="hideModal('edit-modal')">Ləğv et</button>
        </div></div>

        <div id="group-modal" class="modal" onclick="hideModal('group-modal')"><div class="modal-content" onclick="event.stopPropagation()">
            <h3 style="margin-bottom:12px;font-size:16px">Yeni Qrup</h3>
            <form method="POST" action="/group/create">
                <input name="name" type="text" placeholder="Qrup adı" required>
                <input name="color" type="color" value="#38bdf8">
                <button class="btn-primary">Yarat</button>
            </form>
            <button class="btn-danger" onclick="hideModal('group-modal')">Ləğv et</button>
            {% if groups %}<div style="margin-top:12px;border-top:1px solid #1e293b;padding-top:12px">
                {% for g in groups %}<form method="POST" action="/group/{{ g.id }}/delete" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                    <span style="color:{{ g.color }}">● {{ g.name }}</span><button style="background:#ef4444;color:#fff;border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer">Sil</button>
                </form>{% endfor %}</div>{% endif %}
        </div></div>
        </body></html>
        """,
        online_agents=online_agents, offline_agents=offline_agents, hidden_agents=hidden_agents, groups=groups, stats=stats
    )

init_db()
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=False)