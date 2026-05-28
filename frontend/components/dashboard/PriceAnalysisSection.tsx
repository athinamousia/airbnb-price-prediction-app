import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import type { PriceAnalysis } from '@/types/dashboard'

const SELECT_CLS =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E1E2C] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F29F67]/40'

function DarkTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg bg-[#1E1E2C] px-3 py-2 text-xs text-white shadow-xl">
            {label && <p className="mb-1 font-medium text-gray-300">{label}</p>}
            {payload.map((p: any) => (
                <p key={p.dataKey ?? p.name} style={{ color: p.fill ?? p.color ?? '#F29F67' }}>
                    {p.name}:{' '}
                    <strong>{p.dataKey === 'avg_price' ? `$${p.value}` : p.value}</strong>
                </p>
            ))}
        </div>
    )
}

export default function PriceAnalysisSection(props: {
    data: PriceAnalysis | null
    histogramData: { range: string; count: number }[]
    loading: boolean
    selected: string
    onChangeNeighbourhood: (v: string) => void
}) {
    const { data, histogramData, loading, selected, onChangeNeighbourhood } = props

    return (
        <section>
            <div className="mb-4 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    Price Analysis
                </p>
                <select value={selected} onChange={(e) => onChangeNeighbourhood(e.target.value)} className={SELECT_CLS}>
                    {data?.neighbourhoods?.map((n) => (
                        <option key={n} value={n}>{n === 'all' ? 'All Neighbourhoods' : n}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Price Distribution */}
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Price Distribution
                    </p>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={histogramData} margin={{ top: 8, right: 8, left: 0, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                            <XAxis
                                dataKey="range" angle={-35} textAnchor="end" interval={0}
                                tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                            />
                            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                            <Bar dataKey="count" fill="#3B8FF3" radius={[4, 4, 0, 0]} name="Count" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Avg Price by Neighbourhood */}
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Avg Price by Neighbourhood
                    </p>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart
                            data={data?.avg_by_neighbourhood ?? []}
                            layout="vertical"
                            margin={{ top: 8, right: 16, left: 90, bottom: 8 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" horizontal={false} />
                            <XAxis
                                type="number" tickFormatter={(v) => `$${v}`}
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
            </div>

            {loading && <p className="mt-2 text-xs text-gray-400">Loading price analysis…</p>}
        </section>
    )
}