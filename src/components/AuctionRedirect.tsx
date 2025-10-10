'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function AuctionRedirect() {
  const router = useRouter()
  const pathname = usePathname()
  const { token, isAuthenticated, user } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Don't redirect if already on auctionStart page or login/signup pages
    if (pathname === '/auctionStart' || pathname === '/login' || pathname === '/signup') {
      console.log('AuctionRedirect: Completely disabled on protected page:', pathname)
      return
    }

    // Don't redirect if not authenticated
    if (!isAuthenticated || !token || !user) {
      console.log('AuctionRedirect: Skipping redirect check - not authenticated')
      return
    }

    console.log('AuctionRedirect: Checking auction status for redirect from:', pathname)

    // Connect to WebSocket to check auction status
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/auction?token=${token}`)
        wsRef.current = ws

        ws.onopen = () => {
          console.log('AuctionRedirect: Connected to check auction status from page:', pathname)
          // Send join message to get auction state
          ws.send(JSON.stringify({
            type: 'join',
            coachName: user.name,
            isAdmin: user.userType === 'admin'
          }))
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('AuctionRedirect: Received message:', data.type, 'on page:', pathname)

            // Only redirect TO auctionStart if auction is active and we're NOT already there
            if (data.type === 'connected' || data.type === 'joined') {
              if (data.auctionState && data.auctionState.status === 'started') {
                console.log('AuctionRedirect: Auction is active, redirecting to auctionStart from:', pathname)
                ws.close()
                router.push('/auctionStart')
              } else {
                console.log('AuctionRedirect: Auction not active, staying on:', pathname)
                ws.close()
              }
            } else if (data.type === 'auction_started') {
              console.log('AuctionRedirect: Auction just started, redirecting to auctionStart from:', pathname)
              ws.close()
              router.push('/auctionStart')
            } else {
              console.log('AuctionRedirect: Message received but no redirect action needed:', data.type)
            }
          } catch (error) {
            console.error('AuctionRedirect: Error parsing message:', error)
          }
        }

        ws.onclose = () => {
          console.log('AuctionRedirect: WebSocket closed')
        }

        ws.onerror = (error) => {
          console.error('AuctionRedirect: WebSocket error:', error)
        }
      } catch (error) {
        console.error('AuctionRedirect: Failed to connect WebSocket:', error)
      }
    }

    // Connect after a delay to avoid conflicts with other WebSocket connections
    const timeoutId = setTimeout(connectWebSocket, 2000)

    return () => {
      clearTimeout(timeoutId)
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [pathname, isAuthenticated, token, user, router])

  // This component doesn't render anything
  return null
}
