import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PropertyTypeDistribution } from '@/types/dashboard'

const SELECT_CLS =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E1E2C] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#34B1AA]/40'

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

export default function PropertyTypeDistributionSection(props: {
    data: PropertyTypeDistribution | null
    loading: boolean
    selectedNeighbourhood: string
    selectedRoomType: string
    onChangeNeighbourhood: (value: string) => void
    onChangeRoomType: (value: string) => void
}) {
    const { data, loading, selectedNeighbourhood, selectedRoomType, onChangeNeighbourhood, onChangeRoomType } = props

    return (
        <section>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    Property Type Distribution
                </p>
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

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                        data={data?.property_types ?? []}
                        margin={{ top: 8, right: 16, left: 110, bottom: 8 }}
                        layout="vertical"
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" horizontal={false} />
                        <XAxis
                            type="number" allowDecimals={false}
                            tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                        />
                        <YAxis
                            type="category" dataKey="property_type" width={100}
                            tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false}
                        />
                        <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                        <Bar dataKey="count" fill="#34B1AA" radius={[0, 4, 4, 0]} name="Listings" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {loading && <p className="mt-2 text-xs text-gray-400">Loading property type distribution…</p>}
        </section>
    )
}
