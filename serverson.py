# ============================================================
#   BESTHOME MONITOR – Full Server.py (Hide/Delete + AutoClean)
# ============================================================

import os
import time
import sqlite3
from datetime import datetime, timedelta
from functools import wraps

from flask import (
    Flask,
    request,
    send_from_directory,
    render_template_string,
    redirect,
    url_for,
    session,
    jsonify,
)

# ==============================
#   KONFİQURASİYA
# ==============================

UPLOAD_FOLDER = "screens"
DB_PATH = "monitor.db"

ADMIN_EMAIL = "adminbesthome@gmail.com"
ADMIN_PASSWORD = "AA161235aa"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
app.secret_key = "besthome_monitor_secret_123"
LAST_CLEANUP = 0

# ==============================
#   SERVER SCREEN CLEANER (Linux friendly)
# ==============================

KEEP_MINUTES = 10  # yalnız son 10 dəqiqə qalacaq


def cleanup_server_screens():
    base = UPLOAD_FOLDER
    if not os.path.exists(base):
        return

    now = time.time()
    limit_seconds = KEEP_MINUTES * 60

    for filename in os.listdir(base):
        file_path = os.path.join(base, filename)

        if not os.path.isfile(file_path):
            continue

        try:
            modified = os.path.getmtime(file_path)
            age = now - modified

            if age > limit_seconds:
                os.remove(file_path)
                print(f"[SERVER CLEAN] Silindi → {file_path}")
        except Exception as e:
            print(f"[SERVER CLEAN ERROR] {file_path} → {e}")


# ==============================
#   DB FUNKSİYALARI
# ==============================


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()

    # AGENT
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS agents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            last_seen TEXT,
            active_window TEXT,
            active_process TEXT,
            process_list TEXT,
            hidden INTEGER DEFAULT 0
        )
    """
    )

    # Screenshot log
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

    # Employee info
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

    conn.commit()
    conn.close()


# ==============================
#   LOGIN DECORATOR
# ==============================


def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("logged_in"):
            return redirect(url_for("login"))
        return f(*args, **kwargs)

    return wrapper


# ==============================
#   LOGIN PAGE
# ==============================


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
        <title>BestHome Monitor - Login</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
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
            {% if error %}
            <div class="error">{{error}}</div>
            {% endif %}
            <form method="POST">
                <label>Email</label>
                <input name="email" type="email">
                <label>Şifrə</label>
                <input name="password" type="password">
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


# ==============================
#   AGENT UPLOAD
# ==============================


@app.route("/upload", methods=["POST"])
def upload():
    global LAST_CLEANUP

    pc_name = request.form.get("pc_name")
    active_window = request.form.get("active_window")
    active_process = request.form.get("active_process")
    process_list = request.form.get("process_list")
    file = request.files.get("screenshot")

    if not pc_name or not file:
        return "Invalid", 400

    now = datetime.utcnow()
    filename = f"{pc_name}_{now.strftime('%Y-%m-%d_%H-%M-%S')}.jpg"
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)

    # Last screenshot
    last_img = os.path.join(UPLOAD_FOLDER, f"{pc_name}_last.jpg")
    file.stream.seek(0)
    file.save(last_img)

    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO agents (name,last_seen,active_window,active_process,process_list)
        VALUES (?,?,?,?,?)
        ON CONFLICT(name) DO UPDATE SET
            last_seen=excluded.last_seen,
            active_window=excluded.active_window,
            active_process=excluded.active_process,
            process_list=excluded.process_list
    """,
        (pc_name, now.isoformat(), active_window, active_process, process_list),
    )

    cur.execute(
        """
        INSERT INTO screenshots (agent_name, filename, created_at)
        VALUES (?,?,?)
    """,
        (pc_name, filename, now.isoformat()),
    )

    conn.commit()
    conn.close()

    # Auto clean trigger
    if time.time() - LAST_CLEANUP > 600:
        cleanup_server_screens()
        LAST_CLEANUP = time.time()

    return "OK", 200


# ==============================
#   HIDE AGENT
# ==============================


@app.route("/agent/<name>/hide", methods=["POST"])
@login_required
def hide_agent(name):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE agents SET hidden = 1 WHERE name=?", (name,))
    conn.commit()
    conn.close()
    return redirect(url_for("dashboard"))


# ==============================
#   DELETE AGENT
# ==============================


@app.route("/agent/<name>/delete", methods=["POST"])
@login_required
def delete_agent(name):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("DELETE FROM agents WHERE name=?", (name,))
    cur.execute("DELETE FROM employees WHERE agent_name=?", (name,))
    cur.execute("DELETE FROM screenshots WHERE agent_name=?", (name,))
    conn.commit()
    conn.close()

    # Remove files
    for f in os.listdir(UPLOAD_FOLDER):
        if f.startswith(name):
            try:
                os.remove(os.path.join(UPLOAD_FOLDER, f))
            except:
                pass

    return redirect(url_for("dashboard"))


# ==============================
#   SCREEN SERVING
# ==============================


@app.route("/screens/<path:f>")
@login_required
def screens(f):
    return send_from_directory(UPLOAD_FOLDER, f)


# ==============================
#   API LAST SCREENSHOT
# ==============================


@app.route("/api/agent/<agent>/last")
@login_required
def api_last(agent):
    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT filename, created_at
        FROM screenshots
        WHERE agent_name=?
        ORDER BY created_at DESC LIMIT 1
    """,
        (agent,),
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"ok": False})

    return jsonify(
        {"ok": True, "filename": row["filename"], "created_at": row["created_at"]}
    )


# ==============================
#   DASHBOARD
# ==============================


@app.route("/")
@login_required
def dashboard():
    now = datetime.utcnow()
    threshold = now - timedelta(seconds=10)

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT * FROM agents WHERE hidden=0 ORDER BY name ASC")
    agents_rows = cur.fetchall()

    cur.execute("SELECT * FROM employees")
    emp_rows = cur.fetchall()
    conn.close()

    emp_map = {e["agent_name"]: e for e in emp_rows}

    agents = []
    for row in agents_rows:
        last = datetime.fromisoformat(row["last_seen"])
        online = last >= threshold

        info = emp_map.get(row["name"], {})
        agents.append(
            {
                "name": row["name"],
                "last_seen": last,
                "online": online,
                "full_name": info.get("full_name"),
                "department": info.get("department"),
                "role": info.get("role"),
                "active_window": row["active_window"],
                "active_process": row["active_process"],
            }
        )

    return render_template_string(
        """
    <!doctype html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Dashboard</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
            body{background:#020617;color:#e5e7eb;font-family:sans-serif;margin:0;padding:0;}
            header{padding:12px 16px;border-bottom:1px solid #111827;display:flex;justify-content:space-between;}
            .card{border:1px solid #111827;border-radius:12px;padding:12px;background:#020617;}
            .menu-btn{background:none;border:none;color:#fff;cursor:pointer;font-size:22px;}
            .menu-box{position:absolute;background:#0f172a;border:1px solid #1f2937;border-radius:8px;display:none;}
            .menu-box button{background:none;border:none;color:#fff;padding:8px 14px;width:100%;text-align:left;cursor:pointer;}
            .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;padding:16px;}
        </style>
        <script>
            function toggleMenu(name){
                let box=document.getElementById("menu_"+name);
                box.style.display=box.style.display==="block"?"none":"block";
            }
        </script>
    </head>
    <body>
        <header>
            <div>BestHome Monitor</div>
            <a href="/logout" style="color:#9ca3af;text-decoration:none;">Çıxış</a>
        </header>

        <div class="grid">
        {% for a in agents %}
            <div class="card">
                <div style="display:flex;justify-content:space-between;">
                    <div>
                        <b>{{ a.full_name or a.name }}</b><br>
                        <small>PC: {{a.name}}</small>
                    </div>

                    <div style="position:relative;">
                        <button class="menu-btn" onclick="toggleMenu('{{a.name}}')">⋮</button>

                        <div id="menu_{{a.name}}" class="menu-box">
                            <form method="POST" action="/agent/{{a.name}}/hide">
                                <button>👁 Gizlət</button>
                            </form>
                            <form method="POST" action="/agent/{{a.name}}/delete"
                                  onsubmit="return confirm('Silmək istəyirsiniz?')">
                                <button style="color:#f55">🗑 Sil</button>
                            </form>
                        </div>
                    </div>
                </div>

                {% if a.online %}
                    <span style="color:#4ade80;">● ONLINE</span><br>
                    <img src="/screens/{{a.name}}_last.jpg?t={{a.last_seen.timestamp()}}" 
                         style="width:100%;border-radius:8px;margin-top:8px;max-height:150px;object-fit:cover;">
                {% else %}
                    <span style="color:#f55;">● OFFLINE</span>
                {% endif %}

                <div style="margin-top:6px;">
                    <small>Son aktivlik: {{ a.last_seen.strftime('%Y-%m-%d %H:%M:%S') }}</small><br>
                    <small>Pəncərə: {{ a.active_window or '—' }}</small><br>
                    <small>Proses: {{ a.active_process or '—' }}</small>
                </div>

                <a href="/agent/{{a.name}}" 
                   style="display:inline-block;margin-top:10px;color:#22c55e;text-decoration:none;">
                    🔍 Agent səhifəsi
                </a>
            </div>
        {% endfor %}
        </div>
    </body>
    </html>
    """,
        agents=agents,
    )


# ==============================
#   MAIN
# ==============================

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5050, debug=False)
