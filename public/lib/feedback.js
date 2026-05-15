const formHost = document.createElement('section');
formHost.className = 'maplesap-feedback';
formHost.innerHTML = `
  <div class="maplesap-feedback-inner">
    <h2>MapleSap field feedback</h2>
    <form id="maplesap-feedback-form" novalidate>
      <label>Email <input name="email" type="email" autocomplete="email"></label>
      <label>Region <input name="region" autocomplete="address-level1"></label>
      <label>Message <textarea name="message" required minlength="3"></textarea></label>
      <button type="submit">Send feedback</button>
      <div id="maplesap-feedback-status" role="status"></div>
    </form>
  </div>
`;

document.body.appendChild(formHost);

const form = document.getElementById('maplesap-feedback-form');
const status = document.getElementById('maplesap-feedback-status');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = 'Sending...';
  const payload = Object.fromEntries(new FormData(form).entries());
  if (!String(payload.message || '').trim()) {
    status.textContent = 'Message is required.';
    return;
  }
  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || 'Feedback failed.');
    form.reset();
    status.textContent = 'Feedback saved.';
  } catch (error) {
    status.textContent = error.message || 'Feedback failed.';
  }
});
