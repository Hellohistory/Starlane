# Starlane ✨

<div align="center">

*A lightweight, beautiful, and highly customizable homepage for your NAS and home server.* *一个极致轻量、美观且高度可定制的 NAS 及家庭服务器导航主页。*

</div>

<p align="center">
  <a href="https://github.com/Hellohistory/Starlane/actions/workflows/ci-docker-release.yml"><img src="https://github.com/Hellohistory/Starlane/actions/workflows/ci-docker-release.yml/badge.svg" alt="CI/CD Status"></a>
  <a href="https://github.com/Hellohistory/Starlane/releases"><img src="https://img.shields.io/github/v/release/Hellohistory/Starlane" alt="Latest Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/Hellohistory/Starlane" alt="License"></a>
</p>

---

<p align="center">
  <img src="https://raw.githubusercontent.com/user-attachments/assets/95a53234-a13f-4e12-85f0-b8d7cae2786a" alt="Starlane Screenshot" width="80%">
</p>

---

## 🌟 功能特性 (Features)

Starlane 完全由原生 `HTML`, `CSS`, `JavaScript` 构建，无任何外部JS库依赖，确保极致的性能和轻量化。

- **💨 极致轻量**: 纯静态页面，无后端依赖，资源消耗接近于零。
- **🐳 Docker 优先**: 提供开箱即用的 Docker 部署方案，支持 `amd64` 和 `arm64` 架构。
- **🎨 高度可定制**:
    - **图形化配置**: 无需手动编写 JSON，所有设置均在图形化界面中完成。
    - **主题支持**: 内置亮色、暗色、跟随系统三种主题模式。
    - **自定义背景**: 支持纯色、网络图片URL，甚至直接上传本地图片作为背景。
- **🗂️ 强大的管理功能**:
    - **服务管理**: 通过表格轻松增、删、改您的网站和服务链接。
    - **分类管理**: 支持添加、删除、重命名，以及**拖拽排序**分类。
    - **智能图标**: 自动识别服务名称或域名，为您推荐图标。
- **🧭 高效导航**:
    - **导航侧边栏**: 在桌面端提供固定的分类侧边栏，支持点击跳转和滚动高亮。
    - **实时搜索**: 即时过滤您的所有服务，快速找到目标。
- **📱 响应式设计**: 完美适配桌面、平板和手机等不同尺寸的设备。
- **🛡️ 100% 原生**: 不含任何外部JS库（如jQuery, React, Vue），代码纯粹，安全可控。
- **🔄 数据便携**: 支持一键导出、导入配置文件，轻松备份和迁移。

---

## 🚀 Docker 快速开始 (Quick Start)

我们强烈推荐使用 Docker 来部署 Starlane。

### 先决条件
请确保您的系统已经安装了 `Docker` 和 `Docker Compose`。

### 方法一：使用 `docker run` 命令

此方法适合快速、单次部署。

1.  **创建配置文件 (重要)**
    在您的主机上创建一个目录和 `config.json` 文件。
    ```bash
    mkdir -p /path/to/your/starlane/data
    touch /path/to/your/starlane/data/config.json
    ```

2.  **运行 Docker 容器**
    执行以下命令来启动 Starlane。请记得替换 `/path/to/your/starlane/data`。

    ```bash
    docker run -d \
      --name starlane \
      -p 8080:80 \
      -v /path/to/your/starlane/data/config.json:/usr/share/nginx/html/config.json \
      --restart unless-stopped \
      ghcr.io/hellohistory/starlane:latest
    ```

### 方法二：使用 Docker Compose (最推荐)

此方法使用一个 `docker-compose.yml` 文件来管理应用，是长期运行服务的最佳实践。

1.  **创建 `docker-compose.yml` 文件**
    在您喜欢的位置（例如 `/opt/starlane`）创建一个名为 `docker-compose.yml` 的文件，并粘贴以下内容：

    ```yaml
    version: '3.8'

    services:
      starlane:
        image: ghcr.io/hellohistory/starlane:latest
        container_name: starlane
        ports:
          - '8080:80' # 左侧的 8080 是您访问的端口，可以按需修改
        volumes:
          - ./data/config.json:/usr/share/nginx/html/config.json # 将配置文件挂载到容器中
        restart: unless-stopped
    ```

2.  **创建配置文件**
    在与 `docker-compose.yml` **相同的目录**下，创建一个 `data` 文件夹，并在其中创建一个空的 `config.json` 文件。
    ```bash
    mkdir data
    touch data/config.json
    ```

3.  **启动服务**
    在 `docker-compose.yml` 文件所在的目录中，运行以下命令：
    ```bash
    docker-compose up -d
    ```

4.  **开始使用**
    现在，打开您的浏览器并访问 `http://<您的服务器IP>:8080`。

**管理 Starlane (使用Docker Compose):**
- **更新镜像**: `docker-compose pull` 然后 `docker-compose up -d`
- **查看日志**: `docker-compose logs -f`
- **停止服务**: `docker-compose down`

### 方法三：从源码构建镜像

如果您想对代码进行修改或自定义构建，可以选择此方法。

1.  **克隆本仓库**
    ```bash
    git clone [https://github.com/Hellohistory/Starlane.git](https://github.com/Hellohistory/Starlane.git)
    cd Starlane
    ```

2.  **构建 Docker 镜像**
    ```bash
    docker build -t starlane .
    ```

3.  **运行容器**
    使用 `docker run` 命令运行您本地构建的 `starlane` 镜像。

---

## 🔧 配置与定制 (Configuration)

Starlane 的所有配置都通过页面右上角的 **齿轮（⚙️）** 图标进入设置面板完成。

- **服务管理**: 以表格形式增、删、改您的服务链接。
- **分类管理**: 管理您的分类，支持拖拽排序。
- **页面设置**: 调整页面标题、主题和背景。

您的所有更改都会实时保存在浏览器中。点击“保存并刷新”后，配置将永久生效。使用**导出/导入**功能来备份和恢复您的个性化设置。

---

## 📁 非 Docker 用户

如果您不使用 Docker，可以从本仓库的 [Releases 页面](https://github.com/Hellohistory/Starlane/releases) 下载最新版本的 `starlane-vX.X.X.zip` 压缩包。

解压后，您会得到项目的核心文件。您只需将这些文件放置在任何一个静态 Web 服务器（如 Nginx, Caddy, Apache 等）的网站根目录下即可。

---

## 🤝 参与贡献 (Contributing)

我们欢迎任何形式的贡献！如果您有好的想法或发现了Bug，请随时提交 [Issue](https://github.com/Hellohistory/Starlane/issues)。

如果您想贡献代码，请遵循以下步骤：
1.  Fork 本仓库
2.  创建一个新的分支 (`git checkout -b feature/AmazingFeature`)
3.  提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4.  将您的分支推送到上游 (`git push origin feature/AmazingFeature`)
5.  创建一个 Pull Request

---

## 📜 许可证 (License)

本项目采用 [MIT](LICENSE) 许可证。