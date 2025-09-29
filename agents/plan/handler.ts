import { GoogleGenAI } from "@google/genai";
import { AgentInput, AgentOutput, AgentExecutionResult } from '../types';
import { memoryCreationInstruction } from './instructions';
import { planAgentSchema } from './schemas';
import { Message } from '../../types';

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
    const { project, chat, prompt, apiKey, model, history } = input;
    const ai = new GoogleGenAI({ apiKey });

    const geminiHistory = mapMessagesToGeminiHistory(history);
    
    // Add current memory to the prompt for context
    const contextPrompt = `Current Project Memory:\n"""\n${project.project_memory || 'This project does not have a memory yet.'}\n"""\n\nUser request: "${prompt}"`;
    const contents = [...geminiHistory, { role: 'user', parts: [{ text: contextPrompt }] }];

    try {
        const response = await ai.models.generateContent({
            model,
            contents: contents,
            config: {
                systemInstruction: memoryCreationInstruction,
                responseMimeType: "application/json",
                responseSchema: planAgentSchema,
            }
        });

        const agentResponse = JSON.parse(response.text.trim()) as AgentResponse;

        if (agentResponse.projectMemory) {
            const projectMemory = agentResponse.projectMemory;
            const confirmationMessage: AgentOutput[0] = {
                project_id: project.id,
                chat_id: chat.id,
                sender: 'ai',
                text: "Got it. I've updated the project's memory with our new plan. You can now use Chat mode for general questions or Build mode to start creating features, and I'll remember this context.",
            };

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
            return { messages: [conversationalMessage] };
        } else {
             throw new Error("The AI returned an unexpected response format.");
        }

    } catch (error) {
        console.error("Error in runPlanAgent:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        const fallbackMessage: AgentOutput[0] = {
            project_id: project.id,
            chat_id: chat.id,
            sender: 'ai',
            text: `I'm sorry, but I encountered an error while trying to manage the project memory. (Error: ${errorMessage})`
        };
        return { messages: [fallbackMessage] };
    }
};
