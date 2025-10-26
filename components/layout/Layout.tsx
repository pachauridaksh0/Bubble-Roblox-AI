

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { LeftSidebar } from './LeftSidebar';
import { ChatView } from '../chat/ChatView';
import { ProjectsPage } from '../pages/ProjectsPage';
import { TopBar } from '../dashboard/TopBar';
import { Project, Message, Chat, WorkspaceMode, ProjectPlatform, ProjectType, Plan } from '../../types';
import { SettingsPage } from '../pages/SettingsPage';
import { useAuth } from '../../contexts/AuthContext';
import { getAllChatsForUser, ChatWithProjectData, addMessage, createProject, updateProject as updateDbProject, createChat as createDbChat, updateChat as updateDbChat, getMessages, deleteChat, extractAndSaveMemory, updateMessagePlan } from '../../services/databaseService';
import { StatusBar } from '../admin/ImpersonationBanner';
import { CoCreatorWorkspace } from '../cocreator/CoCreatorWorkspace';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { generateProjectDetails, classifyUserIntent, generateChatTitle } from '../../services/geminiService';
import { useToast } from '../../hooks/useToast';
import { runAgent } from '../../agents';
import { WebAppPreview } from '../preview/WebAppPreview';

// New Community Page Placeholders
import { MarketplacePage } from '../community/MarketplacePage';
import { MessagesPage } from '../community/MessagesPage';
import { DiscoverPage } from '../community/DiscoverPage';

type View = 'chat' | 'settings';
type HubView = 'projects' | 'marketplace' | 'messages' | 'discover';

interface LayoutProps {
  geminiApiKey: string;
}

const DUMMY_AUTONOMOUS_PROJECT: Project = {
  id: 'autonomous-project',
  user_id: 'unknown',
  name: 'Autonomous Chat',
  description: 'A personal chat with the AI.',
  status: 'In Progress',
  platform: 'Web App',
  project_type: 'conversation',
  default_model: 'gemini_2.5_flash',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const Layout: React.FC<LayoutProps> = ({ geminiApiKey }) => {
  const { user, supabase, isImpersonating, profile, isAdmin, signOut, stopImpersonating, updateUserProfile } = useAuth();
  const { addToast } = useToast();
  
  const [view, setView] = useState<View>('chat');
  const [workspaceMode, setWorkspaceMode] = useLocalStorage<WorkspaceMode>('workspaceMode', 'cocreator');
  const [hubView, setHubView] = useState<HubView>('projects');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const [allChats, setAllChats] = useState<ChatWithProjectData[]>([]);
  const [activeChat, setActiveChat] = useState<ChatWithProjectData | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchResultIndex, setCurrentSearchResultIndex] = useState(-1);

  const isThinking = isLoading || isCreatingChat;
  const [loadingMessage, setLoadingMessage] = useState('Bubble is ready');
  const loadingTexts = useMemo(() => [
    "Thinking...", "Analyzing request...", "Consulting memory...", 
    "Formulating plan...", "Generating code...", "Adapting to updates..."
  ], []);

  useEffect(() => {
    let intervalId: number | undefined;
    if (isThinking) {
        let currentIndex = 0;
        setLoadingMessage(loadingTexts[currentIndex]);
        intervalId = window.setInterval(() => {
            currentIndex = (currentIndex + 1) % loadingTexts.length;
            setLoadingMessage(loadingTexts[currentIndex]);
        }, 2500);
    } else {
        setLoadingMessage('Bubble is ready');
    }
    return () => {
        if (intervalId) window.clearInterval(intervalId);
    };
  }, [isThinking, loadingTexts]);
  
  const activeProject = useMemo(() => activeChat?.projects ?? null, [activeChat]);
  
  const handleLogoutAction = isImpersonating ? stopImpersonating : signOut;

  useEffect(() => {
    // Default all users to autonomous mode on load.
    setWorkspaceMode('autonomous');
  }, []);

  const autonomousChats = useMemo(() => {
    return allChats.filter(c => !c.project_id);
  }, [allChats]);
  
  const chatsForSidebar = useMemo(() => {
    if (workspaceMode === 'cocreator') {
        if (activeProject) {
            // Inside a project, show only that project's chats
            return allChats.filter(c => c.project_id === activeProject.id);
        } else {
            // In the Co-Creator Hub, show autonomous chats
            return autonomousChats;
        }
    }
    // In autonomous mode, show autonomous chats
    return autonomousChats;
  }, [allChats, workspaceMode, activeProject, autonomousChats]);


  useEffect(() => {
    if (!user || !supabase) return;

    const fetchUserChats = async () => {
      setIsLoading(true);
      try {
        const userChats = await getAllChatsForUser(supabase, user.id);
        setAllChats(userChats);
      } catch (error) {
        addToast("Could not load your conversations.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserChats();

    const channel = supabase
      .channel(`user-chats-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats', filter: `user_id=eq.${user.id}` },
        fetchUserChats
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, addToast]);
  
  const handleUpdateChat = useCallback(async (chatId: string, updates: Partial<Chat>) => {
    if (!supabase) return;
    try {
      const updatedChat = await updateDbChat(supabase, chatId, updates);
      setAllChats(prev => prev.map(c => c.id === chatId ? { ...c, ...updatedChat } : c));
      setActiveChat(prev => (prev?.id === chatId ? { ...prev, ...updatedChat } : prev));
    } catch (error) {
      console.error("Failed to update chat", error);
    }
  }, [supabase]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (activeChat && supabase) {
        setIsLoading(true);
        try {
          const history = await getMessages(supabase, activeChat.id);
          setMessages(history);
        } catch (error) {
          setMessages([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setMessages([]);
      }
    };
    fetchMessages();
  }, [activeChat, supabase]);

  useEffect(() => {
    // Auto-generate chat title after the first exchange
    if (messages.length === 2 && activeChat && geminiApiKey && messages[0].sender === 'user' && messages[1].sender === 'ai' && activeChat.name === messages[0].text) {
        generateChatTitle(messages[0].text, messages[1].text, geminiApiKey).then(title => {
            if (activeChat) { // Re-check activeChat inside promise
                handleUpdateChat(activeChat.id, { name: title });
            }
        });
    }
  }, [messages, activeChat, geminiApiKey, handleUpdateChat]);

  const handleSelectChat = (chat: ChatWithProjectData) => {
    setActiveChat(chat);
    setView('chat');
    if (chat.project_id) {
        setWorkspaceMode('cocreator');
    } else {
        setWorkspaceMode('autonomous');
    }
    setIsMobileSidebarOpen(false);
  };

  const handleGoToHub = () => {
    setWorkspaceMode('cocreator');
    setHubView('projects');
    setActiveChat(null);
    setView('chat');
    setIsMobileSidebarOpen(false);
  };
  
  const handleGoToSettings = () => {
    setView('settings');
    setIsMobileSidebarOpen(false);
  };

  const handleNewChat = () => {
    setActiveChat(null);
    setView('chat');
    setWorkspaceMode('autonomous');
    setIsMobileSidebarOpen(false);
  };
  
  const handleNewCoCreatorChat = async () => {
    if (!activeProject || !user || !supabase) return;
    const projectChats = allChats.filter(c => c.project_id === activeProject.id);
    const newChatName = `New Chat ${projectChats.length + 1}`;
    const newChat = await createDbChat(supabase, user.id, newChatName, 'build', activeProject.id);
    const newChatWithProjectData: ChatWithProjectData = { ...newChat, projects: activeProject };
    setAllChats(prev => [newChatWithProjectData, ...prev]);
    setActiveChat(newChatWithProjectData);
    setIsMobileSidebarOpen(false);
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

  const handleSelectProjectFromHub = async (project: Project) => {
      const chatForProject = allChats
          .filter(c => c.project_id === project.id)
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
      
      if (chatForProject) {
          setActiveChat(chatForProject);
      } else {
          // If no chats, still select the project to enter the CoCreator view
          const newChat = await createDbChat(supabase!, user!.id, `Main Chat`, 'build', project.id);
          const newChatWithProject: ChatWithProjectData = { ...newChat, projects: project };
          setAllChats(prev => [newChatWithProject, ...prev]);
          setActiveChat(newChatWithProject);
      }
      setView('chat');
      setWorkspaceMode('cocreator');
  };

  const handleCreateCoCreatorProject = async (name: string, platform: ProjectPlatform, projectType: ProjectType): Promise<void> => {
    if (!user || !supabase) return;
    setIsCreatingChat(true);
    try {
        const newProject = await createProject(supabase, user.id, name, platform, projectType);
        addToast(`Created new project: ${name}!`, "success");
        // Refetch chats to include the new project (or manually add it)
        const userChats = await getAllChatsForUser(supabase, user.id);
        setAllChats(userChats);
        // After creation, select the project to enter its workspace
        handleSelectProjectFromHub(newProject);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        addToast(`Failed to create project: ${errorMessage}`, "error");
        console.error("Error creating co-creator project:", error);
        throw error; // Re-throw to keep modal open
    } finally {
        setIsCreatingChat(false);
    }
};


  const createProjectFromPrompt = async (prompt: string): Promise<void> => {
    if (!user || !supabase) return;
    setIsCreatingChat(true);
    try {
      const { name, description, project_type } = await generateProjectDetails(prompt, geminiApiKey);
      const platform = project_type === 'roblox_game' ? 'Roblox Studio' : 'Web App';
      
      const newProject = await createProject(supabase, user.id, name, platform, project_type);
      newProject.description = description;
      await updateDbProject(supabase, newProject.id, { description });

      const newChat = await createDbChat(supabase, user.id, name, 'build', newProject.id);
      
      const newChatWithProject: ChatWithProjectData = {
        ...newChat,
        projects: newProject
      };

      addToast(`Created new project: ${name}!`, "success");
      setAllChats(prev => [newChatWithProject, ...prev]);
      setActiveChat(newChatWithProject);
      setWorkspaceMode('cocreator'); // Switch to co-creator mode
      
      await handleSendMessage(prompt, newChatWithProject);
      // FIX: The async function `createProjectFromPrompt` must return `Promise<void>` to match the `onCreateAutonomousProject` prop type. Adding an explicit `return` prevents it from implicitly returning a value from the last awaited expression, which was causing the type error.
      return;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        addToast(`Failed to create project: ${errorMessage}`, "error");
        console.error("Error creating project:", error);
    } finally {
        setIsCreatingChat(false);
    }
  };

  const handleFirstMessage = async (prompt: string) => {
    if (!user || !supabase || !geminiApiKey) return;
    setIsCreatingChat(true);
    try {
      if (workspaceMode === 'autonomous') {
        // Create a new chat for this specific conversation, not tied to any project
        const newChatName = prompt; // Will be renamed later by AI
        const newChat = await createDbChat(supabase, user.id, newChatName, 'chat', null);
        
        const newChatWithProject: ChatWithProjectData = { ...newChat, projects: null };
        
        setAllChats(prev => [newChatWithProject, ...prev]);
        setActiveChat(newChatWithProject);
        // Now that the chat exists, call the regular send message handler
        await handleSendMessage(prompt, newChatWithProject);

      } else { // Co-Creator mode (handles intent classification)
        const { intent } = await classifyUserIntent(prompt, geminiApiKey);
        if (intent === 'creative_request') {
          await createProjectFromPrompt(prompt);
        } else {
          // This should ideally not happen if user starts from the hub, but as a fallback:
          addToast("To start a conversation, please switch to Autonomous Mode.", "info");
        }
      }
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : "Could not start your new chat.";
       addToast(errorMessage, "error");
       console.error("Error in handleFirstMessage:", error);
    } finally {
       setIsCreatingChat(false);
    }
  };

// FIX: Added explicit Promise<void> return type. The function was implicitly returning a value from the last awaited expression (`updateDbProject`), causing incorrect type inference in functions that called it (like `createProjectFromPrompt`), leading to a type mismatch error.
  const handleSendMessage = async (text: string, chatToUse: ChatWithProjectData | null = activeChat): Promise<void> => {
      if (!text.trim() || !supabase || !user || !chatToUse) return;

      const tempId = `temp-ai-${Date.now()}`;

      try {
        const userMessageData: Omit<Message, 'id' | 'created_at'> = {
          project_id: chatToUse.project_id,
          chat_id: chatToUse.id,
          user_id: user.id,
          text,
          sender: 'user',
        };
        
        const savedUserMessage = await addMessage(supabase, userMessageData);
        // Find the most recent message with a plan to pass to the agent
        const historyWithPlan = [...messages, savedUserMessage];
        
        const tempAiMessage: Message = {
            id: tempId,
            project_id: chatToUse.project_id,
            chat_id: chatToUse.id,
            text: '',
            sender: 'ai',
        };
        setMessages(prev => [...prev, savedUserMessage, tempAiMessage]);
        setIsLoading(true);

        const onStreamChunk = (chunk: string) => {
            let isEvent = false;
            try {
                const event = JSON.parse(chunk);
                if (event.type === 'image_generation_start') {
                    isEvent = true;
                    setMessages(prev => prev.map(m =>
                        m.id === tempId ? { ...m, text: event.text, imageStatus: 'generating' } : m
                    ));
                }
            } catch (e) {
                // Not a JSON event, so it's a regular text chunk
            }

            if (!isEvent) {
                 setMessages(prev =>
                    prev.map(m => m.id === tempId ? { ...m, text: m.text + chunk } : m)
                );
            }
        };

        const projectForAgent = chatToUse.projects ?? {
            ...DUMMY_AUTONOMOUS_PROJECT,
            user_id: user.id,
        };

        const { messages: agentMessages, projectUpdate, updatedPlan } = await runAgent({
            prompt: text,
            apiKey: geminiApiKey,
            model: projectForAgent.default_model,
            project: projectForAgent,
            chat: chatToUse,
            user,
            profile,
            supabase,
            history: historyWithPlan,
            onStreamChunk,
            workspaceMode
        });
        
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
            
            // If the agent returned an updated plan, find the original plan message and update it.
            if (updatedPlan) {
                newMessages = newMessages.map(m => 
                    m.id === updatedPlan.messageId ? { ...m, plan: updatedPlan.plan } : m
                );
            }
            
            return [...newMessages, ...savedAiMessages];
        });

        // Persist the plan update to the database
        if (updatedPlan) {
            await updateMessagePlan(supabase, updatedPlan.messageId, updatedPlan.plan);
        }

        if (projectUpdate && chatToUse.project_id) {
            const updatedProject = await updateDbProject(supabase, chatToUse.project_id, projectUpdate);
            setAllChats(prev => prev.map(c => 
                c.project_id === updatedProject.id && c.projects 
                ? { ...c, projects: { ...c.projects, ...updatedProject }} 
                : c
            ));
            setActiveChat(prev => 
                prev && prev.project_id === updatedProject.id && prev.projects
                ? { ...prev, projects: { ...prev.projects, ...updatedProject }}
                : prev
            );
        }
        return;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while sending the message.";
        addToast(errorMessage, "error");
        console.error("Error in handleSendMessage:", e);
        setMessages(prev => prev.filter(m => m.id !== tempId));
      } finally {
        setIsLoading(false);
      }
  };
  
  const renderMainContent = () => {
    if (view === 'settings') {
        return <SettingsPage onBack={() => setView('chat')} />;
    }
    
    if (workspaceMode === 'cocreator') {
        if (!activeProject) {
            switch (hubView) {
                case 'marketplace': return <MarketplacePage />;
                case 'messages': return <MessagesPage />;
                case 'discover': return <DiscoverPage />;
                case 'projects':
                default:
                    const projectsForHub = allChats
                        .map(c => c.projects)
                        .filter((p): p is Project => !!p)
                        .reduce((acc, current) => {
                            if (!acc.find(item => item.id === current.id)) {
                                acc.push(current);
                            }
                            return acc;
                        }, [] as Project[]);
                    
                    return (
                        <ProjectsPage
                            profile={profile}
                            onSelectProject={handleSelectProjectFromHub}
                            projects={projectsForHub}
                            onCreateCoCreatorProject={handleCreateCoCreatorProject}
                            onCreateAutonomousProject={createProjectFromPrompt}
                        />
                    );
            }
        }
        
        return (
            <CoCreatorWorkspace
                project={activeProject}
                chat={activeChat}
                geminiApiKey={geminiApiKey}
                messages={messages}
                isLoadingHistory={isLoading}
                isCreatingChat={isCreatingChat}
                setMessages={setMessages}
                onSendMessage={activeChat ? handleSendMessage : handleFirstMessage}
                onChatUpdate={(updates) => activeChat && handleUpdateChat(activeChat.id, updates)}
                onActiveProjectUpdate={async (updates) => {
                    if (activeProject) {
                        try {
                            await updateDbProject(supabase!, activeProject.id, updates);
                            addToast('Project updated successfully.', 'success');
                        } catch (error) {
                            const message = error instanceof Error ? error.message : "An unknown error occurred";
                            addToast(`Error updating project: ${message}`, 'error');
                            console.error("Error in onActiveProjectUpdate:", error);
                        }
                    }
                }}
                searchQuery={searchQuery}
                onSearchResultsChange={setSearchResults}
                currentSearchResultMessageIndex={currentSearchResultIndex}
                isAdmin={!!isAdmin}
                workspaceMode={workspaceMode}
                projectType={activeProject.project_type === 'website' ? 'website' : 'roblox_game'}
                loadingMessage={loadingMessage}
            />
        );
    }

    return (
        <ChatView
            key={activeChat?.id || 'autonomous-new-chat'}
            project={activeProject}
            chat={activeChat}
            geminiApiKey={geminiApiKey}
            messages={messages}
            isLoadingHistory={isLoading}
            isCreatingChat={isCreatingChat}
            setMessages={setMessages}
            onSendMessage={activeChat ? handleSendMessage : handleFirstMessage}
            onChatUpdate={(updates) => activeChat && handleUpdateChat(activeChat.id, updates)}
            onActiveProjectUpdate={null}
            searchQuery={searchQuery}
            onSearchResultsChange={setSearchResults}
            currentSearchResultMessageIndex={currentSearchResultIndex}
            isAdmin={!!isAdmin}
            workspaceMode={workspaceMode}
            loadingMessage={loadingMessage}
        />
    );
  };
  
  const handleNewChatClick = () => {
    if (workspaceMode === 'cocreator' && activeProject) {
        handleNewCoCreatorChat();
    } else {
        handleNewChat();
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-bg-secondary font-sans text-text-primary">
      <StatusBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          allChats={chatsForSidebar}
          activeChatId={activeChat?.id}
          onSelectChat={handleSelectChat}
          onNewChatClick={handleNewChatClick}
          onUpdateChat={handleUpdateChat}
          onDeleteChat={handleDeleteChat}
          onSettingsClick={handleGoToSettings}
          onGoToHub={handleGoToHub}
          onSignOut={handleLogoutAction}
          profile={profile}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
          workspaceMode={workspaceMode}
          isAdmin={isAdmin}
          activeProject={activeProject}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar
            onGoToHub={handleGoToHub}
            onAccountSettingsClick={handleGoToSettings}
            onProjectSettingsClick={() => { /* TODO */ }}
            onLogout={handleLogoutAction}
            activeProjectName={activeProject?.name ?? null}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            workspaceMode={workspaceMode}
            onWorkspaceModeChange={(mode) => setWorkspaceMode(mode)}
            isProjectView={!!activeProject}
            onMobileMenuClick={() => setIsMobileSidebarOpen(true)}
            isThinking={isThinking}
            onSwitchToAutonomous={handleNewChat}
            onSwitchToCocreator={handleGoToHub}
            hubView={hubView}
            onHubViewChange={setHubView}
            loadingMessage={loadingMessage}
          />
          <main className="flex-1 overflow-y-auto bg-bg-primary px-2 md:px-0">
            {renderMainContent()}
          </main>
        </div>
      </div>
    </div>
  );
};
