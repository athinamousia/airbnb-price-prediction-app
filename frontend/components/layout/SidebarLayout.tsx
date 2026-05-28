'use client'

import { ReactNode } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

interface SidebarLayoutProps {
    children: ReactNode
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
    return (
        <div className="flex min-h-screen bg-[#F4F5F7]">
            <Sidebar />
            <div className="flex flex-1 flex-col">
                <Navbar />
                <main className="flex-1 overflow-auto p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
