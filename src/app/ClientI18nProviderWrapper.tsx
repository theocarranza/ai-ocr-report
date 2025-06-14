
'use client';

import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { createInstance, type i18n as I18nInstanceType, type Resource } from 'i18next';
import { getOptions } from './i18n/settings';

interface ClientI18nProviderWrapperProps {
  children: ReactNode;
  locale: string;
  initialI18nStore: Resource; // i18next's Resource type: { [lng: string]: { [ns: string]: any } }
}

// Helper to initialize i18next on the client
// This function could potentially cache the instance if locale doesn't change,
// but for simplicity, we create it on each wrapper render.
// Given this wrapper is high in the tree, it typically runs once per page load.
const initClientI18nextInstance = (locale: string, initialI18nStore: Resource): I18nInstanceType => {
  const i18nInstance = createInstance();
  i18nInstance.init({
    ...getOptions(locale), // Get common options (debug, defaultNS, fallbackLng, etc.)
    lng: locale,
    resources: initialI18nStore, // Hydrate with resources from server
    // initImmediate: false, // Default is true. When resources are provided, init is sync.
    // react: { useSuspense: false } is in getOptions
  });
  return i18nInstance;
};

export default function ClientI18nProviderWrapper({
  children,
  locale,
  initialI18nStore,
}: ClientI18nProviderWrapperProps) {
  const i18n = initClientI18nextInstance(locale, initialI18nStore);
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
