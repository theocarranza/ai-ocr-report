
'use server';
/**
 * @fileOverview Extracts specific values from text based on a list of keywords.
 * For each input keyword, it finds all corresponding values in the text.
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

const KeywordValuesEntrySchema = z.object({
  keyword: z.string().describe("One of the keywords provided in the input."),
  foundValues: z.array(z.string()).describe("An array of all extracted information (values) from the text corresponding to this keyword. This array will be empty if no values are found.")
});

const ExtractKeywordValuesOutputSchema = z.object({
  extractedKeywordEntries: z
    .array(KeywordValuesEntrySchema)
    .describe(
      'An array of objects. Each object represents one of the input keywords and contains all values found for it. If no values are found for an input keyword, its "foundValues" array will be empty.'
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
  prompt: `You are an AI assistant tasked with extracting specific information from a document based on a provided list of keywords.
For EACH keyword in the input 'keywords' list:
1. Identify ALL distinct pieces of information (values) in the 'documentText' that directly correspond to that keyword.
2. Construct an object with two properties:
    a. "keyword": This MUST be the exact keyword string from the input list.
    b. "foundValues": This MUST be an array of strings. Each string in this array should be a distinct value extracted from the 'documentText' for the corresponding "keyword".
3. If NO values are found in the 'documentText' for a specific input keyword, the "foundValues" array for that keyword's object MUST be empty ([]).
4. The final output MUST be an array of these objects. Ensure there is exactly one object in the output array for EACH keyword provided in the input 'keywords' list.

Input Keywords: {{#each keywords}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}

Document Text:
{{{documentText}}}

Respond ONLY with the JSON array of objects as described in the output schema.
Example based on Output Schema:
If Input Keywords are: "name", "order date", "status"
And Document Text is: "Customer name is John Doe. The order date is 2023-01-15. Another name is Jane Doe. Order was placed on 2023-01-15."
The expected JSON output is:
{
  "extractedKeywordEntries": [
    { "keyword": "name", "foundValues": ["John Doe", "Jane Doe"] },
    { "keyword": "order date", "foundValues": ["2023-01-15"] },
    { "keyword": "status", "foundValues": [] }
  ]
}
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
      return { extractedKeywordEntries: [] };
    }
    const {output} = await extractKeywordValuesPrompt(input);
    // Ensure that if the AI returns null or undefined output, we still conform to the schema.
    // Also, ensure an entry for every input keyword, even if AI misses it (though prompt tries to enforce this).
    // For simplicity, we'll rely on the AI to return one entry per keyword.
    // A more robust post-processing step could be added here if needed.
    if (!output || !output.extractedKeywordEntries) {
        // Fallback: create entries for all keywords with empty foundValues if AI fails badly
        const fallbackEntries = input.keywords.map(kw => ({ keyword: kw, foundValues: [] }));
        return { extractedKeywordEntries: fallbackEntries };
    }
    
    // Ensure all input keywords are present in the output, adding them with empty foundValues if missed by AI.
    const returnedKeywords = new Set(output.extractedKeywordEntries.map(entry => entry.keyword));
    const missingKeywords = input.keywords.filter(kw => !returnedKeywords.has(kw));
    for (const kw of missingKeywords) {
        output.extractedKeywordEntries.push({ keyword: kw, foundValues: [] });
    }
    
    return output;
  }
);

