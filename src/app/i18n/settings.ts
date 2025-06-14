
export const fallbackLng = 'pt_br';
export const languages = [fallbackLng];
export const defaultNS = 'common';

interface Options {
  lng?: string;
  ns?: string | string[];
  debug?: boolean;
  load?: 'all' | 'currentOnly' | 'languageOnly' | 'unspecific';
  initImmediate?: boolean; // Added for explicit control
  // Add other i18next options as needed
  [key: string]: any;
}

export function getOptions(lng: string = fallbackLng, ns: string | string[] = defaultNS): Options {
  return {
    debug: true, // Keep debug enabled to see i18next logs
    lng,
    // fallbackLng: fallbackLng, // Removed from direct init options
    ns,
    defaultNS,
    load: 'currentOnly', // Load only the current language
    initImmediate: false, // Explicitly set to false
  };
}

