# VOICEVOX テキスト読み上げツール

このツールは、入力したテキストをVOICEVOXエンジンを使用して音声に変換し、再生するNode.jsスクリプトです。

## 前提条件

- [Node.js](https://nodejs.org/) (v12以上)
- [VOICEVOX](https://voicevox.hiroshiba.jp/)がインストールされ、起動していること

## インストール方法

1. このリポジトリをクローンまたはダウンロードします
2. 依存パッケージをインストールします：

```bash
cd voicevox-reader
npm install
```

## 使い方

### テキストファイルの読み上げ

1. VOICEVOXエンジンを起動します（VOICEVOXアプリケーションを開くと自動的に起動します）
2. node index.js path/to/textfile.txt

### ニュース取得・要約機能

設定ファイルで指定したキーワードに関連するニュースを取得し、要約してテキストファイルに出力する機能も利用できます。

#### ニュースの取得・要約のみ

```bash
# シェルスクリプトを使用（推奨）
./fetch-news.sh

# または直接Node.jsで実行
node news-fetcher.js
```

#### ニュースの取得・要約と読み上げ

```bash
# ニュースを取得・要約してVOICEVOXで読み上げ
./fetch-news.sh -r
```

**読み上げ用ファイル分割機能**

ニュース取得・要約機能では、読み上げに適したファイルを自動生成します：

- **ソース、公開日、URLを除去**: 読み上げに不要な情報を自動的に除去
- **ファイル分割**: 一度に読み上げる文字数を制限して、聞きやすい長さに分割
- **順次読み上げ**: 複数のファイルを順番に読み上げ

## 設定ファイル

このツールは`config.json`という設定ファイルを使用して、様々な設定をカスタマイズできます。初回実行時に自動的に作成されます。

### 設定ファイルの例

```json
{
  "api": {
    "url": "http://localhost:50021",
    "timeout": 10000
  },
  "speaker": {
    "default_id": 0,
    "name": "四国めたん（ノーマル）"
  },
  "output": {
    "dir": "output",
    "filename": "output.wav"
  },
  "playback": {
    "auto_play": true
  },
  "news": {
    "keywords": ["AI", "人工知能", "テクノロジー"],
    "max_articles": 5,
    "summary_length": 200,
    "output_file": "news_summary.txt",
    "language": "ja",
    "rss_feeds": [
      "https://news.yahoo.co.jp/rss/topics/it.xml",
      "https://feeds.feedburner.com/itmedia/news",
      "https://rss.cnn.com/rss/edition.rss",
      "https://feeds.bbci.co.uk/news/technology/rss.xml"
    ],
    "reading": {
      "split_files": true,
      "max_chars_per_file": 300,
      "include_metadata": false,
      "output_prefix": "news_reading_"
    }
  }
}
```

### 設定項目

- **api**: VOICEVOXエンジンのAPI設定
  - `url`: VOICEVOXエンジンのURLとポート
  - `timeout`: API呼び出しのタイムアウト時間（ミリ秒）
- **speaker**: 話者の設定
  - `default_id`: デフォルトの話者ID
  - `name`: デフォルトの話者名（参照用）
- **output**: 出力設定
  - `dir`: 音声ファイルの保存先ディレクトリ
  - `filename`: デフォルトの音声ファイル名
- **playback**: 再生設定
  - `auto_play`: 音声を自動再生するかどうか（true/false）
- **news**: ニュース取得・要約設定
  - `keywords`: 検索キーワードの配列
  - `max_articles`: 取得する最大記事数
  - `summary_length`: 要約の最大文字数
  - `output_file`: 要約結果の出力ファイル名
  - `language`: 言語設定（現在は"ja"のみ対応）
  - `rss_feeds`: 取得するRSSフィードのURL配列
  - **reading**: 読み上げ用ファイル設定
    - `split_files`: ファイルを分割するかどうか（true/false）
    - `max_chars_per_file`: 1ファイルあたりの最大文字数
    - `include_metadata`: メタデータ（記事番号など）を含めるかどうか（true/false）
    - `output_prefix`: 読み上げ用ファイルの接頭辞

### 設定ファイルの編集方法

1. `config.json`をテキストエディタで開きます
2. 必要な設定を変更します
3. ファイルを保存します
4. スクリプトを再実行すると、新しい設定が適用されます

### ニュース検索キーワードのカスタマイズ

`config.json`の`news.keywords`配列を編集することで、検索するニュースのキーワードを変更できます：

```json
{
  "news": {
    "keywords": ["プログラミング", "JavaScript", "Node.js", "開発"],
    "max_articles": 10,
    "summary_length": 300
  }
}
```

### RSSフィードのカスタマイズ

`config.json`の`news.rss_feeds`配列を編集することで、取得するRSSフィードを変更できます：

```json
{
  "news": {
    "rss_feeds": [
      "https://news.yahoo.co.jp/rss/topics/it.xml",
      "https://feeds.feedburner.com/itmedia/news",
      "https://www.asahi.com/rss/asahi/newsheadlines.rdf",
      "https://www3.nhk.or.jp/rss/news/cat0.xml"
    ]
  }
}
```

**利用可能なRSSフィードの例**：
- Yahoo!ニュース IT: `https://news.yahoo.co.jp/rss/topics/it.xml`
- ITmedia NEWS: `https://feeds.feedburner.com/itmedia/news`
- 朝日新聞デジタル: `https://www.asahi.com/rss/asahi/newsheadlines.rdf`
- NHK NEWS WEB: `https://www3.nhk.or.jp/rss/news/cat0.xml`
- CNN Technology: `https://rss.cnn.com/rss/edition.rss`
- BBC Technology: `https://feeds.bbci.co.uk/news/technology/rss.xml`

### 読み上げ用ファイル分割のカスタマイズ

読み上げ用ファイルの分割設定をカスタマイズできます：

```json
{
  "news": {
    "reading": {
      "split_files": true,
      "max_chars_per_file": 200,
      "include_metadata": true,
      "output_prefix": "daily_news_"
    }
  }
}
```

- `split_files: false`にすると、全記事を1つのファイルにまとめます
- `max_chars_per_file`で1ファイルあたりの文字数を調整できます
- `include_metadata: true`にすると、「記事1」などの番号が追加されます

## 注意事項
- デフォルトでは「四国めたん（ノーマル）」の声が使用されます
- デフォルトの話者を変更するには、`config.json`の`speaker.default_id`の値を変更してください
- 音声ファイルは`output`ディレクトリに保存されます
- ニュース要約ファイルと読み上げ用ファイルも`output`ディレクトリに保存されます
- 読み上げ用ファイルは`news_reading_XX_XX.txt`の形式で生成されます
- RSSフィードのURLは変更される可能性があります。定期的に確認してください

## 利用可能な話者ID
利用可能な話者IDの詳細については、[SPEAKERS.md](SPEAKERS.md)を参照してください。
