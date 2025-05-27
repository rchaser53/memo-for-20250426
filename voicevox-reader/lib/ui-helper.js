const readlineSync = require('readline-sync');

/**
 * UI操作ヘルパークラス
 */
class UIHelper {
  /**
   * 話者を選択する
   */
  static selectSpeaker(speakers, defaultSpeakerId) {
    console.log('\n=== 話者を選択してください ===');
    
    // 話者の一覧を表示
    speakers.forEach((speaker, index) => {
      console.log(`${index + 1}. ${speaker.name}`);
    });
    
    // 話者を選択
    const selection = readlineSync.question(`\n番号を入力してください (デフォルト: ${defaultSpeakerId + 1}): `);
    
    // 入力が空の場合はデフォルト値を使用
    if (selection.trim() === '') {
      return defaultSpeakerId;
    }
    
    // 入力値を数値に変換
    const index = parseInt(selection, 10) - 1;
    
    // 入力値が範囲外の場合はデフォルト値を使用
    if (isNaN(index) || index < 0 || index >= speakers.length) {
      console.log('無効な選択です。デフォルトの話者を使用します。');
      return defaultSpeakerId;
    }
    
    return speakers[index].id;
  }

  /**
   * 出力ファイル名を取得する
   */
  static getOutputFileName() {
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
   * テキスト入力を取得する
   */
  static getTextInput(prompt = '読み上げるテキストを入力してください: ') {
    return readlineSync.question(`\n${prompt}`);
  }

  /**
   * 継続確認を取得する
   */
  static getContinueConfirmation() {
    const continueOption = readlineSync.question('\n続けますか？ (y/n, デフォルト: y): ');
    return continueOption.toLowerCase() !== 'n';
  }

  /**
   * 簡易表示用の話者リストを作成する
   */
  static createSimpleSpeakerList(speakers) {
    return speakers.map(speaker => {
      // スタイルが複数ある場合は最初のスタイルを使用
      const style = speaker.styles && speaker.styles.length > 0 ? speaker.styles[0] : { id: speaker.id, name: speaker.name };
      return { id: style.id, name: `${speaker.name} (${style.name})` };
    });
  }
}

module.exports = UIHelper;
