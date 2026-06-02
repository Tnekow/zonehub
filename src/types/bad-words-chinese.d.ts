declare module 'bad-words-chinese' {
  interface FilterOptions {
    placeHolder?: string
    englishList?: string[]
    chineseList?: string[]
  }

  class BadWordsChineseFilter {
    constructor(options?: FilterOptions)
    clean(input: string): string
    isProfane(input: string): boolean
  }

  export default BadWordsChineseFilter
}
