const fs = require('fs');

/**
 * ファイル操作ユーティリティクラス
 */
class FileUtils {
  /**
   * ファイルからテキストを読み込む
   */
  static readTextFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.error(`ファイルの読み込みに失敗しました: ${filePath}`);
      console.error(error.message);
      return null;
    }
  }

  /**
   * ディレクトリが存在しない場合は作成する
   */
  static ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * ファイルにテキストを書き込む
   */
  static writeTextFile(filePath, content) {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    } catch (error) {
      console.error(`ファイルの書き込みに失敗しました: ${filePath}`);
      console.error(error.message);
      return false;
    }
  }
}

module.exports = FileUtils;
