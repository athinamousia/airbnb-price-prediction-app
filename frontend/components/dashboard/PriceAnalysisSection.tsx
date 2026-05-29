import {
    Bar, CartesianGrid, ComposedChart, Line, ReferenceLine,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
    BarChart,
} from 'recharts'
import { useState } from 'react'
import type { PriceAnalysis, NeighbourhoodRow } from '@/types/dashboard'

const SELECT_CLS =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E1E2C] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F29F67]/40'

function DarkTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg bg-[#1E1E2C] px-3 py-2 text-xs text-white shadow-xl">
            {label && <p className="mb-1 font-medium text-gray-300">{label}</p>}
            {payload.map((p: any) => (
                p.value != null && (
                    <p key={p.dataKey ?? p.name} style={{ color: p.color ?? '#F29F67' }}>
                        {p.name}: <strong>{p.dataKey === 'avg_price' ? `$${p.value}` : p.value}</strong>
                    </p>
                )
            ))}
        </div>
    )
}

type SortKey = 'neighbourhood' | 'count' | 'avg_price' | 'superhost_pct'

export function NeighbourhoodTable({ rows }: { rows: NeighbourhoodRow[] }) {
    const [sortKey, setSortKey] = useState<SortKey>('avg_price')
    const [sortAsc, setSortAsc] = useState(false)

    function handleSort(key: SortKey) {
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
    const [showAll, setShowAll] = useState(false)
    const visible = showAll ? sorted : sorted.slice(0, 10)

    const th = (label: string, key: SortKey) => (
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
        <div className="mt-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                Neighbourhood Comparison
            </p>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100">
                            {th('Neighbourhood', 'neighbourhood')}
                            {th('Listings', 'count')}
                            {th('Avg Price', 'avg_price')}
                            {th('Superhost %', 'superhost_pct')}
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map(row => (
                            <tr key={row.neighbourhood} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-[#1E1E2C]">{row.neighbourhood}</td>
                                <td className="px-3 py-2 text-gray-600">{row.count.toLocaleString()}</td>
                                <td className="px-3 py-2 text-gray-600">{row.avg_price != null ? `$${row.avg_price}` : '—'}</td>
                                <td className="px-3 py-2 text-gray-600">{row.superhost_pct}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {sorted.length > 10 && (
                <button
                    onClick={() => setShowAll(s => !s)}
                    className="mt-3 text-xs font-medium text-[#34B1AA] hover:underline"
                >
                    {showAll ? 'Show less' : `Show ${sorted.length - 10} more rows`}
                </button>
            )}
        </div>
    )
}

export default function PriceAnalysisSection(props: {
    data: PriceAnalysis | null
    histogramData: { range: string; count: number; kde: number | null }[]
    loading: boolean
    selected: string
    onChangeNeighbourhood: (v: string) => void
}) {
    const { data, histogramData, loading, selected, onChangeNeighbourhood } = props
    const median = data?.stats?.median ?? null

    // Find which bin contains the median for the reference line
    const medianBin = (() => {
        if (median == null) return null
        for (const item of histogramData) {
            const match = item.range.match(/\$(\d+)-\$(\d+)/)
            if (match && median >= Number(match[1]) && median < Number(match[2])) {
                return item.range
            }
        }
        return null
    })()

    return (
        <section>
            <div className="mb-4 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    Price Analysis
                </p>
                <select value={selected} onChange={e => onChangeNeighbourhood(e.target.value)} className={SELECT_CLS}>
                    {data?.neighbourhoods?.map(n => (
                        <option key={n} value={n}>{n === 'all' ? 'All Neighbourhoods' : n}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Avg Price by Neighbourhood */}
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Avg Price by Neighbourhood
                    </p>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={data?.avg_by_neighbourhood ?? []}
                            layout="vertical"
                            margin={{ top: 8, right: 16, left: 90, bottom: 8 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" horizontal={false} />
                            <XAxis
                                type="number" tickFormatter={v => `$${v}`}
                                tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                            />
                            <YAxis
                                type="category" dataKey="neighbourhood" width={85}
                                tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false}
                            />
                            <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                            <Bar dataKey="avg_price" fill="#F29F67" radius={[0, 4, 4, 0]} name="Avg Price" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Price Distribution + KDE */}
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                            Price Distribution
                        </p>
                        {median != null && (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-500">
                                Median ${median}
                            </span>
                        )}
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={histogramData} margin={{ top: 8, right: 8, left: 0, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                            <XAxis
                                dataKey="range" angle={-35} textAnchor="end" interval={0}
                                tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                            />
                            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                            <Bar dataKey="count" fill="#3B8FF3" radius={[4, 4, 0, 0]} name="Count" opacity={0.8} />
                            <Line
                                type="monotone" dataKey="kde" stroke="#F29F67"
                                strokeWidth={2.5} dot={false} name="KDE"
                                connectNulls
                            />
                            {medianBin && (
                                <ReferenceLine
                                    x={medianBin} stroke="#E05858" strokeDasharray="4 4" strokeWidth={1.5}
                                    label={{ value: `Median`, position: 'top', fontSize: 9, fill: '#E05858' }}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {loading && <p className="mt-2 text-xs text-gray-400">Loading price analysis…</p>}
        </section>
    )
}