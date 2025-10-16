import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, ChevronDownIcon, SparklesIcon, PlusIcon } from '@heroicons/react/24/solid';
import { Chat, ChatMode, WorkspaceMode } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatBubbleLeftEllipsisIcon, CpuChipIcon, PuzzlePieceIcon, AcademicCapIcon } from '@heroicons/react/24/solid';
import { VoiceControls } from './VoiceControls';
import { QuickActions } from '../features/QuickActions';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  chat: Chat | null; // Can be null for new chat
  onChatUpdate: ((updates: Partial<Chat>) => void) | null;
  isAdmin: boolean;
  workspaceMode: WorkspaceMode;
  isInitialView: boolean;
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

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, chat, onChatUpdate, isAdmin, workspaceMode, isInitialView }) => {
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
  
  const containerClasses = `w-full ${isInitialView ? 'pb-8' : 'px-4 pb-4 md:px-0 md:pb-6'}`;
  const formWrapperClasses = `relative ${isInitialView ? 'max-w-xl' : 'max-w-4xl'} mx-auto`;
  const formClasses = `relative bg-bg-tertiary border border-border-color rounded-2xl shadow-2xl flex items-end p-2 gap-2`;

  return (
    <div className={containerClasses}>
        {isInitialView && workspaceMode === 'autonomous' && (
          <div className="max-w-xl mx-auto mb-4">
            <QuickActions onAction={(prompt) => onSendMessage(prompt)} />
          </div>
        )}
        <div className={formWrapperClasses}>
          <form
            onSubmit={handleSubmit}
            className={formClasses}
          >
            {workspaceMode === 'cocreator' && chat && onChatUpdate && (
                 <div ref={modeSelectorRef} className="relative flex-shrink-0">
                    <button type="button" onClick={() => setModeSelectorOpen(prev => !prev)} className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/20 transition-colors">
                        {currentModeDetails.icon}
                        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                    </button>
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
                                        className="w-full flex items-start gap-3 p-2 text-left rounded-md hover:bg-white/5"
                                    >
                                        {modeMap[modeId as ChatMode].icon}
                                        <div>
                                            <p className="text-sm font-semibold text-white">{modeMap[modeId as ChatMode].name}</p>
                                            <p className="text-xs text-gray-400">{modeMap[modeId as ChatMode].description}</p>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                 </div>
            )}
             <button
                type="button"
                className="flex-shrink-0 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                aria-label="Add file"
            >
                <PlusIcon className="w-5 h-5" />
            </button>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-gray-200 placeholder-gray-400 focus:outline-none resize-none px-2 py-2.5 max-h-48"
              rows={1}
              disabled={isLoading}
              aria-label="Chat message input"
            />
             <div className="flex items-center gap-2">
                <VoiceControls onTranscript={handleTranscript} />
                <button
                    type="submit"
                    disabled={isLoading || !text.trim()}
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-black/40"
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