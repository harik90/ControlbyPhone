import { MouseButton, StreamSettings } from '../types';

export type StatusListener = (status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting') => void;
export type FrameListener = (bitmap: ImageBitmap | null, url?: string) => void;
export type LatencyListener = (ms: number) => void;
export type ScreenMetaListener = (width: number, height: number) => void;

class RemoteClientService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private autoReconnect: boolean = true;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private pingTimestamp: number = 0;
  private currentStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting' = 'disconnected';
  private latency: number = 0;
  private screenWidth: number = 1920;
  private screenHeight: number = 1080;

  private statusListeners: Set<StatusListener> = new Set();
  private frameListeners: Set<FrameListener> = new Set();
  private latencyListeners: Set<LatencyListener> = new Set();
  private screenMetaListeners: Set<ScreenMetaListener> = new Set();

  public connect(host: string, port: number = 8000, autoReconnect: boolean = true) {
    this.autoReconnect = autoReconnect;
    this.disconnect();

    const cleanHost = host.trim().replace(/^https?:\/\//, '').replace(/^ws:\/\//, '').split(':')[0] || 'localhost';
    const cleanPort = port || (typeof window !== 'undefined' && window.location.port ? parseInt(window.location.port, 10) : 8000);
    this.url = `ws://${cleanHost}:${cleanPort}`;
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.startPing();
      };

      this.ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'screen_meta') {
              this.screenWidth = data.width || 1920;
              this.screenHeight = data.height || 1080;
              this.screenMetaListeners.forEach((fn) => fn(this.screenWidth, this.screenHeight));
            } else if (data.type === 'pong') {
              if (data.t) {
                const now = performance.now();
                this.latency = Math.max(1, Math.round(now - data.t));
                this.latencyListeners.forEach((fn) => fn(this.latency));
              }
            }
          } catch {
            // Non-json string
          }
        } else if (event.data instanceof ArrayBuffer) {
          // Binary JPEG frame received
          try {
            const blob = new Blob([event.data], { type: 'image/jpeg' });
            if (typeof createImageBitmap === 'function') {
              const bitmap = await createImageBitmap(blob);
              this.frameListeners.forEach((fn) => fn(bitmap));
            } else {
              const url = URL.createObjectURL(blob);
              this.frameListeners.forEach((fn) => fn(null, url));
            }
          } catch {
            // Frame parse error
          }
        }
      };

      this.ws.onclose = () => {
        this.cleanupPing();
        if (this.currentStatus === 'connected' && this.autoReconnect) {
          this.setStatus('reconnecting');
          this.scheduleReconnect();
        } else {
          this.setStatus('disconnected');
        }
      };

      this.ws.onerror = () => {
        // Will trigger onclose
      };
    } catch {
      this.setStatus('disconnected');
    }
  }

  public disconnect() {
    this.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanupPing();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore
      }
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.currentStatus === 'reconnecting' && this.url) {
        try {
          const u = new URL(this.url);
          this.connect(u.hostname, parseInt(u.port || '8001', 10), true);
        } catch {
          this.setStatus('disconnected');
        }
      }
    }, 2500);
  }

  private startPing() {
    this.cleanupPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.pingTimestamp = performance.now();
        this.send({ type: 'ping', t: this.pingTimestamp });
      }
    }, 2000);
  }

  private cleanupPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private setStatus(status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting') {
    this.currentStatus = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  public send(data: Record<string, any>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch {
        // Send failure
      }
    }
  }

  // Remote Actions
  public sendMouseMove(dx: number, dy: number) {
    this.send({ type: 'mouse_move', dx, dy });
  }

  public sendMouseMoveAbs(x: number, y: number) {
    this.send({ type: 'mouse_move_abs', x, y });
  }

  public sendMouseClick(button: MouseButton = 'left', double: boolean = false, x?: number, y?: number) {
    this.send({ type: 'mouse_click', button, double, x, y });
  }

  public sendMouseDown(button: MouseButton = 'left') {
    this.send({ type: 'mouse_down', button });
  }

  public sendMouseUp(button: MouseButton = 'left') {
    this.send({ type: 'mouse_up', button });
  }

  public sendMouseScroll(dy: number) {
    this.send({ type: 'mouse_scroll', dy });
  }

  public sendKeyPress(key: string) {
    this.send({ type: 'key_press', key });
  }

  public sendTypeText(text: string) {
    this.send({ type: 'type_text', text });
  }

  public sendTypeSync(backspaces: number, text: string) {
    this.send({ type: 'type_sync', backspaces, text });
  }

  public sendHotkey(keys: string[]) {
    this.send({ type: 'hotkey', keys });
  }

  public sendConfig(settings: StreamSettings) {
    this.send({
      type: 'config',
      fps: settings.fps,
      quality: settings.quality,
      max_width: Math.round(1920 * settings.scale)
    });
  }

  // Event Subscriptions
  public onStatusChange(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.currentStatus);
    return () => this.statusListeners.delete(listener);
  }

  public onFrame(listener: FrameListener) {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  public onLatencyChange(listener: LatencyListener) {
    this.latencyListeners.add(listener);
    listener(this.latency);
    return () => this.latencyListeners.delete(listener);
  }

  public onScreenMeta(listener: ScreenMetaListener) {
    this.screenMetaListeners.add(listener);
    listener(this.screenWidth, this.screenHeight);
    return () => this.screenMetaListeners.delete(listener);
  }

  public getStatus() {
    return this.currentStatus;
  }

  public getLatency() {
    return this.latency;
  }

  public getScreenSize() {
    return { width: this.screenWidth, height: this.screenHeight };
  }
}

export const remoteClient = new RemoteClientService();
