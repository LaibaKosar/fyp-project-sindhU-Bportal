import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Building2, GraduationCap, BookOpen, Users, UserCheck, School } from 'lucide-react'

function StatsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const stats = [
    { icon: Building2, number: "30", label: "Universities under USB", delay: 0 },
    { icon: School, number: "90", label: "Total Campuses", delay: 0.1 },
    { icon: BookOpen, number: "250", label: "Faculties", delay: 0.2 },
    { icon: GraduationCap, number: "2K", label: "Programs", delay: 0.3 },
    { icon: Users, number: "550K", label: "Students Enrolled", delay: 0.4 },
    { icon: UserCheck, number: "18K", label: "Teaching Staff", delay: 0.5 },
  ]

  return (
    <section 
      ref={ref} 
      className="relative py-16 bg-slate-950 min-h-[70vh] flex items-center"
    >
      {/* Patterned Background Container with Fade Mask */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 20px,
              rgba(16, 185, 129, 0.08) 20px,
              rgba(16, 185, 129, 0.08) 40px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 20px,
              rgba(16, 185, 129, 0.08) 20px,
              rgba(16, 185, 129, 0.08) 40px
            )
          `,
          backgroundSize: '40px 40px',
          maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)'
        }}
      ></div>
      
      <div className="relative z-10 w-full max-w-landing mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            Sindh Higher Education at a <span className="text-emerald-400">Glance</span>
          </h2>
          <p className="text-sm text-gray-400 max-w-2xl mx-auto">
            Real time statistics from across Sindh's higher education ecosystem
          </p>
        </motion.div>

        {/* 2-Column Layout: Left (KPIs) + Right (Dashboard) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Column: KPI Cards in 2-column grid */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
                  transition={{ duration: 0.6, delay: stat.delay }}
                  className="group relative"
                >
                  {/* Glowing Border Effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-800 to-emerald-600 rounded-xl opacity-0 group-hover:opacity-60 blur-sm transition-opacity duration-300"></div>
                  
                  {/* Card with 3D light effect */}
                  <div 
                    className="relative bg-white/5 backdrop-blur-xl rounded-xl p-6 transition-all duration-300"
                    style={{
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      boxShadow: `
                        inset 0 1px 0 0 rgba(16, 185, 129, 0.3),
                        inset -1px 0 0 0 rgba(16, 185, 129, 0.2),
                        0 4px 12px -2px rgba(0, 0, 0, 0.3)
                      `
                    }}
                  >
                    {/* Icon */}
                    <div className="mb-4">
                      <div className="w-10 h-10 rounded-lg bg-emerald-800/15 border border-emerald-800/30 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-emerald-800/80" />
                      </div>
                    </div>
                    
                    {/* Number */}
                    <div className="text-6xl font-bold text-emerald-400 mb-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                      {stat.number}
                    </div>
                    
                    {/* Label */}
                    <div className="text-gray-300 text-xs font-medium">
                      {stat.label}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Right Column: Floating Dashboard */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={isInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 30 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative"
          >
            {/* Animated Emerald Glow */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.4, 0.5, 0.4],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 -z-10 rounded-full blur-[100px]"
              style={{
                background: 'radial-gradient(circle, rgba(22, 101, 52, 0.5) 0%, rgba(22, 101, 52, 0.2) 40%, transparent 70%)',
                width: '150%',
                height: '150%',
                top: '-25%',
                left: '-25%',
              }}
            />
            
            {/* Floating Dashboard Container */}
            <div className="relative">
              {/* Main Dashboard Card */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl"
                style={{
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  boxShadow: `
                    inset 0 1px 0 0 rgba(16, 185, 129, 0.3),
                    inset -1px 0 0 0 rgba(16, 185, 129, 0.2),
                    0 20px 40px -10px rgba(0, 0, 0, 0.5),
                    0 0 30px -5px rgba(16, 185, 129, 0.2)
                  `
                }}
              >
                {/* Dashboard Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-800"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-800/50"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-800/30"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Live Indicator Dot */}
                    <div className="relative">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                      <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75"></div>
                    </div>
                    <div className="text-xs text-emerald-400 font-mono font-semibold">SYSTEM ONLINE</div>
                  </div>
                </div>

                {/* Dashboard Grid Preview */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Stat Card 1 */}
                  <div className="bg-slate-900/50 border border-emerald-800/30 rounded-xl p-4">
                    <div className="text-emerald-800 text-2xl font-bold mb-1">30</div>
                    <div className="text-xs text-gray-400">Universities</div>
                  </div>
                  
                  {/* Stat Card 2 */}
                  <div className="bg-slate-900/50 border border-emerald-800/30 rounded-xl p-4">
                    <div className="text-emerald-800 text-2xl font-bold mb-1">90</div>
                    <div className="text-xs text-gray-400">Campuses</div>
                  </div>
                  
                  {/* Stat Card 3 */}
                  <div className="bg-slate-900/50 border border-emerald-800/30 rounded-xl p-4">
                    <div className="text-emerald-800 text-2xl font-bold mb-1">550K</div>
                    <div className="text-xs text-gray-400">Students</div>
                  </div>
                  
                  {/* Stat Card 4 */}
                  <div className="bg-slate-900/50 border border-emerald-800/30 rounded-xl p-4">
                    <div className="text-emerald-800 text-2xl font-bold mb-1">18K</div>
                    <div className="text-xs text-gray-400">Staff</div>
                  </div>
                </div>

                {/* Chart Preview */}
                <div className="mt-6 bg-slate-900/50 border border-emerald-800/30 rounded-xl p-4 h-32 flex items-end gap-2">
                  {[40, 60, 45, 70, 55, 80, 65].map((height, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 1, delay: 1 + i * 0.1 }}
                      className="flex-1 bg-emerald-800 rounded-t"
                    />
                  ))}
                </div>
              </motion.div>

              {/* Floating Decorative Elements */}
              <motion.div
                animate={{
                  y: [0, 15, 0],
                  rotate: [0, 5, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
                className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-800/20 backdrop-blur-xl border border-emerald-800/40 rounded-2xl rotate-12"
              />
              <motion.div
                animate={{
                  y: [0, -15, 0],
                  rotate: [0, -5, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
                className="absolute -bottom-6 -left-6 w-20 h-20 bg-emerald-800/15 backdrop-blur-xl border border-emerald-800/30 rounded-xl -rotate-12"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default StatsSection
