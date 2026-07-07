export type AppSettings = {
  manifestUrl: string;
  providerTimeoutMs: number;
  runTimeoutMs: number;
  tmdbApiKeyMode: "server" | "client";
  tmdbApiKeyClient?: string;
};
