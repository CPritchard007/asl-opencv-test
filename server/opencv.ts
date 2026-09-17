import sharp from 'sharp'
import cvModule from '@techstark/opencv-js'
import type { FilterMode } from '../shared/types.ts'

type CvMat = {
  data: Uint8Array
  cols: number
  rows: number
  channels: () => number
  delete: () => void
  copyTo: (dst: CvMat) => void
}

type OpenCv = {
  Mat: new () => CvMat
  matFromImageData: (imageData: ImageDataLike) => CvMat
  cvtColor: (src: CvMat, dst: CvMat, code: number) => void
  GaussianBlur: (
    src: CvMat,
    dst: CvMat,
    ksize: { width: number; height: number },
    sigmaX: number,
  ) => void
  Canny: (src: CvMat, dst: CvMat, threshold1: number, threshold2: number) => void
  Size: new (width: number, height: number) => { width: number; height: number }
  COLOR_RGBA2GRAY: number
  COLOR_GRAY2RGBA: number
}

type ImageDataLike = {
  data: Uint8ClampedArray
  width: number
  height: number
}

let cv: OpenCv | null = null

export async function loadOpenCv(): Promise<OpenCv> {
  if (cv) {
    return cv
  }

  cv = (await resolveCvModule(cvModule)) as OpenCv
  console.log('OpenCV runtime initialized')
  return cv
}

async function resolveCvModule(module: unknown): Promise<unknown> {
  if (module instanceof Promise) {
    return module
  }

  const candidate = module as { Mat?: unknown; onRuntimeInitialized?: () => void }
  if (candidate.Mat) {
    return candidate
  }

  await new Promise<void>((resolve) => {
    candidate.onRuntimeInitialized = () => resolve()
  })

  return candidate
}

export async function processFrame(jpeg: Buffer, mode: FilterMode): Promise<Buffer> {
  const opencv = await loadOpenCv()
  const { data, info } = await sharp(jpeg).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  })

  const src = opencv.matFromImageData({
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    width: info.width,
    height: info.height,
  })
  const dst = new opencv.Mat()

  applyFilter(opencv, src, dst, mode)
  src.delete()

  const rgba = toRgba(opencv, dst)
  const encoded = await sharp(Buffer.from(rgba.data), {
    raw: {
      width: rgba.cols,
      height: rgba.rows,
      channels: 4,
    },
  })
    .jpeg({ quality: 72 })
    .toBuffer()

  rgba.delete()
  return encoded
}

function applyFilter(opencv: OpenCv, src: CvMat, dst: CvMat, mode: FilterMode): void {
  switch (mode) {
    case 'gray':
      opencv.cvtColor(src, dst, opencv.COLOR_RGBA2GRAY)
      break
    case 'blur':
      opencv.GaussianBlur(src, dst, new opencv.Size(15, 15), 0)
      break
    case 'canny': {
      const gray = new opencv.Mat()
      opencv.cvtColor(src, gray, opencv.COLOR_RGBA2GRAY)
      opencv.Canny(gray, dst, 60, 160)
      gray.delete()
      break
    }
    default:
      src.copyTo(dst)
  }
}

function toRgba(opencv: OpenCv, mat: CvMat): CvMat {
  if (mat.channels() === 4) {
    return mat
  }

  const rgba = new opencv.Mat()
  opencv.cvtColor(mat, rgba, opencv.COLOR_GRAY2RGBA)
  mat.delete()
  return rgba
}
