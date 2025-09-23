import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Task, ProjectPlatform, ThinkerResponse } from '../types';

export interface GeminiResponse {
    explanation: string;
    code: string | null;
}

export interface PlanResponse {
    title:string;
    introduction: string;
    features: string[];
    tasks: string[];
}

export interface ClarificationQuestionsResponse {
    questions: string[];
}

const clarificationInstruction = `You are "Bubble", an expert AI project manager for Roblox development. The user will provide a high-level goal. Your job is to analyze their request and generate a few key clarifying questions to better understand the requirements before you create a plan. Focus on questions that will significantly impact the implementation (e.g., "Should the leaderboard be server-wide or per-round?", "What should happen when the player's health reaches zero?"). You MUST respond in the JSON format defined in the schema. If the user's request is already very specific and no questions are needed, return an empty array for the questions.`;

const planGenerationInstruction = `You are "Bubble", an expert AI project manager for Roblox development. The user will provide a high-level goal and answers to clarifying questions. Your job is to break that goal down into a logical, step-by-step plan based on all the provided information.

Follow these rules:
- First, provide a brief, encouraging introduction about how you'll approach the plan.
- Second, create a "features" array: a high-level, user-friendly list of the key features you'll be building.
- Third, create a "tasks" array: a detailed, step-by-step list of smaller, actionable coding tasks.

**VERY IMPORTANT File Path Rules:**
- For each task that involves creating a script or object, you MUST specify its full location using a standard Roblox path format.
- Start from a top-level service. Common services are: Workspace, ReplicatedStorage, ServerScriptService, ServerStorage, StarterPlayer, StarterGui, StarterPack.
- For player scripts, use 'StarterPlayer/StarterPlayerScripts' for scripts that run once when the player joins, or 'StarterPlayer/StarterCharacterScripts' for scripts that run every time a character spawps.
- **You MUST enclose the full path in backticks (\`).**

**Example Task Formats:**
- "Create the main KillPart script in \`ServerScriptService/KillPartScript\`."
- "Add a configuration folder named 'Settings' inside \`ReplicatedStorage/Settings\`."
- "Create a LocalScript for UI events in \`StarterGui/MainScreenGui/Frame/TextButtonLocalScript\`."

- You MUST respond in the JSON format defined in the schema.`;

const robloxCodeGenerationInstruction = `You are "Bubble", an expert AI assistant for Roblox developers. Your primary goal is to be helpful and conversational.
- You will be given a specific task from a larger plan.
- Generate the Luau code required to complete ONLY that task.
- Provide a brief, friendly explanation of the code you've written.
- You MUST respond in the JSON format defined in the schema.`;

const webCodeGenerationInstruction = `You are "Bubble", an expert AI assistant for full-stack web development.
- You will be given a specific task from a larger plan.
- Your goal is to generate a single, self-contained HTML file that accomplishes the task.
- The generated code MUST include all necessary HTML, CSS (inside <style> tags), and JavaScript (inside <script> tags) in one file.
- Provide a brief, friendly explanation of the code you've written.
- You MUST respond in the JSON format defined in the schema, placing the entire HTML content into the "code" field.`;

const standingInstruction = `You are a helpful, optimistic AI assistant. Your goal is to fully understand the user's request and expand upon it in a constructive way.
- First, briefly summarize your understanding of the user's goal in the 'thought' field.
- Then, lay out a high-level plan or a series of steps to achieve it in the 'response' field.
- Maintain a positive and encouraging tone.
- You MUST respond in the JSON format defined in the schema.`;

const opposingInstruction = `You are a critical, cautious AI assistant. Your role is to act as a "red team" member, challenging the assumptions and plans related to a user's request.
- You will be given a user's request and a "standing" plan created by another AI.
- Your goal is to identify potential risks, edge cases, or alternative approaches that might be better.
- In the 'thought' field, summarize your critique.
- In the 'response' field, phrase your feedback constructively. Start by acknowledging the standing plan, then introduce your points with phrases like "However, have we considered...", "A potential risk here is...", or "An alternative approach could be...".
- Be specific in your critique. Don't just say "it's bad," explain *why* something might be a problem.
- You MUST respond in the JSON format defined in the schema.`;

const synthesisInstruction = `You are a wise, synthesizing AI project lead. You have been presented with a user's request, an initial "standing" plan, and a "critique" from an opposing perspective. Your job is to create a final, balanced response.
- Your response should integrate the best ideas from both the standing and opposing viewpoints.
- Acknowledge the user's goal, summarize the core of the initial plan, and incorporate the valid concerns or better alternatives from the critique.
- Produce a final, actionable plan or response for the user that is more robust because of the debate.
- The final response should be a clear, single piece of text directed at the user.`;

const thinkerSchema = {
    type: Type.OBJECT,
    properties: {
        thought: { type: Type.STRING, description: "A brief summary of your thinking process and how you are approaching the request based on your persona." },
        response: { type: Type.STRING, description: "Your main response, following the instructions for your persona (e.g., the plan, the critique)." }
    },
    required: ["thought", "response"]
};


// Helper for retries
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey) {
        return false;
    }
    const ai = new GoogleGenAI({ apiKey: apiKey });

    try {
        await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "hello",
            config: {
                thinkingConfig: { thinkingBudget: 0 }
            }
        });
        return true;
    } catch (error) {
        console.error("API Key validation failed:", error);
        return false;
    }
};

export const generateChatTitle = async (prompt: string, apiKey: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on the following user prompt, generate a short, descriptive chat title (3-5 words max). Do not use quotes or special characters.

User prompt: "${prompt}"`,
        config: {
            systemInstruction: 'You are an AI that creates concise titles for conversations.',
            temperature: 0.2,
            thinkingConfig: { thinkingBudget: 0 },
        },
    });
    // Clean up response: remove quotes, trim whitespace
    return response.text.replace(/"/g, '').trim();
}

export const generateClarifyingQuestions = async (prompt: string, apiKey: string, model: string): Promise<ClarificationQuestionsResponse> => {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const response = await ai.models.generateContent({
        model: model,
        contents: `User's goal: "${prompt}"`,
        config: {
            systemInstruction: clarificationInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    questions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "An array of clarifying questions for the user."
                    }
                },
                required: ["questions"]
            }
        }
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString) as ClarificationQuestionsResponse;
}

export const generatePlan = async (prompt: string, apiKey: string, model: string): Promise<PlanResponse> => {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: `User request: "${prompt}"`,
                config: {
                    systemInstruction: planGenerationInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: "A short, descriptive title for the overall plan. e.g., 'Treasure Hunt System'." },
                            introduction: { type: Type.STRING, description: "A friendly introductory sentence to present the plan." },
                            features: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of high-level features for the user." },
                            tasks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of specific, actionable sub-tasks." }
                        },
                        required: ["title", "introduction", "features", "tasks"]
                    }
                }
            });
            const jsonString = response.text.trim();
            return JSON.parse(jsonString) as PlanResponse;
        } catch (error) {
            lastError = error as Error;
            console.error(`Attempt ${attempt} failed for plan generation:`, error);
            if (attempt < maxRetries) {
                const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s
                console.log(`Retrying plan generation in ${delayMs / 1000} seconds...`);
                await delay(delayMs);
            }
        }
    }
    
    console.error(`All ${maxRetries} retries failed for plan generation. Last error:`, lastError);
    const errorMessage = lastError instanceof Error ? lastError.message : "An unknown error occurred.";
    throw new Error(`I was unable to create a plan. The AI service seems to be unavailable after multiple attempts. Please try again later. (Details: ${errorMessage})`);
};


export const generateCodeForTask = async (task: string, platform: ProjectPlatform, apiKey: string, model: string): Promise<GeminiResponse> => {
     if (!apiKey) {
        throw new Error("Gemini API key is not set.");
    }
    
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    const codeGenerationInstruction = platform === 'Web App' ? webCodeGenerationInstruction : robloxCodeGenerationInstruction;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: model,
                contents: `Task: "${task}"`,
                config: {
                    systemInstruction: codeGenerationInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            code: {
                                type: Type.STRING,
                                description: `The generated code (${platform === 'Web App' ? 'self-contained HTML' : 'Luau'}) to complete the task.`,
                            },
                            explanation: {
                                 type: Type.STRING,
                                 description: "A friendly explanation of the code.",
                            }
                        },
                        required: ["explanation", "code"]
                    },
                    temperature: 0.5,
                },
            });

            const jsonString = response.text.trim();
            const parsed = JSON.parse(jsonString) as GeminiResponse;
            return parsed; // Success
        } catch (error) {
            lastError = error as Error;
            console.error(`Attempt ${attempt} failed for task "${task}":`, error);
            if (attempt < maxRetries) {
                const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s
                console.log(`Retrying task "${task}" in ${delayMs / 1000} seconds...`);
                await delay(delayMs);
            }
        }
    }

    // All retries failed
    console.error(`All ${maxRetries} retries failed for task "${task}". Last error:`, lastError);
    const errorMessage = lastError instanceof Error ? lastError.message : "An unknown error occurred.";
    return {
        explanation: `Sorry, I was unable to complete the task: "${task}". The AI service seems to be unavailable after multiple attempts. Please try again later. (Details: ${errorMessage})`,
        code: null
    };
};

export const generateThinkerResponse = async (prompt: string, apiKey: string, model: string): Promise<{ standing: ThinkerResponse, opposing: ThinkerResponse, final: string }> => {
    const ai = new GoogleGenAI({ apiKey });

    // 1. Standing Response
    const standingResponseObj = await ai.models.generateContent({
        model: model,
        contents: `User request: "${prompt}"`,
        config: {
            systemInstruction: standingInstruction,
            responseMimeType: "application/json",
            responseSchema: thinkerSchema,
        }
    });
    const standing = JSON.parse(standingResponseObj.text.trim()) as ThinkerResponse;

    // 2. Opposing Response
    const opposingResponseObj = await ai.models.generateContent({
        model: model,
        contents: `The user's request is: "${prompt}". The initial plan is: "${standing.response}". Now, provide your critique.`,
        config: {
            systemInstruction: opposingInstruction,
            responseMimeType: "application/json",
            responseSchema: thinkerSchema,
        }
    });
    const opposing = JSON.parse(opposingResponseObj.text.trim()) as ThinkerResponse;

    // 3. Synthesis Response
    const synthesisResponseObj = await ai.models.generateContent({
        model: model,
        contents: `User request: "${prompt}"\n\nInitial Plan:\n${standing.response}\n\nCritique/Alternatives:\n${opposing.response}\n\nNow, generate the final synthesized response for the user.`,
        config: {
            systemInstruction: synthesisInstruction,
        }
    });
    const final = synthesisResponseObj.text;

    return { standing, opposing, final };
}