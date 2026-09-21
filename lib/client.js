// dsh-desktop-restart —— 浏览器半体。
// 手写的 DSH 客户端模块（__ModuleLoader__.load 包裹），无需 esbuild 构建步骤。
// 契约取自 DSH 自带插件（如 @deepseek-ai/dsh-session-log-export/lib/client.js）：
//   factory(require) -> module.exports = { apply, inject }，inject 是需要的客户端服务名。
window.__ModuleLoader__.load({
	id: "dsh-desktop-restart",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		var React = require("react");

		/** 所需客户端服务：只用到插槽表。 */
		const inject = ["slots"];

		const h = React.createElement;
		/** 会话头部的右上角工具区：打开位置 / 导出会话那一排。 */
		const HOST_SLOT = "conversation.session.header.utilities";
		/** 排在同排其它按钮之后，尽量靠右（紧邻右栏展开按钮）。 */
		const ORDER = 1000;

		const zh = !/^en\b/iu.test(globalThis.navigator?.language ?? "");

		const TEXT = {
			idle: zh ? "重启 DSH（立即重启 harness，无需重开窗口）" : "Restart DSH (restarts the harness in place)",
			busy: zh ? "正在重启 DSH…" : "Restarting DSH…",
			sent: zh ? "已发出重启指令，正在重新启动" : "Restart requested, restarting now",
			failed: zh ? "重启失败：宿主桥拒绝了请求（详见控制台）" : "Restart failed: the host bridge rejected the request",
			unavailable: zh ? "仅在 DSH 桌面窗口内可用：浏览器里的页面没有桌面桥" : "Only available inside the DSH desktop window",
			short: zh ? "需桌面窗口" : "Desktop only"
		};

		/**
		 * 桌面桥入口。只有 DSH Desktop 主窗口的页面会注入 globalThis.dshDesktop；
		 * 在外部浏览器里打开同一个地址时它是 undefined。
		 */
		function desktopBridge() {
			const bridge = globalThis.dshDesktop;
			if (bridge !== null && typeof bridge === "object" && typeof bridge.restartHarness === "function") return bridge;
			return void 0;
		}

		/** 重启图标（顺时针箭头）。 */
		function RestartIcon(props) {
			return h(
				"svg",
				{
					width: 16,
					height: 16,
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: 2,
					strokeLinecap: "round",
					strokeLinejoin: "round",
					"aria-hidden": "true",
					style: {
						display: "block",
						transformOrigin: "50% 50%",
						animation: props && props.spin ? "dsh-desktop-restart-spin 900ms linear infinite" : void 0
					}
				},
				h("polyline", { key: "arrow", points: "23 4 23 10 17 10" }),
				h("path", { key: "arc", d: "M20.49 15a9 9 0 1 1-2.12-9.36L23 10" })
			);
		}

		/**
		 * 头部按钮：点击即调用 restartHarness()。
		 * idle → busy → sent（页面随后被宿主进程接管重启）；
		 * 没有桌面桥或桥报错时短暂显示红色提示。
		 */
		function RestartAction() {
			const [phase, setPhase] = React.useState("idle");
			const [hover, setHover] = React.useState(false);
			const timer = React.useRef(0);

			React.useEffect(() => () => {
				if (timer.current) clearTimeout(timer.current);
			}, []);

			const flash = (next) => {
				setPhase(next);
				if (timer.current) clearTimeout(timer.current);
				timer.current = setTimeout(() => setPhase("idle"), 4000);
			};

			const onClick = () => {
				if (phase === "busy") return;
				const bridge = desktopBridge();
				if (bridge === void 0) {
					flash("unavailable");
					return;
				}
				setPhase("busy");
				Promise.resolve()
					.then(() => bridge.restartHarness())
					.then(() => setPhase("sent"))
					.catch((error) => {
						console.warn("[dsh-desktop-restart] restartHarness 失败", error);
						flash("failed");
					});
			};

			const iconOnly = phase === "idle" || phase === "busy" || phase === "sent";
			const danger = phase === "failed" || phase === "unavailable";
			const label = TEXT[phase] ?? TEXT.idle;

			return h(
				"button",
				{
					type: "button",
					onClick,
					onMouseEnter: () => setHover(true),
					onMouseLeave: () => setHover(false),
					title: label,
					"aria-label": label,
					disabled: phase === "busy",
					style: {
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 4,
						flex: "0 0 auto",
						height: 26,
						minWidth: 26,
						padding: iconOnly ? 0 : "0 6px",
						margin: 0,
						border: 0,
						borderRadius: 6,
						background: hover ? "rgba(127,127,127,0.16)" : "transparent",
						color: danger ? "#e5484d" : phase === "sent" ? "#30a46c" : "inherit",
						font: "inherit",
						fontSize: 12,
						lineHeight: 1,
						cursor: phase === "busy" ? "default" : "pointer",
						opacity: phase === "busy" ? 0.6 : 1
					}
				},
				iconOnly
					? h(RestartIcon, { key: "icon", spin: phase === "busy" })
					: h(RestartIcon, { key: "icon", spin: false }),
				iconOnly ? null : h("span", { key: "text" }, TEXT.short)
			);
		}

		/** 客户端插件体：登记一个头部工具区按钮。 */
		function apply(ctx) {
			// 旋转动画的 keyframes（只注入一次，插件卸载时回收）。
			ctx.effect(() => {
				const style = document.createElement("style");
				style.setAttribute("data-plugin", "dsh-desktop-restart");
				style.textContent =
					"@keyframes dsh-desktop-restart-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}";
				document.head.appendChild(style);
				return () => style.remove();
			}, "dsh-desktop-restart: spin keyframes");

			ctx.slots.inject(HOST_SLOT, () =>
				ctx.slots.register(
					{
						name: HOST_SLOT,
						id: "dsh-desktop-restart",
						order: ORDER,
						inject: () => ({})
					},
					RestartAction
				)
			);
		}

		exports.apply = apply;
		exports.inject = inject;
		exports.name = "dsh-desktop-restart";
		return module.exports;
	}
});
