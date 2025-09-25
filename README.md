N+ analyzer | note & X Performance Dashboard
noteとX(旧Twitter)のパフォーマンスを統合的に分析し、可視化するためのデータ分析ダッシュボードです。点在するデータを一元管理し、インサイトの発見をサポートします。

✨ 主な機能
データ統合:

noteの記事データをテキスト貼り付けで一括取り込み

X(旧Twitter)のパフォーマンスデータ連携（APIによる速報値・CSVによる確定値）

多彩な可視化:

時系列でのパフォーマンス推移（ビュー、スキ、インプレッションなど）

分類ごとのパフォーマンス比較

記事数やエンゲージメント率の構成比分析

高度な分析:

パイプライン分析による閲覧導線（X→note）と販売率の評価

カスタムKPI設定による柔軟な目標達成度トラッキング

データ管理:

登録済み記事の一覧と、メタデータ（投稿日、分類タグなど）の編集機能

🛠️ 技術スタック
このプロジェクトは、フロントエンドとバックエンドで構成されています。

フロントエンド (note-analyzer-app-frontend)

Framework: React 19

Language: TypeScript

Build Tool: Vite

Styling: CSS Modules

Data Visualization: Recharts

Backend Communication: Firebase SDK

バックエンド (note-analyzer-app/functions)

Platform: Firebase Functions

Language: TypeScript

Database: Cloud Firestore

Authentication: Firebase Authentication

AI: Google Generative AI

🚀 セットアップと実行方法
1. 前提条件
Node.js (v20.x or later)

Firebase CLI

Firebaseプロジェクトがセットアップ済みであること

2. インストール
# リポジトリをクローン
git clone <your-repository-url>
cd <repository-name>

# フロントエンドの依存関係をインストール
cd note-analyzer-app-frontend
npm install

# バックエンド(Firebase Functions)の依存関係をインストール
cd ../note-analyzer-app/functions
npm install

3. 環境設定
FirebaseコンソールでWebアプリを作成し、設定オブジェクト（firebaseConfig）を取得します。

note-analyzer-app-frontend/src/firebase.ts を開き、取得したfirebaseConfigで既存の値を置き換えます。

ローカル環境でFirebaseプロジェクトにログインします。

firebase login
firebase use <your-firebase-project-id>

4. 開発サーバーの起動
2つのターミナルを開いて、それぞれ以下のコマンドを実行します。

ターミナル1: フロントエンド (Vite)

cd note-analyzer-app-frontend
npm run dev

http://localhost:5173 などでアプリケーションにアクセスできます。

ターミナル2: バックエンド (Firebase Emulators)

cd note-analyzer-app
# 'serve'はfunctions/package.json内の 'npm run build && firebase emulators:start --only functions' を実行します。
npm run serve --prefix functions 

Firebase Functionsがローカルでエミュレートされ、フロントエンドからのリクエストを受け付けます。

使い方
データ取り込み: アプリケーションにログイン後、「データ取り込み」ページからnoteの記事テキストを貼り付け、XのCSVをアップロードして初期データを登録します。

データ管理: 「データ管理」ページで、取り込んだ記事の投稿日や分類などを編集・整理します。

分析設定: 「設定」ページで、記事を分類するためのタグや、追跡したいKPIを設定します。

ダッシュボード: 「ダッシュボード」ページで、分析したい期間や分類でフィルタリングし、パフォーマンスを分析します。
