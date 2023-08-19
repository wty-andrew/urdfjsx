import * as t from '@babel/types'
import * as R from 'ramda'

import type { Dict } from '../types/index.js'
import { parseStatement } from '../parser/index.js'
import {
  makeArrowFunction,
  makeCallExpression,
  makeConstDeclaration,
  makeObjectProperty,
  makeParameter,
  namedImport,
} from '../ast/index.js'
import { callResolve } from './robot.js'

export const defineResolveFunction = parseStatement(`
const resolve = (url: string) => url
`)

export const defineLinkProps = parseStatement(`
interface LinkProps extends Omit<GroupProps, 'position' | 'rotation'> {
  name: string
}
`)

export const defineLinkComponent = parseStatement(`
const Link = ({ name, ...props }: LinkProps) => (
  <group name={name} {...props} />
)
`)

export const defineJointProps = parseStatement(`
interface JointProps extends GroupProps {
  name: string
}
`)

export const defineJointComponent = parseStatement(`
const Joint = ({ name, ...props }: JointProps) => (
  <group name={name} {...props} />
)
`)

export const defineSTLModelProps = parseStatement(`
interface STLModelProps extends MeshProps {
  url: string
}
`)

export const defineSTLModelComponent = parseStatement(`
const STLModel = ({ url, children, ...props }: STLModelProps) => {
  const geometry = useLoader(STLLoader, url)
  return (
    <mesh geometry={geometry} {...props}>
      {children}
    </mesh>
  )
}
`)

export const defineColladaModelProps = parseStatement(`
interface ColladaModelProps extends GroupProps {
  url: string
}
`)

export const defineColladaModelComponent = parseStatement(`
const ColladaModel = ({ url, ...props }: ColladaModelProps) => {
  const collada: Collada = useLoader(ColladaLoader, url)
  const scene = useMemo(() => collada.scene.clone(), [collada.scene])
  return (
    <group {...props}>
      <primitive object={scene} />
    </group>
  )
}
`)

const ALL_IMPORTS: [string, string[]][] = [
  ['react', ['useMemo']],
  ['three/examples/jsm/loaders/STLLoader.js', ['STLLoader']],
  ['three/examples/jsm/loaders/ColladaLoader.js', ['Collada', 'ColladaLoader']],
  ['@react-three/fiber', ['useLoader', 'GroupProps', 'MeshProps']],
  ['@react-three/drei', ['useTexture', 'Box', 'Cylinder', 'Sphere']],
]

const ALL_DECLARATIONS: [string, t.Statement][] = [
  ['defineResolveFunction', defineResolveFunction],
  ['defineLinkProps', defineLinkProps],
  ['defineLinkComponent', defineLinkComponent],
  ['defineJointProps', defineJointProps],
  ['defineJointComponent', defineJointComponent],
  ['defineSTLModelProps', defineSTLModelProps],
  ['defineSTLModelComponent', defineSTLModelComponent],
  ['defineColladaModelProps', defineColladaModelProps],
  ['defineColladaModelComponent', defineColladaModelComponent],
]

const DEPENDENCY: Dict<string[]> = {
  useTexture: ['useTexture', 'defineResolveFunction'],
  group: ['GroupProps'],
  Box: ['Box'],
  Cylinder: ['Cylinder'],
  Sphere: ['Sphere'],
  Link: ['GroupProps', 'defineLinkProps', 'defineLinkComponent'],
  Joint: ['GroupProps', 'defineJointProps', 'defineJointComponent'],
  STLModel: [
    'MeshProps',
    'useLoader',
    'STLLoader',
    'defineResolveFunction',
    'defineSTLModelProps',
    'defineSTLModelComponent',
  ],
  ColladaModel: [
    'GroupProps',
    'useLoader',
    'useMemo',
    'Collada',
    'ColladaLoader',
    'defineResolveFunction',
    'defineColladaModelProps',
    'defineColladaModelComponent',
  ],
}

export const dependencies = (targets: string[]) => {
  const lookupDependency = (target: string) => DEPENDENCY[target] || []
  return R.uniq(R.flatten(R.map(lookupDependency, targets)))
}

export const makeImportStatements = (deps: string[]) =>
  ALL_IMPORTS.reduce((statements, [module, allNames]) => {
    const names = R.intersection(allNames, deps)
    return R.isEmpty(names)
      ? statements
      : [...statements, namedImport(R.sortBy(R.identity, names), module)]
  }, [] as t.Statement[])

export const makeDeclarationStatements = (deps: string[]) =>
  ALL_DECLARATIONS.reduce(
    (statements, [name, statement]) =>
      deps.includes(name) ? [...statements, statement] : statements,
    [] as t.Statement[]
  )

const declareUseTexture = (texture: Dict<string>) => {
  const textureProperty = ([name, url]: [string, string]) =>
    makeObjectProperty(name, callResolve(url))

  return makeConstDeclaration(
    'texture',
    makeCallExpression('useTexture', [
      t.objectExpression(R.map(textureProperty, Object.entries(texture))),
    ])
  )
}

export const defineRobotComponent = (
  jsxRobot: t.JSXElement,
  texture: Dict<string>
) =>
  makeArrowFunction(
    'Robot',
    [makeParameter('props', 'GroupProps')],
    R.isEmpty(texture)
      ? jsxRobot
      : t.blockStatement([
          declareUseTexture(texture),
          t.returnStatement(jsxRobot),
        ])
  )
