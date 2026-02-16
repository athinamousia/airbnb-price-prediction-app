'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    HomeIcon,
    ChartBarIcon,
    SparklesIcon,
    Cog6ToothIcon,
    ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline'

interface SidebarItemProps {
    href: string
    icon: ReactNode
    label: string
}

function SidebarItem({ href, icon, label }: SidebarItemProps) {
    const pathname = usePathname()
    const isActive = pathname === href

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
        >
            <div className="h-5 w-5">{icon}</div>
            <span className="text-sm">{label}</span>
        </Link>
    )
}

export default function Sidebar() {
    return (
        <aside className="w-64 border-r border-gray-200 bg-white p-4">
            <div className="space-y-1">
                <SidebarItem
                    href="/"
                    icon={<HomeIcon />}
                    label="Dashboard"
                />
                <SidebarItem
                    href="/predict"
                    icon={<SparklesIcon />}
                    label="Price Prediction"
                />
                <SidebarItem
                    href="/analytics"
                    icon={<ChartBarIcon />}
                    label="Analytics"
                />
            </div>

            <div className="mt-8 border-t border-gray-200 pt-4">
                <div className="space-y-1">
                    <SidebarItem
                        href="/settings"
                        icon={<Cog6ToothIcon />}
                        label="Settings"
                    />
                    <SidebarItem
                        href="/logout"
                        icon={<ArrowLeftOnRectangleIcon />}
                        label="Logout"
                    />
                </div>
            </div>
        </aside>
    )
}
