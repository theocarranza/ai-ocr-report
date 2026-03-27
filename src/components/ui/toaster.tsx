
"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastCopy,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts, toast } = useToast()

  const handleCopy = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied!", description: "Error message copied to clipboard." });
      } else {
        throw new Error("Clipboard API not available");
      }
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          toast({ title: "Copied!", description: "Error message copied to clipboard." });
        } else {
          throw new Error("Copy command unsuccessful");
        }
      } catch (fallbackErr) {
        console.error("Copy failed", fallbackErr);
        toast({ 
          title: "Copy Failed", 
          description: "Clipboard access is restricted. Please manually select and copy the text.",
          variant: "destructive"
        });
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, copyText, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            {copyText && (
              <ToastCopy 
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(copyText);
                }}
                aria-label="Copy error message"
              />
            )}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
