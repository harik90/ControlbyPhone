export const REQUIREMENTS_TXT = `# PC Remote Control - Python Dependencies
websockets>=12.0
pyautogui>=0.9.54
qrcode[pil]>=7.4.2
mss>=9.0.1
Pillow>=10.0.0
`;

export const SERVER_PY = `#!/usr/bin/env python3
"""
============================================================
 PC REMOTE CONTROL SERVER
 Screen Stream, Mouse & Keyboard Control over Local WiFi
============================================================
"""

import asyncio
import io
import json
import os
import socket
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Check and import dependencies
try:
    import websockets
    import pyautogui
    import mss
    from PIL import Image
    import qrcode
except ImportError as e:
    print("=" * 60)
    print("ERROR: Missing required Python packages!")
    print(f"Details: {e}")
    print("Please run: pip install -r requirements.txt")
    print("=" * 60)
    sys.exit(1)

# Configure PyAutoGUI for responsive remote control
pyautogui.PAUSE = 0.001
pyautogui.FAILSAFE = False  # Prevent corner triggers from halting automation

HTTP_PORT = 8000
WS_PORT = 8001
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
    url = f"http://{ip}:{HTTP_PORT}"
    print("\\n" + "=" * 62)
    print("      PC REMOTE CONTROL SERVER - ACTIVE & RUNNING")
    print("=" * 62)
    print(" Open this URL on your PHONE'S BROWSER (must be on same WiFi):")
    print("")
    print(f"   -->  {url}")
    print("")
    print(" Or scan this QR code with your phone camera:")
    print("-" * 62)
    try:
        qr = qrcode.QRCode(border=1)
        qr.add_data(url)
        qr.make(fit=True)
        qr.print_ascii(invert=True)
    except Exception:
        pass
    print("-" * 62)
    print(f" Local Web UI:    http://localhost:{HTTP_PORT}")
    print(f" WebSocket Port:  ws://{ip}:{WS_PORT}")
    print(" Press Ctrl+C in this terminal window to stop the server.")
    print("=" * 62 + "\\n")

class CustomHTTPHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def log_message(self, format, *args):
        return

def start_http_server():
    dist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')
    if os.path.exists(dist_dir) and os.path.isdir(dist_dir):
        class DistHTTPHandler(SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=dist_dir, **kwargs)
            def end_headers(self):
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                super().end_headers()
            def log_message(self, format, *args):
                return
        server = ThreadingHTTPServer(('0.0.0.0', HTTP_PORT), DistHTTPHandler)
    else:
        server = ThreadingHTTPServer(('0.0.0.0', HTTP_PORT), CustomHTTPHandler)
    server.serve_forever()

def capture_screen_jpeg(quality=55, max_width=1024):
    """Capture screen using ultra-fast MSS and convert to optimized JPEG."""
    try:
        with mss.mss() as sct:
            monitor = sct.monitors[1]
            sct_img = sct.grab(monitor)
            img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
            
            orig_w, orig_h = img.size
            if orig_w > max_width:
                scale = max_width / float(orig_w)
                new_h = int(orig_h * scale)
                img = img.resize((max_width, new_h), Image.Resampling.BILINEAR)
            
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=quality, optimize=True)
            return buffer.getvalue(), orig_w, orig_h
    except Exception as e:
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
    screen_w, screen_h = pyautogui.size()
    
    await websocket.send(json.dumps({
        "type": "screen_meta",
        "width": screen_w,
        "height": screen_h
    }))
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                msg_type = data.get("type")

                if msg_type == "mouse_move":
                    dx = float(data.get("dx", 0))
                    dy = float(data.get("dy", 0))
                    pyautogui.moveRel(dx, dy)

                elif msg_type == "mouse_move_abs":
                    norm_x = float(data.get("x", 0))
                    norm_y = float(data.get("y", 0))
                    target_x = max(1, min(screen_w - 2, int(norm_x * screen_w)))
                    target_y = max(1, min(screen_h - 2, int(norm_y * screen_h)))
                    pyautogui.moveTo(target_x, target_y)

                elif msg_type == "mouse_click":
                    button = data.get("button", "left")
                    if data.get("double", False):
                        pyautogui.doubleClick(button=button)
                    else:
                        pyautogui.click(button=button)

                elif msg_type == "mouse_down":
                    button = data.get("button", "left")
                    pyautogui.mouseDown(button=button)

                elif msg_type == "mouse_up":
                    button = data.get("button", "left")
                    pyautogui.mouseUp(button=button)

                elif msg_type == "mouse_scroll":
                    dy = int(data.get("dy", 0))
                    pyautogui.scroll(dy)

                elif msg_type == "key_press":
                    key = data.get("key", "")
                    if key:
                        pyautogui.press(key)

                elif msg_type == "type_text":
                    text = data.get("text", "")
                    if text:
                        pyautogui.write(text, interval=0.01)

                elif msg_type == "hotkey":
                    keys = data.get("keys", [])
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
                print(f"[!] Command execution error: {cmd_err}")

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)

async def main():
    ip = get_local_ip()
    print_banner(ip)
    
    http_thread = threading.Thread(target=start_http_server, daemon=True)
    http_thread.start()
    
    asyncio.create_task(screen_stream_worker())
    
    async with websockets.serve(handle_client, "0.0.0.0", WS_PORT):
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\\n[!] Server stopped by user.")
`;
