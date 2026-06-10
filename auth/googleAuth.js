// Google OAuth 2.0 (GSI) による認証モジュール
// CLIENT_ID は GitHub Pages デプロイ前に自分のものに差し替えてください

export const AUTH_CONFIG = {
  // TODO: Google Cloud Console で取得した OAuth クライアントIDに差し替える
  CLIENT_ID: '863920891696-cov5p2hv8fir7q06mlg645ilusg69q64.apps.googleusercontent.com', // ← コピーしたIDに差し替えてください
};

let _currentUser = null; // { id, name, email, token }

export async function initAuth() {
  return new Promise((resolve) => {
    // GIS ライブラリ読み込み待ち
    const check = setInterval(() => {
      if (window.google && window.google.accounts) {
        clearInterval(check);
        resolve();
      }
    }, 100);
    // オフライン時などGIS未ロードでも動作するフォールバック
    setTimeout(() => { clearInterval(check); resolve(); }, 3000);
  });
}

export function getCurrentUser() {
  return _currentUser;
}

export function isLoggedIn() {
  return _currentUser !== null;
}

// ワンタップ / ポップアップ でログイン
export function signIn(onSuccess, onError) {
  if (!window.google || !window.google.accounts) {
    onError?.('Google Identity Services が読み込まれていません');
    return;
  }

  window.google.accounts.id.initialize({
    client_id: AUTH_CONFIG.CLIENT_ID,
    callback: (response) => {
      try {
        const payload = _parseJwt(response.credential);
        _currentUser = {
          id:    payload.sub,
          name:  payload.name,
          email: payload.email,
          token: response.credential,
        };
        onSuccess?.(_currentUser);
      } catch (e) {
        onError?.(e.message);
      }
    },
    auto_select: false,
    cancel_on_tap_outside: false,
  });

  window.google.accounts.id.prompt((notification) => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      // ワンタップが表示されない場合はポップアップにフォールバック
      _renderGoogleButton(onSuccess, onError);
    }
  });
}

// ボタンクリック型ログイン（ワンタップ失敗時のフォールバック）
function _renderGoogleButton(onSuccess, onError) {
  const container = document.getElementById('google-btn-container');
  if (!container) return;

  window.google.accounts.id.initialize({
    client_id: AUTH_CONFIG.CLIENT_ID,
    callback: (response) => {
      try {
        const payload = _parseJwt(response.credential);
        _currentUser = {
          id:    payload.sub,
          name:  payload.name,
          email: payload.email,
          token: response.credential,
        };
        onSuccess?.(_currentUser);
      } catch (e) {
        onError?.(e.message);
      }
    },
  });

  window.google.accounts.id.renderButton(container, {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    locale: 'ja',
  });
}

export function signOut() {
  if (_currentUser && window.google?.accounts?.id) {
    window.google.accounts.id.revoke(_currentUser.email, () => {});
  }
  _currentUser = null;
}

// JWT デコード（署名検証なし・ペイロード取得のみ）
function _parseJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}
