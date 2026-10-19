export default function GoldCoin() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}>

      {/* Outer glow ring */}
      <div style={{
        position: 'absolute',
        width: 320,
        height: 320,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)',
        animation: 'glowPulse 3s ease-in-out infinite',
      }} />

      {/* Orbit ring 1 */}
      <div style={{
        position: 'absolute',
        width: 300,
        height: 100,
        borderRadius: '50%',
        border: '1px solid rgba(212,175,55,0.2)',
        animation: 'ringRotate 8s linear infinite',
        top: '50%',
        left: '50%',
        marginTop: -50,
        marginLeft: -150,
      }} />

      {/* Orbit ring 2 */}
      <div style={{
        position: 'absolute',
        width: 260,
        height: 80,
        borderRadius: '50%',
        border: '1px solid rgba(212,175,55,0.12)',
        animation: 'ringRotate 12s linear infinite reverse',
        top: '50%',
        left: '50%',
        marginTop: -40,
        marginLeft: -130,
      }} />

      {/* 3D Coin wrapper — float animation */}
      <div style={{
        position: 'relative',
        width: 180,
        height: 180,
        animation: 'floatUpDown 5s ease-in-out infinite',
        perspective: '600px',
        perspectiveOrigin: 'center center',
      }}>
        {/* Coin 3D scene */}
        <div style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          animation: 'coinRotateY 6s linear infinite',
        }}>

          {/* Coin FACE (front) */}
          <div style={{
            position: 'absolute',
            width: 180,
            height: 180,
            borderRadius: '50%',
            backfaceVisibility: 'hidden',
            background: 'conic-gradient(from 0deg, #8B6914, #D4AF37, #E8CC6A, #F5E27A, #D4AF37, #A8871C, #D4AF37, #E8CC6A, #8B6914)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `
              inset 0 4px 12px rgba(255,255,255,0.3),
              inset 0 -4px 12px rgba(0,0,0,0.4),
              0 0 40px rgba(212,175,55,0.5),
              0 0 80px rgba(212,175,55,0.2)
            `,
            flexDirection: 'column',
            gap: 4,
          }}>
            {/* Shimmer overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)',
              backgroundSize: '200% 100%',
              animation: 'shimmerMove 2.5s linear infinite',
              overflow: 'hidden',
            }} />

            {/* Inner embossed ring */}
            <div style={{
              position: 'absolute',
              width: 150,
              height: 150,
              borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.25)',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)',
            }} />

            {/* AQ monogram */}
            <div style={{
              fontFamily: 'Montserrat',
              fontWeight: 900,
              fontSize: 36,
              color: '#0B0B0B',
              lineHeight: 1,
              zIndex: 2,
              textShadow: '0 1px 2px rgba(255,255,255,0.3)',
            }}>AQ</div>
            <div style={{
              fontFamily: 'Montserrat',
              fontSize: 8,
              fontWeight: 700,
              color: 'rgba(11,11,11,0.7)',
              letterSpacing: '3px',
              zIndex: 2,
            }}>QUANTUM</div>
          </div>

          {/* Coin BACK */}
          <div style={{
            position: 'absolute',
            width: 180,
            height: 180,
            borderRadius: '50%',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'conic-gradient(from 180deg, #8B6914, #D4AF37, #E8CC6A, #D4AF37, #A8871C, #D4AF37, #8B6914)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `
              inset 0 4px 12px rgba(255,255,255,0.2),
              inset 0 -4px 12px rgba(0,0,0,0.4),
              0 0 40px rgba(212,175,55,0.3)
            `,
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)',
              backgroundSize: '200% 100%',
              animation: 'shimmerMove 2.5s linear infinite 1.25s',
            }} />
            <div style={{
              fontFamily: 'Cairo',
              fontWeight: 900,
              fontSize: 22,
              color: '#0B0B0B',
              zIndex: 2,
              textAlign: 'center',
              lineHeight: 1.3,
            }}>الثراء<br/>كوانتوم</div>
          </div>

          {/* Coin EDGE (thickness illusion top) */}
          <div style={{
            position: 'absolute',
            width: 180,
            height: 14,
            top: 0,
            left: 0,
            background: 'linear-gradient(180deg, #E8CC6A, #A8871C)',
            transform: 'rotateX(90deg) translateZ(-7px)',
            borderRadius: '2px',
          }} />
        </div>
      </div>

      {/* Particle dots */}
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: i % 3 === 0 ? 4 : 2,
          height: i % 3 === 0 ? 4 : 2,
          borderRadius: '50%',
          background: '#D4AF37',
          opacity: 0.4 + (i * 0.07),
          top: `${15 + i * 10}%`,
          left: `${8 + i * 11}%`,
          animation: `glowPulse ${2 + i * 0.4}s ease-in-out infinite ${i * 0.3}s`,
        }} />
      ))}
    </div>
  )
}
