import {
    Bar, BarChart, CartesianGrid, Cell, ComposedChart,
    Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line,
} from 'recharts'
import type { HostAnalytics, HostInsights } from '@/types/dashboard'

const SELECT_CLS =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E1E2C] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F99E69]/40'
const PIE_COLORS = ['#F99E69', '#0B1040']

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
            <p className="text-white">Median: <strong>${d._median}</strong></p>
            <p>Q1: <strong>${d._q1}</strong></p>
            <p>Min: <strong>${d._min}</strong></p>
            <p className="text-white">n={d.count}</p>
        </div>
    )
}

const BoxShape = (props: any) => {
    const { x, y, width, height, payload, color = "#0B1040" } = props
    if (!height || height === 0 || !payload) return null
    const { _min, _q1, _median, _q3, _max } = payload
    const iqr = _q3 - _q1
    const cx = x + width / 2
    if (iqr <= 0) {
        return <line x1={cx - 10} y1={y} x2={cx + 10} y2={y} stroke="#0B1040" strokeWidth={2} />
    }
    const scale = height / iqr
    const pxY = (v: number) => y + (_q3 - v) * scale
    const maxY = pxY(_max), minY = pxY(_min), medY = pxY(_median)
    const bx = x + Math.floor(width * 0.15), bw = Math.floor(width * 0.7)
    return (
        <g>
            <line x1={cx} y1={maxY} x2={cx} y2={y} stroke="#0B1040" strokeWidth={1.5} />
            <line x1={cx - 5} y1={maxY} x2={cx + 5} y2={maxY} stroke="#0B1040" strokeWidth={1.5} />
            <rect x={bx} y={y} width={bw} height={height} fill={color} rx={2} />
            <line x1={bx} y1={medY} x2={bx + bw} y2={medY} stroke="#fff" strokeWidth={2.5} />
            <line x1={cx} y1={y + height} x2={cx} y2={minY} stroke="#0B1040" strokeWidth={1.5} />
            <line x1={cx - 5} y1={minY} x2={cx + 5} y2={minY} stroke="#0B1040" strokeWidth={1.5} />
        </g>
    )
}

const HBoxShape = (props: any) => {
    const { x, y, width, height, payload } = props
    if (!width || !payload) return null
    const { _min, _q1, _median, _q3, _max, _color } = payload
    const iqr = _q3 - _q1
    const cy = y + height / 2
    if (iqr <= 0) return null
    const scale = width / iqr
    const pxX = (v: number) => x + (v - _q1) * scale
    const minX = pxX(_min), maxX = pxX(_max), medX = pxX(_median)
    const by = y + Math.floor(height * 0.15), bh = Math.floor(height * 0.7)
    return (
        <g>
            <line x1={minX} y1={cy} x2={x} y2={cy} stroke={_color} strokeWidth={1.5} />
            <line x1={minX} y1={cy - 6} x2={minX} y2={cy + 6} stroke={_color} strokeWidth={1.5} />
            <line x1={x + width} y1={cy} x2={maxX} y2={cy} stroke={_color} strokeWidth={1.5} />
            <line x1={maxX} y1={cy - 6} x2={maxX} y2={cy + 6} stroke={_color} strokeWidth={1.5} />
            <rect x={x} y={by} width={width} height={bh} fill={_color} rx={2} />
            <line x1={medX} y1={by} x2={medX} y2={by + bh} stroke="#fff" strokeWidth={2.5} />
        </g>
    )
}

function SuperhostBoxTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
        <div className="rounded-lg bg-black px-3 py-2 text-xs text-white shadow-xl space-y-0.5">
            <p className="mb-1 font-medium text-white">{d.category}</p>
            <p>Max: <strong>${d._max}</strong></p>
            <p>Q3: <strong>${d._q3}</strong></p>
            <p>Median: <strong>${d._median}</strong></p>
            <p>Q1: <strong>${d._q1}</strong></p>
            <p>Min: <strong>${d._min}</strong></p>
        </div>
    )
}

function BoxPlotChart({ data, color = '#0B1040' }: { data: any[]; color?: string }) {
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
                <Bar dataKey="_box" stackId="box" shape={<BoxShape color={color} />} isAnimationActive={false} fill={color} />
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

    const rtItems: { response_time: string; count: number }[] = (data?.response_time_distribution ?? []).filter((r: { response_time: string }) => r.response_time?.trim().toLowerCase() !== 'unknown')
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
    const superhostBoxData = [
        { key: 'Superhost', color: '#F99E69' },
        { key: 'Non-Superhost', color: '#0B1040' },
    ].filter(c => shMap[c.key]).map(c => {
        const d = shMap[c.key]
        return {
            category: c.key,
            _invisible: d.q1,
            _box: d.q3 - d.q1,
            _min: d.min, _q1: d.q1, _median: d.median, _q3: d.q3, _max: d.max,
            _color: c.color,
        }
    })
    const superhostMax = superhostBoxData.length ? Math.ceil(Math.max(...superhostBoxData.map(d => d._max)) * 1.1) : 0

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
            <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1E1E2C]">Superhost Percentage</p>
                    <p className="mt-1 mb-2 text-3xl font-bold text-[#1E1E2C]">{data?.superhost_percentage ?? 0}%</p>
                    <ResponsiveContainer width="100%" height={300}>
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
                        <ComposedChart data={superhostBoxData} layout="vertical" margin={{ top: 8, right: 24, left: 16, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" horizontal={false} />
                            <XAxis type="number" domain={[0, superhostMax]} tickFormatter={v => `${v}`}
                                tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="category" width={100}
                                tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<SuperhostBoxTooltip />} cursor={{ fill: '#F4F5F7' }} />
                            <Bar dataKey="_invisible" stackId="box" fill="transparent" isAnimationActive={false} />
                            <Bar dataKey="_box" stackId="box" shape={<HBoxShape />} isAnimationActive={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-5 text-xs text-gray-700">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#F99E69' }} />
                            Superhost
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#0B1040' }} />
                            Non-Superhost
                        </span>
                    </div>
                </div>
            </div>

            {/* Row 2: Response Time (wide, vertical bars) + Response Rate (narrow, horizontal bars) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 items-stretch">
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
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
                            <Bar dataKey="pct" fill="#0B1040" radius={[4, 4, 0, 0]} name="% of Hosts" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Response Rate Distribution
                    </p>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                            data={responseRatePctData}
                            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                            <XAxis dataKey="bucket" interval={0}
                                tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                            <Bar dataKey="pct" fill="#F99E69" radius={[4, 4, 0, 0]} name="% of Hosts" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Row 3: Host Verifications + Host Listings Count boxplots */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 items-stretch">
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Host Verification Methods
                    </p>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={analytics?.host_verification_methods ?? []}
                            layout="vertical"
                            margin={{ top: 8, right: 24, left: 4, bottom: 8 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`}
                                tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="method" width={130}
                                tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                            <Bar dataKey="pct" fill="#0B1040" radius={[0, 4, 4, 0]} name="% of Listings" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Avg Price by Host Listings Count
                    </p>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                            data={analytics?.host_listings_vs_price ?? []}
                            margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                            <XAxis type="number" dataKey="listings_count" domain={[0, 'dataMax']}
                                tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <YAxis width={100} tickFormatter={v => `$${v}`} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<DarkTooltip />} cursor={{ stroke: '#F1F3F5' }} labelFormatter={v => `${v} listings`} />
                            <Line type="monotone" dataKey="avg_price" stroke="#F99E69" strokeWidth={2.5} dot={false} name="Avg Price" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {loading && <p className="text-xs text-gray-400">Loading host insights…</p>}
        </section>
    )
}