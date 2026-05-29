export interface KpiResponse {
    total_listings: number
    avg_price_per_night: number
    avg_occupancy_rate: number
    avg_review_score: number | null
    superhost_percentage: number
    instant_bookable_pct: number
    avg_min_nights: number
    total_hosts: number
}

export interface NeighbourhoodRow {
    neighbourhood: string
    count: number
    avg_price: number | null
    avg_rating: number | null
    superhost_pct: number
}

export interface PriceAnalysis {
    histogram: { labels: string[]; counts: number[]; kde: number[] }
    neighbourhoods: string[]
    avg_by_neighbourhood: { neighbourhood: string; avg_price: number }[]
    selected: string
    stats: { min: number; max: number; median: number; mean: number }
    neighbourhood_comparison: NeighbourhoodRow[]
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

export interface PredictionOptionColumn {
    name: string
    display_name: string
    description: string
    type: 'string' | 'number'
    input_kind: 'select' | 'number' | 'multi_select'
    option_count: number
    options: Array<string | number>
    default?: string | number | string[]
    min?: number
    max?: number
    step?: number
}

export interface PredictionOptionsResponse {
    columns: PredictionOptionColumn[]
}


export interface BoxPlotItem {
    category: string
    min: number
    q1: number
    median: number
    q3: number
    max: number
    count: number
}

export interface CorrelationItem {
    feature: string
    correlation: number
}

export interface AvgPriceItem {
    response_time: string
    avg_price: number
}

export interface HostAnalytics {
    price_by_superhost: BoxPlotItem[]
    price_by_response_rate: BoxPlotItem[]
    correlations: CorrelationItem[]
    avg_price_by_response_time: AvgPriceItem[]
    host_tenure_vs_price: BoxPlotItem[]
    portfolio_size_vs_price: BoxPlotItem[]
    instant_bookable_vs_price: BoxPlotItem[]
}

export interface AmenityItem {
    amenity: string
    count: number
    pct: number
    avg_price: number
}

export interface ReviewScatterItem {
    reviews_per_month: number
    price: number
    room_type: string
}

export interface RadarItem {
    subject: string
    score: number
    fullMark: number
}

export interface RatingScatterItem {
    rating: number
    price: number
}

export interface PropertyAnalytics {
    price_by_bedrooms: BoxPlotItem[]
    price_by_beds: BoxPlotItem[]
    price_by_bathrooms: BoxPlotItem[]
    top_amenities: AmenityItem[]
    price_vs_reviews: ReviewScatterItem[]
    price_by_accommodates: BoxPlotItem[]
    review_scores_radar: RadarItem[]
    price_vs_rating: RatingScatterItem[]
    min_nights_distribution: { nights: number; count: number }[]
    max_nights_distribution: { range: string; count: number }[]
}

export interface AvailabilityWindow {
    window: string
    avg_available_days: number
    avg_occupancy_pct: number
    max_days: number
}

export interface AvailabilityAnalytics {
    avg_availability: AvailabilityWindow[]
    occupancy_by_neighbourhood: { neighbourhood: string; occupancy_pct: number }[]
    price_vs_availability: { availability: number; price: number }[]
    availability_by_room_type: { room_type: string; availability_30?: number; availability_60?: number; availability_90?: number; availability_365?: number }[]
}