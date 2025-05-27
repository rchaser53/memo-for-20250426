const player = require('play-sound')(opts = {});

/**
 * 音声再生クラス
 */
class AudioPlayer {
  constructor(config) {
    this.config = config;
    this.autoPlay = config.get('playback.auto_play');
  }

  /**
   * 音声ファイルを再生する
   */
  playAudio(filePath) {
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
   * 自動再生が有効な場合に音声を再生する
   */
  async playIfEnabled(filePath) {
    if (this.autoPlay) {
      await this.playAudio(filePath);
    }
  }
}

module.exports = AudioPlayer;
