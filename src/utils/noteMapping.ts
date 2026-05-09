export type UkuleleNoteName = 'G4' | 'C4' | 'E4' | 'A4'
export type TuningStatus = 'Flat' | 'Sharp' | 'In Tune'

export type UkuleleString = {
  note: UkuleleNoteName
  frequency: number
  label: string
}

export type NoteMatch = {
  note: UkuleleNoteName
  targetFrequency: number
  frequency: number
  cents: number
  status: TuningStatus
}

export const UKULELE_STRINGS: UkuleleString[] = [
  { note: 'G4', frequency: 392.0, label: 'G string' },
  { note: 'C4', frequency: 261.63, label: 'C string' },
  { note: 'E4', frequency: 329.63, label: 'E string' },
  { note: 'A4', frequency: 440.0, label: 'A string' },
]

const IN_TUNE_THRESHOLD_CENTS = 5

export function frequencyToCents(frequency: number, targetFrequency: number) {
  // Cents give a logarithmic distance between pitches, which matches how
  // musicians hear tuning error better than raw hertz differences.
  return 1200 * Math.log2(frequency / targetFrequency)
}

export function getTuningStatus(cents: number): TuningStatus {
  if (Math.abs(cents) <= IN_TUNE_THRESHOLD_CENTS) {
    return 'In Tune'
  }

  return cents < 0 ? 'Flat' : 'Sharp'
}

export function getClosestUkuleleNote(frequency: number): NoteMatch | null {
  if (!Number.isFinite(frequency) || frequency <= 0) {
    return null
  }

  // Choose the target string whose pitch is closest in cents so the UI reports
  // the musically nearest ukulele note, not just the nearest raw frequency.
  const closestString = UKULELE_STRINGS.reduce((closest, current) => {
    const closestDistance = Math.abs(frequencyToCents(frequency, closest.frequency))
    const currentDistance = Math.abs(frequencyToCents(frequency, current.frequency))

    return currentDistance < closestDistance ? current : closest
  }, UKULELE_STRINGS[0])

  const cents = frequencyToCents(frequency, closestString.frequency)

  return {
    note: closestString.note,
    targetFrequency: closestString.frequency,
    frequency,
    cents,
    status: getTuningStatus(cents),
  }
}
