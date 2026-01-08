'use server';

/**
 * @fileOverview An image enhancement AI agent.
 *
 * - enhanceImage - A function that handles the image enhancement process.
 * - EnhanceImageInput - The input type for the enhanceImage function.
 * - EnhanceImageOutput - The return type for the enhanceImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const EnhanceImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  prompt: z.string().describe('The prompt describing the enhancement.'),
});
export type EnhanceImageInput = z.infer<typeof EnhanceImageInputSchema>;

const EnhanceImageOutputSchema = z.object({
  enhancedPhotoDataUri: z.string().describe('The enhanced image as a data URI.'),
});
export type EnhanceImageOutput = z.infer<typeof EnhanceImageOutputSchema>;

export async function enhanceImage(input: EnhanceImageInput): Promise<EnhanceImageOutput> {
  return enhanceImageFlow(input);
}

const enhanceImageFlow = ai.defineFlow(
  {
    name: 'enhanceImageFlow',
    inputSchema: EnhanceImageInputSchema,
    outputSchema: EnhanceImageOutputSchema,
  },
  async ({photoDataUri, prompt}) => {
    const {media} = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image-preview',
        prompt: [
          {media: {url: photoDataUri}},
          {text: prompt},
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      if (!media?.url) {
        throw new Error('Image enhancement failed to produce an image.');
      }
      
    return {
      enhancedPhotoDataUri: media.url,
    };
  }
);
