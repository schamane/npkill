export interface IKeysCommand {
  up: () => void;
  down: () => void;
  space: () => void;
  j: () => void;
  k: () => void;
  h: () => void;
  l: () => void;
  d: () => void;
  u: () => void;
  pageup: () => void;
  pagedown: () => void;
  home: () => void;
  end: () => void;
  e: () => void;
  execute: (command: string, parameters?: string[]) => number;
}
