import * as t from '@babel/types'
import * as R from 'ramda'

import type { Dict } from './types.js'
import type {
  Color,
  KnownMaterial,
  Link,
  Material,
  Robot,
  Visual,
} from './urdf.js'
import { getRootLink } from './urdf.js'
import { compact, isString, isNotEmpty, size } from './utils.js'
import {
  defaultImport,
  namedImport,
  exportDefault,
  declareUseTexture,
  makeArrowFunction,
  makeJsxAttr,
  makeJsxElement,
  makeJsxLink,
  makeJsxJoint,
  makeParameter,
  removeExtraClosingTags,
  uniqueComponents,
} from './ast.js'
import {
  defineResolveFunction,
  defineLinkProps,
  defineLinkComponent,
  defineJointProps,
  defineJointComponent,
  defineModelProps,
  defineModelComponent,
} from './stub.js'

const TEXTURE_PREFIX = '_texture'

const ALL_IMPORTS: [string, string[]][] = [
  ['three/examples/jsm/loaders/STLLoader', ['STLLoader']],
  ['@react-three/fiber', ['useLoader', 'GroupProps', 'MeshProps']],
  ['@react-three/drei', ['useTexture', 'Box', 'Cylinder', 'Sphere']],
]

const ALL_DECLARATIONS: [string, t.Statement][] = [
  ['defineResolveFunction', defineResolveFunction],
  ['defineLinkProps', defineLinkProps],
  ['defineLinkComponent', defineLinkComponent],
  ['defineJointProps', defineJointProps],
  ['defineJointComponent', defineJointComponent],
  ['defineModelProps', defineModelProps],
  ['defineModelComponent', defineModelComponent],
]

const DEPENDENCY: Dict<string[]> = {
  useTexture: ['useTexture', 'defineResolveFunction'],
  group: ['GroupProps'],
  Box: ['Box'],
  Cylinder: ['Cylinder'],
  Sphere: ['Sphere'],
  Link: ['GroupProps', 'defineLinkProps', 'defineLinkComponent'],
  Joint: ['GroupProps', 'defineJointProps', 'defineJointComponent'],
  Model: [
    'MeshProps',
    'useLoader',
    'STLLoader',
    'defineResolveFunction',
    'defineModelProps',
    'defineModelComponent',
  ],
}

const dependencies = (targets: string[]) => {
  const lookupDependency = (target: string) => DEPENDENCY[target] || []
  return R.uniq(R.flatten(R.map(lookupDependency, targets)))
}

const makeImportStatements = (deps: string[]) =>
  ALL_IMPORTS.reduce((statements, [module, allNames]) => {
    const names = R.intersection(allNames, deps)
    return R.isEmpty(names)
      ? statements
      : [...statements, namedImport(R.sortBy(R.identity, names), module)]
  }, [] as t.Statement[])

const makeDeclarationStatements = (deps: string[]) =>
  ALL_DECLARATIONS.reduce(
    (statements, [name, statement]) =>
      deps.includes(name) ? [...statements, statement] : statements,
    [] as t.Statement[]
  )

// serve as placeholder for blank line
export const withLeadingBlankComment = <T extends t.Node>(node: T): T => ({
  ...node,
  leadingComments: [{ type: 'CommentLine', value: '' }],
})

export const removeEmptyComments = (code: string) =>
  code.replace(/\/\/\s*\n/g, '\n')

const setMaterial = (visual: Visual, nameOrColor: string | Color): Visual => {
  const material: KnownMaterial = isString(nameOrColor)
    ? { name: nameOrColor }
    : { color: nameOrColor }
  return { ...visual, material }
}

const populateMaterial = (
  links: Link[],
  globalMaterial: Dict<string | Color>
) => {
  type Result<T> = [T[], Dict<string>]

  const swapMaterial = (visuals: Visual[], localTexture: Dict<string>) =>
    visuals.reduce(
      ([updatedVisuals, localTexture], visual) => {
        const addToResult = (visual: Visual, newTexture?: Dict<string>) =>
          [
            [...updatedVisuals, visual],
            { ...localTexture, ...newTexture },
          ] as Result<Visual>

        if (R.anyPass([R.isNil, R.isEmpty])(visual.material)) {
          return addToResult(visual)
        }

        const { name, color, texture } = visual.material!
        if (name) {
          const { [name]: textureOrColor } = globalMaterial
          if (!textureOrColor) {
            throw new Error(`Unknown material: ${name}`)
          }

          const nameOrColor = isString(textureOrColor) ? name : textureOrColor
          return addToResult(setMaterial(visual, nameOrColor))
        }
        if (color) {
          return addToResult(setMaterial(visual, color))
        }

        const textureName = `${TEXTURE_PREFIX}${size(localTexture)}`
        const newTexture = { [textureName]: texture! }
        return addToResult(setMaterial(visual, textureName), newTexture)
      },
      [[], localTexture] as Result<Visual>
    )

  return links.reduce(
    ([updatedLinks, texture], link) => {
      const [visual, localTexture] = swapMaterial(link.visual, texture)
      const updatedLink: Link = { ...link, visual }
      return [[...updatedLinks, updatedLink], { ...texture, ...localTexture }]
    },
    [[], {}] as Result<Link>
  ) as [Link[], Dict<string>]
}

const materialLookup = (materials: Material[]): Dict<string | Color> =>
  Object.fromEntries(
    R.map(({ name, color, texture }) => [name!, (color || texture)!], materials)
  )

export const transform = (robot: Robot) => {
  const globalMaterial = materialLookup(robot.material)
  const [links, localTexture] = populateMaterial(robot.link, globalMaterial)

  const globalTexture = R.filter(isString, globalMaterial)
  const texture = R.mergeAll([globalTexture, localTexture])

  const jsxLinksByName = Object.fromEntries(
    R.map((link) => [link.name, makeJsxLink(link)], links)
  )

  const jsxJoints: t.JSXElement[] = []
  for (const joint of robot.joint) {
    const { parent, child } = joint
    const jsxJoint = makeJsxJoint(joint)
    jsxLinksByName[parent].children.push(jsxJoint)
    jsxJoint.children.push(jsxLinksByName[child])
    jsxJoints.push(jsxJoint)
  }

  const jsxRobot = makeJsxElement(
    'group',
    [
      makeJsxAttr('name', robot.name),
      t.jsxSpreadAttribute(t.identifier('props')),
    ],
    [jsxLinksByName[getRootLink(robot)]]
  )

  const hasTexture = isNotEmpty(texture)

  const deps = dependencies(
    compact([hasTexture && 'useTexture', ...uniqueComponents(jsxRobot)])
  )

  const defineRobotComponent = makeArrowFunction(
    'Robot',
    [makeParameter('props', 'GroupProps')],
    hasTexture
      ? t.blockStatement([
          declareUseTexture(texture),
          t.returnStatement(jsxRobot),
        ])
      : jsxRobot
  )

  const program = t.program([
    defaultImport('React', 'react'),
    ...makeImportStatements(deps),
    ...R.map(withLeadingBlankComment, makeDeclarationStatements(deps)),
    withLeadingBlankComment(defineRobotComponent),
    withLeadingBlankComment(exportDefault('Robot')),
  ])
  return removeExtraClosingTags(program)
}
