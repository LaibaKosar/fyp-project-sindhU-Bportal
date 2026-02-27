import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

function Institutions() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  // University data from screenshots
  const universities = [
    {
      name: "Sukkur IBA University",
      image: "/sukkur-iba.jpg.jpg",
      description: "Empowering future leaders through excellence in business, engineering, and technology education."
    },
    {
      name: "Aror University of Art, Architecture & Design",
      image: "/aror-uni.jfif.jfif",
      description: "Preserving heritage while innovating in creative arts and architecture."
    },
    {
      name: "Begum Nusrat Bhutto Women University",
      image: "/bnb-women.jfif.jfif",
      description: "Advancing women education and leadership across Sindh."
    },
    {
      name: "University of Karachi",
      image: "/uok.jfif.jfif",
      description: "The province's flagship center for academic and research excellence."
    },
    {
      name: "NED University of Engineering & Technology",
      image: "/ned.jfif.jfif",
      description: "Building Pakistan's technological future through quality engineering programs."
    },
    {
      name: "Mehran University of Engineering & Technology",
      image: "/mehran uni.webp",
      description: "Driving innovation and industrial collaboration in the heart of Jamshoro."
    },
  ]

  return (
    <section ref={ref} className="relative py-16 px-4 sm:px-6 lg:px-8 bg-slate-900/30">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            Institutions Under <span className="text-emerald-400">Departmental Mandate</span>
          </h2>
          <p className="text-sm text-gray-400 max-w-2xl mx-auto">
            Leading universities contributing to Sindh's higher education excellence
          </p>
        </motion.div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {universities.map((university, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative"
              whileHover={{ scale: 1.05 }}
            >
              {/* Glowing Border Effect */}
              <motion.div
                className="absolute -inset-0.5 bg-gradient-to-r from-emerald-800 to-emerald-600 rounded-2xl opacity-0 group-hover:opacity-70 blur-sm transition-opacity duration-300"
                animate={{
                  boxShadow: [
                    "0 0 0px rgba(22, 101, 52, 0)",
                    "0 0 20px rgba(22, 101, 52, 0.5)",
                    "0 0 0px rgba(22, 101, 52, 0)"
                  ]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Card with 3D light effect */}
              <div 
                className="relative bg-white/5 backdrop-blur-xl rounded-xl overflow-hidden transition-all duration-300 h-full flex flex-col"
                style={{
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  boxShadow: `
                    inset 0 1px 0 0 rgba(16, 185, 129, 0.3),
                    inset -1px 0 0 0 rgba(16, 185, 129, 0.2),
                    0 4px 12px -2px rgba(0, 0, 0, 0.3)
                  `
                }}
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <motion.img
                    src={university.image}
                    alt={university.name}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.4 }}
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>
                </div>
                
                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors duration-300">
                    {university.name}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed flex-1">
                    {university.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Institutions
