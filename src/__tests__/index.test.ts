import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Target, generateCode, parseURDF, transform } from '../index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const loadFixture = (filename: string) =>
  fs.readFileSync(path.join(__dirname, `fixtures/${filename}`), 'utf-8')

const urdfToTsx = (urdf: string) =>
  generateCode(transform(parseURDF(urdf)), Target.TSX)

expect.addSnapshotSerializer({
  test: (value) => typeof value === 'string',
  print: (value) => (value as string).trim(),
})

test('URDF to TSX conversion', async () => {
  const tsx = await urdfToTsx(loadFixture('urdf-tutorial.urdf'))
  expect(tsx).toMatchSnapshot()
})
