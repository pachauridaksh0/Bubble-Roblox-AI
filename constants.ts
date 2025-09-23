
import { Message } from './types';

// Local storage keys for credentials
export const GEMINI_API_KEY_KEY = 'bubble_gemini_api_key';

export const WELCOME_MESSAGE: Message = {
  id: '0',
  project_id: '0',
  chat_id: '0',
  text: "Hello! I'm Bubble, your AI assistant for Roblox scripting. What can we create today?",
  sender: 'ai',
};