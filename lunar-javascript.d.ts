declare module 'lunar-javascript' {
  export class Solar {
    static fromDate(date: Date): Solar
    getLunar(): Lunar
  }

  export class Lunar {
    getYearInGanZhi(): string
    getTimeZhi(): string
  }
}

