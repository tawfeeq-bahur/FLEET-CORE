
import type {Metadata} from 'next';
import { Inter, Lora, JetBrains_Mono } from 'next/font/google';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { AppLayout, SharedStateProvider } from '@/components/AppLayout';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'FLEETIX',
  description: 'AI-Powered Fleet Management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${lora.variable} ${jetbrainsMono.variable} font-body antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SharedStateProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </SharedStateProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
