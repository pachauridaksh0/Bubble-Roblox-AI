import { GoogleGenAI } from "@google/genai";
import { AgentInput, AgentOutput, AgentExecutionResult } from '../types';
import { memoryCreationInstruction } from './instructions';
import { planAgentSchema } from './schemas';
import { Message } from '../../types';
import { getUserFriendlyError } from "../errorUtils";
import { getMemoriesForContext } from "../../services/databaseService";

interface AgentResponse {
    projectMemory?: string;
    responseText?: string;
}

const mapMessagesToGeminiHistory = (messages: Message[]) => {
  return messages.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'model' as 'user' | 'model',
    parts: [{ text: msg.text }],
  })).filter(msg => msg.parts[0].text.trim() !== '');
};

export const runPlanAgent = async (input: AgentInput): Promise<AgentExecutionResult> => {
    const { project, chat, prompt, apiKey, model, history, supabase, user, onStreamChunk } = input;
    const ai = new GoogleGenAI({ apiKey });

    onStreamChunk?.("Thinking about how to update our plan... 🤔");

    const geminiHistory = mapMessagesToGeminiHistory(history);
    
    const memoryContext = await getMemoriesForContext(supabase, user.id, project.id);
    const contextPrompt = `Current Memory Context:\n"""\n${memoryContext}\n"""\n\nUser request: "${prompt}"`;
    const contents = [...geminiHistory, { role: 'user', parts: [{ text: contextPrompt }] }];

    try {
        const response = await ai.models.generateContent({
            model,
            contents: contents,
            config: {
                systemInstruction: memoryCreationInstruction,
                responseMimeType: "application/json",
                responseSchema: planAgentSchema,
                temperature: 0.3,
                topP: 0.9,
            }
        });

        const rawResponseText = response.text.trim();
        const agentResponse = JSON.parse(rawResponseText) as AgentResponse;

        if (agentResponse.projectMemory) {
            const projectMemory = agentResponse.projectMemory;
            const confirmationMessage: AgentOutput[0] = {
                project_id: project.id,
                chat_id: chat.id,
                sender: 'ai',
                text: "Got it. I've updated the project's memory with our new plan. You can now use Chat mode for general questions or Build mode to start creating features, and I'll remember this context.",
            };
            if (input.profile?.role === 'admin') {
                confirmationMessage.raw_ai_response = rawResponseText;
            }

            return {
                messages: [confirmationMessage],
                projectUpdate: {
                    project_memory: projectMemory
                }
            };
        } else if (agentResponse.responseText) {
            const conversationalMessage: AgentOutput[0] = {
                project_id: project.id,
                chat_id: chat.id,
                sender: 'ai',
                text: agentResponse.responseText,
            };
            if (input.profile?.role === 'admin') {
                conversationalMessage.raw_ai_response = rawResponseText;
            }
            return { messages: [conversationalMessage] };
        } else {
             throw new Error("The AI returned an unexpected response format.");
        }

    } catch (error) {
        console.error("Error in runPlanAgent:", error);
        const errorMessage = getUserFriendlyError(error);
        const fallbackMessage: AgentOutput[0] = {
            project_id: project.id,
            chat_id: chat.id,
            sender: 'ai',
            text: `I'm sorry, but I encountered an error while trying to manage the project memory. ${errorMessage}`
        };
        return { messages: [fallbackMessage] };
    }
};