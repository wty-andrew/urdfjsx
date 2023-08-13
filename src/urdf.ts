import * as R from 'ramda'

import type { Dict, NestedArray, RequiredPick } from './types.js'
import { isString, parseNumbers } from './utils.js'
import { Element, parseXML } from './xml.js'

// only process a subset of urdf elements, see http://wiki.ros.org/urdf/XML for full spec
const CHILD_ELEMENTS: Dict<string[]> = {
  robot: ['link', 'joint', 'material'],
  link: ['visual', 'collision'],
  joint: ['origin', 'parent', 'child', 'axis', 'limit'],
  visual: ['origin', 'geometry', 'material'],
  collision: ['origin', 'geometry'],
  geometry: ['box', 'cylinder', 'sphere', 'mesh'],
  material: ['color', 'texture'],
}

const JOINT_TYPES = [
  'revolute',
  'continuous',
  'prismatic',
  'fixed',
  'floating',
  'planar',
] as const

export type JointType = (typeof JOINT_TYPES)[number]

export type Vector3 = [number, number, number]

export type Vector4 = [number, number, number, number]

export type Color = Vector4

export type Origin = {
  xyz?: Vector3
  rpy?: Vector3
}

export type Limit = {
  upper: number
  lower: number
}

export type Joint = {
  name: string
  type: JointType
  origin?: Origin
  parent: string
  child: string
  axis?: Vector3
  limit?: Limit
}

export type Material = {
  name?: string
  color?: Color
  texture?: string
}

export type KnownMaterial =
  | RequiredPick<Material, 'name'>
  | RequiredPick<Material, 'color'>

export type Box = {
  type: 'box'
  size: Vector3
}

export type Cylinder = {
  type: 'cylinder'
  radius: number
  length: number
}

export type Sphere = {
  type: 'sphere'
  radius: number
}

export type Mesh = {
  type: 'mesh'
  filename: string
  scale?: Vector3
}

export type Geometry = Box | Cylinder | Sphere | Mesh

export type Visual = {
  origin?: Origin
  geometry: Geometry
  material?: Material
}

export type Collision = {
  origin?: Origin
  geometry: Geometry
}

export type Link = {
  name: string
  type?: string
  visual: Visual[]
  collision: Collision[]
}

export type Robot = {
  name: string
  link: Link[]
  joint: Joint[]
  material: Material[]
}

//

type Result<T = any> =
  | { success: true; value: T }
  | { success: false; errors: NestedArray<string> }

type Extractor<T = any> = (el: Element) => Result<T>

const failure = (errors: NestedArray<string>): Result => ({
  success: false,
  errors,
})

const success = <T>(value: T): Result<T> => ({ success: true, value })

const string = (text?: string): Result<string> =>
  text === undefined ? failure(['Missing']) : success(text)

const float = (text?: string): Result<number> => {
  if (text === undefined) return failure(['Missing'])

  try {
    return success(parseFloat(text))
  } catch (error) {
    return failure([`Invalid number: "${text}"`])
  }
}

const vector3 = (text?: string): Result<Vector3> => {
  if (text === undefined) return failure(['Missing'])

  try {
    const numbers = parseNumbers(text)
    if (numbers.length !== 3) throw new Error()
    return success(numbers as Vector3)
  } catch (error) {
    return failure([`Invalid vector3: "${text}"`])
  }
}

const vector4 = (text?: string): Result<Vector4> => {
  if (text === undefined) return failure(['Missing'])

  try {
    const numbers = parseNumbers(text)
    if (numbers.length !== 4) throw new Error()
    return success(numbers as Vector4)
  } catch (error) {
    return failure([`Invalid vector4: "${text}"`])
  }
}

const jointType = (text?: string): Result<JointType> => {
  if (text === undefined) return failure(['Missing'])

  return JOINT_TYPES.includes(text as any)
    ? success(text)
    : failure([`Invalid joint type: "${text}"`])
}

const tag =
  <T extends string, U extends string>(
    obj: Record<T, U>
  ): Extractor<Record<T, U>> =>
  (el: Element) => {
    const entries = Object.entries(obj)
    if (entries.length !== 1) {
      throw new Error(`Invalid argument: "${JSON.stringify(obj)}"`)
    }

    return el.tag === entries[0][1]
      ? success(obj)
      : failure([`Expected tag: ${entries[0][1]}, received: ${el.tag}`])
  }

const attribute =
  <T extends Dict<(text: string) => Result>>(
    obj: T
  ): Extractor<{
    [K in keyof T]: T[K] extends (attr: string) => Result<infer R> ? R : string
  }> =>
  (element: Element) =>
    Object.entries(obj).reduce((accResult, [name, extractor]) => {
      if (!accResult.success) return accResult

      const result = extractor(element.attrib[name])
      return result.success
        ? success({ ...accResult.value, [name]: result.value })
        : failure([`Invalid attribute: "${name}"`, result.errors])
    }, success({})) as Result

const only =
  <T extends object | any[]>(
    extractor: Extractor<T>
  ): Extractor<T extends Array<infer R> ? R : T[keyof T]> =>
  (el: Element) => {
    const result = extractor(el)
    if (!result.success) return result
    const values = Array.isArray(result.value)
      ? result.value
      : Object.values(result.value)
    return values.length === 1
      ? success(values[0])
      : failure([`Expect single item, received: ${values}`])
  }

const children =
  <T extends Dict<(elements: Element[]) => Result>>(
    obj: T
  ): Extractor<{
    [K in keyof T]: T[K] extends (elements: Element[]) => Result<infer R>
      ? R
      : never
  }> =>
  (element: Element) => {
    const groups = R.groupBy(R.prop('tag'), element.children)
    return Object.entries(obj).reduce((accResult, [name, extractor]) => {
      if (!accResult.success) return accResult

      const result = extractor(groups[name] || [])
      return result.success
        ? success({ ...accResult.value, [name]: result.value })
        : failure([`Invalid ${element.tag} children: ${name}`, result.errors])
    }, success({})) as Result
  }

const child =
  <T>(extractor: Extractor<T>): Extractor<T> =>
  ({ tag, children }: Element) =>
    children.length === 1
      ? extractor(children[0])
      : failure([
          `Expect ${tag} element to have single child, received: ${children.length}`,
        ])

function combine<T>(e: Extractor<T>): Extractor<T>

function combine<T1, T2>(
  e1: Extractor<T1>,
  e2: Extractor<T2>
): Extractor<T1 & T2>

function combine<T1, T2, T3>(
  e1: Extractor<T1>,
  e2: Extractor<T2>,
  e3: Extractor<T3>
): Extractor<T1 & T2 & T3>

function combine<T extends Extractor<Dict<any>>[]>(...extractors: T) {
  return (el: Element) =>
    extractors.reduce((accResult, extractor) => {
      if (!accResult.success) return accResult
      const result = extractor(el)
      return result.success
        ? success({ ...accResult.value, ...result.value })
        : result
    }, success({}))
}

function optional<T>(
  extractor: (text: string) => Result<T>
): (text?: string) => Result<T | undefined>

function optional<T>(
  extractor: Extractor<T>
): (elements?: Element[]) => Result<T | undefined>

function optional<T>(extractor: any) {
  return (arg?: Element[] | string): Result<T | undefined> => {
    if (arg === undefined) return success(undefined)
    if (isString(arg)) return extractor(arg)
    if (arg.length === 0) return success(undefined)
    return arg.length > 1
      ? failure([
          `Expect elements to have length 0 or 1, received: ${arg.length}`,
        ])
      : extractor(arg[0])
  }
}

const one =
  <T>(extractor: Extractor<T>) =>
  (elements: Element[]): Result<T> =>
    elements.length === 1
      ? extractor(elements[0])
      : failure([
          `Expect elements to have length 1, received: ${elements.length}`,
        ])

const many =
  <T>(extractor: Extractor<T>) =>
  (elements?: Element[]): Result<T[]> =>
    elements === undefined
      ? success([])
      : elements.reduce(
          (accResult, element) => {
            if (!accResult.success) return accResult
            const result = extractor(element)
            return result.success
              ? success([...accResult.value, result.value])
              : result
          },
          success([] as T[])
        )

const oneOf =
  <T extends Extractor[]>(
    ...extractors: T
  ): Extractor<T[number] extends Extractor<infer P> ? P : never> =>
  (el: Element) => {
    const finalResult = extractors.reduce((accResult, extractor) => {
      if (accResult.success) return accResult
      const result = extractor(el)
      return result.success
        ? result
        : failure([...accResult.errors, result.errors])
    }, failure([]))

    return finalResult.success
      ? finalResult
      : failure(['No match', ...finalResult.errors])
  }

// mostly follow https://github.com/ros/urdfdom/blob/master/xsd/urdf.xsd

const origin: Extractor<Origin> = attribute({
  xyz: optional(vector3),
  rpy: optional(vector3),
})

const axis = only(attribute({ xyz: vector3 }))

const limit: Extractor<Limit> = attribute({ lower: float, upper: float })

const joint: Extractor<Joint> = combine(
  attribute({ name: string, type: jointType }),
  children({
    origin: optional(origin),
    parent: one(only(attribute({ link: string }))),
    child: one(only(attribute({ link: string }))),
    axis: optional(axis),
    limit: optional(limit),
  })
)

const color = only(attribute({ rgba: vector4 }))

const texture = only(attribute({ filename: string }))

const material: Extractor<Material> = combine(
  attribute({ name: optional(string) }),
  children({
    color: optional(color),
    texture: optional(texture),
  })
)

const box: Extractor<Box> = combine(
  tag({ type: 'box' }),
  attribute({ size: vector3 })
)

const cylinder: Extractor<Cylinder> = combine(
  tag({ type: 'cylinder' }),
  attribute({
    radius: float,
    length: float,
  })
)

const sphere: Extractor<Sphere> = combine(
  tag({ type: 'sphere' }),
  attribute({ radius: float })
)

const mesh: Extractor<Mesh> = combine(
  tag({ type: 'mesh' }),
  attribute({
    filename: string,
    scale: optional(vector3),
  })
)

const geometry = child(oneOf(box, cylinder, sphere, mesh))

const visual: Extractor<Visual> = children({
  origin: optional(origin),
  geometry: one(geometry),
  material: optional(material),
})

const collision: Extractor<Collision> = children({
  origin: optional(origin),
  geometry: one(geometry),
})

const link: Extractor<Link> = combine(
  attribute({ name: string, type: optional(string) }),
  children({
    visual: many(visual),
    collision: many(collision),
  })
)

const robot: Extractor<Robot> = combine(
  attribute({ name: string }),
  children({
    link: many(link),
    joint: many(joint),
    material: many(material),
  })
)

//

const prune = (element: Element): Element => {
  const { tag, attrib, children } = element
  return {
    tag,
    attrib,
    children: children
      .filter((child) => CHILD_ELEMENTS[tag].includes(child.tag))
      .map(prune),
  }
}

const formatError = (errors: NestedArray<string>, indent = 0): string => {
  if (errors.length === 0) return ''
  const [first, ...rest] = errors
  return (
    (isString(first)
      ? `\n${'  '.repeat(indent)}${first}`
      : formatError(first, indent + 1)) + formatError(rest, indent)
  )
}

export const parseURDF = (text: string) => {
  const result = robot(prune(parseXML(text)[0]))
  if (!result.success) {
    throw new Error(formatError(result.errors))
  }
  return result.value
}

export const getRootLink = (robot: Robot) => {
  const isChildLink = R.includes(R.__, R.pluck('child', robot.joint))
  const rootLinks = R.reject(isChildLink, R.pluck('name', robot.link))
  if (rootLinks.length !== 1) {
    throw new Error('URDF must have only one root')
  }
  return rootLinks[0]
}
