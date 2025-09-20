
import React, { useState, useEffect, useRef } from 'react';
import { Message, Task, Project } from '../../types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { AnimatePresence } from 'framer-motion';
import { generatePlan, generateCodeForTask, generateClarifyingQuestions } from '../../services/geminiService';
import { InitialPromptView } from './InitialPromptView';
import { useAuth } from '../../contexts/AuthContext';
import { getMessages, addMessage, updateMessagePlan, updateMessageClarification } from '../../services/databaseService';

interface ChatViewProps {
  project: Project;
  geminiApiKey: string;
  onMessagesUpdate: (messages: Message[]) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ project, geminiApiKey, onMessagesUpdate }) => {
  const { user, supabase } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onMessagesUpdate(messages);
  }, [messages, onMessagesUpdate]);

  useEffect(() => {
    const fetchHistory = async () => {
        if (!supabase || !project) return;
        setIsFetchingHistory(true);
        try {
            const history = await getMessages(supabase, project.id);
            setMessages(history);
        } catch (error) {
            console.error("Failed to fetch message history:", error);
        } finally {
            setIsFetchingHistory(false);
        }
    };
    fetchHistory();
  }, [project, supabase]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);
  
  const handleExecutePlan = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1 || !messages[messageIndex].plan || !supabase) return;

    let plan = { ...messages[messageIndex].plan! };

    for (let i = 0; i < plan.tasks.length; i++) {
        plan.tasks[i].status = 'in-progress';
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, plan: { ...plan } } : m));
        await updateMessagePlan(supabase, messageId, plan);
        
        await new Promise(res => setTimeout(res, 500));

        const taskResult = await generateCodeForTask(plan.tasks[i].text, geminiApiKey);
        
        const task = plan.tasks[i];
        task.status = 'complete';
        task.code = taskResult.code;
        task.explanation = taskResult.explanation;
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, plan: { ...plan } } : m));
        await updateMessagePlan(supabase, messageId, plan);
    }
    
    plan.isComplete = true;
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, plan: { ...plan } } : m));
    await updateMessagePlan(supabase, messageId, plan);
  };

  const handleGeneratePlan = async (prompt: string, answers?: string[]) => {
      if (!supabase || !user) return;
      let fullPrompt = prompt;
      if (answers) {
          fullPrompt += "\n\nHere are my answers to your clarifying questions:\n" + answers.map((a, i) => `${i+1}. ${a}`).join("\n");
      }

      try {
        const planResponse = await generatePlan(fullPrompt, geminiApiKey);
        const planTasks: Task[] = planResponse.tasks.map(t => ({ text: t, status: 'pending' }));

        const aiPlanMessage: Omit<Message, 'id' | 'created_at'> = {
            project_id: project.id,
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
            text: errorText,
            sender: 'ai',
        };
        const savedMessage = await addMessage(supabase, errorMessage);
        setMessages(prev => [...prev, savedMessage]);
    } finally {
        setIsLoading(false);
    }
  }

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !supabase || !user) return;

    const userMessage: Omit<Message, 'id' | 'created_at'> = {
      project_id: project.id,
      user_id: user.id,
      text,
      sender: 'user',
    };
    
    setIsLoading(true);
    const savedUserMessage = await addMessage(supabase, userMessage);
    setMessages(prev => [...prev, savedUserMessage]);

    try {
        const questionResponse = await generateClarifyingQuestions(text, geminiApiKey);
        
        if (questionResponse.questions && questionResponse.questions.length > 0) {
            const clarificationMessage: Omit<Message, 'id' | 'created_at'> = {
                project_id: project.id,
                sender: 'ai',
                text: "Before I create a plan, I have a few questions to make sure I build exactly what you need:",
                clarification: {
                    prompt: text,
                    questions: questionResponse.questions,
                }
            }
            const savedAIMessage = await addMessage(supabase, clarificationMessage);
            setMessages(prev => [...prev, savedAIMessage]);
            setIsLoading(false);
        } else {
            await handleGeneratePlan(text);
        }
    } catch (e) {
        const errorText = e instanceof Error ? e.message : "An error occurred. Please check your API key or the console for more details.";
        const errorMessage: Omit<Message, 'id' | 'created_at'> = {
            project_id: project.id,
            text: errorText,
            sender: 'ai',
        };
        const savedMessage = await addMessage(supabase, errorMessage);
        setMessages(prev => [...prev, savedMessage]);
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

  if (isFetchingHistory) {
      return (
        <div className="flex items-center justify-center h-full">
            <svg className="animate-spin h-8 w-8 text-primary-start" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
      );
  }

  if (messages.length === 0 && !isLoading) {
    return <InitialPromptView onGeneratePlan={handleSendMessage} />;
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <ChatMessage 
                key={msg.id} 
                message={msg} 
                onExecutePlan={handleExecutePlan}
                onClarificationSubmit={handleClarificationSubmit}
            />
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