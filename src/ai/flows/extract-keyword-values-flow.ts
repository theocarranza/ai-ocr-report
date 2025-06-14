
'use server';
/**
 * @fileOverview Extracts specific values from text based on a list of keywords.
 *
 * - extractKeywordValues - A function that extracts values corresponding to keywords.
 * - ExtractKeywordValuesInput - The input type for the extractKeywordValues function.
 * - ExtractKeywordValuesOutput - The return type for the extractKeywordValues function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractKeywordValuesInputSchema = z.object({
  documentText: z.string().describe('The full text content of the document.'),
  keywords: z.array(z.string()).describe('A list of keywords to find values for in the document text.'),
});
export type ExtractKeywordValuesInput = z.infer<typeof ExtractKeywordValuesInputSchema>;

const ExtractKeywordValuesOutputSchema = z.object({
  keyValuePairs: z
    .array(z.record(z.string(), z.string()))
    .describe(
      'An array of objects, where each object represents a single keyword-value pair. The key is one of the input keywords, and the value is the information extracted from the text corresponding to that keyword.'
    ),
});
export type ExtractKeywordValuesOutput = z.infer<typeof ExtractKeywordValuesOutputSchema>;

export async function extractKeywordValues(input: ExtractKeywordValuesInput): Promise<ExtractKeywordValuesOutput> {
  return extractKeywordValuesFlow(input);
}

const extractKeywordValuesPrompt = ai.definePrompt({
  name: 'extractKeywordValuesPrompt',
  input: {schema: ExtractKeywordValuesInputSchema},
  output: {schema: ExtractKeywordValuesOutputSchema},
  prompt: `Given the document text and a list of keywords, extract the specific information (value) from the text that corresponds to each keyword.
For each keyword, if relevant information is found, create an object with the keyword as the key and the extracted information as its value.
Return an array of these objects. Each object in the array must contain only a single key-value pair.
If a keyword appears multiple times with different associated values, create separate objects for each instance.
If no information is found for a keyword, do not include an entry for it in the array.

Keywords: {{#each keywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Document Text:
{{{documentText}}}

Respond with ONLY the JSON array of key-value pairs as described.
`,
});

const extractKeywordValuesFlow = ai.defineFlow(
  {
    name: 'extractKeywordValuesFlow',
    inputSchema: ExtractKeywordValuesInputSchema,
    outputSchema: ExtractKeywordValuesOutputSchema,
  },
  async input => {
    if (input.keywords.length === 0) {
      return { keyValuePairs: [] };
    }
    const {output} = await extractKeywordValuesPrompt(input);
    return output || { keyValuePairs: [] };
  }
);
