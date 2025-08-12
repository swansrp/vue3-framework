export const roundUp = (num: number, minRatio = 0.85) => {
  if (num > 0) {
    let magnitude = Math.pow(10, Math.floor(Math.log10(num)));
    let result = Math.ceil(num / magnitude) * magnitude;

    // 如果取整结果比原值大太多，就用更小的取整步长
    while (result / num > 1 / minRatio && magnitude > 1) {
      magnitude /= 10; // 降一个数量级
      result = Math.ceil(num / magnitude) * magnitude;
    }
    return result;
  } else {
    return 0;
  }
}
