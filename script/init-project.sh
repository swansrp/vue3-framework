#!/bin/bash

###############################################################################
# 项目初始化脚本
# 用途：从 framework/setup 文件夹复制模板文件并初始化新项目
# 使用方法：bash src/framework/script/init-project.sh
###############################################################################

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 项目根目录
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# setup 模板目录
SETUP_DIR="$ROOT_DIR/src/framework/setup"

# package.json.backup 文件路径
PACKAGE_BACKUP="$ROOT_DIR/src/framework/config/package.json.backup"

# 需要复制的文件和目录列表
FILES_TO_COPY=(
  ".env.development"
  ".env.pre"
  ".env.production"
  ".env.test"
  ".eslintrc.cjs"
  ".gitignore"
  "deploy.sh"
  "index.html"
  "tsconfig.json"
  "public"
  "agent.md"
  "src/App.vue"
  "src/main.ts"
  "src/assets"
)

###############################################################################
# 函数定义
###############################################################################

# 打印分隔线
print_separator() {
  echo "============================================================"
}

# 打印成功信息
print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

# 打印错误信息
print_error() {
  echo -e "${RED}✗${NC} $1"
}

# 打印警告信息
print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# 打印信息
print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

# 复制文件或目录
copy_item() {
  local src="$1"
  local dest="$2"
  
  if [ ! -e "$src" ]; then
    print_warning "源文件不存在，跳过: $(basename "$src")"
    return 1
  fi
  
  # 创建目标目录
  local dest_dir="$(dirname "$dest")"
  if [ ! -d "$dest_dir" ]; then
    mkdir -p "$dest_dir"
  fi
  
  # 复制文件或目录
  if [ -d "$src" ]; then
    cp -r "$src" "$dest"
  else
    cp "$src" "$dest"
  fi
  
  # 计算相对路径用于显示
  local rel_path="${dest#$ROOT_DIR/}"
  print_success "已复制: $rel_path"
  
  return 0
}

# 创建 package.json
create_package_json() {
  local project_code="$1"
  local project_name="$2"
  local target="$ROOT_DIR/package.json"
  
  if [ ! -f "$PACKAGE_BACKUP" ]; then
    print_error "找不到模板文件: $PACKAGE_BACKUP"
    return 1
  fi
  
  # 读取模板并替换
  sed -e "s/\"name\": \"server_name\"/\"name\": \"$project_code\"/" \
      -e "s/\"title\": \"server_title\"/\"title\": \"$project_name\"/" \
      "$PACKAGE_BACKUP" > "$target"
  
  print_success "已创建: package.json (name: $project_code, title: $project_name)"
  return 0
}

# 询问用户输入
ask_input() {
  local prompt="$1"
  local var_name="$2"
  
  while true; do
    read -p "$prompt" input
    input=$(echo "$input" | xargs) # 去除首尾空格
    
    if [ -n "$input" ]; then
      eval "$var_name='$input'"
      break
    else
      print_error "输入不能为空，请重新输入"
    fi
  done
}

# 确认操作
confirm() {
  local prompt="$1"
  local answer
  
  read -p "$prompt (y/n): " answer
  case "$answer" in
    [yY]|[yY][eE][sS])
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

###############################################################################
# 主函数
###############################################################################

main() {
  echo
  print_separator
  echo "   项目初始化工具"
  print_separator
  echo
  
  # 检查 setup 目录是否存在
  if [ ! -d "$SETUP_DIR" ]; then
    print_error "找不到 setup 目录: $SETUP_DIR"
    exit 1
  fi
  
  # 检查 package.json.backup 是否存在
  if [ ! -f "$PACKAGE_BACKUP" ]; then
    print_error "找不到 package.json.backup: $PACKAGE_BACKUP"
    exit 1
  fi
  
  # 询问用户输入
  echo "请提供以下信息："
  echo
  
  ask_input "请输入项目编码 (英文，用于 package.json 的 name): " PROJECT_CODE
  ask_input "请输入项目名称 (中文，用于 package.json 的 title): " PROJECT_NAME
  
  echo
  echo "开始初始化项目..."
  echo "项目编码: $PROJECT_CODE"
  echo "项目名称: $PROJECT_NAME"
  echo
  
  # 确认操作
  if ! confirm "确认要初始化项目吗？这将覆盖现有文件"; then
    echo "已取消初始化"
    exit 0
  fi
  
  echo
  echo "正在复制文件..."
  echo
  
  # 复制文件和目录
  for item in "${FILES_TO_COPY[@]}"; do
    src="$SETUP_DIR/$item"
    dest="$ROOT_DIR/$item"
    copy_item "$src" "$dest"
  done
  
  echo
  echo "正在创建 package.json..."
  echo
  
  # 创建 package.json
  if ! create_package_json "$PROJECT_CODE" "$PROJECT_NAME"; then
    print_error "创建 package.json 失败"
    exit 1
  fi
  
  echo
  print_separator
  print_success "项目初始化完成！"
  print_separator
  echo
  
  # 询问是否安装依赖
  if confirm "是否立即安装依赖？"; then
    echo
    echo "正在安装依赖..."
    echo
    
    if npm install; then
      echo
      print_success "依赖安装完成！"
      echo
      
      # 询问是否启动开发服务器
      if confirm "是否启动开发服务器？"; then
        echo
        echo "正在启动开发服务器..."
        echo "按 Ctrl+C 可停止服务器"
        echo
        npm run dev
      else
        echo
        print_info "提示：可以稍后运行 npm run dev 启动开发服务器"
        echo
      fi
    else
      print_error "依赖安装失败"
      exit 1
    fi
  else
    echo
    echo "后续步骤："
    echo "  1. 运行 npm install 安装依赖"
    echo "  2. 运行 npm run dev 启动开发服务器"
    echo
  fi
}

# 错误处理
trap 'echo; print_error "脚本执行出错"; exit 1' ERR

# 运行主函数
main
