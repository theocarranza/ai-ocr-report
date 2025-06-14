
"use client";

import type React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, X, History } from 'lucide-react';

interface KeywordEntryProps {
  keywords: string;
  setKeywords: (keywords: string) => void;
  keywordHistory: string[];
  onRemoveKeywordFromHistory: (keyword: string) => void;
  onAddKeywordFromSuggestion: (keyword: string) => void;
}

export function KeywordEntry({ 
  keywords, 
  setKeywords, 
  keywordHistory,
  onRemoveKeywordFromHistory,
  onAddKeywordFromSuggestion 
}: KeywordEntryProps) {
  const { t } = useTranslation();

  const handleKeywordChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setKeywords(event.target.value);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <Search className="mr-2 h-6 w-6 text-primary" /> {t('keywordEntryCardTitle')}
        </CardTitle>
        <CardDescription>{t('keywordEntryCardDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Label htmlFor="keywords-input" className="sr-only">{t('keywordsLabel')}</Label>
        <Textarea 
          id="keywords-input"
          value={keywords} 
          onChange={handleKeywordChange} 
          rows={3} 
          placeholder={t('keywordsPlaceholder')}
          className="mt-1"
          aria-label={t('keywordsAriaLabel')}
        />

        {keywordHistory.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center text-muted-foreground">
              <History className="mr-2 h-4 w-4" />
              {t('keywordHistoryTitle')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {keywordHistory.map((historyKw) => (
                <Badge 
                  key={historyKw} 
                  variant="secondary" 
                  className="py-1 px-2 cursor-pointer group hover:bg-primary/20 transition-colors"
                >
                  <span onClick={() => onAddKeywordFromSuggestion(historyKw)} className="mr-1 group-hover:text-primary">
                    {historyKw}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 ml-1 opacity-50 group-hover:opacity-100 group-hover:text-destructive transition-opacity"
                    onClick={() => onRemoveKeywordFromHistory(historyKw)}
                    aria-label={t('removeKeywordFromHistoryAriaLabel', { keyword: historyKw })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
