import React, { useState } from 'react';
import { SERVER_PY, REQUIREMENTS_TXT } from '../data/serverScripts';
import {
  Download,
  Copy,
  Check,
  Terminal,
  HelpCircle,
  FileCode,
  QrCode,
  ExternalLink,
  ShieldAlert,
  Apple,
  Cpu,
  Monitor
} from 'lucide-react';

interface SetupGuideViewProps {
  onConnectRealPC?: (ip: string) => void;
}

export const SetupGuideView: React.FC<SetupGuideViewProps> = ({ onConnectRealPC }) => {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [activeOS, setActiveOS] = useState<'windows' | 'mac' | 'linux'>('windows');
  const [customIP, setCustomIP] = useState<string>('192.168.1.100');

  const handleCopy = (filename: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const handleDownload = (filename: string, text: string, mime: string = 'text/plain') => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-slate-950 p-3 sm:p-5 text-slate-200">
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        {/* Banner */}
        <div className="bg-gradient-to-r from-sky-950/60 to-slate-900 border border-sky-900/50 rounded-2xl p-5 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">PC Remote Control Setup</h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                Control your mouse, keyboard, and view your live screen over your local home WiFi.
                No APK installation, no cloud servers, no account required.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button
                  onClick={() => handleDownload('server.py', SERVER_PY)}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download server.py</span>
                </button>

                <button
                  onClick={() => handleDownload('requirements.txt', REQUIREMENTS_TXT)}
                  className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download requirements.txt</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Install Python */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center border border-sky-500/40">
                1
              </span>
              <h3 className="text-sm font-semibold text-white">Install Python (skip if already installed)</h3>
            </div>

            {/* OS Tabs */}
            <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setActiveOS('windows')}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  activeOS === 'windows' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Windows
              </button>
              <button
                onClick={() => setActiveOS('mac')}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  activeOS === 'mac' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mac
              </button>
              <button
                onClick={() => setActiveOS('linux')}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  activeOS === 'linux' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Linux
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-300 space-y-2 leading-relaxed pl-8">
            {activeOS === 'windows' && (
              <div>
                <p>
                  Download Python from{' '}
                  <a
                    href="https://www.python.org/downloads/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    python.org/downloads <ExternalLink className="w-3 h-3 inline" />
                  </a>
                  .
                </p>
                <div className="mt-1.5 p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-lg text-amber-200 font-medium">
                  ⚠️ Important during Windows install: <span className="underline">tick "Add Python to PATH"</span> before clicking Install.
                </div>
              </div>
            )}
            {activeOS === 'mac' && (
              <div>
                <p>
                  Download from python.org or install via Homebrew in Terminal:
                </p>
                <code className="block mt-1.5 bg-slate-950 border border-slate-800 px-3 py-2 rounded font-mono text-emerald-400">
                  brew install python3
                </code>
              </div>
            )}
            {activeOS === 'linux' && (
              <div>
                <p>Linux usually has Python pre-installed. If not, run:</p>
                <code className="block mt-1.5 bg-slate-950 border border-slate-800 px-3 py-2 rounded font-mono text-emerald-400">
                  sudo apt install python3 python3-pip
                </code>
              </div>
            )}

            <div className="mt-2 text-slate-400 text-[11px]">
              Verify installation by running <code className="bg-slate-950 px-1 py-0.5 rounded text-sky-300">python --version</code> or <code className="bg-slate-950 px-1 py-0.5 rounded text-sky-300">python3 --version</code> in your terminal.
            </div>
          </div>
        </div>

        {/* Step 2: Install Libraries */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center border border-sky-500/40">
                2
              </span>
              <h3 className="text-sm font-semibold text-white">Install Required Libraries</h3>
            </div>
            <button
              onClick={() => handleCopy('req-cmd', 'pip install -r requirements.txt')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              {copiedFile === 'req-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFile === 'req-cmd' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="pl-8 space-y-2 text-xs text-slate-300">
            <p>Open a terminal in your project folder and run:</p>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-emerald-400 flex items-center justify-between">
              <span>pip install -r requirements.txt</span>
              <span className="text-slate-500 text-[10px]">(or pip3 on Mac/Linux)</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Installs: <code className="text-slate-200">websockets</code>, <code className="text-slate-200">pyautogui</code>, <code className="text-slate-200">qrcode</code>, <code className="text-slate-200">mss</code>, <code className="text-slate-200">Pillow</code> — 100% free and open-source.
            </p>
          </div>
        </div>

        {/* Step 3: Run the Server */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center border border-sky-500/40">
                3
              </span>
              <h3 className="text-sm font-semibold text-white">Run the Python Server</h3>
            </div>
            <button
              onClick={() => handleCopy('run-cmd', 'python server.py')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              {copiedFile === 'run-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFile === 'run-cmd' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="pl-8 space-y-2 text-xs text-slate-300">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-emerald-400">
              python server.py
            </div>

            <p className="text-slate-400 text-[11px]">
              The terminal will display your local WiFi address (e.g.{' '}
              <span className="text-sky-300">http://192.168.1.42:8000</span>) and a QR code. Keep this terminal window open while using remote control!
            </p>

            {/* Terminal Output Mockup */}
            <div className="bg-black/90 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-300 space-y-1 mt-2">
              <div className="text-sky-400">============================================================</div>
              <div className="text-white font-bold"> PC REMOTE CONTROL SERVER - ACTIVE & RUNNING</div>
              <div className="text-sky-400">============================================================</div>
              <div className="text-slate-400"> Open this on your PHONE'S BROWSER (same WiFi):</div>
              <div className="text-emerald-400 font-bold text-xs">   http://192.168.1.42:8000</div>
              <div className="text-slate-400"> Or scan the QR code printed in terminal...</div>
              <div className="text-slate-500"> Keep this window open. Press Ctrl+C to stop.</div>
            </div>
          </div>
        </div>

        {/* Step 4: Connect Phone */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center border border-sky-500/40">
              4
            </span>
            <h3 className="text-sm font-semibold text-white">Connect Your Phone</h3>
          </div>

          <div className="pl-8 space-y-2 text-xs text-slate-300">
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 leading-relaxed">
              <li>
                Ensure your <strong className="text-white">phone and PC are on the same WiFi network</strong>.
              </li>
              <li>Scan the QR code from the terminal with your phone camera, OR type the PC's IP address.</li>
              <li>
                You will see a green <span className="text-emerald-400 font-medium">"Connected"</span> indicator at the top of the page.
              </li>
              <li>
                Switch between the <strong className="text-white">Screen</strong>,{' '}
                <strong className="text-white">Touchpad</strong>, and{' '}
                <strong className="text-white">Keyboard</strong> tabs to control your computer!
              </li>
            </ul>
          </div>
        </div>

        {/* Troubleshooting Section */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Troubleshooting & Tips</h3>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="border-l-2 border-sky-500 pl-3">
              <strong className="text-white block mb-0.5">"Reconnecting…" never turns to "Connected"</strong>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Your phone and PC must be on the exact same WiFi network. Public or corporate guest networks often block device-to-device communication; try your home router or personal mobile hotspot.
              </p>
            </div>

            <div className="border-l-2 border-sky-500 pl-3">
              <strong className="text-white block mb-0.5">Firewall prompt on first run</strong>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Your OS will ask to allow Python network access — click <strong>Allow</strong>. This only opens local WiFi access, nothing goes to the public internet.
              </p>
            </div>

            <div className="border-l-2 border-sky-500 pl-3">
              <strong className="text-white block mb-0.5">Mac Permissions (macOS Sequoia, Sonoma, Ventura)</strong>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                macOS requires granting <strong>Accessibility</strong> and <strong>Screen Recording</strong> permissions to your terminal app (System Settings → Privacy & Security).
              </p>
            </div>

            <div className="border-l-2 border-sky-500 pl-3">
              <strong className="text-white block mb-0.5">Cursor jumps to corner failsafe</strong>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                PyAutoGUI includes a built-in safety failsafe: dragging the mouse into any screen corner immediately pauses automation as an emergency stop. Simply nudge the cursor back toward center.
              </p>
            </div>

            <div className="border-l-2 border-sky-500 pl-3">
              <strong className="text-white block mb-0.5">Screen feels laggy on weak WiFi</strong>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Use the settings button in the Screen tab to set FPS to 10-15 and compression to Balanced (55%), or move closer to your WiFi router.
              </p>
            </div>
          </div>
        </div>

        {/* View Server Code */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Full server.py Code</h3>
            </div>
            <button
              onClick={() => handleCopy('server.py', SERVER_PY)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              {copiedFile === 'server.py' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFile === 'server.py' ? 'Copied' : 'Copy All'}</span>
            </button>
          </div>

          <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-300 font-mono overflow-x-auto max-h-72">
            {SERVER_PY}
          </pre>
        </div>
      </div>
    </div>
  );
};
