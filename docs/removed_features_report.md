# Removed Features Report

The following features (server-side Genkit flows) were found to be removed (files emptied) in recent history. They were replaced by client-side Gemini SDK logic in `src/app/page.tsx`.

## 1. Summarize File Content (`src/ai/flows/summarize-file-content.ts`)

**Functionality:** Generates a concise paragraph summary of provided text.
**Prompt:** `Summarize the following text in a concise paragraph:

{{{fileText}}}`

## 2. Keyword Enrichment (`src/ai/flows/keyword-enrichment.ts`)

**Functionality:** Suggests additional keywords based on document content and existing keywords.
**Prompt:** `Based on the following document content, suggest additional keywords that could be used to refine the search...`

## 3. Extract Keyword Values (`src/ai/flows/extract-keyword-values-flow.ts`)

**Functionality:** Extracts specific values from text for a given list of keywords, cleaning them of artifacts like `<< >>`.
**Prompt:** `You are an AI assistant tasked with extracting specific information from a document based on a provided list of keywords...`

## Restoration Status

- **Interfaces:** The TypeScript interfaces (`SummarizeFileContentOutput`, `EnrichKeywordsOutput`, `KeywordValuesEntry`) have been restored in these files to support the `ResultsDisplay` component.
- **Logic:** The active logic currently resides in `src/app/page.tsx` using the Google AI Client SDK (`gemini-2.5-flash`).
