import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from './PublicLayout'

const services = [
  {
    icon: '⚡',
    title: 'HT Motor Rewinding',
    grade: 'Grade: 3.3 KV / 6.6 KV / 11 KV',
    desc: 'High tension motor rewinding is one of our core specializations. We handle the complete rewinding process with precision-manufactured coil sets, proper insulation systems, and thorough testing before delivery.',
    specs: [
      'Restaggering of stator & rotor core lamination',
      'Resin rich moulded coil set manufacturing',
      'In-house VPI (Vacuum Pressure Impregnation)',
      'Shaft replacement and dynamic balancing',
      'Rotor bar & end ring replacement / casting',
      'Complete testing with power analyzer',
      'Class F & H insulation system used',
      'Available for all makes and models',
    ],
  },
  {
    icon: '🔌',
    title: 'LT Motor Repair & Rewinding',
    grade: 'Grade: 415 / 440 Volts',
    desc: 'Low tension motor rewinding services for squirrel cage and slip-ring induction motors. We ensure every motor returns to factory-equivalent performance through rigorous testing and quality workmanship.',
    specs: [
      'Core restaggering of stator and rotor',
      'Rewinding of squirrel cage and slip-ring motors',
      'Rotor bar replacement and end ring casting',
      'Dynamic balancing of rotor assembly',
      'Bearing replacement and alignment',
      'Class F & H insulation class available',
      'High voltage and surge test post-rewind',
      'Suitable for pumps, fans, compressors, conveyors',
    ],
  },
  {
    icon: '🔋',
    title: 'DC Motor Services',
    grade: 'Grade: 230 to 800 Volts',
    desc: 'DC motors demand specialized knowledge for armature rewinding, commutator servicing, and field coil replacement. Our team handles all grades from 230V to 800V with precision and care.',
    specs: [
      'Re-winding of armature with precision winding machines',
      'Rewinding of field coils and compensating winding',
      'Replace commutator and dynamic balancing of armature',
      'New carbon brush and holder set assembly',
      'Interpole and series winding replacement',
      'Overhauling of brush gear and rocker ring',
      'High voltage test and load trial after rewind',
      'Suitable for rolling mills, cranes, hoists',
    ],
  },
  {
    icon: '🔧',
    title: 'Transformer Repair',
    grade: 'Capacity: 16 KVA to 20 MVA',
    desc: 'Power and distribution transformer reconditioning and rewinding with proper insulation treatment, oil filtration, and complete testing to ensure safe and efficient energy transmission.',
    specs: [
      'Capacity: 16 KVA to 20 MVA',
      'Voltage range: 440 to 33,000 Volts',
      'Reconditioning and rewinding of HV and LV windings',
      'Replace damaged core laminations & body repair',
      'Oil filtration, drying, and testing',
      'BDV test, ratio test, and turns ratio verification',
      'Winding resistance and insulation resistance test',
      'On-site transformer repair available',
    ],
  },
  {
    icon: '🧲',
    title: 'Electromagnet Rewinding',
    grade: 'Diameter: Up to 80 inches',
    desc: 'Electromagnets are critical for material handling in steel plants. We specialize in rewinding electromagnets of all sizes — from slabbing yard magnets to overhead crane magnets.',
    specs: [
      'Diameter up to 80 inches rewinding capability',
      'Slabbing yard electromagnets',
      'Iron scrap and solid scrap handling magnets',
      'Rectangular magnets for billet and slab handling',
      'Melt shop coil magnets',
      'Complete encapsulation and potting process',
      'Tested on full load before delivery',
      'Serving all major steel plants in Eastern India',
    ],
  },
  {
    icon: '⚙️',
    title: 'Dynamic Balancing & Miscellaneous',
    grade: 'In-shop & On-site Available',
    desc: 'Precision dynamic balancing services reduce vibration and extend the life of rotating equipment. We also offer machining services using our in-house 20ft lathe machine.',
    specs: [
      'Dynamic balancing of rotors, impellers, and fans',
      'In-shop and on-site balancing capability',
      'Vibration reduction and noise minimization',
      'In-house 20ft lathe machine for full shaft machining',
      'Bearing housing machining and repair',
      'Coupling alignment and shaft straightening',
      'Fit new bearings, seals, and end shields',
      'Available for all sizes and weights',
    ],
  },
]

const faqs = [
  {
    q: 'How long does motor rewinding typically take?',
    a: 'Turnaround time depends on the type and size of the motor. For standard LT motors, we typically complete within 3-7 working days. HT motors and large DC machines may take 7-14 days. We consistently deliver at up to half the industry-standard timeframe.',
  },
  {
    q: 'Do you offer on-site repair services?',
    a: 'Yes, we offer on-site servicing for transformers and large motors where transportation is not feasible. Our team travels to client plants across Odisha, Jharkhand, Chhattisgarh, and West Bengal. Contact us to schedule an on-site assessment.',
  },
  {
    q: 'What quality standards do you follow?',
    a: 'We follow ISO-certified quality procedures at every stage — incoming inspection, rewinding, insulation treatment (VPI), testing, and dispatch. All repairs are tested using surge test, power analyzers, and load trials where applicable.',
  },
  {
    q: 'Do you provide Annual Maintenance Contracts (AMC)?',
    a: 'Yes, our AMC program covers regular preventive maintenance inspections, priority scheduling, 24-hour critical breakdown response, and detailed maintenance records — transforming your approach from reactive to proactive maintenance.',
  },
]

const strengths = [
  { icon: '🏆', title: '50+ Years Experience', desc: 'Three generations of electrical engineering expertise backing every job we take on.' },
  { icon: '🔬', title: 'Modern Testing', desc: 'Power analyzers, surge testers, VPI systems, and comprehensive diagnostic equipment.' },
  { icon: '⚡', title: 'Fast Turnaround', desc: 'Structured workflow delivering results at half the industry-standard timeframe.' },
  { icon: '🛡️', title: 'Quality Guaranteed', desc: 'Every repaired unit is tested before dispatch. We stand behind our workmanship.' },
]

export default function PublicServices() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <PublicLayout>
      {/* Page Hero */}
      <section className="pub-page-hero">
        <div className="pub-page-hero-content">
          <div className="pub-breadcrumb">✦ What We Offer</div>
          <h1>Our <span>Services</span></h1>
          <p>
            Comprehensive electrical repair, rewinding, and maintenance services for HT/LT motors,
            DC motors, transformers, electromagnets, and more — delivered with precision and speed.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="pub-section pub-section-alt">
        <div className="pub-container">
          <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
            <div className="pub-section-label" style={{ justifyContent: 'center' }}>Our Setup</div>
            <h2 className="pub-section-title" style={{ textAlign: 'center' }}>
              A Complete <span>In-House Service Station</span>
            </h2>
            <p className="pub-section-subtitle" style={{ textAlign: 'center', maxWidth: '100%' }}>
              REMAG is equipped with modern machinery including a 20ft lathe machine, looping and spreading
              machines, core pressing facility, VPI plant, taping machine, and comprehensive testing equipment.
              All services — from stripping to testing — are performed under one roof, ensuring quality control
              at every step.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
              {['20ft Lathe Machine', 'VPI Plant', 'Dynamic Balancing Rig', 'Core Pressing', 'Surge Tester', 'Power Analyzer', 'Spreading Machine', 'Taping Machine'].map((f) => (
                <span key={f} style={{ background: 'rgba(32,178,200,0.08)', border: '1px solid rgba(32,178,200,0.2)', borderRadius: 100, padding: '8px 18px', fontSize: 13, color: 'var(--re-teal)', fontWeight: 600 }}>{f}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Service Cards */}
      <section className="pub-section">
        <div className="pub-container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="pub-section-label" style={{ justifyContent: 'center' }}>What We Do</div>
            <h2 className="pub-section-title" style={{ textAlign: 'center' }}>
              Our <span>Service Portfolio</span>
            </h2>
          </div>
          <div className="pub-service-detail-grid">
            {services.map((s, i) => (
              <div key={s.title} className={`pub-service-detail-card pub-animate pub-animate-delay-${(i % 2) + 1}`}>
                <div className="pub-service-detail-header">
                  <div className="pub-service-detail-icon">{s.icon}</div>
                  <div>
                    <div className="pub-service-detail-title">{s.title}</div>
                    <div className="pub-service-detail-grade">{s.grade}</div>
                  </div>
                </div>
                <div className="pub-service-detail-body">
                  <p className="pub-service-detail-desc">{s.desc}</p>
                  <ul className="pub-service-detail-specs">
                    {s.specs.map((spec) => (
                      <li key={spec}>
                        <span className="pub-spec-dot">✓</span>
                        {spec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="pub-section pub-section-dark">
        <div className="pub-container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="pub-section-label" style={{ justifyContent: 'center' }}>Our Strengths</div>
            <h2 className="pub-section-title light" style={{ textAlign: 'center' }}>
              Why Choose <span>Remag Electros</span>?
            </h2>
          </div>
          <div className="pub-strengths-grid">
            {strengths.map((s, i) => (
              <div key={s.title} className={`pub-strength-card pub-animate pub-animate-delay-${i + 1}`}>
                <div className="pub-strength-icon">{s.icon}</div>
                <div className="pub-strength-title">{s.title}</div>
                <div className="pub-strength-desc">{s.desc}</div>
              </div>
            ))}
          </div>

          {/* Industry Client Logos */}
          <div style={{ marginTop: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>Trusted by India's Leading Industries</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              {['Vaaman Engineers Ltd.', 'JSW Ispat', 'SAIL – RSP', 'Linde', 'Jindal Stainless Limited', 'Jindal Steel & Power'].map((c) => (
                <span key={c} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 100, padding: '8px 20px', fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pub-section pub-section-alt">
        <div className="pub-container">
          <div style={{ textAlign: 'center', marginBottom: 0 }}>
            <div className="pub-section-label" style={{ justifyContent: 'center' }}>Common Questions</div>
            <h2 className="pub-section-title" style={{ textAlign: 'center' }}>
              Frequently Asked <span>Questions</span>
            </h2>
          </div>
          <div className="pub-faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className={`pub-faq-item ${openFaq === i ? 'open' : ''}`}>
                <div className="pub-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="pub-faq-q-text">{faq.q}</span>
                  <span className="pub-faq-toggle">+</span>
                </div>
                <div className="pub-faq-a">
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="pub-cta-banner">
        <h2>Need a Service? Let's Talk.</h2>
        <p>
          Whether it's an emergency breakdown or a planned overhaul, our team is ready to deliver
          fast, reliable, and quality electrical repair services.
        </p>
        <div className="pub-cta-actions">
          <Link to="/contact-us" className="pub-btn" style={{ background: 'white', color: 'var(--re-teal)', fontWeight: 700 }}>
            Request a Quote →
          </Link>
          <a href="tel:+919238351331" className="pub-btn pub-btn-outline" style={{ borderColor: 'rgba(255,255,255,0.5)' }}>
            📞 Call Us Now
          </a>
        </div>
      </div>
    </PublicLayout>
  )
}
