// 存储注入的样式元素，用于后续移除
let injectedStyleElement = null;

/**
 * 创建并注入CSS样式到页面
 * @param {string} cssContent - CSS样式内容
 * @returns {HTMLStyleElement} 创建的style元素
 */
function createStyleTag(cssContent) {
  // 如果已存在样式，先移除
  if (injectedStyleElement) {
    injectedStyleElement.remove();
  }
  
  // 创建style标签
  const styleTag = document.createElement('style');
  
  // 设置style标签的内容
  styleTag.textContent = cssContent;
  
  // 添加标识属性，便于识别
  styleTag.setAttribute('data-css-injector', 'true');
  
  // 将style标签插入到head中
  document.head.appendChild(styleTag);
  
  // 保存引用
  injectedStyleElement = styleTag;
  
  console.log('CSS样式已注入:', cssContent);
  return styleTag;
}

/**
 * 移除之前注入的样式
 */
function removeInjectedStyle() {
  if (injectedStyleElement) {
    injectedStyleElement.remove();
    injectedStyleElement = null;
    console.log('CSS样式已移除');
  }
}

/**
 * 根据CSS选择器提取文本内容
 * @param {string} selector - CSS选择器
 * @returns {Array} 提取到的文本数组
 */
function extractTextBySelector(selector) {
  try {
    const elements = document.querySelectorAll(selector);
    const texts = [];
    
    elements.forEach((element, index) => {
      const text = element.textContent.trim();
      if (text) {
        texts.push({
          index: index + 1,
          text: text,
          tagName: element.tagName.toLowerCase(),
          className: element.className,
          id: element.id || null,
          selector: selector,
          elementIndex: index
        });
      }
    });
    
    console.log(`提取到 ${texts.length} 个文本元素:`, texts);
    return texts;
  } catch (error) {
    console.error('提取文本时出错:', error);
    return [];
  }
}

/**
 * 滚动到指定元素
 * @param {string} selector - CSS选择器
 * @param {number} elementIndex - 元素在匹配列表中的索引
 */
function scrollToElement(selector, elementIndex) {
  try {
    const elements = document.querySelectorAll(selector);
    if (elements.length > elementIndex) {
      const targetElement = elements[elementIndex];
      
      // 高亮显示目标元素
      targetElement.style.outline = '3px solid #ff6b6b';
      targetElement.style.outlineOffset = '2px';
      
      // 滚动到元素位置
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
      
      // 3秒后移除高亮
      setTimeout(() => {
        targetElement.style.outline = '';
        targetElement.style.outlineOffset = '';
      }, 3000);
      
      console.log('已滚动到目标元素:', targetElement);
      return true;
    } else {
      console.error('目标元素不存在');
      return false;
    }
  } catch (error) {
    console.error('滚动到元素时出错:', error);
    return false;
  }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'injectStyle') {
      createStyleTag(request.cssContent);
      sendResponse({ success: true, message: '样式注入成功' });
    } else if (request.action === 'removeStyle') {
      removeInjectedStyle();
      sendResponse({ success: true, message: '样式移除成功' });
    } else if (request.action === 'extractText') {
      const texts = extractTextBySelector(request.selector);
      sendResponse({ 
        success: true, 
        message: `成功提取到 ${texts.length} 个文本`, 
        data: texts 
      });
    } else if (request.action === 'scrollToElement') {
      const success = scrollToElement(request.selector, request.elementIndex);
      sendResponse({ 
        success: success, 
        message: success ? '已滚动到目标元素' : '滚动失败' 
      });
    }
  } catch (error) {
    console.error('处理消息时出错:', error);
    sendResponse({ success: false, message: '操作失败: ' + error.message });
  }
  
  // 返回true表示异步响应
  return true;
});

// 页面加载完成后的初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('CSS Style Injector content script loaded');
  });
} else {
  console.log('CSS Style Injector content script loaded');
}