import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--canvas)', color: 'var(--text)', fontFamily: 'var(--font-body)', maxWidth: '100vw', overflowX: 'hidden' }}>
      {/* Header / Navbar */}
      <header 
        className="responsive-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 40px',
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="/logo.png" 
            alt="Xebrightech Logo" 
            style={{ 
              height: '45px', 
              width: '45px', 
              objectFit: 'contain',
              borderRadius: '8px'
            }} 
          />
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--maroon)', margin: 0, letterSpacing: '-0.5px' }}>
              Xebrightech
            </h1>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Innovate · Build · Serve
            </span>
          </div>
        </div>

        <nav className="responsive-nav" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a href="#mission" style={{ color: 'var(--text)', fontWeight: 600, fontSize: '14px' }}>Our Mission</a>
          <a href="#services" style={{ color: 'var(--text)', fontWeight: 600, fontSize: '14px' }}>Services</a>
          <a href="#goals" style={{ color: 'var(--text)', fontWeight: 600, fontSize: '14px' }}>Goals</a>
          <Link to="/login" className="btn btn-primary" style={{ padding: '8px 18px', borderRadius: 'var(--radius-sm)', textDecoration: 'none', color: '#fff', fontSize: '14px' }}>
            Go to Dashboard
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section 
        className="responsive-section"
        style={{
          padding: '80px 20px',
          background: 'linear-gradient(135deg, rgba(128, 0, 32, 0.05) 0%, rgba(255, 255, 255, 1) 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ maxWidth: '800px', zIndex: 2, width: '100%' }}>
          <span style={{
            display: 'inline-block',
            padding: '6px 16px',
            backgroundColor: 'var(--maroon-soft)',
            color: 'var(--maroon)',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '20px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Welcome to Xebrightech
          </span>
          <h2 className="responsive-hero-title" style={{ fontSize: '48px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.15, marginBottom: '24px', letterSpacing: '-1.5px' }}>
            Driving Growth with <span style={{ color: 'var(--maroon)' }}>Digital Solutions & CRM Systems</span>
          </h2>
          <p className="responsive-hero-subtitle" style={{ fontSize: '18px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '32px', maxWidth: '680px', margin: '0 auto 32px' }}>
            At Xebrightech, we are a digital services company providing state-of-the-art SEO development, marketing content creation, autonomous AI agents, cybersecurity, and custom enterprise software development.
          </p>
          <div className="responsive-btn-group" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link to="/login" className="btn btn-primary" style={{ padding: '12px 32px', fontSize: '16px', borderRadius: 'var(--radius)', textDecoration: 'none', color: '#fff', fontWeight: 600 }}>
              Access Employee Desk
            </Link>
            <a href="#services" className="btn btn-ghost" style={{ padding: '12px 32px', fontSize: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, background: 'var(--surface)' }}>
              Explore Services
            </a>
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section id="mission" className="responsive-section" style={{ padding: '80px 20px', backgroundColor: 'var(--surface)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
          <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--maroon)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Who We Are</span>
              <h3 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--ink)', marginBottom: '20px' }}>Our Mission & Core Vision</h3>
              <p style={{ fontSize: '16px', color: 'var(--text)', lineHeight: '1.6', marginBottom: '20px' }}>
                Xebrightech is dedicated to building state-of-the-art technological infrastructures and providing premier digital services that scale operations and empower brands globally.
              </p>
              <p style={{ fontSize: '16px', color: 'var(--text)', lineHeight: '1.6' }}>
                We combine search engine optimization, content creation, cutting-edge artificial intelligence, and secure networking architectures to help modern enterprises dominate their market and collaborate securely.
              </p>
            </div>
            <div style={{ display: 'grid', gap: '20px' }}>
              <div style={{ padding: '24px', background: 'var(--canvas)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--maroon)', marginBottom: '10px' }}>🎯 Customer-Centric Delivery</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Delivering high-value digital services and custom software tools built exactly around user feedback and security standards.</p>
              </div>
              <div style={{ padding: '24px', background: 'var(--canvas)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--maroon)', marginBottom: '10px' }}>🛡️ Security & Audited Quality</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Ensuring complete protection of customer directories, corporate data assets, and robust networking architectures.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="responsive-section" style={{ padding: '80px 20px', backgroundColor: 'var(--canvas)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center', width: '100%' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--maroon)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Capabilities</span>
          <h3 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--ink)', marginBottom: '40px' }}>Services We Deliver</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            <div style={{ padding: '24px', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'left', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>🔍</div>
              <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>SEO Development</h4>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                Rank your products and services at the top of search engine results, driving organic visibility and high-value traffic to your digital platforms.
              </p>
            </div>

            <div style={{ padding: '24px', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'left', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>🎨</div>
              <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>Marketing Content</h4>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                Our creative team produces compelling, high-converting copy, design assets, and marketing content tailored to engage your audience and build brand authority.
              </p>
            </div>

            <div style={{ padding: '24px', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'left', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>🤖</div>
              <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>AI Agents</h4>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                Implement intelligent, autonomous AI agents to automate customer service, handle repetitive operational pipelines, and offer instant assistance.
              </p>
            </div>

            <div style={{ padding: '24px', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'left', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>🛡️</div>
              <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>Cybersecurity</h4>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                Secure, audited authentication pipelines, high-grade database encryption, and penetration testing to keep your customer and corporate data safe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Goals / Target Section */}
      <section id="goals" className="responsive-section" style={{ padding: '80px 20px', backgroundColor: 'var(--surface)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
          <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: '-20px',
                width: '100px',
                height: '100px',
                backgroundColor: 'var(--maroon)',
                opacity: 0.1,
                borderRadius: '50%',
                filter: 'blur(30px)'
              }}></div>
              <img 
                src="/logo.png" 
                alt="Xebrightech Mission Statement" 
                style={{ width: '80%', maxWidth: '280px', display: 'block', margin: '0 auto', opacity: 0.85 }} 
              />
            </div>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--maroon)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Visionary Outlook</span>
              <h3 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--ink)', marginBottom: '20px' }}>Our Strategic Goals</h3>
              
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text)', fontSize: '15px' }}>
                <li>
                  <strong>High Organic Reach:</strong> Powering brands to achieve high Search Engine Optimization results and user engagement.
                </li>
                <li>
                  <strong>Security Assurance:</strong> Complete digital proofing and encryption standards for all corporate communication pipelines.
                </li>
                <li>
                  <strong>Autonomous Operations:</strong> Incorporating smart systems and AI agents to decrease task latency and increase production rates.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        backgroundColor: 'var(--ink)',
        color: '#a1a1aa',
        padding: '30px 20px',
        textAlign: 'center',
        borderTop: '1px solid #27272a'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <img src="/logo.png" alt="Xebrightech Logo" style={{ height: '30px', width: '30px', objectFit: 'contain' }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>Xebrightech</span>
        </div>
        <p style={{ fontSize: '13px', marginBottom: '8px' }}>&copy; {new Date().getFullYear()} Xebrightech. All rights reserved.</p>
        <p style={{ fontSize: '12px' }}>
          Innovating workforce solutions, task boards, SEO strategies, content creation, AI pipelines, and cybersecurity for scaling brands.
        </p>
      </footer>
    </div>
  );
}
