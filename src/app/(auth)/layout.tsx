export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-beige">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-forest">
            <span className="text-forest">Greens</span>
            <span className="text-soil">Browns</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Digital circular marketplace for leafy waste
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
