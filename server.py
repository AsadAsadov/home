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
        return f"{seconds} sec ago"
    if seconds < 3600:
        minutes = seconds // 60
        return f"{minutes} min ago"
    if seconds < 86400:
        hours = seconds // 3600
        return f"{hours} hours ago"
    return last_seen_dt.strftime("%Y-%m-%d %H:%M")


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
            "SELECT filename FROM screenshots WHERE created_at < ?", (cutoff_iso,)
        ).fetchall()

        for row in old_rows:
            path = UPLOAD_FOLDER / row["filename"]
            try:
                if path.exists():
                    path.unlink()
            except OSError:
                pass

        cur.execute("DELETE FROM screenshots WHERE created_at < ?", (cutoff_iso,))
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


def fetch_agents():
    with closing(get_db()) as conn:
        cur = conn.cursor()
        rows = cur.execute(
            """
            SELECT a.*, e.full_name, e.department, e.role
            FROM agents a
            LEFT JOIN employees e ON e.agent_name = a.name
            WHERE a.hidden = 0
            ORDER BY a.name ASC
            """
        ).fetchall()

    now = datetime.now(timezone.utc)
    online_cutoff = now - timedelta(seconds=ONLINE_SECONDS)

    online_agents = []
    offline_agents = []

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
            "cpu_usage": row["cpu_usage"] if row["cpu_usage"] is not None else 0,
            "ram_usage": row["ram_usage"] if row["ram_usage"] is not None else 0,
            "os_display": " ".join(
                part for part in [row["os_name"] or "", row["os_version"] or ""] if part
            )
            or "Unknown",
            "online": last_seen >= online_cutoff,
        }

        if agent["online"]:
            online_agents.append(agent)
        else:
            offline_agents.append(agent)

    return online_agents, offline_agents


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
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>BestHome Monitor - Login</title>
            <style>
                body { background:#050910; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; font-family:sans-serif; color:#fff; }
                .card { background:#0f172a; padding:24px; border-radius:12px; width:90%; max-width:360px; }
                input { width:100%; padding:12px; border-radius:8px; margin-bottom:12px; border:1px solid #1f2937; background:#020617; color:#fff; }
                button { width:100%; padding:12px; border-radius:8px; background:#22c55e; border:none; cursor:pointer; font-weight:600; }
                .error { background:#300; padding:10px; border-radius:8px; margin-bottom:12px; }
            </style>
        </head>
        <body>
            <div class="card">
                {% if error %}<div class="error">{{ error }}</div>{% endif %}
                <form method="POST">
                    <label>Email</label>
                    <input name="email" type="email" required>
                    <label>Şifrə</label>
                    <input name="password" type="password" required>
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            "INSERT INTO screenshots (agent_name, filename, created_at) VALUES (?, ?, ?)",
            (pc_name, filename, now.isoformat()),
        )
        conn.commit()

    return "OK", 200


@app.route("/agent/<name>/hide", methods=["POST"])
@login_required
def hide_agent(name):
    with closing(get_db()) as conn:
        conn.execute("UPDATE agents SET hidden = 1 WHERE name = ?", (name,))
        conn.commit()
    return redirect(url_for("dashboard"))


@app.route("/agent/<name>/delete", methods=["POST"])
@login_required
def delete_agent(name):
    with closing(get_db()) as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM agents WHERE name = ?", (name,))
        cur.execute("DELETE FROM employees WHERE agent_name = ?", (name,))
        cur.execute("DELETE FROM screenshots WHERE agent_name = ?", (name,))
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


@app.route("/api/agent/<agent>/last")
@login_required
def api_last(agent):
    with closing(get_db()) as conn:
        row = conn.execute(
            """
            SELECT filename, created_at
            FROM screenshots
            WHERE agent_name = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (agent,),
        ).fetchone()

    if row is None:
        return jsonify({"ok": False})
    return jsonify({"ok": True, "filename": row["filename"], "created_at": row["created_at"]})


@app.route("/")
@login_required
def dashboard():
    maybe_cleanup()
    online_agents, offline_agents = fetch_agents()

    return render_template_string(
        """
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <title>Dashboard</title>
            <style>
                body{background:#020617;color:#e5e7eb;font-family:sans-serif;margin:0;padding:0;}
                header{padding:12px 16px;border-bottom:1px solid #111827;display:flex;justify-content:space-between;}
                .section{padding:12px 16px 0;font-size:18px;font-weight:700;}
                .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;padding:16px;}
                .card{border:1px solid #111827;border-radius:12px;padding:12px;background:#020617;position:relative;}
                .menu-btn{background:none;border:none;color:#fff;cursor:pointer;font-size:22px;}
                .menu-box{position:absolute;right:12px;top:38px;background:#0f172a;border:1px solid #1f2937;border-radius:8px;display:none;z-index:10;}
                .menu-box button{background:none;border:none;color:#fff;padding:8px 14px;width:100%;text-align:left;cursor:pointer;}
                .meta{margin-top:8px;font-size:13px;color:#cbd5e1;line-height:1.5;}
                .empty{padding:0 16px 16px;color:#94a3b8;}
            </style>
            <script>
                function toggleMenu(name){
                    const el=document.getElementById('menu_'+name);
                    el.style.display=el.style.display==='block'?'none':'block';
                }
            </script>
        </head>
        <body>
            <header>
                <div>BestHome Monitor</div>
                <a href="/logout" style="color:#9ca3af;text-decoration:none;">Çıxış</a>
            </header>

            <div class="section">Online Agents ({{ online_agents|length }})</div>
            {% if online_agents %}
            <div class="grid">
                {% for a in online_agents %}
                <div class="card">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                        <div>
                            <b>{{ a.display_name }}</b><br>
                            <small>PC: {{ a.name }}</small>
                        </div>
                        <div>
                            <button class="menu-btn" onclick="toggleMenu('{{ a.name }}')">⋮</button>
                            <div id="menu_{{ a.name }}" class="menu-box">
                                <form method="POST" action="/agent/{{ a.name }}/hide"><button>👁 Gizlət</button></form>
                                <form method="POST" action="/agent/{{ a.name }}/delete" onsubmit="return confirm('Silmək istəyirsiniz?')">
                                    <button style="color:#f55">🗑 Sil</button>
                                </form>
                            </div>
                        </div>
                    </div>

                    <div style="color:#4ade80; margin-top:4px;">● ONLINE</div>
                    <img src="/screens/{{ a.name }}_last.jpg?t={{ a.last_seen.timestamp() }}" style="width:100%;border-radius:8px;margin-top:8px;max-height:170px;object-fit:cover;">
                    <div class="meta">
                        Last seen: {{ a.last_seen_human }}<br>
                        CPU: {{ '%.1f'|format(a.cpu_usage) }}% | RAM: {{ '%.1f'|format(a.ram_usage) }}%<br>
                        OS: {{ a.os_display }}<br>
                        Window: {{ a.active_window }}<br>
                        Process: {{ a.active_process }}
                    </div>
                </div>
                {% endfor %}
            </div>
            {% else %}
            <div class="empty">No online agents.</div>
            {% endif %}

            <div class="section">Offline Agents ({{ offline_agents|length }})</div>
            {% if offline_agents %}
            <div class="grid">
                {% for a in offline_agents %}
                <div class="card">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                        <div>
                            <b>{{ a.display_name }}</b><br>
                            <small>PC: {{ a.name }}</small>
                        </div>
                        <div>
                            <button class="menu-btn" onclick="toggleMenu('{{ a.name }}')">⋮</button>
                            <div id="menu_{{ a.name }}" class="menu-box">
                                <form method="POST" action="/agent/{{ a.name }}/hide"><button>👁 Gizlət</button></form>
                                <form method="POST" action="/agent/{{ a.name }}/delete" onsubmit="return confirm('Silmək istəyirsiniz?')">
                                    <button style="color:#f55">🗑 Sil</button>
                                </form>
                            </div>
                        </div>
                    </div>

                    <div style="color:#f87171; margin-top:4px;">● OFFLINE</div>
                    <img src="/screens/{{ a.name }}_last.jpg?t={{ a.last_seen.timestamp() }}" style="width:100%;border-radius:8px;margin-top:8px;max-height:170px;object-fit:cover;opacity:0.55;object-fit:cover;">
                    <div class="meta">
                        Last seen: {{ a.last_seen_human }}<br>
                        CPU: {{ '%.1f'|format(a.cpu_usage) }}% | RAM: {{ '%.1f'|format(a.ram_usage) }}%<br>
                        OS: {{ a.os_display }}<br>
                        Window: {{ a.active_window }}<br>
                        Process: {{ a.active_process }}
                    </div>
                </div>
                {% endfor %}
            </div>
            {% else %}
            <div class="empty">No offline agents.</div>
            {% endif %}
        </body>
        </html>
        """,
        online_agents=online_agents,
        offline_agents=offline_agents,
    )

init_db()
if __name__ == "__main__":  
    app.run(host="0.0.0.0", port=5050, debug=False)
