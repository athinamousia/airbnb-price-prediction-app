import { useState } from 'react'
import {
    Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { ModelComparisonItem } from '@/types/dashboard'

export const MODEL_LABELS: Record<string, string> = {
    ridge: 'Ridge',
    elasticnet: 'ElasticNet',
    random_forest: 'Random Forest',
    extra_trees: 'Extra Trees',
    gradient_boosting: 'Gradient Boosting',
    hist_gradient_boosting: 'Hist Gradient Boosting',
    xgboost: 'XGBoost',
    stacking: 'Stacking Ensemble',
}

type MetricKey = 'r2_price' | 'mae_price' | 'rmse_price'

const METRIC_OPTIONS: { key: MetricKey; label: string; higherIsBetter: boolean; format: (v: number) => string }[] = [
    { key: 'r2_price', label: 'R² (price)', higherIsBetter: true, format: v => v.toFixed(3) },
    { key: 'mae_price', label: 'MAE (price)', higherIsBetter: false, format: v => `$${v.toFixed(2)}` },
    { key: 'rmse_price', label: 'RMSE (price)', higherIsBetter: false, format: v => `$${v.toFixed(2)}` },
]

const SELECT_CLS =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E1E2C] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F99E69]/40'

function DarkTooltip({ active, payload, label, format }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg bg-black px-3 py-2 text-xs text-white shadow-xl">
            <p className="mb-1 font-medium text-white">{label}</p>
            <p className="text-white">{payload[0].name}: <strong>{format(payload[0].value)}</strong></p>
        </div>
    )
}

const label = (name: string) => MODEL_LABELS[name] ?? name

export default function ModelComparisonSection({ models }: { models: ModelComparisonItem[] }) {
    const [metricKey, setMetricKey] = useState<MetricKey>('r2_price')
    const metric = METRIC_OPTIONS.find(m => m.key === metricKey)!

    const chartData = models
        .map(m => ({ name: label(m.name), value: m.test[metricKey], is_best: m.is_best }))
        .sort((a, b) => (metric.higherIsBetter ? b.value - a.value : a.value - b.value))

    const rows = [...models].sort((a, b) => a.validation.rmse_price - b.validation.rmse_price)
    const cell = (v: number, digits = 3) => v.toFixed(digits)
    const th = 'whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500'

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    Model Comparison (Test Set)
                </p>
                <select value={metricKey} onChange={e => setMetricKey(e.target.value as MetricKey)} className={SELECT_CLS}>
                    {METRIC_OPTIONS.map(m => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                </select>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    {metric.label} &middot; {metric.higherIsBetter ? 'higher is better' : 'lower is better'}
                </p>
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 150, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" horizontal={false} />
                        <XAxis
                            type="number" tickFormatter={metric.format}
                            tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                        />
                        <YAxis
                            type="category" dataKey="name" width={145}
                            tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false}
                        />
                        <Tooltip content={<DarkTooltip format={metric.format} />} cursor={{ fill: '#F4F5F7' }} />
                        <Bar dataKey="value" name={metric.label} radius={[0, 4, 4, 0]}>
                            {chartData.map(item => (
                                <Cell key={item.name} fill={item.is_best ? '#F99E69' : '#0B1040'} opacity={item.is_best ? 1 : 0.8} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    All Metrics
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className={th}>Model</th>
                                <th className={th}>Val RMSE ($)</th>
                                <th className={th}>Test RMSE ($)</th>
                                <th className={th}>Test MAE ($)</th>
                                <th className={th}>Test R²</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(m => (
                                <tr
                                    key={m.name}
                                    className={`border-b border-gray-50 hover:bg-gray-50 ${m.is_best ? 'bg-[#F99E69]/10' : ''}`}
                                >
                                    <td className="px-3 py-2 font-medium text-[#1E1E2C]">
                                        {label(m.name)}
                                        {m.is_best && (
                                            <span className="ml-2 rounded-full bg-[#F99E69] px-2 py-0.5 text-[10px] font-semibold text-white">
                                                Best
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-gray-600">{cell(m.validation.rmse_price, 2)}</td>
                                    <td className="px-3 py-2 text-gray-600">{cell(m.test.rmse_price, 2)}</td>
                                    <td className="px-3 py-2 text-gray-600">{cell(m.test.mae_price, 2)}</td>
                                    <td className="px-3 py-2 text-gray-600">{cell(m.test.r2_price)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-3 text-xs text-gray-400">
                    The best model is selected on the validation set. Test metrics come from the train-only fit.
                </p>
            </div>
        </section>
    )
}
