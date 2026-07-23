import { parseHash } from 'lib/tabs/navigation/parseHash'
import {
  CALCULATOR_PANEL_HASH,
  CalculatorPanel,
} from 'lib/tabs/tabCalculators/calculatorPanels'
import { flipStringMapping } from 'lib/utils/objectUtils'

export enum BasePath {
  MAIN = '/hsr-optimizer',
  BETA = '/dreary-quibbles',
}

// Derive the runtime asset/locale prefix from the Vite build base, so images
// and translations resolve wherever the app is hosted: root ('') when built
// with VITE_BASE=/ for self-hosting, or the GitHub Pages sub-path otherwise.
export const BASE_PATH: string = import.meta.env.BASE_URL.replace(/\/$/, '')

export type PageHash =
  | ''
  | '#main'
  | '#showcase'
  | '#changelog'
  | '#warp'
  | '#benchmarks'
  | '#aha'
  | '#ehr'
  | '#leaderboard'
  | '#webgpu'
  | '#metadata'
  | '#characters'
  | '#relics'
  | '#import'
  | '#database-characters'
  | '#database-lightcones'
  | '#database-relics'
  | '#leaks'

export enum AppPages {
  HOME = 'HOME',

  OPTIMIZER = 'OPTIMIZER',
  CHARACTERS = 'CHARACTERS',
  RELICS = 'RELICS',
  IMPORT = 'IMPORT',

  CHANGELOG = 'CHANGELOG',
  SHOWCASE = 'SHOWCASE',
  WARP = 'WARP',
  BENCHMARKS = 'BENCHMARKS',
  CALCULATORS = 'CALCULATORS',
  LEADERBOARD = 'LEADERBOARD',

  DATABASE_CHARACTERS = 'DATABASE_CHARACTERS',
  DATABASE_LIGHTCONES = 'DATABASE_LIGHTCONES',
  DATABASE_RELICS = 'DATABASE_RELICS',
  DATABASE_LEAKS = 'DATABASE_LEAKS',

  WEBGPU_TEST = 'WEBGPU_TEST',
  METADATA_TEST = 'METADATA_TEST',
}

export const PageToHash = {
  [AppPages.SHOWCASE]: '#showcase',
  [AppPages.LEADERBOARD]: '#leaderboard',
  [AppPages.BENCHMARKS]: '#benchmarks',
  [AppPages.CALCULATORS]: CALCULATOR_PANEL_HASH[CalculatorPanel.AHA],
  [AppPages.WARP]: '#warp',

  [AppPages.OPTIMIZER]: '#main',
  [AppPages.CHARACTERS]: '#characters',
  [AppPages.RELICS]: '#relics',
  [AppPages.IMPORT]: '#import',

  [AppPages.HOME]: '',
  [AppPages.CHANGELOG]: '#changelog',

  [AppPages.DATABASE_CHARACTERS]: '#database-characters',
  [AppPages.DATABASE_LIGHTCONES]: '#database-lightcones',
  [AppPages.DATABASE_RELICS]: '#database-relics',
  [AppPages.DATABASE_LEAKS]: '#leaks',

  [AppPages.WEBGPU_TEST]: '#webgpu',
  [AppPages.METADATA_TEST]: '#metadata',
} as const satisfies Record<AppPages, PageHash>

export const HashToPage = {
  ...flipStringMapping(PageToHash),
  [CALCULATOR_PANEL_HASH[CalculatorPanel.EHR]]: AppPages.CALCULATORS,
} as const satisfies Record<PageHash, AppPages>

export function getDefaultActiveKey() {
  const page = HashToPage[parseHash().hash as PageHash]

  // Redirect #main to HOME for first-time users (no prior save data)
  if (
    (
      page === AppPages.OPTIMIZER
      || page === AppPages.CHARACTERS
      || page === AppPages.RELICS
    )
    && localStorage.getItem('state') === null
  ) {
    return AppPages.HOME
  }

  return page ?? AppPages.HOME
}
