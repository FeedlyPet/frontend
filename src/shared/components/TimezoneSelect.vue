<script setup lang="ts">
import {ref, computed, onMounted, onBeforeUnmount} from 'vue'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const allTimezones: string[] = (Intl as any).supportedValuesOf('timeZone') as string[]

const open = ref(false)
const search = ref('')
const highlightIdx = ref(-1)
const containerRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return allTimezones
  return allTimezones.filter(tz => tz.toLowerCase().includes(q))
})

const groups = computed(() => {
  const map = new Map<string, string[]>()
  for (const tz of filtered.value) {
    const region = tz.includes('/') ? tz.split('/')[0] : 'Other'
    if (!map.has(region)) map.set(region, [])
    map.get(region)!.push(tz)
  }
  return Array.from(map.entries()).map(([region, items]) => ({region, items}))
})

const flatList = computed(() => filtered.value)

function openDropdown() {
  if (props.disabled) return
  open.value = true
  search.value = ''
  highlightIdx.value = flatList.value.indexOf(props.modelValue)
  setTimeout(() => {
    inputRef.value?.focus()
    scrollToHighlighted()
  }, 0)
}

function close() {
  open.value = false
  search.value = ''
}

function select(tz: string) {
  emit('update:modelValue', tz)
  close()
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') {
    close();
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    if (highlightIdx.value >= 0 && highlightIdx.value < flatList.value.length) {
      select(flatList.value[highlightIdx.value])
    }
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlightIdx.value = Math.min(highlightIdx.value + 1, flatList.value.length - 1)
    scrollToHighlighted()
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightIdx.value = Math.max(highlightIdx.value - 1, 0)
    scrollToHighlighted()
    return
  }
}

function scrollToHighlighted() {
  setTimeout(() => {
    const el = listRef.value?.querySelector('.tz-option.highlighted') as HTMLElement | null
    el?.scrollIntoView({block: 'nearest'})
  }, 0)
}

function onSearchInput() {
  highlightIdx.value = flatList.value.indexOf(props.modelValue)
  if (highlightIdx.value === -1 && flatList.value.length > 0) highlightIdx.value = 0
}

function onClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    close()
  }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div ref="containerRef" class="tz-select" :class="{ disabled }">
    <button
        type="button"
        class="tz-trigger"
        :disabled="disabled"
        @click="openDropdown"
    >
      <span class="tz-value">{{ modelValue || 'Select timezone' }}</span>
      <svg class="tz-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>

    <div v-if="open" class="tz-dropdown" @keydown="onKeydown">
      <div class="tz-search-wrap">
        <input
            ref="inputRef"
            v-model="search"
            type="text"
            placeholder="Search timezone..."
            class="tz-search"
            @input="onSearchInput"
        />
      </div>

      <div ref="listRef" class="tz-list">
        <div v-if="filtered.length === 0" class="tz-empty">No results</div>

        <template v-for="group in groups" :key="group.region">
          <div class="tz-group-header">{{ group.region }}</div>
          <button
              v-for="tz in group.items"
              :key="tz"
              type="button"
              class="tz-option"
              :class="{
              selected: tz === modelValue,
              highlighted: flatList.indexOf(tz) === highlightIdx
            }"
              @click="select(tz)"
              @mouseenter="highlightIdx = flatList.indexOf(tz)"
          >
            {{ tz }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tz-select {
  position: relative;
  width: 100%;
}

.tz-select.disabled {
  opacity: 0.6;
}

.tz-trigger {
  width: 100%;
  padding: 0.65rem 0.9rem;
  border: 1.5px solid var(--border);
  border-radius: 0.75rem;
  font-size: 0.95rem;
  font-family: 'Outfit', sans-serif;
  color: var(--text-primary);
  background: var(--bg-input);
  outline: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  text-align: left;
  transition: border-color 0.2s;
}

.tz-trigger:focus, .tz-trigger:hover:not(:disabled) {
  border-color: var(--border-focus);
  background: var(--bg-card);
}

.tz-trigger:disabled {
  cursor: not-allowed;
}

.tz-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tz-caret {
  width: 14px;
  height: 14px;
  color: var(--border-focus);
  flex-shrink: 0;
}

.tz-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 0.85rem;
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tz-search-wrap {
  padding: 0.6rem;
  border-bottom: 1px solid var(--border);
}

.tz-search {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1.5px solid var(--border);
  border-radius: 0.6rem;
  font-size: 0.875rem;
  font-family: 'Outfit', sans-serif;
  color: var(--text-primary);
  background: var(--bg-input);
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.tz-search:focus {
  border-color: var(--border-focus);
  background: var(--bg-card);
}

.tz-search::placeholder {
  color: var(--text-muted);
  opacity: 0.7;
}

.tz-list {
  overflow-y: auto;
  max-height: 240px;
  padding: 0.3rem 0;
}

.tz-group-header {
  padding: 0.4rem 0.85rem 0.15rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--caramel);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: sticky;
  top: 0;
  background: var(--bg-card);
  z-index: 1;
}

.tz-option {
  display: block;
  width: 100%;
  padding: 0.45rem 0.85rem;
  font-size: 0.875rem;
  font-family: 'Outfit', sans-serif;
  color: var(--text-primary);
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.1s;
}

.tz-option:hover, .tz-option.highlighted {
  background: var(--bg-page);
}

.tz-option.selected {
  font-weight: 600;
  color: var(--brown-mid);
  background: var(--bg-card-alt);
}

.tz-option.selected.highlighted {
  background: var(--border);
}

.tz-empty {
  padding: 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-muted);
}
</style>
