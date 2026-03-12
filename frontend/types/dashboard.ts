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