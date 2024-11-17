import { QuartzTransformerPlugin } from "../types"

import type { Processor } from "unified"
import type { Code, Construct, Effects, State } from "micromark-util-types"
// @ts-expect-error
import { codes, types } from "micromark-util-symbol"
import { markdownLineEnding } from "micromark-util-character"

function htmlMuffler(this: Processor<undefined, undefined, undefined>) {
  const data = this.data()
  const flowInner: Construct = {
    name: "allHtml",
    tokenize: myFlowTokenizer,
    concrete: true,
  }
  ;(data.micromarkExtensions ??= []).push({
    flow: {
      null: [flowInner],
    },
    disable: {
      null: ["headingAtx", "thematicBreak", "setextUnderline", "htmlFlow", "codeFenced"],
    },
  })
}

function myFlowTokenizer(effects: Effects, ok: State, _nok: State): State {
  return start

  function start(code: Code) {
    effects.enter(types.htmlFlow)
    return open(code)
  }

  function open(code: Code) {
    effects.enter(types.htmlFlowData)
    return content(code)
  }

  function content(code: Code) {
    // eof
    if (code === codes.eof) {
      effects.exit(types.htmlFlowData)
      effects.exit(types.htmlFlow)
      return ok(code)
    }
    // line ending
    if (markdownLineEnding(code)) {
      effects.enter(types.lineEnding)
      effects.consume(code)
      effects.exit(types.lineEnding)
      effects.exit(types.htmlFlowData)
      return open
    }
    effects.consume(code)
    return content
  }
}

export const pluginName = "MakeItAllHTML"

export const MakeItAllHTML: QuartzTransformerPlugin = () => {
  return {
    name: pluginName,
    markdownPlugins() {
      return [htmlMuffler]
    },
  }
}
