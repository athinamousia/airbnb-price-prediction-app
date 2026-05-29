import {
    Bar, BarChart, CartesianGrid, Cell, ComposedChart,
    Label, LabelList, Legend, Line, Pie, PieChart,
    ResponsiveContainer, Scatter, ScatterChart,
    Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import type { AvailabilityAnalytics, HostAnalytics, PropertyAnalytics, PropertyTypeDistribution } from '@/types/dashboard'

const SELECT_CLS =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E1E2C] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#34B1AA]/40'

const ROOM_TYPE_COLORS: Record<string, string> = {
    'Entire home/apt': '#F29F67',
    'Private room': '#A78BFA',
    'Shared room': '#E05858',
    'Hotel room': '#E0B50F',
}

function DarkTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg bg-[#1E1E2C] px-3 py-2 text-xs text-white shadow-xl">
            {label && <p className="mb-1 font-medium text-gray-300">{label}</p>}
            {payload.map((p: any) => (
                <p key={p.dataKey ?? p.name} style={{ color: p.fill ?? p.color ?? '#34B1AA' }}>
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
        </div>
    )
}

const BoxShape = (props: any) => {
    const { x, y, width, height, payload } = props
    if (!height || height === 0 || !payload) return null
    const { _min, _q1, _median, _q3, _max } = payload
    const iqr = _q3 - _q1
    const cx = x + width / 2
    if (iqr <= 0) return <line x1={cx - 10} y1={y} x2={cx + 10} y2={y} stroke="#34B1AA" strokeWidth={2} />
    const scale = height / iqr
    const pxY = (v: number) => y + (_q3 - v) * scale
    const maxY = pxY(_max), minY = pxY(_min), medY = pxY(_median)
    const bx = x + Math.floor(width * 0.15), bw = Math.floor(width * 0.7)
    return (
        <g>
            <line x1={cx} y1={maxY} x2={cx} y2={y} stroke="#6B7280" strokeWidth={1.5} />
            <line x1={cx - 5} y1={maxY} x2={cx + 5} y2={maxY} stroke="#6B7280" strokeWidth={1.5} />
            <rect x={bx} y={y} width={bw} height={height} fill="#34B1AA" fillOpacity={0.75} rx={2} />
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
        <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, maxVal]} tickFormatter={v => `$${v}`}
                    tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip content={<BoxTooltip />} />
                <Bar dataKey="_invisible" stackId="box" fill="transparent" isAnimationActive={false} />
                <Bar dataKey="_box" stackId="box" shape={<BoxShape />} isAnimationActive={false} fill="#34B1AA" />
            </ComposedChart>
        </ResponsiveContainer>
    )
}

const IB_COLORS: Record<string, string> = {
    'Instant Book': '#34B1AA',
    'Request to Book': '#F29F67',
}

export default function PropertyTypeDistributionSection(props: {
    data: PropertyTypeDistribution | null
    analytics: PropertyAnalytics | null
    hostAnalytics: HostAnalytics | null
    availabilityAnalytics: AvailabilityAnalytics | null
    loading: boolean
    loadingAnalytics: boolean
    selectedNeighbourhood: string
    selectedRoomType: string
    onChangeNeighbourhood: (v: string) => void
    onChangeRoomType: (v: string) => void
}) {
    const { data, analytics, hostAnalytics, availabilityAnalytics, loading, selectedNeighbourhood, selectedRoomType, onChangeNeighbourhood, onChangeRoomType } = props

    // Group scatter data by room type
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

            {/* Row 1: Property type distribution (left, wider) + Instant Bookable (right) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Property Type Distribution
                    </p>
                    <ResponsiveContainer width="100%" height={360}>
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
                            <Bar dataKey="count" fill="#34B1AA" radius={[0, 4, 4, 0]} name="Listings" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">Instant Bookable</p>
                    {(() => {
                        const ibData = hostAnalytics?.instant_bookable_vs_price ?? []
                        if (!ibData.length) return <p className="text-xs text-gray-400">No data available</p>
                        const total = ibData.reduce((s, d) => s + d.count, 0)
                        return (
                            <>
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie
                                            data={ibData} dataKey="count" nameKey="category"
                                            cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                                            paddingAngle={3}
                                        >
                                            {ibData.map((entry: any) => (
                                                <Cell key={entry.category} fill={IB_COLORS[entry.category] ?? '#9CA3AF'} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ background: '#1E1E2C', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                                            formatter={(v: any, name: any) => [
                                                `${v} listings (${total > 0 ? Math.round(v / total * 100) : 0}%)`, name
                                            ]}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="mt-3 space-y-2">
                                    {ibData.map((d: any) => (
                                        <div key={d.category} className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-1.5">
                                                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: IB_COLORS[d.category] ?? '#9CA3AF' }} />
                                                {d.category}
                                            </span>
                                            <span className="font-semibold text-gray-700">Median ${d.median}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )
                    })()}
                </div>
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

            {/* Row 3: Price vs Accommodates + Price vs Reviews */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600">Median Price vs Accommodates</p>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={analytics?.price_by_accommodates ?? []}
                            margin={{ top: 24, right: 16, left: 0, bottom: 8 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                            <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ background: '#1E1E2C', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                                formatter={(v: any) => [`$${v}`, 'Median Price']}
                                labelStyle={{ color: '#D1D5DB', marginBottom: 4 }}
                            />
                            <Bar dataKey="median" name="Median Price" fill="#F29F67" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="median" position="top" formatter={(v: any) => `$${v}`} style={{ fontSize: 10, fill: '#374151', fontWeight: 600 }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Price vs Reviews / Month
                    </p>
                    <ResponsiveContainer width="100%" height={300}>
                        <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" />
                            <XAxis dataKey="x" name="Reviews/Month" type="number"
                                tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                                label={{ value: 'Reviews / Month', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#9CA3AF' }} />
                            <YAxis dataKey="y" name="Price" type="number" tickFormatter={v => `$${v}`}
                                tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <ZAxis range={[20, 20]} />
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                contentStyle={{ background: '#1E1E2C', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
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
            </div>

            {/* Row 4: Amenities (left) | Min Nights (top-right) + Max Nights (bottom-right) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">Amenities</p>
                    <ResponsiveContainer width="100%" height={Math.max(240, (analytics?.top_amenities?.length ?? 10) * 28)}>
                        <BarChart
                            data={analytics?.top_amenities ?? []} layout="vertical"
                            margin={{ top: 4, right: 52, left: 8, bottom: 4 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`}
                                tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="amenity" width={140}
                                tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                            <Bar dataKey="pct" fill="#A78BFA" radius={[0, 4, 4, 0]} name="% of Listings"
                                label={{ position: 'right', fontSize: 10, fill: '#6B7280', formatter: (v: any) => `${v}%` }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                        <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                            Minimum Nights Distribution (≤ 365)
                        </p>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart
                                data={analytics?.min_nights_distribution ?? []}
                                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                                <XAxis dataKey="nights" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                                    label={{ value: 'Min Nights', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#9CA3AF' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                                <Bar dataKey="count" fill="#3B8FF3" radius={[4, 4, 0, 0]} name="Listings" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                        <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                            Maximum Nights Distribution (≤ 365)
                        </p>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart
                                data={analytics?.max_nights_distribution ?? []}
                                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                                <XAxis dataKey="nights" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                                    label={{ value: 'Max Nights', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#9CA3AF' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                                <Bar dataKey="count" fill="#F29F67" radius={[4, 4, 0, 0]} name="Listings" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 5: Availability Windows */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">Availability Windows</p>
                {(() => {
                    const avData = availabilityAnalytics?.avg_availability ?? []
                    if (!avData.length) return <p className="text-xs text-gray-400">No data available</p>
                    return (
                        <ResponsiveContainer width="100%" height={260}>
                            <ComposedChart data={avData} margin={{ top: 12, right: 48, left: 0, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                                <XAxis dataKey="window" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" tickFormatter={v => `${v}d`}
                                    tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                                    label={{ value: 'Avg Available Days', angle: -90, position: 'insideLeft', offset: 12, fontSize: 10, fill: '#9CA3AF' }} />
                                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`}
                                    tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                                    label={{ value: 'Occupancy %', angle: 90, position: 'insideRight', offset: 12, fontSize: 10, fill: '#9CA3AF' }} />
                                <Tooltip
                                    contentStyle={{ background: '#1E1E2C', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                                    formatter={(v: any, name: any) =>
                                        name === 'Avg Available Days' ? [`${v} days`, name] : [`${v}%`, name]
                                    }
                                />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar yAxisId="left" dataKey="avg_available_days" name="Avg Available Days" fill="#34B1AA" radius={[4, 4, 0, 0]} opacity={0.85} />
                                <Line yAxisId="right" type="monotone" dataKey="avg_occupancy_pct" name="Occupancy %"
                                    stroke="#F29F67" strokeWidth={2.5} dot={{ r: 4, fill: '#F29F67' }} activeDot={{ r: 6 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )
                })()}
            </div>

            {loading && <p className="text-xs text-gray-400">Loading property data…</p>}
        </section>
    )
}