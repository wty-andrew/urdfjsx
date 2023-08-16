import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

import Robot from './components/R2D2'

const App = () => {
  return (
    <Canvas camera={{ position: [1.1, 0.5, 0.9] }}>
      <color attach="background" args={[0xf0f0f0]} />
      <OrbitControls />
      <ambientLight />
      <directionalLight position={[5, 5, 0]} />
      <Robot rotation={[-Math.PI / 2, 0, 0]} />
    </Canvas>
  )
}

export default App
