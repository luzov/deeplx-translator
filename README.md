# 适用于 DeepLX api 的翻译网页
## Feature
- Vue 3 + TypeScript + Vite + IDE: Cursor
- 支持添加多个 deeplx api，轮询请求
- 支持设置默认源语言、目标语言
- 支持导入导出配置
- 配置完全保存在本地
- ...
## Show
![image](https://github.com/user-attachments/assets/ed4b5f65-796d-40dc-9570-610f4b0b1b3b)
![image](https://github.com/user-attachments/assets/7a37ea80-91b9-434f-8b90-96127b405b2c)

## How
> 暂时仅支持 Docker 运行，因为使用了 nginx 解决网页跨域请求的问题
```bash
docker run -d -p 1199:1199 yucn/deeplx-translator:latest
```
## Coming soon
- Windows 客户端
- 深色模式
- WebDAV 同步配置
- ...
