// 获取DOM元素
const cssInput = document.getElementById('cssInput');
const injectBtn = document.getElementById('injectBtn');
const removeBtn = document.getElementById('removeBtn');
const status = document.getElementById('status');

// 文本提取相关元素
const classInput = document.getElementById('classInput');
const extractBtn = document.getElementById('extractBtn');
const textResults = document.getElementById('textResults');
const textList = document.getElementById('textList');
const textCount = document.getElementById('textCount');
const clearResults = document.getElementById('clearResults');

// 显示状态信息
function showStatus(message, type = 'success') {
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  // 3秒后隐藏状态信息
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}


// 移除样式按钮点击事件
removeBtn.addEventListener('click', async () => {
  try {
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 向content script发送消息，移除样式
    await chrome.tabs.sendMessage(tab.id, {
      action: 'removeStyle'
    });
    
    showStatus('样式已移除！');
  } catch (error) {
    console.error('移除样式失败:', error);
    showStatus('移除失败，请刷新页面后重试', 'error');
  }
});

// 快捷按钮点击事件
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('quick-btn')) {
    const cssContent = e.target.getAttribute('data-css');
    cssInput.value = cssContent;
    
    // 自动注入样式
    injectStyle(cssContent);
  }
});

// 提取注入样式的逻辑为独立函数
async function injectStyle(cssContent) {
  if (!cssContent) {
    showStatus('请输入CSS样式内容', 'error');
    return;
  }
  
  try {
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 向content script发送消息，注入样式
    await chrome.tabs.sendMessage(tab.id, {
      action: 'injectStyle',
      cssContent: cssContent
    });
    
    showStatus('样式注入成功！');
  } catch (error) {
    console.error('注入样式失败:', error);
    showStatus('注入失败，请刷新页面后重试', 'error');
  }
}

// 注入样式按钮点击事件
injectBtn.addEventListener('click', async () => {
  const cssContent = cssInput.value.trim();
  await injectStyle(cssContent);
});

// 文本提取按钮点击事件
extractBtn.addEventListener('click', async () => {
  const selector = classInput.value.trim();
  
  if (!selector) {
    showStatus('请输入CSS选择器', 'error');
    return;
  }
  
  try {
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 向content script发送消息，提取文本
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'extractText',
      selector: selector
    });
    
    if (response.success) {
      displayTextResults(response.data);
      showStatus(response.message);
    } else {
      showStatus(response.message, 'error');
    }
  } catch (error) {
    console.error('提取文本失败:', error);
    showStatus('提取失败，请刷新页面后重试', 'error');
  }
});

// 显示文本提取结果
function displayTextResults(texts) {
  if (texts.length === 0) {
    textList.innerHTML = '<div class="text-item">未找到匹配的文本内容</div>';
    textCount.textContent = '共找到 0 个文本';
  } else {
    textList.innerHTML = texts.map(item => `
      <div class="text-item clickable" data-selector="${item.selector}" data-index="${item.elementIndex}">
        <div style="font-weight: bold; color: #666; margin-bottom: 4px;">
          #${item.index} ${item.tagName}${item.className ? '.' + item.className.split(' ').join('.') : ''}${item.id ? '#' + item.id : ''}
        </div>
        <div>${item.text}</div>
      </div>
    `).join('');
    textCount.textContent = `共找到 ${texts.length} 个文本`;
    
    // 添加点击事件监听器
    addClickListeners();
  }
  
  textResults.style.display = 'block';
}

// 添加点击事件监听器
function addClickListeners() {
  const clickableItems = textList.querySelectorAll('.clickable');
  clickableItems.forEach(item => {
    item.addEventListener('click', async () => {
      const selector = item.getAttribute('data-selector');
      const elementIndex = parseInt(item.getAttribute('data-index'));
      
      try {
        // 获取当前活动标签页
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // 向content script发送消息，滚动到元素
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'scrollToElement',
          selector: selector,
          elementIndex: elementIndex
        });
        
        if (response.success) {
          showStatus('已滚动到目标元素');
        } else {
          showStatus('滚动失败', 'error');
        }
      } catch (error) {
        console.error('滚动到元素失败:', error);
        showStatus('滚动失败，请刷新页面后重试', 'error');
      }
    });
  });
}

// 快捷选择器按钮点击事件
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('selector-btn')) {
    const selector = e.target.getAttribute('data-selector');
    classInput.value = selector;
    
    // 自动触发提取
    extractBtn.click();
  }
});

// 清空结果按钮点击事件
clearResults.addEventListener('click', () => {
  textResults.style.display = 'none';
  textList.innerHTML = '';
  textCount.textContent = '';
  classInput.value = '';
});

// 页面加载时设置默认CSS内容
document.addEventListener('DOMContentLoaded', () => {
  cssInput.value = 'div { background: red; }';
});