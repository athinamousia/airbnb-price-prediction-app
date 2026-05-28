import FeatureCard from '@/components/sections/FeatureCard'
import { BuildingOffice2Icon, CurrencyDollarIcon, StarIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import type { KpiResponse } from '@/types/dashboard'

const KPI_ACCENTS = ['#F29F67', '#3B8FF3', '#34B1AA', '#E0B50F']

export default function KpiSection({ kpis, loading }: { kpis: KpiResponse | null; loading: boolean }) {
    return (
        <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Key Metrics</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <FeatureCard
                    title="Total Listings"
                    description={loading ? '—' : `${kpis?.total_listings?.toLocaleString() ?? 0}`}
                    icon={<BuildingOffice2Icon className="h-6 w-6" />}
                    accent={KPI_ACCENTS[0]}
                />
                <FeatureCard
                    title="Avg Price / Night"
                    description={loading ? '—' : `$${kpis?.avg_price_per_night ?? 0}`}
                    icon={<CurrencyDollarIcon className="h-6 w-6" />}
                    accent={KPI_ACCENTS[1]}
                />
                <FeatureCard
                    title="Avg Occupancy Rate"
                    description={loading ? '—' : `${kpis?.avg_occupancy_rate ?? 'N/A'}`}
                    icon={<StarIcon className="h-6 w-6" />}
                    accent={KPI_ACCENTS[2]}
                />
                <FeatureCard
                    title="Superhosts"
                    description={loading ? '—' : `${kpis?.superhost_percentage ?? 0}%`}
                    icon={<UserGroupIcon className="h-6 w-6" />}
                    accent={KPI_ACCENTS[3]}
                />
            </div>
        </section>
    )
}