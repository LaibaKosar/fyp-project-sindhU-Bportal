import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Building2, BookOpen, Users, GraduationCap, Scale, FileCheck } from 'lucide-react'

function PortalCovers() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const features = [
    {
      icon: Building2,
      title: "University Profiles & Campuses",
      description: "Comprehensive institutional data including campus locations, infrastructure details, and facility information across all universities."
    },
    {
      icon: BookOpen,
      title: "Faculties, Departments & Programs",
      description: "Complete academic structure mapping from faculties down to individual degree programs with enrollment capacity tracking."
    },
    {
      icon: Users,
      title: "Teaching & Non-Teaching Staff",
      description: "Detailed staff directories with qualifications, designations, and employment status for both academic and administrative personnel."
    },
    {
      icon: GraduationCap,
      title: "Student Enrollment & Graduates",
      description: "Year-wise student enrollment statistics, graduation rates, and demographic breakdowns across all programs and institutions."
    },
    {
      icon: Scale,
      title: "Statutory Bodies & Governance",
      description: "Information on university governing bodies, syndicate members, academic councils, and key administrative positions."
    },
    {
      icon: FileCheck,
      title: "Meetings, Submissions & Compliance",
      description: "Track submission deadlines, meeting schedules, compliance status, and official communications between universities and the department."
    },
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
            What the Unified Portal <span className="text-emerald-400">Covers</span>
          </h2>
          <p className="text-sm text-gray-400 max-w-2xl mx-auto">
            A comprehensive information system tracking all critical aspects of higher education management
          </p>
        </motion.div>

        {/* Small Box Grid - E-Parliament Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="group"
              >
                {/* Minimalist Small Box with 3D effect */}
                <div 
                  className="relative bg-white/5 backdrop-blur-xl rounded-lg p-4 transition-all duration-300 hover:bg-white/8"
                  style={{
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    boxShadow: `
                      inset 0 1px 0 0 rgba(16, 185, 129, 0.35),
                      inset -1px 0 0 0 rgba(16, 185, 129, 0.25),
                      0 2px 8px -2px rgba(0, 0, 0, 0.2)
                    `
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon on Left */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg bg-emerald-800/20 border border-emerald-800/40 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-emerald-400" />
                      </div>
                    </div>
                    
                    {/* Text on Right */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white mb-1.5 leading-tight">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
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

export default PortalCovers
