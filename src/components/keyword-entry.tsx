
"use client";

import type React from 'react';
// import { useTranslation } from 'react-i18next'; // Removed i18n
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search } from 'lucide-react';

interface KeywordEntryProps {
  keywords: string;
  setKeywords: (keywords: string) => void;
}

export function KeywordEntry({ keywords, setKeywords }: KeywordEntryProps) {
  // const { t } = useTranslation(); // Removed i18n

  const handleKeywordChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setKeywords(event.target.value);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <Search className="mr-2 h-6 w-6 text-primary" /> Define Keywords {/* Hardcoded English */}
        </CardTitle>
        <CardDescription>Enter keywords to search for in the text, separated by commas.</CardDescription> {/* Hardcoded English */}
      </CardHeader>
      <CardContent>
        <Label htmlFor="keywords-input" className="sr-only">Keywords</Label> {/* Hardcoded English */}
        <Textarea 
          id="keywords-input"
          value={keywords} 
          onChange={handleKeywordChange} 
          rows={3} 
          placeholder="e.g., invoice, payment, due date, project alpha" /* Hardcoded English */
          className="mt-1"
          aria-label="Enter keywords separated by commas" /* Hardcoded English */
        />
      </CardContent>
    </Card>
  );
}
