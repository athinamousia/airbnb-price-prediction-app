'use client'

import {
    Bar, BarChart, CartesianGrid, Cell, Legend,
    Pie, PieChart,
    ResponsiveContainer, Scatter, ScatterChart,
    Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import type { AvailabilityAnalytics } from '@/types/dashboard'

function DarkTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg bg-[#1E1E2C] px-3 py-2 text-xs text-white shadow-xl">
            {label && <p className="mb-1 font-medium text-gray-300">{label}</p>}
            {payload.map((p: any) => (
                <p key={p.dataKey ?? p.name} style={{ color: p.fill ?? p.color ?? '#3B8FF3' }}>
                    {p.name}: <strong>{p.value}</strong>
                </p>
            ))}
        </div>
    )
}

const WINDOW_COLORS = {
    availability_30: '#3B8FF3',
    availability_60: '#F29F67',
    availability_90: '#34B1AA',
    availability_365: '#A78BFA',
}

export default function AvailabilitySection({ data, loading, instantBookablePct }: { data: AvailabilityAnalytics | null; loading: boolean; instantBookablePct?: number }) {
    const instantPieData = [
        { name: 'Instant Book', value: instantBookablePct ?? 0 },
        { name: 'Request to Book', value: parseFloat((100 - (instantBookablePct ?? 0)).toFixed(1)) },
    ]
    const INSTANT_COLORS = ['#34B1AA', '#E5E7EB']

    const funnelData = (data?.avg_availability ?? []).map(w => ({
        window: w.window,
        'Avg Available Days': w.avg_available_days,
        'Avg Occupied Days': w.max_days - w.avg_available_days,
    }))

    const roomTypeData = data?.availability_by_room_type ?? []

    return (
        <section className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                Availability &amp; Demand
            </p>

            {/* Instant Bookable pie */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1E1E2C]">Instant Bookable</p>
                    <p className="mt-1 mb-2 text-3xl font-bold text-[#1E1E2C]">{instantBookablePct ?? 0}%</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={instantPieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                                outerRadius={80} innerRadius={46} strokeWidth={0}>
                                {instantPieData.map((entry, i) => (
                                    <Cell key={entry.name} fill={INSTANT_COLORS[i % INSTANT_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<DarkTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-5 text-xs text-gray-700">
                        {instantPieData.map((entry, i) => (
                            <span key={entry.name} className="flex items-center gap-1.5">
                                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: INSTANT_COLORS[i] }} />
                                {entry.name}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Row 1: Availability funnel + Occupancy by neighbourhood */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Availability funnel — available vs occupied days per window */}
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Availability Windows (Avg Days)
                    </p>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={funnelData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                            <XAxis dataKey="window" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="Avg Available Days" stackId="a" fill="#3B8FF3" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Avg Occupied Days" stackId="a" fill="#F29F67" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Occupancy by neighbourhood (top 15, horizontal bar) */}
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Occupancy Rate by Neighbourhood
                    </p>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                            data={data?.occupancy_by_neighbourhood ?? []}
                            layout="vertical"
                            margin={{ top: 4, right: 16, left: 100, bottom: 4 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" horizontal={false} />
                            <XAxis type="number" tickFormatter={v => `${v}%`}
                                tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="neighbourhood" width={95}
                                tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ background: '#1E1E2C', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                                formatter={(v: any) => [`${v}%`, 'Occupancy']}
                            />
                            <Bar dataKey="occupancy_pct" fill="#34B1AA" radius={[0, 4, 4, 0]} name="Occupancy %" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Row 2: Price vs availability scatter + Availability by room type */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Price vs availability_365 scatter */}
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Price vs Availability (365 days)
                    </p>
                    <ResponsiveContainer width="100%" height={260}>
                        <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" />
                            <XAxis dataKey="availability" name="Available Days" type="number"
                                tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                                label={{ value: 'Available Days / Year', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#9CA3AF' }} />
                            <YAxis dataKey="price" name="Price" type="number" tickFormatter={v => `$${v}`}
                                tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <ZAxis range={[18, 18]} />
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                contentStyle={{ background: '#1E1E2C', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                                formatter={(v: any, name: string) => name === 'Price' ? [`$${v}`, name] : [v, name]}
                            />
                            <Scatter name="Listing" data={data?.price_vs_availability ?? []} fill="#3B8FF3" opacity={0.45} />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                {/* Availability by room type — grouped bar */}
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Avg Availability by Room Type
                    </p>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={roomTypeData} margin={{ top: 8, right: 8, left: 0, bottom: 35 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                            <XAxis dataKey="room_type" angle={-20} textAnchor="end" height={55}
                                tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                                label={{ value: 'Avg Days', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#9CA3AF' }} />
                            <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Bar dataKey="availability_30" name="30 days" fill={WINDOW_COLORS.availability_30} radius={[3, 3, 0, 0]} />
                            <Bar dataKey="availability_60" name="60 days" fill={WINDOW_COLORS.availability_60} radius={[3, 3, 0, 0]} />
                            <Bar dataKey="availability_90" name="90 days" fill={WINDOW_COLORS.availability_90} radius={[3, 3, 0, 0]} />
                            <Bar dataKey="availability_365" name="365 days" fill={WINDOW_COLORS.availability_365} radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {loading && <p className="text-xs text-gray-400">Loading availability data…</p>}
        </section>
    )
}

export function OccupancyByNeighbourhoodChart({ data }: { data: { neighbourhood: string; occupancy_pct: number }[] | undefined }) {
    return (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                Occupancy Rate by Neighbourhood
            </p>
            <ResponsiveContainer width="100%" height={340}>
                <BarChart
                    data={data ?? []}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 100, bottom: 4 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => `${v}%`}
                        tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="neighbourhood" width={95}
                        tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} />
                    <Tooltip
                        contentStyle={{ background: '#1E1E2C', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                        formatter={(v: any) => [`${v}%`, 'Occupancy']}
                    />
                    <Bar dataKey="occupancy_pct" fill="#3B8FF3" radius={[0, 4, 4, 0]} name="Occupancy %" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
