# PaperCAT v0.1 启动提示词

把下面这段提示词复制给 Claude Code、Codex 或其他本地 coding agent，让它先理解项目，再帮你启动 PaperCAT。

```text
你现在在 PaperCAT 项目根目录。

请先阅读 README.md、start_papercat.cmd、scripts/start_papercat.ps1、backend/app/config.py、desktop/package.json，理解这个项目的启动方式。

目标：
1. 在本地启动 PaperCAT v0.1。
2. 后端 FastAPI 默认运行在 http://127.0.0.1:8766。
3. 桌面端 Electron 小猫窗口需要被打开。
4. 不要打包，不要发布，只做本地启动。

推荐启动方式：
- Windows 下优先运行：start_papercat.cmd
- 如果依赖已经安装过，可以运行：
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\start_papercat.ps1 -SkipInstall

启动前请检查：
- 当前目录是否是 PaperCAT 根目录。
- Python 3.10+ 是否可用。
- Node.js 18+ 和 npm 是否可用。
- 如果端口 8766 已被旧 PaperCAT 后端占用，可以结束旧进程后重新启动。

启动后请验证：
1. 访问 http://127.0.0.1:8766/api/health。
2. 如果返回 status: ok，说明后端正常。
3. 确认 Electron 桌面小猫窗口已经打开。

如果启动失败，请：
- 查看 desktop/runtime/logs/ 下的日志。
- 报告失败的命令、错误信息和你已经尝试过的修复。
- 不要随意删除用户数据；只有在用户明确要求清空历史时，才删除 backend/data/papers.db 或 backend/outputs/cache/。

完成后，请简短告诉我：
- 后端是否启动成功。
- Electron 是否启动成功。
- 健康检查结果。
```

