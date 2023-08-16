import * as t from '@babel/types'
import { parse } from '@babel/parser'
import _generate from '@babel/generator'
import _traverse from '@babel/traverse'
import prettier from 'prettier'
import * as R from 'ramda'

import type { Dict } from './types.js'
import { isString, compact } from './utils.js'
import {
  eulerToQuaternion,
  quaternionMultiply,
  quaternionToEuler,
  toPrecision,
} from './math.js'
import type {
  Collision,
  Joint,
  Link,
  KnownMaterial,
  Origin,
  Vector4,
  Visual,
} from './urdf.js'

// TODO: fix in babel 8 (https://github.com/babel/babel/issues/13855)
const generate = _generate.default
const traverse = _traverse.default

const DEFAULT_MATERIAL: KnownMaterial = { color: [1, 1, 1, 1] }

export const parseTSX = (code: string) =>
  parse(code, { plugins: ['jsx', 'typescript'], sourceType: 'module' })

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

export const uniqueComponents = ({
  openingElement,
  children,
}: t.JSXElement): string[] =>
  R.uniq([
    (openingElement.name as t.JSXIdentifier).name,
    ...R.flatten(R.map(uniqueComponents, R.filter(t.isJSXElement, children))),
  ])

export const formatAST = (ast: t.Node) => generate(ast).code

export const prettify = (code: string) =>
  prettier.format(code, {
    parser: 'babel-ts',
    semi: false,
    singleQuote: true,
  })

//

type Primitive = string | number | boolean

const makeLiteral = (value: Primitive): t.Literal => {
  switch (typeof value) {
    case 'string':
      return t.stringLiteral(value)
    case 'number':
      return t.numericLiteral(value)
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

//

const importStatement = (
  module: string,
  specifiers: Parameters<typeof t.importDeclaration>[0]
) => t.importDeclaration(specifiers, t.stringLiteral(module))

export const namedImport = (names: string[], module: string) => {
  const makeSpecifier = (name: string) =>
    t.importSpecifier(t.identifier(name), t.identifier(name))
  return importStatement(module, R.map(makeSpecifier, names))
}

export const exportDefault = (name: string) =>
  t.exportDefaultDeclaration(t.identifier(name))

const makeConstDeclaration = (varname: string, expresion: t.Expression) =>
  t.variableDeclaration('const', [
    t.variableDeclarator(t.identifier(varname), expresion),
  ])

export const makeParameter = (
  name: string,
  annotation: string
): t.Identifier => ({
  ...t.identifier(name),
  typeAnnotation: t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier(annotation))
  ),
})

export const makeArrowFunction = (
  name: string,
  params: Parameters<typeof t.arrowFunctionExpression>[0],
  body: Parameters<typeof t.arrowFunctionExpression>[1]
) => makeConstDeclaration(name, t.arrowFunctionExpression(params, body))

const makeCallExpression = (
  callee: string,
  args: Parameters<typeof t.callExpression>[1]
) => t.callExpression(t.identifier(callee), args)

//

const callResolve = (url: string) =>
  makeCallExpression('resolve', [
    t.stringLiteral(url.replace(/^package:\//, '')),
  ])

export const declareUseTexture = (texture: Dict<string>) => {
  const textureProperty = ([name, url]: [string, string]) =>
    t.objectProperty(t.identifier(name), callResolve(url))

  return makeConstDeclaration(
    'texture',
    makeCallExpression('useTexture', [
      t.objectExpression(R.map(textureProperty, Object.entries(texture))),
    ])
  )
}

const makeTransformAttrs = ({ xyz, rpy }: Origin) =>
  compact([
    xyz && makeJsxAttr('position', xyz),
    rpy && makeJsxAttr('rotation', [...rpy, 'ZYX']),
  ])

const makeColorAttrs = ([r, g, b, a]: Vector4) => [
  makeJsxAttr('color', [r, g, b]),
  ...(a < 1 ? [makeJsxAttr('opacity', a), makeJsxAttr('transparent')] : []),
]

const makeTextureMapAttr = (name: string) =>
  makeJsxAttr(
    'map',
    t.memberExpression(t.identifier('texture'), t.stringLiteral(name), true)
  )

export const makeJsxMaterial = (material: KnownMaterial) =>
  makeJsxElement(
    'meshStandardMaterial',
    'name' in material
      ? [makeTextureMapAttr(material.name)]
      : makeColorAttrs(material.color)
  )

export const makeJsxJoint = ({ name, origin }: Joint): t.JSXElement =>
  makeJsxElement('Joint', [
    makeJsxAttr('name', name),
    ...(origin ? makeTransformAttrs(origin) : []),
  ])

export const makeJsxMesh = ({ geometry, origin, material }: Visual) => {
  const transformAttrs = origin ? makeTransformAttrs(origin) : []
  const jsxMaterial = makeJsxMaterial({ ...DEFAULT_MATERIAL, ...material })

  switch (geometry.type) {
    case 'box': {
      const { size } = geometry
      return makeJsxElement(
        'Box',
        [makeJsxAttr('args', size), ...transformAttrs],
        [jsxMaterial]
      )
    }
    case 'cylinder': {
      const { radius, length } = geometry
      // rotate 90 around x-axis because cylinder aligns in z-axis in ROS but y-axis in three
      const rpy = origin?.rpy || [0, 0, 0]
      const quat = quaternionMultiply(
        eulerToQuaternion(rpy, 'ZYX'),
        eulerToQuaternion([Math.PI / 2, 0, 0], 'XYZ')
      )
      const rotation = R.map(toPrecision(5), quaternionToEuler(quat, 'XYZ'))

      return makeJsxElement(
        'Cylinder',
        compact([
          makeJsxAttr('args', [radius, radius, length]),
          origin?.xyz && makeJsxAttr('position', origin.xyz),
          makeJsxAttr('rotation', rotation),
        ]),
        [jsxMaterial]
      )
    }
    case 'sphere': {
      const { radius } = geometry
      return makeJsxElement(
        'Sphere',
        [makeJsxAttr('args', [radius]), ...transformAttrs],
        [jsxMaterial]
      )
    }
    case 'mesh': {
      const { filename, scale } = geometry
      const attributes = compact([
        makeJsxAttr('url', callResolve(filename)),
        ...transformAttrs,
        scale && makeJsxAttr('scale', scale),
      ])

      if (filename.endsWith('.dae')) {
        return makeJsxElement('ColladaModel', attributes)
      } else {
        return makeJsxElement('STLModel', attributes, [jsxMaterial])
      }
    }
  }
}

export const makeJsxCollision = (collision: Collision) => makeJsxMesh(collision)

export const makeJsxLink = ({ name, visual }: Link) =>
  makeJsxElement(
    'Link',
    [makeJsxAttr('name', name)],
    R.map(makeJsxMesh, visual)
  )
