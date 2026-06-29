import React, { useState } from 'react'
import PublicLayout from './PublicLayout'

const initialForm = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  service: '',
  message: '',
}

const serviceOptions = [
  'HT Motor Rewinding (3.3KV / 6.6KV / 11KV)',
  'LT Motor Repair & Rewinding',
  'DC Motor Services',
  'Transformer Repair & Reconditioning',
  'Electromagnet Rewinding',
  'Dynamic Balancing',
  'Annual Maintenance Contract (AMC)',
  'On-site Service Request',
  'General Enquiry',
]

const contactDetails = [
  {
    icon: '📍',
    label: 'Workshop Address',
    value: 'B/35, Industrial Estate,\nRourkela – 769004,\nOdisha, India',
    link: null,
  },
  {
    icon: '📞',
    label: 'Phone Numbers',
    value: '+91 9238351331\n+91 9437047731',
    link: 'tel:+919238351331',
  },
  {
    icon: '✉️',
    label: 'Email Address',
    value: 'info@remagelectros.com',
    link: 'mailto:info@remagelectros.com',
  },
  {
    icon: '🕐',
    label: 'Working Hours',
    value: 'Mon – Sat: 9:00 AM – 6:00 PM\nSunday: Closed',
    link: null,
  },
]

export default function PublicContact() {
  const [form, setForm] = useState(initialForm)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    // Simulate submission
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
      setForm(initialForm)
    }, 1200)
  }

  return (
    <PublicLayout>
      {/* Page Hero */}
      <section className="pub-page-hero">
        <div className="pub-page-hero-content">
          <div className="pub-breadcrumb">✦ Reach Out to Us</div>
          <h1>Get in <span>Touch</span></h1>
          <p>
            Have a breakdown, planned maintenance, or general enquiry? Our team is ready to assist
            you with all your electrical repair and rewinding needs.
          </p>
        </div>
      </section>

      {/* Contact Grid */}
      <section className="pub-section">
        <div className="pub-container">
          <div className="pub-contact-grid">
            {/* Contact Info */}
            <div>
              <div className="pub-contact-info-card">
                <div className="pub-contact-info-title">Contact Information</div>
                <div className="pub-contact-info-sub">
                  Reach us directly or fill in the form and we'll get back to you within one business day.
                </div>
                <div className="pub-contact-items">
                  {contactDetails.map((d) => (
                    <div key={d.label} className="pub-contact-info-item">
                      <div className="pub-contact-info-icon">{d.icon}</div>
                      <div>
                        <div className="pub-contact-info-label">{d.label}</div>
                        {d.link ? (
                          <a href={d.link} className="pub-contact-info-val" style={{ display: 'block' }}>
                            {d.value.split('\n').map((line, i) => (
                              <span key={i} style={{ display: 'block' }}>{line}</span>
                            ))}
                          </a>
                        ) : (
                          <div className="pub-contact-info-val">
                            {d.value.split('\n').map((line, i) => (
                              <span key={i} style={{ display: 'block' }}>{line}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Call Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <a
                    href="tel:+919238351331"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
                      background: 'rgba(32,178,200,0.12)', border: '1px solid rgba(32,178,200,0.25)',
                      borderRadius: 10, color: 'var(--re-teal)', fontWeight: 600, fontSize: 14,
                      textDecoration: 'none', transition: 'var(--re-transition)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(32,178,200,0.2)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(32,178,200,0.12)' }}
                  >
                    📞 Call +91 9238351331
                  </a>
                  <a
                    href="mailto:info@remagelectros.com"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
                      background: 'rgba(232,168,56,0.08)', border: '1px solid rgba(232,168,56,0.2)',
                      borderRadius: 10, color: 'var(--re-gold)', fontWeight: 600, fontSize: 14,
                      textDecoration: 'none', transition: 'var(--re-transition)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(232,168,56,0.15)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(232,168,56,0.08)' }}
                  >
                    ✉️ info@remagelectros.com
                  </a>
                </div>

                {/* Map placeholder */}
                <div style={{ marginTop: 24, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ background: 'rgba(32,178,200,0.05)', padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📍</div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>B/35, Industrial Estate</div>
                    <div style={{ color: 'var(--re-teal)', fontSize: 12, fontWeight: 600, marginTop: 4 }}>Rourkela – 769004, Odisha</div>
                    <a
                      href="https://maps.google.com/?q=Industrial+Estate+Rourkela+769004+Odisha"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-block', marginTop: 12, fontSize: 12, color: 'var(--re-teal)', textDecoration: 'none', fontWeight: 600 }}
                    >
                      Open in Google Maps →
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <div className="pub-contact-form-card pub-animate">
                <div className="pub-contact-form-title">Send Us a Message</div>
                <div className="pub-contact-form-sub">
                  Fill in the details below and one of our engineers will get back to you shortly.
                </div>

                {submitted ? (
                  <div className="pub-form-success">
                    <div style={{ fontSize: 28, marginBottom: 12 }}>✅</div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Message Received!</div>
                    <div style={{ fontSize: 14, fontWeight: 400, color: 'var(--re-text-muted)' }}>
                      Thank you for reaching out. Our team will respond within one business day.
                    </div>
                    <button
                      onClick={() => setSubmitted(false)}
                      style={{ marginTop: 16, background: 'var(--re-teal)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="pub-form-row">
                      <div className="pub-form-group">
                        <label className="pub-form-label" htmlFor="contact-name">Full Name *</label>
                        <input
                          id="contact-name"
                          className="pub-form-input"
                          type="text"
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          placeholder="Your full name"
                          required
                        />
                      </div>
                      <div className="pub-form-group">
                        <label className="pub-form-label" htmlFor="contact-phone">Phone Number *</label>
                        <input
                          id="contact-phone"
                          className="pub-form-input"
                          type="tel"
                          name="phone"
                          value={form.phone}
                          onChange={handleChange}
                          placeholder="+91 XXXXXXXXXX"
                          required
                        />
                      </div>
                    </div>

                    <div className="pub-form-row">
                      <div className="pub-form-group">
                        <label className="pub-form-label" htmlFor="contact-email">Email Address</label>
                        <input
                          id="contact-email"
                          className="pub-form-input"
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="your@email.com"
                        />
                      </div>
                      <div className="pub-form-group">
                        <label className="pub-form-label" htmlFor="contact-service">Service Required</label>
                        <select
                          id="contact-service"
                          className="pub-form-select"
                          name="service"
                          value={form.service}
                          onChange={handleChange}
                        >
                          <option value="">Select a service...</option>
                          {serviceOptions.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="pub-form-group">
                      <label className="pub-form-label" htmlFor="contact-subject">Subject *</label>
                      <input
                        id="contact-subject"
                        className="pub-form-input"
                        type="text"
                        name="subject"
                        value={form.subject}
                        onChange={handleChange}
                        placeholder="e.g. HT Motor Rewinding Enquiry"
                        required
                      />
                    </div>

                    <div className="pub-form-group">
                      <label className="pub-form-label" htmlFor="contact-message">Message *</label>
                      <textarea
                        id="contact-message"
                        className="pub-form-textarea"
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        placeholder="Describe your requirement — motor details, capacity, urgency level, plant location, etc."
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="pub-form-submit"
                      disabled={loading}
                    >
                      {loading ? '⟳ Sending Message...' : '→ Send Message'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Contact Us Section */}
      <section className="pub-section pub-section-alt">
        <div className="pub-container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="pub-section-label" style={{ justifyContent: 'center' }}>Why Reach Out?</div>
            <h2 className="pub-section-title" style={{ textAlign: 'center' }}>
              Fast Response, <span>Expert Support</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { icon: '⚡', title: 'Emergency Breakdown?', desc: 'We prioritize critical breakdown jobs with fast response and around-the-clock support for AMC clients.' },
              { icon: '📋', title: 'Planned Maintenance?', desc: 'Schedule a preventive maintenance visit or full motor overhaul with our engineering team.' },
              { icon: '💰', title: 'Need a Quote?', desc: 'Get a detailed cost estimate for motor rewinding, transformer repair, or any electrical service.' },
            ].map((item, i) => (
              <div
                key={item.title}
                className={`pub-card pub-animate pub-animate-delay-${i + 1}`}
                style={{ padding: 32, textAlign: 'center' }}
              >
                <div style={{ fontSize: 40, marginBottom: 16 }}>{item.icon}</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 800, color: 'var(--re-dark)', marginBottom: 10 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: 'var(--re-text-muted)', lineHeight: 1.7 }}>{item.desc}</div>
              </div>
            ))}
          </div>

          {/* States we serve */}
          <div style={{ marginTop: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--re-text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>States We Serve</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['Odisha', 'Jharkhand', 'Chhattisgarh', 'West Bengal', 'Andhra Pradesh', 'Telangana', 'Maharashtra'].map((state) => (
                <span
                  key={state}
                  style={{
                    background: 'rgba(32,178,200,0.08)',
                    border: '1px solid rgba(32,178,200,0.15)',
                    borderRadius: 100,
                    padding: '8px 18px',
                    fontSize: 13,
                    color: 'var(--re-teal)',
                    fontWeight: 600,
                  }}
                >
                  📍 {state}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="pub-cta-banner">
        <h2>Let's Get Your Equipment Running.</h2>
        <p>
          Whether it's a critical breakdown or a scheduled repair — our team of experienced engineers
          is just a call away.
        </p>
        <div className="pub-cta-actions">
          <a href="tel:+919238351331" className="pub-btn" style={{ background: 'white', color: 'var(--re-teal)', fontWeight: 700 }}>
            📞 Call Now: +91 9238351331
          </a>
          <a href="mailto:info@remagelectros.com" className="pub-btn pub-btn-outline" style={{ borderColor: 'rgba(255,255,255,0.5)' }}>
            ✉️ Email Us
          </a>
        </div>
      </div>
    </PublicLayout>
  )
}
