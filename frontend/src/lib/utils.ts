import type { ClassValue } from "clsx"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 获取字符串的首字母（或第一个汉字/字符）并大写
 * @param str - 输入字符串
 * @returns 返回首字母大写
 */
export function getInitial(str: string): string {
  if (!str) return '';
  
  // 获取字符串的第一个字符
  const firstChar = str.charAt(0);
  
  // 检查是否为英文字母，如果是则转为大写
  if (/[a-zA-Z]/.test(firstChar)) {
    return firstChar.toUpperCase();
  }
  
  // 对于其他字符（包括汉字），直接返回
  return firstChar;
}
