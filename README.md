# PhotoCollectionViewer

フォルダ単位で画像を管理・表示する Windows 向けデスクトップアプリです。

## 機能

### 画像ビューワー

- Windows フォトビューワー相当の表示（ズーム、パン、回転、フィット、前後ナビゲーション）
- 段階的読み込み（サムネイルプレビュー → 原寸表示）
- 矢印キー（← / →）で前後の画像へ循環移動

### サムネイル一覧

- 指定フォルダ内の画像をグリッド表示
- 遅延読み込み（Intersection Observer）
- ディスクキャッシュ（`userData/thumbnails/` に JPEG 保存）

### フォルダコレクション

- フォルダを画像データの集合体として扱う
- サブフォルダ一覧・ナビゲーション
- サブフォルダを右クリックで新規タブとして開く
- 画像のみのサブフォルダは先頭画像を自動表示

### タブ管理

- タブの追加・閉じる・切り替え
- ドラッグ&ドロップでタブの並び替え
- 閉じたタブの復元（`Ctrl+Shift+T`、最大 25 件）

### お気に入りフォルダ

- よく使うフォルダを登録・素早くアクセス

### 状態の永続化

次のファイルを**アプリの直下**に保存します（開発時はプロジェクトルート、ビルド後は実行ファイルと同じフォルダ）。

| ファイル | 内容 |
|---------|------|
| `session.json` | 開いているタブ、表示中タブ、閉じたタブ |
| `window-state.json` | ウィンドウサイズ・位置・最大化状態 |
| `favorites.json` | お気に入りフォルダ |

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
npm start
```

ビルド後、`photocollectionviewer-win32-x64/PhotoCollectionViewer.exe` が生成されます。

## キーボードショートカット

### ビューワー

| キー | 操作 |
|------|------|
| ← / → | 前 / 次の画像 |
| + / - | 拡大 / 縮小 |
| F | 画面にフィット |
| R | 右回転 |
| 0 | 表示リセット |
| Esc | 一覧に戻る |
| ダブルクリック | フィット ↔ 実寸 の切り替え |

### タブ

| キー | 操作 |
|------|------|
| Ctrl+Shift+T | 閉じたタブを復元 |

## 技術スタック

- Electron
- React + TypeScript
- electron-vite

## プロジェクト構成（主要ファイル）

| パス | 役割 |
|------|------|
| `src/main/index.ts` | メインプロセス、local-file プロトコル |
| `src/main/ipc/handlers.ts` | IPC（フォルダ読み込み、セッション、お気に入り等） |
| `src/main/store/session.ts` | セッション永続化 |
| `src/main/store/windowState.ts` | ウィンドウサイズ永続化 |
| `src/main/store/favorites.ts` | お気に入り永続化 |
| `src/main/store/appRoot.ts` | 設定ファイルの保存先（アプリ直下） |
| `src/main/store/thumbnailCache.ts` | サムネイルディスクキャッシュ |
| `src/renderer/src/App.tsx` | タブ状態管理 |
| `src/renderer/src/components/TabBar.tsx` | タブバー UI（ドラッグ&ドロップ並び替え） |
| `src/renderer/src/components/ImageViewer.tsx` | 画像ビューワー |
