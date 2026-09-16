import React from 'react';
import { ConnectionStatus } from '../types';
import { Wifi, Settings, Terminal, RefreshCw } from 'lucide-react';

interface HeaderProps {
  status: ConnectionStatus;
  latency: number;
  onReconnect: () => void;
  onOpenConnectionModal: () => void;
  onOpenSetupModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  latency,
  onReconnect,
  onOpenConnectionModal,
  onOpenSetupModal
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-3.5 py-2.5 flex items-center justify-between z-30 shrink-0">
      {/* App Branding & Connection Status */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
          <Wifi className="w-4.5 h-4.5" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 leading-tight">
            PC Remote Control
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {status === 'connected' ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                Connected {latency > 0 ? `(${latency}ms)` : ''}
              </span>
            ) : status === 'connecting' || status === 'reconnecting' ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                Connecting to PC...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                Disconnected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {status !== 'connected' && (
          <button
            onClick={onReconnect}
            className="px-2.5 py-1.5 rounded-md bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30 text-xs font-medium flex items-center gap-1 transition-colors"
            title="Try reconnecting to PC"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
            <span>Reconnect</span>
          </button>
        )}

        {/* Connection Settings */}
        <button
          onClick={onOpenConnectionModal}
          className="p-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          title="Connection Settings (IP / Port)"
        >
          <Settings className="w-4 h-4 text-slate-300" />
        </button>

        {/* Setup Guide */}
        <button
          onClick={onOpenSetupModal}
          className="px-2.5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          title="Server Instructions"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Server Setup</span>
        </button>
      </div>
    </header>
  );
};
