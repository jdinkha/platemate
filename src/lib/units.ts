import type { WeightUnit } from '@/lib/splits'

// Weights are stored in kilograms (set_logs.weight_kg) and shown in the
// user's preferred unit.

const LBS_PER_KG = 2.20462

/** A stored weight in the user's unit, to one decimal place. */
export function fromKg(kg: number, unit: WeightUnit) {
  const weight = unit === 'kg' ? kg : kg * LBS_PER_KG
  return Math.round(weight * 10) / 10
}

/** A total in the user's unit, rounded once to a whole number. */
export function totalFromKg(kg: number, unit: WeightUnit) {
  return Math.round(unit === 'kg' ? kg : kg * LBS_PER_KG)
}

/** An entered weight in kilograms, to two decimals (the column's precision). */
export function toKg(weight: number, unit: WeightUnit) {
  const kg = unit === 'kg' ? weight : weight / LBS_PER_KG
  return Math.round(kg * 100) / 100
}

export function formatNumber(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

/** Plate-friendly step for the weight stepper buttons. */
export function weightStep(unit: WeightUnit) {
  return unit === 'kg' ? 2.5 : 5
}
