
"use client";

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { FileInputArea } from '@/components/file-input-area';
import { KeywordEntry } from '@/components/keyword-entry';
import { ResultsDisplay } from '@/components/results-display';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, FileType } from 'lucide-react';

// AI Flow types might be needed if we re-implement with client-side Firebase AI SDK
// For now, outputs will be null or empty.
interface SummarizeFileContentOutput { summary: string; }
interface EnrichKeywordsOutput { suggestedKeywords: string[]; }
interface KeywordValuesEntry { keyword: string; foundValues: string[]; }
interface ExtractKeywordValuesOutput { extractedKeywordEntries: KeywordValuesEntry[]; }

interface OcrFileData { // This might still be useful if client-side OCR/text extraction is used before calling Gemini
  name: string;
  extractedText: string;
}

export default function Home() {
  const { t } = useTranslation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // const [ocrFileResults, setOcrFileResults] = useState<OcrFileData[]>([]); // Temporarily removing as OCR logic is removed
  const [manualText, setManualText] = useState<string>("");
  const [keywords, setKeywords] = useState<string>("");
  const [keywordHistory, setKeywordHistory] = useState<string[]>([]);
  const [processing, setProcessing] = useState<boolean>(false);
  
  // AI results state will be null for now
  const [summaryResult, setSummaryResult] = useState<SummarizeFileContentOutput | null>(null);
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
    // setOcrFileResults([]);
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

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
    // Reset results
    setSummaryResult(null);
    setEnrichedKeywordsResult(null);
    setKeywordValueMapResult(null);
    setFoundKeywordsInText([]);
    setFinalProcessedTextForOutput("");
    // setOcrFileResults([]); 
    setProcessedFileNames([]);

    let currentInputSource = "";
    let combinedTextContent = ""; 
    const currentFileNamesProcessed: string[] = [];

    // Basic text gathering (OCR/extraction part is now removed, pending client-side AI SDK implementation)
    if (selectedFiles.length > 0) {
      currentInputSource = "file_upload";
      // Placeholder: In a real scenario with client-side Firebase AI, 
      // you'd use the SDK here to process files.
      // For now, we'll just acknowledge the files.
      selectedFiles.forEach(file => {
        currentFileNamesProcessed.push(file.name);
        // Simulate some text for now, or leave it to manual text.
        // This part will be replaced by actual client-side Firebase AI calls.
        // combinedTextContent += `[Content of ${file.name}]\n`; 
      });
      if(selectedFiles.length > 0 && !manualText.trim()){
        // If only files are provided, we can't proceed without text extraction logic.
        // For now, this example will primarily rely on manual text input for AI processing.
        // A real implementation would extract text from files here using a client-side library or SDK.
         toast({
          title: "File Processing Note",
          description: "File content extraction with client-side Firebase AI SDK needs to be implemented. Processing will use manually pasted text if available.",
          variant: "default"
        });
      }
    }

    if (manualText.trim()) {
      const trimmedManualText = manualText.trim();
      combinedTextContent += (combinedTextContent ? "\n\n" : "") + trimmedManualText;
      currentInputSource = currentInputSource === "file_upload" ? "file_and_manual_paste" : "manual_paste";
    }
    
    setFinalProcessedTextForOutput(combinedTextContent); // Store the combined text
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

    // --- AI Processing Placeholder ---
    // This is where you would integrate the Firebase AI Logic SDK (e.g., @firebase/vertexai-preview)
    // to call Gemini for summarization, keyword enrichment, and value extraction.
    // For now, we'll simulate a delay and then show a "not implemented" message.
    
    try {
      // Example: Simulate finding keywords in the combinedTextContent
      const foundKws: string[] = [];
      const lowerCleanTextForSearch = combinedTextContent.toLowerCase();
      userKeywordsArray.forEach(kw => {
        if (lowerCleanTextForSearch.includes(kw.toLowerCase())) {
          foundKws.push(kw);
        }
      });
      setFoundKeywordsInText(foundKws);

      // Simulate setting some results or leave them null
      // setSummaryResult({ summary: "AI summarization using client-side Firebase SDK to be implemented." });
      // setEnrichedKeywordsResult({ suggestedKeywords: ["client-sdk-todo", "firebase-ai"] });
      // setKeywordValueMapResult({ extractedKeywordEntries: userKeywordsArray.map(kw => ({keyword: kw, foundValues: ["client-sdk-value-todo"]})) });

      toast({
        title: "AI Processing (Client-Side)",
        description: "AI features using Firebase client SDKs are to be implemented here.",
        variant: "default"
      });
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      toast({
        title: t('toastProcessingCompleteTitle'),
        description: "Displaying placeholder results. AI client-SDK integration pending.",
      });

    } catch (error) {
      console.error("Client-side AI Processing error placeholder:", error);
      toast({
        title: "AI Processing Error",
        description: error instanceof Error ? error.message : String(error),
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
            <Button 
              onClick={handleProcess} 
              disabled={processing || (!manualText.trim() && selectedFiles.length === 0) || userKeywordsArray.length === 0}
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
