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

export type AlertStatus = 'sounding' | 'decaying'

export interface AlertState extends Alert {
  status: AlertStatus
  opacity: number
}

export type SonificationStrategy = 'aggregate' | 'score-filter' | 'sampling' | 'grains' | 'rate-limit'

export type AppMode = 'live' | 'demo'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'demo'

export interface AudioParams {
  type: OscillatorType
  frequency: number
  gain: number
  positionX: number
  positionY: number
  positionZ: number
  attack: number
}
