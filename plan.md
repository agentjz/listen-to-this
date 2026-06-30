# Local Assets 分区存储 Plan

## 1. 需求文档

`local-assets` 是仓库级本地样例材料目录。现在所有材料直接放在 `local-assets/<material-id>/`，公共资源、未分类材料、用户材料在文件系统上没有天然边界。这个结构一开始简单，但后续会让公共只读、未分类暂存、用户自建材料混在同一个目录层，维护成本会上升。

本次要把 `local-assets` 从单层材料目录改成明确分区目录：

```text
local-assets/
  public/
  uncategorized/
  user/
```

每个分区下面再放材料文件夹。用户看到的业务含义是：公共资源只读；未分类材料作为默认暂存分类；用户材料是可编辑、可删除、可移动的个人材料。文件系统从一开始就表达这个边界。

业务完成标准：本地样例材料能放进对应分区；构建脚本从分区目录扫描并生成小程序材料；校验脚本能拒绝错误结构；现有样例迁移到 `local-assets/public/dog-wolf-friendship/`；测试、构建和文档同步完成。

## 2. 当前事实

- 当前 `scripts/generate-local-assets.js` 只扫描 `local-assets/<material-id>/`。
- 当前 `scripts/check-local-assets.js` 只允许 `local-assets` 根目录直接出现材料文件夹。
- 当前 `local-assets` 只有 `dog-wolf-friendship` 一个样例材料。
- 当前生成的 `cloudFileId` 是 `/local-assets/<material-id>/audio.<format>`。
- 当前 `metadata.json` 写入 `libraryId/public-library`、`libraryName/公共资源`、`libraryKind/general`。
- 当前 `spec.md`、项目 skill 写的是 `local-assets/<folder-id>/` 结构。
- 当前完整验证命令是 `npm.cmd run verify`，构建命令是 `npm.cmd run build`。

## 3. 失败测试

以下任一情况视为失败：

- `local-assets` 根目录继续直接放材料文件夹。
- 构建脚本把 `public`、`uncategorized` 或 `user` 错当成材料。
- 同名材料跨分区后生成重复 ID 或路径冲突。
- 生成的本地音频路径仍指向旧的 `/local-assets/dog-wolf-friendship/audio.mp3`。
- 校验脚本允许未知顶层分区或错误文件层级。
- 公共资源、未分类材料、用户材料的 `libraryId/libraryName/libraryKind` 推导不稳定。
- 文档仍写旧的单层结构为当前事实。
- `npm.cmd run verify` 或 `npm.cmd run build` 失败。

## 4. 目标

- 顶层分区固定为 `public`、`uncategorized`、`user`。
- 材料目录固定为 `local-assets/<section>/<material-id>/`。
- 生成材料 ID 使用 `<section>-<material-id>`，保证跨分区唯一。
- 默认分类由顶层分区推导：
  - `public` -> `public-library` / `公共资源` / `general`。
  - `uncategorized` -> `uncategorized-library` / `未分类材料` / `user`。
  - `user` -> `user-library` / `用户资源` / `user`。
- `metadata.json` 只允许覆盖 `libraryId/libraryName/libraryKind`，但公共样例默认不需要它。
- 样例 `dog-wolf-friendship` 移到 `local-assets/public/dog-wolf-friendship/`。
- 生成路径改为 `/local-assets/public/dog-wolf-friendship/audio.mp3`。
- 文档、skill、测试同步当前事实。

## 5. 不做范围

- 不改小程序运行时用户新建材料的存储目录；`local-assets` 仍是仓库级样例目录。
- 不做云端资源结构迁移。
- 不做小程序内文件系统写回 `local-assets`。
- 不保留旧单层目录兼容扫描。
- 不新增 UI 功能。
- 不 commit、不 push。

## 6. 设计

主链路：

```text
local-assets/<section>/<material-id>/
-> check-local-assets 校验分区、材料文件和重复 ID
-> generate-local-assets 扫描分区
-> 推导 title/library/audio/content
-> 写 miniprogram/generated/localAssets.ts
-> localDataStore 初始化本地材料、分类和音频
-> build-miniprogram 复制 local-assets 到 dist/miniprogram/local-assets
```

模块边界：

- `scripts/generate-local-assets.js` 负责扫描和生成 TypeScript 数据。
- `scripts/check-local-assets.js` 负责目录结构和文件约束。
- `local-assets/` 只承载样例材料文件，不承载运行时用户数据。
- `miniprogram/services/localDataStore.ts` 不直接读文件系统，只消费生成数据。

错误边界：

- 未知顶层目录报错。
- 顶层目录内出现非材料目录报错。
- 材料目录内出现子目录报错。
- 同一分区或跨分区生成相同材料 ID 报错。
- 一个材料目录中多个音频文件报错。
- 缺 `text.txt` 报错。

## 7. 实施任务

- [x] T001 完成当前结构和引用调查。
- [x] T002 更新 `plan.md` 为分区存储执行合同。
- [x] T003 重写生成脚本支持 `public/uncategorized/user` 三分区扫描。
- [x] T004 重写校验脚本支持三分区结构和错误结构拒绝。
- [x] T005 迁移 `dog-wolf-friendship` 到 `local-assets/public/`，删除旧单层目录。
- [x] T006 更新生成文件和相关测试期望。
- [x] T007 同步 `spec.md`、README 和项目 skill 的 `local-assets` 当前事实。
- [x] T008 运行 `npm.cmd run verify` 和 `npm.cmd run build`。
- [x] T009 收口记录完成事实、验证结果和剩余风险。

## 8. 验证计划

执行：

```powershell
npm.cmd run verify
npm.cmd run build
```

检查：

- `miniprogram/generated/localAssets.ts` 指向 `/local-assets/public/dog-wolf-friendship/audio.mp3`。
- `dist/miniprogram/local-assets/public/dog-wolf-friendship/audio.mp3` 存在。
- `scripts/check-local-assets.js` 不允许根目录直接放材料。
- 文档不再把旧单层结构写成当前事实。

## 9. 收口

目标已完成。

完成事实：

- `local-assets/` 已改为 `public/`、`uncategorized/`、`user/` 三个顶层分区。
- 样例材料已迁移到 `local-assets/public/dog-wolf-friendship/`。
- 旧的 `local-assets/dog-wolf-friendship/` 单层材料目录已移除。
- `scripts/generate-local-assets.js` 只扫描三分区结构，生成材料 ID 为 `<section>-<folder-id>`。
- `scripts/check-local-assets.js` 会拒绝未知顶层目录、旧单层材料目录、错误文件层级、缺少 `text.txt` 和多个音频文件。
- `miniprogram/generated/localAssets.ts` 已生成新路径：`/local-assets/public/dog-wolf-friendship/audio.mp3`。
- 新增脚本测试覆盖三分区扫描和旧单层结构拒绝。
- `spec.md` 和项目 skill 已同步当前 `local-assets/<section>/<folder-id>/` 事实。
- 构建产物已复制到 `dist/miniprogram/local-assets/public/dog-wolf-friendship/audio.mp3`。

验证结果：

```powershell
npm.cmd run verify
npm.cmd run build
```

全部通过。`npm.cmd run verify` 中 62 个测试通过，边界检查和 local-assets 校验通过。

未验证内容：

- 未在微信开发者工具或真机中人工打开材料播放。

剩余风险：

- 这次明确切断旧单层 `local-assets/<material-id>/` 结构；后续新增样例必须放到 `public`、`uncategorized` 或 `user` 分区下。
- 本次没有 commit 或 push；按 `AGENTS.md` 规则，commit/push 前必须由 owner 再次明确确认。
