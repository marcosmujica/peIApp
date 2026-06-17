import React from 'react';
import './index.css';

function App() {
  return (
    <div className="app">
      {/* Navbar */}
      <header className="container">
        <nav className="navbar">
          <div className="navbar-brand">
            <img src="/favicon.png" alt="PeIApp Logo" className="app-logo" /> PeIApp
          </div>
          <div className="navbar-nav">
            <a href="#features" className="nav-link">Beneficios</a>
            <a href="#calma-ia" className="nav-link">Calma IA</a>
            <a href="#download" className="nav-link">Descargar App</a>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero container">
        <div className="animate-fade-in-up">
          <div className="hero-badge">100% Gratis para Android & iOS</div>
          <h1 className="hero-title">Calma Financiera para ti y tu negocio</h1>
          <p className="hero-subtitle">
            Gestiona tus ingresos, gastos, cobros y pagos fácilmente. Organiza tus finanzas con billeteras digitales y tickets inteligentes sin costo alguno.
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary">Descargar en Google Play</button>
            <button className="btn btn-secondary">Descargar en App Store</button>
          </div>
        </div>
        
        <div className="mockup-showcase animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <img src="/peiapp_dashboard.png" alt="PeIApp Dashboard" className="mockup-main" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Todo lo que necesitas, en un solo lugar</h2>
            <p className="section-subtitle">PeIApp simplifica tu vida financiera con herramientas intuitivas.</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💼</div>
              <h3 className="feature-title">Billeteras Inteligentes</h3>
              <p className="feature-text">
                Crea billeteras personales, compartidas o para tu negocio. Controla los saldos y movimientos de cada aspecto de tu vida por separado.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🧾</div>
              <h3 className="feature-title">Tickets de Cobro y Pago</h3>
              <p className="feature-text">
                Genera tickets financieros, compártelos a través de enlaces públicos (PeiLinks) y mantén un registro claro de quién te debe o a quién le debes.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3 className="feature-title">Chat Integrado</h3>
              <p className="feature-text">
                Comunícate en tiempo real sobre cada ticket. Resuelve dudas, acuerda métodos de pago y mantén el historial de conversación seguro.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Calma IA Section */}
      <section id="calma-ia" className="ai-section">
        <div className="container ai-container">
          <div className="ai-content">
            <div className="ai-badge">✨ Potenciado por Inteligencia Artificial</div>
            <h2 className="ai-title">Conoce a Calma IA</h2>
            <p className="ai-text">
              Nuestra IA categoriza automáticamente tus gastos y predice los rubros de tus movimientos.
              Hazle consultas sobre tus finanzas y obtén resúmenes automáticos que te ayudarán a tomar mejores decisiones financieras sin esfuerzo.
            </p>
            <button className="btn btn-primary">Descubre cómo funciona</button>
          </div>
          <div className="ai-image">
            <img src="/peiapp_ai.png" alt="Calma IA Chat" className="ai-mockup" />
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="download">
        <div className="container">
          <h2>Empieza a mejorar tus finanzas hoy</h2>
          <p>Únete a miles de emprendedores y personas que ya gestionan sus ingresos y pagos con PeIApp, completamente gratis.</p>
          <div className="hero-cta" style={{ marginBottom: 0 }}>
            <button className="btn btn-secondary" style={{ color: '#196342', backgroundColor: 'white' }}>Consíguelo en Google Play</button>
            <button className="btn btn-secondary" style={{ color: '#196342', backgroundColor: 'white' }}>Consíguelo en App Store</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-content">
          <div className="footer-logo">
            <img src="/favicon.png" alt="PeIApp Logo" className="app-logo" /> PeIApp
          </div>
          <div className="footer-text">
            © {new Date().getFullYear()} PeIApp. Todos los derechos reservados.
          </div>
          <div className="footer-links" style={{ display: 'flex', gap: '16px' }}>
            <a href="#" className="nav-link">Privacidad</a>
            <a href="#" className="nav-link">Términos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
