import { JOINT_TYPES } from '../constants/index.js'
import type { RequiredPick } from './common.js'

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

export type JointType = (typeof JOINT_TYPES)[number]

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
