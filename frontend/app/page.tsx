
import SidebarLayout from '@/components/layout/SidebarLayout'
import FeatureCard from '@/components/sections/FeatureCard'

export default function Home() {
    return (
        <SidebarLayout>
            <div className="space-y-6">
                {/* Hero Section */}
                <div className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
                    <h1 className="text-3xl font-bold">Airbnb Price Prediction</h1>
                    <p className="mt-1 text-sm text-blue-100">AI-powered insights for property pricing</p>
                </div>

                {/* KPI Cards */}
                <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Key Metrics</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <FeatureCard title="Total Listings" description="2,450 active" />
                        <FeatureCard title="Avg Price" description="$185/night" />
                        <FeatureCard title="Occupancy" description="67% average" />
                        <FeatureCard title="Superhosts" description="34% of market" />
                    </div>
                </div>

                {/* Charts */}
                <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Analysis</h2>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="rounded-lg bg-white p-4 border border-gray-200">
                            <h3 className="font-semibold text-gray-900 text-sm mb-3">Price Distribution</h3>
                            <div className="h-40 bg-blue-50 rounded flex items-center justify-center text-xs text-gray-500">Chart</div>
                        </div>
                        <div className="rounded-lg bg-white p-4 border border-gray-200">
                            <h3 className="font-semibold text-gray-900 text-sm mb-3">Property Types</h3>
                            <div className="h-40 bg-green-50 rounded flex items-center justify-center text-xs text-gray-500">Chart</div>
                        </div>
                    </div>
                </div>

                {/* Neighborhoods */}
                <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Top Neighborhoods</h2>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {[
                            { name: 'Manhattan', listings: '1,240', price: '$245' },
                            { name: 'Brooklyn', listings: '890', price: '$180' },
                            { name: 'Queens', listings: '560', price: '$145' },
                            { name: 'Bronx', listings: '320', price: '$125' },
                            { name: 'Staten Island', listings: '180', price: '$110' },
                            { name: 'Astoria', listings: '420', price: '$165' },
                        ].map((area) => (
                            <div key={area.name} className="rounded-lg bg-white p-3 border border-gray-200 hover:shadow-md transition">
                                <p className="font-semibold text-gray-900 text-sm">{area.name}</p>
                                <p className="text-xs text-gray-600 mt-1">{area.listings} listings</p>
                                <p className="text-xs text-blue-600 font-medium">{area.price}/night</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Listings */}
                <div className="rounded-lg bg-white p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 text-sm mb-3">Recent Listings</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <div>
                                <p className="font-medium text-gray-900">Manhattan Apartment</p>
                                <p className="text-xs text-gray-600">⭐ 4.9 (128)</p>
                            </div>
                            <span className="font-bold text-gray-900">$245</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <div>
                                <p className="font-medium text-gray-900">Brooklyn Loft</p>
                                <p className="text-xs text-gray-600">⭐ 4.8 (95)</p>
                            </div>
                            <span className="font-bold text-gray-900">$180</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <div>
                                <p className="font-medium text-gray-900">Queens Studio</p>
                                <p className="text-xs text-gray-600">⭐ 4.9 (156)</p>
                            </div>
                            <span className="font-bold text-gray-900">$120</span>
                        </div>
                    </div>
                </div>
            </div>
        </SidebarLayout>
    )
}
