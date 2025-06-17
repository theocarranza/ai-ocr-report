
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { z } from 'zod';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize Genkit (ai object with plugins)
// This import will run the genkit initialization code from your Next.js app's /src/ai/genkit.ts
import { ai } from '../../src/ai/genkit'; 

// Import your Genkit flows and their Zod schemas
import { 
  summarizeFileContent, 
  SummarizeFileContentInputSchema,
  type SummarizeFileContentOutput
} from '../../src/ai/flows/summarize-file-content';
import { 
  enrichKeywords, 
  EnrichKeywordsInputSchema,
  type EnrichKeywordsOutput
} from '../../src/ai/flows/keyword-enrichment';
import { 
  extractTextFromDocument, 
  ExtractTextFromDocumentInputSchema,
  type ExtractTextFromDocumentOutput
} from '../../src/ai/flows/extract-text-flow';
import { 
  extractKeywordValues, 
  ExtractKeywordValuesInputSchema,
  type ExtractKeywordValuesOutput
} from '../../src/ai/flows/extract-keyword-values-flow';

const corsHandler = cors({origin: true});

// Helper function to create an HTTP onRequest function for a Genkit flow
function createHttpHandler<TInput, TOutput>(
  inputSchema: z.ZodType<TInput>,
  flowFunction: (input: TInput) => Promise<TOutput>
) {
  return functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }
      try {
        // Ensure AI is initialized if it wasn't by import
        if (!ai) {
            console.error("Genkit ai object not initialized.");
            throw new Error("AI service not available.");
        }
        const validatedInput = inputSchema.parse(req.body);
        const result = await flowFunction(validatedInput);
        res.status(200).json(result);
      } catch (error) {
        console.error("Error in Firebase Function:", error);
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: "Invalid input", details: error.errors });
        } else if (error instanceof Error) {
          res.status(500).json({ error: "Internal Server Error", message: error.message });
        } else {
          res.status(500).json({ error: "Internal Server Error", message: "An unknown error occurred" });
        }
      }
    });
  });
}

// --- Export Cloud Functions ---

// Summarize File Content Function
export const apiSummarizeFileContent = createHttpHandler(
  SummarizeFileContentInputSchema,
  summarizeFileContent
);

// Enrich Keywords Function
export const apiEnrichKeywords = createHttpHandler(
  EnrichKeywordsInputSchema,
  enrichKeywords
);

// Extract Text From Document Function
export const apiExtractTextFromDocument = createHttpHandler(
  ExtractTextFromDocumentInputSchema,
  extractTextFromDocument
);

// Extract Keyword Values Function
export const apiExtractKeywordValues = createHttpHandler(
  ExtractKeywordValuesInputSchema,
  extractKeywordValues
);
