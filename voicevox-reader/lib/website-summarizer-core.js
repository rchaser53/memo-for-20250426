const { ChatOpenAI } = require("@langchain/openai");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { loadSummarizationChain } = require("langchain/chains");
const { PromptTemplate } = require("@langchain/core/prompts");
const fs = require('fs');
const path = require('path');
const TextSplitter = require('./text-splitter');
const { cleanText, getLengthInstruction } = require('./text-utils');
const { fetchWebsiteContent } = require('./website-fetcher');
require('dotenv').config();

/**
 * 単一URLの要約処理
 * @param {string} url 要約するURL
 * @param {string} outputDir 出力ディレクトリ
 * @param {string} summaryLength 要約の長さ（short, medium, long）
 * @returns {Promise<Object|null>} 要約結果オブジェクトまたはnull（エラー時）
 */
async function processUrl(url, outputDir, summaryLength) {
  try {
    console.log(`\n🌐 対象URL: ${url}`);
    console.log(`📁 出力ディレクトリ: ${outputDir}`);
    console.log(`📏 要約の長さ: ${summaryLength}\n`);
    
    // 進行度ロガーを初期化（推定ステップ数）
    const progressLogger = require('./progress-logger');
    const logger = new progressLogger(6);
    logger.logStep('設定の初期化完了');
    
    // ウェブサイトからコンテンツを取得
    const htmlContent = await fetchWebsiteContent(url);
    logger.logStep('ウェブサイトコンテンツの取得完了');
    
    // HTMLからテキストを抽出してクリーニング
    const text = cleanText(htmlContent);
    
    // テキストが空でないことを確認
    if (!text || text.length === 0) {
      console.error(`❌ エラー: ${url} から処理可能なテキストが見つかりません`);
      return null;
    }
    
    console.log(`📊 処理するテキストの長さ: ${text.length.toLocaleString()}文字`);
    
    // OpenAIモデル初期化
    const llm = new ChatOpenAI({
      temperature: 0.1,
      model: "gpt-4o-mini",
      openAIApiKey: process.env.OPENAI_API_KEY,
      configuration: {
       baseURL: process.env.OPENAI_API_URL,
      },
      maxConcurrency: 1,
      maxRetries: 0,
    });
    
    // レート制限インスタンスを作成
    const TokenRateLimiter = require('./token-rate-limiter');
    const rateLimiter = new TokenRateLimiter(200, 150000, 60000);
    
    // テキストを文書オブジェクトに変換
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 30000,
      chunkOverlap: 1000,
    });
    const documents = await splitter.createDocuments([text]);
    
    console.log(`📑 文書の分割数: ${documents.length}個`);
    console.log(`🔢 予想リクエスト数: ${documents.length + 1}回\n`);
    
    logger.logStep('テキスト分割完了');
    
    // カスタムプロンプトテンプレートを作成
    const mapPrompt = PromptTemplate.fromTemplate(`
${getLengthInstruction(summaryLength)}

テキスト: {text}

要約:`);

    const combinePrompt = PromptTemplate.fromTemplate(`
${getLengthInstruction(summaryLength)}

要約リスト:
{text}

最終要約:`);
    
    // 要約チェーンを作成
    const chain = await loadSummarizationChain(llm, {
      type: "map_reduce",
      combineMapPrompt: mapPrompt,
      combinePrompt: combinePrompt,
    });
    
    logger.logStep('要約チェーンの作成完了');
    
    // 各チャンクを順次処理（トークン制限対応）
    console.log('🤖 AIによる要約処理を実行中...');
    
    const estimatedTokensPerChunk = Math.ceil(30000 / 4);
    
    for (let i = 0; i < documents.length; i++) {
      await rateLimiter.waitIfNeeded(estimatedTokensPerChunk);
      console.log(`📝 チャンク ${i + 1}/${documents.length} を処理中...`);
    }
    
    // 最終的な要約を実行
    await rateLimiter.waitIfNeeded(estimatedTokensPerChunk);
    const summary = await chain.invoke({
      input_documents: documents,
    });
    
    logger.logStep('要約処理完了');
    
    // 出力ディレクトリを作成
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // URLからサブディレクトリ名を生成
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/\./g, '_');
    const pathname = urlObj.pathname.replace(/\//g, '_').replace(/\./g, '_');
    const urlSubdir = `${hostname}${pathname}`.substring(0, 50); // 長すぎる場合は切り詰める
    
    // URLごとのサブディレクトリを作成
    const urlOutputDir = path.join(outputDir, urlSubdir);
    if (!fs.existsSync(urlOutputDir)) {
      fs.mkdirSync(urlOutputDir, { recursive: true });
    }
    
    // TextSplitterを使用してファイルを分割・出力
    const splitterConfig = {
      news: {
        reading: {
          split_files: true,
          max_chars_per_file: 100,
          include_metadata: true,
          output_prefix: 'website_summary_'
        }
      }
    };
    
    const textSplitter = new TextSplitter(splitterConfig);
    
    // 要約結果を記事形式に変換
    const summarizedArticles = [{
      title: `ウェブサイト要約: ${url}`,
      summary: summary.text,
      source: url,
      pubDate: new Date().toLocaleString('ja-JP'),
      link: url
    }];
    
    // 分割されたファイルを作成
    const createdFiles = textSplitter.createReadingFiles(summarizedArticles, urlOutputDir);
    
    // 要約結果をまとめたファイルも作成
    const summaryFile = textSplitter.outputSummaryToFile(
      summarizedArticles, 
      urlOutputDir, 
      'website_summary_report.md'
    );
    
    logger.logStep('ファイル出力完了');
    logger.logComplete();
    
    console.log('=== 要約結果 ===');
    console.log(summary.text);
    console.log('\n=== 作成されたファイル ===');
    console.log(`📄 要約レポート: ${summaryFile}`);
    console.log('📄 分割ファイル:');
    createdFiles.forEach(file => {
      console.log(`  - ${file}`);
    });
    
    return {
      url,
      summaryFile,
      createdFiles,
      summary: summary.text,
      outputDir: urlOutputDir
    };
    
  } catch (error) {
    console.error(`❌ URL ${url} の処理中にエラーが発生しました: ${error.message}`);
    return null;
  }
}

/**
 * 複数のURLを処理する
 * @param {string[]} urls 処理するURLの配列
 * @param {string} outputDir 出力ディレクトリ
 * @param {string} summaryLength 要約の長さ
 * @returns {Promise<Array>} 処理結果の配列
 */
async function processUrls(urls, outputDir, summaryLength) {
  console.log(`📋 処理するURL一覧:`);
  urls.forEach((url, index) => {
    console.log(`  ${index + 1}. ${url}`);
  });
  console.log('');
  
  const results = [];
  
  for (let i = 0; i < urls.length; i++) {
    console.log(`\n🔄 URL ${i + 1}/${urls.length} を処理中...`);
    const result = await processUrl(urls[i], outputDir, summaryLength);
    if (result) {
      results.push(result);
    }
  }
  
  return results;
}

module.exports = {
  processUrl,
  processUrls
};
