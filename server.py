#!/usr/bin/env python3
"""
============================================================
 PC REMOTE CONTROL SERVER - HIGH-PERFORMANCE NATIVE ENGINE
 DPI-Aware, CTypes Native User32 Engine & Single Port (8000)
============================================================
"""

import asyncio
import io
import json
import mimetypes
import os
import socket
import subprocess
import sys
import threading
import time
from http import HTTPStatus

# Windows Native API setup & DPI Awareness
IS_WINDOWS = sys.platform.startswith('win')
if IS_WINDOWS:
    import ctypes
    user32 = ctypes.windll.user32
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2) # PROCESS_PER_MONITOR_DPI_AWARE
    except Exception:
        try:
            user32.SetProcessDPIAware()
        except Exception:
            pass

    class POINT(ctypes.Structure):
        _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]

# Check and import dependencies
try:
    import websockets
    import pyautogui
    import mss
    from PIL import Image
    import qrcode
except ImportError as e:
    print("=" * 60, flush=True)
    print("ERROR: Missing required Python packages!", flush=True)
    print(f"Details: {e}", flush=True)
    print("Please run: pip install -r requirements.txt", flush=True)
    print("=" * 60, flush=True)
    sys.exit(1)

# Disable PyAutoGUI delay and FailSafe for ultra-responsive control
pyautogui.PAUSE = 0.001
pyautogui.FAILSAFE = False

PORT = 8000
DEFAULT_FPS = 15
DEFAULT_QUALITY = 55
DEFAULT_MAX_WIDTH = 1024

connected_clients = set()
stream_settings = {
    "fps": DEFAULT_FPS,
    "quality": DEFAULT_QUALITY,
    "max_width": DEFAULT_MAX_WIDTH,
    "streaming": True
}

DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')
sct_instance = None

def get_screen_size():
    """Get accurate screen resolution."""
    if IS_WINDOWS:
        return user32.GetSystemMetrics(0), user32.GetSystemMetrics(1)
    else:
        return pyautogui.size()

def get_cursor_pos():
    """Get physical mouse cursor position."""
    if IS_WINDOWS:
        pt = POINT()
        user32.GetCursorPos(ctypes.byref(pt))
        return pt.x, pt.y
    else:
        return pyautogui.position()

def move_mouse_to(x, y):
    """Move cursor natively via User32 SetCursorPos or PyAutoGUI."""
    if IS_WINDOWS:
        user32.SetCursorPos(int(x), int(y))
    else:
        pyautogui.moveTo(int(x), int(y))

def move_mouse_relative(dx, dy):
    """Move cursor relative via Windows Native mouse_event or PyAutoGUI."""
    if IS_WINDOWS:
        user32.mouse_event(1, int(dx), int(dy), 0, 0) # MOUSEEVENTF_MOVE
    else:
        pyautogui.moveRel(int(dx), int(dy))

def paste_text_via_clipboard(text):
    """Paste any text, multiline document, code or long paragraph directly into active PC app via Windows Clipboard."""
    if not text:
        return
    
    if IS_WINDOWS:
        try:
            import ctypes
            
            CF_UNICODETEXT = 13
            GMEM_MOVEABLE = 0x0002
            
            user32 = ctypes.windll.user32
            kernel32 = ctypes.windll.kernel32
            
            if user32.OpenClipboard(None):
                user32.EmptyClipboard()
                
                text_bytes = text.encode('utf-16-le') + b'\x00\x00'
                h_mem = kernel32.GlobalAlloc(GMEM_MOVEABLE, len(text_bytes))
                if h_mem:
                    p_mem = kernel32.GlobalLock(h_mem)
                    ctypes.memmove(p_mem, text_bytes, len(text_bytes))
                    kernel32.GlobalUnlock(h_mem)
                    user32.SetClipboardData(CF_UNICODETEXT, h_mem)
                
                user32.CloseClipboard()
                
                # Instant simulated Ctrl+V
                user32.keybd_event(0x11, 0, 0, 0) # VK_CONTROL down
                user32.keybd_event(0x56, 0, 0, 0) # 'V' down
                user32.keybd_event(0x56, 0, 2, 0) # 'V' up
                user32.keybd_event(0x11, 0, 2, 0) # VK_CONTROL up
                return
        except Exception as e:
            print(f"[!] Native clipboard paste error: {e}", flush=True)

    # Fallback
    pyautogui.write(text, interval=0)

def click_mouse(x=None, y=None, button="left", double=False):
    """Click mouse natively or via PyAutoGUI."""
    if x is not None and y is not None:
        move_mouse_to(x, y)
    
    if IS_WINDOWS:
        if button == "left":
            down_flag, up_flag = 2, 4
        elif button == "right":
            down_flag, up_flag = 8, 16
        else:
            down_flag, up_flag = 32, 64
        
        user32.mouse_event(down_flag, 0, 0, 0, 0)
        user32.mouse_event(up_flag, 0, 0, 0, 0)
        
        if double:
            time.sleep(0.04)
            user32.mouse_event(down_flag, 0, 0, 0, 0)
            user32.mouse_event(up_flag, 0, 0, 0, 0)
    else:
        if double:
            pyautogui.doubleClick(button=button)
        else:
            pyautogui.click(button=button)

def get_local_ip():
    """Detect local WiFi / LAN IP address."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def print_banner(ip):
    url = f"http://{ip}:{PORT}"
    print("\n" + "=" * 62, flush=True)
    print("      PC REMOTE CONTROL SERVER - ACTIVE & RUNNING", flush=True)
    print("=" * 62, flush=True)
    print(" Open this URL on your PHONE'S BROWSER (must be on same WiFi):", flush=True)
    print("", flush=True)
    print(f"   -->  {url}", flush=True)
    print("", flush=True)
    print(" Or scan this QR code with your phone camera:", flush=True)
    print("-" * 62, flush=True)
    try:
        qr = qrcode.QRCode(border=1)
        qr.add_data(url)
        qr.make(fit=True)
        qr.print_ascii(invert=True)
    except Exception:
        pass
    print("-" * 62, flush=True)
    print(f" Web UI & Control Port: {url}", flush=True)
    print(" Press Ctrl+C in this terminal window to stop the server.", flush=True)
    print("=" * 62 + "\n", flush=True)

async def process_http_request(path, headers):
    """Serve static web assets for standard HTTP, or pass through for WebSocket Upgrade."""
    if headers.get("Upgrade", "").lower() == "websocket":
        return None

    clean_path = path.split('?')[0].lstrip('/')
    if not clean_path:
        clean_path = 'index.html'

    target_file = os.path.join(DIST_DIR, clean_path)
    
    if not os.path.exists(target_file) or os.path.isdir(target_file):
        target_file = os.path.join(DIST_DIR, 'index.html')

    if not os.path.exists(target_file):
        return (HTTPStatus.NOT_FOUND, [('Content-Type', 'text/plain')], b'Build dist directory missing. Run npm run build.')

    mime_type, _ = mimetypes.guess_type(target_file)
    if not mime_type:
        mime_type = 'application/octet-stream'

    try:
        with open(target_file, 'rb') as f:
            content = f.read()
        return (
            HTTPStatus.OK,
            [
                ('Content-Type', mime_type),
                ('Access-Control-Allow-Origin', '*'),
                ('Cache-Control', 'no-cache, no-store, must-revalidate')
            ],
            content
        )
    except Exception as e:
        return (HTTPStatus.INTERNAL_SERVER_ERROR, [('Content-Type', 'text/plain')], str(e).encode('utf-8'))

def capture_screen_jpeg(quality=55, max_width=1024):
    """Capture screen using persistent MSS instance and convert to optimized JPEG."""
    global sct_instance
    try:
        if sct_instance is None:
            sct_instance = mss.MSS()
        
        monitor = sct_instance.monitors[1]
        sct_img = sct_instance.grab(monitor)
        img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
        
        orig_w, orig_h = img.size
        if orig_w > max_width:
            scale = max_width / float(orig_w)
            new_h = int(orig_h * scale)
            img = img.resize((max_width, new_h), Image.Resampling.BILINEAR)
        
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality, optimize=False)
        return buffer.getvalue(), orig_w, orig_h
    except Exception:
        return None, 0, 0

async def screen_stream_worker():
    """Continuously broadcast screen frames to all connected WebSockets."""
    while True:
        if connected_clients and stream_settings["streaming"]:
            fps = max(5, min(30, stream_settings["fps"]))
            delay = 1.0 / fps
            start_time = time.time()
            
            jpeg_bytes, orig_w, orig_h = capture_screen_jpeg(
                quality=stream_settings["quality"],
                max_width=stream_settings["max_width"]
            )
            
            if jpeg_bytes:
                dead_clients = set()
                for ws in connected_clients:
                    try:
                        await ws.send(jpeg_bytes)
                    except Exception:
                        dead_clients.add(ws)
                
                for dead in dead_clients:
                    connected_clients.discard(dead)
            
            elapsed = time.time() - start_time
            sleep_time = max(0.001, delay - elapsed)
            await asyncio.sleep(sleep_time)
        else:
            await asyncio.sleep(0.1)

async def handle_client(websocket):
    connected_clients.add(websocket)
    try:
        if hasattr(websocket, 'transport') and websocket.transport:
            sock = websocket.transport.get_extra_info('socket')
            if sock:
                sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    except Exception:
        pass

    screen_w, screen_h = get_screen_size()
    print(f"[+] Phone client connected! Physical Resolution: {screen_w}x{screen_h}", flush=True)

    await websocket.send(json.dumps({
        "type": "screen_meta",
        "width": screen_w,
        "height": screen_h
    }))
    
    sub_x = 0.0
    sub_y = 0.0

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                msg_type = data.get("type")

                if msg_type == "mouse_move":
                    dx = float(data.get("dx", 0))
                    dy = float(data.get("dy", 0))
                    
                    sub_x += dx
                    sub_y += dy
                    
                    step_x = int(sub_x)
                    step_y = int(sub_y)
                    
                    if step_x != 0 or step_y != 0:
                        sub_x -= step_x
                        sub_y -= step_y
                        move_mouse_relative(step_x, step_y)

                elif msg_type == "mouse_move_abs":
                    norm_x = float(data.get("x", 0))
                    norm_y = float(data.get("y", 0))
                    tx = max(0, min(screen_w - 1, int(norm_x * screen_w)))
                    ty = max(0, min(screen_h - 1, int(norm_y * screen_h)))
                    move_mouse_to(tx, ty)

                elif msg_type == "mouse_click":
                    button = data.get("button", "left")
                    double = data.get("double", False)
                    if "x" in data and "y" in data and data["x"] is not None and data["y"] is not None:
                        norm_x = float(data["x"])
                        norm_y = float(data["y"])
                        tx = max(0, min(screen_w - 1, int(norm_x * screen_w)))
                        ty = max(0, min(screen_h - 1, int(norm_y * screen_h)))
                        click_mouse(tx, ty, button=button, double=double)
                    else:
                        click_mouse(button=button, double=double)

                elif msg_type == "mouse_down":
                    button = data.get("button", "left")
                    if IS_WINDOWS:
                        down_flag = 2 if button == "left" else 8 if button == "right" else 32
                        user32.mouse_event(down_flag, 0, 0, 0, 0)
                    else:
                        pyautogui.mouseDown(button=button)

                elif msg_type == "mouse_up":
                    button = data.get("button", "left")
                    if IS_WINDOWS:
                        up_flag = 4 if button == "left" else 16 if button == "right" else 64
                        user32.mouse_event(up_flag, 0, 0, 0, 0)
                    else:
                        pyautogui.mouseUp(button=button)

                elif msg_type == "mouse_scroll":
                    dy = int(data.get("dy", 0))
                    pyautogui.scroll(dy)

                elif msg_type == "key_press":
                    key = data.get("key", "").lower()
                    if key:
                        key_map = {
                            'bksp': 'backspace',
                            'esc': 'escape',
                            'pgup': 'pageup',
                            'pagedown': 'pagedown'
                        }
                        actual_key = key_map.get(key, key)
                        pyautogui.press(actual_key)

                elif msg_type == "type_text" or msg_type == "paste_text":
                    text = data.get("text", "")
                    if text:
                        if len(text) > 4 or "\n" in text or "\r" in text:
                            paste_text_via_clipboard(text)
                        else:
                            pyautogui.write(text, interval=0)

                elif msg_type == "type_sync":
                    backspaces = int(data.get("backspaces", 0))
                    text = data.get("text", "")
                    if backspaces > 0:
                        pyautogui.press('backspace', presses=backspaces)
                    if text:
                        if len(text) > 4 or "\n" in text or "\r" in text:
                            paste_text_via_clipboard(text)
                        else:
                            pyautogui.write(text, interval=0)

                elif msg_type == "hotkey":
                    keys = [k.lower() for k in data.get("keys", [])]
                    if keys:
                        pyautogui.hotkey(*keys)

                elif msg_type == "config":
                    if "fps" in data:
                        stream_settings["fps"] = int(data["fps"])
                    if "quality" in data:
                        stream_settings["quality"] = int(data["quality"])
                    if "max_width" in data:
                        stream_settings["max_width"] = int(data["max_width"])

                elif msg_type == "ping":
                    await websocket.send(json.dumps({
                        "type": "pong",
                        "t": data.get("t", 0)
                    }))

            except Exception as cmd_err:
                print(f"[!] Action error: {cmd_err}", flush=True)

    except websockets.exceptions.ConnectionClosed:
        print("[-] Phone client disconnected.", flush=True)
    finally:
        connected_clients.discard(websocket)

def check_and_build_dist():
    index_path = os.path.join(DIST_DIR, 'index.html')
    if not os.path.exists(DIST_DIR) or not os.path.exists(index_path):
        print("[*] Web frontend bundle missing. Building automatically via npm...", flush=True)
        try:
            subprocess.run(['npm', 'run', 'build'], check=True, shell=True)
            print("[✓] Build finished successfully!\n", flush=True)
        except Exception as e:
            print(f"[!] Build warning: {e}", flush=True)

async def main():
    check_and_build_dist()
    ip = get_local_ip()
    print_banner(ip)
    
    asyncio.create_task(screen_stream_worker())
    
    async with websockets.serve(handle_client, "0.0.0.0", PORT, process_request=process_http_request):
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[!] Server stopped by user.", flush=True)
