
'use server';

import type { ReactNode } from 'react';
import { createInstance, type i18n as I18nInstanceType } from 'i18next';
// import resourcesToBackend from 'i18next-resources-to-backend'; // Removed
import { getOptions, fallbackLng } from './i18n/settings';
import ClientI18nProviderWrapper from './ClientI18nProviderWrapper';

export async function initI18nextInstance(
  locale: string,
  ns: string | string[]
): Promise<I18nInstanceType> {
  const i18nInstance = createInstance();
  const currentNamespace = Array.isArray(ns) ? ns[0] : ns; // Assuming single namespace 'common'

  let loadedResources = {};
  try {
    // Manually and dynamically import the JSON file
    // The path is relative to this file (src/app/TranslationProvider.tsx)
    // So ../locales/ will point to src/locales/
    const resourceModule = await import(`../locales/${locale}/${currentNamespace}.json`);
    loadedResources = {
      [locale]: {
        // Use .default if the JSON module is wrapped, otherwise use the module itself
        [currentNamespace]: resourceModule.default || resourceModule,
      },
    };
  } catch (e) {
    console.error(`Failed to load translation file for ${locale}/${currentNamespace}:`, e);
    // Initialize with empty resources or a minimal fallback if loading fails
    // This helps in diagnosing if the import path or file is the issue
    loadedResources = {
      [locale]: {
        [currentNamespace]: { appTitle: "Error Loading Translations" },
      },
    };
  }

  await i18nInstance
    // .use(resourcesToBackend(...)) // Removed
    .init({
      ...getOptions(locale, ns),
      resources: loadedResources, // Pass the manually loaded resources
    });
  return i18nInstance;
}

interface TranslationProviderProps {
  children: ReactNode;
  locale: string;
}

export async function TranslationProvider({
  children,
  locale,
}: TranslationProviderProps) {
  const i18nInstance = await initI18nextInstance(
    locale,
    getOptions(locale).defaultNS || 'common'
  );

  return (
    <ClientI18nProviderWrapper i18n={i18nInstance}>
      {children}
    </ClientI18nProviderWrapper>
  );
}
