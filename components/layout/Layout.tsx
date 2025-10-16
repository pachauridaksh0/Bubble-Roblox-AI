import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LeftSidebar } from './LeftSidebar';
import { ChatView } from '../chat/ChatView';
import { ProjectsPage } from '../pages/ProjectsPage';
import { TopBar } from '../dashboard/TopBar';
import { Project, Message, Chat, WorkspaceMode } from '../../types';
import { SettingsPage } from '../pages/SettingsPage';
import { useAuth } from '../../contexts/AuthContext';
import { getAllChatsForUser, ChatWithProjectData, addMessage, createProject, updateProject as updateDbProject, createChat as createDbChat, updateChat as updateDbChat, getMessages, deleteChat, extractAndSaveMemory } from '../../services/databaseService';
import { StatusBar } from '../admin/ImpersonationBanner';
import { CoCreatorWorkspace } from '../cocreator/CoCreatorWorkspace';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { generateProjectDetails, classifyUserIntent, generateChatTitle } from '../../services/geminiService';
import { useToast } from '../../hooks/useToast';
import { runAgent } from '../../agents';
import { WebAppPreview } from '../preview/WebAppPreview';

type View = 'chat' | 'settings';

interface LayoutProps {
  geminiApiKey: string;
}

export const Layout: React.FC<LayoutProps> = ({ geminiApiKey }) => {
  const { user, supabase, isImpersonating, profile, isAdmin, signOut, stopImpersonating, updateUserProfile } = useAuth();
  const { addToast } = useToast();
  
  const [view, setView] = useState<View>('chat');
  const [workspaceMode, setWorkspaceMode] = useLocalStorage<WorkspaceMode>('workspaceMode', 'autonomous');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const [allChats, setAllChats] = useState<ChatWithProjectData[]>([]);
  const [activeChat, setActiveChat] = useState<ChatWithProjectData | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchResultIndex, setCurrentSearchResultIndex] = useState(-1);
  
  const activeProject = useMemo(() => activeChat?.projects ?? null, [activeChat]);
  
  const handleLogoutAction = isImpersonating ? stopImpersonating : signOut;

  useEffect(() => {
    // Always start in autonomous mode on app load, overriding any stored preference.
    setWorkspaceMode('autonomous');
  }, []); // Empty dependency array ensures this runs only once on mount.

  const autonomousChats = useMemo(() => {
    return allChats.filter(c => c.projects?.name === 'Autonomous Chats');
  }, [allChats]);

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
    setWorkspaceMode('autonomous');
    setIsMobileSidebarOpen(false);
  };

  const handleGoToHub = () => {
    setWorkspaceMode('cocreator');
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
          addToast("This project doesn't have any chats yet.", "info");
      }
      setView('chat');
      setWorkspaceMode('cocreator'); // Switch to cocreator when a project is selected
  };

  const createProjectFromPrompt = async (prompt: string) => {
    if (!user || !supabase) return;
    setIsCreatingChat(true);
    try {
      const { name, description, project_type } = await generateProjectDetails(prompt, geminiApiKey);
      const platform = project_type === 'roblox_game' ? 'Roblox Studio' : 'Web App';
      
      const newProject = await createProject(supabase, user.id, name, platform, project_type);
      newProject.description = description;
      await updateDbProject(supabase, newProject.id, { description });

      const newChat = await createDbChat(supabase, newProject.id, user.id, name, 'build');
      
      const newChatWithProject: ChatWithProjectData = {
        ...newChat,
        projects: newProject
      };

      addToast(`Created new project: ${name}!`, "success");
      setAllChats(prev => [newChatWithProject, ...prev]);
      setActiveChat(newChatWithProject);
      
      await handleSendMessage(prompt, newChatWithProject);

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
        // Find or create the master project for all autonomous chats
        let autonomousProject = allChats.find(c => c.projects?.name === 'Autonomous Chats')?.projects;
        if (!autonomousProject) {
          autonomousProject = await createProject(supabase, user.id, 'Autonomous Chats', 'Web App', 'document', 'A collection of all your conversations in Autonomous Mode.');
        }

        // Create a new chat for this specific conversation, named after the prompt
        const newChatName = prompt; // Will be renamed later by AI
        const newChat = await createDbChat(supabase, autonomousProject.id, user.id, newChatName, 'chat');
        
        const newChatWithProject: ChatWithProjectData = { ...newChat, projects: autonomousProject };
        
        setAllChats(prev => [newChatWithProject, ...prev]);
        setActiveChat(newChatWithProject);
        // Now that the chat exists, call the regular send message handler
        await handleSendMessage(prompt, newChatWithProject);

      } else { // Keep existing Co-Creator logic
        const { intent } = await classifyUserIntent(prompt, geminiApiKey);
        if (intent === 'creative_request') {
          await createProjectFromPrompt(prompt);
        } else {
          let generalChat = allChats.find(c => c.projects?.name === 'General Chat');
          if (generalChat) {
            setActiveChat(generalChat);
            await handleSendMessage(prompt, generalChat);
          } else {
            const newProject = await createProject(supabase, user.id, 'General Chat', 'Web App', 'document');
            const newChat = await createDbChat(supabase, newProject.id, user.id, 'General Chat', 'chat');
            const newChatWithProject: ChatWithProjectData = { ...newChat, projects: newProject };
            setAllChats(prev => [newChatWithProject, ...prev]);
            setActiveChat(newChatWithProject);
            await handleSendMessage(prompt, newChatWithProject);
          }
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

  const handleSendMessage = async (text: string, chatToUse: ChatWithProjectData | null = activeChat) => {
      if (!text.trim() || !supabase || !user || !chatToUse || !chatToUse.projects) return;

      const tempId = `temp-ai-${Date.now()}`;

      try {
        const userMessageData: Omit<Message, 'id' | 'created_at'> = {
          project_id: chatToUse.projects.id,
          chat_id: chatToUse.id,
          user_id: user.id,
          text,
          sender: 'user',
        };
        
        // Step 1: Save user message to DB
        const savedUserMessage = await addMessage(supabase, userMessageData);
        const historyForAgent = [...messages, savedUserMessage];
        
        // Step 2: Add user message and temp AI message to UI
        const tempAiMessage: Message = {
            id: tempId,
            project_id: chatToUse.projects.id,
            chat_id: chatToUse.id,
            text: '',
            sender: 'ai',
        };
        setMessages(prev => [...prev, savedUserMessage, tempAiMessage]);
        setIsLoading(true);

        // Step 3: Run the AI agent
        const onStreamChunk = (chunk: string) => {
            let isEvent = false;
            try {
                const event = JSON.parse(chunk);
                // Handle special events from the agent, like image generation status
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
                 // Append text chunk for streaming effect
                setMessages(prev =>
                    prev.map(m => m.id === tempId ? { ...m, text: m.text + chunk } : m)
                );
            }
        };

        const { messages: agentMessages, projectUpdate } = await runAgent({
            prompt: text,
            apiKey: geminiApiKey,
            model: profile?.preferred_chat_model || chatToUse.projects.default_model,
            project: chatToUse.projects,
            chat: chatToUse,
            user,
            profile,
            supabase,
            history: historyForAgent,
            onStreamChunk,
            workspaceMode,
        });
        
        // Step 4: Save all AI responses from the agent to the database.
        const savedAiMessages: Message[] = [];
        for (const messageContent of agentMessages) {
             // If credit was deducted, the profile state is now stale.
             // We need to update the local profile with the new credit balance.
             if (messageContent.sender === 'ai' && messageContent.text.includes("You don't have enough credits")) {
                // This is a bit of a hack, but it avoids a full profile refetch.
             } else if (messageContent.image_base64) {
                // Refetch profile after successful image generation to get new credit balance
                const { data: latestProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (latestProfile) {
                    // This will trigger a re-render in components that use the auth context.
                    updateUserProfile(latestProfile, false); 
                }
             }
             const savedAiMessage = await addMessage(supabase, messageContent);
             savedAiMessages.push(savedAiMessage);
        }

        // Step 5: Update the UI state in a single, robust operation.
        setMessages(prev => {
            // Remove the temporary streaming message
            const messagesWithoutTemp = prev.filter(m => m.id !== tempId);
            // Add all the newly saved, final AI messages
            return [...messagesWithoutTemp, ...savedAiMessages];
        });
        
        // Step 6: Post-processing (memory, project updates)
        if (savedAiMessages.length > 0) {
            const finalAiMessage = savedAiMessages[savedAiMessages.length - 1];
            extractAndSaveMemory(supabase, user.id, text, finalAiMessage.text || '', chatToUse.projects.id)
                .catch(e => console.warn("Could not auto-save memory:", e));
        }

        if (projectUpdate && chatToUse.projects) {
            await handleUpdateProject(chatToUse.projects.id, projectUpdate);
        }

      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while sending the message.";
        addToast(errorMessage, "error");
        console.error("Error in handleSendMessage:", e);
        setMessages(prev => prev.filter(m => m.id !== tempId));
      } finally {
        setIsLoading(false);
      }
  };
  
  const handleUpdateProject = async (projectId: string, updates: Partial<Project>) => {
    if (!supabase) return;
    try {
        const updatedProject = await updateDbProject(supabase, projectId, updates);
        setAllChats(prev => prev.map(c => {
            if (c.project_id === projectId && c.projects) {
                return { ...c, projects: { ...c.projects, ...updatedProject } };
            }
            return c;
        }));
    } catch (error) {
        console.error("Failed to update project", error);
    }
  };

  const renderCurrentView = () => {
    const chatViewProps = {
        project: activeProject,
        chat: activeChat,
        geminiApiKey: geminiApiKey,
        messages: messages,
        isLoadingHistory: isLoading,
        isCreatingChat: isCreatingChat,
        setMessages: setMessages,
        onSendMessage: activeChat ? handleSendMessage : handleFirstMessage,
        onChatUpdate: (updates: Partial<Chat>) => activeChat && handleUpdateChat(activeChat.id, updates),
        onActiveProjectUpdate: (updates: Partial<Project>) => activeProject && handleUpdateProject(activeProject.id, updates),
        searchQuery: searchQuery,
        onSearchResultsChange: setSearchResults,
        currentSearchResultMessageIndex: currentSearchResultIndex,
        isAdmin: !!isAdmin,
        workspaceMode: workspaceMode,
    };

    switch (view) {
      case 'settings':
        return <SettingsPage onBack={() => setView('chat')} />;
      case 'chat':
      default:
        if (workspaceMode === 'cocreator' && !activeChat) {
          return <ProjectsPage profile={profile} onSelectProject={handleSelectProjectFromHub} />;
        }
        if (workspaceMode === 'cocreator' && activeChat && activeProject) {
            return (
                <div className="flex flex-1 overflow-hidden">
                    <div className="flex-1 flex flex-col">
                         <ChatView {...chatViewProps} key={activeChat?.id || 'cocreator-chat'} />
                    </div>
                    <CoCreatorWorkspace project={activeProject} messages={messages} />
                </div>
            );
        }
        
        // Autonomous mode
        const hasWebAppCode = messages.some(m => m.language === 'html' && m.code);
        if (hasWebAppCode) {
            return (
                <div className="flex flex-1 overflow-hidden">
                    <div className="flex-1 flex flex-col">
                        <ChatView {...chatViewProps} key={activeChat?.id || 'new-chat-auto-split'} />
                    </div>
                    <WebAppPreview messages={messages} />
                </div>
            );
        }

        return <ChatView {...chatViewProps} key={activeChat?.id || 'new-chat-auto'} />;
    }
  };

  return (
    <div className="h-screen w-full bg-bg-primary font-sans flex flex-col">
      <StatusBar />
      <div className="flex flex-1 overflow-hidden">
          <LeftSidebar
            allChats={autonomousChats}
            activeChatId={activeChat?.id}
            onSelectChat={handleSelectChat}
            onNewChatClick={handleNewChat}
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
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <TopBar
              onGoToHub={handleGoToHub}
              onAccountSettingsClick={handleGoToSettings}
              onProjectSettingsClick={() => {}} // This will be handled inside CoCreatorWorkspace
              onLogout={handleLogoutAction}
              activeProjectName={activeProject?.name ?? null}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onSwitchToAutonomous={handleNewChat}
              onSwitchToCocreator={handleGoToHub}
              workspaceMode={workspaceMode}
              onWorkspaceModeChange={setWorkspaceMode}
              isProjectView={!!activeProject && workspaceMode === 'cocreator'}
              onMobileMenuClick={() => setIsMobileSidebarOpen(true)}
              isThinking={isLoading || isCreatingChat}
            />
            <main className="flex-1 overflow-y-auto flex flex-col">
                {renderCurrentView()}
            </main>
          </div>
      </div>
    </div>
  );
};