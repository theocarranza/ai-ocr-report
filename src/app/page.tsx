
"use client";

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileInputArea } from '@/components/file-input-area';
import { KeywordEntry } from '@/components/keyword-entry';
import { ResultsDisplay } from '@/components/results-display';
import { useToast } from "@/hooks/use-toast";
import { summarizeFileContent, type SummarizeFileContentInput, type SummarizeFileContentOutput } from '@/ai/flows/summarize-file-content';
import { enrichKeywords, type EnrichKeywordsInput, type EnrichKeywordsOutput } from '@/ai/flows/keyword-enrichment';
import { Loader2, Sparkles, FileType } from 'lucide-react';

interface FileData {
  name: string;
  content: string; // Extracted text content
}

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [extractedFileTexts, setExtractedFileTexts] = useState<FileData[]>([]);
  const [manualText, setManualText] = useState<string>("");
  const [keywords, setKeywords] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  
  const [summaryResult, setSummaryResult] = useState<SummarizeFileContentOutput | null>(null);
  const [enrichedKeywordsResult, setEnrichedKeywordsResult] = useState<EnrichKeywordsOutput | null>(null);
  const [foundKeywordsInText, setFoundKeywordsInText] = useState<string[]>([]);
  const [finalProcessedText, setFinalProcessedText] = useState<string>("");
  const [inputSource, setInputSource] = useState<string>("file_upload");
  const [processedFileNames, setProcessedFileNames] = useState<string[]>([]);


  const { toast } = useToast();

  const handleTextExtracted = useCallback((filename: string, content: string) => {
    setExtractedFileTexts(prev => {
      const existingFile = prev.find(f => f.name === filename);
      if (existingFile) {
        return prev.map(f => f.name === filename ? { ...f, content } : f);
      }
      return [...prev, { name: filename, content }];
    });
  }, []);
  
  const clearAllInputs = () => {
    setSelectedFiles([]);
    setExtractedFileTexts([]);
    setManualText("");
    setKeywords("");
    setSummaryResult(null);
    setEnrichedKeywordsResult(null);
    setFoundKeywordsInText([]);
    setFinalProcessedText("");
    setInputSource("file_upload");
    setProcessedFileNames([]);
    toast({ title: "Inputs Cleared", description: "All input fields and results have been reset." });
  };

  const handleProcess = async () => {
    let combinedText = "";
    let currentSource = "manual_paste";
    let currentProcessedFileNames: string[] = [];

    if (manualText.trim()) {
      combinedText = manualText.trim();
      currentSource = "manual_paste";
    } else if (extractedFileTexts.length > 0) {
      combinedText = extractedFileTexts.map(f => `--- START OF FILE: ${f.name} ---\n${f.content}\n--- END OF FILE: ${f.name} ---`).join("\n\n");
      currentSource = "file_upload";
      currentProcessedFileNames = extractedFileTexts.map(f => f.name);
    } else {
      toast({
        title: "No Input Provided",
        description: "Please upload files or paste text to process.",
        variant: "destructive",
      });
      return;
    }

    if (!keywords.trim()) {
      toast({
        title: "No Keywords",
        description: "Please enter some keywords to search for.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setSummaryResult(null);
    setEnrichedKeywordsResult(null);
    setFoundKeywordsInText([]);
    setFinalProcessedText(combinedText);
    setInputSource(currentSource);
    setProcessedFileNames(currentProcessedFileNames);

    try {
      // 1. Summarize content
      const summaryInput: SummarizeFileContentInput = { fileText: combinedText };
      const summaryOutput = await summarizeFileContent(summaryInput);
      setSummaryResult(summaryOutput);

      // 2. Enrich keywords
      const userKeywordsArray = keywords.split(',').map(kw => kw.trim()).filter(kw => kw);
      const enrichmentInput: EnrichKeywordsInput = { 
        documentContent: combinedText, 
        existingKeywords: userKeywordsArray 
      };
      const enrichmentOutput = await enrichKeywords(enrichmentInput);
      setEnrichedKeywordsResult(enrichmentOutput);

      // 3. Simple client-side keyword search (placeholder)
      const foundKws: string[] = [];
      const lowerCombinedText = combinedText.toLowerCase();
      userKeywordsArray.forEach(kw => {
        if (lowerCombinedText.includes(kw.toLowerCase())) {
          foundKws.push(kw);
        }
      });
      setFoundKeywordsInText(foundKws);
      
      toast({
        title: "Processing Complete",
        description: "Insights have been generated.",
      });

    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing Error",
        description: error instanceof Error ? error.message : "An unknown error occurred during processing.",
        variant: "destructive",
      });
      // Clear potentially partial results on error
      setSummaryResult(null);
      setEnrichedKeywordsResult(null);
      setFoundKeywordsInText([]);
    } finally {
      setProcessing(false);
    }
  };

  const userKeywordsArray = keywords.split(',').map(kw => kw.trim()).filter(kw => kw);
  const showResults = summaryResult || enrichedKeywordsResult || foundKeywordsInText.length > 0 || (processing === false && finalProcessedText !== "");


  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 md:px-8 md:py-12">
        <header className="mb-10 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-primary rounded-full mb-4 shadow-md">
            <FileType className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
            File Insights
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload your documents or paste text, define keywords, and let AI extract valuable information for you.
          </p>
        </header>

        <main className="space-y-8 max-w-4xl mx-auto">
          <FileInputArea 
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            manualText={manualText}
            setManualText={setManualText}
            onTextExtracted={handleTextExtracted}
            clearAllInputs={clearAllInputs}
          />
          <KeywordEntry keywords={keywords} setKeywords={setKeywords} />

          <div className="text-center pt-4">
            <Button 
              onClick={handleProcess} 
              disabled={processing || (!manualText.trim() && selectedFiles.length === 0)}
              size="lg"
              className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md hover:shadow-lg"
              aria-live="polite"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" /> Generate Insights
                </>
              )}
            </Button>
          </div>

          {showResults && (
            <ResultsDisplay 
              summary={summaryResult}
              enrichedKeywords={enrichedKeywordsResult}
              userKeywords={userKeywordsArray}
              foundKeywordsInText={foundKeywordsInText}
              fullExtractedText={finalProcessedText}
              source={inputSource}
              filesProcessed={processedFileNames}
            />
          )}
        </main>
        
        <footer className="mt-16 pt-8 border-t text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} File Insights. Powered by Next.js & GenAI.</p>
        </footer>
      </div>
    </div>
  );
}
