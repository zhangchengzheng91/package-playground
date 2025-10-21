# AI 聊天应用增强（Enhancement of AI chat applications）

一个Chrome插件，允许用户在任何网页上动态注入自定义CSS样式。

一个 AI 增加聊天应用插件。支持自定义样式，会话快捷跳转。

## 项目背景

对于作者来说，AI 聊天应用现在已经取代了搜索引擎的位置，

## 功能特性

- 🎨 支持输入自定义CSS样式
- 🚀 一键注入样式到当前页面
- 🗑️ 一键移除注入的样式
- 💡 美观的用户界面
- 🔄 实时状态反馈

## 安装方法

1. 打开Chrome浏览器
2. 进入 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择此插件文件夹
6. 插件安装完成！

## 使用方法

1. 点击浏览器工具栏中的插件图标
2. 在弹出的界面中输入CSS样式内容
3. 点击"注入样式"按钮应用样式
4. 点击"移除样式"按钮移除之前注入的样式

## 示例CSS

```css
/* 改变所有div的背景色 */
div { background: red; }

/* 修改段落样式 */
p { 
  color: blue; 
  font-size: 18px; 
  font-weight: bold; 
}

/* 添加边框到所有图片 */
img { 
  border: 3px solid green; 
  border-radius: 10px; 
}
```

## 文件结构

```
chrome-extensions/
├── manifest.json      # 插件配置文件
├── popup.html         # 插件弹窗界面
├── popup.js          # 弹窗逻辑处理
├── content.js        # 内容脚本，负责样式注入
└── README.md         # 说明文档
```

## 技术实现

- **Manifest V3**: 使用最新的Chrome扩展API
- **Content Scripts**: 在页面中执行样式注入
- **Message Passing**: popup与content script之间的通信
- **DOM Manipulation**: 动态创建和插入style标签

## 注意事项

- 注入的样式只对当前标签页有效
- 刷新页面后注入的样式会消失
- 支持所有标准CSS语法
- 可以随时移除注入的样式