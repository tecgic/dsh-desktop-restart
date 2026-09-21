/**
 * dsh-desktop-restart —— 宿主半体（node 侧）。
 *
 * 这个包只贡献浏览器呈现：宿主侧留一个空的 loader 行，浏览器半体通过
 * package.json 的 `exports["./client"]` + `dsh.client` 声明被发现并注入页面。
 * 重启动作完全在渲染进程里完成（调用桌面桥 globalThis.dshDesktop.restartHarness()），
 * 宿主不需要任何逻辑，也就不需要 RPC / 路由 / 权限。
 */
export const name = 'dsh-desktop-restart';

/** 宿主插件体：本包仅贡献浏览器呈现。 */
export function apply() {}
