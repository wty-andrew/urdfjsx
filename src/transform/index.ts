export * from './joint.js'
export * from './material.js'
export * from './robot.js'
export * from './statements.js'

import * as t from '@babel/types'
import * as R from 'ramda'

import type { Robot } from '../types/index.js'
import { compact, isString, size } from '../utils/index.js'
import { exportDefault, withLeadingBlankComment } from '../ast/index.js'
import { materialLookup, populateMaterial } from './material.js'
import { declareJointSchema } from './joint.js'
import { makeJsxRobot, uniqueComponents } from './robot.js'
import {
  dependencies,
  makeImportStatements,
  makeDeclarationStatements,
  defineJointSchema,
  defineRobotComponent,
} from './statements.js'

export const transform = (robot: Robot) => {
  const globalMaterial = materialLookup(robot.material)
  const globalTexture = R.filter(isString, globalMaterial)
  const [links, localTexture] = populateMaterial(robot.link, globalMaterial)
  const texture = R.mergeAll([globalTexture, localTexture])

  const jsxRobot = makeJsxRobot({ ...robot, link: links })

  const deps = dependencies(
    compact([size(texture) > 0 && 'useTexture', ...uniqueComponents(jsxRobot)])
  )

  return t.program([
    ...makeImportStatements(deps),
    ...R.map(withLeadingBlankComment, [
      ...makeDeclarationStatements(deps),
      defineJointSchema,
      declareJointSchema(robot.joint),
      defineRobotComponent(jsxRobot, texture),
      exportDefault('Robot'),
    ]),
  ])
}
