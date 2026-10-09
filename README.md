# 券商自动化流程监控大屏

面向 4K 大屏展示的券商自动化流程监控演示系统。页面将 7 个核心大流程集中展示在同一屏内，并可快速定位小流程和操作级异常。

## 在线访问

GitHub Pages 演示地址：

[https://zhangyu-2380.github.io/zy/](https://zhangyu-2380.github.io/zy/)

> 当前版本使用模拟数据，仅用于界面与流程监控演示；请勿提交真实生产数据、账号、密码或密钥。

## 已实现功能

- 7 个大流程同屏展示，适配 3840 × 2160、系统缩放 300% 的大屏环境。
- 每个大流程包含小流程清单与操作级状态块。
- 支持完成、执行中、异常、超时、未执行五种状态。
- 支持筛选异常/超时流程。
- 点击任意操作可查看执行耗时、来源、异常原因与错误编码。
- 每个流程模块内独立滚动，保证整体页面不出现纵向滚动。

## 本地运行

### 实时模拟（推荐）

先运行 `pnpm run build` 生成最新版网页，然后启动合并后的 Python 服务：

```powershell
& "C:\Users\23581\AppData\Local\Programs\Python\Python314\python.exe" .\monitor_demo_v4.py
```

打开 http://127.0.0.1:8000，默认模拟密码为 `demo123`。Python 每 5 秒改变流程状态；两个界面每 3 秒通过 `/api/snapshot` 获取同一份数据。点击“开启告警声音”后，新出现的异常会播放声音，即使异常总数不变也能识别。首次读取仅作为基线，不播放历史告警。

顶部显示最后更新时间；服务断开时保留上次数据并提示重试。告警时间保留实际模拟发生时间。此版本没有连接生产数据库。

可以用环境变量 `MONITOR_PASSWORD` 修改密码，用 `MONITOR_PORT` 修改端口。默认只监听本机。登录会话有效期 8 小时，重启服务后需重新登录。

GitHub Pages 仍为静态演示，不运行 Python。代码变更后需要重新构建并重启本地服务。

### 在代码中更换警报音

界面仅显示告警声音开关。把下载好的 MP3 放进 `public/audio/`（例如 `alarm.mp3`），在 `lib/alarm-config.ts` 中修改：

```typescript
export const ALARM_AUDIO_PATH: string | null = "./audio/alarm.mp3";
export const ALARM_AUDIO_VOLUME = 0.7;
```

流程和监控两页共用这个配置。修改后运行 `pnpm run build` 并刷新网页。设回 `null` 可恢复内置警报音。MP3 加载失败会回退到内置声音；关闭声音会立即停止播放。

### 前端开发预览

运行环境：Node.js 22 或更高版本、pnpm 11。

```bash
pnpm install
pnpm run dev
```

浏览器打开终端显示的本地地址即可预览。

## 校验与构建

```bash
pnpm run typecheck
pnpm run build
```

构建会生成可直接托管的静态文件，输出目录为 `dist/client`。

## 发布到 GitHub Pages

推送到 `main` 分支后，GitHub Actions 会自动完成构建和发布。

首次使用时，在仓库的 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。

部署状态可在仓库的 **Actions** 页面查看。

## 后续建议

当前为静态演示版本。若接入真实监控数据，建议补充后端接口、身份认证、权限控制、日志脱敏与告警通知，并部署到具备访问控制的环境，而不是公开 GitHub Pages。
