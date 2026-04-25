#!/usr/bin/env bash
set -euo pipefail

SERVER_IP="120.79.144.54"
SERVER_USER="root"

LOCAL_PROJECT_DIR="/Users/a/node_service/mini-programs-service"
APP_DIR_NAME="server"

REMOTE_TMP_TAR="/root/server_upload.tar.gz"
REMOTE_DEPLOY_SCRIPT="/root/deploy-server.sh"

cd "$LOCAL_PROJECT_DIR"

if [ ! -d "$APP_DIR_NAME" ]; then
  echo "❌ 本地目录不存在: $LOCAL_PROJECT_DIR/$APP_DIR_NAME"
  exit 1
fi

if [ ! -f "./deploy-server.sh" ]; then
  echo "❌ 本地缺少 deploy-server.sh，请把它和 local-deploy.sh 放在同一目录下"
  exit 1
fi

echo "==> 1/4 打包本地 server"
tar --exclude="node_modules" --exclude=".DS_Store" --exclude=".git" -czf /tmp/server_upload.tar.gz "$APP_DIR_NAME"

echo "==> 2/4 上传代码到服务器"
scp /tmp/server_upload.tar.gz "$SERVER_USER@$SERVER_IP:$REMOTE_TMP_TAR"

echo "==> 3/4 上传部署脚本"
scp ./deploy-server.sh "$SERVER_USER@$SERVER_IP:$REMOTE_DEPLOY_SCRIPT"

echo "==> 4/4 远程执行部署"
ssh "$SERVER_USER@$SERVER_IP" "chmod +x $REMOTE_DEPLOY_SCRIPT && bash $REMOTE_DEPLOY_SCRIPT"

echo "✅ 部署完成"
