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

コミット前に通すチェック（詳細は下記「開発ルール」「テスト」参照）:

```bash
npm run check       # lint・format:check・typecheck・test をまとめて実行（コミット前はこれを通す）
npm run lint        # ESLint（警告0件が必須。--max-warnings=0）
npm run lint:fix     # ESLint の自動修正
npm run format       # Prettier で全体を整形
npm run format:check   # Prettier のフォーマットチェックのみ（書き換えなし）
npm run typecheck     # 型チェック（tsconfig.node.json: src/main・src/preload / tsconfig.web.json: src/renderer）
npm run test        # Vitest を1回実行
npm run test:watch    # Vitest をウォッチモードで実行
npm run test:e2e     # E2E（ビルドしてから Playwright で実際のアプリを起動。check には含まない）
```

CI（`.github/workflows/ci.yml`、windows-latest）が PR と `master` への push ごとに lint・format:check・typecheck・test・build:vite と、別ジョブで E2E を実行する。

ビルド後、`release/` に electron-builder 製の NSIS インストーラー（`PhotoCollectionViewer-Setup-*.exe`）が生成される。

## アプリの機能・要件

フォルダ単位で画像を管理・表示する Windows 向け Electron デスクトップアプリ。

- **画像ビューワー**: ズーム・パン・回転・フィット・原寸表示・前後ナビゲーション、段階的読み込み（サムネイル→原寸）、GIFアニメーション対応、矢印キーで循環移動
- **サムネイル一覧**: グリッド表示、Intersection Observer による遅延読み込み、`userData/thumbnails/` への JPEG ディスクキャッシュ（失敗時は Data URL フォールバック）、フォルダごとのスクロール位置・直前選択項目の記憶
- **フォルダコレクション**: サブフォルダ・パンくずリスト・「↑」での上位移動、画像のみのサブフォルダは先頭画像を自動表示
- **ZIPファイル**: 一覧表示、クリックで確認ダイアログ→解凍（同名フォルダは平坦化、パストラバーサル対策あり）、解凍済みなら再解凍せず開く
- **タブ管理**: 追加・削除・切り替え・ドラッグ&ドロップ並び替え、閉じたタブの復元（`Ctrl+Shift+T`、最大25件）
- **お気に入りフォルダ**: 登録・左クリックでアクティブタブに開く・右クリックで新規タブ
- **設定の永続化**: `app-state.json`（`session` / `windowState` / `favorites` / `confirmations`）を Electron の `userData` フォルダに保存（開発時はプロジェクトルート）。**実行ファイルと同じインストールディレクトリには保存しない**——アップデートインストールで設定が消える不具合が過去にあったため。旧バージョンの保存先からは初回起動時に自動移行する。書き込みは一時ファイル経由のアトミックな方式（`main/utils/atomicWrite.ts`）。JSON として解析できないファイルは `app-state.corrupt-<日時>.json` に退避してから既定値で起動し、存在するのに読めないファイルは上書きしない（設定が既定値で上書きされて消える不具合が過去にあったため）。
- **設定のインポート/エクスポート**: サイドバーから `app-state.json` の内容をファイルとして書き出し/取り込みできる。インポート後は反映のためウィンドウを再読み込みする（`app.relaunch()` は electron-vite の開発時プロセス管理と衝突して失敗するため使わない）。

詳細な操作方法（キーボードショートカット、マウス操作）は [README.md](./README.md) を参照。

## アーキテクチャ

Electron の 3プロセス構成（`electron-vite` でビルド、`electron-builder` でパッケージング）:

- `src/main/` — メインプロセス（Node.js）
  - `index.ts` — エントリポイント。アプリのライフサイクルの配線（準備完了後のプロトコル・IPC・ウィンドウの開始、起動時の設定移行の呼び出し）だけを置く
  - `bootstrap.ts` — アプリの準備完了前に済ませる必要がある設定（`setName`、E2E 用の userData の切り替え、Chromium のスイッチ、libuv のスレッドプール、スキームの特権登録）。**`index.ts` の最初の import から外さない**（後から設定しても効かないものがあるため）
  - `window/mainWindow.ts` — メインウィンドウの生成
  - `protocol/` — `local-file://` カスタムプロトコル。`localFileProtocol.ts`（`fs` でファイルを読んで返す。動画のシーク用に Range にも応じる）、`rangeRequest.ts`（Range ヘッダーの解析）
  - `ipc/handlers.ts` — `ipcMain.handle` の配線のみ。実処理は `services/` や `store/` に委譲する
  - `services/` — IPCハンドラーから呼ばれる実処理本体。`folderScan.ts`（フォルダ・ZIP・画像の一覧取得）、`imageDataUrl.ts`（sharp/nativeImageによる画像データURL生成）、`renamePath.ts`（ファイル・フォルダのリネーム、お気に入りパス追従）、`deleteFolder.ts` / `moveToUnnecessary.ts`（ごみ箱への移動）、`confirmDialog.ts`（「今後表示しない」付きの確認ダイアログ）、`zipDialogs.ts` / `settingsDialogs.ts` / `folderDialogs.ts`（ZIP 解凍の確認、設定のエクスポート/インポート、フォルダ選択のダイアログ）、`trash.ts`（ごみ箱への移動の共通処理）
  - `store/` — 永続化層。`appRoot.ts`（保存先ディレクトリの解決）、`appState.ts`（`app-state.json` の読み書き・レガシー移行・インポート/エクスポート）、`favorites.ts` / `session.ts` / `windowState.ts` / `confirmations.ts`（`appState.ts` 経由の薄いラッパー）、`thumbnailCache.ts`（サムネイルディスクキャッシュ）、`warmup.ts`（フォーカス復帰時のキャッシュ再ウォームアップ）
  - `utils/` — `zipArchive.ts`（ZIP 展開ロジック）、`atomicWrite.ts`（一時ファイル経由のアトミックな書き込み）
- `src/preload/index.ts` — `contextBridge` で `window.photoCollection` API を公開。レンダラーはこの API の型（`PhotoCollectionAPI`）だけを `env.d.ts` 経由で参照する
- `src/shared/` — 3つのプロセスすべてで使う型（`types.ts`: `ImageFile`, `FavoriteFolder`, `SessionData` 等）、IPC のチャネル名（`ipcChannels.ts`）、定数（`constants.ts`）、扱う画像・動画の拡張子の表（`media.ts`。フォルダの読み込み・MIME・デコード方法・GIF 判定はすべてこの表から決まる）、`local-file://` の URL とパスの変換（`localFileUrl.ts`。Windows のドライブレターが URL のホスト名として届く癖に注意 — コード内コメント参照）。electron・Node・React などに依存しない純粋な TypeScript に限る（ESLint で検査）
- `src/renderer/src/` — React + TypeScript の UI
  - `App.tsx` — トップレベルのタブ状態管理とハンドラーの合成
  - `hooks/` — ロジック本体（`useTabs`, `useFolderNavigation`, `useSessionPersistence`, `useFavorites`, `useImageTransform`, `useProgressiveImageSource` 等）。**コンポーネントは表示、hooksがロジック**という分担
  - `state/` — React に依存しない純粋な状態遷移。`tabsReducer.ts`（タブの一覧・アクティブなタブ・閉じたタブの記録の reducer）、`tabTransitions.ts`（1つのタブの状態遷移: 画像の選択・前後移動・削除、サブフォルダの削除、ビューワーを閉じたあとの移動先）。フックはこれらを呼ぶだけにする。開発時（StrictMode）は reducer が2回実行されるため、新しいタブの id のように実行のたびに変わる値は action に入れて渡し、reducer の中では作らない
  - `styles/` — すべてグローバルな CSS。`global.css`（リセット・スクロールバー、`tokens.css` の読み込み）、`tokens.css`（色の CSS 変数。色を足すときは値を直接書かずにここへ追加する）、`App.css`（`app/` の領域ごとの部分ファイルを読み込む。**読み込む順番がそのまま適用順**で、後のルールが同じ詳細度の前のルールを打ち消している箇所があるため、順番を変えない）
  - `components/` — 表示コンポーネント（`Sidebar`, `TabBar`, `TabContent`, `ThumbnailGrid`, `ImageViewer`, `ContextMenu` 等）
  - `types/` — レンダラーだけで使う型（`tab.ts`: タブの状態と `UpdateTab`、`grid.ts`: サムネイル一覧の項目の種類・検索元、`browse.ts`: フォルダの開き方）

プロセス間のデータフローは常に「renderer → `window.photoCollection.xxx()`（preload） → `ipcMain.handle`（main） → `services/`・`store/`・`utils/`」の一方向。新しい機能を追加する際は、この3層（preload の API / IPCハンドラー / services・store・utils の本体）を揃えて実装し、やり取りする型は `src/shared/types.ts` に置くこと。チャネル名は文字列で書かず、`src/shared/ipcChannels.ts` の `IPC` に preload の API と同じ名前のキーで追加して、preload とハンドラーの両方でその定数を使う（`preload/index.test.ts` と `ipc/handlers.test.ts` が、API・チャネル・ハンドラーの一致を検査する）。

設定ファイルまわりを変更する際は、`app-state.json` の保存先が `userData` であること・旧パスからの移行ロジックがあることを前提に、`appRoot.ts` / `appState.ts` の既存の仕組みに沿わせること。

## 開発ルール

- **修正を行う際は必ず作業用ブランチを切ること**。`master` に直接コミットしない。
- **ブランチは原則として `master` から作成し、PR のベースブランチも指示がない限り常に `master` にすること**。未マージの作業ブランチを起点に新しいブランチを切ると、そのPRが `master` にマージされてもベースブランチ側の変更が反映されず、機能が消えたように見える事故につながる（実際に ESLint 導入PRが `refactor/split-ipc-handlers` をベースにマージされ、`master` に反映されないまま放置される事故が発生した）。他のブランチを意図的にベースにする場合は、その旨をPR説明に明記すること。
- ブランチ名は用途に応じた prefix を付ける: 新機能は `feature/`、不具合修正は `fix/`、挙動を変えない整理は `refactor/`、ビルド・ツール・設定まわりは `chore/`。
- ESLint（`eslint.config.mjs`、flat config）・Prettier（`.prettierrc.json`）・Vitest（`vitest.config.ts`）を導入済み。**コミット前に必ず `npm run check`（lint・format:check・typecheck・test）を通すこと**。
- IPCハンドラー（`src/main/ipc/handlers.ts`）は「配線」のみとし、実処理は `main/services/`・`main/store/`・`main/utils/` に切り出す。1ファイル1責務を意識する（目安: 1ファイル300行、1関数50行を超えたら分割を検討）。
- 複数のプロセスで使う型・定数は `src/shared/` にだけ置き、main・preload・renderer で重複して定義しない。
- 関数の書き方を統一する: **公開コンポーネント（`export function Foo() {}` の形で他ファイルから使われるReactコンポーネント）は `function` 宣言**、**イベントハンドラーや短いコールバック（`onClick={() => ...}` やコンポーネント内のローカルなヘルパー関数など）はアロー関数**で書く。
- 次のルールは ESLint で検査している（違反すると `npm run lint` がエラーになる）。
  - React コンポーネントは、公開・非公開を問わず `function` 宣言にする（`react/function-component-definition`）。
  - 1ファイル300行まで（`max-lines`）。既に超えているファイルは `eslint.config.mjs` の例外リストに載せてあり、分割したらリストから外す。
  - プロセスをまたぐ import の禁止（`no-restricted-imports`）: renderer から `electron`・main・preload（`env.d.ts` を除く）、main から renderer、preload から main・renderer、shared から `electron`・Node の標準モジュール・React・各プロセスのコード。
- **ユーザーとの応対は必ず日本語で行うこと**。

## テスト

- Vitest を node 環境で使う。テストは対象ファイルの隣に `*.test.ts` として置く（`vitest.config.ts` の `include` は `src/**/*.test.ts`）。
- React のフックやコンポーネントは直接テストしない（jsdom は使わない）。判定や計算は React・Electron・DOM に依存しない純粋関数に切り出し、その関数をテストする。
- `electron` を import するモジュールは `vi.mock('electron', ...)` で差し替える（`vi.mock` はファイルのトップレベルに書く。Vitest 5 では入れ子にするとエラーになる）。ファイル操作は `os.tmpdir()` 配下の一時ディレクトリで行い、テストごとに削除する。
- 既知の不具合は「本来あるべき挙動」を `it.fails` で書いて固定し、修正する PR で `it` に戻す。`it.fails` はテストの書き間違いでも成功扱いになるため、1つの `it.fails` には不具合を示すアサーションを1つだけ置く。
- ドライブレターや大文字小文字を区別しないファイル名など、Windows の挙動を前提にしたテストがあるため、CI は windows-latest で実行する。

### E2E（`e2e/`）

- Playwright の Electron サポートで、ビルド済みのアプリ（`out/`）をテストごとに起動する。単体テストでは確かめられない画面の操作（キー操作、ビューワー、タブ、ZIP、永続化など）を対象にし、本数は少なく保つ。画面の操作や表示に関わる変更では `npm run test:e2e` も通すこと。
- テストごとに一時フォルダへ、画像・サブフォルダ・ZIP を含むライブラリと `app-state.json` を生成する（`e2e/support/environment.ts`）。環境変数 `PCV_USER_DATA_DIR` で保存先（userData）をそこへ切り替えるため、開発時の設定（プロジェクトルートの `app-state.json`）やサムネイルキャッシュには触れない。この切り替えはパッケージ版では無効。
- 確認ダイアログは事前に用意した設定でオフにしてある。ネイティブダイアログを出す操作を試すときは、`electronApp.evaluate` で `dialog` を差し替える。
- VS Code のターミナルなどでは `ELECTRON_RUN_AS_NODE` が設定されていて、そのままだと Electron が Node として起動してしまう。起動時にこの変数を取り除いている（`e2e/support/app.ts`）。
- メインプロセスで未処理の例外が起きると、Electron のエラーダイアログが出てアプリが終了しなくなり、テストはタイムアウトまで止まってしまう。そのため起動したアプリには、未処理の例外を標準エラーへ書き出させる処理を入れてある。テストの最後に1件でもあれば、そのテストを失敗にする（`e2e/support/test.ts` の `noMainProcessErrors`）。
- 既知の不具合は `test.fail()` で固定し、修正する PR で外す（単体テストの `it.fails` と同じ扱い）。
