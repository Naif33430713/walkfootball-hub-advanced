<template>
  <div class="programs">

    <section class="py-3">
      <div class="container-xxl">
        <div class="card">
          <div class="card-header d-flex flex-wrap gap-3 align-items-center">
            <strong class="me-2">Find Programs Near Me</strong>

            <button class="btn btn-primary btn-sm" @click="setMyLocation">
              Use my location
            </button>

            <div class="d-flex align-items-center gap-2">
              <span class="text-muted small">Radius</span>
              <input type="range" min="1" max="50" v-model.number="radiusKm" />
              <span class="small">{{ radiusKm }} km</span>
            </div>

            <!-- Non-trivial: Place search -->
            <div class="d-flex align-items-center gap-2">
              <input
                v-model.trim="searchQuery"
                @keyup.enter="searchPlace"
                class="form-control form-control-sm"
                style="width: 220px"
                type="text"
                placeholder="Search a place (city, suburb)…"
                :aria-busy="searching ? 'true' : 'false'"
              />
              <button
                class="btn btn-outline-secondary btn-sm"
                @click="searchPlace"
                :disabled="searching || !searchQuery"
              >
                <span v-if="searching">Searching…</span>
                <span v-else>Go</span>
              </button>
            </div>

            <div class="form-check ms-auto">
              <input id="byDist" class="form-check-input" type="checkbox" v-model="sortByDistance" />
              <label class="form-check-label" for="byDist">Sort by distance</label>
            </div>
          </div>

          <div class="card-body p-0">
            <div ref="mapEl" class="mapbox-map"></div>
            <div class="p-2 small text-muted">
              Your location:
              <span v-if="myPos">{{ myPos.lat.toFixed(4) }}, {{ myPos.lng.toFixed(4) }}</span>
              <span v-else>not set</span>
              • Showing {{ filteredPrograms.length }} of {{ programs.length }}
            </div>
          </div>
        </div>
      </div>
    </section>


    <section class="py-2">
      <div class="container-xxl d-flex flex-wrap gap-2 align-items-end">
        <div class="d-flex flex-column" style="max-width: 220px;">
          <label class="form-label small mb-1">Level</label>
          <select v-model="level" class="form-select form-select-sm">
            <option value="">All</option>
            <option v-for="lvl in uniqueLevels" :key="lvl" :value="lvl">{{ lvl }}</option>
          </select>
        </div>
        <button class="btn btn-outline-secondary btn-sm ms-auto" @click="clearFilters">
          Clear filter
        </button>
      </div>
    </section>

    <!-- ===== Loading / Error ===== -->
    <section class="py-3">
      <div class="container-xxl">
        <div v-if="loading" class="alert alert-info mb-0">Loading programs…</div>
        <div v-else-if="error" class="alert alert-danger mb-0">{{ error }}</div>
      </div>
    </section>

    <!-- ===== Programs Grid ===== -->
    <section class="py-4" v-if="!loading && !error">
      <div class="container-xxl">
        <div class="row">
          <div v-for="p in filteredPrograms" :key="p.id" class="col-12 col-md-6 col-lg-4 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h6 class="mb-1">{{ p.name }}</h6>
                <div class="text-muted small">{{ p.location || '—' }}</div>

                <div class="small mt-1">
                  <strong>Level:</strong> {{ p.difficulty || '—' }}
                  <span v-if="p.cost !== undefined && p.cost !== null">
                    • <strong>Price:</strong> ${{ Number(p.cost) }}
                  </span>
                </div>

                <div class="text-muted small" v-if="p._distKm != null">
                  {{ p._distKm.toFixed(1) }} km away
                </div>

                <div class="d-flex gap-2 mt-2">
                  <router-link class="btn btn-sm btn-outline-primary" :to="`/programs/${p.id}`">
                    Details
                  </router-link>
                  <button class="btn btn-sm btn-primary" @click="onBook(p)">Book Now</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="filteredPrograms.length === 0" class="row">
          <div class="col-12">
            <div class="alert alert-info mb-0">No programs match your filters. Try increasing the radius.</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { listPrograms, bookProgram } from '@/services/db'
import { auth } from '@/firebase'

import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { announce } from "@/utils/a11y"
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const router = useRouter()

/* ----- State ----- */
const programs = ref([])
const loading = ref(true)
const error = ref('')


const level = ref('')
const uniqueLevels = computed(() => {
  const set = new Set((programs.value || []).map(p => (p.difficulty || '').trim()).filter(Boolean))
  return Array.from(set).sort()
})

/* geo */
const myPos = ref(null) // { lat, lng }
const radiusKm = ref(10)
const sortByDistance = ref(false)

/* map */
const mapEl = ref(null)
let map = null
let programMarkers = []
let meMarker = null
let searchMarker = null

const DEFAULT_CENTER = { lng: 144.9631, lat: -37.8136 }
const DEFAULT_ZOOM = 10


const searchQuery = ref('')
const searching = ref(false)


function clearFilters() {
  level.value = ''
}


function kmBetween(a, b) {
  const toRad = (x) => (x * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const la1 = toRad(a.lat)
  const la2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const filteredPrograms = computed(() => {
  let list = (programs.value || []).slice()


  if (level.value) {
    list = list.filter(p => (p.difficulty || '') === level.value)
  }


  if (myPos.value) {
    const withCoords = list
      .map(p => {
        const lat = Number(p.lat), lng = Number(p.lng)
        const has = Number.isFinite(lat) && Number.isFinite(lng)
        return { has, lat, lng, p }
      })
      .filter(x => x.has)

    if (withCoords.length > 0) {
      list = withCoords
        .map(({ p, lat, lng }) => ({ ...p, _distKm: kmBetween(myPos.value, { lat, lng }) }))
        .filter(p => p._distKm <= radiusKm.value)
    }
  }

  if (sortByDistance.value) {
    list.sort((a, b) => (a._distKm ?? Infinity) - (b._distKm ?? Infinity))
  }

  return list
})

/* ----- Map ----- */
function initMap() {
  if (map) return
  map = new mapboxgl.Map({
    container: mapEl.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
    zoom: DEFAULT_ZOOM
  })
  map.addControl(new mapboxgl.NavigationControl(), 'top-right')
}

function drawMarkers() {
  if (!map) return
  for (const m of programMarkers) m.remove()
  programMarkers = []

  const base = filteredPrograms.value.length > 0 ? filteredPrograms.value : programs.value

  for (const p of base) {
    const lat = Number(p.lat), lng = Number(p.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

    const html = `
      <div style="min-width:180px">
        <strong>${p.name || 'Program'}</strong><br/>
        ${p.location || ''}<br/>
        <small>${p.schedule || ''}</small>
      </div>`
    const marker = new mapboxgl.Marker()
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup({ offset: 24 }).setHTML(html))
      .addTo(map)
    programMarkers.push(marker)
  }
}

function drawMe() {
  if (!map) return
  if (meMarker) { meMarker.remove(); meMarker = null }
  if (!myPos.value) return
  meMarker = new mapboxgl.Marker({ color: '#2563eb' })
    .setLngLat([myPos.value.lng, myPos.value.lat])
    .setPopup(new mapboxgl.Popup().setHTML('<b>You are here</b>'))
    .addTo(map)
}

function flyToMyPos() {
  if (!map || !myPos.value) return
  map.flyTo({ center: [myPos.value.lng, myPos.value.lat], zoom: 12 })
}

/* ----- Geolocation ----- */
async function setMyLocation() {
  try {
    const coords = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        reject,
        { enableHighAccuracy: true, timeout: 10000 }
      )
    )
    myPos.value = { lat: coords.latitude, lng: coords.longitude }
    flyToMyPos()
    drawMe()
  } catch (e) {
    alert(e?.message || "Couldn't get your location. Please allow location permission.")
  }
}

/* ----- Place search ----- */
async function searchPlace() {
  const q = (searchQuery.value || '').trim()
  if (!q || !map) return

  searching.value = true
  try {
    const token = mapboxgl.accessToken
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?limit=1&access_token=${token}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Geocoding failed')
    const data = await res.json()
    const feat = data?.features?.[0]
    if (!feat?.center) { alert('No results for that place.'); return }

    const [lng, lat] = feat.center
    map.flyTo({ center: [lng, lat], zoom: 12 })

    if (searchMarker) { searchMarker.remove(); searchMarker = null }
    searchMarker = new mapboxgl.Marker({ color: '#111' })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup({ offset: 16 }).setHTML(
        `<b>${feat.text}</b><div class="small">${feat.place_name}</div>`
      ))
      .addTo(map)
  } catch (e) {
    console.error(e)
    alert('Search failed. Try another place.')
  } finally {
    searching.value = false
  }
}


async function onBook(p) {
  const user = auth.currentUser
  if (!user) {

    return router.push({ name: 'SignIn', query: { redirect: '/programs' } })
  }
  const email = user.email || `${user.uid}@local`
  const displayName = user.displayName || user.email || user.uid

  try {
    await bookProgram(p.id, { email, displayName })
    alert(`Booked: ${p.name}`)
  } catch (e) {
    alert(e?.message || 'Booking failed')
  }
}


onMounted(async () => {
  try {
    initMap()
    const list = await listPrograms()
    programs.value = list || []
    loading.value = false
    drawMarkers()
    announce("Programs list loaded successfully.")
  } catch (e) {
    console.error(e)
    error.value = 'Failed to load programs.'
    loading.value = false
     announce("Error loading programs.")
  }
})

watch(filteredPrograms, drawMarkers)
watch([myPos, radiusKm], drawMarkers)

onBeforeUnmount(() => {
  for (const m of programMarkers) m.remove()
  if (meMarker) meMarker.remove()
  if (searchMarker) searchMarker.remove()
  if (map) map.remove()
})
</script>

<style scoped>
.mapbox-map { height: 360px; width: 100%; }
</style>
