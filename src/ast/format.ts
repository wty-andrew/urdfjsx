import _generate from '@babel/generator'
import _traverse from '@babel/traverse'
import * as t from '@babel/types'
import prettier from 'prettier'
import ts from 'typescript'

// TODO: fix in babel 8 (https://github.com/babel/babel/issues/13855)
const generate = _generate.default
const traverse = _traverse.default

export const removeExtraClosingTags = (program: t.Program) => {
  traverse(t.file(program), {
    JSXElement: ({ node }) => {
      if (!node.children.length) {
        node.openingElement.selfClosing = true
        node.closingElement = null
      }
    },
  })
  return program
}

export const formatAST = (ast: t.Node) => generate(ast).code

export const transpile = (code: string, options?: ts.CompilerOptions) =>
  ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      jsx: ts.JsxEmit.Preserve,
      removeComments: false,
      ...options,
    },
  }).outputText

export const prettify = (code: string) =>
  prettier.format(code, {
    parser: 'babel-ts',
    semi: false,
    singleQuote: true,
  })

export const removeEmptyComments = (code: string) =>
  code.replace(/\/\/\s*\n/g, '\n')

export enum Target {
  TSX = 'tsx',
  JSX = 'jsx',
}

export const generateCode = async (progam: t.Program, target: Target) => {
  const tsx = formatAST(removeExtraClosingTags(progam))
  const code = target === Target.TSX ? tsx : transpile(tsx)
  return await prettify(removeEmptyComments(code))
}
