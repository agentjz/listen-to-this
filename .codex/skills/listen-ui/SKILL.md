---
name: listen-ui
description: 维护“每日英语听写”微信小程序界面时使用。适用于修改 WXML、WXSS、Vant Weapp 组件、页面信息架构、入口卡片、材料列表、导入表单、详情页、按钮、空状态、响应式布局或任何视觉样式；要求先研究现有页面和参考实现，避免手搓错误控件和按钮布局污染。
---

# Listen UI

先看页面结构，再改样式。UI 问题通常是信息架构、组件语义和布局约束的问题，不是单纯改颜色。

## 必读上下文

修改 UI 前先读取：

- 当前目标页面的 `.wxml`、`.wxss`、`.ts`、`.json`。
- `app.wxss`。
- 相关入口页和下游页，确认用户路径。
- `spec.md` 中的当前产品事实。
- 需要用 Vant 时读取本项目 `package.json` 和目标页面 `usingComponents`。
- 有参考项目时，只把 `ref/` 或 `listen-ref/` 当研究材料，运行时代码不得引用它们。

## 组件语义

- 原生 `button` 和 `van-button` 只用于真实命令：保存、确认、上传、生成、删除。
- 不把 `button` 当卡片、列表项、网格入口、整行容器或布局盒子。
- 可点击卡片、资源行、材料行使用 `view bindtap`，并用清晰的 class 表达其业务角色。
- 图标用 Vant icon 或已有组件，不手写临时图形。
- 命令按钮必须有稳定高度、明确 padding、可读文字和不会挤压的容器。

## 布局规则

- 页面只保留当前产品路径需要的入口，不添加伪统计、伪功能、解释性大段文案。
- 卡片半径保持克制，默认不超过 `8rpx`。
- 卡片内部拆成 body、footer、action 等语义区域，不把所有内容塞进一条横向 flex。
- 横向 flex 子元素必须处理 `min-width: 0`、`flex: none` 或 `flex: 1` 的归属，避免文字被挤成竖排。
- 可变文本使用 `overflow-wrap: break-word`，不要靠固定宽度赌内容长度。
- 表单输入、textarea、placeholder 的高度、line-height、padding 要同时定义，避免占位文字被裁切。
- 不使用左侧彩条、编号式 `#1/#2`、大面积空洞说明卡或单一换色伪设计。

## 视觉规则

- 主色使用浅蓝体系，配合中性色、状态色和足够留白；不要回到重靛蓝，也不要做大面积渐变。
- 信息密度服务学习工具：入口清晰、列表可扫、操作可达。
- 资源页负责选择和新增分类；材料页负责播放、查看原文、移动分类、长按拖拽排序和删除；详情页负责原文和云端音频命令。
- 本地和云端是两个入口，不做自动兜底或暗中切换。

## 验证

收尾前至少执行：

```powershell
rg "<button|button\\b|::after|display:\\s*flex|grid-template-columns|width:\\s*100%" pages app.wxss -n
npm.cmd run verify
```

如果结构性删除或 TypeScript 输出可能陈旧，先清理生成的 `.js` 再运行：

```powershell
npm.cmd run build
```

最终说明哪些 UI 结构被改掉，哪些命令完成验证。不要用“更好看了”代替证据。
