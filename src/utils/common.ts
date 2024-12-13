import * as R from 'ramda'

export const isString = R.is(String)

const isFalse = (obj: unknown): obj is false => obj === false

export const compact = R.reject(R.anyPass([R.isNil, isFalse]))

export const size = <T extends any[] | object>(obj: T) =>
  Array.isArray(obj) ? obj.length : Object.keys(obj).length

export const parseNumber = (text: string) => {
  const value = Number.parseFloat(text)
  if (Number.isNaN(value)) {
    throw new Error(`${text} cannot be parsed into a number`)
  }
  return value
}

export const parseNumbers = (text: string) =>
  R.map<string, number>(parseNumber, text.trim().split(/\s+/))
