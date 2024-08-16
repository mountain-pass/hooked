import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // https://tailwindcss.com/docs/screens
    // extend: {
    //   screens: {
          // "2xl": "1280px"
    //   }
    // }
    // screens: {
    //   // 'xsss': {'min': '0', 'max': '160px'},
    //   // // => @media (min-width: 640px and max-width: 767px) { ... }
    //   // 'xss': {'min': '161', 'max': '320px'},
    //   // // => @media (min-width: 640px and max-width: 767px) { ... }
    //   'xs': {'min': '0', 'max': '640px'},
    //   // => @media (min-width: 640px and max-width: 767px) { ... }
    //   'sm': {'min': '641px', 'max': '767px'},
    //   // => @media (min-width: 640px and max-width: 767px) { ... }
    //   'md': {'min': '768px', 'max': '1023px'},
    //   // => @media (min-width: 768px and max-width: 1023px) { ... }
    //   'lg': {'min': '1024px', 'max': '1279px'},
    //   // => @media (min-width: 1024px and max-width: 1279px) { ... }
    //   'xl': {'min': '1280px', 'max': '1800px'},
    //   // => @media (min-width: 1280px and max-width: 1535px) { ... }
    //   '2xl': {'min': '1801px'},
    //   // => @media (min-width: 1536px) { ... }
    // },
    // extend: {
    // },
  },
  plugins: [],
};
export default config;
