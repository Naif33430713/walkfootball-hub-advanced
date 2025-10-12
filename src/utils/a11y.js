
export function announce(msg) {
  const el = document.getElementById('a11y-live')
  if (!el) return
  el.textContent = ''
  setTimeout(() => (el.textContent = msg), 10)
}


export function focusMain() {
  const main = document.getElementById('main')
  if (!main) return
  main.setAttribute('tabindex', '-1')
  main.focus()
}
