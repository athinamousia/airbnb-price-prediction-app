'use client'

import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
    '/': { title: 'Analytics Dashboard', subtitle: 'KPIs, price trends and property insights' },
    '/predict': { title: 'Price Prediction', subtitle: 'Estimate nightly price from listing attributes' },
}

export default function Navbar() {
    const pathname = usePathname()
    const page = PAGE_TITLES[pathname] ?? { title: 'Dashboard', subtitle: '' }

    return (
        <nav className="border-b border-gray-100 bg-white px-8 py-4">
            <h1 className="text-base font-bold text-[#1E1E2C]">{page.title}</h1>
            {page.subtitle && (
                <p className="mt-0.5 text-xs text-gray-400">{page.subtitle}</p>
            )}
        </nav>
    )
}
