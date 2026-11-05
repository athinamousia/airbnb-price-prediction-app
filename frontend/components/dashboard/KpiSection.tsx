import FeatureCard from '@/components/sections/FeatureCard'
import { BoltIcon, BuildingOffice2Icon, CalendarDaysIcon, CurrencyDollarIcon, UserGroupIcon, UsersIcon } from '@heroicons/react/24/outline'
import type { KpiResponse } from '@/types/dashboard'

const KPI_ACCENTS = Array(7).fill('#1E1E2C')

export default function KpiSection({ kpis, loading }: {
    kpis: KpiResponse | null; loading: boolean
}) {
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
                <div className="mb-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Key Metrics</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                    <FeatureCard
                        title="Avg Price / Night"
                        description={loading ? '—' : `$${kpis?.avg_price_per_night ?? 0}`}
                        icon={<CurrencyDollarIcon className="h-6 w-6" />}
                        accent={KPI_ACCENTS[1]}
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