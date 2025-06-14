'use server';
/**
 * @fileOverview Summarizes the content of a file.
 *
 * - summarizeFileContent - A function that summarizes the content of a file.
 * - SummarizeFileContentInput - The input type for the summarizeFileContent function.
 * - SummarizeFileContentOutput - The return type for the summarizeFileContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeFileContentInputSchema = z.object({
  fileText: z.string().describe('The text content of the file to summarize.'),
});
export type SummarizeFileContentInput = z.infer<typeof SummarizeFileContentInputSchema>;

const SummarizeFileContentOutputSchema = z.object({
  summary: z.string().describe('A short summary of the file content.'),
});
export type SummarizeFileContentOutput = z.infer<typeof SummarizeFileContentOutputSchema>;

export async function summarizeFileContent(input: SummarizeFileContentInput): Promise<SummarizeFileContentOutput> {
  return summarizeFileContentFlow(input);
}

const summarizeFileContentPrompt = ai.definePrompt({
  name: 'summarizeFileContentPrompt',
  input: {schema: SummarizeFileContentInputSchema},
  output: {schema: SummarizeFileContentOutputSchema},
  prompt: `Summarize the following text in a concise paragraph:\n\n{{{fileText}}}`, // Changed {{{text}}} to {{{fileText}}}
});

const summarizeFileContentFlow = ai.defineFlow(
  {
    name: 'summarizeFileContentFlow',
    inputSchema: SummarizeFileContentInputSchema,
    outputSchema: SummarizeFileContentOutputSchema,
  },
  async input => {
    const {output} = await summarizeFileContentPrompt(input);
    return output!;
  }
);
