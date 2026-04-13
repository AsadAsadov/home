import os
import sqlite3
import time
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
)

UPLOAD_FOLDER = Path("screens")
DB_PATH = Path("monitor.db")
ADMIN_EMAIL = "adminbesthome@gmail.com"
ADMIN_PASSWORD = "AA161235aa"
ONLINE_SECONDS = 10
KEEP_SCREEN_SECONDS = 180
CLEANUP_INTERVAL_SECONDS = 30

UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)
app.secret_key = "besthome_monitor_secret_123"
LAST_CLEANUP = 0.0

def utcnow_iso():
    return datetime.now(timezone.utc).isoformat()

def parse_utc(ts):
    return datetime.fromisoformat(ts)

def humanize_time(last_seen_dt):
    now = datetime.now(timezone.utc)
    diff = now - last_seen_dt
    seconds = int(diff.total_seconds())

    if seconds < 10:
        return "just now"
    if seconds < 60:
        return f"{seconds}s ago"
    if seconds < 3600:
        minutes = seconds // 60
        return f"{minutes}m ago"
    if seconds < 86400:
        hours = seconds // 3600
        return f"{hours}h ago"
    return last_seen_dt.strftime("%m-%d %H:%M")

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
                last_seen TEXT NOT NULL,
                active_window TEXT,
                active_process TEXT,
                process_list TEXT,
                cpu_usage REAL DEFAULT 0,
                ram_usage REAL DEFAULT 0,
                os_name TEXT DEFAULT '',
                os_version TEXT DEFAULT '',
                hidden INTEGER DEFAULT 0
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
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_name TEXT UNIQUE,
                full_name TEXT,
                department TEXT,
                role TEXT,
                note TEXT
            )
            """
        )

        columns = {row[1] for row in cur.execute("PRAGMA table_info(agents)").fetchall()}
        migrations = {
            "cpu_usage": "ALTER TABLE agents ADD COLUMN cpu_usage REAL DEFAULT 0",
            "ram_usage": "ALTER TABLE agents ADD COLUMN ram_usage REAL DEFAULT 0",
            "os_name": "ALTER TABLE agents ADD COLUMN os_name TEXT DEFAULT ''",
            "os_version": "ALTER TABLE agents ADD COLUMN os_version TEXT DEFAULT ''",
            "hidden": "ALTER TABLE agents ADD COLUMN hidden INTEGER DEFAULT 0",
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

    for path in UPLOAD_FOLDER.glob("*.jpg"):
        if path.name.endswith("_last.jpg"):
            continue
        try:
            if path.stat().st_mtime < cutoff.timestamp():
                path.unlink()
        except OSError:
            continue

def maybe_cleanup():
    global LAST_CLEANUP
    if time.time() - LAST_CLEANUP >= CLEANUP_INTERVAL_SECONDS:
        cleanup_storage()
        LAST_CLEANUP = time.time()

def fetch_agents_data():
    with closing(get_db()) as conn:
        cur = conn.cursor()
        rows = cur.execute(
            """
            SELECT a.*, e.full_name, e.department, e.role
            FROM agents a
            LEFT JOIN employees e ON e.agent_name = a.name
            ORDER BY a.name ASC
            """
        ).fetchall()

    now = datetime.now(timezone.utc)
    online_cutoff = now - timedelta(seconds=ONLINE_SECONDS)

    online_agents = []
    offline_agents = []
    hidden_agents = []

    for row in rows:
        last_seen = parse_utc(row["last_seen"])
        agent = {
            "name": row["name"],
            "display_name": row["full_name"] or row["name"],
            "department": row["department"] or "",
            "role": row["role"] or "",
            "active_window": row["active_window"] or "—",
            "active_process": row["active_process"] or "—",
            "last_seen": last_seen,
            "last_seen_human": humanize_time(last_seen),
            "last_seen_ts": last_seen.timestamp(),
            "cpu_usage": row["cpu_usage"] if row["cpu_usage"] is not None else 0,
            "ram_usage": row["ram_usage"] if row["ram_usage"] is not None else 0,
            "os_display": " ".join(
                part for part in [row["os_name"] or "", row["os_version"] or ""] if part
            )
            or "Unknown",
            "online": last_seen >= online_cutoff,
            "hidden": row["hidden"],
        }

        if row["hidden"] == 1:
            hidden_agents.append(agent)
        elif agent["online"]:
            online_agents.append(agent)
        else:
            offline_agents.append(agent)

    return online_agents, offline_agents, hidden_agents

@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        if (
            request.form.get("email") == ADMIN_EMAIL
            and request.form.get("password") == ADMIN_PASSWORD
        ):
            session["logged_in"] = True
            return redirect(url_for("dashboard"))
        error = "Email və ya şifrə yanlışdır."

    return render_template_string(
        """
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
            <title>BestHome Monitor</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { background:#050910; display:flex; justify-content:center; align-items:center; min-height:100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#fff; padding:16px; }
             .card { background:#0f172a; padding:20px; border-radius:16px; width:100%; max-width:320px; border:1px solid #1e293b; }
                h2 { font-size:18px; margin-bottom:16px; text-align:center; }
                label { font-size:13px; color:#94a3b8; margin-bottom:6px; display:block; }
                input { width:100%; padding:10px 12px; border-radius:8px; margin-bottom:12px; border:1px solid #1f2937; background:#020617; color:#fff; font-size:14px; }
                input:focus { outline:none; border-color:#22c55e; }
                button { width:100%; padding:11px; border-radius:8px; background:#22c55e; border:none; cursor:pointer; font-weight:600; font-size:15px; color:#000; }
                button:active { background:#16a34a; }
             .error { background:#7f1d1d; padding:10px; border-radius:8px; margin-bottom:12px; font-size:13px; text-align:center; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>BestHome Monitor</h2>
                {% if error %}<div class="error">{{ error }}</div>{% endif %}
                <form method="POST">
                    <label>Email</label>
                    <input name="email" type="email" placeholder="admin@besthome.com" required>
                    <label>Şifrə</label>
                    <input name="password" type="password" placeholder="••••••••" required>
                    <button>Giriş</button>
                </form>
            </div>
        </body>
        </html>
        """,
        error=error,
    )

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
    ts = now.strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"{pc_name}_{ts}.jpg"

    file_path = UPLOAD_FOLDER / filename
    screenshot.save(file_path)

    screenshot.stream.seek(0)
    screenshot.save(UPLOAD_FOLDER / f"{pc_name}_last.jpg")

    active_window = request.form.get("active_window", "")
    active_process = request.form.get("active_process", "")
    process_list = request.form.get("process_list", "")

    try:
        cpu_usage = float(request.form.get("cpu_usage", "0") or 0)
    except ValueError:
        cpu_usage = 0.0
    try:
        ram_usage = float(request.form.get("ram_usage", "0") or 0)
    except ValueError:
        ram_usage = 0.0

    os_name = request.form.get("os_name", "")
    os_version = request.form.get("os_version", "")

    with closing(get_db()) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO agents (
                name, last_seen, active_window, active_process, process_list,
                cpu_usage, ram_usage, os_name, os_version
            ) VALUES (?,?,?,?,?,?,?,?,?)
            ON CONFLICT(name) DO UPDATE SET
                last_seen=excluded.last_seen,
                active_window=excluded.active_window,
                active_process=excluded.active_process,
                process_list=excluded.process_list,
                cpu_usage=excluded.cpu_usage,
                ram_usage=excluded.ram_usage,
                os_name=excluded.os_name,
                os_version=excluded.os_version
            """,
            (
                pc_name,
                now.isoformat(),
                active_window,
                active_process,
                process_list,
                cpu_usage,
                ram_usage,
                os_name,
                os_version,
            ),
        )
        cur.execute(
            "INSERT INTO screenshots (agent_name, filename, created_at) VALUES (?,?,?)",
            (pc_name, filename, now.isoformat()),
        )
        conn.commit()

    return "OK", 200

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

@app.route("/agent/<name>/delete", methods=["POST"])
@login_required
def delete_agent(name):
    with closing(get_db()) as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM agents WHERE name =?", (name,))
        cur.execute("DELETE FROM employees WHERE agent_name =?", (name,))
        cur.execute("DELETE FROM screenshots WHERE agent_name =?", (name,))
        conn.commit()

    for path in UPLOAD_FOLDER.glob(f"{name}*.jpg"):
        try:
            path.unlink()
        except OSError:
            pass

    return redirect(url_for("dashboard"))

@app.route("/screens/<path:filename>")
@login_required
def screens(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route("/api/agents")
@login_required
def api_agents():
    online_agents, offline_agents, hidden_agents = fetch_agents_data()
    return jsonify({
        "online": online_agents,
        "offline": offline_agents,
        "hidden": hidden_agents
    })

@app.route("/agent/<name>")
@login_required
def agent_detail(name):
    with closing(get_db()) as conn:
        cur = conn.cursor()
        row = cur.execute(
            """
            SELECT a.*, e.full_name, e.department, e.role
            FROM agents a
            LEFT JOIN employees e ON e.agent_name = a.name
            WHERE a.name =?
            """,
            (name,),
        ).fetchone()

    if row is None:
        return redirect(url_for("dashboard"))

    last_seen = parse_utc(row["last_seen"])
    agent = {
        "name": row["name"],
        "display_name": row["full_name"] or row["name"],
        "department": row["department"] or "",
        "role": row["role"] or "",
        "active_window": row["active_window"] or "—",
        "active_process": row["active_process"] or "—",
        "last_seen": last_seen,
        "last_seen_human": humanize_time(last_seen),
        "last_seen_ts": last_seen.timestamp(),
        "cpu_usage": row["cpu_usage"] if row["cpu_usage"] is not None else 0,
        "ram_usage": row["ram_usage"] if row["ram_usage"] is not None else 0,
        "os_display": " ".join(
            part for part in [row["os_name"] or "", row["os_version"] or ""] if part
        )
        or "Unknown",
        "hidden": row["hidden"],
    }

    return render_template_string(
        """
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <title>{{ a.display_name }}</title>
            <style>
                * { box-sizing:border-box; margin:0; padding:0; }
                body{background:#020617;color:#e5e7eb;font-family:-apple-system,sans-serif;padding:12px;}
             .card{border:1px solid #1e293b;border-radius:12px;padding:14px;background:#0f172a;max-width:700px;margin:0 auto;}
             .meta{margin-top:10px;font-size:13px;color:#cbd5e1;line-height:1.6;}
                img{width:100%;border-radius:8px;margin-top:10px;cursor:pointer;}
                a{color:#38bdf8;text-decoration:none;font-size:14px;}
             .fullscreen{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:none;justify-content:center;align-items:center;z-index:999;}
             .fullscreen img{max-width:95%;max-height:95%;width:auto;height:auto;object-fit:contain;}
             .close{position:absolute;top:15px;right:20px;font-size:36px;color:#fff;cursor:pointer;}
            </style>
            <script>
                function openFullscreen(src){
                    document.getElementById('fsimg').src = src;
                    document.getElementById('fullscreen').style.display = 'flex';
                }
                function closeFullscreen(){
                    document.getElementById('fullscreen').style.display = 'none';
                }
                document.addEventListener('keydown', function(e){
                    if(e.key === 'Escape') closeFullscreen();
                });

                // Auto refresh hər 2 saniyə
                setInterval(function(){
                    fetch('/api/agents').then(r=>r.json()).then(data=>{
                        const agent = [...data.online,...data.offline,...data.hidden].find(x=>x.name==="{{ a.name }}");
                        if(agent){
                            location.reload();
                        }
                    });
                }, 2000);
            </script>
        </head>
        <body>
            <a href="/">← Geri</a>
            <div class="card">
                <h3>{{ a.display_name }}</h3>
                <small style="color:#94a3b8;">PC: {{ a.name }}</small>
                <img onclick="openFullscreen(this.src)" src="/screens/{{ a.name }}_last.jpg?t={{ a.last_seen_ts }}">
                <div class="meta">
                    Last seen: {{ a.last_seen_human }}<br>
                    CPU: {{ '%.1f'|format(a.cpu_usage) }}% | RAM: {{ '%.1f'|format(a.ram_usage) }}%<br>
                    OS: {{ a.os_display }}<br>
                    Window: {{ a.active_window }}<br>
                    Process: {{ a.active_process }}<br>
                    Status: {% if a.hidden %}Gizli{% else %}Görünür{% endif %}
                </div>
            <div id="fullscreen" class="fullscreen" onclick="closeFullscreen()">
                <span class="close" onclick="closeFullscreen()">&times;</span>
                <img id="fsimg" src="">
            </div>
        </body>
        </html>
        """,
        a=agent,
    )

@app.route("/")
@login_required
def dashboard():
    maybe_cleanup()
    online_agents, offline_agents, hidden_agents = fetch_agents_data()

    return render_template_string(
        """
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <title>Dashboard</title>
            <style>
                * { box-sizing:border-box; margin:0; padding:0; }
                body{background:#020617;color:#e5e7eb;font-family:-apple-system,sans-serif;}
                header{padding:10px 12px;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#020617;z-index:100;}
                header div{font-weight:600;font-size:15px;}
             .section{padding:10px 12px 4px;font-size:15px;font-weight:600;color:#e5e7eb;}
             .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;padding:0 12px 12px;}
             .card{border:1px solid #1e293b;border-radius:10px;padding:10px;background:#0f172a;position:relative;}
             .menu-btn{background:none;border:none;color:#94a3b8;cursor:pointer;font-size:18px;padding:0 4px;}
             .menu-box{position:absolute;right:8px;top:32px;background:#1e293b;border:1px solid #334155;border-radius:8px;display:none;z-index:10;min-width:100px;}
             .menu-box button{background:none;border:none;color:#fff;padding:8px 12px;width:100%;text-align:left;cursor:pointer;font-size:13px;}
             .menu-box button:active{background:#334155;}
             .meta{margin-top:6px;font-size:11px;color:#94a3b8;line-height:1.5;}
             .empty{padding:0 12px 12px;color:#64748b;font-size:13px;}
             .pc-name{color:#38bdf8;cursor:pointer;text-decoration:none;font-weight:600;font-size:14px;}
             .pc-name:hover{text-decoration:underline;}
             .screen-img{width:100%;border-radius:6px;margin-top:6px;max-height:140px;object-fit:cover;cursor:pointer;}
             .fullscreen{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:none;justify-content:center;align-items:center;z-index:999;}
             .fullscreen img{max-width:95%;max-height:95%;width:auto;height:auto;object-fit:contain;}
             .close{position:absolute;top:15px;right:20px;font-size:36px;color:#fff;cursor:pointer;}
             .status{margin-top:3px;font-size:11px;}
             .loading{position:fixed;top:50px;right:12px;background:#22c55e;color:#000;padding:4px 10px;border-radius:6px;font-size:11px;display:none;z-index:200;}
            </style>
            <script>
                function toggleMenu(name){
                    document.querySelectorAll('.menu-box').forEach(el => {
                        if(el.id!== 'menu_'+name) el.style.display='none';
                    });
                    const el=document.getElementById('menu_'+name);
                    el.style.display=el.style.display==='block'?'none':'block';
                    event.stopPropagation();
                }
                function openFullscreen(src){
                    document.getElementById('fsimg').src = src;
                    document.getElementById('fullscreen').style.display = 'flex';
                    event.stopPropagation();
                }
                function closeFullscreen(){
                    document.getElementById('fullscreen').style.display = 'none';
                }
                document.addEventListener('keydown', function(e){
                    if(e.key === 'Escape') closeFullscreen();
                });
                document.addEventListener('click', function(){
                    document.querySelectorAll('.menu-box').forEach(el => el.style.display='none');
                });

                // AUTO REFRESH - əsas məsələ budur
                function updateDashboard(data){
                    document.getElementById('online-count').textContent = data.online.length;
                    document.getElementById('offline-count').textContent = data.offline.length;
                    document.getElementById('hidden-count').textContent = data.hidden.length;

                    renderSection('online-grid', data.online, true);
                    renderSection('offline-grid', data.offline, false);
                    renderSection('hidden-grid', data.hidden, false, true);
                }

                function renderSection(gridId, agents, isOnline, isHidden=false){
                    const grid = document.getElementById(gridId);
                    if(agents.length === 0){
                        grid.innerHTML = '<div class="empty">Agent yoxdur.</div>';
                        return;
                    }

                    grid.innerHTML = agents.map(a => `
                        <div class="card">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                                <div>
                                    <a href="/agent/${a.name}" class="pc-name">${a.display_name}</a><br>
                                    <small style="color:#64748b;font-size:11px;">${a.name}</small>
                                </div>
                                <div>
                                    <button class="menu-btn" onclick="toggleMenu('${isHidden?'h':''}${a.name}')">⋮</button>
                                    <div id="menu_${isHidden?'h':''}${a.name}" class="menu-box">
                                        ${isHidden
                                           ? `<form method="POST" action="/agent/${a.name}/unhide"><button>👁 Göstər</button></form>`
                                            : `<form method="POST" action="/agent/${a.name}/hide"><button>👁 Gizlət</button></form>`
                                        }
                                        <form method="POST" action="/agent/${a.name}/delete" onsubmit="return confirm('Silmək istəyirsiniz?')">
                                            <button style="color:#f87171">🗑 Sil</button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                            <div class="status" style="color:${isHidden?'#64748b':isOnline?'#4ade80':'#f87171'};">● ${isHidden?'GİZLİ':isOnline?'ONLINE':'OFFLINE'}</div>
                            <img onclick="openFullscreen(this.src)" class="screen-img" src="/screens/${a.name}_last.jpg?t=${a.last_seen_ts}" style="opacity:${isHidden?0.3:isOnline?1:0.5};">
                            <div class="meta">
                                ${a.last_seen_human} | CPU ${a.cpu_usage.toFixed(0)}% | RAM ${a.ram_usage.toFixed(0)}%<br>
                                ${a.active_window.substring(0,30)}
                            </div>
                        </div>
                    `).join('');
                }

                function refreshData(){
                    const loader = document.getElementById('loading');
                    loader.style.display = 'block';
                    fetch('/api/agents')
                       .then(r => r.json())
                       .then(data => {
                            updateDashboard(data);
                            setTimeout(()=>loader.style.display='none', 300);
                        })
                       .catch(()=>loader.style.display='none');
                }

                // Hər 2 saniyədən bir yenilə
                setInterval(refreshData, 2000);

                // İlk yükləmədə də çağır
                document.addEventListener('DOMContentLoaded', refreshData);
            </script>
        </head>
        <body>
            <div id="loading" class="loading">Yenilənir...</div>
            <header>
                <div>BestHome Monitor</div>
                <a href="/logout" style="color:#94a3b8;text-decoration:none;font-size:13px;">Çıxış</a>
            </header>

            <div class="section">Online (<span id="online-count">{{ online_agents|length }}</span>)</div>
            <div class="grid" id="online-grid">
                {% for a in online_agents %}
                <div class="card">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                        <div>
                            <a href="/agent/{{ a.name }}" class="pc-name">{{ a.display_name }}</a><br>
                            <small style="color:#64748b;font-size:11px;">{{ a.name }}</small>
                        </div>
                        <div>
                            <button class="menu-btn" onclick="toggleMenu('{{ a.name }}')">⋮</button>
                            <div id="menu_{{ a.name }}" class="menu-box">
                                <form method="POST" action="/agent/{{ a.name }}/hide"><button>👁 Gizlət</button></form>
                                <form method="POST" action="/agent/{{ a.name }}/delete" onsubmit="return confirm('Silmək istəyirsiniz?')">
                                    <button style="color:#f87171">🗑 Sil</button>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div class="status" style="color:#4ade80;">● ONLINE</div>
                    <img onclick="openFullscreen(this.src)" class="screen-img" src="/screens/{{ a.name }}_last.jpg?t={{ a.last_seen_ts }}">
                    <div class="meta">
                        {{ a.last_seen_human }} | CPU {{ '%.0f'|format(a.cpu_usage) }}% | RAM {{ '%.0f'|format(a.ram_usage) }}%<br>
                        {{ a.active_window[:30] }}
                    </div>
                </div>
                {% endfor %}
            </div>

            <div class="section">Offline (<span id="offline-count">{{ offline_agents|length }}</span>)</div>
            <div class="grid" id="offline-grid">
                {% for a in offline_agents %}
                <div class="card">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                        <div>
                            <a href="/agent/{{ a.name }}" class="pc-name">{{ a.display_name }}</a><br>
                            <small style="color:#64748b;font-size:11px;">{{ a.name }}</small>
                        </div>
                        <div>
                            <button class="menu-btn" onclick="toggleMenu('{{ a.name }}')">⋮</button>
                            <div id="menu_{{ a.name }}" class="menu-box">
                                <form method="POST" action="/agent/{{ a.name }}/hide"><button>👁 Gizlət</button></form>
                                <form method="POST" action="/agent/{{ a.name }}/delete" onsubmit="return confirm('Silmək istəyirsiniz?')">
                                    <button style="color:#f87171">🗑 Sil</button>
                                </form>
                            </div>
                        </div>
                    <div class="status" style="color:#f87171;">● OFFLINE</div>
                    <img onclick="openFullscreen(this.src)" class="screen-img" src="/screens/{{ a.name }}_last.jpg?t={{ a.last_seen_ts }}" style="opacity:0.5;">
                    <div class="meta">
                        {{ a.last_seen_human }} | CPU {{ '%.0f'|format(a.cpu_usage) }}% | RAM {{ '%.0f'|format(a.ram_usage) }}%<br>
                        {{ a.active_window[:30] }}
                    </div>
                </div>
                {% endfor %}
            </div>

            <div class="section">Gizlədilən (<span id="hidden-count">{{ hidden_agents|length }}</span>)</div>
            <div class="grid" id="hidden-grid">
                {% for a in hidden_agents %}
                <div class="card">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                        <div>
                            <a href="/agent/{{ a.name }}" class="pc-name">{{ a.display_name }}</a><br>
                            <small style="color:#64748b;font-size:11px;">{{ a.name }}</small>
                        </div>
                        <div>
                            <button class="menu-btn" onclick="toggleMenu('h{{ a.name }}')">⋮</button>
                            <div id="menu_h{{ a.name }}" class="menu-box">
                                <form method="POST" action="/agent/{{ a.name }}/unhide"><button>👁 Göstər</button></form>
                                <form method="POST" action="/agent/{{ a.name }}/delete" onsubmit="return confirm('Silmək istəyirsiniz?')">
                                    <button style="color:#f87171">🗑 Sil</button>
                                </form>
                            </div>
                        </div>
                    <div class="status" style="color:#64748b;">● GİZLİ</div>
                    <img onclick="openFullscreen(this.src)" class="screen-img" src="/screens/{{ a.name }}_last.jpg?t={{ a.last_seen_ts }}" style="opacity:0.3;">
                    <div class="meta">
                        {{ a.last_seen_human }} | CPU {{ '%.0f'|format(a.cpu_usage) }}% | RAM {{ '%.0f'|format(a.ram_usage) }}%
                    </div>
                </div>
                {% endfor %}
            </div>

            <div id="fullscreen" class="fullscreen" onclick="closeFullscreen()">
                <span class="close" onclick="closeFullscreen()">&times;</span>
                <img id="fsimg" src="">
            </div>
        </body>
        </html>
        """,
        online_agents=online_agents,
        offline_agents=offline_agents,
        hidden_agents=hidden_agents,
    )

init_db()
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=False)
