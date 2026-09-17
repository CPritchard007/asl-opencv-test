import {
  ASL_SIGNS,
  buildModel,
  emptyDataset,
  framesToSamples,
  normalizeLabel,
  type AslDataset,
  type AslModel,
  type TrackedHand,
} from '../../shared/asl'

const DATASET_KEY = 'asl.dataset.v1'
const MODEL_KEY = 'asl.model.v1'

export function loadDataset(): AslDataset {
  const stored = readJson<AslDataset>(DATASET_KEY)
  if (!stored) {
    return emptyDataset()
  }

  return {
    version: 1,
    customLabels: Array.isArray(stored.customLabels) ? stored.customLabels : [],
    samples: Array.isArray(stored.samples) ? stored.samples : [],
  }
}

export function loadModel(): AslModel | null {
  const stored = readJson<AslModel>(MODEL_KEY)
  if (!stored || !Array.isArray(stored.samples) || stored.sampleCount <= 0) {
    return null
  }

  return stored
}

export function persistDataset(dataset: AslDataset): AslModel {
  const model = buildModel(dataset)
  writeJson(DATASET_KEY, dataset)
  writeJson(MODEL_KEY, model)
  return model
}

export function addLocalSamples(dataset: AslDataset, label: string, frames: TrackedHand[][]): {
  dataset: AslDataset
  model: AslModel
  saved: number
} {
  const samples = framesToSamples(label, frames)
  if (samples.length === 0) {
    throw new Error('No usable hand frames were captured')
  }

  const next: AslDataset = {
    version: 1,
    customLabels: withCustomLabel(dataset.customLabels, samples[0].label),
    samples: [...dataset.samples, ...samples],
  }

  return { dataset: next, model: persistDataset(next), saved: samples.length }
}

export function deleteLocalLabel(dataset: AslDataset, label: string): { dataset: AslDataset; model: AslModel } {
  const next: AslDataset = {
    version: 1,
    customLabels: dataset.customLabels.filter((custom) => custom !== label),
    samples: dataset.samples.filter((sample) => sample.label !== label),
  }

  return { dataset: next, model: persistDataset(next) }
}

export function addLocalLabel(dataset: AslDataset, rawLabel: string): { dataset: AslDataset; label: string } {
  const label = normalizeLabel(rawLabel)
  if (!label) {
    throw new Error('Sign name is required')
  }

  const next: AslDataset = {
    ...dataset,
    customLabels: withCustomLabel(dataset.customLabels, label),
  }
  persistDataset(next)
  return { dataset: next, label }
}

export function retrainLocal(dataset: AslDataset): AslModel {
  const model = buildModel(dataset, true)
  writeJson(MODEL_KEY, model)
  return model
}

function withCustomLabel(customLabels: string[], label: string): string[] {
  if (ASL_SIGNS.some((sign) => sign.id === label) || customLabels.includes(label)) {
    return customLabels
  }

  return [...customLabels, label]
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  const encoded = JSON.stringify(value)
  try {
    localStorage.setItem(key, encoded)
  } catch {
    if (key !== DATASET_KEY || !isDataset(value)) {
      throw new Error('This browser is out of local storage space for training data.')
    }

    const compact: AslDataset = {
      ...value,
      samples: value.samples.map((sample) => ({
        id: sample.id,
        label: sample.label,
        createdAt: sample.createdAt,
        hands: [],
        features: sample.features,
      })),
    }
    localStorage.setItem(key, JSON.stringify(compact))
  }
}

function isDataset(value: unknown): value is AslDataset {
  return Boolean(value && typeof value === 'object' && 'samples' in value)
}
