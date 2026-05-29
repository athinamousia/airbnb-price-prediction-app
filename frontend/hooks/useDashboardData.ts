'use client'

import { useEffect, useMemo, useState } from 'react'
import type {
    AvailabilityAnalytics, HostAnalytics, HostInsights, KpiResponse,
    PriceAnalysis, PropertyAnalytics, PropertyTypeDistribution,
} from '@/types/dashboard'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'

export function useDashboardData() {
    const [kpis, setKpis] = useState<KpiResponse | null>(null)
    const [priceAnalysis, setPriceAnalysis] = useState<PriceAnalysis | null>(null)
    const [propertyTypeDistribution, setPropertyTypeDistribution] = useState<PropertyTypeDistribution | null>(null)
    const [hostInsights, setHostInsights] = useState<HostInsights | null>(null)
    const [hostAnalytics, setHostAnalytics] = useState<HostAnalytics | null>(null)
    const [propertyAnalytics, setPropertyAnalytics] = useState<PropertyAnalytics | null>(null)
    const [availabilityAnalytics, setAvailabilityAnalytics] = useState<AvailabilityAnalytics | null>(null)

    const [selectedNeighbourhood, setSelectedNeighbourhood] = useState('all')
    const [selectedPropertyNeighbourhood, setSelectedPropertyNeighbourhood] = useState('all')
    const [selectedRoomType, setSelectedRoomType] = useState('all')
    const [selectedHostNeighbourhood, setSelectedHostNeighbourhood] = useState('all')
    const [selectedHostRoomType, setSelectedHostRoomType] = useState('all')

    const [loadingKpis, setLoadingKpis] = useState(true)
    const [loadingPrice, setLoadingPrice] = useState(true)
    const [loadingPropertyType, setLoadingPropertyType] = useState(true)
    const [loadingHostInsights, setLoadingHostInsights] = useState(true)
    const [loadingHostAnalytics, setLoadingHostAnalytics] = useState(true)
    const [loadingPropertyAnalytics, setLoadingPropertyAnalytics] = useState(true)
    const [loadingAvailability, setLoadingAvailability] = useState(true)

    useEffect(() => {
        fetch(`${API_BASE}/kpis`).then(r => r.json()).then(setKpis).finally(() => setLoadingKpis(false))
        fetch(`${API_BASE}/property-analytics`).then(r => r.json()).then(setPropertyAnalytics).finally(() => setLoadingPropertyAnalytics(false))
        fetch(`${API_BASE}/availability-analytics`).then(r => r.json()).then(setAvailabilityAnalytics).finally(() => setLoadingAvailability(false))
    }, [])

    useEffect(() => {
        setLoadingHostAnalytics(true)
        fetch(`${API_BASE}/host-analytics?neighbourhood=${encodeURIComponent(selectedHostNeighbourhood)}`)
            .then(r => r.json()).then(setHostAnalytics).finally(() => setLoadingHostAnalytics(false))
    }, [selectedHostNeighbourhood])

    useEffect(() => {
        setLoadingPrice(true)
        fetch(`${API_BASE}/price-analysis?neighbourhood=${encodeURIComponent(selectedNeighbourhood)}`)
            .then(r => r.json()).then(setPriceAnalysis).finally(() => setLoadingPrice(false))
    }, [selectedNeighbourhood])

    useEffect(() => {
        setLoadingPropertyType(true)
        fetch(`${API_BASE}/property-type-distribution?neighbourhood=${encodeURIComponent(selectedPropertyNeighbourhood)}&room_type=${encodeURIComponent(selectedRoomType)}`)
            .then(r => r.json()).then(setPropertyTypeDistribution).finally(() => setLoadingPropertyType(false))
    }, [selectedPropertyNeighbourhood, selectedRoomType])

    useEffect(() => {
        setLoadingHostInsights(true)
        fetch(`${API_BASE}/host-insights?neighbourhood=${encodeURIComponent(selectedHostNeighbourhood)}&room_type=${encodeURIComponent(selectedHostRoomType)}`)
            .then(r => r.json()).then(setHostInsights).finally(() => setLoadingHostInsights(false))
    }, [selectedHostNeighbourhood, selectedHostRoomType])

    const histogramData = useMemo(
        () =>
            priceAnalysis?.histogram?.labels?.map((label, i) => ({
                range: label,
                count: priceAnalysis.histogram.counts[i] ?? 0,
                kde: priceAnalysis.histogram.kde?.[i] ?? null,
            })) ?? [],
        [priceAnalysis]
    )

    return {
        kpis, priceAnalysis, propertyTypeDistribution, hostInsights,
        hostAnalytics, propertyAnalytics, availabilityAnalytics,
        selectedNeighbourhood, setSelectedNeighbourhood,
        selectedPropertyNeighbourhood, setSelectedPropertyNeighbourhood,
        selectedRoomType, setSelectedRoomType,
        selectedHostNeighbourhood, setSelectedHostNeighbourhood,
        selectedHostRoomType, setSelectedHostRoomType,
        loadingKpis, loadingPrice, loadingPropertyType, loadingHostInsights,
        loadingHostAnalytics, loadingPropertyAnalytics, loadingAvailability,
        histogramData,
    }
}