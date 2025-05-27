const path = require('path');
const fs = require('fs');
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
async function handleFileMode(targetPath, voicevoxAPI, audioPlayer, configManager) {
  console.log(`パスを確認しています: ${targetPath}`);
  
  // パスが存在するかチェック
  if (!fs.existsSync(targetPath)) {
    console.error(`指定されたパスが存在しません: ${targetPath}`);
    return;
  }
  
  const stats = fs.statSync(targetPath);
  
  if (stats.isFile()) {
    // ファイルの場合
    await handleSingleFile(targetPath, voicevoxAPI, audioPlayer, configManager);
  } else if (stats.isDirectory()) {
    // ディレクトリの場合
    await handleDirectory(targetPath, voicevoxAPI, audioPlayer, configManager);
  } else {
    console.error(`指定されたパスはファイルでもディレクトリでもありません: ${targetPath}`);
  }
}

/**
 * 単一ファイルを処理する
 */
async function handleSingleFile(filePath, voicevoxAPI, audioPlayer, configManager) {
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
 * ディレクトリ内のファイルを順番に処理する
 */
async function handleDirectory(dirPath, voicevoxAPI, audioPlayer, configManager) {
  console.log(`ディレクトリを読み込んでいます: ${dirPath}`);
  
  try {
    // ディレクトリ内のファイル一覧を取得
    const files = fs.readdirSync(dirPath);
    
    // テキストファイルのみをフィルタリング（拡張子で判定）
    const textFiles = files.filter(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      // ファイルのみを対象とし、一般的なテキストファイル拡張子をチェック
      if (!stats.isFile()) return false;
      
      const ext = path.extname(file).toLowerCase();
      return ['.txt', '.md', '.json', '.js', '.ts', '.html', '.css', '.xml', '.csv'].includes(ext);
    });
    
    if (textFiles.length === 0) {
      console.log('ディレクトリ内に読み上げ可能なテキストファイルが見つかりませんでした。');
      return;
    }
    
    // ファイル名でソート
    textFiles.sort();
    
    console.log(`${textFiles.length}個のファイルが見つかりました。順番に読み上げます...`);
    
    for (let i = 0; i < textFiles.length; i++) {
      const fileName = textFiles[i];
      const filePath = path.join(dirPath, fileName);
      
      console.log(`\n[${i + 1}/${textFiles.length}] ${fileName} を読み上げています...`);
      
      await handleSingleFile(filePath, voicevoxAPI, audioPlayer, configManager);
      
      // 最後のファイル以外の場合は少し待機
      if (i < textFiles.length - 1) {
        console.log('次のファイルに進みます...\n');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\nすべてのファイルの読み上げが完了しました。');
    
  } catch (error) {
    console.error('ディレクトリの読み込み中にエラーが発生しました:', error);
  }
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
