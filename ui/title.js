import { signIn }      from '../auth/googleAuth.js';
import { router }      from './router.js';

export function renderTitle() {
  const el = document.getElementById('screen-title');
  el.innerHTML = `
<style>
#screen-title {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0d0d2e;
  position: relative;
  overflow: hidden;
}
.title-stars {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(1px 1px at 10% 15%, #fff 0%, transparent 100%),
    radial-gradient(1px 1px at 30% 8%,  #fff 0%, transparent 100%),
    radial-gradient(1px 1px at 55% 20%, #fff 0%, transparent 100%),
    radial-gradient(1px 1px at 75% 5%,  #fff 0%, transparent 100%),
    radial-gradient(1px 1px at 90% 30%, #fff 0%, transparent 100%),
    radial-gradient(1px 1px at 20% 40%, #aaa 0%, transparent 100%),
    radial-gradient(1px 1px at 65% 35%, #fff 0%, transparent 100%),
    radial-gradient(1px 1px at 45% 55%, #ccc 0%, transparent 100%),
    radial-gradient(1px 1px at 80% 60%, #aaa 0%, transparent 100%),
    radial-gradient(1px 1px at 5%  70%, #fff 0%, transparent 100%);
  pointer-events: none;
}
.title-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  animation: fadeIn 0.6s ease-out;
}
.title-hero {
  animation: bounce 1s ease-in-out infinite alternate;
  margin-bottom: 16px;
}
.title-logo {
  font-family: var(--font-pixel);
  font-size: clamp(16px, 4vw, 24px);
  color: var(--accent-gold);
  text-shadow: 3px 3px 0 var(--accent-gold-dark);
  text-align: center;
  line-height: 1.7;
  margin-bottom: 8px;
}
.title-sub {
  font-family: var(--font-pixel);
  font-size: clamp(8px, 1.5vw, 10px);
  color: var(--text-muted);
  letter-spacing: 3px;
  margin-bottom: 40px;
}
#google-btn-container {
  min-width: 240px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-login-fallback {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  color: #333;
  border: none;
  border-radius: 4px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 3px 0 #aaa;
  transition: transform 0.1s, box-shadow 0.1s;
}
.btn-login-fallback:hover {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #aaa;
}
.title-error {
  margin-top: 16px;
  font-size: 11px;
  color: var(--danger);
  text-align: center;
  max-width: 280px;
}
</style>

<div class="title-stars"></div>
<div class="title-content">
  <div class="title-hero">
    <svg width="80" height="100" viewBox="0 0 16 20" style="image-rendering:pixelated" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="0" width="6" height="2" fill="#c8a020"/>
      <rect x="4" y="1" width="8" height="3" fill="#c8a020"/>
      <rect x="4" y="3" width="8" height="5" fill="#f5c090"/>
      <rect x="5" y="5" width="2" height="1" fill="#2a1a0a"/>
      <rect x="9" y="5" width="2" height="1" fill="#2a1a0a"/>
      <rect x="6" y="7" width="4" height="1" fill="#c06040"/>
      <rect x="4" y="8" width="8" height="5" fill="#3a5a8a"/>
      <rect x="7" y="9" width="2" height="3" fill="#f5c518"/>
      <rect x="6" y="10" width="4" height="1" fill="#f5c518"/>
      <rect x="12" y="8" width="2" height="4" fill="#3a5a8a"/>
      <rect x="2"  y="8" width="2" height="4" fill="#3a5a8a"/>
      <rect x="0"  y="7" width="3" height="6" fill="#7b2a2a"/>
      <rect x="1"  y="8" width="1" height="4" fill="#f5c518"/>
      <rect x="0"  y="9" width="3" height="2" fill="#f5c518"/>
      <rect x="14" y="2" width="1" height="10" fill="#d0d8e0"/>
      <rect x="13" y="7" width="3" height="1"  fill="#c8a020"/>
      <rect x="14" y="11" width="1" height="2" fill="#c8a020"/>
      <rect x="3"  y="9" width="2" height="6" fill="#8a2a2a"/>
      <rect x="11" y="9" width="2" height="6" fill="#8a2a2a"/>
      <rect x="5"  y="13" width="3" height="4" fill="#2a2a4a"/>
      <rect x="8"  y="13" width="3" height="4" fill="#2a2a4a"/>
      <rect x="4"  y="16" width="4" height="2" fill="#1a1a3a"/>
      <rect x="8"  y="16" width="4" height="2" fill="#1a1a3a"/>
      <rect x="4"  y="8"  width="1" height="5" fill="#4a7ab0"/>
      <rect x="4"  y="8"  width="8" height="1" fill="#4a7ab0"/>
    </svg>
  </div>
  <div class="title-logo">BRAVE<br>RUNNER</div>
  <div class="title-sub">- HERO'S DASH -</div>
  <div id="google-btn-container">
    <button class="btn-login-fallback" id="btn-login">
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Googleでログイン
    </button>
  </div>
  <div class="title-error" id="title-error" style="display:none"></div>
</div>`;

  document.getElementById('btn-login').addEventListener('click', () => {
    signIn(
      (user) => {
        // ログイン成功 → ロビーへ
        router.go('lobby', { user });
      },
      (err) => {
        const errEl = document.getElementById('title-error');
        errEl.style.display = 'block';
        errEl.textContent = 'ログインに失敗しました。もう一度お試しください。';
        console.error(err);
      }
    );
  });
}
