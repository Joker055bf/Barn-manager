/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./utils/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
        "./constants/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Tajawal', 'sans-serif'],
            },
            colors: {
                // Brand brown — replaces the repeated literal hexes with identical values.
                brand: {
                    300: '#A1887F',
                    400: '#8D6E63',
                    500: '#795548',
                    600: '#765341',
                    700: '#5D4037',
                    800: '#4E342E',
                    900: '#3E2723',
                },
                // Warm paper surfaces.
                paper: {
                    DEFAULT: '#FCFBF4',
                    tint: '#F4F0EA',
                    edge: '#E0D9D0',
                },
            },
        },
    },
    plugins: [],
}
