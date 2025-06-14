
"use client";

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { FileInputArea } from '@/components/file-input-area';
import { KeywordEntry } from '@/components/keyword-entry';
import { ResultsDisplay } from '@/components/results-display';
import { useToast } from "@/hooks/use-toast";
import { summarizeFileContent, type SummarizeFileContentInput, type SummarizeFileContentOutput } from '@/ai/flows/summarize-file-content';
import { enrichKeywords, type EnrichKeywordsInput, type EnrichKeywordsOutput } from '@/ai/flows/keyword-enrichment';
import { extractTextFromDocument, type ExtractTextFromDocumentInput, type ExtractTextFromDocumentOutput } from '@/ai/flows/extract-text-flow';
import { extractKeywordValues, type ExtractKeywordValuesInput, type ExtractKeywordValuesOutput } from '@/ai/flows/extract-keyword-values-flow';
import { Loader2, Sparkles, FileType } from 'lucide-react';

interface OcrFileData {
  name: string;
  extractedText: string;
}

export default function Home() {
  const { t } = useTranslation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [ocrFileResults, setOcrFileResults] = useState<OcrFileData[]>([]);
  const [manualText, setManualText] = useState<string>("");
  const [keywords, setKeywords] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  
  const [summaryResult, setSummaryResult] = useState<SummarizeFileContentOutput | null>(null);
  const [enrichedKeywordsResult, setEnrichedKeywordsResult] = useState<EnrichKeywordsOutput | null>(null);
  const [keywordValueMapResult, setKeywordValueMapResult] = useState<ExtractKeywordValuesOutput | null>(null); // This will hold { extractedKeywordEntries: [...] }
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
    setKeywordValueMapResult(null);
    setFoundKeywordsInText([]);
    setFinalProcessedText("");
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

  const handleProcess = async () => {
    setProcessing(true);
    setSummaryResult(null);
    setEnrichedKeywordsResult(null);
    setKeywordValueMapResult(null);
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
        title: t('toastProcessingFilesTitle'),
        description: t('toastProcessingFilesDescription', { count: selectedFiles.length })
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
          title: t('toastOcrErrorTitle'),
          description: ocrError instanceof Error ? ocrError.message : t('toastOcrErrorDescription'),
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
        title: t('toastNoInputProvidedTitle'),
        description: t('toastNoInputProvidedDescription'),
        variant: "destructive",
      });
      setProcessing(false);
      return;
    }

    if (!keywords.trim()) {
      toast({
        title: t('toastNoKeywordsTitle'),
        description: t('toastNoKeywordsDescription'),
        variant: "destructive",
      });
      setProcessing(false);
      return;
    }

    setFinalProcessedText(combinedTextForProcessing);
    setInputSource(currentInputSource || "unknown"); 
    setProcessedFileNames(currentFileNamesProcessed);

    try {
      const userKeywordsArray = keywords.split(',').map(kw => kw.trim()).filter(kw => kw);

      const summaryInput: SummarizeFileContentInput = { fileText: combinedTextForProcessing };
      const summaryOutput = await summarizeFileContent(summaryInput);
      setSummaryResult(summaryOutput);

      const enrichmentInput: EnrichKeywordsInput = { 
        documentContent: combinedTextForProcessing, 
        existingKeywords: userKeywordsArray 
      };
      const enrichmentOutput = await enrichKeywords(enrichmentInput);
      setEnrichedKeywordsResult(enrichmentOutput);

      if (userKeywordsArray.length > 0) {
        const keywordValuesInput: ExtractKeywordValuesInput = {
          documentText: combinedTextForProcessing,
          keywords: userKeywordsArray,
        };
        const keywordValuesOutput = await extractKeywordValues(keywordValuesInput);
        setKeywordValueMapResult(keywordValuesOutput); // Stores { extractedKeywordEntries: [...] }
      } else {
        setKeywordValueMapResult({ extractedKeywordEntries: [] });
      }
      

      const foundKws: string[] = [];
      const lowerCombinedText = combinedTextForProcessing.toLowerCase();
      userKeywordsArray.forEach(kw => {
        if (lowerCombinedText.includes(kw.toLowerCase())) {
          foundKws.push(kw);
        }
      });
      setFoundKeywordsInText(foundKws);
      
      toast({
        title: t('toastProcessingCompleteTitle'),
        description: t('toastProcessingCompleteDescription'),
      });

    } catch (error) {
      console.error("Processing error (summary/enrichment/keyword-values):", error);
      toast({
        title: t('toastInsightGenerationErrorTitle'),
        description: error instanceof Error ? error.message : t('toastInsightGenerationErrorDescription'),
        variant: "destructive",
      });
      setSummaryResult(null);
      setEnrichedKeywordsResult(null);
      setKeywordValueMapResult(null);
      setFoundKeywordsInText([]);
    } finally {
      setProcessing(false);
    }
  };

  const userKeywordsArray = keywords.split(',').map(kw => kw.trim()).filter(kw => kw);
  const showResults = summaryResult || enrichedKeywordsResult || keywordValueMapResult || foundKeywordsInText.length > 0 || (processing === false && finalProcessedText !== "");

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
              extractedKeywordEntries={keywordValueMapResult?.extractedKeywordEntries} // Pass the array of entries
              userKeywords={userKeywordsArray}
              foundKeywordsInText={foundKeywordsInText}
              fullExtractedText={finalProcessedText}
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

