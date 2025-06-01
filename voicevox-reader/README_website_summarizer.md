# Website Summarizer

指定したウェブサイトの内容をlangchain.jsで要約し、text-splitterで分割して指定したディレクトリに出力するスクリプトです。

## 機能

- ウェブサイトのHTMLコンテンツを取得
- OpenAI GPT-4o-miniを使用した高品質な要約
- テキストの自動分割と複数ファイルへの出力
- 進行状況の表示とレート制限対応
- 要約の長さを調整可能
- **設定ファイルから複数URLを一括処理**（New!）

## 必要な環境

- Node.js (v14以上)
- OpenAI API キー

## セットアップ

1. 依存関係をインストール:
```bash
cd voicevox-reader
npm install
```

2. 環境変数を設定:
`.env`ファイルを作成し、OpenAI APIキーを設定してください。
```
OPENAI_API_KEY=your_openai_api_key_here
```

## 使用方法

### 単一URLの処理

```bash
node website-summarizer.js --url=<URL> --output=<出力ディレクトリ> [--length=<要約の長さ>]
```

### 設定ファイルから複数URLを処理

```bash
node website-summarizer.js --config
```

この方法では、`config.json`に設定された複数のURLを一括で処理します。

### パラメータ

- `--url=<URL>`: 要約したいウェブサイトのURL（単一URL処理時に必須）
- `--output=<出力ディレクトリ>`: 結果を保存するディレクトリ（単一URL処理時に必須）
- `--length=<要約の長さ>` (オプション): 要約の長さを指定
  - `short` または `brief`: 簡潔な要約（2-3文）
  - `medium` または `normal`: 標準的な要約（5-8文）- デフォルト
  - `long` または `detailed`: 詳細な要約（10-15文）
  - 数値: 指定した文字数での要約
- `--config`: 設定ファイルから複数URLを処理するモード

### 設定ファイル（config.json）の例

```json
{
  "websites": {
    "urls": [
      "https://example.com",
      "https://example.org",
      "https://example.net"
    ],
    "output_dir": "website_summaries",
    "summary_length": "medium"
  }
}
```

## 使用例

### 基本例
```bash
node website-summarizer.js --url=https://example.com --output=./output
```

### 短い要約
```bash
node website-summarizer.js --url=https://news.example.com/article --output=./summaries --length=short
```

### 詳細な要約
```bash
node website-summarizer.js --url=https://blog.example.com/post --output=./detailed_summaries --length=long
```

### 文字数指定
```bash
node website-summarizer.js --url=https://example.com --output=./output --length=200
```

## 出力ファイル

### 単一URLの処理時

スクリプトは以下のファイルを生成します：

1. **要約レポート**: `website_summary_report.md`
   - ウェブサイトの詳細情報と要約を含むMarkdownファイル

2. **分割ファイル**: `website_summary_01_01.txt`, `website_summary_01_02.txt`, ...
   - 要約を300文字ずつに分割したテキストファイル
   - 音声読み上げなどに適したサイズ

### 複数URLの処理時

1. **各URLごとのサブディレクトリ**:
   - 各URLのホスト名とパスに基づいたディレクトリが作成されます
   - 各サブディレクトリには上記と同様の要約レポートと分割ファイルが含まれます

2. **全体レポート**: `all_summaries/all_websites_summary.md`
   - すべてのURLの要約をまとめたMarkdownファイル
   - 各URLへのリンクと要約内容が含まれます

## 技術仕様

- **要約エンジン**: OpenAI GPT-4o-mini
- **テキスト分割**: LangChain RecursiveCharacterTextSplitter
- **チャンクサイズ**: 30,000文字（オーバーラップ1,000文字）
- **出力ファイルサイズ**: 300文字/ファイル
- **レート制限**: 1分間に200リクエスト、150,000トークン

## エラー対処

### よくあるエラー

1. **OpenAI APIキーが設定されていない**
   ```
   Error: OpenAI API key not found
   ```
   → `.env`ファイルにAPIキーを設定してください

2. **ウェブサイトにアクセスできない**
   ```
   ❌ ウェブサイトの取得に失敗しました
   ```
   → URLが正しいか、サイトがアクセス可能かを確認してください

3. **処理可能なテキストが見つからない**
   ```
   ❌ エラー: 処理可能なテキストが見つかりません
   ```
   → ウェブサイトにテキストコンテンツがあるかを確認してください

## 注意事項

- 大きなウェブサイトの処理には時間がかかる場合があります
- OpenAI APIの使用料金が発生します
- レート制限により処理が一時停止する場合があります
- 一部のウェブサイトはアクセス制限がある場合があります

## ライセンス

ISC License
