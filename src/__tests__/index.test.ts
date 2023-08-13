import { greet } from '../index.js'

test('greet', () => {
  expect(greet('John')).toEqual('Hello, John')
})
