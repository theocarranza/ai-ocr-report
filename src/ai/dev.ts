// 'use server';

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/google-genai';

ai.init({
  plugins: [
    googleAI({
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
