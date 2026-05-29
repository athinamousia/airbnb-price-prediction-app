import {
    Bar, BarChart, CartesianGrid, Cell, ComposedChart,
    Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { HostAnalytics, HostInsights } from '@/types/dashboard'

const SELECT_CLS =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E1E2C] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F29F67]/40'
const PIE_COLORS = ['#F29F67', '#E5E7EB']

function DarkTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg bg-[#1E1E2C] px-3 py-2 text-xs text-white shadow-xl">
            {label && <p className="mb-1 font-medium text-gray-300">{label}</p>}
            {payload.map((p: any) => (
                <p key={p.dataKey ?? p.name} style={{ color: p.fill ?? p.color ?? '#F29F67' }}>
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
        <div className="rounded-lg bg-[#1E1E2C] px-3 py-2 text-xs text-white shadow-xl space-y-0.5">
            <p className="mb-1 font-medium text-gray-300">{d.category}</p>
            <p>Max: <strong>${d._max}</strong></p>
            <p>Q3: <strong>${d._q3}</strong></p>
            <p className="text-[#F29F67]">Median: <strong>${d._median}</strong></p>
            <p>Q1: <strong>${d._q1}</strong></p>
            <p>Min: <strong>${d._min}</strong></p>
            <p className="text-gray-400">n={d.count}</p>
        </div>
    )
}

const BoxShape = (props: any) => {
    const { x, y, width, height, payload } = props
    if (!height || height === 0 || !payload) return null
    const { _min, _q1, _median, _q3, _max } = payload
    const iqr = _q3 - _q1
    const cx = x + width / 2
    if (iqr <= 0) {
        return <line x1={cx - 10} y1={y} x2={cx + 10} y2={y} stroke="#3B8FF3" strokeWidth={2} />
    }
    const scale = height / iqr
    const pxY = (v: number) => y + (_q3 - v) * scale
    const maxY = pxY(_max), minY = pxY(_min), medY = pxY(_median)
    const bx = x + Math.floor(width * 0.15), bw = Math.floor(width * 0.7)
    return (
        <g>
            <line x1={cx} y1={maxY} x2={cx} y2={y} stroke="#6B7280" strokeWidth={1.5} />
            <line x1={cx - 5} y1={maxY} x2={cx + 5} y2={maxY} stroke="#6B7280" strokeWidth={1.5} />
            <rect x={bx} y={y} width={bw} height={height} fill="#3B8FF3" fillOpacity={0.75} rx={2} />
            <line x1={bx} y1={medY} x2={bx + bw} y2={medY} stroke="#fff" strokeWidth={2.5} />
            <line x1={cx} y1={y + height} x2={cx} y2={minY} stroke="#6B7280" strokeWidth={1.5} />
            <line x1={cx - 5} y1={minY} x2={cx + 5} y2={minY} stroke="#6B7280" strokeWidth={1.5} />
        </g>
    )
}

function BoxPlotChart({ data, color = '#3B8FF3' }: { data: any[]; color?: string }) {
    if (!data.length) return <p className="text-xs text-gray-400">No data available</p>
    const maxVal = Math.ceil(Math.max(...data.map(d => d.max)) * 1.1)
    const chartData = data.map(d => ({
        category: d.category,
        _invisible: d.q1,
        _box: d.q3 - d.q1,
        _min: d.min, _q1: d.q1, _median: d.median, _q3: d.q3, _max: d.max,
        count: d.count,
    }))
    return (
        <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis
                    domain={[0, maxVal]} tickFormatter={v => `$${v}`}
                    tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                />
                <Tooltip content={<BoxTooltip />} />
                <Bar dataKey="_invisible" stackId="box" fill="transparent" isAnimationActive={false} />
                <Bar dataKey="_box" stackId="box" shape={<BoxShape />} isAnimationActive={false} fill={color} />
            </ComposedChart>
        </ResponsiveContainer>
    )
}

export default function HostInsightsSection(props: {
    data: HostInsights | null
    analytics: any | null   // HostAnalytics
    loading: boolean
    loadingAnalytics: boolean
    selectedNeighbourhood: string
    selectedRoomType: string
    onChangeNeighbourhood: (v: string) => void
    onChangeRoomType: (v: string) => void
}) {
    const { data, analytics, loading, selectedNeighbourhood, selectedRoomType, onChangeNeighbourhood, onChangeRoomType } = props

    const superhostPieData = [
        { name: 'Superhost', value: data?.superhost_count ?? 0 },
        { name: 'Other Hosts', value: data?.non_superhost_count ?? 0 },
    ]

    const rtItems: { response_time: string; count: number }[] = data?.response_time_distribution ?? []
    const rtTotal = rtItems.reduce((s, r) => s + r.count, 0)
    const responseTimePctData = rtItems.map(r => ({
        response_time: r.response_time,
        pct: rtTotal > 0 ? parseFloat(((r.count / rtTotal) * 100).toFixed(1)) : 0,
    }))

    const rrItems: any[] = analytics?.price_by_response_rate ?? []
    const rrTotal = rrItems.reduce((s: number, r: any) => s + (r.count ?? 0), 0)
    const responseRatePctData = rrItems.map((r: any) => ({
        bucket: r.category,
        pct: rrTotal > 0 ? parseFloat(((r.count / rrTotal) * 100).toFixed(1)) : 0,
    }))

    const shItems: any[] = analytics?.price_by_superhost ?? []
    const shMap: Record<string, any> = Object.fromEntries(shItems.map((d: any) => [d.category, d]))
    const superhostPriceData = [
        { stat: 'Q1', Superhost: shMap['Superhost']?.q1, nonSuperhost: shMap['Non-Superhost']?.q1 },
        { stat: 'Median', Superhost: shMap['Superhost']?.median, nonSuperhost: shMap['Non-Superhost']?.median },
        { stat: 'Q3', Superhost: shMap['Superhost']?.q3, nonSuperhost: shMap['Non-Superhost']?.q3 },
    ]

    return (
        <section className="space-y-4">
            {/* Filter — neighbourhood only */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">Host Analysis</p>
                <select value={selectedNeighbourhood} onChange={e => onChangeNeighbourhood(e.target.value)} className={SELECT_CLS}>
                    {(data?.neighbourhoods ?? ['all']).map(n => (
                        <option key={n} value={n}>{n === 'all' ? 'All Neighbourhoods' : n}</option>
                    ))}
                </select>
            </div>

            {/* Row 1: Superhost pie (narrow) + Price vs Superhost (wide) */}
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1E1E2C]">Superhost Percentage</p>
                    <p className="mt-1 mb-2 text-3xl font-bold text-[#1E1E2C]">{data?.superhost_percentage ?? 0}%</p>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={superhostPieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                                outerRadius={80} innerRadius={46} strokeWidth={0}>
                                {superhostPieData.map((entry, i) => (
                                    <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<DarkTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-5 text-xs text-gray-700">
                        {superhostPieData.map((entry, i) => (
                            <span key={entry.name} className="flex items-center gap-1.5">
                                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                                {entry.name}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Price vs Superhost Status
                    </p>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={superhostPriceData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                            <XAxis dataKey="stat" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                            <Bar dataKey="Superhost" fill="#F29F67" radius={[4, 4, 0, 0]} name="Superhost" />
                            <Bar dataKey="nonSuperhost" fill="#94A3B8" radius={[4, 4, 0, 0]} name="Non-Superhost" />
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-5 text-xs text-gray-700">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#F29F67' }} />
                            Superhost
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#94A3B8' }} />
                            Non-Superhost
                        </span>
                    </div>
                </div>
            </div>

            {/* Row 2: Response Time (wide, vertical bars) + Response Rate (narrow, horizontal bars) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-3">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Response Time Distribution
                    </p>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                            data={responseTimePctData}
                            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                            <XAxis dataKey="response_time" interval={0}
                                tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                            <Bar dataKey="pct" fill="#A78BFA" radius={[4, 4, 0, 0]} name="% of Hosts" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Response Rate Distribution
                    </p>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                            data={responseRatePctData}
                            layout="vertical"
                            margin={{ top: 8, right: 24, left: 4, bottom: 8 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" horizontal={false} />
                            <XAxis type="number" tickFormatter={v => `${v}%`}
                                tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="bucket" width={52}
                                tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                            <Bar dataKey="pct" fill="#34B1AA" radius={[0, 4, 4, 0]} name="% of Hosts" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Row 3: Host Tenure (wide) + Portfolio Size (narrow) boxplots */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-3">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Price by Host Tenure
                    </p>
                    <BoxPlotChart data={analytics?.host_tenure_vs_price ?? []} color="#A78BFA" />
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Price by Portfolio Size
                    </p>
                    <BoxPlotChart data={analytics?.portfolio_size_vs_price ?? []} color="#F29F67" />
                </div>
            </div>

            {loading && <p className="text-xs text-gray-400">Loading host insights…</p>}
        </section>
    )
}