'use client'

import {
    Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart,
    ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import type { AvailabilityAnalytics, HostAnalytics, PropertyAnalytics, PropertyTypeDistribution } from '@/types/dashboard'

const SELECT_CLS =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E1E2C] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F99E69]/40'

const IB_COLORS: Record<string, string> = {
    'Instant Book': '#F99E69',
    'Request to Book': '#0B1040',
}

const ROOM_TYPE_COLORS: Record<string, string> = {
    'Entire home/apt': '#F99E69',
    'Private room': '#0B1040',
    'Shared room': '#FFC861',
    'Hotel room': '#273272',
}

function DarkTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg bg-black px-3 py-2 text-xs text-white shadow-xl">
            {label !== undefined && label !== '' && <p className="mb-1 font-medium text-white">{label}</p>}
            {payload.map((p: any) => (
                <p key={p.dataKey ?? p.name} className="text-white">
                    {p.name}: <strong>{p.value}</strong>
                </p>
            ))}
        </div>
    )
}

const CARD = 'rounded-xl border border-gray-100 bg-white p-5 shadow-sm'
const TITLE = 'mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600'
const AXIS = { fontSize: 10, fill: '#6B7280' }

export default function BookingAnalysisSection(props: {
    data: PropertyTypeDistribution | null
    analytics: PropertyAnalytics | null
    hostAnalytics: HostAnalytics | null
    availabilityAnalytics: AvailabilityAnalytics | null
    loading: boolean
    selectedNeighbourhood: string
    selectedRoomType: string
    onChangeNeighbourhood: (v: string) => void
    onChangeRoomType: (v: string) => void
}) {
    const { data, analytics, hostAnalytics, availabilityAnalytics, loading, selectedNeighbourhood, selectedRoomType, onChangeNeighbourhood, onChangeRoomType } = props
    const ibData = hostAnalytics?.instant_bookable_vs_price ?? []
    const ibTotal = ibData.reduce((s, d) => s + d.count, 0)
    const avData = availabilityAnalytics?.avg_availability ?? []

    const reviewGroups = (analytics?.price_vs_reviews ?? []).reduce(
        (acc: Record<string, { x: number; y: number }[]>, d: any) => {
            acc[d.room_type] = acc[d.room_type] ?? []
            acc[d.room_type].push({ x: d.reviews_per_month, y: d.price })
            return acc
        },
        {}
    )

    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">Booking Information</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <select value={selectedNeighbourhood} onChange={e => onChangeNeighbourhood(e.target.value)} className={SELECT_CLS}>
                        {(data?.neighbourhoods ?? ['all']).map(n => (
                            <option key={n} value={n}>{n === 'all' ? 'All Neighbourhoods' : n}</option>
                        ))}
                    </select>
                    <select value={selectedRoomType} onChange={e => onChangeRoomType(e.target.value)} className={SELECT_CLS}>
                        {(data?.room_types ?? ['all']).map(r => (
                            <option key={r} value={r}>{r === 'all' ? 'All Room Types' : r}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
                <div className={CARD}>
                    <p className={TITLE}>Instant Bookable</p>
                    {!ibData.length ? <p className="text-xs text-gray-400">No data available</p> : (
                        <>
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie data={ibData} dataKey="count" nameKey="category" cx="50%" cy="50%"
                                        innerRadius={60} outerRadius={90} paddingAngle={3} strokeWidth={0}>
                                        {ibData.map((entry: any) => (
                                            <Cell key={entry.category} fill={IB_COLORS[entry.category] ?? '#FFC861'} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: '#000', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                                        itemStyle={{ color: '#fff' }}
                                        formatter={(v: any, name: any) => [
                                            `${v} listings (${ibTotal > 0 ? Math.round(v / ibTotal * 100) : 0}%)`, name,
                                        ]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="mt-3 space-y-2">
                                {ibData.map((d: any) => (
                                    <div key={d.category} className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-1.5">
                                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: IB_COLORS[d.category] ?? '#FFC861' }} />
                                            {d.category}
                                        </span>
                                        <span className="font-semibold text-gray-700">Median ${d.median}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className={`${CARD} lg:col-span-2`}>
                    <p className={TITLE}>Availability Windows</p>
                    {!avData.length ? <p className="text-xs text-gray-400">No data available</p> : (
                        <ResponsiveContainer width="100%" height={340}>
                            <ComposedChart data={avData} margin={{ top: 12, right: 48, left: 0, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                                <XAxis dataKey="window" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" tickFormatter={v => `${v}d`} tick={AXIS} axisLine={false} tickLine={false}
                                    label={{ value: 'Avg Available Days', angle: -90, position: 'insideLeft', offset: 12, fontSize: 10, fill: '#9CA3AF' }} />
                                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`}
                                    tick={AXIS} axisLine={false} tickLine={false}
                                    label={{ value: 'Occupancy %', angle: 90, position: 'insideRight', offset: 12, fontSize: 10, fill: '#9CA3AF' }} />
                                <Tooltip
                                    contentStyle={{ background: '#000', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ color: '#fff' }}
                                    formatter={(v: any, name: any) =>
                                        name === 'Avg Available Days' ? [`${v} days`, name] : [`${v}%`, name]
                                    }
                                />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar yAxisId="left" dataKey="avg_available_days" name="Avg Available Days" fill="#0B1040" radius={[4, 4, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="avg_occupancy_pct" name="Occupancy %"
                                    stroke="#F99E69" strokeWidth={2.5} dot={{ r: 4, fill: '#F99E69' }} activeDot={{ r: 6 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className={CARD}>
                    <p className={TITLE}>Minimum Nights Distribution (≤ 365)</p>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={analytics?.min_nights_distribution ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                            <XAxis dataKey="nights" tick={AXIS} axisLine={false} tickLine={false}
                                label={{ value: 'Min Nights', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#9CA3AF' }} />
                            <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                            <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                            <Bar dataKey="count" fill="#0B1040" radius={[4, 4, 0, 0]} name="Listings" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className={CARD}>
                    <p className={TITLE}>Maximum Nights Distribution (≤ 365)</p>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={analytics?.max_nights_distribution ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                            <XAxis dataKey="nights" tick={AXIS} axisLine={false} tickLine={false}
                                label={{ value: 'Max Nights', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#9CA3AF' }} />
                            <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                            <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                            <Bar dataKey="count" fill="#F99E69" radius={[4, 4, 0, 0]} name="Listings" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className={CARD}>
                <p className={TITLE}>Price vs Reviews / Month</p>
                <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" />
                        <XAxis dataKey="x" name="Reviews/Month" type="number" tick={AXIS} axisLine={false} tickLine={false}
                            label={{ value: 'Reviews / Month', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#9CA3AF' }} />
                        <YAxis dataKey="y" name="Price" type="number" tickFormatter={v => `$${v}`}
                            tick={AXIS} axisLine={false} tickLine={false} />
                        <ZAxis range={[20, 20]} />
                        <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            contentStyle={{ background: '#000', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ color: '#fff' }}
                            formatter={(v: any, name: any) => name === 'Price' ? [`$${v}`, name] : [v, name]}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {Object.entries(reviewGroups).map(([rt, points]) => (
                            <Scatter
                                key={rt} name={rt} data={points}
                                fill={ROOM_TYPE_COLORS[rt] ?? '#9CA3AF'} opacity={0.6}
                            />
                        ))}
                    </ScatterChart>
                </ResponsiveContainer>
            </div>

            {loading && <p className="text-xs text-gray-400">Loading booking data…</p>}
        </section>
    )
}
