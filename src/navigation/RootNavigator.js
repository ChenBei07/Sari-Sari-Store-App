import React, { useEffect, useState } from 'react'
import { View, ActivityIndicator, AppState } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { initDatabase, getDb } from '../db/database'
import { initAuth, checkScheduleLocks } from '../db/auth'
import useAppStore from '../store/useAppStore'
import AuthNavigator from './AuthNavigator'
import MainNavigator from './MainNavigator'

async function isUserOutsideSchedule(user) {
  if (!user || user.role === 'owner') return false
  try {
    const db = await getDb()
    const dbUser = await db.getFirstAsync('SELECT * FROM users WHERE id = ?', [user.id])
    if (!dbUser) return true
    if (dbUser.is_locked === 1) return true
    if (!dbUser.lock_start || !dbUser.lock_end) return false

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const [startH, startM] = dbUser.lock_start.split(':').map(Number)
    const [endH, endM] = dbUser.lock_end.split(':').map(Number)
    const startTotal = startH * 60 + startM
    const endTotal = endH * 60 + endM

    const withinSchedule = startTotal <= endTotal
      ? currentTime >= startTotal && currentTime <= endTotal
      : currentTime >= startTotal || currentTime <= endTotal

    return !withinSchedule
  } catch (e) { return false }
}

export default function RootNavigator() {
  const [loading, setLoading] = useState(true)
  const { isAuthenticated, user, logout } = useAppStore()

  useEffect(() => {
    async function init() {
      try {
        await initDatabase()
        await initAuth()
      } catch (e) {
        console.error('DB init error:', e)
      } finally {
        setLoading(false)
      }
    }
    init()

    const interval = setInterval(async () => {
      await checkScheduleLocks()
      const outside = await isUserOutsideSchedule(user)
      if (outside) logout()
    }, 60000)

    const subscription = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        await checkScheduleLocks()
        const outside = await isUserOutsideSchedule(user)
        if (outside) logout()
      }
    })

    return () => {
      clearInterval(interval)
      subscription.remove()
    }
  }, [user])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  )
}