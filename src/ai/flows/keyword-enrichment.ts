'use server';

/**
 * @fileOverview Enhances keyword search by suggesting relevant keywords based on document content.
 *
 * - enrichKeywords - A function that suggests keywords based on document content.
 * - EnrichKeywordsInput - The input type for the enrichKeywords function.
 * - EnrichKeywordsOutput - The return type for the enrichKeywords function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EnrichKeywordsInputSchema = z.object({
  documentContent: z
    .string()
    .describe('The text content extracted from the document.'),
  existingKeywords: z.array(z.string()).optional().describe('Existing keywords used for search.'),
});
export type EnrichKeywordsInput = z.infer<typeof EnrichKeywordsInputSchema>;

const EnrichKeywordsOutputSchema = z.object({
  suggestedKeywords: z
    .array(z.string())
    .describe('Keywords suggested to refine the search based on the document content.'),
});
export type EnrichKeywordsOutput = z.infer<typeof EnrichKeywordsOutputSchema>;

export async function enrichKeywords(input: EnrichKeywordsInput): Promise<EnrichKeywordsOutput> {
  return enrichKeywordsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'enrichKeywordsPrompt',
  input: {schema: EnrichKeywordsInputSchema},
  output: {schema: EnrichKeywordsOutputSchema},
  prompt: `Based on the following document content, suggest additional keywords that could be used to refine the search and ensure important information is not missed.

Document Content: {{{documentContent}}}

Existing Keywords (if any): {{#if existingKeywords}}{{#each existingKeywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None{{/if}}

Suggest additional keywords related to the content that might improve search accuracy and completeness.`,
});

const enrichKeywordsFlow = ai.defineFlow(
  {
    name: 'enrichKeywordsFlow',
    inputSchema: EnrichKeywordsInputSchema,
    outputSchema: EnrichKeywordsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
