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
                    orange: '#F29F67',
                    dark: '#1E1E2C',
                    blue: '#3B8FF3',
                    teal: '#34B1AA',
                    gold: '#E0B50F',
                },
            },
        },
    },
}
