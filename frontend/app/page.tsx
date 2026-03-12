'use client'

import SidebarLayout from '@/components/layout/SidebarLayout'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import KpiSection from '@/components/dashboard/KpiSection'
import PriceAnalysisSection from '@/components/dashboard/PriceAnalysisSection'
import { useDashboardData } from '@/hooks/useDashboardData'

export default function Home() {
    const {
        kpis,
        priceAnalysis,
        selectedNeighbourhood,
        setSelectedNeighbourhood,
        loadingKpis,
        loadingPrice,
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
            </div>
        </SidebarLayout>
    )
}