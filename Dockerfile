# 1. ベースイメージの指定 (Node.js v20 の軽量版)
FROM node:20-slim

# コンテナのOSを更新し、gitをインストールする
RUN apt-get update && apt-get install -y git

# 2. ワーキングディレクトリの設定
WORKDIR /app

# 3. package.json と package-lock.json を先にコピー
# (npm install をキャッシュさせるため)
COPY package*.json ./

# 4. ライブラリのインストール
RUN npm install

# 5. プロジェクトコード全体をワーキングディレクトリにコピー
COPY . .

# 6. 開発サーバーのデフォルトポート (5173) を公開
EXPOSE 5173

# 7. デフォルトの起動コマンド (npm run dev)
# (docker-compose.yml で上書きすることも可能)
CMD ["npm", "run", "dev", "--", "--host"]