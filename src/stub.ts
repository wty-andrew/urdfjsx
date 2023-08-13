import * as t from '@babel/types'

import { parseTSX } from './ast.js'

const parse = (statement: string) =>
  t.cloneDeepWithoutLoc(parseTSX(statement).program.body[0])

export const defineResolveFunction = parse(`
const resolve = (url: string) => url
`)

export const defineLinkProps = parse(`
interface LinkProps extends Omit<GroupProps, 'position' | 'rotation'> {
  name: string
}
`)

export const defineLinkComponent = parse(`
const Link = ({ name, ...props }: LinkProps) => (
  <group name={name} {...props} />
)
`)

export const defineJointProps = parse(`
interface JointProps extends GroupProps {
  name: string
}
`)

export const defineJointComponent = parse(`
const Joint = ({ name, ...props }: JointProps) => (
  <group name={name} {...props} />
)
`)

export const defineModelProps = parse(`
interface ModelProps extends MeshProps {
  url: string
}
`)

export const defineModelComponent = parse(`
const Model = ({ url, children, ...props }: ModelProps) => {
  const geometry = useLoader(STLLoader, url)
  return (
    <mesh geometry={geometry} {...props}>
      {children}
    </mesh>
  )
}
`)
