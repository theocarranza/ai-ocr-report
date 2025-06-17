
import type { ReactNode } from 'react';
import { createInstance, type i18n as I18nInstanceType } from 'i18next';
import { getOptions } from './i18n/settings';
import ClientI18nProviderWrapper from './ClientI18nProviderWrapper';

export async function initI18nextServerInstance(
  locale: string,
  ns: string | string[]
): Promise<I18nInstanceType> {
  const i18nInstance = createInstance();
  const currentNamespace = Array.isArray(ns) ? ns[0] : ns;

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
    console.error(`Failed to load server translation file for ${locale}/${currentNamespace}:`, e);
    // Initialize with empty resources or a minimal fallback if loading fails
    loadedResources = {
      [locale]: {
        [currentNamespace]: { appTitle: "Error Loading Server Translations" },
      },
    };
  }

  await i18nInstance
    .init({
      ...getOptions(locale, ns), // Common options: debug, ns, defaultNS, fallbackLng, load, initImmediate, react.useSuspense
      lng: locale, // Explicitly set language
      resources: loadedResources, // Provide resources for server-side rendering
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
  // Initialize i18next instance for server-side usage (e.g. if we needed to translate here)
  const i18nServerInstance = await initI18nextServerInstance(
    locale,
    getOptions(locale).defaultNS || 'common'
  );

  // Extract the necessary data for client-side hydration
  // i18nServerInstance.store.data contains all loaded resources {lng: {ns: {key: value}}}
  const initialI18nStore = i18nServerInstance.store.data; 
  const initialLanguage = i18nServerInstance.language; // This should be the same as `locale`

  return (
    <ClientI18nProviderWrapper
      locale={initialLanguage} 
      initialI18nStore={initialI18nStore}
    >
      {children}
    </ClientI18nProviderWrapper>
  );
}
