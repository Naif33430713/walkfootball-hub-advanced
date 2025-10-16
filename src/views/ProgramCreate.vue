<!-- src/views/ProgramCreate.vue -->
<template>
  <div class="container my-5" style="max-width: 760px">
    <h2 id="add-title" class="mb-3">{{ isEdit ? 'Edit Program' : 'Add Program' }}</h2>
    <p class="text-muted">
      {{ isEdit ? 'Update this Walking Football program.' : 'Create a new Walking Football program.' }}
    </p>

    <div
      v-if="status"
      class="alert"
      :class="ok ? 'alert-success' : 'alert-danger'"
      role="alert"
      aria-live="polite">
      {{ status }}
    </div>

    <form @submit.prevent="submit" aria-labelledby="add-title">
      <div class="row g-3">

        <div class="col-md-8">
          <label class="form-label" for="name">Name *</label>
          <input
            id="name"
            v-model.trim="form.name"
            type="text"
            class="form-control"
            required
            aria-required="true"
          />
        </div>


        <div class="col-md-4">
          <label class="form-label" for="difficulty">Difficulty</label>
          <select id="difficulty" v-model="form.difficulty" class="form-select">
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>


        <div class="col-md-6">
          <label class="form-label" for="location">Location *</label>
          <input
            id="location"
            v-model.trim="form.location"
            type="text"
            class="form-control"
            placeholder="e.g., Melbourne"
            required
            aria-required="true"
          />
        </div>


        <div class="col-md-6 position-relative">
          <label class="form-label" for="address">Address (optional)</label>
          <input
            id="address"
            v-model="addressQuery"
            type="text"
            class="form-control"
            placeholder="Start typing address..."
            @input="searchAddress"
          />


          <ul v-if="suggestions.length" class="list-group position-absolute w-100" style="z-index: 1000;">
            <li
              v-for="s in suggestions"
              :key="s.id"
              @click="selectSuggestion(s)"
              class="list-group-item list-group-item-action"
            >
              {{ s.place_name }}
            </li>
          </ul>
        </div>


        <div class="col-12">
          <label class="form-label" for="schedule">Schedule *</label>
          <input
            id="schedule"
            v-model.trim="form.schedule"
            type="text"
            class="form-control"
            placeholder="Fridays, 11:00–12:30"
            required
            aria-required="true"
          />
        </div>


        <div class="col-md-6">
          <label class="form-label" for="cost">Cost (AUD)</label>
          <input id="cost" v-model.number="form.cost" type="number" min="0" class="form-control" />
        </div>


        <div class="col-md-6">
          <label class="form-label" for="instructor">Instructor</label>
          <input id="instructor" v-model.trim="form.instructor" type="text" class="form-control" />
        </div>


        <div class="col-md-6">
          <label class="form-label" for="max">Max Participants</label>
          <input id="max" v-model.number="form.maxParticipants" type="number" min="0" class="form-control" />
        </div>

        <div class="col-md-6">
          <label class="form-label" for="current">Currently Enrolled</label>
          <input id="current" v-model.number="form.currentParticipants" type="number" min="0" class="form-control" />
        </div>

        <div class="col-12">
          <label class="form-label" for="description">Description</label>
          <textarea id="description" v-model.trim="form.description" rows="3" class="form-control"></textarea>
        </div>


        <div class="col-12">
          <div class="form-check">
            <input id="available" v-model="form.available" type="checkbox" class="form-check-input" />
            <label class="form-check-label" for="available">Available (can accept bookings)</label>
          </div>
        </div>


        <div class="col-md-3">
          <label class="form-label" for="lat">Latitude</label>
          <input id="lat" v-model.number="form.lat" type="number" step="0.000001" class="form-control" />
        </div>
        <div class="col-md-3">
          <label class="form-label" for="lng">Longitude</label>
          <input id="lng" v-model.number="form.lng" type="number" step="0.000001" class="form-control" />
        </div>


        <div class="col-12 d-flex gap-2 align-items-center">
          <button class="btn btn-primary" :disabled="saving" :aria-busy="saving">
            <span v-if="saving">{{ isEdit ? 'Updating…' : 'Saving…' }}</span>
            <span v-else>{{ isEdit ? 'Update Program' : 'Save Program' }}</span>
          </button>

          <router-link class="btn btn-outline-secondary" to="/admin">Cancel</router-link>

          <span v-if="geocoding" class="text-muted small" role="status" aria-live="polite">
            Geocoding…
          </span>


          <button
            v-if="isEdit"
            type="button"
            class="btn btn-outline-danger ms-auto"
            :disabled="saving"
            @click="onDelete">
            Delete
          </button>
        </div>

        <!-- Success link -->
        <div v-if="ok && createdId" class="mt-3" role="status" aria-live="polite">
          <router-link :to="`/programs/${createdId}`">
            {{ isEdit ? 'View updated program →' : 'View program →' }}
          </router-link>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addProgram, getProgram, updateProgram, deleteProgram } from '@/services/db'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

const route = useRoute()
const router = useRouter()

const id = route.params.id ? String(route.params.id) : null
const isEdit = !!id

const form = reactive({
  name: '',
  location: '',
  address: '',
  schedule: '',
  difficulty: 'Beginner',
  instructor: '',
  description: '',
  maxParticipants: 0,
  currentParticipants: 0,
  available: true,
  cost: 0,
  lat: null,
  lng: null
})


const addressQuery = ref('')
const suggestions = ref([])

const saving = ref(false)
const geocoding = ref(false)
const status = ref('')
const ok = ref(false)
const createdId = ref('')

function basicValidate() {
  if (!form.name || !form.location || !form.schedule) {
    status.value = 'Please fill in Name, Location, and Schedule.'
    ok.value = false
    return false
  }
  return true
}


async function searchAddress() {
  const q = addressQuery.value.trim()
  if (q.length < 3) {
    suggestions.value = []
    return
  }
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?autocomplete=true&limit=5&access_token=${MAPBOX_TOKEN}`
  const res = await fetch(url)
  const data = await res.json()
  suggestions.value = data.features || []
}

function selectSuggestion(s) {
  addressQuery.value = s.place_name
  suggestions.value = []
  form.address = s.place_name
  const [lng, lat] = s.center
  form.lat = lat
  form.lng = lng
}

async function geocode(q) {
  if (!MAPBOX_TOKEN || !q) return null
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?limit=1&access_token=${MAPBOX_TOKEN}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  const feat = data?.features?.[0]
  if (!feat?.center) return null
  const [lng, lat] = feat.center
  return { lat, lng }
}

onMounted(async () => {
  if (!isEdit) return
  try {
    const existing = await getProgram(id)
    if (!existing) {
      status.value = 'Program not found.'
      ok.value = false
      return
    }
    Object.assign(form, existing)
    createdId.value = id
    addressQuery.value = form.address
  } catch (e) {
    status.value = 'Failed to load program.'
    ok.value = false
    console.error(e)
  }
})

async function submit() {
  status.value = ''
  ok.value = false
  if (!basicValidate()) return

  if (form.lat == null || form.lng == null) {
    const q = [form.address, form.location].filter(Boolean).join(', ')
    if (q) {
      geocoding.value = true
      try {
        const hit = await geocode(q)
        if (hit) {
          form.lat = hit.lat
          form.lng = hit.lng
        }
      } finally {
        geocoding.value = false
      }
    }
  }

  saving.value = true
  try {
    if (isEdit) {
      await updateProgram(id, form)
      createdId.value = id
      ok.value = true
      status.value = 'Program updated.'
    } else {
      const newId = await addProgram(form)
      createdId.value = newId
      ok.value = true
      status.value = 'Program created.'
      form.name = ''
      form.location = ''
      form.address = ''
      form.schedule = ''
      form.lat = null
      form.lng = null
      addressQuery.value = ''
    }
  } catch (e) {
    ok.value = false
    status.value = isEdit ? 'Failed to update. Try again.' : 'Failed to save. Try again.'
    console.error(e)
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  if (!isEdit) return
  if (!confirm('Delete this program? This cannot be undone.')) return
  saving.value = true
  try {
    await deleteProgram(id)
    router.replace('/admin')
  } catch (e) {
    console.error(e)
    status.value = 'Failed to delete. Try again.'
    ok.value = false
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.list-group-item { cursor: pointer; }
.list-group-item:hover { background-color: #f0f0f0; }
</style>
