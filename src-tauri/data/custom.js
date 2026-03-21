window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// very important, if you don't know what it is, don't touch it
// 非常重要，不懂代码不要动，这里可以解决80%的问题，也可以生产1000+的bug
const hookClick = (e) => {
    const origin = e.target.closest('a')
    const isBaseTargetBlank = document.querySelector(
        'head base[target="_blank"]'
    )
    console.log('origin', origin, isBaseTargetBlank)
    if (
        (origin && origin.href && origin.target === '_blank') ||
        (origin && origin.href && isBaseTargetBlank)
    ) {
        e.preventDefault()
        console.log('handle origin', origin)
        location.href = origin.href
    } else {
        console.log('not handle origin', origin)
    }
}

window.open = function (url, target, features) {
    console.log('open', url, target, features)
    location.href = url
}

document.addEventListener('click', hookClick, { capture: true })
// ==========================================
// Pake Plus (Tauri v2) 专属增强脚本
// 包含：退出、长按拖拽、置顶、防膨胀小窗
// ==========================================

// --- 核心工具：获取 Tauri 2.0 当前窗口对象 ---
function getTauriWindow() {
    if (!window.__TAURI__) return null;
    // Tauri v2 标准获取窗口的方法
    if (window.__TAURI__.window && typeof window.__TAURI__.window.getCurrentWindow === 'function') {
        return window.__TAURI__.window.getCurrentWindow();
    }
    // 兼容回退机制
    return window.__TAURI__.window?.appWindow || null;
}

// --- 1. 彻底退出应用 ---
window.quitApp = async function() {
    try {
        if (window.__TAURI__?.core?.invoke) {
            await window.__TAURI__.core.invoke('plugin:process|exit', { code: 0 });
        } else {
            const win = getTauriWindow();
            if (win) await win.close();
        }
    } catch (e) {
        window.close();
    }
};

// --- 2. 核心功能：左键长按 500ms 触发拖拽 ---
let dragTimer = null;
let isDragging = false;

window.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return; // 仅限左键
    const targetTag = e.target.tagName.toLowerCase();
    if (targetTag === 'button' || targetTag === 'input' || e.target.closest('#menu')) return; // 防误触

    dragTimer = setTimeout(async () => {
        isDragging = true;
        try {
            const win = getTauriWindow();
            if (win && typeof win.startDragging === 'function') {
                await win.startDragging();
            }
        } catch (err) {
            console.warn("拖拽调用失败:", err);
        }
    }, 500);
});

window.addEventListener('mouseup', function() {
    clearTimeout(dragTimer);
    if (isDragging) setTimeout(() => { isDragging = false; }, 100);
});

window.addEventListener('mousemove', function() {
    if (!isDragging && dragTimer) clearTimeout(dragTimer);
});

// --- 3. 窗口置顶功能 ---
window.toggleAlwaysOnTop = async function() {
    isAlwaysOnTop = !isAlwaysOnTop; 
    const onTopBtn = document.getElementById('on-top-btn');
    if (onTopBtn) onTopBtn.innerText = isAlwaysOnTop ? "📌 取消窗口置顶" : "📌 开启窗口置顶"; 
    
    const menuObj = document.getElementById('menu');
    if (menuObj) menuObj.style.display = 'none';

    try {
        const win = getTauriWindow();
        if (win && typeof win.setAlwaysOnTop === 'function') {
            await win.setAlwaysOnTop(isAlwaysOnTop);
        }
    } catch (err) {
        console.error("置顶调用失败:", err);
    }
};

// --- 4. 小窗模式 (保留了你的防 30px 膨胀锁机制) ---
window.toggleMiniMode = async function() {
    try {
        const win = getTauriWindow();
        if (!win) return;

        // 获取 Tauri 2.0 的 LogicalSize 类
        const LogicalSize = window.__TAURI__?.core?.LogicalSize || window.__TAURI__?.window?.LogicalSize;

        // 首次记录正常尺寸
        if (!isMiniMode && !normalWindowSize && typeof win.outerSize === 'function') {
            try { normalWindowSize = await win.outerSize(); } catch(e){}
        }

        isMiniMode = !isMiniMode;
        document.body.classList.toggle('mini-mode', isMiniMode); 
        const menuObj = document.getElementById('menu');
        if (menuObj) menuObj.style.display = 'none'; 
        
        if (typeof updateLayoutScale === 'function') updateLayoutScale(); 
        
        if (isMiniMode) {
            // 进入小窗
            const safeWidth = (100 * 3 + 24 * 2 + 60) * currentClockScale * currentGlobalScale;
            const safeHeight = 150 * currentClockScale * currentGlobalScale; 
            
            if (LogicalSize && typeof win.setSize === 'function') {
                await win.setSize(new LogicalSize(Math.max(safeWidth, 200), Math.max(safeHeight, 100)));
            }
            if (typeof win.setAlwaysOnTop === 'function') await win.setAlwaysOnTop(true);
        } else {
            // 恢复正常模式 (防膨胀锁)
            isRestoring = true; 
            
            if (normalWindowSize && typeof win.setSize === 'function') {
                await win.setSize(normalWindowSize);
            }
            if (!isAlwaysOnTop && typeof win.setAlwaysOnTop === 'function') {
                await win.setAlwaysOnTop(false);
            }
            
            setTimeout(() => { isRestoring = false; }, 800);
        }
    } catch (err) {
        console.error("小窗切换失败:", err);
    }
};
