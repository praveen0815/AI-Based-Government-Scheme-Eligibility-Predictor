declare module "node:url" {
  export function fileURLToPath(path: URL | string): string;
}

interface ImportMeta {
  readonly url: string;
}

declare class URL {
  constructor(url: string | URL, base?: string | URL);
}
