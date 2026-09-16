/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ActiveTab, ConnectionStatus } from './types';
import { remoteClient } from './services/remoteClient';
import { Header } from './components/Header';
import { NavigationTabs } from './components/NavigationTabs';
import { ScreenTab } from './components/ScreenTab';
import { TouchpadTab } from './components/TouchpadTab';
import { KeyboardTab } from './components/KeyboardTab';
import { SetupGuideView } from './components/SetupGuideView';
import { ConnectionModal } from './components/ConnectionModal';
import { ServerSetupModal } from './components/ServerSetupModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('screen');
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [latency, setLatency] = useState<number>(0);

  // Connection config: auto-detect current hostname
  const [host, setHost] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.hostname) {
      return window.location.hostname;
    }
    return 'localhost';
  });
  const [port, setPort] = useState<number>(8000);

  // Modals
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState<boolean>(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);

  // Auto-connect to Real PC on mount & listen to status
  useEffect(() => {
    remoteClient.connect(host, port, true);

    const unsubStatus = remoteClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    const unsubLatency = remoteClient.onLatencyChange((ms) => {
      setLatency(ms);
    });

    return () => {
      unsubStatus();
      unsubLatency();
    };
  }, [host, port]);

  const handleConnect = (newHost: string, newPort: number, autoReconnect: boolean) => {
    setHost(newHost);
    setPort(newPort);
    remoteClient.connect(newHost, newPort, autoReconnect);
  };

  const handleReconnect = () => {
    remoteClient.connect(host, port, true);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Top App Header */}
      <Header
        status={status}
        latency={latency}
        onReconnect={handleReconnect}
        onOpenConnectionModal={() => setIsConnectionModalOpen(true)}
        onOpenSetupModal={() => setIsSetupModalOpen(true)}
      />

      {/* Navigation Tabs (Screen, Touchpad, Keyboard, Setup) */}
      <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Tab Viewport */}
      <main className="flex-1 w-full h-full overflow-hidden flex flex-col relative">
        {activeTab === 'screen' && <ScreenTab />}
        {activeTab === 'touchpad' && <TouchpadTab />}
        {activeTab === 'keyboard' && <KeyboardTab />}
        {activeTab === 'setup' && (
          <SetupGuideView
            onConnectRealPC={(ip) => {
              handleConnect(ip, 8000, true);
              setActiveTab('screen');
            }}
          />
        )}
      </main>

      {/* Connection Settings Modal */}
      <ConnectionModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        currentHost={host}
        currentPort={port}
        status={status}
        onConnect={handleConnect}
      />

      {/* Server Setup Modal */}
      <ServerSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onConnectRealPC={(ip) => {
          handleConnect(ip, 8000, true);
          setActiveTab('screen');
        }}
      />
    </div>
  );
}
