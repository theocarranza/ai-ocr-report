
"use client";

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Database, CheckCircle, Info, ListChecks, FileJson, Search, KeyRound } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SummarizeFileContentOutput } from '@/ai/flows/summarize-file-content';
import type { EnrichKeywordsOutput } from '@/ai/flows/keyword-enrichment';

interface ResultsDisplayProps {
  summary: SummarizeFileContentOutput | null;
  enrichedKeywords: EnrichKeywordsOutput | null;
  keywordValueMap?: Array<{ keyword: string; value: string }> | null;
  userKeywords: string[];
  foundKeywordsInText: string[];
  fullExtractedText: string;
  source: string;
  filesProcessed?: string[];
}

export function ResultsDisplay({ 
  summary, 
  enrichedKeywords,
  keywordValueMap,
  userKeywords,
  foundKeywordsInText,
  fullExtractedText,
  source,
  filesProcessed
}: ResultsDisplayProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const fullExtractedTextArray = fullExtractedText.split('\\n').filter(line => line.trim() !== '');

  const generatedJson = {
    source,
    ...(filesProcessed && filesProcessed.length > 0 && { files_processed: filesProcessed }),
    full_extracted_text: fullExtractedTextArray,
    summary: summary?.summary || t('summaryNotAvailable'),
    user_keywords: userKeywords,
    keywords_found_in_text: foundKeywordsInText,
    suggested_keywords_for_enrichment: enrichedKeywords?.suggestedKeywords || [],
    keyword_value_map: keywordValueMap || [],
  };

  const handleDownloadJson = () => {
    const jsonString = JSON.stringify(generatedJson, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "file_insights_output.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: t('toastJsonExportedTitle'),
      description: t('toastJsonExportedDescription'),
      variant: "default",
    });
  };

  const handleSaveToFirebase = () => {
    toast({
      title: t('toastFeatureNotImplementedTitle'),
      description: t('toastFeatureNotImplementedDescription'),
      variant: "default",
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <CheckCircle className="mr-2 h-6 w-6 text-green-500" /> {t('resultsDisplayCardTitle')}
        </CardTitle>
        <CardDescription>{t('resultsDisplayCardDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {summary?.summary && (
          <div>
            <h3 className="font-semibold text-lg flex items-center mb-2"><Info className="mr-2 h-5 w-5 text-primary" />{t('summaryTitle')}</h3>
            <ScrollArea className="h-32 rounded-md border p-3 bg-muted/50">
              <p className="text-sm">{summary.summary}</p>
            </ScrollArea>
          </div>
        )}
        
        <div>
            <h3 className="font-semibold text-lg flex items-center mb-2"><Search className="mr-2 h-5 w-5 text-primary" />{t('keywordAnalysisTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 className="font-medium text-md mb-1">{t('yourKeywordsTitle')}</h4>
                    {userKeywords.length > 0 ? (
                        <ul className="list-disc list-inside pl-2 text-sm space-y-1">
                        {userKeywords.map(kw => <li key={kw}>{kw}</li>)}
                        </ul>
                    ) : <p className="text-sm text-muted-foreground">{t('noKeywordsProvided')}</p>}
                </div>
                <div>
                    <h4 className="font-medium text-md mb-1">{t('keywordsFoundInTextTitle')}</h4>
                    {foundKeywordsInText.length > 0 ? (
                        <ul className="list-disc list-inside pl-2 text-sm space-y-1">
                        {foundKeywordsInText.map(kw => <li key={kw} className="text-green-600 dark:text-green-400 font-medium">{kw}</li>)}
                        </ul>
                    ) : <p className="text-sm text-muted-foreground">{t('noKeywordsFound')}</p>}
                </div>
            </div>
        </div>

        {enrichedKeywords?.suggestedKeywords && enrichedKeywords.suggestedKeywords.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg flex items-center mb-2"><ListChecks className="mr-2 h-5 w-5 text-primary" />{t('suggestedKeywordsTitle')}</h3>
             <ScrollArea className="h-32 rounded-md border p-3 bg-muted/50">
                <ul className="list-disc list-inside pl-2 text-sm space-y-1">
                {enrichedKeywords.suggestedKeywords.map(keyword => (
                    <li key={keyword}>{keyword}</li>
                ))}
                </ul>
            </ScrollArea>
          </div>
        )}

        {keywordValueMap && keywordValueMap.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg flex items-center mb-2"><KeyRound className="mr-2 h-5 w-5 text-primary" />{t('keywordValueMapTitle')}</h3>
            <ScrollArea className="h-40 rounded-md border p-3 bg-muted/50">
              <ul className="list-disc list-inside pl-2 text-sm space-y-1">
                {keywordValueMap.map((item, index) => (
                    <li key={`${item.keyword}-${index}`}>
                      <span className="font-medium">{item.keyword}:</span> {item.value}
                    </li>
                  ))}
              </ul>
            </ScrollArea>
          </div>
        )}

        <div>
            <h3 className="font-semibold text-lg flex items-center mb-2"><FileJson className="mr-2 h-5 w-5 text-primary" />{t('structuredJsonOutputTitle')}</h3>
            <ScrollArea className="h-60 rounded-md border p-3 bg-muted/20 dark:bg-muted/50">
              <pre className="text-xs whitespace-pre-wrap break-all font-code">
                {JSON.stringify(generatedJson, null, 2)}
              </pre>
            </ScrollArea>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
          <Button onClick={handleDownloadJson} className="w-full sm:w-auto bg-accent hover:bg-accent/90">
            <Download className="mr-2 h-4 w-4" /> {t('downloadJsonButton')}
          </Button>
          <Button onClick={handleSaveToFirebase} variant="outline" className="w-full sm:w-auto">
            <Database className="mr-2 h-4 w-4" /> {t('saveToFirebaseButton')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
