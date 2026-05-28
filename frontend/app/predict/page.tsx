'use client'

import { useEffect, useMemo, useState } from 'react'
import SidebarLayout from '@/components/layout/SidebarLayout'
import type { PredictionOptionColumn, PredictionOptionsResponse } from '@/types/dashboard'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'

export default function PredictPage() {
    const [data, setData] = useState<PredictionOptionsResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedValues, setSelectedValues] = useState<Record<string, string | number>>({})
    const [multiSelectedValues, setMultiSelectedValues] = useState<Record<string, string[]>>({})
    const [query, setQuery] = useState('')
    const [predicting, setPredicting] = useState(false)
    const [predictedPrice, setPredictedPrice] = useState<number | null>(null)
    const [predictError, setPredictError] = useState<string | null>(null)

    useEffect(() => {
        setLoading(true)
        fetch(`${API_BASE}/prediction-options`)
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`)
                }
                return (await response.json()) as PredictionOptionsResponse
            })
            .then((payload) => {
                setData(payload)
                const defaults: Record<string, string | number> = {}
                const multiDefaults: Record<string, string[]> = {}
                payload.columns.forEach((column) => {
                    if (column.input_kind === 'multi_select') {
                        multiDefaults[column.name] = []
                        return
                    }

                    if (column.input_kind === 'number') {
                        const defaultValue = typeof column.default === 'number' ? column.default : Number(column.default ?? 0)
                        defaults[column.name] = Number.isFinite(defaultValue) ? defaultValue : 0
                        return
                    }

                    if (column.options.length > 0) {
                        defaults[column.name] = String(column.default ?? column.options[0])
                    }
                })
                setSelectedValues(defaults)
                setMultiSelectedValues(multiDefaults)
            })
            .catch((requestError) => {
                setError(requestError instanceof Error ? requestError.message : 'Unknown error')
            })
            .finally(() => setLoading(false))
    }, [])

    const visibleColumns = useMemo(() => {
        if (!data) {
            return []
        }

        const normalized = query.trim().toLowerCase()
        if (!normalized) {
            return data.columns
        }

        return data.columns.filter((column) =>
            `${column.display_name} ${column.name} ${column.description}`.toLowerCase().includes(normalized)
        )
    }, [data, query])

    const selectionPreview = useMemo(() => {
        const merged: Record<string, string | number | string[]> = { ...selectedValues }
        Object.entries(multiSelectedValues).forEach(([key, value]) => {
            merged[key] = value
        })
        return merged
    }, [multiSelectedValues, selectedValues])

    const handlePredict = async () => {
        setPredicting(true)
        setPredictedPrice(null)
        setPredictError(null)
        try {
            const response = await fetch(`${API_BASE}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inputs: selectionPreview }),
            })
            if (!response.ok) {
                const detail = await response.json().catch(() => null)
                throw new Error(detail?.detail ?? `Request failed with status ${response.status}`)
            }
            const result = await response.json() as { predicted_price: number }
            setPredictedPrice(result.predicted_price)
        } catch (err) {
            setPredictError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setPredicting(false)
        }
    }

    const renderInput = (column: PredictionOptionColumn) => {
        if (column.input_kind === 'multi_select') {
            const selected = multiSelectedValues[column.name] ?? []
            return (
                <div className="max-h-48 space-y-1.5 overflow-auto rounded-xl border border-gray-100 bg-gray-50 p-3">
                    {column.options.map((option) => {
                        const value = String(option)
                        const checked = selected.includes(value)
                        return (
                            <label key={`${column.name}-${value}`} className="flex items-center gap-2 text-sm text-[#1E1E2C] cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) => {
                                        setMultiSelectedValues((prev) => {
                                            const existing = prev[column.name] ?? []
                                            const nextValues = event.target.checked
                                                ? [...existing, value]
                                                : existing.filter((item) => item !== value)
                                            return {
                                                ...prev,
                                                [column.name]: nextValues,
                                            }
                                        })
                                    }}
                                    className="h-4 w-4 rounded border-gray-300 accent-[#F29F67]"
                                />
                                <span>{value}</span>
                            </label>
                        )
                    })}
                </div>
            )
        }

        if (column.input_kind === 'number') {
            const step = column.step ?? 1
            const min = typeof column.min === 'number' ? column.min : undefined
            const max = typeof column.max === 'number' ? column.max : undefined
            const value = Number(selectedValues[column.name] ?? column.default ?? 0)

            const adjust = (direction: 1 | -1) => {
                setSelectedValues((prev) => {
                    const current = Number(prev[column.name] ?? value)
                    const base = Number.isFinite(current) ? current : 0
                    let next = base + direction * step
                    if (typeof min === 'number') {
                        next = Math.max(min, next)
                    }
                    if (typeof max === 'number') {
                        next = Math.min(max, next)
                    }
                    return {
                        ...prev,
                        [column.name]: Number(next.toFixed(step < 1 ? 2 : 0)),
                    }
                })
            }

            return (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => adjust(-1)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-400 transition-colors hover:border-[#F29F67] hover:text-[#F29F67]"
                        >
                            −
                        </button>
                        <input
                            type="number"
                            value={Number.isFinite(value) ? value : 0}
                            step={step}
                            min={min}
                            max={max}
                            onChange={(event) =>
                                setSelectedValues((prev) => ({
                                    ...prev,
                                    [column.name]: Number(event.target.value),
                                }))
                            }
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E1E2C] shadow-sm focus:border-[#F29F67] focus:outline-none focus:ring-2 focus:ring-[#F29F67]/20"
                        />
                        <button
                            type="button"
                            onClick={() => adjust(1)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-400 transition-colors hover:border-[#F29F67] hover:text-[#F29F67]"
                        >
                            +
                        </button>
                    </div>
                    <p className="text-xs text-gray-400">
                        {typeof min === 'number' ? `Min ${min}` : 'No min'} | {typeof max === 'number' ? `Max ${max}` : 'No max'}
                    </p>
                </div>
            )
        }

        return (
            <select
                value={String(selectedValues[column.name] ?? '')}
                onChange={(event) =>
                    setSelectedValues((prev) => ({
                        ...prev,
                        [column.name]: event.target.value,
                    }))
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E1E2C] shadow-sm focus:border-[#F29F67] focus:outline-none focus:ring-2 focus:ring-[#F29F67]/20"
            >
                {column.options.map((option) => {
                    const key = `${column.name}-${String(option)}`
                    return (
                        <option key={key} value={String(option)}>
                            {String(option)}
                        </option>
                    )
                })}
            </select>
        )
    }

    return (
        <SidebarLayout>
            <div className="space-y-6 p-6">
                <header className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Model Inputs</p>
                    <h1 className="mt-1 text-xl font-bold text-[#1E1E2C]">Configure Prediction Variables</h1>
                    <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <p className="text-xs text-gray-400">
                            {data?.columns.length ?? 0} variables &middot; {visibleColumns.length} visible
                        </p>
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search variable…"
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E1E2C] shadow-sm focus:border-[#F29F67] focus:outline-none focus:ring-2 focus:ring-[#F29F67]/20 md:w-80"
                        />
                    </div>
                </header>

                {loading && (
                    <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm text-gray-400 shadow-sm">
                        Loading prediction options...
                    </div>
                )}

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
                        Failed to load options: {error}
                    </div>
                )}

                {!loading && !error && (
                    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                        <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Modeling Inputs</p>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {visibleColumns.map((column) => (
                                <article key={column.name} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                                    <div className="mb-1.5 flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-[#1E1E2C]">{column.display_name}</h3>
                                    </div>
                                    <p className="mb-3 text-xs text-gray-400">{column.description}</p>
                                    {renderInput(column)}
                                </article>
                            ))}
                        </div>
                    </section>
                )}

                {!loading && !error && data && (
                    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Estimate</p>
                                <h2 className="mt-0.5 text-lg font-bold text-[#1E1E2C]">Price Prediction</h2>
                                <p className="text-xs text-gray-400">Submit the current inputs to the model for an estimated nightly price.</p>
                            </div>
                            <button
                                type="button"
                                onClick={handlePredict}
                                disabled={predicting}
                                className="shrink-0 rounded-lg bg-[#F29F67] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#e8904f] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {predicting ? 'Predicting…' : 'Get Price Prediction'}
                            </button>
                        </div>

                        {predictError && (
                            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-600">
                                {predictError}
                            </div>
                        )}

                        {predictedPrice !== null && !predictError && (
                            <div className="mt-4 rounded-xl border border-[#F29F67]/30 bg-[#F29F67]/10 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#F29F67]">Estimated Nightly Price</p>
                                <p className="mt-1 text-3xl font-bold text-[#1E1E2C]">${predictedPrice.toFixed(2)}</p>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </SidebarLayout>
    )
}
