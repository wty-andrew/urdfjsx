import * as R from 'ramda'

import type { Vector3, Vector4 } from '../types/index.js'

export const round = (num: number, precision: number) =>
  Number.parseFloat(num.toFixed(precision))

export const toPrecision = R.flip(round)

export const clamp = (value: number, lower: number, upper: number) =>
  Math.max(lower, Math.min(value, upper))

type Quaternion = Vector4 // x, y, z, w

type Euler = Vector3

type EulerOrder = 'XYZ' | 'ZYX' // other not used

// below are taken from https://github.com/mrdoob/three.js

export const eulerToQuaternion = (
  [x, y, z]: Euler,
  order: EulerOrder
): Quaternion => {
  const c1 = Math.cos(x / 2)
  const c2 = Math.cos(y / 2)
  const c3 = Math.cos(z / 2)
  const s1 = Math.sin(x / 2)
  const s2 = Math.sin(y / 2)
  const s3 = Math.sin(z / 2)

  switch (order) {
    case 'XYZ':
      return [
        s1 * c2 * c3 + c1 * s2 * s3,
        c1 * s2 * c3 - s1 * c2 * s3,
        c1 * c2 * s3 + s1 * s2 * c3,
        c1 * c2 * c3 - s1 * s2 * s3,
      ]
    case 'ZYX':
      return [
        s1 * c2 * c3 - c1 * s2 * s3,
        c1 * s2 * c3 + s1 * c2 * s3,
        c1 * c2 * s3 - s1 * s2 * c3,
        c1 * c2 * c3 + s1 * s2 * s3,
      ]
  }
}

export const quaternionMultiply = (
  [x1, y1, z1, w1]: Quaternion,
  [x2, y2, z2, w2]: Quaternion
): Quaternion => [
  x1 * w2 + y1 * z2 - z1 * y2 + w1 * x2,
  -x1 * z2 + y1 * w2 + z1 * x2 + w1 * y2,
  x1 * y2 - y1 * x2 + z1 * w2 + w1 * z2,
  -x1 * x2 - y1 * y2 - z1 * z2 + w1 * w2,
]

export const quaternionToEuler = (
  [qx, qy, qz, qw]: Quaternion,
  order: EulerOrder
): Euler => {
  const wx = qw * qx
  const wy = qw * qy
  const wz = qw * qz
  const xx = qx * qx
  const xy = qx * qy
  const xz = qx * qz
  const yy = qy * qy
  const yz = qy * qz
  const zz = qz * qz

  switch (order) {
    case 'XYZ': {
      const t = 2 * (xz + wy)
      const y = Math.asin(clamp(t, -1, 1))
      return Math.abs(t) < 0.9999999
        ? [
            Math.atan2(2 * (wx - yz), 1 - 2 * (xx + yy)),
            y,
            Math.atan2(2 * (wz - xy), 1 - 2 * (yy + zz)),
          ]
        : [Math.atan2(2 * (yz + wx), 1 - 2 * (xx + zz)), y, 0]
    }
    case 'ZYX': {
      const t = 2 * (wy - xz)
      const y = Math.asin(clamp(t, -1, 1))
      return Math.abs(t) < 0.9999999
        ? [
            Math.atan2(2 * (yz + wx), 1 - 2 * (xx + yy)),
            y,
            Math.atan2(2 * (xy + wz), 1 - 2 * (yy + zz)),
          ]
        : [0, y, Math.atan2(2 * (wz - xy), 1 - 2 * (xx + zz))]
    }
  }
}
