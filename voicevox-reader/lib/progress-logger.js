/**
 * 進行度表示クラス
 * 処理の進行状況を表示するためのユーティリティクラス
 */
class ProgressLogger {
  /**
   * コンストラクタ
   * @param {number} totalSteps - 全体のステップ数
   */
  constructor(totalSteps) {
    this.startTime = Date.now();
    this.currentStep = 0;
    this.totalSteps = totalSteps;
  }

  /**
   * ステップの進行を記録して表示する
   * @param {string} stepName - ステップの名前
   */
  logStep(stepName) {
    this.currentStep++;
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const progress = Math.floor((this.currentStep / this.totalSteps) * 100);
    console.log(`[${this.currentStep}/${this.totalSteps}] (${progress}%) ${stepName} - 経過時間: ${elapsed}秒`);
  }

  /**
   * 処理の完了を記録して表示する
   */
  logComplete() {
    const totalTime = Math.floor((Date.now() - this.startTime) / 1000);
    console.log(`\n✅ 処理完了 - 総実行時間: ${totalTime}秒\n`);
  }
}

module.exports = ProgressLogger;
