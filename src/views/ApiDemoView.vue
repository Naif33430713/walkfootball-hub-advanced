
<template>
  <div class="container my-5">
    <h2 class="mb-3">API Demo</h2>

    <button class="btn btn-primary btn-sm mb-3" @click="loadAll" :disabled="loading">
      <span v-if="loading">Loading…</span>
      <span v-else>Reload</span>
    </button>

    <h5>Programs</h5>
    <pre class="p-3 bg-light border rounded small" style="max-height:360px; overflow:auto;">
{{ pretty(programs) }}
    </pre>

    <h5 class="mt-4">Stats</h5>
    <pre class="p-3 bg-light border rounded small" style="max-height:240px; overflow:auto;">
{{ pretty(stats) }}
    </pre>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const programs = ref(null)
const stats = ref(null)
const loading = ref(false)

const REGION = 'us-central1'
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID
const BASE = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`

async function loadAll () {
  loading.value = true
  try {
    const [p, s] = await Promise.all([
      fetch(`${BASE}/apiProgramsLite`).then(r => r.json()),
      fetch(`${BASE}/apiStatsLite`).then(r => r.json())
    ])
    programs.value = p
    stats.value = s
  } finally {
    loading.value = false
  }
}

function pretty (obj) {
  return JSON.stringify(obj, null, 2)
}

onMounted(loadAll)
</script>
