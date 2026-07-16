import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lista de compras',
}

export default function ListLayout({ children }: { children: React.ReactNode }) {
  return children
}
