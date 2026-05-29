import FeatureCard from '@/components/sections/FeatureCard'
import { BoltIcon, BuildingOffice2Icon, CalendarDaysIcon, CurrencyDollarIcon, StarIcon, UserGroupIcon, UsersIcon } from '@heroicons/react/24/outline'
import type { KpiResponse } from '@/types/dashboard'

const KPI_ACCENTS = ['#F29F67', '#3B8FF3', '#34B1AA', '#E0B50F', '#A78BFA', '#F87171', '#6EE7B7']

export default function KpiSection({ kpis, loading }: { kpis: KpiResponse | null; loading: boolean }) {
    return (
        <section className="space-y-6">
            {/* Dashboard description */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-2 text-base font-bold text-[#1E1E2C]">Athens Airbnb Market Dashboard</h3>
                <p className="text-sm leading-relaxed text-gray-500">
                    This dashboard provides a comprehensive analysis of the Athens short-term rental market using real Airbnb listing data.
                    Explore pricing trends, host behaviour, property characteristics, and availability patterns across all neighbourhoods.
                    Use the tabs above to navigate between geographic analysis, host insights, property breakdowns, and demand forecasting.
                    The <span className="font-medium text-[#1E1E2C]">Predict</span> page lets you estimate a listing&apos;s nightly price based on its features using a trained machine learning model.
                </p>
            </div>

            {/* Key metrics */}
            <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Key Metrics</p>

                {/* Row 1: Total Listings + Total Hosts — 2 equal columns */}
                <div className="mb-4 grid grid-cols-2 gap-4">
                    <FeatureCard
                        title="Total Listings"
                        description={loading ? '—' : `${kpis?.total_listings?.toLocaleString() ?? 0}`}
                        icon={<BuildingOffice2Icon className="h-6 w-6" />}
                        accent={KPI_ACCENTS[0]}
                    />
                    <FeatureCard
                        title="Total Hosts"
                        description={loading ? '—' : `${kpis?.total_hosts?.toLocaleString() ?? 0}`}
                        icon={<UsersIcon className="h-6 w-6" />}
                        accent={KPI_ACCENTS[6]}
                    />
                </div>

                {/* Row 2: Superhosts + Instant Bookable — 2 equal columns */}
                <div className="mb-4 grid grid-cols-2 gap-4">
                    <FeatureCard
                        title="Superhosts"
                        description={loading ? '—' : `${kpis?.superhost_percentage ?? 0}%`}
                        icon={<UserGroupIcon className="h-6 w-6" />}
                        accent={KPI_ACCENTS[3]}
                    />
                    <FeatureCard
                        title="Instant Bookable"
                        description={loading ? '—' : `${kpis?.instant_bookable_pct ?? 0}%`}
                        icon={<BoltIcon className="h-6 w-6" />}
                        accent={KPI_ACCENTS[4]}
                    />
                </div>

                {/* Row 3: Avg Price + Avg Occupancy Rate + Avg Min Nights — 3 equal columns */}
                <div className="grid grid-cols-3 gap-4">
                    <FeatureCard
                        title="Avg Price / Night"
                        description={loading ? '—' : `$${kpis?.avg_price_per_night ?? 0}`}
                        icon={<CurrencyDollarIcon className="h-6 w-6" />}
                        accent={KPI_ACCENTS[1]}
                    />
                    <FeatureCard
                        title="Avg Occupancy Rate"
                        description={loading ? '—' : `${kpis?.avg_occupancy_rate ?? 'N/A'}%`}
                        icon={<StarIcon className="h-6 w-6" />}
                        accent={KPI_ACCENTS[2]}
                    />
                    <FeatureCard
                        title="Avg Min Nights"
                        description={loading ? '—' : `${kpis?.avg_min_nights ?? 0} nights`}
                        icon={<CalendarDaysIcon className="h-6 w-6" />}
                        accent={KPI_ACCENTS[5]}
                    />
                </div>
            </div>
        </section>
    )
}