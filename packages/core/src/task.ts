export class Task {
  private disposables: (() => void)[] = []
  private resolve: () => void
  private promise = new Promise<void>((resolve) => {
    this.resolve = resolve
  })

  defer(callback: () => void) {
    this.disposables.push(callback)
  }

  timeout(timeout: number) {
    const timer = setTimeout(() => this.done(), timeout)
    this.defer(() => clearTimeout(timer))
  }

  done() {
    this.resolve()
    this.disposables.forEach(dispose => dispose())
  }

  execute() {
    return this.promise
  }
}
