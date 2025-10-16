export type WorkspaceMode = 'autonomous' | 'cocreator';
export type ChatMode = 'chat' | 'plan' | 'build' | 'thinker' | 'super_agent' | 'pro_max';
export type ProjectPlatform = 'Roblox Studio' | 'Web App';
export type ProjectType = 'roblox_game' | 'video' | 'story' | 'design' | 'website' | 'presentation' | 'document';
export type ProjectStatus = 'In Progress' | 'Archived';
export type MemoryLayer = 'personal' | 'project' | 'codebase' | 'aesthetic';

export type Membership = 'na' | 'pro' | 'max' | 'admin';
export type ImageModel = 'nano_banana' | 'imagen_2' | 'imagen_3';
export type ChatModel = 'gemini_1.5_flash' | 'gemini_2.5_flash';

export interface Profile {
  id: string;
  roblox_id: string;
  roblox_username: string;
  avatar_url: string;
  role?: 'user' | 'admin';
  status?: 'active' | 'banned';
  gemini_api_key?: string | null;
  onboarding_preferences?: OnboardingPreferences | null;
  // New Credit System Fields
  credits: number;
  membership: Membership;
  last_credit_award_date?: string | null;
  // Model Preferences
  preferred_image_model: ImageModel;
  preferred_chat_model: ChatModel;
}

export interface AppSettings {
    id: number;
    daily_credits_na: number;
    daily_credits_pro: number;
    daily_credits_max: number;
    daily_credits_admin: number;
    cost_per_100_credits: number;
    cost_image_nano_banana: number;
    cost_image_imagen_2: number;
    cost_image_imagen_3: number;
    cost_chat_gemini_1_5_flash: number;
    cost_chat_gemini_2_5_flash: number;
    updated_at: string;
}

export interface OnboardingPreferences {
  experience_level: 'beginner' | 'intermediate' | 'expert';
  ui_style: 'minimal' | 'standard' | 'advanced';
  ui_density: 'spacious' | 'comfortable' | 'compact';
  ui_theme: 'light' | 'dark' | 'auto';
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  platform: ProjectPlatform;
  project_type: ProjectType;
  default_model: string;
  project_memory?: string;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  mode: ChatMode;
  created_at: string;
  updated_at: string;
}

export interface Task {
  text: string;
  status: 'pending' | 'in-progress' | 'complete';
  code?: string | null;
  explanation?: string;
}

export interface Plan {
  title: string;
  features: string[];
  mermaidGraph: string;
  tasks: Task[];
  isComplete: boolean;
}

export interface Clarification {
  prompt: string;
  questions: string[];
  answers?: string[];
}

export interface ThinkerResponse {
  thought: string;
  response: string;
}

export interface Message {
  id: string;
  project_id: string;
  chat_id: string;
  user_id?: string;
  sender: 'user' | 'ai';
  text: string;
  created_at?: string;
  plan?: Plan;
  clarification?: Clarification;
  standing_response?: ThinkerResponse;
  opposing_response?: ThinkerResponse;
  image_base64?: string;
  imageStatus?: 'generating' | 'complete' | 'error';
  code?: string | null;
  language?: string | null;
  raw_ai_response?: string | null;
}

export interface Memory {
    id: string;
    user_id: string;
    project_id: string | null;
    layer: MemoryLayer;
    content: string;
    token_count: number;
    importance: number;
    usage_count: number;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface MCPRequest {
  prompt: string;
  userId: string;
}

export interface StorageConfig {
  userId: string;
  githubToken: string;
  githubUsername: string;
  driveAccessToken: string;
  driveFolderId: string;
}
export interface ProjectFiles {
  code: CodeFile[];
  assets: Asset[];
  metadata: any;
}
export interface CodeFile { 
  path: string; 
  content: string; 
}
export interface Asset { 
  name: string; 
  type: string;
  // This could be a path to a local file, a URL, or raw data
  source: string | File | Blob;
}