import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://omnyist.productions',
  fonts: [
    {
      name: 'Geist',
      cssVariable: '--font-geist',
      provider: fontProviders.fontsource(),
      weights: ['100 900'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif']
    }
  ]
});
