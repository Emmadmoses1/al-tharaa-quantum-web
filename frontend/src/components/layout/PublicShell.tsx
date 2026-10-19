import { ReactNode } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'

export default function PublicShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div style={{ background: '#0B0B0B', minHeight: '100dvh', color: '#fff', direction: 'rtl' }}>
      <Navbar />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '104px 18px 40px' }}>
        <header style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 'clamp(24px,6vw,36px)', fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 8 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', lineHeight: 1.9, maxWidth: 680 }}>{subtitle}</p>}
          <div style={{ width: 56, height: 3, background: 'linear-gradient(90deg,#D4AF37,transparent)', marginTop: 16, borderRadius: 2 }} />
        </header>
        {children}
      </main>
      <Footer />
    </div>
  )
}

export function Block({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="glass-card" style={{ padding: '22px 20px', marginBottom: 16 }}>
      {title && <h2 style={{ fontSize: 17, fontWeight: 700, fontFamily: 'Cairo', color: '#D4AF37', marginBottom: 12 }}>{title}</h2>}
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', fontFamily: 'Cairo', lineHeight: 2 }}>{children}</div>
    </section>
  )
}

export function Notice({ children, color = '#f59e0b' }: { children: ReactNode; color?: string }) {
  return (
    <div style={{ padding: '12px 16px', marginBottom: 16, borderRadius: 10, background: `${color}12`, border: `1px solid ${color}38`, color, fontSize: 12.5, fontFamily: 'Cairo', lineHeight: 1.9 }}>
      {children}
    </div>
  )
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingInlineStart: 20 }}>
      {items.map((t, i) => <li key={i} style={{ marginBottom: 6 }}>{t}</li>)}
    </ul>
  )
}
