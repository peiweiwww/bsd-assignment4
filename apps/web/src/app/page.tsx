import { auth } from '@clerk/nextjs/server'
import { SignInButton } from '@clerk/nextjs'
import { getMyCities } from '@/app/actions/cities'
import { getLatestReadings } from '@/app/actions/readings'
import AddCityForm from '@/app/components/AddCityForm'
import CityListRealtime from '@/app/components/CityListRealtime'

// Auth-dependent page — never statically prerender.
export const dynamic = 'force-dynamic'

export default async function Home() {
  const { userId } = await auth()

  // ── Signed out ────────────────────────────────────────────────────────────
  if (!userId) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[80vh] gap-6 text-center px-4">
        <h1 className="text-2xl font-semibold text-gray-800">
          Welcome to Weather Dashboard
        </h1>
        <p className="text-gray-500">
          Sign in to manage your cities and track weather.
        </p>
        <SignInButton mode="modal">
          <button className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            Sign in
          </button>
        </SignInButton>
      </main>
    )
  }

  // ── Signed in ─────────────────────────────────────────────────────────────
  const cities = await getMyCities()
  const initialReadings = await getLatestReadings(cities.map((c) => c.id))

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Your Cities</h1>

      <AddCityForm />

      <CityListRealtime cities={cities} initialReadings={initialReadings} />
    </main>
  )
}
