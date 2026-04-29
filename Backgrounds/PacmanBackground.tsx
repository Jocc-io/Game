"use client";

import React, { useEffect, useState } from "react";

interface Particle {
  left: string;
  top: string;
  width: string;
  height: string;
  animation: string;
}

export default function PacmanBackground() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: 50 }).map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      width: `${3 + Math.random() * 4}px`,
      height: `${3 + Math.random() * 4}px`,
      animation: `blink ${2 + Math.random() * 3}s ease-in-out infinite`,
    }));
    setParticles(generated);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* Grid background */}
      <div
        className="absolute inset-0"
         style={{
          backgroundImage: `
            linear-gradient(rgba(251,146,60,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(251,146,60,0.15) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glowing purple particles */}
      {particles.map((p, i) => (
        <div
          key={`particle-${i}`}
          className="absolute rounded-full bg-purple-400"
          style={{
            ...p,
            boxShadow: "0 0 10px #fb923c, 0 0 20px #f97316",
          }}
        />
      ))}

      {/* Moving neon lines */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={`line-${i}`}
          className="absolute h-[2px] w-full opacity-70"
          style={{
            top: `${(i + 1) * 15}%`,
            background:
              "linear-gradient(90deg, transparent, #fb923c, #f97316, #fdba74, transparent)",
            animation: `moveLine ${10 + i * 2}s linear infinite`,
          }}
        />
      ))}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70" />

      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50%      { opacity: 1; transform: scale(1.6); }
        }

        @keyframes moveLine {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
