const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * VOICEVOX API クラス
 */
class VoicevoxAPI {
  constructor(config) {
    this.config = config;
    this.apiUrl = config.get('api.url');
    this.timeout = config.get('api.timeout');
  }

  /**
   * 利用可能な話者の一覧を取得する
   */
  async getSpeakers() {
    try {
      const response = await axios.get(`${this.apiUrl}/speakers`, {
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      console.error('話者一覧の取得に失敗しました:', error.message);
      // エラーが発生した場合はデフォルトの話者リストを返す
      return this.getDefaultSpeakers();
    }
  }

  /**
   * デフォルトの話者リストを取得
   */
  getDefaultSpeakers() {
    return [
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
  }

  /**
   * テキストを音声に変換する
   */
  async textToSpeech(text, speakerId, outputFile) {
    try {
      // 音声合成用のクエリを生成
      console.log('音声合成用のクエリを生成中...');
      const queryResponse = await axios.post(
        `${this.apiUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
        {},
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: this.timeout
        }
      );
      
      // 音声を合成
      console.log('音声を合成中...');
      const synthesisResponse = await axios.post(
        `${this.apiUrl}/synthesis?speaker=${speakerId}`,
        queryResponse.data,
        { 
          responseType: 'arraybuffer',
          headers: { 'Content-Type': 'application/json', 'Accept': 'audio/wav' },
          timeout: this.timeout
        }
      );
      
      // 音声ファイルを保存
      const outputDir = path.join(process.cwd(), this.config.get('output.dir'));
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const filePath = path.join(outputDir, outputFile);
      fs.writeFileSync(filePath, Buffer.from(synthesisResponse.data));
      console.log(`音声ファイルを保存しました: ${filePath}`);
      
      return filePath;
    } catch (error) {
      this.handleAPIError(error);
      throw error;
    }
  }

  /**
   * APIエラーを処理する
   */
  handleAPIError(error) {
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

module.exports = VoicevoxAPI;
