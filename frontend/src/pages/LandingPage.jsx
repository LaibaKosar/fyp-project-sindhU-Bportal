import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import StatsSection from '../components/StatsSection'
import UniversitiesByDiscipline from '../components/UniversitiesByDiscipline'
import Institutions from '../components/Institutions'
import NewsSection from '../components/NewsSection'
import PortalCovers from '../components/PortalCovers'
import HowItWorks from '../components/HowItWorks'
import CTASection from '../components/CTASection'
import Footer from '../components/Footer'

function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div id="home">
        <Hero />
      </div>
      <div id="statistics">
        <StatsSection />
      </div>
      <div id="about">
        <PortalCovers />
      </div>
      <UniversitiesByDiscipline />
      <div id="institutions">
        <Institutions />
      </div>
      <div id="updates">
        <NewsSection />
      </div>
      <HowItWorks />
      <CTASection />
      <Footer />
    </div>
  )
}

export default LandingPage
