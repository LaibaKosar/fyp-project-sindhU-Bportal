import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

function Hero() {
  const [hoveredNode, setHoveredNode] = useState(null)

  // Multi-Layer Network
  // Layer 1 (Inner Core): 4 nodes at 380px radius - primary universities
  const innerUniversities = [
    { name: "Sukkur IBA", image: "/sukkur-iba.jpg.jpg", angle: 0, distance: 380 },
    { name: "NED University", image: "/ned.jfif.jfif", angle: 90, distance: 380 },
    { name: "Mehran Uni", image: "/mehran uni.webp", angle: 180, distance: 380 },
    { name: "UoK", image: "/uok.jfif.jfif", angle: 270, distance: 380 }
  ]
  
  // Layer 2 (Outer Reach): 4 nodes at 620px radius - positioned between inner nodes
  const outerUniversities = [
    { name: "Aror University", image: "/aror-uni.jfif.jfif", angle: 45, distance: 620 },
    { name: "BNB Women", image: "/bnb-women.jfif.jfif", angle: 135, distance: 620 },
    { name: "Shah Abdul Latif", image: "https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=400&fit=crop", angle: 225, distance: 620 },
    { name: "Dow University", image: "/uok.jfif.jfif", angle: 315, distance: 620 }
  ]
  
  // Layer 3 (Extended): 2 nodes at 780px radius - far corners (Sindh IBA removed)
  const extendedUniversities = [
    { name: "LUMHS", image: "/uok.jfif.jfif", angle: 157.5, distance: 780 },
    { name: "SZABIST", image: "/ned.jfif.jfif", angle: 337.5, distance: 780 }
  ]
  
  // Central hub position (re-centered vertically for balanced expansion)
  const hubX = 600
  const hubY = 280
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center pt-8 pb-16">
      {/* Background - Subtle contrast */}
      <div className="absolute inset-0 bg-slate-950"></div>
      
      {/* Enhanced geometric grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}></div>
      </div>
      
      {/* Diagonal pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 10px,
          rgba(16, 185, 129, 0.1) 10px,
          rgba(16, 185, 129, 0.1) 20px
        )`
      }}></div>

      <div className="relative z-10 w-full max-w-landing mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-4 pb-16">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-12 items-center min-h-[60vh]">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-6 max-w-2xl"
          >
            {/* Version Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-emerald-800/20 border border-emerald-800/40 rounded-full px-4 py-1.5 backdrop-blur-sm"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-emerald-400 text-xs font-semibold">V1.0 - FYP Live Preview</span>
            </motion.div>
            
            {/* Main Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              <span className="text-white">Every University.</span>
              <br />
              <span className="text-white">Every Metric.</span>
              <br />
              <span className="text-emerald-400">Now At Your Fingertips.</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-base sm:text-lg text-gray-400 leading-relaxed"
            >
              Welcome to the official Unified Information Portal of the Universities & Boards Department, Government of Sindh. This digital platform brings together institutional data, performance metrics, and governance insights from universities across the province.
            </motion.p>

            {/* Features List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="space-y-4"
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                <ul className="space-y-4">
                  {[
                    { text: "Centralized access to university statistics", link: null },
                    { text: "Real-time monitoring of academic metrics", link: null },
                    { text: "Secure departmental login for authorized personnel", link: "/login" }
                  ].map((feature, index) => {
                    const content = (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                        className={`flex items-center gap-3 text-gray-200 ${feature.link ? 'cursor-pointer group' : ''}`}
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-800/20 border border-emerald-800/50 flex items-center justify-center group-hover:bg-emerald-800/30 transition-colors">
                          <Check className="w-4 h-4 text-emerald-800" strokeWidth={3} />
                        </div>
                        <span className={`text-base sm:text-lg ${feature.link ? 'group-hover:text-emerald-400 transition-colors' : ''}`}>{feature.text}</span>
                      </motion.li>
                    )
                    
                    return feature.link ? (
                      <Link key={index} to={feature.link}>
                        {content}
                      </Link>
                    ) : content
                  })}
                </ul>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Side - Interactive Map Network */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative lg:block hidden h-[700px]"
            style={{ overflow: 'visible' }}
          >
            {/* Subtle Pakistan Map Background */}
            <div className="absolute inset-0 opacity-20 flex items-center justify-center">
              <div 
                className="w-full h-full"
                style={{
                  backgroundImage: 'linear-gradient(to bottom, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.08))',
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                {/* Clean Pakistan map outline - using inline SVG for professional appearance */}
                <svg 
                  className="w-full h-full opacity-30"
                  viewBox="0 0 400 600"
                  preserveAspectRatio="xMidYMid meet"
                  style={{ mixBlendMode: 'multiply' }}
                >
                  <path
                    d="M 80 120 Q 100 80 130 100 T 230 90 T 300 110 Q 320 130 300 180 Q 280 230 260 280 Q 240 330 220 380 Q 200 430 180 480 Q 160 530 130 530 Q 100 530 80 480 Q 70 430 80 380 Q 90 330 80 280 Q 70 230 80 180 Z"
                    fill="rgba(16, 185, 129, 0.2)"
                    stroke="rgba(16, 185, 129, 0.15)"
                    strokeWidth="1"
                  />
                </svg>
              </div>
            </div>

            {/* SVG Container for Network Lines - Wide aspect ratio for expansive feel */}
            <svg 
              className="absolute inset-0 w-full h-full" 
              viewBox="-350 -350 1900 1300"
              preserveAspectRatio="xMidYMid meet"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <filter id="lineGlow">
                  <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Central Hub - Sindh Logo at exact center */}
              <g>
                {/* Triple-ring pulse animation (radar effect) */}
                {[0, 1, 2].map((ring) => (
                  <motion.circle
                    key={ring}
                    cx={hubX}
                    cy={hubY}
                    r="80"
                    fill="none"
                    stroke="rgba(16, 185, 129, 0.6)"
                    strokeWidth="2"
                    initial={{ r: 80, opacity: 0.8 }}
                    animate={{
                      r: [80, 200, 200],
                      opacity: [0.8, 0.25, 0]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: ring * 1,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* Hub container with Sindh logo */}
                <foreignObject x={hubX - 80} y={hubY - 80} width="160" height="160">
                  <motion.div
                    className="relative rounded-full bg-white/10 backdrop-blur-xl border-2 border-emerald-500 flex items-center justify-center"
                    style={{
                      width: '160px',
                      height: '160px',
                      boxShadow: '0 0 60px rgba(16, 185, 129, 0.8), inset 0 0 30px rgba(16, 185, 129, 0.2)',
                      filter: 'drop-shadow(0 0 25px rgba(16, 185, 129, 0.6))'
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  >
                    <img 
                      src="/sindh-logo.jpg.jpg" 
                      alt="Sindh Hub" 
                      className="w-24 h-24 object-contain rounded-full"
                    />
                  </motion.div>
                </foreignObject>
              </g>

              {/* Concentric Two-Layer Network with Staggered Entry */}
              <motion.g
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.15
                    }
                  }
                }}
              >
                {/* Layer 1: Inner Core (380px radius) - Primary universities */}
                {innerUniversities.map((uni, index) => {
                  const radian = (uni.angle * Math.PI) / 180
                  const nodeX = hubX + Math.cos(radian) * uni.distance
                  const nodeY = hubY + Math.sin(radian) * uni.distance
                  
                  // Cubic bezier control points for smooth, sweeping arcs
                  const controlX1 = hubX + Math.cos(radian) * (uni.distance * 0.25) + Math.sin(radian) * 20
                  const controlY1 = hubY + Math.sin(radian) * (uni.distance * 0.25) - Math.cos(radian) * 20
                  const controlX2 = hubX + Math.cos(radian) * (uni.distance * 0.75) + Math.sin(radian) * 20
                  const controlY2 = hubY + Math.sin(radian) * (uni.distance * 0.75) - Math.cos(radian) * 20

                  return (
                    <g key={`inner-${index}`}>
                      {/* Base path - shorter, more direct */}
                      <motion.path
                        d={`M ${hubX} ${hubY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${nodeX} ${nodeY}`}
                        fill="none"
                        stroke={hoveredNode === `inner-${index}` ? "rgba(16, 185, 129, 0.5)" : "rgba(16, 185, 129, 0.35)"}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        variants={{
                          hidden: { pathLength: 0, opacity: 0 },
                          visible: { 
                            pathLength: 1, 
                            opacity: 1,
                            transition: { duration: 1.2, ease: "easeOut" }
                          }
                        }}
                      />
                      {/* Pulsing data stream */}
                      <motion.path
                        d={`M ${hubX} ${hubY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${nodeX} ${nodeY}`}
                        fill="none"
                        stroke="rgba(16, 185, 129, 0.65)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeDasharray="6 14"
                        variants={{
                          hidden: { pathLength: 0, opacity: 0 },
                          visible: { 
                            pathLength: 1,
                            opacity: [0.2, 0.8, 0.2],
                            strokeDashoffset: [0, -20],
                            transition: { 
                              pathLength: { duration: 1.2 },
                              opacity: { duration: 3, repeat: Infinity, delay: 1.5, ease: "linear" },
                              strokeDashoffset: { duration: 3, repeat: Infinity, delay: 1.5, ease: "linear" }
                            }
                          }
                        }}
                      />
                      {/* Traveling light particle */}
                      <motion.circle
                        r="3.5"
                        fill="rgba(16, 185, 129, 1)"
                        filter="url(#lineGlow)"
                        cx={hubX || 600}
                        cy={hubY || 280}
                        variants={{
                          hidden: { opacity: 0 },
                          visible: { 
                            opacity: [0, 1, 1, 0],
                            cx: [hubX || 600, controlX1 || hubX || 600, controlX2 || hubX || 600, nodeX || hubX || 600],
                            cy: [hubY || 280, controlY1 || hubY || 280, controlY2 || hubY || 280, nodeY || hubY || 280],
                            transition: { 
                              duration: 3,
                              repeat: Infinity,
                              delay: 1.5,
                              ease: "linear"
                            }
                          }
                        }}
                        style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 1))' }}
                      />
                      {/* University Node - Larger foreignObject to prevent clipping */}
                      <foreignObject 
                        x={nodeX - 225} 
                        y={nodeY - 225} 
                        width="450" 
                        height="450"
                        onMouseEnter={() => setHoveredNode(`inner-${index}`)}
                        onMouseLeave={() => setHoveredNode(null)}
                      >
                        <motion.div
                          className="group cursor-pointer flex flex-col items-center justify-center"
                          style={{ background: 'transparent', width: '450px', height: '450px', overflow: 'visible' }}
                          variants={{
                            hidden: { opacity: 0, scale: 0 },
                            visible: { 
                              opacity: 1, 
                              scale: 1,
                              transition: { duration: 0.6, ease: "easeOut" }
                            }
                          }}
                          whileHover={{ scale: 1.15 }}
                        >
                          <div className="relative rounded-full bg-white/10 backdrop-blur-md border-2 border-emerald-500 overflow-hidden transition-all duration-300 group-hover:border-emerald-400"
                            style={{
                              width: '220px',
                              height: '220px',
                              borderRadius: '9999px',
                              boxShadow: '0 0 40px rgba(16, 185, 129, 0.7)'
                            }}
                          >
                            <img 
                              src={uni.image} 
                              alt={uni.name} 
                              style={{ 
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '9999px',
                                imageRendering: 'high-quality'
                              }}
                            />
                          </div>
                          <div className="mt-[12px] relative z-20">
                            <div className="bg-black/90 backdrop-blur-xl border border-emerald-500/40 rounded-full px-5 py-2 shadow-lg">
                              <span className="text-base font-bold text-white" style={{ whiteSpace: 'nowrap' }}>{uni.name}</span>
                            </div>
                          </div>
                        </motion.div>
                      </foreignObject>
                    </g>
                  )
                })}
                
                {/* Layer 2: Outer Reach (620px radius) - Longer lines with smooth sweeping arcs */}
                {outerUniversities.map((uni, index) => {
                  const radian = (uni.angle * Math.PI) / 180
                  const nodeX = hubX + Math.cos(radian) * uni.distance
                  const nodeY = hubY + Math.sin(radian) * uni.distance
                  
                  // Smooth, elegant curves for outer layer
                  const controlX1 = hubX + Math.cos(radian) * (uni.distance * 0.25) + Math.sin(radian) * 35
                  const controlY1 = hubY + Math.sin(radian) * (uni.distance * 0.25) - Math.cos(radian) * 35
                  const controlX2 = hubX + Math.cos(radian) * (uni.distance * 0.75) + Math.sin(radian) * 35
                  const controlY2 = hubY + Math.sin(radian) * (uni.distance * 0.75) - Math.cos(radian) * 35

                  return (
                    <g key={`outer-${index}`}>
                      {/* Base path - thinner to emphasize distance */}
                      <motion.path
                        d={`M ${hubX} ${hubY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${nodeX} ${nodeY}`}
                        fill="none"
                        stroke={hoveredNode === `outer-${index}` ? "rgba(16, 185, 129, 0.5)" : "rgba(16, 185, 129, 0.35)"}
                        strokeWidth="1"
                        strokeLinecap="round"
                        variants={{
                          hidden: { pathLength: 0, opacity: 0 },
                          visible: { 
                            pathLength: 1, 
                            opacity: 1,
                            transition: { duration: 1.4, ease: "easeOut" }
                          }
                        }}
                      />
                      {/* Pulsing data stream */}
                      <motion.path
                        d={`M ${hubX} ${hubY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${nodeX} ${nodeY}`}
                        fill="none"
                        stroke="rgba(16, 185, 129, 0.6)"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeDasharray="6 14"
                        variants={{
                          hidden: { pathLength: 0, opacity: 0 },
                          visible: { 
                            pathLength: 1,
                            opacity: [0.2, 0.7, 0.2],
                            strokeDashoffset: [0, -20],
                            transition: { 
                              pathLength: { duration: 1.4 },
                              opacity: { duration: 3, repeat: Infinity, delay: 2, ease: "linear" },
                              strokeDashoffset: { duration: 3, repeat: Infinity, delay: 2, ease: "linear" }
                            }
                          }
                        }}
                      />
                      {/* Traveling light particle */}
                      <motion.circle
                        r="3"
                        fill="rgba(16, 185, 129, 1)"
                        filter="url(#lineGlow)"
                        cx={hubX || 600}
                        cy={hubY || 280}
                        variants={{
                          hidden: { opacity: 0 },
                          visible: { 
                            opacity: [0, 1, 1, 0],
                            cx: [hubX || 600, controlX1 || hubX || 600, controlX2 || hubX || 600, nodeX || hubX || 600],
                            cy: [hubY || 280, controlY1 || hubY || 280, controlY2 || hubY || 280, nodeY || hubY || 280],
                            transition: { 
                              duration: 3,
                              repeat: Infinity,
                              delay: 2,
                              ease: "linear"
                            }
                          }
                        }}
                        style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 1))' }}
                      />
                      {/* University Node - Larger foreignObject to prevent clipping */}
                      <foreignObject 
                        x={nodeX - 225} 
                        y={nodeY - 225} 
                        width="450" 
                        height="450"
                        onMouseEnter={() => setHoveredNode(`outer-${index}`)}
                        onMouseLeave={() => setHoveredNode(null)}
                      >
                        <motion.div
                          className="group cursor-pointer flex flex-col items-center justify-center"
                          style={{ background: 'transparent', width: '450px', height: '450px', overflow: 'visible' }}
                          variants={{
                            hidden: { opacity: 0, scale: 0 },
                            visible: { 
                              opacity: 1, 
                              scale: 1,
                              transition: { duration: 0.6, delay: 0.2, ease: "easeOut" }
                            }
                          }}
                          whileHover={{ scale: 1.15 }}
                        >
                          <div className="relative rounded-full bg-white/10 backdrop-blur-md border-2 border-emerald-500 overflow-hidden transition-all duration-300 group-hover:border-emerald-400"
                            style={{
                              width: '220px',
                              height: '220px',
                              borderRadius: '9999px',
                              boxShadow: '0 0 40px rgba(16, 185, 129, 0.7)'
                            }}
                          >
                            <img 
                              src={uni.image} 
                              alt={uni.name} 
                              style={{ 
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '9999px',
                                imageRendering: 'high-quality'
                              }}
                            />
                          </div>
                          <div className="mt-[12px] relative z-20">
                            <div className="bg-black/90 backdrop-blur-xl border border-emerald-500/40 rounded-full px-5 py-2 shadow-lg">
                              <span className="text-base font-bold text-white" style={{ whiteSpace: 'nowrap' }}>{uni.name}</span>
                            </div>
                          </div>
                        </motion.div>
                      </foreignObject>
                    </g>
                  )
                })}
                
                {/* Layer 3: Extended Reach (780px radius) - Far corners with elegant sweeping arcs */}
                {extendedUniversities.map((uni, index) => {
                  const radian = (uni.angle * Math.PI) / 180
                  const nodeX = hubX + Math.cos(radian) * uni.distance
                  const nodeY = hubY + Math.sin(radian) * uni.distance
                  
                  // Smooth, sweeping curves for extended layer
                  const controlX1 = hubX + Math.cos(radian) * (uni.distance * 0.25) + Math.sin(radian) * 50
                  const controlY1 = hubY + Math.sin(radian) * (uni.distance * 0.25) - Math.cos(radian) * 50
                  const controlX2 = hubX + Math.cos(radian) * (uni.distance * 0.75) + Math.sin(radian) * 50
                  const controlY2 = hubY + Math.sin(radian) * (uni.distance * 0.75) - Math.cos(radian) * 50

                  return (
                    <g key={`extended-${index}`}>
                      {/* Base path - thinnest for extended distance */}
                      <motion.path
                        d={`M ${hubX} ${hubY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${nodeX} ${nodeY}`}
                        fill="none"
                        stroke={hoveredNode === `extended-${index}` ? "rgba(16, 185, 129, 0.45)" : "rgba(16, 185, 129, 0.3)"}
                        strokeWidth="1"
                        strokeLinecap="round"
                        variants={{
                          hidden: { pathLength: 0, opacity: 0 },
                          visible: { 
                            pathLength: 1, 
                            opacity: 1,
                            transition: { duration: 1.6, delay: 0.3, ease: "easeOut" }
                          }
                        }}
                      />
                      {/* Pulsing data stream */}
                      <motion.path
                        d={`M ${hubX} ${hubY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${nodeX} ${nodeY}`}
                        fill="none"
                        stroke="rgba(16, 185, 129, 0.55)"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeDasharray="6 14"
                        variants={{
                          hidden: { pathLength: 0, opacity: 0 },
                          visible: { 
                            pathLength: 1,
                            opacity: [0.15, 0.6, 0.15],
                            strokeDashoffset: [0, -20],
                            transition: { 
                              pathLength: { duration: 1.6, delay: 0.3 },
                              opacity: { duration: 3, repeat: Infinity, delay: 2.2, ease: "linear" },
                              strokeDashoffset: { duration: 3, repeat: Infinity, delay: 2.2, ease: "linear" }
                            }
                          }
                        }}
                      />
                      {/* Traveling light particle */}
                      <motion.circle
                        r="3"
                        fill="rgba(16, 185, 129, 1)"
                        filter="url(#lineGlow)"
                        variants={{
                          hidden: { opacity: 0 },
                          visible: { 
                            opacity: [0, 1, 1, 0],
                            cx: [hubX, controlX1, controlX2, nodeX],
                            cy: [hubY, controlY1, controlY2, nodeY],
                            transition: { 
                              duration: 3,
                              repeat: Infinity,
                              delay: 2.2,
                              ease: "linear"
                            }
                          }
                        }}
                        style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 1))' }}
                      />
                      {/* University Node - Larger foreignObject to prevent clipping */}
                      <foreignObject 
                        x={nodeX - 225} 
                        y={nodeY - 225} 
                        width="450" 
                        height="450"
                        onMouseEnter={() => setHoveredNode(`extended-${index}`)}
                        onMouseLeave={() => setHoveredNode(null)}
                      >
                        <motion.div
                          className="group cursor-pointer flex flex-col items-center justify-center"
                          style={{ 
                            background: 'transparent', 
                            width: '450px', 
                            height: '450px', 
                            overflow: 'visible',
                            position: 'relative'
                          }}
                          variants={{
                            hidden: { opacity: 0, scale: 0 },
                            visible: { 
                              opacity: 1, 
                              scale: 1,
                              transition: { duration: 0.6, delay: 0.4, ease: "easeOut" }
                            }
                          }}
                          whileHover={{ scale: 1.15 }}
                        >
                          <div className="relative rounded-full bg-white/10 backdrop-blur-md border-2 border-emerald-500 transition-all duration-300 group-hover:border-emerald-400"
                            style={{
                              width: '220px',
                              height: '220px',
                              borderRadius: '9999px',
                              boxShadow: '0 0 40px rgba(16, 185, 129, 0.7)',
                              overflow: 'hidden'
                            }}
                          >
                            <img 
                              src={uni.image} 
                              alt={uni.name} 
                              style={{ 
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '9999px',
                                imageRendering: 'high-quality'
                              }}
                            />
                          </div>
                          <div className="mt-[12px] relative z-20">
                            <div className="bg-black/90 backdrop-blur-xl border border-emerald-500/40 rounded-full px-5 py-2 shadow-lg">
                              <span className="text-base font-bold text-white" style={{ whiteSpace: 'nowrap' }}>{uni.name}</span>
                            </div>
                          </div>
                        </motion.div>
                      </foreignObject>
                    </g>
                  )
                })}
              </motion.g>
            </svg>

          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default Hero
