'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Dropdown from './Dropdown'

export default function Navbar() {
    const pathname = usePathname()

    const navItems = [
        { label: 'Dashboard', href: '/' },
        { label: 'Predictions', href: '/predict' },
        { label: 'Analytics', href: '/analytics' },
    ]

    return (
        <nav className="border-b border-gray-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <Link href="/" className="text-lg font-bold text-gray-900">
                    🏠 Airbnb Price Prediction
                </Link>

                <div className="flex items-center gap-8">
                    <div className="hidden gap-6 md:flex">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`text-sm font-medium transition ${pathname === item.href
                                        ? 'text-blue-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <Dropdown
                        label="Menu"
                        items={[
                            { label: 'Profile', onClick: () => { } },
                            { label: 'Settings', onClick: () => { } },
                            { label: 'Logout', onClick: () => { } },
                        ]}
                    />
                </div>
            </div>
        </nav>
    )
}
