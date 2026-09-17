import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import {
  ASL_SIGNS,
  FEATURE_SIZE,
  estimateAccuracy,
  extractFeatures,
  type AslDataset,
  type AslModel,
  type AslSample,
  type AslSign,
  type TrackedHand,
} from '../shared/asl.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, 'data')
const DATASET_PATH = join(DATA_DIR, 'asl-dataset.json')
const MODEL_PATH = join(DATA_DIR, 'asl-model.json')
const K = 5

type Dataset = {
  version: number
  customLabels: string[]
  samples: AslSample[]
}

const emptyDataset = (): Dataset => ({
  version: 1,
  customLabels: [],
  samples: [],
})

export async function getSummary(): Promise<{
  counts: Record<string, number>
  customLabels: string[]
  signs: AslSign[]
  model: Pick<AslModel, 'trainedAt' | 'sampleCount' | 'accuracy' | 'counts'> | null
}> {
  const dataset = await readDataset()
  const model = await readModel()
  return {
    counts: countSamples(dataset.samples),
    customLabels: dataset.customLabels,
    signs: ASL_SIGNS,
    model: model
      ? {
          trainedAt: model.trainedAt,
          sampleCount: model.sampleCount,
          accuracy: model.accuracy,
          counts: model.counts,
        }
      : null,
  }
}

export async function getDataset(): Promise<AslDataset> {
  return readDataset()
}

export async function getModel(): Promise<AslModel | null> {
  return readModel()
}

export async function addCustomLabel(rawLabel: string): Promise<string> {
  const label = normalizeLabel(rawLabel)
  if (!label) {
    throw new Error('Sign name is required')
  }

  const dataset = await readDataset()
  if (!dataset.customLabels.includes(label) && !ASL_SIGNS.some((sign) => sign.id === label)) {
    dataset.customLabels.push(label)
    await writeDataset(dataset)
  }

  return label
}

export async function addSamples(label: string, frames: TrackedHand[][]): Promise<{ saved: number; counts: Record<string, number> }> {
  const normalized = normalizeLabel(label)
  if (!normalized) {
    throw new Error('A sign label is required')
  }

  const validFrames = frames.filter((hands) => hands.some((hand) => hand.landmarks.length === 21))
  if (validFrames.length === 0) {
    throw new Error('No usable hand frames were captured')
  }

  const dataset = await readDataset()
  const createdAt = new Date().toISOString()
  const sampled = subsample(validFrames, 36)

  for (const [index, hands] of sampled.entries()) {
    const current = sanitizeHands(hands)
    const previous = index > 0 ? sanitizeHands(sampled[index - 1]) : undefined
    dataset.samples.push({
      id: randomUUID(),
      label: normalized,
      createdAt,
      hands: current,
      features: extractFeatures(current, previous),
    })
  }

  if (!ASL_SIGNS.some((sign) => sign.id === normalized) && !dataset.customLabels.includes(normalized)) {
    dataset.customLabels.push(normalized)
  }

  await writeDataset(dataset)
  await trainModel()
  return { saved: sampled.length, counts: countSamples(dataset.samples) }
}

export async function deleteLabel(label: string): Promise<Record<string, number>> {
  const dataset = await readDataset()
  dataset.samples = dataset.samples.filter((sample) => sample.label !== label)
  dataset.customLabels = dataset.customLabels.filter((custom) => custom !== label)
  await writeDataset(dataset)
  await trainModel()
  return countSamples(dataset.samples)
}

export async function trainModel(): Promise<AslModel> {
  const dataset = await readDataset()
  const samples = dataset.samples
    .map((sample) => ({
      label: sample.label,
      features:
        sample.features?.length === FEATURE_SIZE
          ? sample.features
          : extractFeatures(sample.hands),
    }))
    .filter((sample) => sample.features.length === FEATURE_SIZE)

  const model: AslModel = {
    k: K,
    trainedAt: new Date().toISOString(),
    sampleCount: samples.length,
    accuracy: estimateAccuracy(samples, K),
    counts: countSamples(dataset.samples),
    samples,
  }

  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(MODEL_PATH, JSON.stringify(model), 'utf8')
  return model
}

async function readDataset(): Promise<Dataset> {
  try {
    const raw = await readFile(DATASET_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Dataset
    return {
      version: 1,
      customLabels: Array.isArray(parsed.customLabels) ? parsed.customLabels : [],
      samples: Array.isArray(parsed.samples) ? parsed.samples : [],
    }
  } catch {
    return emptyDataset()
  }
}

async function writeDataset(dataset: Dataset): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(DATASET_PATH, JSON.stringify(dataset), 'utf8')
}

async function readModel(): Promise<AslModel | null> {
  try {
    return JSON.parse(await readFile(MODEL_PATH, 'utf8')) as AslModel
  } catch {
    return null
  }
}

function countSamples(samples: AslSample[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const sample of samples) {
    counts[sample.label] = (counts[sample.label] ?? 0) + 1
  }
  return counts
}

function normalizeLabel(label: string): string {
  return label.trim().toUpperCase().replace(/\s+/g, ' ')
}

function subsample<T>(items: T[], max: number): T[] {
  if (items.length <= max) {
    return items
  }

  const step = items.length / max
  return Array.from({ length: max }, (_, index) => items[Math.min(items.length - 1, Math.floor(index * step))])
}

function sanitizeHands(hands: TrackedHand[]): TrackedHand[] {
  return hands
    .filter((hand) => hand.landmarks.length === 21)
    .map((hand) => ({
      handedness: hand.handedness === 'Left' ? 'Left' : 'Right',
      landmarks: hand.landmarks.map((point) => ({
        x: Number(point.x),
        y: Number(point.y),
        z: Number(point.z ?? 0),
      })),
    }))
}
