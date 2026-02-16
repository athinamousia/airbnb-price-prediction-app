'use client'

import { ReactNode } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

interface SidebarLayoutProps {
    children: ReactNode
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 overflow-auto p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
