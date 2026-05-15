import { defineEval } from '@hillz/core'
import { react } from '@hillz/agent'

export default defineEval({
  name: 'example',
  skill: 'example',
  flowVersion: '1',
  flow: ({ skill }) =>
    react({
      model: 'openai/gpt-5-nano',
      instructions: skill.body,
      tools: [],
    }),
  tasks: [
    { id: 'greet', input: 'Say hello.' },
  ],
  scorers: ['content-similarity'],
  passThreshold: 0.5,
})
