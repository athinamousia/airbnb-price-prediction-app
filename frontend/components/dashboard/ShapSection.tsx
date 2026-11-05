import {
    Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { ModelPerformance } from '@/types/dashboard'

const PREFIXES: [string, string][] = [
    ['amenity_', 'Amenity: '],
    ['property_type_', 'Property type: '],
    ['room_type_', 'Room type: '],
    ['neighbourhood_cleansed_', 'Neighbourhood: '],
]

const UP_COLOR = '#F99E69'
const DOWN_COLOR = '#0B1040'

export function prettyFeature(name: string): string {
    for (const [prefix, text] of PREFIXES) {
        if (name.startsWith(prefix)) {
            const rest = name.slice(prefix.length).replace(/_/g, ' ')
            return `${text}${rest.charAt(0).toUpperCase()}${rest.slice(1)}`
        }
    }
    const spaced = name.replace(/_/g, ' ')
    return `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`
}

function DarkTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null
    const item = payload[0].payload
    return (
        <div className="rounded-lg bg-black px-3 py-2 text-xs text-white shadow-xl">
            <p className="mb-1 font-medium text-white">{item.name}</p>
            <p className="text-white">Mean |SHAP|: <strong>{item.value.toFixed(4)}</strong></p>
            <p className="text-white">
                Higher values {item.corr >= 0 ? 'raise' : 'lower'} the price
            </p>
        </div>
    )
}

export default function ShapSection({ shap }: { shap: ModelPerformance['shap'] }) {
    const data = shap.features.map(f => ({
        name: prettyFeature(f.feature),
        value: f.mean_abs_shap,
        corr: f.value_shap_corr,
    }))

    return (
        <section>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                Feature Importance (SHAP)
            </p>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                {!shap.available ? (
                    <p className="text-sm text-gray-400">
                        SHAP results are not available yet. Run <code className="rounded bg-gray-50 px-1">python -m backend.modeling.shap</code> to generate them.
                    </p>
                ) : (
                    <>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-gray-400">
                                Top {data.length} features by average impact on log-price
                                {shap.n_rows ? ` · ${shap.n_rows.toLocaleString()} listings explained` : ''}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: UP_COLOR }} />
                                    Higher value raises price
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: DOWN_COLOR }} />
                                    Higher value lowers price
                                </span>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={Math.max(300, data.length * 28)}>
                            <BarChart data={data} layout="vertical"                             margin={{ top: 8, right: 24, left: 230, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" horizontal={false} />
                                <XAxis
                                    type="number" tickFormatter={v => v.toFixed(2)}
                                    tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                                />
                                <YAxis
                                                                type="category" dataKey="name" width={225} interval={0}
                                    tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false}
                                />
                                <Tooltip content={<DarkTooltip />} cursor={{ fill: '#F4F5F7' }} />
                                <Bar dataKey="value" name="Mean |SHAP|" radius={[0, 4, 4, 0]}>
                                    {data.map(item => (
                                        <Cell key={item.name} fill={item.corr >= 0 ? UP_COLOR : DOWN_COLOR} opacity={item.corr >= 0 ? 1 : 0.8} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <p className="mt-3 text-xs text-gray-400">
                            SHAP values are on the log-price scale: 0.1 is roughly a 10% change in the predicted price.
                        </p>
                    </>
                )}
            </div>
        </section>
    )
}
