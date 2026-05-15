import type {
  AgentRunner,
  AgentTrace,
  FsAdapter,
  InputMessage,
  Item,
  ShellAdapter,
  SubprocessAdapter,
  ToolCallRecord,
} from '@hillz/core'
import { AgentHarness } from '@noetic-tools/core'
import { compileFlow } from './compileFlow'

type FunctionCallItem = Extract<Item, { type: 'function_call' }>
type FunctionCallOutputItem = Extract<Item, { type: 'function_call_output' }>

const isFunctionCall = (item: Item): item is FunctionCallItem => item.type === 'function_call'
const isFunctionCallOutput = (item: Item): item is FunctionCallOutputItem =>
  item.type === 'function_call_output'

const flattenInput = (input: InputMessage | InputMessage[]): string => {
  const parts = Array.isArray(input) ? input : [input]
  return parts.map((part) => (typeof part === 'string' ? part : part.content)).join('\n\n')
}

const parseJSONOrRaw = (s: string): unknown => {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

const pairToolCalls = (items: readonly Item[]): ToolCallRecord[] => {
  const outputs = new Map<string, FunctionCallOutputItem>()
  for (const item of items) {
    if (isFunctionCallOutput(item)) outputs.set(item.callId, item)
  }
  const calls: ToolCallRecord[] = []
  for (const item of items) {
    if (!isFunctionCall(item)) continue
    const output = outputs.get(item.callId)
    calls.push({
      id: item.callId,
      name: item.name,
      args: parseJSONOrRaw(item.arguments),
      result: output ? output.output : null,
      durationMs: undefined,
    })
  }
  return calls
}

interface CreateAgentRunnerOptions {
  apiKey?: string
  harnessName?: string
}

export const createAgentRunner = (opts: CreateAgentRunnerOptions = {}): AgentRunner => {
  const harnessName = opts.harnessName ?? 'hillz'

  return {
    compileFlow,

    run: async (req) => {
      const startedAt = Date.now()
      const fs: FsAdapter | undefined = req.fs
      const shell: ShellAdapter | undefined = req.shell
      const subprocess: SubprocessAdapter | undefined = req.subprocess

      const harness = new AgentHarness({
        name: harnessName,
        initialStep: req.step,
        params: {},
        llm: opts.apiKey ? { provider: 'openrouter', apiKey: opts.apiKey } : undefined,
        fs,
        shell,
        subprocess,
      })

      await harness.execute(flattenInput(req.input))
      const response = await harness.getAgentResponse()

      const trace: AgentTrace = {
        input: req.input,
        output: response.text,
        items: [...response.items],
        toolCalls: pairToolCalls(response.items),
        usage: {
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          cachedTokens: response.usage.cachedTokens,
          cost: response.cost,
        },
        fromCache: false,
        durationMs: Date.now() - startedAt,
      }
      return trace
    },
  }
}
