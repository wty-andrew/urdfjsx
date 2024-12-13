import * as t from '@babel/types'
import * as R from 'ramda'

import { makeAnnotatedIdentifier, makeObjectProperty } from '../ast/index.js'
import type { Joint, Limit, Vector3, Vector4 } from '../types/index.js'
import { eulerToQuaternion } from '../utils/index.js'

const makeThreeObj = (type: string, ...args: number[]) =>
  t.newExpression(
    t.memberExpression(t.identifier('THREE'), t.identifier(type)),
    R.map<number, t.NumericLiteral>(t.numericLiteral, args)
  )

const makeThreeVector3 = (vec: Vector3) => makeThreeObj('Vector3', ...vec)

const makeThreeQuaternion = (quaternion: Vector4) =>
  makeThreeObj('Quaternion', ...quaternion)

const makeLimitProperties = ({ lower, upper }: Limit) => [
  makeObjectProperty('lower', lower),
  makeObjectProperty('upper', upper),
]

const makeJointProperties = ({
  type,
  axis = [1, 0, 0],
  limit,
  origin,
}: Joint) => {
  switch (type) {
    case 'fixed':
    case 'floating':
    case 'planar':
      return [makeObjectProperty('type', type)]
    case 'continuous':
    case 'revolute': {
      const offset = eulerToQuaternion(origin?.rpy || [0, 0, 0], 'ZYX')
      return [
        makeObjectProperty('type', type),
        makeObjectProperty('axis', makeThreeVector3(axis)),
        makeObjectProperty('offset', makeThreeQuaternion(offset)),
        ...(type === 'revolute' ? makeLimitProperties(limit!) : []),
      ]
    }
    case 'prismatic': {
      const offset = origin?.xyz || [0, 0, 0]
      return [
        makeObjectProperty('type', type),
        makeObjectProperty('axis', makeThreeVector3(axis)),
        makeObjectProperty('offset', makeThreeVector3(offset)),
        ...makeLimitProperties(limit!),
      ]
    }
  }
}

const makeJointSchema = (joint: Joint) =>
  makeObjectProperty(joint.name, t.objectExpression(makeJointProperties(joint)))

export const declareJointSchema = (joints: Joint[]) => {
  const annotation = t.tsTypeReference(
    t.identifier('Record'),
    t.tsTypeParameterInstantiation([
      t.tsStringKeyword(),
      t.tsTypeReference(t.identifier('JointSchema')),
    ])
  )
  return t.exportNamedDeclaration(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        makeAnnotatedIdentifier('jointSchema', annotation),
        t.objectExpression(
          R.map<Joint, t.ObjectProperty>(makeJointSchema, joints)
        )
      ),
    ])
  )
}
