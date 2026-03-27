
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
import { Loader2, Sparkles, FileType, KeyRound as ApiKeyIcon, Wand2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from '@/components/ui/badge';
import { enhanceImage } from '@/ai/flows/enhance-image-flow';

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from "@google/generative-ai";

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, addDoc, collection, serverTimestamp, type Firestore } from 'firebase/firestore';

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

  const [genAI, setGenAI] = useState<GoogleGenerativeAI | null>(null);
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean | null>(null);

  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
  const [firestore, setFirestore] = useState<Firestore | null>(null);

  const [enhancementTags, setEnhancementTags] = useState<string[]>([]);
  const [targetFileForEnhancement, setTargetFileForEnhancement] = useState<string>("");

  const { toast } = useToast();

  const predefinedEnhancementTags = ["Improve Clarity", "Fix Lighting", "Increase Contrast", "Convert to B&W", "Remove Shadows"];
  
  const initializeAiSdk = useCallback((key: string | undefined) => {
    if (!key || !key.trim()) {
        setGenAI(null);
        setIsApiKeyValid(false);
        return;
    }
    try {
        const instance = new GoogleGenerativeAI(key);
        setGenAI(instance);
        setIsApiKeyValid(true); 
    } catch (error) {
        console.error("Error initializing GoogleGenerativeAI:", error);
        setGenAI(null);
        setIsApiKeyValid(false);
        toast({
            title: t('toastApiKeyInitErrorTitle'),
            description: error instanceof Error ? error.message : t('toastApiKeyInitErrorDescription'),
            variant: "destructive",
        });
    }
  }, [t, toast]);
  
  useEffect(() => {
    const storedHistory = localStorage.getItem('keywordHistory');
    if (storedHistory) {
      setKeywordHistory(JSON.parse(storedHistory));
    }
    
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (apiKey) {
      initializeAiSdk(apiKey);
    } else {
      setIsApiKeyValid(false);
    }
  }, [initializeAiSdk]);

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

  const fileToGenerativePart = async (file: File): Promise<Part> => {
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
    if (!mimeMatch) {
      throw new Error('Invalid data URL');
    }
    let mime = mimeMatch[1],
        bstr = atob(arr[1]), 
        n = bstr.length, 
        u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  }

  const handleProcess = async () => {
    if (!genAI || !isApiKeyValid) {
        toast({
            title: t('toastApiKeyMissingTitle'),
            description: t('toastApiKeyMissingDescription'),
            variant: "destructive",
        });
        setProcessing(false);
        return;
    }
    
    setProcessing(true);
    setSummaryResult(null);
    setEnrichedKeywordsResult(null);
    setKeywordValueMapResult(null);
    setFoundKeywordsInText([]);
    setFinalProcessedTextForOutput("");
    setInputSource("");
    setProcessedFileNames([]);
    
    let currentInputSource = "";
    let combinedTextContent = ""; 
    const currentFileNamesProcessed: string[] = [];
    let filesToProcess = [...selectedFiles];

    // --- Image Enhancement Step ---
    if (targetFileForEnhancement && enhancementTags.length > 0) {
      const fileToEnhance = filesToProcess.find(f => f.name === targetFileForEnhancement);
      if (fileToEnhance) {
        toast({ title: "Enhancing Image...", description: `Applying enhancements to ${fileToEnhance.name}` });
        try {
          const reader = new FileReader();
          const dataUrl = await new Promise<string>(resolve => {
            reader.onload = e => resolve(e.target?.result as string);
            reader.readAsDataURL(fileToEnhance);
          });
          
          const result = await enhanceImage({
            photoDataUri: dataUrl,
            prompt: enhancementTags.join(', '),
          });

          const newFileName = `enhanced_${fileToEnhance.name}`;
          const newFile = dataURLtoFile(result.enhancedPhotoDataUri, newFileName);
          
          filesToProcess = filesToProcess.map(f => f.name === fileToEnhance.name ? newFile : f);
          toast({ title: "Image Enhanced", description: `${fileToEnhance.name} was successfully enhanced.` });
        } catch (error) {
          console.error("Image enhancement error:", error);
          toast({
            title: "Enhancement Failed",
            description: error instanceof Error ? error.message : "Could not enhance the image. Proceeding with original.",
            variant: "destructive",
          });
        }
      }
    }

    const safetySettings = [ 
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ];
    
    // Using 2.0 Flash as a robust modern fallback per instructions
    const visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash", safetySettings });
    const textModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash", safetySettings });

    if (filesToProcess.length > 0) {
      currentInputSource = "file_upload";
      toast({
        title: t('toastProcessingFilesTitle', {count: filesToProcess.length}),
        description: "Sending files to Gemini for text extraction..."
      });
      
      const imageFileParts: Part[] = [];
      const promptForOcr = "Extract all text from the following image(s). Provide the extracted text for each file.";
      
      for (const file of filesToProcess) {
        currentFileNamesProcessed.push(file.name);
        if (file.type.startsWith("image/")) {
          const part = await fileToGenerativePart(file);
          imageFileParts.push(part);
        }
      }

      if (imageFileParts.length > 0) {
        const partsForOcrRequest: Part[] = [{ text: promptForOcr }, ...imageFileParts];
        
        try {
          const result = await visionModel.generateContent({contents: [{role: "user", parts: partsForOcrRequest}]});
          const response = await result.response;
          const extractedTextFromImages = response.text();
          combinedTextContent += (combinedTextContent ? "\n\n" : "") + extractedTextFromImages;
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
      combinedTextContent += (combinedTextContent ? "\n\n" : "") + manualText.trim();
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
      const summaryPrompt = `Summarize the following text concisely: "${combinedTextContent}"`;
      const summaryResultObj = await textModel.generateContent(summaryPrompt);
      const summaryResponse = await summaryResultObj.response;
      setSummaryResult({ summary: summaryResponse.text() || t('summaryNotAvailable') });

      const enrichmentPrompt = `Based on the following text, suggest 3-5 additional relevant keywords: "${combinedTextContent}"`;
      const enrichmentResultObj = await textModel.generateContent(enrichmentPrompt);
      const enrichmentResponse = await enrichmentResultObj.response;
      const suggestedKeywords = enrichmentResponse.text() ? enrichmentResponse.text().split(',').map(kw => kw.trim()).filter(Boolean) : [];
      setEnrichedKeywordsResult({ suggestedKeywords });
      
      const foundKws: string[] = [];
      const lowerCleanTextForSearch = combinedTextContent.toLowerCase();
      userKeywordsArray.forEach(kw => {
        if (lowerCleanTextForSearch.includes(kw.toLowerCase())) {
          foundKws.push(kw);
        }
      });
      setFoundKeywordsInText(foundKws);
      
      const extractedEntries: KeywordValuesEntry[] = [];
      for (const kw of userKeywordsArray) {
        if (foundKws.includes(kw)) {
            const valueExtractionPrompt = `Extract values for "${kw}" from: "${combinedTextContent}". Return a simple JSON array of strings.`;
            try {
                const valResult = await textModel.generateContent(valueExtractionPrompt);
                const valResponse = await valResult.response;
                const text = valResponse.text().replace(/```json\n?|\n?```/g, "").trim();
                const foundValues = JSON.parse(text);
                extractedEntries.push({ keyword: kw, foundValues: Array.isArray(foundValues) ? foundValues : [foundValues] });
            } catch {
                extractedEntries.push({ keyword: kw, foundValues: [] });
            }
        } else {
            extractedEntries.push({ keyword: kw, foundValues: [] });
        }
      }
      setKeywordValueMapResult({ extractedKeywordEntries: extractedEntries });

      toast({
        title: t('toastProcessingCompleteTitle'),
        description: "AI processing complete.",
      });

    } catch (error) {
      console.error("AI error during analysis:", error);
      toast({
        title: t('toastInsightGenerationErrorTitle'),
        description: error instanceof Error ? error.message : t('toastInsightGenerationErrorDescription'),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveReportToFirestore = async (reportData: any) => {
    toast({ title: t('toastSavingTitle'), description: t('toastSavingDescription') });
    let dbInstance = firestore;
    if (!dbInstance) {
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };
      if (!firebaseConfig.apiKey) return;
      try {
        const app = initializeApp(firebaseConfig);
        dbInstance = getFirestore(app);
        setFirebaseApp(app);
        setFirestore(dbInstance);
      } catch (error) {
        console.error("Firebase error:", error);
        return;
      }
    }
    if (!dbInstance) return;
    try {
      await addDoc(collection(dbInstance, "reports"), { ...reportData, createdAt: serverTimestamp() });
      toast({ title: t('toastSaveSuccessTitle'), description: t('toastSaveSuccessDescription') });
    } catch (error) {
      console.error("Firestore save error:", error);
    }
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
          {isApiKeyValid === false && (
             <Alert variant="destructive">
                <ApiKeyIcon className="h-4 w-4" />
                <AlertTitle>{t('toastApiKeyInitErrorTitle')}</AlertTitle>
                <AlertDescription>{t('toastApiKeyMissingDescription')}</AlertDescription>
              </Alert>
          )}

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
                <CardDescription>Optionally, select one image to be enhanced by AI before processing starts.</CardDescription>
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
              disabled={processing || isApiKeyValid === false || (!manualText.trim() && selectedFiles.length === 0) || userKeywordsArray.length === 0}
              size="lg"
              className="bg-destructive hover:bg-destructive/90 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105 shadow-2xl px-12 py-6 text-lg"
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
