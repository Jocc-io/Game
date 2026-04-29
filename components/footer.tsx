import { Bot, Linkedin, Send, Twitter } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-white/10 bg-black/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-8 ">
            <a href="#" className="flex flex-col gap-2 ">
              <p
                className="text-xl font-wide font-bold text-transparent bg-clip-text bg-gradient-to-r 
              from-pink-500 via-cyan-500 to-purple-500">
                Jocc GameHub
              </p>
            </a>
            <p
              className="text-xs md:text-xs text-transparent bg-clip-text bg-gradient-to-r 
              from-pink-500 via-cyan-500 to-purple-300">
              OnChain classic arcade games on Solana.
              <br />
              Play To Earn tokens, Join global leaderboard.
            </p>
          </div>
          <a href="/history" className="flex gap-2 mb-8">
            <p
              className="text-md font-bold animate-pulse duration-7000 text-transparent bg-clip-text 
              bg-gradient-to-r from-cyan-500 to-pink-500 text-pink-400 font-bold">
              Leaderboard
            </p>
          </a>

          <div className="flex flex-row gap-4 mb-8">
            <a
              href="https://www.linkedin.com/company/joccnft"
              target="_blank"
              className="text-blue-500">
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href="https://x.com/joccfun"
              target="_blank"
              className="text-blue-500">
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href="https://discord.gg/jmMY8MrQCt"
              target="_blank"
              className="text-blue-500">
              <Bot className="w-4 h-4" />
            </a>
            <a
              href="https://t.me/joccnft"
              target="_blank"
              className="text-blue-500">
              <Send className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 gap-4 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} jocc - all Rights Reserved
          </p>
          <div className="flex gap-4">
            <a
              href="https://solscan.io/token/JoccLDaiiZv7P9F3LfcWjcVWD7rf6wpMrCimy6Xcbhc"
              target="_blank"
              className="text-gray-400 text-xs">
              Jocc Token
            </a>
            <a
              href="https://t.me/joseph178"
              target="_blank"
              className="text-gray-400 text-xs">
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
