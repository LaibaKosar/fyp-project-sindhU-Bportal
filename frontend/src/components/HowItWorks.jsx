import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { UserCheck, Database, CheckCircle2 } from 'lucide-react'

function HowItWorks() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const steps = [
    {
      number: 1,
      icon: UserCheck,
      title: "Universities add verified data through focal persons",
      description: "Each university has designated focal persons who securely input and update institutional data, ensuring accuracy and authenticity at the source.",
      side: "left"
    },
    {
      number: 2,
      icon: Database,
      title: "System validates & organizes into unified dashboards",
      description: "The portal automatically validates incoming data, organizes it into structured formats, and presents comprehensive analytics through intuitive dashboards.",
      side: "right"
    },
    {
      number: 3,
      icon: CheckCircle2,
      title: "U&B Department reviews compliance & makes decisions",
      description: "Department officials access real-time insights, track compliance, and make informed policy decisions based on comprehensive institutional data.",
      side: "left"
    },
  ]

  return (
    <section ref={ref} className="relative py-16 bg-slate-900/30">
      <div className="w-full max-w-landing mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            How the Portal <span className="text-emerald-400">Works</span>
          </h2>
          <p className="text-sm text-gray-400 max-w-2xl mx-auto">
            A streamlined three step process for transparent and efficient data management
          </p>
        </motion.div>

        {/* Timeline Container */}
        <div className="relative max-w-7xl mx-auto">
          
          {/* Vertical Center Line */}
          <div 
            className="absolute left-1/2 transform -translate-x-1/2 w-0.5 bg-emerald-800/30 hidden md:block" 
            style={{ top: '0', bottom: '0' }}
          ></div>

          {/* Steps */}
          <div className="space-y-12 md:space-y-0">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isLeft = step.side === "left"
              
              return (
                <div key={index} className="relative mb-12 md:mb-24">
                  {/* The Row Container */}
                  <div className={`flex flex-col md:grid md:grid-cols-2 items-center w-full`}>
                    
                    {/* Content Box */}
                    <motion.div 
                      initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: isLeft ? -50 : 50 }}
                      transition={{ duration: 0.8, delay: index * 0.2 }}
                      className={`w-full ${isLeft ? "md:text-right md:pr-20" : "md:col-start-2 md:pl-20"}`}
                    >
                      <div 
                        className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 md:p-8 transition-all duration-500"
                        style={{
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          boxShadow: `
                            inset 0 1px 0 0 rgba(16, 185, 129, 0.3),
                            inset -1px 0 0 0 rgba(16, 185, 129, 0.2),
                            0 4px 12px -2px rgba(0, 0, 0, 0.3)
                          `
                        }}
                      >
                        <h3 className="text-xl font-bold text-white mb-3">
                          {step.title}
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </motion.div>

                    {/* Centered Icon Anchor */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center hidden md:flex">
                      <div className="relative">
                        {/* Background Glow */}
                        <motion.div
                          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute inset-0 rounded-full bg-emerald-800/40 blur-xl"
                        />
                        {/* Main Circle */}
                        <div className="relative w-16 h-16 rounded-full bg-slate-950 border-2 border-emerald-800/60 flex items-center justify-center z-20 backdrop-blur-2xl">
                          <Icon className="w-7 h-7 text-emerald-400" />
                          {/* Number Badge */}
                          <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-emerald-800 border border-emerald-500 flex items-center justify-center shadow-lg z-30">
                            <span className="text-white font-bold text-xs">{step.number}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile-Only Icon (for small screens) */}
                    <div className="md:hidden flex justify-center mt-6 order-first">
                        <div className="w-16 h-16 rounded-full bg-emerald-800/20 border border-emerald-800/50 flex items-center justify-center">
                            <Icon className="w-8 h-8 text-emerald-400" />
                        </div>
                    </div>

                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks