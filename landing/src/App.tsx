import './index.css';
import { Wallet, Users, MessageSquare, Sparkles, ArrowRight, CheckCircle2, Smartphone, Bell, Repeat, TrendingUp } from 'lucide-react';

function App() {
  return (
    <div className="app">
      {/* Background Blobs */}
      <div className="bg-shape bg-shape-1"></div>
      <div className="bg-shape bg-shape-2"></div>
      <div className="bg-shape bg-shape-3"></div>

      {/* Navbar */}
      <header className="container sticky-header">
        <nav className="navbar glass-effect">
          <div className="navbar-brand logo-badge">
            <img src="/favicon.png" alt="PeIApp Logo" className="app-logo" /> 
            <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px' }}>PeIApp</span>
          </div>
          <div className="navbar-nav">
            <a href="#features" className="nav-link">Qué trae</a>
            <a href="#calma-ia" className="nav-link">Calma IA</a>
            <a href="#download" className="btn btn-primary btn-sm">Descargar gratis</a>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero container">
        <div className="hero-content animate-fade-in-up">
          <div className="hero-badge">
            <Sparkles size={16} className="text-primary" />
            <span>La app financiera que tu vida pedía a gritos</span>
          </div>
          <h1 className="hero-title">
            Tomá el control de tu dinero <br/>
            <span className="text-gradient">sin volverte loco.</span>
          </h1>
          <p className="hero-subtitle">
            Billeteras compartidas como la vida misma. Creá tickets, compartí gastos con contactos y dejá que nuestra IA categorice todo en automático. Todo 100% gratis.
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary btn-lg">
              Descargar en Android <ArrowRight size={20} />
            </button>
            <button className="btn btn-secondary btn-lg">
              Descargar en iOS
            </button>
          </div>
          
          <div className="trust-indicators">
            <span className="trust-item"><CheckCircle2 size={16}/> 100% Gratis</span>
            <span className="trust-item"><CheckCircle2 size={16}/> Sin comisiones ocultas</span>
          </div>
        </div>
        
        <div className="mockup-showcase animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="device-frame">
            <img src="/dashboard.png" alt="PeIApp Dashboard" className="mockup-image" onError={(e) => e.currentTarget.src = '/peiapp_dashboard.png'} />
            <div className="device-glare"></div>
          </div>
        </div>
      </section>

      {/* Features Section (Bento Box) */}
      <section id="features" className="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Todo lo que necesitas, ordenado y a la vista</h2>
            <p className="section-subtitle">Diseñado para que entiendas dónde estás parado financieramente, en 3 segundos.</p>
          </div>
          
          <div className="bento-grid">
            {/* Feature 1 - Billeteras Compartidas & División */}
            <div className="bento-card bento-large glass-card">
              <div className="bento-content">
                <div className="feature-icon icon-green">
                  <Wallet size={32} />
                </div>
                <h3 className="feature-title">Billeteras y división de gastos</h3>
                <p className="feature-text">
                  Billeteras como la vida misma. Separá tu plata de la del negocio o compartilas con tus contactos. Dividí automáticamente los gastos en partes y manejá los números en conjunto.
                </p>
              </div>
              <div className="bento-visual bento-visual-right">
                <div className="device-frame-mini">
                  <img src="/tickets.png" alt="Tickets" className="mockup-image" />
                  <div className="device-glare"></div>
                </div>
              </div>
            </div>
            
            {/* Feature 2 - Sin App */}
            <div className="bento-card glass-card card-with-visual">
              <div className="bento-content">
                <div className="feature-icon icon-yellow">
                  <Smartphone size={28} />
                </div>
                <h3 className="feature-title">Sin instalar nada</h3>
                <p className="feature-text">
                  Enviá tickets directo a los contactos de tu celular. Lo mejor: no necesitan tener la app instalada para verlos o interactuar con ellos.
                </p>
              </div>
              <div className="bento-visual bento-visual-bottom">
                <div className="device-frame-mini">
                  <img src="/detalle-ticket.png" alt="Detalle del ticket" className="mockup-image" />
                  <div className="device-glare"></div>
                </div>
              </div>
            </div>
            
            {/* Feature 3 - Chat */}
            <div className="bento-card glass-card card-with-visual">
              <div className="bento-content">
                <div className="feature-icon icon-purple">
                  <MessageSquare size={28} />
                </div>
                <h3 className="feature-title">Chat integrado</h3>
                <p className="feature-text">
                  Cada ticket tiene su propio chat. Dejá registro de todo lo hablado y acordá el pago sin perder info en WhatsApp.
                </p>
              </div>
              <div className="bento-visual bento-visual-bottom">
                <div className="device-frame-mini">
                  <img src="/chat.png" alt="Chat integrado" className="mockup-image" />
                  <div className="device-glare"></div>
                </div>
              </div>
            </div>

            {/* Feature 4 - Recurrentes y Masivos */}
            <div className="bento-card glass-card">
              <div className="bento-content">
                <div className="feature-icon icon-green">
                  <Repeat size={28} />
                </div>
                <h3 className="feature-title">Masivo y Recurrente</h3>
                <p className="feature-text">
                  Creá listas de contactos para enviar tickets masivamente, o configurá tickets recurrentes que se generen solos cada mes.
                </p>
              </div>
            </div>

            {/* Feature 5 - Recordatorios */}
            <div className="bento-card glass-card">
              <div className="bento-content">
                <div className="feature-icon icon-yellow">
                  <Bell size={28} />
                </div>
                <h3 className="feature-title">Recordatorios amables</h3>
                <p className="feature-text">
                  Olvidate de la incomodidad de cobrar. La app ayuda a recordar a tus contactos el pago de tickets pendientes automáticamente.
                </p>
              </div>
            </div>

            {/* Feature 6 - Alertas */}
            <div className="bento-card bento-full glass-card bento-large">
              <div className="bento-content">
                <div className="feature-icon icon-purple">
                  <TrendingUp size={28} />
                </div>
                <h3 className="feature-title">Avisos y situación financiera</h3>
                <p className="feature-text">
                  Mantenete siempre un paso adelante. Recibí avisos de cómo va tu situación financiera para alertarte a tiempo si estás gastando de más.
                </p>
              </div>
              <div className="bento-visual bento-visual-right">
                <div className="device-frame-mini">
                  <img src="/tendencias.png" alt="Tendencias financieras" className="mockup-image" />
                  <div className="device-glare"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Calma IA Section (Dark Mode) */}
      <section id="calma-ia" className="ai-section dark-mode">
        <div className="container ai-container">
          <div className="ai-content">
            <div className="ai-badge glass-badge">
              <Sparkles size={16} className="text-yellow" />
              Tu nuevo socio inteligente
            </div>
            <h2 className="ai-title">Conocé a <span className="text-yellow">Calma IA</span></h2>
            <p className="ai-text">
              Una inteligencia artificial que categoriza tus gastos y los orígenes de tus movimientos de manera completamente automática. 
              Literalmente, finanzas en piloto automático para que vos te enfoques en hacer crecer tu negocio.
            </p>
            <button className="btn btn-yellow btn-lg">Ver Calma IA en acción</button>
          </div>
          <div className="ai-image-wrapper">
            <div className="ai-glow"></div>
            <div className="device-frame ai-frame">
              <img src="/peiapp_ai.png" alt="Calma IA Chat" className="mockup-image" />
              <div className="device-glare"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="download">
        <div className="container download-box glass-card-strong">
          <h2>Empezá a dominar tus finanzas hoy</h2>
          <p>Sumate a los emprendedores que ya dejaron atrás las planillas aburridas. Descargá PeIApp ahora, es 100% gratis.</p>
          <div className="hero-cta justify-center">
            <button className="btn btn-primary btn-lg">Descargar en Google Play</button>
            <button className="btn btn-outline btn-lg">Descargar en App Store</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-content">
          <div className="footer-left">
            <div className="navbar-brand logo-badge">
              <img src="/favicon.png" alt="PeIApp Logo" className="app-logo" /> 
              <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px' }}>PeIApp</span>
            </div>
            <p className="footer-desc">Finanzas con sentido común para emprendedores.</p>
          </div>
          <div className="footer-links-group">
            <div className="footer-col">
              <h4>Producto</h4>
              <a href="#features">Funcionalidades</a>
              <a href="#calma-ia">Calma IA</a>
              <a href="#">Precios</a>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="#">Privacidad</a>
              <a href="#">Términos y Condiciones</a>
            </div>
          </div>
        </div>
        <div className="container">
          <div className="footer-bottom">
            © {new Date().getFullYear()} PeIApp. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
