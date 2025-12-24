# 易知 (YiZhi) 阿里云 ECS 部署运维手册

- **服务器 IP**: `47.101.171.131`
- **域名**: `yilogic.cn`
- **架构**: Next.js (Node.js) + PM2 + Nginx + MemFire Cloud (BaaS)
- **部署目录**: `/var/www/yilogic`

---

## 第一部分：环境搭建（已完成/参考用）

如果未来迁移服务器或重装系统，请按此步骤操作。

### 1. 基础环境安装
```bash
# 更新系统
apt update && apt upgrade -y

# 安装常用工具
apt install git nginx curl vim -y

# 安装 Node.js (通过 NVM)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 安装 PM2 (进程管理)
npm install pm2 -g
```

### 2. 配置 SWAP (防内存溢出)
2GB 内存编译 Next.js 容易崩溃，建议增加虚拟内存。
```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
```

### 3. 项目初始化
```bash
# 创建目录
mkdir -p /var/www/yilogic
cd /var/www/yilogic

# 克隆代码 (首次)
git clone https://github.com/jcroseLee/yizhiWeb.git .

# 配置环境变量 (手动创建)
nano .env.local
# 粘贴 MemFire 和微信支付的配置
```

### 4. 首次启动
```bash
npm install
npm run build
pm2 start npm --name "yizhi" -- start
pm2 save      # 保存进程列表
pm2 startup   # 生成开机自启命令
```

### 5. Nginx 反向代理与 HTTPS
```bash
# 配置文件: /etc/nginx/sites-available/default
# 内容：见下文 Nginx 完整配置

# 安装 SSL 证书工具
apt install certbot python3-certbot-nginx -y
# 申请证书
certbot --nginx -d yilogic.cn -d www.yilogic.cn
```

---

## 第二部分：日常运维与更新（核心）

这是你以后最常用的操作。

### 1. 一键更新代码流程
当你在本地（VS Code）修改完代码并 `git push` 后，在服务器执行以下命令更新：

**手动步骤：**
```bash
# 1. 进入目录
cd /var/www/yilogic

# 2. 拉取最新代码
git pull

# 3. 安装新依赖 (如果 package.json 没变可跳过，但跑一下更稳妥)
npm install

# 4. 重新编译 (Next.js 必须步骤，耗时约1-2分钟)
npm run build

# 5. 重启服务 (零停机重启)
pm2 reload yizhi
```

### 2. 自动化脚本（推荐）
为了省去每次都要敲这 5 行命令，建议在服务器上创建一个脚本。

1.  在 `/root` 目录下创建 `deploy.sh`：
    ```bash
    nano /root/deploy.sh
    ```
2.  粘贴以下内容：
    ```bash
    #!/bin/bash
    echo "🚀 开始部署易知项目..."
    
    cd /var/www/yilogic || exit
    
    echo "⬇️ 拉取最新代码..."
    git pull origin main
    
    echo "📦 安装依赖..."
    npm install
    
    echo "🏗️ 开始编译..."
    npm run build
    
    echo "🔄 重启 PM2 服务..."
    pm2 reload yizhi
    
    echo "✅ 部署完成！"
    ```
3.  赋予执行权限：
    ```bash
    chmod +x /root/deploy.sh
    ```
4.  **以后更新代码，只需输入一个命令：**
    ```bash
    ./deploy.sh
    ```

---

## 第三部分：监控与故障排查

### 1. 查看日志
如果网站报错（500 Error），或者有些功能不正常，请查看日志。

*   **实时查看所有日志**：
    ```bash
    pm2 logs
    ```
*   **查看最近 100 行日志**：
    ```bash
    pm2 logs --lines 100
    ```
*   **查看 Nginx 访问日志** (查 IP、流量)：
    ```bash
    tail -f /var/log/nginx/access.log
    ```
*   **查看 Nginx 错误日志**：
    ```bash
    tail -f /var/log/nginx/error.log
    ```

### 2. 监控服务器状态
查看 CPU 和内存占用情况：
```bash
pm2 monit
```

### 3. Nginx 完整配置备份
文件路径：`/etc/nginx/sites-available/default`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yilogic.cn www.yilogic.cn;

    # 强制跳转 HTTPS (Certbot 会自动添加，但手动配置如下)
    # return 301 https://$host$request_uri;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # 传递真实 IP
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# (Certbot 生成的 HTTPS 配置在文件底部，通常不需要手动改)
```

---

## 第四部分：常见问题 QA

**Q1: 网站显示 "502 Bad Gateway"？**
*   **原因**：Next.js 服务挂了，Nginx 连不上 3000 端口。
*   **解决**：
    1.  执行 `pm2 list` 看 `yizhi` 是否是 online。
    2.  如果是 errored，执行 `pm2 logs` 看报错原因（通常是 build 失败或环境变量缺失）。
    3.  修复后执行 `pm2 restart yizhi`。

**Q2: 网站显示 "504 Gateway Time-out"？**
*   **原因**：服务器负载过高（CPU/内存爆了），或者 API 响应太慢。
*   **解决**：检查 ECS 监控图表，如果内存爆了，考虑升级配置或检查代码死循环。

**Q3: 修改了 `.env.local` 没生效？**
*   **解决**：Next.js 的环境变量是在 **构建时(Build Time)** 注入的。修改后必须重新执行 `npm run build` 和 `pm2 reload yizhi`。

**Q4: 阿里云安全组规则忘了？**
*   务必开放端口：
    *   **80/80** (HTTP)
    *   **443/443** (HTTPS)
    *   **22/22** (SSH)