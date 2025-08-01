export function useManualUpdateCheck() {
  const checkForUpdates = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          await registration.update()
          console.log('Manual update check completed')
        }
      } catch (error) {
        console.error('Error checking for updates:', error)
      }
    }
  }

  return { checkForUpdates }
}
