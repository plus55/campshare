// Shared site behaviour
document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav toggle
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }

  // Footer year
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Newsletter form — sends to API
  document.querySelectorAll('.cta-form').forEach(f => {
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const input = f.querySelector('input');
      const btn = f.querySelector('button');
      const email = input.value.trim();
      if (!email) return;
      const originalText = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;
      try {
        const res = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        if (!res.ok) throw new Error('Failed');
        btn.textContent = 'Subscribed ✓';
        input.value = '';
        setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 4000);
      } catch (err) {
        btn.textContent = originalText;
        btn.disabled = false;
        alert('Something went wrong. Please try again or email hello@campshare.co.nz');
      }
    });
  });

  // Booking demo — total calculation
  const startEl = document.getElementById('book-start');
  const endEl = document.getElementById('book-end');
  const totalEl = document.getElementById('book-total');
  const priceEl = document.getElementById('book-price');
  if (startEl && endEl && totalEl && priceEl) {
    const price = parseFloat(priceEl.dataset.price || '0');
    const update = () => {
      const s = new Date(startEl.value);
      const e = new Date(endEl.value);
      if (!isNaN(s) && !isNaN(e) && e > s) {
        const nights = Math.round((e - s) / 86400000);
        totalEl.textContent = `$${(nights * price).toLocaleString()} · ${nights} night${nights !== 1 ? 's' : ''}`;
      } else {
        totalEl.textContent = 'Pick dates to see total';
      }
    };
    startEl.addEventListener('change', update);
    endEl.addEventListener('change', update);
  }

  // Earnings calculator
  const calcInput = document.getElementById('calc-days');
  const calcResult = document.getElementById('calc-result');
  if (calcInput && calcResult) {
    const update = () => {
      const days = Math.max(0, Math.min(180, parseFloat(calcInput.value) || 0));
      const avgNight = 175;
      const hostKeep = 0.80; // 20% platform fee
      const earnings = Math.round(days * avgNight * hostKeep);
      calcResult.innerHTML = `<strong>$${earnings.toLocaleString()}</strong><span>estimated annual earnings · based on $${avgNight}/night average</span>`;
    };
    calcInput.addEventListener('input', update);
    update();
  }

  // FAQ filter
  document.querySelectorAll('.faq-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      document.querySelectorAll('.faq-cat').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.faq-item').forEach(item => {
        item.style.display = (cat === 'all' || item.dataset.cat === cat) ? '' : 'none';
      });
    });
  });
});
