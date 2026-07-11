export interface BrowserStorage {
  getItem(str: string): string;
  setItem(str: string, payload: string): void;
  removeItem(str: string): void;
}

export interface storage {
  get(str: string): Payload;
  set(str: string, payload: object | number | string, expires: boolean | number): void;
  remove(str: string): void;
}

type Payload = object | number | string | undefined
type data = object | number | string
type storeObject = {
  data?: object | number | string,
  expires?: number
}

export class Storage {
  #instance: BrowserStorage

  constructor (instance: BrowserStorage) {
    this.#instance = instance
  }

  get (target: string): Payload {
    const storedValue = this.#instance.getItem(target)
    if (!storedValue) return undefined

    const storedData = JSON.parse(storedValue)
    if (!storedData) return undefined

    if (storedData.expires && storedData.expires <= Date.now()) {
      this.remove(target)
      return undefined
    }

    return storedData.data
  }

  set (target: string, data: data, expires: boolean | number = 60_000): void {
    const dataToStore: storeObject = {}
    dataToStore.data = data

    if (expires) {
      if (expires === true) {
        expires = Date.now()
      } else {
        expires = Date.now() + expires
      }

      dataToStore.expires = expires
    }

    this.#instance.setItem(target, JSON.stringify(dataToStore))
  }

  remove (target: string) {
    return this.#instance.removeItem(target)
  }
}

export function createStorage (instance: BrowserStorage): Storage {
  return new Storage(instance)
}
