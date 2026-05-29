'use client'

import { useState } from 'react'
import SidebarLayout from '@/components/layout/SidebarLayout'
import KpiSection from '@/components/dashboard/KpiSection'
import PriceAnalysisSection, { NeighbourhoodTable } from '@/components/dashboard/PriceAnalysisSection'
import GeoMap from '@/components/dashboard/GeoMap'
import PropertyTypeDistributionSection from '@/components/dashboard/PropertyTypeDistributionSection'
import HostInsightsSection from '@/components/dashboard/HostInsightsSection'
import { useDashboardData } from '@/hooks/useDashboardData'
import { OccupancyByNeighbourhoodChart } from '@/components/dashboard/AvailabilitySection'

const TABS = ['Overview', 'Geographic Analysis', 'Host Analysis', 'Property Analysis'] as const
type Tab = typeof TABS[number]

export default function Home() {
    const [activeTab, setActiveTab] = useState<Tab>('Overview')
    const {
        kpis, priceAnalysis, propertyTypeDistribution, hostInsights,
        hostAnalytics, propertyAnalytics, availabilityAnalytics,
        selectedNeighbourhood, setSelectedNeighbourhood,
        selectedPropertyNeighbourhood, setSelectedPropertyNeighbourhood,
        selectedRoomType, setSelectedRoomType,
        selectedHostNeighbourhood, setSelectedHostNeighbourhood,
        selectedHostRoomType, setSelectedHostRoomType,
        loadingKpis, loadingPrice, loadingPropertyType,
        loadingHostInsights, loadingHostAnalytics, loadingPropertyAnalytics,
        histogramData,
    } = useDashboardData()

    return (
        <SidebarLayout>
            <div className="space-y-6">
                {/* Page header */}
                <div>
                    <h2 className="text-lg font-bold text-[#1E1E2C]">Athens Airbnb Dashboard</h2>
                    <p className="mt-0.5 text-xs text-gray-400">Market analytics · all neighbourhoods</p>
                </div>

                {/* Tab navigation */}
                <div className="flex gap-1 rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${activeTab === tab
                                ? 'bg-[#F29F67] text-white shadow-sm'
                                : 'text-gray-500 hover:text-[#1E1E2C]'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab panels */}
                {activeTab === 'Overview' && (
                    <KpiSection kpis={kpis} loading={loadingKpis} />
                )}

                {activeTab === 'Geographic Analysis' && (
                    <div className="space-y-4">
                        <PriceAnalysisSection
                            data={priceAnalysis}
                            histogramData={histogramData}
                            loading={loadingPrice}
                            selected={selectedNeighbourhood}
                            onChangeNeighbourhood={setSelectedNeighbourhood}
                        />
                        <GeoMap />
                        <OccupancyByNeighbourhoodChart data={availabilityAnalytics?.occupancy_by_neighbourhood} />
                        {priceAnalysis?.neighbourhood_comparison && priceAnalysis.neighbourhood_comparison.length > 0 && (
                            <NeighbourhoodTable rows={priceAnalysis.neighbourhood_comparison} />
                        )}
                    </div>
                )}

                {activeTab === 'Host Analysis' && (
                    <HostInsightsSection
                        data={hostInsights}
                        analytics={hostAnalytics}
                        loading={loadingHostInsights}
                        loadingAnalytics={loadingHostAnalytics}
                        selectedNeighbourhood={selectedHostNeighbourhood}
                        selectedRoomType={selectedHostRoomType}
                        onChangeNeighbourhood={setSelectedHostNeighbourhood}
                        onChangeRoomType={setSelectedHostRoomType}
                    />
                )}

                {activeTab === 'Property Analysis' && (
                    <PropertyTypeDistributionSection
                        data={propertyTypeDistribution}
                        analytics={propertyAnalytics}
                        hostAnalytics={hostAnalytics}
                        availabilityAnalytics={availabilityAnalytics}
                        loading={loadingPropertyType}
                        loadingAnalytics={loadingPropertyAnalytics}
                        selectedNeighbourhood={selectedPropertyNeighbourhood}
                        selectedRoomType={selectedRoomType}
                        onChangeNeighbourhood={setSelectedPropertyNeighbourhood}
                        onChangeRoomType={setSelectedRoomType}
                    />
                )}

            </div>
        </SidebarLayout>
    )
}