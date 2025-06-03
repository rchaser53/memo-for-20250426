const fs = require('fs');
const path = require('path');
const ConfigManager = require('./lib/config-manager');
const { processUrl, processUrls } = require('./lib/website-summarizer-core');
require('dotenv').config();

// 設定ファイルの読み込み
const configManager = new ConfigManager(path.join(__dirname, 'config.json'));
configManager.loadConfig();
const config = configManager.getConfig();

// コマンドライン引数の解析
const args = process.argv.slice(2);
const urlArg = args.find(arg => arg.startsWith('--url='));
const outputDirArg = args.find(arg => arg.startsWith('--output='));
const summaryLengthArg = args.find(arg => arg.startsWith('--length='));
const configArg = args.find(arg => arg.startsWith('--config'));

// パラメータの設定
let targetUrl = null;
let outputDir = null;
let summaryLength = 'medium';
let useConfigFile = configArg !== undefined;

// 設定ファイルからの読み込みかコマンドライン引数からの読み込みかを判断
if (useConfigFile) {
  console.log('📄 設定ファイルからURLリストを読み込みます');
  
  // 設定ファイルに websites セクションがあるか確認
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
  
  // 設定ファイルから出力ディレクトリと要約の長さを取得
  outputDir = config.websites.output_dir || 'website_summaries';
  summaryLength = config.websites.summary_length || 'medium';
  
  console.log(`📁 出力ディレクトリ: ${outputDir}`);
  console.log(`📏 要約の長さ: ${summaryLength}`);
  console.log(`🔢 処理するURL数: ${config.websites.urls.length}`);
  
} else {
  // コマンドライン引数からの実行
  if (!urlArg) {
    console.error('❌ エラー: URLが指定されていません');
    console.log('使用方法:');
    console.log('  設定ファイルから複数URLを処理: node website-summarizer.js --config');
    console.log('  単一URLを処理: node website-summarizer.js --url=<URL> --output=<出力ディレクトリ> [--length=<short|medium|long>]');
    process.exit(1);
  }

  if (!outputDirArg) {
    console.error('❌ エラー: 出力ディレクトリが指定されていません');
    console.log('使用方法: node website-summarizer.js --url=<URL> --output=<出力ディレクトリ> [--length=<short|medium|long>]');
    process.exit(1);
  }

  targetUrl = urlArg.split('=')[1];
  outputDir = outputDirArg.split('=')[1];
  summaryLength = summaryLengthArg ? summaryLengthArg.split('=')[1] : 'medium';
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('🚀 ウェブサイト要約処理を開始します...\n');
    
    if (useConfigFile) {
      // 設定ファイルから複数URLを処理
      const urls = config.websites.urls;
      const results = await processUrls(urls, outputDir, summaryLength);
      
      // 全体の結果をまとめたレポートを作成
      const allSummariesDir = path.join(outputDir, 'all_summaries');
      if (!fs.existsSync(allSummariesDir)) {
        fs.mkdirSync(allSummariesDir, { recursive: true });
      }
      
      // 全体のレポートを作成
      const reportContent = `# 複数ウェブサイト要約レポート

処理日時: ${new Date().toLocaleString('ja-JP')}

## 処理したURL一覧

${results.map((result, index) => `${index + 1}. [${result.url}](${result.url})`).join('\n')}

## 各サイトの要約

${results.map(result => `### ${result.url}\n\n${result.summary}\n\n[詳細レポート](${result.summaryFile})\n`).join('\n')}
`;
      
      const reportPath = path.join(allSummariesDir, 'all_websites_summary.md');
      fs.writeFileSync(reportPath, reportContent, 'utf8');
      
      console.log('\n✅ すべてのURLの処理が完了しました');
      console.log(`📄 全体レポート: ${reportPath}`);
      console.log(`📁 各URLの詳細レポートは ${outputDir} 内の各サブディレクトリにあります`);
      
      console.log('\n使用方法:');
      console.log('  設定ファイルから複数URLを処理: node website-summarizer.js --config');
      console.log('  単一URLを処理: node website-summarizer.js --url=<URL> --output=<出力ディレクトリ> [--length=<short|medium|long>]');
      console.log('例: node website-summarizer.js --url=https://example.com --output=./output --length=medium');
      
    } else {
      // 単一URLの処理
      await processUrl(targetUrl, outputDir, summaryLength);
      
      console.log('\n使用方法:');
      console.log('  設定ファイルから複数URLを処理: node website-summarizer.js --config');
      console.log('  単一URLを処理: node website-summarizer.js --url=<URL> --output=<出力ディレクトリ> [--length=<short|medium|long>]');
      console.log('例: node website-summarizer.js --url=https://example.com --output=./output --length=medium');
    }
    
  } catch (error) {
    console.error(`❌ エラーが発生しました: ${error.message}`);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみmain関数を実行
if (require.main === module) {
  main();
}

module.exports = {
  processUrl,
  processUrls,
  main
};
