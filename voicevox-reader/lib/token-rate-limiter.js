/**
 * トークン制限対応のレート制限クラス
 * OpenAI APIのレート制限とトークン制限に対応するためのユーティリティクラス
 */
class TokenRateLimiter {
  /**
   * コンストラクタ
   * @param {number} maxRequests - 時間窓内の最大リクエスト数
   * @param {number} maxTokens - 時間窓内の最大トークン数
   * @param {number} timeWindow - 時間窓のミリ秒単位の長さ
   */
  constructor(maxRequests = 200, maxTokens = 150000, timeWindow = 60000) {
    this.requests = [];
    this.tokenUsage = [];
    this.maxRequests = maxRequests;
    this.maxTokens = maxTokens;
    this.timeWindow = timeWindow;
  }

  /**
   * 必要に応じて待機する
   * @param {number} estimatedTokens - 推定トークン数
   * @returns {Promise<void>}
   */
  async waitIfNeeded(estimatedTokens = 10000) {
    const now = Date.now();
    
    // 時間窓外の古いリクエストを削除
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    this.tokenUsage = this.tokenUsage.filter(usage => now - usage.time < this.timeWindow);
    
    // 現在のトークン使用量を計算
    const currentTokens = this.tokenUsage.reduce((sum, usage) => sum + usage.tokens, 0);
    
    // リクエスト数制限チェック
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest) + 1000;
      
      if (waitTime > 0) {
        console.log(`⏳ リクエスト制限のため ${Math.ceil(waitTime / 1000)} 秒待機します...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // トークン制限チェック
    if (currentTokens + estimatedTokens > this.maxTokens) {
      const oldestToken = Math.min(...this.tokenUsage.map(u => u.time));
      const waitTime = this.timeWindow - (now - oldestToken) + 1000;
      
      if (waitTime > 0) {
        console.log(`⏳ トークン制限のため ${Math.ceil(waitTime / 1000)} 秒待機します...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
    this.tokenUsage.push({ time: now, tokens: estimatedTokens });
  }
}

module.exports = TokenRateLimiter;
