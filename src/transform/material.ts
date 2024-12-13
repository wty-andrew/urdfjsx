import * as R from 'ramda'

import type {
  Color,
  Dict,
  KnownMaterial,
  Link,
  Material,
  Visual,
} from '../types/index.js'
import { isString, size } from '../utils/index.js'

const TEXTURE_PREFIX = '_texture'

const setMaterial = (visual: Visual, nameOrColor: string | Color): Visual => {
  const material: KnownMaterial = isString(nameOrColor)
    ? { name: nameOrColor }
    : { color: nameOrColor }
  return { ...visual, material }
}

export const populateMaterial = (
  links: Link[],
  globalMaterial: Dict<string | Color>
) => {
  type Result<T> = [T[], Dict<string>]

  const swapMaterial = (visuals: Visual[], localTexture: Dict<string>) =>
    visuals.reduce(
      ([updatedVisuals, localTexture], visual) => {
        const addToResult = (visual: Visual, newTexture?: Dict<string>) =>
          [
            [...updatedVisuals, visual],
            { ...localTexture, ...newTexture },
          ] as Result<Visual>

        if (R.anyPass([R.isNil, R.isEmpty])(visual.material)) {
          return addToResult(visual)
        }

        const { name, color, texture } = visual.material!
        if (color) {
          return addToResult(setMaterial(visual, color))
        }
        if (name) {
          const { [name]: textureOrColor } = globalMaterial
          if (!textureOrColor) {
            throw new Error(`Unknown material: ${name}`)
          }

          const nameOrColor = isString(textureOrColor) ? name : textureOrColor
          return addToResult(setMaterial(visual, nameOrColor))
        }

        const textureName = `${TEXTURE_PREFIX}${size(localTexture)}`
        const newTexture = { [textureName]: texture! }
        return addToResult(setMaterial(visual, textureName), newTexture)
      },
      [[], localTexture] as Result<Visual>
    )

  return links.reduce(
    ([updatedLinks, texture], link) => {
      const [visual, localTexture] = swapMaterial(link.visual, texture)
      const updatedLink: Link = { ...link, visual }
      return [[...updatedLinks, updatedLink], { ...texture, ...localTexture }]
    },
    [[], {}] as Result<Link>
  ) as [Link[], Dict<string>]
}

export const materialLookup = (materials: Material[]): Dict<string | Color> =>
  Object.fromEntries(
    R.map(({ name, color, texture }) => [name!, (color || texture)!], materials)
  )
