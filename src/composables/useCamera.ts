import { onUnmounted, ref, type Ref } from 'vue'

export function useCamera(videoRef: Ref<HTMLVideoElement | null>) {
  const isActive = ref(false)
  const error = ref<string | null>(null)
  let stream: MediaStream | null = null

  async function start(): Promise<void> {
    error.value = null

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      if (videoRef.value) {
        videoRef.value.srcObject = stream
        await videoRef.value.play()
      }

      isActive.value = true
    } catch (caught) {
      error.value =
        caught instanceof Error ? caught.message : 'Could not access the camera'
      isActive.value = false
    }
  }

  function stop(): void {
    stream?.getTracks().forEach((track) => track.stop())
    stream = null

    if (videoRef.value) {
      videoRef.value.srcObject = null
    }

    isActive.value = false
  }

  onUnmounted(stop)

  return { isActive, error, start, stop }
}
