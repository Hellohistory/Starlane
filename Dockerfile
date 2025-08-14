# 使用非常轻量的 Nginx Alpine 镜像作为基础
FROM nginx:1.27-alpine

# 将工作目录设置为 Nginx 的网站根目录
WORKDIR /usr/share/nginx/html

# 在复制文件前，先清空目录中的所有默认 Nginx 文件
RUN rm -rf ./*

# 将项目核心文件复制到工作目录
COPY index.html style.css script.js ./

# 将默认配置文件复制到一个单独的 /app 目录中，以便入口脚本引用
COPY default-config.json /app/default-config.json

COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]

CMD ["nginx", "-g", "daemon off;"]