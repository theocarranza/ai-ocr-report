
export const fallbackLng = 'pt_br';
export const languages = [fallbackLng];
export const defaultNS = 'common';

interface Options {
  lng?: string;
  ns?: string | string[];
  debug?: boolean;
  load?: 'all' | 'currentOnly' | 'languageOnly' | 'unspecific';
  // Add other i18next options as needed
  [key: string]: any;
}

export function getOptions(lng: string = fallbackLng, ns: string | string[] = defaultNS): Options {
  return {
    debug: true, // Keep debug true for now to help with potential issues
    lng,
    fallbackLng, // This is 'pt_br'
    ns,
    defaultNS,
    load: 'currentOnly', // Explicitly load only the current language
  };
}
