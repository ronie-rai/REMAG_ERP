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
      {/* ── HERO ── */}
      <section className="pub-hero">
        <div className="pub-hero-grid">
          <div>
            <div className="pub-hero-badge">
              <span className="pub-hero-badge-dot" />
              Rewinding &amp; Repair Specialists since 1972
            </div>
            <h1>
              Professional<br />
              <span className="highlight">Electrical Services</span><br />
              for Industry
            </h1>
            <p className="pub-hero-desc">
              Reliable rewinding and repair services for HT Motors, LT Motors, DC Motors,
              Transformers, and Electromagnets. Precision workmanship, strict quality
              standards, and advanced techniques ensuring optimal performance and long service life.
            </p>
            <div className="pub-hero-actions">
              <Link to="/our-services" className="pub-btn pub-btn-primary">Explore Services →</Link>
              <Link to="/contact-us" className="pub-btn pub-btn-outline">Get a Quote</Link>
            </div>
            <div className="pub-hero-stats-row">
              {stats.map((s) => (
                <div key={s.label} className="pub-hero-stat" style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span className="pub-hero-stat-num">{s.num}</span>
                  <span className="pub-hero-stat-lbl" style={{ marginTop: 0 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pub-hero-visual">
            <div className="pub-hero-orb">
              <div className="pub-hero-orb-inner">
                <img src="/logo.png" alt="RE Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '16px' }} />
                <div className="pub-hero-orb-label">Remag Electros Pvt. Ltd.</div>
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                  {['HT Motor', 'LT Motor', 'DC Motor', 'Transformer'].map((s) => (
                    <span key={s} style={{ background: 'rgba(32,178,200,0.12)', border: '1px solid rgba(32,178,200,0.2)', borderRadius: 100, padding: '4px 14px', fontSize: 12, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
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
