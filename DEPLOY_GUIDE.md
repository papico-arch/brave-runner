# BRAVE RUNNER — 公開手順ガイド

初めてGitHubを使う方でも迷わず公開できるよう、ステップごとに説明します。

---

## STEP 1: Google OAuth クライアントIDを取得する

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. 左上「プロジェクトを選択」→「新しいプロジェクト」→ 名前は何でもOK
3. 左メニュー「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuthクライアントID」
4. アプリの種類：「ウェブアプリケーション」を選択
5. 承認済みのJavaScript生成元に以下を追加：
   - `http://localhost` （ローカルテスト用）
   - `https://あなたのGitHubユーザー名.github.io` （公開後）
6. 作成 → クライアントIDをコピー

### コードに反映

`auth/googleAuth.js` の6行目を書き換える：

```js
CLIENT_ID: 'ここにコピーしたクライアントIDを貼り付ける.apps.googleusercontent.com',
```

---

## STEP 2: Google Apps Script（GAS）をデプロイする

1. [Google スプレッドシート](https://sheets.google.com/) を新規作成（名前は「BraveRunner DB」など）
2. メニュー「拡張機能」→「Apps Script」をクリック
3. 表示されたエディタの内容を全て削除し、`gas/Code.gs` の内容を全てコピー＆ペースト
4. 保存（Ctrl+S）
5. 右上「デプロイ」→「新しいデプロイ」
   - 種類：「ウェブアプリ」
   - 実行ユーザー：「自分」
   - アクセスできるユーザー：「全員」
6. 「デプロイ」ボタン → Googleアカウントの認証を許可
7. 表示された「ウェブアプリのURL」をコピー

### コードに反映

`api/gasClient.js` の6行目を書き換える：

```js
const GAS_URL = 'ここにコピーしたGASのURLを貼り付ける';
```

---

## STEP 3: GitHub Pages に公開する

### 3-1. GitHubにサインインしてリポジトリを作る

1. [github.com](https://github.com) にログイン
2. 右上「＋」→「New repository」
3. Repository name：`brave-runner`（半角英数字・ハイフンのみ）
4. Public を選択
5. 「Create repository」をクリック

### 3-2. ファイルをアップロードする

1. 作成されたリポジトリページで「uploading an existing file」をクリック
2. `game craud` フォルダの中身を**全て選択**してドラッグ＆ドロップ
   - ※ `gas/` フォルダは含めなくてOKです（GASは別管理）
3. ページ下部「Commit changes」→「Commit directly to the main branch」
4. 緑のボタン「Commit changes」をクリック

### 3-3. GitHub Pages を有効にする

1. リポジトリページの「Settings」タブをクリック
2. 左メニュー「Pages」をクリック
3. Source：「Deploy from a branch」
4. Branch：「main」、フォルダ：「/ (root)」を選択
5. 「Save」をクリック

数分後、以下のURLでゲームが公開されます：
```
https://あなたのGitHubユーザー名.github.io/brave-runner/
```

---

## STEP 4: Google Sites に埋め込む

1. [Google Sites](https://sites.google.com/) を開き、サイトを作成（または既存のサイトを編集）
2. ページを編集 → 右パネルの「挿入」→「埋め込む」をクリック
3. 「URLを埋め込む」タブを選択
4. 上記の GitHub Pages URL を貼り付け → 「挿入」
5. サイズを調整して「公開」

---

## STEP 5: ガチャ制限を本番モードに切り替える（公開時）

`ui/gacha.js` の9行目を変更：

```js
// テストモード（無制限）
const GACHA_LIMIT = 0;

// ↓ 公開時はこちらに変更
const GACHA_LIMIT = 10; // 1日10回
```

変更後、GitHub のリポジトリページで `ui/gacha.js` を開き、鉛筆アイコンで編集 → Commit します。

---

## よくある質問

**Q: ゲームが表示されない（真っ白）**
→ ブラウザの開発者ツール（F12）→「Console」タブでエラーを確認してください。
　 多くの場合、CLIENT_ID または GAS_URL が未設定です。

**Q: Googleログインボタンが出ない**
→ ローカル（`file://`）では動作しません。GitHub Pages または `localhost` でテストしてください。

**Q: スプレッドシートにデータが入らない**
→ GASのデプロイ設定で「アクセスできるユーザー：全員」になっているか確認してください。

**Q: 将来Firestoreに移行したい**
→ `api/gasClient.js` の `_adapter` オブジェクトの各関数を差し替えるだけです。
　 フロント側のコードは変更不要です。
