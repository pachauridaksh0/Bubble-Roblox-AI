import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LeftSidebar } from '../layout/LeftSidebar';
import { ChatView } from '../chat/ChatView';
import { ProjectsPage } from '../pages/ProjectsPage';
import { AdminTopBar } from './AdminTopBar';
import { Project, Message, Chat, WorkspaceMode } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { 
    getAllProjects, 
    createProject, 
    getMessages, 
    updateProject as updateDbProject,
    createChat as createDbChat,
    updateChat as updateDbChat,
    ChatWithProjectData,
    getAllChatsForUser,
    getChatsForProject,
    addMessage,
    deleteProject,
    deleteChat
} from '../../services/databaseService';
import { validateApiKey, classifyUserIntent, generateProjectDetails } from '../../services/geminiService';
import { motion } from 'framer-motion';
import { KeyIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { AdminUsersPage } from './AdminUsersPage';
import { ProjectSettingsModal } from '../dashboard/ProjectSettingsModal';
import { AdminSettingsPage } from './AdminSettingsPage';
import { CoCreatorWorkspace } from '../cocreator/CoCreatorWorkspace';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useToast } from '../../hooks/useToast';
import { runAgent } from '../../agents';
import { AdminConfirmationModal } from './AdminConfirmationModal';
import { SettingsPage } from '../pages/SettingsPage';

const AdminApiKeySetup: React.FC = () => {
    const { setGeminiApiKey } = useAuth();
    const [adminKeyInput, setAdminKeyInput] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleAdminKeySave = async () => {
        if (!adminKeyInput.trim() || isValidating) return;
        setIsValidating(true);
        setValidationError(null);
        const { success, message } = await validateApiKey(adminKeyInput);
        if (success) {
            setGeminiApiKey(adminKeyInput);
        } else {
            setValidationError(message || 'Invalid API Key. Please check the key and try again.');
        }
        setIsValidating(false);
    };

    const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAdminKeyInput(e.target.value);
        if (validationError) setValidationError(null);
    };

    return (
        <div className="flex items-center justify-center h-screen bg-bg-primary text-white">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md p-8 bg-bg-secondary/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-center"
            >
                <KeyIcon className="w-10 h-10 mx-auto text-primary-start mb-4" />
                <h1 className="text-2xl font-bold mb-2">Admin API Key Setup</h1>
                <p className="text-gray-400 mb-6">A Gemini API Key is required to view project data. Please provide one to continue.</p>

                <div className="space-y-2 text-left">
                    <input
                        type="password"
                        value={adminKeyInput}
                        onChange={handleKeyChange}
                        placeholder="Enter your Gemini API Key"
                        className={`w-full px-4 py-3 bg-white/5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${validationError ? 'border-red-500/50 focus:ring-red-500' : 'border-white/20 focus:ring-primary-start'}`}
                    />
                    <button
                        onClick={handleAdminKeySave}
                        disabled={!adminKeyInput.trim() || isValidating}
                        className="w-full px-4 py-3 bg-primary-start text-white rounded-lg font-semibold hover:bg-primary-start/80 transition-colors disabled:opacity-50 flex items-center justify-center h-[51px]"
                    >
                        {isValidating ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Save & Continue'}
                    </button>
                </div>
                {validationError && (
                    <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-sm mt-3 text-left flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        {validationError}
                    </motion.p>
                )}
                 <p className="text-center mt-4"><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-start/80 hover:text-primary-start underline">Where can I get a Gemini API key?</a></p>
            </motion.div>
        </div>
    );
};

// FIX: Add 'credit-system' to align with AdminTopBar's type definition and resolve the error.
type AdminView = 'projects' | 'users' | 'settings' | 'personal-settings' | 'credit-system';

export const AdminPage: React.FC = () => {
  const { geminiApiKey, user, supabase, profile, isAdmin, signOut } = useAuth();
  const { addToast } = useToast();
  
  const [view, setView] = useState<AdminView>('projects');
  const [workspaceMode, setWorkspaceMode] = useLocalStorage<WorkspaceMode>('adminWorkspaceMode', 'autonomous');
  
  const [isProjectSettingsModalOpen, setProjectSettingsModalOpen] = useState(false);

  // Data for autonomous mode (admin's own chats)
  const [allChats, setAllChats] = useState<ChatWithProjectData[]>([]);
  const [activeChat, setActiveChat] = useState<ChatWithProjectData | null>(null);
  
  // Data for cocreator mode (all projects in the system)
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [activeCocreatorProject, setActiveCocreatorProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const activeProject = useMemo(() => activeChat?.projects ?? null, [activeChat]);

  // Always start in autonomous mode on app load for admin.
  useEffect(() => {
    setWorkspaceMode('autonomous');
  }, []);

  const autonomousChats = useMemo(() => {
    return allChats.filter(c => c.projects?.name === 'Autonomous Chats (Admin)');
  }, [allChats]);

  // Fetch all projects for the Co-Creator hub view
  const fetchAdminProjects = useCallback(async () => {
      if (!supabase) return;
      setIsLoading(true);
      setProjectsError(null);
      try {
          const projectsData = await getAllProjects(supabase);
          setAllProjects(projectsData);
      } catch (error) {
          setProjectsError("An error occurred while fetching projects.");
      } finally {
          setIsLoading(false);
      }
  }, [supabase]);

  useEffect(() => {
    if (supabase && geminiApiKey) {
        fetchAdminProjects();
        // Add real-time subscription for projects
        const channel = supabase.channel('admin-projects-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchAdminProjects).subscribe();
        return () => { supabase.removeChannel(channel); };
    }
  }, [supabase, geminiApiKey, fetchAdminProjects]);

  // Fetch the admin's own chats for the Autonomous sidebar
  useEffect(() => {
    if (!user || !supabase) return;

    const fetchAdminChats = async () => {
      setIsLoading(true);
      try {
        const adminChats = await getAllChatsForUser(supabase, user.id);
        setAllChats(adminChats);
      } catch (error) { addToast("Could not load your conversations.", "error"); } 
      finally { setIsLoading(false); }
    };
    fetchAdminChats();

    const channel = supabase.channel(`admin-user-chats-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'chats', filter: `user_id=eq.${user.id}` }, fetchAdminChats).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, supabase, addToast]);
  
  // Fetch messages for the currently active chat (in any mode)
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
  
  const handleSelectChat = (chat: ChatWithProjectData) => {
    setActiveChat(chat);
    setActiveCocreatorProject(null);
    setWorkspaceMode('autonomous');
  };

  const handleGoToHub = () => {
    setWorkspaceMode('cocreator');
    setActiveChat(null);
    setActiveCocreatorProject(null);
    setView('projects');
  };
  
  const handleGoToSettings = () => {
    setView('personal-settings');
    setWorkspaceMode('cocreator'); // Keep in cocreator mode for settings page
    setActiveChat(null);
    setActiveCocreatorProject(null);
  };

  const handleNewChat = () => {
    setActiveChat(null);
    setActiveCocreatorProject(null);
    setWorkspaceMode('autonomous');
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
    if (!supabase) return;
    setActiveCocreatorProject(project);
    try {
        const projectChats = await getChatsForProject(supabase, project.id);
        const sortedChats = projectChats.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        if (sortedChats.length > 0) {
            setActiveChat({ ...sortedChats[0], projects: project });
        } else {
            setActiveChat(null);
            addToast("This project doesn't have any chats yet.", "info");
        }
    } catch {
        addToast("Could not load chats for this project.", "error");
    }
  };

  const createProjectFromPrompt = async (prompt: string) => {
    if (!user || !supabase || !geminiApiKey) return;
    setIsCreatingChat(true);
    try {
      const { name, description, project_type } = await generateProjectDetails(prompt, geminiApiKey);
      const platform = project_type === 'roblox_game' ? 'Roblox Studio' : 'Web App';
      
      const newProject = await createProject(supabase, user.id, name, platform, project_type);
      newProject.description = description;
      await updateDbProject(supabase, newProject.id, { description });

      const newChat = await createDbChat(supabase, newProject.id, user.id, name, 'build');
      const newChatWithProject: ChatWithProjectData = { ...newChat, projects: newProject };

      addToast(`Created new admin project: ${name}!`, "success");
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
        // Find or create the master project for all of the admin's autonomous chats
        let autonomousProject = allChats.find(c => c.projects?.name === 'Autonomous Chats (Admin)')?.projects;
        if (!autonomousProject) {
          autonomousProject = await createProject(supabase, user.id, 'Autonomous Chats (Admin)', 'Web App', 'document', 'A collection of all admin conversations in Autonomous Mode.');
        }

        // Create a new chat for this specific conversation, named after the prompt
        const newChatName = prompt.length > 40 ? `${prompt.substring(0, 37)}...` : prompt;
        const newChat = await createDbChat(supabase, autonomousProject.id, user.id, newChatName, 'chat');
        
        const newChatWithProject: ChatWithProjectData = { ...newChat, projects: autonomousProject };
        
        setAllChats(prev => [newChatWithProject, ...prev]);
        setActiveChat(newChatWithProject);
        // Now that the chat exists, call the regular send message handler
        await handleSendMessage(prompt, newChatWithProject);

      } else { // Keep existing Co-Creator logic for admin
        const { intent } = await classifyUserIntent(prompt, geminiApiKey);
        if (intent === 'creative_request') {
          await createProjectFromPrompt(prompt);
        } else {
          let generalChat = allChats.find(c => c.projects?.name === 'General Chat (Admin)');
          if (generalChat) {
            setActiveChat(generalChat);
            await handleSendMessage(prompt, generalChat);
          } else {
            const newProject = await createProject(supabase, user.id, 'General Chat (Admin)', 'Web App', 'document');
            const newChat = await createDbChat(supabase, newProject.id, user.id, 'General Chat (Admin)', 'chat');
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
       console.error("Error in admin handleFirstMessage:", error);
    } finally {
       setIsCreatingChat(false);
    }
  };


  const handleSendMessage = async (text: string, chatToUse: ChatWithProjectData | null = activeChat) => {
      if (!text.trim() || !supabase || !user || !chatToUse || !chatToUse.projects || !geminiApiKey) return;

      const tempId = `temp-ai-${Date.now()}`;
      
      try {
        const userMessageData: Omit<Message, 'id' | 'created_at'> = {
          project_id: chatToUse.projects.id,
          chat_id: chatToUse.id,
          user_id: user.id,
          text,
          sender: 'user',
        };

        const savedUserMessage = await addMessage(supabase, userMessageData);
        const historyForAgent = [...messages, savedUserMessage];
      
        const tempAiMessage: Message = {
            id: tempId,
            project_id: chatToUse.projects.id,
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
            model: chatToUse.projects.default_model,
            project: chatToUse.projects,
            chat: chatToUse,
            user,
            profile,
            supabase,
            history: historyForAgent,
            onStreamChunk,
            workspaceMode
        });
        
        // Save all AI messages and update state robustly
        const savedAiMessages: Message[] = [];
        for (const messageContent of agentMessages) {
            const savedAiMessage = await addMessage(supabase, messageContent);
            savedAiMessages.push(savedAiMessage);
        }
        
        setMessages(prev => {
            const messagesWithoutTemp = prev.filter(m => m.id !== tempId);
            return [...messagesWithoutTemp, ...savedAiMessages];
        });

        if (projectUpdate && chatToUse.projects) {
            await handleUpdateProjectForAdmin(chatToUse.projects.id, projectUpdate);
        }

      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while sending the message.";
        addToast(errorMessage, "error");
        console.error("Error in admin handleSendMessage:", e);
        setMessages(prev => prev.filter(m => m.id !== tempId));
      } finally {
        setIsLoading(false);
      }
  };

  const handleUpdateChat = useCallback(async (chatId: string, updates: Partial<Chat>) => {
    if (!supabase) return;
    try {
      const updatedChat = await updateDbChat(supabase, chatId, updates);
      setAllChats(prev => prev.map(c => c.id === chatId ? { ...c, ...updatedChat } : c));
      setActiveChat(prev => (prev?.id === chatId ? { ...prev, ...updatedChat } : prev));
    } catch (error) { console.error("Failed to update chat", error); }
  }, [supabase]);
  
  const handleUpdateProjectForAdmin = async (projectId: string, updates: Partial<Project>) => {
    if (!supabase) return;
    try {
        const updatedProject = await updateDbProject(supabase, projectId, updates);
        setAllProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
        if (activeCocreatorProject?.id === projectId) {
            setActiveCocreatorProject(updatedProject);
        }
        setAllChats(prev => prev.map(c => c.project_id === projectId && c.projects ? { ...c, projects: { ...c.projects, ...updatedProject }} : c));
    } catch (error) { throw error; }
  };
  
  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete || !supabase) return;
    try {
        await deleteProject(supabase, projectToDelete.id);
        setAllProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
        addToast(`Project "${projectToDelete.name}" was deleted.`, 'info');
    } catch (err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        addToast(`Failed to delete project: ${message}`, 'error');
    } finally {
        setProjectToDelete(null);
    }
  };

  const handleWorkspaceModeChange = (mode: WorkspaceMode) => {
    if (workspaceMode === 'autonomous' && mode === 'cocreator') {
        setActiveChat(null);
    }
    setView('projects');
    setActiveCocreatorProject(null);
    setWorkspaceMode(mode);
  };
  
  if (!geminiApiKey) {
    return <AdminApiKeySetup />;
  }

  const renderContent = () => {
    if (workspaceMode === 'cocreator') {
        switch (view) {
            case 'users': return <AdminUsersPage />;
            case 'settings': return <AdminSettingsPage />;
            case 'personal-settings': return <SettingsPage onBack={() => setView('projects')} />;
            case 'projects':
            default:
                if (activeCocreatorProject) {
                    return <CoCreatorWorkspace project={activeCocreatorProject} messages={messages} />;
                }
                const projectsForHub = allProjects.filter(p => 
                    !p.name.includes('Autonomous Chats') &&
                    !p.name.includes('General Chat')
                );
                return <ProjectsPage profile={profile} onSelectProject={handleSelectProjectFromHub} projects={projectsForHub} isLoading={isLoading} error={projectsError} onDeleteProject={setProjectToDelete} />;
        }
    }
    
    // Autonomous mode
    return (
        <ChatView
            key={activeChat?.id || 'new-chat-admin'}
            project={activeProject}
            chat={activeChat}
            geminiApiKey={geminiApiKey}
            messages={messages}
            isLoadingHistory={isLoading}
            isCreatingChat={isCreatingChat}
            setMessages={setMessages}
            onSendMessage={activeChat ? handleSendMessage : handleFirstMessage}
            onChatUpdate={(updates) => activeChat && handleUpdateChat(activeChat.id, updates)}
            onActiveProjectUpdate={(updates) => activeProject && handleUpdateProjectForAdmin(activeProject.id, updates)}
            searchQuery={''}
            onSearchResultsChange={() => {}}
            currentSearchResultMessageIndex={-1}
            isAdmin={!!isAdmin}
            workspaceMode={workspaceMode}
        />
    );
  };

  return (
    <div className="flex h-screen w-full bg-bg-primary font-sans">
      {workspaceMode === 'autonomous' && (
        <LeftSidebar
          allChats={autonomousChats}
          activeChatId={activeChat?.id}
          onSelectChat={handleSelectChat}
          onNewChatClick={handleNewChat}
          onUpdateChat={handleUpdateChat}
          // FIX: Pass the handleDeleteChat function to satisfy the LeftSidebarProps interface.
          onDeleteChat={handleDeleteChat}
          onSettingsClick={handleGoToSettings}
          onGoToHub={handleGoToHub}
          onSignOut={signOut}
          profile={profile}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
          workspaceMode={workspaceMode}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopBar 
            currentView={view} 
            setView={(newView) => {
                setActiveChat(null);
                setActiveCocreatorProject(null);
                setView(newView);
            }}
            workspaceMode={workspaceMode}
            onWorkspaceModeChange={handleWorkspaceModeChange}
            onMobileMenuClick={() => setIsMobileSidebarOpen(true)}
            isThinking={isLoading || isCreatingChat}
            onSwitchToAutonomous={handleNewChat}
            onSwitchToCocreator={handleGoToHub}
            onAccountSettingsClick={handleGoToSettings}
            onSignOut={signOut}
        />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      <ProjectSettingsModal
        isOpen={isProjectSettingsModalOpen}
        onClose={() => setProjectSettingsModalOpen(false)}
        project={activeCocreatorProject}
        onSave={handleUpdateProjectForAdmin}
      />
      <AdminConfirmationModal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleConfirmDeleteProject}
        config={projectToDelete ? {
            title: `Delete "${projectToDelete.name}"?`,
            message: "This action is permanent and cannot be undone. All associated chats and messages for this project will also be deleted.",
            confirmText: "Yes, delete project",
            confirmClassName: 'bg-red-600 text-white hover:bg-red-700'
        } : null}
      />
    </div>
  );
};
