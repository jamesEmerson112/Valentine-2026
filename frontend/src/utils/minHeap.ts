/**
 * Generic min-heap with a custom compare function.
 * Used by A* pathfinding and the rat priority queue.
 */
export class MinHeap<T> {
  private data: T[] = []
  private compare: (a: T, b: T) => number

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare
  }

  get size() {
    return this.data.length
  }

  push(item: T) {
    this.data.push(item)
    this.bubbleUp(this.data.length - 1)
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined
    const top = this.data[0]
    const last = this.data.pop()!
    if (this.data.length > 0) {
      this.data[0] = last
      this.sinkDown(0)
    }
    return top
  }

  peek(): T | undefined {
    return this.data[0]
  }

  remove(predicate: (item: T) => boolean) {
    const idx = this.data.findIndex(predicate)
    if (idx === -1) return
    const last = this.data.pop()!
    if (idx < this.data.length) {
      this.data[idx] = last
      this.bubbleUp(idx)
      this.sinkDown(idx)
    }
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.compare(this.data[i], this.data[parent]) >= 0) break
      ;[this.data[i], this.data[parent]] = [this.data[parent], this.data[i]]
      i = parent
    }
  }

  private sinkDown(i: number) {
    const n = this.data.length
    while (true) {
      let smallest = i
      const left = 2 * i + 1
      const right = 2 * i + 2
      if (left < n && this.compare(this.data[left], this.data[smallest]) < 0) {
        smallest = left
      }
      if (right < n && this.compare(this.data[right], this.data[smallest]) < 0) {
        smallest = right
      }
      if (smallest === i) break
      ;[this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]]
      i = smallest
    }
  }
}
