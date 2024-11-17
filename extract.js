import * as fs from "node:fs"
import * as path from "node:path"
import * as parse5 from "parse5"

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

function transformPageContentAst(thisFname, ast) {
  const usedFootnotes = new Set()
  function inner(node) {
    if (parse5.defaultTreeAdapter.isElementNode(node)) {
      if (node.tagName == "a") {
        const attrList = parse5.defaultTreeAdapter.getAttrList(node)
        const hrefIdx = attrList.findIndex((x) => x.name == "href")
        if (hrefIdx >= 0) {
          const href = attrList[hrefIdx].value

          let mat
          let notMatched = false
          if ((mat = href.match(/^\.\/(\w+)\.html\/?#(\w+)$/))) {
            const exted = mat[1] + ".html"
            const folderName = revContentsMap.get(exted)
            const rel = folderName ? folderName.replace(/ /g, "") : mat[1]
            const p = exted === thisFname ? "." : `../${rel}`
            attrList[hrefIdx].value = `${p}/${mat[2]}`
          } else if ((mat = href.match(/^#fn:(\d+)$/))) {
            usedFootnotes.add(mat[1])
          } else if (href.match(/^\.\/doc/)) {
            // API documentation
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

for (const [title, fname] of contents) {
  console.log(`* ${title}`)
  const tt = title.replace(/ /g, "")
  const doc = fs.readFileSync(path.join("sdk-package", fname), "utf-8")
  const ids = doc.matchAll(/<h1\s+(?:class="[^"]*"\s+)?id="([^"]+)">([^>]+)<\/h1>/g)

  const chapters = Array.from(ids).map(({ 0: tag, 1: id, 2: text, index: offs }) => [
    id,
    text,
    offs,
    offs + tag.length,
  ])

  function searchEpi() {
    let i
    if ((i = doc.search(/^<div class="footnotes">$/m)) >= 0) return i
    if ((i = doc.search(/<\/body>\s*<\/html>/)) >= 0) return i
    throw 0
  }

  const epilogueIdx = searchEpi()
  const prologueEndIdx = doc.search(/^<div class="clear">/m) + 19 + 6 + 1

  const prologue = doc.slice(0, prologueEndIdx)
  const epilogue = doc.slice(epilogueIdx)

  function dump(idx, [id, text, _offs, begin], end) {
    if (fname == "ReferenceGuides.html" && id == "devicereference") return

    console.log(`  - ${text}`)
    let cont = doc.slice(begin, end)

    const ast = parse5.parseFragment(cont)
    const meta = transformPageContentAst(fname, ast)
    cont = ast.childNodes.map((x) => parse5.serializeOuter(x)).join("")
    // console.log('    meta', meta)

    const str = [
      "---",
      `title: ${text}`,
      `permalink: ${tt}/${id}`,
      `order: ${idx}`,
      "---",
      // prologue,
      `<!-- CONTENT BEGIN -->`,
      cont,
      `<!-- CONTENT END -->`,
      // TODO: filter out unused footnotes
      // epilogue,
    ]
      .join("\n")
      .replace(/resources\//g, "../$&")

    fs.writeFileSync(path.join("out", tt, id + ".md"), str)
  }

  fs.mkdirSync(path.join("out", tt), { recursive: true })

  for (let i = 0; i < chapters.length; i++) {
    if (i == 0 && chapters[i][0] === "tableofcontents") continue
    const extent = i != chapters.length - 1 ? chapters[i + 1][2] : epilogueIdx
    dump(i, chapters[i], extent)
  }
}
