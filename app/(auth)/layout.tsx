import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-xs py-xl">
      <Link href="/" className="mb-lg" aria-label="Voltar à página inicial">
        <BrandMark />
      </Link>
      <main className="w-full max-w-[400px]">{children}</main>
    </div>
  );
}
