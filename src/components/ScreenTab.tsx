import React, { useRef, useEffect, useState, useCallback } from 'react';
import { remoteClient } from '../services/remoteClient';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Sliders, MousePointer } from 'lucide-react';

interface TapRipple {
  id: number;
  x: number;
  y: number;
}

export const ScreenTab: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [ripples, setRipples] = useState<TapRipple[]>([]);
  const [showControls, setShowControls] = useState<boolean>(false);

  // Quality settings
  const [fps, setFps] = useState<number>(15);
  const [quality, setQuality] = useState<number>(55);

  // Screen resolution
  const [screenRes, setScreenRes] = useState<{ width: number; height: number }>({ width: 1280, height: 720 });

  // Touch tracking refs for gestures
  const touchState = useRef<{
    startX: number;
    startY: number;
    initialDistance: number;
    initialZoom: number;
    initialPanX: number;
    initialPanY: number;
    isPanning: boolean;
    lastTapTime: number;
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialDistance: 0,
    initialZoom: 1,
    initialPanX: 0,
    initialPanY: 0,
    isPanning: false,
    lastTapTime: 0,
    hasMoved: false
  });

  const latestBitmapRef = useRef<ImageBitmap | null>(null);

  // Subscribe to frames from real PC
  useEffect(() => {
    const unsubFrame = remoteClient.onFrame((bitmap) => {
      if (bitmap) {
        if (latestBitmapRef.current) {
          latestBitmapRef.current.close();
        }
        latestBitmapRef.current = bitmap;
      }
    });

    const unsubMeta = remoteClient.onScreenMeta((w, h) => {
      setScreenRes({ width: w, height: h });
    });

    return () => {
      unsubFrame();
      unsubMeta();
      if (latestBitmapRef.current) {
        latestBitmapRef.current.close();
        latestBitmapRef.current = null;
      }
    };
  }, []);

  // Main Canvas Render Loop (60 FPS)
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(render);
        return;
      }

      const cw = canvas.width;
      const ch = canvas.height;

      // Clear Canvas
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, cw, ch);

      if (latestBitmapRef.current) {
        // Render Real Screen Frame from PC
        const img = latestBitmapRef.current;
        ctx.drawImage(img, 0, 0, cw, ch);
      } else {
        // Waiting for frame / Connecting
        ctx.fillStyle = '#334155';
        ctx.font = '16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Connecting to PC live screen...', cw / 2, ch / 2 - 12);

        ctx.fillStyle = '#64748b';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText('Ensure python server.py is running on your PC', cw / 2, ch / 2 + 16);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Adjust canvas resolution to match container and source resolution
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = screenRes.width || 1280;
    canvas.height = screenRes.height || 720;
  }, [screenRes]);

  // Handle Touch Gestures: Pinch-to-zoom, Drag-to-pan, Tap-to-click, Double-tap to reset
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touches = e.touches;

    if (touches.length === 1) {
      const t = touches[0];
      touchState.current.startX = t.clientX;
      touchState.current.startY = t.clientY;
      touchState.current.initialPanX = pan.x;
      touchState.current.initialPanY = pan.y;
      touchState.current.hasMoved = false;
      touchState.current.isPanning = zoom > 1.05;
    } else if (touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
      touchState.current.initialDistance = dist;
      touchState.current.initialZoom = zoom;
      touchState.current.initialPanX = pan.x;
      touchState.current.initialPanY = pan.y;
      touchState.current.hasMoved = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touches = e.touches;

    if (touches.length === 1 && touchState.current.isPanning) {
      const t = touches[0];
      const dx = t.clientX - touchState.current.startX;
      const dy = t.clientY - touchState.current.startY;

      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        touchState.current.hasMoved = true;
      }

      setPan({
        x: touchState.current.initialPanX + dx,
        y: touchState.current.initialPanY + dy
      });
    } else if (touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );

      if (touchState.current.initialDistance > 0) {
        const ratio = dist / touchState.current.initialDistance;
        const newZoom = Math.min(4.0, Math.max(1.0, touchState.current.initialZoom * ratio));
        setZoom(newZoom);
        if (newZoom <= 1.05) {
          setPan({ x: 0, y: 0 });
        }
      }
    }
  };

  const triggerClickAt = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    // Normalized coordinates (0.0 to 1.0)
    const normX = Math.max(0, Math.min(1, clickX / rect.width));
    const normY = Math.max(0, Math.min(1, clickY / rect.height));

    // Visual Ripple
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x: clientX, y: clientY }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 500);

    // Send click with exact normalized coordinates to Real PC
    remoteClient.sendMouseClick('left', false, normX, normY);
  }, []);

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();

    if (!touchState.current.hasMoved && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];

      if (now - touchState.current.lastTapTime < 300) {
        setZoom(1.0);
        setPan({ x: 0, y: 0 });
        touchState.current.lastTapTime = 0;
      } else {
        touchState.current.lastTapTime = now;
        triggerClickAt(touch.clientX, touch.clientY);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      triggerClickAt(e.clientX, e.clientY);
    }
  };

  const resetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(4.0, Number((z + 0.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(1.0, Number((z - 0.25).toFixed(2)));
      if (next === 1.0) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleConfigChange = (newFps: number, newQuality: number) => {
    setFps(newFps);
    setQuality(newQuality);
    remoteClient.sendConfig({
      fps: newFps,
      quality: newQuality,
      scale: 0.8
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full overflow-hidden bg-black flex items-center justify-center select-none touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      {/* Zoomable & Pannable Canvas Wrapper */}
      <div
        className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
          transformOrigin: 'center center'
        }}
      >
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain shadow-2xl rounded-sm pointer-events-none"
        />
      </div>

      {/* Touch Visual Click Ripples */}
      {ripples.map((r) => (
        <div
          key={r.id}
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-400 bg-sky-400/20 animate-ping z-40"
          style={{
            left: r.x,
            top: r.y,
            width: 38,
            height: 38
          }}
        />
      ))}

      {/* Floating HUD Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
        <div className="flex items-center gap-1 bg-slate-900/85 backdrop-blur border border-slate-700/80 rounded-lg p-1 shadow-lg">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 1.0}
            className="p-1.5 text-slate-300 hover:text-white disabled:opacity-40 rounded hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-[11px] font-mono text-sky-400 font-semibold px-1 min-w-[36px] text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            disabled={zoom >= 4.0}
            className="p-1.5 text-slate-300 hover:text-white disabled:opacity-40 rounded hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {zoom > 1.0 && (
            <button
              onClick={resetZoom}
              className="p-1.5 text-amber-400 hover:text-amber-300 rounded hover:bg-slate-800 transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

          <button
            onClick={() => setShowControls(!showControls)}
            className={`p-1.5 rounded transition-colors ${
              showControls ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Stream Settings"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Stream Settings Drawer */}
        {showControls && (
          <div className="bg-slate-900/95 backdrop-blur border border-slate-700/90 rounded-lg p-3 shadow-xl text-xs flex flex-col gap-2.5 w-56 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-semibold text-slate-200">Stream Quality</span>
              <span className="text-[10px] text-slate-400">FPS / Compression</span>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                <span>FPS (Frames/sec)</span>
                <span className="text-sky-400 font-mono">{fps}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[10, 15, 30].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleConfigChange(val, quality)}
                    className={`py-1 rounded text-center text-xs font-mono font-medium transition-colors ${
                      fps === val ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    {val} fps
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                <span>JPEG Quality</span>
                <span className="text-sky-400 font-mono">{quality}%</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[40, 55, 75].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleConfigChange(fps, val)}
                    className={`py-1 rounded text-center text-xs font-mono font-medium transition-colors ${
                      quality === val ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    {val === 40 ? 'Light' : val === 55 ? 'Balanced' : 'Crisp'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Gesture Hint Pill */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-900/80 backdrop-blur border border-slate-800/80 text-slate-300 text-[11px] px-3 py-1 rounded-full flex items-center gap-2 shadow-md">
        <MousePointer className="w-3 h-3 text-sky-400 shrink-0" />
        <span>Tap to click • Pinch to zoom • Drag to pan</span>
      </div>
    </div>
  );
};
