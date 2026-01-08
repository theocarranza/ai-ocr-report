
"use client";

import type React from 'react';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Label can be used for the main card, not the custom input label
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadCloud, FileText, XCircle, Wand2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from './ui/dialog';
import Image from 'next/image';
import { enhanceImage } from '@/ai/flows/enhance-image-flow';
import { useToast } from '@/hooks/use-toast';

interface FileInputAreaProps {
  selectedFiles: File[];
  setSelectedFiles: (files: File[] | ((prev: File[]) => File[])) => void;
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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("file-upload");
  const { toast } = useToast();
  
  const [isEnhanceDialogOpen, setIsEnhanceDialogOpen] = useState(false);
  const [enhancementPrompt, setEnhancementPrompt] = useState("");
  const [imageToEnhance, setImageToEnhance] = useState<{file: File, dataUrl: string} | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);


  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setSelectedFiles(newFiles);
    }
  }, [setSelectedFiles]);

  const handleRemoveFile = (fileName: string) => {
    setSelectedFiles(files => files.filter(file => file.name !== fileName));
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

  const openEnhanceDialog = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageToEnhance({ file, dataUrl: e.target?.result as string });
      setIsEnhanceDialogOpen(true);
      setEnhancedImage(null);
      setEnhancementPrompt("");
    };
    reader.readAsDataURL(file);
  };

  const handleEnhanceImage = async () => {
    if (!imageToEnhance || !enhancementPrompt) return;
    
    setIsEnhancing(true);
    setEnhancedImage(null);
    try {
      const result = await enhanceImage({
        photoDataUri: imageToEnhance.dataUrl,
        prompt: enhancementPrompt,
      });
      setEnhancedImage(result.enhancedPhotoDataUri);
    } catch (error) {
      console.error("Image enhancement error:", error);
      toast({
        title: "Enhancement Failed",
        description: error instanceof Error ? error.message : "Could not enhance the image.",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
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

  const handleReplaceImage = () => {
    if (!enhancedImage || !imageToEnhance) return;
    
    const newFileName = `enhanced_${imageToEnhance.file.name}`;
    const newFile = dataURLtoFile(enhancedImage, newFileName);

    setSelectedFiles(prevFiles => 
      prevFiles.map(f => f.name === imageToEnhance.file.name ? newFile : f)
    );
    
    setIsEnhanceDialogOpen(false);
    setImageToEnhance(null);
    setEnhancedImage(null);
    
    toast({
      title: "Image Replaced",
      description: `${imageToEnhance.file.name} has been replaced with the enhanced version.`,
    });
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <UploadCloud className="mr-2 h-6 w-6 text-primary" /> {t('fileInputAreaCardTitle')}
          </CardTitle>
          <CardDescription>{t('fileInputAreaCardDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file-upload">{t('fileUploadTab')}</TabsTrigger>
              <TabsTrigger value="paste-text">{t('pasteTextTab')}</TabsTrigger>
            </TabsList>
            <TabsContent value="file-upload">
              <div className="mt-4">
                <Input 
                  id="file-upload-input" 
                  type="file" 
                  multiple 
                  accept="image/*,application/pdf"
                  onChange={handleFileChange} 
                  className="hidden" // Visually hide the actual file input
                  aria-describedby="file-upload-description"
                />
                {/* Custom styled visible area */}
                <div className="flex items-center h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <label
                    htmlFor="file-upload-input"
                    className="cursor-pointer mr-4 px-4 py-1.5 rounded-full text-sm font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors whitespace-nowrap"
                  >
                    {t('chooseFilesButton')}
                  </label>
                  <span className="text-muted-foreground truncate">
                    {selectedFiles.length === 0
                      ? t('noFileChosenText')
                      : selectedFiles.map(f => f.name).join(', ')
                    }
                  </span>
                </div>
                <p id="file-upload-description" className="mt-1 text-sm text-muted-foreground">
                  {t('fileUploadDescription')}
                </p>
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h3 className="text-sm font-medium">{t('selectedFilesLabel')}</h3>
                    <ul className="max-h-40 overflow-y-auto rounded-md border p-2">
                      {selectedFiles.map(file => (
                        <li key={file.name} className="flex items-center justify-between p-1 hover:bg-muted rounded">
                          <div className="flex items-center space-x-2 truncate">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate">{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                          </div>
                          <div className="flex items-center flex-shrink-0">
                            {file.type.startsWith("image/") && (
                               <Button variant="ghost" size="sm" onClick={() => openEnhanceDialog(file)} aria-label={`Enhance ${file.name}`}>
                                <Wand2 className="h-4 w-4 text-primary" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(file.name)} aria-label={t('removeFileAriaLabel', { fileName: file.name })}>
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="paste-text">
              <div className="mt-4">
                <Label htmlFor="manual-text-input" className="font-medium">{t('pasteTextLabel')}</Label>
                <Textarea 
                  id="manual-text-input"
                  value={manualText} 
                  onChange={handleManualTextChange} 
                  rows={8} 
                  placeholder={t('pasteTextPlaceholder')}
                  className="mt-2"
                  aria-label={t('pasteTextAriaLabel')}
                />
              </div>
            </TabsContent>
          </Tabs>
          {(selectedFiles.length > 0 || manualText) && (
              <Button onClick={clearAllInputs} variant="outline" className="mt-4 w-full md:w-auto">
                  <XCircle className="mr-2 h-4 w-4" /> {t('clearInputsButton')}
              </Button>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isEnhanceDialogOpen} onOpenChange={setIsEnhanceDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Enhance Image</DialogTitle>
            <DialogDescription>
              Describe how you want to change the image. The original will be on the left, the enhanced version on the right.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
              <Label>Original Image</Label>
              {imageToEnhance && <Image src={imageToEnhance.dataUrl} alt="Original" width={350} height={350} className="rounded-md border object-contain" />}
            </div>
            <div>
              <Label>Enhanced Image</Label>
              <div className="w-[350px] h-[350px] rounded-md border flex items-center justify-center bg-muted/50">
                {isEnhancing ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                ) : enhancedImage ? (
                  <Image src={enhancedImage} alt="Enhanced" width={350} height={350} className="rounded-md object-contain"/>
                ) : (
                  <p className="text-sm text-muted-foreground">Your enhanced image will appear here.</p>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="enhancement-prompt">Enhancement Prompt</Label>
            <div className="flex gap-2">
              <Input 
                id="enhancement-prompt"
                value={enhancementPrompt}
                onChange={(e) => setEnhancementPrompt(e.target.value)}
                placeholder="e.g., improve lightning, make it a watercolor painting"
              />
              <Button onClick={handleEnhanceImage} disabled={isEnhancing || !enhancementPrompt}>
                {isEnhancing ? <Loader2 className="h-4 w-4 animate-spin"/> : <Wand2 className="h-4 w-4"/>}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleReplaceImage} disabled={!enhancedImage || isEnhancing}>
              Replace Original with Enhanced
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
