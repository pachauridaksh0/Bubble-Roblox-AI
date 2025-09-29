import { GoogleGenAI } from "@google/genai";
import { AgentInput, AgentOutput, AgentExecutionResult } from '../types';
import { standingInstruction, opposingInstruction, synthesisInstruction } from './instructions';
import { thinkerSchema } from './schemas';
import { ThinkerResponse, Message } from '../../types';

const mapMessagesToGeminiHistory = (messages: Message[]) => {
  // Thinker responses have complex objects, only use text for history
  return messages.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'model' as 'user' | 'model',
    parts: [{ text: msg.text }],
  })).filter(msg => msg.parts[0].text.trim() !== '');
};

export const runThinkerAgent = async (input: AgentInput): Promise<AgentExecutionResult> => {
    const { prompt, apiKey, model, project, chat, history } = input;
    const ai = new GoogleGenAI({ apiKey });

    const geminiHistory = mapMessagesToGeminiHistory(history);
    const contextPrompt = `PROJECT CONTEXT:\n${project.project_memory || 'No project context has been set yet.'}\n\nUSER REQUEST: "${prompt}"`;

    // 1. Standing Response
    const standingContents = [...geminiHistory, { role: 'user', parts: [{ text: contextPrompt }] }];
    const standingResponseObj = await ai.models.generateContent({
        model,
        contents: standingContents,
        config: {
            systemInstruction: standingInstruction,
            responseMimeType: "application/json",
            responseSchema: thinkerSchema,
        }
    });
    const standing = JSON.parse(standingResponseObj.text.trim()) as ThinkerResponse;

    // 2. Opposing Response
    const opposingContents = [...geminiHistory, { role: 'user', parts: [{ text: `The user's request is: "${prompt}". The initial plan is: "${standing.response}". Now, provide your critique.` }] }];
    const opposingResponseObj = await ai.models.generateContent({
        model,
        contents: opposingContents,
        config: {
            systemInstruction: opposingInstruction,
            responseMimeType: "application/json",
            responseSchema: thinkerSchema,
        }
    });
    const opposing = JSON.parse(opposingResponseObj.text.trim()) as ThinkerResponse;

    // 3. Synthesis Response
    const synthesisContents = [...geminiHistory, { role: 'user', parts: [{ text: `User request: "${prompt}"\n\nInitial Plan:\n${standing.response}\n\nCritique/Alternatives:\n${opposing.response}\n\nNow, generate the final synthesized response for the user.` }] }];
    const synthesisResponseObj = await ai.models.generateContent({
        model,
        contents: synthesisContents,
        config: {
            systemInstruction: synthesisInstruction,
        }
    });
    const final = synthesisResponseObj.text;

    const aiMessage: AgentOutput[0] = {
        project_id: project.id,
        chat_id: chat.id,
        sender: 'ai',
        text: final, // The synthesized response is the main text
        standing_response: standing,
        opposing_response: opposing,
    };
    
    return { messages: [aiMessage] };
};
