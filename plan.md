# 播放器稳定实例生命周期 Plan

## 1. 需求文档

当前材料页和听写练习页已经有播放、暂停、继续、从头播放、拖动进度、倍速、单条循环和自动下一条。实际体验仍有问题：暂停后再播放、播放中切换倍速、拖动进度等操作不应该让播放器进入不可预期状态。

本次要把播放器生命周期改成稳定实例模型：当前音频不变时，播放器实例保持存在；暂停、继续、倍速和拖动进度都只是控制同一个实例；只有切换音频、从页面离开或明确停止释放资源时才销毁旧实例。

业务完成标准：用户在同一条音频上暂停、继续、改倍速、拖动进度和从头播放时，状态稳定、位置明确、不会因为销毁重建造成跳点或按钮错乱；切换到另一条音频时才释放旧实例并创建新实例。

## 2. 当前事实

- 当前工作区有未提交的播放增强改动。
- `pages/materials/materials.ts` 和 `pages/practice/player.ts` 已经通过播放器服务调用播放、暂停、从头、拖动和倍速。
- 页面没有直接创建 `InnerAudioContext`。
- `audioPlayer.ts` 已改成稳定实例模型：同一音频上的暂停、继续、倍速、拖动和从头播放都操作同一个 `InnerAudioContext`。
- `audioPlayer.ts` 只在切换音频或页面调用 `stopListeningAudio()` 时销毁活动实例。
- 当前完整验证命令是 `npm.cmd run verify` 和 `npm.cmd run build`。

## 3. 失败测试

以下任一情况视为失败：

- 同一条音频暂停、继续、倍速或拖动进度时销毁 `InnerAudioContext`。
- 播放中切换倍速时没有保留当前播放位置。
- 暂停状态切换倍速后自动播放。
- 暂停状态切换倍速后再次播放没有从暂停位置继续。
- 拖动进度总是强制播放，不能保留拖动前的暂停状态。
- 从头播放不能稳定从 0 秒开始。
- 切换到另一条音频时没有释放旧实例。
- 页面直接访问 `InnerAudioContext`。
- 为解决问题新增假接口、空实现、旧参数兼容或页面层魔法分支。
- `npm.cmd run verify` 或 `npm.cmd run build` 失败。

## 4. 目标

- `audioPlayer.ts` 以当前音频实例为生命周期边界。
- 当前音频不变时，`toggleListeningAudio`、`restartListeningAudio`、`seekListeningAudio`、`updateActivePlaybackRate` 都操作同一个 `InnerAudioContext`。
- `updateActivePlaybackRate` 不销毁实例；播放中改倍速时记录位置、设置倍速、seek 回当前位置并继续播放；暂停中改倍速时只更新倍速并保留暂停位置。
- `seekListeningAudio` 支持按调用前状态决定是否继续播放，避免暂停拖动后被强制播放。
- 切换音频、页面停止和释放资源时才销毁实例。
- 补充测试覆盖稳定实例模型。
- 保持页面调用边界不变，页面仍只调用播放器服务。

## 5. 不做范围

- 不新增播放功能。
- 不重做 UI。
- 不改循环和自动下一条规则。
- 不改播放设置缓存结构。
- 不改云端数据。
- 不提交或 push；commit/push 必须另行得到 owner 明确确认。

## 6. 设计

播放器状态：

- `stopped`：没有可继续的活动播放。
- `playing`：当前音频正在播放。
- `paused`：当前音频已暂停，并保留当前位置。

生命周期边界：

- 创建实例：播放一条当前不存在的音频，或切换到另一条音频。
- 销毁实例：切换到另一条音频、页面调用 `stopListeningAudio()`、明确释放资源。
- 不销毁实例：暂停、继续、倍速、拖动、从头播放。

服务层主链路：

- `ensureAudioSession(audio, hooks, playbackRate)`：如果当前实例不存在或音频不同，先释放旧实例，再创建并绑定当前音频；如果音频相同，只更新 hooks 和倍速。
- `toggleListeningAudio`：播放中则暂停并记录位置；暂停中则设置倍速并从记录位置继续；停止或新音频则创建实例并播放。
- `restartListeningAudio`：确保当前音频实例存在，`seek(0)` 后播放，不销毁同一音频实例。
- `seekListeningAudio`：确保当前音频实例存在，`seek(position)`；如果进入前是播放中则继续播放，如果进入前是暂停中则保持暂停。
- `updateActivePlaybackRate`：只更新当前实例倍速和服务状态；播放中为了让倍速立即生效，记录当前位置、设置倍速、`seek(position)`、`play()`；暂停中设置倍速和位置，不播放。
- 事件回调用会话令牌隔离旧实例；只有当前实例事件能更新状态。

测试边界：

- 测试同一音频改倍速不销毁实例。
- 测试暂停后改倍速不自动播放，再继续从暂停位置播放。
- 测试从头播放同一音频不销毁实例。
- 测试切换音频才销毁旧实例。
- 测试暂停状态拖动进度不强制播放。

## 7. 实施任务

- [x] T001 改造播放器服务为稳定实例模型；验收：同一音频控制操作不销毁实例。
- [x] T002 补充和修正播放器测试；验收：测试覆盖倍速、暂停、拖动、从头、切换音频的生命周期边界。
- [x] T003 检查页面接线；验收：页面仍只调用播放器服务，不直接访问 `InnerAudioContext`。
- [x] T004 运行验证和构建；验收：`npm.cmd run verify`、`npm.cmd run build` 通过。
- [x] T005 收口记录；验收：`plan.md` 写明完成事实、验证结果和剩余风险。

## 8. 验证计划

执行：

```powershell
npm.cmd run verify
npm.cmd run build
```

检查：

- `audioPlayer` 测试覆盖稳定实例模型。
- 搜索确认页面没有直接访问 `InnerAudioContext` 或 `wx.createInnerAudioContext()`。
- 构建产物生成到 `dist/miniprogram`。

## 9. 收口

目标已完成。

完成事实：

- `audioPlayer.ts` 已改为稳定实例模型。
- 同一条音频上暂停、继续、倍速、拖动进度和从头播放都不销毁 `InnerAudioContext`。
- `updateActivePlaybackRate` 不再重建实例；播放中会记录当前位置、设置倍速、`seek(position)` 并继续播放；暂停中只更新倍速和保留位置，不自动播放。
- `seekListeningAudio` 会保留调用前状态：播放中拖动后继续播放，暂停中拖动后保持暂停。
- `restartListeningAudio` 对同一音频只 `seek(0)` 并播放，不销毁实例。
- 切换到另一条音频或页面调用 `stopListeningAudio()` 时才释放旧实例。
- 事件回调仍用会话令牌隔离旧实例，旧实例事件不能污染当前状态。
- 页面仍只调用播放器服务，没有直接创建或操作 `InnerAudioContext`。
- `tests/services/audioPlayer.test.ts` 已覆盖稳定实例生命周期：倍速、暂停、拖动、从头、切换音频和停止释放。

验证结果：

- `npm.cmd run typecheck` 通过。
- `npm.cmd test` 通过，60 个测试全部通过。
- `npm.cmd run verify` 通过。
- `npm.cmd run build` 通过，构建产物生成到 `dist/miniprogram`。
- 搜索确认：`wx.createInnerAudioContext()` 只在播放器服务和测试中出现；页面没有直接访问 `InnerAudioContext`。

剩余风险：

- 未在微信开发者工具或真机里人工点击验证；真实设备上建议按“播放中改倍速、暂停后改倍速再继续、暂停后拖动、切换下一条”四条路径点一遍。
- 本次没有 commit 或 push；按 `AGENTS.md` 规则，commit/push 前必须由 owner 再次明确确认。
