import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Calendar, ArrowRight } from 'lucide-react'

function NewsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const featuredNews = {
    title: "Sukkur IBA Announces Spring 2026 Admissions",
    category: "Admissions",
    date: "Jan 28, 2026",
    readTime: "3 min read",
    description: "Sukkur IBA University opens admissions for Spring 2026 semester across all undergraduate and graduate programs. Application deadline extended to February 15, 2026.",
    author: "By Admissions Office"
  }

  const latestNews = [
    {
      title: "Departmental Circular: New Data Upload Guidelines",
      category: "Policy",
      date: "Jan 25, 2026",
      readTime: "5 min read"
    },
    {
      title: "NED University Research Grant Awards",
      category: "Research",
      date: "Jan 24, 2026",
      readTime: "4 min read"
    },
    {
      title: "University of Karachi Faculty Recruitment Drive",
      category: "Academic",
      date: "Jan 22, 2026",
      readTime: "3 min read"
    },
    {
      title: "Mehran University Industry Partnership Program",
      category: "Partnership",
      date: "Jan 20, 2026",
      readTime: "4 min read"
    }
  ]

  return (
    <section ref={ref} className="relative py-16 px-4 sm:px-6 lg:px-8 bg-slate-950">
      {/* Geometric grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            News & <span className="text-emerald-400">Updates</span>
          </h2>
          <p className="text-sm text-gray-400 max-w-2xl mx-auto">
            Stay updated with the latest developments in Sindh's higher education sector
          </p>
        </motion.div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Featured News */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="group"
          >
            <div 
              className="relative bg-white/5 backdrop-blur-xl rounded-2xl p-6 md:p-8 h-full transition-all duration-300 hover:bg-white/8 overflow-hidden"
              style={{
                border: '1px solid rgba(16, 185, 129, 0.2)',
                boxShadow: `
                  inset 0 1px 0 0 rgba(16, 185, 129, 0.3),
                  inset -1px 0 0 0 rgba(16, 185, 129, 0.2),
                  0 4px 12px -2px rgba(0, 0, 0, 0.3),
                  0 0 30px -5px rgba(16, 185, 129, 0.2)
                `
              }}
            >
              {/* Background Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-85"
                style={{
                  backgroundImage: 'url(/sukkur-iba.jpg.jpg)'
                }}
              ></div>
              
              {/* Dark Gradient Overlay - Stronger for text clarity */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950/98 via-slate-950/90 to-slate-950/98"></div>
              
              {/* Content - Relative z-index */}
              <div className="relative z-10">
              {/* Featured Badge */}
              <div className="inline-flex items-center gap-2 bg-emerald-800/20 border border-emerald-800/40 rounded-full px-3 py-1 mb-4 backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-emerald-400 text-xs font-semibold">Featured</span>
              </div>

              {/* Category Badge */}
              <div className="inline-flex items-center gap-2 bg-emerald-800/20 border border-emerald-800/40 rounded-full px-3 py-1 mb-4 ml-2 backdrop-blur-sm">
                <span className="text-emerald-400 text-xs font-semibold">{featuredNews.category}</span>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-white mb-4 leading-tight">
                {featuredNews.title}
              </h3>

              {/* Meta Info */}
              <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{featuredNews.date}</span>
                </div>
                <span>•</span>
                <span>{featuredNews.readTime}</span>
              </div>

              {/* Description */}
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                {featuredNews.description}
              </p>

              {/* Author */}
              <p className="text-gray-400 text-xs mb-6">
                {featuredNews.author}
              </p>

              {/* Read More */}
              <button className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-semibold transition-colors duration-200">
                Read More
                <ArrowRight className="w-4 h-4" />
              </button>
              </div>
            </div>
          </motion.div>

          {/* Right: Latest Announcements List */}
          <div className="space-y-4">
            {latestNews.map((news, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 30 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                className="group"
              >
                <div 
                  className="relative bg-white/5 backdrop-blur-xl rounded-xl p-5 transition-all duration-300 hover:bg-white/8 cursor-pointer"
                  style={{
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    boxShadow: `
                      inset 0 1px 0 0 rgba(16, 185, 129, 0.25),
                      inset -1px 0 0 0 rgba(16, 185, 129, 0.15),
                      0 2px 8px -2px rgba(0, 0, 0, 0.2),
                      0 0 20px -5px rgba(16, 185, 129, 0.15)
                    `
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(16, 185, 129, 0.4)'
                    e.currentTarget.style.boxShadow = `
                      inset 0 1px 0 0 rgba(16, 185, 129, 0.5),
                      inset -1px 0 0 0 rgba(16, 185, 129, 0.4),
                      0 4px 12px -2px rgba(16, 185, 129, 0.2)
                    `
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(16, 185, 129, 0.2)'
                    e.currentTarget.style.boxShadow = `
                      inset 0 1px 0 0 rgba(16, 185, 129, 0.25),
                      inset -1px 0 0 0 rgba(16, 185, 129, 0.15),
                      0 2px 8px -2px rgba(0, 0, 0, 0.2)
                    `
                  }}
                >
                  {/* Category Badge */}
                  <div className="inline-flex items-center gap-2 bg-emerald-800/20 border border-emerald-800/40 rounded-full px-2.5 py-0.5 mb-3 backdrop-blur-sm">
                    <span className="text-emerald-400 text-xs font-semibold">{news.category}</span>
                  </div>

                  {/* Title */}
                  <h4 className="text-base font-semibold text-white mb-3 leading-tight group-hover:text-emerald-400 transition-colors duration-200">
                    {news.title}
                  </h4>

                  {/* Meta Info */}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{news.date}</span>
                    </div>
                    <span>•</span>
                    <span>{news.readTime}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default NewsSection
