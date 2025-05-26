#!/bin/bash

# ニュース取得・要約ツール実行スクリプト

# 使い方を表示する関数
show_usage() {
  echo "使い方: $0 [オプション]"
  echo ""
  echo "オプション:"
  echo "  -h, --help     このヘルプを表示"
  echo "  -r, --read     要約後にVOICEVOXで読み上げる"
  echo ""
  echo "例:"
  echo "  $0             # ニュースを取得・要約してファイルに保存"
  echo "  $0 -r          # ニュースを取得・要約して読み上げる"
}

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

# 読み上げ用ファイルを順番に読み上げる関数
read_news_files() {
  local output_dir="output"
  local reading_files=($(ls ${output_dir}/news_reading_*.txt 2>/dev/null | sort))
  
  if [ ${#reading_files[@]} -eq 0 ]; then
    echo "読み上げ用ファイルが見つかりません。"
    echo "通常の要約ファイルを読み上げます..."
    
    local summary_file="${output_dir}/news_summary.txt"
    if [ -f "$summary_file" ]; then
      node index.js "$summary_file"
    else
      echo "要約ファイルも見つかりません: $summary_file"
      return 1
    fi
  else
    echo "読み上げ用ファイルが ${#reading_files[@]} 個見つかりました。"
    echo "順番に読み上げます..."
    
    for file in "${reading_files[@]}"; do
      echo ""
      echo "読み上げ中: $(basename "$file")"
      node index.js "$file"
      
      # 次のファイルがある場合は少し待機
      if [ "$file" != "${reading_files[-1]}" ]; then
        echo "次のファイルに進みます..."
        sleep 1
      fi
    done
    
    echo ""
    echo "すべてのニュースの読み上げが完了しました。"
  fi
}

# メイン処理
echo "=== ニュース取得・要約ツール ==="

# 引数の解析
READ_ALOUD=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_usage
      exit 0
      ;;
    -r|--read)
      READ_ALOUD=true
      shift
      ;;
    *)
      echo "不明なオプション: $1"
      show_usage
      exit 1
      ;;
  esac
done

# ニュース取得・要約を実行
echo "ニュースを取得・要約しています..."
node news-fetcher.js

# 実行結果を確認
if [ $? -eq 0 ]; then
  echo "ニュースの取得・要約が完了しました。"
  
  # 読み上げオプションが指定されている場合
  if [ "$READ_ALOUD" = true ]; then
    echo ""
    echo "要約されたニュースを読み上げます..."
    
    # VOICEVOXの接続確認
    if check_voicevox; then
      # 読み上げ用ファイルを順番に読み上げ
      read_news_files
    else
      echo "VOICEVOXが利用できないため、読み上げをスキップします。"
    fi
  fi
else
  echo "ニュースの取得・要約に失敗しました。"
  exit 1
fi
