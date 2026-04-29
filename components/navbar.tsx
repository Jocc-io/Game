'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Home,
  Gamepad2,
  Store,
  History,
  KeySquare,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';

const WalletMultiButton = dynamic(
  async () =>
    (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

const TokenDisplay = dynamic(() => import('@/components/token-display'), {
  ssr: false,
});

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { connected } = useWallet();

  const [tokens, setTokens] = useState(0);

  useEffect(() => {
    if (connected && typeof window !== 'undefined') {
      const savedTokens = localStorage.getItem('solanaArcadeTokens');
      if (savedTokens) {
        setTokens(Number.parseInt(savedTokens, 10));
      }
    }
  }, [connected]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const games = [
    {
      name: 'Flappy',
      path: '/flappy-bird',
      icon: <Gamepad2 className="w-3 h-3 text-cyan-400" />,
    },
    {
      name: 'Asteroids',
      path: '/asteroids',
      icon: <Gamepad2 className="w-3 h-3 text-cyan-400" />,
    },
    {
      name: 'Space',
      path: '/space-invaders',
      icon: <Gamepad2 className="w-3 h-3 text-cyan-400" />,
    },
    {
      name: 'Break',
      path: '/break-bricks',
      icon: <Gamepad2 className="w-3 h-3 text-cyan-400" />,
    },
    {
      name: 'Tetris',
      path: '/tetris',
      icon: <Gamepad2 className="w-3 h-3 text-cyan-400" />,
    },
    {
      name: 'Snake',
      path: '/snake',
      icon: <Gamepad2 className="w-3 h-3 text-cyan-400" />,
    },
    {
      name: 'PacMan',
      path: '/pac-man',
      icon: <Gamepad2 className="w-3 h-3 text-cyan-400" />,
    },
  ];

  return (
    <header
      className={`sticky top-0 z-50 border-b border-white/10 backdrop-blur-sm transition-all duration-300 ${
        isScrolled ? 'bg-black/60' : 'bg-black/20'
      }`}>
      <div className="container mx-auto px-4 py-2 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-3xl md:text-4xl font-web font-bold text-transparent 
            bg-clip-text bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 animate-pulse duration-9000">
            Jocc
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center justify-center gap-2 flex-1">
          <Link
            href="https://jocc.io"
            className={`flex items-center gap-1 p-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 
              hover:to-purple-500/30 transition-all border border-cyan-500/30 hover:border-cyan-400/50 ${
                isActive('/') ? 'text-cyan-300 bg-cyan-500/20' : 'text-white'
              }`}>
            <Store className="w-3 h-3" />
          </Link>
          <Link
            href="/flappy-bird"
            className={`flex items-center gap-1 py-1 px-4 text-xs rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 
              hover:from-cyan-500/30 hover:to-purple-500/30 
              transition-all border border-cyan-500/30 hover:border-cyan-400/50 ${
                isActive('/flappy-bird')
                  ? 'text-yellow-300 bg-cyan-500/20'
                  : 'text-cyan-300'
              }`}>
            <span>Flappy</span>
          </Link>
          <Link
            href="/asteroids"
            className={`flex items-center gap-1 py-1 px-4 text-xs rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 
              hover:from-cyan-500/30 hover:to-purple-500/30 
              transition-all border border-cyan-500/30 hover:border-cyan-400/50 ${
                isActive('/asteroids')
                  ? 'text-yellow-300 bg-cyan-500/20'
                  : 'text-cyan-300'
              }`}>
            <span>Asteroids</span>
          </Link>

          <Link
            href="/space-invaders"
            className={`flex items-center gap-1 py-1 px-4 text-xs rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 
              hover:from-cyan-500/30 hover:to-purple-500/30 
              transition-all border border-cyan-500/30 hover:border-cyan-400/50 ${
                isActive('/space-invaders')
                  ? 'text-yellow-300 bg-cyan-500/20'
                  : 'text-cyan-300'
              }`}>
            <span>Space</span>
          </Link>

          <Link
            href="/break-bricks"
            className={`flex items-center gap-1 py-1 px-4 text-xs rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 
              hover:from-cyan-500/30 hover:to-purple-500/30 
              transition-all border border-cyan-500/30 hover:border-cyan-400/50 ${
                isActive('/break-bricks')
                  ? 'text-yellow-300 bg-cyan-500/20'
                  : 'text-cyan-300'
              }`}>
            <span>Break</span>
          </Link>

          <Link
            href="/tetris"
            className={`flex items-center gap-1 py-1 px-4 text-xs rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 
              hover:from-cyan-500/30 hover:to-purple-500/30 
              transition-all border border-cyan-500/30 hover:border-cyan-400/50 ${
                isActive('/tetris')
                  ? 'text-yellow-300 bg-cyan-500/20'
                  : 'text-cyan-300'
              }`}>
            <span>Tetris</span>
          </Link>

          <Link
            href="/snake"
            className={`flex items-center gap-1 py-1 px-4 text-xs rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 
              hover:from-cyan-500/30 hover:to-purple-500/30 
              transition-all border border-cyan-500/30 hover:border-cyan-400/50 ${
                isActive('/snake')
                  ? 'text-yellow-300 bg-cyan-500/20'
                  : 'text-cyan-300'
              }`}>
            <span>Snake</span>
          </Link>

          <Link
            href="/pac-man"
            className={`flex items-center gap-1 py-1 px-4 text-xs rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 
              hover:from-cyan-500/30 hover:to-purple-500/30 
              transition-all border border-cyan-500/30 hover:border-cyan-400/50 ${
                isActive('/pac-man')
                  ? 'text-yellow-300 bg-cyan-500/20'
                  : 'text-cyan-300'
              }`}>
            <span>PacMan</span>
          </Link>

          <Link
            href="https://jocc.io/c/4RHERyDGjRL59EWu4MhZy2g6E89GtC2ofS19TY8hhodR"
            target="_blank"
            className={`flex items-center gap-1 p-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 
              hover:from-cyan-500/30 hover:to-purple-500/30 transition-all border border-cyan-500/30 hover:border-cyan-400/50 ${
                isActive('/') ? 'text-cyan-300 bg-cyan-500/20' : 'text-white'
              }`}>
            <KeySquare className="w-3 h-3 text-yellow-300" />
          </Link>
        </nav>

        {/* Right side Desktop */}
        <div className="hidden md:flex items-center justify-center gap-4">
          {connected && <TokenDisplay tokens={tokens} />}
          <WalletMultiButton />
          {connected && (
            <Link
              href="/history"
              className={`p-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 
                hover:to-purple-500/30 transition-all border border-cyan-500/30 hover:border-cyan-400/50 ${
                  isActive('/history')
                    ? 'text-cyan-300 bg-cyan-500/20'
                    : 'text-white'
                }`}
              title="History">
              <History className="w-5 h-5" />
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors ml-auto"
          onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden fixed inset-0 bg-black backdrop-blur-md z-40 transition-all duration-300 ${
          isMenuOpen
            ? 'opacity-100 visible'
            : 'opacity-0 invisible pointer-events-none'
        }`}>
        <button
          onClick={() => setIsMenuOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors z-50"
          aria-label="Close menu">
          <X className="w-5 h-5" />
        </button>

        <div className="container mx-auto px-2 py-10 bg-gradient-to-r from-black to-gray-900 border border-cyan-500/30 rounded-xl mt-2">
          <nav className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2">
              <WalletMultiButton />
              {connected && (
                <div className="flex items-center max-w-lg">
                  <TokenDisplay tokens={tokens} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 items-center justify-center mx-auto gap-2">
              <Link
                href="/"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 
                hover:from-cyan-500/30 hover:to-purple-500/30 transition-all border border-cyan-500/30 ${
                  isActive('/') ? 'text-cyan-300 bg-cyan-500/20' : 'text-white'
                }`}>
                <Home className="w-4 h-4 " />
                <span className="text-xs">Home</span>
              </Link>
              <Link
                href="https://jocc.cc/c/J7XdT55SHbcejfrLkDhz14sPcv9iZg81venAoDqYepoc"
                target="_blank"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 
                hover:from-cyan-500/30 hover:to-purple-500/30 transition-all border border-cyan-500/30 ${
                  isActive('/') ? 'text-cyan-300 bg-cyan-500/20' : 'text-white'
                }`}>
                <KeySquare className="w-3 h-3 text-yellow-300" />
                <span className="text-xs">Get Key</span>
              </Link>
              {connected && (
                <Link
                  href="/history"
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 
                  hover:to-purple-500/30 transition-all border border-cyan-500/30 ${
                    isActive('/')
                      ? 'text-cyan-300 bg-cyan-500/20'
                      : 'text-white'
                  }`}>
                  <History className="w-4 h-4 " />
                  <span className="text-xs">History</span>
                </Link>
              )}
            </div>

            <div className="flex flex-col rounded-xl">
              <div
                className={`flex items-center gap-2  ${
                  pathname.includes('/flappy-bird') ||
                  pathname.includes('/asteroids') ||
                  pathname.includes('/break-bricks') ||
                  pathname.includes('/tetris') ||
                  pathname.includes('/snake') ||
                  pathname.includes('/pac-man') ||
                  pathname.includes('/asteroids')
                    ? 'text-cyan-300'
                    : 'text-white'
                }`}></div>

              <div className="grid grid-cols-4 items-center justify-center mx-auto gap-2">
                {games.map((game) => (
                  <Link
                    key={game.path}
                    href={game.path}
                    className={`flex items-center justify-center text-[10px] gap-2 px-1 py-1 rounded-xl bg-gradient-to-r from-cyan-500/10 
                      to-purple-500/10 hover:from-cyan-500/20 hover:to-purple-500/20 transition-all border border-cyan-500/20 ${
                        pathname === game.path
                          ? 'text-cyan-300 bg-cyan-500/20'
                          : 'text-white'
                      }`}>
                    {game.icon}
                    <span className="text-[10px] text-cyan-300 ">
                      {game.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
