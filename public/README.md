# 使用说明

## 开发环境配置

**安装 Node.js**：

1. 前往 https://nodejs.org/zh-cn/download 下载 **LTS 版本**（建议 Node 24 及以上）并安装。
2. 安装完成后，打开终端（Windows 用 PowerShell 或 CMD，Mac/Linux 用 Terminal）执行：
   ```
   node -v
   ```
   能看到版本号（如 `v24.x.x`）即安装成功。

## 构建与部署流程

在 `public` 文件夹中修改完项目后，执行构建脚本：

```
node build.js
```

在 `CloudFlare` 的 **Workers 和 Pages** 中绑定好项目后，进入项目的**设置**选项。

默认配置完成后，进入**设置** -> **构建配置**，修改**根目录**选项：

```
构建命令:无
部署命令:npx wrangler deploy
根目录:/public
```

> 由于 Cloudflare Pages 最新版部署没有 `wrangler.jsonc` 会报错，故在目录下添加此占位文件。

---

# 部署完成并推送到互联网档案馆

## 第一部分：获取 Wayback Machine 的 API Key
 
1. 打开 https://archive.org ，注册或登录一个账号。
2. 登录后访问：https://archive.org/account/s3.php
3. 页面会显示一对密钥：
   - **Access Key**
   - **Secret Key**

## 第二部分：在 GitHub 仓库里配置 Secrets
 
1. 打开 GitHub 仓库页面。
2. 依次点击：**Settings** → 左侧栏 **Secrets and variables** → **Actions**。
3. 点击 **New repository secret**，依次添加以下两个：
   | Name | Value |
   |---|---|
   | `WAYBACK_ACCESS_KEY` | 第一部分拿到的 Access Key |
   | `WAYBACK_SECRET_KEY` | 第一部分拿到的 Secret Key |

## 第三部分：创建 GitHub Actions 工作流文件
 
新建文件：
 
```
.github/workflows/archive.yml
```
 
```yaml
name: Archive after Cloudflare deploy
 
on:
  check_run:
    types: [completed]
 
jobs:
  archive:
    runs-on: ubuntu-latest
    if: >
      github.event.check_run.name == 'Workers Builds' &&
      github.event.check_run.conclusion == 'success' &&
      github.event.check_run.check_suite.head_branch == 'main'
    steps:
      - name: Trigger Wayback Machine Save
        run: |
          curl -X POST "https://web.archive.org/save" \
            -H "Accept: application/json" \
            -H "Authorization: LOW ${{ secrets.WAYBACK_ACCESS_KEY }}:${{ secrets.WAYBACK_SECRET_KEY }}" \
            -d "url=https://yume-hatsuyuki.moe" \
            -d "capture_all=1"
```
