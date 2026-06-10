export type AlertType =
  | 'RR Lyrae'
  | 'Cepheid'
  | 'Mira'
  | 'LPV'
  | 'AGN'
  | 'QSO'
  | 'SN Ia'
  | 'SN Ib'
  | 'SN Ic'
  | 'SN II'
  | 'Kilonova'
  | 'TDE'
  | 'Unknown'

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
