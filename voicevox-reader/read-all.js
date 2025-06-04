const { main: newsReaderMain } = require('./news-reader');
const { main: websiteNewsReaderMain } = require('./website-news-reader');
const readlineSync = require('readline-sync');

/**
 * メイン関数
 */
async function main() {
  console.log('=== VOICEVOX 総合読み上げツール ===');
  
  try {    
    // コマンドライン引数を取得
    const args = process.argv.slice(2);
    let mode = '';
    
    // 引数がある場合はモードを設定
    if (args.length > 0) {
      mode = args[0].toLowerCase();
    }
    
    // モードが指定されていない場合は選択肢を表示
    if (!mode) {
      console.log('\n読み上げるコンテンツを選択してください:');
      console.log('1. RSSフィードからのニュース');
      console.log('2. 設定ファイルに記載されたウェブサイト');
      console.log('3. 両方');
      
      const choice = readlineSync.question('選択 (1-3): ');
      
      switch (choice) {
        case '1':
          mode = 'news';
          break;
        case '2':
          mode = 'website';
          break;
        case '3':
          mode = 'all';
          break;
        default:
          console.log('無効な選択です。プログラムを終了します。');
          process.exit(1);
      }
    }
    
    // 選択されたモードに応じて処理を実行
    switch (mode) {
      case 'news':
        console.log('\n=== RSSフィードからのニュース読み上げを開始します ===\n');
        await newsReaderMain();
        break;
        
      case 'website':
        console.log('\n=== ウェブサイト要約の読み上げを開始します ===\n');
        await websiteNewsReaderMain();
        break;
        
      case 'all':
        console.log('\n=== すべてのコンテンツの読み上げを開始します ===\n');
        
        // まずRSSフィードからのニュースを処理
        console.log('\n--- RSSフィードからのニュース ---\n');
        await newsReaderMain();
        
        // 次にウェブサイト要約を処理
        console.log('\n--- ウェブサイト要約 ---\n');
        await websiteNewsReaderMain();
        break;
        
      default:
        console.log(`無効なモード: ${mode}`);
        console.log('使用方法: node read-all.js [news|website|all]');
        process.exit(1);
    }
    
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
