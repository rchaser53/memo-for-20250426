/**
 * テキスト処理ユーティリティ
 * ウェブサイト要約に関連するテキスト処理機能を提供します
 */

/**
 * テキストから特殊トークンやHTMLタグを除去する関数
 * @param {string} text - クリーニングするテキスト
 * @returns {string} クリーニングされたテキスト
 */
function cleanText(text) {
  return text
    .replace(/<[^>]*>/g, '') // HTMLタグを除去
    .replace(/<\|endoftext\|>/g, '') // <|endoftext|>トークンを除去
    .replace(/<\|startoftext\|>/g, '') // <|startoftext|>トークンを除去
    .replace(/<\|[^|]*\|>/g, '') // その他の特殊トークンを除去
    .replace(/\x00/g, '') // NULL文字を除去
    .replace(/\s+/g, ' ') // 複数の空白を1つに
    .trim();
}

/**
 * 要約の長さに応じた指示を設定
 * @param {string} length - 要約の長さ指定
 * @returns {string} 要約の指示文
 */
function getLengthInstruction(length) {
  let content = '';
  switch (length.toLowerCase()) {
    case 'short':
    case 'brief':
      content += '簡潔に2-3文で要約してください。';
      break
    case 'medium':
    case 'normal':
      content += '適度な長さ（5-8文程度）で要約してください。';
      break
    case 'long':
    case 'detailed':
      content +=  '詳細に10-15文程度で要約してください。';
      break
    default:
      // 数値が指定された場合（例：--length=100）
      if (!isNaN(Number(length))) {
        content +=  `約${length}文字程度で要約してください。`;
      }
      content +=  '適度な長さで要約してください。';
      break
  }

  return `${content}。要約は日本語で行ってください。記事のタイトルとして抽出できそうな部分があれば、1行目にタイトルを記載してください。`;
}

module.exports = {
  cleanText,
  getLengthInstruction
};
