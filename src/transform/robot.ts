import * as t from '@babel/types'
import * as R from 'ramda'

import {
  makeCallExpression,
  makeJsxAttr,
  makeJsxElement,
} from '../ast/index.js'
import type {
  Collision,
  Joint,
  KnownMaterial,
  Link,
  Origin,
  Robot,
  Vector4,
  Visual,
} from '../types/index.js'
import {
  compact,
  eulerToQuaternion,
  quaternionMultiply,
  quaternionToEuler,
  toPrecision,
} from '../utils/index.js'

const DEFAULT_MATERIAL: KnownMaterial = { color: [1, 1, 1, 1] }

export const callResolve = (url: string) =>
  makeCallExpression('resolve', [
    t.stringLiteral(url.replace(/^package:\//, '')),
  ])

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

      return filename.endsWith('.dae')
        ? makeJsxElement('ColladaModel', attributes)
        : makeJsxElement('STLModel', attributes, [jsxMaterial])
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

export const getRootLink = (robot: Robot) => {
  const isChildLink = R.includes(R.__, R.pluck('child', robot.joint))
  const rootLinks = R.reject(isChildLink, R.pluck('name', robot.link))
  if (rootLinks.length !== 1) {
    throw new Error('URDF must have only one root')
  }
  return rootLinks[0]
}

// robot must be post-processed that have all visuals populated with known materials
export const makeJsxRobot = (robot: Robot) => {
  const jsxLinksByName = Object.fromEntries(
    R.map((link) => [link.name, makeJsxLink(link)], robot.link)
  )

  const jsxJoints: t.JSXElement[] = []
  for (const joint of robot.joint) {
    const { parent, child } = joint
    const jsxJoint = makeJsxJoint(joint)
    jsxLinksByName[parent].children.push(jsxJoint)
    jsxJoint.children.push(jsxLinksByName[child])
    jsxJoints.push(jsxJoint)
  }

  return makeJsxElement(
    'group',
    [
      makeJsxAttr('ref', t.identifier('ref')),
      makeJsxAttr('name', robot.name),
      t.jsxSpreadAttribute(t.identifier('props')),
    ],
    [jsxLinksByName[getRootLink(robot)]]
  )
}

export const uniqueComponents = ({
  openingElement,
  children,
}: t.JSXElement): string[] =>
  R.uniq([
    (openingElement.name as t.JSXIdentifier).name,
    ...R.flatten(R.map(uniqueComponents, R.filter(t.isJSXElement, children))),
  ])
