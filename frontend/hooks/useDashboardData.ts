'use client'

import { useEffect, useMemo, useState } from 'react'
import type { KpiResponse, PriceAnalysis } from '@/types/dashboard'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'

export function useDashboardData() {
    const [kpis, setKpis] = useState<KpiResponse | null>(null)
    const [priceAnalysis, setPriceAnalysis] = useState<PriceAnalysis | null>(null)
    const [selectedNeighbourhood, setSelectedNeighbourhood] = useState('all')
    const [loadingKpis, setLoadingKpis] = useState(true)
    const [loadingPrice, setLoadingPrice] = useState(true)

    useEffect(() => {
        fetch(`${API_BASE}/kpis`)
            .then((r) => r.json())
            .then(setKpis)
            .finally(() => setLoadingKpis(false))
    }, [])

    useEffect(() => {
        setLoadingPrice(true)
        fetch(`${API_BASE}/price-analysis?neighbourhood=${encodeURIComponent(selectedNeighbourhood)}`)
            .then((r) => r.json())
            .then(setPriceAnalysis)
            .finally(() => setLoadingPrice(false))
    }, [selectedNeighbourhood])

    const histogramData = useMemo(
        () =>
            priceAnalysis?.histogram.labels.map((label, i) => ({
                range: label,
                count: priceAnalysis.histogram.counts[i] ?? 0,
            })) ?? [],
        [priceAnalysis]
    )

    return {
        kpis,
        priceAnalysis,
        selectedNeighbourhood,
        setSelectedNeighbourhood,
        loadingKpis,
        loadingPrice,
        histogramData,
    }
}