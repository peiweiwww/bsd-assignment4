import type { Metadata } from 'next'
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import { UnitProvider } from '@/app/contexts/UnitContext'
import UnitToggle from '@/app/components/UnitToggle'
import './globals.css'

// All pages in this app depend on auth — disable static prerendering globally.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Weather Dashboard',
  description: 'Real-time weather for your favorite cities',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <UnitProvider>
            <header className="flex items-center justify-between px-6 py-3 border-b border-white/60 bg-white/70 backdrop-blur-sm">
              <span className="font-semibold text-gray-800">Weather Dashboard</span>
              <div className="flex items-center gap-3">
                <UnitToggle />
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700">
                      Sign in
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </div>
            </header>
            {children}
          </UnitProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
