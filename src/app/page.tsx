
"use client";

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { FileInputArea } from '@/components/file-input-area';
import { KeywordEntry } from '@/components/keyword-entry';
import { ResultsDisplay } from '@/components/results-display';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, FileType } from 'lucide-react';

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from "@google/generative-ai";

import { initializeApp, type FirebaseOptions } from 'firebase/app';

// --- IMPORTANT ---
// REPLACE WITH YOUR ACTUAL FIREBASE CONFIG IF YOU PLAN TO USE OTHER FIREBASE SERVICES
const firebaseConfig: FirebaseOptions = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// --- CRITICAL SECURITY WARNING ---
// You MUST replace this with your actual Gemini API Key.
// For production, DO NOT hardcode API keys in client-side code.
// This example is for local development or very restricted environments.
// Ensure your API key is secured and has appropriate restrictions.
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE"; 

let app;
// Initialize Firebase (optional, only if other Firebase services are needed)
// if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
//   try {
//     app = initializeApp(firebaseConfig);
//   } catch (e) {
//     console.warn("Firebase already initialized or config is missing/invalid.", e);
//   }
// }


let genAIInstance: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY && GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY_HERE") {
  try {
    genAIInstance = new GoogleGenerativeAI(GEMINI_API_KEY);
  } catch (error) {
    console.error("Error initializing GoogleGenerativeAI:", error);
  }
} else {
  console.warn("Gemini API Key is not configured. AI features will be unavailable.");
}

interface SummarizeOutput { summary: string; }
interface EnrichKeywordsOutput { suggestedKeywords: string[]; }
interface KeywordValuesEntry { keyword: string; foundValues: string[]; }
interface ExtractKeywordValuesOutput { extractedKeywordEntries: KeywordValuesEntry[]; }


export default function Home() {
  const { t } = useTranslation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [manualText, setManualText] = useState<string>("");
  const [keywords, setKeywords] = useState<string>("");
  const [keywordHistory, setKeywordHistory] = useState<string[]>([]);
  const [processing, setProcessing] = useState<boolean>(false);
  
  const [summaryResult, setSummaryResult] = useState<SummarizeOutput | null>(null);
  const [enrichedKeywordsResult, setEnrichedKeywordsResult] = useState<EnrichKeywordsOutput | null>(null);
  const [keywordValueMapResult, setKeywordValueMapResult] = useState<ExtractKeywordValuesOutput | null>(null); 
  const [foundKeywordsInText, setFoundKeywordsInText] = useState<string[]>([]);
  const [finalProcessedTextForOutput, setFinalProcessedTextForOutput] = useState<string>("");
  const [inputSource, setInputSource] = useState<string>(""); 
  const [processedFileNames, setProcessedFileNames] = useState<string[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    const storedHistory = localStorage.getItem('keywordHistory');
    if (storedHistory) {
      setKeywordHistory(JSON.parse(storedHistory));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('keywordHistory', JSON.stringify(keywordHistory));
  }, [keywordHistory]);
  
  const clearAllInputs = () => {
    setSelectedFiles([]);
    setManualText("");
    setKeywords("");
    setSummaryResult(null);
    setEnrichedKeywordsResult(null);
    setKeywordValueMapResult(null);
    setFoundKeywordsInText([]);
    setFinalProcessedTextForOutput("");
    setInputSource("");
    setProcessedFileNames([]);
    toast({ 
      title: t('toastInputsClearedTitle'),
      description: t('toastInputsClearedDescription')
    });
  };

  const fileToGenerativePart = async (file: File): Promise<Part | null> => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: `File type not directly supported for direct Gemini OCR`,
        description: `${file.name} (${file.type}) will be skipped for direct OCR. Consider client-side text extraction for non-image files.`,
        variant: "default"
      });
      return null;
    }
    const base64EncodedData = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: {
        data: base64EncodedData,
        mimeType: file.type,
      },
    };
  };


  const updateKeywordHistory = (newKeywords: string[]) => {
    setKeywordHistory(prevHistory => {
      const updatedHistory = [...prevHistory];
      newKeywords.forEach(kw => {
        const trimmedKw = kw.trim();
        if (trimmedKw && !updatedHistory.includes(trimmedKw)) {
          updatedHistory.unshift(trimmedKw); 
        }
      });
      return updatedHistory.slice(0, 20); 
    });
  };

  const handleRemoveKeywordFromHistory = (keywordToRemove: string) => {
    setKeywordHistory(prevHistory => prevHistory.filter(kw => kw !== keywordToRemove));
  };

  const handleAddKeywordFromSuggestion = (suggestedKeyword: string) => {
    setKeywords(prevKeywords => {
      const currentKwsArray = prevKeywords.split(',').map(k => k.trim()).filter(Boolean);
      if (!currentKwsArray.includes(suggestedKeyword.trim())) {
        return prevKeywords ? `${prevKeywords}, ${suggestedKeyword}` : suggestedKeyword;
      }
      return prevKeywords;
    });
  };

  const handleProcess = async () => {
    setProcessing(true);
    setSummaryResult(null);
    setEnrichedKeywordsResult(null);
    setKeywordValueMapResult(null);
    setFoundKeywordsInText([]);
    setFinalProcessedTextForOutput("");
    setInputSource("");
    setProcessedFileNames([]);

    if (!genAIInstance || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
      toast({
        title: "Gemini API Not Configured",
        description: "Please provide your Gemini API Key in src/app/page.tsx.",
        variant: "destructive",
      });
      setProcessing(false);
      return;
    }

    let currentInputSource = "";
    let combinedTextContent = ""; 
    const currentFileNamesProcessed: string[] = [];

    const model = genAIInstance.getGenerativeModel({ 
      model: "gemini-2.0-flash", // Changed model
      safetySettings: [ 
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ],
    });

    if (selectedFiles.length > 0) {
      currentInputSource = "file_upload";
      toast({
        title: t('toastProcessingFilesTitle', {count: selectedFiles.length}),
        description: "Sending files to Gemini for text extraction..."
      });
      
      const imageParts: Part[] = [];
      const textExtractionPrompts: string[] = ["Extract all text from the following document(s). If there are multiple documents or images, provide the extracted text for each, clearly indicating which text belongs to which file if possible based on the input order."];
      
      for (const file of selectedFiles) {
        currentFileNamesProcessed.push(file.name);
        const part = await fileToGenerativePart(file);
        if (part) {
          imageParts.push(part);
        } else {
          combinedTextContent += (combinedTextContent ? "\n\n" : "") + `--- START OF FILE: ${file.name} ---\n[Text extraction for ${file.type} not directly performed by Gemini in this request.]\n--- END OF FILE: ${file.name} ---`;
        }
      }

      if (imageParts.length > 0) {
        try {
          const result = await model.generateContent([...textExtractionPrompts, ...imageParts]);
          const response = await result.response;
          combinedTextContent += (combinedTextContent ? "\n\n" : "") + response.text();
        } catch (error) {
          console.error("Gemini text extraction error:", error);
          toast({
            title: t('toastOcrErrorTitle'),
            description: error instanceof Error ? error.message : "Failed to extract text using Gemini.",
            variant: "destructive",
          });
        }
      }
    }

    if (manualText.trim()) {
      const trimmedManualText = manualText.trim();
      combinedTextContent += (combinedTextContent ? "\n\n" : "") + trimmedManualText;
      currentInputSource = currentInputSource === "file_upload" ? "file_and_manual_paste" : "manual_paste";
    }
    
    setFinalProcessedTextForOutput(combinedTextContent);
    setInputSource(currentInputSource || "unknown");
    setProcessedFileNames(currentFileNamesProcessed);

    if (!combinedTextContent.trim()) {
      toast({
        title: t('toastNoInputProvidedTitle'),
        description: t('toastNoInputProvidedDescription'),
        variant: "destructive",
      });
      setProcessing(false);
      return;
    }
    
    const userKeywordsArray = keywords.split(',').map(kw => kw.trim()).filter(kw => kw);
    if (userKeywordsArray.length === 0) {
      toast({
        title: t('toastNoKeywordsTitle'),
        description: t('toastNoKeywordsDescription'),
        variant: "destructive",
      });
      setProcessing(false);
      return;
    }
    updateKeywordHistory(userKeywordsArray);

    try {
      // 1. Summarization
      const summaryPrompt = `Summarize the following text concisely, focusing on the main points and any actionable information. The text might be from one or more documents or manually pasted content. Text: "${combinedTextContent}"`;
      const summaryResultObj = await model.generateContent(summaryPrompt);
      const summaryResponse = await summaryResultObj.response;
      setSummaryResult({ summary: summaryResponse.text() || t('summaryNotAvailable') });

      // 2. Keyword Enrichment
      const enrichmentPrompt = `Based on the following text and the provided keywords, suggest 3-5 additional relevant keywords that would be useful for further analysis or search.
Text: "${combinedTextContent}"
Original Keywords: ${userKeywordsArray.join(", ")}
Suggested Keywords (provide a comma-separated list, only the list itself):`;
      const enrichmentResultObj = await model.generateContent(enrichmentPrompt);
      const enrichmentResponse = await enrichmentResultObj.response;
      const suggestedKeywords = enrichmentResponse.text() ? enrichmentResponse.text().split(',').map(kw => kw.trim()).filter(Boolean) : [];
      setEnrichedKeywordsResult({ suggestedKeywords });
      
      // 3. Keyword Value Extraction
      const foundKws: string[] = [];
      const lowerCleanTextForSearch = combinedTextContent.toLowerCase();
      userKeywordsArray.forEach(kw => {
        if (lowerCleanTextForSearch.includes(kw.toLowerCase())) {
          foundKws.push(kw);
        }
      });
      setFoundKeywordsInText(foundKws);
      
      const extractedEntries: KeywordValuesEntry[] = [];
      if (foundKws.length > 0) {
        const valueExtractionPrompt = `For each of the following keywords, extract any associated values or relevant phrases found in the text. 
        Keywords: ${foundKws.join(", ")}. 
        Text: "${combinedTextContent}".
        Respond in a JSON format like: {"keyword1": ["value1", "value2"], "keyword2": ["valueA"]}. If a keyword is present but no specific values are found, return an empty array for it.`;
        
        try {
          const valueResultObj = await model.generateContent(valueExtractionPrompt);
          const valueResponse = await valueResultObj.response;
          let textResponse = valueResponse.text();

          let parsedValues: Record<string, string[]> = {};
          try {
            const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
              textResponse = jsonMatch[1];
            }
            parsedValues = JSON.parse(textResponse);
          } catch (jsonError) {
            console.warn("Failed to parse keyword values JSON from Gemini, attempting fallback:", jsonError, "Raw response:", textResponse);
            for (const kw of foundKws) {
              const directQuestionPrompt = `What are the values or phrases associated with the keyword "${kw}" in the following text? List them. If none, say "None found". Text: "${combinedTextContent}"`;
              const kwResult = await model.generateContent(directQuestionPrompt);
              const kwResponse = await kwResult.response;
              const kwText = kwResponse.text();
              if (kwText && !kwText.toLowerCase().includes("none found")) {
                parsedValues[kw] = kwText.split(/[\n,]+/).map(v => v.trim()).filter(Boolean);
              } else {
                parsedValues[kw] = [];
              }
            }
          }
          
          userKeywordsArray.forEach(kw => {
            extractedEntries.push({
              keyword: kw,
              foundValues: parsedValues[kw] || []
            });
          });

        } catch (valError) {
          console.error(`Error extracting values for keywords:`, valError);
           userKeywordsArray.forEach(kw => {
            extractedEntries.push({
              keyword: kw,
              foundValues: foundKws.includes(kw) ? [t('noValuesFoundForKeyword')] : []
            });
          });
        }
      } else {
         userKeywordsArray.forEach(kw => {
          extractedEntries.push({ keyword: kw, foundValues: [] });
        });
      }
      setKeywordValueMapResult({ extractedKeywordEntries: extractedEntries });

      toast({
        title: t('toastProcessingCompleteTitle'),
        description: "AI processing complete using Google AI SDK.",
      });

    } catch (error) {
      console.error("Google AI SDK error during analysis:", error);
      toast({
        title: t('toastInsightGenerationErrorTitle'),
        description: error instanceof Error ? error.message : "An error occurred calling the Gemini API for analysis.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };
  
  const userKeywordsArray = keywords.split(',').map(kw => kw.trim()).filter(kw => kw);
  const showResults = summaryResult || enrichedKeywordsResult || keywordValueMapResult || foundKeywordsInText.length > 0 || (processing === false && finalProcessedTextForOutput !== "");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 md:px-8 md:py-12">
        <header className="mb-10 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-primary rounded-full mb-4 shadow-md">
            <FileType className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
            {t('pageTitle')}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('pageSubtitle')}
          </p>
        </header>

        <main className="space-y-8 max-w-4xl mx-auto">
          <FileInputArea 
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            manualText={manualText}
            setManualText={setManualText}
            clearAllInputs={clearAllInputs}
          />
          <KeywordEntry 
            keywords={keywords} 
            setKeywords={setKeywords}
            keywordHistory={keywordHistory}
            onRemoveKeywordFromHistory={handleRemoveKeywordFromHistory}
            onAddKeywordFromSuggestion={handleAddKeywordFromSuggestion}
          />

          <div className="text-center pt-4">
            {(!genAIInstance || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") && (
              <p className="text-destructive text-sm mb-2">
                Warning: Gemini API Key not configured in src/app/page.tsx. AI features will not work.
              </p>
            )}
            <Button 
              onClick={handleProcess} 
              disabled={processing || (!manualText.trim() && selectedFiles.length === 0) || userKeywordsArray.length === 0 || (!genAIInstance || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE")}
              size="lg"
              className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md hover:shadow-lg"
              aria-live="polite"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t('processingButton')}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" /> {t('generateInsightsButton')}
                </>
              )}
            </Button>
          </div>

          {showResults && (
            <ResultsDisplay 
              summary={summaryResult}
              enrichedKeywords={enrichedKeywordsResult}
              extractedKeywordEntries={keywordValueMapResult?.extractedKeywordEntries}
              userKeywords={userKeywordsArray}
              foundKeywordsInText={foundKeywordsInText}
              fullExtractedTextForOutput={finalProcessedTextForOutput}
              source={inputSource}
              filesProcessed={processedFileNames}
            />
          )}
        </main>
        
        <footer className="mt-16 pt-8 border-t text-center text-muted-foreground text-sm">
          <p dangerouslySetInnerHTML={{ __html: t('footerText', { year: new Date().getFullYear() }) }} />
        </footer>
      </div>
    </div>
  );
}

