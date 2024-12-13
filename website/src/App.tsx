import { OrbitControls, Stage } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useControls } from 'leva'

import Robot, { jointSchema, type JointSchema } from './components/R2D2'
import useJointControl from './hooks/useJointControl'

const movableJoints = Object.fromEntries(
  Object.entries(jointSchema).filter(([, schema]) =>
    ['continuous', 'prismatic', 'revolute'].includes(schema.type)
  )
)

const toLevaSchema = (
  schema: JointSchema,
  onChange: (value: number) => void
) => {
  switch (schema.type) {
    case 'continuous': {
      return {
        value: 0,
        step: 0.01,
        min: -Math.PI,
        max: Math.PI,
        onChange,
      }
    }
    case 'prismatic':
    case 'revolute': {
      const { lower, upper } = schema
      return { value: 0, step: 0.01, min: lower, max: upper, onChange }
    }
    default:
      throw new Error()
  }
}

const App = () => {
  const [ref, setJointValues] = useJointControl(jointSchema)
  useControls(() =>
    Object.fromEntries(
      Object.entries(movableJoints).map(([name, schema]) => [
        name,
        toLevaSchema(schema, (value) => setJointValues({ [name]: value })),
      ])
    )
  )

  return (
    <Canvas camera={{ position: [1, 0.8, 1] }}>
      <color attach="background" args={[0xf0f0f0]} />
      <OrbitControls />
      <Stage adjustCamera={false}>
        <Robot ref={ref} rotation={[-Math.PI / 2, 0, 0]} />
      </Stage>
    </Canvas>
  )
}

export default App
