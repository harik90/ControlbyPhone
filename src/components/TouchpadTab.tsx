import React, { useRef, useState, useCallback } from 'react';
import { remoteClient } from '../services/remoteClient';
import { MouseButton } from '../types';
import { Sliders, Lock, Unlock, ArrowUpDown, Zap } from 'lucide-react';

export const TouchpadTab: React.FC = () => {
  const padRef = useRef<HTMLDivElement | null>(null);

  // Settings
  const [sensitivity, setSensitivity] = useState<number>(2.2);
  const [isDragLocked, setIsDragLocked] = useState<boolean>(false);
  const [reverseScroll, setReverseScroll] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [acceleration, setAcceleration] = useState<boolean>(true);

  // Active touch points for visual feedback
  const [activeTouches, setActiveTouches] = useState<{ id: number; x: number; y: number }[]>([]);

  // Internal touch tracking state
  const touchState = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    lastScrollY: number;
    startTime: number;
    touchCount: number;
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    lastScrollY: 0,
    startTime: 0,
    touchCount: 0,
    hasMoved: false
  });

  const triggerHaptic = (duration = 15) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch {
        // Ignore
      }
    }
  };

  const sendMove = useCallback(
    (dx: number, dy: number) => {
      remoteClient.sendMouseMove(dx, dy);
    },
    []
  );

  const sendClick = useCallback(
    (button: MouseButton, double: boolean = false) => {
      triggerHaptic(20);
      remoteClient.sendMouseClick(button, double);
    },
    []
  );

  const sendScroll = useCallback(
    (dy: number) => {
      const scrollAmount = reverseScroll ? -dy : dy;
      remoteClient.sendMouseScroll(scrollAmount);
    },
    [reverseScroll]
  );

  const toggleDragLock = () => {
    const nextState = !isDragLocked;
    setIsDragLocked(nextState);
    triggerHaptic(30);
    if (nextState) {
      remoteClient.sendMouseDown('left');
    } else {
      remoteClient.sendMouseUp('left');
    }
  };

  const extractTouches = (touchList: React.TouchList, rect: DOMRect) => {
    const res: { id: number; x: number; y: number }[] = [];
    for (let i = 0; i < touchList.length; i++) {
      const t = touchList.item(i);
      if (t) {
        res.push({
          id: t.identifier,
          x: t.clientX - rect.left,
          y: t.clientY - rect.top
        });
      }
    }
    return res;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();

    setActiveTouches(extractTouches(e.touches, rect));

    const count = e.touches.length;
    touchState.current.touchCount = count;
    touchState.current.startTime = Date.now();
    touchState.current.hasMoved = false;

    if (count === 1) {
      const t = e.touches[0];
      touchState.current.startX = t.clientX;
      touchState.current.startY = t.clientY;
      touchState.current.lastX = t.clientX;
      touchState.current.lastY = t.clientY;
    } else if (count === 2) {
      const avgY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      touchState.current.lastScrollY = avgY;
    }
  };

  // Liquid Water Smoothing State (EMA Low-Pass Filter + Soft Inertia)
  const smoothState = useRef({
    vx: 0,
    vy: 0,
    filteredDx: 0,
    filteredDy: 0,
    lastMoveTime: 0
  });

  // Frame-buffered movement accumulator for liquid motion (60 FPS network batching)
  const moveAccumulator = useRef({ dx: 0, dy: 0, scrollDy: 0 });

  React.useEffect(() => {
    let animId: number;

    const flush = () => {
      const now = Date.now();
      const dt = now - smoothState.current.lastMoveTime;

      // Soft inertia gliding decay on finger lift
      if (dt > 16 && dt < 75) {
        smoothState.current.vx *= 0.72;
        smoothState.current.vy *= 0.72;

        if (Math.hypot(smoothState.current.vx, smoothState.current.vy) > 0.25) {
          moveAccumulator.current.dx += smoothState.current.vx;
          moveAccumulator.current.dy += smoothState.current.vy;
        }
      }

      const { dx, dy, scrollDy } = moveAccumulator.current;
      if (dx !== 0 || dy !== 0) {
        remoteClient.sendMouseMove(dx, dy);
        moveAccumulator.current.dx = 0;
        moveAccumulator.current.dy = 0;
      }
      if (scrollDy !== 0) {
        const scrollAmount = reverseScroll ? -scrollDy : scrollDy;
        remoteClient.sendMouseScroll(Math.round(scrollAmount));
        moveAccumulator.current.scrollDy = 0;
      }
      animId = requestAnimationFrame(flush);
    };

    animId = requestAnimationFrame(flush);
    return () => cancelAnimationFrame(animId);
  }, [reverseScroll]);

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();

    setActiveTouches(extractTouches(e.touches, rect));

    const count = e.touches.length;

    if (count === 1) {
      const t = e.touches[0];
      const rawDx = t.clientX - touchState.current.lastX;
      const rawDy = t.clientY - touchState.current.lastY;

      if (Math.abs(t.clientX - touchState.current.startX) > 3 || Math.abs(t.clientY - touchState.current.startY) > 3) {
        touchState.current.hasMoved = true;
      }

      touchState.current.lastX = t.clientX;
      touchState.current.lastY = t.clientY;

      if (rawDx !== 0 || rawDy !== 0) {
        // Continuous smooth velocity curve (Mac-style trackpad acceleration)
        let accelFactor = 1.0;
        if (acceleration) {
          const speed = Math.hypot(rawDx, rawDy);
          accelFactor = 1.0 + Math.pow(speed, 0.48) * 0.22;
        }

        const targetDx = rawDx * sensitivity * accelFactor;
        const targetDy = rawDy * sensitivity * accelFactor;

        // Exponential Moving Average (EMA) Low-Pass Fluid Filter
        const ALPHA = 0.65;
        const smoothDx = ALPHA * targetDx + (1 - ALPHA) * smoothState.current.filteredDx;
        const smoothDy = ALPHA * targetDy + (1 - ALPHA) * smoothState.current.filteredDy;

        smoothState.current.filteredDx = smoothDx;
        smoothState.current.filteredDy = smoothDy;
        smoothState.current.vx = smoothDx;
        smoothState.current.vy = smoothDy;
        smoothState.current.lastMoveTime = Date.now();

        moveAccumulator.current.dx += smoothDx;
        moveAccumulator.current.dy += smoothDy;
      }
    } else if (count === 2) {
      e.preventDefault();
      const avgY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const dy = avgY - touchState.current.lastScrollY;

      if (Math.abs(dy) > 1.5) {
        touchState.current.hasMoved = true;
        const scrollDelta = (dy > 0 ? -1 : 1) * Math.min(45, Math.max(8, Math.abs(dy) * 3.5));
        moveAccumulator.current.scrollDy += scrollDelta;
        touchState.current.lastScrollY = avgY;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const pad = padRef.current;
    if (pad) {
      const rect = pad.getBoundingClientRect();
      setActiveTouches(extractTouches(e.touches, rect));
    } else {
      setActiveTouches([]);
    }

    const duration = Date.now() - touchState.current.startTime;

    if (!touchState.current.hasMoved && duration < 250) {
      if (touchState.current.touchCount === 1) {
        sendClick('left');
      } else if (touchState.current.touchCount === 2) {
        sendClick('right');
      }
    }

    if (e.touches.length === 0) {
      touchState.current.touchCount = 0;
      touchState.current.hasMoved = false;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons === 1) {
      sendMove(Math.round(e.movementX * sensitivity), Math.round(e.movementY * sensitivity));
    }
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-slate-950 p-2 sm:p-3 overflow-hidden select-none">
      {/* Top Touchpad Utility Bar */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDragLock}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isDragLocked
                ? 'bg-amber-500 text-black font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
            title="Drag Lock: Hold left mouse button down while moving"
          >
            {isDragLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>Drag Lock</span>
          </button>

          <button
            onClick={() => setReverseScroll(!reverseScroll)}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
              reverseScroll ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Natural / Inverted Scrolling"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invert Scroll</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAcceleration(!acceleration)}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
              acceleration ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
            title="Toggle Trackpad Acceleration"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Accel</span>
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1 rounded text-xs transition-colors ${
              showSettings ? 'bg-slate-700 text-sky-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Touchpad Sensitivity"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sensitivity Settings Drawer */}
      {showSettings && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 mb-2 text-xs animate-in fade-in slide-in-from-top-1 shrink-0 space-y-2">
          <div className="flex justify-between text-slate-300">
            <span className="font-semibold">Cursor Speed & Sensitivity</span>
            <span className="text-sky-400 font-mono font-bold">{sensitivity}x</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">Precision</span>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.2"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="flex-1 accent-sky-500 cursor-pointer"
            />
            <span className="text-slate-500 text-[11px]">Ultra Fast</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[1.5, 2.2, 3.5, 5.0].map((speed) => (
              <button
                key={speed}
                onClick={() => setSensitivity(speed)}
                className={`py-1 rounded text-center text-xs font-mono font-medium transition-colors ${
                  sensitivity === speed
                    ? 'bg-sky-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Dedicated Trackpad Area */}
      <div
        ref={padRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleMouseMove}
        className="flex-1 w-full relative bg-slate-900/70 hover:bg-slate-900/90 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center touch-none overflow-hidden transition-colors"
      >
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {activeTouches.map((touch) => (
          <div
            key={touch.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-2 border-sky-400/80 bg-sky-400/15 pointer-events-none animate-pulse"
            style={{
              left: touch.x,
              top: touch.y
            }}
          />
        ))}

        <div className="pointer-events-none flex flex-col items-center gap-2 text-center p-4">
          <div className="w-12 h-8 border-2 border-slate-700 rounded-md flex items-center justify-center text-slate-500">
            <div className="w-2 h-2 rounded-full bg-slate-600" />
          </div>
          <p className="text-slate-300 font-medium text-sm">Ultra-Smooth Trackpad</p>
          <div className="text-[11px] text-slate-500 space-y-0.5 max-w-xs leading-relaxed">
            <div>• Drag 1 finger: <span className="text-slate-300">Move cursor</span></div>
            <div>• Tap 1 finger: <span className="text-slate-300">Left-click</span></div>
            <div>• Tap 2 fingers: <span className="text-slate-300">Right-click</span></div>
            <div>• Swipe 2 fingers: <span className="text-slate-300">Scroll page</span></div>
          </div>
        </div>

        {isDragLocked && (
          <div className="absolute top-3 left-3 bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-medium animate-pulse">
            <Lock className="w-3 h-3" />
            <span>Dragging (Button Held)</span>
          </div>
        )}
      </div>

      {/* Tactile Hardware Mouse Buttons at Bottom */}
      <div className="h-16 mt-2 grid grid-cols-3 gap-2 shrink-0">
        <button
          onClick={() => sendClick('left')}
          className="bg-slate-850 hover:bg-slate-800 active:bg-sky-600 active:text-white border border-slate-700/80 rounded-lg flex flex-col items-center justify-center font-medium text-xs text-slate-200 transition-colors shadow-sm"
        >
          <span>Left Click</span>
          <span className="text-[10px] text-slate-500">Primary</span>
        </button>

        <button
          onClick={() => sendClick('middle')}
          className="bg-slate-850 hover:bg-slate-800 active:bg-sky-600 active:text-white border border-slate-700/80 rounded-lg flex flex-col items-center justify-center font-medium text-xs text-slate-300 transition-colors shadow-sm"
        >
          <span>Wheel Click</span>
          <span className="text-[10px] text-slate-500">Middle</span>
        </button>

        <button
          onClick={() => sendClick('right')}
          className="bg-slate-850 hover:bg-slate-800 active:bg-sky-600 active:text-white border border-slate-700/80 rounded-lg flex flex-col items-center justify-center font-medium text-xs text-slate-200 transition-colors shadow-sm"
        >
          <span>Right Click</span>
          <span className="text-[10px] text-slate-500">Context Menu</span>
        </button>
      </div>
    </div>
  );
};
