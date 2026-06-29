import React from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from './PublicLayout'

const timeline = [
  {
    year: '1972',
    icon: '⚡',
    name: 'Late Suresh Chand Agarwal',
    role: 'Founder',
    desc: 'Late Mr. Suresh Chand Agarwal — a pioneer of electrical rewinding services in Rourkela — laid the foundation of REMAG. Starting with basic tools and deep expertise, he established a name synonymous with trust and quality.',
    side: 'left',
  },
  {
    year: '1986',
    icon: '🏭',
    name: 'Arun Agarwal',
    role: 'Managing Director',
    desc: 'Shri Arun Agarwal joined and scaled the business — expanding our footprint to serve major steel and mining clients, investing in modern machinery, and standardizing quality processes. Under his leadership REMAG grew into a full-fledged industrial service station.',
    side: 'right',
  },
  {
    year: '2018',
    icon: '🚀',
    name: 'Next Generation Leadership',
    role: 'New Era of Growth',
    desc: 'The third generation stepped in to modernize REMAG — digitalizing operations, investing in advanced testing equipment, and expanding the client base across Odisha, Jharkhand, Chhattisgarh, and beyond.',
    side: 'left',
  },
]

const expertise = [
  '50+ years of motor rewinding and transformer repair excellence',
  'In-house 20ft lathe machine for complete rotor machining',
  'Dynamic balancing facility for motors and fans up to heavy-duty loads',
  'Class F and Class H insulation systems for HT, LT, and DC motors',
  'Specialization in electromagnets up to 80" diameter',
  'Resin rich moulded coil set manufacturing capability',
  'On-site servicing at client plants across Eastern India',
  'AMC support with 24-hour critical breakdown response',
]

const vmw = [
  {
    icon: '🎯',
    title: 'Our Vision',
    desc: 'To be the most trusted electrical refurbishment and rewinding company in Eastern India — known for precision, reliability, and extraordinary service to every industrial client.',
  },
  {
    icon: '⚙️',
    title: 'Our Mission',
    desc: 'To provide premium quality electrical repair, rewinding, and maintenance services with cutting-edge machinery, certified workmanship, and a deep commitment to delivering value and long-term client partnerships.',
  },
  {
    icon: '🌟',
    title: 'Who We Are',
    desc: 'We are a team of passionate engineers and skilled technicians, driven by a shared passion for excellence in electrical services. With over 50 years of combined legacy, we stand as a dependable partner for industries across the region.',
  },
]

export default function PublicAbout() {
  return (
    <PublicLayout>
      {/* Page Hero */}
      <section className="pub-page-hero">
        <div className="pub-page-hero-content">
          <div className="pub-breadcrumb">✦ Our Story</div>
          <h1>Built on <span>Trust</span> &amp; Expertise</h1>
          <p>
            Over 50 years of professional electrical rewinding and repair services — a legacy of
            three generations, building excellence one motor at a time.
          </p>
        </div>
      </section>

      {/* Chairman's Message */}
      <section className="pub-section">
        <div className="pub-container">
          <div className="pub-philosophy-grid">
            <div>
              <div className="pub-section-label">Message from the MD</div>
              <h2 className="pub-section-title">
                Chairman's <span>Message</span>
              </h2>
              <div style={{ marginTop: 24, fontSize: 15, color: 'var(--re-text)', lineHeight: 1.85 }}>
                <p style={{ marginBottom: 16 }}>
                  "At REMAG Electros, we believe that every motor we repair carries with it the
                  responsibility of someone's livelihood — whether it powers a steel plant, a
                  mining facility, or a manufacturing unit. This belief has shaped our approach to
                  quality for more than five decades.
                </p>
                <p style={{ marginBottom: 16 }}>
                  "What my father started as a small workshop in 1972 has grown into a full-service
                  industrial electrical station trusted by some of India's largest corporations.
                  This journey was only possible because of our unwavering commitment to craftsmanship
                  and our clients' trust.
                </p>
                <p>
                  "Our promise is simple: every job — big or small — receives the same level of care,
                  precision, and expertise. We don't just repair machines; we restore reliability."
                </p>
              </div>
              <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, var(--re-teal), var(--re-teal-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'white', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>A</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--re-dark)' }}>Arun Agarwal</div>
                  <div style={{ fontSize: 13, color: 'var(--re-teal)', fontWeight: 600 }}>Managing Director, Remag Electros Pvt. Ltd.</div>
                </div>
              </div>
            </div>
            <div className="pub-animate pub-animate-delay-2">
              <div className="pub-savings-grid">
                <div className="pub-savings-card pub-savings-card-primary">
                  <div className="pub-savings-pct">85%</div>
                  <div className="pub-savings-lbl">Cost Savings vs. New Equipment</div>
                </div>
                <div className="pub-savings-card pub-savings-card-gold">
                  <div className="pub-savings-pct">95%</div>
                  <div className="pub-savings-lbl">Performance Restoration Rate</div>
                </div>
              </div>
              <div style={{ marginTop: 24, background: 'linear-gradient(135deg, var(--re-charcoal), var(--re-mid))', borderRadius: 'var(--re-radius)', border: '1px solid var(--re-border)', padding: 28 }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 16 }}>✦ Why Choose Refurbishment?</div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    'Save 85% of cost compared to buying new',
                    'Environment-friendly — reduces e-waste',
                    'Same-as-new performance guaranteed',
                    'Faster turnaround than OEM replacement',
                    'Backed by warranty and ongoing support',
                  ].map((pt) => (
                    <li key={pt} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                      <span style={{ color: 'var(--re-teal)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision / Mission / Who We Are */}
      <section className="pub-section pub-section-alt">
        <div className="pub-container">
          <div style={{ textAlign: 'center' }}>
            <div className="pub-section-label" style={{ justifyContent: 'center' }}>Our Foundation</div>
            <h2 className="pub-section-title" style={{ textAlign: 'center' }}>
              Vision, Mission &amp; <span>Who We Are</span>
            </h2>
          </div>
          <div className="pub-vmw-grid">
            {vmw.map((v, i) => (
              <div key={v.title} className={`pub-vmw-card pub-animate pub-animate-delay-${i + 1}`}>
                <span className="pub-vmw-icon">{v.icon}</span>
                <div className="pub-vmw-title">{v.title}</div>
                <div className="pub-vmw-desc">{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="pub-section">
        <div className="pub-container">
          <div style={{ textAlign: 'center' }}>
            <div className="pub-section-label" style={{ justifyContent: 'center' }}>Our Journey</div>
            <h2 className="pub-section-title" style={{ textAlign: 'center' }}>
              Three <span>Generations</span> of Excellence
            </h2>
            <p className="pub-section-subtitle" style={{ margin: '0 auto', textAlign: 'center' }}>
              From a modest workshop in 1972 to a multi-state electrical service powerhouse — our story is driven by passion and continuity.
            </p>
          </div>
          <div className="pub-timeline">
            {timeline.map((t, i) => (
              <div key={t.year} className="pub-timeline-item pub-animate">
                {t.side === 'left' ? (
                  <>
                    <div className="pub-timeline-content-left">
                      <div className="pub-timeline-year">{t.year}</div>
                      <div className="pub-timeline-name">{t.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--re-teal)', fontWeight: 600, marginBottom: 8 }}>{t.role}</div>
                      <div className="pub-timeline-desc">{t.desc}</div>
                    </div>
                    <div className="pub-timeline-dot">{t.icon}</div>
                    <div />
                  </>
                ) : (
                  <>
                    <div />
                    <div className="pub-timeline-dot">{t.icon}</div>
                    <div className="pub-timeline-content-right">
                      <div className="pub-timeline-year">{t.year}</div>
                      <div className="pub-timeline-name">{t.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--re-teal)', fontWeight: 600, marginBottom: 8 }}>{t.role}</div>
                      <div className="pub-timeline-desc">{t.desc}</div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Expertise Bullets */}
      <section className="pub-section pub-section-dark">
        <div className="pub-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            <div>
              <div className="pub-section-label">Our Capabilities</div>
              <h2 className="pub-section-title light">
                30+ Years of<br /><span>Technical Expertise</span>
              </h2>
              <p className="pub-section-subtitle light" style={{ marginBottom: 32 }}>
                Our team combines decades of hands-on experience with continuous investment in modern machinery and training.
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {expertise.map((e) => (
                  <li key={e} className="pub-animate" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(32,178,200,0.15)', border: '1px solid rgba(32,178,200,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--re-teal)', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
            <div className="pub-animate pub-animate-delay-2" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Quality Assurance', pct: 99 },
                { label: 'On-Time Delivery', pct: 95 },
                { label: 'Client Retention', pct: 92 },
                { label: 'Cost Efficiency', pct: 85 },
              ].map((bar) => (
                <div key={bar.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                    <span>{bar.label}</span>
                    <span style={{ color: 'var(--re-teal)' }}>{bar.pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 100, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${bar.pct}%`, background: 'linear-gradient(90deg, var(--re-teal), var(--re-teal-light))', borderRadius: 100 }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12, background: 'rgba(32,178,200,0.08)', border: '1px solid var(--re-border)', borderRadius: 'var(--re-radius)', padding: 24 }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                  🏭 <strong style={{ color: 'white' }}>Our Facility:</strong> B/35, Industrial Estate, Rourkela — equipped with 20ft lathe machines, core pressing facilities, VPI systems, and comprehensive testing equipment for all categories of heavy electrical machines.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="pub-cta-banner">
        <h2>Work With a Trusted Partner</h2>
        <p>
          Get in touch with our team to discuss your electrical maintenance and repair requirements.
          We're ready to serve you.
        </p>
        <div className="pub-cta-actions">
          <Link to="/contact-us" className="pub-btn" style={{ background: 'white', color: 'var(--re-teal)', fontWeight: 700 }}>
            Contact Us Today →
          </Link>
          <Link to="/our-services" className="pub-btn pub-btn-outline" style={{ borderColor: 'rgba(255,255,255,0.5)' }}>
            Explore Services
          </Link>
        </div>
      </div>
    </PublicLayout>
  )
}
