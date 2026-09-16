import { MouseButton } from '../types';

export interface VirtualWindow {
  id: string;
  title: string;
  app: 'notepad' | 'terminal' | 'browser' | 'paint' | 'monitor';
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  isMinimized: boolean;
}

export class VirtualPC {
  public width = 1280;
  public height = 720;
  public cursorX = 640;
  public cursorY = 360;
  public isMouseDown = false;
  public activeWindowId = 'notepad';
  
  // App contents
  public notepadText = "Welcome to PC Remote Control!\n\nThis is a live interactive PC screen simulation.\nYou can use your phone's:\n1. Touchpad tab to move this cursor and click\n2. Keyboard tab to type text into this Notepad\n3. Screen tab to pinch, zoom, and tap to click directly!\n\nReady to control your real PC?\nClick 'Setup Server' in the top bar to run server.py.";
  public terminalLogs: string[] = [
    'Microsoft Windows [Version 10.0.22631.3296]',
    '(c) Microsoft Corporation. All rights reserved.',
    '',
    'C:\\Users\\RemoteUser> python server.py',
    '[OK] Screen Capture initialized (mss)',
    '[OK] WebSocket server listening on port 8001',
    '[OK] HTTP server listening on port 8000',
    'Ready for incoming phone connections...'
  ];
  public terminalInput = '';
  public paintPaths: { x: number; y: number; color: string; size: number }[][] = [];
  public currentPaintPath: { x: number; y: number; color: string; size: number }[] = [];
  public cpuUsage = 18;
  public ramUsage = 42;
  public netUsage = 3.4;

  public windows: VirtualWindow[] = [
    {
      id: 'notepad',
      title: 'Notepad - Welcome.txt',
      app: 'notepad',
      x: 80,
      y: 70,
      w: 580,
      h: 420,
      zIndex: 10,
      isMinimized: false
    },
    {
      id: 'terminal',
      title: 'Command Prompt - python server.py',
      app: 'terminal',
      x: 620,
      y: 110,
      w: 590,
      h: 380,
      zIndex: 5,
      isMinimized: false
    }
  ];

  public topZ = 12;

  // Render the virtual desktop onto an HTML5 Canvas
  public renderToCanvas(ctx: CanvasRenderingContext2D) {
    const w = this.width;
    const h = this.height;

    // 1. Desktop Wallpaper (Sleek deep navy futuristic geometric gradient)
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.5, '#1e1b4b');
    bgGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle wallpaper abstract graphic
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(w * 0.5 + i * 20, h * 0.45 - i * 15, 300 + i * 40, 160 + i * 25, (i * Math.PI) / 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Desktop Icons (Left side)
    this.renderDesktopIcons(ctx);

    // 3. Render Open Windows sorted by zIndex
    const sortedWindows = [...this.windows]
      .filter((win) => !win.isMinimized)
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const win of sortedWindows) {
      this.renderWindow(ctx, win);
    }

    // 4. Windows 11 style Taskbar (Bottom)
    this.renderTaskbar(ctx);

    // 5. Render Mouse Cursor
    this.renderCursor(ctx);
  }

  private renderDesktopIcons(ctx: CanvasRenderingContext2D) {
    const icons = [
      { name: 'This PC', icon: '💻', x: 20, y: 24, app: 'monitor' },
      { name: 'server.py', icon: '🐍', x: 20, y: 110, app: 'terminal' },
      { name: 'Notes.txt', icon: '📝', x: 20, y: 196, app: 'notepad' },
      { name: 'Paint', icon: '🎨', x: 20, y: 282, app: 'paint' }
    ];

    for (const item of icons) {
      ctx.save();
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.icon, item.x + 30, item.y + 24);

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px system-ui, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(item.name, item.x + 30, item.y + 54);
      ctx.restore();
    }
  }

  private renderWindow(ctx: CanvasRenderingContext2D, win: VirtualWindow) {
    const isActive = win.id === this.activeWindowId;

    ctx.save();
    // Window Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = isActive ? 24 : 12;
    ctx.shadowOffsetY = isActive ? 8 : 4;

    // Window Frame Background
    ctx.fillStyle = '#1e293b';
    this.roundRect(ctx, win.x, win.y, win.w, win.h, 10);
    ctx.fill();

    // Reset shadow for inner elements
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Title bar
    ctx.fillStyle = isActive ? '#0f172a' : '#1e293b';
    ctx.beginPath();
    ctx.roundRect(win.x, win.y, win.w, 36, [10, 10, 0, 0]);
    ctx.fill();

    // Window Title Text
    ctx.fillStyle = isActive ? '#f8fafc' : '#94a3b8';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(win.title, win.x + 14, win.y + 18);

    // Window buttons (Close, Max, Min)
    const btnRadius = 6;
    const btnY = win.y + 18;
    const closeX = win.x + win.w - 20;
    const maxX = win.x + win.w - 38;
    const minX = win.x + win.w - 56;

    // Close (Red)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(closeX, btnY, btnRadius, 0, Math.PI * 2);
    ctx.fill();

    // Maximize (Yellow)
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(maxX, btnY, btnRadius, 0, Math.PI * 2);
    ctx.fill();

    // Minimize (Green)
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(minX, btnY, btnRadius, 0, Math.PI * 2);
    ctx.fill();

    // App Body
    const bodyX = win.x + 1;
    const bodyY = win.y + 36;
    const bodyW = win.w - 2;
    const bodyH = win.h - 37;

    if (win.app === 'notepad') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '13px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const lines = this.notepadText.split('\n');
      let lineY = bodyY + 14;
      for (const line of lines) {
        if (lineY + 16 > bodyY + bodyH) break;
        ctx.fillText(line, bodyX + 16, lineY);
        lineY += 19;
      }

      // Blinking cursor in active notepad
      if (isActive && Math.floor(Date.now() / 500) % 2 === 0) {
        const lastLine = lines[lines.length - 1] || '';
        const textMetrics = ctx.measureText(lastLine);
        const cursorLineY = bodyY + 14 + (lines.length - 1) * 19;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(bodyX + 16 + textMetrics.width + 2, cursorLineY, 2, 15);
      }
    } else if (win.app === 'terminal') {
      ctx.fillStyle = '#05070d';
      ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

      ctx.fillStyle = '#4ade80';
      ctx.font = '13px Consolas, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      let termY = bodyY + 12;
      for (const log of this.terminalLogs.slice(-14)) {
        ctx.fillText(log, bodyX + 12, termY);
        termY += 20;
      }
    } else if (win.app === 'paint') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

      // Render paint strokes
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const path of this.paintPaths) {
        if (path.length > 1) {
          ctx.strokeStyle = path[0].color;
          ctx.lineWidth = path[0].size;
          ctx.beginPath();
          ctx.moveTo(path[0].x, path[0].y);
          for (let p = 1; p < path.length; p++) {
            ctx.lineTo(path[p].x, path[p].y);
          }
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  private renderTaskbar(ctx: CanvasRenderingContext2D) {
    const tbH = 46;
    const tbY = this.height - tbH;

    ctx.save();
    // Blur glass taskbar effect
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, tbY, this.width, tbH);

    // Top border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, tbY);
    ctx.lineTo(this.width, tbY);
    ctx.stroke();

    // Centered Windows 11 App Icons
    const taskIcons = [
      { id: 'start', icon: '🪟', name: 'Start' },
      { id: 'search', icon: '🔍', name: 'Search' },
      { id: 'notepad', icon: '📝', name: 'Notepad' },
      { id: 'terminal', icon: '💻', name: 'Terminal' },
      { id: 'paint', icon: '🎨', name: 'Paint' }
    ];

    const centerX = this.width / 2;
    const startX = centerX - (taskIcons.length * 44) / 2;

    taskIcons.forEach((item, idx) => {
      const x = startX + idx * 44;
      const y = tbY + 6;

      // Active indicator under open apps
      const isOpen = this.windows.some((w) => w.app === item.id && !w.isMinimized);
      if (isOpen) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        this.roundRect(ctx, x, y, 36, 34, 6);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x + 12, tbY + tbH - 3, 12, 2);
      }

      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.icon, x + 18, y + 17);
    });

    // Right System Tray (Clock & WiFi)
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' });

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('📶  🔊  🔋', this.width - 100, tbY + tbH / 2);

    ctx.fillStyle = '#f1f5f9';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(timeStr, this.width - 20, tbY + 16);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(dateStr, this.width - 20, tbY + 32);

    ctx.restore();
  }

  private renderCursor(ctx: CanvasRenderingContext2D) {
    const x = this.cursorX;
    const y = this.cursorY;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    // Draw realistic Windows arrow cursor
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 18);
    ctx.lineTo(x + 5, y + 13);
    ctx.lineTo(x + 9, y + 21);
    ctx.lineTo(x + 12, y + 19);
    ctx.lineTo(x + 8, y + 12);
    ctx.lineTo(x + 14, y + 12);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    if (this.isMouseDown) {
      // Small visual click ripple at tip
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  // Interactive Commands
  public moveCursor(dx: number, dy: number) {
    this.cursorX = Math.max(0, Math.min(this.width, this.cursorX + dx));
    this.cursorY = Math.max(0, Math.min(this.height, this.cursorY + dy));

    if (this.isMouseDown && this.currentPaintPath.length > 0) {
      this.currentPaintPath.push({
        x: this.cursorX,
        y: this.cursorY,
        color: '#0284c7',
        size: 4
      });
    }
  }

  public setCursorNormalized(nx: number, ny: number) {
    this.cursorX = Math.max(0, Math.min(this.width, nx * this.width));
    this.cursorY = Math.max(0, Math.min(this.height, ny * this.height));
  }

  public click(button: MouseButton = 'left') {
    this.isMouseDown = true;
    setTimeout(() => {
      this.isMouseDown = false;
    }, 120);

    // Hit test windows (top to bottom)
    const reversed = [...this.windows].reverse();
    for (const win of reversed) {
      if (!win.isMinimized && this.cursorX >= win.x && this.cursorX <= win.x + win.w && this.cursorY >= win.y && this.cursorY <= win.y + win.h) {
        this.activeWindowId = win.id;
        this.topZ += 1;
        win.zIndex = this.topZ;

        // Check if close button clicked
        const closeX = win.x + win.w - 20;
        const btnY = win.y + 18;
        const dist = Math.hypot(this.cursorX - closeX, this.cursorY - btnY);
        if (dist <= 10) {
          win.isMinimized = true;
        }
        break;
      }
    }

    // Hit test Taskbar apps
    const tbH = 46;
    const tbY = this.height - tbH;
    if (this.cursorY >= tbY) {
      const taskIcons = ['start', 'search', 'notepad', 'terminal', 'paint'];
      const centerX = this.width / 2;
      const startX = centerX - (taskIcons.length * 44) / 2;

      taskIcons.forEach((id, idx) => {
        const x = startX + idx * 44;
        if (this.cursorX >= x && this.cursorX <= x + 40) {
          const existing = this.windows.find((w) => w.app === id);
          if (existing) {
            existing.isMinimized = !existing.isMinimized;
            if (!existing.isMinimized) {
              this.activeWindowId = existing.id;
              this.topZ += 1;
              existing.zIndex = this.topZ;
            }
          }
        }
      });
    }
  }

  public mouseDown(button: MouseButton = 'left') {
    this.isMouseDown = true;
    const activeWin = this.windows.find((w) => w.id === this.activeWindowId);
    if (activeWin && activeWin.app === 'paint') {
      this.currentPaintPath = [{ x: this.cursorX, y: this.cursorY, color: '#0284c7', size: 4 }];
      this.paintPaths.push(this.currentPaintPath);
    }
  }

  public mouseUp(button: MouseButton = 'left') {
    this.isMouseDown = false;
    this.currentPaintPath = [];
  }

  public scroll(dy: number) {
    // Scroll in terminal or notepad
    if (this.activeWindowId === 'terminal') {
      // scroll logs
    }
  }

  public typeText(text: string) {
    if (this.activeWindowId === 'notepad') {
      this.notepadText += text;
    } else if (this.activeWindowId === 'terminal') {
      this.terminalLogs.push(`> ${text}`);
      this.terminalLogs.push(`Executed: ${text}`);
    }
  }

  public keyPress(key: string) {
    const k = key.toLowerCase();
    if (this.activeWindowId === 'notepad') {
      if (k === 'backspace') {
        this.notepadText = this.notepadText.slice(0, -1);
      } else if (k === 'enter') {
        this.notepadText += '\n';
      } else if (k === 'space') {
        this.notepadText += ' ';
      } else if (k === 'tab') {
        this.notepadText += '    ';
      }
    } else if (this.activeWindowId === 'terminal') {
      if (k === 'enter') {
        this.terminalLogs.push(`> command_${Math.floor(Math.random() * 100)} executed`);
      }
    }
  }
}

export const virtualPC = new VirtualPC();
