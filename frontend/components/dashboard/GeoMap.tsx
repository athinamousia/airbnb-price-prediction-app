'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useMap } from 'react-leaflet'
import type { GeoNeighbourhood } from '@/types/dashboard'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false })
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false })

import 'leaflet/dist/leaflet.css'

type PriceRange = { min: number; max: number; color: string; label: string }

const PRICE_RANGES: PriceRange[] = [
    { min: 0, max: 50, color: '#34B1AA', label: '< $40' },
    { min: 40, max: 60, color: '#84CC16', label: '$40–60' },
    { min: 60, max: 80, color: '#E0B50F', label: '$60–80' },
    { min: 80, max: 100, color: '#F29F67', label: '$80–100' },
    { min: 100, max: Number.POSITIVE_INFINITY, color: '#E05858', label: '> $100' },
]

function getColor(price: number): string {
    return PRICE_RANGES.find(r => price >= r.min && price < r.max)?.color
        ?? PRICE_RANGES[PRICE_RANGES.length - 1].color
}

function getRadius(count: number, maxCount: number): number {
    const min = 6
    const max = 24
    return min + ((count / maxCount) * (max - min))
}

function FitBounds({ points }: { points: GeoNeighbourhood[] }) {
    const map = useMap()
    useEffect(() => {
        if (points.length === 0) return
        const lats = points.map(p => p.latitude)
        const lngs = points.map(p => p.longitude)
        map.fitBounds(
            [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
            { padding: [40, 40] }
        )
    }, [map, points])
    return null
}

export default function GeoMap() {
    const [points, setPoints] = useState<GeoNeighbourhood[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('http://localhost:8000/api/v1/geo-distribution/grouped')
            .then(res => res.json())
            .then(data => {
                setPoints(Array.isArray(data) ? data : [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    const centerLat = points.length ? points.reduce((s, p) => s + p.latitude, 0) / points.length : 0
    const centerLng = points.length ? points.reduce((s, p) => s + p.longitude, 0) / points.length : 0
    const maxCount = points.length ? Math.max(...points.map(p => p.count)) : 1

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                Geographic Distribution by Neighbourhood
            </p>

            {loading ? (
                <div className="flex h-[400px] items-center justify-center text-gray-400">Loading map...</div>
            ) : (
                <>
                    <MapContainer
                        center={[centerLat, centerLng]}
                        zoom={12}
                        style={{ height: '400px', width: '100%', borderRadius: '8px' }}
                    >
                        <FitBounds points={points} />
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {points.map((point) => (
                            <CircleMarker
                                key={point.neighbourhood}
                                center={[point.latitude, point.longitude]}
                                radius={getRadius(point.count, maxCount)}
                                pathOptions={{
                                    color: getColor(point.avg_price),
                                    fillColor: getColor(point.avg_price),
                                    fillOpacity: 0.75,
                                    weight: 1,
                                }}
                            >
                                <Tooltip permanent={false}>
                                    <div className="text-xs">
                                        <p className="font-semibold">{point.neighbourhood}</p>
                                        <p>Avg price: <strong>${point.avg_price}/night</strong></p>
                                        <p>Listings: {point.count}</p>
                                    </div>
                                </Tooltip>
                            </CircleMarker>
                        ))}
                    </MapContainer>

                    {/* Legend */}
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-700">
                        <span className="font-medium text-[#1E1E2C]">Avg Price / Night:</span>
                        {PRICE_RANGES.map((range) => (
                            <span key={range.label} className="flex items-center gap-1">
                                <span
                                    className="inline-block h-3 w-3 rounded-full"
                                    style={{ backgroundColor: range.color }}
                                />
                                {range.label}
                            </span>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}