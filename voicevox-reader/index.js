const path = require('path');
const ConfigManager = require('./lib/config-manager');
const VoicevoxAPI = require('./lib/voicevox-api');
const AudioPlayer = require('./lib/audio-player');
const FileUtils = require('./lib/file-utils');
const UIHelper = require('./lib/ui-helper');

// 設定ファイルのパス
const CONFIG_FILE = path.join(__dirname, 'config.json');

/**
 * メイン関数
 */
async function main() {
  console.log('=== VOICEVOX テキスト読み上げツール ===');
  
  try {
    // 設定を初期化
    const configManager = new ConfigManager(CONFIG_FILE);
    configManager.loadConfig();
    
    // 各クラスを初期化
    const voicevoxAPI = new VoicevoxAPI(configManager);
    const audioPlayer = new AudioPlayer(configManager);
    
    // コマンドライン引数を取得
    const args = process.argv.slice(2);
    
    // ファイルパスが指定されている場合
    if (args.length > 0) {
      await handleFileMode(args[0], voicevoxAPI, audioPlayer, configManager);
      return;
    }
    
    // 対話モード
    await handleInteractiveMode(voicevoxAPI, audioPlayer, configManager);
    
  } catch (error) {
    console.error('予期せぬエラーが発生しました:', error);
  }
}

/**
 * ファイルモードを処理する
 */
async function handleFileMode(filePath, voicevoxAPI, audioPlayer, configManager) {
  console.log(`ファイルを読み込んでいます: ${filePath}`);
  
  const fileContent = FileUtils.readTextFile(filePath);
  if (!fileContent) {
    return;
  }
  
  console.log('ファイルの内容を読み上げます...');
  const speakerId = configManager.get('speaker.default_id');
  const outputFile = configManager.get('output.filename');
  
  const audioFilePath = await voicevoxAPI.textToSpeech(fileContent, speakerId, outputFile);
  await audioPlayer.playIfEnabled(audioFilePath);
}

/**
 * 対話モードを処理する
 */
async function handleInteractiveMode(voicevoxAPI, audioPlayer, configManager) {
  console.log('対話モードを開始します。');
  console.log('終了するには "exit" と入力してください。');
  
  while (true) {
    const text = UIHelper.getTextInput();
    
    if (text.toLowerCase() === 'exit') {
      console.log('プログラムを終了します。');
      break;
    }
    
    if (text.trim() === '') {
      console.log('テキストが入力されていません。');
      continue;
    }
    
    const speakerId = configManager.get('speaker.default_id');
    const outputFile = configManager.get('output.filename');
    
    const audioFilePath = await voicevoxAPI.textToSpeech(text, speakerId, outputFile);
    await audioPlayer.playIfEnabled(audioFilePath);
  }
}

// プログラムを実行
if (require.main === module) {
  main().catch(error => {
    console.error('予期せぬエラーが発生しました:', error);
  });
}

module.exports = { main };
