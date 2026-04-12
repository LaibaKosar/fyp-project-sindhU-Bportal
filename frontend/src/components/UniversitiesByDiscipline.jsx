import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Stethoscope, Cpu, Building2, Palette, Wheat, GraduationCap, Scale, BookOpen } from 'lucide-react'

function UniversitiesByDiscipline() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const disciplines = [
    { icon: Stethoscope, name: "Medical Universities", count: 4, color: "from-red-500/20 to-red-600/20", glowColor: "rgba(239, 68, 68, 0.3)" },
    { icon: Cpu, name: "Engineering & Technology", count: 6, color: "from-blue-500/20 to-blue-600/20", glowColor: "rgba(59, 130, 246, 0.3)" },
    { icon: Building2, name: "Business / Management", count: 3, color: "from-purple-500/20 to-purple-600/20", glowColor: "rgba(168, 85, 247, 0.3)" },
    { icon: Wheat, name: "Agriculture / Veterinary", count: 3, color: "from-green-500/20 to-green-600/20", glowColor: "rgba(34, 197, 94, 0.3)" },
    { icon: GraduationCap, name: "General / Multidisciplinary", count: 8, color: "from-emerald-500/20 to-emerald-600/20", glowColor: "rgba(16, 185, 129, 0.3)" },
    { icon: BookOpen, name: "Education Universities", count: 2, color: "from-orange-500/20 to-orange-600/20", glowColor: "rgba(249, 115, 22, 0.3)" },
    { icon: Palette, name: "Arts & Design", count: 2, color: "from-pink-500/20 to-pink-600/20", glowColor: "rgba(236, 72, 153, 0.3)" },
    { icon: Scale, name: "Law / Islamic Studies", count: 2, color: "from-indigo-500/20 to-indigo-600/20", glowColor: "rgba(99, 102, 241, 0.3)" },
  ]

  return (
    <section ref={ref} className="relative py-16 bg-slate-950">
      <div className="w-full max-w-landing mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            Universities by <span className="text-emerald-400">Discipline</span>
          </h2>
          <p className="text-sm text-gray-400 max-w-2xl mx-auto">
            Specialized institutions serving diverse educational needs across Sindh
          </p>
        </motion.div>

        {/* 4-Column Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-5">
          {disciplines.map((discipline, index) => {
            const Icon = discipline.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.9 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="group relative"
                whileHover={{ y: -8 }}
              >
                {/* Card with 3D light effect */}
                <div 
                  className="relative bg-white/10 backdrop-blur-xl rounded-xl p-4 transition-all duration-300 h-full flex flex-col items-center text-center"
                  style={{
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    boxShadow: `
                      inset 0 1px 0 0 rgba(16, 185, 129, 0.4),
                      inset -1px 0 0 0 rgba(16, 185, 129, 0.3),
                      0 4px 12px -2px rgba(0, 0, 0, 0.3)
                    `
                  }}
                >
                  {/* Icon with Glow */}
                  <div className="relative mb-3">
                    {/* Subtle Glow Behind Icon */}
                    <div 
                      className="absolute inset-0 rounded-lg blur-md opacity-50"
                      style={{ backgroundColor: discipline.glowColor }}
                    />
                    <div className={`relative w-14 h-14 rounded-lg bg-gradient-to-br ${discipline.color} border border-emerald-500/30 flex items-center justify-center`}>
                      <Icon className="w-7 h-7 text-emerald-400" />
                    </div>
                  </div>
                  
                  {/* Count - Vibrant and Large */}
                  <div className="text-5xl font-extrabold text-emerald-400 mb-2">
                    {discipline.count}
                  </div>
                  
                  {/* Label - Crisp and Visible */}
                  <div className="text-white text-sm font-semibold leading-tight">
                    {discipline.name}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default UniversitiesByDiscipline
