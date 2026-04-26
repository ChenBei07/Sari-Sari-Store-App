import { format, isToday, isThisWeek, isThisMonth } from 'date-fns'

export const peso = (n) =>
  '₱' + Number(n || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

export const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return format(d, 'MMM d, yyyy h:mm a')
}

export const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return format(d, 'MMM d, yyyy')
}

export const todayISO = () => new Date().toISOString().split('T')[0]

export const nowDateTime = () => format(new Date(), 'MMM d, yyyy h:mm a')