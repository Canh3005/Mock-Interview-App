import { useEffect } from 'react'

const SCROLLBAR_SIZE = 6
const SCROLLBAR_INSET = 3
const TRACK_INSET = 4
const MIN_THUMB_SIZE = 24
const IDLE_HIDE_DELAY = 800
const SCROLLABLE_OVERFLOW = new Set(['auto', 'scroll', 'overlay'])

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getDocumentMetrics(axis) {
  const root = document.documentElement
  const body = document.body

  if (axis === 'y') {
    const scrollSize = Math.max(root.scrollHeight, body?.scrollHeight ?? 0)
    const clientSize = window.innerHeight
    return {
      scrollSize,
      clientSize,
      scrollPosition: window.scrollY || root.scrollTop || body?.scrollTop || 0,
      rect: {
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        left: 0,
      },
    }
  }

  const scrollSize = Math.max(root.scrollWidth, body?.scrollWidth ?? 0)
  const clientSize = window.innerWidth
  return {
    scrollSize,
    clientSize,
    scrollPosition: window.scrollX || root.scrollLeft || body?.scrollLeft || 0,
    rect: {
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
      left: 0,
    },
  }
}

function getElementMetrics(element, axis) {
  const rect = element.getBoundingClientRect()

  if (axis === 'y') {
    return {
      scrollSize: element.scrollHeight,
      clientSize: element.clientHeight,
      scrollPosition: element.scrollTop,
      rect,
    }
  }

  return {
    scrollSize: element.scrollWidth,
    clientSize: element.clientWidth,
    scrollPosition: element.scrollLeft,
    rect,
  }
}

function setTargetScrollPosition(target, axis, value) {
  if (target === document.documentElement) {
    if (axis === 'y') {
      window.scrollTo({ top: value, behavior: 'auto' })
    } else {
      window.scrollTo({ left: value, behavior: 'auto' })
    }
    return
  }

  if (axis === 'y') {
    target.scrollTop = value
  } else {
    target.scrollLeft = value
  }
}

function canScrollElement(element, axis) {
  if (!(element instanceof HTMLElement)) return false
  if (element.dataset.overlayScrollbarIgnore === 'true') return false

  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') return false

  const overflow = axis === 'y' ? style.overflowY : style.overflowX
  if (!SCROLLABLE_OVERFLOW.has(overflow)) return false

  const scrollSize = axis === 'y' ? element.scrollHeight : element.scrollWidth
  const clientSize = axis === 'y' ? element.clientHeight : element.clientWidth
  if (scrollSize <= clientSize + 1) return false

  const rect = element.getBoundingClientRect()
  return rect.width > 1 && rect.height > 1
}

export default function GlobalOverlayScrollbars() {
  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const appRoot = document.getElementById('root')
    if (!body) return undefined

    const layer = document.createElement('div')
    layer.className = 'overlay-scrollbar-layer'
    layer.dataset.overlayScrollbarLayer = 'true'
    body.appendChild(layer)
    root.classList.add('overlay-scrollbars-enabled')

    const activeTargets = new Set()
    const entries = new Map()
    let updateFrame = 0
    let rescanFrame = 0
    let dragState = null

    const getMetrics = (target, axis) => (
      target === root ? getDocumentMetrics(axis) : getElementMetrics(target, axis)
    )

    const hideEntry = (entry) => {
      if (dragState && Object.values(entry.thumbs).includes(dragState.thumb)) return
      Object.values(entry.thumbs).forEach((thumb) => thumb.classList.remove('is-visible'))
      entry.hideTimer = 0
    }

    const scheduleHide = (entry) => {
      if (entry.hideTimer) clearTimeout(entry.hideTimer)
      entry.hideTimer = window.setTimeout(() => hideEntry(entry), IDLE_HIDE_DELAY)
    }

    const revealEntry = (entry, autoHide = true) => {
      if (entry.hideTimer) clearTimeout(entry.hideTimer)
      Object.values(entry.thumbs).forEach((thumb) => thumb.classList.add('is-visible'))
      if (autoHide) scheduleHide(entry)
    }

    const getOrCreateEntry = (target) => {
      const existing = entries.get(target)
      if (existing) return existing

      const entry = { thumbs: {}, geometry: {}, hideTimer: 0 }

      ;['y', 'x'].forEach((axis) => {
        const thumb = document.createElement('div')
        thumb.className = `overlay-scrollbar-thumb ${axis === 'y' ? 'is-vertical' : 'is-horizontal'}`
        thumb.dataset.overlayScrollbarThumb = axis

        thumb.addEventListener('pointerdown', (event) => {
          const geometry = entry.geometry[axis]
          const metrics = getMetrics(target, axis)
          if (!geometry || metrics.scrollSize <= metrics.clientSize + 1) return

          event.preventDefault()
          thumb.setPointerCapture?.(event.pointerId)
          revealEntry(entry, false)
          thumb.classList.add('is-dragging')
          root.classList.add('overlay-scrollbar-dragging')

          dragState = {
            axis,
            target,
            thumb,
            startPointer: axis === 'y' ? event.clientY : event.clientX,
            startScrollPosition: metrics.scrollPosition,
            scrollPerPixel: (metrics.scrollSize - metrics.clientSize)
              / Math.max(1, geometry.trackSize - geometry.thumbSize),
          }
        })

        thumb.addEventListener('pointerenter', () => revealEntry(entry))
        thumb.addEventListener('pointerleave', () => {
          if (dragState?.thumb !== thumb) scheduleHide(entry)
        })

        entry.thumbs[axis] = thumb
        layer.appendChild(thumb)
      })

      entries.set(target, entry)
      return entry
    }

    const removeEntry = (target) => {
      const entry = entries.get(target)
      if (!entry) return
      if (entry.hideTimer) clearTimeout(entry.hideTimer)
      Object.values(entry.thumbs).forEach((thumb) => thumb.remove())
      entries.delete(target)
    }

    const hideThumb = (entry, axis) => {
      const thumb = entry.thumbs[axis]
      if (thumb) thumb.style.display = 'none'
      delete entry.geometry[axis]
    }

    const updateAxis = (target, entry, axis) => {
      const metrics = getMetrics(target, axis)
      const { scrollSize, clientSize, scrollPosition, rect } = metrics
      const thumb = entry.thumbs[axis]

      if (scrollSize <= clientSize + 1 || !thumb) {
        hideThumb(entry, axis)
        return false
      }

      const visibleTop = clamp(rect.top, 0, window.innerHeight)
      const visibleBottom = clamp(rect.bottom, 0, window.innerHeight)
      const visibleLeft = clamp(rect.left, 0, window.innerWidth)
      const visibleRight = clamp(rect.right, 0, window.innerWidth)

      if (visibleBottom - visibleTop < MIN_THUMB_SIZE || visibleRight - visibleLeft < MIN_THUMB_SIZE) {
        hideThumb(entry, axis)
        return false
      }

      const trackSize = axis === 'y'
        ? Math.max(0, visibleBottom - visibleTop - TRACK_INSET * 2)
        : Math.max(0, visibleRight - visibleLeft - TRACK_INSET * 2)

      if (trackSize < MIN_THUMB_SIZE) {
        hideThumb(entry, axis)
        return false
      }

      const thumbSize = Math.min(
        trackSize,
        Math.max(MIN_THUMB_SIZE, Math.round((clientSize / scrollSize) * trackSize)),
      )
      const maxScrollPosition = Math.max(1, scrollSize - clientSize)
      const maxThumbOffset = Math.max(0, trackSize - thumbSize)
      const thumbOffset = Math.round((scrollPosition / maxScrollPosition) * maxThumbOffset)

      if (axis === 'y') {
        thumb.style.left = `${Math.round(visibleRight - SCROLLBAR_SIZE - SCROLLBAR_INSET)}px`
        thumb.style.top = `${Math.round(visibleTop + TRACK_INSET + thumbOffset)}px`
        thumb.style.width = `${SCROLLBAR_SIZE}px`
        thumb.style.height = `${Math.round(thumbSize)}px`
      } else {
        thumb.style.left = `${Math.round(visibleLeft + TRACK_INSET + thumbOffset)}px`
        thumb.style.top = `${Math.round(visibleBottom - SCROLLBAR_SIZE - SCROLLBAR_INSET)}px`
        thumb.style.width = `${Math.round(thumbSize)}px`
        thumb.style.height = `${SCROLLBAR_SIZE}px`
      }

      thumb.style.display = 'block'
      entry.geometry[axis] = { trackSize, thumbSize }
      return true
    }

    const updateTarget = (target) => {
      const entry = getOrCreateEntry(target)
      const hasVertical = updateAxis(target, entry, 'y')
      const hasHorizontal = updateAxis(target, entry, 'x')

      if (!hasVertical && !hasHorizontal) {
        removeEntry(target)
      }
    }

    const updateAll = () => {
      updateFrame = 0
      activeTargets.forEach(updateTarget)
    }

    const requestUpdate = () => {
      if (updateFrame) return
      updateFrame = requestAnimationFrame(updateAll)
    }

    const handleScroll = (event) => {
      const target = event.target === document ? root : event.target
      const entry = entries.get(target)
      if (entry) revealEntry(entry)
      requestUpdate()
    }

    const rescanTargets = () => {
      rescanFrame = 0
      const nextTargets = new Set()

      if (
        root.scrollHeight > window.innerHeight + 1
        || root.scrollWidth > window.innerWidth + 1
        || body.scrollHeight > window.innerHeight + 1
        || body.scrollWidth > window.innerWidth + 1
      ) {
        nextTargets.add(root)
      }

      const nodes = (appRoot ?? body).querySelectorAll('*')
      nodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return
        if (layer.contains(node)) return
        if (node === root || node === body) return

        if (canScrollElement(node, 'y') || canScrollElement(node, 'x')) {
          nextTargets.add(node)
        }
      })

      activeTargets.forEach((target) => {
        if (!nextTargets.has(target)) removeEntry(target)
      })

      activeTargets.clear()
      nextTargets.forEach((target) => activeTargets.add(target))
      updateAll()
    }

    const requestRescan = () => {
      if (rescanFrame) return
      rescanFrame = requestAnimationFrame(rescanTargets)
    }

    const handlePointerMove = (event) => {
      if (!dragState) return
      event.preventDefault()

      const pointer = dragState.axis === 'y' ? event.clientY : event.clientX
      const delta = pointer - dragState.startPointer
      const metrics = getMetrics(dragState.target, dragState.axis)
      const maxScrollPosition = Math.max(0, metrics.scrollSize - metrics.clientSize)
      const nextPosition = clamp(
        dragState.startScrollPosition + delta * dragState.scrollPerPixel,
        0,
        maxScrollPosition,
      )

      setTargetScrollPosition(dragState.target, dragState.axis, nextPosition)
      requestUpdate()
    }

    const handlePointerUp = () => {
      if (!dragState) return
      const entry = entries.get(dragState.target)
      dragState.thumb.classList.remove('is-dragging')
      root.classList.remove('overlay-scrollbar-dragging')
      dragState = null
      if (entry) scheduleHide(entry)
    }

    const mutationObserver = new MutationObserver((mutations) => {
      if (mutations.every((mutation) => layer.contains(mutation.target))) return
      requestRescan()
    })

    mutationObserver.observe(body, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    })

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(requestRescan)
      : null

    resizeObserver?.observe(root)
    resizeObserver?.observe(body)

    document.addEventListener('scroll', handleScroll, true)
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('pointercancel', handlePointerUp)
    window.addEventListener('resize', requestRescan)
    window.addEventListener('load', requestRescan)
    requestRescan()

    return () => {
      root.classList.remove('overlay-scrollbars-enabled', 'overlay-scrollbar-dragging')
      mutationObserver.disconnect()
      resizeObserver?.disconnect()
      document.removeEventListener('scroll', handleScroll, true)
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('pointercancel', handlePointerUp)
      window.removeEventListener('resize', requestRescan)
      window.removeEventListener('load', requestRescan)
      if (updateFrame) cancelAnimationFrame(updateFrame)
      if (rescanFrame) cancelAnimationFrame(rescanFrame)
      Array.from(entries.keys()).forEach(removeEntry)
      layer.remove()
    }
  }, [])

  return null
}
