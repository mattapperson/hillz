import type { Judge } from '@hillz/core'
import { isRecord } from '@hillz/core'
import { AgentHarness, step } from '@noetic-tools/core'
import type { z } from 'zod'

const readEnv = (key: string): string | undefined => {
  const proc = Reflect.get(globalThis, 'process')
  if (!isRecord(proc)) return undefined
  const env = Reflect.get(proc, 'env')
  if (!isRecord(env)) return undefined
  const v = env[key]
  return typeof v === 'string' ? v : undefined
}

interface CreateJudgeOptions {
  apiKey?: string
  defaultModel?: string
}

export const createJudge = (opts: CreateJudgeOptions = {}): Judge => {
  const defaultModel = opts.defaultModel ?? readEnv('HILLZ_JUDGE_MODEL') ?? 'openai/gpt-5-nano'

  return {
    evaluate: async <T extends z.ZodTypeAny>(req: {
      model?: string
      rubric: string
      input: string
      schema: T
    }): Promise<z.infer<T>> => {
      const model = req.model ?? defaultModel
      const judgeStep = step.llm<unknown, string, string>({
        id: 'hillz-judge',
        model,
        instructions: req.rubric,
      })

      const harness = new AgentHarness({
        name: 'hillz-judge',
        initialStep: judgeStep,
        params: {},
        llm: opts.apiKey ? { provider: 'openrouter', apiKey: opts.apiKey } : undefined,
      })

      await harness.execute(req.input)
      const response = await harness.getAgentResponse()

      let parsed: unknown
      try {
        parsed = JSON.parse(response.text)
      } catch {
        throw new Error(
          `Judge model returned non-JSON response. Model: ${model}. Raw output: ${response.text.slice(0, 200)}`,
        )
      }
      return req.schema.parse(parsed)
    },
  }
}
