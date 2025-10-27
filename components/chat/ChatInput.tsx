

import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, ChevronDownIcon, SparklesIcon, PlusIcon } from '@heroicons/react/24/solid';
import { Chat, ChatMode, WorkspaceMode, Project, ChatWithProjectData } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatBubbleLeftEllipsisIcon, CpuChipIcon, PuzzlePieceIcon, AcademicCapIcon } from '@heroicons/react/24/solid';
import { VoiceControls } from './VoiceControls';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  chat: ChatWithProjectData | null; // Can be null for new chat
  onChatUpdate: ((updates: Partial<Chat>) => void) | null;
  isAdmin: boolean;
  workspaceMode: WorkspaceMode;
  isInitialView: boolean;
  loadingMessage: string;
  project: Project | null;
}

const placeholders: Record<WorkspaceMode, string[]> = {
  autonomous: [
    "What's on your mind?",
    "Ask me anything...",
    "Let's build something!",
    "Need help with something?",
  ],
  cocreator: [
    "Describe your idea...",
    "What should we create?",
    "Tell me about your project...",
  ],
};

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, chat, onChatUpdate, isAdmin, workspaceMode, isInitialView, loadingMessage, project }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isModeSelectorOpen, setModeSelectorOpen] = useState(false);
  const modeSelectorRef = useRef<HTMLDivElement>(null);
  const [placeholder, setPlaceholder] = useState('');

  useEffect(() => {
    const options = placeholders[workspaceMode] || placeholders.autonomous;
    const randomPlaceholder = options[Math.floor(Math.random() * options.length)];
    setPlaceholder(randomPlaceholder);
  }, [workspaceMode, chat]); // Rerun when mode or chat changes.
  
  const modeMap: Record<ChatMode, { name: string, description: string, icon: React.ReactElement }> = {
    'chat': { name: 'Bubble Chat', description: 'For conversational chat', icon: <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-primary-start" /> },
    'plan': { name: 'Bubble Memory', description: "Create/update the project's long-term memory", icon: <AcademicCapIcon className="w-5 h-5 text-blue-400" /> },
    'build': { name: 'Bubble Build', description: 'Generate a build plan from project memory', icon: <SparklesIcon className="w-5 h-5 text-green-400" /> },
    'thinker': { name: 'Bubble Thinker', description: 'Debate ideas', icon: <CpuChipIcon className="w-5 h-5 text-yellow-400" /> },
    'super_agent': { name: 'Bubble Max', description: 'Advanced agent', icon: <PuzzlePieceIcon className="w-5 h-5 text-violet-400" /> },
    'pro_max': { name: 'Bubble Pro Max', description: 'Developer-only expert agent', icon: <AcademicCapIcon className="w-5 h-5 text-orange-400" /> }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(adjustTextareaHeight, [text]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (modeSelectorRef.current && !modeSelectorRef.current.contains(event.target as Node)) {
            setModeSelectorOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onSendMessage(text);
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
    }
  };

  const handleTranscript = (transcript: string) => {
    setText(prev => (prev ? prev + ' ' : '') + transcript);
  };

  const handleModeChange = (newMode: ChatMode) => {
    onChatUpdate?.({ mode: newMode });
    setModeSelectorOpen(false);
  };

  const currentModeDetails = chat ? (modeMap[chat.mode] || modeMap['chat']) : modeMap['build'];
  
  const modesToShow = ['chat', 'plan', 'build', 'thinker', 'super_agent'];
  if (isAdmin) {
      modesToShow.push('pro_max');
  }
  
  const isFloating = isInitialView && !chat;

  const containerClasses = isFloating
    ? 'absolute bottom-[35vh] left-1/2 -translate-x-1/2 w-full max-w-2xl px-4'
    : 'w-full px-4 pb-4';

  const formWrapperClasses = isFloating
    ? 'relative'
    : 'relative max-w-4xl mx-auto';

  const formClasses = `relative bg-bg-secondary border border-border-color rounded-3xl shadow-2xl flex items-end p-2 gap-2`;

  return (
    <div className={containerClasses}>
        <div className={formWrapperClasses}>
            <AnimatePresence>
                {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-bg-tertiary/70 backdrop-blur-sm flex items-center justify-center rounded-2xl z-10"
                >
                    <div className="flex items-center gap-3 text-text-secondary font-medium">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>{loadingMessage}</span>
                    </div>
                </motion.div>
                )}
            </AnimatePresence>
          <form
            onSubmit={handleSubmit}
            className={formClasses}
          >
            {/* Show selector ONLY in co-creator mode when a chat is active */}
            {(project || (chat && chat.projects)) && workspaceMode === 'cocreator' && (
                 <div ref={modeSelectorRef} className="relative flex-shrink-0">
                    <AnimatePresence>
                        {isModeSelectorOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute bottom-full mb-2 w-72 bg-bg-secondary border border-border-color rounded-lg shadow-2xl z-20 p-2"
                            >
                                {modesToShow.map(modeId => (
                                    <button
                                        key={modeId}
                                        onClick={() => handleModeChange(modeId as ChatMode)}
                                        className="w-full flex items-start gap-3 p-2 text-left rounded-md hover:bg-interactive-hover"
                                    >
                                        {modeMap[modeId as ChatMode].icon}
                                        <div>
                                            <p className="text-sm font-semibold text-text-primary">{modeMap[modeId as ChatMode].name}</p>
                                            <p className="text-xs text-text-secondary">{modeMap[modeId as ChatMode].description}</p>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button 
                        type="button" 
                        onClick={() => setModeSelectorOpen(prev => !prev)} 
                        className="flex items-center gap-1 p-2 rounded-lg hover:bg-interactive-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={`Current agent: ${currentModeDetails.name}`}
                        disabled={!chat}
                    >
                        {currentModeDetails.icon}
                        <ChevronDownIcon className="w-4 h-4 text-text-secondary" />
                    </button>
                 </div>
            )}
            
            {/* Placeholder to align items correctly when selector is hidden */}
            {!( (project || (chat && chat.projects)) && workspaceMode === 'cocreator' ) && <div className="flex-shrink-0 w-8 h-8 md:hidden"></div>}

             <button
                type="button"
                className="flex-shrink-0 w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Add file"
            >
                <PlusIcon className="w-6 h-6" />
            </button>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-text-primary placeholder-text-secondary focus:outline-none resize-none px-2 py-2.5 max-h-48"
              rows={1}
              disabled={isLoading}
              aria-label="Chat message input"
            />
             <div className="flex items-center gap-2">
                <VoiceControls onTranscript={handleTranscript} />
                <button
                    type="submit"
                    disabled={isLoading || !text.trim()}
                    className="flex-shrink-0 w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-black/40"
                    aria-label="Send message"
                >
                    <PaperAirplaneIcon className="w-5 h-5" />
                </button>
             </div>
          </form>
        </div>
    </div>
  );
};