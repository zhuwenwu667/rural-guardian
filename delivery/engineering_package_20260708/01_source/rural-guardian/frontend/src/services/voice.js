/**
 * 语音播报服务 - 使用浏览器原生 Web Speech API
 * 专为乡村守护者平台设计，适合老年人使用
 */

class VoiceService {
  constructor() {
    this.synth = window.speechSynthesis
    this.enabled = true
    this.rate = 0.8 // 语速较慢，适合老年人
    this.pitch = 1.0
    this.volume = 1.0
    this.lang = 'zh-CN'
    this._currentUtterance = null
    this._queue = []
    this._isSpeaking = false

    // 从 localStorage 恢复设置
    this._loadSettings()
  }

  /**
   * 播报文字
   * @param {string} text - 要播报的文字内容
   * @param {Object} options - 可选配置 { rate, pitch, volume, lang, priority }
   */
  speak(text, options = {}) {
    if (!this.enabled) return
    if (!this.synth) {
      console.warn('当前浏览器不支持语音合成 (Web Speech API)')
      return
    }

    // 清理文本，去除多余空白
    const cleanText = (text || '').replace(/\s+/g, ' ').trim()
    if (!cleanText) return

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = options.rate || this.rate
    utterance.pitch = options.pitch || this.pitch
    utterance.volume = options.volume || this.volume
    utterance.lang = options.lang || this.lang

    // 尝试选择中文语音
    const voices = this.synth.getVoices()
    const zhVoice = voices.find(v => v.lang.startsWith('zh-CN'))
    if (zhVoice) {
      utterance.voice = zhVoice
    }

    // 高优先级直接打断当前播报
    const priority = options.priority || 'normal'
    if (priority === 'high') {
      this.synth.cancel()
      this._queue = []
      this.synth.speak(utterance)
      this._currentUtterance = utterance
      this._isSpeaking = true
    } else {
      // 普通优先级加入队列
      this._queue.push(utterance)
      this._processQueue()
    }

    utterance.onend = () => {
      this._isSpeaking = false
      this._currentUtterance = null
      this._processQueue()
    }

    utterance.onerror = (event) => {
      // interrupted 是 synth.cancel() 导致的正常行为，不需要报错
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        console.error('语音播报出错:', event.error)
      }
      this._isSpeaking = false
      this._currentUtterance = null
      this._processQueue()
    }
  }

  /**
   * 处理播报队列
   */
  _processQueue() {
    if (this._isSpeaking || this._queue.length === 0) return
    const utterance = this._queue.shift()
    this._currentUtterance = utterance
    this._isSpeaking = true
    this.synth.speak(utterance)
  }

  /**
   * 停止播报并清空队列
   */
  stop() {
    this.synth.cancel()
    this._queue = []
    this._currentUtterance = null
    this._isSpeaking = false
  }

  /**
   * 暂停播报
   */
  pause() {
    if (this.synth.speaking) {
      this.synth.pause()
    }
  }

  /**
   * 恢复播报
   */
  resume() {
    if (this.synth.paused) {
      this.synth.resume()
    }
  }

  /**
   * 设置语音开关
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled
    if (!enabled) {
      this.stop()
    }
    this._saveSettings()
  }

  /**
   * 获取语音开关状态
   * @returns {boolean}
   */
  getEnabled() {
    return this.enabled
  }

  /**
   * 设置语速
   * @param {number} rate - 语速 0.1 ~ 2.0，默认 0.8
   */
  setRate(rate) {
    this.rate = Math.max(0.1, Math.min(2.0, rate))
    this._saveSettings()
  }

  /**
   * 设置音调
   * @param {number} pitch - 音调 0.1 ~ 2.0，默认 1.0
   */
  setPitch(pitch) {
    this.pitch = Math.max(0.1, Math.min(2.0, pitch))
    this._saveSettings()
  }

  /**
   * 设置音量
   * @param {number} volume - 音量 0 ~ 1.0，默认 1.0
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1.0, volume))
    this._saveSettings()
  }

  /**
   * 是否正在播报
   * @returns {boolean}
   */
  isSpeaking() {
    return this.synth.speaking
  }

  /**
   * 保存设置到 localStorage
   */
  _saveSettings() {
    try {
      localStorage.setItem('voice_settings', JSON.stringify({
        enabled: this.enabled,
        rate: this.rate,
        pitch: this.pitch,
        volume: this.volume,
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
      const saved = localStorage.getItem('voice_settings')
      if (saved) {
        const settings = JSON.parse(saved)
        if (typeof settings.enabled === 'boolean') this.enabled = settings.enabled
        if (typeof settings.rate === 'number') this.rate = settings.rate
        if (typeof settings.pitch === 'number') this.pitch = settings.pitch
        if (typeof settings.volume === 'number') this.volume = settings.volume
      }
    } catch (e) {
      // 静默失败
    }
  }
}

// 单例导出
const voiceService = new VoiceService()

// 告警语音模板
const ALERT_VOICE_TEMPLATES = {
  FALL: '紧急提醒：检测到{elderlyName}发生跌倒，请立即处理！',
  HEALTH_ABNORMAL: '健康提醒：{elderlyName}{metric}异常，当前值{value}，请关注！',
  HEALTH: '健康提醒：{elderlyName}出现健康异常，请关注！',
  DEVICE_OFFLINE: '设备提醒：{elderlyName}的设备已离线，请检查！',
  LOW_BATTERY: '电量提醒：{elderlyName}的设备电量不足{battery}%，请及时充电！',
  SOS: '紧急求助：{elderlyName}发起了SOS求助，请立即响应！',
  DEVICE: '设备提醒：{elderlyName}的设备出现异常，请检查！',
  ABNORMAL: '行为提醒：{elderlyName}出现行为异常，请关注！',
  GEO_FENCE: '安全提醒：{elderlyName}已超出安全区域，请关注！',
}

/**
 * 根据告警数据生成语音播报文本
 * @param {Object} alert - 告警对象
 * @returns {string} 播报文本
 */
function buildAlertVoiceText(alert) {
  const template = ALERT_VOICE_TEMPLATES[alert.type]
  if (!template) {
    // 未知类型使用通用模板
    const name = alert.elderly_name || alert.elderlyName || '未知老人'
    return `预警提醒：${name}有新的预警信息，请及时处理！`
  }

  const name = alert.elderly_name || alert.elderlyName || '未知老人'
  return template
    .replace('{elderlyName}', name)
    .replace('{metric}', alert.metric || '')
    .replace('{value}', alert.value || '')
    .replace('{battery}', alert.battery || '')
}

export { voiceService, ALERT_VOICE_TEMPLATES, buildAlertVoiceText }
export default voiceService
