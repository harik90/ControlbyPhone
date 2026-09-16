import React from 'react';
import { ActiveTab } from '../types';
import { Monitor, Move, Keyboard, BookOpen } from 'lucide-react';

interface NavigationTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'screen' as ActiveTab, label: 'Screen', icon: Monitor, hint: 'Live Display & Tap' },
    { id: 'touchpad' as ActiveTab, label: 'Touchpad', icon: Move, hint: 'Trackpad Gestures' },
    { id: 'keyboard' as ActiveTab, label: 'Keyboard', icon: Keyboard, hint: 'Typing & Shortcuts' },
    { id: 'setup' as ActiveTab, label: 'Setup Guide', icon: BookOpen, hint: 'Python Server' }
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-2 py-1.5 flex items-center justify-around gap-1 shrink-0">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-2 px-1.5 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all relative ${
              isActive
                ? 'bg-slate-800 text-sky-400 font-semibold border border-slate-700/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
            <span className="text-xs tracking-tight">{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-sky-400 rounded-full sm:hidden" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
