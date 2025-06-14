
export const fallbackLng = 'pt_br';
export const languages = [fallbackLng]; // Only 'pt_br'
export const defaultNS = 'common';

interface Options {
  lng?: string;
  ns?: string | string[];
  debug?: boolean;
  load?: 'all' | 'currentOnly' | 'languageOnly' | 'unspecific';
  fallbackLng?: string | string[] | false; // Added false as an option
  initImmediate?: boolean;
  react?: {
    useSuspense?: boolean;
  };
  [key: string]: any;
}

export function getOptions(lng: string = fallbackLng, ns: string | string[] = defaultNS): Options {
  return {
    debug: true, // Re-enable debug for more detailed logs
    lng,
    ns,
    defaultNS,
    fallbackLng: false, // Explicitly disable fallback language
    load: 'currentOnly',
    initImmediate: false, // Keep this false
    react: {
      useSuspense: false, // Keep suspense disabled
    },
  };
}
