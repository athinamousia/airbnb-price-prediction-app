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

const PIE_COLORS = ['#16a34a', '#94a3b8']

export default function HostInsightsSection(props: {
    data: HostInsights | null
    loading: boolean
    selectedNeighbourhood: string
    selectedRoomType: string
    onChangeNeighbourhood: (value: string) => void
    onChangeRoomType: (value: string) => void
}) {
    const {
        data,
        loading,
        selectedNeighbourhood,
        selectedRoomType,
        onChangeNeighbourhood,
        onChangeRoomType,
    } = props

    const superhostPieData = [
        { name: 'Superhost', value: data?.superhost_count ?? 0 },
        { name: 'Other Hosts', value: data?.non_superhost_count ?? 0 },
    ]

    return (
        <section>
            <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-bold text-gray-900">Host Insights</h2>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                        value={selectedNeighbourhood}
                        onChange={(e) => onChangeNeighbourhood(e.target.value)}
                        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                    >
                        {(data?.neighbourhoods ?? ['all']).map((n) => (
                            <option key={n} value={n}>{n === 'all' ? 'All Neighbourhoods' : n}</option>
                        ))}
                    </select>
                    <select
                        value={selectedRoomType}
                        onChange={(e) => onChangeRoomType(e.target.value)}
                        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                    >
                        {(data?.room_types ?? ['all']).map((r) => (
                            <option key={r} value={r}>{r === 'all' ? 'All Room Types' : r}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">Superhost Percentage</h3>
                    <p className="mb-2 text-2xl font-bold text-slate-900">{data?.superhost_percentage ?? 0}%</p>
                    <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                            <Pie data={superhostPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}>
                                {superhostPieData.map((entry, index) => (
                                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">Host Response Time Distribution</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data?.response_time_distribution ?? []} margin={{ top: 8, right: 16, left: 0, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="response_time" angle={-20} textAnchor="end" interval={0} height={60} tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} />
                            <Tooltip formatter={(value) => [value, 'Hosts']} />
                            <Bar dataKey="count" fill="#2563eb" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {loading && <p className="mt-2 text-sm text-gray-500">Loading host insights...</p>}
        </section>
    )
}
