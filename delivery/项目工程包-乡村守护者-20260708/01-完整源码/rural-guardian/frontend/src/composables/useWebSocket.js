/**
 * WebSocket 连接管理 Composable
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

export function useWebSocket() {
  const ws = ref(null)
  const isConnected = ref(false)
  const reconnectCount = ref(0)
  const maxReconnect = 5
  let reconnectTimer = null

  const connect = (userId, role) => {
    const wsUrl = `ws://${window.location.host}`
    
    try {
      ws.value = new WebSocket(wsUrl)
      
      ws.value.onopen = () => {
        console.log('[WebSocket] 连接成功')
        isConnected.value = true
        reconnectCount.value = 0
        
        // 发送认证信息
        send({
          type: 'auth',
          payload: { userId, role }
        })
      }
      
      ws.value.onclose = () => {
        console.log('[WebSocket] 连接关闭')
        isConnected.value = false
        
        // 自动重连
        if (reconnectCount.value < maxReconnect) {
          reconnectTimer = setTimeout(() => {
            reconnectCount.value++
            console.log(`[WebSocket] 第 ${reconnectCount.value} 次重连...`)
            connect(userId, role)
          }, 3000)
        }
      }
      
      ws.value.onerror = (err) => {
        console.error('[WebSocket] 连接错误:', err)
      }
      
    } catch (err) {
      console.error('[WebSocket] 创建连接失败:', err)
    }
  }

  const send = (message) => {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message))
      return true
    }
    return false
  }

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    isConnected.value = false
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    ws,
    isConnected,
    connect,
    send,
    disconnect
  }
}
