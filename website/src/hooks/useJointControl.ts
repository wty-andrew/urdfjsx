import { useState, useCallback, useRef, useEffect } from 'react'
import { MathUtils } from 'three'

const noop = () => void 0

type JointSchema =
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

const makeJointSetter = (
  joint: THREE.Object3D,
  schema: JointSchema
): ((value: number) => void) => {
  switch (schema.type) {
    case 'continuous': {
      const { axis, offset } = schema
      return (value) =>
        joint.quaternion.setFromAxisAngle(axis, value).premultiply(offset)
    }
    case 'revolute': {
      const { axis, offset, lower, upper } = schema
      return (value) =>
        joint.quaternion
          .setFromAxisAngle(axis, MathUtils.clamp(value, lower, upper))
          .premultiply(offset)
    }
    case 'prismatic': {
      const { axis, offset, lower, upper } = schema
      return (value) =>
        joint.position
          .copy(axis)
          .multiplyScalar(MathUtils.clamp(value, lower, upper))
          .add(offset)
    }
    default:
      return noop
  }
}

const useJointControl = (schemas: Record<string, JointSchema>) => {
  const [robot, setRobot] = useState<THREE.Group | null>(null)
  const setter = useRef<(values: Record<string, number>) => void>(noop)

  useEffect(() => {
    if (!robot) return

    const setJoint = Object.fromEntries(
      Object.entries(schemas).map(([name, schema]) => {
        const joint = robot.getObjectByName(name)
        return [name, joint ? makeJointSetter(joint, schema) : noop]
      })
    )

    setter.current = (values) =>
      Object.entries(values).forEach(([name, value]) => setJoint[name]?.(value))
  }, [robot, schemas])

  const setJointValues = useCallback((values: Record<string, number>) => {
    setter.current(values)
  }, [])

  return [setRobot, setJointValues] as const
}

export default useJointControl
