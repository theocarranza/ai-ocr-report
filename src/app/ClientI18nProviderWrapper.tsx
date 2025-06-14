
'use client';

import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import type { i18n as I18nInstanceType } from 'i18next';

interface ClientI18nProviderWrapperProps {
  children: ReactNode;
  i18n: I18nInstanceType;
}

export default function ClientI18nProviderWrapper({
  children,
  i18n,
}: ClientI18nProviderWrapperProps) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
