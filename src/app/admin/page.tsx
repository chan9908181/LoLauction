'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface Player {
  name: string
  description: string
  tier: string
  position: string
}

export default function AdminPage() {
  const router = useRouter()
  const { user, isAuthenticated, token, loading } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  const [connectedCoaches, setConnectedCoaches] = useState<string[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importStatus, setImportStatus] = useState('')
  const [auctionStatus, setAuctionStatus] = useState('waiting') // 'waiting' | 'started'
  const [auctionMessage, setAuctionMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
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
    if (!isAuthenticated || loading || !user || !token) return

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/auction?token=${token}`)
        wsRef.current = ws

        ws.onopen = () => {
          setIsConnected(true)
          setConnectionStatus('Connected')
          
          // Send join message with admin identification
          ws.send(JSON.stringify({
            type: 'join',
            coachId: user.id,
            coachName: user.name,
            isAdmin: true
          }))
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('Admin page received WebSocket message:', data)
            
            if (data.type === 'coaches_update') {
              // Additional frontend filtering to ensure admin is never included
              const filteredCoaches = data.coaches.filter((coachName: string) => {
                // Filter out admin names and current user
                const isCurrentAdmin = coachName === user.name;
                const isAdminName = coachName.toLowerCase().includes('admin');
                return !isCurrentAdmin && !isAdminName;
              });
              setConnectedCoaches(filteredCoaches);
            } else if (data.type === 'auction_start_confirmed') {
              console.log('Received auction_start_confirmed, redirecting to:', data.redirect)
              setAuctionStatus('started')
              setAuctionMessage(data.message)
              // Redirect admin to auction start page
              if (data.redirect) {
                console.log('Pushing to:', data.redirect)
                setTimeout(() => {
                  router.push(data.redirect)
                }, 100)
              }
            } else if (data.type === 'auction_started') {
              console.log('Received auction_started, redirecting to:', data.redirect)
              setAuctionStatus('started')
              setAuctionMessage(`Auction started by ${data.startedBy}`)
              // Redirect to auction start page
              if (data.redirect) {
                console.log('Pushing to:', data.redirect)
                setTimeout(() => {
                  router.push(data.redirect)
                }, 100)
              }
            } else if (data.type === 'connected') {
              console.log('Connected to WebSocket, auction state:', data.auctionState)
              if (data.auctionState) {
                setAuctionStatus(data.auctionState.status)
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        ws.onclose = () => {
          setIsConnected(false)
          setConnectionStatus('Disconnected')
          setConnectedCoaches([])
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          setConnectionStatus('Connection error')
        }
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
        setConnectionStatus('Failed to connect')
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [isAuthenticated, loading, user, token])

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      parseCSV(file)
    } else {
      setImportStatus('Please select a valid CSV file')
    }
  }

  const parseCSV = (file: File) => {
    setIsImporting(true)
    setImportStatus('Reading CSV file...')
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n').filter(line => line.trim() !== '')
        
        // Skip header row and parse data
        const playerData: Player[] = []
        for (let i = 1; i < lines.length; i++) {
          const [name, description, tier, position] = lines[i].split(',').map(item => item.trim().replace(/"/g, ''))
          
          if (name && description && tier && position) {
            playerData.push({
              name,
              description,
              tier,
              position
            })
          }
        }
        
        setPlayers(playerData)
        setImportStatus(`Successfully parsed ${playerData.length} players from CSV`)
        setIsImporting(false)
      } catch (error) {
        setImportStatus('Error parsing CSV file')
        setIsImporting(false)
      }
    }
    
    reader.onerror = () => {
      setImportStatus('Error reading file')
      setIsImporting(false)
    }
    
    reader.readAsText(file)
  }
  const auctionStart = () => {
    console.log('auctionStart clicked')
    console.log('WebSocket state:', wsRef.current?.readyState)
    console.log('WebSocket OPEN constant:', WebSocket.OPEN)
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'started'
      }
      console.log('Sending WebSocket message:', message)
      wsRef.current.send(JSON.stringify(message))
      console.log('Auction start message sent')
    } else {
      console.error('WebSocket not connected. State:', wsRef.current?.readyState)
    }
  }

  const importPlayers = async () => {
    if (players.length === 0) {
      setImportStatus('No players to import')
      return
    }

    setIsImporting(true)
    setImportStatus('Importing players to database...')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/players/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ players })
      })

      const data = await response.json()

      if (response.ok) {
        setImportStatus(`Successfully imported ${data.count} players to database`)
        setPlayers([]) // Clear the preview
      } else {
        setImportStatus(`Error: ${data.message}`)
      }
    } catch (error) {
      setImportStatus('Error importing players to database')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
          <button
            onClick={() => router.push('/auctionStart')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
          >
            Go to Auction
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CSV Import Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Import Players</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Upload a CSV file with columns: name, description, tier, position
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Example: "John Doe","Great midfielder","A","MID"
                </p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <button
                  onClick={handleFileSelect}
                  disabled={isImporting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                >
                  {isImporting ? 'Processing...' : 'Select CSV File'}
                </button>
              </div>

              {importStatus && (
                <div className={`p-3 rounded-lg ${
                  importStatus.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {importStatus}
                </div>
              )}

              {players.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800 dark:text-white">Preview ({players.length} players):</h3>
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Description</th>
                          <th className="px-3 py-2 text-left">Tier</th>
                          <th className="px-3 py-2 text-left">Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {players.slice(0, 10).map((player, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-3 py-2">{player.name}</td>
                            <td className="px-3 py-2">{player.description.substring(0, 30)}...</td>
                            <td className="px-3 py-2">{player.tier}</td>
                            <td className="px-3 py-2">{player.position}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {players.length > 10 && (
                      <p className="text-center text-gray-500 py-2">... and {players.length - 10} more</p>
                    )}
                  </div>
                  
                  <button
                    onClick={importPlayers}
                    disabled={isImporting}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                  >
                    {isImporting ? 'Importing...' : `Import ${players.length} Players to Database`}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Auction Control Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Auction Control</h2>
            
            <div className="space-y-4">
              {auctionMessage && (
                <div className="p-3 rounded-lg bg-blue-100 text-blue-700">
                  {auctionMessage}
                </div>
              )}
              
              <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  Auction Status: <span className={`capitalize ${
                    auctionStatus === 'started' ? 'text-green-600' : 'text-orange-600'
                  }`}>{auctionStatus}</span>
                </p>
              </div>
              
              <button 
                className={`w-full font-bold py-3 px-6 rounded-lg transition duration-300 ${
                  auctionStatus === 'started' 
                    ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                    : !isConnected 
                      ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
                onClick={auctionStart}
                disabled={!isConnected || auctionStatus === 'started'}
              >
                {auctionStatus === 'started' 
                  ? 'Auction Already Started' 
                  : !isConnected 
                    ? 'WebSocket Disconnected'
                    : 'Start Auction'
                }
              </button>
              
              <div className="mt-6">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Connection Status</h3>
                <div className={`text-sm mb-2 ${
                  isConnected ? 'text-green-600' : 'text-red-600'
                }`}>
                  {connectionStatus}
                </div>
                
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Connected Coaches</h3>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {connectedCoaches.length} coaches connected
                  {connectedCoaches.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {connectedCoaches.map((coach, index) => (
                        <li key={index} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {coach}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}