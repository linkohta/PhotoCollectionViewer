// Names of the IPC channels between preload (window.photoCollection) and the
// main process, keyed by the preload API method that uses each one. Both
// sides use these constants, so a channel cannot change on one side only.
export const IPC = {
  openFolderDialog: 'dialog:openFolder',
  scanFolder: 'folder:scan',
  searchSubfolders: 'folder:searchSubfolders',
  getFolderPreviewImage: 'folder:previewImage',
  extractZip: 'zip:extract',
  confirmExtractZip: 'zip:confirmExtract',
  getThumbnailPath: 'image:thumbnailPath',
  getImageDataUrl: 'image:dataUrl',
  getThumbnailDataUrl: 'image:thumbnailDataUrl',
  getFavorites: 'favorites:get',
  addFavorite: 'favorites:add',
  removeFavorite: 'favorites:remove',
  getSession: 'session:get',
  saveSession: 'session:save',
  renamePath: 'fs:rename',
  deleteFolder: 'fs:deleteFolder',
  moveToTrash: 'fs:moveToTrash',
  // ipcRenderer.send / ipcMain.on, no reply.
  setWarmupContext: 'warmup:setContext',
  getConfirmations: 'settings:getConfirmations',
  setConfirmation: 'settings:setConfirmation',
  // Pushed from main to every window (webContents.send).
  onConfirmationsChanged: 'settings:confirmationsChanged',
  exportSettings: 'settings:export',
  importSettings: 'settings:import'
} as const
