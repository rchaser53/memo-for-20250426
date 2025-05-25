const axios = require('axios');
const fs = require('fs');
const path = require('path');
const player = require('play-sound')(opts = {});
const readlineSync = require('readline-sync');

// 設定ファイルのパス
const CONFIG_FILE = path.join(__dirname, 'config.json');

// デフォルト設定
let config = {
  api: {
    url: 'http://localhost:50021',
    timeout: 10000
  },
  speaker: {
    default_id: 0,
    name: '四国めたん（ノーマル）'
  },
  output: {
    dir: 'output',
    filename: 'output.wav'
  },
  playback: {
    auto_play: true
  }
};

// 設定ファイルを読み込む
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      // 深いマージを行う
      config = mergeConfig(config, fileConfig);
      console.log('設定ファイルを読み込みました');
    } else {
      console.log('設定ファイルが見つかりません。デフォルト設定を使用します');
      // デフォルト設定ファイルを作成
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
      console.log(`デフォルト設定ファイルを作成しました: ${CONFIG_FILE}`);
    }
  } catch (error) {
    console.error('設定ファイルの読み込みに失敗しました:', error.message);
    console.log('デフォルト設定を使用します');
  }
}

// 設定を深いマージする関数
function mergeConfig(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      result[key] = mergeConfig(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

// 設定を読み込む
loadConfig();

// VOICEVOXのAPIエンドポイント
const VOICEVOX_API_URL = config.api.url;

// 音声ファイルの保存先
const OUTPUT_DIR = path.join(__dirname, config.output.dir);

// 出力ディレクトリが存在しない場合は作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 音声ファイルを再生する
 * @param {string} filePath 音声ファイルのパス
 * @returns {Promise<void>}
 */
function playAudio(filePath) {
  return new Promise((resolve, reject) => {
    console.log('音声を再生中...');
    player.play(filePath, (err) => {
      if (err) {
        console.error('音声の再生中にエラーが発生しました:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * テキストを音声に変換する
 * @param {string} text 読み上げるテキスト
 * @param {number} speakerId 話者ID（指定しない場合は設定ファイルの値を使用）
 * @param {string} outputFile 出力ファイル名（指定しない場合は設定ファイルの値を使用）
 * @returns {Promise<string>} 保存された音声ファイルのパス
 */
async function textToSpeech(text, speakerId = config.speaker.default_id, outputFile = config.output.filename) {
  try {
    // 音声合成用のクエリを生成
    console.log('音声合成用のクエリを生成中...');
    const queryResponse = await axios.post(
      `${VOICEVOX_API_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
      {},
      { 
        headers: { 'Content-Type': 'application/json' },
        timeout: config.api.timeout
      }
    );
    
    // 音声を合成
    console.log('音声を合成中...');
    const synthesisResponse = await axios.post(
      `${VOICEVOX_API_URL}/synthesis?speaker=${speakerId}`,
      queryResponse.data,
      { 
        responseType: 'arraybuffer',
        headers: { 'Content-Type': 'application/json', 'Accept': 'audio/wav' },
        timeout: config.api.timeout
      }
    );
    
    // 音声ファイルを保存
    const filePath = path.join(OUTPUT_DIR, outputFile);
    fs.writeFileSync(filePath, Buffer.from(synthesisResponse.data));
    console.log(`音声ファイルを保存しました: ${filePath}`);
    
    // 自動再生が有効な場合は音声を再生
    if (config.playback.auto_play) {
      await playAudio(filePath);
    }
    
    return filePath;
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
    throw error;
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
