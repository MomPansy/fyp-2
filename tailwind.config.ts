import type { Config } from 'tailwindcss';

import tailwindcssTypography from '@tailwindcss/typography';
import tailwindcssAnimate from 'tailwindcss-animate';
import pluginMantine from '@devoss/tailwind-plugin-mantine';

import { theme } from './src/theme.ts';

const mantineConfigs = pluginMantine(theme).config;

export default {
  content: ['./src/**/*.{ts,tsx}', '../../packages/**/*.{ts,tsx}'],
  plugins: [tailwindcssTypography, tailwindcssAnimate],
  ...mantineConfigs,
} satisfies Config;
