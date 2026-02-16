'use client'

import { useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface DropdownProps {
    label?: string
    items: {
        label: string
        onClick: () => void
    }[]
}

export default function Dropdown({ label = 'Menu', items }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="relative inline-block text-left">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none"
            >
                <span>{label}</span>
                <ChevronDownIcon className="h-4 w-4" />
            </button>

            {isOpen && (
                <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                    {items.map((item, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                item.onClick()
                                setIsOpen(false)
                            }}
                            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
