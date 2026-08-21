# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # 依存関係のインストール
npm run dev        # electron-vite dev（開発起動、ホットリロード）
npm run build       # electron-vite build && electron-builder --win --publish=never（配布用インストーラー生成）
npm run build:vite    # electron-vite build のみ（ビルド成果物の確認、パッケージングなし）
npm run preview / npm start  # electron-vite preview（ビルド後のプレビュー起動）
```

型チェックのみを行う場合（lint/test は未整備、下記「開発ルール」参照）:

```bash
npx tsc --noEmit -p tsconfig.node.json  # メインプロセス（src/main, src/preload）
npx tsc --noEmit -p tsconfig.web.json   # レンダラー（src/renderer）
```

ビルド後、`release/` に electron-builder 製の NSIS インストーラー（`PhotoCollectionViewer-Setup-*.exe`）が生成される。

## アプリの機能・要件

フォルダ単位で画像を管理・表示する Windows 向け Electron デスクトップアプリ。

- **画像ビューワー**: ズーム・パン・回転・フィット・前後ナビゲーション、段階的読み込み（サムネイル→原寸）、GIFアニメーション対応、矢印キーで循環移動
- **サムネイル一覧**: グリッド表示、Intersection Observer による遅延読み込み、`userData/thumbnails/` への JPEG ディスクキャッシュ（失敗時は Data URL フォールバック）、フォルダごとのスクロール位置・直前選択項目の記憶
- **フォルダコレクション**: サブフォルダ・パンくずリスト・「↑」での上位移動、画像のみのサブフォルダは先頭画像を自動表示
- **ZIPファイル**: 一覧表示、クリックで確認ダイアログ→解凍（同名フォルダは平坦化、パストラバーサル対策あり）、解凍済みなら再解凍せず開く
- **タブ管理**: 追加・削除・切り替え・ドラッグ&ドロップ並び替え、閉じたタブの復元（`Ctrl+Shift+T`、最大25件）
- **お気に入りフォルダ**: 登録・左クリックでアクティブタブに開く・右クリックで新規タブ
- **設定の永続化**: `app-state.json`（`session` / `windowState` / `favorites`）を Electron の `userData` フォルダに保存（開発時はプロジェクトルート）。**実行ファイルと同じインストールディレクトリには保存しない**——アップデートインストールで設定が消える不具合が過去にあったため。旧バージョンの保存先からは初回起動時に自動移行する。
- **設定のインポート/エクスポート**: サイドバーから `app-state.json` の内容をファイルとして書き出し/取り込みできる。インポート後は反映のためウィンドウを再読み込みする（`app.relaunch()` は electron-vite の開発時プロセス管理と衝突して失敗するため使わない）。

詳細な操作方法（キーボードショートカット、マウス操作）は [README.md](./README.md) を参照。

## アーキテクチャ

Electron の 3プロセス構成（`electron-vite` でビルド、`electron-builder` でパッケージング）:

- `src/main/` — メインプロセス（Node.js）
  - `index.ts` — エントリポイント。`local-file://` カスタムプロトコル（`fs.readFile` で画像を返す。Windowsのドライブレター絡みの URL 正規化の癖に注意 — コード内コメント参照）、ウィンドウ生成、起動時の設定移行呼び出し
  - `ipc/handlers.ts` — `ipcMain.handle` の配線のみ。実処理は `services/` や `store/` に委譲する
  - `services/` — IPCハンドラーから呼ばれる実処理本体。`folderScan.ts`（フォルダ・ZIP・画像の一覧取得）、`imageDataUrl.ts`（sharp/nativeImageによる画像データURL生成）、`renamePath.ts`（ファイル・フォルダのリネーム、お気に入りパス追従）
  - `store/` — 永続化層。`appRoot.ts`（保存先ディレクトリの解決）、`appState.ts`（`app-state.json` の読み書き・レガシー移行・インポート/エクスポート）、`favorites.ts` / `session.ts` / `windowState.ts`（`appState.ts` 経由の薄いラッパー）、`thumbnailCache.ts`（サムネイルディスクキャッシュ）、`warmup.ts`（フォーカス復帰時のキャッシュ再ウォームアップ）
  - `utils/zipArchive.ts` — ZIP 展開ロジック
- `src/preload/index.ts` — `contextBridge` で `window.photoCollection` API を公開。ここに定義された型（`ImageFile`, `FavoriteFolder` 等）がレンダラー側の型のソースになっている
- `src/renderer/src/` — React + TypeScript の UI
  - `App.tsx` — トップレベルのタブ状態管理とハンドラーの合成
  - `hooks/` — ロジック本体（`useTabs`, `useFolderNavigation`, `useSessionPersistence`, `useFavorites`, `useImageTransform`, `useProgressiveImageSource` 等）。**コンポーネントは表示、hooksがロジック**という分担
  - `components/` — 表示コンポーネント（`Sidebar`, `TabBar`, `TabContent`, `ThumbnailGrid`, `ImageViewer`, `ContextMenu` 等）

プロセス間のデータフローは常に「renderer → `window.photoCollection.xxx()`（preload） → `ipcMain.handle`（main） → `store/` or `utils/`」の一方向。新しい機能を追加する際は、この3層（preload型定義 / IPCハンドラー / storeまたはutils本体）を揃えて実装すること。

設定ファイルまわりを変更する際は、`app-state.json` の保存先が `userData` であること・旧パスからの移行ロジックがあることを前提に、`appRoot.ts` / `appState.ts` の既存の仕組みに沿わせること。

## 開発ルール

- **修正を行う際は必ず作業用ブランチを切ること**。`master` に直接コミットしない。
- ESLint / Prettier、テスト（Vitest 等）は現状未整備。導入・整備を進めている途中なので、このファイルおよび直近のコミット履歴を確認し、既に導入済みならそのルールに従うこと。
- IPCハンドラー（`src/main/ipc/handlers.ts`）は「配線」のみとし、実処理は `main/store/` や `main/utils/` に切り出す。1ファイル1責務を意識する（目安: 1ファイル300行、1関数50行を超えたら分割を検討）。
- `preload/index.ts` と main 側で型定義が重複しないよう注意する。
- **ユーザーとの応対は必ず日本語で行うこと**。
