'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import SidebarLayout from '@/components/layout/SidebarLayout'
import type { PredictionOptionColumn, PredictionOptionsResponse } from '@/types/dashboard'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'
const PREDICTION_STORAGE_KEY = 'airbnb_prediction_result'

const INPUT_CATEGORIES: { title: string; columns: string[] }[] = [
    {
        title: 'Host Information',
        columns: ['host_listings_count', 'host_verifications', 'host_identity_verified'],
    },
    {
        title: 'Property Information',
        columns: ['property_type', 'room_type', 'bedrooms', 'beds', 'amenities', 'bath_count', 'bath_is_shared'],
    },
    {
        title: 'Neighborhood',
        columns: ['latitude', 'longitude', 'neighbourhood_cleansed'],
    },
    {
        title: 'Booking Information',
        columns: ['accommodates', 'minimum_nights', 'maximum_nights', 'instant_bookable', 'availability_30', 'availability_60', 'availability_90', 'availability_365'],
    },
]

export default function PredictPage() {
    const router = useRouter()
    const [data, setData] = useState<PredictionOptionsResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedValues, setSelectedValues] = useState<Record<string, string | number>>({})
    const [multiSelectedValues, setMultiSelectedValues] = useState<Record<string, string[]>>({})
    const [query, setQuery] = useState('')
    const [predicting, setPredicting] = useState(false)
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
                const multiDefaults: Record<string, string[]> = {}
                payload.columns.forEach((column) => {
                    if (column.input_kind === 'multi_select') {
                        multiDefaults[column.name] = []
                    }
                })
                setSelectedValues({})
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

    const groupedColumns = useMemo(() => {
        const known = new Set(INPUT_CATEGORIES.flatMap((category) => category.columns))
        const groups = INPUT_CATEGORIES.map((category) => ({
            title: category.title,
            columns: category.columns
                .map((name) => visibleColumns.find((column) => column.name === name))
                .filter((column): column is PredictionOptionColumn => Boolean(column)),
        }))
        const others = visibleColumns.filter((column) => !known.has(column.name))
        if (others.length > 0) {
            groups.push({ title: 'Other', columns: others })
        }
        return groups.filter((group) => group.columns.length > 0)
    }, [visibleColumns])

    const selectionPreview = useMemo(() => {
        const merged: Record<string, string | number | string[]> = { ...selectedValues }
        Object.entries(multiSelectedValues).forEach(([key, value]) => {
            merged[key] = value
        })
        return merged
    }, [multiSelectedValues, selectedValues])

    const allFilled = useMemo(() => {
        if (!data) {
            return false
        }
        return data.columns.every((column) => {
            if (column.input_kind === 'multi_select') {
                return (multiSelectedValues[column.name] ?? []).length > 0
            }
            const value = selectedValues[column.name]
            return value !== undefined && value !== '' && !(typeof value === 'number' && !Number.isFinite(value))
        })
    }, [data, multiSelectedValues, selectedValues])

    const handlePredict = async () => {
        if (!allFilled) {
            return
        }
        setPredicting(true)
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
            sessionStorage.setItem(PREDICTION_STORAGE_KEY, JSON.stringify({ predicted_price: result.predicted_price }))
            router.push('/predict/result')
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
                                    className="h-4 w-4 rounded border-gray-300 accent-[#F99E69]"
                                />
                                <span>{value}</span>
                            </label>
                        )
                    })}
                </div>
            )
        }

        if (column.input_kind === 'slider') {
            const min = column.min ?? 0
            const max = column.max ?? 100
            const raw = selectedValues[column.name]
            const isSet = typeof raw === 'number' && Number.isFinite(raw)
            const current = isSet ? (raw as number) : min
            const percent = max > min ? ((current - min) / (max - min)) * 100 : 0
            const commit = (next: number) =>
                setSelectedValues((prev) => ({ ...prev, [column.name]: next }))

            return (
                <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                        <span className="text-xs text-gray-400">Low</span>
                        <span className={`text-sm font-semibold ${isSet ? 'text-[#1E1E2C]' : 'text-gray-400'}`}>
                            {isSet ? `${current} days` : ''}
                        </span>
                        <span className="text-xs text-gray-400">High</span>
                    </div>
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={column.step ?? 1}
                        value={current}
                        onChange={(event) => commit(Number(event.target.value))}
                        onPointerUp={(event) => commit(Number(event.currentTarget.value))}
                        onKeyUp={(event) => commit(Number(event.currentTarget.value))}
                        className="availability-slider w-full"
                        style={{
                            background: `linear-gradient(to right, #F99E69 0%, #F99E69 ${percent}%, #E5E7EB ${percent}%, #E5E7EB 100%)`,
                        }}
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>{min}</span>
                        <span>{max}</span>
                    </div>
                </div>
            )
        }
        if (column.input_kind === 'number') {
            const step = column.step ?? 1
            const min = typeof column.min === 'number' ? column.min : undefined
            const max = typeof column.max === 'number' ? column.max : undefined
            const rawValue = selectedValues[column.name]
            const isEmpty = rawValue === undefined || rawValue === ''
            const value = isEmpty ? '' : Number(rawValue)

            const adjust = (direction: 1 | -1) => {
                setSelectedValues((prev) => {
                    const current = Number(prev[column.name])
                    const base = prev[column.name] === undefined || prev[column.name] === '' || !Number.isFinite(current)
                        ? (min ?? 0)
                        : current
                    let next = prev[column.name] === undefined || prev[column.name] === '' ? base : base + direction * step
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
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-400 transition-colors hover:border-[#F99E69] hover:text-[#F99E69]"
                        >
                            −
                        </button>
                        <input
                            type="number"
                            value={value}
                            step={step}
                            min={min}
                            max={max}
                            onChange={(event) =>
                                setSelectedValues((prev) => ({
                                    ...prev,
                                    [column.name]: event.target.value === '' ? '' : Number(event.target.value),
                                }))
                            }
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E1E2C] shadow-sm focus:border-[#F99E69] focus:outline-none focus:ring-2 focus:ring-[#F99E69]/20"
                        />
                        <button
                            type="button"
                            onClick={() => adjust(1)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-400 transition-colors hover:border-[#F99E69] hover:text-[#F99E69]"
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
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E1E2C] shadow-sm focus:border-[#F99E69] focus:outline-none focus:ring-2 focus:ring-[#F99E69]/20"
            >
                <option value="" disabled>
                    Select…
                </option>
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
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E1E2C] shadow-sm focus:border-[#F99E69] focus:outline-none focus:ring-2 focus:ring-[#F99E69]/20 md:w-80"
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
                    <>
                        {groupedColumns.map((group) => (
                            <section key={group.title} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                                <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{group.title}</p>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {group.columns.map((column) => (
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
                        ))}
                    </>
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
                                disabled={predicting || !allFilled}
                                title={allFilled ? undefined : 'Fill in all inputs to enable prediction'}
                                className="shrink-0 rounded-lg bg-[#F99E69] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#F16122] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {predicting ? 'Predicting…' : 'Get Price Prediction'}
                            </button>
                        </div>

                        {predictError && (
                            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-600">
                                {predictError}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </SidebarLayout>
    )
}
