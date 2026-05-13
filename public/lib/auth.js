import { hasSupabaseConfig, supabase } from './supabase.js';

const protectedRoutes = new Set(['/dashboard', '/history', '/premium', '/account']);
let currentSession = null;

function cleanPath(pathname = window.location.pathname) {
  return pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
}

function authRedirect() {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  return `/?auth=login&next=${next}`;
}

function setStatus(message) {
  document.querySelectorAll('[data-auth-status]').forEach((element) => {
    element.textContent = message || '';
  });
}

function showAuthMode(mode) {
  const login = document.querySelector('[data-auth-form="login"]');
  const signup = document.querySelector('[data-auth-form="signup"]');
  const loginTab = document.querySelector('[data-auth-tab="login"]');
  const signupTab = document.querySelector('[data-auth-tab="signup"]');
  if (!login || !signup) return;
  login.hidden = mode !== 'login';
  signup.hidden = mode !== 'signup';
  loginTab && loginTab.classList.toggle('active', mode === 'login');
  signupTab && signupTab.classList.toggle('active', mode === 'signup');
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  currentSession = data.session || null;
  return currentSession;
}

export function onAuthState(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    currentSession = session || null;
    callback(event, currentSession);
  });
  return () => data.subscription.unsubscribe();
}

export async function signUp(email, password) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard/`
    }
  });
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
  window.location.href = '/';
}

export async function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/`
  });
}

function navLink(label, href, className = '') {
  const link = document.createElement('a');
  link.className = `maplesap-auth-link ${className}`.trim();
  link.href = href;
  link.textContent = label;
  return link;
}

function navButton(label, onClick) {
  const button = document.createElement('button');
  button.className = 'maplesap-auth-button';
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

export function renderAuthNav(session = currentSession) {
  let nav = document.querySelector('[data-maplesap-auth-nav]');
  if (!nav) {
    nav = document.createElement('nav');
    nav.className = 'maplesap-auth-nav';
    nav.setAttribute('data-maplesap-auth-nav', '');
    document.body.appendChild(nav);
  }
  nav.innerHTML = '';

  if (!hasSupabaseConfig) {
    nav.appendChild(navLink('Auth setup needed', '/'));
    return;
  }

  if (session) {
    nav.appendChild(navLink('Dashboard', '/dashboard/'));
    nav.appendChild(navLink('Account', '/account/'));
    nav.appendChild(navButton('Logout', signOut));
    return;
  }

  nav.appendChild(navLink('Login', '/?auth=login'));
  nav.appendChild(navLink('Create Account', '/?auth=signup', 'primary'));
}

export async function protectCurrentRoute() {
  if (!protectedRoutes.has(cleanPath())) return;
  const session = await getSession();
  if (!session) {
    window.location.replace(authRedirect());
  }
}

export function initAuthForms() {
  const shell = document.querySelector('[data-maplesap-auth-shell]');
  if (!shell) return;
  const params = new URLSearchParams(window.location.search);
  const requestedAuth = params.get('auth');
  if (!requestedAuth) return;
  shell.hidden = false;

  if (!hasSupabaseConfig) {
    setStatus('Supabase environment variables are missing. Set MAPLESAP_SUPABASE_URL and MAPLESAP_SUPABASE_ANON_KEY.');
    return;
  }

  document.querySelectorAll('[data-auth-tab]').forEach((button) => {
    button.addEventListener('click', () => showAuthMode(button.dataset.authTab));
  });

  showAuthMode(params.get('auth') === 'signup' ? 'signup' : 'login');

  document.querySelector('[data-auth-form="login"]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('Signing in...');
    const form = new FormData(event.currentTarget);
    const { error } = await signIn(String(form.get('email') || ''), String(form.get('password') || ''));
    if (error) {
      setStatus(error.message);
      return;
    }
    window.location.href = params.get('next') || '/dashboard/';
  });

  document.querySelector('[data-auth-form="signup"]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('Creating account...');
    const form = new FormData(event.currentTarget);
    const { error } = await signUp(String(form.get('email') || ''), String(form.get('password') || ''));
    setStatus(error ? error.message : 'Account created. Check your email to verify your account.');
  });

  document.querySelector('[data-password-reset]')?.addEventListener('click', async () => {
    const email = String(document.querySelector('[data-login-email]')?.value || '').trim();
    if (!email) {
      setStatus('Enter your email above first.');
      return;
    }
    const { error } = await resetPassword(email);
    setStatus(error ? error.message : 'Password reset email sent.');
  });
}

export async function renderDashboard() {
  const root = document.querySelector('[data-maplesap-dashboard]');
  if (!root) return;
  const session = await getSession();
  if (!session) return;
  const email = session.user?.email || 'Signed-in user';

  root.innerHTML = `
    <div class="maplesap-dashboard-panel">
      <p class="maplesap-kicker">MapleSap Account</p>
      <h1>${cleanPath() === '/account' ? 'Account' : cleanPath() === '/history' ? 'History' : cleanPath() === '/premium' ? 'Premium' : 'Dashboard'}</h1>
      <p class="maplesap-muted">Signed in as <strong>${email}</strong>.</p>
      <div class="maplesap-dashboard-grid">
        <section class="maplesap-dashboard-card">
          <h2>Saved locations</h2>
          <p class="maplesap-muted">Your sugarbush locations will appear here.</p>
        </section>
        <section class="maplesap-dashboard-card">
          <h2>Premium status</h2>
          <p class="maplesap-muted">Subscription status placeholder. Stripe is not connected yet.</p>
        </section>
        <section class="maplesap-dashboard-card">
          <h2>Forecast workspace</h2>
          <p class="maplesap-muted">Forecast dashboard placeholder. Existing public predictor logic remains unchanged.</p>
        </section>
      </div>
    </div>
  `;
}

async function init() {
  await protectCurrentRoute();
  const session = await getSession();
  renderAuthNav(session);
  initAuthForms();
  renderDashboard();
  onAuthState((_event, nextSession) => {
    renderAuthNav(nextSession);
  });
}

init();
