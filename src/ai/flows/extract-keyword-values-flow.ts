
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

const KeywordValuePairSchema = z.object({
  keyword: z.string().describe("One of the keywords provided in the input."),
  value: z.string().describe("The extracted information from the text corresponding to the keyword.")
});

const ExtractKeywordValuesOutputSchema = z.object({
  extractedValues: z
    .array(KeywordValuePairSchema)
    .describe(
      'An array of objects, where each object contains a "keyword" and its corresponding "value" extracted from the document text.'
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
For each keyword from the input list, if relevant information is found in the document text, create an object with two properties:
1. "keyword": This should be the keyword itself (from the input list).
2. "value": This should be the specific information (value) extracted from the text that corresponds to this keyword.
Return an array of these objects.
If a keyword appears multiple times with different associated values, create separate objects for each instance.
If no information is found for a keyword, do not include an entry for it in the array.

Keywords: {{#each keywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Document Text:
{{{documentText}}}

Respond with ONLY the JSON array of objects, where each object has a "keyword" field and a "value" field, as described.
Example for keywords "name", "date":
[
  { "keyword": "name", "value": "Extracted Name" },
  { "keyword": "date", "value": "Extracted Date" }
]
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
      return { extractedValues: [] };
    }
    const {output} = await extractKeywordValuesPrompt(input);
    return output || { extractedValues: [] };
  }
);
