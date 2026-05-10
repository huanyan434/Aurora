import { defineStore } from 'pinia'

const SYSTEM_ANNOUNCEMENT_VERSION_KEY = 'announcement:lastSystemVersion'
const NOTIFICATION_LAST_ACK_KEY = 'announcement:lastNotificationAck'

export const useAnnouncementStore = defineStore('announcement', {
  state: () => ({
    lastSystemVersion: '',
    lastNotificationAck: '',
  }),
  actions: {
    loadFromStorage() {
      this.lastSystemVersion = localStorage.getItem(SYSTEM_ANNOUNCEMENT_VERSION_KEY) || ''
      this.lastNotificationAck = localStorage.getItem(NOTIFICATION_LAST_ACK_KEY) || ''
    },
    markSystemSeen(version: string) {
      this.lastSystemVersion = version
      localStorage.setItem(SYSTEM_ANNOUNCEMENT_VERSION_KEY, version)
    },
    markNotificationAck(version: string) {
      this.lastNotificationAck = version
      localStorage.setItem(NOTIFICATION_LAST_ACK_KEY, version)
    },
    shouldShowSystem(version: string) {
      const normalizedVersion = version || ''
      return Boolean(normalizedVersion) && normalizedVersion !== this.lastSystemVersion
    },
    shouldShowNotifications(version: string) {
      const normalizedVersion = version || ''
      return Boolean(normalizedVersion) && normalizedVersion !== this.lastNotificationAck
    },
  },
})
