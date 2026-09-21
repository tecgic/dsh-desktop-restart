# dsh-desktop-restart

[English](README.en.md) | **中文**

会话头部右上角的**一键重启**按钮。它调用 DSH 桌面端自身的重启通道——也就是菜单里
`Harness → Restart Harness` 走的那条路——让 harness 原地重启。

没有 shell 脚本、没有 `lsof`、没有端口轮询、也不刷新页面：桌面端本来就有重启通道，
这个插件只是在它前面放了一个按钮。

![DSH 会话头部右上角的重启按钮](assets/screenshot-1.png)

## 按钮在哪

会话头部的右上角工具区，紧邻文件操作（"打开所在文件夹"、导出会话）那一排：
插槽 `conversation.session.header.utilities`。

![细节：文件夹操作与布局切换之间的 ↻ 按钮，悬停显示 tooltip](assets/screenshot-2.png)

| 状态 | 样子 | 含义 |
| --- | --- | --- |
| idle | ↻ 箭头，悬停有底色 | 点击即重启 |
| busy | 同一箭头旋转、变暗 | 请求已发出，正在重启 |
| sent | 箭头变绿 | 桌面端已接受重启 |
| red | 箭头变红约 4 秒并显示短标签 | 没有桌面桥，或桥拒绝了请求 |

## 前提

- **DSH 桌面端**（打包的 Electron 应用）。按钮驱动的是
  `globalThis.dshDesktop.restartHarness()`，它只存在于桌面窗口的渲染进程里。
- 在普通浏览器标签页里打开同一地址：按钮会正常显示，但点击后只提示"需桌面窗口"，不会重启任何东西。
  这是刻意的——桌面端的 `harness:restart` IPC 只接受它自己主窗口的请求，浏览器侧没有别的路可走。

## 安装

```sh
dsh plugin --profile web add github:tecgic/dsh-desktop-restart
```

装完**重启一次**（菜单 `Harness → Restart Harness`，或退出重开）——bundle 列表在启动时读取，
新插件只能在下一次启动生效。

本地开发安装：

```sh
dsh plugin --profile web add link:/绝对路径/dsh-desktop-restart
```

## 工作原理

- **宿主半体**（`lib/index.js`）：空的 `apply()`。它只是让 Loader 有一个可加载的行；
  浏览器半体通过 `package.json` 的 `exports["./client"]` 与 `dsh.client` 声明被发现并注入页面。
- **浏览器半体**（`lib/client.js`）：手写的客户端模块
  （`window.__ModuleLoader__.load({ id, factory })`，无需构建步骤），把组件注册进
  `conversation.session.header.utilities` 插槽，点击时调用
  `globalThis.dshDesktop.restartHarness()`。
- `cordis.patch.yml` 是纯 `insert` 行，所以这个 bundle 也能被市场热挂载。

因为宿主侧不做任何事，插件不需要 RPC 接口、不需要路由、不需要权限，从 git 源码安装也没有构建步骤、
不需要构建授权。

## 与其它重启插件的区别

大多数重启插件从宿主侧下手：注册一个 HTTP 路由，找出监听端口的 PID，`SIGTERM` 掉，
再用分离的 shell helper 按同一命令行拉起，然后轮询端口直到服务恢复并刷新页面。
那种做法在纯 `dsh web`（命令行启动）下也能用。

这个插件两样都不做：它把请求交给桌面端，由桌面端重启自己的 harness 子进程。结果是：

- 不依赖任何外部命令（`lsof`、`kill`、登录 shell），也没有平台相关的进程查找；
- 不产生分离的第二个进程，不存在两个 harness 抢同一端口的情况；
- 不刷新页面——新 harness 起来后由桌面端自己重载窗口；
- 代价是**不支持普通浏览器**：桌面窗口之外没有这个桥，按钮会如实提示。

## 卸载

```sh
dsh plugin --profile web remove dsh-desktop-restart
```

或者从 profile 的 `package.json` 里删掉 `dsh.profile.bundles` 中的 `dsh-desktop-restart`，
重跑一次安装，再重启一次。

## 许可证

MIT
