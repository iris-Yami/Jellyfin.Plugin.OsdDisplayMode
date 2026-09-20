(function () {
    'use strict';

    if (window.__osdDisplayModeV3) return;
    const v1AlreadyRunning = !!window.__osdDisplayModePlugin;
    window.__osdDisplayModeV3 = true;
    window.__osdDisplayModePlugin = true;

    const STORAGE_KEY = 'yami_menu_display';
    const MODE_HOVER = '0';
    const MODE_CLICK = '1';
    const CLASS_CLICK = 'yami-osd-click';
    const CLASS_ON = 'yami-osd-on';
    const MENU_ID = 'yami-menu-display';

    const STYLE_TEXT = `
html.yami-osd-click:not(.yami-osd-on) #reactRoot {
    pointer-events: none !important;
}
html.yami-osd-click:not(.yami-osd-on) .skinHeader.osdHeader,
html.yami-osd-click:not(.yami-osd-on) .skinHeader.osdHeader.MuiBox-root,
html.yami-osd-click:not(.yami-osd-on) .skinHeader.osdHeader.osdHeader-hidden,
html.yami-osd-click:not(.yami-osd-on) .videoOsd-appBar,
html.yami-osd-click:not(.yami-osd-on) .videoOsdBottom,
html.yami-osd-click:not(.yami-osd-on) #videoOsdPage {
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
}
html.yami-osd-click:not(.yami-osd-on) .dialogBackdrop,
html.yami-osd-click:not(.yami-osd-on) .dialogContainer,
html.yami-osd-click:not(.yami-osd-on) .actionSheet,
html.yami-osd-click:not(.yami-osd-on) .toast,
html.yami-osd-click:not(.yami-osd-on) .upNextContainer:not(.hide) {
    pointer-events: auto !important;
    visibility: visible !important;
    opacity: 1 !important;
}
html.yami-osd-click.yami-osd-on #reactRoot {
    pointer-events: auto !important;
}
html.yami-osd-click.yami-osd-on .skinHeader.osdHeader,
html.yami-osd-click.yami-osd-on .skinHeader.osdHeader.osdHeader-hidden,
html.yami-osd-click.yami-osd-on .skinHeader.osdHeader.MuiBox-root,
html.yami-osd-click.yami-osd-on .videoOsd-appBar {
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
}
html.yami-osd-click.yami-osd-on .videoOsdBottom,
html.yami-osd-click.yami-osd-on .videoOsdBottom.hide,
html.yami-osd-click.yami-osd-on .videoOsdBottom.videoOsdBottom-hidden {
    display: block !important;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
}
html.yami-osd-click.yami-osd-on #videoOsdPage {
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
}
.actionSheet.yami-settings-sheet,
.dialog.yami-settings-sheet {
    top: auto !important;
    bottom: var(--yami-sheet-bottom, 16px) !important;
    transform: none !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
}
`.trim();

    let bound = false;
    let lastHash = '';
    let observeTimer = 0;
    let injectTries = 0;
    let gestureHandled = false;

    function pluginDefaultMode() {
        const def = window.__OSD_DISPLAY_MODE__ && window.__OSD_DISPLAY_MODE__.defaultMode;
        return def === 'click' ? MODE_CLICK : MODE_HOVER;
    }

    function getMode() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === MODE_CLICK || stored === MODE_HOVER) return stored;
        return pluginDefaultMode();
    }

    function setMode(mode) {
        localStorage.setItem(STORAGE_KEY, mode);
        applyMode(mode);
        refreshMenuLabel();
    }

    function isVideoPage() {
        return location.hash === '#/video' || location.hash.startsWith('#/video?');
    }

    function qs(sel, root) {
        return (root || document).querySelector(sel);
    }

    function ensureStyle() {
        let style = qs('#yami-osd-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'yami-osd-style';
            document.documentElement.appendChild(style);
        }
        if (style.textContent !== STYLE_TEXT) {
            style.textContent = STYLE_TEXT;
        }
    }

    function applyMode(mode) {
        const html = document.documentElement;
        html.classList.toggle(CLASS_CLICK, isVideoPage() && mode === MODE_CLICK);
        if (!(isVideoPage() && mode === MODE_CLICK)) {
            html.classList.remove(CLASS_ON);
        }
    }

    function setOsdVisible(visible) {
        document.documentElement.classList.toggle(CLASS_ON, !!visible);
    }

    function isOsdVisible() {
        return document.documentElement.classList.contains(CLASS_ON);
    }

    function isChromeTarget(target) {
        const el = target && target.nodeType === 1 ? target : target && target.parentElement;
        if (!el || !el.closest) return false;
        return !!el.closest([
            'button',
            'input',
            'a',
            'select',
            '.osdControls',
            '.osdPositionSlider',
            '.videoOsd-appBar',
            '.skinHeader.osdHeader',
            '.headerLeft',
            '.headerRight',
            '.dialogBackdrop',
            '.dialogContainer',
            '.actionSheet',
            '.toast',
            '.upNextContainer',
            '.sliderContainer',
            '.MuiSlider-root',
            '.btnMute',
            '.buttonMute',
        ].join(','));
    }

    function stopEvent(event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }
    }

    function shouldHandleSurface(event) {
        if (getMode() !== MODE_CLICK || !isVideoPage()) return false;
        if (event.button != null && event.button !== 0) return false;
        if (isChromeTarget(event.target)) return false;
        return true;
    }

    function onSurfacePointerDown(event) {
        if (!shouldHandleSurface(event)) return;
        if (event.type === 'mousedown' && window.PointerEvent) return;
        gestureHandled = true;
        stopEvent(event);
        setOsdVisible(!isOsdVisible());
    }

    function onSurfaceClick(event) {
        if (!shouldHandleSurface(event)) return;
        stopEvent(event);
        if (gestureHandled) {
            gestureHandled = false;
            return;
        }
        setOsdVisible(!isOsdVisible());
    }

    function onSurfaceDblClick(event) {
        if (!shouldHandleSurface(event)) return;
        gestureHandled = false;
        stopEvent(event);
    }

    function bindSurface() {
        if (v1AlreadyRunning || bound) return;
        bound = true;
        window.addEventListener('pointerdown', onSurfacePointerDown, true);
        window.addEventListener('mousedown', onSurfacePointerDown, true);
        window.addEventListener('click', onSurfaceClick, true);
        window.addEventListener('dblclick', onSurfaceDblClick, true);
    }

    function unbindSurface() {
        if (!bound) return;
        bound = false;
        window.removeEventListener('pointerdown', onSurfacePointerDown, true);
        window.removeEventListener('mousedown', onSurfacePointerDown, true);
        window.removeEventListener('click', onSurfaceClick, true);
        window.removeEventListener('dblclick', onSurfaceDblClick, true);
        gestureHandled = false;
    }

    function modeLabel(mode) {
        return mode === MODE_CLICK ? '单击' : '移入';
    }

    function createMenuButton() {
        const mode = getMode();
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-id', MENU_ID);
        btn.className = 'listItem listItem-button actionSheetMenuItem emby-button';

        const body = document.createElement('div');
        body.className = 'listItemBody actionsheetListItemBody';
        body.style.whiteSpace = 'nowrap';
        body.textContent = '菜单显示';

        const aside = document.createElement('div');
        aside.className = 'listItemAside actionSheetItemAsideText';
        aside.dataset.role = 'yami-menu-status';
        aside.textContent = modeLabel(mode);

        btn.append(body, aside);
        btn.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            const next = getMode() === MODE_CLICK ? MODE_HOVER : MODE_CLICK;
            setMode(next);
            if (next === MODE_CLICK) setOsdVisible(true);
        });
        return btn;
    }

    function refreshMenuLabel() {
        document.querySelectorAll('[data-id="' + MENU_ID + '"] [data-role="yami-menu-status"]').forEach(function (aside) {
            aside.textContent = modeLabel(getMode());
        });
    }

    function sheetText(scroller) {
        return (scroller.textContent || '').replace(/\s+/g, ' ');
    }

    function isVideoSettingsSheet(scroller) {
        if (!scroller) return false;
        if (scroller.querySelector('[data-id="' + MENU_ID + '"]')) return true;
        if (scroller.querySelector('[data-id="stats"]')) return true;
        if (scroller.querySelector('[data-id="playbackrate"]') && scroller.querySelector('[data-id="quality"]')) {
            return true;
        }
        const text = sheetText(scroller);
        return /播放信息|Playback Info|PlaybackStats/i.test(text)
            && /播放速度|Playback Rate|质量|Quality/i.test(text);
    }

    function findVideoSettingsScroller() {
        const scrollers = document.querySelectorAll('.actionSheetScroller');
        for (let i = 0; i < scrollers.length; i++) {
            if (isVideoSettingsSheet(scrollers[i])) return scrollers[i];
        }
        return null;
    }

    function osdBottomGap() {
        const anchors = document.querySelectorAll('.osdControls, .osdPositionSlider, .btnVideoOsdSettings');
        let ceiling = 0;
        anchors.forEach(function (el) {
            const r = el.getBoundingClientRect();
            if (r.height < 8 || r.width < 8) return;
            if (r.top < window.innerHeight * 0.45) return;
            if (!ceiling || r.top < ceiling) ceiling = r.top;
        });
        if (!ceiling) return 16;
        return Math.max(12, Math.round(window.innerHeight - ceiling + 8));
    }

    function repositionSettingsSheet(scroller) {
        const sheet = scroller && scroller.closest('.actionSheet, .dialog');
        if (!sheet) return;
        document.documentElement.style.setProperty('--yami-sheet-bottom', osdBottomGap() + 'px');
        sheet.classList.add('yami-settings-sheet');
    }

    function injectMenuItem() {
        const scroller = findVideoSettingsScroller();
        if (!scroller) return false;
        if (qs('[data-id="' + MENU_ID + '"]', scroller)) {
            refreshMenuLabel();
        } else {
            scroller.insertBefore(createMenuButton(), scroller.firstChild);
        }
        repositionSettingsSheet(scroller);
        window.requestAnimationFrame(function () {
            repositionSettingsSheet(scroller);
        });
        return true;
    }

    function scheduleInject() {
        injectTries = 0;
        const tick = function () {
            injectMenuItem();
            if (injectTries++ < 20) window.setTimeout(tick, 50);
        };
        tick();
    }

    function isSettingsButton(target) {
        const el = target && target.nodeType === 1 ? target : target && target.parentElement;
        if (!el || !el.closest) return false;
        return !!el.closest('.btnVideoOsdSettings, button[title="设置"], button[aria-label="设置"], button[title="Settings"], button[aria-label="Settings"]');
    }

    function syncVideoPage() {
        const onVideo = isVideoPage();
        if (onVideo) {
            ensureStyle();
            applyMode(getMode());
            bindSurface();
        } else {
            unbindSurface();
            applyMode(MODE_HOVER);
        }
    }

    function onRouteMaybeChanged() {
        if (location.hash === lastHash) return;
        lastHash = location.hash;
        syncVideoPage();
    }

    function patchHistory() {
        ['pushState', 'replaceState'].forEach(function (type) {
            const original = history[type];
            if (original.__osdDisplayModePatched) return;
            const wrapped = function () {
                const result = original.apply(this, arguments);
                window.dispatchEvent(new Event('osd-display-mode-location'));
                return result;
            };
            wrapped.__osdDisplayModePatched = true;
            history[type] = wrapped;
        });
    }

    ensureStyle();
    patchHistory();
    lastHash = location.hash;
    syncVideoPage();

    window.addEventListener('hashchange', onRouteMaybeChanged);
    window.addEventListener('popstate', onRouteMaybeChanged);
    window.addEventListener('osd-display-mode-location', onRouteMaybeChanged);

    document.addEventListener('click', function (event) {
        if (!isVideoPage()) return;
        if (isSettingsButton(event.target)) scheduleInject();
    }, true);

    window.addEventListener('resize', function () {
        if (!isVideoPage()) return;
        const scroller = findVideoSettingsScroller();
        if (scroller) repositionSettingsSheet(scroller);
    });

    const observer = new MutationObserver(function () {
        if (observeTimer) return;
        observeTimer = window.setTimeout(function () {
            observeTimer = 0;
            if (!isVideoPage()) return;
            injectMenuItem();
            if (getMode() === MODE_CLICK) applyMode(MODE_CLICK);
        }, 40);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    window.setInterval(function () {
        if (isVideoPage()) injectMenuItem();
    }, 800);
})();
