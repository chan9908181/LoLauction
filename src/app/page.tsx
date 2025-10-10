'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, user, logout, loading } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </main>
    )
  }

  // If user is authenticated, show dashboard
  if (isAuthenticated) {
    console.log("coach", user) 
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="z-10 max-w-5xl w-full items-center justify-center text-center">
          <h1 className="text-5xl font-bold mb-8 text-blue-600 dark:text-blue-400">
            Welcome Back, {user?.name || 'Coach'}!
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl w-full">
          {/* Account Management */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl">
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="font-semibold text-gray-800 dark:text-white">{user?.name || 'Coach'}</p>
                <button 
                  onClick={() => router.push('/auction')}
                  className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                >
                  Enter Auction
                </button>
                <button 
                  onClick={() => router.push('/auctionStart')}
                  className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                >
                  Join Active Auction
                </button>
              </div>
              
              <button 
                onClick={logout}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // If not authenticated, show landing page
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center text-center">
        <h1 className="text-5xl font-bold mb-8 text-blue-600 dark:text-blue-400">
          Welcome Coaches!
        </h1>
        <h2 className="text-2xl font-medium mb-12 text-gray-700 dark:text-gray-300">
          Join the Ultimate Player Auction Platform
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl w-full">
        {/* Sign Up Section */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-8 rounded-lg shadow-xl text-white">
          <h3 className="text-3xl font-bold mb-4">Ready to Build Your Team?</h3>
          <p className="text-blue-100 mb-6">
            Sign up as a coach and start building your dream team! Bid on talented players and create the ultimate lineup.
          </p>
          <div className="space-y-4">
            <button 
              onClick={() => router.push('/signup')}
              className="w-full bg-white text-blue-600 hover:bg-gray-100 font-bold py-3 px-6 rounded-lg transition duration-300"
            >
              Sign Up as Coach
            </button>
            <button 
              onClick={() => router.push('/login')}
              className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-6 rounded-lg border border-blue-400 transition duration-300"
            >
              Already a Coach? Log In
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
