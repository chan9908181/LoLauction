'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function AuctionPage() {
  const router = useRouter()
  const { user, isAuthenticated, token, loading } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  const [connectedCoaches, setConnectedCoaches] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  // Redirect if not authenticated (but only after loading is complete)
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
      return
    }
  }, [isAuthenticated, loading, router])

  // WebSocket connection
  useEffect(() => {
    if (!token || !user) return

    const connectWebSocket = () => {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/auction?token=${token}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('Connected to auction')
        setIsConnected(true)
        setConnectionStatus('Connected')
        
        // Send join message
        ws.send(JSON.stringify({
          type: 'join',
          coachId: user.id,
          coachName: user.name
        }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('Received WebSocket message:', data)
          
          if (data.type === 'coaches_update') {
            setConnectedCoaches(data.coaches)
          } else if (data.type === 'auction_started') {
            console.log('Auction started, redirecting to:', data.redirect)
            if (data.redirect) {
              router.push(data.redirect)
            }
          } else if (data.type === 'joined') {
            console.log('Successfully joined auction:', data.message)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        console.log('Disconnected from auction')
        setIsConnected(false)
        setConnectionStatus('Disconnected')
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            setConnectionStatus('Reconnecting...')
            connectWebSocket()
          }
        }, 3000)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('Connection Error')
      }
    }

    connectWebSocket()

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [token, user])

  const leaveAuction = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'leave',
        coachId: user?.id
      }))
      wsRef.current.close()
    }
    router.push('/')
  }

  if (loading || (!isAuthenticated || !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">
            {loading ? 'Loading...' : 'Authenticating...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                Player Auction
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Welcome, {user.name}! Points: {(user as any).points || 0}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium">{connectionStatus}</span>
              </div>
              <button
                onClick={() => router.push('/auctionStart')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-300"
              >
                Join Active Auction
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Waiting for Admin to Start
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              The auction will begin shortly. Please wait for the admin to start the session.
            </p>
            
            {/* Connection Status */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                Connection Status
              </h3>
              <div className="flex items-center justify-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {connectionStatus}
                </span>
              </div>
              
              {isConnected && (
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                  <p>✅ Successfully connected to auction server</p>
                  <p>🎯 Waiting for other coaches and admin...</p>
                </div>
              )}
            </div>
          </div>
        </div>
    </main>
  )
}
