"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

interface Player {
  _id: string
  name: string
  description: string
  tier: string
  position: string
  currentPrice: number
  startingPrice: number
  buyer?: string
}

interface AuctionState {
  status: "waiting" | "started" | "bidding" | "sold"
  currentPlayer?: Player
  currentBid: number
  highestBidder?: string
  timeRemaining: number
  isActive: boolean
}

interface CoachRoster {
  [position: string]: Player | null
}

interface CoachDetails {
  name: string
  username: string
  points: number
}

interface ConnectedCoach {
  name: string
  username: string
  isConnected: boolean
  connectedAt?: Date
}

interface ConnectedCoach {
  name: string
  username: string
  isConnected: boolean
  connectedAt?: Date
}

interface BidNotification {
  id: string
  coachName: string
  amount: number
  timestamp: Date
}

export default function AuctionStartPage() {
  const router = useRouter()
  const { user, isAuthenticated, token, loading, refreshUser } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("연결 중...")
  const [connectedCoaches, setConnectedCoaches] = useState<string[]>([])
  const [coachDetails, setCoachDetails] = useState<CoachDetails[]>([])
  const [coachConnectionStatus, setCoachConnectionStatus] = useState<ConnectedCoach[]>([])
  const [lastWebSocketUpdate, setLastWebSocketUpdate] = useState<string>("")
  const [auctionStatus, setAuctionStatus] = useState("started")
  const [isAdmin, setIsAdmin] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [unsoldPlayers, setUnsoldPlayers] = useState<Player[]>([])
  const [auctionRound, setAuctionRound] = useState(1)
  const [totalPlayersCount, setTotalPlayersCount] = useState(0)
  const [auctionState, setAuctionState] = useState<AuctionState>({
    status: "waiting",
    currentBid: 0,
    timeRemaining: 10,
    isActive: false,
  })
  const [coachRosters, setCoachRosters] = useState<{ [coachName: string]: CoachRoster }>({})
  const [bidNotifications, setBidNotifications] = useState<BidNotification[]>([])
  const [lastBidTime, setLastBidTime] = useState<number>(0)
  const [bidCooldown, setBidCooldown] = useState<boolean>(false)
  const [autoAssignmentNotification, setAutoAssignmentNotification] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Helper function to get API base URL
  const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  }

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
      return
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    if (!token || !user) return

    const adminStatus = user.userType === "admin" || user.username === "admin"
    setIsAdmin(adminStatus)

    if (adminStatus) {
      fetchPlayers()
    }

    fetchRosters()
  }, [token, user])

  useEffect(() => {
    if (!token || !user) return

    const connectWebSocket = () => {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/auction?token=${token}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setConnectionStatus("연결됨")

        if (user) {
          const coachName = user.name
          ws.send(
            JSON.stringify({
              type: "join",
              coachName: coachName,
            }),
          )
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case "coaches_update":
              const timestamp = new Date().toLocaleTimeString()
              setLastWebSocketUpdate(timestamp)

              const isUserAdmin = user && (user.userType === "admin" || user.username === "admin")
              if (data.allCoachesStatus && isUserAdmin) {
                const filteredAllCoaches = data.allCoachesStatus.filter((coach: any) => {
                  const isAdminName = coach.name.toLowerCase().includes("admin")
                  return !isAdminName
                })
                setCoachConnectionStatus(filteredAllCoaches)
              }

              if (data.allCoachesStatus) {
                const filteredCoachDetails = data.allCoachesStatus.filter((coach: any) => {
                  const isAdminName = coach.name.toLowerCase().includes("admin")
                  return !isAdminName
                })

                setCoachDetails((prev) => {
                  const newCoachDetailsMap = new Map()
                  filteredCoachDetails.forEach((coach: any) => {
                    newCoachDetailsMap.set(coach.name, coach)
                  })

                  return prev.map((existingCoach) => {
                    const updatedCoach = newCoachDetailsMap.get(existingCoach.name)
                    return updatedCoach ? updatedCoach : existingCoach
                  })
                })
              }
              break
            case "joined":
              if (data.auctionState) {
                setAuctionState((prev) => ({
                  ...prev,
                  status: data.auctionState.isActive ? "bidding" : "waiting",
                  currentPlayer: data.auctionState.currentPlayer || undefined,
                  currentBid: data.auctionState.currentBid || 0,
                  highestBidder: data.auctionState.highestBidder || undefined,
                  timeRemaining: data.auctionState.timeRemaining || 10,
                  isActive: data.auctionState.isActive || false,
                }))

                setAuctionStatus(data.auctionState.status)
              }
              break
            case "connected":
              if (data.auctionState) {
                setAuctionState((prev) => ({
                  ...prev,
                  status: data.auctionState.isActive ? "bidding" : "waiting",
                  currentPlayer: data.auctionState.currentPlayer || undefined,
                  currentBid: data.auctionState.currentBid || 0,
                  highestBidder: data.auctionState.highestBidder || undefined,
                  timeRemaining: data.auctionState.timeRemaining || 10,
                  isActive: data.auctionState.isActive || false,
                }))

                setAuctionStatus(data.auctionState.status)
              }
              break
            case "player_drawn":
              setAuctionState((prev) => {
                const newTimeRemaining = data.auctionState?.timeRemaining || 10
                const newState = {
                  ...prev,
                  status: "bidding" as const,
                  currentPlayer: data.player,
                  currentBid: data.player.startingPrice,
                  timeRemaining: newTimeRemaining,
                  isActive: true,
                }
                return newState
              })
              break
            case "bid_placed":
              const isAdminUser = user && (user.userType === "admin" || user.username === "admin")
              if (isAdminUser) {
                const notification: BidNotification = {
                  id: `${Date.now()}-${Math.random()}`,
                  coachName: data.bidder,
                  amount: data.amount,
                  timestamp: new Date(),
                }
                setBidNotifications((prev) => [...prev, notification])

                // Auto-remove notification after 4 seconds
                setTimeout(() => {
                  setBidNotifications((prev) => prev.filter((n) => n.id !== notification.id))
                }, 4000)
              }

              setAuctionState((prev) => ({
                ...prev,
                currentBid: data.amount,
                highestBidder: data.bidder,
                timeRemaining: data.timeRemaining || 10,
              }))
              break
            case "player_sold":
              if (data.winner && data.winnerUsername) {
                fetchRosters()

                if (
                  user &&
                  data.winnerUsername &&
                  (data.winnerUsername === user.username || data.winner === user.name)
                ) {
                  refreshUser()
                }
              } else {
                setUnsoldPlayers((prev) => {
                  const updatedUnsold = [...prev, data.player]
                  return updatedUnsold
                })
              }

              setAuctionState((prev) => ({
                ...prev,
                status: "sold",
                isActive: false,
              }))

              if (isAdmin) {
                fetchPlayers()
              }
              setTimeout(() => {
                setAuctionState((prev) => ({
                  ...prev,
                  status: "waiting",
                  currentPlayer: undefined,
                  currentBid: 0,
                  highestBidder: undefined,
                  timeRemaining: 10,
                }))
              }, 3000)
              break
            case "timer_update":
              setAuctionState((prev) => ({
                ...prev,
                timeRemaining: data.timeRemaining,
              }))
              break
            case "player_auto_assigned":
              console.log("Player auto-assigned:", data)
              
              // Show auto-assignment notification
              setAutoAssignmentNotification(data.message)
              setTimeout(() => {
                setAutoAssignmentNotification(null)
              }, 8000) // Show for 8 seconds
              
              // Immediately update the coach rosters state for instant display
              if (data.player && data.assignedTo) {
                setCoachRosters(prevRosters => {
                  const newRosters = { ...prevRosters }
                  if (newRosters[data.assignedTo]) {
                    newRosters[data.assignedTo] = {
                      ...newRosters[data.assignedTo],
                      [data.player.position]: {
                        _id: data.player._id,
                        name: data.player.name,
                        description: data.player.description,
                        tier: data.player.tier,
                        position: data.player.position,
                        currentPrice: 0, // Free assignment
                        startingPrice: data.player.startingPrice
                      }
                    }
                  }
                  console.log("Updated rosters immediately:", newRosters)
                  return newRosters
                })
              }
              
              // Handle auto-assignment notification
              if (data.assignedToUsername && user && data.assignedToUsername === user.username) {
                // Refresh user points if this user got the auto-assigned player
                refreshUser()
              }
              
              // Add delay to ensure database is updated, then refresh rosters from API
              setTimeout(() => {
                console.log("Fetching rosters after auto-assignment...")
                fetchRosters()
              }, 1000)
              
              // If admin, refresh player list
              if (isAdmin) {
                setTimeout(() => {
                  fetchPlayers()
                }, 1000)
              }
              break
            case "error":
              alert(data.message)
              break
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error)
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        setConnectionStatus("연결 끊김")

        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            setConnectionStatus("재연결 중...")
            connectWebSocket()
          }
        }, 3000)
      }

      ws.onerror = (error) => {
        setConnectionStatus("연결 오류")
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [token, user])

  const fetchPlayers = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/players`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const unsoldPlayers = data.filter((player: Player) => !player.buyer)
        setPlayers(unsoldPlayers)
        setAvailablePlayers([...unsoldPlayers])
        setTotalPlayersCount(unsoldPlayers.length)
      } else {
        console.error("Failed to fetch players")
      }
    } catch (error) {
      console.error("Error fetching players:", error)
    }
  }

  const fetchRosters = async () => {
    try {
      console.log("Fetching rosters from API...")
      const response = await fetch(`${getApiBaseUrl()}/api/rosters`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Rosters API response:", data)

        if (data.rosters) {
          console.log("Setting coach rosters:", data.rosters)
          setCoachRosters(data.rosters)
        }

        if (data.coachDetails) {
          console.log("Setting coach details:", data.coachDetails)
          setCoachDetails(data.coachDetails)

          const coachNames = data.coachDetails.map((coach: CoachDetails) => coach.name)
          setConnectedCoaches(coachNames)
        }
      } else {
        console.error("Failed to fetch rosters, status:", response.status)
      }
    } catch (error) {
      console.error("Error fetching rosters:", error)
    }
  }

  const refreshConnectionStatus = async () => {
    if (!isAdmin || !wsRef.current) return

    wsRef.current.send(
      JSON.stringify({
        type: "admin_status_request",
      }),
    )
  }

  const getCoachConnectionStatus = (coachName: string) => {
    const connectionInfo = coachConnectionStatus.find((coach) => coach.name === coachName)
    return connectionInfo || { name: coachName, isConnected: false, connectedAt: null }
  }

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const endAuction = () => {
    if (!isAdmin || !auctionState.isActive) {
      alert("활성화된 경매가 없거나 관리자가 아닙니다!")
      return
    }

    const confirmation = confirm(
      `현재 경매를 종료하시겠습니까?\n\n선수: ${auctionState.currentPlayer?.name}\n현재 최고가: $${auctionState.currentBid}\n최고 입찰자: ${auctionState.highestBidder || "없음"}`
    )

    if (!confirmation) return

    if (wsRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: "end_auction",
          playerId: auctionState.currentPlayer?._id,
        })
      )
    }
  }

  const drawRandomPlayer = () => {
    if (availablePlayers.length === 0) {
      if (unsoldPlayers.length === 0) {
        alert("🎉 All players have been sold! Auction complete!")
        return
      } else {
        setAuctionRound((prev) => prev + 1)
        setAvailablePlayers([...unsoldPlayers])
        setUnsoldPlayers([])

        alert(
          `Round ${auctionRound} complete! Starting Round ${auctionRound + 1} with ${unsoldPlayers.length} unsold players.`,
        )
        return
      }
    }

    const randomIndex = Math.floor(Math.random() * availablePlayers.length)
    const selectedPlayer = availablePlayers[randomIndex]

    setAvailablePlayers((prev) => prev.filter((p) => p._id !== selectedPlayer._id))

    if (wsRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: "draw_player",
          player: selectedPlayer,
        }),
      )
    }
  }

  const placeBid = (amount: number) => {
    const now = Date.now()
    const timeSinceLastBid = now - lastBidTime
    
    // Check if still in cooldown period (2 seconds = 2000ms)
    if (timeSinceLastBid < 2000) {
      const remainingTime = Math.ceil((2000 - timeSinceLastBid) / 1000)
      alert(`입찰 쿨다운 중입니다. ${remainingTime}초 후에 다시 시도해주세요.`)
      return
    }

    if (!auctionState.currentPlayer || !auctionState.isActive) {
      alert("활성화된 경매가 없습니다!")
      return
    }

    if (amount <= auctionState.currentBid) {
      alert("현재 입찰가보다 높아야 합니다!")
      return
    }

    if (amount > ((user as any)?.points || 0)) {
      alert("포인트가 부족합니다!")
      return
    }

    // Set cooldown immediately
    setLastBidTime(now)
    setBidCooldown(true)
    
    // Clear cooldown after 2 seconds
    setTimeout(() => {
      setBidCooldown(false)
    }, 2000)

    if (wsRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: "place_bid",
          playerId: auctionState.currentPlayer._id,
          amount: amount,
          bidder: user?.username,
        }),
      )
    }
  }

  const getBidSuggestions = () => {
    const currentBid = auctionState.currentBid
    const userPoints = (user as any)?.points || 0
    const suggestions = []

    for (let i = 1; i <= 5; i++) {
      const suggestedBid = currentBid + i * 10
      if (suggestedBid <= userPoints) {
        suggestions.push(suggestedBid)
      }
    }

    return suggestions
  }

  const canBidOnCurrentPlayer = () => {
    if (!auctionState.currentPlayer || !user || isAdmin) {
      return false
    }

    const playerPosition = auctionState.currentPlayer.position
    const coachName = user.name

    if (playerPosition === "MID") {
      return false
    }

    const coachRoster = coachRosters[coachName]
    if (coachRoster && coachRoster[playerPosition]) {
      return false
    }

    return true
  }

  const getPositionRestrictionMessage = () => {
    if (!auctionState.currentPlayer || !user || isAdmin) {
      return null
    }

    const playerPosition = auctionState.currentPlayer.position
    const coachName = user.name

    if (playerPosition === "MID") {
      return "코치들은 미드 선수 입찰이 불가능합니다 (팀의 미드 선수이기 때문)"
    }

    const coachRoster = coachRosters[coachName]
    if (coachRoster && coachRoster[playerPosition]) {
      const existingPlayer = coachRoster[playerPosition]
      return `You already have a ${playerPosition} player: ${existingPlayer?.name}`
    }

    return null
  }

  const leaveAuction = () => {
    if (wsRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: "leave",
        }),
      )
      wsRef.current.close()
    }
    router.push("/")
  }

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground-muted">{loading ? "로딩 중..." : "인증 중..."}</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-6">
      {/* Auto-assignment notification */}
      {autoAssignmentNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-lg">
          <div className="animate-slide-in-down bg-blue-600 border border-blue-500 rounded-lg p-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <div className="flex-1">
                <div className="text-white font-semibold text-sm mb-1">🎯 자동 배정</div>
                <p className="text-white text-sm">{autoAssignmentNotification}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bid notifications */}
      {isAdmin && bidNotifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {bidNotifications.map((notification) => (
            <div
              key={notification.id}
              className="animate-slide-in-right bg-card border border-primary rounded-lg p-4 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-foreground">새로운 입찰</span>
                  </div>
                  <p className="text-foreground font-bold text-lg">{notification.coachName}</p>
                  <p className="text-green-500 text-xl font-bold">${notification.amount}</p>
                </div>
                <button
                  onClick={() => setBidNotifications((prev) => prev.filter((n) => n.id !== notification.id))}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="bg-card border border-border rounded-lg p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">🏆 선수 경매</h1>
              <p className="text-muted-foreground text-sm">
                {user.name} {isAdmin ? "(관리자)" : `• ${(user as any).points || 0} 포인트`}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  isConnected ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"} animate-pulse`}
                ></div>
                {connectionStatus}
              </div>
              {auctionStatus === "started" && (
                <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">라이브</div>
              )}
              {isAdmin && (
                <button
                  onClick={() => router.push("/admin")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-lg transition-colors text-sm font-medium"
                >
                  관리자 패널
                </button>
              )}
            </div>
          </div>
        </div>

        {auctionState.currentPlayer ? (
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary rounded-lg p-6 md:p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 animate-pulse-glow"></div>
            <div className="relative z-10">
              <div className="text-center mb-6">
                <div className="inline-block bg-card/80 backdrop-blur-sm px-4 py-1 rounded-full text-xs font-semibold text-muted-foreground mb-3">
                  현재 경매
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                  {auctionState.currentPlayer.name}
                </h2>
                <p className="text-muted-foreground mb-4 max-w-2xl mx-auto">{auctionState.currentPlayer.description}</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium border border-primary/30">
                    {auctionState.currentPlayer.position}
                  </span>
                  <span className="bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-sm font-medium border border-green-500/30">
                    {auctionState.currentPlayer.tier}
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {/* Current Bid */}
                <div className="bg-card/80 backdrop-blur-sm rounded-lg p-4 border border-border text-center">
                  <div className="text-muted-foreground text-sm mb-1">현재 입찰가</div>
                  <div className="text-3xl font-bold text-green-500">${auctionState.currentBid}</div>
                  {auctionState.highestBidder && (
                    <div className="text-muted-foreground text-xs mt-1">{auctionState.highestBidder} 님</div>
                  )}
                </div>

                {/* Timer */}
                <div className="bg-card/80 backdrop-blur-sm rounded-lg p-4 border border-border text-center">
                  <div className="text-muted-foreground text-sm mb-1">남은 시간</div>
                  <div
                    className={`text-3xl font-bold ${auctionState.timeRemaining <= 5 ? "text-red-500" : "text-primary"}`}
                  >
                    {auctionState.timeRemaining}s
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-1000 ${
                        auctionState.timeRemaining <= 5 ? "bg-red-500" : "bg-primary"
                      }`}
                      style={{ width: `${(auctionState.timeRemaining / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Admin Controls or Bid Buttons */}
                <div className="bg-card/80 backdrop-blur-sm rounded-lg p-4 border border-border">
                  {isAdmin ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-3">
                      <div className="text-muted-foreground text-sm mb-2">관리자 제어</div>
                      {auctionState.isActive ? (
                        <button
                          onClick={endAuction}
                          className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          🏁 경매 종료
                        </button>
                      ) : (
                        <div className="text-foreground text-xs">입찰 모니터링 중...</div>
                      )}
                    </div>
                  ) : auctionState.isActive ? (
                    <div className="space-y-2">
                      {canBidOnCurrentPlayer() ? (
                        ((user as any)?.points || 0) > auctionState.currentBid ? (
                          <>
                            <div className="text-muted-foreground text-xs text-center mb-2">
                              {bidCooldown ? "입찰 쿨다운 중..." : "빠른 입찰"}
                            </div>
                            {getBidSuggestions()
                              .slice(0, 2)
                              .map((amount) => (
                                <button
                                  key={amount}
                                  onClick={() => placeBid(amount)}
                                  disabled={bidCooldown}
                                  className={`w-full py-2 px-4 rounded-lg transition-colors text-sm font-medium ${
                                    bidCooldown
                                      ? "bg-gray-400 cursor-not-allowed text-gray-600"
                                      : "bg-green-600 hover:bg-green-700 text-white"
                                  }`}
                                >
                                  {bidCooldown ? "쿨다운 중..." : `$${amount}`}
                                </button>
                              ))}
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full">
                            <div className="text-red-500 text-sm font-medium">💸 포인트 부족</div>
                            <div className="text-muted-foreground text-xs mt-1">
                              {(user as any)?.points || 0} 포인트 남음
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className="text-orange-500 text-sm font-medium text-center">🚫 입찰 불가</div>
                          <div className="text-muted-foreground text-xs mt-1 text-center">포지션 채워짐</div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Sold Status */}
              {auctionState.status === "sold" && (
                <div className="text-center mt-6">
                  {auctionState.highestBidder ? (
                    <div className="text-green-500 text-xl font-bold">
                      ✅ SOLD to {auctionState.highestBidder} for ${auctionState.currentBid}!
                    </div>
                  ) : (
                    <div>
                      <div className="text-red-500 text-xl font-bold mb-2">❌ 판매되지 않음 - 입찰 없음</div>
                      <div className="text-sm text-muted-foreground">
                        선수는 다음 라운드에서 다시 경매에 나올 예정입니다
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <div className="text-primary text-lg font-semibold mb-2">✅ 경매 준비 완료</div>
            <p className="text-muted-foreground mb-4">
              {isAdmin ? "선수를 뽑아서 경매를 시작하세요." : "관리자가 선수를 뽑을 때까지 기다려 주세요..."}
            </p>
            {isAdmin && (
              <button
                onClick={drawRandomPlayer}
                disabled={auctionState.isActive}
                className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground px-6 py-3 rounded-lg transition-colors font-medium"
              >
                🎲 랜덤 선수 뽑기
              </button>
            )}
            {isAdmin && (
              <div className="mt-4 inline-block bg-muted rounded-lg px-4 py-2 border border-border">
                <p className="text-muted-foreground text-sm">
                  라운드 {auctionRound}: {availablePlayers.length}명의 선수 이용 가능
                </p>
                {unsoldPlayers.length > 0 && (
                  <p className="text-orange-500 text-xs mt-1">
                    {unsoldPlayers.length}명의 미판매 선수가 재경매 예정
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">📋 팀 로스터</h2>
            {isAdmin && (
              <div className="flex items-center gap-3">
                {lastWebSocketUpdate && (
                  <span className="text-xs text-muted-foreground hidden md:block">업데이트됨: {lastWebSocketUpdate}</span>
                )}
                <button
                  onClick={refreshConnectionStatus}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  🔄 새로고침
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border px-3 py-3 text-left font-semibold text-foreground text-sm">
                    팀장 {isAdmin && <span className="text-xs text-muted-foreground"></span>}
                  </th>
                  <th className="border border-border px-3 py-3 text-center font-semibold text-foreground text-sm min-w-[80px]">
                    포인트
                  </th>
                  {[
                    { korean: "탑", english: "TOP" },
                    { korean: "정글", english: "JGL" },
                    { korean: "미드", english: "MID" },
                    { korean: "원딜", english: "ADC" },
                    { korean: "서폿", english: "SUPP" },
                  ].map((position) => (
                    <th
                      key={position.english}
                      className="border border-border px-3 py-3 text-center font-semibold text-foreground text-sm min-w-[120px]"
                    >
                      <div>{position.korean}</div>
                      <div className="text-xs text-muted-foreground font-normal">{position.english}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {connectedCoaches.map((coachName, index) => {
                  const coachDetail = coachDetails.find((coach) => coach.name === coachName)
                  const points = coachDetail?.points ?? 0
                  const connectionStatus = getCoachConnectionStatus(coachName)

                  return (
                    <tr key={index} className="hover:bg-muted/30 transition-colors">
                      <td className="border border-border px-3 py-3 font-medium text-foreground bg-muted/20">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{coachName}</span>
                          {isAdmin && (
                            <div className="flex items-center ml-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  connectionStatus.isConnected ? "bg-green-500" : "bg-red-500"
                                }`}
                                title={
                                  connectionStatus.isConnected
                                    ? `Connected ${connectionStatus.connectedAt ? new Date(connectionStatus.connectedAt).toLocaleTimeString() : ""}`
                                    : "Disconnected"
                                }
                              />
                              <span
                                className={`ml-1.5 text-xs font-medium ${
                                  connectionStatus.isConnected ? "text-green-500" : "text-red-500"
                                }`}
                              >
                                {connectionStatus.isConnected ? "ON" : "OFF"}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="border border-border px-3 py-3 text-center font-bold text-green-500 bg-muted/20">
                        {points}
                      </td>
                      {[
                        { korean: "탑", english: "TOP" },
                        { korean: "정글", english: "JGL" },
                        { korean: "미드", english: "MID" },
                        { korean: "원딜", english: "ADC" },
                        { korean: "서폿", english: "SUPP" },
                      ].map((position) => {
                        const player = coachRosters[coachName]?.[position.english]
                        return (
                          <td key={position.english} className="border border-border px-2 py-3 text-center">
                            {player ? (
                              <div className="bg-primary/10 rounded-lg p-2 border border-primary/30">
                                <div className="font-bold text-primary text-sm">{player.name}</div>
                                <div className="text-xs text-green-500 font-medium">${player.currentPrice}</div>
                                <div className="text-xs text-muted-foreground">{player.tier}</div>
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-sm italic">비어있음</div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
                {/* 6명 미만일 때 나머지 행 채우기 */}
                {Array.from({ length: Math.max(0, 6 - connectedCoaches.length) }).map((_, index) => (
                  <tr key={`empty-row-${index}`} className="opacity-40">
                    <td className="border border-border px-3 py-3 font-medium text-muted-foreground bg-muted/20">
                      <span className="text-sm">비어있는 슬롯</span>
                    </td>
                    <td className="border border-border px-3 py-3 text-center text-muted-foreground bg-muted/20">-</td>
                    {[
                      { korean: "탑", english: "TOP" },
                      { korean: "정글", english: "JGL" },
                      { korean: "미드", english: "MID" },
                      { korean: "원딜", english: "ADC" },
                      { korean: "서폿", english: "SUPP" },
                    ].map((position) => (
                      <td key={position.english} className="border border-border px-2 py-3 text-center">
                        <div className="text-muted-foreground text-sm">-</div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">👥 활성 코치</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, index) => {
              const coach = coachDetails[index]
              const connectionStatus = coach ? getCoachConnectionStatus(coach.name) : null

              return (
                <div
                  key={index}
                  className={`bg-muted/50 border rounded-lg p-4 transition-all ${
                    coach
                      ? connectionStatus?.isConnected
                        ? "border-green-500 shadow-lg shadow-green-500/20"
                        : "border-border"
                      : "border-border opacity-40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        coach && connectionStatus?.isConnected ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
                      }`}
                    ></div>
                    {coach && <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>}
                  </div>
                  <div className="mb-2">
                    <div className="font-bold text-foreground text-sm truncate">
                      {coach ? coach.name : "비어있는 슬롯"}
                    </div>
                    {coach && <div className="text-xs text-muted-foreground truncate">@{coach.username}</div>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">포인트</span>
                    <span className="text-green-500 font-bold">{coach ? coach.points : "-"}</span>
                  </div>
                  {coach && connectionStatus && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div
                        className={`text-xs font-medium ${
                          connectionStatus.isConnected ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {connectionStatus.isConnected ? "● 온라인" : "○ 오프라인"}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Auction Stats */}
          {isAdmin && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-3">📊 경매 통계</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">라운드:</span>
                  <span className="font-bold text-primary">{auctionRound}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">이용 가능한 선수:</span>
                  <span className="font-bold text-foreground">{availablePlayers.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">미판매 선수:</span>
                  <span className="font-bold text-orange-500">{unsoldPlayers.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">전체 선수:</span>
                  <span className="font-bold text-foreground">{totalPlayersCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
