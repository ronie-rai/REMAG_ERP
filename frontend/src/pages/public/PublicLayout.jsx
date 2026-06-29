import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { authStorage } from '../../services/api'
import './public.css'

export default function PublicLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Scroll animation observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible')
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    const elements = document.querySelectorAll('.pub-animate')
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [location.pathname, children])

  const isActive = (path) => location.pathname === path

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/about-us', label: 'About Us' },
    { to: '/our-services', label: 'Services' },
    { to: '/contact-us', label: 'Contact' },
  ]

  return (
    <div style={{ fontFamily: 'var(--font-body)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Info Bar */}
      <div className="pub-topbar">
        <div className="pub-topbar-inner">
          <div className="pub-topbar-contact">
            <a href="tel:+919238351331" className="pub-topbar-item">
              <span className="pub-topbar-icon">📞</span>
              +91 9238351331
            </a>
            <a href="tel:+919437047731" className="pub-topbar-item">
              <span className="pub-topbar-icon">📞</span>
              +91 9437047731
            </a>
            <a href="mailto:info@remagelectros.com" className="pub-topbar-item">
              <span className="pub-topbar-icon">✉️</span>
              info@remagelectros.com
            </a>
          </div>
          <div className="pub-topbar-socials">
            <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" className="pub-social-link" title="YouTube">▶</a>
            <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" className="pub-social-link" title="LinkedIn">in</a>
            <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="pub-social-link" title="Facebook">f</a>
          </div>
        </div>
      </div>

      {/* Sticky Navbar */}
      <nav className="pub-nav" style={{ position: 'sticky' }}>
        <div className="pub-nav-inner">
          <Link to="/" className="pub-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <img src="/logo.png" alt="RE Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
            <div className="pub-logo-text-box">
              <span className="pub-logo-name">Remag Electros</span>
              <span className="pub-logo-tagline">Dependable Rewinders</span>
            </div>
          </Link>

          <button
            className="pub-nav-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>

          <ul className={`pub-nav-links ${menuOpen ? 'open' : ''}`}>
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`pub-nav-link ${isActive(link.to) ? 'active' : ''}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              {authStorage.getToken() ? (
                <Link to="/dashboard" className="pub-nav-link pub-nav-cta">
                  ERP Dashboard →
                </Link>
              ) : (
                <Link to="/login" className="pub-nav-link pub-nav-cta">
                  ERP Login →
                </Link>
              )}
            </li>
          </ul>
        </div>
      </nav>

      {/* Page Content */}
      <main style={{ flex: 1 }}>{children}</main>

      {/* Footer */}
      <footer className="pub-footer">
        <div className="pub-footer-grid">
          {/* Brand Column */}
          <div>
            <Link to="/" className="pub-logo" style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
              <img src="/logo.png" alt="RE Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
              <div className="pub-logo-text-box">
                <span className="pub-logo-name">Remag Electros</span>
                <span className="pub-logo-tagline">Pvt. Ltd.</span>
              </div>
            </Link>
            <p className="pub-footer-brand-desc">
              REMAG stands for a complete service station with in-house facilities, well equipped with modern machinery and testing equipment for heavy electrical machines. Established 1972.
            </p>
            <div className="pub-footer-socials">
              <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" className="pub-social-link" title="YouTube">▶</a>
              <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" className="pub-social-link" title="LinkedIn">in</a>
              <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="pub-social-link" title="Facebook">f</a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <div className="pub-footer-col-title">Quick Links</div>
            <ul className="pub-footer-links">
              <li><Link to="/">→ Home</Link></li>
              <li><Link to="/about-us">→ About Us</Link></li>
              <li><Link to="/our-services">→ Services</Link></li>
              <li><Link to="/contact-us">→ Contact Us</Link></li>
              {authStorage.getToken() ? (
                <li><Link to="/dashboard">→ ERP Dashboard</Link></li>
              ) : (
                <li><Link to="/login">→ ERP Login</Link></li>
              )}
            </ul>
          </div>

          {/* Services */}
          <div>
            <div className="pub-footer-col-title">Services</div>
            <ul className="pub-footer-links">
              <li><Link to="/our-services">→ HT Motor Rewinding</Link></li>
              <li><Link to="/our-services">→ LT Motor Repair</Link></li>
              <li><Link to="/our-services">→ DC Motor Services</Link></li>
              <li><Link to="/our-services">→ Transformer Repair</Link></li>
              <li><Link to="/our-services">→ Electromagnet Rewinding</Link></li>
              <li><Link to="/our-services">→ Dynamic Balancing</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div className="pub-footer-col-title">Contact Us</div>
            <div className="pub-footer-contact-item">
              <span className="pub-footer-contact-icon">📍</span>
              <span>B/35, Industrial Estate,<br />Rourkela - 769004,<br />Odisha, India</span>
            </div>
            <div className="pub-footer-contact-item">
              <span className="pub-footer-contact-icon">📞</span>
              <span>
                <a href="tel:+919238351331">+91 9238351331</a><br />
                <a href="tel:+919437047731">+91 9437047731</a>
              </span>
            </div>
            <div className="pub-footer-contact-item">
              <span className="pub-footer-contact-icon">✉️</span>
              <a href="mailto:info@remagelectros.com">info@remagelectros.com</a>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '20px 24px' }}>
          <div className="pub-footer-bottom-inner" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
            <span>© 2026 Remag Electros Pvt. Ltd. All rights reserved.</span>
            <span>Established 1972 · Rourkela, Odisha</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
