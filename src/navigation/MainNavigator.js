import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text, View } from 'react-native'
import useAppStore from '../store/useAppStore'

import DashboardScreen from '../screens/dashboard/DashboardScreen'
import ProductsScreen from '../screens/products/ProductsScreen'
import AddEditProductScreen from '../screens/products/AddEditProductScreen'
import NewSaleScreen from '../screens/sales/NewSaleScreen'
import SalesHistoryScreen from '../screens/sales/SalesHistoryScreen'
import ManageStaffScreen from '../screens/staff/ManageStaffScreen'
import SettingsScreen from '../screens/settings/SettingsScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function TabIcon({ emoji }) {
  return (
    <View>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
    </View>
  )
}

function ProductsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProductsList" component={ProductsScreen} />
      <Stack.Screen name="AddEditProduct" component={AddEditProductScreen} />
    </Stack.Navigator>
  )
}

function SalesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NewSale" component={NewSaleScreen} />
      <Stack.Screen name="SalesHistory" component={SalesHistoryScreen} />
    </Stack.Navigator>
  )
}

export default function MainNavigator() {
  const { user } = useAppStore()
  const isOwner = user?.role === 'owner'

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          paddingBottom: 6,
          paddingTop: 6,
          height: 60
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: () => <TabIcon emoji="📊" />, tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsStack}
        options={{ tabBarIcon: () => <TabIcon emoji="📦" />, tabBarLabel: 'Products' }}
      />
      <Tab.Screen
        name="Sales"
        component={SalesStack}
        options={{ tabBarIcon: () => <TabIcon emoji="🛒" />, tabBarLabel: 'Sales' }}
      />
      {isOwner && (
        <Tab.Screen
          name="Staff"
          component={ManageStaffScreen}
          options={{ tabBarIcon: () => <TabIcon emoji="👥" />, tabBarLabel: 'Staff' }}
        />
      )}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: () => <TabIcon emoji="⚙️" />, tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  )
}