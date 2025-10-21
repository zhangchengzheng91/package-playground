# 🚀 Chrome Web Store 发布检查清单

## 📋 发布前检查

### ✅ 必需文件检查
- [x] `manifest.json` - 使用 Manifest V3
- [x] `popup.html` - 插件弹窗界面
- [x] `popup.js` - 弹窗逻辑
- [x] `content.js` - 内容脚本
- [x] `README.md` - 项目说明
- [x] `PRIVACY_POLICY.md` - 隐私政策
- [x] `STORE_LISTING.md` - 商店信息

### ✅ 图标文件检查
- [ ] `icons/icon16.png` - 16x16 像素
- [ ] `icons/icon32.png` - 32x32 像素  
- [ ] `icons/icon48.png` - 48x48 像素
- [ ] `icons/icon128.png` - 128x128 像素

**图标生成步骤：**
1. 打开 `icons/create-icons.html`
2. 点击"生成图标"按钮
3. 点击"下载所有图标"按钮
4. 将下载的图标文件放入 `icons/` 文件夹

### ✅ 功能测试
- [ ] 插件可以正常加载
- [ ] 弹窗界面显示正常
- [ ] CSS样式注入功能正常
- [ ] 快捷按钮功能正常
- [ ] 样式移除功能正常
- [ ] 错误处理完善

### ✅ 代码质量检查
- [ ] 无语法错误
- [ ] 无控制台错误
- [ ] 权限使用合理
- [ ] 无恶意代码
- [ ] 遵循Chrome扩展最佳实践

## 📦 创建发布包

### 1. 准备发布文件
```bash
# 进入插件目录
cd chrome-extensions

# 创建发布包（排除不需要的文件）
zip -r css-style-injector-v1.0.0.zip . \
  -x "*.DS_Store" \
  -x "create-icons.html" \
  -x "STORE_LISTING.md" \
  -x "RELEASE_CHECKLIST.md" \
  -x "PRIVACY_POLICY.md"
```

### 2. 验证ZIP文件内容
确保ZIP文件包含：
- manifest.json
- popup.html
- popup.js
- content.js
- icons/ 文件夹（包含4个图标文件）
- README.md

## 🏪 Chrome Web Store 发布流程

### 1. 开发者账户
- [ ] 注册Chrome Web Store开发者账户
- [ ] 支付一次性注册费用 ($5)
- [ ] 验证开发者身份

### 2. 上传插件
- [ ] 登录 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
- [ ] 点击 "Add new item"
- [ ] 上传ZIP文件
- [ ] 等待上传完成

### 3. 填写商店信息
- [ ] **名称**: CSS Style Injector
- [ ] **摘要**: Inject custom CSS styles into any web page
- [ ] **详细描述**: 使用STORE_LISTING.md中的内容
- [ ] **类别**: 开发者工具
- [ ] **语言**: 英语
- [ ] **定价**: 免费

### 4. 上传资源
- [ ] **图标**: 上传128x128图标
- [ ] **截图**: 至少3张功能截图
- [ ] **宣传图片**: 可选，用于商店展示

### 5. 隐私和权限
- [ ] **隐私政策**: 提供隐私政策URL或内容
- [ ] **权限说明**: 解释为什么需要activeTab权限
- [ ] **数据使用**: 说明不收集用户数据

### 6. 发布设置
- [ ] **可见性**: 公开
- [ ] **地区**: 全球
- [ ] **年龄限制**: 无限制
- [ ] **内容分级**: 适合所有年龄

## 📸 截图要求

### 必需截图（至少3张）
1. **主界面** - 显示插件弹窗界面
2. **功能演示** - 展示样式注入前后对比
3. **快捷按钮** - 显示常用样式功能

### 截图规格
- 尺寸: 1280x800 或 640x400
- 格式: PNG
- 质量: 高清，清晰可见
- 内容: 展示实际功能使用

## 🔍 审核要点

### Chrome Web Store 审核标准
- [ ] 功能描述准确
- [ ] 权限使用合理
- [ ] 无恶意行为
- [ ] 用户界面友好
- [ ] 隐私政策完整
- [ ] 图标和截图质量高

### 常见拒绝原因
- 权限请求过多
- 功能描述不准确
- 缺少隐私政策
- 图标质量差
- 恶意代码检测

## 📞 发布后维护

### 监控指标
- [ ] 下载量统计
- [ ] 用户评分
- [ ] 用户反馈
- [ ] 崩溃报告

### 更新计划
- [ ] 收集用户反馈
- [ ] 修复bug
- [ ] 添加新功能
- [ ] 定期更新

## 🎯 营销建议

### 推广渠道
- [ ] GitHub仓库
- [ ] 开发者社区
- [ ] 社交媒体
- [ ] 技术博客
- [ ] 开发者论坛

### 关键词优化
- CSS injector
- Web development tools
- Style customization
- Developer utilities
- Website customization

## ✅ 最终检查

发布前最后确认：
- [ ] 所有文件完整
- [ ] 图标已生成并上传
- [ ] 功能测试通过
- [ ] 商店信息填写完整
- [ ] 隐私政策已准备
- [ ] 截图已准备
- [ ] 发布包已创建

**准备就绪，可以提交审核！** 🚀
