'use client'

import { useEffect, useMemo, useState } from 'react'
import type { HostInsights, KpiResponse, PriceAnalysis, PropertyTypeDistribution } from '@/types/dashboard'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'

export function useDashboardData() {
    const [kpis, setKpis] = useState<KpiResponse | null>(null)
    const [priceAnalysis, setPriceAnalysis] = useState<PriceAnalysis | null>(null)
    const [propertyTypeDistribution, setPropertyTypeDistribution] = useState<PropertyTypeDistribution | null>(null)
    const [hostInsights, setHostInsights] = useState<HostInsights | null>(null)
    const [selectedNeighbourhood, setSelectedNeighbourhood] = useState('all')
    const [selectedPropertyNeighbourhood, setSelectedPropertyNeighbourhood] = useState('all')
    const [selectedRoomType, setSelectedRoomType] = useState('all')
    const [selectedHostNeighbourhood, setSelectedHostNeighbourhood] = useState('all')
    const [selectedHostRoomType, setSelectedHostRoomType] = useState('all')
    const [loadingKpis, setLoadingKpis] = useState(true)
    const [loadingPrice, setLoadingPrice] = useState(true)
    const [loadingPropertyType, setLoadingPropertyType] = useState(true)
    const [loadingHostInsights, setLoadingHostInsights] = useState(true)

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

    useEffect(() => {
        setLoadingPropertyType(true)
        fetch(
            `${API_BASE}/property-type-distribution?neighbourhood=${encodeURIComponent(selectedPropertyNeighbourhood)}&room_type=${encodeURIComponent(selectedRoomType)}`
        )
            .then((r) => r.json())
            .then(setPropertyTypeDistribution)
            .finally(() => setLoadingPropertyType(false))
    }, [selectedPropertyNeighbourhood, selectedRoomType])

    useEffect(() => {
        setLoadingHostInsights(true)
        fetch(
            `${API_BASE}/host-insights?neighbourhood=${encodeURIComponent(selectedHostNeighbourhood)}&room_type=${encodeURIComponent(selectedHostRoomType)}`
        )
            .then((r) => r.json())
            .then(setHostInsights)
            .finally(() => setLoadingHostInsights(false))
    }, [selectedHostNeighbourhood, selectedHostRoomType])

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
        propertyTypeDistribution,
        hostInsights,
        selectedNeighbourhood,
        setSelectedNeighbourhood,
        selectedPropertyNeighbourhood,
        setSelectedPropertyNeighbourhood,
        selectedRoomType,
        setSelectedRoomType,
        selectedHostNeighbourhood,
        setSelectedHostNeighbourhood,
        selectedHostRoomType,
        setSelectedHostRoomType,
        loadingKpis,
        loadingPrice,
        loadingPropertyType,
        loadingHostInsights,
        histogramData,
    }
}