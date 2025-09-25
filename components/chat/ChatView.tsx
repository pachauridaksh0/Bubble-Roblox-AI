
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Task, Project, Chat, ChatMode } from '../../types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { AnimatePresence } from 'framer-motion';
import { generateChatTitle } from '../../services/geminiService';
import { useAuth } from '../../contexts/AuthContext';
import { addMessage, updateMessagePlan, updateMessageClarification } from '../../services/databaseService';
import { runAgent } from '../../agents';
import { generateCodeForTask } from '../../agents/build/codeGenerator';
import { NEW_CHAT_NAME } from '../../constants';
import { InitialPromptView } from './InitialPromptView';


interface ChatViewProps {
  project: Project;
  chat: Chat;
  geminiApiKey: string;
  messages: Message[];
  isLoadingHistory: boolean;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onChatUpdate: (chatId: string, updates: Partial<Chat>) => void;
  searchQuery: string;
  onSearchResultsChange: (indices: number[]) => void;
  currentSearchResultMessageIndex: number;
  isAdmin: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({ 
    project, 
    chat,
    geminiApiKey,
    messages,
    isLoadingHistory,
    setMessages,
    onChatUpdate,
    searchQuery,
    onSearchResultsChange,
    currentSearchResultMessageIndex,
    isAdmin,
}) => {
  const { user, supabase } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isPlanExecuting, setIsPlanExecuting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const scrollToBottom = useCallback(() => {
    // Use instant scrolling to prevent visual glitches with rapid updates or animations.
    messagesEndRef.current?.scrollIntoView();
  }, []);
  
  useEffect(() => {
    if (searchQuery.trim() === '' && !isPlanExecuting) {
        scrollToBottom();
    }
  }, [messages, searchQuery, isPlanExecuting, scrollToBottom]);

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
    if (!supabase) return;

    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const planMessage = messages[messageIndex];
    if (!planMessage?.plan) return;

    setIsPlanExecuting(true);
    messageRefs.current[messageIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Deep clone the plan to avoid direct state mutation.
    const planCopy = JSON.parse(JSON.stringify(planMessage.plan));

    for (let i = 0; i < planCopy.tasks.length; i++) {
        // Update UI to show 'in-progress'
        planCopy.tasks[i].status = 'in-progress';
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, plan: JSON.parse(JSON.stringify(planCopy)) } : m));
        
        // Artificial delay for UX
        await new Promise(res => setTimeout(res, 500));

        // Generate code for the task
        const taskResult = await generateCodeForTask(planCopy.tasks[i].text, project.platform, geminiApiKey, project.default_model);
        
        // Update plan with result
        const task = planCopy.tasks[i];
        task.status = 'complete';
        task.code = taskResult.code;
        task.explanation = taskResult.explanation;

        // Update UI with completed task and save this task's progress to DB
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, plan: JSON.parse(JSON.stringify(planCopy)) } : m));
        try {
             await updateMessagePlan(supabase, messageId, planCopy);
        } catch (dbError) {
             console.error(`Failed to update plan progress to DB for task ${i}:`, dbError);
             // Optionally show an error to the user, but for now we continue execution
        }
    }
    
    // Finalize plan
    planCopy.isComplete = true;
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, plan: JSON.parse(JSON.stringify(planCopy)) } : m));
    try {
        await updateMessagePlan(supabase, messageId, planCopy);
    } catch (dbError) {
        console.error('Failed to save final completed plan to DB:', dbError);
    }

    setIsPlanExecuting(false);
  };
  
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !supabase || !user) return;
    
    const isNewChat = chat.name === NEW_CHAT_NAME;

    const userMessage: Omit<Message, 'id' | 'created_at'> = {
      project_id: project.id,
      chat_id: chat.id,
      user_id: user.id,
      text,
      sender: 'user',
    };
    
    const savedUserMessage = await addMessage(supabase, userMessage);
    setMessages(prev => [...prev, savedUserMessage]);
    setIsLoading(true);

    // AI Naming Logic
    if (isNewChat) {
        try {
            const title = await generateChatTitle(text, geminiApiKey);
            onChatUpdate(chat.id, { name: title });
        } catch (e) {
            console.error("Failed to generate chat title", e);
            // Fail silently, user can rename manually
        }
    }

    try {
        const agentOutput = await runAgent({
            prompt: text,
            apiKey: geminiApiKey,
            model: project.default_model,
            project,
            chat,
            user,
            supabase,
        });

        // Save AI responses and update UI
        for (const messageContent of agentOutput) {
            const savedAiMessage = await addMessage(supabase, messageContent);
            setMessages(prev => [...prev, savedAiMessage]);
        }

    } catch (e) {
        console.error("Agent execution error:", e);
        const errorText = "Sorry, I ran into an issue while processing your request. Please try again, and make sure your API key is valid.";
        const errorMessage: Omit<Message, 'id' | 'created_at'> = {
            project_id: project.id,
            chat_id: chat.id,
            text: errorText,
            sender: 'ai',
        };
        const savedMessage = await addMessage(supabase, errorMessage);
        setMessages(prev => [...prev, savedMessage]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleClarificationSubmit = async (messageId: string, answers: string[]) => {
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1 || !messages[messageIndex].clarification || !supabase || !user) return;
      
      const originalPrompt = messages[messageIndex].clarification!.prompt;
      
      const updatedClarification = { ...messages[messageIndex].clarification!, answers };
      const updatedMessageText = "Thanks for the information! I'm now generating a plan based on your answers.";
      
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, clarification: updatedClarification, text: updatedMessageText } : m));
      await updateMessageClarification(supabase, messageId, updatedClarification);

      setIsLoading(true);

      try {
        const agentOutput = await runAgent({
            prompt: originalPrompt,
            answers: answers,
            apiKey: geminiApiKey,
            model: project.default_model,
            project,
            chat,
            user,
            supabase,
        });

        for (const messageContent of agentOutput) {
            const savedAiMessage = await addMessage(supabase, messageContent);
            setMessages(prev => [...prev, savedAiMessage]);
        }
      } catch (e) {
         console.error("Agent execution error after clarification:", e);
         const errorText = "Sorry, I ran into an issue while creating a plan. Please check your API key and try again.";
         const errorMessage: Omit<Message, 'id' | 'created_at'> = {
             project_id: project.id,
             chat_id: chat.id,
             text: errorText,
             sender: 'ai',
         };
         const savedMessage = await addMessage(supabase, errorMessage);
         setMessages(prev => [...prev, savedMessage]);
      } finally {
        setIsLoading(false);
      }
  }

  if (isLoadingHistory) {
      return (
        <div className="flex items-center justify-center h-full">
            <svg className="animate-spin h-8 w-8 text-primary-start" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
      );
  }

  if (messages.length === 0 && !isLoadingHistory) {
    return (
      <InitialPromptView
        onSendMessage={handleSendMessage}
        onChatUpdate={(updates) => onChatUpdate(chat.id, updates)}
        currentMode={chat.mode}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <div key={msg.id} ref={el => { messageRefs.current[index] = el; }}>
                <ChatMessage 
                    message={msg} 
                    onExecutePlan={handleExecutePlan}
                    onClarificationSubmit={handleClarificationSubmit}
                    isDimmed={searchQuery.trim() !== '' && !msg.text.toLowerCase().includes(searchQuery.toLowerCase())}
                    isCurrentResult={index === currentSearchResultMessageIndex}
                    searchQuery={searchQuery}
                    isAdmin={isAdmin}
                />
            </div>
          ))}
        </AnimatePresence>

        {isLoading && (
            <div className="flex justify-start">
                 <div className="flex items-center space-x-2 text-gray-400">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                 </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        chat={chat}
        onChatUpdate={(updates) => onChatUpdate(chat.id, updates)}
        isAdmin={isAdmin}
      />
    </div>
  );
};
