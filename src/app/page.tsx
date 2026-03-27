
"use client";

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FileInputArea } from '@/components/file-input-area';
import { KeywordEntry } from '@/components/keyword-entry';
import { ResultsDisplay } from '@/components/results-display';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, FileType, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { enhanceImage } from '@/ai/flows/enhance-image-flow';
import { processInsights } from '@/ai/flows/process-insights-flow';

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

  const [enhancementTags, setEnhancementTags] = useState<string[]>([]);
  const [targetFileForEnhancement, setTargetFileForEnhancement] = useState<string>("");

  const { toast } = useToast();

  const predefinedEnhancementTags = ["Improve Clarity", "Fix Lighting", "Increase Contrast", "Convert to B&W", "Remove Shadows"];
  
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
    setSummaryResult(null);
    setEnrichedKeywordsResult(null);
    setKeywordValueMapResult(null);
    setFoundKeywordsInText([]);
    setFinalProcessedTextForOutput("");
    setInputSource("");
    setProcessedFileNames([]);
    setEnhancementTags([]);
    setTargetFileForEnhancement("");
    toast({ 
      title: t('toastInputsClearedTitle'),
      description: t('toastInputsClearedDescription')
    });
  };

  const fileToDataUri = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const updateKeywordHistory = (newKeywords: string[]) => {
    setKeywordHistory(prevHistory => {
      const updatedHistory = [...new Set([ ...newKeywords.map(kw => kw.trim()).filter(Boolean), ...prevHistory])];
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

  const handleToggleEnhancementTag = (tag: string) => {
    setEnhancementTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const dataURLtoFile = (dataurl: string, filename: string): File => {
    let arr = dataurl.split(','), mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    let mime = mimeMatch[1],
        bstr = atob(arr[1]), 
        n = bstr.length, 
        u8arr = new Uint8Array(n);
    while(n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, {type:mime});
  }

  const handleProcess = async () => {
    setProcessing(true);
    setSummaryResult(null);
    setEnrichedKeywordsResult(null);
    setKeywordValueMapResult(null);
    setFoundKeywordsInText([]);
    setFinalProcessedTextForOutput("");
    
    try {
      let filesToProcess = [...selectedFiles];

      // --- 1. Image Enhancement Step ---
      if (targetFileForEnhancement && enhancementTags.length > 0) {
        const fileToEnhance = filesToProcess.find(f => f.name === targetFileForEnhancement);
        if (fileToEnhance) {
          toast({ title: "Enhancing Image...", description: `Applying enhancements to ${fileToEnhance.name}` });
          const dataUrl = await fileToDataUri(fileToEnhance);
          const result = await enhanceImage({
            photoDataUri: dataUrl,
            prompt: enhancementTags.join(', '),
          });
          const newFile = dataURLtoFile(result.enhancedPhotoDataUri, `enhanced_${fileToEnhance.name}`);
          filesToProcess = filesToProcess.map(f => f.name === fileToEnhance.name ? newFile : f);
          toast({ title: "Image Enhanced", description: "Enhancement applied successfully." });
        }
      }

      // --- 2. Unified Processing Step ---
      const userKeywordsArray = keywords.split(',').map(kw => kw.trim()).filter(Boolean);
      const fileData = await Promise.all(filesToProcess.map(async f => ({
        dataUri: await fileToDataUri(f),
        mimeType: f.type,
        name: f.name
      })));

      const result = await processInsights({
        files: fileData,
        manualText: manualText,
        keywords: userKeywordsArray,
      });

      setFinalProcessedTextForOutput(result.combinedText);
      setSummaryResult({ summary: result.summary });
      setEnrichedKeywordsResult({ suggestedKeywords: result.suggestedKeywords });
      setFoundKeywordsInText(result.foundKeywords);
      setKeywordValueMapResult({ extractedKeywordEntries: result.keywordValues });
      setProcessedFileNames(filesToProcess.map(f => f.name));
      setInputSource(selectedFiles.length > 0 ? "file_upload" : "manual_paste");

      updateKeywordHistory(userKeywordsArray);

      toast({
        title: t('toastProcessingCompleteTitle'),
        description: t('toastProcessingCompleteDescription'),
      });

    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: t('toastInsightGenerationErrorTitle'),
        description: error instanceof Error ? error.message : "An error occurred during processing.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveReportToFirestore = async (reportData: any) => {
    toast({ title: t('toastFeatureNotImplementedTitle'), description: t('toastFeatureNotImplementedDescription') });
  };

  const userKeywordsArray = keywords.split(',').map(kw => kw.trim()).filter(kw => kw);
  const showResults = summaryResult || enrichedKeywordsResult || keywordValueMapResult || foundKeywordsInText.length > 0 || (processing === false && finalProcessedTextForOutput !== "");
  const imageFiles = selectedFiles.filter(f => f.type.startsWith("image/"));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 md:px-8 md:py-12">
        <header className="mb-10 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-primary rounded-full mb-4 shadow-md">
            <FileType className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">{t('pageTitle')}</h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">{t('pageSubtitle')}</p>
        </header>

        <main className="space-y-8 max-w-4xl mx-auto">
          <FileInputArea 
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            manualText={manualText}
            setManualText={setManualText}
            clearAllInputs={clearAllInputs}
          />

          {imageFiles.length > 0 && (
            <Card className="shadow-lg border-2 border-accent/20">
              <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center">
                  <Wand2 className="mr-2 h-6 w-6 text-accent" /> Image Enhancement
                </CardTitle>
                <CardDescription>Select an image to enhance automatically when processing data.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="target-file-enhancement">Target Image</Label>
                    <select
                      id="target-file-enhancement"
                      value={targetFileForEnhancement}
                      onChange={(e) => setTargetFileForEnhancement(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-input bg-background focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md border"
                    >
                      <option value="">-- No enhancement --</option>
                      {imageFiles.map(file => (
                        <option key={file.name} value={file.name}>{file.name}</option>
                      ))}
                    </select>
                  </div>
                  {targetFileForEnhancement && (
                    <div>
                      <Label>Enhancement Features</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {predefinedEnhancementTags.map(tag => (
                          <Badge
                            key={tag}
                            variant={enhancementTags.includes(tag) ? 'default' : 'secondary'}
                            onClick={() => handleToggleEnhancementTag(tag)}
                            className="cursor-pointer transition-all hover:scale-105"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <KeywordEntry 
            keywords={keywords} 
            setKeywords={setKeywords}
            keywordHistory={keywordHistory}
            onRemoveKeywordFromHistory={handleRemoveKeywordFromHistory}
            onAddKeywordFromSuggestion={handleAddKeywordFromSuggestion}
          />
          
          <div className="pt-6 flex justify-center">
            <Button
              onClick={handleProcess}
              disabled={processing || (!manualText.trim() && selectedFiles.length === 0) || userKeywordsArray.length === 0}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105 shadow-xl px-12 py-6 text-lg"
            >
              {processing ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</>
              ) : (
                <><Sparkles className="mr-2 h-5 w-5" />Process Data</>
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
              onSaveReport={handleSaveReportToFirestore}
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
