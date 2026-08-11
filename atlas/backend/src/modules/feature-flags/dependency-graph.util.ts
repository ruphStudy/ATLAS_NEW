import { MAX_DEPENDENCY_GRAPH_DEPTH } from './constants';

export interface IDependencyGraphNode {
  key: string;
  dependencies: string[];
}

/**
 * Detects whether adding `key -> dependencies` edges to the existing graph (`allNodes`, which should
 * exclude any stale version of `key` itself) would create a cycle reachable back to `key`. Bounded by
 * `MAX_DEPENDENCY_GRAPH_DEPTH` so a malformed/pathological graph fails closed (treated as a cycle)
 * rather than looping indefinitely.
 */
export function wouldCreateCycle(key: string, dependencies: string[], allNodes: IDependencyGraphNode[]): boolean {
  const adjacency = new Map<string, string[]>();
  for (const node of allNodes) {
    if (node.key !== key) {
      adjacency.set(node.key, node.dependencies);
    }
  }
  adjacency.set(key, dependencies);

  const visited = new Set<string>();

  function dfs(current: string, depth: number): boolean {
    if (depth > MAX_DEPENDENCY_GRAPH_DEPTH) {
      return true;
    }
    if (current === key && depth > 0) {
      return true;
    }
    if (visited.has(current)) {
      return false;
    }
    visited.add(current);

    for (const dependency of adjacency.get(current) ?? []) {
      if (dfs(dependency, depth + 1)) {
        return true;
      }
    }
    return false;
  }

  for (const dependency of dependencies) {
    if (dfs(dependency, 1)) {
      return true;
    }
  }
  return false;
}

/** A flag cannot simultaneously depend on and be mutually exclusive with the same other flag — that combination can never be satisfied. */
export function findDependencyConflict(dependencies: string[], mutuallyExclusiveWith: string[]): string | null {
  return dependencies.find((dep) => mutuallyExclusiveWith.includes(dep)) ?? null;
}
