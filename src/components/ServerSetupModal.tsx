import React from 'react';
import { SetupGuideView } from './SetupGuideView';
import { X } from 'lucide-react';

interface ServerSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectRealPC?: (ip: string) => void;
}

export const ServerSetupModal: React.FC<ServerSetupModalProps> = ({
  isOpen,
  onClose,
  onConnectRealPC
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0 bg-slate-900/90">
          <div>
            <h2 className="text-sm font-semibold text-white">Server Setup & Instructions</h2>
            <p className="text-[11px] text-slate-400">Step-by-step instructions to run the server on your PC</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <SetupGuideView onConnectRealPC={onConnectRealPC} />
        </div>
      </div>
    </div>
  );
};
