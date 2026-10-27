# Todo V2.0 · 第9周：TypeScript 与单元测试

姓名：锡汉唐；学号：2024150181。

直接打开 `index.html` 可使用已构建的本地演示。修改 `src/` 后运行 `npm install` 和 `npm run build` 重新生成 `app.js`。任务保存在浏览器的 `localStorage`；“全部 / 未完成 / 已完成”仅切换当前视图，刷新后回到“全部”。

功能：添加、删除、切换完成状态、编辑、筛选、刷新恢复；控制台可调用 `clearCompleted()`。编辑会保留完成状态，空字符串、纯空格和取消不会修改数据。

数据流：`todos` 是唯一任务数据源；添加使用展开运算符，删除使用 `filter`，切换使用 `map` 和对象展开。操作后先 `save()`，再 `render()`。筛选只更改视图状态，不保存。

## 第9周实现与验证

- `src/todo-core.ts` 定义 `Todo` 接口并实现纯函数；`src/app.ts` 管理 DOM 与持久化，编译后的 `app.js` 已提交，双击 `index.html` 可直接打开。
- `dataset.id` 经 `parseTodoId` 严格转换为安全的正整数；DOM 查询、点击目标、历史存储数据分别处理 `null` / 脏值，全项目新增 TS 代码无 `any`。
- 沿用旧版 `localStorage` 键，自动迁移第 7/8 周的数字或 `timestamp-sequence` 字符串 ID，保留合法任务；损坏或异常记录不会导致页面崩溃。
- 运行 `npm run typecheck` 做严格类型检查，`npm run test` 会先编译再执行 9 组 Node 单测，覆盖正常路径和边界拦截。`tests/draft/ai-first-pass.mjs` 是供审查的弱断言初稿，不进入正式测试。
- 第 9 周协作记录：[锡汉唐2024150181AI协作日志W9.docx](reports/锡汉唐2024150181AI协作日志W9.docx)。

以下保留第 8 周的开发与验证记录；`tests/verify.cjs` 是旧版页面的历史集成测试，不适用于重构后的代码。

## 第8周实现

- `render()` 用 `createElement` 建节点，用 `dataset.id` 标识任务、`data-action` 区分操作；不再为 li 或操作按钮绑定监听器。
- `#todo-list` 的一个 click 监听器通过 `closest('li')` 定位任务，依次防御非元素、空值/容器外元素、缺失/无效 ID。
- 分流为删除 / 编辑 / 切换，互斥执行；删除嵌套图标时用 `closest('[data-action="delete"]')` 定位按钮。
- `updateTodo()` 使用 `map` 和对象展开，遵循改数据 → 保存 → 重渲染；兼容旧版数字 ID 在 dataset 中转为字符串的情况。

## 测试与真实截图

`tests/fixtures/before-click.js` 是课件缺陷的隔离复现：删除后还执行切换。正式页面不加载该文件。

在已安装 Playwright 的 Node 环境运行 `node tests/verify.cjs`。默认使用 macOS Chrome，可通过 `CHROME_PATH` 指定其他 Chrome 可执行文件。加 `--evidence` 会保留独立测试窗口，供查看 DevTools。

2026-10-20 使用 Chrome 155 验证：课件要求的五个场景全部通过，另测试编辑持久化、空输入/取消、数字 ID、不可变更新、边界防御与 375px 布局，共 11 组。结果见 [test-results.json](evidence/test-results.json)。

- [修复前控制台](evidence/01-before-console.png)：同一次删除打印 `[delete] w8-01` 和 `[toggle] w8-01`。
- [修复后与空白边界控制台](evidence/02-fixed-boundary-console.png)：只出现一次删除日志；实际点击列表空白后，临时一次性诊断监听器输出 `target=UL: true tasks: 1`，无新增删除/切换或错误。该诊断监听器仅在控制台临时添加，不属于正式页面代码。

## 协作与版本记录

代码、编辑分支、自动测试及记录整理均有 OpenAI Codex 协助。课件中要求本人先写假设和禁用 AI 的练习，本次没有冒充独立完成；文档如实勾选“用了”。

从远程已有的 W7 网页上传提交继续开发，先补齐缺失的 JS/CSS，然后在 `feature/v2-event-delegation` 分支分步提交并合并到 `main`。

第8周完整协作记录：[锡汉唐2024150181AI协作日志W8.docx](reports/锡汉唐2024150181AI协作日志W8.docx)。文档沿用课程模板，含五步法、统一测试表和两张真实控制台截图。
