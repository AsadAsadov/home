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

SERVER_URL = "https://server-dm3i.onrender.com"
PC_NAME = socket.gethostname()
INTERVAL_RANGE = (1.0, 1.5)
JPEG_QUALITY = 38
DIFF_THRESHOLD = 5.0
BUFFER_SIZE = 60
REQUEST_TIMEOUT = 10
MAX_RETRIES = 3
VIDEO_ROOT = Path("videos")
VIDEO_FPS = 1
COMMAND_POLL_SECONDS = 2


def take_screenshot():
    try:
        return ImageGrab.grab()
    except Exception:
        print("Screenshot capture failed:", traceback.format_exc())
        return None


def image_to_numpy(image):
    return np.array(image.convert("RGB"), dtype=np.uint8)


def get_flattened_data(image):
    if hasattr(image, "get_flattened_data"):
        return image.get_flattened_data()
    return list(image.getdata())


def has_significant_change(current_image, previous_image, threshold):
    if previous_image is None:
        return True

    current_small = current_image.convert("L").resize((96, 54))
    previous_small = previous_image.convert("L").resize((96, 54))

    current_data = get_flattened_data(current_small)
    previous_data = get_flattened_data(previous_small)

    if len(current_data) != len(previous_data):
        return True

    diff_sum = 0.0
    for c, p in zip(current_data, previous_data):
        diff_sum += abs(float(c) - float(p))
    diff_mean = diff_sum / len(current_data)
    return diff_mean >= threshold


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
            if response.status_code != 200:
                print(f"Yukleme xetasi: {response.status_code} {response.text}")
                if attempt < retries:
                    time.sleep(0.5 * attempt)
                continue
            return True
        except requests.RequestException as exc:
            print(f"Upload failed ({attempt}/{retries}): {exc}")
            if attempt < retries:
                time.sleep(0.5 * attempt)
    return False


def get_command(pc_name):
    try:
        response = requests.get(
            f"{SERVER_URL}/api/command/{pc_name}",
            timeout=REQUEST_TIMEOUT,
        )
        if response.status_code == 200:
            return response.json()
        print(f"Command xetasi: {response.status_code} {response.text}")
    except requests.RequestException as exc:
        print(f"Command sorgusu xetasi: {exc}")
    return {"command": "none"}


def send_record_request(pc_name):
    try:
        response = requests.post(
            f"{SERVER_URL}/agent/{pc_name}/record",
            timeout=REQUEST_TIMEOUT,
        )
        if response.status_code != 200:
            print(f"Record request xetasi: {response.status_code} {response.text}")
    except requests.RequestException as exc:
        print(f"Record request gonderilemedi: {exc}")


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
    previous_image = None
    frame_buffer = deque(maxlen=BUFFER_SIZE)
    last_command_poll = 0.0

    while True:
        now = time.time()
        if now - last_command_poll >= COMMAND_POLL_SECONDS:
            command = get_command(PC_NAME)
            last_command_poll = now
            if command.get("command") == "record":
                write_latest_video(list(frame_buffer), PC_NAME)
                send_record_request(PC_NAME)

        screenshot = take_screenshot()
        if screenshot is not None:
            frame = image_to_numpy(screenshot)
            frame_buffer.append(frame)

            if len(frame_buffer) == BUFFER_SIZE:
                write_latest_video(list(frame_buffer), PC_NAME)

            if has_significant_change(screenshot, previous_image, DIFF_THRESHOLD):
                previous_frame = frame
                previous_image = screenshot.copy()
                image_bytes = encode_jpeg_bytes(screenshot, JPEG_QUALITY)
                active_window, active_process = get_active_window_info()
                payload = build_payload(active_window, active_process)
                ok = post_with_retry(
                    f"{SERVER_URL}/upload",
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
