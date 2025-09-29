
import React, { useState, useEffect, useRef } from 'react';
import { Project, Chat } from '../../types';
import { Cog6ToothIcon, QuestionMarkCircleIcon, PlusIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface LeftSidebarProps {
    project: Project | null;
    chats: Chat[];
    activeChatId?: string;
    onSelectChat: (chat: Chat) => void;
    onNewChatClick: () => void;
    onUpdateChat: (chatId: string, updates: Partial<Chat>) => void;
    onSettingsClick: () => void;
    isAdminView: boolean;
    isCollapsed: boolean;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
    project, 
    chats,
    activeChatId,
    onSelectChat, 
    onNewChatClick,
    onUpdateChat,
    onSettingsClick,
    isAdminView,
    isCollapsed,
}) => {
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  
  const isSettingsDisabled = isAdminView && !project;

  useEffect(() => {
    if (renamingChatId && renameInputRef.current) {
        renameInputRef.current.focus();
        renameInputRef.current.select();
    }
  }, [renamingChatId]);

  const handleHelpClick = () => {
      alert("Help & Support documentation is coming soon!");
  }

  const handleRename = (chat: Chat) => {
    setRenamingChatId(chat.id);
    setRenameValue(chat.name);
  }

  const handleRenameSubmit = () => {
    if (renamingChatId && renameValue.trim()) {
        onUpdateChat(renamingChatId, { name: renameValue.trim() });
    }
    setRenamingChatId(null);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleRenameSubmit();
    } else if (e.key === 'Escape') {
        setRenamingChatId(null);
    }
  }

  return (
    <motion.aside 
        animate={{ width: isCollapsed ? 80 : 256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden md:flex flex-col p-4 bg-bg-secondary/30 border-r border-white/10 overflow-hidden"
    >
        <div className={`flex-shrink-0 p-3 mb-4 transition-all duration-300 ${isCollapsed ? 'px-0 text-center' : ''}`}>
             <h2 className="text-lg font-semibold text-white truncate">{!isCollapsed && (project?.name || 'No Project Selected')}</h2>
             <p className={`text-sm text-gray-500 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 h-0' : 'opacity-100'}`}>Project Chats</p>
        </div>
      
      <div className="flex-1 flex flex-col overflow-y-auto">
        {project ? (
          <div className="space-y-1">
            <button
                onClick={onNewChatClick}
                title="New Chat"
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white rounded-md bg-primary-start hover:bg-primary-start/80 transition-all duration-150 ease-in-out transform hover:scale-[1.02] active:scale-95 ${isCollapsed ? 'justify-center' : ''}`}
            >
                <PlusIcon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>New Chat</span>}
            </button>
             {chats.map(chat => (
                <div
                    key={chat.id}
                    onContextMenu={(e) => { e.preventDefault(); handleRename(chat); }}
                    title={chat.name}
                    className={`w-full rounded-md relative ${
                        activeChatId === chat.id ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                >
                    {activeChatId === chat.id && !isCollapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-primary-start rounded-r-full"></div>
                    )}
                    {activeChatId === chat.id && isCollapsed && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 h-1 w-5 bg-primary-start rounded-t-full"></div>
                    )}
                    {renamingChatId === chat.id && !isCollapsed ? (
                        <input
                            ref={renameInputRef}
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-transparent text-white px-3 py-2 text-sm font-medium focus:outline-none ring-2 ring-primary-start rounded-md"
                        />
                    ) : (
                        <button
                            onClick={() => onSelectChat(chat)}
                            className={`w-full flex items-center gap-3 py-2 text-sm font-medium transition-colors text-left truncate ${
                                activeChatId === chat.id ? 'text-white' : 'text-gray-400 hover:text-white'
                            } ${isCollapsed ? 'justify-center pl-0' : 'pl-2 pr-3'}`}
                        >
                            <ChatBubbleLeftRightIcon className="w-5 h-5 flex-shrink-0" />
                            {!isCollapsed && <span className="truncate">{chat.name}</span>}
                        </button>
                    )}
                </div>
             ))}
          </div>
        ) : (
             <div className={`px-3 text-sm text-gray-500 ${isCollapsed ? 'text-center' : ''}`}>{isCollapsed ? '...' : 'Select a project to see its chats.'}</div>
        )}
      </div>

      <div className="mt-auto flex-shrink-0 pt-4 border-t border-white/10">
          <nav className="space-y-1">
              <button
                  onClick={onSettingsClick}
                  disabled={isSettingsDisabled}
                  title={isSettingsDisabled ? "Select a project to view its settings" : "Settings"}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isSettingsDisabled 
                      ? 'text-gray-600 cursor-not-allowed' 
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  } ${isCollapsed ? 'justify-center' : ''}`}
              >
                  <Cog6ToothIcon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span>Settings</span>}
              </button>
              <button onClick={handleHelpClick} title="Help & Support" className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-white/5 hover:text-white transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
                  <QuestionMarkCircleIcon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span>Help & Support</span>}
              </button>
          </nav>
      </div>
    </motion.aside>
  );
};
