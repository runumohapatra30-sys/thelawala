export function isRainWeather(precipitation: number, code: number) {
  return precipitation > 0 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
}