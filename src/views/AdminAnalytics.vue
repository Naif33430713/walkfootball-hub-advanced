
<template>
  <div class="container my-5">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">Analytics</h2>
      <button class="btn btn-outline-secondary" @click="refresh" :disabled="loading">
        {{ loading ? 'Refreshing…' : 'Refresh' }}
      </button>
    </div>


    <div id="analytics-status"
         class="visually-hidden"
         role="status"
         aria-live="polite"
         aria-atomic="true">
      {{ statusMsg }}
    </div>

    <div class="row g-4">

      <div class="col-12 col-lg-6">
        <div class="card h-100">
          <div class="card-header"><strong>Programs by Location</strong></div>
          <div class="card-body"><canvas ref="c1"></canvas></div>
        </div>
      </div>


      <div class="col-12 col-lg-6">
        <div class="card h-100">
          <div class="card-header"><strong>Ratings Distribution</strong></div>
          <div class="card-body"><canvas ref="c2"></canvas></div>
        </div>
      </div>
    </div>


    <div v-if="selectedLocation" class="card mt-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <strong>Programs in: {{ selectedLocation }}</strong>
        <button class="btn btn-sm btn-outline-secondary" @click="clearLocation">Clear</button>
      </div>
      <div class="card-body">
        <div v-if="programsForSelectedLocation.length === 0" class="text-muted">No programs.</div>
        <div v-else class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Program</th>
                <th>Schedule</th>
                <th>Difficulty</th>
                <th>% Full</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in programsForSelectedLocation" :key="p.id">
                <td>{{ p.name }}</td>
                <td>{{ p.schedule || '—' }}</td>
                <td>{{ p.difficulty || '—' }}</td>
                <td>
                  <span v-if="p.maxParticipants > 0">
                    {{ Math.min(100, Math.round((p.currentParticipants / p.maxParticipants) * 100)) }}%
                  </span>
                  <span v-else>—</span>
                </td>
                <td class="text-end">
                  <router-link class="btn btn-sm btn-primary" :to="`/programs/${p.id}`">Open</router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>


    <div v-if="selectedStars" class="card mt-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <strong>Ratings with ★{{ selectedStars }}</strong>
        <button class="btn btn-sm btn-outline-secondary" @click="clearStars">Clear</button>
      </div>
      <div class="card-body">
        <div v-if="ratingsForSelectedStars.length === 0" class="text-muted">No ratings.</div>
        <div v-else class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Program</th>
                <th>User</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in ratingsForSelectedStars" :key="r.id">
                <td>{{ programNameById(r.programId) }}</td>
                <td>{{ r.email }}</td>
                <td>{{ r.comment || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="small text-muted mt-3">
      Last updated: {{ lastUpdated ? new Date(lastUpdated).toLocaleString() : '—' }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { listPrograms, listAllRatingsFlat } from '@/services/db'
import { Chart, registerables } from 'chart.js'
import { announce, focusMain } from '@/utils/a11y'
Chart.register(...registerables)

const loading = ref(false)
const lastUpdated = ref(null)
const statusMsg = ref('')

const c1 = ref(null)
const c2 = ref(null)
let chart1 = null
let chart2 = null


const programsAll = ref([])
const ratingsAll = ref([])


const selectedLocation = ref(null)
const selectedStars = ref(null)

function updateStatus(msg) {
  statusMsg.value = msg
  announce(msg)
}

function clearLocation() {
  selectedLocation.value = null
  updateStatus('Cleared location filter.')
}

function clearStars() {
  selectedStars.value = null
  updateStatus('Cleared star filter.')
}

const programsForSelectedLocation = computed(() => {
  if (!selectedLocation.value) return []
  return programsAll.value
    .filter(p => (p.location || 'Unspecified').trim() === selectedLocation.value)
    .map(p => ({
      id: p.id,
      name: p.name || 'Program',
      schedule: p.schedule || '',
      difficulty: p.difficulty || '',
      maxParticipants: Number(p.maxParticipants || 0),
      currentParticipants: Number(p.currentParticipants || 0)
    }))
})

const ratingsForSelectedStars = computed(() => {
  if (!selectedStars.value) return []
  return ratingsAll.value.filter(r => Number(r.stars) === Number(selectedStars.value))
})

function programNameById(id) {
  return programsAll.value.find(p => String(p.id) === String(id))?.name || id
}

async function fetchData() {
  loading.value = true
  try {
    const [p, r] = await Promise.all([listPrograms(), listAllRatingsFlat()])
    programsAll.value = p || []
    ratingsAll.value = r || []


    const counts = {}
    for (const prog of programsAll.value) {
      const k = (prog.location || 'Unspecified').trim()
      counts[k] = (counts[k] || 0) + 1
    }
    const locLabels = Object.keys(counts).sort()
    const locValues = locLabels.map(k => counts[k])

    if (chart1) chart1.destroy()
    chart1 = new Chart(c1.value.getContext('2d'), {
      type: 'bar',
      data: {
        labels: locLabels,
        datasets: [{
          label: 'Programs',
          data: locValues,
          backgroundColor: ['#2563eb','#16a34a','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316']
        }]
      },
      options: {
        responsive: true,
        animation: false,
        onClick: (_e, els) => {
          if (!els.length) return
          const i = els[0].index
          selectedLocation.value = locLabels[i]
          announce(`Filtered by ${selectedLocation.value} (${locValues[i]} program(s))`)

          nextTick(() => window.scrollBy({ top: 240, behavior: 'smooth' }))
        },
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: false } }
      }
    })

    const buckets = [0,0,0,0,0] // 1..5
    for (const rr of ratingsAll.value) {
      const s = Math.max(1, Math.min(5, Number(rr.stars || 0) | 0))
      buckets[s - 1]++
    }
    if (chart2) chart2.destroy()
    chart2 = new Chart(c2.value.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['★1','★2','★3','★4','★5'],
        datasets: [{
          data: buckets,
          backgroundColor: ['#ef4444','#f59e0b','#eab308','#16a34a','#2563eb']
        }]
      },
      options: {
        responsive: true,
        animation: false,
        plugins: { legend: { position: 'bottom' } },
        onClick: (_e, els) => {
          if (!els.length) return
          const i = els[0].index
          selectedStars.value = i + 1
          announce(`Filtered by ★${selectedStars.value} (${buckets[i]} rating(s))`)
          nextTick(() => window.scrollBy({ top: 240, behavior: 'smooth' }))
        }
      }
    })

    lastUpdated.value = Date.now()
    updateStatus('Analytics updated.')
    focusMain()


  } finally {
    loading.value = false
  }
}

async function refresh() {
  selectedLocation.value = null
  selectedStars.value = null
  await fetchData()
  updateStatus('Refreshed analytics.')
}

onMounted(fetchData)
onBeforeUnmount(() => {
  if (chart1) chart1.destroy()
  if (chart2) chart2.destroy()
})
</script>

<style scoped>
.card { border: none; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
.card-body { min-height: 320px; }
canvas { width: 100% !important; height: 100% !important; display: block; }


.visually-hidden {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0);
  white-space: nowrap; border: 0;
}
</style>
