
"use client";

import { useState, useCallback } from 'react';
// import { useTranslation } from 'react-i18next'; // Removed i18n
import { Button } from '@/components/ui/button';
import { FileInputArea } from '@/components/file-input-area';
import { KeywordEntry } from '@/components/keyword-entry';
import { ResultsDisplay } from '@/components/results-display';
import { useToast } from "@/hooks/use-toast";
import { summarizeFileContent, type SummarizeFileContentInput, type SummarizeFileContentOutput } from '@/ai/flows/summarize-file-content';
import { enrichKeywords, type EnrichKeywordsInput, type EnrichKeywordsOutput } from '@/ai/flows/keyword-enrichment';
import { extractTextFromDocument, type ExtractTextFromDocumentInput, type ExtractTextFromDocumentOutput } from '@/ai/flows/extract-text-flow';
import { Loader2, Sparkles, FileType } from 'lucide-react';

interface OcrFileData {
  name: string;
  extractedText: string;
}

export default function Home() {
  // const { t } = useTranslation(); // Removed i18n
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [ocrFileResults, setOcrFileResults] = useState<OcrFileData[]>([]);
  const [manualText, setManualText] = useState<string>("");
  const [keywords, setKeywords] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  
  const [summaryResult, setSummaryResult] = useState<SummarizeFileContentOutput | null>(null);
  const [enrichedKeywordsResult, setEnrichedKeywordsResult] = useState<EnrichKeywordsOutput | null>(null);
  const [foundKeywordsInText, setFoundKeywordsInText] = useState<string[]>([]);
  const [finalProcessedText, setFinalProcessedText] = useState<string>("");
  const [inputSource, setInputSource] = useState<string>(""); 
  const [processedFileNames, setProcessedFileNames] = useState<string[]>([]);

  const { toast } = useToast();
  
  const clearAllInputs = () => {
    setSelectedFiles([]);
    setOcrFileResults([]);
    setManualText("");
    setKeywords("");
    setSummaryResult(null);
    setEnrichedKeywordsResult(null);
    setFoundKeywordsInText([]);
    setFinalProcessedText("");
    setInputSource("");
    setProcessedFileNames([]);
    toast({ 
      title: "Inputs Cleared", // Hardcoded English
      description: "All input fields and results have been reset." // Hardcoded English
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

  const handleProcess = async () => {
    setProcessing(true);
    setSummaryResult(null);
    setEnrichedKeywordsResult(null);
    setFoundKeywordsInText([]);
    setFinalProcessedText("");
    setOcrFileResults([]); 
    setProcessedFileNames([]);

    let currentInputSource = "";
    let combinedTextForProcessing = "";
    const currentFileNamesProcessed: string[] = [];

    if (selectedFiles.length > 0) {
      currentInputSource = "file_upload";
      const ocrResultsFromFileUploads: OcrFileData[] = [];
      toast({ 
        title: "Processing Files...", // Hardcoded English
        description: `Attempting to extract text from ${selectedFiles.length} file(s). This may take a moment.` // Hardcoded English
      });
      try {
        for (const file of selectedFiles) {
          currentFileNamesProcessed.push(file.name);
          const documentDataUri = await fileToDataUri(file);
          const ocrInput: ExtractTextFromDocumentInput = { documentDataUri };
          const ocrOutput = await extractTextFromDocument(ocrInput);
          ocrResultsFromFileUploads.push({ name: file.name, extractedText: ocrOutput.extractedText });
        }
        setOcrFileResults(ocrResultsFromFileUploads);
        const extractedTexts = ocrResultsFromFileUploads.map(
          res => `--- START OF FILE: ${res.name} ---\n${res.extractedText}\n--- END OF FILE: ${res.name} ---`
        );
        combinedTextForProcessing = extractedTexts.join("\n\n");
      } catch (ocrError) {
        console.error("OCR error:", ocrError);
        toast({
          title: "OCR Error", // Hardcoded English
          description: ocrError instanceof Error ? ocrError.message : "Failed to extract text from one or more files.", // Hardcoded English
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }
    }

    if (manualText.trim()) {
      if (combinedTextForProcessing) { 
        combinedTextForProcessing += "\n\n--- START OF MANUAL TEXT ---\n" + manualText.trim() + "\n--- END OF MANUAL TEXT ---";
        currentInputSource = "file_and_manual_paste";
      } else {
        combinedTextForProcessing = manualText.trim();
        currentInputSource = "manual_paste";
      }
    }

    if (!combinedTextForProcessing) {
      toast({
        title: "No Input Provided", // Hardcoded English
        description: "Please upload image/PDF files or paste text to process.", // Hardcoded English
        variant: "destructive",
      });
      setProcessing(false);
      return;
    }

    if (!keywords.trim()) {
      toast({
        title: "No Keywords", // Hardcoded English
        description: "Please enter some keywords to search for.", // Hardcoded English
        variant: "destructive",
      });
      setProcessing(false);
      return;
    }

    setFinalProcessedText(combinedTextForProcessing);
    setInputSource(currentInputSource || "unknown"); 
    setProcessedFileNames(currentFileNamesProcessed);

    try {
      const summaryInput: SummarizeFileContentInput = { fileText: combinedTextForProcessing };
      const summaryOutput = await summarizeFileContent(summaryInput);
      setSummaryResult(summaryOutput);

      const userKeywordsArray = keywords.split(',').map(kw => kw.trim()).filter(kw => kw);
      const enrichmentInput: EnrichKeywordsInput = { 
        documentContent: combinedTextForProcessing, 
        existingKeywords: userKeywordsArray 
      };
      const enrichmentOutput = await enrichKeywords(enrichmentInput);
      setEnrichedKeywordsResult(enrichmentOutput);

      const foundKws: string[] = [];
      const lowerCombinedText = combinedTextForProcessing.toLowerCase();
      userKeywordsArray.forEach(kw => {
        if (lowerCombinedText.includes(kw.toLowerCase())) {
          foundKws.push(kw);
        }
      });
      setFoundKeywordsInText(foundKws);
      
      toast({
        title: "Processing Complete", // Hardcoded English
        description: "Insights have been generated.", // Hardcoded English
      });

    } catch (error) {
      console.error("Processing error (summary/enrichment):", error);
      toast({
        title: "Insight Generation Error", // Hardcoded English
        description: error instanceof Error ? error.message : "An unknown error occurred during insight generation.", // Hardcoded English
        variant: "destructive",
      });
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
            File Insights {/* Hardcoded English */}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload your images or PDFs, or paste text, define keywords, and let AI extract valuable information for you. {/* Hardcoded English */}
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
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing... {/* Hardcoded English */}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" /> Generate Insights {/* Hardcoded English */}
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
          {/* Hardcoded English, simplified */}
          <p>&copy; {new Date().getFullYear()} File Insights. Powered by Next.js & GenAI.</p>
        </footer>
      </div>
    </div>
  );
}
