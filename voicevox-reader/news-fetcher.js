const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const axios = require('axios');

// 設定ファイルのパス
const CONFIG_FILE = path.join(__dirname, 'config.json');

// デフォルト設定
let config = {
  news: {
    keywords: ["AI", "人工知能", "テクノロジー"],
    max_articles: 5,
    summary_length: 200,
    output_file: "news_summary.txt",
    language: "ja",
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

// 設定ファイルを読み込む
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      config = { ...config, ...fileConfig };
      console.log('設定ファイルを読み込みました');
    } else {
      console.log('設定ファイルが見つかりません。デフォルト設定を使用します');
    }
  } catch (error) {
    console.error('設定ファイルの読み込みに失敗しました:', error.message);
    console.log('デフォルト設定を使用します');
  }
}

// 日本語ニュースのRSSフィード一覧
const RSS_FEEDS = [
  'https://news.yahoo.co.jp/rss/topics/it.xml',
  'https://feeds.feedburner.com/itmedia/news',
  'https://rss.cnn.com/rss/edition.rss',
  'https://feeds.bbci.co.uk/news/technology/rss.xml'
];

// RSSパーサーを初期化
const parser = new Parser({
  customFields: {
    item: ['description', 'content:encoded']
  }
});

/**
 * テキストを要約する（簡易版）
 * @param {string} text 要約するテキスト
 * @param {number} maxLength 最大文字数
 * @returns {string} 要約されたテキスト
 */
function summarizeText(text, maxLength) {
  // HTMLタグを除去
  const cleanText = text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '');
  
  // 文章を句点で分割
  const sentences = cleanText.split(/[。．！？\n]/).filter(s => s.trim().length > 0);
  
  let summary = '';
  let currentLength = 0;
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (trimmedSentence.length === 0) continue;
    
    // 文章を追加しても最大文字数を超えない場合
    if (currentLength + trimmedSentence.length + 1 <= maxLength) {
      summary += (summary ? '。' : '') + trimmedSentence;
      currentLength += trimmedSentence.length + 1;
    } else {
      break;
    }
  }
  
  // 最後に句点を追加
  if (summary && !summary.endsWith('。')) {
    summary += '。';
  }
  
  return summary || cleanText.substring(0, maxLength) + '...';
}

/**
 * キーワードがテキストに含まれているかチェック
 * @param {string} text チェックするテキスト
 * @param {Array} keywords キーワードの配列
 * @returns {boolean} キーワードが含まれている場合はtrue
 */
function containsKeywords(text, keywords) {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
}

/**
 * RSSフィードからニュースを取得
 * @param {string} feedUrl RSSフィードのURL
 * @returns {Promise<Array>} ニュース記事の配列
 */
async function fetchNewsFromRSS(feedUrl) {
  try {
    console.log(`RSSフィードを取得中: ${feedUrl}`);
    const feed = await parser.parseURL(feedUrl);
    
    return feed.items.map(item => ({
      title: item.title || '',
      description: item.description || item.contentSnippet || '',
      content: item['content:encoded'] || item.description || '',
      link: item.link || '',
      pubDate: item.pubDate || '',
      source: feed.title || 'Unknown'
    }));
  } catch (error) {
    console.error(`RSSフィードの取得に失敗しました (${feedUrl}):`, error.message);
    return [];
  }
}

/**
 * 複数のRSSフィードからニュースを取得
 * @returns {Promise<Array>} 全ニュース記事の配列
 */
async function fetchAllNews() {
  const allNews = [];
  
  for (const feedUrl of RSS_FEEDS) {
    const news = await fetchNewsFromRSS(feedUrl);
    allNews.push(...news);
  }
  
  return allNews;
}

/**
 * ニュースをフィルタリングして要約
 * @param {Array} articles ニュース記事の配列
 * @returns {Array} フィルタリング・要約されたニュース記事の配列
 */
function filterAndSummarizeNews(articles) {
  const keywords = config.news.keywords;
  const summaryLength = config.news.summary_length;
  
  // キーワードに関連する記事をフィルタリング
  const relevantArticles = articles.filter(article => {
    const searchText = `${article.title} ${article.description} ${article.content}`;
    return containsKeywords(searchText, keywords);
  });
  
  // 重複を除去（タイトルベース）
  const uniqueArticles = relevantArticles.filter((article, index, self) => 
    index === self.findIndex(a => a.title === article.title)
  );
  
  // 最大記事数に制限
  const limitedArticles = uniqueArticles.slice(0, config.news.max_articles);
  
  // 各記事を要約
  return limitedArticles.map(article => ({
    ...article,
    summary: summarizeText(article.content || article.description, summaryLength)
  }));
}

/**
 * 読み上げ用のファイルを生成（分割版）
 * @param {Array} summarizedArticles 要約されたニュース記事の配列
 * @returns {Array} 生成されたファイルのパス一覧
 */
function createReadingFiles(summarizedArticles) {
  const outputDir = path.join(__dirname, config.output.dir);
  const readingConfig = config.news.reading || {};
  const splitFiles = readingConfig.split_files !== false;
  const maxCharsPerFile = readingConfig.max_chars_per_file || 300;
  const includeMetadata = readingConfig.include_metadata === true;
  const outputPrefix = readingConfig.output_prefix || 'news_reading_';
  
  // 出力ディレクトリが存在しない場合は作成
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const createdFiles = [];
  
  if (splitFiles) {
    // 各記事を個別のファイルに分割
    summarizedArticles.forEach((article, index) => {
      let content = '';
      
      if (includeMetadata) {
        content += `記事${index + 1}。`;
      }
      
      content += `${article.title}。`;
      content += `${article.summary}`;
      
      // 文字数制限に応じてさらに分割
      const chunks = splitTextByLength(content, maxCharsPerFile);
      
      chunks.forEach((chunk, chunkIndex) => {
        const fileName = `${outputPrefix}${String(index + 1).padStart(2, '0')}_${String(chunkIndex + 1).padStart(2, '0')}.txt`;
        const filePath = path.join(outputDir, fileName);
        
        fs.writeFileSync(filePath, chunk, 'utf8');
        createdFiles.push(filePath);
        console.log(`読み上げ用ファイルを作成しました: ${fileName}`);
      });
    });
  } else {
    // 全記事を1つのファイルにまとめる
    let allContent = '';
    
    if (includeMetadata) {
      allContent += `ニュース要約。${summarizedArticles.length}件の記事があります。`;
    }
    
    summarizedArticles.forEach((article, index) => {
      if (includeMetadata) {
        allContent += `記事${index + 1}。`;
      }
      allContent += `${article.title}。`;
      allContent += `${article.summary}。`;
    });
    
    // 文字数制限に応じて分割
    const chunks = splitTextByLength(allContent, maxCharsPerFile);
    
    chunks.forEach((chunk, chunkIndex) => {
      const fileName = `${outputPrefix}${String(chunkIndex + 1).padStart(2, '0')}.txt`;
      const filePath = path.join(outputDir, fileName);
      
      fs.writeFileSync(filePath, chunk, 'utf8');
      createdFiles.push(filePath);
      console.log(`読み上げ用ファイルを作成しました: ${fileName}`);
    });
  }
  
  return createdFiles;
}

/**
 * テキストを指定した文字数で分割
 * @param {string} text 分割するテキスト
 * @param {number} maxLength 最大文字数
 * @returns {Array} 分割されたテキストの配列
 */
function splitTextByLength(text, maxLength) {
  const chunks = [];
  let currentChunk = '';
  
  // 文を句点で分割
  const sentences = text.split(/([。．！？])/).filter(s => s.length > 0);
  
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i] + (sentences[i + 1] || '');
    
    // 現在のチャンクに追加しても制限を超えない場合
    if (currentChunk.length + sentence.length <= maxLength) {
      currentChunk += sentence;
    } else {
      // 現在のチャンクを保存して新しいチャンクを開始
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // 文が制限を超える場合は強制的に分割
      if (sentence.length > maxLength) {
        const forceSplit = sentence.match(new RegExp(`.{1,${maxLength}}`, 'g')) || [sentence];
        chunks.push(...forceSplit);
      } else {
        currentChunk = sentence;
      }
    }
  }
  
  // 残りのチャンクを追加
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * 要約結果をテキストファイルに出力
 * @param {Array} summarizedArticles 要約されたニュース記事の配列
 */
function outputSummaryToFile(summarizedArticles) {
  const outputDir = path.join(__dirname, config.output.dir);
  const outputFile = path.join(outputDir, config.news.output_file);
  
  // 出力ディレクトリが存在しない場合は作成
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 要約内容を生成
  let content = `# ニュース要約レポート\n`;
  content += `生成日時: ${new Date().toLocaleString('ja-JP')}\n`;
  content += `検索キーワード: ${config.news.keywords.join(', ')}\n`;
  content += `記事数: ${summarizedArticles.length}件\n\n`;
  
  summarizedArticles.forEach((article, index) => {
    content += `## ${index + 1}. ${article.title}\n`;
    content += `**ソース**: ${article.source}\n`;
    content += `**公開日**: ${article.pubDate}\n`;
    content += `**URL**: ${article.link}\n\n`;
    content += `**要約**:\n${article.summary}\n\n`;
    content += `---\n\n`;
  });
  
  // ファイルに書き込み
  fs.writeFileSync(outputFile, content, 'utf8');
  console.log(`要約結果を保存しました: ${outputFile}`);
  
  return outputFile;
}

/**
 * メイン関数
 */
async function main() {
  console.log('=== ニュース取得・要約ツール ===');
  
  try {
    // 設定を読み込み
    loadConfig();
    
    console.log(`検索キーワード: ${config.news.keywords.join(', ')}`);
    console.log(`最大記事数: ${config.news.max_articles}`);
    console.log(`要約文字数: ${config.news.summary_length}`);
    
    // ニュースを取得
    console.log('\nニュースを取得中...');
    const allNews = await fetchAllNews();
    console.log(`${allNews.length}件のニュースを取得しました`);
    
    // フィルタリングと要約
    console.log('\nニュースをフィルタリング・要約中...');
    const summarizedNews = filterAndSummarizeNews(allNews);
    console.log(`${summarizedNews.length}件の関連ニュースを見つけました`);
    
    if (summarizedNews.length === 0) {
      console.log('キーワードに関連するニュースが見つかりませんでした。');
      return;
    }
    
    // 詳細版ファイルに出力
    const outputFile = outputSummaryToFile(summarizedNews);
    
    // 読み上げ用ファイルを生成
    console.log('\n読み上げ用ファイルを生成中...');
    const readingFiles = createReadingFiles(summarizedNews);
    
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
  loadConfig,
  fetchAllNews,
  filterAndSummarizeNews,
  outputSummaryToFile,
  createReadingFiles,
  splitTextByLength
};
