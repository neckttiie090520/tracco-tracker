interface ConfettiOptions {
  colors?: string[]
  particleCount?: number
  durationMs?: number
}

export function burstConfetti(opts: ConfettiOptions = {}) {
  const colors = opts.colors || ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F472B6']
  const particleCount = Math.max(60, Math.min(400, opts.particleCount || 150))
  const durationMs = Math.max(800, Math.min(6000, opts.durationMs || 2200))

  const canvas = document.createElement('canvas')
  canvas.className = 'confetti-canvas'
  Object.assign(canvas.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '9999'
  } as CSSStyleDeclaration)
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')

  const resize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  const rand = (min: number, max: number) => Math.random() * (max - min) + min
  const pieces = Array.from({ length: particleCount }).map(() => ({
    x: rand(0, canvas.width),
    y: rand(-20, -canvas.height * 0.25),
    r: rand(4, 9),
    c: colors[(Math.random() * colors.length) | 0],
    vx: rand(-2, 2),
    vy: rand(2, 5),
    rot: rand(0, Math.PI * 2),
    vr: rand(-0.2, 0.2)
  }))

  const start = performance.now()
  let raf = 0
  const tick = (t: number) => {
    if (!ctx) return
    const elapsed = t - start
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    pieces.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.02
      p.rot += p.vr
      if (p.y - p.r > canvas.height) {
        p.y = -10; p.vy = rand(2, 4); p.x = rand(0, canvas.width)
      }
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.c
      ctx.globalAlpha = 0.9
      ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2)
      ctx.restore()
    })
    if (elapsed < durationMs) {
      raf = requestAnimationFrame(tick)
    } else {
      cleanup()
    }
  }

  const cleanup = () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    canvas.remove()
  }

  raf = requestAnimationFrame(tick)
  return cleanup
}

