import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ direction: 'rtl', padding: 24, margin: '24px auto', maxWidth: 520, textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: 'Cairo', marginBottom: 8 }}>حدث خطأ غير متوقع في هذه الصفحة</div>
        <div style={{ fontSize: 12, color: '#ef4444', fontFamily: 'Montserrat', direction: 'ltr', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 12, marginBottom: 16, wordBreak: 'break-word' }}>
          {this.state.error.message}
        </div>
        <button className="btn-gold" onClick={() => this.setState({ error: null })} style={{ marginInline: 6 }}>إعادة المحاولة</button>
        <button className="btn-outline-gold" onClick={() => { window.location.href = '/dashboard' }} style={{ marginInline: 6 }}>الرئيسية</button>
      </div>
    )
  }
}
