export interface KpiResponse {
    total_listings: number
    avg_price_per_night: number
    avg_occupancy_rate: number
    avg_review_score: number | null
    superhost_percentage: number
}

export interface PriceAnalysis {
    histogram: { labels: string[]; counts: number[] }
    neighbourhoods: string[]
    avg_by_neighbourhood: { neighbourhood: string; avg_price: number }[]
    selected: string
    stats: { min: number; max: number; median: number; mean: number }
}

export interface GeoPoint {
    latitude: number
    longitude: number
    price: number
    neighbourhood: string
}

export interface GeoNeighbourhood {
    neighbourhood: string
    latitude: number
    longitude: number
    avg_price: number
    count: number
}

export interface PropertyTypeDistribution {
    property_types: { property_type: string; count: number }[]
    neighbourhoods: string[]
    room_types: string[]
    selected_neighbourhood: string
    selected_room_type: string
}

export interface HostInsights {
    superhost_percentage: number
    superhost_count: number
    non_superhost_count: number
    response_time_distribution: { response_time: string; count: number }[]
    neighbourhoods: string[]
    room_types: string[]
    selected_neighbourhood: string
    selected_room_type: string
}