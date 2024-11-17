import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/jackyzha0/quartz",
      "Discord Community": "https://discord.gg/cRFFHYye7t",
    },
  }),
}

import { Options as ExplorerOptions } from "./quartz/components/ExplorerNode"

const folderTitles = [
  ["Readme", "README.html"],
  ["Connect IQ Basics", "ConnectIQBasics.html"],
  ["Monkey C", "LearningMonkeyC.html"],
  ["Core Topics", "CoreTopics.html"],
  ["User Experience Guidelines", "UserExperienceGuidelines.html"],
  ["Connect IQ FAQ", "FAQ.html"],
  ["Reference Guides", "ReferenceGuides.html"],
  ["Personality Library", "PersonalityLibrary.html"],
].map((x) => x[0].replace(/ /g, ""))

const explorerConfig: Partial<ExplorerOptions> = {
  folderDefaultState: "collapsed",
  sortFn(a, b) {
    if (!a.file && b.file) return 1
    if (a.file && !b.file) return -1
    if (!a.file) {
      let aa = folderTitles.indexOf(a.displayName)
      let bb = folderTitles.indexOf(b.displayName)
      if (aa < 0) aa = 1e9
      if (bb < 0) bb = 1e9
      return aa - bb
    }

    const oa = Number.parseInt((a.file?.frontmatter?.order ?? "") as string, 10)
    const ob = Number.parseInt((b.file?.frontmatter?.order ?? "") as string, 10)
    // NaN considered!
    return oa > ob ? 1 : oa != ob ? -1 : a.displayName.localeCompare(b.displayName)
  },
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Search(),
    Component.Darkmode(),
    Component.DesktopOnly(Component.Explorer(explorerConfig)),
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Search(),
    Component.Darkmode(),
    Component.DesktopOnly(Component.Explorer(explorerConfig)),
  ],
  right: [],
}
