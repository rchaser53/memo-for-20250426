const path = require('path');
const ConfigManager = require('./lib/config-manager');
const NewsProcessor = require('./lib/news-processor');
const TextSplitter = require('./lib/text-splitter');
const FileUtils = require('./lib/file-utils');
const { main: voicevoxMain } = require('./index');

// 設定ファイルのパス
const CONFIG_FILE = path.join(__dirname, 'config.json');

/**
 * メイン関数
 */
async function main() {
  console.log('=== ニュース読み上げツール ===');
  
  try {
    // 設定を初期化
    const configManager = new ConfigManager(CONFIG_FILE);
    configManager.loadConfig();
    const config = configManager.getConfig();
    
    // ニュース処理クラスを初期化
    const newsProcessor = new NewsProcessor(config);
    
    console.log('RSSフィードからニュースを取得しています...');
    // すべてのRSSフィードからニュースを取得
    const allNews = await newsProcessor.fetchAllNews();
    
    if (allNews.length === 0) {
      console.log('ニュースが見つかりませんでした。');
      return;
    }
    
    console.log(`${allNews.length}件のニュースを取得しました。`);
    
    // ニュースをフィルタリングして要約
    const filteredNews = newsProcessor.filterAndSummarizeNews(allNews);
    
    if (filteredNews.length === 0) {
      console.log('条件に一致するニュースが見つかりませんでした。');
      return;
    }
    
    console.log(`${filteredNews.length}件のニュースが条件に一致しました。`);
    
    // 出力ディレクトリを作成
    const outputDir = path.join(__dirname, config.news?.output_dir || 'news_output');
    FileUtils.ensureDirectoryExists(outputDir);
    
    // TextSplitterを使用してファイルを分割・出力
    const textSplitter = new TextSplitter({
      news: config.news
    });
    
    // 分割されたファイルを作成
    console.log('ニュースを読み上げ用ファイルに分割しています...');
    const createdFiles = textSplitter.createReadingFiles(filteredNews, outputDir);
    
    // 要約結果をまとめたファイルも作成
    const summaryFile = path.join(outputDir, config.news?.output_file || 'news_summary.txt');
    
    // サマリーファイルの内容を作成
    let summaryContent = `# ニュース要約 (${new Date().toLocaleString('ja-JP')})\n\n`;
    filteredNews.forEach((article, index) => {
      summaryContent += `## ${index + 1}. ${article.title}\n`;
      summaryContent += `出典: ${article.source} (${article.pubDate})\n`;
      summaryContent += `${article.summary}\n`;
      summaryContent += `リンク: ${article.link}\n\n`;
    });
    
    // サマリーファイルを保存
    FileUtils.writeTextFile(summaryFile, summaryContent);
    
    console.log(`ニュース要約ファイルを作成しました: ${summaryFile}`);
    console.log(`${createdFiles.length}個の読み上げ用ファイルを作成しました。`);
    
    // 読み上げ用ファイルを表示
    console.log('\n=== 作成された読み上げ用ファイル ===');
    createdFiles.forEach(file => {
      console.log(`- ${file}`);
    });
    
    // ユーザーに読み上げを開始するか確認
    console.log('\nこれらのファイルを読み上げますか？ (y/n)');
    process.stdin.once('data', async (data) => {
      const input = data.toString().trim().toLowerCase();
      
      if (input === 'y' || input === 'yes') {
        console.log('\n=== 読み上げを開始します ===');
        // index.jsのディレクトリ処理機能を使用して読み上げ
        await voicevoxMain([outputDir]);
      } else {
        console.log('読み上げをスキップします。');
        process.exit(0);
      }
    });
    
  } catch (error) {
    console.error('予期せぬエラーが発生しました:', error);
  }
}

// プログラムを実行
if (require.main === module) {
  main().catch(error => {
    console.error('予期せぬエラーが発生しました:', error);
  });
}

module.exports = { main };
