import { auth } from '@clerk/nextjs/server'
import { SignInButton } from '@clerk/nextjs'
import { getMyCities } from '@/app/actions/cities'
import AddCityForm from '@/app/components/AddCityForm'
import DeleteCityButton from '@/app/components/DeleteCityButton'

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

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Your Cities</h1>

      <AddCityForm />

      {cities.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-10">
          No cities yet. Add one above.
        </p>
      ) : (
        <ul className="space-y-3">
          {cities.map((city) => (
            <li
              key={city.id}
              className="flex items-center justify-between border border-gray-200
                         rounded-lg p-4 bg-white hover:border-gray-300 hover:shadow-sm
                         transition-all"
            >
              <div>
                <p className="font-medium text-gray-800">{city.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {city.latitude.toFixed(4)}, {city.longitude.toFixed(4)}
                </p>
              </div>
              <DeleteCityButton cityId={city.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
