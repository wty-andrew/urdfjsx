import * as t from '@babel/types'
import ts from 'typescript'

import { formatAST, prettify } from './ast.js'
import { removeEmptyComments } from './transform.js'

export enum Target {
  TSX = 'tsx',
  JSX = 'jsx',
}

const transpile = (code: string, options?: ts.CompilerOptions) =>
  ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      jsx: ts.JsxEmit.Preserve,
      removeComments: false,
      ...options,
    },
  }).outputText

export const generateCode = async (progam: t.Program, target: Target) => {
  const tsx = formatAST(progam)
  const code = target === 'tsx' ? tsx : transpile(tsx)
  return await prettify(removeEmptyComments(code))
}
