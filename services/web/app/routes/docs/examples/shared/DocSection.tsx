import React from "react"

export interface CodeBlockProps {
  title?: string
  code: string
  language?: string
  note?: string
  className?: string
}

export function CodeBlock({
  title,
  code,
  language = "css",
  note,
  className = ""
}: CodeBlockProps) {
  return (
    <div className={`bg-gray-100 p-4 rounded-lg font-mono text-sm ${className}`}>
      {title && <div className="font-semibold mb-2">{title}</div>}
      <code className="text-xs break-all">{code}</code>
      {note && (
        <div className="text-xs text-gray-600 mt-2">
          {note}
        </div>
      )}
    </div>
  )
}

export interface InfoGridProps {
  title?: string
  items: Array<{
    label: string
    value: React.ReactNode
    highlight?: boolean
  }>
  className?: string
}

export function InfoGrid({
  title,
  items,
  className = "bg-gray-100 p-4 rounded-lg font-mono text-sm"
}: InfoGridProps) {
  return (
    <div className={className}>
      {title && <div className="font-semibold mb-2">{title}</div>}
      {items.map((item, index) => (
        <div key={index} className={item.highlight ? "text-orange-600" : ""}>
          • {item.label}: {item.value}
        </div>
      ))}
    </div>
  )
}

export interface DocSectionProps {
  title: string
  description: string
  children: React.ReactNode
  className?: string
}

export function DocSection({
  title,
  description,
  children,
  className = "mt-12"
}: DocSectionProps) {
  return (
    <div className={className}>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <p className="text-gray-700 mb-4">{description}</p>
      {children}
    </div>
  )
}

export interface SubSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function SubSection({
  title,
  description,
  children,
  className = "mb-6"
}: SubSectionProps) {
  return (
    <div className={className}>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      {description && (
        <p className="text-gray-700 mb-4">{description}</p>
      )}
      {children}
    </div>
  )
}

export interface ApplicationListProps {
  title?: string
  categories: Array<{
    name: string
    items: string[]
    highlight?: boolean
  }>
}

export function ApplicationList({
  title = "Real-World Applications",
  categories
}: ApplicationListProps) {
  return (
    <SubSection title={title} description="These techniques are perfect for professional video applications:">
      <div className="space-y-6">
        {categories.map((category, index) => (
          <div key={index} className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
            <div className="font-semibold mb-2">{category.name}:</div>
            {category.items.map((item, itemIndex) => (
              <div key={itemIndex}>• {item}</div>
            ))}
          </div>
        ))}
      </div>
    </SubSection>
  )
}
