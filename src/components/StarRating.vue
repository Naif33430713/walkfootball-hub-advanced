<template>
  <div>

    <button
      v-for="n in 5"
      :key="n"
      type="button"
      @click="pickStar(n)"
      :disabled="readonly"
    >
      {{ n <= modelValue ? '★' : '☆' }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: Number, default: 0 },
  readonly: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])


function pickStar(n) {
  emit('update:modelValue', n)
}
</script>
