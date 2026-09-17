export type Landmark = {
  x: number
  y: number
}

export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [5, 9],
  [9, 13],
  [13, 17],
]

const FINGERTIPS = new Set([4, 8, 12, 16, 20])

export function drawHands(
  context: CanvasRenderingContext2D,
  hands: Landmark[][],
  width: number,
  height: number,
): void {
  context.lineJoin = 'round'
  context.lineCap = 'round'
  context.shadowColor = 'rgba(62, 224, 180, 0.9)'
  context.shadowBlur = Math.max(8, width * 0.008)

  for (const landmarks of hands) {
    context.strokeStyle = '#3ee0b4'
    context.lineWidth = Math.max(2.5, width * 0.0045)
    context.beginPath()

    for (const [start, end] of HAND_CONNECTIONS) {
      const from = landmarks[start]
      const to = landmarks[end]
      if (!from || !to) {
        continue
      }

      context.moveTo(from.x * width, from.y * height)
      context.lineTo(to.x * width, to.y * height)
    }

    context.stroke()

    for (const [index, point] of landmarks.entries()) {
      const radius = FINGERTIPS.has(index)
        ? Math.max(5, width * 0.009)
        : Math.max(3, width * 0.0055)

      context.fillStyle = FINGERTIPS.has(index) ? '#ffffff' : '#3ee0b4'
      context.beginPath()
      context.arc(point.x * width, point.y * height, radius, 0, Math.PI * 2)
      context.fill()
    }
  }

  context.shadowBlur = 0
}
