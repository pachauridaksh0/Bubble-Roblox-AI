
import React from 'react';
import { MagnifyingGlassIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

interface TopBarProps {
  onGoToDashboard: () => void;
  onSettingsClick: () => void;
}

const FALLBACK_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=880&q=80";

export const TopBar: React.FC<TopBarProps> = ({ onGoToDashboard, onSettingsClick }) => {
  const { profile, user, loading } = useAuth();
  
  const displayName = profile?.roblox_username || user?.email || 'User';
  const avatarUrl = profile?.avatar_url;

  return (
    <header className="flex-shrink-0 h-16 flex items-center justify-between px-8 border-b border-white/10 bg-bg-primary">
      <div className="flex items-center gap-4">
        <button onClick={onGoToDashboard} className="flex items-center space-x-2.5 transition-transform hover:scale-105">
            <span className="text-2xl">🫧</span>
            <span className="text-xl font-bold tracking-wider text-white">Bubble</span>
        </button>
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative hidden md:block">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-bg-secondary/50 border border-bg-tertiary rounded-lg pl-10 pr-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-start"
            />
        </div>

        <button onClick={onSettingsClick} className="p-2 rounded-full text-gray-400 hover:bg-bg-secondary hover:text-white transition-colors">
          <Cog6ToothIcon className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-3">
            {loading ? (
                <div className="w-9 h-9 rounded-full bg-bg-tertiary animate-pulse"></div>
            ) : (
                <img 
                    src={avatarUrl || FALLBACK_AVATAR} 
                    alt="User Avatar"
                    className="w-9 h-9 rounded-full object-cover bg-bg-tertiary"
                />
            )}
            <div>
                <p className="text-sm font-semibold text-white truncate max-w-[120px]">{displayName}</p>
                <p className="text-xs text-gray-500">Profile</p>
            </div>
        </div>
      </div>
    </header>
  );
};
