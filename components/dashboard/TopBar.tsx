import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, ChevronUpIcon, ChevronDownIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { UserDropdown } from './UserDropdown';

interface ProjectSearchBarProps {
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    searchResultCount: number;
    currentSearchResultIndex: number;
    onNextSearchResult: () => void;
    onPrevSearchResult: () => void;
}

const ProjectSearchBar: React.FC<ProjectSearchBarProps> = ({
    searchQuery,
    onSearchQueryChange,
    searchResultCount,
    currentSearchResultIndex,
    onNextSearchResult,
    onPrevSearchResult,
}) => {
    return (
        <div className="relative w-72">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
            <input
                type="text"
                placeholder="Search in project..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="bg-bg-secondary/50 border border-bg-tertiary rounded-lg pl-10 pr-28 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary-start"
            />
            {searchQuery && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center bg-bg-secondary rounded-full">
                    <span className="text-xs text-gray-400 px-2">
                        {searchResultCount > 0 ? `${currentSearchResultIndex + 1} of ${searchResultCount}` : '0 results'}
                    </span>
                    <button onClick={onPrevSearchResult} disabled={searchResultCount === 0} className="p-1 text-gray-400 hover:text-white disabled:opacity-50">
                        <ChevronUpIcon className="w-4 h-4" />
                    </button>
                    <button onClick={onNextSearchResult} disabled={searchResultCount === 0} className="p-1 text-gray-400 hover:text-white disabled:opacity-50">
                        <ChevronDownIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => onSearchQueryChange('')} className="p-1 text-gray-400 hover:text-white">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};


interface TopBarProps {
  onGoToDashboard: () => void;
  onAccountSettingsClick: () => void;
  onProjectSettingsClick: () => void;
  activeProjectName: string | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResultCount: number;
  currentSearchResultIndex: number;
  onNextSearchResult: () => void;
  onPrevSearchResult: () => void;
}

const FALLBACK_AVATAR_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23334155'/%3E%3Cpath d='M50 42 C61.046 42 70 50.954 70 62 L30 62 C30 50.954 38.954 42 50 42 Z' fill='white'/%3E%3Ccircle cx='50' cy='30' r='10' fill='white'/%3E%3C/svg%3E`;

export const TopBar: React.FC<TopBarProps> = ({ 
    onGoToDashboard, 
    onAccountSettingsClick, 
    onProjectSettingsClick,
    activeProjectName,
    searchQuery,
    onSearchQueryChange,
    searchResultCount,
    currentSearchResultIndex,
    onNextSearchResult,
    onPrevSearchResult
}) => {
  const { profile, user, signOut, loading } = useAuth();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const displayName = profile?.roblox_username || user?.email || 'User';
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
    <header className="flex-shrink-0 h-16 flex items-center justify-between px-8 border-b border-white/10 bg-bg-primary">
      <div className="flex items-center gap-4">
        <button onClick={onGoToDashboard} className="flex items-center space-x-2.5 transition-transform hover:scale-105">
            <span className="text-2xl">🫧</span>
            <span className="text-xl font-bold tracking-wider text-white">Bubble</span>
        </button>
        {activeProjectName && (
            <>
                <div className="h-6 w-px bg-white/10"></div>
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-200">{activeProjectName}</span>
                    <button onClick={onProjectSettingsClick} className="p-1.5 text-gray-400 rounded-md hover:bg-white/10 hover:text-white transition-colors">
                        <Cog6ToothIcon className="w-5 h-5" />
                    </button>
                </div>
            </>
        )}
      </div>
      <div className="flex items-center space-x-4">
        {activeProjectName ? (
            <ProjectSearchBar
                searchQuery={searchQuery}
                onSearchQueryChange={onSearchQueryChange}
                searchResultCount={searchResultCount}
                currentSearchResultIndex={currentSearchResultIndex}
                onNextSearchResult={onNextSearchResult}
                onPrevSearchResult={onPrevSearchResult}
            />
        ) : (
            <div className="relative hidden md:block">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Search all projects..." 
                  className="bg-bg-secondary/50 border border-bg-tertiary rounded-lg pl-10 pr-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-start"
                />
            </div>
        )}

        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setDropdownOpen(prev => !prev)} className="flex items-center space-x-3 p-1 rounded-lg hover:bg-white/10 transition-colors">
                {loading ? (
                    <div className="w-9 h-9 rounded-full bg-bg-tertiary animate-pulse"></div>
                ) : (
                    <img 
                        src={avatarUrl || FALLBACK_AVATAR_SVG} 
                        alt="User Avatar"
                        className="w-9 h-9 rounded-full object-cover bg-bg-tertiary"
                    />
                )}
                <div>
                    <p className="text-sm font-semibold text-white truncate max-w-[120px] text-left">{displayName}</p>
                    <p className="text-xs text-gray-500">Profile</p>
                </div>
            </button>
            <UserDropdown 
                isOpen={isDropdownOpen}
                onClose={() => setDropdownOpen(false)}
                onSettingsClick={onAccountSettingsClick}
                onLogout={signOut}
            />
        </div>
      </div>
    </header>
  );
};