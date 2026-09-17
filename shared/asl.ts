export type Point3 = {
  x: number
  y: number
  z: number
}

export type Handedness = 'Left' | 'Right'

export type TrackedHand = {
  handedness: Handedness
  landmarks: Point3[]
}

export type AslKind = 'static' | 'motion'

export type AslSign = {
  id: string
  title: string
  kind: AslKind
  group: 'alphabet' | 'phrase' | 'custom'
  hint: string
}

export type AslSample = {
  id: string
  label: string
  createdAt: string
  hands: TrackedHand[]
  features?: number[]
}

export type AslFeatureSample = {
  label: string
  features: number[]
}

export type AslModel = {
  k: number
  trainedAt: string
  sampleCount: number
  accuracy: number | null
  counts: Record<string, number>
  samples: AslFeatureSample[]
}

export type AslPrediction = {
  label: string
  confidence: number
  distance: number
}

export const LANDMARKS_PER_HAND = 21
export const POSE_SIZE = LANDMARKS_PER_HAND * 3
export const FEATURE_SIZE = POSE_SIZE * 2 + 10
export const RECOMMENDED_SAMPLES = 24
export const MIN_RECORD_FRAMES = 10
export const MODEL_K = 5

export type AslDataset = {
  version: number
  customLabels: string[]
  samples: AslSample[]
}

const FINGERTIPS = [4, 8, 12, 16, 20]

export const ASL_SIGNS: AslSign[] = [
  { id: 'A', title: 'A', kind: 'static', group: 'alphabet', hint: 'Fist. Thumb rests along the side of the index finger.' },
  { id: 'B', title: 'B', kind: 'static', group: 'alphabet', hint: 'Flat hand, fingers together and up. Thumb folded across the palm.' },
  { id: 'C', title: 'C', kind: 'static', group: 'alphabet', hint: 'Curve the fingers and thumb into a C.' },
  { id: 'D', title: 'D', kind: 'static', group: 'alphabet', hint: 'Index finger up. Other fingers touch the thumb.' },
  { id: 'E', title: 'E', kind: 'static', group: 'alphabet', hint: 'Fingertips curl down onto the thumb.' },
  { id: 'F', title: 'F', kind: 'static', group: 'alphabet', hint: 'Thumb and index touch. Other three fingers point up.' },
  { id: 'G', title: 'G', kind: 'static', group: 'alphabet', hint: 'Index and thumb point sideways, parallel to the floor.' },
  { id: 'H', title: 'H', kind: 'static', group: 'alphabet', hint: 'Index and middle fingers out together, pointing sideways.' },
  { id: 'I', title: 'I', kind: 'static', group: 'alphabet', hint: 'Pinky up. Other fingers folded.' },
  { id: 'J', title: 'J', kind: 'motion', group: 'alphabet', hint: 'Start like I, then draw a J in the air with the pinky.' },
  { id: 'K', title: 'K', kind: 'static', group: 'alphabet', hint: 'Index and middle up. Thumb touches the middle finger.' },
  { id: 'L', title: 'L', kind: 'static', group: 'alphabet', hint: 'Index up and thumb out, making an L.' },
  { id: 'M', title: 'M', kind: 'static', group: 'alphabet', hint: 'Thumb under the first three fingers.' },
  { id: 'N', title: 'N', kind: 'static', group: 'alphabet', hint: 'Thumb under the first two fingers.' },
  { id: 'O', title: 'O', kind: 'static', group: 'alphabet', hint: 'Fingers and thumb form a round O.' },
  { id: 'P', title: 'P', kind: 'static', group: 'alphabet', hint: 'Like K, but pointing down.' },
  { id: 'Q', title: 'Q', kind: 'static', group: 'alphabet', hint: 'Like G, but pointing down.' },
  { id: 'R', title: 'R', kind: 'static', group: 'alphabet', hint: 'Index and middle fingers crossed.' },
  { id: 'S', title: 'S', kind: 'static', group: 'alphabet', hint: 'Fist with the thumb wrapping over the fingers.' },
  { id: 'T', title: 'T', kind: 'static', group: 'alphabet', hint: 'Thumb tucked under the index finger.' },
  { id: 'U', title: 'U', kind: 'static', group: 'alphabet', hint: 'Index and middle up together.' },
  { id: 'V', title: 'V', kind: 'static', group: 'alphabet', hint: 'Index and middle up in a V.' },
  { id: 'W', title: 'W', kind: 'static', group: 'alphabet', hint: 'Index, middle, and ring fingers up.' },
  { id: 'X', title: 'X', kind: 'static', group: 'alphabet', hint: 'Index finger hooked. Other fingers folded.' },
  { id: 'Y', title: 'Y', kind: 'static', group: 'alphabet', hint: 'Thumb and pinky out. Other fingers folded.' },
  { id: 'Z', title: 'Z', kind: 'motion', group: 'alphabet', hint: 'Draw a Z in the air with the index finger.' },
  { id: 'HELLO', title: 'HELLO', kind: 'motion', group: 'phrase', hint: 'Open hand at the temple, then a small wave.' },
  { id: 'YES', title: 'YES', kind: 'motion', group: 'phrase', hint: 'Fist nods up and down, like a head nodding.' },
  { id: 'NO', title: 'NO', kind: 'motion', group: 'phrase', hint: 'Index and middle close onto the thumb twice.' },
  { id: 'THANK_YOU', title: 'THANK YOU', kind: 'motion', group: 'phrase', hint: 'Flat hand at the chin, then move it forward.' },
  { id: 'PLEASE', title: 'PLEASE', kind: 'motion', group: 'phrase', hint: 'Open hand circles on the chest.' },
  { id: 'ILOVEYOU', title: 'I LOVE YOU', kind: 'static', group: 'phrase', hint: 'Thumb, index, and pinky up. Other fingers down.' },
  { id: 'HELP', title: 'HELP', kind: 'motion', group: 'phrase', hint: 'Fist of one hand sits on the other palm, then lift.' },
  { id: 'MORE', title: 'MORE', kind: 'motion', group: 'phrase', hint: 'Fingertips of both hands tap together.' },
  { id: 'STOP', title: 'STOP', kind: 'static', group: 'phrase', hint: 'One flat hand chops down onto the other palm.' },
]

export function customSign(id: string): AslSign {
  const title = id.trim().toUpperCase()
  return {
    id: title,
    title,
    kind: 'motion',
    group: 'custom',
    hint: 'Hold or perform the sign while recording several takes.',
  }
}

export function extractFeatures(hands: TrackedHand[], previous?: TrackedHand[]): number[] {
  const right = hands.find((hand) => hand.handedness === 'Right')
  const left = hands.find((hand) => hand.handedness === 'Left')
  const motionHand = right ?? left
  const previousHand = previous?.find((hand) => hand.handedness === motionHand?.handedness) ?? previous?.[0]

  return [
    ...handPose(right, false),
    ...handPose(left, true),
    ...fingertipMotion(motionHand, previousHand),
  ]
}

export function knnPredict(features: number[], model: AslModel): AslPrediction | null {
  if (model.samples.length === 0) {
    return null
  }

  const k = Math.min(model.k, model.samples.length)
  const nearest = model.samples
    .map((sample) => ({
      label: sample.label,
      distance: euclidean(features, sample.features),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k)

  const votes = new Map<string, { count: number; distance: number }>()
  for (const neighbor of nearest) {
    const current = votes.get(neighbor.label) ?? { count: 0, distance: 0 }
    current.count += 1
    current.distance += neighbor.distance
    votes.set(neighbor.label, current)
  }

  let bestLabel = nearest[0]?.label
  let bestScore = -Infinity
  let bestDistance = nearest[0]?.distance ?? Number.POSITIVE_INFINITY

  for (const [label, vote] of votes) {
    const averageDistance = vote.distance / vote.count
    const score = vote.count / k - averageDistance * 0.12
    if (score > bestScore) {
      bestScore = score
      bestLabel = label
      bestDistance = averageDistance
    }
  }

  if (!bestLabel || bestDistance > 2.4) {
    return null
  }

  const winningVotes = votes.get(bestLabel)?.count ?? 0
  const confidence = Math.max(0, Math.min(1, (winningVotes / k) * (1 / (1 + bestDistance))))
  if (confidence < 0.22) {
    return null
  }

  return { label: bestLabel, confidence, distance: bestDistance }
}

export function estimateAccuracy(samples: AslFeatureSample[], k: number): number | null {
  if (samples.length < 8) {
    return null
  }

  const labels = new Set(samples.map((sample) => sample.label))
  if (labels.size < 2) {
    return null
  }

  const limit = Math.min(samples.length, 360)
  const stride = Math.max(1, Math.floor(samples.length / limit))
  let correct = 0
  let tested = 0

  for (let index = 0; index < samples.length && tested < limit; index += stride) {
    const holdout = samples[index]
    const model: AslModel = {
      k,
      trainedAt: '',
      sampleCount: samples.length - 1,
      accuracy: null,
      counts: {},
      samples: samples.filter((_, sampleIndex) => sampleIndex !== index),
    }
    const prediction = knnPredict(holdout.features, model)
    tested += 1
    if (prediction?.label === holdout.label) {
      correct += 1
    }
  }

  return tested === 0 ? null : correct / tested
}

export function emptyDataset(): AslDataset {
  return { version: 1, customLabels: [], samples: [] }
}

export function normalizeLabel(label: string): string {
  return label.trim().toUpperCase().replace(/\s+/g, ' ')
}

export function countSamples(samples: AslSample[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const sample of samples) {
    counts[sample.label] = (counts[sample.label] ?? 0) + 1
  }
  return counts
}

export function subsample<T>(items: T[], max: number): T[] {
  if (items.length <= max) {
    return items
  }

  const step = items.length / max
  return Array.from({ length: max }, (_, index) => items[Math.min(items.length - 1, Math.floor(index * step))])
}

export function sanitizeHands(hands: TrackedHand[]): TrackedHand[] {
  return hands
    .filter((hand) => hand.landmarks.length === 21)
    .map((hand) => ({
      handedness: hand.handedness === 'Left' ? 'Left' : 'Right',
      landmarks: hand.landmarks.map((point) => ({
        x: round(point.x),
        y: round(point.y),
        z: round(point.z ?? 0),
      })),
    }))
}

export function framesToSamples(label: string, frames: TrackedHand[][]): AslSample[] {
  const normalized = normalizeLabel(label)
  const sampled = subsample(
    frames.filter((hands) => hands.some((hand) => hand.landmarks.length === 21)),
    36,
  )
  const createdAt = new Date().toISOString()

  return sampled.map((hands, index) => {
    const current = sanitizeHands(hands)
    const previous = index > 0 ? sanitizeHands(sampled[index - 1]) : undefined
    return {
      id: crypto.randomUUID(),
      label: normalized,
      createdAt,
      hands: current,
      features: extractFeatures(current, previous).map(round),
    }
  })
}

export function buildModel(dataset: AslDataset, withAccuracy = false): AslModel {
  const samples = dataset.samples
    .map((sample) => ({
      label: sample.label,
      features:
        sample.features?.length === FEATURE_SIZE
          ? sample.features
          : extractFeatures(sample.hands),
    }))
    .filter((sample) => sample.features.length === FEATURE_SIZE)

  return {
    k: MODEL_K,
    trainedAt: new Date().toISOString(),
    sampleCount: samples.length,
    accuracy: withAccuracy ? estimateAccuracy(samples, MODEL_K) : null,
    counts: countSamples(dataset.samples),
    samples,
  }
}

function round(value: number): number {
  return Math.round(value * 1e5) / 1e5
}

function handPose(hand: TrackedHand | undefined, flipX: boolean): number[] {
  const pose = Array.from({ length: POSE_SIZE }, () => 0)
  if (!hand || hand.landmarks.length < LANDMARKS_PER_HAND) {
    return pose
  }

  const wrist = hand.landmarks[0]
  const palm = hand.landmarks[9]
  const scale = Math.max(
    1e-6,
    Math.hypot(palm.x - wrist.x, palm.y - wrist.y, palm.z - wrist.z),
  )

  for (let index = 0; index < LANDMARKS_PER_HAND; index += 1) {
    const point = hand.landmarks[index]
    const x = (point.x - wrist.x) / scale
    pose[index * 3] = flipX ? -x : x
    pose[index * 3 + 1] = (point.y - wrist.y) / scale
    pose[index * 3 + 2] = (point.z - wrist.z) / scale
  }

  return pose
}

function fingertipMotion(current?: TrackedHand, previous?: TrackedHand): number[] {
  const motion = Array.from({ length: 10 }, () => 0)
  if (!current || !previous || current.landmarks.length < 21 || previous.landmarks.length < 21) {
    return motion
  }

  for (const [index, tip] of FINGERTIPS.entries()) {
    motion[index * 2] = current.landmarks[tip].x - previous.landmarks[tip].x
    motion[index * 2 + 1] = current.landmarks[tip].y - previous.landmarks[tip].y
  }

  return motion
}

function euclidean(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length)
  let sum = 0
  for (let index = 0; index < length; index += 1) {
    const delta = a[index] - b[index]
    sum += delta * delta
  }
  return Math.sqrt(sum)
}
