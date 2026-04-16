import { auth } from '@clerk/nextjs/server'
import { SignInButton } from '@clerk/nextjs'

// This page reads auth state — always render dynamically, never statically prerender.
export const dynamic = 'force-dynamic'

export default async function Home() {
  const { userId } = await auth()

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
          <button className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700">
            Sign in
          </button>
        </SignInButton>
      </main>
    )
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <p className="text-gray-700">
        Welcome, <span className="font-mono text-sm bg-gray-100 px-1 rounded">{userId}</span>.
        (Cities &amp; weather UI coming next step.)
      </p>
    </main>
  )
}
