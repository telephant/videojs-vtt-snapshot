/// <reference types="vite/client" />

declare module '*.vtt?raw' {
  const content: string;
  export default content;
}

declare module '*.jpg?url' {
  const src: string;
  export default src;
} 