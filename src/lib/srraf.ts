let frame: number
let x: number
let px: number
let y: number
let py: number
let vh: number
let pvh: number
let vw: number
let pvw: number

interface callbackFn {
  ({
    x,
    y,
    px,
    py,
    vh,
    pvh,
    vw,
    pvw,
  }: {
    x: number,
    y: number,
    px: number,
    py: number,
    vh: number,
    pvh: number,
    vw: number,
    pvw: number,
  },
    t: DOMHighResTimeStamp
  ): void;
}

const fns: callbackFn[] = []

function raf (t: DOMHighResTimeStamp, force?: boolean): number {
  x = window.pageXOffset
  y = window.pageYOffset
  vh = window.innerHeight
  vw = window.innerWidth

  if (px === undefined) px = x
  if (py === undefined) py = y
  if (pvw === undefined) pvw = vw
  if (pvh === undefined) pvh = vh

  if (
    force ||
    y !== py ||
    x !== px ||
    vh !== pvh ||
    vw !== pvw
  ) {
    run(t)

    px = x
    py = y
    pvh = vh
    pvw = vw
  }

  return requestAnimationFrame(raf)
}

function run (t: DOMHighResTimeStamp) {
  for (const fn of fns) {
    fn({ x, y, px, py, vh, pvh, vw, pvw }, t)
  }
}

export function srraf (fn: callbackFn) {
  if (fns.indexOf(fn) < 0) {
    fns.push(fn)
  }

  frame = frame || raf(performance.now())
  return {
    update () {
      raf(performance.now(), true)
      return this
    },
    destroy () {
      fns.splice(fns.indexOf(fn), 1)
    }
  }
}
