import FeatureCard from '@/components/sections/FeatureCard'
import { BuildingOffice2Icon, CurrencyDollarIcon, StarIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import type { KpiResponse } from '@/types/dashboard'

export default function KpiSection({ kpis, loading }: { kpis: KpiResponse | null; loading: boolean }) {
    return (
        <section>
            <h2 className="mb-3 text-lg font-bold text-gray-900">Key Metrics</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <FeatureCard
                    title="Total Listings"
                    description={loading ? 'Loading...' : `${kpis?.total_listings ?? 0}`}
                    icon={<BuildingOffice2Icon className="h-7 w-7" />}
                />
                <FeatureCard
                    title="Avg Price / Night"
                    description={loading ? 'Loading...' : `$${kpis?.avg_price_per_night ?? 0}`}
                    icon={<CurrencyDollarIcon className="h-7 w-7" />}
                />
                <FeatureCard
                    title="Avg Occupancy Rate"
                    description={loading ? 'Loading...' : `${kpis?.avg_occupancy_rate ?? 'N/A'}`}
                    icon={<StarIcon className="h-7 w-7" />}
                />
                <FeatureCard
                    title="Superhosts"
                    description={loading ? 'Loading...' : `${kpis?.superhost_percentage ?? 0}%`}
                    icon={<UserGroupIcon className="h-7 w-7" />}
                />
            </div>
        </section>
    )
}