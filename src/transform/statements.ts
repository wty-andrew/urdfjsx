import * as t from '@babel/types'
import * as R from 'ramda'

import {
  makeCallExpression,
  makeConstDeclaration,
  makeObjectProperty,
  namedImport,
  namespaceImport,
} from '../ast/index.js'
import { parseStatement } from '../parser/index.js'
import type { Dict } from '../types/index.js'
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
const Joint = forwardRef<THREE.Group, JointProps>(
  ({ name, ...props }, ref) => (
    <group ref={ref} name={name} {...props} />
  )
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

export const defineJointSchema = parseStatement(`
export type JointSchema =
  | { type: 'fixed' | 'floating' | 'planar' }
  | {
      type: 'continuous'
      axis: THREE.Vector3
      offset: THREE.Quaternion
    }
  | {
      type: 'revolute'
      axis: THREE.Vector3
      offset: THREE.Quaternion
      lower: number
      upper: number
    }
  | {
      type: 'prismatic'
      axis: THREE.Vector3
      offset: THREE.Vector3
      lower: number
      upper: number
    }
`)

const REQUIRED_IMPORTS: t.ImportDeclaration[] = [
  namespaceImport('THREE', 'three'),
]

const OPTIONAL_IMPORTS: [string, string[]][] = [
  ['three/examples/jsm/loaders/STLLoader.js', ['STLLoader']],
  ['three/examples/jsm/loaders/ColladaLoader.js', ['Collada', 'ColladaLoader']],
  ['react', ['forwardRef', 'useMemo']],
  ['@react-three/fiber', ['useLoader', 'GroupProps', 'MeshProps']],
  ['@react-three/drei', ['useTexture', 'Box', 'Cylinder', 'Sphere']],
]

const OPTIONAL_DECLARATIONS: [string, t.Statement][] = [
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
  group: ['forwardRef', 'GroupProps'],
  Box: ['Box'],
  Cylinder: ['Cylinder'],
  Sphere: ['Sphere'],
  Link: ['GroupProps', 'defineLinkProps', 'defineLinkComponent'],
  Joint: [
    'GroupProps',
    'defineJointProps',
    'defineJointComponent',
    'forwardRef',
  ],
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
  OPTIONAL_IMPORTS.reduce((statements, [module, allNames]) => {
    const names = R.intersection(allNames, deps)
    return R.isEmpty(names)
      ? statements
      : [...statements, namedImport(R.sortBy(R.identity, names), module)]
  }, REQUIRED_IMPORTS)

export const makeDeclarationStatements = (deps: string[]) =>
  OPTIONAL_DECLARATIONS.reduce(
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
  makeConstDeclaration('Robot', {
    ...makeCallExpression('forwardRef', [
      t.arrowFunctionExpression(
        [t.identifier('props'), t.identifier('ref')],
        R.isEmpty(texture)
          ? jsxRobot
          : t.blockStatement([
              declareUseTexture(texture),
              t.returnStatement(jsxRobot),
            ])
      ),
    ]),
    typeParameters: t.tsTypeParameterInstantiation([
      t.tsTypeReference(
        t.tsQualifiedName(t.identifier('THREE'), t.identifier('Group'))
      ),
      t.tsTypeReference(t.identifier('GroupProps')),
    ]),
  })
