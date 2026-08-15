# Third-Party Notices

PhotoCollectionViewer は、以下のオープンソースソフトウェアを利用しています。
各ソフトウェアのライセンス条件に従い、本ファイルおよび各プロジェクトの LICENSE ファイルを参照してください。

## 本プロジェクト

| 項目 | 内容 |
|------|------|
| プロジェクト名 | PhotoCollectionViewer |
| ライセンス | [MIT License](./LICENSE) |
| 免責事項 | [DISCLAIMER.md](./DISCLAIMER.md) |

## 直接依存パッケージ（`package.json`）

### 実行時依存（dependencies）

| パッケージ | バージョン | ライセンス | リポジトリ |
|-----------|-----------|-----------|-----------|
| [adm-zip](https://www.npmjs.com/package/adm-zip) | 0.6.0 | MIT | https://github.com/cthackers/adm-zip |
| [react](https://www.npmjs.com/package/react) | 18.3.1 | MIT | https://github.com/facebook/react |
| [react-dom](https://www.npmjs.com/package/react-dom) | 18.3.1 | MIT | https://github.com/facebook/react |
| [electron-packager](https://www.npmjs.com/package/electron-packager) | 17.1.2 | BSD-2-Clause | https://github.com/electron/electron-packager |

### 開発時依存（devDependencies）

| パッケージ | バージョン | ライセンス | リポジトリ |
|-----------|-----------|-----------|-----------|
| [@types/adm-zip](https://www.npmjs.com/package/@types/adm-zip) | 0.5.8 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |
| [@types/react](https://www.npmjs.com/package/@types/react) | 18.3.31 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |
| [@types/react-dom](https://www.npmjs.com/package/@types/react-dom) | 18.3.7 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |
| [@vitejs/plugin-react](https://www.npmjs.com/package/@vitejs/plugin-react) | 4.7.0 | MIT | https://github.com/vitejs/vite-plugin-react |
| [electron](https://www.npmjs.com/package/electron) | 33.4.11 | MIT | https://github.com/electron/electron |
| [electron-vite](https://www.npmjs.com/package/electron-vite) | 2.3.0 | MIT | https://github.com/alex8088/electron-vite |
| [typescript](https://www.npmjs.com/package/typescript) | 5.9.3 | Apache-2.0 | https://github.com/microsoft/TypeScript |
| [vite](https://www.npmjs.com/package/vite) | 5.4.21 | MIT | https://github.com/vitejs/vite |

## 配布物に含まれる Electron / Chromium

`npm run build` で生成される実行ファイルには、Electron および Chromium が同梱されます。

| コンポーネント | ライセンス | 参照 |
|---------------|-----------|------|
| Electron | MIT | 配布フォルダ内の `LICENSE` |
| Chromium および同梱ライブラリ | 複数（MIT, BSD, Apache-2.0 等） | 配布フォルダ内の `LICENSES.chromium.html` |

ビルド後の配布物（例: `PhotoCollectionViewer-win32-x64/`）には、上記ファイルが自動的に含まれます。

## アプリアイコン

`resources/icon.svg` / `resources/icon.png` / `resources/icon.ico` / `src/renderer/public/favicon.png` は、
Google の [Material Design Icons](https://github.com/google/material-design-icons)（`photo_library` アイコン）を元に、
背景の角丸パネルと配色を追加して作成しています。

| 項目 | 内容 |
|------|------|
| 素材 | Material Design Icons（`photo_library`） |
| ライセンス | Apache License 2.0 |
| 配布元 | https://github.com/google/material-design-icons |

## 間接依存（transitive dependencies）

上記以外にも、`npm install` により多数の間接依存パッケージが導入されます。
主なライセンス種別は次のとおりです（2026年8月時点）。

| ライセンス | 件数（概算） |
|-----------|-------------|
| MIT | 187 |
| ISC | 21 |
| Apache-2.0 | 7 |
| BSD-2-Clause | 5 |
| BSD-3-Clause | 4 |
| CC-BY-4.0 | 1 |
| CC-BY-3.0 | 1 |
| CC0-1.0 | 1 |
| MIT OR CC0-1.0 | 1 |

### ライセンス一覧の出力方法

プロジェクトルートで次を実行すると、インストール済みパッケージのライセンス一覧を出力できます。

```bash
npx license-checker --summary
npx license-checker --csv > licenses.csv
```

## ライセンス全文（直接依存）

### MIT License

adm-zip, react, react-dom, @types/adm-zip, @types/react, @types/react-dom, @vitejs/plugin-react, electron, electron-vite, vite 等

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### BSD-2-Clause License

electron-packager 等

```
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### Apache License 2.0

typescript 等

Apache License 2.0 の全文は以下を参照してください。

https://www.apache.org/licenses/LICENSE-2.0

```
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
