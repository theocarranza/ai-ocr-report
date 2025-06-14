
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-file-content.ts';
import '@/ai/flows/keyword-enrichment.ts';
import '@/ai/flows/extract-text-flow.ts';
import '@/ai/flows/extract-keyword-values-flow.ts';
