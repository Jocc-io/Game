"use client";

import React from "react";

export default function HpmeBackground() {
  const [ready, setReady] = React.useState(false);
  const [particles, setParticles] = React.useState<React.CSSProperties[]>([]);

  React.useEffect(() => {
    setReady(true);
    // اتولد القيم بعد الـ mount
    setParticles(
      Array.from({ length: 50 }).map((_, i) => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        width: `${2 + Math.random() * 4}px`,
        height: `${2 + Math.random() * 4}px`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${15 + Math.random() * 30}s`,
        backgroundColor: [
          "#ff00ff80",
          "#00ffff80",
          "#ff00aa80",
          "#00ff0080",
          "#ffff0080",
        ][Math.floor(Math.random() * 5)],
      }))
    );
  }, []);

  if (!ready) return null; // السيرفر يرندر لا شيء → مفيش mismatch

  return (
    <div className="fixed inset-0 -z-10 neon-animation">
      {particles.map((style, i) => (
        <div key={`particle-${i}`} className="neon-particle" style={style} />
      ))}

      <style jsx global>{`
        .neon-animation {
          position: fixed;
          inset: 0;
          overflow: hidden;
          background: black;
        }
        .neon-particle {
          position: absolute;
          border-radius: 50%;
          box-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
          animation: neon-float 20s linear infinite;
        }
        @keyframes neon-float {
          0% { transform: translate(0, 0); }
          25% { transform: translate(100px, 50px); }
          50% { transform: translate(50px, 100px); }
          75% { transform: translate(-50px, 50px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
    </div>
  );
}
