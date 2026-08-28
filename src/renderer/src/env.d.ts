/// <reference types="vite/client" />
import { PhotoCollectionAPI } from '../../preload/index'

declare global {
  interface Window {
    photoCollection: PhotoCollectionAPI
  }
}

export {}
