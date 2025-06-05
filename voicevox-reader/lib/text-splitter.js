const fs = require('fs');
const path = require('path');

/**
 * テキスト分割クラス
 */
class TextSplitter {
  constructor(config) {
    this.config = config;
  }

  /**
   * テキストを指定した文字数で分割
   */
  splitTextByLength(text, maxLength) {
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
   * 読み上げ用のファイルを生成（分割版）
   */
  createReadingFiles(summarizedArticles, outputDir) {
    const readingConfig = this.config.news?.reading || {};
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
        content += `${article.summary}`;
        
        // 文字数制限に応じてさらに分割
        const chunks = this.splitTextByLength(content, maxCharsPerFile);
        
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
      const chunks = this.splitTextByLength(allContent, maxCharsPerFile);
      
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
   * 要約結果をテキストファイルに出力
   */
  outputSummaryToFile(summarizedArticles, outputDir, outputFileName) {
    const outputFile = path.join(outputDir, outputFileName);
    
    // 出力ディレクトリが存在しない場合は作成
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 要約内容を生成
    let content = `# ニュース要約レポート\n`;
    content += `生成日時: ${new Date().toLocaleString('ja-JP')}\n`;
    content += `検索キーワード: ${this.config.news?.keywords?.join(', ') || 'なし'}\n`;
    content += `記事数: ${summarizedArticles.length}件\n`;
    content += `RSSフィード数: ${this.config.news?.rss_feeds?.length || 0}件\n\n`;
    
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
}

module.exports = TextSplitter;
