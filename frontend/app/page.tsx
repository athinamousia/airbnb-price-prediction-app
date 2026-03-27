'use client'

import SidebarLayout from '@/components/layout/SidebarLayout'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import KpiSection from '@/components/dashboard/KpiSection'
import PriceAnalysisSection from '@/components/dashboard/PriceAnalysisSection'
import GeoMap from '@/components/dashboard/GeoMap'
import PropertyTypeDistributionSection from '@/components/dashboard/PropertyTypeDistributionSection'
import HostInsightsSection from '@/components/dashboard/HostInsightsSection'
import { useDashboardData } from '@/hooks/useDashboardData'

export default function Home() {
    const {
        kpis,
        priceAnalysis,
        propertyTypeDistribution,
        hostInsights,
        selectedNeighbourhood,
        setSelectedNeighbourhood,
        selectedPropertyNeighbourhood,
        setSelectedPropertyNeighbourhood,
        selectedRoomType,
        setSelectedRoomType,
        selectedHostNeighbourhood,
        setSelectedHostNeighbourhood,
        selectedHostRoomType,
        setSelectedHostRoomType,
        loadingKpis,
        loadingPrice,
        loadingPropertyType,
        loadingHostInsights,
        histogramData,
    } = useDashboardData()

    return (
        <SidebarLayout>
            <div className="space-y-6 p-6">
                <DashboardHeader />
                <KpiSection kpis={kpis} loading={loadingKpis} />
                <PriceAnalysisSection
                    data={priceAnalysis}
                    histogramData={histogramData}
                    loading={loadingPrice}
                    selected={selectedNeighbourhood}
                    onChangeNeighbourhood={setSelectedNeighbourhood}
                />
                <PropertyTypeDistributionSection
                    data={propertyTypeDistribution}
                    loading={loadingPropertyType}
                    selectedNeighbourhood={selectedPropertyNeighbourhood}
                    selectedRoomType={selectedRoomType}
                    onChangeNeighbourhood={setSelectedPropertyNeighbourhood}
                    onChangeRoomType={setSelectedRoomType}
                />
                <HostInsightsSection
                    data={hostInsights}
                    loading={loadingHostInsights}
                    selectedNeighbourhood={selectedHostNeighbourhood}
                    selectedRoomType={selectedHostRoomType}
                    onChangeNeighbourhood={setSelectedHostNeighbourhood}
                    onChangeRoomType={setSelectedHostRoomType}
                />
                <GeoMap />
            </div>
        </SidebarLayout>
    )
}