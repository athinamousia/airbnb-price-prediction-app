'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
    const pathname = usePathname()

    const navItems = [
        { label: 'Analytics', href: '/' },
        { label: 'Predictions', href: '/predict' }, ,
    ]

    return (
        <nav className="border-b border-gray-200 bg-slate-900 text-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <Link href="/" className="text-lg font-bold text-white">
                    Airbnb Price Analysis
                </Link>
            </div>
        </nav>
    )
}
