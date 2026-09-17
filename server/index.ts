import express from 'express'
import { createServer } from 'node:http'
import { WebSocketServer, type RawData, type WebSocket } from 'ws'
import { loadOpenCv, processFrame } from './opencv.ts'
import { FILTER_MODES, type ClientMessage, type FilterMode } from '../shared/types.ts'
import {
  addCustomLabel,
  addSamples,
  deleteLabel,
  getDataset,
  getModel,
  getSummary,
  trainModel,
} from './asl.ts'
import type { TrackedHand } from '../shared/asl.ts'

const PORT = Number(process.env.PORT) || 3001

const app = express()
app.use(express.json({ limit: '12mb' }))
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })
const opencvReady = loadOpenCv()

app.get('/api/health', async (_req, res) => {
  try {
    await opencvReady
    res.json({ ok: true, opencv: true })
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'OpenCV failed to load',
    })
  }
})

app.get('/api/asl/summary', async (_req, res) => {
  try {
    res.json(await getSummary())
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load ASL data' })
  }
})

app.get('/api/asl/dataset', async (_req, res) => {
  try {
    res.json(await getDataset())
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load ASL dataset' })
  }
})

app.get('/api/asl/model', async (_req, res) => {
  try {
    res.json(await getModel())
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load ASL model' })
  }
})

app.post('/api/asl/labels', async (req, res) => {
  try {
    const label = await addCustomLabel(String(req.body?.label ?? ''))
    res.json({ label, ...(await getSummary()) })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Could not add sign' })
  }
})

app.post('/api/asl/samples', async (req, res) => {
  try {
    const label = String(req.body?.label ?? '')
    const frames = (req.body?.frames ?? []) as TrackedHand[][]
    const saved = await addSamples(label, frames)
    const summary = await getSummary()
    res.json({ ...saved, ...summary })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Could not save samples' })
  }
})

app.delete('/api/asl/samples/:label', async (req, res) => {
  try {
    await deleteLabel(String(req.params.label ?? ''))
    res.json(await getSummary())
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Could not delete samples' })
  }
})

app.post('/api/asl/train', async (_req, res) => {
  try {
    const model = await trainModel()
    res.json({
      trainedAt: model.trainedAt,
      sampleCount: model.sampleCount,
      accuracy: model.accuracy,
      counts: model.counts,
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Training failed' })
  }
})

wss.on('connection', (socket: WebSocket) => {
  let mode: FilterMode = 'canny'
  let busy = false

  socket.on('message', async (data: RawData, isBinary: boolean) => {
    if (!isBinary) {
      mode = parseMode(data, mode)
      return
    }

    if (busy) {
      return
    }

    busy = true
    try {
      await opencvReady
      const output = await processFrame(toBuffer(data), mode)
      if (socket.readyState === socket.OPEN) {
        socket.send(output)
      }
    } catch (error) {
      console.error('Frame processing failed:', error)
    } finally {
      busy = false
    }
  })
})

function parseMode(data: RawData, fallback: FilterMode): FilterMode {
  try {
    const message = JSON.parse(data.toString()) as ClientMessage
    if (message.type === 'mode' && FILTER_MODES.includes(message.mode)) {
      return message.mode
    }
  } catch {
    // Ignore malformed control messages.
  }

  return fallback
}

function toBuffer(data: RawData): Buffer {
  if (Buffer.isBuffer(data)) {
    return data
  }

  if (Array.isArray(data)) {
    return Buffer.concat(data)
  }

  return Buffer.from(data)
}

server.listen(PORT, () => {
  console.log(`OpenCV server listening on http://127.0.0.1:${PORT}`)
})
