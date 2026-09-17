<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AslPanel from './AslPanel.vue'
import { useCamera } from '../composables/useCamera'
import { createHandLandmarker, detectHands } from '../composables/useHandTracker'
import { drawHands } from '../lib/hands'
import type { HandLandmarker } from '@mediapipe/tasks-vision'
import type { TrackedHand } from '../../shared/asl'

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const panelRef = ref<{ onFrame: (hands: TrackedHand[]) => void } | null>(null)
const { error, isActive, start, stop } = useCamera(videoRef)

let landmarker: HandLandmarker | null = null
let frameId = 0
let lastTimestamp = -1

onMounted(() => {
  void boot()
})

onUnmounted(() => {
  cancelAnimationFrame(frameId)
  landmarker?.close()
  landmarker = null
  stop()
})

async function boot(): Promise<void> {
  await start()
  if (!isActive.value || !videoRef.value) {
    return
  }

  try {
    landmarker = await createHandLandmarker()
  } catch (caught) {
    console.error('Could not start hand tracking', caught)
    const detail = caught instanceof Error ? caught.message : String(caught ?? '')
    error.value = detail
      ? `Could not start hand tracking: ${detail}`
      : 'Could not start hand tracking'
    return
  }

  track()
}

function track(): void {
  frameId = requestAnimationFrame(track)

  const video = videoRef.value
  const canvas = canvasRef.value
  const context = canvas?.getContext('2d')
  if (!video || !canvas || !context || !landmarker || video.readyState < 2) {
    return
  }

  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
  }

  const timestamp = performance.now()
  if (timestamp <= lastTimestamp) {
    return
  }
  lastTimestamp = timestamp

  const frame = detectHands(landmarker, video, timestamp)
  context.clearRect(0, 0, canvas.width, canvas.height)
  if (frame.landmarks.length > 0) {
    drawHands(context, frame.landmarks, canvas.width, canvas.height)
  }
  panelRef.value?.onFrame(frame.hands)
}
</script>

<template>
  <main class="viewport">
    <video ref="videoRef" autoplay playsinline muted></video>
    <canvas ref="canvasRef"></canvas>
    <AslPanel ref="panelRef" />
    <p v-if="error" class="error">{{ error }}</p>
  </main>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.viewport {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #000;
}

video,
canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

video {
  background: #000;
}

canvas {
  pointer-events: none;
}

.error {
  position: absolute;
  z-index: 4;
  left: 16px;
  bottom: 16px;
  width: min(28rem, calc(100% - 32px));
  margin: 0;
  padding: 16px 18px;
  border-radius: 14px;
  color: $text;
  background: rgba(16, 20, 26, 0.82);
}
</style>
