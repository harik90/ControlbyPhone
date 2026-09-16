import React, { useState, useEffect } from 'react';
import { ConnectionStatus } from '../types';
import { X, Wifi, ArrowRight } from 'lucide-react';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHost: string;
  currentPort: number;
  status: ConnectionStatus;
  onConnect: (host: string, port: number, autoReconnect: boolean) => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  currentHost,
  currentPort,
  status,
  onConnect
}) => {
  const [host, setHost] = useState<string>(currentHost);
  const [port, setPort] = useState<number>(currentPort);
  const [autoReconnect, setAutoReconnect] = useState<boolean>(true);
  const [recentHosts, setRecentHosts] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pc_remote_recents');
      if (saved) {
        setRecentHosts(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!host.trim()) return;

    const updated = [host.trim(), ...recentHosts.filter((h) => h !== host.trim())].slice(0, 4);
    setRecentHosts(updated);
    try {
      localStorage.setItem('pc_remote_recents', JSON.stringify(updated));
    } catch {
      // Ignore
    }

    onConnect(host.trim(), port, autoReconnect);
    onClose();
  };

  const handleSelectRecent = (recent: string) => {
    setHost(recent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Connect to PC</h2>
              <p className="text-[11px] text-slate-400">Enter your computer's local WiFi IP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Status Indicator */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-400">Current Status:</span>
            {status === 'connected' ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Connected to {currentHost}:{currentPort}
              </span>
            ) : status === 'connecting' || status === 'reconnecting' ? (
              <span className="text-amber-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                Connecting...
              </span>
            ) : (
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                Disconnected
              </span>
            )}
          </div>

          {/* PC IP Input */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              PC Local IP Address
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="e.g. 192.168.1.42 or localhost"
                required
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value, 10) || 8001)}
                placeholder="Port"
                className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono text-center focus:outline-none focus:border-sky-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Shown in your terminal after running <code className="text-slate-400">python server.py</code>
            </p>
          </div>

          {/* Recent IP Quick Buttons */}
          {recentHosts.length > 0 && (
            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Recent PCs:</span>
              <div className="flex flex-wrap gap-1.5">
                {recentHosts.map((rec) => (
                  <button
                    key={rec}
                    type="button"
                    onClick={() => handleSelectRecent(rec)}
                    className="text-xs font-mono bg-slate-800 hover:bg-slate-750 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 transition-colors"
                  >
                    {rec}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Options */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
              <input
                type="checkbox"
                checked={autoReconnect}
                onChange={(e) => setAutoReconnect(e.target.checked)}
                className="rounded accent-sky-500"
              />
              <span>Auto-reconnect if WiFi drops</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <span>Connect via WiFi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
