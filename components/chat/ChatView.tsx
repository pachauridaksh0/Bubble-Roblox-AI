

import React, { useState, useEffect, useRef, useCallback } from 'react';
// FIX: Moved ChatWithProjectData import from databaseService to types.
import { Message, Project, Chat, WorkspaceMode, ChatWithProjectData } from '../../types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { InitialPromptView } from './InitialPromptView';

interface ChatViewProps {
  project: Project | null;
  chat: ChatWithProjectData | null;
  geminiApiKey: string;
  messages: Message[];
  isLoadingHistory: boolean;
  isCreatingChat: boolean;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onSendMessage: (text: string) => void;
  onChatUpdate: ((updates: Partial<Chat>) => void) | null;
  onActiveProjectUpdate: ((updates: Partial<Project>) => Promise<void>) | null;
  searchQuery: string;
  onSearchResultsChange: (indices: number[]) => void;
  currentSearchResultMessageIndex: number;
  isAdmin: boolean;
  workspaceMode: WorkspaceMode;
  loadingMessage: string;
}

const AutonomousInitialView: React.FC<{ onQuickStart: (prompt: string) => void }> = ({ onQuickStart }) => (
    <div className="flex flex-col items-center justify-end h-full text-center px-4 pb-[45vh]">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', delay: 0.2, duration: 0.5 }}
            className="max-w-md"
        >
            <h2 className="text-2xl font-bold text-text-primary mb-2">Hey there! 👋</h2>
            <p className="text-text-secondary mb-6">
                I'm Bubble, your AI companion. How can I help you today?
            </p>
        </motion.div>
    </div>
);

export const ChatView: React.FC<ChatViewProps> = ({ 
    project, 
    chat,
    geminiApiKey,
    messages,
    isLoadingHistory,
    isCreatingChat,
    setMessages,
    onSendMessage,
    onChatUpdate,
    onActiveProjectUpdate,
    searchQuery,
    onSearchResultsChange,
    currentSearchResultMessageIndex,
    isAdmin,
    workspaceMode,
    loadingMessage,
}) => {
  const { supabase } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isInitialView = messages.length === 0 && !isLoadingHistory && !isCreatingChat;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  useEffect(() => {
    if (searchQuery.trim() === '') {
        scrollToBottom();
    }
  }, [messages, searchQuery, scrollToBottom]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      onSearchResultsChange([]);
      return;
    }
    const results = messages
      .map((msg, index) => (msg.text.toLowerCase().includes(searchQuery.toLowerCase()) ? index : -1))
      .filter(index => index !== -1);
    onSearchResultsChange(results);
  }, [searchQuery, messages, onSearchResultsChange]);

  useEffect(() => {
    if (currentSearchResultMessageIndex !== -1 && messageRefs.current[currentSearchResultMessageIndex]) {
      messageRefs.current[currentSearchResultMessageIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentSearchResultMessageIndex]);
  
  const handleExecutePlan = async (messageId: string) => {
    // This function will be re-enabled when Co-Creator mode's chat view is built
  };
  
  const handleClarificationSubmit = async (messageId: string, answers: string[]) => {
      // This function will be re-enabled when Co-Creator mode's chat view is built
  }

  const handleQuickStart = (prompt: string) => {
    onSendMessage(prompt);
  };

  const isLoading = isLoadingHistory || isCreatingChat;

  return (
    <div className="flex flex-col h-full bg-bg-primary relative">
      <div className={`flex-1 overflow-y-auto flex flex-col ${isInitialView ? '' : 'p-4'}`}>
        <div className="w-full max-w-5xl flex-1 mx-auto">
            {isLoading && messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                    <svg className="animate-spin h-8 w-8 text-primary-start" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}

            {!chat && isInitialView && workspaceMode === 'autonomous' && <AutonomousInitialView onQuickStart={handleQuickStart} />}
            
            {chat && isInitialView && workspaceMode === 'cocreator' && <InitialPromptView onSendMessage={onSendMessage} />}
            
            {!isInitialView && (
                <div className="space-y-6">
                    <AnimatePresence initial={false}>
                      {messages.map((msg, index) => {
                        const isLastMessage = index === messages.length - 1;
                        const isAiResponding = isLastMessage && isLoading && msg.sender === 'ai';
                        
                        return (
                            <div key={msg.id} ref={el => { messageRefs.current[index] = el; }}>
                                <ChatMessage 
                                    message={msg} 
                                    onExecutePlan={handleExecutePlan}
                                    onClarificationSubmit={handleClarificationSubmit}
                                    isDimmed={searchQuery.trim() !== '' && !msg.text.toLowerCase().includes(searchQuery.toLowerCase())}
                                    isCurrentResult={index === currentSearchResultMessageIndex}
                                    searchQuery={searchQuery}
                                    isAdmin={isAdmin}
                                    isTyping={isAiResponding}
                                />
                            </div>
                        )
                      })}
                    </AnimatePresence>
                </div>
            )}
        </div>
        <div ref={messagesEndRef} />
      </div>
      <ChatInput
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        chat={chat}
        onChatUpdate={onChatUpdate}
        isAdmin={isAdmin}
        workspaceMode={workspaceMode}
        isInitialView={isInitialView && !chat}
        loadingMessage={loadingMessage}
        project={project}
      />
    </div>
  );
};