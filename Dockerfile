# 构建阶段
FROM node:20-alpine as build-stage

# 设置工作目录
WORKDIR /app

# 复制所有文件
COPY . .

# 安装依赖并构建
RUN npm install && npm run build

# 生产阶段
FROM nginx:stable-alpine as production-stage

# 复制构建产物到 Nginx 目录
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 1199

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 在 Dockerfile 中添加
RUN mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]

