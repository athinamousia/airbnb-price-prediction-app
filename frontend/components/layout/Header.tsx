import Link from 'next/link'

export default function Header() {
    return (
        <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold text-slate-900">Airbnb Price Prediction</h1>
                    <p className="text-sm text-slate-500">Athens market insights</p>
                </div>
                <nav className="flex items-center gap-4 text-sm text-slate-600">
                    <Link href="/" className="hover:text-slate-900">Home</Link>
                    <Link href="/predict" className="hover:text-slate-900">Predict</Link>
                    <Link href="/analytics" className="hover:text-slate-900">Analytics</Link>
                </nav>
            </div>
        </header>
    )
}
