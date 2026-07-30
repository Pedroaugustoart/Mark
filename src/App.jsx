import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, Clock, MessageSquare, MapPin, Plus } from 'lucide-react';
import './App.css';

function App() {
  const [scrolled, setScrolled] = useState(false);
  
  // Update formState to handle arrays for multiple selection
  const [formState, setFormState] = useState({
    nome: '',
    telefone: '',
    dias: [],
    horarios: []
  });

  const DIAS_DA_SEMANA = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
  const PERIODOS = ['Manhã (08:00 - 12:00)', 'Tarde (13:30 - 18:00)'];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'telefone') {
      const onlyNums = value.replace(/[^\d]/g, '');
      let formatted = onlyNums;
      if (onlyNums.length <= 11) {
        formatted = onlyNums.replace(/^(\d{2})(\d{4,5})(\d{4}).*/, '($1) $2-$3');
      }
      setFormState({ ...formState, [name]: formatted });
      return;
    }
    setFormState({ ...formState, [name]: value });
  };

  const toggleSelection = (field, value) => {
    setFormState(prev => {
      const array = prev[field];
      if (array.includes(value)) {
        return { ...prev, [field]: array.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...array, value] };
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formState.dias.length === 0 || formState.horarios.length === 0) {
      alert("Por favor, selecione ao menos um dia e um período de preferência.");
      return;
    }
    alert(`Obrigado ${formState.nome}. Sua reserva para os dias ${formState.dias.join(', ')} no período da ${formState.horarios.join(', ')} foi registrada.`);
    setFormState({ nome: '', telefone: '', dias: [], horarios: [] });
  };

  const scrollToForm = () => {
    document.getElementById('reserva').scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <header className={`header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container header-container">
          <div className="logo">
            <span>Prieto</span> & Prieto
          </div>
          <button className="btn" onClick={scrollToForm}>
            Reservar Horário
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg">
          <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2000&auto=format&fit=crop" alt="Ambiente Prieto & Prieto" />
          <div className="hero-overlay"></div>
        </div>
        <div className="container">
          <div className="hero-content animate-fade-in">
            <span className="hero-subtitle">Odontologia de Excelência</span>
            <h1>A arte de <br/>transformar <span className="text-italic">sorrisos.</span></h1>
            <p style={{ marginTop: '2rem', marginBottom: '3rem' }}>
              Descubra um padrão superior em tratamentos odontológicos em Campo Grande. Conforto absoluto, tecnologia de ponta e 40 anos de maestria.
            </p>
            <button className="btn btn-primary" onClick={scrollToForm}>
              Inicie sua jornada
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* SPECIALTIES (Split View like Implantodontia image) */}
      <section className="specialties">
        <div className="specialty-grid">
          <div className="specialty-image-wrapper">
            <img src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=1000&auto=format&fit=crop" alt="Sorriso Perfeito" />
          </div>
          <div className="specialty-content-wrapper">
            <span className="hero-subtitle">Especialidade</span>
            <h2>Implantodontia</h2>
            <p>
              Recuperar os dentes perdidos e voltar a sorrir: um impacto extremamente positivo na vida de qualquer pessoa. Além da aparência e autoestima, também agrega benefícios na saúde.
            </p>
            <ul className="check-list">
              <li><CheckCircle2 size={18} className="icon-check" /> Implantes Cone Morse</li>
              <li><CheckCircle2 size={18} className="icon-check" /> Cirurgias de Carga Imediata</li>
              <li><CheckCircle2 size={18} className="icon-check" /> Levantamento de seio maxilar</li>
              <li><CheckCircle2 size={18} className="icon-check" /> Sedação com médicos anestesistas</li>
            </ul>
            <button className="btn btn-purple" style={{ alignSelf: 'flex-start', marginTop: '1rem' }} onClick={scrollToForm}>
              Consulte nosso especialista
            </button>
          </div>
        </div>
      </section>

      {/* TEAM (Vertical Card with Overlay) */}
      <section className="section team-section">
        <div className="container">
          <div className="animate-fade-in">
            <span className="hero-subtitle">Corpo Clínico</span>
            <h2>Excelência guiada por <br/><span className="text-italic text-gold">mestres.</span></h2>
          </div>
          
          <div className="team-grid animate-fade-in delay-200">
            <div className="team-card">
              {/* Using a placeholder doctor image */}
              <img src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=1000&auto=format&fit=crop" alt="Dr. Prieto" />
              <div className="team-overlay">
                <Plus size={32} color="white" style={{ marginBottom: '1rem' }} />
                <h3>Dr. Prieto</h3>
                <span className="cro">CRO-MS: 12345</span>
                <p className="desc">
                  Idealizador da clínica, é diretor clínico e avaliador. Especialista em Reabilitação Oral e Odontologia Estética com mais de 40 anos de dedicação à arte do sorriso.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RESERVATION FORM (VIP Filter with Multi-select Pills) */}
      <section id="reserva" className="section filter-section">
        <div className="container">
          <div className="filter-grid">
            <div className="filter-content animate-fade-in">
              <span className="hero-subtitle">Concierge</span>
              <h2>Agendamento <br/><span className="text-italic">Exclusivo</span></h2>
              <p style={{ marginTop: '2rem' }}>
                Para garantir uma experiência sem interrupções e com foco total em você, nossos atendimentos são estritamente com hora marcada.
              </p>
              <p>
                Preencha os dados e selecione <strong>uma ou mais opções</strong> de dias e horários. Nossa equipe entrará em contato para confirmar sua reserva.
              </p>
            </div>

            <div className="form-wrapper animate-fade-in delay-200">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="nome">Nome Completo</label>
                  <input 
                    type="text" 
                    id="nome" 
                    name="nome"
                    className="form-control" 
                    placeholder="Como prefere ser chamado(a)?"
                    value={formState.nome}
                    onChange={handleChange}
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="telefone">WhatsApp</label>
                  <input 
                    type="tel" 
                    id="telefone" 
                    name="telefone"
                    className="form-control" 
                    placeholder="(67) 99999-9999"
                    value={formState.telefone}
                    onChange={handleChange}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Selecione os dias (Múltipla escolha)</label>
                  <div className="pill-group">
                    {DIAS_DA_SEMANA.map(dia => (
                      <button 
                        type="button"
                        key={dia}
                        className={`pill-btn ${formState.dias.includes(dia) ? 'active' : ''}`}
                        onClick={() => toggleSelection('dias', dia)}
                      >
                        {dia}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Selecione o período (Múltipla escolha)</label>
                  <div className="pill-group">
                    {PERIODOS.map(periodo => (
                      <button 
                        type="button"
                        key={periodo}
                        className={`pill-btn ${formState.horarios.includes(periodo) ? 'active' : ''}`}
                        onClick={() => toggleSelection('horarios', periodo)}
                      >
                        {periodo}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '2rem' }}>
                  Solicitar Reserva
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* INFINITE CAROUSEL (Photos and Videos placeholder) */}
      <section className="carousel-section">
        <div className="container" style={{ paddingBottom: '3rem', textAlign: 'center' }}>
          <span className="hero-subtitle">Ambiente & Experiência</span>
          <h2>Sinta-se em <span className="text-italic text-gold">casa.</span></h2>
        </div>
        
        <div className="carousel-track">
          {/* We duplicate the items to create the infinite loop effect seamlessly */}
          {[...Array(2)].map((_, i) => (
            <React.Fragment key={i}>
              <div className="carousel-item">
                <img src="https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=400&auto=format&fit=crop" alt="Clínica" />
              </div>
              <div className="carousel-item">
                <img src="https://images.unsplash.com/photo-1598256989800-fea5ce5146f2?q=80&w=400&auto=format&fit=crop" alt="Ambiente" />
              </div>
              <div className="carousel-item">
                {/* Simulated video cover */}
                <img src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=400&auto=format&fit=crop" alt="Paciente" />
              </div>
              <div className="carousel-item">
                <img src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=400&auto=format&fit=crop" alt="Sorriso" />
              </div>
              <div className="carousel-item">
                <img src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=400&auto=format&fit=crop" alt="Tecnologia" />
              </div>
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* CONTACT (Dark Honeycomb Cards) */}
      <section className="section contact-section">
        <div className="container">
          <span className="hero-subtitle">Fale Conosco</span>
          <h2>Pode contar com a <span className="text-italic">gente ;)</span></h2>
          <p style={{ margin: '0 auto', textAlign: 'center' }}>
            Nossa equipe está pronta para receber você e ajudar a deixar o seu sorriso sempre bonito.<br/>
            Para seu maior conforto, atendemos em horários estendidos e também aos sábados.
          </p>
          
          <div className="contact-grid">
            <div className="contact-card">
              <Clock size={32} className="contact-icon" />
              <h4>Horários</h4>
              <p>Segunda a sexta: 08h às 18h</p>
              <p>Sábado: 08h às 12h</p>
            </div>
            <div className="contact-card">
              <MessageSquare size={32} className="contact-icon" />
              <h4>Contato</h4>
              <p>(67) 3382-7373</p>
              <p>(67) 99830-0077</p>
            </div>
            <div className="contact-card">
              <MapPin size={32} className="contact-icon" />
              <h4>Estamos aqui</h4>
              <p>Rua Exemplo, 100 - Bairro Nobre</p>
              <p>Campo Grande - MS, 79000-000</p>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '4rem' }}>
            <button className="btn btn-purple" onClick={scrollToForm}>
              Agende Agora
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Prieto & Prieto Odontologia. Todos os direitos reservados.</p>
            <p>Design por Mark (AGY)</p>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;
