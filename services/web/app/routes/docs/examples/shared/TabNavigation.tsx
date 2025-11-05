import React from "react"

export interface Tab {
  id: string
  label: string
  icon?: string
}

export interface TabNavigationProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  children: React.ReactNode
  className?: string
}

export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  children,
  className = ""
}: TabNavigationProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Tab selector */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {children}
    </div>
  )
}

export interface ConditionalSectionProps {
  condition: boolean
  title?: string
  className?: string
  children: React.ReactNode
}

export function ConditionalSection({
  condition,
  title,
  className = "p-4 bg-gray-50 rounded-lg",
  children
}: ConditionalSectionProps) {
  if (!condition) return null

  return (
    <div className={`space-y-4 ${className}`}>
      {title && <h4 className="font-medium text-sm">{title}</h4>}
      {children}
    </div>
  )
}
