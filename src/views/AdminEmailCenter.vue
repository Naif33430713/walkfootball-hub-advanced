<template>
  <div class="container my-5" style="max-width: 900px">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">Email Center</h2>
      <router-link class="btn btn-outline-secondary" to="/admin">← Back</router-link>
    </div>


    <div class="mb-3">
      <button class="btn btn-sm me-2" :class="tab === 'brochure' ? 'btn-primary' : 'btn-outline-primary'" @click="tab = 'brochure'">Brochure</button>
      <button class="btn btn-sm" :class="tab === 'bulk' ? 'btn-primary' : 'btn-outline-primary'" @click="tab = 'bulk'">Bulk</button>
    </div>

    <div class="card">
      <div class="card-body">

        <div v-if="tab === 'brochure'">
          <h5 class="mb-3">Send brochure to one person</h5>

          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Recipient Email *</label>
              <input v-model.trim="emailTo" type="email" class="form-control" placeholder="user@example.com" />
            </div>

            <div class="col-md-6">
              <label class="form-label">Program *</label>
              <select v-model="selectedProgramId" class="form-select">
                <option disabled value="">Select a program…</option>
                <option v-for="p in programs" :key="p.id" :value="p.id">
                  {{ p.name }} — {{ p.location || '—' }}
                </option>
              </select>
            </div>

            <div class="col-12">
              <label class="form-label">Subject *</label>
              <input v-model.trim="emailSubject" type="text" class="form-control" placeholder="Walking Football Program Brochure" />
            </div>

            <div class="col-12 d-flex gap-2">
              <button class="btn btn-primary" @click="sendBrochure" :disabled="sendingOne">
                <span v-if="sendingOne">Sending…</span><span v-else>Send Brochure</span>
              </button>
              <span class="small" :class="oneOk === true ? 'text-success' : oneOk === false ? 'text-danger' : 'text-muted'">
                {{ oneMsg }}
              </span>
            </div>
          </div>
        </div>


        <div v-else>
          <h5 class="mb-3">Send bulk email</h5>

          <div class="mb-3">
            <label class="form-label">Recipients *</label>
            <textarea
              v-model="rawRecipients"
              rows="4"
              class="form-control"
              placeholder="alice@example.com, bob@example.com (commas / spaces / new lines)"
            ></textarea>
            <div class="form-text">Parsed: {{ parsedRecipients.length }} address(es)</div>
          </div>

          <div class="mb-3">
            <label class="form-label">Subject *</label>
            <input v-model.trim="bulkSubject" type="text" class="form-control" />
          </div>

          <div class="mb-3">
            <label class="form-label">Message *</label>
            <textarea v-model.trim="bulkMessage" rows="6" class="form-control" placeholder="Write your message…"></textarea>
          </div>

          <div class="d-flex gap-2">
            <button class="btn btn-secondary" @click="sendTest" :disabled="sendingBulk">Send test to me</button>
            <button class="btn btn-primary" @click="sendBulk" :disabled="sendingBulk || parsedRecipients.length === 0">
              <span v-if="sendingBulk">Sending…</span><span v-else>Send bulk email</span>
            </button>
            <span class="small ms-2" :class="bulkOk === true ? 'text-success' : bulkOk === false ? 'text-danger' : 'text-muted'">
              {{ bulkMsg }}
            </span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '@/firebase'
import { listPrograms } from '@/services/db'

const router = useRouter()


const tab = ref('brochure')


const programs = ref([])
const selectedProgramId = ref('')
onMounted(async () => {
  programs.value = await listPrograms()
  if (!selectedProgramId.value && programs.value.length) {
    selectedProgramId.value = programs.value[0].id
  }
})


const emailTo = ref('')
const emailSubject = ref('Walking Football Program Brochure')
const sendingOne = ref(false)
const oneMsg = ref('')
const oneOk = ref(null)


const rawRecipients = ref('')
const bulkSubject = ref('')
const bulkMessage = ref('')
const sendingBulk = ref(false)
const bulkMsg = ref('')
const bulkOk = ref(null)


const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const parsedRecipients = computed(() => {
  const parts = (rawRecipients.value || '')
    .split(/[,\s;]+/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  return Array.from(new Set(parts)).filter(e => emailRe.test(e))
})

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID
const REGION = 'us-central1'
const BASE = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`

function ensureAuthed() {
  const u = auth.currentUser
  if (!u) {
    router.push({ name: 'SignIn', query: { redirect: '/admin/email' } })
    return null
  }
  return u
}


async function sendBrochure() {
  oneMsg.value = ''
  oneOk.value = null

  const u = ensureAuthed()
  if (!u) return

  if (!emailRe.test(emailTo.value || '')) {
    oneMsg.value = 'Enter a valid email.'
    oneOk.value = false
    return
  }
  const prog = programs.value.find(p => String(p.id) === String(selectedProgramId.value))
  if (!prog) {
    oneMsg.value = 'Pick a program.'
    oneOk.value = false
    return
  }

  sendingOne.value = true
  try {
    const idToken = await u.getIdToken(true)
    const res = await fetch(`${BASE}/sendProgramEmailHttp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        to: emailTo.value.trim(),
        subject: emailSubject.value.trim(),
        program: {
          name: prog.name || 'Program',
          location: prog.location || '',
          schedule: prog.schedule || '',
          difficulty: prog.difficulty || '',
          description: prog.description || ''
        }
      })
    })
    if (!res.ok) throw new Error('Request failed')
    oneMsg.value = `Sent ✓ to ${emailTo.value.trim()}`
    oneOk.value = true
  } catch {

    oneMsg.value = 'Failed to send. Please try again.'
    oneOk.value = false
  } finally {
    sendingOne.value = false
  }
}


async function doBulkSend(toList) {
  const u = ensureAuthed()
  if (!u) return { ok: false }

  const idToken = await u.getIdToken(true)
  const res = await fetch(`${BASE}/sendBulkEmailHttp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      to: toList,
      subject: bulkSubject.value.trim(),
      text: bulkMessage.value.trim()
    })
  })
  if (!res.ok) throw new Error('Request failed')
  return await res.json().catch(() => ({}))
}

async function sendBulk() {
  bulkMsg.value = ''
  bulkOk.value = null

  if (parsedRecipients.value.length === 0) {
    bulkMsg.value = 'Add at least one email.'
    bulkOk.value = false
    return
  }
  if (!bulkSubject.value.trim() || !bulkMessage.value.trim()) {
    bulkMsg.value = 'Subject and message are required.'
    bulkOk.value = false
    return
  }

  sendingBulk.value = true
  try {
    const data = await doBulkSend(parsedRecipients.value)
    const sent = Number(data?.sent || 0)
    const batches = Number(data?.batches || 1)
    bulkMsg.value = `Sent ${sent} email(s) across ${batches} batch(es).`
    bulkOk.value = true
  } catch {
    bulkMsg.value = 'Bulk send failed. Please try again.'
    bulkOk.value = false
  } finally {
    sendingBulk.value = false
  }
}

async function sendTest() {
  bulkMsg.value = ''
  bulkOk.value = null
  if (!bulkSubject.value.trim() || !bulkMessage.value.trim()) {
    bulkMsg.value = 'Subject and message are required.'
    bulkOk.value = false
    return
  }
  sendingBulk.value = true
  try {
    const me = auth.currentUser?.email || ''
    if (!me) throw new Error('not-signed-in')
    const data = await doBulkSend([me])
    const sent = Number(data?.sent || 0)
    bulkMsg.value = `Test sent (${sent}).`
    bulkOk.value = true
  } catch {
    bulkMsg.value = 'Test send failed.'
    bulkOk.value = false
  } finally {
    sendingBulk.value = false
  }
}
</script>
