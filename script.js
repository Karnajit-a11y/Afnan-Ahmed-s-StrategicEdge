/* ==========================================================
   StrategicEdge – Smart Interactions
   Requires: Bootstrap 5 JS bundle (loaded before this file)
   ========================================================== */
(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Helpers ---------- */
  const ready = (fn) =>
    document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn);

  // requestAnimationFrame-based throttle for scroll events (performance)
  const rafThrottle = (fn) => {
    let ticking = false;
    return (...args) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        fn(...args);
        ticking = false;
      });
    };
  };

  /* ---------- 0. Inject extra styles (keeps your CSS files untouched) ---------- */
  const injectStyles = () => {
    const css = `
      .reveal {
        opacity: 0;
        transform: translateY(40px);
        transition: opacity .8s ease, transform .8s ease;
      }
      .reveal.is-visible { opacity: 1; transform: none; }

      .navbar.is-scrolled {
        box-shadow: 0 .5rem 1.5rem rgba(0,0,0,.08);
        padding-top: .6rem;
        padding-bottom: .6rem;
      }

      .back-to-top {
        position: fixed; right: 24px; bottom: 24px;
        width: 48px; height: 48px; border-radius: 50%; border: none;
        color: #fff; cursor: pointer; z-index: 1500;
        background: linear-gradient(135deg, #0d6efd, #00d4ff);
        box-shadow: 0 8px 20px rgba(13,110,253,.35);
        opacity: 0; visibility: hidden; transform: translateY(20px);
        transition: all .3s ease;
      }
      .back-to-top.show { opacity: 1; visibility: visible; transform: none; }
      .back-to-top:hover { transform: translateY(-3px); }

      .team-card.tilt { will-change: transform; }

      .ripple {
        position: absolute; border-radius: 50%;
        background: rgba(255,255,255,.5);
        transform: scale(0); animation: ripple-anim .6s linear;
        pointer-events: none;
      }
      @keyframes ripple-anim { to { transform: scale(4); opacity: 0; } }
      .glow-button, .nav-join-btn, .btn { position: relative; overflow: hidden; }

      @media (prefers-reduced-motion: reduce) {
        .reveal { opacity: 1; transform: none; transition: none; }
      }
    `;
    const style = document.createElement('style');
    style.id = 'se-dynamic-styles';
    style.textContent = css;
    document.head.appendChild(style);
  };

  /* ---------- 1. Scroll Progress Bar ---------- */
  const initScrollProgress = () => {
    const bar = document.querySelector('.scroll-progress-bar');
    if (!bar) return;

    const update = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      bar.style.width = (max > 0 ? (el.scrollTop / max) * 100 : 0) + '%';
    };

    window.addEventListener('scroll', rafThrottle(update), { passive: true });
    update();
  };

  /* ---------- 2. Smart Navbar ---------- */
  const initNavbar = () => {
    const nav = document.querySelector('.navbar');
    if (!nav) return;

    const toggle = () => nav.classList.toggle('is-scrolled', window.scrollY > 50);
    window.addEventListener('scroll', rafThrottle(toggle), { passive: true });
    toggle();
  };

  /* ---------- 3. Smooth Scroll (offset for fixed navbar) ---------- */
  const initSmoothScroll = () => {
    const nav = document.querySelector('.navbar');

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const id = link.getAttribute('href');

        // Placeholder links (href="#") should not jump to top
        if (id === '#') {
          e.preventDefault();
          return;
        }

        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();

        const offset = (nav ? nav.offsetHeight : 0) + 10;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;

        window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });

        // Close mobile menu after clicking a link
        const openMenu = document.querySelector('#navbarNav.show');
        if (openMenu && window.bootstrap) {
          bootstrap.Collapse.getOrCreateInstance(openMenu).hide();
        }

        history.replaceState(null, '', id);
      });
    });
  };

  /* ---------- 4. Active Nav Link on Scroll ---------- */
  const initActiveNav = () => {
    const links = document.querySelectorAll('.navbar-nav .nav-link[href^="#"]');
    const sections = [...links]
      .map((l) => document.querySelector(l.getAttribute('href')))
      .filter(Boolean);
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((l) =>
            l.classList.toggle('active', l.getAttribute('href') === '#' + entry.target.id)
          );
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );

    sections.forEach((s) => io.observe(s));
  };

  /* ---------- 5. Scroll Reveal (with stagger) ---------- */
  const initReveal = () => {
    // Add reveal class to cards with a small stagger delay
    document
      .querySelectorAll('.service-card, .team-card, .stat-card, .feature-item')
      .forEach((el, i) => {
        el.classList.add('reveal');
        el.style.transitionDelay = `${(i % 4) * 120}ms`;
      });

    const all = document.querySelectorAll('.reveal');

    if (prefersReducedMotion) {
      all.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.classList.add('is-visible');
          // Clear stagger delay so hover transitions stay snappy
          setTimeout(() => (el.style.transitionDelay = ''), 1000);
          obs.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    all.forEach((el) => io.observe(el));
  };

  /* ---------- 6. Animated Counters ---------- */
  const initCounters = () => {
    const animateCount = (el) => {
      const node = el.firstChild; // text node before <span>+</span>
      if (!node || !/^\d+$/.test(node.textContent.trim())) return; // skip "24/7"

      const end = parseInt(node.textContent, 10);
      const duration = 1600;
      const start = performance.now();

      if (prefersReducedMotion) return;

      const step = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        node.textContent = Math.round(end * eased);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );

    document.querySelectorAll('.stat-card h3').forEach((h) => io.observe(h));
  };

  /* ---------- 7. 3D Tilt on Team Cards (desktop only) ---------- */
  const initTilt = () => {
    if (prefersReducedMotion || window.matchMedia('(hover: none)').matches) return;

    document.querySelectorAll('.team-card').forEach((card) => {
      card.classList.add('tilt');

      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          `perspective(800px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateY(-6px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  };

  /* ---------- 8. Ripple Effect on Buttons ---------- */
  const initRipple = () => {
    if (prefersReducedMotion) return;

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.glow-button, .nav-join-btn, .btn');
      if (!btn) return;

      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const span = document.createElement('span');

      span.className = 'ripple';
      span.style.width = span.style.height = size + 'px';
      span.style.left = e.clientX - r.left - size / 2 + 'px';
      span.style.top = e.clientY - r.top - size / 2 + 'px';

      btn.appendChild(span);
      span.addEventListener('animationend', () => span.remove());
    });
  };

  /* ---------- 9. Back to Top Button ---------- */
  const initBackToTop = () => {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    document.body.appendChild(btn);

    window.addEventListener(
      'scroll',
      rafThrottle(() => btn.classList.toggle('show', window.scrollY > 600)),
      { passive: true }
    );

    btn.addEventListener('click', () =>
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
    );
  };

  /* ---------- 10. Toast Notification ---------- */
  const showToast = (message, type = 'success') => {
    const t = document.createElement('div');
    t.className = `alert alert-${type} shadow`;
    t.setAttribute('role', 'alert');
    t.textContent = message;
    Object.assign(t.style, {
      position: 'fixed',
      top: '100px',
      right: '24px',
      zIndex: 3000,
      minWidth: '260px',
      borderRadius: '12px',
      transition: 'opacity .4s ease',
    });
    document.body.appendChild(t);

    setTimeout(() => {
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 400);
    }, 3500);
  };

  /* ---------- 11. Smart Contact Form ---------- */
  const initContactForm = () => {
    const form = document.querySelector('.contact-form');
    if (!form) return;

    const btn = form.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      form.classList.add('was-validated'); // Bootstrap validation styles

      if (!form.checkValidity()) return;

      btn.disabled = true;
      btn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Sending...';

      // Demo only: replace this timeout with a real request (fetch to your backend, Formspree, EmailJS, etc.)
      setTimeout(() => {
        showToast('Thank you! Your message has been sent. 🎉', 'success');
        form.reset();
        form.classList.remove('was-validated');
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }, 1500);
    });
  };

  /* ---------- Init ---------- */
  ready(() => {
    injectStyles();
    initScrollProgress();
    initNavbar();
    initSmoothScroll();
    initActiveNav();
    initReveal();
    initCounters();
    initTilt();
    initRipple();
    initBackToTop();
    initContactForm();
  });
})();