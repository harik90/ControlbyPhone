import React, { useState, useRef } from 'react';
import { remoteClient } from '../services/remoteClient';
import {
  Send,
  Delete,
  CornerDownLeft,
  Space,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Copy,
  Clipboard,
  Undo,
  VolumeX,
  Play,
  Monitor,
  Lock,
  Layers,
  Zap
} from 'lucide-react';

export const KeyboardTab: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [isLiveSync, setIsLiveSync] = useState<boolean>(true);
  const [activeModifiers, setActiveModifiers] = useState<Record<string, boolean>>({
    ctrl: false,
    alt: false,
    shift: false,
    win: false
  });

  const prevTextRef = useRef<string>('');

  const sendKey = (keyName: string) => {
    const modifiers = Object.entries(activeModifiers)
      .filter(([_, active]) => active)
      .map(([mod]) => mod);

    if (modifiers.length > 0) {
      const allKeys = [...modifiers, keyName];
      remoteClient.sendHotkey(allKeys);
      setActiveModifiers({ ctrl: false, alt: false, shift: false, win: false });
    } else {
      remoteClient.sendKeyPress(keyName);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    const prevText = prevTextRef.current;

    if (isLiveSync) {
      // High-performance Common Prefix & Suffix diffing algorithm
      let p = 0;
      while (p < prevText.length && p < newText.length && prevText[p] === newText[p]) {
        p++;
      }

      let s = 0;
      while (
        s < prevText.length - p &&
        s < newText.length - p &&
        prevText[prevText.length - 1 - s] === newText[newText.length - 1 - s]
      ) {
        s++;
      }

      const numBackspaces = prevText.length - p - s;
      const addedText = newText.slice(p, newText.length - s);

      if (numBackspaces > 0 || addedText.length > 0) {
        remoteClient.sendTypeSync(numBackspaces, addedText);
      }
    }

    prevTextRef.current = newText;
    setInputText(newText);
  };

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText) return;

    if (!isLiveSync) {
      remoteClient.sendTypeText(inputText);
    }
    remoteClient.sendKeyPress('enter');
    setInputText('');
    prevTextRef.current = '';
  };

  const toggleModifier = (mod: 'ctrl' | 'alt' | 'shift' | 'win') => {
    setActiveModifiers((prev) => ({
      ...prev,
      [mod]: !prev[mod]
    }));
  };

  const sendDirectHotkey = (keys: string[]) => {
    remoteClient.sendHotkey(keys);
  };

  const [docText, setDocText] = useState<string>('');
  const [showDocArea, setShowDocArea] = useState<boolean>(false);

  const handlePasteDocument = () => {
    if (!docText.trim()) return;
    remoteClient.sendTypeText(docText);
    setDocText('');
    setShowDocArea(false);
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-slate-950 p-2 sm:p-3 overflow-y-auto">
      {/* 1. Main Realtime Live Sync Typing Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md mb-3 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Realtime Live Sync Keyboard
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowDocArea(!showDocArea)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                showDocArea ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Paste Multi-line Document / File Text"
            >
              <Clipboard className="w-3 h-3" />
              <span>Paste Doc</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLiveSync(!isLiveSync)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                isLiveSync ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>{isLiveSync ? 'Live Sync: ON' : 'Live Sync: OFF'}</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSendText} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={isLiveSync ? "Type here — characters send to PC in realtime! ⚡" : "Type paragraph and click Send..."}
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enter</span>
          </button>
        </form>
        {isLiveSync && (
          <p className="text-[10px] text-emerald-400/90 mt-1">
            ⚡ Every letter & backspace you type is sent instantly to your PC in real-time.
          </p>
        )}

        {/* Dedicated Document / Multiline File Paste Box */}
        {showDocArea && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-800 animate-in fade-in slide-in-from-top-1">
            <label className="block text-[11px] font-semibold text-sky-400 mb-1">
              Paste Large Paragraph, File, or Document:
            </label>
            <textarea
              rows={4}
              value={docText}
              onChange={(e) => setDocText(e.target.value)}
              placeholder="Paste long document text, multi-line code, articles, or notes here..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono leading-relaxed"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-[10px] text-slate-400">
                Instantly pastes using native Windows Unicode Clipboard (0ms delay)
              </span>
              <button
                type="button"
                onClick={handlePasteDocument}
                disabled={!docText.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste to PC (Instant)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Quick Essential Keys */}
      <div className="mb-3 shrink-0">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">
          Quick Essential Keys
        </div>
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          <button
            onClick={() => sendKey('esc')}
            className="bg-slate-850 hover:bg-slate-800 active:bg-sky-600 active:text-white border border-slate-700/80 text-slate-200 font-semibold text-xs py-3 rounded-lg flex flex-col items-center justify-center transition-colors shadow-sm"
          >
            <span>Esc</span>
          </button>

          <button
            onClick={() => sendKey('tab')}
            className="bg-slate-850 hover:bg-slate-800 active:bg-sky-600 active:text-white border border-slate-700/80 text-slate-200 font-semibold text-xs py-3 rounded-lg flex flex-col items-center justify-center transition-colors shadow-sm"
          >
            <span>Tab</span>
          </button>

          <button
            onClick={() => sendKey('space')}
            className="bg-slate-850 hover:bg-slate-800 active:bg-sky-600 active:text-white border border-slate-700/80 text-slate-200 font-semibold text-xs py-3 rounded-lg flex flex-col items-center justify-center transition-colors shadow-sm"
          >
            <span className="flex items-center gap-1">
              <Space className="w-3.5 h-3.5" />
              <span>Space</span>
            </span>
          </button>

          <button
            onClick={() => sendKey('backspace')}
            className="bg-slate-850 hover:bg-slate-800 active:bg-rose-600 active:text-white border border-slate-700/80 text-slate-200 font-semibold text-xs py-3 rounded-lg flex flex-col items-center justify-center transition-colors shadow-sm"
          >
            <span className="flex items-center gap-1">
              <Delete className="w-3.5 h-3.5" />
              <span>Bksp</span>
            </span>
          </button>

          <button
            onClick={() => sendKey('enter')}
            className="bg-sky-600/25 hover:bg-sky-600/40 active:bg-sky-600 border border-sky-500/50 text-sky-300 active:text-white font-semibold text-xs py-3 rounded-lg flex flex-col items-center justify-center transition-colors shadow-sm"
          >
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3.5 h-3.5" />
              <span>Enter</span>
            </span>
          </button>
        </div>
      </div>

      {/* 3. Modifier Keys */}
      <div className="mb-3 shrink-0">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5 flex items-center justify-between">
          <span>Modifier Keys</span>
          <span className="text-[10px] text-slate-500 lowercase">tap to hold</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {(['ctrl', 'alt', 'shift', 'win'] as const).map((mod) => (
            <button
              key={mod}
              onClick={() => toggleModifier(mod)}
              className={`py-2.5 rounded-lg border text-xs font-semibold uppercase transition-colors flex items-center justify-center ${
                activeModifiers[mod]
                  ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700/80'
              }`}
            >
              <span>{mod === 'win' ? 'Win / ⌘' : mod}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Directional Arrows & Navigation */}
      <div className="mb-3 shrink-0">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">
          Navigation & Arrows
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          <button
            onClick={() => sendKey('home')}
            className="bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-lg py-2.5 text-xs font-medium"
          >
            Home
          </button>

          <button
            onClick={() => sendKey('left')}
            className="bg-slate-850 hover:bg-slate-800 active:bg-sky-600 active:text-white text-slate-200 border border-slate-700/80 rounded-lg py-2.5 flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => sendKey('up')}
              className="bg-slate-850 hover:bg-slate-800 active:bg-sky-600 active:text-white text-slate-200 border border-slate-700/80 rounded-lg py-1 flex items-center justify-center flex-1"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => sendKey('down')}
              className="bg-slate-850 hover:bg-slate-800 active:bg-sky-600 active:text-white text-slate-200 border border-slate-700/80 rounded-lg py-1 flex items-center justify-center flex-1"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => sendKey('right')}
            className="bg-slate-850 hover:bg-slate-800 active:bg-sky-600 active:text-white text-slate-200 border border-slate-700/80 rounded-lg py-2.5 flex items-center justify-center"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => sendKey('end')}
            className="bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-lg py-2.5 text-xs font-medium"
          >
            End
          </button>

          <button
            onClick={() => sendKey('pageup')}
            className="bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-lg py-2.5 text-[11px] font-medium"
          >
            PgUp
          </button>

          <button
            onClick={() => sendKey('pagedown')}
            className="bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-lg py-2.5 text-[11px] font-medium"
          >
            PgDn
          </button>
        </div>
      </div>

      {/* 5. Common Shortcuts & Media Controls */}
      <div className="mb-2 shrink-0">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">
          1-Touch PC Shortcuts
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
          <button
            onClick={() => sendDirectHotkey(['ctrl', 'c'])}
            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg p-2 flex items-center gap-2 text-xs text-slate-200"
          >
            <Copy className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Copy (Ctrl+C)</span>
          </button>

          <button
            onClick={() => sendDirectHotkey(['ctrl', 'v'])}
            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg p-2 flex items-center gap-2 text-xs text-slate-200"
          >
            <Clipboard className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Paste (Ctrl+V)</span>
          </button>

          <button
            onClick={() => sendDirectHotkey(['ctrl', 'z'])}
            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg p-2 flex items-center gap-2 text-xs text-slate-200"
          >
            <Undo className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Undo (Ctrl+Z)</span>
          </button>

          <button
            onClick={() => sendDirectHotkey(['alt', 'tab'])}
            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg p-2 flex items-center gap-2 text-xs text-slate-200"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Switch App (Alt+Tab)</span>
          </button>

          <button
            onClick={() => sendDirectHotkey(['win', 'd'])}
            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg p-2 flex items-center gap-2 text-xs text-slate-200"
          >
            <Monitor className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Desktop (Win+D)</span>
          </button>

          <button
            onClick={() => sendDirectHotkey(['win', 'l'])}
            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg p-2 flex items-center gap-2 text-xs text-slate-200"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Lock PC (Win+L)</span>
          </button>

          <button
            onClick={() => sendKey('volumemute')}
            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg p-2 flex items-center gap-2 text-xs text-slate-200"
          >
            <VolumeX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Mute / Unmute</span>
          </button>

          <button
            onClick={() => sendKey('playpause')}
            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg p-2 flex items-center gap-2 text-xs text-slate-200"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Media Play / Pause</span>
          </button>
        </div>
      </div>
    </div>
  );
};
