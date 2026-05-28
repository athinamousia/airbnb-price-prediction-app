import type { ReactNode } from 'react'

interface FeatureCardProps {
    title: string
    description: string
    icon?: ReactNode
    accent?: string
}

export default function FeatureCard({ title, description, icon, accent = '#F29F67' }: FeatureCardProps) {
    return (
        <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        {title}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#1E1E2C]">{description}</p>
                </div>
                {icon && (
                    <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${accent}1A`, color: accent }}
                    >
                        {icon}
                    </div>
                )}
            </div>
            {/* Accent bottom bar */}
            <div
                className="absolute bottom-0 left-0 h-1 w-full"
                style={{ backgroundColor: accent }}
            />
        </div>
    )
}
