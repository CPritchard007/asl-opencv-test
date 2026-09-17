export const FILTER_MODES = ['original', 'gray', 'blur', 'canny'] as const

export type FilterMode = (typeof FILTER_MODES)[number]

export type ClientMessage = {
  type: 'mode'
  mode: FilterMode
}
