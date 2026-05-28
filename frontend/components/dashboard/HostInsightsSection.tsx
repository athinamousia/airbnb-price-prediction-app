import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import type { HostInsights } from '@/types/dashboard'

const PIE_COLORS = ['#F29F67', '#E5E7EB']

const SELECT_CLS =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E1E2C] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F29F67]/40'

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

export default function HostInsightsSection(props: {
    data: HostInsights | null
    loading: boolean
    selectedNeighbourhood: string
    selectedRoomType: string
    onChangeNeighbourhood: (value: string) => void
    onChangeRoomType: (value: string) => void
}) {
    const { data, loading, selectedNeighbourhood, selectedRoomType, onChangeNeighbourhood, onChangeRoomType } = props

    const superhostPieData = [
        { name: 'Superhost', value: data?.superhost_count ?? 0 },
        { name: 'Other Hosts', value: data?.non_superhost_count ?? 0 },
    ]

    return (
        <section>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">Host Insights</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <select value={selectedNeighbourhood} onChange={(e) => onChangeNeighbourhood(e.target.value)} className={SELECT_CLS}>
                        {(data?.neighbourhoods ?? ['all']).map((n) => (
                            <option key={n} value={n}>{n === 'all' ? 'All Neighbourhoods' : n}</option>
                        ))}
                    </select>
                    <select value={selectedRoomType} onChange={(e) => onChangeRoomType(e.target.value)} className={SELECT_CLS}>
                        {(data?.room_types ?? ['all']).map((r) => (
                            <option key={r} value={r}>{r === 'all' ? 'All Room Types' : r}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Superhost donut */}
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1E1E2C]">
                        Superhost Percentage
                    </p>
                    <p className="mt-1 mb-2 text-3xl font-bold text-[#1E1E2C]">
                        {data?.superhost_percentage ?? 0}%
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={superhostPieData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%" cy="50%"
                                outerRadius={90}
                                innerRadius={52}
                                strokeWidth={0}
                            >
                                {superhostPieData.map((entry, index) => (
                                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<DarkTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex items-center justify-center gap-5 text-xs text-gray-700">
                        {superhostPieData.map((entry, i) => (
                            <span key={entry.name} className="flex items-center gap-1.5">
                                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                                {entry.name}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Response time bar chart */}
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        Host Response Time Distribution
                    </p>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart
                            data={data?.response_time_distribution ?? []}
                            margin={{ top: 8, right: 16, left: 0, bottom: 50 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                            <XAxis
                                dataKey="response_time" angle={-20} textAnchor="end" interval={0} height={60}
                                tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                            />
                            <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                            <Bar dataKey="count" fill="#3B8FF3" radius={[4, 4, 0, 0]} name="Hosts" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {loading && <p className="mt-2 text-xs text-gray-400">Loading host insights…</p>}
        </section>
    )
}
