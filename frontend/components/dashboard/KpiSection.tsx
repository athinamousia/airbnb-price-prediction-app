import FeatureCard from '@/components/sections/FeatureCard'
import type { KpiResponse } from '@/types/dashboard'

export default function KpiSection({ kpis, loading }: { kpis: KpiResponse | null; loading: boolean }) {
    return (
        <section>
            <h2 className="mb-3 text-lg font-bold text-gray-900">Key Metrics</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <FeatureCard title="Total Listings" description={loading ? 'Loading...' : `${kpis?.total_listings ?? 0}`} />
                <FeatureCard title="Avg Price / Night" description={loading ? 'Loading...' : `$${kpis?.avg_price_per_night ?? 0}`} />
                <FeatureCard title="Avg Review Score" description={loading ? 'Loading...' : `${kpis?.avg_review_score ?? 'N/A'}`} />
                <FeatureCard title="Superhosts" description={loading ? 'Loading...' : `${kpis?.superhost_percentage ?? 0}%`} />
            </div>
        </section>
    )
}