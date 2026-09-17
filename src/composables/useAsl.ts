import { computed, onMounted, ref } from 'vue'
import {
  ASL_SIGNS,
  MIN_RECORD_FRAMES,
  RECOMMENDED_SAMPLES,
  countSamples,
  customSign,
  emptyDataset,
  extractFeatures,
  knnPredict,
  type AslDataset,
  type AslModel,
  type AslSign,
  type TrackedHand,
} from '../../shared/asl'
import {
  addLocalLabel,
  addLocalSamples,
  deleteLocalLabel,
  loadDataset,
  loadModel,
  persistDataset,
  retrainLocal,
} from '../lib/aslStorage'

export function useAsl() {
  const mode = ref<'train' | 'practice'>('train')
  const selectedId = ref('A')
  const counts = ref<Record<string, number>>({})
  const customLabels = ref<string[]>([])
  const recording = ref(false)
  const recordFrames = ref(0)
  const busy = ref(false)
  const message = ref('Choose a sign, then hold Record while you make it.')
  const prediction = ref<string | null>(null)
  const confidence = ref(0)
  const sentence = ref('')
  const accuracy = ref<number | null>(null)
  const sampleCount = ref(0)
  const customName = ref('')
  const hasModel = ref(false)

  let dataset: AslDataset = emptyDataset()
  let model: AslModel | null = null
  let previousHands: TrackedHand[] | undefined
  let capture: TrackedHand[][] = []
  const recentVotes: string[] = []
  let lastCommitted = ''
  let lastCommitAt = 0

  const signs = computed<AslSign[]>(() => [
    ...ASL_SIGNS,
    ...customLabels.value.map((label) => customSign(label)),
  ])

  const selected = computed(
    () => signs.value.find((sign) => sign.id === selectedId.value) ?? signs.value[0],
  )

  const alphabet = computed(() => signs.value.filter((sign) => sign.group === 'alphabet'))
  const phrases = computed(() => signs.value.filter((sign) => sign.group !== 'alphabet'))
  const selectedCount = computed(() => counts.value[selectedId.value] ?? 0)
  const modelReady = computed(
    () => hasModel.value && Object.keys(counts.value).length >= 2,
  )

  onMounted(() => {
    refresh()
  })

  function onFrame(hands: TrackedHand[]): void {
    if (recording.value && hands.length > 0) {
      capture.push(hands)
      recordFrames.value = capture.length
    }

    if (mode.value === 'practice' && model && hands.length > 0) {
      const result = knnPredict(extractFeatures(hands, previousHands), model)
      stabilize(result?.label ?? null, result?.confidence ?? 0)
    } else if (mode.value === 'practice' && hands.length === 0) {
      prediction.value = null
      confidence.value = 0
    }

    previousHands = hands
  }

  function startRecording(): void {
    if (busy.value) {
      return
    }

    capture = []
    recordFrames.value = 0
    recording.value = true
    message.value =
      selected.value.kind === 'motion'
        ? `Perform ${selected.value.title} until the take finishes.`
        : `Hold ${selected.value.title} steady.`
  }

  function stopRecording(): void {
    if (!recording.value) {
      return
    }

    recording.value = false
    const frames = capture
    capture = []
    recordFrames.value = 0

    if (frames.length < MIN_RECORD_FRAMES) {
      message.value = 'Hold the sign a little longer, then record again.'
      return
    }

    busy.value = true
    try {
      const result = addLocalSamples(dataset, selectedId.value, frames)
      applyState(result.dataset, result.model)
      message.value = `Saved ${result.saved} frames for ${selected.value.title} on this device.`
    } catch (error) {
      message.value = error instanceof Error ? error.message : 'Could not save that take.'
    } finally {
      busy.value = false
    }
  }

  function removeSelectedSamples(): void {
    busy.value = true
    try {
      const result = deleteLocalLabel(dataset, selectedId.value)
      applyState(result.dataset, result.model)
      message.value = `Cleared ${selected.value.title} from this device.`
    } catch (error) {
      message.value = error instanceof Error ? error.message : 'Could not delete samples.'
    } finally {
      busy.value = false
    }
  }

  function addCustom(): void {
    const label = customName.value.trim()
    if (!label) {
      return
    }

    try {
      const result = addLocalLabel(dataset, label)
      applyState(result.dataset, model ?? persistDataset(result.dataset))
      selectedId.value = result.label
      customName.value = ''
      message.value = `Added ${result.label}. Record several takes of it.`
    } catch (error) {
      message.value = error instanceof Error ? error.message : 'Could not add that sign.'
    }
  }

  function retrain(): void {
    busy.value = true
    try {
      applyState(dataset, retrainLocal(dataset))
      message.value = modelReady.value
        ? 'Model updated from saved samples. Switch to Practice to test it.'
        : 'Record more signs before practicing.'
    } catch (error) {
      message.value = error instanceof Error ? error.message : 'Training failed.'
    } finally {
      busy.value = false
    }
  }

  function selectSign(id: string): void {
    selectedId.value = id
    const sign = signs.value.find((item) => item.id === id)
    if (sign) {
      message.value = sign.hint
    }
  }

  function setMode(next: 'train' | 'practice'): void {
    mode.value = next
    prediction.value = null
    recentVotes.length = 0
    message.value =
      next === 'practice'
        ? modelReady.value
          ? 'Make a sign. The overlay will spell what it sees.'
          : 'Train at least two signs before practicing.'
        : selected.value.hint
  }

  function backspace(): void {
    sentence.value = sentence.value.slice(0, -1)
  }

  function clearSentence(): void {
    sentence.value = ''
    lastCommitted = ''
  }

  function refresh(): void {
    dataset = loadDataset()
    model = loadModel()
    if (dataset.samples.length === 0) {
      void importFromServer()
      return
    }

    applyState(dataset, model ?? persistDataset(dataset))
  }

  async function importFromServer(): Promise<void> {
    try {
      const response = await fetch('/api/asl/dataset')
      if (!response.ok) {
        applyState(dataset, model)
        return
      }

      const remote = (await response.json()) as AslDataset | null
      if (!remote?.samples?.length) {
        applyState(dataset, model)
        return
      }

      applyState(remote, persistDataset(remote))
      message.value = 'Restored training data onto this device.'
    } catch {
      applyState(dataset, model)
    }
  }

  function applyState(nextDataset: AslDataset, nextModel: AslModel | null): void {
    dataset = nextDataset
    model = nextModel && nextModel.sampleCount > 0 ? nextModel : null
    customLabels.value = nextDataset.customLabels
    counts.value = nextModel?.counts ?? countSamples(nextDataset.samples)
    sampleCount.value = nextModel?.sampleCount ?? nextDataset.samples.length
    accuracy.value = nextModel?.accuracy ?? null
    hasModel.value = Boolean(model)
  }

  function stabilize(label: string | null, score: number): void {
    recentVotes.push(label ?? '')
    if (recentVotes.length > 14) {
      recentVotes.shift()
    }

    if (!label) {
      prediction.value = null
      confidence.value = 0
      return
    }

    const tally = new Map<string, number>()
    for (const vote of recentVotes) {
      if (vote) {
        tally.set(vote, (tally.get(vote) ?? 0) + 1)
      }
    }

    let winner = label
    let winnerCount = 0
    for (const [vote, count] of tally) {
      if (count > winnerCount) {
        winner = vote
        winnerCount = count
      }
    }

    const stable = winnerCount >= 8
    prediction.value = stable ? winner : null
    confidence.value = stable ? Math.max(score, winnerCount / recentVotes.length) : score

    if (!stable) {
      return
    }

    const now = performance.now()
    const isLetter = winner.length === 1
    const cooldown = isLetter ? 850 : 1400
    if (winner === lastCommitted && now - lastCommitAt < cooldown + 400) {
      return
    }
    if (now - lastCommitAt < cooldown) {
      return
    }

    lastCommitted = winner
    lastCommitAt = now
    if (isLetter) {
      sentence.value += winner
      return
    }

    const prefix = sentence.value.length === 0 || sentence.value.endsWith(' ') ? '' : ' '
    sentence.value += `${prefix}${winner} `
  }

  return {
    mode,
    selectedId,
    selected,
    selectedCount,
    counts,
    alphabet,
    phrases,
    recording,
    recordFrames,
    busy,
    message,
    prediction,
    confidence,
    sentence,
    accuracy,
    sampleCount,
    customName,
    modelReady,
    recommended: RECOMMENDED_SAMPLES,
    onFrame,
    startRecording,
    stopRecording,
    removeSelectedSamples,
    addCustom,
    retrain,
    selectSign,
    setMode,
    backspace,
    clearSentence,
  }
}
