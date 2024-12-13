import fs from 'node:fs'
import path from 'node:path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { type Target, generateCode, parseURDF, transform } from '../index.js'

const fileExist = (path: string) =>
  fs.existsSync(path) && fs.lstatSync(path).isFile()

const extname = (filename: string) => path.extname(filename).substring(1)

yargs(hideBin(process.argv))
  .command(
    '$0 <urdf-file>',
    'Turn URDF into react three fiber JSX component',
    (yargs) =>
      yargs
        .positional('urdf-file', { type: 'string', demandOption: true })
        .option('output', {
          type: 'string',
          default: 'Robot.tsx',
          alias: 'o',
          describe: 'Output file with extension .tsx or .jsx',
        })
        .check((argv) => {
          const ext = extname(argv.output)
          if (ext !== 'tsx' && ext !== 'jsx') {
            throw new Error('Output file extension must be .tsx or .jsx')
          }
          const inputFile = argv['urdf-file']
          if (!fileExist(inputFile)) {
            throw new Error(`File ${inputFile} does not exist`)
          }
          return true
        }),
    async ({ urdfFile, output }) => {
      const urdf = fs.readFileSync(urdfFile, 'utf-8')
      const program = transform(parseURDF(urdf))
      const code = await generateCode(program, extname(output) as Target)
      fs.writeFileSync(output, code)
    }
  )
  .version(false)
  .help()
  .parseAsync()
