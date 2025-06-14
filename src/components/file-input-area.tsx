
"use client";

import type React from 'react';
import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadCloud, FileText, XCircle } from 'lucide-react';
import { Button } from './ui/button';

interface FileInputAreaProps {
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  manualText: string;
  setManualText: (text: string) => void;
  clearAllInputs: () => void;
}

export function FileInputArea({ 
  selectedFiles, 
  setSelectedFiles, 
  manualText, 
  setManualText,
  clearAllInputs
}: FileInputAreaProps) {
  const [activeTab, setActiveTab] = useState("file-upload");

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setSelectedFiles(newFiles);
    }
  }, [setSelectedFiles]);

  const handleRemoveFile = (fileName: string) => {
    setSelectedFiles(selectedFiles.filter(file => file.name !== fileName));
  };
  
  const handleManualTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setManualText(event.target.value);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "file-upload") {
      setManualText("");
    } else {
      setSelectedFiles([]);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <UploadCloud className="mr-2 h-6 w-6 text-primary" /> Input Source
        </CardTitle>
        <CardDescription>Upload image or PDF files for text extraction, or paste text directly.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file-upload">File Upload</TabsTrigger>
            <TabsTrigger value="paste-text">Paste Text</TabsTrigger>
          </TabsList>
          <TabsContent value="file-upload">
            <div className="mt-4">
              <Label htmlFor="file-upload-input" className="sr-only">Upload files</Label>
              <Input 
                id="file-upload-input" 
                type="file" 
                multiple 
                accept="image/*,application/pdf"
                onChange={handleFileChange} 
                className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                aria-describedby="file-upload-description"
              />
              <p id="file-upload-description" className="mt-1 text-sm text-muted-foreground">
                Select one or more image or PDF files. Text will be extracted using AI.
              </p>
              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-medium">Selected Files:</h3>
                  <ul className="max-h-40 overflow-y-auto rounded-md border p-2">
                    {selectedFiles.map(file => (
                      <li key={file.name} className="flex items-center justify-between p-1 hover:bg-muted rounded">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(file.name)} aria-label={`Remove ${file.name}`}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="paste-text">
            <div className="mt-4">
              <Label htmlFor="manual-text-input" className="font-medium">Paste your text here:</Label>
              <Textarea 
                id="manual-text-input"
                value={manualText} 
                onChange={handleManualTextChange} 
                rows={8} 
                placeholder="Enter or paste text content..."
                className="mt-2"
                aria-label="Paste text content"
              />
            </div>
          </TabsContent>
        </Tabs>
        {(selectedFiles.length > 0 || manualText) && (
            <Button onClick={clearAllInputs} variant="outline" className="mt-4 w-full md:w-auto">
                <XCircle className="mr-2 h-4 w-4" /> Clear Inputs
            </Button>
        )}
      </CardContent>
    </Card>
  );
}
