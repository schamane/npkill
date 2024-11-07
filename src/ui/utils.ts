import colors from "colors";
export const ColorFn = (color: string) => {
  return color in colors ? colors[color as never] : (value: string) => value;
};
