#!/bin/bash
# ==========================================
# Git 双向同步脚本
# 功能：
#   1. 从 origin 拉取并推送到 gitee
#   2. 从 gitee 拉取并推送到 origin
# 使用方式：
#   chmod +x git-sync.sh
#   ./git-sync.sh
# ==========================================

set -e  # 出错即退出
set -o pipefail

# === 配置 ===
ORIGIN_REMOTE="origin"
GITEE_REMOTE="gitee"
BRANCH="master"  # 如果你的主分支是 master，请改成 master

# === 函数 ===
log() {
  echo -e "\033[1;32m[INFO]\033[0m $1"
}

error() {
  echo -e "\033[1;31m[ERROR]\033[0m $1" >&2
  exit 1
}

# 检查是否是 git 仓库
if [ ! -d .git ]; then
  error "当前目录不是一个 Git 仓库，请先进入仓库根目录。"
fi

# 检查远程仓库是否存在
if ! git remote get-url "$ORIGIN_REMOTE" >/dev/null 2>&1; then
  error "未找到远程：$ORIGIN_REMOTE"
fi
if ! git remote get-url "$GITEE_REMOTE" >/dev/null 2>&1; then
  error "未找到远程：$GITEE_REMOTE"
fi

log "当前远程："
git remote -v

# 确保工作区干净
if [ -n "$(git status --porcelain)" ]; then
  error "工作区或暂存区存在未提交更改，请先提交或清理。"
fi

# === Step 1: 从 origin 拉取并推送到 gitee ===
log "从 $ORIGIN_REMOTE 拉取最新分支 $BRANCH..."
git fetch "$ORIGIN_REMOTE" "$BRANCH"
git checkout "$BRANCH"
git merge "$ORIGIN_REMOTE/$BRANCH" --no-edit || true

log "推送最新代码到 $GITEE_REMOTE/$BRANCH..."
git push "$GITEE_REMOTE" "$BRANCH"

# === Step 2: 从 gitee 拉取并推送回 origin ===
log "从 $GITEE_REMOTE 拉取最新分支 $BRANCH..."
git fetch "$GITEE_REMOTE" "$BRANCH"
git merge "$GITEE_REMOTE/$BRANCH" --no-edit || true

log "推送合并后的代码回 $ORIGIN_REMOTE/$BRANCH..."
git push "$ORIGIN_REMOTE" "$BRANCH"

log "✅ 同步完成：origin ↔ gitee"
