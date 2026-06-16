export type AlertType =
  | 'RR Lyrae' | 'Cepheid' | 'Mira' | 'LPV' | 'AGN' | 'QSO'
  | 'SN Ia' | 'SN Ib' | 'SN Ic' | 'SN II' | 'Kilonova' | 'TDE'
  | 'VS' | 'ORPHAN' | 'CV' | 'EB' | 'YSO' | 'Unknown'

export interface Alert {
  alertId: string
  ra: number
  dec: number
  magnitude: number
  type: AlertType
  redshift: number
  riseTime: number
  score: number
  timestamp: number
}

export type AlertSourceType = 'demo' | 'kafka' | 'fink' | 'lasair'

export interface AlertSource {
  readonly type: AlertSourceType
  start(onAlert: (alert: Alert) => void): void
  stop(): void
}

