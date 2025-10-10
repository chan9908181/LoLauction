import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Suspense } from "react"
import { AuthProvider } from '@/contexts/AuthContext'
import AuctionRedirect from '@/components/AuctionRedirect'
import "./globals.css"

export const metadata: Metadata = {
  title: "Coach Player Auction - Build Your Dream Team",
  description: "Join as a coach and bid on talented players to build your ultimate team",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Player Auction"
  },
  formatDetection: {
    telephone: false
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>
          <AuthProvider>
            <AuctionRedirect />
            {children}
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  )
}
