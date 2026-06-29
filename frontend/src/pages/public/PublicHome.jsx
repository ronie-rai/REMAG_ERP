import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from './PublicLayout'

const services = [
  {
    icon: '⚡',
    title: 'HT Motor',
    desc: 'High tension motor repair and rewinding services with precision and reliability.',
    specs: ['Grade 3.3 KV / 6.6 KV / 11 KV', 'Restaggering of stator & rotor core lamination', 'Shaft replacement & dynamic balancing', 'Rotor bar & end ring replacement', 'Resin rich moulded coil set manufacturing'],
  },
  {
    icon: '🔌',
    title: 'LT Motor',
    desc: 'Low tension motor servicing and rewinding for reliable industrial operations.',
    specs: ['Grade 415/440 Volts', 'Core restaggering of stator and rotor', 'Rewinding of squirrel cage and slip-ring motors', 'Class F & H insulation system'],
  },
  {
    icon: '🔋',
    title: 'DC Motor',
    desc: 'DC motor repair and rewinding solutions ensuring smooth and efficient performance.',
    specs: ['Grade 230 to 800 Volts', 'Re-winding of field coils and compensating winding', 'Replace Commutator and dynamic balancing', 'New carbon brush and holder set assembly'],
  },
  {
    icon: '🔧',
    title: 'Transformer',
    desc: 'Power and distribution transformer repair services for safe and efficient energy flow.',
    specs: ['16 KVA to 20 MVA capacity', '440 to 33000 Volts', 'Reconditioning and rewinding of winding', 'Replace damaged core laminations & body repair'],
  },
  {
    icon: '🧲',
    title: 'Electromagnet',
    desc: 'Electromagnet repair and coil rewinding services for consistent magnetic performance.',
    specs: ['Up to 80" diameter', 'Slabbing yard magnets', 'Iron scrap handling magnets', 'Rectangular magnets for billets'],
  },
  {
    icon: '⚙️',
    title: 'Miscellaneous',
    desc: 'Precision dynamic balancing services to reduce vibration and improve efficiency.',
    specs: ['On-site & workshop dynamic balancing', 'Reduction of vibration and noise', 'Balancing of motors, fans, and rotors', 'In-house and on-site capability'],
  },
]

const steps = [
  { icon: '🔍', title: 'Diagnosis & Assessment' },
  { icon: '🧪', title: 'Testing & Validation' },
  { icon: '📦', title: 'Complete Kitting' },
  { icon: '🏭', title: 'Production & Execution' },
  { icon: '✅', title: 'Client Review & Approval' },
  { icon: '🚚', title: 'Timely Delivery' },
]

const amcPoints = [
  { before: 'Inefficient Shutdowns', after: 'Planned Preventive Maintenance' },
  { before: 'Last-Minute Costs', after: 'Cost-Effective Strategies' },
  { before: 'Lack of Awareness', after: 'Expertise & Experience' },
  { before: 'Emergency Panic Calls', after: 'VIP Priority Corridor' },
  { before: 'Inconsistent Quality', after: 'ISO-Certified Standards' },
  { before: 'Long Turnaround Times', after: 'Delivery at Half Market Time' },
]

const clients = [
  'Vaaman Engineers Ltd.',
  'JSW Ispat',
  'SAIL – RSP',
  'Linde',
  'Jindal Stainless Limited',
  'Jindal Steel & Power',
]

const stats = [
  { num: '50+', label: 'Years of Excellence', sub: 'Est. 1972' },
  { num: '200+', label: 'Happy Clients', sub: 'Across 7 States' },
  { num: '2K+', label: 'Completed Jobs', sub: 'And growing' },
  { num: '99%', label: 'Client Satisfaction', sub: 'Consistent quality' },
]

function useCountUp(target, duration = 2000, trigger) {
  const ref = useRef(null)
  useEffect(() => {
    if (!trigger) return
    const el = ref.current
    if (!el) return
    const numericTarget = parseInt(target.replace(/\D/g, ''))
    const suffix = target.replace(/\d/g, '')
    let start = 0
    const step = numericTarget / (duration / 16)
    const timer = setInterval(() => {
      start = Math.min(start + step, numericTarget)
      el.textContent = Math.floor(start) + suffix
      if (start >= numericTarget) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [trigger, target, duration])
  return ref
}

export default function PublicHome() {
  const statsRef = useRef(null)
  const [statsVisible, setStatsVisible] = React.useState(false)
  const [particles, setParticles] = React.useState([])

  useEffect(() => {
    const list = []
    for (let i = 0; i < 28; i++) {
      list.push({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${30 + Math.random() * 65}%`,
        duration: `${4 + Math.random() * 6}s`,
        delay: `${Math.random() * 6}s`,
        size: `${1 + Math.random() * 2}px`,
        bg: Math.random() > 0.6 ? '#b060ff' : '#00b4ff'
      })
    }
    setParticles(list)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <PublicLayout>
      {/* ── HERO (Cyber Industrial Design) ── */}
      <section className="pub-hero">
        <div className="pub-glow-orb blue"></div>
        <div className="pub-glow-orb amber"></div>
        <div className="pub-glow-orb cyan"></div>

        {/* Floating particles */}
        <div className="pub-particles">
          {particles.map((p) => (
            <div
              key={p.id}
              className="pub-particle"
              style={{
                left: p.left,
                top: p.top,
                animationDuration: p.duration,
                animationDelay: p.delay,
                width: p.size,
                height: p.size,
                backgroundColor: p.bg
              }}
            />
          ))}
        </div>

        <div className="pub-cyber-badge">Est. 1972 — High Voltage Specialists</div>

        <div className="pub-cyber-headline">
          <div className="company">REMAG<span>.</span>ELECTROS</div>
          <div className="sub">Private Limited</div>
        </div>

        <p className="pub-cyber-tagline">
          Precision <strong>refurbishment</strong> of high-voltage electrical equipment — restoring motors, transformers &amp; electromagnets to factory performance.
        </p>

        {/* MACHINES */}
        <div className="pub-machines">
          {/* ELECTRIC MOTOR */}
          <div className="pub-motor-wrap">
            <div className="pub-motor">
              <svg viewBox="0 0 140 160" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="mg1" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1a3a5c"/>
                    <stop offset="100%" stopColor="#0a1a2e"/>
                  </radialGradient>
                </defs>
                {/* Housing body */}
                <rect x="10" y="35" width="120" height="90" rx="8" fill="#0f1f38" stroke="#1a4070" strokeWidth="1.5"/>
                {/* Housing fins */}
                <rect x="10" y="40" width="120" height="6" rx="1" fill="#162d52" stroke="#1a4070" strokeWidth="0.5"/>
                <rect x="10" y="52" width="120" height="6" rx="1" fill="#162d52" stroke="#1a4070" strokeWidth="0.5"/>
                <rect x="10" y="64" width="120" height="6" rx="1" fill="#162d52" stroke="#1a4070" strokeWidth="0.5"/>
                <rect x="10" y="76" width="120" height="6" rx="1" fill="#162d52" stroke="#1a4070" strokeWidth="0.5"/>
                <rect x="10" y="88" width="120" height="6" rx="1" fill="#162d52" stroke="#1a4070" strokeWidth="0.5"/>
                <rect x="10" y="100" width="120" height="6" rx="1" fill="#162d52" stroke="#1a4070" strokeWidth="0.5"/>
                {/* End caps */}
                <rect x="3" y="40" width="18" height="80" rx="4" fill="#0d1f3a" stroke="#1a4070" strokeWidth="1.2"/>
                <rect x="119" y="40" width="18" height="80" rx="4" fill="#0d1f3a" stroke="#1a4070" strokeWidth="1.2"/>
                {/* Shaft */}
                <rect x="-2" y="76" width="22" height="8" rx="2" fill="#c0d4e8" stroke="#90b0cc" strokeWidth="0.8"/>
                <rect x="120" y="76" width="22" height="8" rx="2" fill="#c0d4e8" stroke="#90b0cc" strokeWidth="0.8"/>
                {/* Front face circle (rotor view) */}
                <circle cx="70" cy="80" r="30" fill="url(#mg1)" stroke="#1a5090" strokeWidth="1.5"/>
                {/* Rotor slots (spinning) */}
                <g id="rotor-slots" style={{ transformOrigin: '70px 80px', animation: 'spin 3s linear infinite' }}>
                  <line x1="70" y1="52" x2="70" y2="108" stroke="#00b4ff" strokeWidth="1" opacity="0.6"/>
                  <line x1="44" y1="56" x2="96" y2="104" stroke="#00b4ff" strokeWidth="1" opacity="0.6"/>
                  <line x1="44" y1="104" x2="96" y2="56" stroke="#00b4ff" strokeWidth="1" opacity="0.6"/>
                  <line x1="42" y1="80" x2="98" y2="80" stroke="#00b4ff" strokeWidth="1" opacity="0.6"/>
                  <line x1="52" y1="57" x2="88" y2="103" stroke="#1a90ff" strokeWidth="0.7" opacity="0.4"/>
                  <line x1="88" y1="57" x2="52" y2="103" stroke="#1a90ff" strokeWidth="0.7" opacity="0.4"/>
                </g>
                {/* Center hub */}
                <circle cx="70" cy="80" r="10" fill="#0a1428" stroke="#00b4ff" strokeWidth="1.5"/>
                <circle cx="70" cy="80" r="4" fill="#00b4ff" opacity="0.6"/>
                {/* Pulse ring */}
                <circle cx="70" cy="80" r="22" fill="none" stroke="#00b4ff" strokeWidth="1" opacity="0">
                  <animate attributeName="r" values="22;38" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite"/>
                </circle>
                {/* Terminal box */}
                <rect x="48" y="20" width="44" height="18" rx="3" fill="#0f1f38" stroke="#1a5090" strokeWidth="1"/>
                <rect x="55" y="24" width="8" height="10" rx="1" fill="#ff7700" stroke="#cc5500" strokeWidth="0.5"/>
                <rect x="66" y="24" width="8" height="10" rx="1" fill="#cc0000" stroke="#880000" strokeWidth="0.5"/>
                <rect x="77" y="24" width="8" height="10" rx="1" fill="#ff7700" stroke="#cc5500" strokeWidth="0.5"/>
                {/* Wire lead */}
                <line x1="59" y1="20" x2="59" y2="10" stroke="#ff7700" strokeWidth="1.5" strokeDasharray="3,2">
                  <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
                </line>
                <line x1="70" y1="20" x2="70" y2="5" stroke="#cc0000" strokeWidth="1.5" strokeDasharray="3,2">
                  <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/>
                </line>
                <line x1="81" y1="20" x2="81" y2="10" stroke="#ff7700" strokeWidth="1.5" strokeDasharray="3,2">
                  <animate attributeName="opacity" values="1;0.4;1" dur="1.8s" repeatCount="indefinite"/>
                </line>
                {/* Base feet */}
                <rect x="20" y="125" width="20" height="8" rx="2" fill="#0d1a30" stroke="#1a4070" strokeWidth="0.8"/>
                <rect x="100" y="125" width="20" height="8" rx="2" fill="#0d1a30" stroke="#1a4070" strokeWidth="0.8"/>
                {/* Rating plate */}
                <rect x="40" y="118" width="60" height="10" rx="2" fill="#0a1428" stroke="#1a5090" strokeWidth="0.5"/>
                <text x="70" y="126" textAnchor="middle" fontFamily="monospace" fontSize="5" fill="#00b4ff" opacity="0.8">400V | 75kW | 3Φ</text>
              </svg>
            </div>
            <div className="pub-machine-label"><span>Electric Motor</span>HV Induction</div>
          </div>

          {/* POWER TRANSFORMER */}
          <div className="pub-transformer-wrap">
            <div className="pub-transformer">
              <svg viewBox="0 0 160 190" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="tank-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0d1f38"/>
                    <stop offset="50%" stopColor="#162d52"/>
                    <stop offset="100%" stopColor="#0d1f38"/>
                  </linearGradient>
                </defs>
                {/* Main tank body */}
                <rect x="20" y="55" width="120" height="110" rx="4" fill="url(#tank-grad)" stroke="#1a4070" strokeWidth="1.5"/>
                {/* Tank side ribs/radiators left */}
                <rect x="8" y="65" width="14" height="14" rx="1" fill="#0a1828" stroke="#1a4070" strokeWidth="0.8"/>
                <rect x="8" y="83" width="14" height="14" rx="1" fill="#0a1828" stroke="#1a4070" strokeWidth="0.8"/>
                <rect x="8" y="101" width="14" height="14" rx="1" fill="#0a1828" stroke="#1a4070" strokeWidth="0.8"/>
                <rect x="8" y="119" width="14" height="14" rx="1" fill="#0a1828" stroke="#1a4070" strokeWidth="0.8"/>
                <rect x="8" y="137" width="14" height="14" rx="1" fill="#0a1828" stroke="#1a4070" strokeWidth="0.8"/>
                {/* Rib connectors left */}
                <line x1="8" y1="70" x2="20" y2="70" stroke="#1a4070" strokeWidth="0.8"/>
                <line x1="8" y1="77" x2="20" y2="77" stroke="#1a4070" strokeWidth="0.8"/>
                <line x1="8" y1="90" x2="20" y2="90" stroke="#1a4070" strokeWidth="0.8"/>
                {/* Tank side ribs right */}
                <rect x="138" y="65" width="14" height="14" rx="1" fill="#0a1828" stroke="#1a4070" strokeWidth="0.8"/>
                <rect x="138" y="83" width="14" height="14" rx="1" fill="#0a1828" stroke="#1a4070" strokeWidth="0.8"/>
                <rect x="138" y="101" width="14" height="14" rx="1" fill="#0a1828" stroke="#1a4070" strokeWidth="0.8"/>
                <rect x="138" y="119" width="14" height="14" rx="1" fill="#0a1828" stroke="#1a4070" strokeWidth="0.8"/>
                <rect x="138" y="137" width="14" height="14" rx="1" fill="#0a1828" stroke="#1a4070" strokeWidth="0.8"/>

                {/* HV Bushings */}
                <rect x="42" y="18" width="12" height="40" rx="3" fill="#1a3a60" stroke="#00b4ff" strokeWidth="1"/>
                <rect x="38" y="22" width="20" height="4" rx="1" fill="#1a4a70" stroke="#00b4ff" strokeWidth="0.8"/>
                <rect x="39" y="30" width="18" height="3" rx="1" fill="#1a4a70" stroke="#00b4ff" strokeWidth="0.8"/>
                <rect x="40" y="38" width="16" height="3" rx="1" fill="#1a4a70" stroke="#00b4ff" strokeWidth="0.8"/>
                <line x1="48" y1="12" x2="48" y2="18" stroke="#00b4ff" strokeWidth="2">
                  <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite"/>
                </line>

                <rect x="74" y="18" width="12" height="40" rx="3" fill="#1a3a60" stroke="#00b4ff" strokeWidth="1"/>
                <rect x="70" y="22" width="20" height="4" rx="1" fill="#1a4a70" stroke="#00b4ff" strokeWidth="0.8"/>
                <rect x="71" y="30" width="18" height="3" rx="1" fill="#1a4a70" stroke="#00b4ff" strokeWidth="0.8"/>
                <rect x="72" y="38" width="16" height="3" rx="1" fill="#1a4a70" stroke="#00b4ff" strokeWidth="0.8"/>
                <line x1="80" y1="8" x2="80" y2="18" stroke="#00b4ff" strokeWidth="2">
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
                </line>

                <rect x="106" y="18" width="12" height="40" rx="3" fill="#1a3a60" stroke="#00b4ff" strokeWidth="1"/>
                <rect x="102" y="22" width="20" height="4" rx="1" fill="#1a4a70" stroke="#00b4ff" strokeWidth="0.8"/>
                <rect x="103" y="30" width="18" height="3" rx="1" fill="#1a4a70" stroke="#00b4ff" strokeWidth="0.8"/>
                <rect x="104" y="38" width="16" height="3" rx="1" fill="#1a4a70" stroke="#00b4ff" strokeWidth="0.8"/>
                <line x1="112" y1="12" x2="112" y2="18" stroke="#00b4ff" strokeWidth="2">
                  <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1.4s" repeatCount="indefinite"/>
                </line>

                <path d="M48 12 Q64 2 80 8" fill="none" stroke="#00d4ff" strokeWidth="0.8" strokeDasharray="3,2" opacity="0">
                  <animate attributeName="opacity" values="0;1;0;0;0" dur="4s" repeatCount="indefinite"/>
                </path>
                <path d="M80 8 Q96 1 112 12" fill="none" stroke="#00d4ff" strokeWidth="0.8" strokeDasharray="3,2" opacity="0">
                  <animate attributeName="opacity" values="0;0;0;1;0" dur="4s" repeatCount="indefinite"/>
                </path>

                {/* Conservator tank */}
                <rect x="50" y="50" width="60" height="14" rx="3" fill="#0f1f38" stroke="#1a5090" strokeWidth="1"/>
                <text x="80" y="60" textAnchor="middle" fontFamily="monospace" fontSize="5" fill="#00b4ff" opacity="0.7">OIL LEVEL</text>

                {/* Core section */}
                <rect x="32" y="68" width="96" height="85" rx="2" fill="#0a1626" stroke="#1a3a60" strokeWidth="0.8"/>
                <rect x="38" y="72" width="20" height="77" rx="1" fill="#1a3050" stroke="#00b4ff" strokeWidth="0.5" opacity="0.7"/>
                <rect x="70" y="72" width="20" height="77" rx="1" fill="#1a3050" stroke="#00b4ff" strokeWidth="0.5" opacity="0.7"/>
                <rect x="102" y="72" width="20" height="77" rx="1" fill="#1a3050" stroke="#00b4ff" strokeWidth="0.5" opacity="0.7"/>

                <rect x="33" y="85" width="30" height="50" rx="2" fill="none" stroke="#ff8800" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#ff8800;#ffaa00;#ff8800" dur="2s" repeatCount="indefinite"/>
                </rect>
                <rect x="36" y="90" width="24" height="40" rx="1" fill="none" stroke="#00c8ff" strokeWidth="1">
                  <animate attributeName="stroke" values="#00c8ff;#80e8ff;#00c8ff" dur="2s" repeatCount="indefinite" begin="1s"/>
                </rect>

                <rect x="65" y="85" width="30" height="50" rx="2" fill="none" stroke="#ff8800" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#ff8800;#ffaa00;#ff8800" dur="2s" repeatCount="indefinite" begin="0.3s"/>
                </rect>
                <rect x="68" y="90" width="24" height="40" rx="1" fill="none" stroke="#00c8ff" strokeWidth="1">
                  <animate attributeName="stroke" values="#00c8ff;#80e8ff;#00c8ff" dur="2s" repeatCount="indefinite" begin="1.3s"/>
                </rect>

                <rect x="97" y="85" width="30" height="50" rx="2" fill="none" stroke="#ff8800" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#ff8800;#ffaa00;#ff8800" dur="2s" repeatCount="indefinite" begin="0.6s"/>
                </rect>
                <rect x="100" y="90" width="24" height="40" rx="1" fill="none" stroke="#00c8ff" strokeWidth="1">
                  <animate attributeName="stroke" values="#00c8ff;#80e8ff;#00c8ff" dur="2s" repeatCount="indefinite" begin="1.6s"/>
                </rect>

                {/* Rating plate */}
                <rect x="40" y="160" width="80" height="14" rx="2" fill="#0a1428" stroke="#1a5090" strokeWidth="0.5"/>
                <text x="80" y="170" text-anchor="middle" fontFamily="monospace" fontSize="5.5" fill="#00b4ff" opacity="0.9">11kV/433V | 500kVA</text>

                {/* Base wheels */}
                <rect x="25" y="165" width="110" height="8" rx="2" fill="#0a1428" stroke="#1a4070" strokeWidth="0.8"/>
                <circle cx="45" cy="178" r="6" fill="#0a1428" stroke="#1a5090" strokeWidth="1"/>
                <circle cx="115" cy="178" r="6" fill="#0a1428" stroke="#1a5090" strokeWidth="1"/>
                <circle cx="45" cy="178" r="2" fill="#00b4ff" opacity="0.5"/>
                <circle cx="115" cy="178" r="2" fill="#00b4ff" opacity="0.5"/>
              </svg>
            </div>
            <div className="pub-machine-label"><span>Power Transformer</span>11kV Distribution</div>
          </div>

          {/* ELECTROMAGNET */}
          <div className="pub-magnet-wrap">
            <div className="pub-magnet">
              <svg viewBox="0 0 130 155" xmlns="http://www.w3.org/2000/svg">
                {/* U-shape core */}
                <rect x="15" y="30" width="32" height="90" rx="8" fill="#0f1a2e" stroke="#6a30a0" strokeWidth="1.5"/>
                <rect x="83" y="30" width="32" height="90" rx="8" fill="#0f1a2e" stroke="#6a30a0" strokeWidth="1.5"/>
                <rect x="15" y="30" width="100" height="32" rx="8" fill="#0f1a2e" stroke="#6a30a0" strokeWidth="1.5"/>
                <rect x="22" y="36" width="20" height="20" rx="2" fill="#1a0838" stroke="#8840cc" strokeWidth="0.5"/>
                <rect x="88" y="36" width="20" height="20" rx="2" fill="#1a0838" stroke="#8840cc" strokeWidth="0.5"/>
                <rect x="22" y="36" width="86" height="20" rx="2" fill="#1a0838" stroke="#8840cc" strokeWidth="0.5"/>

                {/* Coil windings left */}
                <rect x="13" y="45" width="36" height="5" rx="1" fill="none" stroke="#b060ff" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#b060ff;#e0a0ff;#b060ff" dur="1.5s" repeatCount="indefinite"/>
                </rect>
                <rect x="13" y="53" width="36" height="5" rx="1" fill="none" stroke="#9040ee" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#9040ee;#c070ff;#9040ee" dur="1.5s" repeatCount="indefinite" begin="0.2s"/>
                </rect>
                <rect x="13" y="61" width="36" height="5" rx="1" fill="none" stroke="#b060ff" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#b060ff;#e0a0ff;#b060ff" dur="1.5s" repeatCount="indefinite" begin="0.4s"/>
                </rect>
                <rect x="13" y="69" width="36" height="5" rx="1" fill="none" stroke="#9040ee" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#9040ee;#c070ff;#9040ee" dur="1.5s" repeatCount="indefinite" begin="0.6s"/>
                </rect>
                <rect x="13" y="77" width="36" height="5" rx="1" fill="none" stroke="#b060ff" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#b060ff;#e0a0ff;#b060ff" dur="1.5s" repeatCount="indefinite" begin="0.8s"/>
                </rect>
                <rect x="13" y="85" width="36" height="5" rx="1" fill="none" stroke="#9040ee" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#9040ee;#c070ff;#9040ee" dur="1.5s" repeatCount="indefinite" begin="1s"/>
                </rect>
                <rect x="13" y="93" width="36" height="5" rx="1" fill="none" stroke="#b060ff" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#b060ff;#e0a0ff;#b060ff" dur="1.5s" repeatCount="indefinite" begin="1.2s"/>
                </rect>

                {/* Coil windings right */}
                <rect x="81" y="45" width="36" height="5" rx="1" fill="none" stroke="#b060ff" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#b060ff;#e0a0ff;#b060ff" dur="1.5s" repeatCount="indefinite" begin="0.1s"/>
                </rect>
                <rect x="81" y="53" width="36" height="5" rx="1" fill="none" stroke="#9040ee" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#9040ee;#c070ff;#9040ee" dur="1.5s" repeatCount="indefinite" begin="0.3s"/>
                </rect>
                <rect x="81" y="61" width="36" height="5" rx="1" fill="none" stroke="#b060ff" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#b060ff;#e0a0ff;#b060ff" dur="1.5s" repeatCount="indefinite" begin="0.5s"/>
                </rect>
                <rect x="81" y="69" width="36" height="5" rx="1" fill="none" stroke="#9040ee" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#9040ee;#c070ff;#9040ee" dur="1.5s" repeatCount="indefinite" begin="0.7s"/>
                </rect>
                <rect x="81" y="77" width="36" height="5" rx="1" fill="none" stroke="#b060ff" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#b060ff;#e0a0ff;#b060ff" dur="1.5s" repeatCount="indefinite" begin="0.9s"/>
                </rect>
                <rect x="81" y="85" width="36" height="5" rx="1" fill="none" stroke="#9040ee" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#9040ee;#c070ff;#9040ee" dur="1.5s" repeatCount="indefinite" begin="1.1s"/>
                </rect>
                <rect x="81" y="93" width="36" height="5" rx="1" fill="none" stroke="#b060ff" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#b060ff;#e0a0ff;#b060ff" dur="1.5s" repeatCount="indefinite" begin="1.3s"/>
                </rect>

                {/* Pole faces */}
                <rect x="13" y="118" width="36" height="12" rx="3" fill="#2a0848" stroke="#b060ff" strokeWidth="1.5"/>
                <text x="31" y="128" text-anchor="middle" fontFamily="monospace" fontSize="7" fontWeight="bold" fill="#e0a0ff">N</text>
                <rect x="81" y="118" width="36" height="12" rx="3" fill="#2a0848" stroke="#b060ff" strokeWidth="1.5"/>
                <text x="99" y="128" text-anchor="middle" fontFamily="monospace" fontSize="7" fontWeight="bold" fill="#e0a0ff">S</text>

                {/* Magnetic field lines */}
                <path d="M31 130 Q65 148 99 130" fill="none" stroke="#b060ff" strokeWidth="1" strokeDasharray="4,3" opacity="0">
                  <animate attributeName="opacity" values="0;0.7;0" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="d" values="M31 130 Q65 148 99 130;M31 130 Q65 155 99 130;M31 130 Q65 148 99 130" dur="2s" repeatCount="indefinite"/>
                </path>
                <path d="M31 130 Q65 140 99 130" fill="none" stroke="#d080ff" strokeWidth="0.8" strokeDasharray="3,3" opacity="0">
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite"/>
                </path>
                <path d="M31 130 Q65 160 99 130" fill="none" stroke="#8030cc" strokeWidth="0.7" strokeDasharray="5,4" opacity="0">
                  <animate attributeName="opacity" values="0;0.5;0" dur="2.5s" repeatCount="indefinite" begin="0.5s"/>
                </path>

                {/* Power leads */}
                <line x1="31" y1="30" x2="31" y2="14" stroke="#ff8800" strokeWidth="2">
                  <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite"/>
                </line>
                <line x1="99" y1="30" x2="99" y2="14" stroke="#cc3300" strokeWidth="2">
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite"/>
                </line>
                {/* Terminal markers */}
                <circle cx="31" cy="12" r="4" fill="#ff8800" opacity="0.8"/>
                <circle cx="99" cy="12" r="4" fill="#cc3300" opacity="0.8"/>
                <text x="31" y="8" text-anchor="middle" fontFamily="monospace" fontSize="6" fill="#ff8800">+</text>
                <text x="99" y="8" text-anchor="middle" fontFamily="monospace" fontSize="6" fill="#cc3300">–</text>
              </svg>
            </div>
            <div className="pub-machine-label"><span>Electromagnet</span>Industrial Grade</div>
          </div>
        </div>

        {/* CTA BUTTONS */}
        <div className="pub-cta-row">
          <Link to="/contact-us" className="pub-btn-cyber">Get a Quote ↗</Link>
          <Link to="/our-services" className="pub-btn-outline-cyber">View Services</Link>
        </div>

        {/* STATS */}
        <div className="pub-cyber-stats">
          <div className="pub-cyber-stat">
            <div className="num">500<span>+</span></div>
            <div className="lbl">Units Refurbished</div>
          </div>
          <div className="pub-cyber-stat-divider"></div>
          <div className="pub-cyber-stat">
            <div className="num">11<span>kV</span></div>
            <div className="lbl">Max HV Rating</div>
          </div>
          <div className="pub-cyber-stat-divider"></div>
          <div className="pub-cyber-stat">
            <div className="num">99<span>%</span></div>
            <div className="lbl">Uptime Guarantee</div>
          </div>
          <div className="pub-cyber-stat-divider"></div>
          <div className="pub-cyber-stat">
            <div className="num">24<span>/7</span></div>
            <div className="lbl">Support</div>
          </div>
        </div>
      </section>

      {/* ── ABOUT INTRO ── */}
      <section className="pub-section" id="about-intro">
        <div className="pub-container">
          <div className="pub-about-intro-grid">
            <div>
              <div className="pub-section-label">Who We Are</div>
              <h2 className="pub-section-title">
                A Complete Electrical<br /><span>Service Station</span>
              </h2>
              <p className="pub-section-subtitle">
                REMAG Electros Pvt. Ltd. is a complete service station with in-house facilities,
                equipped with modern machinery and advanced testing equipment for heavy electrical
                machines. We provide reliable refurbishing, rewinding, and maintenance solutions
                with a strong focus on quality, safety, and performance.
              </p>
              <div className="pub-pillar-cards">
                {[
                  { icon: '🏆', title: 'Expertise in Quality Workmanship', desc: 'Our technicians ensure precise work through proven procedures and strict quality checks across every job.' },
                  { icon: '⏱️', title: 'Timely & Fast Delivery', desc: 'We follow a structured workflow to deliver on time — completing projects in up to half the industry-standard timeframe.' },
                  { icon: '📋', title: 'Annual Maintenance Contract', desc: 'Comprehensive AMC services with regular inspections, preventive maintenance, and 24-hour critical breakdown support.' },
                ].map((p) => (
                  <div key={p.title} className="pub-pillar-card pub-animate">
                    <div className="pub-pillar-icon">{p.icon}</div>
                    <div>
                      <div className="pub-pillar-title">{p.title}</div>
                      <div className="pub-pillar-desc">{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pub-animate pub-animate-delay-2" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: 'linear-gradient(135deg, var(--re-charcoal), var(--re-mid))', borderRadius: 'var(--re-radius)', border: '1px solid var(--re-border)', padding: 40, textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 72, fontWeight: 900, color: 'var(--re-teal)', lineHeight: 1, textShadow: '0 0 40px rgba(32,178,200,0.4)' }}>1972</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, textTransform: 'uppercase', marginTop: 8 }}>Year Established</div>
              </div>
              <div style={{ background: 'white', borderRadius: 'var(--re-radius)', border: '1px solid rgba(0,0,0,0.07)', padding: 28 }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--re-dark)', marginBottom: 12 }}>🏭 In-House Setup</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['20ft Lathe Machine', 'Looping', 'Spreading', 'Moulding', 'Taping', 'Pressing'].map((f) => (
                    <span key={f} style={{ background: 'rgba(32,178,200,0.08)', border: '1px solid rgba(32,178,200,0.15)', borderRadius: 100, padding: '4px 12px', fontSize: 12, color: 'var(--re-teal)', fontWeight: 600 }}>{f}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'linear-gradient(135deg, var(--re-teal), var(--re-teal-dark))', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 900, color: 'white' }}>85%</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Cost Savings</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, var(--re-gold), #d4892e)', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 900, color: 'white' }}>95%</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Performance Gain</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AMC — REACTIVE TO PROACTIVE ── */}
      <section className="pub-section pub-section-dark">
        <div className="pub-container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="pub-section-label" style={{ justifyContent: 'center' }}>Our AMC</div>
            <h2 className="pub-section-title light">From Reactive to <span>Proactive</span></h2>
            <p className="pub-section-subtitle light" style={{ margin: '0 auto' }}>
              Our Annual Maintenance Contract is more than just a service — it's a partnership for
              reliability. We transform how you handle industrial electrical maintenance.
            </p>
          </div>
          <div className="pub-amc-grid">
            {amcPoints.map((p, i) => (
              <div key={i} className="pub-amc-card pub-animate" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="pub-amc-arrow">✦ Transformed</div>
                <div className="pub-amc-before">{p.before}</div>
                <div className="pub-amc-after">→ {p.after}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="pub-section pub-section-alt">
        <div className="pub-container">
          <div style={{ textAlign: 'center' }}>
            <div className="pub-section-label" style={{ justifyContent: 'center' }}>Our Efficient Solution</div>
            <h2 className="pub-section-title" style={{ textAlign: 'center' }}>
              Comprehensive <span>Electrical Services</span>
            </h2>
            <p className="pub-section-subtitle" style={{ margin: '0 auto', textAlign: 'center' }}>
              We provide reliable and efficient electrical refurbishing, rewinding, and maintenance
              solutions using modern equipment and proven techniques.
            </p>
          </div>
          <div className="pub-services-grid">
            {services.map((s, i) => (
              <div key={s.title} className={`pub-service-card pub-animate pub-animate-delay-${(i % 3) + 1}`}>
                <div className="pub-service-icon-wrap">{s.icon}</div>
                <div className="pub-service-title">{s.title}</div>
                <div className="pub-service-desc">{s.desc}</div>
                <ul className="pub-service-specs">
                  {s.specs.slice(0, 3).map((spec) => (
                    <li key={spec}>{spec}</li>
                  ))}
                </ul>
                <Link to="/our-services" className="pub-service-link">Learn more →</Link>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Link to="/our-services" className="pub-btn pub-btn-primary">View All Services →</Link>
          </div>
        </div>
      </section>

      {/* ── 6-STEP PROCESS ── */}
      <section className="pub-section">
        <div className="pub-container">
          <div style={{ textAlign: 'center', marginBottom: 0 }}>
            <div className="pub-section-label" style={{ justifyContent: 'center' }}>How We Work</div>
            <h2 className="pub-section-title" style={{ textAlign: 'center' }}>
              Our <span>6-Step</span> Process
            </h2>
            <p className="pub-section-subtitle" style={{ margin: '0 auto', textAlign: 'center' }}>
              A structured, transparent workflow designed for maximum quality, speed, and client confidence at every stage.
            </p>
          </div>
          <div className="pub-steps-grid">
            {steps.map((step, i) => (
              <div key={step.title} className={`pub-step-card pub-animate pub-animate-delay-${i + 1}`}>
                <span className="pub-step-num">{i + 1}</span>
                <div className="pub-step-icon">{step.icon}</div>
                <div className="pub-step-title">{step.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="pub-stats-bar" ref={statsRef}>
        <div className="pub-stats-grid">
          {stats.map((s) => (
            <div key={s.label} className="pub-stat-item">
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
                <span className="pub-stat-num">{s.num}</span>
                <span className="pub-stat-label" style={{ marginTop: 0 }}>{s.label}</span>
              </div>
              <div className="pub-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CLIENTS ── */}
      <section className="pub-section pub-section-alt">
        <div className="pub-container" style={{ textAlign: 'center' }}>
          <div className="pub-section-label" style={{ justifyContent: 'center' }}>Brands That Believe in Us</div>
          <h2 className="pub-section-title" style={{ textAlign: 'center' }}>
            Our Large <span>Scale Projects</span>
          </h2>
          <p className="pub-section-subtitle" style={{ margin: '0 auto', textAlign: 'center' }}>
            We deliver high-quality electrical projects with precision, reliability, and modern techniques for some of India's largest industrial names.
          </p>
          <div className="pub-clients-strip">
            {clients.map((c) => (
              <div key={c} className="pub-client-chip">{c}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section className="pub-section pub-section-charcoal">
        <div className="pub-container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div className="pub-section-label" style={{ justifyContent: 'center' }}>Client Voices</div>
            <h2 className="pub-section-title light" style={{ textAlign: 'center' }}>
              What Our <span>Clients Say</span>
            </h2>
          </div>
          <div className="pub-testimonial-wrap pub-animate">
            <span className="pub-testimonial-quote">"</span>
            <p className="pub-testimonial-text">
              Remag Electros Pvt. Ltd. delivers reliable refurbished electronics with excellent
              quality and professional service. Their team is responsive, knowledgeable, and always
              ensures our critical equipment is back online in the shortest time possible.
            </p>
            <div className="pub-testimonial-stars">★★★★★</div>
            <div className="pub-testimonial-author">Sudhir Pradhan</div>
            <div className="pub-testimonial-role">Plant Incharge</div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="pub-cta-banner">
        <h2>Ready to Experience Dependable Electrical Services?</h2>
        <p>
          If you are looking for dependable electrical motor rewinding and transformer repair
          services, you are at the right place with proven industrial expertise.
        </p>
        <div className="pub-cta-actions">
          <Link to="/contact-us" className="pub-btn" style={{ background: 'white', color: 'var(--re-teal)', fontWeight: 700 }}>
            Contact Us Today →
          </Link>
          <Link to="/about-us" className="pub-btn pub-btn-outline" style={{ borderColor: 'rgba(255,255,255,0.5)' }}>
            Learn About Us
          </Link>
        </div>
      </div>
    </PublicLayout>
  )
}
