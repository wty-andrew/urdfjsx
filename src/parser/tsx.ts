import { parse } from '@babel/parser'
import * as t from '@babel/types'

export const parseTSX = (code: string) =>
  parse(code, { plugins: ['jsx', 'typescript'], sourceType: 'module' })

export const parseStatement = (statement: string) =>
  t.cloneDeepWithoutLoc(parseTSX(statement).program.body[0])
