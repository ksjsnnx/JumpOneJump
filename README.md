# JumpOneJump

一个基于 `Cocos Creator 3.8.8` 开发的 3D 跳一跳小游戏。

玩家通过长按蓄力、松手起跳，在平台之间不断跳跃并累计分数。项目当前支持鼠标和触摸输入，也已经针对 Web 端做了基础适配，适合继续发布到网页试玩。

## 项目特点

- 基于 `Cocos Creator 3.8.8`
- 支持 `Web` 平台构建与发布
- 支持鼠标与触摸操作
- 已完成基础架构拆分，便于继续扩展玩法
- 已补充网页端元信息、响应式 UI 和横竖屏提示

## 玩法说明

- 长按屏幕或鼠标左键进行蓄力
- 松手后角色朝下一个平台跳跃
- 成功落到下一个平台即可得分
- 落点越接近平台中心，可获得更高奖励
- 掉落平台则游戏失败，并自动重新开始

## 开发环境

- `Cocos Creator 3.8.8`
- `TypeScript`

## 如何打开项目

1. 启动 `Cocos Creator 3.8.8`
2. 选择“导入项目”或“打开项目”
3. 选择项目目录：
   `D:\CocosProject\JunpOneJump`
4. 等待编辑器完成资源导入

## 如何运行

在 `Cocos Creator` 中打开项目后，可以直接：

1. 进入场景
2. 点击编辑器中的预览或运行按钮
3. 使用鼠标左键或触屏测试游戏

## 如何构建 Web

1. 打开 `项目 -> 构建发布`
2. 发布平台选择：
   - `Web Mobile`：适合手机浏览器
   - `Web Desktop`：适合电脑浏览器
3. 点击“构建”
4. 构建完成后可点击“运行”进行本地预览

当前本地构建产物示例目录：

```text
build/web-desktop
```

如果要部署到静态网页托管平台，应该上传 `build/web-desktop` 目录中的内容，并确保站点根目录第一层直接包含 `index.html`。

## 项目结构

```text
assets/
  Scene/
    scene.scene
  scripts/
    JumpOneGame.ts
    game/
      JumpGameConfig.ts
      JumpGameMath.ts
      JumpGameTypes.ts
      JumpPlatformManager.ts
      JumpUIController.ts
      JumpWebSupport.ts
      JumpWorld.ts
```

### 主要脚本说明

- `assets/scripts/JumpOneGame.ts`
  游戏主控制器，负责状态流转、输入响应、跳跃结算和相机更新。

- `assets/scripts/game/JumpWorld.ts`
  负责 3D 世界搭建，包括角色、地面、平台节点创建等。

- `assets/scripts/game/JumpPlatformManager.ts`
  负责平台生成、平台队列推进、落点判定等逻辑。

- `assets/scripts/game/JumpUIController.ts`
  负责分数、提示文案、状态面板和移动端横竖屏提示。

- `assets/scripts/game/JumpWebSupport.ts`
  负责 Web 页面元信息注入、窗口变化监听和视口状态计算。

- `assets/scripts/game/JumpGameConfig.ts`
  集中管理游戏数值、颜色配置、提示文案和 Web 页面信息。

## 当前已完成的优化

- 将原本集中在单个脚本中的逻辑拆分为多个职责明确的模块
- 提升了代码可读性与可扩展性
- 增加了网页端页面标题、描述、主题色等元信息
- 增加了小屏适配与横竖屏提示
- 保留了原有核心玩法，方便继续迭代

## 后续可扩展方向

- 增加开始界面与结算界面
- 增加音效、背景音乐和跳跃特效
- 增加难度递增机制
- 增加排行榜或历史最高分
- 增加更多平台样式、角色皮肤或地图主题

## 说明

`library`、`temp`、`build`、`profiles` 等目录属于编辑器缓存或构建产物，通常不建议提交到版本库。

如果你准备把项目发布到网页平台，推荐优先使用 `Web Mobile` 或 `Web Desktop` 进行构建，再将构建输出部署到静态托管服务。
