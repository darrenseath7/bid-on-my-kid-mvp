import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#191421',
        zesty: '#ff7a1a',
        berry: '#9b2c77',
        cream: '#fff7e8'
      }
    }
  },
  plugins: []
};
export default config;
