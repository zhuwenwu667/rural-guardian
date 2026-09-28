<script setup>
import { ref, computed, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: null },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '请选择' },
  itemHeight: { type: Number, default: 32 },
  dropdownHeight: { type: Number, default: 200 },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const inputRef = ref(null)
const dropdownRef = ref(null)
const searchQuery = ref('')
const scrollTop = ref(0)

// 选中的标签
const selectedLabel = computed(() => {
  const target = props.options.find(op => op.adcode === props.modelValue)
  return target ? target.name : ''
})

// 显示值
const displayValue = computed(() => {
  return isOpen.value ? searchQuery.value : ''
})

// 过滤后的选项
const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options
  const query = searchQuery.value.toLowerCase()
  return props.options.filter(op =>
    String(op.name).toLowerCase().includes(query)
  )
})

// 虚拟滚动计算
const totalHeight = computed(() => filteredOptions.value.length * props.itemHeight)
const visibleCount = computed(() => Math.ceil(props.dropdownHeight / props.itemHeight) + 4)
const startIndex = computed(() => Math.floor(scrollTop.value / props.itemHeight))
const endIndex = computed(() => Math.min(startIndex.value + visibleCount.value, filteredOptions.value.length))
const visibleOptions = computed(() => filteredOptions.value.slice(startIndex.value, endIndex.value))
const offsetY = computed(() => startIndex.value * props.itemHeight)

// 事件处理
function handleScroll(e) {
  scrollTop.value = e.target.scrollTop
}

function triggerFocus() {
  if (props.disabled) return
  inputRef.value?.focus()
}

function handleFocus() {
  isOpen.value = true
  searchQuery.value = ''
  nextTick(() => {
    scrollTop.value = 0
    if (dropdownRef.value) dropdownRef.value.scrollTop = 0
  })
}

function handleInput(e) {
  searchQuery.value = e.target.value
  scrollTop.value = 0
  if (dropdownRef.value) dropdownRef.value.scrollTop = 0
}

function handleSelect(item) {
  emit('update:modelValue', item.adcode)
  emit('change', item.adcode)
  isOpen.value = false
  searchQuery.value = ''
  inputRef.value?.blur()
}

function handleBlur() {
  isOpen.value = false
  searchQuery.value = ''
}
</script>

<template>
  <div
    ref="containerRef"
    class="region-select"
  >
    <div
      class="select-input"
      :class="{ focused: isOpen, disabled: disabled }"
      @click="triggerFocus"
    >
      <input
        ref="inputRef"
        type="text"
        :value="displayValue"
        :placeholder="selectedLabel || placeholder"
        :disabled="disabled"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      >
      <span
        class="arrow"
        :class="{ open: isOpen }"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </div>

    <!-- 下拉列表 -->
    <div
      v-show="isOpen"
      class="dropdown"
    >
      <div
        v-if="filteredOptions.length === 0"
        class="empty-text"
      >
        暂无数据
      </div>

      <div
        v-else
        ref="dropdownRef"
        class="dropdown-list"
        :style="{ height: dropdownHeight + 'px' }"
        @scroll="handleScroll"
        @mousedown.prevent
      >
        <div :style="{ height: totalHeight + 'px', position: 'relative' }">
          <div :style="{ transform: `translateY(${offsetY}px)` }">
            <div
              v-for="item in visibleOptions"
              :key="item.adcode"
              class="option-item"
              :class="{ selected: modelValue === item.adcode }"
              :style="{ height: itemHeight + 'px' }"
              @click="handleSelect(item)"
            >
              <span class="option-name">{{ item.name }}</span>
              <span class="option-level">{{ item.level }}</span>
              <span
                v-if="modelValue === item.adcode"
                class="check-icon"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.region-select {
  position: relative;
  width: 100%;
}

.select-input {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 4px;
  cursor: text;
  transition: all 0.2s;
}

.select-input:hover {
  border-color: rgba(79, 195, 247, 0.5);
}

.select-input.focused {
  border-color: #4fc3f7;
  box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.2);
}

.select-input.disabled {
  background: rgba(255, 255, 255, 0.05);
  cursor: not-allowed;
}

.select-input input {
  flex: 1;
  padding: 6px 10px;
  background: transparent;
  border: none;
  outline: none;
  font-size: 12px;
  color: #e0e0e0;
}

.select-input input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.arrow {
  padding-right: 8px;
  color: rgba(255, 255, 255, 0.5);
  transition: transform 0.2s;
}

.arrow.open {
  transform: rotate(180deg);
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  margin-top: 4px;
  background: rgba(10, 22, 40, 0.98);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.empty-text {
  padding: 16px;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.dropdown-list {
  overflow-y: auto;
}

.dropdown-list::-webkit-scrollbar {
  width: 4px;
}

.dropdown-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

.dropdown-list::-webkit-scrollbar-thumb {
  background: rgba(79, 195, 247, 0.5);
  border-radius: 2px;
}

.option-item {
  display: flex;
  align-items: center;
  padding: 0 10px;
  cursor: pointer;
  transition: background 0.15s;
}

.option-item:hover {
  background: rgba(79, 195, 247, 0.15);
}

.option-item.selected {
  background: rgba(79, 195, 247, 0.2);
}

.option-name {
  flex: 1;
  font-size: 12px;
  color: #e0e0e0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-level {
  margin-left: 8px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
}

.check-icon {
  margin-left: 6px;
  color: #4fc3f7;
}
</style>
