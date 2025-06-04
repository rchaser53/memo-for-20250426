const path = require('path');
const ConfigManager = require('./lib/config-manager');
const { processUrls } = require('./lib/website-summarizer-core');
const { callVoicevoxAPI } = require('./index');

// 設定ファイルのパス
const CONFIG_FILE = path.join(__dirname, 'config.json');

/**
 * メイン関数
 */
async function main() {
  console.log('=== ウェブサイト要約読み上げツール ===');
  
  try {
    // 設定を初期化
    const configManager = new ConfigManager(CONFIG_FILE);
    configManager.loadConfig();
    const config = configManager.getConfig();
    
    // 設定ファイルからウェブサイトURLを取得
    if (!config.websites || !config.websites.urls || !Array.isArray(config.websites.urls) || config.websites.urls.length === 0) {
      console.error('❌ エラー: 設定ファイルに有効なwebsites.urlsが設定されていません');
      console.log('config.jsonに以下のような設定を追加してください:');
      console.log(`
  "websites": {
    "urls": [
      "https://example.com",
      "https://example.org"
    ],
    "output_dir": "website_summaries",
    "summary_length": "medium"
  }`);
      process.exit(1);
    }
    
    const urls = config.websites.urls;
    const outputDir = config.websites.output_dir || 'website_summaries';
    const summaryLength = config.websites.summary_length || 'medium';
    
    console.log(`📋 処理するURL一覧:`);
    urls.forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`);
    });
    console.log('');
    
    // 複数URLを処理
    const results = await processUrls(urls, outputDir, summaryLength);
    
    if (results.length === 0) {
      console.log('処理に成功したURLがありませんでした。');
      return;
    }
    
    // 読み上げ用ディレクトリのパスを収集
    const readingDirs = results.map(result => result.outputDir);
    
    console.log('\n=== 要約が完了しました ===');
    console.log(`${results.length}個のウェブサイトが処理されました。`);
    
    // ユーザーに読み上げを開始するか確認
    console.log('\nこれらの要約を読み上げますか？ (y/n)');
    process.stdin.once('data', async (data) => {
      const input = data.toString().trim().toLowerCase();
      
      if (input === 'y' || input === 'yes') {
        console.log('\n=== 読み上げを開始します ===');
        
        // 各ディレクトリを順番に読み上げ
        for (let i = 0; i < readingDirs.length; i++) {
          const dir = readingDirs[i];
          console.log(`\n[${i + 1}/${readingDirs.length}] ${dir} の読み上げを開始します...`);
          
          // index.jsのディレクトリ処理機能を使用して読み上げ
          await callVoicevoxAPI(dir);
          
          // 最後のディレクトリ以外の場合は少し待機
          if (i < readingDirs.length - 1) {
            console.log('次のウェブサイトに進みます...\n');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        console.log('\nすべてのウェブサイト要約の読み上げが完了しました。');
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
