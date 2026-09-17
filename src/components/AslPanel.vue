<script setup lang="ts">
import { onUnmounted, reactive } from 'vue'
import { useAsl } from '../composables/useAsl'

const asl = reactive(useAsl())
let recordingPointer = false

defineExpose({
  onFrame: asl.onFrame,
})

function onRecordPointerDown(event: PointerEvent): void {
  event.preventDefault()
  recordingPointer = true
  asl.startRecording()
  window.addEventListener('pointerup', onRecordPointerUp)
  window.addEventListener('pointercancel', onRecordPointerUp)
}

function onRecordPointerUp(): void {
  if (!recordingPointer) {
    return
  }

  recordingPointer = false
  window.removeEventListener('pointerup', onRecordPointerUp)
  window.removeEventListener('pointercancel', onRecordPointerUp)
  void asl.stopRecording()
}

onUnmounted(() => {
  window.removeEventListener('pointerup', onRecordPointerUp)
  window.removeEventListener('pointercancel', onRecordPointerUp)
})
</script>

<template>
  <aside class="dock">
    <div class="modes">
      <button type="button" :class="{ active: asl.mode === 'train' }" @click="asl.setMode('train')">
        Train
      </button>
      <button
        type="button"
        :class="{ active: asl.mode === 'practice' }"
        :disabled="!asl.modelReady"
        @click="asl.setMode('practice')"
      >
        Practice
      </button>
    </div>

    <p class="message">{{ asl.message }}</p>

    <div v-if="asl.mode === 'practice'" class="practice">
      <div class="guess">
        <span class="guess-label">Reading</span>
        <strong>{{ asl.prediction ?? '…' }}</strong>
        <em v-if="asl.prediction">{{ Math.round(asl.confidence * 100) }}%</em>
      </div>
      <p class="sentence">{{ asl.sentence || 'Signs will appear here.' }}</p>
      <div class="row">
        <button type="button" @click="asl.backspace">Delete</button>
        <button type="button" @click="asl.clearSentence">Clear</button>
      </div>
    </div>

    <template v-else>
      <div class="selected">
        <div>
          <p class="kicker">{{ asl.selected.kind === 'motion' ? 'Motion sign' : 'Handshape' }}</p>
          <h2>{{ asl.selected.title }}</h2>
        </div>
        <p class="count">
          {{ asl.selectedCount }}
          <span>/ {{ asl.recommended }}</span>
        </p>
      </div>

      <div class="progress">
        <i :style="{ width: `${Math.min(100, (asl.selectedCount / asl.recommended) * 100)}%` }"></i>
      </div>

      <button
        class="record"
        type="button"
        :class="{ live: asl.recording }"
        :disabled="asl.busy"
        @pointerdown="onRecordPointerDown"
      >
        {{ asl.recording ? `Recording ${asl.recordFrames}` : 'Hold to record' }}
      </button>

      <div class="row">
        <button type="button" :disabled="asl.busy || asl.selectedCount === 0" @click="asl.removeSelectedSamples">
          Clear sign
        </button>
        <button type="button" :disabled="asl.busy || asl.sampleCount === 0" @click="asl.retrain">
          Retrain
        </button>
      </div>

      <p v-if="asl.accuracy !== null" class="meta">
        Saved on this device · {{ Math.round(asl.accuracy * 100) }}% · {{ asl.sampleCount }} samples
      </p>
      <p v-else class="meta">
        Samples stay on this device. Record at least two signs, then practice.
      </p>

      <div class="grid" role="listbox" aria-label="ASL alphabet">
        <button
          v-for="sign in asl.alphabet"
          :key="sign.id"
          type="button"
          :class="{ active: asl.selectedId === sign.id, ready: (asl.counts[sign.id] ?? 0) >= asl.recommended }"
          @click="asl.selectSign(sign.id)"
        >
          {{ sign.title }}
        </button>
      </div>

      <div class="phrases">
        <button
          v-for="sign in asl.phrases"
          :key="sign.id"
          type="button"
          :class="{ active: asl.selectedId === sign.id }"
          @click="asl.selectSign(sign.id)"
        >
          {{ sign.title }}
        </button>
      </div>

      <form class="custom" @submit.prevent="asl.addCustom">
        <input v-model="asl.customName" type="text" maxlength="24" placeholder="Custom sign" />
        <button type="submit" :disabled="asl.busy || !asl.customName.trim()">Add</button>
      </form>
    </template>
  </aside>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.dock {
  position: absolute;
  z-index: 3;
  top: 16px;
  right: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(340px, calc(100vw - 24px));
  padding: 16px;
  overflow: auto;
  border: 1px solid $border;
  border-radius: $radius;
  color: $text;
  background: rgba(16, 20, 26, 0.82);
  box-shadow: $shadow;
  backdrop-filter: blur(16px);
}

.modes,
.row,
.custom,
.phrases {
  display: flex;
  gap: 8px;
}

.modes button,
.row button,
.custom button,
.phrases button,
.grid button {
  border: 1px solid $border;
  color: $text;
  background: $bg-panel;
  cursor: pointer;
}

.modes button,
.row button,
.record,
.custom button {
  border-radius: 999px;
}

.modes button {
  flex: 1;
  padding: 10px 12px;
  font-weight: 700;
}

button.active,
.grid button.active,
.phrases button.active {
  color: $accent;
  background: $accent-dim;
  border-color: rgba($accent, 0.45);
}

.message,
.meta,
.kicker,
.sentence {
  margin: 0;
  color: $muted;
}

.message,
.hint {
  line-height: 1.45;
}

.selected,
.guess {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

h2,
.guess strong {
  margin: 0;
  font-size: 2rem;
  line-height: 1;
}

.kicker {
  margin-bottom: 4px;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.count {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
}

.count span,
.guess em {
  color: $muted;
  font-style: normal;
  font-size: 0.9rem;
  font-weight: 500;
}

.progress {
  overflow: hidden;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.progress i {
  display: block;
  height: 100%;
  background: $accent;
}

.record {
  width: 100%;
  padding: 14px 16px;
  border: 0;
  color: #08251c;
  font-weight: 800;
  background: $accent;
  touch-action: none;
  user-select: none;
}

.record.live {
  color: $text;
  background: $danger;
}

.row button {
  flex: 1;
  padding: 9px 10px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.grid button {
  aspect-ratio: 1;
  border-radius: 10px;
  font-weight: 700;
}

.grid button.ready {
  box-shadow: inset 0 0 0 1px $accent;
}

.phrases {
  flex-wrap: wrap;
}

.phrases button,
.custom button,
.custom input {
  padding: 8px 10px;
  border-radius: 999px;
}

.custom input {
  flex: 1;
  min-width: 0;
  border: 1px solid $border;
  color: $text;
  background: $bg-elevated;
}

.practice {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sentence {
  min-height: 4.5rem;
  padding: 12px;
  border-radius: 14px;
  color: $text;
  background: rgba(0, 0, 0, 0.28);
  line-height: 1.5;
  word-break: break-word;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
</style>
