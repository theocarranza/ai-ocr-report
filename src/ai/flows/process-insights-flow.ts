
'use server';
/**
 * @fileOverview A unified flow to process documents: OCR, summarization, and keyword extraction.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FileInputSchema = z.object({
  dataUri: z.string().describe("File data as a data URI."),
  mimeType: z.string(),
  name: z.string(),
});

const ProcessInsightsInputSchema = z.object({
  files: z.array(FileInputSchema).optional(),
  manualText: z.string().optional(),
  keywords: z.array(z.string()),
});

const KeywordValueEntrySchema = z.object({
  keyword: z.string(),
  foundValues: z.array(z.string()),
});

const ProcessInsightsOutputSchema = z.object({
  combinedText: z.string(),
  summary: z.string(),
  suggestedKeywords: z.array(z.string()),
  foundKeywords: z.array(z.string()),
  keywordValues: z.array(KeywordValueEntrySchema),
});

export type ProcessInsightsInput = z.infer<typeof ProcessInsightsInputSchema>;
export type ProcessInsightsOutput = z.infer<typeof ProcessInsightsOutputSchema>;

// Using the confirmed available Gemini 2.0 Flash model
const MODEL_ID = 'googleai/gemini-2.0-flash';

export async function processInsights(input: ProcessInsightsInput): Promise<ProcessInsightsOutput> {
  return processInsightsFlow(input);
}

const processInsightsFlow = ai.defineFlow(
  {
    name: 'processInsightsFlow',
    inputSchema: ProcessInsightsInputSchema,
    outputSchema: ProcessInsightsOutputSchema,
  },
  async (input) => {
    let combinedText = input.manualText || "";

    // 1. OCR Step (if files present)
    if (input.files && input.files.length > 0) {
      const ocrParts = input.files.map(f => ({ media: { url: f.dataUri } }));
      const { text } = await ai.generate({
        model: MODEL_ID,
        prompt: [
          ...ocrParts,
          { text: "Extract all text from these documents. Preserve structure where possible." }
        ],
      });
      combinedText = text + (combinedText ? "\n\n" + combinedText : "");
    }

    if (!combinedText.trim()) {
      throw new Error("No text content could be extracted or found.");
    }

    // 2. Summary & Keywords
    const { output } = await ai.generate({
      model: MODEL_ID,
      prompt: `Analyze the following text:
      
      TEXT:
      ${combinedText}
      
      KEYWORDS TO SEARCH:
      ${input.keywords.join(', ')}`,
      output: {
        schema: z.object({
          summary: z.string().describe("A concise summary of the text."),
          suggestedKeywords: z.array(z.string()).describe("3-5 additional relevant keywords."),
          foundKeywords: z.array(z.string()).describe("Which of the 'KEYWORDS TO SEARCH' were actually present."),
          keywordValues: z.array(z.object({
            keyword: z.string(),
            values: z.array(z.string()).describe("Specific values or phrases associated with this keyword found in the text.")
          }))
        })
      }
    });

    const result = output!;

    return {
      combinedText,
      summary: result.summary,
      suggestedKeywords: result.suggestedKeywords,
      foundKeywords: result.foundKeywords,
      keywordValues: result.keywordValues.map(kv => ({
        keyword: kv.keyword,
        foundValues: kv.values
      })),
    };
  }
);
