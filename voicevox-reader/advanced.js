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

// 音声ファイルの保存先ディレクトリ
const OUTPUT_DIR = path.join(__dirname, config.output.dir);

// 出力ディレクトリが存在しない場合は作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 話者の一覧（一部）
const SPEAKERS = [
  { id: 0, name: '四国めたん（ノーマル）' },
  { id: 1, name: '四国めたん（あまあま）' },
  { id: 2, name: '四国めたん（ツンツン）' },
  { id: 3, name: '四国めたん（セクシー）' },
  { id: 4, name: 'ずんだもん（ノーマル）' },
  { id: 5, name: 'ずんだもん（あまあま）' },
  { id: 6, name: 'ずんだもん（ツンツン）' },
  { id: 7, name: 'ずんだもん（セクシー）' },
  { id: 8, name: '春日部つむぎ（ノーマル）' },
  { id: 9, name: '雨晴はう（ノーマル）' },
  { id: 10, name: '波音リツ（ノーマル）' },
  { id: 11, name: '玄野武宏（ノーマル）' },
  { id: 12, name: '白上虎太郎（ノーマル）' },
  { id: 13, name: '青山龍星（ノーマル）' },
  { id: 14, name: '冥鳴ひまり（ノーマル）' },
  { id: 15, name: '九州そら（ノーマル）' },
];

/**
 * 利用可能な話者の一覧を取得する
 * @returns {Promise<Array>} 話者の一覧
 */
async function getSpeakers() {
  try {
    const response = await axios.get(`${VOICEVOX_API_URL}/speakers`, {
      timeout: config.api.timeout
    });
    return response.data;
  } catch (error) {
    console.error('話者一覧の取得に失敗しました:', error.message);
    // エラーが発生した場合はデフォルトの話者リストを返す
    return SPEAKERS;
  }
}

/**
 * テキストを音声に変換する
 * @param {string} text 読み上げるテキスト
 * @param {number} speakerId 話者ID
 * @param {string} outputFile 出力ファイル名
 * @returns {Promise<string>} 保存された音声ファイルのパス
 */
async function textToSpeech(text, speakerId, outputFile) {
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
 * 話者を選択する
 * @param {Array} speakers 話者の一覧
 * @returns {number} 選択された話者のID
 */
function selectSpeaker(speakers) {
  console.log('\n=== 話者を選択してください ===');
  
  // 話者の一覧を表示
  speakers.forEach((speaker, index) => {
    console.log(`${index + 1}. ${speaker.name}`);
  });
  
  // 話者を選択
  const selection = readlineSync.question(`\n番号を入力してください (デフォルト: ${config.speaker.default_id + 1}): `);
  
  // 入力が空の場合はデフォルト値を使用
  if (selection.trim() === '') {
    return config.speaker.default_id;
  }
  
  // 入力値を数値に変換
  const index = parseInt(selection, 10) - 1;
  
  // 入力値が範囲外の場合はデフォルト値を使用
  if (isNaN(index) || index < 0 || index >= speakers.length) {
    console.log('無効な選択です。デフォルトの話者を使用します。');
    return config.speaker.default_id;
  }
  
  return speakers[index].id;
}

/**
 * 出力ファイル名を取得する
 * @returns {string} 出力ファイル名
 */
function getOutputFileName() {
  const defaultFileName = `output_${Date.now()}.wav`;
  const fileName = readlineSync.question(`\n出力ファイル名を入力してください (デフォルト: ${defaultFileName}): `);
  
  // 入力が空の場合はデフォルト値を使用
  if (fileName.trim() === '') {
    return defaultFileName;
  }
  
  // 拡張子が .wav でない場合は追加
  if (!fileName.toLowerCase().endsWith('.wav')) {
    return `${fileName}.wav`;
  }
  
  return fileName;
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
  console.log('=== VOICEVOX テキスト読み上げツール (拡張版) ===');
  
  try {
    // 利用可能な話者の一覧を取得
    const speakers = await getSpeakers();
    
    // 簡易表示用の話者リスト
    const simpleSpeakers = speakers.map(speaker => {
      // スタイルが複数ある場合は最初のスタイルを使用
      const style = speaker.styles && speaker.styles.length > 0 ? speaker.styles[0] : { id: speaker.id, name: speaker.name };
      return { id: style.id, name: `${speaker.name} (${style.name})` };
    });
    
    // コマンドライン引数を取得
    const args = process.argv.slice(2);
    
    // ファイルパスが指定されている場合
    if (args.length > 0) {
      const filePath = args[0];
      console.log(`ファイルを読み込んでいます: ${filePath}`);
      
      const fileContent = readTextFile(filePath);
      if (fileContent) {
        // 話者を選択
        const speakerId = selectSpeaker(simpleSpeakers);
        const selectedSpeaker = simpleSpeakers.find(s => s.id === speakerId);
        console.log(`選択された話者: ${selectedSpeaker ? selectedSpeaker.name : `ID: ${speakerId}`}`);
        
        // 出力ファイル名を取得
        const outputFile = getOutputFileName();
        
        console.log('ファイルの内容を読み上げます...');
        // テキストを音声に変換
        const audioFile = await textToSpeech(fileContent, speakerId, outputFile);
        
        // 自動再生が有効な場合は音声を再生
        if (config.playback.auto_play) {
          await playAudio(audioFile);
        }
      }
      return;
    }
    
    // 対話モード
    console.log('対話モードを開始します。');
    console.log('終了するには "exit" と入力してください。');
    
    while (true) {
      // 話者を選択
      const speakerId = selectSpeaker(simpleSpeakers);
      const selectedSpeaker = simpleSpeakers.find(s => s.id === speakerId);
      console.log(`選択された話者: ${selectedSpeaker ? selectedSpeaker.name : `ID: ${speakerId}`}`);
      
      // 出力ファイル名を取得
      const outputFile = getOutputFileName();
      
      // テキストを入力
      const text = readlineSync.question('\n読み上げるテキストを入力してください: ');
      
      if (text.toLowerCase() === 'exit') {
        console.log('プログラムを終了します。');
        break;
      }
      
      if (text.trim() === '') {
        console.log('テキストが入力されていません。');
        continue;
      }
      
      // テキストを音声に変換
      const audioFile = await textToSpeech(text, speakerId, outputFile);
      
      // 自動再生が有効な場合は音声を再生
      if (config.playback.auto_play) {
        await playAudio(audioFile);
      }
      
      // 続けるかどうか確認
      const continueOption = readlineSync.question('\n続けますか？ (y/n, デフォルト: y): ');
      if (continueOption.toLowerCase() === 'n') {
        console.log('プログラムを終了します。');
        break;
      }
    }
  } catch (error) {
    console.error('予期せぬエラーが発生しました:', error);
  }
}

// プログラムを実行
main().catch(error => {
  console.error('致命的なエラーが発生しました:', error);
});
