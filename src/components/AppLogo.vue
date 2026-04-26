<script setup lang="ts">
defineProps<{
  variant?: 'light' | 'dark'
  size?: number
}>()
</script>

<template>
  <svg
      :width="size ?? 40"
      :height="size ?? 40"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
  >
    <template v-if="variant !== 'dark'">
      <defs>
        <radialGradient id="lt-tG" cx="38%" cy="28%" r="65%">
          <stop offset="0%" stop-color="#D49A6A"/>
          <stop offset="100%" stop-color="#7B3518"/>
        </radialGradient>
        <radialGradient id="lt-pG" cx="45%" cy="28%" r="75%">
          <stop offset="0%" stop-color="#5C2A0D"/>
          <stop offset="100%" stop-color="#1E0A02"/>
        </radialGradient>
        <filter id="lt-sh">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#1A0A02" flood-opacity="0.2"/>
        </filter>
      </defs>
      <g transform="rotate(-28 19 30)" filter="url(#lt-sh)">
        <ellipse cx="19" cy="30" rx="7" ry="8.5" fill="url(#lt-tG)"/>
        <ellipse cx="18.2" cy="27.5" rx="3.2" ry="4" fill="#E8BF90" opacity="0.55"/>
      </g>
      <g transform="rotate(-8 33 19)" filter="url(#lt-sh)">
        <ellipse cx="33" cy="19" rx="7" ry="8.5" fill="url(#lt-tG)"/>
        <ellipse cx="32.5" cy="16.5" rx="3.2" ry="4" fill="#E8BF90" opacity="0.55"/>
      </g>
      <g transform="rotate(8 48 19)" filter="url(#lt-sh)">
        <ellipse cx="48" cy="19" rx="7" ry="8.5" fill="url(#lt-tG)"/>
        <ellipse cx="47.8" cy="16.5" rx="3.2" ry="4" fill="#E8BF90" opacity="0.55"/>
      </g>
      <g transform="rotate(28 62 30)" filter="url(#lt-sh)">
        <ellipse cx="62" cy="30" rx="7" ry="8.5" fill="url(#lt-tG)"/>
        <ellipse cx="61.5" cy="27.5" rx="3.2" ry="4" fill="#E8BF90" opacity="0.55"/>
      </g>
      <path d="M14 51 C14 40 26 36 40 36 C54 36 66 40 66 51 C66 62 55 72 40 72 C25 72 14 62 14 51 Z" fill="url(#lt-pG)"
            filter="url(#lt-sh)"/>
      <path d="M35 54 Q40 49.5 45 54" stroke="#C4875A" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      <path d="M29.5 60 Q40 52 50.5 60" stroke="#C4875A" stroke-width="2.4" stroke-linecap="round" fill="none"
            opacity="0.55"/>
      <path d="M24 66 Q40 55 56 66" stroke="#C4875A" stroke-width="2.1" stroke-linecap="round" fill="none"
            opacity="0.28"/>
      <circle cx="40" cy="50" r="2.8" fill="#C4875A"/>
    </template>

    <template v-else>
      <defs>
        <radialGradient id="dk-tG" cx="38%" cy="28%" r="65%">
          <stop offset="0%" stop-color="white"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0.65)"/>
        </radialGradient>
        <filter id="dk-sh">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#1A0A02" flood-opacity="0.15"/>
        </filter>
      </defs>
      <g transform="rotate(-28 19 30)" filter="url(#dk-sh)">
        <ellipse cx="19" cy="30" rx="7" ry="8.5" fill="url(#dk-tG)"/>
        <ellipse cx="18.2" cy="27.5" rx="3.2" ry="4" fill="white" opacity="0.45"/>
      </g>
      <g transform="rotate(-8 33 19)" filter="url(#dk-sh)">
        <ellipse cx="33" cy="19" rx="7" ry="8.5" fill="url(#dk-tG)"/>
        <ellipse cx="32.5" cy="16.5" rx="3.2" ry="4" fill="white" opacity="0.45"/>
      </g>
      <g transform="rotate(8 48 19)" filter="url(#dk-sh)">
        <ellipse cx="48" cy="19" rx="7" ry="8.5" fill="url(#dk-tG)"/>
        <ellipse cx="47.8" cy="16.5" rx="3.2" ry="4" fill="white" opacity="0.45"/>
      </g>
      <g transform="rotate(28 62 30)" filter="url(#dk-sh)">
        <ellipse cx="62" cy="30" rx="7" ry="8.5" fill="url(#dk-tG)"/>
        <ellipse cx="61.5" cy="27.5" rx="3.2" ry="4" fill="white" opacity="0.45"/>
      </g>
      <path d="M14 51 C14 40 26 36 40 36 C54 36 66 40 66 51 C66 62 55 72 40 72 C25 72 14 62 14 51 Z" fill="white"
            opacity="0.92" filter="url(#dk-sh)"/>
      <path d="M35 54 Q40 49.5 45 54" stroke="#8B4513" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      <path d="M29.5 60 Q40 52 50.5 60" stroke="#8B4513" stroke-width="2.4" stroke-linecap="round" fill="none"
            opacity="0.55"/>
      <path d="M24 66 Q40 55 56 66" stroke="#8B4513" stroke-width="2.1" stroke-linecap="round" fill="none"
            opacity="0.28"/>
      <circle cx="40" cy="50" r="2.8" fill="#8B4513"/>
    </template>
  </svg>
</template>
