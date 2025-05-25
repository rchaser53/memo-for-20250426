const axios = require('axios');
const fs = require('fs');
const path = require('path');
const player = require('play-sound')(opts = {});
const readlineSync = require('readline-sync');

// VOICEVOXのAPIエンドポイント（デフォルトでは50021ポートで動作）
const VOICEVOX_API_URL = 'http://localhost:50021';

// 音声合成に使用するスピーカーID（0: 四国めたん（ノーマル））
const SPEAKER_ID = 0;

// 音声ファイルの保存先
const OUTPUT_DIR = path.join(__dirname, 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'output.wav');

// 出力ディレクトリが存在しない場合は作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * テキストを音声に変換する
 * @param {string} text 読み上げるテキスト
 * @returns {Promise<void>}
 */
async function textToSpeech(text) {
  try {
    // 音声合成用のクエリを生成
    console.log('音声合成用のクエリを生成中...');
    const queryResponse = await axios.post(
      `${VOICEVOX_API_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${SPEAKER_ID}`,
      {},
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    // 音声を合成
    console.log('音声を合成中...');
    const synthesisResponse = await axios.post(
      `${VOICEVOX_API_URL}/synthesis?speaker=${SPEAKER_ID}`,
      queryResponse.data,
      { 
        responseType: 'arraybuffer',
        headers: { 'Content-Type': 'application/json', 'Accept': 'audio/wav' }
      }
    );
    
    // 音声ファイルを保存
    fs.writeFileSync(OUTPUT_FILE, Buffer.from(synthesisResponse.data));
    console.log(`音声ファイルを保存しました: ${OUTPUT_FILE}`);
    
    // 音声を再生
    console.log('音声を再生中...');
    player.play(OUTPUT_FILE, (err) => {
      if (err) {
        console.error('音声の再生中にエラーが発生しました:', err);
      }
    });
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('VOICEVOXエンジンに接続できませんでした。VOICEVOXが起動しているか確認してください。');
      console.error('VOICEVOXのダウンロード: https://voicevox.hiroshiba.jp/');
    } else {
      console.error('エラーが発生しました:', error.message);
      if (error.response) {
        console.error('レスポンス:', error.response.data);
      }
    }
  }
}

/**
 * ファイルからテキストを読み込む
 * @param {string} filePath ファイルパス
 * @returns {string} ファイルの内容
 */
function readTextFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`ファイルの読み込みに失敗しました: ${filePath}`);
    console.error(error.message);
    return null;
  }
}

/**
 * メイン関数
 */
async function main() {
  console.log('=== VOICEVOX テキスト読み上げツール ===');
  
  // コマンドライン引数を取得
  const args = process.argv.slice(2);
  
  // ファイルパスが指定されている場合
  if (args.length > 0) {
    const filePath = args[0];
    console.log(`ファイルを読み込んでいます: ${filePath}`);
    
    const fileContent = readTextFile(filePath);
    if (fileContent) {
      console.log('ファイルの内容を読み上げます...');
      await textToSpeech(fileContent);
    }
    return;
  }
  
  // 対話モード
  console.log('対話モードを開始します。');
  console.log('終了するには "exit" と入力してください。');
  
  while (true) {
    const text = readlineSync.question('\n読み上げるテキストを入力してください: ');
    
    if (text.toLowerCase() === 'exit') {
      console.log('プログラムを終了します。');
      break;
    }
    
    if (text.trim() === '') {
      console.log('テキストが入力されていません。');
      continue;
    }
    
    await textToSpeech(text);
  }
}

// プログラムを実行
main().catch(error => {
  console.error('予期せぬエラーが発生しました:', error);
});
