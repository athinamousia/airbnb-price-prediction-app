import type { ReactNode } from 'react'

interface FeatureCardProps {
    title: string
    description: string
    icon?: ReactNode
}

export default function FeatureCard({ title, description, icon }: FeatureCardProps) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
                {icon ? (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        {icon}
                    </div>
                ) : null}
                <div>
                    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{description}</p>
                </div>
            </div>
        </div>
    )
}
