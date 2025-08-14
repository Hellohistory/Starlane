#!/bin/sh

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

IMAGE_GHCR="ghcr.io/hellohistory/starlane:v1.0.1"
IMAGE_DOCKERHUB="" # 预留 Docker Hub 镜像地址

CONTAINER_NAME="starlane"
DATA_DIR="$HOME/starlane_data"
CONFIG_FILE="$DATA_DIR/config.json"

info() {
    printf "${YELLOW}[INFO] %s${NC}\n" "$1"
}
success() {
    printf "${GREEN}[SUCCESS] %s${NC}\n" "$1"
}
error() {
    printf "${RED}[ERROR] %s${NC}\n" "$1" >&2
    exit 1
}

info "正在检查 Docker 环境..."
if ! command -v docker >/dev/null 2>&1; then
    error "找不到 Docker 命令。请先安装 Docker。"
fi
if ! docker info >/dev/null 2>&1; then
    error "Docker 服务未在运行。请启动 Docker 后再试。"
fi
success "Docker 环境检查通过！"
echo ""

info "欢迎使用 Starlane 部署向导！"
echo ""

info "请选择要从哪个镜像仓库拉取 Starlane 镜像："
echo "  1) GitHub (ghcr.io) - 推荐"
echo "  2) Docker Hub (即将支持)"

printf "请输入选项 [1]: "
read -r REGISTRY_CHOICE
REGISTRY_CHOICE=${REGISTRY_CHOICE:-1}

case $REGISTRY_CHOICE in
    1)
        SELECTED_IMAGE=$IMAGE_GHCR
        ;;
    2)
        error "Docker Hub 支持即将推出，请暂时选择 GitHub。"
        # 当 IMAGE_DOCKERHUB 变量有值后，可以放开这里的逻辑
        # SELECTED_IMAGE=$IMAGE_DOCKERHUB
        ;;
    *)
        error "无效的选项。"
        ;;
esac
info "将从 $SELECTED_IMAGE 拉取镜像。"
echo ""

printf "请输入您站点的显示名称 (例如: 我的导航主页): "
read -r SITE_TITLE

printf "请输入您希望通过哪个端口访问 (例如: 8080): [8080] "
read -r HOST_PORT
HOST_PORT=${HOST_PORT:-"8080"}

echo ""
info "为了安全，我们建议设置一个“保存密钥”。在设置页面保存时需要提供此密钥。"
printf "请输入您的保存密钥 (留空则无需密钥，不推荐): "
read -r SAVE_TOKEN
echo ""

info "正在配置数据目录: $DATA_DIR"
mkdir -p "$DATA_DIR"

if [ ! -f "$CONFIG_FILE" ]; then
    info "未找到配置文件，将为您创建一个新的默认配置..."
    cat << EOF > "$CONFIG_FILE"
{
  "pageTitle": "Starlane",
  "theme": "auto",
  "backgroundType": "default",
  "backgroundColor": "#f0f2f5",
  "backgroundImage": "",
  "groups": [
    {
      "name": "常用网站",
      "items": [
        {
          "name": "Google",
          "url": "https://www.google.com",
          "icon": "https://www.google.com/s2/favicons?sz=64&domain_url=google.com"
        }
      ]
    }
  ]
}
EOF
    success "默认配置文件已创建于: $CONFIG_FILE"
fi

if [ -n "$SITE_TITLE" ]; then
    info "正在将站点名称更新为: '$SITE_TITLE'..."
    sed -i.bak "s/\"pageTitle\": \".*\"/\"pageTitle\": \"$SITE_TITLE\"/" "$CONFIG_FILE"
    rm -f "$CONFIG_FILE.bak"
    success "站点名称已更新。"
fi
echo ""

if [ "$(docker ps -a -q -f name=^/${CONTAINER_NAME}$)" ]; then
    info "发现已存在的 Starlane 容器，将自动停止并移除以便更新..."
    docker stop "$CONTAINER_NAME" >/dev/null
    docker rm "$CONTAINER_NAME" >/dev/null
    success "旧容器已移除。"
fi

info "正在从仓库拉取镜像: $SELECTED_IMAGE..."
docker pull "$SELECTED_IMAGE"
if [ $? -ne 0 ]; then
    error "镜像拉取失败！请检查网络或镜像名称是否正确。"
fi
success "镜像拉取成功！"

info "正在启动 Starlane 容器..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -p "${HOST_PORT}:80" \
    -v "${DATA_DIR}:/usr/share/nginx/html/data" \
    --env SAVE_TOKEN="$SAVE_TOKEN" \
    --restart unless-stopped \
    "$SELECTED_IMAGE"

if [ $? -ne 0 ]; then
    error "容器启动失败！请检查端口 $HOST_PORT 是否被占用。"
fi

echo ""
success "🎉 恭喜！Starlane 部署/更新成功！ 🎉"
echo ""
info "您现在可以通过以下地址访问您的专属导航页："
info "URL: http://localhost:${HOST_PORT}"
echo ""
info "您的所有配置和数据都保存在本机路径："
info "Path: ${DATA_DIR}"
echo ""
info "未来如需更新版本，只需重新运行此脚本即可。"
info "感谢使用！"