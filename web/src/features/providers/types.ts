export type Manifest = {
  name: string;
  version: string;
  scrapers: ManifestScraper[];
};

export type ManifestScraper = {
  id: string;
  name: string;
  description?: string;
  version?: string;
  author?: string;
  supportedTypes: Array<"movie" | "tv" | string>;
  filename: string;
  enabled: boolean;
  limited?: boolean;
  formats?: string[];
  logo?: string;
  contentLanguage?: string[];
  disabledPlatforms?: string[];
  supportsExternalPlayer?: boolean;
  notes?: string;
};

export type ProviderToggleMap = Record<string, boolean>;
