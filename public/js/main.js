import { loadFonts }         from './fontLoader.js';
import { initializeGallery } from './gallery.js';
import { initializeSealedGallery } from './sealed-gallery.js';
import {
    initializeExpandableDescriptions,
    initializeScrollToTop,
    initializeScrollIndicator,
    initializeResizeHandler,
    initializeTranscribeButton,
    initializeCodexExpand,
    initializeContactFooter,
    initializeLoreExpand,
    injectExpandButtons,
    initializeLoreViewer,
} from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 不依赖字体高度的组件先初始化
    initializeGallery();
    initializeSealedGallery();
    initializeExpandableDescriptions();
    initializeScrollToTop();
    initializeScrollIndicator();
    initializeResizeHandler();
    initializeTranscribeButton();
    initializeCodexExpand();
    initializeContactFooter();
    initializeLoreExpand();
    initializeLoreViewer();

    // 等字体就绪后再测量高度
    await loadFonts();

    injectExpandButtons();
    window.addEventListener('resize', injectExpandButtons);
});
