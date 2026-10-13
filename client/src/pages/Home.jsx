
import { useState } from 'react'
import { Link } from 'react-router-dom'

const colors = {
  navy: '#102544',
  blue: '#1765b3',
  red: '#df2735',
  lightBlue: '#eaf5ff',
  text: '#53677f',
  white: '#ffffff'
}

const services = [
  {
    icon: '🚑',
    title: 'Emergency Assistance',
    description:
      'Submit emergency medical requests and connect with participating hospitals.'
  },
  {
    icon: '🏥',
    title: 'Hospital Coordination',
    description:
      'Support communication between patients, hospitals and emergency response teams.'
  },
  {
    icon: '📍',
    title: 'Case Monitoring',
    description:
      'Follow the progress of emergency requests through the MediRescue system.'
  },
  {
    icon: '💳',
    title: 'M-Pesa Payments',
    description:
      'Access payment services and review the status of your emergency payments.'
  }
]

const steps = [
  {
    number: '01',
    title: 'Create Your Account',
    description: 'Register as a patient or sign in to your account.'
  },
  {
    number: '02',
    title: 'Request Assistance',
    description: 'Submit emergency details and select a hospital.'
  },
  {
    number: '03',
    title: 'Follow Your Case',
    description: 'View updates and manage the next steps of your request.'
  }
]

function Home() {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  const button = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    padding: '15px 25px',
    borderRadius: 10,
    textDecoration: 'none',
    fontSize: 15,
    fontWeight: 700,
    transition: 'transform .2s ease'
  }

  const container = {
    width: '100%',
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 24px',
    boxSizing: 'border-box'
  }

  return (
    <div className="medirescue-home">
      <style>{`
        .medirescue-home {
          width: 100%;
          min-height: 100vh;
          font-family: Arial, Helvetica, sans-serif;
          background: #fff;
          color: #102544;
          text-align: left;
        }

        .medirescue-home * {
          box-sizing: border-box;
        }

        .medirescue-home h1,
        .medirescue-home h2,
        .medirescue-home h3 {
          color: #102544 !important;
          line-height: 1.2;
        }
          .medirescue-home .cta-heading {
  color: #ffffff !important;
}

        .medirescue-home .nav-link {
          color: #102544 !important;
          text-decoration: none !important;
          font-size: 14px;
          font-weight: 600;
        }

        .medirescue-home .nav-link:hover {
          color: #df2735 !important;
        }

        .medirescue-home .primary-link {
          color: #fff !important;
          background: #df2735;
          text-decoration: none !important;
        }

        .medirescue-home .primary-link:hover {
          background: #bb1d2b;
        }

        .medirescue-home .secondary-link {
          color: #1765b3 !important;
          background: #fff;
          border: 1px solid #b9d6ee;
          text-decoration: none !important;
        }

        .medirescue-home .hero-title {
          font-size: clamp(38px, 5vw, 66px);
          font-weight: 800;
          letter-spacing: -2px;
          margin: 20px 0;
        }

        .medirescue-home .hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 50px;
        }

        .medirescue-home .doctor-image {
          display: block;
          width: 100%;
          height: 510px;
          object-fit: cover;
          object-position: center;
          border-radius: 26px;
        }

        .medirescue-home .floating-card {
          position: absolute;
          background: white;
          padding: 16px 20px;
          border-radius: 14px;
          box-shadow: 0 12px 35px rgba(16,37,68,.13);
          font-size: 14px;
          font-weight: 700;
          color: #102544;
        }

        .medirescue-home .service-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 22px;
        }

        .medirescue-home .service-card {
          background: #fff;
          border: 1px solid #e1eaf3;
          padding: 30px 24px;
          border-radius: 18px;
          box-shadow: 0 8px 28px rgba(16,37,68,.04);
        }

        .medirescue-home .step-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
        }

        .medirescue-home .step-card {
          background: #fff;
          padding: 30px;
          border-radius: 18px;
          border: 1px solid #dce8f4;
        }

        .medirescue-home .desktop-nav {
          display: flex;
          align-items: center;
          gap: 26px;
        }

        .medirescue-home .mobile-menu-button {
          display: none;
        }

        @media (max-width: 1000px) {
          .medirescue-home .hero-grid {
            grid-template-columns: 1fr;
          }

          .medirescue-home .hero-visual {
            max-width: 650px;
            width: 100%;
            margin: auto;
          }

          .medirescue-home .service-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .medirescue-home .mobile-menu-button {
            display: block;
            background: white;
            border: 1px solid #dce8f4;
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 20px;
            color: #102544;
            cursor: pointer;
          }

          .medirescue-home .desktop-nav {
            display: none;
            width: 100%;
            flex-direction: column;
            align-items: stretch;
            gap: 18px;
            padding: 20px 0;
          }

          .medirescue-home .desktop-nav.open {
            display: flex;
          }

          .medirescue-home .hero-title {
            letter-spacing: -1px;
          }

          .medirescue-home .doctor-image {
            height: 350px;
          }

          .medirescue-home .service-grid,
          .medirescue-home .step-grid {
            grid-template-columns: 1fr;
          }

          .medirescue-home .floating-card {
            padding: 12px;
            font-size: 12px;
          }
        }
      `}</style>

      {/* TOP INFORMATION BAR */}
      <div
        style={{
          background: colors.navy,
          color: 'white',
          padding: '10px 0',
          fontSize: 13
        }}
      >
        <div
          style={{
            ...container,
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          <span>
            ✚ Emergency Medical Response Management
          </span>
          <span>
            Supporting safer, faster emergency coordination
          </span>
        </div>
      </div>

      {/* NAVIGATION */}
      <header
        style={{
          background: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 3px 16px rgba(16,37,68,.06)'
        }}
      >
        <div
          style={{
            ...container,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            minHeight: 86,
            gap: 15
          }}
        >
          <Link
            to="/"
            onClick={closeMenu}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: colors.navy,
              textDecoration: 'none',
              fontSize: 25,
              fontWeight: 800
            }}
          >
            <span style={{ color: colors.red, fontSize: 32 }}>
              ✚
            </span>
            <span>
              Medi<span style={{ color: colors.red }}>Rescue</span>
            </span>
          </Link>

          <button
            className="mobile-menu-button"
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>

          <nav
            className={`desktop-nav ${menuOpen ? 'open' : ''}`}
          >
            <a
              className="nav-link"
              href="#home"
              onClick={closeMenu}
            >
              Home
            </a>

            <a
              className="nav-link"
              href="#about"
              onClick={closeMenu}
            >
              About
            </a>

            <a
              className="nav-link"
              href="#services"
              onClick={closeMenu}
            >
              Services
            </a>

            <a
              className="nav-link"
              href="#how-it-works"
              onClick={closeMenu}
            >
              How It Works
            </a>

            <a
              className="nav-link"
              href="#contact"
              onClick={closeMenu}
            >
              Contact
            </a>

            <Link
              className="nav-link"
              to="/login"
              onClick={closeMenu}
            >
              Login
            </Link>

            <Link
              className="primary-link"
              to="/register"
              onClick={closeMenu}
              style={{
                ...button,
                padding: '12px 23px'
              }}
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section
        id="home"
        style={{
          background:
            'linear-gradient(120deg, #f3faff 0%, #e3f2ff 65%, #f9fcff 100%)',
          padding: '90px 0 105px',
          overflow: 'hidden'
        }}
      >
        <div style={container}>
          <div className="hero-grid">
            <div>
              <div
                style={{
                  display: 'inline-block',
                  background: '#d9ecff',
                  color: colors.blue,
                  borderRadius: 30,
                  padding: '10px 17px',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 1
                }}
              >
                ● YOUR EMERGENCY RESPONSE PARTNER
              </div>

              <h1 className="hero-title">
                Your Safety.
                <br />
                Our <span style={{ color: colors.red }}>
                  Priority.
                </span>
                <br />
                <span style={{ color: colors.blue }}>
                  Every Second Counts.
                </span>
              </h1>

              <p
                style={{
                  color: colors.text,
                  fontSize: 18,
                  lineHeight: 1.85,
                  maxWidth: 550,
                  marginBottom: 32
                }}
              >
                MediRescue connects patients with
                participating hospitals and emergency
                response teams through one coordinated
                digital platform.
              </p>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 15
                }}
              >
                <Link
                  to="/login"
                  className="primary-link"
                  style={button}
                >
                  🚑 Request Emergency Help
                </Link>

                <a
                  href="#about"
                  className="secondary-link"
                  style={button}
                >
                  Learn More →
                </a>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 28,
                  marginTop: 46
                }}
              >
                <div>
                  <strong
                    style={{
                      fontSize: 27,
                      color: colors.navy
                    }}
                  >
                    24/7
                  </strong>
                  <p
                    style={{
                      fontSize: 13,
                      color: colors.text
                    }}
                  >
                    Digital Request Access
                  </p>
                </div>

                <div>
                  <strong
                    style={{
                      fontSize: 27,
                      color: colors.navy
                    }}
                  >
                    One
                  </strong>
                  <p
                    style={{
                      fontSize: 13,
                      color: colors.text
                    }}
                  >
                    Coordinated Platform
                  </p>
                </div>
              </div>
            </div>

            {/* MEDICAL HERO IMAGE */}
            <div
              className="hero-visual"
              style={{
                position: 'relative',
                padding: '15px'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: '5% 0 0 8%',
                  background: '#cce6fa',
                  borderRadius: 35,
                  transform: 'rotate(4deg)'
                }}
              />

              <img
                className="doctor-image"
                src="https://images.pexels.com/photos/6129507/pexels-photo-6129507.jpeg?auto=compress&cs=tinysrgb&w=1000"
                alt="Healthcare professionals"
                style={{
                  position: 'relative',
                  zIndex: 1
                }}
              />

              <div
                className="floating-card"
                style={{
                  top: 30,
                  right: -5,
                  zIndex: 2
                }}
              >
                🏥 Hospital Coordination
                <div
                  style={{
                    color: colors.text,
                    fontSize: 12,
                    fontWeight: 400,
                    marginTop: 5
                  }}
                >
                  Connected emergency care
                </div>
              </div>

              <div
                className="floating-card"
                style={{
                  bottom: 30,
                  left: -8,
                  zIndex: 2
                }}
              >
                <span style={{ color: colors.red }}>
                  ♥
                </span>
                {' '}Emergency Response
                <div
                  style={{
                    color: colors.text,
                    fontSize: 12,
                    fontWeight: 400,
                    marginTop: 5
                  }}
                >
                  Request • Coordinate • Monitor
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section
        id="about"
        style={{
          padding: '95px 0',
          background: 'white'
        }}
      >
        <div style={container}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 55,
              alignItems: 'center'
            }}
          >
            <div>
              <img
                src="https://images.pexels.com/photos/263402/pexels-photo-263402.jpeg?auto=compress&cs=tinysrgb&w=1000"
                alt="Hospital medical environment"
                style={{
                  width: '100%',
                  height: 370,
                  objectFit: 'cover',
                  borderRadius: 24
                }}
              />
            </div>

            <div>
              <p
                style={{
                  color: colors.red,
                  fontWeight: 800,
                  letterSpacing: 1.5,
                  fontSize: 13
                }}
              >
                ABOUT MEDIRESCUE
              </p>

              <h2
                style={{
                  fontSize: 'clamp(28px, 4vw, 42px)',
                  margin: '15px 0 20px'
                }}
              >
                Better Emergency Coordination
                Through Technology
              </h2>

              <p
                style={{
                  color: colors.text,
                  lineHeight: 1.9,
                  fontSize: 16
                }}
              >
                MediRescue is a digital emergency medical
                response management system designed to
                simplify emergency requests, hospital
                coordination and case management.
              </p>

              <p
                style={{
                  color: colors.text,
                  lineHeight: 1.9,
                  fontSize: 16
                }}
              >
                The platform provides dedicated interfaces
                for patients, hospital staff and system
                administrators.
              </p>

              <a
                href="#how-it-works"
                className="primary-link"
                style={{
                  ...button,
                  marginTop: 16
                }}
              >
                Discover How It Works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section
        id="services"
        style={{
          background: '#f4f9fd',
          padding: '95px 0'
        }}
      >
        <div style={container}>
          <div
            style={{
              textAlign: 'center',
              marginBottom: 45
            }}
          >
            <p
              style={{
                color: colors.red,
                fontWeight: 800,
                letterSpacing: 1.5,
                fontSize: 13
              }}
            >
              OUR SERVICES
            </p>

            <h2
              style={{
                fontSize: 'clamp(28px, 4vw, 42px)',
                margin: '12px 0'
              }}
            >
              How MediRescue Helps
            </h2>

            <p
              style={{
                color: colors.text,
                fontSize: 16
              }}
            >
              Essential digital tools for emergency
              medical response management.
            </p>
          </div>

          <div className="service-grid">
            {services.map((service) => (
              <article
                key={service.title}
                className="service-card"
              >
                <div
                  style={{
                    width: 65,
                    height: 65,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 16,
                    background: '#eaf5ff',
                    fontSize: 32,
                    marginBottom: 24
                  }}
                >
                  {service.icon}
                </div>

                <h3
                  style={{
                    fontSize: 19,
                    marginBottom: 13
                  }}
                >
                  {service.title}
                </h3>

                <p
                  style={{
                    color: colors.text,
                    fontSize: 14,
                    lineHeight: 1.8
                  }}
                >
                  {service.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        style={{
          background: '#fff',
          padding: '95px 0'
        }}
      >
        <div style={container}>
          <div
            style={{
              textAlign: 'center',
              marginBottom: 45
            }}
          >
            <p
              style={{
                color: colors.red,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: 1.5
              }}
            >
              GETTING STARTED
            </p>

            <h2
              style={{
                fontSize: 'clamp(28px, 4vw, 42px)'
              }}
            >
              How MediRescue Works
            </h2>
          </div>

          <div className="step-grid">
            {steps.map((step) => (
              <div
                key={step.number}
                className="step-card"
              >
                <div
                  style={{
                    fontSize: 37,
                    color: colors.red,
                    fontWeight: 800,
                    marginBottom: 20
                  }}
                >
                  {step.number}
                </div>

                <h3
                  style={{
                    fontSize: 20,
                    marginBottom: 12
                  }}
                >
                  {step.title}
                </h3>

                <p
                  style={{
                    color: colors.text,
                    lineHeight: 1.8,
                    fontSize: 15
                  }}
                >
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EMERGENCY CTA */}
      <section
        style={{
          background:
            'linear-gradient(110deg, #1765b3, #102544)',
          padding: '80px 24px',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            maxWidth: 800,
            margin: '0 auto'
          }}
        ><h2
  style={{
    color: '#ffffff',
    fontSize: 'clamp(30px, 4vw, 43px)',
    marginBottom: 20
  }}
  className="cta-heading"
>
            <span style={{ color: '#fff' }}>
              Need Emergency Medical Assistance?
            </span>
          </h2>

          <p
            style={{
              color: '#d9eafa',
              fontSize: 17,
              lineHeight: 1.8,
              marginBottom: 30
            }}
          >
            Sign in to MediRescue to submit and manage
            your emergency request.
          </p>

          <Link
            to="/login"
            className="primary-link"
            style={button}
          >
            🚑 Request Assistance
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        id="contact"
        style={{
          background: '#0b1b32',
          color: '#c7d5e5',
          padding: '65px 0 25px'
        }}
      >
        <div style={container}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 40,
              paddingBottom: 45
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 26,
                  marginBottom: 18
                }}
              >
                <span style={{ color: '#fff' }}>
                  ✚ MediRescue
                </span>
              </h2>

              <p
                style={{
                  lineHeight: 1.8,
                  fontSize: 14
                }}
              >
                A digital emergency medical response
                management platform.
              </p>
            </div>

            <div>
              <h3
                style={{
                  color: '#fff',
                  fontSize: 17
                }}
              >
                Quick Links
              </h3>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 13,
                  marginTop: 20
                }}
              >
                <a href="#home" style={{ color: '#c7d5e5' }}>
                  Home
                </a>
                <a href="#about" style={{ color: '#c7d5e5' }}>
                  About Us
                </a>
                <a href="#services" style={{ color: '#c7d5e5' }}>
                  Services
                </a>
                <Link to="/login" style={{ color: '#c7d5e5' }}>
                  Login
                </Link>
              </div>
            </div>

            <div>
              <h3
                style={{
                  color: '#fff',
                  fontSize: 17
                }}
              >
                Emergency Information
              </h3>

              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.8,
                  marginTop: 20
                }}
              >
                MediRescue is a project platform.
                For immediate life-threatening emergencies,
                contact local emergency services directly.
              </p>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid #28405d',
              paddingTop: 25,
              textAlign: 'center',
              fontSize: 13
            }}
          >
            © {new Date().getFullYear()} MediRescue.
            All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home
