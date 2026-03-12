'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    SparklesIcon,
} from '@heroicons/react/24/outline'
import { SiGoogleanalytics } from "react-icons/si";

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
        <aside className="w-64 border-r border-gray-200 bg-slate-200 p-4">
            <div className="space-y-1">
                <SidebarItem
                    href="/"
                    icon={<SiGoogleanalytics />}
                    label="Analytics"
                />
                <SidebarItem
                    href="/predict"
                    icon={<SparklesIcon />}
                    label="Price Prediction"
                />

            </div>

        </aside>
    )
}
