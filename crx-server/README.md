# how to do
```
export NGROK_AUTHTOKEN="get_your_ngrok_token_in_https://dashboard.ngrok.com/"
```

# 自作crx-serverの失敗
- crxというフォーマットとpemファイルを用いてchrome拡張をホスティングするサーバが作れそう
- しかし基本的にlinuxのplatformの場合でのみしかcrxを用いてのインストールはできない
  - https://developer.chrome.com/docs/extensions/how-to/distribute?hl=ja
- システム管理者がエンタープライズポリシーを使用して Chromeを管理する管理対象環境でのみ使用できるらしい
  - しかしエンタープライズポリシーを使用するにはシステム管理者である必要があり、ここで詰む
  