import { GoogleGenAI, Type } from "@google/genai";
import { AgentInput, AgentOutput, AgentExecutionResult } from '../types';
import { autonomousInstruction } from './instructions';
import { getUserFriendlyError } from '../errorUtils';
import { generateImage } from '../../services/geminiService';
import { saveMemory } from '../../services/databaseService';
import { ImageModel, MemoryLayer } from '../../types';


// This file has been updated to use the Gemini API's native structured output (JSON mode)
// to guarantee the response format and permanently fix parsing errors.

// The AI's response will be one of three types: a chat message, a chat message with code,
// or a chat message with an image prompt.
const autonomousAgentSchema = {
  type: Type.OBJECT,
  properties: {
    userResponse: {
      type: Type.STRING,
      description: "The conversational, user-facing response. This is shown directly to the user."
    },
    imagePrompt: {
        type: Type.STRING,
        description: "An enhanced, artistic prompt for an image model. ONLY include this field if the user explicitly asks to generate an image."
    },
    code: {
        type: Type.STRING,
        description: "A string containing the generated code snippet. ONLY include this field if the user's request is to write or generate code."
    },
    language: {
        type: Type.STRING,
        description: "The programming language of the code snippet (e.g., 'python', 'lua', 'javascript'). ONLY include this if the 'code' field is present."
    },
    memoryToCreate: {
        type: Type.ARRAY,
        description: "An array of memory objects to be saved. ONLY include this if the user provides new information to remember.",
        items: {
            type: Type.OBJECT,
            properties: {
                layer: {
                    type: Type.STRING,
                    enum: ['personal', 'project', 'codebase', 'aesthetic'],
                    description: "The memory layer to save the content to."
                },
                key: {
                    type: Type.STRING,
                    description: "The descriptive key for the memory (e.g., 'user_name', 'project_type')."
                },
                value: {
                    type: Type.STRING,
                    description: "The actual data or fact to save."
                }
            },
            required: ["layer", "key", "value"]
        }
    }
  },
  required: ["userResponse"]
};


export const runAutonomousAgent = async (input: AgentInput): Promise<AgentExecutionResult> => {
    const { prompt, apiKey, model, project, chat, history, supabase, user, profile, onStreamChunk, memoryContext } = input;

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const geminiHistory = history.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model' as 'user' | 'model',
            parts: [{ text: msg.text }],
        })).filter(msg => msg.parts[0].text.trim() !== '');

        const systemInstruction = `Current Timestamp: ${new Date().toISOString()}\n\n${autonomousInstruction}\n\n--- MEMORY CONTEXT ---\n${memoryContext || 'No memory context available.'}`;
        
        const contents = [...geminiHistory, { role: 'user' as const, parts: [{ text: prompt }] }];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
            config: { 
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: autonomousAgentSchema,
                temperature: 0.8,
                topP: 0.9,
            },
        });

        const rawResponseText = response.text;
        const parsedResponse = JSON.parse(rawResponseText);
        
        const userVisibleText = parsedResponse.userResponse;
        const imagePrompt = parsedResponse.imagePrompt;
        const code = parsedResponse.code;
        const language = parsedResponse.language;
        const memoryToCreate = parsedResponse.memoryToCreate;

        // --- Handle Background Memory Creation ---
        // This is a side-effect and should not block the main response.
        if (memoryToCreate && Array.isArray(memoryToCreate) && memoryToCreate.length > 0) {
            Promise.all(memoryToCreate.map((mem: { layer: MemoryLayer; key: string; value: string; }) => 
                saveMemory(supabase, user.id, mem.layer, mem.key, mem.value)
            )).catch(err => {
                // Log the error but don't throw, as this is a non-critical background task.
                console.warn("Autonomous agent failed to save memory:", err);
            });
        }
        
        // --- Handle Primary Response ---

        // Case 1: The AI generated code.
        if (code && typeof code === 'string' && code.trim()) {
            const messagePayload: AgentOutput[0] = {
                project_id: project.id,
                chat_id: chat.id,
                sender: 'ai',
                text: userVisibleText.trim(),
                code: code.trim(),
                language: language || 'plaintext',
            };

            if (input.profile?.role === 'admin') {
                messagePayload.raw_ai_response = rawResponseText;
            }
            
            return { messages: [messagePayload] };
        }

        // Case 2: The user wants an image, which costs credits.
        if (imagePrompt && typeof imagePrompt === 'string' && imagePrompt.trim()) {
            
            // Unconditionally fetch the latest profile to ensure model preference is up-to-date.
            // This is critical because the profile object from the context might be stale.
            const { data: latestProfile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (profileError || !latestProfile) {
                throw profileError || new Error("Could not re-fetch user profile before image generation.");
            }
            
            const isAdmin = latestProfile.membership === 'admin';
            const modelToUse: ImageModel = latestProfile.preferred_image_model || 'nano_banana';


            if (!isAdmin) {
                // For non-admins, perform credit check and deduction.
                const { data: settings, error: settingsError } = await supabase.from('app_settings').select('*').single();
                if (settingsError || !settings) throw settingsError || new Error("Could not load credit cost settings.");
                
                const cost = settings[`cost_image_${modelToUse}`] || 1;

                if (latestProfile.credits < cost) {
                    const insufficientCreditsMessage: AgentOutput[0] = {
                        project_id: project.id,
                        chat_id: chat.id,
                        sender: 'ai',
                        text: `Oops! You need ${cost} credits to generate an image with this model, but you only have ${latestProfile.credits}. You can buy more in the settings.`,
                    };
                    return { messages: [insufficientCreditsMessage] };
                }
                
                await supabase.rpc('deduct_credits', { p_user_id: user.id, p_amount: cost });
            }


            // Proceed with image generation
            onStreamChunk?.(JSON.stringify({ type: 'image_generation_start', text: userVisibleText }));
            const imageBase64 = await generateImage(imagePrompt, apiKey, modelToUse);

            const messagePayload: AgentOutput[0] = {
                project_id: project.id,
                chat_id: chat.id,
                sender: 'ai',
                text: userVisibleText,
                image_base64: imageBase64,
                imageStatus: 'complete',
            };
            
            if (input.profile?.role === 'admin') {
                messagePayload.raw_ai_response = rawResponseText;
            }

            return { messages: [messagePayload] };
        }
        
        // Case 3: The user is just chatting (no cost).
        if (userVisibleText && typeof userVisibleText === 'string' && userVisibleText.trim()) {
            const messagePayload: AgentOutput[0] = {
                project_id: project.id,
                chat_id: chat.id,
                sender: 'ai',
                text: userVisibleText.trim(),
            };

            if (input.profile?.role === 'admin') {
                messagePayload.raw_ai_response = rawResponseText;
            }
            
            return { messages: [messagePayload] };
        } 
        
        throw new Error("The AI returned an empty or invalid response.");

    } catch (error) {
        console.error("Error in runAutonomousAgent:", error);
        const errorMessage = getUserFriendlyError(error);
        const fallbackMessage: AgentOutput[0] = {
            project_id: project.id,
            chat_id: chat.id,
            sender: 'ai',
            text: `An error occurred while communicating with the AI: ${errorMessage}`,
        };
        return { messages: [fallbackMessage] };
    }
};