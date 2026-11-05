'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import SidebarLayout from '@/components/layout/SidebarLayout'
import ModelComparisonSection, { MODEL_LABELS } from '@/components/dashboard/ModelComparisonSection'
import ShapSection from '@/components/dashboard/ShapSection'
import type { ModelPerformance } from '@/types/dashboard'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'
const PREDICTION_STORAGE_KEY = 'airbnb_prediction_result'

export default function PredictionResultPage() {
    const [predictedPrice, setPredictedPrice] = useState<number | null>(null)
    const [performance, setPerformance] = useState<ModelPerformance | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const stored = sessionStorage.getItem(PREDICTION_STORAGE_KEY)
        if (stored) {
            const parsed = JSON.parse(stored) as { predicted_price: number }
            setPredictedPrice(parsed.predicted_price)
        }

        fetch(`${API_BASE}/model-performance`)
            .then(async (response) => {
                if (!response.ok) {
                    const detail = await response.json().catch(() => null)
                    throw new Error(detail?.detail ?? `Request failed with status ${response.status}`)
                }
                return (await response.json()) as ModelPerformance
            })
            .then(setPerformance)
            .catch((requestError) => {
                setError(requestError instanceof Error ? requestError.message : 'Unknown error')
            })
            .finally(() => setLoading(false))
    }, [])

    return (
        <SidebarLayout>
            <div className="space-y-6 p-6">
                <header className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Prediction Result</p>
                        <h1 className="mt-1 text-xl font-bold text-[#1E1E2C]">Estimated Nightly Price</h1>
                    </div>
                    <Link
                        href="/predict"
                        className="shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#1E1E2C] shadow-sm transition-colors hover:border-[#F99E69] hover:text-[#F99E69]"
                    >
                        &larr; Change inputs
                    </Link>
                </header>

                {predictedPrice !== null ? (
                    <div className="rounded-xl border border-[#F99E69]/30 bg-[#F99E69]/10 p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#F99E69]">Predicted Price per Night</p>
                        <p className="mt-1 text-4xl font-bold text-[#1E1E2C]">${predictedPrice.toFixed(2)}</p>
                        {performance && (
                            <p className="mt-2 text-xs text-gray-500">
                                Predicted by the {MODEL_LABELS[performance.best_model] ?? performance.best_model} model.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm text-gray-400 shadow-sm">
                        No prediction found. Go back and submit the inputs to get a price estimate.
                    </div>
                )}

                {loading && (
                    <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm text-gray-400 shadow-sm">
                        Loading model performance...
                    </div>
                )}

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
                        Failed to load model performance: {error}
                    </div>
                )}

                {performance && (
                    <>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Model Performance Overview</p>
                        <ModelComparisonSection models={performance.models} />
                        <ShapSection shap={performance.shap} />
                    </>
                )}
            </div>
        </SidebarLayout>
    )
}
