
"use client";

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileInputArea } from '@/components/file-input-area';
import { KeywordEntry } from '@/components/keyword-entry';
import { ResultsDisplay } from '@/components/results-display';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, FileType, KeyRound as ApiKeyIcon } from 'lucide-react';

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

  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [genAI, setGenAI] = useState<GoogleGenerativeAI | null>(null);
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean | null>(null);

  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
  const [firestore, setFirestore] = useState<Firestore | null>(null);

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
  
  const initializeAiSdk = useCallback((key: string) => {
    if (!key.trim()) {
        setGenAI(null);
        setIsApiKeyValid(false);
        toast({
            title: t('toastApiKeyMissingTitle'),
            description: t('toastApiKeyMissingDescription'),
            variant: "destructive",
        });
        return null;
    }
    try {
        const instance = new GoogleGenerativeAI(key);
        setGenAI(instance);
        setIsApiKeyValid(true); 
        return instance;
    } catch (error) {
        console.error("Error initializing GoogleGenerativeAI:", error);
        setGenAI(null);
        setIsApiKeyValid(false);
        toast({
            title: t('toastApiKeyInitErrorTitle'),
            description: error instanceof Error ? error.message : t('toastApiKeyInitErrorDescription'),
            variant: "destructive",
        });
        return null;
    }
  }, [t, toast]);
  
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

  const handleProcess = async () => {
    if (!apiKeyInput.trim()) {
      toast({
        title: t('toastApiKeyMissingTitle'),
        description: t('toastApiKeyMissingDescription'),
        variant: "destructive",
      });
      setProcessing(false);
      return;
    }

    let currentGenAI = genAI;
    if (!currentGenAI || !isApiKeyValid) { 
        currentGenAI = initializeAiSdk(apiKeyInput);
        if (!currentGenAI) { 
            setProcessing(false);
            return;
        }
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

    const model = currentGenAI.getGenerativeModel({ 
      model: "gemini-1.5-flash-latest",
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
      
      const imageFileParts: Part[] = [];
      const promptForOcr = "Extract all text from the following image(s). If there are multiple images, provide the extracted text for each, clearly indicating which text belongs to which file if possible based on the input order.";
      
      for (const file of selectedFiles) {
        currentFileNamesProcessed.push(file.name);
        if (file.type.startsWith("image/")) {
          const part = await fileToGenerativePart(file);
          imageFileParts.push(part);
        } else {
          combinedTextContent += (combinedTextContent ? "\n\n" : "") + `--- START OF FILE: ${file.name} ---\n[Text extraction for ${file.type} files is handled separately or not supported by this image OCR method.]\n--- END OF FILE: ${file.name} ---`;
          toast({
            title: `File type not an image`,
            description: `${file.name} (${file.type}) will be skipped for direct Gemini OCR. Only images are currently supported.`,
            variant: "default"
          });
        }
      }

      if (imageFileParts.length > 0) {
        const partsForOcrRequest: Part[] = [{ text: promptForOcr }, ...imageFileParts];
        
        try {
          console.log("Sending to Gemini for OCR. Parts:", JSON.stringify(partsForOcrRequest, null, 2));
          const result = await model.generateContent({contents: [{role: "user", parts: partsForOcrRequest}]});
          const response = await result.response;
          const extractedTextFromImages = response.text();
          combinedTextContent += (combinedTextContent ? "\n\n" : "") + extractedTextFromImages;
          console.log("Text extracted from images:", extractedTextFromImages);
        } catch (error) {
          console.error("Gemini text extraction error:", error);
          toast({
            title: t('toastOcrErrorTitle'),
            description: error instanceof Error ? error.message : "Failed to extract text using Gemini.",
            variant: "destructive",
          });
           combinedTextContent += (combinedTextContent ? "\n\n" : "") + "[Text extraction from one or more images failed.]";
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
      const summaryPrompt = `Summarize the following text concisely, focusing on the main points and any actionable information. The text might be from one or more documents or manually pasted content. Text: "${combinedTextContent}"`;
      const summaryResultObj = await model.generateContent(summaryPrompt);
      const summaryResponse = await summaryResultObj.response;
      setSummaryResult({ summary: summaryResponse.text() || t('summaryNotAvailable') });

      const enrichmentPrompt = `Based on the following text and the provided keywords, suggest 3-5 additional relevant keywords that would be useful for further analysis or search.
Text: "${combinedTextContent}"
Original Keywords: ${userKeywordsArray.join(", ")}
Suggested Keywords (provide a comma-separated list, only the list itself):`;
      const enrichmentResultObj = await model.generateContent(enrichmentPrompt);
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
      setGenAI(null); 
      setIsApiKeyValid(false);
      toast({
        title: t('toastApiKeyInitErrorTitle'),
        description: error instanceof Error ? error.message : t('toastInsightGenerationErrorDescription'),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveReportToFirestore = async (reportData: any) => {
    toast({ title: t('toastSavingTitle'), description: t('toastSavingDescription') });

    let appInstance = firebaseApp;
    let dbInstance = firestore;

    if (!appInstance || !dbInstance) {
      const firebaseConfigValues = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      if (!firebaseConfigValues.apiKey || !firebaseConfigValues.projectId ||
          firebaseConfigValues.apiKey === "YOUR_FIREBASE_API_KEY_HERE" || // Check against placeholder
          firebaseConfigValues.projectId === "YOUR_FIREBASE_PROJECT_ID_HERE") {
        console.error("Firebase config is missing or uses placeholder values in environment variables.");
        toast({
          title: t('toastFirebaseConfigMissingTitle'),
          description: t('toastFirebaseConfigMissingDescription'),
          variant: "destructive",
        });
        return;
      }

      try {
        appInstance = initializeApp(firebaseConfigValues);
        dbInstance = getFirestore(appInstance);
        setFirebaseApp(appInstance);
        setFirestore(dbInstance);
      } catch (error) {
        console.error("Error initializing Firebase:", error);
        toast({
          title: t('toastSaveErrorTitle'),
          description: error instanceof Error ? error.message : t('toastFirebaseConfigMissingDescription'),
          variant: "destructive",
        });
        return;
      }
    }

    if (!dbInstance) {
        toast({ title: t('toastSaveErrorTitle'), description: "Firestore not initialized.", variant: "destructive" });
        return;
    }

    try {
      await addDoc(collection(dbInstance, "reports"), {
        ...reportData,
        createdAt: serverTimestamp(),
      });
      toast({ title: t('toastSaveSuccessTitle'), description: t('toastSaveSuccessDescription') });
    } catch (error) {
      console.error("Error saving to Firestore:", error);
      toast({
        title: t('toastSaveErrorTitle'),
        description: error instanceof Error ? error.message : "Failed to save report to Firestore.",
        variant: "destructive",
      });
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
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center">
                <ApiKeyIcon className="mr-2 h-6 w-6 text-primary" /> {t('apiKeyCardTitle')}
              </CardTitle>
              <CardDescription>{t('apiKeyCardDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="gemini-api-key-input" className="font-medium">{t('apiKeyLabel')}</Label>
              <Input
                id="gemini-api-key-input"
                type="password"
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setIsApiKeyValid(null); 
                  if (e.target.value.trim()) {
                    initializeAiSdk(e.target.value);
                  } else {
                    setGenAI(null);
                  }
                }}
                placeholder={t('apiKeyPlaceholder')}
                className="mt-1"
                aria-describedby="api-key-status"
              />
              {apiKeyInput && isApiKeyValid === false && (
                 <p id="api-key-status" className="mt-1 text-sm text-destructive">{t('toastApiKeyInitErrorDescription')}</p>
              )}
               {apiKeyInput && isApiKeyValid === true && (
                 <p id="api-key-status" className="mt-1 text-sm text-green-600">{t('apiKeyAccepted')}</p>
              )}
            </CardContent>
          </Card>

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
              disabled={processing || !apiKeyInput.trim() || !isApiKeyValid || (!manualText.trim() && selectedFiles.length === 0) || userKeywordsArray.length === 0}
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
            {!apiKeyInput.trim() && (
              <p className="text-destructive text-sm mt-2">
                {t('toastApiKeyMissingDescription')}
              </p>
            )}
             {apiKeyInput.trim() && isApiKeyValid === false && (
              <p className="text-destructive text-sm mt-2">
                {t('toastApiKeyInitErrorDescription')}
              </p>
            )}
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
