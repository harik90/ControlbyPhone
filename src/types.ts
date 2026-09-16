export type ActiveTab = 'screen' | 'touchpad' | 'keyboard' | 'setup';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

export type MouseButton = 'left' | 'right' | 'middle';

export interface StreamSettings {
  fps: number; // e.g., 15, 20, 30
  quality: number; // JPEG quality: 30 - 90
  scale: number; // 0.5 - 1.0
}

export interface ConnectionConfig {
  host: string;
  port: number;
  autoReconnect: boolean;
  isDemoMode: boolean;
}

export interface VirtualWindowState {
  id: string;
  title: string;
  type: 'notepad' | 'terminal' | 'browser' | 'paint' | 'monitor';
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}
