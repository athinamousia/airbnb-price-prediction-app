'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { SiGoogleanalytics } from 'react-icons/si'

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
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all border-l-2 ${isActive
                    ? 'border-[#F29F67] bg-[#F29F67]/10 text-[#F29F67]'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-[#1E1E2C]'
                }`}
        >
            <div className="h-5 w-5 shrink-0">{icon}</div>
            <span>{label}</span>
        </Link>
    )
}

export default function Sidebar() {
    return (
        <aside className="flex w-60 min-h-screen flex-col border-r border-gray-100 bg-white p-4">
            {/* Brand */}
            <div className="mb-8 px-2 pt-2">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F29F67]">
                        <span className="text-sm font-extrabold text-white">A</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold leading-none text-[#1E1E2C]">AirbnbInsights</p>
                        <p className="mt-0.5 text-[10px] text-gray-400">Athens Analytics</p>
                    </div>
                </div>
            </div>

            <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-widest text-gray-400">
                Navigation
            </p>
            <div className="space-y-1">
                <SidebarItem href="/" icon={<SiGoogleanalytics />} label="Analytics" />
                <SidebarItem href="/predict" icon={<SparklesIcon />} label="Price Prediction" />
            </div>
        </aside>
    )
}
