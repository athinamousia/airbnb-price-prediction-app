/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './hooks/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    orange: '#F16122',
                    dark: '#1E1E2C',
                    blue: '#273272',
                    teal: '#F16122',
                    gold: '#F3CB52',
                },
            },
        },
    },
}
