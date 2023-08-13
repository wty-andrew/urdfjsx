export type Dict<T> = Record<string, T>

export type NestedArray<T> = Array<T | NestedArray<T>>

export type RequiredPick<T, K extends keyof T> = Required<Pick<T, K>>
