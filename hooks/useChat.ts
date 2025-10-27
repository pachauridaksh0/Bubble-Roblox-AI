import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { Project, Message, Chat, WorkspaceMode, ProjectPlatform, ProjectType, ChatWithProjectData } from '../types';
import { 
    getAllChatsForUser, 
    addMessage, 
    createProject, 
    updateProject as updateDbProject, 
    createChat as createDbChat, 
    updateChat as updateDbChat, 
    getMessages, 
    deleteChat, 
    extractAndSaveMemory, 
    updateMessagePlan,
    getChatsForProject
} from '../services/databaseService';
import { generateProjectDetails, classifyUserIntent, generateChatTitle } from '../services/geminiService';
import { runAgent } from '../agents';
import { User } from '@supabase/supabase-js';
// FIX: Imported missing AgentExecutionResult type.
import { AgentExecutionResult } from '../agents/types';

const DUMMY_AUTONOMOUS_PROJECT: Project = {
  id: 'autonomous-project',
  user_id: 'unknown',
  name: 'Autonomous Chat',
  description: 'A personal chat with the AI.',
  status: 'In Progress',
  platform: 'Web App',
  project_type: 'conversation',
  default_model: 'gemini-2.5-flash',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

interface UseChatProps {
    user: User | null;
    geminiApiKey: string | null;
    workspaceMode: WorkspaceMode;
    // For admin page to view other users' projects
    adminProject?: Project | null; 
}

export const useChat = ({ user, geminiApiKey, workspaceMode, adminProject }: UseChatProps) => {
    const { supabase, profile } = useAuth();
    const { addToast } = useToast();

    const [allChats, setAllChats] = useState<ChatWithProjectData[]>([]);
    const [activeChat, setActiveChat] = useState<ChatWithProjectData | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreatingChat, setIsCreatingChat] = useState(false);

    const activeProject = useMemo(() => adminProject ?? activeChat?.projects ?? null, [adminProject, activeChat]);
    
    // Fetch user's chats (or project's chats for admin)
    useEffect(() => {
        if (!supabase || !user) return;
        
        const fetchChats = async () => {
            setIsLoading(true);
            try {
                let chats: ChatWithProjectData[] = [];
                if (adminProject) { // Admin viewing a specific project
                    const projectChats = await getChatsForProject(supabase, adminProject.id);
                    // Manually attach project data for consistency
                    chats = projectChats.map(c => ({...c, projects: adminProject }));
                } else if(user) { // Regular user or admin in autonomous mode
                    chats = await getAllChatsForUser(supabase, user.id);
                }
                setAllChats(chats);
            } catch (error) {
                addToast("Could not load conversations.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchChats();
    }, [user, supabase, addToast, adminProject]);

    // Fetch messages for active chat
    useEffect(() => {
        const fetchMessages = async () => {
            if (activeChat && supabase) {
                setIsLoading(true);
                try {
                    const history = await getMessages(supabase, activeChat.id);
                    setMessages(history);
                } catch (error) { setMessages([]); } 
                finally { setIsLoading(false); }
            } else {
                setMessages([]);
            }
        };
        fetchMessages();
    }, [activeChat, supabase]);

    const handleUpdateChat = useCallback(async (chatId: string, updates: Partial<Chat>) => {
        if (!supabase) return;
        try {
            const updatedChat = await updateDbChat(supabase, chatId, updates);
            setAllChats(prev => prev.map(c => c.id === chatId ? { ...c, ...updatedChat } : c));
            setActiveChat(prev => (prev?.id === chatId ? { ...prev, ...updatedChat } : prev));
        } catch (error) { console.error("Failed to update chat", error); }
    }, [supabase]);

    // Auto-generate chat title
    useEffect(() => {
        if (messages.length === 2 && activeChat && geminiApiKey && messages[0].sender === 'user' && messages[1].sender === 'ai' && activeChat.name === messages[0].text) {
            generateChatTitle(messages[0].text, messages[1].text, geminiApiKey).then(title => {
                if (activeChat) {
                    handleUpdateChat(activeChat.id, { name: title });
                }
            });
        }
    }, [messages, activeChat, geminiApiKey, handleUpdateChat]);

    const handleSelectChat = (chat: ChatWithProjectData) => {
        setActiveChat(chat);
    };

    const handleDeleteChat = async (chatId: string) => {
        if (!supabase) return;
        try {
            await deleteChat(supabase, chatId);
            setAllChats(prev => prev.filter(c => c.id !== chatId));
            if (activeChat?.id === chatId) {
                setActiveChat(null);
            }
            addToast('Chat deleted.', 'info');
        } catch (error) {
            addToast('Failed to delete chat.', 'error');
        }
    };
    
    const handleSendMessage = useCallback(async (text: string, chatToUse: ChatWithProjectData | null = activeChat): Promise<AgentExecutionResult> => {
      if (!text.trim() || !supabase || !user || !chatToUse || !geminiApiKey) return { messages: [] };

      const tempId = `temp-ai-${Date.now()}`;

      try {
        const userMessageData: Omit<Message, 'id' | 'created_at'> = {
          project_id: chatToUse.project_id,
          chat_id: chatToUse.id,
          user_id: user.id, text, sender: 'user',
        };
        
        const savedUserMessage = await addMessage(supabase, userMessageData);
        const historyWithPlan = [...messages, savedUserMessage];
        
        const tempAiMessage: Message = { id: tempId, project_id: chatToUse.project_id, chat_id: chatToUse.id, text: '', sender: 'ai' };
        setMessages(prev => [...prev, savedUserMessage, tempAiMessage]);
        setIsLoading(true);

        const onStreamChunk = (chunk: string) => {
            let isEvent = false;
            try {
                const event = JSON.parse(chunk);
                if (event.type === 'image_generation_start') {
                    isEvent = true;
                    setMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: event.text, imageStatus: 'generating' } : m));
                }
            } catch (e) {}

            if (!isEvent) {
                 setMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: m.text + chunk } : m));
            }
        };

        const projectForAgent = chatToUse.projects ?? { ...DUMMY_AUTONOMOUS_PROJECT, user_id: user.id };

        const agentResult = await runAgent({
            prompt: text, apiKey: geminiApiKey, model: projectForAgent.default_model,
            project: projectForAgent, chat: chatToUse, user, profile, supabase,
            history: historyWithPlan, onStreamChunk, workspaceMode
        });
        
        const { messages: agentMessages, updatedPlan } = agentResult;
        
        const savedAiMessages: Message[] = [];
        for (const messageContent of agentMessages) {
            const savedAiMessage = await addMessage(supabase, { ...messageContent, project_id: chatToUse.project_id });
            savedAiMessages.push(savedAiMessage);
        }

        if (savedUserMessage && savedAiMessages.length > 0) {
            extractAndSaveMemory(supabase, user.id, savedUserMessage.text, savedAiMessages[0].text, chatToUse.project_id)
                .catch(err => console.warn("Background memory extraction failed:", err));
        }
        
        setMessages(prev => {
            let newMessages = prev.filter(m => m.id !== tempId);
            if (updatedPlan) {
                newMessages = newMessages.map(m => m.id === updatedPlan.messageId ? { ...m, plan: updatedPlan.plan } : m);
            }
            return [...newMessages, ...savedAiMessages];
        });

        if (updatedPlan) await updateMessagePlan(supabase, updatedPlan.messageId, updatedPlan.plan);
        return agentResult;

      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        addToast(errorMessage, "error");
        console.error("Error in handleSendMessage:", e);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        return { messages: [] };
      } finally {
        setIsLoading(false);
      }
    }, [activeChat, supabase, user, geminiApiKey, messages, addToast, profile, workspaceMode]);
    
    return {
        allChats,
        setAllChats,
        activeChat,
        setActiveChat,
        messages,
        setMessages,
        isLoading,
        isCreatingChat,
        setIsCreatingChat,
        activeProject,
        handleUpdateChat,
        handleSelectChat,
        handleDeleteChat,
        handleSendMessage,
    };
};