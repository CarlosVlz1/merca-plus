export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-green-50 via-white to-white px-4 py-12">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
