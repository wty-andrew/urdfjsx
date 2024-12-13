import * as t from '@babel/types'
import * as R from 'ramda'

import { isString } from '../utils/index.js'

type Primitive = string | number | boolean

const makeLiteral = (value: Primitive): t.Literal => {
  switch (typeof value) {
    case 'string':
      return t.stringLiteral(value)
    case 'number':
      return t.valueToNode(value) as t.NumericLiteral
    case 'boolean':
      return t.booleanLiteral(value)
    default:
      throw new Error(`Unsupported literal type: ${typeof value}`)
  }
}

type AttrValue = Primitive | Primitive[] | t.Expression

export const makeJsxAttr = (name: string, value?: AttrValue) => {
  const transform = (arg?: AttrValue) => {
    if (arg === undefined) return null
    if (isString(arg)) return t.stringLiteral(arg)
    if (t.isNode(arg) && t.isExpression(arg)) {
      return t.jsxExpressionContainer(arg)
    }
    return t.jsxExpressionContainer(
      Array.isArray(arg)
        ? t.arrayExpression(R.map(makeLiteral, arg))
        : makeLiteral(arg)
    )
  }

  return t.jsxAttribute(t.jsxIdentifier(name), transform(value))
}

export const makeJsxElement = (
  name: string,
  attributes: (t.JSXAttribute | t.JSXSpreadAttribute)[] = [],
  children: t.JSXElement[] = []
) => {
  const tag = t.jsxIdentifier(name)
  return t.jsxElement(
    t.jsxOpeningElement(tag, attributes),
    t.jsxClosingElement(tag),
    children
  )
}

const importStatement = (
  module: string,
  specifiers: Parameters<typeof t.importDeclaration>[0]
) => t.importDeclaration(specifiers, t.stringLiteral(module))

export const namedImport = (names: string[], module: string) => {
  const makeSpecifier = (name: string) =>
    t.importSpecifier(t.identifier(name), t.identifier(name))
  return importStatement(module, R.map(makeSpecifier, names))
}

export const namespaceImport = (name: string, module: string) =>
  importStatement(module, [t.importNamespaceSpecifier(t.identifier(name))])

export const exportDefault = (name: string) =>
  t.exportDefaultDeclaration(t.identifier(name))

export const makeConstDeclaration = (
  varname: string,
  expresion: t.Expression
) =>
  t.variableDeclaration('const', [
    t.variableDeclarator(t.identifier(varname), expresion),
  ])

export const makeAnnotatedIdentifier = (
  name: string,
  annotation: t.TSType
): t.Identifier => ({
  ...t.identifier(name),
  typeAnnotation: t.tsTypeAnnotation(annotation),
})

export const makeCallExpression = (
  callee: string,
  args: Parameters<typeof t.callExpression>[1]
) => t.callExpression(t.identifier(callee), args)

export const makeObjectProperty = (
  key: string,
  value: Primitive | Parameters<typeof t.objectProperty>[1]
) =>
  t.objectProperty(
    t.stringLiteral(key),
    t.isNode(value) ? value : makeLiteral(value)
  )

// serve as placeholder for blank line
export const withLeadingBlankComment = <T extends t.Node>(node: T): T => ({
  ...node,
  leadingComments: [{ type: 'CommentLine', value: '' }],
})
