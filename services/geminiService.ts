import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ProjectType, Message, ImageModel } from "../types";

// Helper for retries
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const handleGeminiError = (error: any, context: string): never => {
    console.error(`${context}:`, error); // Log the full error object for debugging.

    // Gemini API often wraps errors in an `error` property. Let's extract the real message.
    const geminiError = error?.error;
    const errorMessage = geminiError?.message || (error instanceof Error ? error.message : JSON.stringify(error));


    // Check for the specific XHR/RPC error which often indicates a network/ad-block issue.
    if (errorMessage.includes('Rpc failed') || errorMessage.includes('fetch')) {
        throw new Error(`AI service connection failed. Please check your internet connection and disable any browser extensions (like ad-blockers), then try again.`);
    }

    // Handle other common AI errors.
    if (errorMessage.includes('API key not valid')) {
        throw new Error("Your API key is not valid. Please check it in your settings.");
    }
    if (errorMessage.includes('quota')) {
        throw new Error("You've exceeded your API quota. Please try again later.");
    }
    
    // Throw a new error with a cleaner message for other cases.
    throw new Error(`An error occurred in ${context.toLowerCase()}. Details: ${errorMessage}`);
};

export const validateApiKey = async (apiKey: string): Promise<{ success: boolean, message?: string }> => {
    if (!apiKey) {
        return { success: false, message: "API key cannot be empty." };
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
        return { success: true };
    } catch (error) {
        console.error("API Key validation failed:", error);
        let message = "An unknown error occurred during validation.";
        if (error instanceof Error) {
            if (error.message.includes('API key not valid')) {
                message = "The provided API key is not valid. Please ensure it is correct and has not expired.";
            } else if (error.message.includes('Rpc failed') || error.message.includes('fetch')) {
                message = "Could not connect to the AI service. Please check your internet connection and disable any ad-blockers.";
            } else if (error.message.includes('quota')) {
                message = "You have exceeded your API quota. Please check your usage and billing status with the provider.";
            } else if (error.message.includes('permission')) {
                message = "The API key does not have permission for this operation. Please check its permissions.";
            } else {
                message = `Validation failed: ${error.message}`;
            }
        }
        return { success: false, message };
    }
};

export const generateProjectDetails = async (prompt: string, apiKey: string): Promise<{ name: string, description: string, project_type: ProjectType }> => {
    const ai = new GoogleGenAI({ apiKey });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following user prompt and generate a suitable project name, a one-sentence description, and classify the project type. Prompt: "${prompt}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "A concise, creative name for the project." },
                        description: { type: Type.STRING, description: "A one-sentence summary of the project." },
                        project_type: {
                            type: Type.STRING,
                            description: "The project type.",
                            enum: ['roblox_game', 'video', 'story', 'design', 'website', 'presentation', 'document']
                        }
                    },
                    required: ["name", "description", "project_type"]
                }
            }
        });
        return JSON.parse(response.text.trim());
    } catch (error) {
        handleGeminiError(error, "Error generating project details");
    }
};

// FIX: Add missing classifyUserIntent function to classify user prompts.
export const classifyUserIntent = async (prompt: string, apiKey: string): Promise<{ intent: 'creative_request' | 'general_query' }> => {
    const ai = new GoogleGenAI({ apiKey });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following user prompt and classify the intent. The intent can be "creative_request" if the user wants to start a new project (e.g., build a game, create an app) or "general_query" for anything else (e.g., asking a question, simple chat). Prompt: "${prompt}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        intent: {
                            type: Type.STRING,
                            description: "The classified intent.",
                            enum: ['creative_request', 'general_query']
                        }
                    },
                    required: ["intent"]
                }
            }
        });
        return JSON.parse(response.text.trim());
    } catch (error) {
        handleGeminiError(error, "Error classifying user intent");
    }
};

export const generateImage = async (prompt: string, apiKey: string, model: ImageModel = 'nano_banana'): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
    try {
        if (model === 'nano_banana') {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: prompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return part.inlineData.data;
                }
            }
            throw new Error("Nano Banana model did not return an image.");
        } else {
            // For Imagen 2/3, we use the generateImages endpoint, mapping both to the latest high-quality model.
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/png',
                    aspectRatio: '1:1',
                },
            });
            if (response.generatedImages && response.generatedImages.length > 0) {
                return response.generatedImages[0].image.imageBytes;
            }
            throw new Error("No image was generated by the API. The response was empty.");
        }
    } catch (error) {
        handleGeminiError(error, "Error generating image");
    }
};

export const generateChatTitle = async (
  firstUserMessage: string,
  firstAiResponse: string,
  apiKey: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey });
    let titlePrompt: string;

    // If user message is very short, use the AI's response to generate a more descriptive title.
    if (firstUserMessage.trim().length < 4) {
      titlePrompt = `The user started a conversation with a very short message: "${firstUserMessage}".
The AI responded: "${firstAiResponse.slice(0, 150)}..."
Based on the AI's response, generate a short, descriptive title for this chat (max 4 words).`;
    } else {
      titlePrompt = `Generate a short, descriptive title (max 4 words) for this conversation:
          
User: "${firstUserMessage}"
AI: "${firstAiResponse}"

The title should summarize what they're discussing. Be specific and concise.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: titlePrompt
    });

    // Remove quotes if AI adds them and trim whitespace
    return response.text.trim().replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error("Error generating chat title:", error);
    // Fallback: Use first 30 chars of user message
    return firstUserMessage.slice(0, 30) + (firstUserMessage.length > 30 ? '...' : '');
  }
};