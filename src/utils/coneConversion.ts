/**
 * Pyrometric Cone Temperature Conversion Utility
 * Based on Orton Pyrometric Cones chart - Regular cones, 108°F/hour (60°C/hour) heating rate
 */

export type ConeNumber = '010' | '09' | '08' | '07' | '06' | '05.5' | '05' | '04' | '03' | '02' | '01' | '1' | '2' | '3' | '4' | '5' | '5.5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';

export interface ConeData {
  cone: ConeNumber;
  fahrenheit: number;
  celsius: number;
}

// Temperature equivalents, 108°F/hour heating rate
export const CONE_DATA: ConeData[] = [
  { cone: '010', fahrenheit: 1657, celsius: 903 },
  { cone: '09', fahrenheit: 1688, celsius: 920 },
  { cone: '08', fahrenheit: 1728, celsius: 942 },
  { cone: '07', fahrenheit: 1789, celsius: 976 },
  { cone: '06', fahrenheit: 1828, celsius: 998 },
  { cone: '05.5', fahrenheit: 1859, celsius: 1015 }, 
  { cone: '05', fahrenheit: 1888, celsius: 1031 },
  { cone: '04', fahrenheit: 1945, celsius: 1063 },
  { cone: '03', fahrenheit: 1987, celsius: 1086 },
  { cone: '02', fahrenheit: 2016, celsius: 1102 },
  { cone: '01', fahrenheit: 2046, celsius: 1119 },
  { cone: '1', fahrenheit: 2079, celsius: 1137 },
  { cone: '2', fahrenheit: 2088, celsius: 1142 },
  { cone: '3', fahrenheit: 2106, celsius: 1152 },
  { cone: '4', fahrenheit: 2124, celsius: 1162 },
  { cone: '5', fahrenheit: 2167, celsius: 1186 },
  { cone: '5.5', fahrenheit: 2197, celsius: 1203 }, 
  { cone: '6', fahrenheit: 2232, celsius: 1222 },
  { cone: '7', fahrenheit: 2262, celsius: 1239 },
  { cone: '8', fahrenheit: 2280, celsius: 1249 },
  { cone: '9', fahrenheit: 2300, celsius: 1260 },
  { cone: '10', fahrenheit: 2345, celsius: 1285 },
  { cone: '11', fahrenheit: 2361, celsius: 1294 },
  { cone: '12', fahrenheit: 2383, celsius: 1306 },
];

/**
 * Get temperature data for a specific cone
 */
export function getConeData(cone: ConeNumber): ConeData | undefined {
  return CONE_DATA.find(data => data.cone === cone);
}

/**
 * Find the closest cone for a given Fahrenheit temperature
 */
export function findClosestConeByFahrenheit(fahrenheit: number): ConeData {
  let closest = CONE_DATA[0];
  let smallestDiff = Math.abs(fahrenheit - closest.fahrenheit);
  
  for (const data of CONE_DATA) {
    const diff = Math.abs(fahrenheit - data.fahrenheit);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closest = data;
    }
  }
  
  return closest;
}

/**
 * Find the closest cone for a given Celsius temperature
 */
export function findClosestConeByCelsius(celsius: number): ConeData {
  let closest = CONE_DATA[0];
  let smallestDiff = Math.abs(celsius - closest.celsius);
  
  for (const data of CONE_DATA) {
    const diff = Math.abs(celsius - data.celsius);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closest = data;
    }
  }
  
  return closest;
}

/**
 * Convert Fahrenheit to Celsius
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return Math.round((fahrenheit - 32) * 5 / 9);
}

/**
 * Convert Celsius to Fahrenheit
 */
export function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9 / 5) + 32);
}

/**
 * Get all available cone numbers for dropdown options
 */
export function getConeOptions(): ConeNumber[] {
  return CONE_DATA.map(data => data.cone);
}