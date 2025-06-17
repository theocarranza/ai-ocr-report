
"use client";

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { FileInputArea } from '@/components/file-input-area';
import { KeywordEntry } from '@/components/keyword-entry';
import { ResultsDisplay } from '@/components/results-display';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, FileType } from 'lucide-react';

// Google AI SDK for direct Gemini API calls
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Firebase (optional, if you plan to use other Firebase services like Auth for security)
import { initializeApp, type FirebaseOptions } from 'firebase/app';

// --- IMPORTANT ---
// REPLACE WITH YOUR ACTUAL FIREBASE CONFIG IF YOU PLAN TO USE OTHER FIREBASE SERVICES
const firebaseConfig: FirebaseOptions = {
  apiKey: "YOUR_API_KEY", // Not used for direct Gemini calls with Google AI SDK
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
// Consider using environment variables (e.g., process.env.NEXT_PUBLIC_GEMINI_API_KEY)
// and ensure your build process handles them securely.
// For truly secure free-tier, you'd ideally proxy via a (non-Firebase Function) free serverless option if possible,
// or heavily restrict your API key on Google AI Studio / Google Cloud.
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


// Initialize Google AI SDK
let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY && GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY_HERE") {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  } catch (error) {
    console.error("Error initializing GoogleGenerativeAI:", error);
  }
}


// Define interfaces for AI outputs
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

  const clientSideTextExtraction = async (file: File): Promise<string> => {
    // Placeholder for client-side text extraction
    // For images, you might use Tesseract.js: https://tesseract.projectnaptha.com/
    // For PDFs (text-based), you might use pdf.js: https://mozilla.github.io/pdf.js/
    // For scanned PDFs, client-side OCR is very challenging and performance-intensive.
    
    // Example for plain text files (if you decide to support them)
    if (file.type === 'text/plain') {
      return file.text();
    }

    // Simulate image/PDF processing
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
       toast({
        title: "Client-Side OCR Not Implemented",
        description: `Text extraction for ${file.name} requires a client-side OCR library (e.g., Tesseract.js for images, pdf.js for PDFs). This is a placeholder.`,
        variant: "default",
        duration: 5000,
      });
      return `[Placeholder: Extracted text from ${file.name} - implement client-side OCR]`;
    }
    
    toast({
      title: "Unsupported File Type",
      description: `Client-side text extraction for ${file.type} is not implemented.`,
      variant: "default",
    });
    return `[Unsupported file type: ${file.name}]`;
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

    if (!genAI || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
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

    if (selectedFiles.length > 0) {
      currentInputSource = "file_upload";
      toast({
        title: t('toastProcessingFilesTitle', {count: selectedFiles.length}),
        description: "Attempting client-side text extraction..."
      });
      try {
        for (const file of selectedFiles) {
          currentFileNamesProcessed.push(file.name);
          const extractedText = await clientSideTextExtraction(file);
          combinedTextContent += (combinedTextContent ? "\n\n" : "") + `--- START OF FILE: ${file.name} ---\n${extractedText}\n--- END OF FILE: ${file.name} ---`;
        }
      } catch (error) {
        console.error("Client-side text extraction error:", error);
        toast({
          title: t('toastOcrErrorTitle'),
          description: error instanceof Error ? error.message : "Failed to extract text client-side.",
          variant: "destructive",
        });
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

    if (!combinedTextContent) {
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
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash-latest",
        // safetySettings: [ // Optional: adjust safety settings
        //   { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        // ]
      });

      // 1. Summarization
      const summaryPrompt = `Summarize the following text:\n\n${combinedTextContent}`;
      const summaryResultObj = await model.generateContent(summaryPrompt);
      const summaryResponse = await summaryResultObj.response;
      setSummaryResult({ summary: summaryResponse.text() || "Summary not available." });

      // 2. Keyword Enrichment
      const enrichmentPrompt = `Based on the following text and keywords, suggest 3-5 additional relevant keywords.
Text: "${combinedTextContent}"
Original Keywords: ${userKeywordsArray.join(", ")}
Suggested Keywords (comma-separated list):`;
      const enrichmentResultObj = await model.generateContent(enrichmentPrompt);
      const enrichmentResponse = await enrichmentResultObj.response;
      const suggestedKeywords = enrichmentResponse.text() ? enrichmentResponse.text().split(',').map(kw => kw.trim()).filter(Boolean) : [];
      setEnrichedKeywordsResult({ suggestedKeywords });
      
      // 3. Keyword Value Extraction (Simple presence check client-side, or more complex prompt for Gemini)
      const foundKws: string[] = [];
      const lowerCleanTextForSearch = combinedTextContent.toLowerCase();
      userKeywordsArray.forEach(kw => {
        if (lowerCleanTextForSearch.includes(kw.toLowerCase())) {
          foundKws.push(kw);
        }
      });
      setFoundKeywordsInText(foundKws);

      // For actual value extraction by Gemini, a structured prompt and JSON response parsing would be needed.
      // This is a placeholder showing how you might structure the data.
      // Example prompt for one keyword (you'd loop or batch for multiple):
      // const valueExtractionPrompt = `From the text: "${combinedTextContent}", extract the value associated with the keyword "${userKeywordsArray[0]}". If found, return the value, otherwise return "Not found".`;
      // For now, we'll just map found keywords.
      setKeywordValueMapResult({ 
        extractedKeywordEntries: userKeywordsArray.map(kw => ({
          keyword: kw, 
          foundValues: foundKws.includes(kw) ? ["[Keyword present - client-side check]"] : ["[Keyword not found - client-side check]"] 
        }))
      });

      toast({
        title: t('toastProcessingCompleteTitle'),
        description: "AI processing complete using Google AI SDK.",
      });

    } catch (error) {
      console.error("Google AI SDK error:", error);
      toast({
        title: "AI Processing Error",
        description: error instanceof Error ? error.message : "An error occurred calling the Gemini API.",
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
             {!genAI && GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE" && (
              <p className="text-destructive text-sm mb-2">
                Warning: Gemini API Key not configured. AI features will not work.
              </p>
            )}
            <Button 
              onClick={handleProcess} 
              disabled={processing || (!manualText.trim() && selectedFiles.length === 0) || userKeywordsArray.length === 0 || (!genAI || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE")}
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

