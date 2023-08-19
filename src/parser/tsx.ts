import * as t from '@babel/types'
import { parse } from '@babel/parser'

export const parseTSX = (code: string) =>
  parse(code, { plugins: ['jsx', 'typescript'], sourceType: 'module' })

export const parseStatement = (statement: string) =>
  t.cloneDeepWithoutLoc(parseTSX(statement).program.body[0])
