/**
 * 适老化模式管理服务
 * 提供适老化UI适配，包括字号放大、高对比度、简化布局等功能
 */

import { ref, watch } from 'vue'

class AccessibilityService {
  constructor() {
    this.isElderlyMode = ref(false)
    this.fontSize = ref(14) // 默认字号
    this.highContrast = ref(false)

    // 从 localStorage 恢复设置
    this._loadSettings()
  }

  /**
   * 切换适老模式
   * 开启适老模式：字号放大到18px、高对比度、简化布局
   * 关闭适老模式：恢复默认设置
   */
  toggleElderlyMode() {
    this.isElderlyMode.value = !this.isElderlyMode.value

    if (this.isElderlyMode.value) {
      this.fontSize.value = 18
      this.highContrast.value = true
    } else {
      this.fontSize.value = 14
      this.highContrast.value = false
    }

    this._applyStyles()
    this._saveSettings()
  }

  /**
   * 开启适老模式
   */
  enableElderlyMode() {
    if (this.isElderlyMode.value) return
    this.isElderlyMode.value = true
    this.fontSize.value = 18
    this.highContrast.value = true
    this._applyStyles()
    this._saveSettings()
  }

  /**
   * 关闭适老模式
   */
  disableElderlyMode() {
    if (!this.isElderlyMode.value) return
    this.isElderlyMode.value = false
    this.fontSize.value = 14
    this.highContrast.value = false
    this._applyStyles()
    this._saveSettings()
  }

  /**
   * 设置字号
   * @param {number} size - 字号大小 (px)
   */
  setFontSize(size) {
    this.fontSize.value = Math.max(12, Math.min(24, size))
    this._applyStyles()
    this._saveSettings()
  }

  /**
   * 切换高对比度模式
   */
  toggleHighContrast() {
    this.highContrast.value = !this.highContrast.value
    this._applyStyles()
    this._saveSettings()
  }

  /**
   * 获取适老化CSS变量
   * @returns {Object} CSS变量键值对
   */
  getElderlyStyles() {
    return {
      '--elderly-font-size': `${this.fontSize.value}px`,
      '--elderly-line-height': this.isElderlyMode.value ? '1.8' : '1.5',
      '--el-font-size-base': `${this.fontSize.value}px`,
    }
  }

  /**
   * 应用适老化样式到 document
   */
  _applyStyles() {
    const body = document.body

    // 适老模式 class 切换
    if (this.isElderlyMode.value) {
      body.classList.add('elderly-mode')
    } else {
      body.classList.remove('elderly-mode')
    }

    // 高对比度模式 class 切换
    if (this.highContrast.value) {
      body.classList.add('high-contrast')
    } else {
      body.classList.remove('high-contrast')
    }

    // 设置 CSS 变量
    const styles = this.getElderlyStyles()
    Object.entries(styles).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value)
    })
  }

  /**
   * 保存设置到 localStorage
   */
  _saveSettings() {
    try {
      localStorage.setItem('accessibility_settings', JSON.stringify({
        isElderlyMode: this.isElderlyMode.value,
        fontSize: this.fontSize.value,
        highContrast: this.highContrast.value,
      }))
    } catch (e) {
      // localStorage 不可用时静默失败
    }
  }

  /**
   * 从 localStorage 恢复设置
   */
  _loadSettings() {
    try {
      const saved = localStorage.getItem('accessibility_settings')
      if (saved) {
        const settings = JSON.parse(saved)
        if (typeof settings.isElderlyMode === 'boolean') {
          this.isElderlyMode.value = settings.isElderlyMode
        }
        if (typeof settings.fontSize === 'number') {
          this.fontSize.value = settings.fontSize
        }
        if (typeof settings.highContrast === 'boolean') {
          this.highContrast.value = settings.highContrast
        }
      }
    } catch (e) {
      // 静默失败
    }
  }

  /**
   * 初始化：页面加载时应用已保存的样式
   * 应在应用启动时调用
   */
  init() {
    this._applyStyles()
  }
}

// 单例导出
const accessibilityService = new AccessibilityService()

export { accessibilityService }
export default accessibilityService
