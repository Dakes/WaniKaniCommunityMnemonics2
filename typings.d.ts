declare module '*.svelte' {
  import type { SvelteComponentTyped } from 'svelte';
  export default class Component<P = Record<string, any>, E extends Record<string, any> = {}, S extends Record<string, any> = {}> extends SvelteComponentTyped<P, E, S> {}
}