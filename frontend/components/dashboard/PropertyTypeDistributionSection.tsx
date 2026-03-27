import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PropertyTypeDistribution } from '@/types/dashboard'

export default function PropertyTypeDistributionSection(props: {
    data: PropertyTypeDistribution | null
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

    return (
        <section>
            <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-bold text-gray-900">Property Type Distribution</h2>
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

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                        data={data?.property_types ?? []}
                        margin={{ top: 8, right: 16, left: 110, bottom: 8 }}
                        layout="vertical"
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="property_type" width={100} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value) => [value, 'Listings']} />
                        <Bar dataKey="count" fill="#2563eb" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {loading && <p className="mt-2 text-sm text-gray-500">Loading property type distribution...</p>}
        </section>
    )
}
