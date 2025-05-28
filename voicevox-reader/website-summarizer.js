const { ChatOpenAI } = require("@langchain/openai");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { loadSummarizationChain } = require("langchain/chains");
const { PromptTemplate } = require("@langchain/core/prompts");
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const TextSplitter = require('./lib/text-splitter');
require('dotenv').config();

// コマンドライン引数の解析
const args = process.argv.slice(2);
const urlArg = args.find(arg => arg.startsWith('--url='));
const outputDirArg = args.find(arg => arg.startsWith('--output='));
const summaryLengthArg = args.find(arg => arg.startsWith('--length='));

// 必須パラメータのチェック
if (!urlArg) {
  console.error('❌ エラー: URLが指定されていません');
  console.log('使用方法: node website-summarizer.js --url=<URL> --output=<出力ディレクトリ> [--length=<short|medium|long>]');
  process.exit(1);
}

if (!outputDirArg) {
  console.error('❌ エラー: 出力ディレクトリが指定されていません');
  console.log('使用方法: node website-summarizer.js --url=<URL> --output=<出力ディレクトリ> [--length=<short|medium|long>]');
  process.exit(1);
}

// パラメータの設定
const targetUrl = urlArg.split('=')[1];
const outputDir = outputDirArg.split('=')[1];
const summaryLength = summaryLengthArg ? summaryLengthArg.split('=')[1] : 'medium';

// 要約の長さに応じた指示を設定
const getLengthInstruction = (length) => {
  switch (length.toLowerCase()) {
    case 'short':
    case 'brief':
      return '簡潔に2-3文で要約してください。';
    case 'medium':
    case 'normal':
      return '適度な長さ（5-8文程度）で要約してください。';
    case 'long':
    case 'detailed':
      return '詳細に10-15文程度で要約してください。';
    default:
      // 数値が指定された場合（例：--length=100）
      if (!isNaN(Number(length))) {
        return `約${length}文字程度で要約してください。`;
      }
      return '適度な長さで要約してください。';
  }
};

// テキストから特殊トークンやHTMLタグを除去する関数
const cleanText = (text) => {
  return text
    .replace(/<[^>]*>/g, '') // HTMLタグを除去
    .replace(/<\|endoftext\|>/g, '') // <|endoftext|>トークンを除去
    .replace(/<\|startoftext\|>/g, '') // <|startoftext|>トークンを除去
    .replace(/<\|[^|]*\|>/g, '') // その他の特殊トークンを除去
    .replace(/\x00/g, '') // NULL文字を除去
    .replace(/\s+/g, ' ') // 複数の空白を1つに
    .trim();
};

// 進行度表示クラス
class ProgressLogger {
  constructor(totalSteps) {
    this.startTime = Date.now();
    this.currentStep = 0;
    this.totalSteps = totalSteps;
  }

  logStep(stepName) {
    this.currentStep++;
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const progress = Math.floor((this.currentStep / this.totalSteps) * 100);
    console.log(`[${this.currentStep}/${this.totalSteps}] (${progress}%) ${stepName} - 経過時間: ${elapsed}秒`);
  }

  logComplete() {
    const totalTime = Math.floor((Date.now() - this.startTime) / 1000);
    console.log(`\n✅ 処理完了 - 総実行時間: ${totalTime}秒\n`);
  }
}

// トークン制限対応のレート制限クラス
class TokenRateLimiter {
  constructor(maxRequests = 200, maxTokens = 150000, timeWindow = 60000) {
    this.requests = [];
    this.tokenUsage = [];
    this.maxRequests = maxRequests;
    this.maxTokens = maxTokens;
    this.timeWindow = timeWindow;
  }

  async waitIfNeeded(estimatedTokens = 10000) {
    const now = Date.now();
    
    // 時間窓外の古いリクエストを削除
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    this.tokenUsage = this.tokenUsage.filter(usage => now - usage.time < this.timeWindow);
    
    // 現在のトークン使用量を計算
    const currentTokens = this.tokenUsage.reduce((sum, usage) => sum + usage.tokens, 0);
    
    // リクエスト数制限チェック
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest) + 1000;
      
      if (waitTime > 0) {
        console.log(`⏳ リクエスト制限のため ${Math.ceil(waitTime / 1000)} 秒待機します...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // トークン制限チェック
    if (currentTokens + estimatedTokens > this.maxTokens) {
      const oldestToken = Math.min(...this.tokenUsage.map(u => u.time));
      const waitTime = this.timeWindow - (now - oldestToken) + 1000;
      
      if (waitTime > 0) {
        console.log(`⏳ トークン制限のため ${Math.ceil(waitTime / 1000)} 秒待機します...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
    this.tokenUsage.push({ time: now, tokens: estimatedTokens });
  }
}

// ウェブサイトからテキストを取得する関数
async function fetchWebsiteContent(url) {
  try {
    console.log(`🌐 ウェブサイトからコンテンツを取得中: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000 // 30秒のタイムアウト
    });
    
    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.data;
  } catch (error) {
    console.error(`❌ ウェブサイトの取得に失敗しました: ${error.message}`);
    throw error;
  }
}

// メイン処理
async function main() {
  try {
    console.log('🚀 ウェブサイト要約処理を開始します...\n');
    
    // 進行度ロガーを初期化（推定ステップ数）
    const progressLogger = new ProgressLogger(6);
    
    console.log(`🌐 対象URL: ${targetUrl}`);
    console.log(`📁 出力ディレクトリ: ${outputDir}`);
    console.log(`📏 要約の長さ: ${summaryLength}\n`);
    
    progressLogger.logStep('設定の初期化完了');
    
    // ウェブサイトからコンテンツを取得
    const htmlContent = await fetchWebsiteContent(targetUrl);
    progressLogger.logStep('ウェブサイトコンテンツの取得完了');
    
    // HTMLからテキストを抽出してクリーニング
    const text = cleanText(htmlContent);
    
    // テキストが空でないことを確認
    if (!text || text.length === 0) {
      console.error('❌ エラー: 処理可能なテキストが見つかりません');
      process.exit(1);
    }
    
    console.log(`📊 処理するテキストの長さ: ${text.length.toLocaleString()}文字`);
    
    // OpenAIモデル初期化
    const llm = new ChatOpenAI({
      temperature: 0.1,
      model: "gpt-4o-mini",
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxConcurrency: 1,
      maxRetries: 0,
    });
    
    // レート制限インスタンスを作成
    const rateLimiter = new TokenRateLimiter(200, 150000, 60000);
    
    // テキストを文書オブジェクトに変換
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 30000,
      chunkOverlap: 1000,
    });
    const documents = await splitter.createDocuments([text]);
    
    console.log(`📑 文書の分割数: ${documents.length}個`);
    console.log(`🔢 予想リクエスト数: ${documents.length + 1}回\n`);
    
    progressLogger.logStep('テキスト分割完了');
    
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
    
    progressLogger.logStep('要約チェーンの作成完了');
    
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
    
    progressLogger.logStep('要約処理完了');
    
    // 出力ディレクトリを作成
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // TextSplitterを使用してファイルを分割・出力
    const config = {
      news: {
        reading: {
          split_files: true,
          max_chars_per_file: 300,
          include_metadata: true,
          output_prefix: 'website_summary_'
        }
      }
    };
    
    const textSplitter = new TextSplitter(config);
    
    // 要約結果を記事形式に変換
    const summarizedArticles = [{
      title: `ウェブサイト要約: ${targetUrl}`,
      summary: summary.text,
      source: targetUrl,
      pubDate: new Date().toLocaleString('ja-JP'),
      link: targetUrl
    }];
    
    // 分割されたファイルを作成
    const createdFiles = textSplitter.createReadingFiles(summarizedArticles, outputDir);
    
    // 要約結果をまとめたファイルも作成
    const summaryFile = textSplitter.outputSummaryToFile(
      summarizedArticles, 
      outputDir, 
      'website_summary_report.md'
    );
    
    progressLogger.logStep('ファイル出力完了');
    progressLogger.logComplete();
    
    console.log('=== 要約結果 ===');
    console.log(summary.text);
    console.log('\n=== 作成されたファイル ===');
    console.log(`📄 要約レポート: ${summaryFile}`);
    console.log('📄 分割ファイル:');
    createdFiles.forEach(file => {
      console.log(`  - ${file}`);
    });
    
    console.log('\n使用方法:');
    console.log('node website-summarizer.js --url=<URL> --output=<出力ディレクトリ> [--length=<short|medium|long>]');
    console.log('例: node website-summarizer.js --url=https://example.com --output=./output --length=medium');
    
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
  fetchWebsiteContent,
  cleanText,
  getLengthInstruction,
  ProgressLogger,
  TokenRateLimiter
};
