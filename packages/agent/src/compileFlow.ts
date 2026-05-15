import type { Eval, EvalFlow, NoeticTool, Skill, Step, Task } from '@hillz/core'

type CompiledStep = Step<unknown, string, string>

const isFunction = (v: EvalFlow): v is Extract<EvalFlow, (...args: never) => unknown> =>
  typeof v === 'function'

export const compileFlow = (req: {
  flow: Eval['flow']
  skill: Skill
  task: Task
  tools: NoeticTool[]
}): CompiledStep => {
  if (isFunction(req.flow)) {
    return req.flow({ skill: req.skill, task: req.task, tools: req.tools })
  }
  return req.flow
}
