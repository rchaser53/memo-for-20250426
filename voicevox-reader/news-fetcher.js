const path = require('path');
const ConfigManager = require('./lib/config-manager');
const NewsProcessor = require('./lib/news-processor');
const TextSplitter = require('./lib/text-splitter');

// 設定ファイルのパス
const CONFIG_FILE = path.join(__dirname, 'config.json');

// ニュース用のデフォルト設定を追加
const NEWS_DEFAULT_CONFIG = {
  news: {
    keywords: ["AI", "人工知能", "テクノロジー"],
    max_articles: 5,
    summary_length: 200,
    output_file: "news_summary.txt",
    language: "ja",
    rss_feeds: [
      'https://news.yahoo.co.jp/rss/topics/it.xml',
      'https://feeds.feedburner.com/itmedia/news',
      'https://rss.cnn.com/rss/edition.rss',
      'https://feeds.bbci.co.uk/news/technology/rss.xml'
    ],
    reading: {
      split_files: true,
      max_chars_per_file: 300,
      include_metadata: false,
      output_prefix: "news_reading_"
    }
  },
  output: {
    dir: "output"
  }
};

/**
 * メイン関数
 */
async function main() {
  console.log('=== ニュース取得・要約ツール ===');
  
  try {
    // 設定を初期化
    const configManager = new ConfigManager(CONFIG_FILE);
    configManager.loadConfig();
    
    // ニュース用設定をマージ
    const config = { ...configManager.getConfig(), ...NEWS_DEFAULT_CONFIG };
    
    // 各クラスを初期化
    const newsProcessor = new NewsProcessor(config);
    const textSplitter = new TextSplitter(config);
    
    console.log(`検索キーワード: ${config.news.keywords.join(', ')}`);
    console.log(`最大記事数: ${config.news.max_articles}`);
    console.log(`要約文字数: ${config.news.summary_length}`);
    console.log(`RSSフィード数: ${config.news.rss_feeds.length}`);
    
    // ニュースを取得
    console.log('\nニュースを取得中...');
    const allNews = await newsProcessor.fetchAllNews();
    console.log(`${allNews.length}件のニュースを取得しました`);
    
    // フィルタリングと要約
    console.log('\nニュースをフィルタリング・要約中...');
    const summarizedNews = newsProcessor.filterAndSummarizeNews(allNews);
    console.log(`${summarizedNews.length}件の関連ニュースを見つけました`);
    
    if (summarizedNews.length === 0) {
      console.log('キーワードに関連するニュースが見つかりませんでした。');
      return;
    }
    
    // 出力ディレクトリを準備
    const outputDir = path.join(__dirname, config.output.dir);
    
    // 詳細版ファイルに出力
    const outputFile = textSplitter.outputSummaryToFile(
      summarizedNews, 
      outputDir, 
      config.news.output_file
    );
    
    // 読み上げ用ファイルを生成
    console.log('\n読み上げ用ファイルを生成中...');
    const readingFiles = textSplitter.createReadingFiles(summarizedNews, outputDir);
    
    console.log('\n=== 処理完了 ===');
    console.log(`要約されたニュースが ${outputFile} に保存されました。`);
    console.log(`読み上げ用ファイルが ${readingFiles.length} 個作成されました。`);
    
    return { outputFile, readingFiles };
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

// コマンドライン引数の処理
if (require.main === module) {
  main().catch(error => {
    console.error('予期せぬエラーが発生しました:', error);
    process.exit(1);
  });
}

module.exports = {
  main,
  NewsProcessor,
  TextSplitter
};
