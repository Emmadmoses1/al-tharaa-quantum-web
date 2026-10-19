import Navbar from '../components/layout/Navbar'
import HeroSection from '../components/hero/HeroSection'
import FeaturesSection from '../components/sections/FeaturesSection'
import ProductsSection from '../components/sections/ProductsSection'
import SecuritySection from '../components/sections/SecuritySection'
import CtaSection from '../components/sections/CtaSection'
import Footer from '../components/layout/Footer'

export default function LandingPage() {
  return (
    <div style={{
      background: '#0B0B0B',
      minHeight: '100vh',
      color: '#fff',
      direction: 'rtl',
    }}>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <ProductsSection />
      <SecuritySection />
      <CtaSection />
      <Footer />
    </div>
  )
}
