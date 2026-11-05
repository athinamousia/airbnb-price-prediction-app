import {
    Bar, BarChart, CartesianGrid, Cell, ComposedChart,
    Label, ResponsiveContainer,
    Tooltip, XAxis, YAxis,
} from 'recharts'
import { useState } from 'react'
import type { AmenityItem, PropertyAnalytics, PropertyTypeDistribution } from '@/types/dashboard'

const SELECT_CLS =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E1E2C] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F99E69]/40'

function DarkTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg bg-black px-3 py-2 text-xs text-white shadow-xl">
            {label && <p className="mb-1 font-medium text-white">{label}</p>}
            {payload.map((p: any) => (
                <p key={p.dataKey ?? p.name} className="text-white">
                    {p.name}: <strong>{p.value}</strong>
                </p>
            ))}
        </div>
    )
}

function BoxTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    return (
        <div className="rounded-lg bg-black px-3 py-2 text-xs text-white shadow-xl space-y-0.5">
            <p className="mb-1 font-medium text-white">{d.category}</p>
            <p>Max: <strong>${d._max}</strong></p>
            <p>Q3: <strong>${d._q3}</strong></p>
            <p className="text-[#F99E69]">Median: <strong>${d._median}</strong></p>
            <p>Q1: <strong>${d._q1}</strong></p>
            <p>Min: <strong>${d._min}</strong></p>
        </div>
    )
}

const BoxShape = (props: any) => {
    const { x, y, width, height, payload } = props
    if (!height || height === 0 || !payload) return null
    const { _min, _q1, _median, _q3, _max } = payload
    const iqr = _q3 - _q1
    const cx = x + width / 2
    if (iqr <= 0) return <line x1={cx - 10} y1={y} x2={cx + 10} y2={y} stroke="#F99E69" strokeWidth={2} />
    const scale = height / iqr
    const pxY = (v: number) => y + (_q3 - v) * scale
    const maxY = pxY(_max), minY = pxY(_min), medY = pxY(_median)
    const bx = x + Math.floor(width * 0.15), bw = Math.floor(width * 0.7)
    return (
        <g>
            <line x1={cx} y1={maxY} x2={cx} y2={y} stroke="#6B7280" strokeWidth={1.5} />
            <line x1={cx - 5} y1={maxY} x2={cx + 5} y2={maxY} stroke="#6B7280" strokeWidth={1.5} />
            <rect x={bx} y={y} width={bw} height={height} fill="#F99E69" fillOpacity={0.75} rx={2} />
            <line x1={bx} y1={medY} x2={bx + bw} y2={medY} stroke="#fff" strokeWidth={2.5} />
            <line x1={cx} y1={y + height} x2={cx} y2={minY} stroke="#6B7280" strokeWidth={1.5} />
            <line x1={cx - 5} y1={minY} x2={cx + 5} y2={minY} stroke="#6B7280" strokeWidth={1.5} />
        </g>
    )
}

function BoxPlotChart({ data }: { data: any[] }) {
    if (!data.length) return <p className="text-xs text-gray-400">No data available</p>
    const maxVal = Math.ceil(Math.max(...data.map(d => d.max)) * 1.1)
    const chartData = data.map(d => ({
        category: d.category,
        _invisible: d.q1, _box: d.q3 - d.q1,
        _min: d.min, _q1: d.q1, _median: d.median, _q3: d.q3, _max: d.max,
    }))
    return (
        <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, maxVal]} tickFormatter={v => `$${v}`}
                    tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip content={<BoxTooltip />} />
                <Bar dataKey="_invisible" stackId="box" fill="transparent" isAnimationActive={false} />
                <Bar dataKey="_box" stackId="box" shape={<BoxShape />} isAnimationActive={false} fill="#F99E69" />
            </ComposedChart>
        </ResponsiveContainer>
    )
}

type AmenitySortKey = 'amenity' | 'count' | 'pct' | 'avg_price'

function AmenitiesTable({ rows }: { rows: AmenityItem[] }) {
    const [sortKey, setSortKey] = useState<AmenitySortKey>('pct')
    const [sortAsc, setSortAsc] = useState(false)
    const [showAll, setShowAll] = useState(false)

    function handleSort(key: AmenitySortKey) {
        if (sortKey === key) setSortAsc(a => !a)
        else { setSortKey(key); setSortAsc(false) }
    }

    const sorted = [...rows].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        if (av == null && bv == null) return 0
        if (av == null) return 1
        if (bv == null) return -1
        const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
        return sortAsc ? cmp : -cmp
    })
    const visible = showAll ? sorted : sorted.slice(0, 10)

    const th = (label: string, key: AmenitySortKey) => (
        <th
            key={key}
            onClick={() => handleSort(key)}
            className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-800"
        >
            {label}{' '}
            {sortKey === key
                ? (sortAsc ? '↑' : '↓')
                : <span className="text-gray-300">↕</span>
            }
        </th>
    )

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">Amenities</p>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100">
                            {th('Amenity', 'amenity')}
                            {th('Listings', 'count')}
                            {th('% of Listings', 'pct')}
                            {th('Avg Price', 'avg_price')}
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map(row => (
                            <tr key={row.amenity} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-[#1E1E2C]">{row.amenity}</td>
                                <td className="px-3 py-2 text-gray-600">{row.count.toLocaleString()}</td>
                                <td className="px-3 py-2 text-gray-600">{row.pct}%</td>
                                <td className="px-3 py-2 text-gray-600">{row.avg_price != null ? `$${row.avg_price}` : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {sorted.length > 10 && (
                <button
                    onClick={() => setShowAll(s => !s)}
                    className="mt-3 text-xs font-medium text-black hover:underline"
                >
                    {showAll ? 'Show less' : `Show ${sorted.length - 10} more rows`}
                </button>
            )}
        </div>
    )
}

export default function PropertyTypeDistributionSection(props: {
    data: PropertyTypeDistribution | null
    analytics: PropertyAnalytics | null
    loading: boolean
    loadingAnalytics: boolean
    selectedNeighbourhood: string
    selectedRoomType: string
    onChangeNeighbourhood: (v: string) => void
    onChangeRoomType: (v: string) => void
}) {
    const { data, analytics, loading, selectedNeighbourhood, selectedRoomType, onChangeNeighbourhood, onChangeRoomType } = props

    return (
        <section className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">Property Analysis</p>
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

            {/* Row 1: Property type distribution */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    Property Type Distribution
                </p>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                        data={data?.property_types ?? []} layout="vertical"
                        margin={{ top: 8, right: 16, left: 110, bottom: 8 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" horizontal={false} />
                        <XAxis type="number" allowDecimals={false}
                            tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="property_type" width={100}
                            tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                        <Bar dataKey="count" fill="#0B1040" radius={[0, 4, 4, 0]} name="Listings" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Row 2: Price vs features boxplots */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600">Price vs Bedrooms</p>
                    <BoxPlotChart data={analytics?.price_by_bedrooms ?? []} />
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600">Price vs Beds</p>
                    <BoxPlotChart data={analytics?.price_by_beds ?? []} />
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600">Price vs Bathrooms</p>
                    <BoxPlotChart data={analytics?.price_by_bathrooms ?? []} />
                </div>
            </div>

            {/* Row 3: Amenities */}
            <AmenitiesTable rows={analytics?.top_amenities ?? []} />

            {loading && <p className="text-xs text-gray-400">Loading property data…</p>}
        </section>
    )
}