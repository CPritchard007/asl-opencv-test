import type { Landmark } from '../lib/hands'
import type { TrackedHand } from '../../shared/asl'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

function wasmUrl(): string {
  if (import.meta.env.PROD) {
    return 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm/'
  }

  return new URL(`${import.meta.env.BASE_URL}mediapipe-wasm/`, document.baseURI).href
}

export type HandFrame = {
  hands: TrackedHand[]
  landmarks: Landmark[][]
}

export async function createHandLandmarker(): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(wasmUrl())

  try {
    return await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.55,
      minTrackingConfidence: 0.55,
    })
  } catch {
    return HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
    })
  }
}

export function detectHands(
  landmarker: HandLandmarker,
  video: HTMLVideoElement,
  timestamp: number,
): HandFrame {
  const result = landmarker.detectForVideo(video, timestamp)
  const landmarks = (result.landmarks ?? []).map((hand) =>
    hand.map((point) => ({ x: point.x, y: point.y })),
  )
  const handednessLists = result.handedness ?? result.handednesses ?? []

  const hands: TrackedHand[] = (result.landmarks ?? []).map((hand, index) => ({
    handedness: handednessLists[index]?.[0]?.categoryName === 'Left' ? 'Left' : 'Right',
    landmarks: hand.map((point) => ({
      x: point.x,
      y: point.y,
      z: point.z ?? 0,
    })),
  }))

  return { hands, landmarks }
}
