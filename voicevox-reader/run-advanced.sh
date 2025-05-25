#!/bin/bash

# VOICEVOXが起動しているか確認する関数
check_voicevox() {
  echo "VOICEVOXエンジンの接続を確認しています..."
  if curl -s http://localhost:50021/version > /dev/null; then
    echo "VOICEVOXエンジンが起動しています。"
    return 0
  else
    echo "VOICEVOXエンジンに接続できません。"
    echo "VOICEVOXアプリケーションを起動してから再度お試しください。"
    echo "VOICEVOXのダウンロード: https://voicevox.hiroshiba.jp/"
    return 1
  fi
}

# 使い方を表示する関数
show_usage() {
  echo "使い方: $0 [テキストファイルのパス]"
  echo ""
  echo "引数:"
  echo "  テキストファイルのパス  読み上げるテキストファイルのパス（省略可）"
  echo ""
  echo "例:"
  echo "  $0                     # 対話モードで起動"
  echo "  $0 sample.txt          # sample.txtの内容を読み上げる"
}

# メイン処理
echo "=== VOICEVOX テキスト読み上げツール (拡張版) ==="

# ヘルプオプションの確認
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  show_usage
  exit 0
fi

# VOICEVOXの接続確認
if check_voicevox; then
  # Node.jsスクリプトを実行
  echo "拡張版テキスト読み上げツールを起動します..."
  
  # 引数があればファイルパスとして渡す
  if [ $# -gt 0 ]; then
    node advanced.js "$1"
  else
    node advanced.js
  fi
else
  echo "プログラムを終了します。"
  exit 1
fi
