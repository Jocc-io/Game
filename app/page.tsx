"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import Link from "next/link"
import { Gamepad2, Trophy, Sparkles, Coins, Globe, Gift, Bot, DoorOpen, Smartphone } from "lucide-react"
import WalletContextProvider from "@/components/wallet-context-provider"
import Footer from "@/components/footer"
import Navbar from "@/components/navbar"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { AuthButton } from "@/components/auth-button"
import { KeyRound } from "lucide-react"
import HpmeBackground from "@/Backgrounds/HpmeBackground"

export default function Home() {
  return (
    <WalletContextProvider>
      <div className="min-h-screen text-white font-sans flex flex-col relative overflow-hidden">
        <HpmeBackground />
        <Navbar />
        <main className="container mx-auto px-4 py-8 flex-grow relative z-10">
          <div className="flex flex-col items-center justify-center">
            <div className="w-full">
              <GameSelection />
              <FeaturesSection />
              <PartnersSection />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </WalletContextProvider>
  )
}

function GameSelection() {
  const { connected } = useWallet()
  const { isAuthenticated } = useWalletAuth()
  const [tokens, setTokens] = useState(0)

  // Load tokens from localStorage if available
  useEffect(() => {
    if (connected && typeof window !== "undefined") {
      const savedTokens = localStorage.getItem("solanaArcadeTokens")
      if (savedTokens) {
        setTokens(Number.parseInt(savedTokens, 10))
      }
    }
  }, [connected])

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-20 space-y-6">
      <div className="inline-flex items-center gap-2 px-4 py-2 mt-4 rounded-full bg-white/5 border border-white/10 text-sm 
      font-medium mb-4">
        <Sparkles className="w-4 h-4 text-yellow-400" />
        <span className="text-gray-300">The Future of Web3 Gaming</span>
      </div>
      <h1 className="text-4xl md:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent uppercase">
        Next-Gen <br /> Arcade Experience
      </h1>
      <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
        Classic gameplay meet blockchain security. Play, earn, and dominate the leaderboard in the most advanced Solana arcade.
      </p>
    </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 w-full max-w-8xl mb-8">

        {/* Flappy Bird Game Card */}
        <GameCard
          title="Flappy"
          image="/images/flappy.jpg"
          color="from-sky-500 to-yellow-500"
          path="/flappy-bird"
          icon={<Gamepad2 className="w-6 h-6" />}
        />

        {/* Asteroids Game Card */}
        <GameCard
          title="Asteroids"
          image="/images/asteroids.jpg"
          color="from-slate-500 to-gray-500"
          path="/asteroids"
          icon={<Trophy className="w-6 h-6" />}
        />

         {/* Break Bricks Game Card */}
        <GameCard
          title="Space"
          image="/images/space.jpg"
          color="from-cyan-500 to-pink-500"
          path="/space-invaders"
          icon={<Sparkles className="w-6 h-6" />}
        />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mb-4 gap-4 w-full max-w-8xl">

         {/* Break Bricks Game Card */}
        <GameCard
          title="Break"
          image="/images/Break.jpg"
          color="from-cyan-500 to-blue-500"
          path="/break-bricks"
          icon={<Sparkles className="w-6 h-6" />}
         
        />

        {/* Tetris Game Card */}
        <GameCard
          title="Tetris"
          image="/images/Tetris.jpg"
          color="from-purple-500 to-pink-500"
          path="/tetris"
          icon={<Gamepad2 className="w-6 h-6" />}
          
        />

        {/* Snake Game Card */}
        <GameCard
          title="Snake"
          image="/images/Snake.jpg"
          color="from-green-500 to-emerald-500"
          path="/snake"
          icon={<Trophy className="w-6 h-6" />}
          
        />

        {/* Pac-Man Game Card */}
        <GameCard
          title="PacMan"
          image="/images/pacman.jpg"
          color="from-yellow-500 to-orange-500"
          path="/pac-man"
          icon={<Gamepad2 className="w-6 h-6" />}
        />

      </div>

      {!connected && (
        <div className="mt-20 bg-black/50 backdrop-blur-sm p-6 rounded-xl border border-cyan-500/30 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-cyan-600/30 flex items-center justify-center mb-4 mx-auto">
            <Trophy className="w-8 h-8 text-cyan-300" />
          </div>
          <h3 className="text-lg font-bold mb-2">Connect Your Wallet</h3>
          <p className="text-gray-300 text-xs mb-4">
            Connect your Solana wallet to track your progress, earn tokens, and unlock special features across all
            games.
          </p>
          <div className="flex justify-center">
            <AuthButton />
          </div>
        </div>
      )}

    
    </div>
  )
}

function FeaturesSection() {
  return (
    <section id="features" className="py-16 mt-8 scroll-mt-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400">
          Platform Features
        </h2>
        <p className="text-gray-300 max-w-2xl mx-auto text-sm pl-12 pr-12">
        Jocc combines classic gaming with blockchain technology to create a unique gaming</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto p-2">
        <FeatureCard
          title="Jocc Token Rewards"
          icon={<Coins className="w-10 h-10 text-yellow-400" />}
          color="from-yellow-500/20 to-amber-500/20"
          borderColor="border-yellow-500/50"
          glowColor="yellow"
        />

         <FeatureCard
          title="AI-Anti Bot Guard"
          icon={<Bot className="w-10 h-10 text-cyan-400" />}
          color="from-cyan-500/20 to-blue-500/20"
          borderColor="border-cyan-500/50"
          glowColor="cyan"
        />

        <FeatureCard
          title="Jocc NFT Token Gate"
          icon={<DoorOpen className="w-10 h-10 text-purple-300" />}
          color="from-purple-500/20 to-indigo-500/20"
          borderColor="border-purple-500/50"
          glowColor="purple"
        />
        <FeatureCard
          title="Mobile Compatible"
          icon={<Smartphone className="w-10 h-10 text-pink-400" />}
          color="from-pink-500/20 to-rose-500/20"
          borderColor="border-pink-500/50"
          glowColor="pink"
        />

        <FeatureCard
          title="OnChain Leaderboard"
          icon={<Trophy className="w-10 h-10 text-purple-500" />}
          color="from-pink-500/20 to-gold-500/20"
          borderColor="border-pink-500/30"
          glowColor="indigo"
        />
         <FeatureCard
          title="Cross-Game Rewards"
          icon={<Gift className="w-10 h-10 text-green-400" />}
          color="from-green-500/20 to-emerald-500/20"
          borderColor="border-green-500/50"
          glowColor="green"
        />

      </div>
    </section>
  )
}

function PartnersSection() {
  return (
    <section id="partners" className="py-16 mt-8 scroll-mt-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400">
          Our Partners
        </h2>
        <p className="text-gray-300 max-w-2xl mx-auto text-sm pl-12 pr-12">
          Collaborating with leading blockchain gaming studios to bring the best gaming experience
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 max-w-6xl mx-auto p-2">
        <PartnerCard
          name="Coming soon"
          logo="/images/sol.png"
          games={["Crypto Racers", "NFT Legends"]}
          glowColor="cyan"
        />

        <PartnerCard
          name="Coming soon"
          logo="/images/sol.png"
          games={["Crypto Racers", "NFT Legends"]}
          glowColor="cyan"
        />

      
      </div>

      <div className="text-center mt-12">
        <Link
          href="mailto:info@solnm.com"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500/30 to-pink-500/30 rounded-xl text-white font-medium hover:from-cyan-500/40 hover:to-pink-500/40 transition-all border border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/20"
        >
          <Globe className="w-5 h-5" />
          Become a Partner
        </Link>
      </div>
    </section>
  )
}

interface GameCardProps {
  title: string
  image: string
  color: string
  path: string
  icon: React.ReactNode
  requiresAuth?: boolean
  isAuthenticated?: boolean
}

function GameCard({ title, image, color, path, icon, requiresAuth, isAuthenticated }: GameCardProps) {
  return (
    <Link
      href={path}
      className="bg-black/50 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 transition-all hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/20 group relative"
    >
      <div className="aspect-video w-full relative overflow-hidden">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${color} opacity-20 group-hover:opacity-30 transition-opacity`}
        />
        <img
          src={image || "/placeholder.svg?height=200&width=300"}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
          {icon}
        </div>

        {requiresAuth && !isAuthenticated && (
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
            <KeyRound className="w-3 h-3 text-yellow-400" />
            <span className="text-xs font-medium text-yellow-400">Auth Required</span>
          </div>
        )}
      </div>
      <div className="flex flex-row justify-between px-2 py-1 ">
        <h3 className="text-sm md:text-xl font-bold mt-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-pink-500 transition-colors">
          {title}
        </h3>
        <div className="flex justify-end">
          <span className="px-4 py-1 md:px-8 md:py-2 mt-2 bg-gradient-to-r from-pink-500 to-blue-500 hover:from-green-600 hover:to-emerald-600 
          rounded-xl text-xs md:text-sm font-medium group-hover:bg-gradient-to-r 
          group-hover:from-cyan-500/20 group-hover:to-pink-500/20 transition-colors">
            Play
          </span>
        </div>
      </div>
    </Link>
  )
}

interface FeatureCardProps {
  title: string
  icon: React.ReactNode
  image?: string
  color: string
  borderColor: string
  glowColor: string
}

function FeatureCard({ title, icon, image, color, borderColor, glowColor }: FeatureCardProps) {
  return (
    <div
      className={`bg-black/50 backdrop-blur-sm rounded-xl overflow-hidden border ${borderColor} 
      transition-all hover:scale-105 hover:shadow-xl hover:shadow-${glowColor}-500/20 group`}
    >
      <div className={`p-3 bg-gradient-to-br ${color}`}>
        <div className="flex items-center gap-2 mb-4 mt-4">
          <div className="w-5 h-5 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-full bg-black/30 backdrop-blur-sm flex 
          items-center justify-center ml-1 md:ml-4 mr-1 md:mr-2">
            {icon}
          </div>
          <h3 className="text-xs md:text-xl lg:text-xl">{title}</h3>
        </div>
      </div>
    </div>
  )
}

interface PartnerCardProps {
  name: string
  logo: string
  games: string[]
  glowColor: string
}

function PartnerCard({ name, logo, games, glowColor }: PartnerCardProps) {
  return (
    <div
      className={`bg-black/50 backdrop-blur-sm rounded-xl overflow-hidden border border-${glowColor}-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-${glowColor}-500/20 group`}
    >
      <div className="p-2">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 via-pink-500/30 to-yellow-500/100 flex items-center justify-center overflow-hidden">
            <img src={logo || "/placeholder.svg"} alt={name} className="w-10 h-10 md:w-8 md:h-8 lg:w-10 lg:h-10 object-contain" />
          </div>
          <h3 className="text-base font-bold md:text-xl lg:text-xl">{name}</h3>
        </div>
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Featured Games:</h4>
          <div className="flex flex-wrap gap-2">
            {games.map((game, index) => (
              <span key={index} className="px-3 py-1 bg-white/5 rounded-full text-xs font-medium">
                {game}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


