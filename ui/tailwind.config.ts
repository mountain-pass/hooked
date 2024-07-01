import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        "modal-hide": "modal-hide 2s linear",
        "modal-show": "modal-show 2s linear",
        

      },
      keyframes: {
        "modal-hide": {
          '0%': { 
            opacity: '1',
          },
          '100%': {
            opacity: '0',
            display: 'none',
          }
        },
        "modal-show": {
          '0%': { 
            display: 'block',
            opacity: '0',
          },
          '100%': {
            opacity: '1'
          }
        }
      }
    },
  },
  plugins: [],
};
export default config;
