import React, { useState, useEffect, useRef } from 'react';
import { Message, Task, Project, Chat, ChatMode } from '../../types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { AnimatePresence } from 'framer-motion';
import { generatePlan, generateCodeForTask, generateClarifyingQuestions, generateChatTitle, generateThinkerResponse } from '../../services/geminiService';
import { useAuth } from '../../contexts/AuthContext';
import { addMessage, updateMessagePlan, updateMessageClarification } from '../../services/databaseService';
import { BoltIcon, CpuChipIcon } from '@heroicons/react/24/solid';


interface ChatViewProps {
  project: Project;
  chat: Chat;
  geminiApiKey: string;
  initialMessages: Message[];
  isLoadingHistory: boolean;
  onMessagesUpdate: (messages: Message[]) => void;
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
    initialMessages,
    isLoadingHistory,
    onMessagesUpdate,
    onChatUpdate,
    searchQuery,
    onSearchResultsChange,
    currentSearchResultMessageIndex,
    isAdmin,
}) => {
  const { user, supabase, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlanExecuting, setIsPlanExecuting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // When a new chat is opened (initialMessages are empty), show the greeter message.
    if (initialMessages.length === 0 && !isLoadingHistory && profile) {
      const greeterMessage: Message = {
        id: 'initial-greeter-message',
        project_id: project.id,
        chat_id: chat.id,
        sender: 'ai',
        text: `Hey ${profile.roblox_username.split(' ')[0]}! 👋 What awesome game should we start building today? Just a sentence or two is perfect.`,
        created_at: new Date().toISOString(),
      };
      setMessages([greeterMessage]);
    } else {
      setMessages(initialMessages);
    }
  }, [initialMessages, isLoadingHistory, chat.id, profile, project.id]);


  useEffect(() => {
    onMessagesUpdate(messages);
  }, [messages, onMessagesUpdate]);

  const scrollToBottom = () => {
    // Use instant scrolling to prevent visual glitches with rapid updates or animations.
    messagesEndRef.current?.scrollIntoView();
  };
  
  useEffect(() => {
    if (searchQuery.trim() === '' && !isPlanExecuting) {
        scrollToBottom();
    }
  }, [messages, searchQuery, isPlanExecuting]);

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
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1 || !messages[messageIndex].plan || !supabase) return;

    setIsPlanExecuting(true);
    messageRefs.current[messageIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    let plan = { ...messages[messageIndex].plan! };

    for (let i = 0; i < plan.tasks.length; i++) {
        plan.tasks[i].status = 'in-progress';
        const newMessages = messages.map(m => m.id === messageId ? { ...m, plan: { ...plan } } : m);
        setMessages(newMessages);
        await updateMessagePlan(supabase, messageId, plan);
        
        await new Promise(res => setTimeout(res, 500));

        const taskResult = await generateCodeForTask(plan.tasks[i].text, project.platform, geminiApiKey, project.default_model);
        
        const task = plan.tasks[i];
        task.status = 'complete';
        task.code = taskResult.code;
        task.explanation = taskResult.explanation;
        const finalMessages = messages.map(m => m.id === messageId ? { ...m, plan: { ...plan } } : m);
        setMessages(finalMessages);
        await updateMessagePlan(supabase, messageId, plan);
    }
    
    plan.isComplete = true;
    const finalMessages = messages.map(m => m.id === messageId ? { ...m, plan: { ...plan } } : m);
    setMessages(finalMessages);
    await updateMessagePlan(supabase, messageId, plan);
    setIsPlanExecuting(false);
  };

  const handleGeneratePlan = async (prompt: string, answers?: string[]) => {
      if (!supabase || !user) return;
      let fullPrompt = prompt;
      if (answers) {
          fullPrompt += "\n\nHere are my answers to your clarifying questions:\n" + answers.map((a, i) => `${i+1}. ${a}`).join("\n");
      }

      try {
        const planResponse = await generatePlan(fullPrompt, geminiApiKey, project.default_model);
        const planTasks: Task[] = planResponse.tasks.map(t => ({ text: t, status: 'pending' }));

        const aiPlanMessage: Omit<Message, 'id' | 'created_at'> = {
            project_id: project.id,
            chat_id: chat.id,
            sender: 'ai',
            text: planResponse.introduction,
            plan: {
                title: planResponse.title,
                features: planResponse.features,
                tasks: planTasks,
                isComplete: false,
            }
        };
        const savedMessage = await addMessage(supabase, aiPlanMessage);
        setMessages(prev => [...prev, savedMessage]);

    } catch(e) {
        const errorText = e instanceof Error ? e.message : "An error occurred. Please check your API key or the console for more details.";
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
  
  const handleThinkerMode = async (prompt: string) => {
    if (!supabase) return;
    try {
        const { standing, opposing, final } = await generateThinkerResponse(prompt, geminiApiKey, project.default_model);
        
        const aiMessage: Omit<Message, 'id' | 'created_at'> = {
            project_id: project.id,
            chat_id: chat.id,
            sender: 'ai',
            text: final, // The synthesized response is the main text
            standing_response: standing,
            opposing_response: opposing,
        };
        const savedMessage = await addMessage(supabase, aiMessage);
        setMessages(prev => [...prev, savedMessage]);

    } catch (e) {
        const errorText = e instanceof Error ? e.message : "An error occurred. Please check your API key or the console for more details.";
        const errorMessage: Omit<Message, 'id' | 'created_at'> = {
            project_id: project.id,
            chat_id: chat.id,
            text: errorText,
            sender: 'ai',
        };
        const savedMessage = await addMessage(supabase, errorMessage);
        setMessages(prev => [...prev, savedMessage]);
    }
}

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !supabase || !user) return;
    
    const isNewChat = chat.name === "New Chat";

    const userMessage: Omit<Message, 'id' | 'created_at'> = {
      project_id: project.id,
      chat_id: chat.id,
      user_id: user.id,
      text,
      sender: 'user',
    };
    
    // Remove the greeter message if it exists and add user message optimistically
    const newMessages = messages.filter(m => m.id !== 'initial-greeter-message');
    const savedUserMessage = await addMessage(supabase, userMessage);
    setMessages([...newMessages, savedUserMessage]);
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
        switch (chat.mode) {
            case 'thinker':
                await handleThinkerMode(text);
                break;
            case 'build': // For now, build mode will generate a plan first.
                await handleGeneratePlan(text);
                break;
            case 'plan':
            case 'chat':
            case 'super_agent': // Super agent will start with clarification.
            default:
                 const questionResponse = await generateClarifyingQuestions(text, geminiApiKey, project.default_model);
        
                if (questionResponse.questions && questionResponse.questions.length > 0) {
                    const clarificationMessage: Omit<Message, 'id' | 'created_at'> = {
                        project_id: project.id,
                        chat_id: chat.id,
                        sender: 'ai',
                        text: "Before I create a plan, I have a few questions to make sure I build exactly what you need:",
                        clarification: {
                            prompt: text,
                            questions: questionResponse.questions,
                        }
                    }
                    const savedAIMessage = await addMessage(supabase, clarificationMessage);
                    setMessages(prev => [...prev, savedAIMessage]);
                } else {
                    await handleGeneratePlan(text);
                }
                break;
        }
    } catch (e) {
        const errorText = e instanceof Error ? e.message : "An error occurred. Please check your API key or the console for more details.";
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
      if (messageIndex === -1 || !messages[messageIndex].clarification || !supabase) return;
      
      const originalPrompt = messages[messageIndex].clarification!.prompt;
      
      const updatedClarification = { ...messages[messageIndex].clarification!, answers };
      const updatedMessageText = "Thanks for the information! I'm now generating a plan based on your answers.";
      
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, clarification: updatedClarification, text: updatedMessageText } : m));
      await updateMessageClarification(supabase, messageId, updatedClarification);

      setIsLoading(true);
      await handleGeneratePlan(originalPrompt, answers);
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

  return (
    <div className="flex flex-col h-full bg-bg-primary">
       <div className="flex-shrink-0 px-4 md:px-8 pt-4">
        <div className="relative inline-flex items-center gap-2 p-1 bg-bg-secondary/70 rounded-lg border border-white/10">
          <label htmlFor="mode-select" className="pl-2 pr-1 text-sm font-medium text-gray-400">
            Agent Mode:
          </label>
          <select
            id="mode-select"
            value={chat.mode}
            onChange={(e) => onChatUpdate(chat.id, { mode: e.target.value as ChatMode })}
            className="bg-transparent text-white font-semibold focus:outline-none appearance-none pr-8 capitalize"
            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em' }}
          >
            <option value="chat">Chat</option>
            <option value="plan">Plan</option>
            <option value="build">Build</option>
            <option value="thinker">Thinker</option>
            <option value="super_agent">Super Agent</option>
          </select>
        </div>
      </div>
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
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};