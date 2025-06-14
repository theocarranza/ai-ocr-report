
"use client";

import type React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search } from 'lucide-react';

interface KeywordEntryProps {
  keywords: string;
  setKeywords: (keywords: string) => void;
}

export function KeywordEntry({ keywords, setKeywords }: KeywordEntryProps) {
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
      </CardContent>
    </Card>
  );
}
