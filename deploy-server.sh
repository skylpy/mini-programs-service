#!/usr/bin/env bash
set -euo pipefail

APP_NAME="server"
REMOTE_TMP_TAR="/root/server_upload.tar.gz"
DEPLOY_ROOT="/root"
APP_DIR="$DEPLOY_ROOT/server"
BACKUP_DIR="$DEPLOY_ROOT/server_backup_$(date +%Y%m%d_%H%M%S)"

log() {
  echo "[$(date '+%F %T')] $1"
}

if [ ! -f "$REMOTE_TMP_TAR" ]; then
  echo "❌ 找不到上传包: $REMOTE_TMP_TAR"
  exit 1
fi

log "开始部署"

if [ -d "$APP_DIR" ]; then
  log "备份旧代码 → $BACKUP_DIR"
  cp -a "$APP_DIR" "$BACKUP_DIR"
fi

log "清理临时目录"
rm -rf "$DEPLOY_ROOT/server_new"
mkdir -p "$DEPLOY_ROOT/server_new"

log "解压新代码"
tar -xzf "$REMOTE_TMP_TAR" -C "$DEPLOY_ROOT/server_new"

if [ ! -f "$DEPLOY_ROOT/server_new/server/package.json" ]; then
  echo "❌ 未找到 package.json，上传内容不对"
  exit 1
fi

log "替换线上代码"
rm -rf "$APP_DIR"
mv "$DEPLOY_ROOT/server_new/server" "$APP_DIR"
rm -rf "$DEPLOY_ROOT/server_new"

LATEST_BACKUP="$(ls -td /root/server_backup_* 2>/dev/null | head -n 1 || true)"
for ENV_FILE in .env.production .env.development; do
  if [ -n "$LATEST_BACKUP" ] && [ -f "$LATEST_BACKUP/$ENV_FILE" ] && [ ! -f "$APP_DIR/$ENV_FILE" ]; then
    log "恢复旧 $ENV_FILE"
    cp "$LATEST_BACKUP/$ENV_FILE" "$APP_DIR/$ENV_FILE"
  fi
done

cd "$APP_DIR"

log "安装依赖"
npm install --omit=dev

export NODE_ENV=production

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  log "重启 PM2 服务（NODE_ENV=production）"
  pm2 restart "$APP_NAME" --update-env
else
  log "首次启动 PM2 服务（NODE_ENV=production）"
  pm2 start app.js --name "$APP_NAME"
fi

pm2 save >/dev/null 2>&1 || true

log "当前 PM2 状态"
pm2 list

log "最近日志"
pm2 logs "$APP_NAME" --lines 20 --nostream

log "部署成功"
