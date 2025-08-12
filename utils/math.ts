export const roundUp = (num: number) => {
  if (num <= 0) return 0; // 非正数处理
  // 取最高位的数量级，例如 45 -> 10, 560 -> 100, 1500 -> 1000
  const magnitude = Math.pow(10, Math.floor(Math.log10(num)));
  // 如果最高位不是1（比如 560），就直接用这个数量级取整
  return Math.ceil(num / magnitude) * magnitude;
}