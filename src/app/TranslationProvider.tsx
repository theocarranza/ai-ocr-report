
'use server';

import type { ReactNode } from 'react';
import { createInstance, type i18n as I18nInstanceType } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
// import { initReactI18next } from 'react-i18next/initReactI18next'; // No longer needed here
import { getOptions } from './i18n/settings';
import ClientI18nProviderWrapper from './ClientI18nProviderWrapper';

export async function initI18nextInstance(
  locale: string,
  ns: string | string[]
): Promise<I18nInstanceType> {
  const i18nInstance = createInstance();
  await i18nInstance
    .use(
      resourcesToBackend(
        (language: string, namespace: string) =>
          import(`../locales/${language}/${namespace}.json`)
      )
    )
    // .use(initReactI18next) // Removed, I18nextProvider handles React integration
    .init(getOptions(locale, ns));
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
    getOptions().defaultNS || 'common' // Pass defaultNS or 'common'
  );

  return (
    <ClientI18nProviderWrapper i18n={i18nInstance}>
      {children}
    </ClientI18nProviderWrapper>
  );
}
