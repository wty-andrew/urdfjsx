import { useMemo } from 'react'
import {
  Collada,
  ColladaLoader,
} from 'three/examples/jsm/loaders/ColladaLoader.js'
import { GroupProps, useLoader } from '@react-three/fiber'
import { Box, Cylinder, Sphere } from '@react-three/drei'

const resolve = (url: string) => {
  const filename = url.substring(url.lastIndexOf('/'))
  return `https://raw.githubusercontent.com/PR2/pr2_common/melodic-devel/pr2_description/meshes/gripper_v0${filename}`
}

interface LinkProps extends Omit<GroupProps, 'position' | 'rotation'> {
  name: string
}

const Link = ({ name, ...props }: LinkProps) => <group name={name} {...props} />

interface JointProps extends GroupProps {
  name: string
}

const Joint = ({ name, ...props }: JointProps) => (
  <group name={name} {...props} />
)

interface ColladaModelProps extends GroupProps {
  url: string
}

const ColladaModel = ({ url, ...props }: ColladaModelProps) => {
  const collada: Collada = useLoader(ColladaLoader, url)
  const scene = useMemo(() => collada.scene.clone(), [collada.scene])
  return (
    <group {...props}>
      <primitive object={scene} />
    </group>
  )
}

const Robot = (props: GroupProps) => (
  <group name="visual" {...props}>
    <Link name="base_link">
      <Cylinder args={[0.2, 0.2, 0.6]} rotation={[1.5708, 0, 0]}>
        <meshStandardMaterial color={[0, 0, 0.8]} />
      </Cylinder>
      <Joint name="base_to_right_leg" position={[0, -0.22, 0.25]}>
        <Link name="right_leg">
          <Box
            args={[0.6, 0.1, 0.2]}
            position={[0, 0, -0.3]}
            rotation={[0, 1.57075, 0, 'ZYX']}
          >
            <meshStandardMaterial color={[1, 1, 1]} />
          </Box>
          <Joint name="right_base_joint" position={[0, 0, -0.6]}>
            <Link name="right_base">
              <Box args={[0.4, 0.1, 0.1]}>
                <meshStandardMaterial color={[1, 1, 1]} />
              </Box>
              <Joint
                name="right_front_wheel_joint"
                position={[0.133333333333, 0, -0.085]}
                rotation={[0, 0, 0, 'ZYX']}
              >
                <Link name="right_front_wheel">
                  <Cylinder
                    args={[0.035, 0.035, 0.1]}
                    position={[0, 0, 0]}
                    rotation={[3.14155, 0, 0]}
                  >
                    <meshStandardMaterial color={[0, 0, 0]} />
                  </Cylinder>
                </Link>
              </Joint>
              <Joint
                name="right_back_wheel_joint"
                position={[-0.133333333333, 0, -0.085]}
                rotation={[0, 0, 0, 'ZYX']}
              >
                <Link name="right_back_wheel">
                  <Cylinder
                    args={[0.035, 0.035, 0.1]}
                    position={[0, 0, 0]}
                    rotation={[3.14155, 0, 0]}
                  >
                    <meshStandardMaterial color={[0, 0, 0]} />
                  </Cylinder>
                </Link>
              </Joint>
            </Link>
          </Joint>
        </Link>
      </Joint>
      <Joint name="base_to_left_leg" position={[0, 0.22, 0.25]}>
        <Link name="left_leg">
          <Box
            args={[0.6, 0.1, 0.2]}
            position={[0, 0, -0.3]}
            rotation={[0, 1.57075, 0, 'ZYX']}
          >
            <meshStandardMaterial color={[1, 1, 1]} />
          </Box>
          <Joint name="left_base_joint" position={[0, 0, -0.6]}>
            <Link name="left_base">
              <Box args={[0.4, 0.1, 0.1]}>
                <meshStandardMaterial color={[1, 1, 1]} />
              </Box>
              <Joint
                name="left_front_wheel_joint"
                position={[0.133333333333, 0, -0.085]}
                rotation={[0, 0, 0, 'ZYX']}
              >
                <Link name="left_front_wheel">
                  <Cylinder
                    args={[0.035, 0.035, 0.1]}
                    position={[0, 0, 0]}
                    rotation={[3.14155, 0, 0]}
                  >
                    <meshStandardMaterial color={[0, 0, 0]} />
                  </Cylinder>
                </Link>
              </Joint>
              <Joint
                name="left_back_wheel_joint"
                position={[-0.133333333333, 0, -0.085]}
                rotation={[0, 0, 0, 'ZYX']}
              >
                <Link name="left_back_wheel">
                  <Cylinder
                    args={[0.035, 0.035, 0.1]}
                    position={[0, 0, 0]}
                    rotation={[3.14155, 0, 0]}
                  >
                    <meshStandardMaterial color={[0, 0, 0]} />
                  </Cylinder>
                </Link>
              </Joint>
            </Link>
          </Joint>
        </Link>
      </Joint>
      <Joint
        name="gripper_extension"
        position={[0.19, 0, 0.2]}
        rotation={[0, 0, 0, 'ZYX']}
      >
        <Link name="gripper_pole">
          <Cylinder
            args={[0.01, 0.01, 0.2]}
            position={[0.1, 0, 0]}
            rotation={[1.5708, 0, -1.57075]}
          >
            <meshStandardMaterial color={[1, 1, 1]} />
          </Cylinder>
          <Joint
            name="left_gripper_joint"
            position={[0.2, 0.01, 0]}
            rotation={[0, 0, 0, 'ZYX']}
          >
            <Link name="left_gripper">
              <ColladaModel
                url={resolve('/urdf_tutorial/meshes/l_finger.dae')}
                position={[0, 0, 0]}
                rotation={[0, 0, 0, 'ZYX']}
              />
              <Joint name="left_tip_joint">
                <Link name="left_tip">
                  <ColladaModel
                    url={resolve('/urdf_tutorial/meshes/l_finger_tip.dae')}
                    position={[0.09137, 0.00495, 0]}
                    rotation={[0, 0, 0, 'ZYX']}
                  />
                </Link>
              </Joint>
            </Link>
          </Joint>
          <Joint
            name="right_gripper_joint"
            position={[0.2, -0.01, 0]}
            rotation={[0, 0, 0, 'ZYX']}
          >
            <Link name="right_gripper">
              <ColladaModel
                url={resolve('/urdf_tutorial/meshes/l_finger.dae')}
                position={[0, 0, 0]}
                rotation={[-3.1415, 0, 0, 'ZYX']}
              />
              <Joint name="right_tip_joint">
                <Link name="right_tip">
                  <ColladaModel
                    url={resolve('/urdf_tutorial/meshes/l_finger_tip.dae')}
                    position={[0.09137, 0.00495, 0]}
                    rotation={[-3.1415, 0, 0, 'ZYX']}
                  />
                </Link>
              </Joint>
            </Link>
          </Joint>
        </Link>
      </Joint>
      <Joint name="head_swivel" position={[0, 0, 0.3]}>
        <Link name="head">
          <Sphere args={[0.2]}>
            <meshStandardMaterial color={[1, 1, 1]} />
          </Sphere>
          <Joint name="tobox" position={[0.1814, 0, 0.1414]}>
            <Link name="box">
              <Box args={[0.08, 0.08, 0.08]}>
                <meshStandardMaterial color={[0, 0, 0.8]} />
              </Box>
            </Link>
          </Joint>
        </Link>
      </Joint>
    </Link>
  </group>
)

export default Robot