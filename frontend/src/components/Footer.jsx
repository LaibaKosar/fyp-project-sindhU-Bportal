import { MapPin, Phone, Mail } from 'lucide-react'

function Footer() {
  return (
    <footer className="relative bg-slate-900 border-t border-emerald-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Column 1: Logo + About */}
          <div className="space-y-4">
            {/* Logo */}
            <div className="mb-6">
              <img 
                src="/sindh-logo.jpg.jpg" 
                alt="Sindh Govt Logo" 
                className="h-12 w-auto opacity-80"
              />
            </div>
            
            {/* About Section */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">About This Portal</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-3">
                The Sindh Universities & Boards Department Information Portal serves as a comprehensive digital gateway for monitoring and managing higher education institutions across Sindh. This initiative supports transparent governance, data-driven policy making, and enhanced accountability in the education sector.
              </p>
              <p className="text-gray-400 text-sm leading-relaxed">
                By consolidating institutional data and performance metrics into a unified platform, we empower stakeholders with real-time insights and facilitate informed decision-making for the advancement of higher education in the province.
              </p>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="pt-20">
            <h3 className="text-white font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <a 
                  href="#home" 
                  className="text-gray-400 hover:text-emerald-400 transition-colors duration-200 text-sm"
                >
                  Home
                </a>
              </li>
              <li>
                <a 
                  href="#about" 
                  className="text-gray-400 hover:text-emerald-400 transition-colors duration-200 text-sm"
                >
                  About
                </a>
              </li>
              <li>
                <a 
                  href="#institutions" 
                  className="text-gray-400 hover:text-emerald-400 transition-colors duration-200 text-sm"
                >
                  Institutions
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact Information */}
          <div className="pt-20">
            <h3 className="text-white font-bold text-lg mb-4">Contact Information</h3>
            <div className="space-y-4">
              {/* Department Name */}
              <div className="flex items-start gap-3">
                <div className="text-gray-400 text-sm font-medium">
                  Universities & Boards Department
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-gray-400 text-sm leading-relaxed">
                  <div>7th Floor, Pakistan Re-Insurance Company Ltd. (PRC) Towers,</div>
                  <div>Near PNSC Building, 32-A Street No. 1,</div>
                  <div>Moulvi Tamizuddin Khan Rd, Lalazar, Karachi</div>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <a 
                  href="tel:+9221XXXX-XXXX" 
                  className="text-gray-400 hover:text-emerald-400 transition-colors duration-200 text-sm"
                >
                  +92 (21) XXXX-XXXX
                </a>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <a 
                  href="mailto:info@unb.sindh.gov.pk" 
                  className="text-gray-400 hover:text-emerald-400 transition-colors duration-200 text-sm"
                >
                  info@unb.sindh.gov.pk
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="border-t border-emerald-800/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-gray-500 text-xs text-center">
            © 2026 Universities & Boards Department, Government of Sindh. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
