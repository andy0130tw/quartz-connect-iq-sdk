import * as fs from "node:fs"
import * as path from "node:path"
import * as parse5 from "parse5"
import { stringify as yamlStringify } from "yaml"

const contents = [
  ["Readme", "README.html"],
  ["Connect IQ Basics", "ConnectIQBasics.html"],
  ["Monkey C", "LearningMonkeyC.html"],
  ["Core Topics", "CoreTopics.html"],
  ["User Experience Guidelines", "UserExperienceGuidelines.html"],
  ["Connect IQ FAQ", "FAQ.html"],
  ["Reference Guides", "ReferenceGuides.html"],
  ["Personality Library", "PersonalityLibrary.html"],
]

const revContentsMap = new Map(contents.map(([a, b]) => [b, a]))

function getAttrMap(node) {
  const attrList = parse5.defaultTreeAdapter.getAttrList(node)
  return {
    list: attrList,
    map: Object.fromEntries(attrList.map(({name, value}, index) => [name, {index, value}])),
  }
}

function visitPrologueAst(ast) {
  const ret = {resources: []}
  ast.childNodes.forEach((node) => {
    if (node.tagName === 'meta') {
      const { map: attrMap } = getAttrMap(node)
      for (const k of ['date', 'author', 'copyright']) {
        if (attrMap.name?.value === k) {
          ret[k] = attrMap.content.value
        }
      }
    } else if (['link', 'style', 'script'].includes(node.tagName)) {
      ret.resources.push(parse5.serializeOuter(node))
    }
  })
  return ret
}

function transformPageContentAst(thisFname, ast) {
  const usedFootnotes = new Set()
  function inner(node) {
    if (parse5.defaultTreeAdapter.isElementNode(node)) {
      if (node.tagName == "a") {
        const { list: attrList, map: attrMap } = getAttrMap(node)
        const { index: hrefIndex, value: href } = attrMap.href
        if (href != null) {
          let mat
          let notMatched = false
          if ((mat = href.match(/^\.\/(\w+)\.html\/?#(\w+)$/))) {
            const exted = mat[1] + ".html"
            const folderName = revContentsMap.get(exted)
            const rel = folderName ? folderName.replace(/ /g, "") : mat[1]
            const p = exted === thisFname ? "." : `../${rel}`
            attrList[hrefIndex].value = `${p}/${mat[2]}`
          } else if ((mat = href.match(/^#fn:(\d+)$/))) {
            usedFootnotes.add(mat[1])
          } else if (href.match(/^\.\/doc/)) {
            // API documentation
            attrList[hrefIndex].value = `https://developer.garmin.com/connect-iq/api-docs/${href.replace(/^\.\/doc\//, '')}`
          } else {
            notMatched = true
          }
          if (notMatched) {
            // console.log('    * link -->', parse5.serializeOuter(node))
          }
        }
      }
      node.childNodes.forEach(inner)
    }
  }
  ast.childNodes.forEach(inner)
  return { usedFootnotes }
}

/*

Document structure:

  <!DOCTYPE html>
  <html>
  <head>
... (* 1 *) <meta>s and <title> ...
  </head>
  <body>

  <link href=".../prettify.css" type="text/css" rel="stylesheet" />
  <script src=".../jquery-1.11.3.min.js"></script>
  <script>
      $(document).ready( ... );
  </script>
  <script src=".../run_prettify.js"></script>
  <div id="connect_iq_logo">
  <figure>
  <img src=".../connect_iq_logo.png" style="max-width:471px;" title="Powered by Garmin" />
  </figure>
  </div>
  <div id="title">Welcome to the Jungle</div>
  <div id="tagline">Introduction to Connect IQ</div>
  <div class="clear"></div>
--- 8< 8< 8< --- the content starts here ---

  <h1 id="tableofcontents">Table of Contents</h1>
  <div id="toc">
... (* 2 *) toc of <ul> and <li>s ...
  </div>

  <h1 id="welcometoconnectiq">Welcome to Connect IQ</h1>
... (* 3 *) section content (without a wrapper element) ...

... more contents ...

--- 8< 8< 8< --- the content ends here ---
  <div class="footnotes">
  <hr />
  <ol>

  <li id="fn:1">
  <p>Experienced ...</p>
... (* 4 *) footers ...


  </body>
  </html>

Parsing HTML with regexes is seriously wrong. But for identifying sections from simple,
generated documents, it is usually fine.
Here we take a hybrid approach.

 */

for (const [title, fname] of contents) {
  console.log(`* ${title}`)
  // slugified title
  const tt = title.replace(/ /g, "")
  const doc = fs.readFileSync(path.join("..", "sdk-package", fname), "utf-8")
  const ids = doc.matchAll(/<h1\s+(?:class="[^"]*"\s+)?id="([^"]+)">([^<]+)<\/h1>/g)

  const chapters = Array.from(ids).map(({ 0: tag, 1: id, 2: text, index: offs }) => [
    id,
    text,
    offs,
    offs + tag.length,
  ])

  function searchEpi() {
    let i
    if ((i = doc.search(/^<div class="footnotes">$/m)) >= 0) return i
    // may not have footnotes
    if ((i = doc.search(/<\/body>\s*<\/html>/)) >= 0) return i
    throw 0
  }

  const epilogueIdx = searchEpi()
  const prologueEndIdx = doc.search(/^<div class="clear"><\/div>\n/m) + 19 + 6 + 1

  const prologue = doc.slice(0, prologueEndIdx)
  const epilogue = doc.slice(epilogueIdx)

  function dump(idx, [id, text, _offs, begin], end) {
    // skip this HUUUUGE page please
    if (fname == "ReferenceGuides.html" && id == "devicereference") return

    console.log(`  - ${text}`)
    let cont = doc.slice(begin, end)

    const heads = parse5.parseFragment(prologue)
    const pro = visitPrologueAst(heads)

    const ast = parse5.parseFragment(cont)
    const meta = transformPageContentAst(fname, ast)
    cont = ast.childNodes.map((x) => parse5.serializeOuter(x)).join("")
    // console.log('    meta', meta)

    const frontmatter = {
      title: text,
      permalink: `${tt}/${id}`,
      order: idx,
      ...pro,
      prologue,
      epilogue,
    }

    const str = [
      "---",
      yamlStringify(frontmatter),
      "---",
      // prologue,
      `<!-- CONTENT BEGIN -->`,
      cont,
      `<!-- CONTENT END -->`,
      // TODO: filter out unused footnotes
      // epilogue,
    ]
      .join("\n")
      // a very crude way to rewrite all resource paths
      .replace(/resources\//g, "../$&")

    fs.writeFileSync(path.join('..', "out", tt, id + ".md"), str)
  }

  fs.mkdirSync(path.join('..', "out", tt), { recursive: true })

  for (let i = 0; i < chapters.length; i++) {
    // discard the toc completely
    if (i == 0 && chapters[i][0] === "tableofcontents") continue
    const extent = i != chapters.length - 1 ? chapters[i + 1][2] : epilogueIdx
    dump(i, chapters[i], extent)
  }
}
