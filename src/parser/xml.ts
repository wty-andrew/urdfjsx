import { XMLBuilder, XMLParser } from 'fast-xml-parser'
import * as R from 'ramda'

import type { Dict } from '../types/index.js'

type XMLNode = { [tag: string]: XMLNode[] } & {
  ':@'?: Dict<string>
  '#text'?: string
}

export type Element = {
  tag: string
  attrib: Dict<string>
  children: Element[]
}

const parser = new XMLParser({
  ignoreDeclaration: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
  allowBooleanAttributes: false,
  preserveOrder: true,
  processEntities: false,
})

const builder = new XMLBuilder({
  preserveOrder: true,
  attributeNamePrefix: '',
  ignoreAttributes: false,
  processEntities: false,
  format: true,
  suppressEmptyNode: true,
})

const convert = (node: XMLNode): Element => {
  const { ':@': attrib = {}, ...rest } = node
  const [tag, children] = Object.entries(rest)[0]
  return {
    tag,
    attrib,
    children: tag === '#text' ? [] : R.map(convert, children as XMLNode[]),
  }
}

export const parseXML = (text: string): Element[] =>
  R.map(convert, parser.parse(text) as XMLNode[])

export const formatXML = (node: XMLNode): string => builder.build([node])
