/**
 * Maps angle to range from -PI to PI
 * @param value Angle in radians
 */
export function toRange(value: number) {
  let a = (value % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  if (a > Math.PI) {
    a -= 2 * Math.PI;
  }
  return a;
}
