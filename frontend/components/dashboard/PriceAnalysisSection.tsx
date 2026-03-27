import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import type { PriceAnalysis } from '@/types/dashboard'

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
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Price Analysis</h2>
                <select
                    value={selected}
                    onChange={(e) => onChangeNeighbourhood(e.target.value)}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                >
                    {data?.neighbourhoods.map((n) => (
                        <option key={n} value={n}>{n === 'all' ? 'All Neighbourhoods' : n}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">Price Distribution</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={histogramData} margin={{ top: 8, right: 8, left: 0, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="range" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#2563eb" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">Avg Price by Neighbourhood</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data?.avg_by_neighbourhood ?? []} layout="vertical" margin={{ top: 8, right: 16, left: 90, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                            <YAxis type="category" dataKey="neighbourhood" width={85} tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(v) => [`$${v}`, 'Avg Price']} />
                            <Bar dataKey="avg_price" fill="#7c3aed" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {loading && <p className="mt-2 text-sm text-gray-500">Loading price analysis...</p>}
        </section>
    )
}