import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserDropdown } from '../dashboard/UserDropdown';

type AdminView = 'projects' | 'users' | 'settings';

interface AdminTopBarProps {
    currentView: AdminView;
    setView: (view: AdminView) => void;
}

const FALLBACK_AVATAR_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23334155'/%3E%3Cpath d='M50 42 C61.046 42 70 50.954 70 62 L30 62 C30 50.954 38.954 42 50 42 Z' fill='white'/%3E%3Ccircle cx='50' cy='30' r='10' fill='white'/%3E%3C/svg%3E`;

export const AdminTopBar: React.FC<AdminTopBarProps> = ({ currentView, setView }) => {
  const { profile, loading, logoutAdmin } = useAuth();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItemClasses = "px-3 py-2 text-sm font-medium rounded-md transition-colors";
  const activeClasses = "bg-white/10 text-white";
  const inactiveClasses = "text-gray-400 hover:bg-white/5 hover:text-white";

  const displayName = profile?.roblox_username || 'Admin';
  const avatarUrl = profile?.avatar_url;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex-shrink-0 h-16 flex items-center justify-between px-4 md:px-8 border-b border-white/10 bg-bg-primary">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
            <span className="text-2xl">🫧</span>
            <span className="hidden sm:inline text-xl font-bold tracking-wider text-white">Bubble (Admin)</span>
        </div>
        <div className="flex items-center gap-2 p-1 bg-black/20 rounded-lg">
            <button
                onClick={() => setView('projects')}
                className={`${navItemClasses} ${currentView === 'projects' ? activeClasses : inactiveClasses}`}
            >
                Projects
            </button>
            <button
                onClick={() => setView('users')}
                className={`${navItemClasses} ${currentView === 'users' ? activeClasses : inactiveClasses}`}
            >
                Users
            </button>
             <button
                onClick={() => setView('settings')}
                className={`${navItemClasses} ${currentView === 'settings' ? activeClasses : inactiveClasses}`}
            >
                Settings
            </button>
        </div>
      </div>

      <div className="relative" ref={dropdownRef}>
          <button onClick={() => setDropdownOpen(prev => !prev)} className="flex items-center space-x-3 p-1 rounded-lg hover:bg-white/10 transition-colors">
              {loading ? (
                  <div className="w-9 h-9 rounded-full bg-bg-tertiary animate-pulse"></div>
              ) : (
                  <img 
                      src={avatarUrl || FALLBACK_AVATAR_SVG} 
                      alt="Admin Avatar"
                      className="w-9 h-9 rounded-full object-cover bg-bg-tertiary"
                  />
              )}
              <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-white truncate max-w-[120px] text-left">{displayName}</p>
                  <p className="text-xs text-gray-500">Admin Profile</p>
              </div>
          </button>
          <UserDropdown
              isOpen={isDropdownOpen}
              onClose={() => setDropdownOpen(false)}
              onExitAdmin={logoutAdmin}
              isAdminView={true}
          />
      </div>
    </header>
  );
};