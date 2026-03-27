
'use server';
/**
 * @fileOverview A diagnostic flow to list available models from the Google AI SDK.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function listAvailableModels() {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("No API Key found in environment variables (GOOGLE_GENAI_API_KEY or GEMINI_API_KEY).");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    // The underlying SDK allows listing models
    // We fetch from the base URL to see what's available
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to fetch models list");
    }

    return {
      models: data.models || [],
      raw: data
    };
  } catch (error) {
    console.error("Error listing models:", error);
    throw error;
  }
}
