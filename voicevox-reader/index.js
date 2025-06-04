const path = require('path');
const fs = require('fs');
const { minimatch } = require('minimatch');
const ConfigManager = require('./lib/config-manager');
const VoicevoxAPI = require('./lib/voicevox-api');
const AudioPlayer = require('./lib/audio-player');
const FileUtils = require('./lib/file-utils');

// 設定ファイルのパス
const CONFIG_FILE = path.join(__dirname, 'config.json');
// .readignoreファイルのパス
const READIGNORE_FILE = path.join(__dirname, '.readignore');

/**
 * .readignoreファイルからglobパターンを読み込む
 * @returns {string[]} globパターンの配列
 */
function loadReadIgnorePatterns() {
  try {
    if (fs.existsSync(READIGNORE_FILE)) {
      const content = fs.readFileSync(READIGNORE_FILE, 'utf8');
      // 改行で分割し、空行を除外
      return content.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    }
  } catch (error) {
    console.warn(`.readignoreファイルの読み込み中にエラーが発生しました: ${error.message}`);
  }
  return [];
}

/**
 * ファイルパスがglobパターンに一致するかチェック
 * @param {string} filePath ファイルパス
 * @param {string[]} patterns globパターンの配列
 * @returns {boolean} 一致する場合はtrue
 */
function shouldIgnoreFile(filePath, patterns) {
  if (!patterns || patterns.length === 0) return false;
  
  const relativePath = path.relative(__dirname, filePath);
  
  return patterns.some(pattern => {
    return minimatch(relativePath, pattern) || minimatch(path.basename(filePath), pattern);
  });
}

/**
 * メイン関数
 */
async function main() {
  try {
    // コマンドライン引数を取得
    const args = process.argv.slice(2);
    
    // ファイルパスが指定されている場合
    if (args.length > 0) {
      await callVoicevoxAPI(args[0]);
    }
    
  } catch (error) {
    console.error('予期せぬエラーが発生しました:', error);
  }
}

async function callVoicevoxAPI(targetPath) {
  console.log('=== VOICEVOX テキスト読み上げツール ===');
  try {
    // 設定を初期化
    const configManager = new ConfigManager(CONFIG_FILE);
    configManager.loadConfig();
    
    // 各クラスを初期化
    const voicevoxAPI = new VoicevoxAPI(configManager);
    const audioPlayer = new AudioPlayer(configManager);
    
    await handleFileMode(targetPath, voicevoxAPI, audioPlayer, configManager);
  } catch (error) {
    console.error('予期せぬエラーが発生しました:', error);
  }
}

/**
 * ファイルモードを処理する
 */
async function handleFileMode(targetPath, voicevoxAPI, audioPlayer, configManager) {
  const actualPath = path.isAbsolute(targetPath) ? targetPath : path.join(__dirname, targetPath);
  console.log(`パスを確認しています: ${actualPath}`);
  
  // パスが存在するかチェック
  if (!fs.existsSync(actualPath)) {
    console.error(`指定されたパスが存在しません: ${actualPath}`);
    return;
  }
  
  const stats = fs.statSync(actualPath);
  if (stats.isFile()) {
    // ファイルの場合
    await handleSingleFile(actualPath, voicevoxAPI, audioPlayer, configManager);
  } else if (stats.isDirectory()) {
    // ディレクトリの場合
    await handleDirectory(actualPath, voicevoxAPI, audioPlayer, configManager);
  } else {
    console.error(`指定されたパスはファイルでもディレクトリでもありません: ${actualPath}`);
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
    // .readignoreファイルからglobパターンを読み込む
    const ignorePatterns = loadReadIgnorePatterns();
    if (ignorePatterns.length > 0) {
      console.log(`.readignoreファイルから${ignorePatterns.length}個の除外パターンを読み込みました`);
    }
    
    // ディレクトリ内のファイル一覧を取得
    const files = fs.readdirSync(dirPath);
    
    // テキストファイルのみをフィルタリング（拡張子で判定）
    const textFiles = files.filter(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      // ファイルのみを対象とし、一般的なテキストファイル拡張子をチェック
      if (!stats.isFile()) return false;
      
      // .readignoreパターンに一致するファイルを除外
      if (shouldIgnoreFile(filePath, ignorePatterns)) {
        console.log(`除外パターンに一致するため、ファイルをスキップします: ${file}`);
        return false;
      }
      
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

// プログラムを実行
if (require.main === module) {
  main().catch(error => {
    console.error('予期せぬエラーが発生しました:', error);
  });
}

module.exports = { main, callVoicevoxAPI };
